"use client";

import React, { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. 型（インターフェース）を定義する
  interface AuthMessage {
    type: "success" | "error";
    text: string;
  }

  // 2. useStateに型を適用する（<AuthMessage | null> の部分）
  const [msg, setMsg] = useState<AuthMessage | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        localStorage.setItem("user", JSON.stringify(j.user));
        setMsg({ type: "success", text: "ログイン成功" });
      } else {
        setMsg({ type: "error", text: j.error || "認証に失敗しました" });
      }
    } catch (err) {
      setMsg({ type: "error", text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>ログイン</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>
            メール
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginLeft: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginLeft: 8 }}
            />
          </label>
        </div>

        <div>
          <button type="submit" disabled={loading}>
            {loading ? "送信中..." : "ログイン"}
          </button>
        </div>
      </form>

      {msg && (
        <div style={{ marginTop: 12, color: msg.type === "error" ? "#b91c1c" : "#047857" }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
