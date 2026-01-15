"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LS_PENDING_TOKEN = "pending_nfc_token";
const LS_OPEN_AUTH = "open_auth_modal";
const LS_USER = "user";
const LS_STAMPS = "nfc_stamps_v2_images";
const LS_PENDING_PROGRESS = "pending_stamp_progress";

function updateLocalStamps(progress: number[]) {
  if (!Array.isArray(progress)) return;
  const raw = localStorage.getItem(LS_STAMPS);
  if (!raw) {
    localStorage.setItem(LS_PENDING_PROGRESS, JSON.stringify(progress));
    return;
  }
  try {
    const list = JSON.parse(raw);
    const set = new Set(progress);
    const next = list.map((s: { id: number }) => ({ ...s, flag: set.has(s.id) }));
    localStorage.setItem(LS_STAMPS, JSON.stringify(next));
  } catch {
    localStorage.setItem(LS_PENDING_PROGRESS, JSON.stringify(progress));
  }
}

export default function TapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("スタンプを確認しています...");

  useEffect(() => {
    const token = searchParams.get("t");
    if (!token) {
      router.replace("/");
      return;
    }

    const userRaw = localStorage.getItem(LS_USER);
    if (!userRaw) {
      localStorage.setItem(LS_PENDING_TOKEN, token);
      localStorage.setItem(LS_OPEN_AUTH, "1");
      setMessage("ログインが必要です。トップに戻ります...");
      router.replace("/");
      return;
    }

    const redeem = async () => {
      try {
        const res = await fetch("/api/stamps/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.status === 401) {
          localStorage.setItem(LS_PENDING_TOKEN, token);
          localStorage.setItem(LS_OPEN_AUTH, "1");
          setMessage("ログインが必要です。トップに戻ります...");
          router.replace("/");
          return;
        }
        if (!res.ok || !data.ok) {
          localStorage.setItem(LS_PENDING_TOKEN, token);
          setMessage("スタンプ取得に失敗しました。トップへ戻ります...");
          router.replace("/");
          return;
        }

        try {
          const current = JSON.parse(userRaw);
          current.points = data.points ?? current.points;
          current.stamp_progress = data.stamp_progress ?? current.stamp_progress;
          localStorage.setItem(LS_USER, JSON.stringify(current));
        } catch {}

        if (Array.isArray(data.stamp_progress)) {
          updateLocalStamps(data.stamp_progress);
        }
        localStorage.removeItem(LS_PENDING_TOKEN);
        localStorage.removeItem(LS_PENDING_PROGRESS);
        setMessage("スタンプを獲得しました。トップへ戻ります...");
        router.replace("/");
      } catch (err) {
        localStorage.setItem(LS_PENDING_TOKEN, token);
        setMessage("通信に失敗しました。トップへ戻ります...");
        router.replace("/");
      }
    };

    redeem();
  }, [router, searchParams]);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p>{message}</p>
    </main>
  );
}
