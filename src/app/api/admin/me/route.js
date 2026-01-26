import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
