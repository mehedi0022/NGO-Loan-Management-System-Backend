import "dotenv/config";
import { z } from "zod";

const booleanString = z.preprocess(
  (value) => value === "true" ? true : value === "false" ? false : value,
  z.boolean(),
);
const optionalText = z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1).optional());
const optionalHttpUrl = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().url().refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "must be an HTTP(S) URL",
  ).optional(),
);
const postgresUrl = z.string().url().refine(
  (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
  "must be a PostgreSQL URL",
);
const durationString = z.string()
  .regex(/^\d+(ms|s|m|h|d|w|y)$/)
  .refine((value) => {
    const milliseconds = parseDurationMs(value);
    return milliseconds > 0 && Number.isSafeInteger(milliseconds);
  }, "must be a positive duration within the safe integer range");
const durationUnits = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_536_000_000,
} as const;
const parseDurationMs = (value: string) => {
  const match = /^(\d+)(ms|s|m|h|d|w|y)$/.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  return Number(match[1]) * durationUnits[match[2] as keyof typeof durationUnits];
};

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: postgresUrl,
  DATABASE_MIGRATION_URL: optionalText.pipe(postgresUrl.optional()),
  DATABASE_TLS_MODE: z.enum(["disable", "verify-full"]).default("disable"),
  DATABASE_TLS_CA_FILE: optionalText,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: durationString.default("15m"),
  JWT_ISSUER: z.string().trim().min(1).default("express-ts-starter"),
  JWT_ACCESS_AUDIENCE: z.string().trim().min(1).default("express-ts-starter-api"),
  JWT_REFRESH_AUDIENCE: z.string().trim().min(1).default("express-ts-starter-refresh"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  CORS_CREDENTIALS: booleanString.default(true),
  CSRF_TRUSTED_ORIGINS: optionalText,
  TRUST_PROXY: z.string().default("false"),
  COOKIE_NAME: z.string().trim().min(1).default("refreshToken"),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: optionalText,
  COOKIE_PATH: z.string().trim().startsWith("/").default("/api/v1/auth"),
  RATE_LIMIT_ENABLED: booleanString.default(true),
  RATE_LIMIT_STORE: z.enum(["memory", "redis"]).default("memory"),
  RATE_LIMIT_REDIS_PREFIX: z.string().trim().min(1).default("express-ts-starter:rate-limit:"),
  REDIS_URL: optionalText,
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_GLOBAL_WINDOW: durationString.default("1m"),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW: durationString.default("15m"),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_REGISTER_WINDOW: durationString.default("1h"),
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_REFRESH_WINDOW: durationString.default("1m"),
  RATE_LIMIT_FORGOT_PASSWORD_MAX: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_FORGOT_PASSWORD_WINDOW: durationString.default("1h"),
  SESSION_IDLE_TTL: durationString.default("24h"),
  SESSION_REMEMBER_ME_IDLE_TTL: durationString.default("7d"),
  SESSION_ABSOLUTE_TTL: durationString.default("30d"),
  SESSION_REVOKED_RETENTION: durationString.default("30d"),
  PASSWORD_RESET_TOKEN_TTL: durationString.default("1h"),
  EMAIL_VERIFICATION_TOKEN_TTL: durationString.default("24h"),
  SMTP_ENABLED: booleanString.default(false),
  SMTP_HOST: optionalText,
  SMTP_PORT: z.preprocess((value) => (value === "" || value === undefined ? undefined : value), z.coerce.number().int().positive().max(65_535).optional()),
  SMTP_SECURE: booleanString.default(false),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.email().optional()),
  SMTP_FROM_NAME: optionalText,
  EMAIL_BRAND_NAME: z.string().trim().min(1).max(80).default("Express Starter"),
  EMAIL_PRIMARY_COLOR: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be a #RRGGBB color").default("#2563EB"),
  EMAIL_LOGO_URL: optionalHttpUrl,
  EMAIL_APP_URL: optionalHttpUrl,
  EMAIL_SUPPORT_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.email().optional()),
  EMAIL_FOOTER_TEXT: optionalText,
  CLOUDINARY_ENABLED: booleanString.default(false),
  CLOUDINARY_CLOUD_NAME: optionalText,
  CLOUDINARY_API_KEY: optionalText,
  CLOUDINARY_API_SECRET: optionalText,
  UPLOAD_ENABLED: booleanString.default(false),
  UPLOAD_STORAGE: z.enum(["local", "cloudinary"]).default("local"),
  UPLOAD_LOCAL_DIR: z.string().trim().min(1).default("uploads"),
  UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  UPLOAD_MAX_FILE_COUNT: z.coerce.number().int().positive().max(10).default(5),
  UPLOAD_ALLOWED_MIME_TYPES: z.string().default("image/jpeg,image/png,image/webp"),
  UPLOAD_CLOUDINARY_FOLDER: z.string().trim().regex(/^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,119}$/).default("express-starter"),
}).superRefine((value, context) => {
  for (const [key, url] of [["DATABASE_URL", value.DATABASE_URL], ["DATABASE_MIGRATION_URL", value.DATABASE_MIGRATION_URL]] as const) {
    if (!url) continue;
    const params = new URL(url).searchParams;
    if (["sslmode", "sslcert", "sslkey", "sslrootcert"].some((name) => params.has(name))) {
      context.addIssue({ code: "custom", path: [key], message: "TLS query parameters are not supported; use DATABASE_TLS_* settings" });
    }
  }
  if (value.NODE_ENV === "production" && value.DATABASE_TLS_MODE !== "verify-full") {
    context.addIssue({ code: "custom", path: ["DATABASE_TLS_MODE"], message: "must be verify-full in production" });
  }
  if (value.NODE_ENV === "production" && !value.COOKIE_SECURE) {
    context.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "must be true in production" });
  }
  if (value.NODE_ENV === "production" && value.TRUST_PROXY === "true") {
    context.addIssue({ code: "custom", path: ["TRUST_PROXY"], message: "must identify trusted proxy hops or networks; true trusts spoofed forwarding headers" });
  }
  if (value.DATABASE_TLS_CA_FILE && value.DATABASE_TLS_MODE !== "verify-full") {
    context.addIssue({ code: "custom", path: ["DATABASE_TLS_CA_FILE"], message: "requires DATABASE_TLS_MODE=verify-full" });
  }
  if (value.COOKIE_SAME_SITE === "none" && !value.COOKIE_SECURE) {
    context.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "must be true when COOKIE_SAME_SITE=none" });
  }
  if (value.COOKIE_DOMAIN && /[/:@\s]/.test(value.COOKIE_DOMAIN)) {
    context.addIssue({ code: "custom", path: ["COOKIE_DOMAIN"], message: "must be a hostname, not a URL or path" });
  }
  if (value.RATE_LIMIT_STORE === "redis") {
    if (!value.REDIS_URL) {
      context.addIssue({ code: "custom", path: ["REDIS_URL"], message: "is required when RATE_LIMIT_STORE=redis" });
    } else {
      try {
        if (!["redis:", "rediss:"].includes(new URL(value.REDIS_URL).protocol)) {
          context.addIssue({ code: "custom", path: ["REDIS_URL"], message: "must use redis:// or rediss://" });
        }
      } catch {
        context.addIssue({ code: "custom", path: ["REDIS_URL"], message: "must be a valid Redis URL" });
      }
    }
  }
  const requireFields = (enabled: boolean, fields: Array<[string, unknown]>) => {
    if (!enabled) return;
    for (const [key, fieldValue] of fields) if (fieldValue === undefined) {
      context.addIssue({ code: "custom", path: [key], message: "is required when the module is enabled" });
    }
  };
  requireFields(value.SMTP_ENABLED, [["SMTP_HOST", value.SMTP_HOST], ["SMTP_PORT", value.SMTP_PORT], ["SMTP_USER", value.SMTP_USER], ["SMTP_PASSWORD", value.SMTP_PASSWORD], ["SMTP_FROM_EMAIL", value.SMTP_FROM_EMAIL], ["EMAIL_APP_URL", value.EMAIL_APP_URL]]);
  requireFields(value.CLOUDINARY_ENABLED, [["CLOUDINARY_CLOUD_NAME", value.CLOUDINARY_CLOUD_NAME], ["CLOUDINARY_API_KEY", value.CLOUDINARY_API_KEY], ["CLOUDINARY_API_SECRET", value.CLOUDINARY_API_SECRET]]);
  if (value.UPLOAD_ENABLED && value.UPLOAD_STORAGE === "cloudinary" && !value.CLOUDINARY_ENABLED) {
    context.addIssue({ code: "custom", path: ["CLOUDINARY_ENABLED"], message: "must be true when UPLOAD_STORAGE=cloudinary" });
  }
});

const parseTrustProxy = (value: string): boolean | number | string => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
};

export const loadConfig = (source: NodeJS.ProcessEnv = process.env) => {
  const result = rawEnvSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  const value = result.data;
  const origins = value.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) throw new Error("Invalid environment configuration: CORS_ORIGINS cannot be empty");
  const normalizeOrigins = (items: string[], key: string) => items.map((item) => {
    if (item === "*") throw new Error(`Invalid environment configuration: ${key} cannot contain wildcard origins`);
    let url: URL;
    try { url = new URL(item); } catch { throw new Error(`Invalid environment configuration: ${key} contains an invalid URL`); }
    if (!["http:", "https:"].includes(url.protocol) || url.origin === "null") {
      throw new Error(`Invalid environment configuration: ${key} must contain HTTP(S) origins`);
    }
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      throw new Error(`Invalid environment configuration: ${key} entries must be origins without paths, credentials, query, or fragment`);
    }
    return url.origin;
  });
  const corsOrigins = normalizeOrigins(origins, "CORS_ORIGINS");
  const csrfOrigins = value.CSRF_TRUSTED_ORIGINS
    ? normalizeOrigins(value.CSRF_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean), "CSRF_TRUSTED_ORIGINS")
    : corsOrigins;
  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    isProduction: value.NODE_ENV === "production",
    database: {
      runtimeUrl: value.DATABASE_URL,
      migrationUrl: value.DATABASE_MIGRATION_URL ?? value.DATABASE_URL,
      tls: { mode: value.DATABASE_TLS_MODE, caFile: value.DATABASE_TLS_CA_FILE },
      pool: { max: value.DATABASE_POOL_MAX, connectionTimeoutMs: value.DATABASE_CONNECT_TIMEOUT_MS, idleTimeoutMs: value.DATABASE_IDLE_TIMEOUT_MS },
    },
    jwt: {
      accessSecret: value.JWT_ACCESS_SECRET,
      refreshSecret: value.JWT_REFRESH_SECRET,
      accessExpiresIn: value.JWT_ACCESS_EXPIRES_IN,
      issuer: value.JWT_ISSUER,
      accessAudience: value.JWT_ACCESS_AUDIENCE,
      refreshAudience: value.JWT_REFRESH_AUDIENCE,
    },
    cors: { origins: corsOrigins, credentials: value.CORS_CREDENTIALS },
    csrf: { trustedOrigins: csrfOrigins },
    trustProxy: parseTrustProxy(value.TRUST_PROXY),
    cookie: { name: value.COOKIE_NAME, secure: value.COOKIE_SECURE, sameSite: value.COOKIE_SAME_SITE, domain: value.COOKIE_DOMAIN, path: value.COOKIE_PATH },
    rateLimit: {
      enabled: value.RATE_LIMIT_ENABLED,
      store: value.RATE_LIMIT_STORE,
      redisPrefix: value.RATE_LIMIT_REDIS_PREFIX,
      global: { max: value.RATE_LIMIT_GLOBAL_MAX, windowMs: parseDurationMs(value.RATE_LIMIT_GLOBAL_WINDOW) },
      login: { max: value.RATE_LIMIT_LOGIN_MAX, windowMs: parseDurationMs(value.RATE_LIMIT_LOGIN_WINDOW) },
      register: { max: value.RATE_LIMIT_REGISTER_MAX, windowMs: parseDurationMs(value.RATE_LIMIT_REGISTER_WINDOW) },
      refresh: { max: value.RATE_LIMIT_REFRESH_MAX, windowMs: parseDurationMs(value.RATE_LIMIT_REFRESH_WINDOW) },
      forgotPassword: { max: value.RATE_LIMIT_FORGOT_PASSWORD_MAX, windowMs: parseDurationMs(value.RATE_LIMIT_FORGOT_PASSWORD_WINDOW) },
    },
    redis: { url: value.REDIS_URL, connectTimeoutMs: value.REDIS_CONNECT_TIMEOUT_MS },
    session: {
      idleTtlMs: parseDurationMs(value.SESSION_IDLE_TTL),
      rememberMeIdleTtlMs: parseDurationMs(value.SESSION_REMEMBER_ME_IDLE_TTL),
      absoluteTtlMs: parseDurationMs(value.SESSION_ABSOLUTE_TTL),
      revokedRetentionMs: parseDurationMs(value.SESSION_REVOKED_RETENTION),
    },
    accountToken: {
      passwordResetTtlMs: parseDurationMs(value.PASSWORD_RESET_TOKEN_TTL),
      emailVerificationTtlMs: parseDurationMs(value.EMAIL_VERIFICATION_TOKEN_TTL),
    },
    smtp: {
      enabled: value.SMTP_ENABLED,
      host: value.SMTP_HOST,
      port: value.SMTP_PORT,
      secure: value.SMTP_SECURE,
      user: value.SMTP_USER,
      password: value.SMTP_PASSWORD,
      fromEmail: value.SMTP_FROM_EMAIL,
      fromName: value.SMTP_FROM_NAME,
    },
    email: {
      brandName: value.EMAIL_BRAND_NAME,
      primaryColor: value.EMAIL_PRIMARY_COLOR,
      logoUrl: value.EMAIL_LOGO_URL,
      appUrl: value.EMAIL_APP_URL,
      supportEmail: value.EMAIL_SUPPORT_EMAIL,
      footerText: value.EMAIL_FOOTER_TEXT,
    },
    cloudinary: { enabled: value.CLOUDINARY_ENABLED, cloudName: value.CLOUDINARY_CLOUD_NAME, apiKey: value.CLOUDINARY_API_KEY, apiSecret: value.CLOUDINARY_API_SECRET },
    upload: {
      enabled: value.UPLOAD_ENABLED,
      storage: value.UPLOAD_STORAGE,
      localDir: value.UPLOAD_LOCAL_DIR,
      maxFileSizeBytes: value.UPLOAD_MAX_FILE_SIZE_BYTES,
      maxFileCount: value.UPLOAD_MAX_FILE_COUNT,
      allowedMimeTypes: value.UPLOAD_ALLOWED_MIME_TYPES.split(",").map((type) => type.trim()).filter(Boolean),
      cloudinaryFolder: value.UPLOAD_CLOUDINARY_FOLDER,
    },
  } as const;
};

export type AppConfig = ReturnType<typeof loadConfig>;
export const config = loadConfig();
