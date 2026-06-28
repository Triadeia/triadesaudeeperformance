-- Persist Open ClickUp-inspired task workspace details without exploding the
-- relational schema before the IA/task domain settles.
--
-- Core operational columns stay first-class in public.tasks. Rich UI state such
-- as subtasks, checklists, attachments, spaces/lists, timer totals, custom
-- fields and meeting backlinks lives here as structured JSONB and can be
-- promoted into dedicated tables later.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workspace_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_meta_gin
  ON public.tasks USING GIN (workspace_meta);

COMMENT ON COLUMN public.tasks.workspace_meta IS
  'Structured task workspace metadata: subtasks, checklists, attachments, time tracking, spaces/lists, tags, watchers and UI custom fields.';
