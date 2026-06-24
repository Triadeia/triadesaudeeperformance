-- ============================================================================
-- Fase 2: Google Integrations + Meeting Attachments
-- ----------------------------------------------------------------------------
-- Complementa o schema existente (meeting_summaries, meeting_decisions,
-- meeting_insights, meeting_transcripts, ai_outputs) sem quebrá-lo.
-- ============================================================================

-- 1. Google integrations (OAuth tokens por usuário)
CREATE TABLE IF NOT EXISTS public.google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,            -- encrypted at rest (server-side)
  refresh_token TEXT,                    -- encrypted at rest (server-side)
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_integrations_user_id
  ON public.google_integrations(user_id);

ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own google integration" ON public.google_integrations;
CREATE POLICY "Users manage own google integration"
  ON public.google_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Meeting attachments (uploads: audio/video/transcript files)
CREATE TABLE IF NOT EXISTS public.meeting_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,              -- references public.meetings(id)
  organization_id UUID,                  -- optional multi-tenant scope
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'upload'
    CHECK (source IN ('upload', 'google_drive', 'youtube', 'link')),
  origin_url TEXT,
  storage_path TEXT,                     -- supabase storage path when uploaded
  filename TEXT,
  mime_type TEXT,
  byte_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting
  ON public.meeting_attachments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attachments_status
  ON public.meeting_attachments(status);

ALTER TABLE public.meeting_attachments ENABLE ROW LEVEL SECURITY;

-- Permissive policies: visibility scoped to authenticated users.
-- (Tightening will require linking attachments back to meeting ownership.)
DROP POLICY IF EXISTS "Authenticated read attachments" ON public.meeting_attachments;
CREATE POLICY "Authenticated read attachments"
  ON public.meeting_attachments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert attachments" ON public.meeting_attachments;
CREATE POLICY "Authenticated insert attachments"
  ON public.meeting_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Owner updates attachments" ON public.meeting_attachments;
CREATE POLICY "Owner updates attachments"
  ON public.meeting_attachments
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Owner deletes attachments" ON public.meeting_attachments;
CREATE POLICY "Owner deletes attachments"
  ON public.meeting_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- 3. updated_at trigger (reuses public.set_updated_at if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $body$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $body$;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_google_integrations_updated_at ON public.google_integrations;
CREATE TRIGGER trg_google_integrations_updated_at
  BEFORE UPDATE ON public.google_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_meeting_attachments_updated_at ON public.meeting_attachments;
CREATE TRIGGER trg_meeting_attachments_updated_at
  BEFORE UPDATE ON public.meeting_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
