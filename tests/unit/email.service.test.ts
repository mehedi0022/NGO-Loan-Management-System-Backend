import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/config/env.js";
import { EmailDeliveryError } from "../../src/errors/AppError.js";
import { createEmailService, type EmailTransport } from "../../src/modules/email/email.service.js";
import { createPasswordResetEmail } from "../../src/modules/email/templates/password-reset.template.js";
import { createVerificationEmail } from "../../src/modules/email/templates/verification.template.js";

const baseEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://app:password@localhost:5432/starter",
  JWT_ACCESS_SECRET: "access-secret-that-is-at-least-32-characters",
  JWT_REFRESH_SECRET: "refresh-secret-that-is-at-least-32-characters",
};

const smtpConfig = loadConfig({
  ...baseEnvironment,
  SMTP_ENABLED: "true",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "smtp-user",
  SMTP_PASSWORD: "smtp-password",
  SMTP_FROM_EMAIL: "no-reply@example.com",
  SMTP_FROM_NAME: "Starter App",
  EMAIL_APP_URL: "https://app.example.com",
}).smtp;

const message = {
  to: "recipient@example.com",
  subject: "Subject",
  text: "Plain text",
  html: "<p>HTML</p>",
};

describe("optional email service", () => {
  it("does not send when email is disabled", async () => {
    const transport = { sendMail: vi.fn(), verify: vi.fn() } as unknown as EmailTransport;
    const service = createEmailService({ smtp: loadConfig(baseEnvironment).smtp, transport });

    await expect(service.sendEmail(message)).resolves.toEqual({ delivered: false });
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("sends through an injected SMTP transport without contacting a real provider", async () => {
    const transport = {
      sendMail: vi.fn(async () => ({ messageId: "message-123" })),
      verify: vi.fn(async () => true),
    } as unknown as EmailTransport;
    const service = createEmailService({ smtp: smtpConfig, transport });

    await expect(service.sendEmail(message)).resolves.toEqual({ delivered: true, messageId: "message-123" });
    expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "\"Starter App\" <no-reply@example.com>",
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }));
    await expect(service.verifyConnection()).resolves.toBeUndefined();
  });

  it("converts provider failures to a generic operational error", async () => {
    const serviceLogger = { info: vi.fn(), error: vi.fn() };
    const transport = {
      sendMail: vi.fn(async () => { throw new Error("SMTP password=smtp-password failed"); }),
      verify: vi.fn(async () => { throw new Error("SMTP unreachable"); }),
    } as unknown as EmailTransport;
    const service = createEmailService({ smtp: smtpConfig, transport, serviceLogger });

    await expect(service.sendEmail(message)).rejects.toEqual(new EmailDeliveryError());
    await expect(service.verifyConnection()).rejects.toEqual(new EmailDeliveryError());
    expect(JSON.stringify(serviceLogger.error.mock.calls)).not.toContain("smtp-password");
  });

  it("provides generic, customizable verification and reset templates", () => {
    const brand = loadConfig({
      ...baseEnvironment,
      EMAIL_BRAND_NAME: "Acme",
      EMAIL_PRIMARY_COLOR: "#7C3AED",
      EMAIL_LOGO_URL: "https://cdn.example.com/logo.png",
      EMAIL_SUPPORT_EMAIL: "support@example.com",
      EMAIL_FOOTER_TEXT: "Built for better work.",
    }).email;
    const verification = createVerificationEmail({
      verificationUrl: "https://app.example.com/verify?token=example",
      recipientName: "Taylor",
      brand,
    });
    const reset = createPasswordResetEmail({
      resetUrl: "https://app.example.com/reset?token=example",
      brand,
    });

    expect(verification.subject).toBe("Verify your email address");
    expect(verification.text).toContain("Taylor");
    expect(verification.html).toContain("Verify email address");
    expect(verification.html).toContain("https://cdn.example.com/logo.png");
    expect(verification.html).toContain("#7C3AED");
    expect(verification.html).toContain("support@example.com");
    expect(verification.html).toContain("@media only screen and (max-width:620px)");
    expect(reset.subject).toBe("Reset your password");
    expect(reset.html).toContain("Reset password");
  });

  it("uses a safe branded monogram when no logo URL is configured", () => {
    const brand = loadConfig({
      ...baseEnvironment,
      EMAIL_BRAND_NAME: "Acme Studio",
      EMAIL_PRIMARY_COLOR: "#0F766E",
    }).email;
    const email = createVerificationEmail({
      verificationUrl: "https://app.example.com/verify?token=example",
      brand,
    });

    expect(email.html).toContain(">AS</td>");
    expect(email.html).toContain("#0F766E");
  });
});
