import { config, type AppConfig } from "../../../config/env.js";

export type EmailBrand = AppConfig["email"];

export type BrandedEmailContent = {
  previewText: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  action: { label: string; url: string };
  securityNote?: string;
  brand?: EmailBrand;
};

export const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const initials = (brandName: string) => brandName
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase();

const safeHttpUrl = (value: string) => {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Email action URLs must use HTTP(S)");
  }
  return url.toString();
};

const brandMark = (brand: EmailBrand) => brand.logoUrl
  ? `<img src="${escapeHtml(safeHttpUrl(brand.logoUrl))}" width="42" height="42" alt="${escapeHtml(brand.brandName)}" style="display:block;border:0;border-radius:10px;outline:none;text-decoration:none;object-fit:contain;">`
  : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="42" height="42" style="width:42px;height:42px;background:${brand.primaryColor};border-radius:10px;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.5px;">${escapeHtml(initials(brand.brandName))}</td></tr></table>`;

const footer = (brand: EmailBrand) => {
  const support = brand.supportEmail
    ? `Need help? <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#64748b;text-decoration:underline;">${escapeHtml(brand.supportEmail)}</a>`
    : "This is an automated message; please do not reply directly.";
  const footerText = brand.footerText ? `<br>${escapeHtml(brand.footerText)}` : "";
  return `<tr><td align="center" style="padding:24px 28px 8px;color:#64748b;font-family:Arial,sans-serif;font-size:12px;line-height:20px;">${support}${footerText}<br><span style="color:#94a3b8;">© ${new Date().getFullYear()} ${escapeHtml(brand.brandName)}</span></td></tr>`;
};

export const renderBrandedEmail = ({
  previewText,
  title,
  greeting,
  paragraphs,
  action,
  securityNote,
  brand = config.email,
}: BrandedEmailContent) => {
  const actionUrl = safeHttpUrl(action.url);
  const intro = paragraphs.map((paragraph) =>
    `<p style="margin:0 0 16px;color:#334155;font-family:Arial,sans-serif;font-size:16px;line-height:25px;">${escapeHtml(paragraph)}</p>`,
  ).join("");
  const note = securityNote
    ? `<tr><td style="padding:0 28px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;"><tr><td style="padding:14px 16px;color:#64748b;font-family:Arial,sans-serif;font-size:13px;line-height:20px;">${escapeHtml(securityNote)}</td></tr></table></td></tr>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark"><title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width:620px) { .email-shell { width:100% !important; } .email-card { border-radius:0 !important; } .email-padding { padding-left:22px !important; padding-right:22px !important; } .email-button { display:block !important; text-align:center !important; } }
    @media (prefers-color-scheme: dark) { .email-bg { background:#0f172a !important; } .email-card { background:#ffffff !important; } }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="width:100%;background:#f1f5f9;"><tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      <tr><td style="padding:0 16px 18px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:12px;vertical-align:middle;">${brandMark(brand)}</td><td style="vertical-align:middle;color:#0f172a;font-family:Arial,sans-serif;font-size:18px;font-weight:700;">${escapeHtml(brand.brandName)}</td></tr></table></td></tr>
      <tr><td class="email-card" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 16px rgba(15,23,42,0.08);overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:5px;background:${brand.primaryColor};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="email-padding" style="padding:34px 38px 10px;"><h1 style="margin:0 0 18px;color:#0f172a;font-family:Arial,sans-serif;font-size:26px;line-height:34px;letter-spacing:-0.3px;">${escapeHtml(title)}</h1><p style="margin:0 0 16px;color:#334155;font-family:Arial,sans-serif;font-size:16px;line-height:25px;">${escapeHtml(greeting)}</p>${intro}</td></tr>
          <tr><td class="email-padding" style="padding:12px 38px 32px;"><a class="email-button" href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${brand.primaryColor};border-radius:8px;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;line-height:20px;padding:14px 22px;text-decoration:none;">${escapeHtml(action.label)}</a></td></tr>
          ${note}
        </table>
      </td></tr>
      ${footer(brand)}
    </table>
  </td></tr></table>
</body></html>`;
};
