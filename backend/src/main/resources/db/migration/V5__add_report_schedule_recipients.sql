CREATE TABLE report_schedule_recipients (
    schedule_id BIGINT NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
    recipient_order INTEGER NOT NULL,
    email VARCHAR(254) NOT NULL,
    CONSTRAINT pk_report_schedule_recipients PRIMARY KEY (schedule_id, recipient_order),
    CONSTRAINT uq_report_schedule_recipients_email UNIQUE (schedule_id, email)
);

INSERT INTO report_schedule_recipients (schedule_id, recipient_order, email)
SELECT id, 0, email
FROM report_schedules;
