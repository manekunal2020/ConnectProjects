
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
}

export async function sendPasswordResetEmail(email, resetLink) {
  await transporter.sendMail({
    from: `"Connect Projects" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your Connect Projects password',
    text: `You requested a password reset.

Open this link to create a new password:
${resetLink}

This link expires in 15 minutes and can only be used once.

If you did not request this reset, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your Connect Projects password.</p>
        <p>Click the button below to create a new password.</p>
        <p>
          <a href="${resetLink}"
             style="background:#2563eb;color:white;padding:12px 20px;
             text-decoration:none;border-radius:6px;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendScheduledReportEmail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    throw new Error('Email delivery is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  await transporter.sendMail({
    from: `"Connect Projects" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
