package com.connectprojects.backend.reports;

import com.connectprojects.backend.account.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "report_email_deliveries")
public class ReportEmailDeliveryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AppUser createdBy;

    @Column(name = "schedule_id")
    private Long scheduleId;

    @Column(name = "recipient_email", nullable = false, length = 254)
    private String recipientEmail;

    @Column(nullable = false, length = 12)
    private String frequency;

    @Column(name = "report_period", nullable = false, length = 30)
    private String reportPeriod;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    protected ReportEmailDeliveryEntity() {
    }

    public ReportEmailDeliveryEntity(AppUser createdBy, Long scheduleId, String recipientEmail,
                                     String frequency, String reportPeriod, Instant sentAt) {
        this.createdBy = createdBy;
        this.scheduleId = scheduleId;
        this.recipientEmail = recipientEmail;
        this.frequency = frequency;
        this.reportPeriod = reportPeriod;
        this.sentAt = sentAt;
    }

    public Long getId() { return id; }
    public AppUser getCreatedBy() { return createdBy; }
    public Long getScheduleId() { return scheduleId; }
    public String getRecipientEmail() { return recipientEmail; }
    public String getFrequency() { return frequency; }
    public String getReportPeriod() { return reportPeriod; }
    public Instant getSentAt() { return sentAt; }
}
