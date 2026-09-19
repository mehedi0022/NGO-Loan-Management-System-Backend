import type { EmailTemplate } from "../email.types.js";
import { renderBrandedEmail, type EmailBrand } from "./base.template.js";

export const createPasswordResetEmail = ({
  resetUrl,
  recipientName,
  brand,
}: {
  resetUrl: string;
  recipientName?: string;
  brand?: EmailBrand;
}): EmailTemplate => {
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";
  return {
    subject: "Reset your password",
    text: `${greeting}\n\nReset your password: ${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
    html: renderBrandedEmail({
      previewText: "Use this secure link to reset your password.",
      title: "Reset your password",
      greeting,
      paragraphs: ["We received a request to reset your password. Use the button below to choose a new one."],
      action: { label: "Reset password", url: resetUrl },
      securityNote: "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.",
      brand,
    }),
  };
};
