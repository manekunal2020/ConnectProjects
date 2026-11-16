package com.connectprojects.backend.reports;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

public record ReportScheduleResponse(
        Long id,
        String email,
        List<String> emails,
        String frequency,
        LocalTime time,
        String timeZone,
        Integer weekday,
        Integer monthDay,
        Instant lastSentAt
) {
    public static ReportScheduleResponse from(ReportScheduleEntity entity) {
        return new ReportScheduleResponse(
                entity.getId(),
                entity.getEmail(),
                entity.getEmails(),
                entity.getFrequency(),
                entity.getSendTime(),
                entity.getTimeZone(),
                entity.getWeekday(),
                entity.getMonthDay(),
                entity.getLastSentAt()
        );
    }
}
