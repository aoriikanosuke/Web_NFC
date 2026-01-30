import { NextRequest, NextResponse } from "next/server";
import { findUserById } from "@/lib/db";
import {
  getSessionCookieOptions,
  getUserSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const runtime = "nodejs";

function isSecureRequest(request: NextRequest) {
  const protoHeader = request.headers.get("x-forwarded-proto");
  if (protoHeader) {
    return protoHeader.split(",")[0]?.trim() === "https";
  }
  return request.url.startsWith("https://");
}

export async function GET(request: NextRequest) {
  const session = getUserSessionFromRequest(request);
  if (!session.ok) {
    const res = NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (session.error === "expired" || session.error === "invalid_signature") {
      res.cookies.set(SESSION_COOKIE_NAME, "", {
        ...getSessionCookieOptions(isSecureRequest(request)),
        maxAge: 0,
      });
    }
    return res;
  }

  const uidNum = Number(session.payload.uid);
  if (!Number.isFinite(uidNum) || uidNum <= 0) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await findUserById(Math.trunc(uidNum));
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (session.payload.lineSub && user.line_sub && session.payload.lineSub !== user.line_sub) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const username = user.line_name || user.username || "LINEユーザー";
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username,
      line_name: user.line_name ?? null,
      line_picture: user.line_picture ?? null,
      points: user.points ?? 0,
    },
  });
}
