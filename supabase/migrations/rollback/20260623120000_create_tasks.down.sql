-- ============================================================================
-- Rollback for 20260623120000_create_tasks.sql
-- ----------------------------------------------------------------------------
-- DESTRUCTIVE: drops `task_filters`, `tasks`, and their indexes/triggers/policies.
-- Run a fresh pg_dump of these tables before executing this in any environment
-- that has real data:
--   pg_dump --data-only -t public.tasks -t public.task_filters > tasks_backup.sql
-- ============================================================================

-- 1. Drop policies (idempotent; survives if policies were already removed)
DROP POLICY IF EXISTS "Users can view their own tasks"   ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks"           ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view their own filters"   ON public.task_filters;
DROP POLICY IF EXISTS "Users can create filters"           ON public.task_filters;
DROP POLICY IF EXISTS "Users can update their own filters" ON public.task_filters;
DROP POLICY IF EXISTS "Users can delete their own filters" ON public.task_filters;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS trg_tasks_set_updated_at        ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_filters_set_updated_at ON public.task_filters;

-- 3. Drop tables (cascade removes indexes and remaining grants)
DROP TABLE IF EXISTS public.task_filters CASCADE;
DROP TABLE IF EXISTS public.tasks        CASCADE;

-- 4. The set_updated_at() function is shared; only drop if nothing else uses it.
--    Uncomment if this migration is the sole consumer:
-- DROP FUNCTION IF EXISTS public.set_updated_at();
