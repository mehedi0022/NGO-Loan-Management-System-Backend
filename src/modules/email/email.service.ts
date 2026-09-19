import nodemailer, { type Transporter } from "nodemailer";
import type { Logger } from "pino";

import { config, type AppConfig } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { EmailDeliveryError } from "../../errors/AppError.js";
import type { EmailMessage, EmailService, SentEmail } from "./email.types.js";

type SmtpConfig = AppConfig["smtp"];

export type EmailTransport = Pick<Transporter, "sendMail" | "verify">;
type EmailLogger = Pick<Logger, "info" | "error">;

const formatFromAddress = (email: string, name?: string) =>
  name ? `"${name.replaceAll('"', "\\\"")}" <${email}>` : email;

class DisabledEmailService implements EmailService {
  async sendEmail(): Promise<SentEmail> {
    return { delivered: false };
  }

  async verifyConnection(): Promise<void> {}
}

class SmtpEmailService implements EmailService {
  constructor(
    private readonly transport: EmailTransport,
    private readonly smtp: SmtpConfig,
    private readonly serviceLogger: EmailLogger,
  ) {}

  async sendEmail(message: EmailMessage): Promise<SentEmail> {
    try {
      const result = await this.transport.sendMail({
        from: formatFromAddress(this.smtp.fromEmail!, this.smtp.fromName),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      this.serviceLogger.info({ to: message.to, messageId: result.messageId }, "Email delivered");
      return { delivered: true, messageId: result.messageId };
    } catch (error) {
      this.serviceLogger.error({
        errorName: error instanceof Error ? error.name : "UnknownError",
        to: message.to,
      }, "Email delivery failed");
      throw new EmailDeliveryError();
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transport.verify();
    } catch (error) {
      this.serviceLogger.error({
        errorName: error instanceof Error ? error.name : "UnknownError",
      }, "SMTP connection verification failed");
      throw new EmailDeliveryError();
    }
  }
}

const createSmtpTransport = (smtp: SmtpConfig): EmailTransport =>
  nodemailer.createTransport({
    host: smtp.host!,
    port: smtp.port!,
    secure: smtp.secure,
    auth: { user: smtp.user!, pass: smtp.password! },
  });

export const createEmailService = ({
  smtp = config.smtp,
  transport,
  serviceLogger = logger,
}: {
  smtp?: SmtpConfig;
  transport?: EmailTransport;
  serviceLogger?: EmailLogger;
} = {}): EmailService => {
  if (!smtp.enabled) return new DisabledEmailService();
  return new SmtpEmailService(transport ?? createSmtpTransport(smtp), smtp, serviceLogger);
};

export const emailService = createEmailService();
