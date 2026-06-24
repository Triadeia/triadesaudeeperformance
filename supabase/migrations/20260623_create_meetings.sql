-- ============================================================================
-- Meetings, Transcriptions, AI Analyses, Google Integrations
-- ============================================================================

-- 1. Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  participants TEXT[], -- array of names/emails
  audio_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date DESC);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own meetings"
  ON public.meetings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2. Transcriptions table
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  transcript_text TEXT,
  language TEXT DEFAULT 'pt-BR',
  model_used TEXT, -- 'gemini', 'openai', 'claude'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcriptions_meeting_id ON public.transcriptions(meeting_id);
CREATE INDEX idx_transcriptions_status ON public.transcriptions(status);

ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view transcriptions of their meetings"
  ON public.transcriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND user_id = auth.uid()));
CREATE POLICY "Users can create transcriptions for their meetings"
  ON public.transcriptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND user_id = auth.uid()));

-- 3. AI Analyses table
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  decisions JSONB, -- array of decisions
  action_items JSONB, -- array of action items
  summary TEXT,
  model_used TEXT, -- 'gemini', 'openai', 'claude'
  cost_usd DECIMAL(10, 4),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_analyses_transcription_id ON public.ai_analyses(transcription_id);

ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view analyses of their transcriptions"
  ON public.ai_analyses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transcriptions t
    JOIN public.meetings m ON t.meeting_id = m.id
    WHERE t.id = transcription_id AND m.user_id = auth.uid()
  ));

-- 4. Google Integrations table
CREATE TABLE IF NOT EXISTS public.google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_google_integrations_user_id ON public.google_integrations(user_id);

ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own Google integration"
  ON public.google_integrations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transcriptions_updated_at ON public.transcriptions;
CREATE TRIGGER trg_transcriptions_updated_at BEFORE UPDATE ON public.transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_google_integrations_updated_at ON public.google_integrations;
CREATE TRIGGER trg_google_integrations_updated_at BEFORE UPDATE ON public.google_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
