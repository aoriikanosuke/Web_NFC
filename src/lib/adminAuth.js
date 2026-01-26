import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "nfc_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function signPayload(payloadBase64, secret) {
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(payloadBase64).digest());
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }
  const now = Date.now();
  const payload = {
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS * 1000,
    nonce: base64UrlEncode(crypto.randomBytes(16)),
  };
  const payloadBase64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = signPayload(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  const secret = getSessionSecret();
  if (!secret) {
    return { ok: false, error: "missing_secret" };
  }
  if (!token || !token.includes(".")) {
    return { ok: false, error: "invalid_token" };
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return { ok: false, error: "invalid_token" };
  }

  const expected = signPayload(payloadBase64, secret);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) {
    return { ok: false, error: "invalid_signature" };
  }
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return { ok: false, error: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadBase64).toString("utf8"));
    if (!payload?.exp || Date.now() > payload.exp) {
      return { ok: false, error: "expired" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "invalid_payload" };
  }
}

export function getAdminSessionFromRequest(request) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, error: "missing_cookie" };
  }
  return verifyAdminSessionToken(token);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}
