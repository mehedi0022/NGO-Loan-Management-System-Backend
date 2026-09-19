import type { EmailTemplate } from "../email.types.js";
import { renderBrandedEmail, type EmailBrand } from "./base.template.js";

export const createVerificationEmail = ({
  verificationUrl,
  recipientName,
  brand,
}: {
  verificationUrl: string;
  recipientName?: string;
  brand?: EmailBrand;
}): EmailTemplate => {
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";
  return {
    subject: "Verify your email address",
    text: `${greeting}\n\nVerify your email address: ${verificationUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: renderBrandedEmail({
      previewText: "Confirm your email address to activate your account.",
      title: "Verify your email address",
      greeting,
      paragraphs: ["Thanks for joining us. Please confirm your email address to activate your account."],
      action: { label: "Verify email address", url: verificationUrl },
      securityNote: "If you did not create this account, you can safely ignore this email.",
      brand,
    }),
  };
};
