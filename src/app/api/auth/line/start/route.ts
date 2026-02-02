import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const STATE_COOKIE = "line_oauth_state";
const NONCE_COOKIE = "line_oauth_nonce";
const OAUTH_TTL_SECONDS = 60 * 10;

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function randomBase64Url(bytes = 16) {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function getBaseUrl(request: NextRequest) {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protoHeader = request.headers.get("x-forwarded-proto");
  const proto = protoHeader ? protoHeader.split(",")[0]?.trim() : "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const isSecure = baseUrl.startsWith("https://");
  const failRedirect = new URL("/?login=failed", baseUrl);

  try {
    const clientId = process.env.LINE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(failRedirect);
    }

    const state = randomBase64Url(16);
    const nonce = randomBase64Url(16);
    const redirectUri = `${baseUrl}/api/auth/line/callback`;

    const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "openid profile");
    authUrl.searchParams.set("nonce", nonce);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: OAUTH_TTL_SECONDS,
    });
    response.cookies.set(NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: OAUTH_TTL_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.redirect(failRedirect);
  }
}
