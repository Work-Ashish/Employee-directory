-- Apply DailyActivitySummary migration to tenant database (postgres_hrmscorp)
-- Run this against the tenant database after deploying the code.
-- Usage: psql -d postgres_hrmscorp -f apply_daily_summary_migration.sql

CREATE TABLE IF NOT EXISTS agent_daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    employee_id UUID NOT NULL REFERENCES employees_employee(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_seconds INTEGER NOT NULL DEFAULT 0,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    productive_seconds INTEGER NOT NULL DEFAULT 0,
    unproductive_seconds INTEGER NOT NULL DEFAULT 0,
    neutral_seconds INTEGER NOT NULL DEFAULT 0,
    keystroke_count INTEGER NOT NULL DEFAULT 0,
    mouse_click_count INTEGER NOT NULL DEFAULT 0,
    screenshot_count INTEGER NOT NULL DEFAULT 0,
    idle_event_count INTEGER NOT NULL DEFAULT 0,
    productivity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    top_apps JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_websites JSONB NOT NULL DEFAULT '[]'::jsonb,
    clock_in TIMESTAMPTZ NULL,
    clock_out TIMESTAMPTZ NULL,
    CONSTRAINT agent_daily_summaries_employee_date_uniq UNIQUE (employee_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_daily_summaries_employee
    ON agent_daily_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_agent_daily_summaries_date
    ON agent_daily_summaries(date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_daily_summaries_employee_date
    ON agent_daily_summaries(employee_id, date DESC);

-- Record in django_migrations so makemigrations doesn't re-create it
INSERT INTO django_migrations (app, name, applied)
VALUES ('agent', '0002_dailyactivitysummary', NOW())
ON CONFLICT DO NOTHING;
