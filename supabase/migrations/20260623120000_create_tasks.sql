-- ============================================================================
-- Triade Saúde — Tasks persistence layer
-- ----------------------------------------------------------------------------
-- Creates the `tasks` and `task_filters` tables that back the frontend
-- (src/lib/tasks-storage.ts), plus RLS policies and the updated_at trigger.
--
-- Rollback: see /supabase/migrations/rollback/20260623120000_create_tasks.down.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. updated_at trigger function (reused across both tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. TASKS table
-- ---------------------------------------------------------------------------
-- Mirrors StoredTask in src/lib/tasks-storage.ts.
-- Status values include "Cancelada" because the frontend command parser
-- (STATUS_BY_KEYWORD) can transition tasks into that state.
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title        TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description  TEXT,
  status       TEXT NOT NULL CHECK (status IN (
    'Backlog',
    'A Fazer',
    'Em andamento',
    'Em revisão',
    'Bloqueada',
    'Concluída',
    'Cancelada'
  )),
  priority     TEXT CHECK (priority IS NULL OR priority IN (
    'Urgente', 'Alta', 'Média', 'Baixa'
  )),

  -- Denormalized free-text fields (matches current frontend model).
  -- TODO(post-MVP): promote `assignee`, `project`, `area` to FK references.
  assignee     TEXT,
  project      TEXT,
  area         TEXT,

  due_date     DATE,
  score        INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),

  -- Ownership / multi-tenant
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps (TIMESTAMPTZ for tz safety; trigger keeps updated_at fresh)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hot-path queries (filters, kanban, calendar)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id     ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at  ON public.tasks (created_at DESC);
-- Composite index: most common access pattern is "my tasks by status"
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks (user_id, status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. TASKS — Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks"   ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks"           ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. TASK_FILTERS table (saved filters per user)
-- ---------------------------------------------------------------------------
-- Mirrors TaskFiltersState in src/lib/tasks-storage.ts.
CREATE TABLE IF NOT EXISTS public.task_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  filters     JSONB NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_filters_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_task_filters_user_id ON public.task_filters (user_id);
-- Partial index: only one default is needed per user, but we enforce that
-- via a partial unique index rather than the application layer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_filters_one_default_per_user
  ON public.task_filters (user_id)
  WHERE is_default = TRUE;

DROP TRIGGER IF EXISTS trg_task_filters_set_updated_at ON public.task_filters;
CREATE TRIGGER trg_task_filters_set_updated_at
  BEFORE UPDATE ON public.task_filters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. TASK_FILTERS — Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_filters FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own filters"   ON public.task_filters;
DROP POLICY IF EXISTS "Users can create filters"           ON public.task_filters;
DROP POLICY IF EXISTS "Users can update their own filters" ON public.task_filters;
DROP POLICY IF EXISTS "Users can delete their own filters" ON public.task_filters;

CREATE POLICY "Users can view their own filters"
  ON public.task_filters
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create filters"
  ON public.task_filters
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own filters"
  ON public.task_filters
  FOR UPDATE
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own filters"
  ON public.task_filters
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Comments (documentation in catalog)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE  public.tasks                IS 'User tasks (Kanban / Calendar). RLS: owner-only.';
COMMENT ON COLUMN public.tasks.status         IS 'Workflow state. Must match the StoredTask.status union in src/lib/tasks-storage.ts.';
COMMENT ON COLUMN public.tasks.priority       IS 'Urgente | Alta | Média | Baixa. Optional.';
COMMENT ON COLUMN public.tasks.score          IS 'Priority/score (0-100). Used by the workspace ranking.';
COMMENT ON TABLE  public.task_filters         IS 'Saved filter sets per user. RLS: owner-only.';
COMMENT ON COLUMN public.task_filters.filters IS 'JSON shape: TaskFiltersState ({ statuses, priorities, assignees, projects, areas, search }).';
