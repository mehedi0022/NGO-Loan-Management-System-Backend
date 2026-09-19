import { Temporal } from "temporal-polyfill";

import { config } from "./env.js";

const minimum = (left: Temporal.Instant, right: Temporal.Instant) =>
  Temporal.Instant.compare(left, right) <= 0 ? left : right;

export const getSessionWindow = (
  now: Temporal.Instant,
  rememberMe: boolean,
  existingAbsoluteExpiry?: Temporal.Instant,
) => {
  const idleTtlMs = rememberMe
    ? config.session.rememberMeIdleTtlMs
    : config.session.idleTtlMs;
  const absoluteExpiresAt = existingAbsoluteExpiry
    ?? now.add({ milliseconds: config.session.absoluteTtlMs });
  const expiresAt = minimum(
    now.add({ milliseconds: idleTtlMs }),
    absoluteExpiresAt,
  );

  return { expiresAt, absoluteExpiresAt, rememberMe };
};

export const millisecondsUntil = (
  expiry: Temporal.Instant,
  now = Temporal.Now.instant(),
) => Math.max(0, expiry.epochMilliseconds - now.epochMilliseconds);

export const getRevokedSessionCutoff = (now = Temporal.Now.instant()) =>
  now.subtract({ milliseconds: config.session.revokedRetentionMs });
