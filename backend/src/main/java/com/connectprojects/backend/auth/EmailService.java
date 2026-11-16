package com.connectprojects.backend.auth;

import com.connectprojects.backend.api.ApiException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmailService {
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final String sender;

    public EmailService(
            ObjectProvider<JavaMailSender> mailSenders,
            @Value("${app.mail.from:}") String sender
    ) {
        this.mailSenders = mailSenders;
        this.sender = sender;
    }

    public void requireConfigured() {
        if (mailSenders.getIfAvailable() == null || sender.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery is not configured. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM.");
        }
    }

    public void send(String recipient, String subject, String text, String html) {
        send(List.of(recipient), subject, text, html);
    }

    public void send(List<String> recipients, String subject, String text, String html) {
        requireConfigured();
        try {
            MimeMessage message = mailSenders.getObject().createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(sender);
            helper.setTo(recipients.toArray(String[]::new));
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSenders.getObject().send(message);
        } catch (MessagingException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The email could not be sent. Check the configured mail service.");
        }
    }
}
