import crypto from "crypto";

export const SESSION_COOKIE_NAME = "nfc_user_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  uid: number | string;
  lineSub: string;
  exp: number;
};

function getSessionSecret() {
  return process.env.APP_AUTH_SECRET || "";
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function signPayload(payloadBase64: string, secret: string) {
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(payloadBase64).digest());
}

export function createUserSessionToken(payload: {
  uid: number | string;
  lineSub: string;
  exp?: number;
}) {
  const secret = getSessionSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp ?? now + SESSION_TTL_SECONDS;
  const body: SessionPayload = {
    uid: payload.uid,
    lineSub: payload.lineSub,
    exp,
  };
  const payloadBase64 = base64UrlEncode(Buffer.from(JSON.stringify(body), "utf8"));
  const signature = signPayload(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

export function verifyUserSessionToken(token: string) {
  const secret = getSessionSecret();
  if (!secret) {
    return { ok: false as const, error: "missing_secret" };
  }
  if (!token || !token.includes(".")) {
    return { ok: false as const, error: "invalid_token" };
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return { ok: false as const, error: "invalid_token" };
  }

  const expected = signPayload(payloadBase64, secret);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) {
    return { ok: false as const, error: "invalid_signature" };
  }
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return { ok: false as const, error: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadBase64).toString("utf8")) as SessionPayload;
    if (!payload?.exp || Date.now() / 1000 > payload.exp) {
      return { ok: false as const, error: "expired" };
    }
    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, error: "invalid_payload" };
  }
}

export function getUserSessionFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false as const, error: "missing_cookie" };
  }
  return verifyUserSessionToken(token);
}

export function getSessionCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
