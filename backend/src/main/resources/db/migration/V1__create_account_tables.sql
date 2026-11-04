CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(254) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_app_users_username UNIQUE (username),
    CONSTRAINT uq_app_users_email UNIQUE (email),
    CONSTRAINT ck_app_users_role CHECK (role IN ('SUPER_USER', 'ADMIN', 'PROJECT_LEAD'))
);

CREATE TABLE account_requests (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(254) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES app_users(id),
    CONSTRAINT ck_account_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE UNIQUE INDEX uq_pending_account_request_username
    ON account_requests (LOWER(username)) WHERE status = 'PENDING';
CREATE UNIQUE INDEX uq_pending_account_request_email
    ON account_requests (LOWER(email)) WHERE status = 'PENDING';
CREATE INDEX ix_account_requests_status_submitted
    ON account_requests (status, submitted_at);
