"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LS_PENDING_TOKEN = "pending_nfc_token";

function TapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("トークンを確認しています...");

  useEffect(() => {
    const token = searchParams.get("t");
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      localStorage.setItem(LS_PENDING_TOKEN, token);
    } catch {}

    setMessage("トップページへ移動します...");
    router.replace(`/?t=${encodeURIComponent(token)}`);
  }, [router, searchParams]);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p>{message}</p>
    </main>
  );
}

export default function TapPage() {
  return (
    <Suspense
      fallback={
        <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
          <p>読み込み中...</p>
        </main>
      }
    >
      <TapContent />
    </Suspense>
  );
}
