import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

function isSecureRequest(request: NextRequest) {
  const protoHeader = request.headers.get("x-forwarded-proto");
  if (protoHeader) {
    return protoHeader.split(",")[0]?.trim() === "https";
  }
  return request.url.startsWith("https://");
}

export async function POST(request: NextRequest) {
  const isSecure = isSecureRequest(request);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(isSecure),
    maxAge: 0,
  });
  response.cookies.set("nfc_user_id", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  return response;
}
