-- =====================================================================
-- Google Workspace OAuth integration
-- =====================================================================
-- Per-user OAuth connection. Tokens are stored ENCRYPTED at the
-- application layer (AES-256-GCM via src/lib/google/oauth.ts). The
-- database holds only ciphertext; the encryption key (AUTH_SECRET) is
-- never persisted here.
--
-- The encrypted payload contains both the IV and auth tag so the row is
-- self-contained for decryption.
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  email TEXT,
  scope TEXT,
  -- AES-256-GCM ciphertext (base64): iv || authTag || cipher
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_integrations_user ON google_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_google_integrations_expires ON google_integrations(expires_at);

DROP TRIGGER IF EXISTS google_integrations_updated_at ON google_integrations;
CREATE TRIGGER google_integrations_updated_at BEFORE UPDATE ON google_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'google_integrations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON google_integrations', pol.policyname);
  END LOOP;
END $$;

-- A user can only see/modify their own OAuth connection.
CREATE POLICY google_integrations_select_own ON google_integrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY google_integrations_insert_own ON google_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY google_integrations_update_own ON google_integrations
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY google_integrations_delete_own ON google_integrations
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- OAuth state CSRF tokens (short-lived, per-user).
-- These are unencrypted random strings; they are only valid for ~10 min
-- and are deleted as soon as the callback consumes them.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS google_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_states_user ON google_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires ON google_oauth_states(expires_at);

ALTER TABLE google_oauth_states ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'google_oauth_states'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON google_oauth_states', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY oauth_states_own ON google_oauth_states
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Ensure meeting_attachments has the processing_status column (it is
-- created in 20260623130000_create_meetings.sql, but we re-assert here
-- so this migration is safe when applied in isolation against the
-- legacy schema).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'meeting_attachments'
  ) THEN
    EXECUTE 'ALTER TABLE meeting_attachments ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT ''pending''';
    BEGIN
      EXECUTE 'ALTER TABLE meeting_attachments DROP CONSTRAINT IF EXISTS meeting_attachments_processing_status_check';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE 'ALTER TABLE meeting_attachments ADD CONSTRAINT meeting_attachments_processing_status_check CHECK (processing_status IN (''pending'', ''processing'', ''completed'', ''error''))';
  END IF;
END $$;
