// ====== 設定：スタンプ一覧（UI要件に合わせて拡張：points/location）======
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前", uid: "04:18:be:aa:96:20:90", image: "./images/computer_tokui_boy.png", flag: false, points: 10, location: "本部前：入口付近" },
  { id: 2, name: "体育館", uid: "04:18:BD:AA:96:20:90", image: "./images/school_taiikukan2.png", flag: false, points: 10, location: "体育館：正面入口" },
  { id: 3, name: "図書館", uid: "04:18:bc:aa:96:20:90", image: "./images/stamp3.png", flag: false, points: 15, location: "図書館：受付横" },
  { id: 4, name: "中庭", uid: "04:18:bb:aa:96:20:90", image: "./images/stamp4.png", flag: false, points: 15, location: "中庭：ベンチ付近" },
  // 決済スタンプ（※バックグラウンド処理を変えず、points=0 で扱う）
  { id: 5, name: "100コイン決済", uid: "04:18:ba:aa:96:20:90", image: "./images/stamp5.png", flag: false, points: 0, location: "決済：100コインメニュー" },
  { id: 6, name: "200コイン決済", uid: "04:18:b9:aa:96:20:90", image: "./images/stamp6.png", flag: false, points: 0, location: "決済：200コインメニュー" },
];

const LS_KEY = "nfc_stamps_v2_images"; // 旧キーと区別（キャッシュ衝突回避）

let stamps = loadStamps();
let currentIndex = 0;
let $track = null;
let swipeBound = false;


// ===== DOM =====
const $pointValue = document.getElementById("pointValue");
const $carousel = document.getElementById("stampCarousel");
const $indicator = document.getElementById("indicator");
const $chipsBtn = document.getElementById("chipsBtn");

const $modal = document.getElementById("modal");
const $modalTitle = document.getElementById("modalTitle");
const $modalBody = document.getElementById("modalBody");

// ================== 永続化（維持） ==================
function loadStamps() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return structuredClone(DEFAULT_STAMPS);
  try {
    const saved = JSON.parse(raw);
    const byUid = new Map(saved.map(s => [s.uid, s]));
    return DEFAULT_STAMPS.map(def => {
      const hit = byUid.get(def.uid);
      return hit
        ? {
            ...def,
            flag: !!hit.flag,
            name: hit.name ?? def.name
          }
        : { ...def };
    });
  } catch {
    return structuredClone(DEFAULT_STAMPS);
  }
}
function saveStamps() {
  localStorage.setItem(LS_KEY, JSON.stringify(stamps));
}

// ================== UI helpers ==================
function calcPoints() {
  // 取得済みスタンプの合計ポイント（バックグラウンド処理を壊さないため計算で出す）
  return stamps.reduce((sum, s) => sum + (s.flag ? (Number(s.points) || 0) : 0), 0);
}

function updatepoint() {
  $pointValue.textContent = String(calcPoints());
}

function stampPageHTML(s) {
  // “取得したらイラスト表示”要件
  const inner = s.flag
    ? `<img class="stamp-img" src="${s.image}" alt="${s.name}">`
    : `<div class="stamp-empty">STAMP</div>`;

  return `
    <div class="stamp-page">
      <div class="stamp-frame">
        <div class="stamp-inner">
          ${inner}
        </div>
      </div>
    </div>
  `;
}

function renderIndicator() {
  $indicator.innerHTML = stamps.map((_, i) => {
    const active = i === currentIndex ? "is-active" : "";
    return `<div class="dot ${active}" data-i="${i}"></div>`;
  }).join("");

  $indicator.querySelectorAll(".dot").forEach(dot => {
    dot.addEventListener("click", () => {
      const i = Number(dot.dataset.i);
      if (!Number.isFinite(i)) return;
      currentIndex = Math.max(0, Math.min(stamps.length - 1, i));
      updateSlidePosition(true);
      syncChipsModalContent();
    });
  });
}

function syncChipsModalContent() {
  const s = stamps[currentIndex];
  $modalTitle.textContent = `${s.name} の location`;
  $modalBody.textContent = s.location || "location情報が未設定です。";
}

function render() {
  const track = $carousel.querySelector(".stamp-track");
  track.innerHTML = stamps.map(stampPageHTML).join("");
  $track = track;

  updateSlidePosition(false);
  renderIndicator();
  updatepoint();
  syncChipsModalContent();

  if (!swipeBound) {
    bindSwipeEvents();
    bindWheelSwipe();
    swipeBound = true;
  }
}

function updateSlidePosition(withAnim) {
  if (!$track) return;
  $track.style.transition = withAnim ? "transform 0.25s ease-out" : "none";
  $track.style.transform = `translateX(-${currentIndex * 100}%)`;

  $indicator.querySelectorAll(".dot").forEach((d, i) => {
    d.classList.toggle("is-active", i === currentIndex);
  });
}

// ================== UID適用（維持） ==================
function applyUid(uid) {
  const hit = stamps.find(s => s.uid.toUpperCase() === uid.toUpperCase());
  if (!hit) {
    alert(`未登録のUIDです：${uid}\nscript.js の DEFAULT_STAMPS を確認してください。`);
    return;
  }
  if (!hit.flag) {
    hit.flag = true;
    saveStamps();

    currentIndex = stamps.indexOf(hit);
    if (currentIndex < 0) currentIndex = 0;

    render();
    vibrate(50);
  }
}

// ================== スワイプ（スマホ＋PC） ==================
function bindSwipeEvents() {
  let startX = 0;
  let deltaX = 0;
  let isDragging = false;
  let activePointerId = null;

  const onPointerDown = (e) => {
    if (!$track) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    activePointerId = e.pointerId;
    startX = e.clientX;
    deltaX = 0;
    isDragging = true;

    $track.style.transition = "none";
    try { $carousel.setPointerCapture(activePointerId); } catch {}
    e.preventDefault();
    $carousel.classList.add("dragging");
  };

  const onPointerMove = (e) => {
    if (!isDragging || !$track) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    deltaX = e.clientX - startX;
    const width = $carousel.clientWidth || 1;
    const percent = (deltaX / width) * 100;
    $track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${percent}%))`;
    e.preventDefault();
  };

  const finishDrag = () => {
    if (!isDragging || !$track) return;
    isDragging = false;

    const width = $carousel.clientWidth || 1;
    const threshold = width * 0.2;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && currentIndex < stamps.length - 1) currentIndex++;
      else if (deltaX > 0 && currentIndex > 0) currentIndex--;
    }

    updateSlidePosition(true);
    syncChipsModalContent();
    $carousel.classList.remove("dragging");
    activePointerId = null;
  };

  $carousel.addEventListener("pointerdown", onPointerDown, { passive: false });
  $carousel.addEventListener("pointermove", onPointerMove, { passive: false });
  $carousel.addEventListener("pointerup", finishDrag, { passive: true });
  $carousel.addEventListener("pointercancel", finishDrag, { passive: true });
  
  window.addEventListener("keydown", (e) => {
    if (!$track) return;
    if (e.key === "ArrowRight") {
      if (currentIndex < stamps.length - 1) currentIndex++;
      updateSlidePosition(true); syncChipsModalContent();
    }
    if (e.key === "ArrowLeft") {
      if (currentIndex > 0) currentIndex--;
      updateSlidePosition(true); syncChipsModalContent();
    }
  });
}

function bindWheelSwipe() {
  let wheelAccum = 0;
  let wheelTimeout = null;

  $carousel.addEventListener("wheel", (e) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX < absY) return;

    e.preventDefault();
    wheelAccum += e.deltaX;

    const THRESHOLD = 80;
    if (Math.abs(wheelAccum) > THRESHOLD) {
      if (wheelAccum > 0 && currentIndex < stamps.length - 1) currentIndex++;
      else if (wheelAccum < 0 && currentIndex > 0) currentIndex--;

      updateSlidePosition(true);
      syncChipsModalContent();
      wheelAccum = 0;
    }

    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => (wheelAccum = 0), 120);
  }, { passive: false });
}

// ================== Web NFC（維持） ==================
async function startScan() {
  if (!("NDEFReader" in window)) {
    alert("このブラウザは Web NFC に対応していません。HTTPSまたはlocalhost、端末/Chrome/flags設定を確認してください。");
    return;
  }
  try {
    const reader = new NDEFReader();
    await reader.scan();
    toast("NFCスキャンを開始しました。タグをかざしてください。");
    reader.onreading = (event) => {
      const uid = event.serialNumber || "";
      if (!uid) { toast("UIDが取得できませんでした。"); return; }
      console.log("NFC UID:", uid);
      applyUid(uid);
    };
    reader.onreadingerror = () => toast("読み取りに失敗しました。再度タッチしてください。");
  } catch (err) {
    console.error(err);
    alert("NFCスキャンを開始できませんでした。権限・HTTPS・端末対応を確認してください。");
  }
}


// ================== Modal ==================
function openModal() {
  syncChipsModalContent();
  $modal.classList.add("is-open");
  $modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  $modal.classList.remove("is-open");
  $modal.setAttribute("aria-hidden", "true");
}

// ================== Liquid Glass interaction（UIのみ）  ==================
function initLiquidGlass(){
  const ok = CSS.supports("backdrop-filter", "blur(10px)") || CSS.supports("-webkit-backdrop-filter", "blur(10px)");
  if (!ok) document.documentElement.classList.add("no-backdrop");

  // 反射位置は nav全体で管理（子にも継承される）
  const targets = document.querySelectorAll(".glass, .glass-nav");
  let raf = 0;

  const setXY = (el, x, y) => {
    const r = el.getBoundingClientRect();
    const gx = ((x - r.left) / r.width) * 100;
    const gy = ((y - r.top) / r.height) * 100;
    el.style.setProperty("--gx", `${Math.max(0, Math.min(100, gx))}%`);
    el.style.setProperty("--gy", `${Math.max(0, Math.min(100, gy))}%`);
  };

  targets.forEach(el => {
    el.style.setProperty("--gx", "35%");
    el.style.setProperty("--gy", "15%");
    el.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setXY(el, e.clientX, e.clientY));
    }, { passive: true });
  });
}

// ================== Bottom nav (no reload) ==================
// ===== 認証状態（DBなし：mock）=====
const AUTH = {
  user: null,
  mode: "login", // "login" | "register"
};

function loadAuthUser() {
  const raw = localStorage.getItem("auth_user");
  AUTH.user = raw ? JSON.parse(raw) : null;
}

function saveAuthUser(userObj) {
  localStorage.setItem("auth_user", JSON.stringify(userObj));
  loadAuthUser();
}

function clearAuthUser() {
  localStorage.removeItem("auth_user");
  loadAuthUser();
}

// ===== UI描画 =====
function renderProfile() {
  const box = document.getElementById("profileBox");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!AUTH.user) {
    box.innerHTML = `<p>未ログインです。<br>ログインするとユーザー情報や履歴を表示できます。</p>`;
    logoutBtn.style.display = "none";
    return;
  }

  box.innerHTML = `
    <div>ログイン中： <strong>${AUTH.user.username}</strong></div>
  `;
  logoutBtn.style.display = "inline-block";
}

// ===== モーダル制御 =====
function openAuthModal(mode = "login") {
  AUTH.mode = mode;

  document.getElementById("authTitle").textContent = mode === "login" ? "ログイン" : "新規登録";
  document.getElementById("authSubmitBtn").textContent = mode === "login" ? "ログイン" : "登録";
  document.getElementById("authMsg").textContent = "";

  document.querySelectorAll(".auth-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  });

  const modal = document.getElementById("authModal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

// ===== ここがポイント：setPageでプロフィール移動時に判定 =====
function setPage(name) {
  const pages = ["stamp", "pay", "profile"];

  pages.forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle("is-active", p === name);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.target === name);
  });

  // プロフィールに来たら表示を更新し、未ログインならモーダルを出す
  if (name === "profile") {
    renderProfile();
    if (!AUTH.user) openAuthModal("login");
  }
}

// ===== 初期化（DOM読み込み後に）=====
window.addEventListener("DOMContentLoaded", () => {
  loadAuthUser();
  renderProfile();

  // プロフィール内ボタン
  document.getElementById("openLoginBtn").addEventListener("click", () => openAuthModal("login"));
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearAuthUser();
    renderProfile();
    // そのままprofile表示でもOK。stampへ戻すなら↓
    // setPage("stamp");
    openAuthModal("login");
  });

  // モーダル閉じる
  document.getElementById("authCloseBtn").addEventListener("click", closeAuthModal);
  document.querySelector("#authModal .auth-backdrop").addEventListener("click", closeAuthModal);

  // タブ切替
  document.querySelectorAll(".auth-tab").forEach(btn => {
    btn.addEventListener("click", () => openAuthModal(btn.dataset.mode));
  });

  // 送信（DBなし：mock_users）
  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("authUsername").value.trim();
    const password = document.getElementById("authPassword").value;
    const msgEl = document.getElementById("authMsg");

    if (!username || !password) return (msgEl.textContent = "入力してください。");

    // ============================
    // ✅ DB/APIができたらここを有効化
    // const endpoint = AUTH.mode === "login" ? "/api/auth/login" : "/api/auth/register";
    // const res = await fetch(endpoint, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ username, password }),
    // });
    // const data = await res.json();
    // if (!res.ok) return (msgEl.textContent = data.message || "失敗しました");
    // saveAuthUser(data.user); // 例: { id, username }
    // ============================

    // 🧪 DBなし：localStorageで代用
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");

    if (AUTH.mode === "register") {
      if (users.some(u => u.username === username)) {
        msgEl.textContent = "そのユーザー名は使用済みです。";
        return;
      }
      users.push({ username, password }); // デモ用（本番は絶対平文保存しない）
      console.log(username);
      console.log(password);
      localStorage.setItem("mock_users", JSON.stringify(users));

      msgEl.textContent = "登録できました。ログインしてください。";
      openAuthModal("login");
      return;
    }

    // login
    const found = users.find(u => u.username === username);
    if (!found) return (msgEl.textContent = "ユーザーが見つかりません（新規登録してください）");
    if (found.password !== password) return (msgEl.textContent = "パスワードが違います");

    saveAuthUser({ username });
    closeAuthModal();
    renderProfile();
  });
});

// ================== misc ==================
function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }
function toast(msg) { console.log(msg); }

// ================== UIイベント ==================
document.getElementById("scanBtn").addEventListener("click", startScan);

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("進捗をリセットしてもよいですか？")) return;
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;
  render();
});

document.getElementById("resetBtn2").addEventListener("click", () => {
  if (!confirm("進捗をリセットしてもよいですか？")) return;
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;
  render();
  setPage("stamp");
});

$chipsBtn.addEventListener("click", openModal);
$modal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => setPage(btn.dataset.target));
});

// ================== 初期化 ==================
(function init() {
  setPage("stamp");
  render();
  initLiquidGlass();

})();