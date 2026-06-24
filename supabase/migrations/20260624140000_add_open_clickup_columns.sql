-- Open ClickUp lightweight port — optional Supabase columns.
-- Safe: all columns are nullable, so existing rows continue working.
-- Apply via `supabase db push` or `supabase migration up` in the Triade Saúde project.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position   INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on UUID[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration   INTEGER;

-- Helpful index for Gantt range queries (filter by start_date window).
CREATE INDEX IF NOT EXISTS tasks_start_due_idx ON tasks (start_date, due_date);

-- Helpful index for Table ordering / drag-reorder persistence.
CREATE INDEX IF NOT EXISTS tasks_position_idx ON tasks (position);
