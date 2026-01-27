"use client";

import { useEffect, useMemo, useState } from "react";

type AuthStatus = "checking" | "guest" | "authed";

type Shop = {
  id: number | string;
  name: string;
  points: number;
};

type UserRow = {
  id: number | string;
  username?: string;
  name?: string;
  points: number;
};

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

export default function AdminPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [resettingShopId, setResettingShopId] = useState<Shop["id"] | null>(null);
  const [resettingAllShops, setResettingAllShops] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<UserRow["id"] | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeLoading, setChargeLoading] = useState(false);
  const [resetQuery, setResetQuery] = useState("");
  const [resetUsers, setResetUsers] = useState<UserRow[]>([]);
  const [resetUsersLoading, setResetUsersLoading] = useState(false);
  const [resetSelectedUserId, setResetSelectedUserId] = useState<UserRow["id"] | null>(null);
  const [resettingUserId, setResettingUserId] = useState<UserRow["id"] | null>(null);

  const [resetConfirmChecked, setResetConfirmChecked] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetAllLoading, setResetAllLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  );
  const resetSelectedUser = useMemo(
    () => resetUsers.find((user) => user.id === resetSelectedUserId) || null,
    [resetUsers, resetSelectedUserId]
  );

  const pushToast = (type: Toast["type"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3600);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        setAuthStatus(res.ok ? "authed" : "guest");
      } catch {
        setAuthStatus("guest");
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const loadShops = async () => {
    setShopsLoading(true);
    try {
      const res = await fetch("/api/admin/shops", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "店舗一覧の取得に失敗しました。");
      }
      setShops(data?.shops || []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "店舗一覧の取得に失敗しました。");
    } finally {
      setShopsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authed") {
      loadShops();
    }
  }, [authStatus]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginPassword) {
      pushToast("error", "パスワードを入力してください。");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "ログインに失敗しました。");
      }
      setAuthStatus("authed");
      setLoginPassword("");
      pushToast("success", "ログインしました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "ログインに失敗しました。");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      setAuthStatus("guest");
      setUsers([]);
      setSelectedUserId(null);
      setChargeAmount("");
      setResetUsers([]);
      setResetSelectedUserId(null);
    }
  };

  const handleResetShop = async (shopId: Shop["id"]) => {
    setResettingShopId(shopId);
    try {
      const res = await fetch("/api/admin/shops/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "リセットに失敗しました。");
      }
      setShops((prev) =>
        prev.map((shop) => (shop.id === shopId ? { ...shop, points: 0 } : shop))
      );
      pushToast("success", "店舗ポイントをリセットしました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "リセットに失敗しました。");
    } finally {
      setResettingShopId(null);
    }
  };

  const handleResetAllShops = async () => {
    if (!window.confirm("全店舗ポイントを0にします。よろしいですか？")) {
      return;
    }
    setResettingAllShops(true);
    try {
      const res = await fetch("/api/admin/shops/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "全店舗リセットに失敗しました。");
      }
      setShops((prev) => prev.map((shop) => ({ ...shop, points: 0 })));
      pushToast("success", "全店舗ポイントをリセットしました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "全店舗リセットに失敗しました。");
    } finally {
      setResettingAllShops(false);
    }
  };

  const handleSearchUsers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userQuery.trim()) {
      setUsers([]);
      setSelectedUserId(null);
      return;
    }
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "ユーザー検索に失敗しました。");
      }
      setUsers(data?.users || []);
      setSelectedUserId(null);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "ユーザー検索に失敗しました。");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSearchResetUsers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetQuery.trim()) {
      setResetUsers([]);
      setResetSelectedUserId(null);
      return;
    }
    setResetUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(resetQuery.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "ユーザー検索に失敗しました。");
      }
      setResetUsers(data?.users || []);
      setResetSelectedUserId(null);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "ユーザー検索に失敗しました。");
    } finally {
      setResetUsersLoading(false);
    }
  };

  const handleCharge = async () => {
    if (!selectedUserId) {
      pushToast("error", "ユーザーを選択してください。");
      return;
    }
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      pushToast("error", "チャージ量は正の整数で入力してください。");
      return;
    }
    setChargeLoading(true);
    try {
      const res = await fetch("/api/admin/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: selectedUserId, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "チャージに失敗しました。");
      }
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUserId ? { ...user, points: data?.points ?? user.points } : user
        )
      );
      pushToast("success", "チャージが完了しました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "チャージに失敗しました。");
    } finally {
      setChargeLoading(false);
    }
  };

  const handleResetUser = async (userId: UserRow["id"]) => {
    if (!window.confirm("このユーザーの進捗・ポイントをリセットします。よろしいですか？")) {
      return;
    }
    setResettingUserId(userId);
    try {
      const res = await fetch("/api/admin/users/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "ユーザーリセットに失敗しました。");
      }
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, points: data?.points ?? 0 } : user
        )
      );
      setResetUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, points: data?.points ?? 0 } : user
        )
      );
      pushToast("success", "ユーザーの進捗をリセットしました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "ユーザーリセットに失敗しました。");
    } finally {
      setResettingUserId(null);
    }
  };

  const handleResetAllData = async () => {
    if (!resetConfirmChecked || resetConfirmText !== "RESET") {
      pushToast("error", "確認条件を満たしてください。");
      return;
    }
    setResetAllLoading(true);
    try {
      const res = await fetch("/api/admin/reset-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmText: resetConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "全データリセットに失敗しました。");
      }
      setShops((prev) => prev.map((shop) => ({ ...shop, points: 0 })));
      setUsers((prev) => prev.map((user) => ({ ...user, points: 0 })));
      pushToast("success", "全データをリセットしました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "全データリセットに失敗しました。");
    } finally {
      setResetAllLoading(false);
    }
  };

  const displayUserName = (user: UserRow) => {
    return user.name || user.username || `User ${user.id}`;
  };

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Admin Console</p>
            <h1 className="admin-title">管理ダッシュボード</h1>
            <p className="admin-subtitle">
              店舗ポイント・現金チャージ・全データリセットをまとめて操作します。
            </p>
          </div>
          {authStatus === "authed" && (
            <button type="button" className="btn ghost" onClick={handleLogout}>
              ログアウト
            </button>
          )}
        </header>

        {authStatus === "checking" && (
          <div className="panel soft">
            <p>セッション確認中...</p>
          </div>
        )}

        {authStatus === "guest" && (
          <div className="login-grid">
            <div className="panel">
              <h2 className="panel-title">管理者ログイン</h2>
              <p className="panel-note">管理者パスワードを入力してください。</p>
              <form onSubmit={handleLogin} className="form-stack">
                <label className="field">
                  <span>パスワード</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button type="submit" className="btn primary" disabled={loginLoading}>
                  {loginLoading ? "ログイン中..." : "ログイン"}
                </button>
              </form>
            </div>
            <div className="panel soft">
              <h3 className="panel-title">セキュリティ注意</h3>
              <ul className="panel-list">
                <li>この画面は管理者のみ使用してください。</li>
                <li>操作ログとポイント残高の確認を徹底してください。</li>
                <li>全データリセットは取り消せません。</li>
              </ul>
            </div>
          </div>
        )}

        {authStatus === "authed" && (
          <div className="admin-grid">
            <aside className="admin-nav">
              <a href="#shops">店舗ポイント管理</a>
              <a href="#charge">現金チャージ</a>
              <a href="#user-reset">進捗リセット</a>
              <a href="#reset">全データリセット</a>
            </aside>
            <main className="admin-main">
              <section id="shops" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">店舗ポイント管理</h2>
                    <p className="panel-note">店舗ごとのポイント残高を確認・リセットできます。</p>
                  </div>
                  <button
                    type="button"
                    className="btn warning"
                    onClick={handleResetAllShops}
                    disabled={resettingAllShops}
                  >
                    {resettingAllShops ? "リセット中..." : "全店舗リセット"}
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>店舗名</th>
                        <th>ポイント</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopsLoading && (
                        <tr>
                          <td colSpan={4} className="empty">
                            読み込み中...
                          </td>
                        </tr>
                      )}
                      {!shopsLoading && shops.length === 0 && (
                        <tr>
                          <td colSpan={4} className="empty">
                            店舗データがありません。
                          </td>
                        </tr>
                      )}
                      {!shopsLoading &&
                        shops.map((shop) => (
                        <tr key={String(shop.id)}>
                            <td data-label="ID">{shop.id}</td>
                            <td data-label="店舗名">{shop.name}</td>
                            <td data-label="ポイント">{shop.points ?? 0}</td>
                            <td data-label="操作">
                              <button
                                type="button"
                                className="btn small"
                                onClick={() => handleResetShop(shop.id)}
                                disabled={resettingShopId === shop.id}
                              >
                                {resettingShopId === shop.id ? "処理中..." : "リセット"}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="charge" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">現金チャージ</h2>
                    <p className="panel-note">ユーザーを検索してポイントを加算します。</p>
                  </div>
                </div>
                <form onSubmit={handleSearchUsers} className="form-row">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="ユーザー名で検索"
                  />
                  <button type="submit" className="btn primary" disabled={usersLoading}>
                    {usersLoading ? "検索中..." : "検索"}
                  </button>
                </form>
                <div className="table-wrap">
                  <table className="admin-table selectable">
                    <thead>
                      <tr>
                        <th>ユーザー</th>
                        <th>ポイント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading && (
                        <tr>
                          <td colSpan={2} className="empty">
                            検索中...
                          </td>
                        </tr>
                      )}
                      {!usersLoading && users.length === 0 && (
                        <tr>
                          <td colSpan={2} className="empty">
                            検索結果がありません。
                          </td>
                        </tr>
                      )}
                      {!usersLoading &&
                        users.map((user) => {
                          const selected = user.id === selectedUserId;
                          return (
                            <tr
                              key={String(user.id)}
                              className={selected ? "selected" : ""}
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <td data-label="ユーザー">{displayUserName(user)}</td>
                              <td data-label="ポイント">{user.points ?? 0}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="charge-box">
                  <div className="charge-info">
                    <span className="charge-label">選択ユーザー</span>
                    <strong>{selectedUser ? displayUserName(selectedUser) : "未選択"}</strong>
                  </div>
                  <label className="field inline">
                    <span>チャージ量</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={chargeAmount}
                      onChange={(event) => setChargeAmount(event.target.value)}
                      placeholder="例: 100"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleCharge}
                    disabled={chargeLoading || !selectedUserId}
                  >
                    {chargeLoading ? "チャージ中..." : "チャージ実行"}
                  </button>
                </div>
              </section>

              <section id="user-reset" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">進捗リセット</h2>
                    <p className="panel-note">ユーザーのスタンプ進捗とポイントを初期化します。</p>
                  </div>
                </div>
                <form onSubmit={handleSearchResetUsers} className="form-row">
                  <input
                    type="text"
                    value={resetQuery}
                    onChange={(event) => setResetQuery(event.target.value)}
                    placeholder="ユーザー名で検索"
                  />
                  <button type="submit" className="btn primary" disabled={resetUsersLoading}>
                    {resetUsersLoading ? "検索中..." : "検索"}
                  </button>
                </form>
                <div className="table-wrap">
                  <table className="admin-table selectable">
                    <thead>
                      <tr>
                        <th>ユーザー</th>
                        <th>ポイント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resetUsersLoading && (
                        <tr>
                          <td colSpan={2} className="empty">
                            検索中...
                          </td>
                        </tr>
                      )}
                      {!resetUsersLoading && resetUsers.length === 0 && (
                        <tr>
                          <td colSpan={2} className="empty">
                            検索結果がありません。
                          </td>
                        </tr>
                      )}
                      {!resetUsersLoading &&
                        resetUsers.map((user) => {
                          const selected = user.id === resetSelectedUserId;
                          return (
                            <tr
                              key={String(user.id)}
                              className={selected ? "selected" : ""}
                              onClick={() => setResetSelectedUserId(user.id)}
                            >
                              <td data-label="ユーザー">{displayUserName(user)}</td>
                              <td data-label="ポイント">{user.points ?? 0}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="charge-box">
                  <div className="charge-info">
                    <span className="charge-label">選択ユーザー</span>
                    <strong>{resetSelectedUser ? displayUserName(resetSelectedUser) : "未選択"}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      if (resetSelectedUserId) {
                        handleResetUser(resetSelectedUserId);
                      } else {
                        pushToast("error", "ユーザーを選択してください。");
                      }
                    }}
                    disabled={resettingUserId !== null || !resetSelectedUserId}
                  >
                    {resettingUserId === resetSelectedUserId ? "実行中..." : "進捗をリセット"}
                  </button>
                </div>
              </section>

              <section id="reset" className="panel danger-panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">全データリセット</h2>
                    <p className="panel-note">
                      スタンプ進捗・ポイント・ログをすべて初期化します。取り消し不可です。
                    </p>
                  </div>
                </div>
                <div className="reset-box">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={resetConfirmChecked}
                      onChange={(event) => setResetConfirmChecked(event.target.checked)}
                    />
                    <span>リスクを理解しました</span>
                  </label>
                  <label className="field">
                    <span>確認入力</span>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(event) => setResetConfirmText(event.target.value)}
                      placeholder="RESET と入力"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={handleResetAllData}
                    disabled={resetAllLoading || !resetConfirmChecked || resetConfirmText !== "RESET"}
                  >
                    {resetAllLoading ? "実行中..." : "全データをリセット"}
                  </button>
                </div>
              </section>
            </main>
          </div>
        )}
      </div>

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <style jsx>{`
        .admin-root {
          min-height: 100dvh;
          overflow-y: auto;
          padding: 36px 24px 80px;
          background: radial-gradient(circle at top, rgba(255, 255, 255, 0.9), rgba(228, 237, 250, 0.7)),
            linear-gradient(140deg, rgba(220, 230, 245, 0.8), rgba(195, 215, 245, 0.6));
          color: #0b1c2a;
        }
        .admin-shell {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .admin-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 11px;
          font-weight: 700;
          color: rgba(11, 28, 42, 0.6);
          margin: 0 0 8px;
        }
        .admin-title {
          font-size: clamp(26px, 4vw, 38px);
          margin: 0 0 10px;
          font-weight: 800;
        }
        .admin-subtitle {
          margin: 0;
          color: rgba(11, 28, 42, 0.7);
          font-size: 14px;
        }
        .login-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
        }
        .admin-nav {
          position: sticky;
          top: 24px;
          align-self: flex-start;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 18px 40px rgba(6, 24, 40, 0.12);
        }
        .admin-nav a {
          text-decoration: none;
          color: #0b1c2a;
          font-weight: 700;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .admin-nav a:hover {
          transform: translateX(6px);
          box-shadow: 0 10px 24px rgba(6, 24, 40, 0.12);
        }
        .admin-main {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .panel {
          padding: 20px 22px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 18px 40px rgba(6, 24, 40, 0.12);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .panel.soft {
          background: rgba(255, 255, 255, 0.6);
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .panel-title {
          margin: 0 0 6px;
          font-size: 20px;
          font-weight: 800;
        }
        .panel-note {
          margin: 0;
          font-size: 13px;
          color: rgba(11, 28, 42, 0.65);
        }
        .panel-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          color: rgba(11, 28, 42, 0.7);
        }
        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: rgba(11, 28, 42, 0.7);
        }
        .field.inline {
          flex-direction: row;
          align-items: center;
          gap: 10px;
        }
        input[type="text"],
        input[type="password"],
        input[type="number"] {
          border: 1px solid rgba(11, 28, 42, 0.15);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 15px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.9);
        }
        .btn {
          border: none;
          border-radius: 12px;
          padding: 10px 16px;
          font-weight: 700;
          cursor: pointer;
          background: #0b1c2a;
          color: #fff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(6, 24, 40, 0.18);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn.primary {
          background: linear-gradient(135deg, #2b6cb0, #1c4f82);
        }
        .btn.warning {
          background: linear-gradient(135deg, #ffb24d, #ff7a3d);
        }
        .btn.ghost {
          background: rgba(255, 255, 255, 0.6);
          color: #0b1c2a;
          border: 1px solid rgba(11, 28, 42, 0.2);
        }
        .btn.small {
          padding: 6px 12px;
          font-size: 12px;
        }
        .btn.danger {
          background: linear-gradient(135deg, #ff4d4d, #c73636);
        }
        .table-wrap {
          border-radius: 16px;
          border: 1px solid rgba(11, 28, 42, 0.08);
          overflow: hidden;
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
        }
        .admin-table thead {
          background: rgba(11, 28, 42, 0.04);
        }
        .admin-table th,
        .admin-table td {
          padding: 12px 14px;
          text-align: left;
          font-size: 13px;
        }
        .admin-table tbody tr {
          border-top: 1px solid rgba(11, 28, 42, 0.08);
          transition: background 0.2s ease;
        }
        .admin-table tbody tr:hover {
          background: rgba(11, 28, 42, 0.04);
        }
        .admin-table.selectable tbody tr {
          cursor: pointer;
        }
        .admin-table.selectable tbody tr.selected {
          background: rgba(43, 108, 176, 0.12);
        }
        .empty {
          text-align: center;
          color: rgba(11, 28, 42, 0.55);
        }
        .charge-box {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          align-items: center;
        }
        .charge-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .charge-label {
          font-size: 12px;
          color: rgba(11, 28, 42, 0.6);
        }
        .danger-panel {
          border: 1px solid rgba(255, 77, 77, 0.4);
          background: rgba(255, 240, 240, 0.9);
        }
        .reset-box {
          display: grid;
          gap: 12px;
        }
        .checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
        }
        .toast-stack {
          position: fixed;
          right: 24px;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 200;
        }
        .toast {
          padding: 12px 16px;
          border-radius: 12px;
          color: #fff;
          font-weight: 700;
          box-shadow: 0 12px 24px rgba(6, 24, 40, 0.2);
        }
        .toast.success {
          background: linear-gradient(135deg, #2f855a, #2b6cb0);
        }
        .toast.error {
          background: linear-gradient(135deg, #d64545, #9b2c2c);
        }
        .toast.info {
          background: linear-gradient(135deg, #3182ce, #2c5282);
        }
        @media (max-width: 980px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          .admin-nav {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .charge-box {
            grid-template-columns: 1fr;
            align-items: stretch;
          }
        }
        @media (max-width: 720px) {
          .admin-root {
            padding: 24px 16px 64px;
          }
          .admin-nav {
            gap: 8px;
            padding: 12px;
            border-radius: 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .admin-nav a {
            white-space: nowrap;
            flex: 0 0 auto;
          }
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .panel-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .panel {
            padding: 16px;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
          .table-wrap {
            overflow: visible;
            border: none;
          }
          .admin-table {
            min-width: 0;
            border: 1px solid rgba(11, 28, 42, 0.08);
            border-radius: 16px;
            overflow: hidden;
          }
          .admin-table thead {
            display: none;
          }
          .admin-table,
          .admin-table tbody,
          .admin-table tr,
          .admin-table td {
            display: block;
            width: 100%;
          }
          .admin-table tbody tr {
            padding: 12px 14px;
            border-top: 1px solid rgba(11, 28, 42, 0.08);
          }
          .admin-table tbody tr:first-child {
            border-top: none;
          }
          .admin-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            font-size: 14px;
          }
          .admin-table td::before {
            content: attr(data-label);
            font-weight: 700;
            color: rgba(11, 28, 42, 0.6);
          }
          .admin-table td:last-child {
            padding-bottom: 0;
          }
          .admin-table.selectable tbody tr {
            border-left: 4px solid transparent;
          }
          .admin-table.selectable tbody tr.selected {
            border-left-color: #2b6cb0;
            background: rgba(43, 108, 176, 0.08);
          }
          .toast-stack {
            right: 12px;
            left: 12px;
            bottom: 16px;
          }
          .toast {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
