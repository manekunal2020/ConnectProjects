CREATE TABLE clients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    industry VARCHAR(160),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE projects
    ADD COLUMN client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE project_team_leaders (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE support_shifts (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    days_of_week VARCHAR(40) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(80)
);

CREATE TABLE ticket_priorities (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 10),
    color VARCHAR(16),
    CONSTRAINT uq_project_priority_name UNIQUE (project_id, name)
);

CREATE TABLE ticket_categories (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    CONSTRAINT uq_project_category_name UNIQUE (project_id, name)
);

CREATE TABLE ticket_subcategories (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    CONSTRAINT uq_category_subcategory_name UNIQUE (category_id, name)
);

CREATE TABLE slas (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    priority_id BIGINT NOT NULL REFERENCES ticket_priorities(id) ON DELETE CASCADE,
    response_minutes INTEGER NOT NULL CHECK (response_minutes > 0),
    resolution_minutes INTEGER NOT NULL CHECK (resolution_minutes > 0),
    business_hours_only BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_project_sla_priority UNIQUE (project_id, priority_id)
);

CREATE INDEX ix_support_shifts_project ON support_shifts (project_id);
CREATE INDEX ix_ticket_priorities_project_level ON ticket_priorities (project_id, level);
CREATE INDEX ix_ticket_categories_project ON ticket_categories (project_id);
CREATE INDEX ix_slas_project ON slas (project_id);
