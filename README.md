# Express TypeScript Starter

## Session lifecycle

- `POST /api/v1/auth/logout` revokes the refresh session identified by the
  refresh-token cookie and clears that cookie. Repeating the request is safe.
- `POST /api/v1/auth/logout-all` requires an access bearer token, revokes every
  refresh session owned by that user **including the current session**, and
  clears the caller's refresh-token cookie.
- `rememberMe=false` uses `SESSION_IDLE_TTL` and a browser-session cookie.
- `rememberMe=true` uses `SESSION_REMEMBER_ME_IDLE_TTL` and a persistent cookie.
- Sliding refresh is always capped by `SESSION_ABSOLUTE_TTL`.

Expired sessions and sessions revoked longer than
`SESSION_REVOKED_RETENTION` can be removed manually or from a platform cron:

```text
npm run sessions:cleanup
```

The cleanup command is safe to run repeatedly. Configure its database through
the same validated runtime environment as the application.

## Optional email infrastructure

Email is disabled by default (`SMTP_ENABLED=false`) and automated tests never
send real email. When enabled, configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`; optional
`SMTP_FROM_NAME` controls the sender display name.

Business modules should use `emailService.sendEmail(...)` from the email module,
not import Nodemailer. Generic verification and password-reset templates live
under `src/modules/email/templates/` and can be customized independently from
the SMTP transport. `emailService.verifyConnection()` is available for an
explicit deployment health check and does not run at application startup.
`EMAIL_BRAND_NAME`, `EMAIL_PRIMARY_COLOR`, `EMAIL_LOGO_URL`,
`EMAIL_SUPPORT_EMAIL`, and `EMAIL_FOOTER_TEXT` customize the shared responsive
email shell. If no logo URL is supplied, the template renders a branded
monogram automatically.

## Optional upload infrastructure

Uploads are disabled by default. Set `UPLOAD_STORAGE=local` to use the server's
`UPLOAD_LOCAL_DIR` (`uploads` by default), or set `UPLOAD_STORAGE=cloudinary`
and then enable Cloudinary with its credentials. The module uses Multer memory
storage only for the lifetime of parsing; local files are written only after
validation succeeds. Local files are served read-only under `/uploads` when
uploads are enabled. Default policy allows JPEG,
PNG, and WebP with a 5 MiB per-file limit and five files per request. Configure
the limits and MIME allowlist with `UPLOAD_*` variables.

Use `imageUpload.single("file")` or `imageUpload.array("files")` for multipart
parsing, then call `uploadService.upload(file, "avatars")` after resource-level
authorization. The service verifies MIME type, filename extension, size, and
JPEG/PNG/WebP magic bytes before delegating to storage. Folders and public IDs
are server-controlled; clients do not supply Cloudinary transformations or
paths.

`uploadService.replace(...)` removes the newly uploaded object if the caller's
database persistence callback fails, then removes the old object only after
the persistence succeeds. A database and Cloudinary cannot share a native
transaction: a failed old-object deletion can leave an orphan and should be
retried by application-specific cleanup/monitoring.

## Web security boundary

Authorization uses the persisted `User.role` as its source of truth with
reusable role, permission, and ownership middleware. Access tokens identify
the user but do not authorize a role: authentication loads the current role
from PostgreSQL on every protected request, so role changes take effect
immediately. New registrations default to `USER` at the database layer.

Persisted roles are `SUPER_ADMIN`, `ADMIN`, `USER`, `CUSTOMER`, `MODERATOR`,
`AUTHOR`, and `MANAGER`. The starter deliberately grants global user-management
permissions only to `SUPER_ADMIN` and `ADMIN`; all other roles start with the
same ownership-only access and can receive explicit permissions later.

User-management defaults are deliberately restrictive: admins may list and
delete users; users may read/update only their own non-sensitive profile;
admins may read/update any profile. Public registration remains only under
`/auth/register`.

Credentialed CORS uses exact origins from `CORS_ORIGINS`; wildcard origins are
rejected during configuration loading. The refresh token is HttpOnly and
scoped to `COOKIE_PATH` (`/api/v1/auth` by default). Production requires a
Secure cookie. `SameSite=lax` is the safe same-site default; cross-site clients
must explicitly choose `SameSite=none`, HTTPS, and an exact trusted origin.

CSRF protection assumes bearer access tokens are not browser-ambient, while the
refresh cookie is. Unsafe cookie-authenticated requests therefore require an
exact trusted `Origin` or `Referer`. SameSite and origin validation are
independent defenses. Non-browser and bearer-only requests may omit both
headers. This architecture does not need a synchronizer CSRF token unless more
general-purpose cookies are added later.

Rate limits use `express-rate-limit` and have separate global, login,
registration, refresh, and reserved forgot-password policies. Memory storage is
the zero-configuration default. Multi-instance deployments can set
`RATE_LIMIT_STORE=redis` and `REDIS_URL`; `rate-limit-redis` then shares counters
without changing route policy. Redis store failures are fail-closed.

`TRUST_PROXY=false` is the default. Behind a proxy, configure the precise hop
count or trusted proxy network. `TRUST_PROXY=true` is rejected in production
because it permits clients to spoof forwarding headers when the last proxy is
not guaranteed to sanitize them.
