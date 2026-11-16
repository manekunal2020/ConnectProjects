CREATE TABLE report_email_deliveries (
    id BIGSERIAL PRIMARY KEY,
    created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    schedule_id BIGINT REFERENCES report_schedules(id) ON DELETE SET NULL,
    recipient_email VARCHAR(254) NOT NULL,
    frequency VARCHAR(12) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    report_period VARCHAR(30) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_report_email_deliveries_user_sent
    ON report_email_deliveries (created_by, sent_at DESC);

INSERT INTO report_email_deliveries (
    created_by, schedule_id, recipient_email, frequency, report_period, sent_at
)
SELECT created_by, id, email, frequency, last_sent_period, last_sent_at
FROM report_schedules
WHERE last_sent_at IS NOT NULL
  AND last_sent_period IS NOT NULL;
