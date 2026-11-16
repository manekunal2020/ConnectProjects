package com.connectprojects.backend.reports;

import com.connectprojects.backend.account.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "report_schedules")
public class ReportScheduleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AppUser createdBy;

    @Column(nullable = false, length = 254)
    private String email;

    @ElementCollection
    @CollectionTable(name = "report_schedule_recipients", joinColumns = @JoinColumn(name = "schedule_id"))
    @OrderColumn(name = "recipient_order")
    @Column(name = "email", nullable = false, length = 254)
    private List<String> emails = new ArrayList<>();

    @Column(nullable = false, length = 12)
    private String frequency;

    @Column(name = "send_time", nullable = false)
    private LocalTime sendTime;

    @Column(name = "time_zone", nullable = false, length = 80)
    private String timeZone;

    private Integer weekday;

    @Column(name = "month_day")
    private Integer monthDay;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_sent_period", length = 30)
    private String lastSentPeriod;

    @Column(name = "last_sent_at")
    private Instant lastSentAt;

    protected ReportScheduleEntity() {
    }

    public ReportScheduleEntity(AppUser createdBy, List<String> emails, String frequency, LocalTime sendTime,
                                String timeZone, Integer weekday, Integer monthDay) {
        this.createdBy = createdBy;
        this.emails = new ArrayList<>(emails);
        this.email = emails.get(0);
        this.frequency = frequency;
        this.sendTime = sendTime;
        this.timeZone = timeZone;
        this.weekday = weekday;
        this.monthDay = monthDay;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public AppUser getCreatedBy() { return createdBy; }
    public String getEmail() { return email; }
    public List<String> getEmails() { return List.copyOf(emails); }
    public String getFrequency() { return frequency; }
    public LocalTime getSendTime() { return sendTime; }
    public String getTimeZone() { return timeZone; }
    public Integer getWeekday() { return weekday; }
    public Integer getMonthDay() { return monthDay; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public String getLastSentPeriod() { return lastSentPeriod; }
    public Instant getLastSentAt() { return lastSentAt; }
    public void markSent(String period, Instant at) { lastSentPeriod = period; lastSentAt = at; }
}
