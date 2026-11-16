package com.connectprojects.backend.reports;

import java.time.Instant;

public record ReportEmailDeliveryResponse(
        Long id,
        Long scheduleId,
        String recipientEmail,
        String frequency,
        String reportPeriod,
        Instant sentAt
) {
    public static ReportEmailDeliveryResponse from(ReportEmailDeliveryEntity entity) {
        return new ReportEmailDeliveryResponse(
                entity.getId(),
                entity.getScheduleId(),
                entity.getRecipientEmail(),
                entity.getFrequency(),
                entity.getReportPeriod(),
                entity.getSentAt()
        );
    }
}
