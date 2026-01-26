import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionCookieOptions,
  getAdminSessionFromRequest,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
