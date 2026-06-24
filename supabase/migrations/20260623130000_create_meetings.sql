-- =====================================================================
-- Meetings core extension
-- =====================================================================
-- This migration extends the existing meetings model (already created in
-- 20260616120000_leadership_management.sql era) with the additional
-- tables needed by Phase 2: attachments, transcription segments, decision
-- ownership/status, structured insights and an explicit lifecycle status.
--
-- It is idempotent (uses IF NOT EXISTS / DO blocks) so it can be applied
-- to environments that already contain the legacy tables. It does NOT
-- recreate or alter rows you might already have.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Shared updated_at trigger (safe re-create — function already exists
--    in the leadership migration; CREATE OR REPLACE is idempotent).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. MEETINGS — table is assumed to exist (see leadership migration /
--    earlier schema). We ensure required Phase 2 columns are present and
--    that the lifecycle "status" column accepts the new states.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill columns that older deployments may be missing.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Replace any pre-existing CHECK constraint on status with the Phase 2
-- lifecycle ("draft" → "recorded" → "transcribing" → "transcribed" →
-- "analyzing" → "analyzed", or "error" / legacy "processed" / "review").
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'meetings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE meetings DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_status_check CHECK (status IN (
    'draft',
    'recorded',
    'transcribing',
    'transcribed',
    'analyzing',
    'analyzed',
    'processing',
    'processed',
    'review',
    'error'
  ));

CREATE INDEX IF NOT EXISTS idx_meetings_org_starts ON meetings(organization_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

DROP TRIGGER IF EXISTS meetings_updated_at ON meetings;
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2. MEETING PARTICIPANTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT,
  email TEXT,
  attended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE meeting_participants ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_profile ON meeting_participants(profile_id);

-- ---------------------------------------------------------------------
-- 3. MEETING ATTACHMENTS (uploads + Google Drive references)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'google_drive', 'link', 'youtube')),
  source_ref TEXT,                    -- Drive file id / external url / etc.
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  processing_error TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting ON meeting_attachments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attachments_status ON meeting_attachments(processing_status);

DROP TRIGGER IF EXISTS meeting_attachments_updated_at ON meeting_attachments;
CREATE TRIGGER meeting_attachments_updated_at BEFORE UPDATE ON meeting_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4. MEETING TRANSCRIPTIONS (structured: text + per-segment JSONB)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  attachment_id UUID REFERENCES meeting_attachments(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  segments JSONB DEFAULT '[]'::jsonb,
  provider TEXT,
  model TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcriptions_meeting ON meeting_transcriptions(meeting_id);

DROP TRIGGER IF EXISTS meeting_transcriptions_updated_at ON meeting_transcriptions;
CREATE TRIGGER meeting_transcriptions_updated_at BEFORE UPDATE ON meeting_transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. MEETING SUMMARIES — exec + strategic summary per meeting
--    (table may already exist; ensure required cols are present)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  executive_summary TEXT,
  strategic_summary TEXT,
  next_steps TEXT[],
  next_agenda TEXT[],
  product_insights TEXT[],
  marketing_insights TEXT[],
  operations_insights TEXT[],
  pending_questions TEXT[],
  model TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS strategic_summary TEXT;
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS next_steps TEXT[];
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS next_agenda TEXT[];
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS product_insights TEXT[];
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS marketing_insights TEXT[];
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS operations_insights TEXT[];
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS pending_questions TEXT[];

DROP TRIGGER IF EXISTS meeting_summaries_updated_at ON meeting_summaries;
CREATE TRIGGER meeting_summaries_updated_at BEFORE UPDATE ON meeting_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 6. MEETING DECISIONS (with owner + status)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meeting_decisions ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE meeting_decisions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'meeting_decisions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE meeting_decisions DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE meeting_decisions
  ADD CONSTRAINT meeting_decisions_status_check CHECK (status IN ('open', 'closed'));

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting ON meeting_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_owner ON meeting_decisions(owner_id);

DROP TRIGGER IF EXISTS meeting_decisions_updated_at ON meeting_decisions;
CREATE TRIGGER meeting_decisions_updated_at BEFORE UPDATE ON meeting_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 7. MEETING INSIGHTS (risks / opportunities / actions / generic)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('risk', 'opportunity', 'action', 'insight')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meeting_insights ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'meeting_insights'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%kind%'
  LOOP
    EXECUTE format('ALTER TABLE meeting_insights DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE meeting_insights
  ADD CONSTRAINT meeting_insights_kind_check CHECK (kind IN ('risk', 'opportunity', 'action', 'insight'));

CREATE INDEX IF NOT EXISTS idx_meeting_insights_meeting ON meeting_insights(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_insights_kind ON meeting_insights(kind);

DROP TRIGGER IF EXISTS meeting_insights_updated_at ON meeting_insights;
CREATE TRIGGER meeting_insights_updated_at BEFORE UPDATE ON meeting_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE meetings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_summaries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_decisions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_insights      ENABLE ROW LEVEL SECURITY;

-- Helper: derive caller's organization_id from the profiles table.
-- Profiles is the canonical mapping (auth.users.id → organization_id).
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Drop and recreate policies idempotently.
DO $$
DECLARE
  pol RECORD;
  tables TEXT[] := ARRAY[
    'meetings','meeting_participants','meeting_attachments',
    'meeting_transcriptions','meeting_summaries','meeting_decisions',
    'meeting_insights'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Generic "same organization" policy. For child tables we join via
-- meeting → organization_id to keep policies simple and consistent.
CREATE POLICY meetings_select_same_org ON meetings
  FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY meetings_insert_same_org ON meetings
  FOR INSERT WITH CHECK (organization_id = current_organization_id());
CREATE POLICY meetings_update_same_org ON meetings
  FOR UPDATE USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());
CREATE POLICY meetings_delete_same_org ON meetings
  FOR DELETE USING (organization_id = current_organization_id());

CREATE POLICY participants_same_org ON meeting_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_participants.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_participants.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );

CREATE POLICY attachments_same_org ON meeting_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attachments.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attachments.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );

CREATE POLICY transcriptions_same_org ON meeting_transcriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_transcriptions.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_transcriptions.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );

CREATE POLICY summaries_same_org ON meeting_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_summaries.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_summaries.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );

CREATE POLICY decisions_same_org ON meeting_decisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_decisions.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_decisions.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );

CREATE POLICY insights_same_org ON meeting_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_insights.meeting_id
        AND m.organization_id = current_organization_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_insights.meeting_id
        AND m.organization_id = current_organization_id()
    )
  );
