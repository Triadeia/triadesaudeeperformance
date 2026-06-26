-- Connect meeting intelligence to the operational task workspace.
-- This migration is intentionally additive so it can run safely on older
-- task schemas and on the newer organization-scoped API schema.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS creator_id UUID,
  ADD COLUMN IF NOT EXISTS assignee_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS meeting_id UUID,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS position INTEGER,
  ADD COLUMN IF NOT EXISTS depends_on UUID[],
  ADD COLUMN IF NOT EXISTS duration INTEGER;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check CHECK (
    status IN (
      'Backlog', 'A Fazer', 'Em andamento', 'Em revisão', 'Bloqueada', 'Concluída', 'Cancelada',
      'backlog', 'todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'
    )
  );

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check CHECK (
    priority IS NULL OR priority IN (
      'Urgente', 'Alta', 'Média', 'Baixa',
      'urgent', 'high', 'medium', 'low'
    )
  );

UPDATE public.tasks
SET due_at = due_date::timestamptz
WHERE due_at IS NULL
  AND due_date IS NOT NULL;

UPDATE public.tasks
SET ai_score = score
WHERE ai_score IS NULL
  AND score IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_meeting_id_fkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_meeting_id_fkey
      FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id ON public.tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
