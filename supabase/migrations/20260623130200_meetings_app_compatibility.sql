-- ============================================================================
-- Meetings app compatibility layer
-- ----------------------------------------------------------------------------
-- Aligns the Phase 2 meetings schema with the Next.js UI/repository/API layer.
-- Safe to run after 20260623_create_meetings.sql.
-- ============================================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.meetings
SET starts_at = COALESCE(starts_at, meeting_date)
WHERE starts_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_starts_at
  ON public.meetings(starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_status
  ON public.meetings(status);

CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id UUID,
  display_name TEXT,
  attended BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting
  ON public.meeting_participants(meeting_id);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting owners read participants" ON public.meeting_participants;
CREATE POLICY "Meeting owners read participants"
  ON public.meeting_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Meeting owners manage participants" ON public.meeting_participants;
CREATE POLICY "Meeting owners manage participants"
  ON public.meeting_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  mime_type TEXT,
  byte_size BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting
  ON public.meeting_transcripts(meeting_id);

ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting owners manage transcripts" ON public.meeting_transcripts;
CREATE POLICY "Meeting owners manage transcripts"
  ON public.meeting_transcripts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  executive_summary TEXT,
  strategic_summary TEXT,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  operations_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting owners manage summaries" ON public.meeting_summaries;
CREATE POLICY "Meeting owners manage summaries"
  ON public.meeting_summaries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_summaries.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_summaries.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.meeting_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting
  ON public.meeting_decisions(meeting_id);

ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting owners manage decisions" ON public.meeting_decisions;
CREATE POLICY "Meeting owners manage decisions"
  ON public.meeting_decisions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_decisions.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_decisions.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.meeting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  organization_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('risk', 'opportunity', 'action', 'insight')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_insights_meeting
  ON public.meeting_insights(meeting_id);

ALTER TABLE public.meeting_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting owners manage insights" ON public.meeting_insights;
CREATE POLICY "Meeting owners manage insights"
  ON public.meeting_insights
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_insights.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_insights.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated read attachments" ON public.meeting_attachments;
DROP POLICY IF EXISTS "Authenticated insert attachments" ON public.meeting_attachments;
DROP POLICY IF EXISTS "Owner updates attachments" ON public.meeting_attachments;
DROP POLICY IF EXISTS "Owner deletes attachments" ON public.meeting_attachments;

CREATE POLICY "Meeting owners manage attachments"
  ON public.meeting_attachments
  FOR ALL
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_attachments.meeting_id
        AND meetings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_attachments.meeting_id
        AND meetings.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_meeting_transcripts_updated_at ON public.meeting_transcripts;
CREATE TRIGGER trg_meeting_transcripts_updated_at
  BEFORE UPDATE ON public.meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_meeting_summaries_updated_at ON public.meeting_summaries;
CREATE TRIGGER trg_meeting_summaries_updated_at
  BEFORE UPDATE ON public.meeting_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
