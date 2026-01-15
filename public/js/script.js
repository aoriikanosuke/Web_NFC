// ====== 設定：スタンプ一覧（points/locationはUI用。裏の流れは同じ）======
// token を追加（iPhone用：/tap?t=token でスタンプ特定）
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前",       uid: "04:18:be:aa:96:20:90", token: "F0RndRHI5PwsexmVVmRF-caM", image: "./images/computer_tokui_boy.png", flag: false, points: 10, location: "本部前：入口付近" },
  { id: 2, name: "体育館",       uid: "04:18:BD:AA:96:20:90", token: "XDPwKf-pbQlJ7fTKfgz7qVeV", image: "./images/school_taiikukan2.png",     flag: false, points: 10, location: "体育館：正面入口" },
  { id: 3, name: "図書館",       uid: "04:18:bc:aa:96:20:90", token: "b5fHiG0d5qvx_1fvSWW-r-Ky", image: "./images/stamp3.png",               flag: false, points: 15, location: "図書館：受付横" },
  { id: 4, name: "中庭",         uid: "04:18:bb:aa:96:20:90", token: "0KmX7IT1tEODcvYhsL49NU9N", image: "./images/stamp4.png",               flag: false, points: 15, location: "中庭：ベンチ付近" },
  { id: 5, name: "100コイン決済", uid: "04:18:ba:aa:96:20:90", token: "7XdBGRNM79aK42vman_PBDxn", image: "./images/stamp5.png",               flag: false, points: 0,  location: "決済：100コイン" },
  { id: 6, name: "200コイン決済", uid: "04:18:b9:aa:96:20:90", token: "vdaBmm2vfzHrZood2Gq5D7EF", image: "./images/stamp6.png",               flag: false, points: 0,  location: "決済：200コイン" },
];


const LS_KEY = "nfc_stamps_v2_images";
const LS_PENDING_TOKEN = "pending_nfc_token";
const LS_PENDING_PROGRESS = "pending_stamp_progress";
const LS_OPEN_AUTH = "open_auth_modal";
const LS_PENDING_BROADCAST = "pending_nfc_broadcast";
const LS_PENDING_BROADCAST_ACK = "pending_nfc_broadcast_ack";
const LS_TAB_ID = "nfc_tab_id";

let stamps = loadStamps();
let currentIndex = 0;
let $track = null;
let swipeBound = false;
const TAB_ID = (() => {
  const existing = sessionStorage.getItem(LS_TAB_ID);
  if (existing) return existing;
  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(LS_TAB_ID, next);
  return next;
})();

const BROADCAST_NAME = "nfc_token_channel";
const bc = ("BroadcastChannel" in window) ? new BroadcastChannel(BROADCAST_NAME) : null;
let pendingBroadcastAck = null;
const handledBroadcasts = new Map();

// DOM
const $oopValue = document.getElementById("oopValue");
const $carousel = document.getElementById("stampCarousel");
const $indicator = document.getElementById("indicator");
const $chipsBtn = document.getElementById("chipsBtn");
const $oopInfo = document.getElementById("oopInfo");
let oopAnimating = false;

const $modal = document.getElementById("modal");
const $modalTitle = document.getElementById("modalTitle");
const $modalBody = document.getElementById("modalBody");

// Sprite sheet config for stamp_ANI2/3.png
const STAMP_ANI = { frames: 38, cols: 4, rows: 10, fps: 30 };
const STAMP_ANI_DURATION = 2100;
const STAMP_ANI_HOLD = 600;
const STAMP_ANI_TAIL_HOLD = 400;
const STAMP_ANI_START_DELAY = 200;
let stampAniEl = null;
let stampAniSprite = null;
let stampAniRaf = 0;
let stampAniResolve = null;
let stampAniTimer = 0;
const STAMP_ANI_END_DELAY = 2100;

function waitAfterStampAni(){
  return new Promise(resolve => setTimeout(resolve, STAMP_ANI_END_DELAY));
}

// ================== 永続化（維持） ==================
function loadStamps() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return structuredClone(DEFAULT_STAMPS);
  try {
    const saved = JSON.parse(raw);
    const byUid = new Map(saved.map(s => [s.uid, s]));
    return DEFAULT_STAMPS.map(def => {
      const hit = byUid.get(def.uid);
      return hit ? { ...def, flag: !!hit.flag, name: hit.name ?? def.name } : { ...def };
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
  return stamps.reduce((sum, s) => sum + (s.flag ? (Number(s.points) || 0) : 0), 0);
}
// デバッグ用オフセットを含めて表示
window.debugPointsOffset = 0;

// persistent consumption and golden mode state
const LS_CONSUMED = 'nfc_consumed_points';
const LS_GOLD_UNLOCK = 'nfc_golden_unlocked';
const LS_GOLD_ACTIVE = 'nfc_golden_active';
let consumedPoints = Number(localStorage.getItem(LS_CONSUMED) || 0);
let goldenUnlocked = localStorage.getItem(LS_GOLD_UNLOCK) === '1';
let goldenActive = localStorage.getItem(LS_GOLD_ACTIVE) === '1';

let currentUser = JSON.parse(localStorage.getItem('user')) || null;

function persistCurrentUser() {
  localStorage.setItem("user", JSON.stringify(currentUser));
}

async function syncFromDB() {
  if (!currentUser?.id) return;

  const res = await fetch(`/api/stamps/acquire?userId=${encodeURIComponent(currentUser.id)}`);
  if (!res.ok) return;

  const data = await res.json();

  // points をDBの正に合わせる
  currentUser.points = Number(data.points || 0);
  persistCurrentUser();

  // 取得済みUIDでスタンプflagを同期（DBを正にする）
  const uidSet = new Set((data.acquiredUids || []).map(u => String(u).toUpperCase()));

  // 画像など既存状態を維持しつつ、flagだけ同期したいなら loadStamps() ベースが安全
  stamps = loadStamps();
  stamps.forEach(s => {
    s.flag = uidSet.has(String(s.uid).toUpperCase());
  });

  saveStamps();
  render();
}


function getEarnedPoints() {
  return (currentUser && Number.isFinite(Number(currentUser.points)))
    ? Number(currentUser.points)
    : calcPoints();
}

function getDisplayedTotal() {
  return getEarnedPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
}

function updateOOP() {
  if (oopAnimating) return;
  setOOPValue(getDisplayedTotal());
}

// function updateOOP() {
//   if (oopAnimating) return;
//   const total = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
//   setOOPValue(total);
// }

function setOOPValue(value) {
  $oopValue.textContent = String(value);
}

function spawnPointsFloat(amount) {
  if (!amount || !Number.isFinite(amount)) return;
  const target = $oopValue || $oopInfo;
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const startX = rect.left - 8;
  const startY = rect.top + rect.height / 2;
  const endX = rect.left + rect.width / 2;
  const endY = rect.top + rect.height / 2;

  const el = document.createElement("div");
  el.className = "points-merge";
  el.textContent = `+${amount}P`;
  el.style.left = `${startX}px`;
  el.style.top = `${startY}px`;
  document.body.appendChild(el);

  const dx = endX - startX;
  const dy = endY - startY;
  const anim = el.animate([
    { transform: "translate(-100%, -50%)", opacity: 1, offset: 0 },
    { transform: "translate(-100%, -50%)", opacity: 1, offset: 0.7 },
    { transform: `translate(calc(-100% + ${dx}px), calc(-50% + ${dy}px))`, opacity: 0.15 }
  ], { duration: 1400, easing: "cubic-bezier(.2,.9,.2,1)" });
  anim.addEventListener("finish", () => { try { el.remove(); } catch {} }, { once: true });
}

function animateOOPIncrease(from, to, delta) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return;
  oopAnimating = true;
  setOOPValue(from);
  spawnPointsFloat(delta);

  const duration = 900;
  const steps = Math.min(Math.max(to - from, 1), 18);
  const stepMs = Math.max(30, Math.round(duration / steps));

  for (let i = 1; i <= steps; i++) {
    const value = i === steps ? to : Math.round(from + ((to - from) * (i / steps)));
    setTimeout(() => setOOPValue(value), stepMs * i);
  }

  if ($oopInfo) {
    $oopInfo.classList.remove("oop-counting");
    void $oopInfo.offsetWidth;
    $oopInfo.classList.add("oop-counting");
  }

  setTimeout(() => {
    oopAnimating = false;
    setOOPValue(to);
    if ($oopInfo) $oopInfo.classList.remove("oop-counting");
  }, duration + 60);
}

function stampPageHTML(s) {
  const imgClass = s.justStamped ? "stamp-img stamp-pop" : "stamp-img";
  const inner = s.flag
    ? `<img class="${imgClass}" src="${s.image}" alt="${s.name}">`
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
    const stamped = stamps[i] && stamps[i].flag ? "is-stamped" : "";
    return `<div class="dot ${active} ${stamped}" data-i="${i}"></div>`;
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
  updateOOP();
  syncChipsModalContent();

  if (!swipeBound) {
    bindSwipeEvents();
    bindWheelSwipe();
    swipeBound = true;
  }

  // remove one-shot animation class after it plays
  track.querySelectorAll(".stamp-pop").forEach(el => {
    el.addEventListener("animationend", () => el.classList.remove("stamp-pop"), { once: true });
    setTimeout(() => el.classList.remove("stamp-pop"), 700);
  });

  // clear one-shot animation flags
  stamps.forEach(s => { if (s.justStamped) s.justStamped = false; });
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
    const prevTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
    hit.flag = true;
    if (currentUser) {
      // まず見た目を即反映（楽観加算）
      currentUser.points = Number(currentUser.points || 0) + (Number(hit.points) || 0);
      persistCurrentUser();
    }
    hit.justStamped = true;
    saveStamps();

    currentIndex = stamps.indexOf(hit);
    if (currentIndex < 0) currentIndex = 0;

    render();
    const nextTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
    animateOOPIncrease(prevTotal, nextTotal, Number(hit.points) || 0);
    vibrate(50);
    // DBへ確定（成功したらDBのpointsで上書きしてズレを0に）
    if (currentUser?.id) {
      (async () => {
        const r = await fetch("/api/stamps/acquire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, uid }),
        });
        const data = await r.json().catch(() => null);
        if (r.ok && data) {
          currentUser.points = Number(data.points || 0);
          persistCurrentUser();
          updateOOP();
        }
      })();
    }
  }
}

function isStampOwnedByUid(uid) {
  if (!uid) return false;
  const hit = stamps.find(s => s.uid.toUpperCase() === String(uid).toUpperCase());
  return !!(hit && hit.flag);
}


// Manual test (iPhone pseudo NFC):
// 1) https://web-nfc-brown.vercel.app/?t=F0RndRHI5PwsexmVVmRF-caM を開く
// 2) URLから t が消えることを確認（再読み込みで二重取得しない）
// 3) 不正な token は console に warning を出し、pending に保存
async function applyToken(token) {
  const t = String(token || "").trim();
  if (!t) return false;
  const list = Array.isArray(stamps) ? stamps : DEFAULT_STAMPS;
  const hit = list.find(s => s.token === t);
  if (!hit) {
    console.warn("NFC token not found:", t);
    return false;
  }
  const owned = isStampOwnedByUid(hit.uid);
  try { showNfcRipple(); } catch {}
  try { await showStampAni(STAMP_ANI_DURATION, owned ? "owned" : "new"); } catch {}
  await waitAfterStampAni();
  applyUid(hit.uid);
  return true;
}

function isDuplicateBroadcast(from, token) {
  const key = `${from}|${token}`;
  const now = Date.now();
  const prev = handledBroadcasts.get(key);
  if (prev && (now - prev) < 3000) return true;
  handledBroadcasts.set(key, now);
  return false;
}

async function handleIncomingBroadcastToken(token) {
  const applied = await applyToken(token);
  if (applied) {
    localStorage.removeItem(LS_PENDING_TOKEN);
  } else {
    localStorage.setItem(LS_PENDING_TOKEN, token);
  }
}

function tryCloseCurrentTab() {
  try { window.close(); } catch {}
  try {
    window.open("", "_self");
    window.close();
  } catch {}
}

function waitForBroadcastAck(token) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      pendingBroadcastAck = null;
      resolve(false);
    }, 450);

    pendingBroadcastAck = (data) => {
      if (!data || data.to !== TAB_ID || data.token !== token) return;
      clearTimeout(timeout);
      pendingBroadcastAck = null;
      resolve(true);
    };
  });
}

function broadcastTokenToOtherTabs(token) {
  const payload = { type: "nfc-token", token, from: TAB_ID, ts: Date.now() };
  try {
    if (bc) bc.postMessage(payload);
  } catch {}
  try { localStorage.setItem(LS_PENDING_BROADCAST, JSON.stringify(payload)); } catch {}
  return waitForBroadcastAck(token);
}

function initBroadcastListeners() {
  if (bc) {
    bc.addEventListener("message", async (event) => {
      const data = event && event.data;
      if (!data || !data.type) return;
      if (data.type === "nfc-token") {
        if (!data.token || data.from === TAB_ID) return;
        if (isDuplicateBroadcast(data.from, data.token)) return;
        await handleIncomingBroadcastToken(data.token);
        try { bc.postMessage({ type: "nfc-token-ack", to: data.from, from: TAB_ID, token: data.token }); } catch {}
      }
      if (data.type === "nfc-token-ack" && pendingBroadcastAck) {
        pendingBroadcastAck(data);
      }
    });
  }

  window.addEventListener("storage", async (event) => {
    if (event.key === LS_PENDING_BROADCAST && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (!data || !data.token || data.from === TAB_ID) return;
        if (isDuplicateBroadcast(data.from, data.token)) return;
        await handleIncomingBroadcastToken(data.token);
        localStorage.setItem(LS_PENDING_BROADCAST_ACK, JSON.stringify({
          to: data.from,
          from: TAB_ID,
          token: data.token,
          ts: Date.now()
        }));
      } catch {}
      return;
    }
    if (event.key === LS_PENDING_BROADCAST_ACK && event.newValue && pendingBroadcastAck) {
      try {
        const data = JSON.parse(event.newValue);
        pendingBroadcastAck(data);
      } catch {}
    }
  });
}

async function consumeTokenFromUrlAndPending() {
  let processedToken = "";
  let targetWindow = window;
  let url = new URL(window.location.href);
  let t = url.searchParams.get("t");

  if (!t) {
    try {
      if (window.parent && window.parent !== window) {
        const parentUrl = new URL(window.parent.location.href);
        const parentToken = parentUrl.searchParams.get("t");
        if (parentToken) {
          t = parentToken;
          url = parentUrl;
          targetWindow = window.parent;
        }
      }
    } catch {}
  }

  if (t) {
    processedToken = t;
    const transferred = await broadcastTokenToOtherTabs(t);
    if (transferred) {
      url.searchParams.delete("t");
      const next = url.searchParams.toString();
      const nextUrl = next ? `${url.pathname}?${next}${url.hash || ""}` : `${url.pathname}${url.hash || ""}`;
      try { targetWindow.history.replaceState(null, "", nextUrl); } catch {}
      tryCloseCurrentTab();
      return;
    }
    const applied = await applyToken(t);
    if (applied) localStorage.removeItem(LS_PENDING_TOKEN);
    else localStorage.setItem(LS_PENDING_TOKEN, t);
    url.searchParams.delete("t");
    const next = url.searchParams.toString();
    const nextUrl = next ? `${url.pathname}?${next}${url.hash || ""}` : `${url.pathname}${url.hash || ""}`;
    try { targetWindow.history.replaceState(null, "", nextUrl); } catch {}
  }

  const pending = localStorage.getItem(LS_PENDING_TOKEN);
  if (pending && pending !== processedToken) {
    if (await applyToken(pending)) localStorage.removeItem(LS_PENDING_TOKEN);
  }
}

function applyStampProgress(progress) {
  if (!Array.isArray(progress)) return;
  const prevTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
  const prevFlags = new Set(stamps.filter(s => s.flag).map(s => s.id));
  const nextFlags = new Set(progress);

  stamps = DEFAULT_STAMPS.map(def => {
    const was = prevFlags.has(def.id);
    const now = nextFlags.has(def.id);
    return { ...def, flag: now, justStamped: now && !was };
  });

  saveStamps();
  render();

  const nextTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
  if (nextTotal > prevTotal) {
    animateOOPIncrease(prevTotal, nextTotal, nextTotal - prevTotal);
  }
}

// Manual test:
// 1) /tap?t=TESTTOKEN (logged-in) -> points & stamps update
// 2) /tap?t=TESTTOKEN (logged-out) -> pending token stored -> login -> auto redeem
// 3) Same token twice -> no extra points
// 4) Android UID scan still works
async function redeemToken(token, options) {
  if (!token) return { ok: false };
  const deferApply = !!(options && options.deferApply);
  const userRaw = localStorage.getItem("user");
  if (!userRaw) {
    localStorage.setItem(LS_PENDING_TOKEN, token);
    localStorage.setItem(LS_OPEN_AUTH, "1");
    try { openAuthModal(); } catch {}
    return { ok: false, needsAuth: true };
  }

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
      try { openAuthModal(); } catch {}
      return { ok: false, needsAuth: true };
    }
    if (!res.ok || !data.ok) {
      showModalMessage("NFC", data.error || "スタンプ取得に失敗しました。");
      return { ok: false };
    }

    try {
      const current = JSON.parse(userRaw);
      current.points = data.points ?? current.points;
      current.stamp_progress = data.stamp_progress ?? current.stamp_progress;
      currentUser = current;
      localStorage.setItem("user", JSON.stringify(current));
    } catch {}

    const stampProgress = Array.isArray(data.stamp_progress) ? data.stamp_progress : null;
    if (stampProgress && !deferApply) {
      applyStampProgress(stampProgress);
    }
    localStorage.removeItem(LS_PENDING_TOKEN);
    localStorage.removeItem(LS_PENDING_PROGRESS);
    return { ok: true, alreadyOwned: !!data.alreadyOwned, stampProgress, points: data.points };
  } catch (err) {
    console.error(err);
    showModalMessage("NFC", "スタンプ取得に失敗しました。");
    return { ok: false };
  }
}

function extractTokenFromRecord(record) {
  if (!record) return "";
  if (record.recordType !== "url" && record.recordType !== "text") return "";
  if (typeof record.data === "string") return record.data;
  if (record.data) {
    try { return new TextDecoder().decode(record.data); } catch {}
  }
  return "";
}

// ================== スワイプ（維持） ==================
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
    showModalMessage("NFC", "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u306f Web NFC \u306b\u5bfe\u5fdc\u3057\u3066\u3044\u307e\u305b\u3093\u3002HTTPS/localhost \u3068\u7aef\u672b\u8a2d\u5b9a\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    return;
  }
  try {
    const reader = new NDEFReader();
    await reader.scan();
    showModalMessage("NFC", "\u30b9\u30ad\u30e3\u30f3\u3092\u958b\u59cb\u3057\u307e\u3057\u305f\u3002\u30bf\u30b0\u3092\u304b\u3056\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    toast("NFCスキャンを開始しました。タグをかざしてください。");
    reader.onreading = async (event) => {
      let token = "";
      if (event.message && event.message.records) {
        for (const record of event.message.records) {
          const text = extractTokenFromRecord(record);
          if (!text) continue;
          try {
            const url = new URL(text);
            const t = url.searchParams.get("t");
            if (t) {
              token = t;
              break;
            }
          } catch {}
        }
      }

        // ビジュアル波紋を表示
        try { showNfcRipple(); } catch (e) { /* no-op */ }

        if (token) {
          const result = await redeemToken(token, { deferApply: true });
          if (result && result.ok) {
            const owned = result.alreadyOwned === true;
            try { await showStampAni(STAMP_ANI_DURATION, owned ? "owned" : "new"); } catch (e) { /* no-op */ }
            await waitAfterStampAni();
            if (Array.isArray(result.stampProgress)) {
              applyStampProgress(result.stampProgress);
            }
          }
          return;
        }

        const uid = event.serialNumber || "";
        if (!uid) { toast("UIDが取得できませんでした。"); return; }
        const owned = isStampOwnedByUid(uid);
        try { await showStampAni(STAMP_ANI_DURATION, owned ? "owned" : "new"); } catch (e) { /* no-op */ }
        await waitAfterStampAni();
        console.log("NFC UID:", uid);
        applyUid(uid);
      };
  } catch (err) {
    console.error(err);
    showModalMessage("NFC", "NFC\u30b9\u30ad\u30e3\u30f3\u3092\u958b\u59cb\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u6a29\u9650/HTTPS/\u7aef\u672b\u5bfe\u5fdc\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
  }
}

// ================== Modal ==================
let modalResolve = null;

function openModal(custom) {
  if (custom) {
    $modalTitle.textContent = custom.title;
    if (custom.bodyNode) {
      $modalBody.innerHTML = "";
      $modalBody.append(custom.bodyNode);
    } else {
      $modalBody.textContent = custom.body;
    }
  } else {
    syncChipsModalContent();
  }
  $modal.classList.add("is-open");
  $modal.setAttribute("aria-hidden", "false");
}
function closeModal(result) {
  $modal.classList.remove("is-open");
  $modal.setAttribute("aria-hidden", "true");
  if (modalResolve) {
    const resolve = modalResolve;
    modalResolve = null;
    resolve(Boolean(result));
  }
}

function showModalMessage(title, body) {
  openModal({ title, body });
}

function showModalConfirm(title, body, okText, cancelText) {
  return new Promise(resolve => {
    modalResolve = resolve;
    const wrap = document.createElement("div");
    const msg = document.createElement("p");
    msg.className = "modal-text";
    msg.textContent = body;
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "chips-btn glass";
    ok.textContent = okText || "OK";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "chips-btn glass";
    cancel.textContent = cancelText || "キャンセル";
    if (okText === "リセットする") ok.classList.add("modal-danger");
    actions.append(ok, cancel);
    wrap.append(msg, actions);
    openModal({ title, bodyNode: wrap });
    ok.addEventListener("click", () => closeModal(true), { once: true });
    cancel.addEventListener("click", () => closeModal(false), { once: true });
  });
}

// ================== Bottom nav ==================
function setPage(name) {
  ["stamp","pay","profile"].forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle("is-active", p === name);
  });
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.target === name);
  });
}

// ================== Liquid Glass interaction（UIのみ）  ==================
function initLiquidGlass(){
  const ok = CSS.supports("backdrop-filter", "blur(10px)") || CSS.supports("-webkit-backdrop-filter", "blur(10px)");
  if (!ok) document.documentElement.classList.add("no-backdrop");

  const targets = document.querySelectorAll(".glass, .glass-nav");
  targets.forEach(el => {
    el.style.setProperty("--gx", "35%");
    el.style.setProperty("--gy", "15%");
  });
}

function initKiran(){
  const targets = document.querySelectorAll(
    "button, .page-center, .stamp-card, .golden-card, .modal-panel, .bottom-nav, .oop-pill"
  );
  targets.forEach(el => {
    if (el.classList.contains("kiran-target")) return;
    el.classList.add("kiran-target");
    const shine = document.createElement("span");
    shine.className = "kiran-shine";
    shine.setAttribute("aria-hidden", "true");
    el.appendChild(shine);

    if (el.classList.contains("golden-card")) {
      if (!el.querySelector(".golden-sheen")) {
        const sheen = document.createElement("span");
        sheen.className = "golden-sheen";
        sheen.setAttribute("aria-hidden", "true");
        el.appendChild(sheen);
      }
    }
  });
}

// ================== misc ==================
function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }
function toast(msg) { console.log(msg); }

/* NFC読み取り時にトップ中央で派手な波紋を出す (DOM操作) */
function showNfcRipple(){
  const el = document.createElement('div');
  el.className = 'nfc-ripple';
  const app = document.querySelector('.app');
  (app || document.body).appendChild(el);
  // 強制リフローでアニメーションを確実に開始
  void el.offsetWidth;
  // アニメーション終了で削除
  el.addEventListener('animationend', () => {
    try { el.remove(); } catch(e){}
  }, { once: true });
}

function initStampAni(){
  stampAniEl = document.getElementById('stampAni');
  if(!stampAniEl) return;
  stampAniSprite = stampAniEl.querySelector('.stamp-ani-sprite');
  stampAniEl.style.setProperty('--stamp-ani-cols', String(STAMP_ANI.cols));
  stampAniEl.style.setProperty('--stamp-ani-rows', String(STAMP_ANI.rows));
  stampAniEl.style.setProperty('--stamp-ani-frames', String(STAMP_ANI.frames));
  stampAniEl.dataset.variant = 'new';
}

function playStampAni(durationMs){
  return new Promise(resolve => {
    if(!stampAniEl || !stampAniSprite) initStampAni();
    if(!stampAniEl || !stampAniSprite) { resolve(); return; }
    const duration = Math.max(0, Number(durationMs) || 0);
    if(duration <= 0){ resolve(); return; }
    const hold = Math.max(0, Number(STAMP_ANI_HOLD) || 0);
    const tailHold = Math.max(0, Number(STAMP_ANI_TAIL_HOLD) || 0);

    const frames = STAMP_ANI.frames;
    const cols = STAMP_ANI.cols;

    if(stampAniRaf) cancelAnimationFrame(stampAniRaf);
    if(stampAniTimer) clearTimeout(stampAniTimer);
    if(stampAniResolve){ stampAniResolve(); }
    stampAniResolve = resolve;

    const startDelay = Math.max(0, Number(STAMP_ANI_START_DELAY) || 0);
    const begin = () => {
      const start = performance.now();
      stampAniEl.style.setProperty('--stamp-ani-duration', `${duration}ms`);
      stampAniEl.classList.add('is-show');
      stampAniSprite.style.backgroundPosition = '0% 0%';
      stampAniSprite.style.animation = 'none';
      void stampAniSprite.offsetWidth;
      stampAniSprite.style.animation = '';

      const step = (now) => {
        const elapsed = now - start;
        const activeDuration = Math.max(1, (duration - hold - tailHold));
        let idx = 0;
        if (elapsed < hold) {
          idx = 0;
        } else if (elapsed < (hold + activeDuration)) {
          const t = Math.min(1, Math.max(0, (elapsed - hold) / activeDuration));
          idx = Math.min(frames - 1, Math.floor(t * frames));
        } else {
          idx = frames - 1;
        }
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
        const y = STAMP_ANI.rows > 1 ? (row / (STAMP_ANI.rows - 1)) * 100 : 0;
        stampAniSprite.style.backgroundPosition = `${x}% ${y}%`;
        if(elapsed < duration){
          stampAniRaf = requestAnimationFrame(step);
        }else{
          stampAniEl.classList.remove('is-show');
          stampAniRaf = 0;
          const done = stampAniResolve;
          stampAniResolve = null;
          if(done) done();
        }
      };
      stampAniRaf = requestAnimationFrame(step);
    };

    if(startDelay > 0){
      stampAniEl.classList.remove('is-show');
      stampAniTimer = setTimeout(begin, startDelay);
    }else{
      begin();
    }
  });
}

function showStampAni(durationMs, variant){
  if(!stampAniEl || !stampAniSprite) initStampAni();
  if(stampAniEl) stampAniEl.dataset.variant = (variant === 'owned') ? 'owned' : 'new';
  return playStampAni(durationMs);
}

/* ================== Debug UI ================== */
async function simulateTouch(uid){
  try{ showNfcRipple(); }catch(e){}
  const owned = isStampOwnedByUid(uid);
  try{ await showStampAni(STAMP_ANI_DURATION, owned ? "owned" : "new"); }catch(e){}
  await waitAfterStampAni();
  applyUid(uid);
}

function adjustDebugPoints(delta){
  // Adjust relative to the currently displayed OOP value so we never mutate base data
  const base = calcPoints() - (consumedPoints || 0);
  const currentDisplayed = base + (window.debugPointsOffset || 0);
  // compute new offset so that displayed value moves by delta
  window.debugPointsOffset = (currentDisplayed + delta) - base;
  updateOOP();
}

function populateDebugPanel(){
  const panel = document.getElementById('debugPanel');
  if(!panel) return;
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.style.fontWeight = '900';
  title.textContent = 'デバッグ操作';
  panel.appendChild(title);

  // NFC UID のシミュレーションボタン群
  const group = document.createElement('div');
  group.style.display = 'flex';
  group.style.flexDirection = 'column';
  group.style.gap = '6px';
  DEFAULT_STAMPS.forEach(s => {
    const b = document.createElement('button');
    b.textContent = `Touch: ${s.name}`;
    b.addEventListener('click', () => simulateTouch(s.uid));
    group.appendChild(b);
  });
  panel.appendChild(group);

  // ポイント増減
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.marginTop = '8px';

  const inc = document.createElement('button');
  inc.textContent = '+10P';
  inc.addEventListener('click', () => adjustDebugPoints(10));
  const dec = document.createElement('button');
  dec.textContent = '-10P';
  dec.addEventListener('click', () => adjustDebugPoints(-10));
  const reset = document.createElement('button');
  reset.textContent = 'リセットP';
  reset.addEventListener('click', () => { window.debugPointsOffset = 0; updateOOP(); });

  controls.appendChild(inc);
  controls.appendChild(dec);
  controls.appendChild(reset);
  panel.appendChild(controls);
}

// デバッグトグルの初期化
function initDebugUI(){
  const toggle = document.getElementById('debugToggle');
  const panel = document.getElementById('debugPanel');
  if(!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    panel.setAttribute('aria-hidden', !open);
    document.querySelector('.debug-tools').setAttribute('aria-hidden', !open);
  });
  populateDebugPanel();
}

/* ===== Golden Mode: unlock / toggle ===== */
function persistConsumed(){
  localStorage.setItem(LS_CONSUMED, String(consumedPoints || 0));
}

function persistGolden(){
  localStorage.setItem(LS_GOLD_UNLOCK, goldenUnlocked ? '1' : '0');
  localStorage.setItem(LS_GOLD_ACTIVE, goldenActive ? '1' : '0');
}

function applyGoldenClass(){
  const app = document.querySelector('.app');
  if(!app) return;
  if(goldenActive) app.classList.add('golden');
  else app.classList.remove('golden');
}

// Golden sparks that appear occasionally on all .glass elements
let _goldenSparkTimer = null;
function startGoldenSparks(){
  if(_goldenSparkTimer) return;
  _goldenSparkTimer = setInterval(() => {
    if(!goldenActive || document.hidden) return;
    // Add light sparks to random .glass elements
    document.querySelectorAll('.app.golden .glass').forEach(el => {
      if(Math.random() > 0.75) return;
      const count = 1 + Math.floor(Math.random()*2);
      for(let i=0;i<count;i++){
        const s = document.createElement('div');
        s.className = 'gold-spark';
        const rx = Math.random()*100;
        const ry = Math.random()*100;
        s.style.left = rx + '%';
        s.style.top = ry + '%';
        s.style.width = (6 + Math.random()*10) + 'px';
        s.style.height = (6 + Math.random()*10) + 'px';
        s.style.animationDuration = (700 + Math.random()*900) + 'ms';
        el.appendChild(s);
        setTimeout(()=>{ try{ s.remove(); }catch(e){} }, 1400);
      }
    });

    // Larger background overlay sparks — spawn several for denser effect
    const overlay = document.getElementById('goldenOverlay');
    if(overlay){
      const spawn = 1 + Math.floor(Math.random()*2);
      for(let j=0;j<spawn;j++){
        const o = document.createElement('div');
        o.className = 'gold-overlay-spark';
        const lx = Math.random()*100;
        const ly = Math.random()*70 + 5; // keep somewhat away from very top
        o.style.left = lx + '%';
        o.style.top = ly + '%';
        o.style.width = (14 + Math.random()*18) + 'px';
        o.style.height = (14 + Math.random()*18) + 'px';
        o.style.animationDuration = (1000 + Math.random()*1600) + 'ms';
        overlay.appendChild(o);
        setTimeout(()=>{ try{ o.remove(); }catch(e){} }, 2600);
      }
    }
  }, 600);
}

function stopGoldenSparks(){
  if(_goldenSparkTimer){ clearInterval(_goldenSparkTimer); _goldenSparkTimer = null; }
  // remove remaining sparks
  document.querySelectorAll('.gold-spark').forEach(e=>e.remove());
  document.querySelectorAll('.gold-overlay-spark').forEach(e=>e.remove());
}

function updateGoldenUI(){
  const unlockBtn = document.getElementById('unlockGoldenBtn');
  const toggleBtn = document.getElementById('toggleGoldenBtn');
  const status = document.getElementById('goldenStatus');
  if(!unlockBtn || !toggleBtn || !status) return;

  if(goldenUnlocked){
    unlockBtn.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    // remove stray text nodes to avoid duplicated labels
    Array.from(toggleBtn.childNodes).forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) n.remove();
    });
    toggleBtn.querySelectorAll('.toggle-label, .toggle-state').forEach(n => n.remove());
    let labelEl = toggleBtn.querySelector('.toggle-label');
    let stateEl = toggleBtn.querySelector('.toggle-state');
    if (!labelEl || !stateEl) {
      const shine = toggleBtn.querySelector('.kiran-shine');
      labelEl = document.createElement('span');
      labelEl.className = 'toggle-label';
      labelEl.textContent = '\u30b4\u30fc\u30eb\u30c7\u30f3:';
      stateEl = document.createElement('span');
      stateEl.className = 'toggle-state';
      stateEl.textContent = goldenActive ? 'ON' : 'OFF';
      if (shine) {
        toggleBtn.insertBefore(labelEl, shine);
        toggleBtn.insertBefore(stateEl, shine);
      } else {
        toggleBtn.append(labelEl, stateEl);
      }
    } else {
      stateEl.textContent = goldenActive ? 'ON' : 'OFF';
    }
    toggleBtn.classList.toggle('is-on', goldenActive);
    status.textContent = goldenActive ? '解禁済み' : '解禁済み';
  } else {
    unlockBtn.style.display = 'inline-block';
    toggleBtn.style.display = 'none';
    status.textContent = '未解禁';
  }
}

function availablePoints(){
  return calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
}

async function unlockGolden(){
  if(goldenUnlocked) return;
  const need = 50;
  if(availablePoints() < need){
    showModalMessage("\u30b4\u30fc\u30eb\u30c7\u30f3\u30e2\u30fc\u30c9", "\u30dd\u30a4\u30f3\u30c8\u304c\u4e0d\u8db3\u3057\u3066\u3044\u307e\u3059\u3002");
    return;
  }
  const ok = await showModalConfirm("\u30b4\u30fc\u30eb\u30c7\u30f3\u30e2\u30fc\u30c9", `\u672c\u5f53\u306b ${need}P \u3092\u4f7f\u7528\u3057\u3066\u30b4\u30fc\u30eb\u30c7\u30f3\u30e2\u30fc\u30c9\u3092\u89e3\u7981\u3057\u307e\u3059\u304b\uFF1F`, "\u89e3\u7981\u3059\u308b", "\u30ad\u30e3\u30f3\u30bb\u30eb");
  if(!ok) return;
  consumedPoints = (consumedPoints || 0) + need;
  persistConsumed();
  goldenUnlocked = true;
  goldenActive = true;
  persistGolden();
  applyGoldenClass();
  startGoldenSparks();
  updateGoldenUI();
  updateOOP();
}

function toggleGolden(){
  if(!goldenUnlocked) return;
  goldenActive = !goldenActive;
  persistGolden();
  applyGoldenClass();
  if(goldenActive) startGoldenSparks(); else stopGoldenSparks();
  updateGoldenUI();
}


async function resetDBProgressIfLoggedIn() {
  // currentUser が未定義でも動くように保険
  const u = (typeof currentUser !== "undefined" && currentUser)
    ? currentUser
    : JSON.parse(localStorage.getItem("user") || "null");

  if (!u?.id) return { skipped: true };

  const r = await fetch("/api/stamps/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: u.id }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "DB reset failed");

  // pointsを0に反映（DBを正にするなら必須）
  if (typeof currentUser !== "undefined" && currentUser) {
    currentUser.points = 0;
    localStorage.setItem("user", JSON.stringify(currentUser));
  }

  return data; // { ok, deletedCount, user... } など
}

// ================== UIイベント ==================
document.getElementById("scanBtn").addEventListener("click", startScan);

async function resetProgressAndGoStamp() {
  const ok = await showModalConfirm("リセット", "進捗をリセットしてもよいですか？", "リセットする", "キャンセル");
  if (!ok) return;

  // DB reset（ログイン中のみ）
  const u =
    (typeof currentUser !== "undefined" && currentUser)
      ? currentUser
      : JSON.parse(localStorage.getItem("user") || "null");

  if (u?.id) {
    const r = await fetch("/api/stamps/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(data?.error || "DBのリセットに失敗しました。");
      return;
    }
    if (typeof currentUser !== "undefined" && currentUser) {
      currentUser.points = Number(data?.user?.points ?? 0);
      localStorage.setItem("user", JSON.stringify(currentUser));
    }
  }

  // local reset
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;

  consumedPoints = 0;
  goldenUnlocked = false;
  goldenActive = false;
  persistConsumed();
  persistGolden();

  render();
  applyGoldenClass();
  updateGoldenUI();
  updateOOP();

  setPage("stamp"); // ← 常に戻す
}

document.getElementById("resetBtn").addEventListener("click", resetProgressAndGoStamp);
document.getElementById("resetBtn2").addEventListener("click", resetProgressAndGoStamp);


$chipsBtn.addEventListener("click", () => openModal());
if ($oopInfo) {
  $oopInfo.addEventListener("click", () => {
    openModal({
      title: "ポイントについて",
      body: "スタンプを入手するとポイントがたまり、ショッピングなどで利用できます。",
    });
  });
}
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

// Golden buttons hookup
const unlockBtnEl = document.getElementById('unlockGoldenBtn');
const toggleBtnEl = document.getElementById('toggleGoldenBtn');
if(unlockBtnEl) unlockBtnEl.addEventListener('click', unlockGolden);
if(toggleBtnEl) toggleBtnEl.addEventListener('click', toggleGolden);

// ================== 初期化 ==================
(function init() {
  setPage("stamp");
  render();
  initLiquidGlass();
  initStampAni();
  initBroadcastListeners();
  // デバッグUIはデスクトップ向けに初期化
  initDebugUI();
  initKiran();
  // golden 初期化
  applyGoldenClass();
  updateGoldenUI();
  if(goldenActive) startGoldenSparks();
  updateOOP();
  consumeTokenFromUrlAndPending();

})();

// let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let isLoginMode = true;
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authChoice = document.getElementById('auth-choice');
const authForm = document.getElementById('auth-form');
const authLoginChoice = document.getElementById('auth-login-choice');
const authRegisterChoice = document.getElementById('auth-register-choice');

function showAuthChoice() {
  isLoginMode = true;
  if (authChoice) {
    authChoice.hidden = false;
    authChoice.style.display = 'flex';
  }
  if (authForm) {
    authForm.hidden = true;
    authForm.style.display = 'none';
  }
  if (authTitle) authTitle.innerText = 'アカウント';
}

function showAuthForm(nextIsLogin) {
  isLoginMode = !!nextIsLogin;
  if (authChoice) {
    authChoice.hidden = true;
    authChoice.style.display = 'none';
  }
  if (authForm) {
    authForm.hidden = false;
    authForm.style.display = 'block';
  }
  if (authTitle) authTitle.innerText = isLoginMode ? 'ログイン' : '新規会員登録';
  if (authSubmitBtn) authSubmitBtn.innerText = isLoginMode ? 'ログイン' : '登録';
  if (authToggleText) authToggleText.innerText = isLoginMode ? '新規登録はこちら' : 'ログインはこちら';
}

// 初期化：ログイン状態ならUIを更新
document.addEventListener('DOMContentLoaded', () => {
  if (currentUser) {
    updateUIForLoggedInUser();
    // 必要に応じてDBから最新状態を取得し同期
    syncFromDB();
    // stamps = currentUser.stamp_progress;
    // points = currentUser.points;
    // renderStamps(); // 既存の描画関数
  }

  const pendingProgress = localStorage.getItem(LS_PENDING_PROGRESS);
  if (pendingProgress) {
    try { applyStampProgress(JSON.parse(pendingProgress)); } catch {}
    localStorage.removeItem(LS_PENDING_PROGRESS);
  }

  const openAuth = localStorage.getItem(LS_OPEN_AUTH);
  if (openAuth === "1") {
    localStorage.removeItem(LS_OPEN_AUTH);
    try { openAuthModal(); } catch {}
  }

  consumeTokenFromUrlAndPending();
});

function openAuthModal() {
  if (!authModal) return;
  authModal.classList.add('is-open');
  authModal.setAttribute('aria-hidden', 'false');
  showAuthChoice();
}

function closeAuthModal() {
  if (!authModal) return;
  authModal.classList.remove('is-open');
  authModal.setAttribute('aria-hidden', 'true');
  showAuthChoice();
}

// toggleAuthMode もタイトル等を書き換えるよう維持
function toggleAuthMode() {
  showAuthForm(!isLoginMode);
}

if (authLoginChoice) {
  authLoginChoice.addEventListener('click', () => showAuthForm(true));
}
if (authRegisterChoice) {
  authRegisterChoice.addEventListener('click', () => showAuthForm(false));
}

async function handleAuth() {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    const user = await res.json();
    currentUser = user;
    localStorage.setItem("user", JSON.stringify(user));

    updateUIForLoggedInUser();
    closeAuthModal();

    await syncFromDB(); // ← ここで stamps と points が揃う

    alert(isLoginMode ? "ログインしました" : "登録が完了しました");
  } else {
    const err = await res.json();
    alert(err.error);
  }
}

function updateUIForLoggedInUser() {
  document.getElementById('auth-trigger-btn').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('display-username').innerText = currentUser.username;
}

function logout() {
  localStorage.removeItem('user');
  location.reload(); // 状態リセットのためリロード
}
