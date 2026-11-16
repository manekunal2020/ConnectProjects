ALTER TABLE app_users
    ADD COLUMN reset_token_hash VARCHAR(64),
    ADD COLUMN reset_token_expires TIMESTAMPTZ;

ALTER TABLE app_users DROP CONSTRAINT ck_app_users_role;
ALTER TABLE app_users
    ADD CONSTRAINT ck_app_users_role
    CHECK (role IN ('SUPER_USER', 'ADMIN', 'PROJECT_LEAD', 'TEAM_MEMBER'));

CREATE TABLE app_user_permissions (
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    permission VARCHAR(80) NOT NULL,
    PRIMARY KEY (user_id, permission)
);

INSERT INTO app_user_permissions (user_id, permission)
SELECT id, 'dashboard.view' FROM app_users WHERE role IN ('ADMIN', 'PROJECT_LEAD', 'TEAM_MEMBER')
ON CONFLICT DO NOTHING;
INSERT INTO app_user_permissions (user_id, permission)
SELECT id, permission
FROM app_users
CROSS JOIN (VALUES
    ('projects.view'), ('projects.create'), ('projects.edit'), ('projects.delete'),
    ('tasks.view'), ('tasks.create'), ('tasks.edit'), ('tasks.delete'),
    ('tickets.view'), ('tickets.create'), ('tickets.assign'), ('tickets.update'),
    ('tickets.resolve'), ('tickets.close'), ('tickets.delete'),
    ('reports.view'), ('reports.generate'), ('reports.export'),
    ('settings.view'), ('settings.edit')
) AS defaults(permission)
WHERE role = 'ADMIN'
ON CONFLICT DO NOTHING;
INSERT INTO app_user_permissions (user_id, permission)
SELECT id, permission
FROM app_users
CROSS JOIN (VALUES
    ('projects.view'), ('projects.create'), ('projects.edit'),
    ('tasks.view'), ('tasks.create'), ('tasks.edit'),
    ('tickets.view'), ('tickets.create'), ('tickets.assign'), ('tickets.update'),
    ('tickets.resolve'), ('tickets.close'),
    ('reports.view'), ('reports.generate'), ('reports.export'),
    ('settings.view'), ('settings.edit')
) AS defaults(permission)
WHERE role = 'PROJECT_LEAD'
ON CONFLICT DO NOTHING;
INSERT INTO app_user_permissions (user_id, permission)
SELECT id, permission
FROM app_users
CROSS JOIN (VALUES ('projects.view'), ('tasks.view'), ('tasks.edit'), ('tickets.view'), ('tickets.update'), ('reports.view'), ('settings.view')) AS defaults(permission)
WHERE role = 'TEAM_MEMBER'
ON CONFLICT DO NOTHING;

CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'On track',
    due_date DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    lead_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(240) NOT NULL,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    assignee_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    due_date DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(30) NOT NULL DEFAULT 'To do',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_tasks_assignee_status ON tasks (assignee_id, status);
CREATE INDEX ix_tasks_project ON tasks (project_id);

CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    subject VARCHAR(240) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(30) NOT NULL DEFAULT 'Open',
    assignee_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    response_sla_hours INTEGER NOT NULL,
    resolution_sla_hours INTEGER NOT NULL,
    response_due_at TIMESTAMPTZ NOT NULL,
    resolution_due_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_tickets_assignee_status ON tickets (assignee_id, status);
CREATE INDEX ix_tickets_created_at ON tickets (created_at);
CREATE INDEX ix_tickets_response_due ON tickets (response_due_at);
CREATE INDEX ix_tickets_resolution_due ON tickets (resolution_due_at);

CREATE TABLE ticket_history (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    actor_name VARCHAR(120) NOT NULL,
    action VARCHAR(80) NOT NULL,
    details VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_ticket_history_ticket_created ON ticket_history (ticket_id, created_at);

CREATE TABLE report_schedules (
    id BIGSERIAL PRIMARY KEY,
    created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    email VARCHAR(254) NOT NULL,
    frequency VARCHAR(12) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    send_time TIME NOT NULL,
    time_zone VARCHAR(80) NOT NULL,
    weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
    month_day INTEGER CHECK (month_day BETWEEN 1 AND 28),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sent_period VARCHAR(30),
    last_sent_at TIMESTAMPTZ
);

CREATE INDEX ix_report_schedules_active ON report_schedules (active, send_time);
