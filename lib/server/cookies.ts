import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const PLAYER_COOKIE = "swedle_player";
const ADMIN_COOKIE = "swedle_admin";

function secret(name: "PLAYER_COOKIE_SECRET" | "SWEDLE_ADMIN_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 24) throw new Error(`${name} must contain at least 24 characters.`);
  return value;
}

function signature(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getOrCreatePlayerId() {
  const store = await cookies();
  const raw = store.get(PLAYER_COOKIE)?.value;
  const key = secret("PLAYER_COOKIE_SECRET");

  if (raw) {
    const [id, suppliedSignature] = raw.split(".");
    if (id && suppliedSignature && safeEqual(suppliedSignature, signature(id, key))) return id;
  }

  const id = randomUUID();
  store.set(PLAYER_COOKIE, `${id}.${signature(id, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export function isPreviewEnvironment() {
  return process.env.VERCEL_ENV === "preview";
}

export function verifyAdminPassword(candidate: string) {
  const expected = secret("SWEDLE_ADMIN_SECRET");
  return safeEqual(candidate, expected);
}

export async function issueAdminCookie() {
  const store = await cookies();
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
  const body = String(expires);
  store.set(ADMIN_COOKIE, `${body}.${signature(body, secret("SWEDLE_ADMIN_SECRET"))}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
}

export async function hasValidAdminCookie() {
  if (!isPreviewEnvironment()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [expires, suppliedSignature] = raw.split(".");
  if (!expires || !suppliedSignature || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(suppliedSignature, signature(expires, secret("SWEDLE_ADMIN_SECRET")));
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
