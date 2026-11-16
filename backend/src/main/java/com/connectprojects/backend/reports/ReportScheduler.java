package com.connectprojects.backend.reports;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReportScheduler {
    private final ReportScheduleService service;

    public ReportScheduler(ReportScheduleService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${app.reports.scheduler-delay-ms:30000}")
    public void sendDueReports() {
        service.sendDueReports();
    }
}
