import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUserFromLine, findUserByLineSub } from "@/lib/db";
import { createUserSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

const STATE_COOKIE = "line_oauth_state";
const NONCE_COOKIE = "line_oauth_nonce";

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

function clearOauthCookies(response: NextResponse, isSecure: boolean) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(NONCE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  const isSecure = baseUrl.startsWith("https://");
  const failRedirect = new URL("/?login=failed", baseUrl);

  const fail = () => {
    const res = NextResponse.redirect(failRedirect);
    clearOauthCookies(res, isSecure);
    return res;
  };

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const stateCookie = request.cookies.get(STATE_COOKIE)?.value;
    const nonceCookie = request.cookies.get(NONCE_COOKIE)?.value;

    if (!code || !state || !stateCookie || state !== stateCookie || !nonceCookie) {
      return fail();
    }

    const clientId = process.env.LINE_CLIENT_ID;
    const clientSecret = process.env.LINE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return fail();
    }

    const redirectUri = `${baseUrl}/api/auth/line/callback`;
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData?.id_token) {
      return fail();
    }

    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: String(tokenData.id_token),
        client_id: clientId,
      }),
    });
    const verifyData = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verifyData?.sub || !verifyData?.nonce) {
      return fail();
    }
    if (verifyData.nonce !== nonceCookie) {
      return fail();
    }

    const lineSub = String(verifyData.sub).trim();
    if (!lineSub) {
      return fail();
    }
    const lineName = verifyData?.name ? String(verifyData.name) : null;
    const linePicture = verifyData?.picture ? String(verifyData.picture) : null;

    let user = await findUserByLineSub(lineSub);
    if (!user) {
      const username = `line_${lineSub}`;
      const passwordHash = crypto.randomBytes(32).toString("hex");
      user = await createUserFromLine({
        lineSub,
        lineName,
        linePicture,
        username,
        passwordHash,
      });
    }

    if (!user) {
      return fail();
    }

    const sessionToken = createUserSessionToken({ uid: user.id, lineSub });
    if (!sessionToken) {
      return fail();
    }

    const successRedirect = new URL("/?login=ok", baseUrl);
    const res = NextResponse.redirect(successRedirect);
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions(isSecure));
    clearOauthCookies(res, isSecure);
    return res;
  } catch (error) {
    console.error("[line callback] error:", error);
    return fail();
  }
}
