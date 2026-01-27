import crypto from "crypto";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TO_EXT = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function sanitizeBaseName(value) {
  const raw = String(value || "").trim();
  const normalized = raw.normalize("NFKC");
  const cleaned = normalized.replace(/[^a-zA-Z0-9-_]/g, "");
  return cleaned.slice(0, 48) || "stamp";
}

function getExtensionFromFile(file) {
  const typeExt = ALLOWED_MIME_TO_EXT.get(String(file?.type || ""));
  if (typeExt) {
    return typeExt;
  }
  const name = String(file?.name || "");
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }
  return name.slice(dot + 1).toLowerCase();
}

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json(
      { ok: false, error: "Missing BLOB_READ_WRITE_TOKEN." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const stampName = formData.get("name");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "image file is required." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image must be 2MB or smaller." },
        { status: 400 }
      );
    }

    const ext = getExtensionFromFile(file);
    const mime = String(file.type || "");
    if (!ALLOWED_MIME_TO_EXT.has(mime) || !ext) {
      return NextResponse.json(
        { ok: false, error: "Only png / jpg / jpeg / webp are allowed." },
        { status: 400 }
      );
    }

    const baseName = sanitizeBaseName(stampName);
    const unique = crypto.randomUUID();
    const blobPath = `stamps/${baseName}-${unique}.${ext}`;

    const blob = await put(blobPath, file, {
      access: "public",
      token: blobToken,
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (error) {
    console.error("admin/upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to upload image." },
      { status: 500 }
    );
  }
}

