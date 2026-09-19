export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SentEmail = {
  delivered: boolean;
  messageId?: string;
};

export interface EmailService {
  sendEmail(message: EmailMessage): Promise<SentEmail>;
  verifyConnection(): Promise<void>;
}

export type EmailTemplate = Omit<EmailMessage, "to">;
