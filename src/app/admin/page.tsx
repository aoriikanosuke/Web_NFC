"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AuthStatus = "checking" | "guest" | "authed";

type Shop = {
  id: number | string;
  name: string;
  uid?: string | null;
  token?: string | null;
  points: number;
  location?: string | null;
  created_at?: string | null;
};

type Stamp = {
  id: number | string;
  name: string;
  uid: string;
  token: string;
  value?: number | string | null;
  points?: number | string | null;
  location?: string | null;
  image_url?: string | null;
  image?: string | null;
  created_at?: string | null;
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
  const [shopCreateName, setShopCreateName] = useState("");
  const [shopCreateUid, setShopCreateUid] = useState("");
  const [shopCreateToken, setShopCreateToken] = useState("");
  const [shopCreateLocation, setShopCreateLocation] = useState("");
  const [shopCreateLoading, setShopCreateLoading] = useState(false);
  const [createdShopUrl, setCreatedShopUrl] = useState("");
  const [createdShopToken, setCreatedShopToken] = useState("");
  const [deletingShopId, setDeletingShopId] = useState<Shop["id"] | null>(null);

  const [stampCreateName, setStampCreateName] = useState("");
  const [stampCreateUid, setStampCreateUid] = useState("");
  const [stampCreateToken, setStampCreateToken] = useState("");
  const [stampCreatePoints, setStampCreatePoints] = useState("");
  const [stampCreateLocation, setStampCreateLocation] = useState("");
  const [stampImageFile, setStampImageFile] = useState<File | null>(null);
  const [stampImageUrl, setStampImageUrl] = useState("");
  const [stampImageUploading, setStampImageUploading] = useState(false);
  const [stampCreateLoading, setStampCreateLoading] = useState(false);
  const [createdStamp, setCreatedStamp] = useState<Stamp | null>(null);
  const [createdStampUrl, setCreatedStampUrl] = useState("");
  const [stampFileInputKey, setStampFileInputKey] = useState(0);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [deletingStampId, setDeletingStampId] = useState<Stamp["id"] | null>(null);

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

  const generateTokenClient = useCallback(() => {
    if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
      return "";
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    const base64 = window.btoa(binary);
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }, []);

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

  useEffect(() => {
    if (authStatus !== "authed") {
      return;
    }
    if (!shopCreateToken) {
      const nextShopToken = generateTokenClient();
      if (nextShopToken) {
        setShopCreateToken(nextShopToken);
      }
    }
    if (!stampCreateToken) {
      const nextStampToken = generateTokenClient();
      if (nextStampToken) {
        setStampCreateToken(nextStampToken);
      }
    }
  }, [authStatus, shopCreateToken, stampCreateToken, generateTokenClient]);

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

  const loadStamps = async () => {
    setStampsLoading(true);
    try {
      const res = await fetch("/api/admin/stamps", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "スタンプ一覧の取得に失敗しました。");
      }
      setStamps(Array.isArray(data.stamps) ? data.stamps : []);
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : "スタンプ一覧の取得に失敗しました。"
      );
    } finally {
      setStampsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authed") {
      loadShops();
      loadStamps();
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
      setStampCreateName("");
      setStampCreateUid("");
      setStampCreateToken("");
      setStampCreatePoints("");
      setStampCreateLocation("");
      setStampImageFile(null);
      setStampImageUrl("");
      setCreatedStamp(null);
      setCreatedStampUrl("");
      setStampFileInputKey((prev) => prev + 1);
      setStamps([]);
      setDeletingStampId(null);
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

  const handleGenerateShopToken = () => {
    const nextToken = generateTokenClient();
    if (!nextToken) {
      pushToast("error", "トークンの自動生成に失敗しました。");
      return;
    }
    setShopCreateToken(nextToken);
    pushToast("info", "トークンを再生成しました。");
  };

  const handleCreateShop = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = shopCreateName.trim();
    const uid = shopCreateUid.trim();
    const token = shopCreateToken.trim();
    const location = shopCreateLocation.trim();

    if (!name || !uid) {
      pushToast("error", "店舗名とUIDは必須です。");
      return;
    }
    if (shopCreateToken && !token) {
      pushToast("error", "トークンを空文字にはできません。");
      return;
    }

    setShopCreateLoading(true);
    try {
      const res = await fetch("/api/admin/shops/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          uid,
          token: token || undefined,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "店舗の登録に失敗しました。");
      }

      setCreatedShopUrl(String(data.url || ""));
      setCreatedShopToken(String(data?.shop?.token || token));
      pushToast("success", "店舗を登録しました。");

      setShopCreateName("");
      setShopCreateUid("");
      setShopCreateLocation("");
      const nextToken = generateTokenClient();
      setShopCreateToken(nextToken || "");

      await loadShops();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "店舗の登録に失敗しました。");
    } finally {
      setShopCreateLoading(false);
    }
  };

  const handleDeleteShop = async (shopId: Shop["id"], shopName: string) => {
    const confirmed = window.confirm(
      `店舗「${shopName}」（ID: ${shopId}）を削除します。よろしいですか？`
    );
    if (!confirmed) {
      return;
    }
    setDeletingShopId(shopId);
    try {
      const res = await fetch("/api/admin/shops/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "店舗の削除に失敗しました。");
      }
      setShops((prev) => prev.filter((shop) => shop.id !== shopId));
      pushToast("success", "店舗を削除しました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "店舗の削除に失敗しました。");
    } finally {
      setDeletingShopId(null);
    }
  };

  const handleCopyShopUrl = async () => {
    if (!createdShopUrl) {
      pushToast("error", "コピーするURLがありません。");
      return;
    }
    try {
      await navigator.clipboard.writeText(createdShopUrl);
      pushToast("success", "URLをコピーしました。");
    } catch {
      pushToast("error", "クリップボードへのコピーに失敗しました。");
    }
  };

  const handleGenerateStampToken = () => {
    const nextToken = generateTokenClient();
    if (!nextToken) {
      pushToast("error", "トークンの自動生成に失敗しました。");
      return;
    }
    setStampCreateToken(nextToken);
    pushToast("info", "スタンプ用トークンを再生成しました。");
  };

  const handleStampImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStampImageFile(null);
      setStampImageUrl("");
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (file.size > maxBytes) {
      pushToast("error", "画像サイズは2MB以下にしてください。");
      setStampImageFile(null);
      setStampImageUrl("");
      setStampFileInputKey((prev) => prev + 1);
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      pushToast("error", "png / jpg / jpeg / webp のみアップロードできます。");
      setStampImageFile(null);
      setStampImageUrl("");
      setStampFileInputKey((prev) => prev + 1);
      return;
    }

    setStampImageFile(file);
    setStampImageUrl("");
    pushToast("info", "画像を選択しました。「画像をアップロード」を押してください。");
  };

  const handleUploadStampImage = async () => {
    if (!stampImageFile) {
      pushToast("error", "先に画像ファイルを選択してください。");
      return;
    }
    setStampImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", stampImageFile);
      if (stampCreateName.trim()) {
        formData.append("name", stampCreateName.trim());
      }

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "画像アップロードに失敗しました。");
      }
      setStampImageUrl(String(data.url || ""));
      pushToast("success", "画像をアップロードしました。");
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : "画像アップロードに失敗しました。"
      );
    } finally {
      setStampImageUploading(false);
    }
  };

  const handleCreateStamp = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = stampCreateName.trim();
    const uid = stampCreateUid.trim();
    const token = stampCreateToken.trim();
    const location = stampCreateLocation.trim();
    const pointsNum = Number(stampCreatePoints);

    if (!name || !uid) {
      pushToast("error", "スタンプ名とUIDは必須です。");
      return;
    }
    if (!Number.isInteger(pointsNum) || pointsNum < 0) {
      pushToast("error", "付与ポイントは0以上の整数で入力してください。");
      return;
    }
    if (stampCreateToken && !token) {
      pushToast("error", "トークンを空文字にはできません。");
      return;
    }
    if (!stampImageUrl) {
      pushToast("error", "先に画像をアップロードしてください。");
      return;
    }

    setStampCreateLoading(true);
    try {
      const res = await fetch("/api/admin/stamps/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          uid,
          token: token || undefined,
          value: pointsNum,
          location: location || undefined,
          image_url: stampImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "スタンプの登録に失敗しました。");
      }

      const stamp = data?.stamp || null;
      setCreatedStamp(stamp);
      setCreatedStampUrl(String(data.url || ""));
      pushToast("success", "スタンプを登録しました。");

      setStampCreateName("");
      setStampCreateUid("");
      setStampCreatePoints("");
      setStampCreateLocation("");
      setStampImageFile(null);
      setStampImageUrl("");
      setStampFileInputKey((prev) => prev + 1);

      const nextToken = generateTokenClient();
      setStampCreateToken(nextToken || "");

      await loadStamps();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "スタンプの登録に失敗しました。");
    } finally {
      setStampCreateLoading(false);
    }
  };

  const handleCopyStampUrl = async () => {
    if (!createdStampUrl) {
      pushToast("error", "コピーするURLがありません。");
      return;
    }
    try {
      await navigator.clipboard.writeText(createdStampUrl);
      pushToast("success", "スタンプURLをコピーしました。");
    } catch {
      pushToast("error", "クリップボードへのコピーに失敗しました。");
    }
  };

  const getStampPoints = (stamp: Stamp) => {
    const raw = stamp?.points ?? stamp?.value ?? 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const getStampImage = (stamp: Stamp) => {
    const src = stamp?.image_url || stamp?.image || "/images/default.png";
    return String(src);
  };

  const handleDeleteStamp = async (stamp: Stamp) => {
    const confirmed = window.confirm(
      `スタンプ「${stamp.name}」（ID: ${stamp.id}）を削除します。\nこのスタンプの進捗と関連ログも削除されます。よろしいですか？`
    );
    if (!confirmed) {
      return;
    }

    setDeletingStampId(stamp.id);
    try {
      const res = await fetch("/api/admin/stamps/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stampId: stamp.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "スタンプの削除に失敗しました。");
      }
      setStamps((prev) => prev.filter((row) => row.id !== stamp.id));
      pushToast("success", "スタンプを削除しました。");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "スタンプの削除に失敗しました。");
    } finally {
      setDeletingStampId(null);
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
              <a href="#shop-manage">店舗 追加・削除</a>
              <a href="#stamps">スタンプ 新規登録</a>
              <a href="#stamps-manage">スタンプ 一覧・削除</a>
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
                        <th>UID</th>
                        <th>ポイント</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopsLoading && (
                        <tr>
                          <td colSpan={5} className="empty">
                            読み込み中...
                          </td>
                        </tr>
                      )}
                      {!shopsLoading && shops.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
                            店舗データがありません。
                          </td>
                        </tr>
                      )}
                      {!shopsLoading &&
                        shops.map((shop) => (
                        <tr key={String(shop.id)}>
                            <td data-label="ID">{shop.id}</td>
                            <td data-label="店舗名">{shop.name}</td>
                            <td data-label="UID">{shop.uid || "-"}</td>
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

              <section id="shop-manage" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">店舗 追加・削除</h2>
                    <p className="panel-note">新規登録と個別削除をここにまとめています。</p>
                  </div>
                </div>
                <div className="shop-manage-grid">
                  <div className="shop-create-box">
                    <div className="shop-create-head">
                      <div>
                        <h3 className="panel-title">店舗 新規登録</h3>
                        <p className="panel-note">
                          店舗名とNFCタグのUIDを登録し、iPhone向けトークンURLを発行します。
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleCreateShop} className="shop-create-form">
                      <label className="field">
                        <span>店舗名（必須）</span>
                        <input
                          type="text"
                          value={shopCreateName}
                          onChange={(event) => setShopCreateName(event.target.value)}
                          placeholder="例: カフェA"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>NFCタグUID（必須）</span>
                        <input
                          type="text"
                          value={shopCreateUid}
                          onChange={(event) => setShopCreateUid(event.target.value)}
                          placeholder="例: 04:18:B8:AA:96:20:90"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>トークン（自動生成・編集可）</span>
                        <div className="token-row">
                          <input
                            type="text"
                            value={shopCreateToken}
                            onChange={(event) => setShopCreateToken(event.target.value)}
                            placeholder="未入力ならサーバで自動生成"
                          />
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={handleGenerateShopToken}
                          >
                            再生成
                          </button>
                        </div>
                      </label>
                      <label className="field">
                        <span>場所メモ（任意）</span>
                        <input
                          type="text"
                          value={shopCreateLocation}
                          onChange={(event) => setShopCreateLocation(event.target.value)}
                          placeholder="例: 入口付近"
                        />
                      </label>
                      <div className="shop-create-actions">
                        <button type="submit" className="btn primary" disabled={shopCreateLoading}>
                          {shopCreateLoading ? "登録中..." : "登録してURLを発行"}
                        </button>
                      </div>
                    </form>
                    {createdShopUrl && (
                      <div className="shop-create-result">
                        <p className="result-title">このURLをNFCタグに書き込んでください</p>
                        <div className="result-url-row">
                          <code className="result-url">{createdShopUrl}</code>
                          <button type="button" className="btn ghost small" onClick={handleCopyShopUrl}>
                            コピー
                          </button>
                        </div>
                        {createdShopToken && (
                          <p className="result-note">token: {createdShopToken}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>店舗名</th>
                          <th>UID</th>
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
                            <tr key={`manage-${String(shop.id)}`}>
                              <td data-label="ID">{shop.id}</td>
                              <td data-label="店舗名">{shop.name}</td>
                              <td data-label="UID">{shop.uid || "-"}</td>
                              <td data-label="操作">
                                <button
                                  type="button"
                                  className="btn danger small"
                                  onClick={() => handleDeleteShop(shop.id, shop.name)}
                                  disabled={deletingShopId === shop.id}
                                >
                                  {deletingShopId === shop.id ? "削除中..." : "削除"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section id="stamps" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">スタンプ 新規登録</h2>
                    <p className="panel-note">
                      画像をBlobにアップロードし、URLをDBに保存します。発行URLをNFCタグに書き込んでください。
                    </p>
                  </div>
                </div>
                <div className="stamp-manage-grid">
                  <div className="stamp-create-box">
                    <div className="shop-create-head">
                      <div>
                        <h3 className="panel-title">スタンプ登録フォーム</h3>
                        <p className="panel-note">
                          画像アップロード完了後に「登録してURLを発行」を押してください。
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleCreateStamp} className="stamp-create-form">
                      <label className="field">
                        <span>スタンプ名（必須）</span>
                        <input
                          type="text"
                          value={stampCreateName}
                          onChange={(event) => setStampCreateName(event.target.value)}
                          placeholder="例: 図書館"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>NFCタグUID（必須）</span>
                        <input
                          type="text"
                          value={stampCreateUid}
                          onChange={(event) => setStampCreateUid(event.target.value)}
                          placeholder="例: 04:18:BC:AA:96:20:90"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>トークン（自動生成・編集可）</span>
                        <div className="token-row">
                          <input
                            type="text"
                            value={stampCreateToken}
                            onChange={(event) => setStampCreateToken(event.target.value)}
                            placeholder="未入力ならサーバで自動生成"
                          />
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={handleGenerateStampToken}
                          >
                            再生成
                          </button>
                        </div>
                      </label>
                      <label className="field">
                        <span>付与ポイント（必須）</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={stampCreatePoints}
                          onChange={(event) => setStampCreatePoints(event.target.value)}
                          placeholder="例: 20"
                          required
                        />
                      </label>
                      <label className="field">
                        <span>場所メモ（任意）</span>
                        <input
                          type="text"
                          value={stampCreateLocation}
                          onChange={(event) => setStampCreateLocation(event.target.value)}
                          placeholder="例: 受付横"
                        />
                      </label>
                      <div className="stamp-upload-box">
                        <label className="field">
                          <span>画像ファイル（必須 / 2MBまで）</span>
                          <input
                            key={stampFileInputKey}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleStampImageChange}
                            required={!stampImageUrl}
                          />
                        </label>
                        <div className="stamp-upload-row">
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={handleUploadStampImage}
                            disabled={stampImageUploading || !stampImageFile}
                          >
                            {stampImageUploading ? "アップロード中..." : "画像をアップロード"}
                          </button>
                          {stampImageFile && (
                            <span className="stamp-upload-note">
                              選択中: {stampImageFile.name}
                            </span>
                          )}
                        </div>
                        {stampImageUrl && (
                          <div className="stamp-upload-result">
                            <p className="result-title">アップロード済みURL</p>
                            <code className="stamp-upload-url">{stampImageUrl}</code>
                          </div>
                        )}
                      </div>
                      <div className="shop-create-actions">
                        <button
                          type="submit"
                          className="btn primary"
                          disabled={stampCreateLoading || stampImageUploading || !stampImageUrl}
                        >
                          {stampCreateLoading ? "登録中..." : "登録してURLを発行"}
                        </button>
                      </div>
                    </form>

                    {createdStampUrl && (
                      <div className="shop-create-result">
                        <p className="result-title">このURLをNFCタグに書き込んでください</p>
                        <div className="result-url-row">
                          <code className="result-url">{createdStampUrl}</code>
                          <button type="button" className="btn ghost small" onClick={handleCopyStampUrl}>
                            コピー
                          </button>
                        </div>
                        {createdStamp?.token && (
                          <p className="result-note">token: {createdStamp.token}</p>
                        )}
                        {createdStamp?.image_url && (
                          <div className="stamp-preview-card">
                            <p className="result-note">画像プレビュー（Blob URL）</p>
                            <img
                              className="stamp-preview-image"
                              src={createdStamp.image_url}
                              alt={createdStamp?.name || "stamp preview"}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="stamp-help-box">
                    <h3 className="panel-title">画像アップロードの注意</h3>
                    <ul className="panel-list">
                      <li>対応形式: png / jpg / jpeg / webp</li>
                      <li>最大サイズ: 2MB</li>
                      <li>必ず「画像をアップロード」を押してから登録してください。</li>
                    </ul>
                    <div className="stamp-preview-card">
                      <p className="result-note">現在のプレビュー</p>
                      {stampImageUrl ? (
                        <img
                          className="stamp-preview-image"
                          src={stampImageUrl}
                          alt="uploaded stamp preview"
                        />
                      ) : createdStamp?.image_url ? (
                        <img
                          className="stamp-preview-image"
                          src={createdStamp.image_url}
                          alt={createdStamp?.name || "stamp preview"}
                        />
                      ) : (
                        <p className="panel-note">画像をアップロードするとここに表示されます。</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section id="stamps-manage" className="panel">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">スタンプ 一覧・削除</h2>
                    <p className="panel-note">登録済みスタンプの確認と削除を行います。</p>
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={loadStamps}
                      disabled={stampsLoading}
                    >
                      {stampsLoading ? "更新中..." : "再読み込み"}
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="admin-table admin-table-stamps">
                    <thead>
                      <tr>
                        <th>画像</th>
                        <th>ID</th>
                        <th>名前</th>
                        <th>UID</th>
                        <th>Token</th>
                        <th>付与P</th>
                        <th>場所</th>
                        <th>作成日</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stampsLoading && (
                        <tr>
                          <td colSpan={9} className="empty">
                            読み込み中...
                          </td>
                        </tr>
                      )}
                      {!stampsLoading && stamps.length === 0 && (
                        <tr>
                          <td colSpan={9} className="empty">
                            スタンプデータがありません。
                          </td>
                        </tr>
                      )}
                      {!stampsLoading &&
                        stamps.map((stamp) => {
                          const createdAt = stamp.created_at
                            ? new Date(stamp.created_at).toLocaleString("ja-JP")
                            : "-";
                          const points = getStampPoints(stamp);
                          const imageSrc = getStampImage(stamp);
                          const isDeleting = deletingStampId === stamp.id;

                          return (
                            <tr key={`stamp-${String(stamp.id)}`}>
                              <td data-label="画像">
                                <img className="stamp-table-image" src={imageSrc} alt={stamp.name} />
                              </td>
                              <td data-label="ID">{stamp.id}</td>
                              <td data-label="名前">{stamp.name}</td>
                              <td data-label="UID" className="mono-cell">
                                {stamp.uid}
                              </td>
                              <td data-label="Token" className="mono-cell">
                                {stamp.token}
                              </td>
                              <td data-label="付与P">{points}</td>
                              <td data-label="場所">{stamp.location || "-"}</td>
                              <td data-label="作成日">{createdAt}</td>
                              <td data-label="操作">
                                <button
                                  type="button"
                                  className="btn danger small"
                                  onClick={() => handleDeleteStamp(stamp)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "削除中..." : "削除"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
        .panel-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
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
        .shop-manage-grid {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
          gap: 16px;
          align-items: start;
        }
        .stamp-manage-grid {
          display: grid;
          grid-template-columns: minmax(320px, 1.2fr) minmax(280px, 1fr);
          gap: 16px;
          align-items: start;
        }
        .shop-create-box {
          border: 1px solid rgba(43, 108, 176, 0.18);
          border-radius: 16px;
          padding: 16px;
          background: rgba(235, 245, 255, 0.7);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stamp-create-box {
          border: 1px solid rgba(72, 187, 120, 0.22);
          border-radius: 16px;
          padding: 16px;
          background: rgba(236, 252, 244, 0.8);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .shop-create-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .shop-create-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .stamp-create-form {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .shop-create-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-start;
        }
        .token-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .shop-create-result {
          border-radius: 14px;
          padding: 12px;
          background: rgba(11, 28, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stamp-upload-box {
          grid-column: 1 / -1;
          border: 1px dashed rgba(11, 28, 42, 0.15);
          border-radius: 14px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.65);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stamp-upload-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .stamp-upload-note {
          font-size: 12px;
          color: rgba(11, 28, 42, 0.7);
          font-weight: 700;
        }
        .stamp-upload-result {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stamp-upload-url {
          display: block;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(11, 28, 42, 0.85);
          color: #fff;
          font-weight: 700;
          word-break: break-all;
        }
        .stamp-help-box {
          border: 1px solid rgba(11, 28, 42, 0.08);
          border-radius: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.7);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stamp-preview-card {
          border-radius: 14px;
          padding: 12px;
          background: rgba(11, 28, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stamp-preview-image {
          width: 100%;
          max-width: 320px;
          border-radius: 14px;
          border: 1px solid rgba(11, 28, 42, 0.12);
          box-shadow: 0 12px 26px rgba(11, 28, 42, 0.18);
          object-fit: cover;
        }
        .result-title {
          margin: 0;
          font-weight: 800;
          font-size: 14px;
        }
        .result-url-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .result-url {
          display: block;
          padding: 10px 12px;
          border-radius: 12px;
          background: #0b1c2a;
          color: #fff;
          font-weight: 700;
          word-break: break-all;
        }
        .result-note {
          margin: 0;
          font-size: 12px;
          color: rgba(11, 28, 42, 0.7);
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
          min-width: 640px;
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
        .admin-table-stamps th,
        .admin-table-stamps td {
          vertical-align: middle;
        }
        .stamp-table-image {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(11, 28, 42, 0.12);
          background: rgba(255, 255, 255, 0.7);
        }
        .mono-cell {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          word-break: break-all;
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
          .shop-manage-grid {
            grid-template-columns: 1fr;
          }
          .stamp-manage-grid {
            grid-template-columns: 1fr;
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
          .panel-actions {
            width: 100%;
          }
          .panel-actions .btn {
            width: 100%;
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
