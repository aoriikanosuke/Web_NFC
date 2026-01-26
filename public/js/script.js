// ====== 設定：スタンプ一覧（points/locationはUI用。裏の流れは同じ）======
// token を追加（iPhone用：/tap?t=token でスタンプ特定）
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前",            uid: "04:18:be:aa:96:20:90", token: "F0RndRHI5PwsexmVVmRF-caM", image: "/images/stamp1.png", flag: false, points: 20, location: "本部前：入口付近" },
  { id: 2, name: "ラウンジ",        uid: "04:18:bd:aa:96:20:90", token: "XDPwKf-pbQlJ7fTKfgz7qVeV", image: "/images/stamp2.png",     flag: false, points: 20, location: "ラウンジ：階段横" },
  { id: 3, name: "図書館",       uid: "04:18:bc:aa:96:20:90", token: "b5fHiG0d5qvx_1fvSWW-r-Ky", image: "/images/stamp3.png",               flag: false, points: 20, location: "図書館：受付横" },
  { id: 4, name: "学内コンビニ",         uid: "04:18:bb:aa:96:20:90", token: "0KmX7IT1tEODcvYhsL49NU9N", image: "/images/stamp4.png",               flag: false, points: 20, location: "学内コンビニ：入口付近" },
  { id: 5, name: "情報学科教務室前", uid: "04:18:ba:aa:96:20:90", token: "7XdBGRNM79aK42vman_PBDxn", image: "/images/stamp5.png",               flag: false, points: 20,  location: "情報学科教務室前：入口付近" },
  { id: 6, name: "受付", uid: "04:18:b9:aa:96:20:90", token: "vdaBmm2vfzHrZood2Gq5D7EF", image: "/images/stamp6.png",               flag: false, points: 20,  location: "受付：受付横" },
];

const DEBUG_SHOPS = [
  { name: "A", uid: "04:18:b8:aa:96:20:90", token: "k9QmT2vN7xR_p4LdZsW-1aHc" },
  { name: "B", uid: "04:18:b7:aa:96:20:90", token: "P3uXvG8n0Jt_y6KeRmQ-9fNd" },
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
let currentPage = "stamp";
let $track = null;
let $pageBase = null;
let $pageOverlay = null;
let swipeBound = false;
let isFlipping = false;
let flipTimer = 0;
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
const $app = document.querySelector(".app");
const $siteInfoTrigger = document.getElementById("siteInfoTrigger");
const $siteInfoOverlay = document.getElementById("siteInfoOverlay");
const $siteInfoStartBtn = document.getElementById("siteInfoStartBtn");
const $siteInfoLoginBtn = document.getElementById("siteInfoLoginBtn");
const $siteInfoSignupBtn = document.getElementById("siteInfoSignupBtn");
const $siteInfoForm = document.getElementById("siteInfoForm");
const $siteInfoFormTitle = document.getElementById("siteInfoFormTitle");
const $siteInfoUsername = document.getElementById("siteInfoUsername");
const $siteInfoPassword = document.getElementById("siteInfoPassword");
const $siteInfoSubmitBtn = document.getElementById("siteInfoSubmitBtn");
const $siteInfoToggleLink = document.getElementById("siteInfoToggleLink");
const $siteInfoFormError = document.getElementById("siteInfoFormError");
const $siteUsageStartBtn = document.getElementById("siteUsageStartBtn");
const $completeOverlay = document.getElementById("completeOverlay");
const $completeBonusBtn = document.getElementById("completeBonusBtn");
const $tradeLogBtn = document.getElementById("tradeLogBtn");
const $rankingBtn = document.getElementById("rankingBtn");
const $rankingModal = document.getElementById("rankingModal");
const $rankingList = document.getElementById("rankingList");
const $transactionModal = document.getElementById("transactionModal");
const $transactionList = document.getElementById("transactionList");
const $transactionState = document.getElementById("transactionState");
const $topNotice = document.getElementById("topNotice");
const $topNoticeText = document.getElementById("topNoticeText");
let topNoticeCount = 0;
const $scanStatus = document.getElementById("scanStatus");

// Pay UI
const $payAmount = document.getElementById("payAmount");
const $payConfirmAmount = document.getElementById("payConfirmAmount");
const $payAvailable = document.getElementById("payAvailable");
const $payRotator = document.getElementById("payRotator");
const $paySelectStep = document.getElementById("paySelectStep");
const $payAmountStep = document.getElementById("payAmountStep");
const $payShopName = document.getElementById("payShopName");
const $payShopLocation = document.getElementById("payShopLocation");
const $payShopPoints = document.getElementById("payShopPoints");
const $payScanBtn = document.getElementById("payScanBtn");
const $payKeypad = document.getElementById("payKeypad");
const $payConfirmBtn = document.getElementById("payConfirmBtn");
const $payBackBtn = document.getElementById("payBackBtn");
const $payCommitBtn = document.getElementById("payCommitBtn");
const $payStatus = document.getElementById("payStatus");
const $paySuccess = document.getElementById("paySuccess");
const $paySuccessAmount = document.getElementById("paySuccessAmount");
const $paySuccessConsumed = document.getElementById("paySuccessConsumed");
const $paySprite = document.getElementById("paySprite");

const PAY_SPRITE_SRC = "/images/pay_ANI2.png";
const PAY_SPRITE = { cols: 4, rows: 10, frames: 40, fps: 18 };
let paySpriteTimer = null;
let paySpriteIndex = 0;
let paySpriteDir = 1;
let paySpriteFrameW = 0;
let paySpriteFrameH = 0;
let paySpriteNaturalW = 0;
let paySpriteNaturalH = 0;

const paySpriteImage = new Image();
paySpriteImage.decoding = "async";
paySpriteImage.src = PAY_SPRITE_SRC;
paySpriteImage.addEventListener("load", () => {
  paySpriteNaturalW = paySpriteImage.naturalWidth || 0;
  paySpriteNaturalH = paySpriteImage.naturalHeight || 0;
  updatePaySpriteSizing();
});

// Sprite sheet config for stamp_ANI2/3.png
const STAMP_ANI = { frames: 38, cols: 4, rows: 10, fps: 30 };
const STAMP_ANI_DURATION = 2100;
const STAMP_ANI_DURATION_UID = 0;
const STAMP_ANI_HOLD = 600;
const STAMP_ANI_TAIL_HOLD = 400;
const STAMP_ANI_START_DELAY = 200;
const STAMP_ANI3_STOP_FRAME = 6;
const STAMP_ANI3_FLYOUT_MS = 8000;
const STAMP_ANI_FADE_ANIM = 'stamp-ani-fade var(--stamp-ani-duration, 700ms) ease-in-out both';
const STAMP_ANI_HIDE_DELAY_MS = 180;
let stampAniEl = null;
let stampAniSprite = null;
let stampAniRaf = 0;
let stampAniResolve = null;
let stampAniTimer = 0;
let stampAniFlyout = null;
const STAMP_ANI_END_DELAY = 2100;
const STAMP_ANI_END_DELAY_OWNED = 0;

function waitAfterStampAni(variant, options){
  if (options && options.debug) return Promise.resolve();
  const delay = variant === 'owned' ? STAMP_ANI_END_DELAY_OWNED : STAMP_ANI_END_DELAY;
  return new Promise(resolve => setTimeout(resolve, delay));
}

let nfcReadInFlight = false;
let lastReadKey = "";
let lastReadAt = 0;

function shouldIgnoreRead(key) {
  const now = Date.now();
  if (nfcReadInFlight) return true;
  if (key && key === lastReadKey && (now - lastReadAt) < 2500) return true; // 2.5秒同じの無視
  lastReadKey = key;
  lastReadAt = now;
  return false;
}

function getNfcSupportInfo() {
  const hasNdef = typeof window !== "undefined" && typeof window.NDEFReader !== "undefined";
  const isSecure = !!window.isSecureContext;
  return { hasNdef, isSecure };
}

function setScanStatus(message) {
  if ($scanStatus) $scanStatus.textContent = message || "";
}

function updateScanToggleUI() {
  const btn = document.getElementById("scanBtn");
  if (!btn) return;
  btn.classList.toggle("is-on", !!nfcScanning);
  btn.classList.toggle("is-off", !nfcScanning);
  btn.setAttribute("aria-pressed", nfcScanning ? "true" : "false");
}

function normalizeUid(value) {
  return String(value || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
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

function ensureLoggedInForToken(token) {
  if (currentUser?.id) return true;
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (stored?.id) {
      currentUser = stored;
      return true;
    }
  } catch {}
  if (token) localStorage.setItem(LS_PENDING_TOKEN, token);
  localStorage.setItem(LS_OPEN_AUTH, "1");
  showModalMessage("NFC", "この操作にはログインが必要です。ログイン後、再度お試しください。");
  try { openAuthModal(); } catch {}
  return false;
}

async function syncFromDB() {
  if (!currentUser?.id) return;
  showTopNotice("同期中");
  try {
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
  } finally {
    hideTopNotice();
  }
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
  updatePayAvailable();
}

// function updateOOP() {
//   if (oopAnimating) return;
//   const total = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
//   setOOPValue(total);
// }

function setOOPValue(value) {
  $oopValue.textContent = String(value);
}

function showTopNotice(message) {
  if (!$topNotice) return;
  if (message && $topNoticeText) $topNoticeText.textContent = message;
  topNoticeCount += 1;
  $topNotice.classList.add("is-show");
  $topNotice.setAttribute("aria-hidden", "false");
}

function hideTopNotice() {
  if (!$topNotice) return;
  topNoticeCount = Math.max(0, topNoticeCount - 1);
  if (topNoticeCount === 0) {
    $topNotice.classList.remove("is-show");
    $topNotice.setAttribute("aria-hidden", "true");
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  button.classList.toggle("is-loading", !!isLoading);
  button.disabled = !!isLoading;
  if (isLoading) button.setAttribute("aria-busy", "true");
  else button.removeAttribute("aria-busy");
}

function setButtonLabel(button, text) {
  if (!button) return;
  const label = button.querySelector(".btn-label");
  if (label) label.textContent = text;
  else button.textContent = text;
}

// ================== Ranking ==================
async function openRankingModal() {
  if (!$rankingModal || !$rankingList) return;
  $rankingList.innerHTML = `
    <div class="transaction-surface">
      <div class="transaction-state">
        <div class="transaction-spinner" aria-hidden="true"></div>
        <div class="transaction-state-text">読み込み中...</div>
      </div>
    </div>
  `;
  $rankingModal.classList.add("is-open");
  $rankingModal.setAttribute("aria-hidden", "false");

  showTopNotice("ランキング取得中");
  try {
    const res = await fetch("/api/ranking");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      $rankingList.innerHTML = `
        <div class="transaction-surface">
          <div class="transaction-state">
            <div class="transaction-state-text">${data?.error || "ランキング取得に失敗しました。"}</div>
          </div>
        </div>
      `;
      return;
    }
    const list = Array.isArray(data?.ranking) ? data.ranking : [];
    if (list.length === 0) {
      $rankingList.innerHTML = `
        <div class="transaction-surface">
          <div class="transaction-state">
            <div class="transaction-state-text">ランキングデータがありません。</div>
          </div>
        </div>
      `;
      return;
    }
    $rankingList.innerHTML = list.map((row, idx) => {
      const name = row.username || "user";
      const points = Number(row.points || 0);
      const stampCount = Number(row.stamp_count || 0);
      const iconCount = Math.max(0, Math.min(6, stampCount));
      const rankIndex = idx + 1;
      const rankClass = rankIndex <= 3 ? `rank-${rankIndex}` : "";
      const crown = rankIndex === 1
        ? `<img class="ranking-crown" src="./images/OUKAN.png" alt="1位">`
        : "";
      const icons = Array.from({ length: 6 }).map((_, i) => {
        const active = i < iconCount ? "is-active" : "";
        return `<img class="ranking-stamp ${active}" src="./images/stamp.png" alt="">`;
      }).join("");
      return `
        <div class="ranking-item ${rankClass}">
          <div class="ranking-rank">#${rankIndex}</div>
          <div class="ranking-name">
            <span class="ranking-name-text">${crown}<span class="ranking-name-label">${name}</span></span>
          </div>
          <div class="ranking-stamps" aria-label="スタンプ所持数 ${stampCount}">
            ${icons}
          </div>
          <div class="ranking-points">${points}P</div>
        </div>
      `;
    }).join("");
  } catch {
    $rankingList.innerHTML = `
      <div class="transaction-surface">
        <div class="transaction-state">
          <div class="transaction-state-text">ランキング取得に失敗しました。</div>
        </div>
      </div>
    `;
  } finally {
    hideTopNotice();
  }
}

function closeRankingModal() {
  if (!$rankingModal) return;
  $rankingModal.classList.remove("is-open");
  $rankingModal.setAttribute("aria-hidden", "true");
}

// ================== Transaction logs ==================
let transactionLogs = [];
let transactionLoaded = false;
let transactionLoading = false;

function setTransactionModalOpen(isOpen) {
  if (!$transactionModal) return;
  $transactionModal.classList.toggle("is-open", !!isOpen);
  $transactionModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
  document.body.classList.toggle("is-transaction-open", !!isOpen);
}

function formatTransactionTitle(log) {
  const note = String(log?.note || "").trim();
  if (log?.action === "payment") {
    return note ? `支払い（${note}）` : "支払い";
  }
  if (log?.action === "stamp_acquire") {
    return note ? `スタンプ取得（${note}）` : "スタンプ取得";
  }
  return note || log?.action || "取引";
}

function formatTransactionTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const text = date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return text.replace(",", "");
}

function renderTransactionState(type, message) {
  if (!$transactionState) return;
  $transactionState.style.display = "flex";
  if (type === "loading") {
    $transactionState.innerHTML = `
      <div class="transaction-spinner" aria-hidden="true"></div>
      <div class="transaction-state-text">読み込み中...</div>
    `;
    return;
  }
  if (type === "error") {
    $transactionState.innerHTML = `
      <div class="transaction-state-text">${message || "読み込みに失敗しました。"}</div>
      <button id="transactionRetryBtn" class="chips-btn glass" type="button">再試行</button>
    `;
    const retryBtn = document.getElementById("transactionRetryBtn");
    if (retryBtn) retryBtn.addEventListener("click", () => fetchTransactionLogs(true), { once: true });
    return;
  }
  if (type === "empty") {
    $transactionState.innerHTML = `
      <div class="transaction-state-text">取引履歴はまだありません。</div>
    `;
    return;
  }
  $transactionState.innerHTML = "";
  $transactionState.style.display = "none";
}

function renderTransactionList(logs) {
  if (!$transactionList) return;
  if (!Array.isArray(logs) || logs.length === 0) {
    $transactionList.innerHTML = "";
    renderTransactionState("empty");
    return;
  }
  renderTransactionState("none");
  $transactionList.innerHTML = logs.map((log) => {
    const delta = Number(log?.delta || 0);
    const isPositive = delta >= 0;
    const sign = isPositive ? "+" : "-";
    const arrow = isPositive ? "↑" : "↓";
    const deltaText = `${sign}${Math.abs(delta)}P`;
    const deltaClass = isPositive ? "is-positive" : "is-negative";
    const title = formatTransactionTitle(log);
    const time = formatTransactionTime(log?.created_at);
    return `
      <div class="transaction-row">
        <div class="transaction-title">${title}</div>
        <div class="transaction-meta">
          <div class="transaction-delta ${deltaClass}">${deltaText} <span class="transaction-arrow">${arrow}</span></div>
          <div class="transaction-time">${time}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function fetchTransactionLogs(force) {
  if (!currentUser?.id || transactionLoading) return;
  if (transactionLoaded && !force) return;
  transactionLoading = true;
  renderTransactionState("loading");
  if ($transactionList) $transactionList.innerHTML = "";
  try {
    const res = await fetch(`/api/point-logs?userId=${encodeURIComponent(currentUser.id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      renderTransactionState("error", data?.error || "読み込みに失敗しました。");
      return;
    }
    transactionLogs = Array.isArray(data.logs) ? data.logs : [];
    transactionLoaded = true;
    renderTransactionList(transactionLogs);
  } catch {
    renderTransactionState("error", "読み込みに失敗しました。");
  } finally {
    transactionLoading = false;
  }
}

function openTransactionModal() {
  if (!currentUser?.id) {
    showModalMessage("取引ログ", "ログインすると取引ログが表示されます。");
    return;
  }
  setTransactionModalOpen(true);
  fetchTransactionLogs(true);
}

function closeTransactionModal() {
  setTransactionModalOpen(false);
}

/* ================== Completion bonus (DB-backed) ==================
   DB側の users.bonus_claimed を真実として扱う版
   - bonus周りで localStorage は一切使わない
   - /api/bonus で初回のみ +100 & bonus_claimed=true
=============================================================== */

let bonusClaiming = false;

function allStampsCollected() {
  return Array.isArray(stamps) && stamps.length > 0 && stamps.every(s => s.flag);
}

async function fetchBonusStatus() {
  if (!currentUser?.id) return { ok: false };

  try {
    const url = `/api/bonus?userId=${encodeURIComponent(currentUser.id)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) return { ok: false, error: data.error };

    currentUser.points = Number(data.points || 0);
    currentUser.bonus_claimed = !!data.bonusClaimed;

    persistCurrentUser();
    updateOOP();

    return { ok: true, bonusClaimed: !!data.bonusClaimed, points: currentUser.points };
  } catch {
    return { ok: false, error: "通信に失敗しました。" };
  }
}

function isBonusClaimed() {
  return !!currentUser?.bonus_claimed;
}

function showCompleteOverlay() {
  if (!$completeOverlay) return;
  if (!currentUser?.id) return; // ログアウト中は出さない
  if (isBonusClaimed()) return; // 受け取り済みは出さない

  $completeOverlay.classList.add("is-open");
  $completeOverlay.setAttribute("aria-hidden", "false");
}

function hideCompleteOverlay() {
  if (!$completeOverlay) return;
  $completeOverlay.classList.remove("is-open");
  $completeOverlay.setAttribute("aria-hidden", "true");
}


function updateCompleteOverlay() {
  if (!$completeOverlay) return;

  if (!allStampsCollected()) {
    if (typeof hideCompleteOverlay === "function") hideCompleteOverlay();
    return;
  }

  if (!currentUser?.id) {
    if (typeof hideCompleteOverlay === "function") hideCompleteOverlay();
    return;
  }

  if (isBonusClaimed()) {
    if (typeof hideCompleteOverlay === "function") hideCompleteOverlay();
    return;
  }

  showCompleteOverlay();
}

async function claimCompletionBonus() {
  if (bonusClaiming) return;

  if (!currentUser?.id) {
    showModalMessage("ボーナス", "ログインが必要です。");
    try { openAuthModal(); } catch {}
    return;
  }

  if (isBonusClaimed()) {
    if (typeof hideCompleteOverlay === "function") hideCompleteOverlay();
    return;
  }

  bonusClaiming = true;
  showTopNotice("ボーナス付与中");
  try {
    const res = await fetch("/api/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      showModalMessage("ボーナス", data.error || "ボーナス付与に失敗しました。");
      return;
    }

    currentUser.points = Number(data.points || 0);
    currentUser.bonus_claimed = true;

    persistCurrentUser();
    updateOOP();
    if (typeof hideCompleteOverlay === "function") hideCompleteOverlay();
  } catch {
    showModalMessage("ボーナス", "通信に失敗しました。");
  } finally {
    bonusClaiming = false;
    hideTopNotice();
  }
}



// ================== Pay UI ==================
const MAX_PAY_AMOUNT = 999999;
let payAmount = 0;
let payBusy = false;
let payStep = "selectShop";
let selectedShop = null;

function formatPayAmount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString("ja-JP") : "0";
}

function updatePaySpriteSizing() {
  if (!$paySprite) return;
  const rect = $paySprite.getBoundingClientRect();
  let targetW = Math.round(rect.width);
  let targetH = Math.round(rect.height);
  if (targetW <= 1 || targetH <= 1) {
    const styles = window.getComputedStyle($paySprite);
    targetW = Math.round(parseFloat(styles.width) || 0);
    targetH = Math.round(parseFloat(styles.height) || 0);
  }
  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  if (paySpriteNaturalW && paySpriteNaturalH) {
    const baseFrameW = Math.round(paySpriteNaturalW / PAY_SPRITE.cols);
    const baseFrameH = Math.round(paySpriteNaturalH / PAY_SPRITE.rows);
    if (baseFrameW <= 0 || baseFrameH <= 0) {
      paySpriteNaturalW = 0;
      paySpriteNaturalH = 0;
    } else {
      if (targetW >= baseFrameW && targetH >= baseFrameH) {
      const scaleW = Math.max(1, Math.round(targetW / baseFrameW));
      const scaleH = Math.max(1, Math.round(targetH / baseFrameH));
      const scale = Math.max(1, Math.min(scaleW, scaleH));
      const frameW = baseFrameW * scale;
      const frameH = baseFrameH * scale;

      if (frameW === paySpriteFrameW && frameH === paySpriteFrameH) return;
      paySpriteFrameW = frameW;
      paySpriteFrameH = frameH;
      $paySprite.style.backgroundSize = `${frameW * PAY_SPRITE.cols}px ${frameH * PAY_SPRITE.rows}px`;
      return;
      }
    }
  }

  if (targetW === paySpriteFrameW && targetH === paySpriteFrameH) return;
  paySpriteFrameW = targetW;
  paySpriteFrameH = targetH;
  $paySprite.style.backgroundSize = `${targetW * PAY_SPRITE.cols}px ${targetH * PAY_SPRITE.rows}px`;
}

function setPaySpriteFrame(index) {
  if (!$paySprite) return;
  const col = index % PAY_SPRITE.cols;
  const row = Math.floor(index / PAY_SPRITE.cols);
  if (!paySpriteFrameW || !paySpriteFrameH) updatePaySpriteSizing();
  const x = -col * paySpriteFrameW;
  const y = -row * paySpriteFrameH;
  $paySprite.style.backgroundPosition = `${x}px ${y}px`;
}

function stepPaySprite() {
  setPaySpriteFrame(paySpriteIndex);
  paySpriteIndex += paySpriteDir;
  if (paySpriteIndex >= PAY_SPRITE.frames - 1) {
    paySpriteIndex = PAY_SPRITE.frames - 1;
    paySpriteDir = -1;
  } else if (paySpriteIndex <= 0) {
    paySpriteIndex = 0;
    paySpriteDir = 1;
  }
}

function startPaySprite() {
  if (!$paySprite) return;
  stopPaySprite();
  if (!$paySprite.style.backgroundImage) {
    $paySprite.style.backgroundImage = `url("${PAY_SPRITE_SRC}")`;
  }
  updatePaySpriteSizing();
  paySpriteIndex = 0;
  paySpriteDir = 1;
  setPaySpriteFrame(0);
  const interval = Math.max(40, Math.round(1000 / PAY_SPRITE.fps));
  paySpriteTimer = window.setInterval(stepPaySprite, interval);
}

function stopPaySprite() {
  if (!paySpriteTimer) return;
  clearInterval(paySpriteTimer);
  paySpriteTimer = null;
}

function getAvailablePayPoints() {
  return Math.max(0, Number(getDisplayedTotal() || 0));
}

function setPayStatus(message) {
  if ($payStatus) $payStatus.textContent = message || "";
}

function updatePayShopInfo() {
  if (!selectedShop) {
    if ($payShopName) $payShopName.textContent = "未選択";
    if ($payShopLocation) $payShopLocation.textContent = "";
    if ($payShopPoints) $payShopPoints.textContent = "0";
    return;
  }
  if ($payShopName) $payShopName.textContent = selectedShop.name || "店舗";
  if ($payShopLocation) $payShopLocation.textContent = selectedShop.location || "";
  if ($payShopPoints) $payShopPoints.textContent = formatPayAmount(selectedShop.points || 0);
}

function updatePayStepUI() {
  if ($paySelectStep) $paySelectStep.classList.toggle("is-active", payStep === "selectShop");
  if ($payAmountStep) $payAmountStep.classList.toggle("is-active", payStep === "inputAmount");
  updatePayShopInfo();
  syncPayButtons();
}

function setSelectedShop(shop) {
  selectedShop = shop ? { ...shop } : null;
  payStep = selectedShop ? "inputAmount" : "selectShop";
  updatePayStepUI();
}

function resetPayFlow() {
  selectedShop = null;
  payStep = "selectShop";
  resetPayNfcState();
  payNfcBusy = false;
  if ($payScanBtn) $payScanBtn.disabled = false;
  setPayRotated(false);
  setPayStatus("");
  setPayAmount(0);
  updatePayStepUI();
}

function isPaySelectingShop() {
  return currentPage === "pay" && payStep === "selectShop";
}

function showPaySuccess(amount) {
  if (!$paySuccess) return;
  if ($paySuccessAmount) $paySuccessAmount.textContent = formatPayAmount(amount);
  if ($paySuccessConsumed) $paySuccessConsumed.textContent = formatPayAmount(amount);
  $paySuccess.classList.add("is-show");
  $paySuccess.setAttribute("aria-hidden", "false");
  if ($app) $app.classList.add("is-pay-success-blur");
}

function clearPaySuccessBlur() {
  document.querySelectorAll(".app").forEach(app => {
    app.classList.remove("is-pay-success-blur");
  });
  const targets = document.querySelectorAll(
    ".header, .main, .bottom-nav, #bg-wrap, .bg-orbs, .nfc-hint, .golden-overlay"
  );
  document.body.classList.add("pay-blur-reset");
  targets.forEach(el => {
    if (!el || !el.style) return;
    el.style.filter = "none";
    el.style.webkitFilter = "none";
  });
  requestAnimationFrame(() => {
    targets.forEach(el => {
      if (!el || !el.style) return;
      el.style.filter = "";
      el.style.webkitFilter = "";
    });
    requestAnimationFrame(() => {
      document.body.classList.remove("pay-blur-reset");
    });
  });
}

function hidePaySuccess() {
  if (!$paySuccess) return;
  $paySuccess.classList.remove("is-show");
  $paySuccess.setAttribute("aria-hidden", "true");
  clearPaySuccessBlur();
}

function setPayRotated(isRotated) {
  if (!$payRotator) return;
  $payRotator.classList.toggle("is-rotated", !!isRotated);
  if (!isRotated) hidePaySuccess();
  syncPayButtons();
}

function setPayAmount(nextValue) {
  const safeValue = Math.max(0, Math.min(MAX_PAY_AMOUNT, Number(nextValue || 0)));
  payAmount = Number.isFinite(safeValue) ? Math.floor(safeValue) : 0;
  if ($payAmount) $payAmount.textContent = formatPayAmount(payAmount);
  if ($payConfirmAmount) $payConfirmAmount.textContent = formatPayAmount(payAmount);
  syncPayButtons();
}

function updatePayAvailable() {
  if ($payAvailable) $payAvailable.textContent = formatPayAmount(getAvailablePayPoints());
  syncPayButtons();
}

function syncPayButtons() {
  const rotated = !!($payRotator && $payRotator.classList.contains("is-rotated"));
  const available = getAvailablePayPoints();
  const isAmountStep = payStep === "inputAmount" && !!selectedShop;
  const canConfirm = isAmountStep && payAmount > 0 && payAmount <= available && !payBusy;

  if ($payConfirmBtn) $payConfirmBtn.disabled = rotated || !canConfirm;
  if ($payBackBtn) $payBackBtn.disabled = !rotated || payBusy;
  if ($payCommitBtn) $payCommitBtn.disabled = !rotated || payBusy || !canConfirm;

  if ($payKeypad) {
    $payKeypad.querySelectorAll("button").forEach((btn) => {
      btn.disabled = rotated || payBusy || !isAmountStep;
    });
  }
}

function applyPayKey(key) {
  if (payBusy) return;
  if (key === "clear") {
    setPayAmount(0);
    return;
  }
  if (key === "back") {
    setPayAmount(Math.floor(payAmount / 10));
    return;
  }
  const digit = Number(key);
  if (!Number.isFinite(digit)) return;
  setPayAmount((payAmount * 10) + digit);
}

async function handlePayConfirm() {
  if (payBusy) return;
  if (!currentUser?.id) {
    showModalMessage("決済", "ログインが必要です。");
    try { openAuthModal(); } catch {}
    return;
  }
  if (!selectedShop) {
    showModalMessage("決済", "店舗を選択してください。");
    return;
  }
  if (payAmount <= 0) {
    showModalMessage("決済", "金額を入力してください。");
    return;
  }
  if (payAmount > getAvailablePayPoints()) {
    showModalMessage("決済", "ポイントが不足しています。");
    return;
  }
  setPayStatus("店員さん側で確認してください。");
  setPayRotated(true);
}

async function handlePayCommit() {
  if (payBusy || payAmount <= 0) return;
  if (!currentUser?.id) {
    showModalMessage("決済", "ログインが必要です。");
    return;
  }
  if (!selectedShop) {
    showModalMessage("決済", "店舗を選択してください。");
    return;
  }

  payBusy = true;
  syncPayButtons();
  setPayStatus("決済処理中...");
  showTopNotice("決済処理中");

  try {
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, shopId: selectedShop.id, amount: payAmount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      showModalMessage("決済", data.error || "決済に失敗しました。");
      setPayStatus(data.error || "決済に失敗しました。");
      return;
    }

    currentUser.points = Number(data.userPoints || 0);
    persistCurrentUser();
    if (selectedShop) {
      selectedShop.points = Number(data.shopPoints || selectedShop.points || 0);
      updatePayShopInfo();
    }
    updateOOP();
    showPaySuccess(payAmount);
    setPayStatus("");
    setPayAmount(0);
    setTimeout(() => {
      hidePaySuccess();
      setPayRotated(false);
    }, 4000);
  } catch (err) {
    showModalMessage("決済", "通信に失敗しました。");
    setPayStatus("通信に失敗しました。");
  } finally {
    payBusy = false;
    syncPayButtons();
    hideTopNotice();
  }
}

function initPayUI() {
  if ($payKeypad) {
    $payKeypad.querySelectorAll("[data-paykey]").forEach((btn) => {
      btn.addEventListener("click", () => applyPayKey(btn.dataset.paykey));
    });
  }
  if ($payConfirmBtn) $payConfirmBtn.addEventListener("click", handlePayConfirm);
  if ($payBackBtn) $payBackBtn.addEventListener("click", () => {
    setPayRotated(false);
    setPayStatus("");
  });
  if ($payCommitBtn) $payCommitBtn.addEventListener("click", handlePayCommit);
  if ($payScanBtn) $payScanBtn.addEventListener("click", startPayScan);
  resetPayFlow();
  updatePayAvailable();
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
    const linked = stamps[i] && stamps[i].flag && stamps[i + 1] && stamps[i + 1].flag ? "is-linked" : "";
    return `<div class="dot ${active} ${stamped} ${linked}" data-i="${i}"></div>`;
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
  $modalTitle.textContent = "ロケーション";
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
  updateCompleteOverlay();
  updateProfileStampSummary();

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

function preloadStampImages() {
  const urls = Array.from(new Set(DEFAULT_STAMPS.map(s => s.image).filter(Boolean)));
  urls.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    if (img.decode) img.decode().catch(() => {});
  });
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
  const target = normalizeUid(uid);
  const hitIndex = stamps.findIndex(s => normalizeUid(s.uid) === target);
  const hit = hitIndex >= 0 ? stamps[hitIndex] : null;
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
    if (hitIndex >= 0) currentIndex = hitIndex;
    setPage("stamp");
    saveStamps();

    render();
    const nextTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
    animateOOPIncrease(prevTotal, nextTotal, Number(hit.points) || 0);
    vibrate(50);
    // DBへ確定（成功したらDBのpointsで上書きしてズレを0に）
    if (currentUser?.id) {
      (async () => {
        showTopNotice("スタンプ反映中");
        try {
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
        } finally {
          hideTopNotice();
        }
      })();
    }
  }
}

function focusStampPageByUid(uid) {
  const list = Array.isArray(stamps) ? stamps : DEFAULT_STAMPS;
  const target = normalizeUid(uid);
  const hitIndex = list.findIndex(s => normalizeUid(s.uid) === target);
  if (hitIndex < 0) return false;
  currentIndex = hitIndex;
  setPage("stamp");
  if (!$track) {
    render();
  } else {
    updateSlidePosition(true);
    syncChipsModalContent();
  }
  return true;
}

function isStampOwnedByUid(uid) {
  if (!uid) return false;
  const target = normalizeUid(uid);
  const hit = stamps.find(s => normalizeUid(s.uid) === target);
  return !!(hit && hit.flag);
}

function findStampByUid(uid) {
  if (!uid) return null;
  const list = Array.isArray(stamps) ? stamps : DEFAULT_STAMPS;
  const target = normalizeUid(uid);
  return list.find(s => normalizeUid(s.uid) === target) || null;
}

function findStampByToken(token) {
  if (!token) return null;
  const list = Array.isArray(stamps) ? stamps : DEFAULT_STAMPS;
  return list.find(s => String(s.token) === String(token)) || null;
}

async function resolveShop(payload) {
  const body = {};
  if (payload?.uid) body.uid = String(payload.uid);
  if (payload?.token) body.token = String(payload.token);
  if (!body.uid && !body.token) return { ok: false, error: "識別子がありません。" };

  try {
    const res = await fetch("/api/shop/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "未登録のNFCです。" };
    }
    return { ok: true, shop: data.shop };
  } catch {
    return { ok: false, error: "通信に失敗しました。" };
  }
}

async function handlePayUidSelection(uid) {
  if (!uid) {
    showModalMessage("決済", "UIDが取得できませんでした。");
    return { ok: false };
  }
  if (findStampByUid(uid)) {
    showModalMessage("決済", "これはスタンプ用NFCです。決済店舗をタッチしてください。");
    return { ok: false, blocked: true };
  }
  const resolved = await resolveShop({ uid });
  if (!resolved.ok) {
    showModalMessage("決済", resolved.error || "未登録のNFCです。");
    return { ok: false };
  }
  setPage("pay");
  setSelectedShop(resolved.shop);
  resetPayNfcState();
  payNfcBusy = false;
  if ($payScanBtn) $payScanBtn.disabled = false;
  return { ok: true, shop: resolved.shop };
}

async function handlePayTokenSelection(token) {
  if (!token) return { ok: false };
  if (findStampByToken(token)) {
    showModalMessage("決済", "これはスタンプ用NFCです。決済店舗をタッチしてください。");
    return { ok: false, blocked: true };
  }
  const resolved = await resolveShop({ token });
  if (!resolved.ok) {
    showModalMessage("決済", resolved.error || "未登録のNFCです。");
    return { ok: false };
  }
  setPage("pay");
  setSelectedShop(resolved.shop);
  resetPayNfcState();
  payNfcBusy = false;
  if ($payScanBtn) $payScanBtn.disabled = false;
  return { ok: true, shop: resolved.shop };
}

async function handleTokenInput(token) {
  const t = String(token || "").trim();
  if (!t) return { ok: false };

  const stampHit = findStampByToken(t);
  if (stampHit) {
    if (isPaySelectingShop()) {
      showModalMessage("決済", "これはスタンプ用NFCです。決済店舗をタッチしてください。");
      return { ok: false, blocked: true, kind: "stamp" };
    }
    const applied = await applyToken(t);
    return { ok: applied, kind: "stamp" };
  }

  const shopResult = await handlePayTokenSelection(t);
  return { ok: shopResult.ok, kind: "shop", shop: shopResult.shop };
}


// Manual test (iPhone pseudo NFC):
// 1) https://web-nfc-brown.vercel.app/?t=F0RndRHI5PwsexmVVmRF-caM を開く
// 2) URLから t が消えることを確認（再読み込みで二重取得しない）
// 3) 不正な token は console に warning を出し、pending に保存
async function applyToken(token) {
  const t = String(token || "").trim();
  if (!t) return false;

  const result = await redeemToken(t, { deferApply: true });
  if (!result || !result.ok) return false;

  try { showNfcRipple(); } catch {}
  const variant = result.alreadyOwned ? "owned" : "new";
  try { await showStampAni(STAMP_ANI_DURATION, variant); } catch {}
  await waitAfterStampAni(variant);

  if (Array.isArray(result.stampProgress)) {
    applyStampProgress(result.stampProgress);
  }
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
  const result = await handleTokenInput(token);
  if (result.kind === "stamp") {
    if (result.ok) {
      localStorage.removeItem(LS_PENDING_TOKEN);
    } else if (!result.blocked) {
      localStorage.setItem(LS_PENDING_TOKEN, token);
    }
  }
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
    return;
  }
    const result = await handleTokenInput(t);
    if (result.kind === "stamp") {
      if (result.ok) localStorage.removeItem(LS_PENDING_TOKEN);
      else if (!result.blocked) localStorage.setItem(LS_PENDING_TOKEN, t);
    }
    url.searchParams.delete("t");
    const next = url.searchParams.toString();
    const nextUrl = next ? `${url.pathname}?${next}${url.hash || ""}` : `${url.pathname}${url.hash || ""}`;
    try { targetWindow.history.replaceState(null, "", nextUrl); } catch {}
  }

  const pending = localStorage.getItem(LS_PENDING_TOKEN);
  if (pending && pending !== processedToken) {
    const result = await handleTokenInput(pending);
    if (result.kind === "stamp" && result.ok) localStorage.removeItem(LS_PENDING_TOKEN);
  }
}

function applyStampProgress(progress) {
  if (!Array.isArray(progress)) return;
  const prevTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
  const prevFlags = new Set(stamps.filter(s => s.flag).map(s => s.id));
  const nextFlags = new Set(progress);
  let firstNewIndex = -1;

  stamps = DEFAULT_STAMPS.map((def, idx) => {
    const was = prevFlags.has(def.id);
    const now = nextFlags.has(def.id);
    if (now && !was && firstNewIndex === -1) firstNewIndex = idx;
    return { ...def, flag: now, justStamped: now && !was };
  });

  if (firstNewIndex >= 0) {
    currentIndex = firstNewIndex;
    setPage("stamp");
  }
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
    ensureLoggedInForToken(token);
    return { ok: false, needsAuth: true };
  }

  try {
    showTopNotice("スタンプ取得中");
    const res = await fetch("/api/stamps/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (res.status === 401) {
      ensureLoggedInForToken(token);
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
  } finally {
    hideTopNotice();
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

async function handleTokenFromScan(token) {
  const t = String(token || "").trim();
  if (!t) return { ok: false };
  return handleTokenInput(t);
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
// --- グローバル変数（関数の外に配置） ---
let nfcReader = null;
let nfcAbort = null;
let nfcScanning = false;
let nfcBusy = false;
let payNfcReader = null;
let payNfcAbort = null;
let payNfcScanning = false;
let payNfcBusy = false;
let payReadInFlight = false;
let payLastReadKey = "";
let payLastReadAt = 0;

/**
 * NFCの状態を完全にリセットする
 */
function resetNfcState() {
  if (nfcAbort) {
    nfcAbort.abort(); // 前のスキャンを強制終了
  }
  nfcReader = null;
  nfcAbort = null;
  nfcScanning = false;
  console.log("NFC状態をリセットしました");
}

function stopScan() {
  resetNfcState();
  nfcBusy = false;
  updateScanToggleUI();
  setScanStatus("スキャン停止");
}

function resetPayNfcState() {
  if (payNfcAbort) {
    payNfcAbort.abort();
  }
  payNfcReader = null;
  payNfcAbort = null;
  payNfcScanning = false;
  payReadInFlight = false;
  payLastReadKey = "";
  payLastReadAt = 0;
}

function shouldIgnorePayRead(key) {
  const now = Date.now();
  if (payReadInFlight) return true;
  if (key && key === payLastReadKey && (now - payLastReadAt) < 2500) return true;
  payLastReadKey = key;
  payLastReadAt = now;
  return false;
}

// ===== UIDの多重発火ガード（startScanの外：グローバル）=====
let uidInFlight = false;
let lastUid = "";
let lastUidAt = 0;

function ignoreSameUid(uid) {
  const now = Date.now();
  if (uidInFlight) return true;
  if (uid === lastUid && (now - lastUidAt) < 2000) return true; // 2秒以内の同一UIDは無視
  lastUid = uid;
  lastUidAt = now;
  return false;
}

/**
 * NFCスキャンを開始する
 */
async function startScan() {
  if (nfcBusy) return;
  nfcBusy = true;

  const btn = document.getElementById("scanBtn");
  if (btn) btn.disabled = true;

  try {
    // ✅ 追加：Web NFC対応チェック（ReferenceError回避）
    const support = getNfcSupportInfo();
    if (!support.hasNdef) {
      setScanStatus("この端末はWeb NFCに対応していません。iPhoneでも問題なく使えます。NFCタッチ後の通知を押してページを再読み込みしてください。");
      toast("NFC非対応の環境です");
      nfcBusy = false;
      if (btn) btn.disabled = true;
      updateScanToggleUI();
      return;
    }
    if (!support.isSecure) {
      showModalMessage("HTTPSが必要", "Web NFCはHTTPS（またはlocalhost）でのみ動作します。");
      toast("HTTPSで開いてください");
      nfcBusy = false;
      if (btn) btn.disabled = false;
      updateScanToggleUI();
      return;
    }

    // 既存スキャンを止める…
    if (nfcAbort) {
      nfcAbort.abort();
      await new Promise((r) => setTimeout(r, 300));
    }

    nfcAbort = new AbortController();

    // ✅ 修正：グローバルを直接参照しない
    nfcReader = new window.NDEFReader();
    
    // 2. スキャン開始
    // ここで失敗したら catch へ飛ぶ
    await nfcReader.scan({ signal: nfcAbort.signal });
    nfcScanning = true;
    nfcBusy = false;
    if (btn) btn.disabled = false;
    updateScanToggleUI();
    setScanStatus("スキャン中");

    // 5. 読み取りイベントの設定
    nfcReader.onreading = async (event) => {
      console.log("NFCタグ検知:", event.serialNumber);
      try { showNfcRipple(); } catch (e) {}

      let token = "";
      if (event.message && event.message.records) {
        for (const record of event.message.records) {
          const text = typeof extractTokenFromRecord === "function" ? extractTokenFromRecord(record) : "";
          if (!text) continue;
          try {
            const url = new URL(text);
            const t = url.searchParams.get("t");
            if (t) { token = t; break; }
          } catch (e) {}
        }
      }

      // --- トークン(URL)方式 ---
      if (token) {
        await handleTokenFromScan(token);
        return;
      }

      // --- UID方式 ---
      const uid = event.serialNumber || "";
      if (!uid) {
        toast("UIDが取得できませんでした。");
        return;
      }

      if (ignoreSameUid(uid)) return;
      uidInFlight = true;
      
      try {
        const stampHit = findStampByUid(uid);
        if (!stampHit) {
          await handlePayUidSelection(uid);
          return;
        }
        if (isPaySelectingShop()) {
          showModalMessage("決済", "これはスタンプ用NFCです。決済店舗をタッチしてください。");
          return;
        }
        const owned = typeof isStampOwnedByUid === "function" ? isStampOwnedByUid(uid) : false;
        const duration = STAMP_ANI_DURATION;
        const variant = owned ? "owned" : "new";

        console.log("[NFC uid] owned=", owned, "variant=", variant, "uid=", uid);

        try { await showStampAni(duration, variant); } catch (e) {}
        await waitAfterStampAni(variant);   // ★UIDでも待つ
        applyUid(uid);
      } finally {
        setTimeout(() => { uidInFlight = false; }, 200);
      }
    };

    nfcReader.onreadingerror = () => {
      toast("読み取り失敗。再度タッチしてください。");
    };

    // 6. ユーザーへの通知
    showModalMessage("NFC", "スキャンを開始しました。タグをかざしてください。");
    toast("NFCスキャン準備完了");
  } catch (err) {
    console.error("NFC Error:", err);
    nfcScanning = false;
    
    if (err.name === "InvalidStateError") {
      // このエラーが出た場合は、内部でリセットして「もう一度だけ自動実行」を試みる
      console.warn("InvalidStateError検知。リセットして再試行します。");
      nfcAbort.abort();
      nfcAbort = null;
      // ユーザーに再度押させるのではなく、内部的に少し待ってから状態をクリアする
      setTimeout(() => {
        nfcBusy = false;
        if (btn) btn.disabled = false;
        updateScanToggleUI();
      }, 500);
    } else {
      alert(`エラー: ${err.name}\n${err.message}`);
      nfcBusy = false;
      if (btn) btn.disabled = false;
      updateScanToggleUI();
    }
  }
}

async function startPayScan() {
  if (payNfcBusy) return;
  payNfcBusy = true;

  if ($payScanBtn) $payScanBtn.disabled = true;

  try {
    const hasNdef = typeof window !== "undefined" && typeof window.NDEFReader !== "undefined";
    if (!hasNdef) {
      showModalMessage(
        "NFC非対応",
        "この端末/ブラウザはWeb NFCに対応していません。AndroidのChrome / Samsung Internet / Operaで開いてください（iPhoneは非対応）。"
      );
      toast("NFC非対応の環境です");
      payNfcBusy = false;
      if ($payScanBtn) $payScanBtn.disabled = false;
      return;
    }
    if (!window.isSecureContext) {
      showModalMessage("HTTPSが必要", "Web NFCはHTTPS（またはlocalhost）でのみ動作します。");
      toast("HTTPSで開いてください");
      payNfcBusy = false;
      if ($payScanBtn) $payScanBtn.disabled = false;
      return;
    }

    if (payNfcAbort) {
      payNfcAbort.abort();
      await new Promise((r) => setTimeout(r, 300));
    }

    payNfcAbort = new AbortController();
    payNfcReader = new window.NDEFReader();
    await payNfcReader.scan({ signal: payNfcAbort.signal });
    payNfcScanning = true;

    payNfcReader.onreading = async (event) => {
      try { showNfcRipple(); } catch (e) {}

      let token = "";
      if (event.message && event.message.records) {
        for (const record of event.message.records) {
          const text = typeof extractTokenFromRecord === "function" ? extractTokenFromRecord(record) : "";
          if (!text) continue;
          try {
            const url = new URL(text);
            const t = url.searchParams.get("t");
            if (t) { token = t; break; }
          } catch (e) {}
        }
      }

      if (token) {
        await handlePayTokenSelection(token);
        return;
      }

      const uid = event.serialNumber || "";
      if (!uid) {
        showModalMessage("決済", "UIDが取得できませんでした。");
        return;
      }

      if (shouldIgnorePayRead(uid)) return;
      payReadInFlight = true;
      try {
        await handlePayUidSelection(uid);
      } finally {
        setTimeout(() => { payReadInFlight = false; }, 200);
      }
    };

    payNfcReader.onreadingerror = () => {
      toast("読み取り失敗。再度タッチしてください。");
    };

    showModalMessage("決済", "店舗スキャンを開始しました。タグをタッチしてください。");
    toast("店舗スキャン準備完了");
  } catch (err) {
    console.error("Pay NFC Error:", err);

    if (err.name === "InvalidStateError") {
      console.warn("InvalidStateError検知。リセットして再試行します。");
      if (payNfcAbort) payNfcAbort.abort();
      payNfcAbort = null;
      setTimeout(() => {
        payNfcBusy = false;
        if ($payScanBtn) $payScanBtn.disabled = false;
      }, 500);
    } else {
      alert(`エラー: ${err.name}\n${err.message}`);
      payNfcBusy = false;
      if ($payScanBtn) $payScanBtn.disabled = false;
    }
  }
}


// ================== Modal ==================
let modalResolve = null;
let modalBlurActive = false;

function openModal(custom) {
  if (custom) {
    $modalTitle.textContent = custom.title;
    if (custom.bodyNode) {
      $modalBody.innerHTML = "";
      $modalBody.append(custom.bodyNode);
    } else {
      $modalBody.textContent = custom.body;
    }
    modalBlurActive = !!custom.blur;
  } else {
    syncChipsModalContent();
    modalBlurActive = false;
  }
  if ($app) $app.classList.toggle("is-modal-blur", modalBlurActive);
  $modal.classList.add("is-open");
  $modal.setAttribute("aria-hidden", "false");
}
function closeModal(result) {
  $modal.classList.remove("is-open");
  $modal.setAttribute("aria-hidden", "true");
  modalBlurActive = false;
  if ($app) $app.classList.remove("is-modal-blur");
  document.querySelectorAll(".app").forEach(app => {
    app.classList.remove("is-modal-blur");
  });
  if ($siteInfoOverlay && !$siteInfoOverlay.classList.contains("is-open")) {
    document.body.classList.remove("is-siteinfo-open");
    document.querySelectorAll(".app").forEach(app => {
      app.classList.remove("is-siteinfo-open");
    });
    clearSiteInfoFilters();
  }
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
    const isDanger = okText === "リセットする" || okText?.includes("ログアウト") || title?.includes("ログアウト");
    if (isDanger) ok.classList.add("modal-danger");
    if (isDanger) msg.classList.add("modal-danger-text");
    actions.append(ok, cancel);
    wrap.append(msg, actions);
    openModal({ title, bodyNode: wrap });
    ok.addEventListener("click", () => closeModal(true), { once: true });
    cancel.addEventListener("click", () => closeModal(false), { once: true });
  });
}

function showUsageGuide(options) {
  if (!currentUser?.id) return;
  const wrap = document.createElement("div");
  wrap.className = "usage-guide";

  const section1 = document.createElement("div");
  section1.className = "usage-section";
  section1.innerHTML = `
    <div class="usage-title">利用方法</div>
    <p>端末のスキャンエリアにNFCスタンプをタッチしてスタンプを取得します。</p>
  `;
  wrap.appendChild(section1);

  const section2 = document.createElement("div");
  section2.className = "usage-section";
  section2.innerHTML = `
    <div class="usage-title">iPhoneの方</div>
    <p>タッチ後に表示される通知を開き、ページを再読み込みしてください。</p>
    <img class="usage-image" src="/images/iPhone_banner.png" alt="iPhoneの通知例">
  `;
  wrap.appendChild(section2);

  const section3 = document.createElement("div");
  section3.className = "usage-section";
  section3.innerHTML = `
    <div class="usage-title">Androidの方</div>
    <p>このままでも使えますが、Web NFCをONにするとより快適にご利用できます。（iPhoneは非対応）</p>
    <img class="usage-image usage-image--small" src="/images/Web NFC_toggle.png" alt="Web NFCの設定例">
  `;
  wrap.appendChild(section3);

  const actions = document.createElement("div");
  actions.className = "usage-actions";
  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "chips-btn glass usage-start";
  startBtn.textContent = "了解";
  actions.appendChild(startBtn);
  wrap.appendChild(actions);

  openModal({ title: "使い方ガイド", bodyNode: wrap, blur: true });

  startBtn.addEventListener("click", () => closeModal(true), { once: true });
}

// ================== Bottom nav ==================
function setPage(name) {
  currentPage = name;
  ["stamp","pay","profile"].forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle("is-active", p === name);
  });
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.target === name);
  });
  if ($app) $app.classList.toggle("is-pay-layout", name === "pay");
  if (name === "pay") {
    updatePayHeaderOffset();
  }
  if (name === "pay") {
    resetPayFlow();
    updatePayAvailable();
    startPaySprite();
  }
  if (name !== "pay") {
    setPayRotated(false);
    clearPaySuccessBlur();
    stopPaySprite();
  }
  if (currentUser?.id) closeSiteInfo();
}

function updatePayHeaderOffset() {
  if (!$app) return;
  const header = document.querySelector(".header");
  if (!header) return;
  const rect = header.getBoundingClientRect();
  const styles = window.getComputedStyle(header);
  const mt = Number.parseFloat(styles.marginTop || "0") || 0;
  const mb = Number.parseFloat(styles.marginBottom || "0") || 0;
  const offset = Math.max(0, rect.height + mt + mb);
  $app.style.setProperty("--pay-header-offset", `${Math.round(offset)}px`);
}

// ================== Site info overlay ==================
let siteInfoOpen = false;
const LS_SITEINFO_SEEN = "nfc_siteinfo_seen";
let siteInfoLocked = false;
let siteInfoForced = false;
let siteInfoAuthChoice = false;
let siteInfoAuthMode = "login";
let siteInfoUsage = false;

function openSiteInfo(options) {
  if (!$siteInfoOverlay || !$app) return;
  siteInfoOpen = true;
  siteInfoForced = !!(options && options.forced);
  siteInfoLocked = siteInfoForced || !!(options && options.locked);
  siteInfoAuthChoice = false;
  siteInfoAuthMode = "login";
  siteInfoUsage = false;
  $siteInfoOverlay.classList.add("is-open");
  $siteInfoOverlay.classList.toggle("is-forced", siteInfoForced);
  $siteInfoOverlay.classList.toggle("is-auth-choice", siteInfoAuthChoice);
  $siteInfoOverlay.classList.remove("is-auth-form");
  $siteInfoOverlay.classList.remove("is-usage");
  if ($siteInfoFormError) $siteInfoFormError.textContent = "";
  $siteInfoOverlay.setAttribute("aria-hidden", "false");
  $app.classList.add("is-siteinfo-open");
  document.body.classList.add("is-siteinfo-open");
}

function closeSiteInfo() {
  if (!$siteInfoOverlay || !$app) return;
  siteInfoOpen = false;
  siteInfoLocked = false;
  siteInfoForced = false;
  siteInfoAuthChoice = false;
  siteInfoAuthMode = "login";
  siteInfoUsage = false;
  $siteInfoOverlay.classList.remove("is-open");
  $siteInfoOverlay.classList.remove("is-forced");
  $siteInfoOverlay.classList.remove("is-auth-choice");
  $siteInfoOverlay.classList.remove("is-auth-form");
  $siteInfoOverlay.classList.remove("is-usage");
  $siteInfoOverlay.setAttribute("aria-hidden", "true");
  $app.classList.remove("is-siteinfo-open");
  document.body.classList.remove("is-siteinfo-open");
  clearSiteInfoFilters();
  localStorage.setItem(LS_SITEINFO_SEEN, "1");
}

function syncSiteInfoBlur() {
  if (!$siteInfoOverlay || !$app) return;
  const open = $siteInfoOverlay.classList.contains("is-open");
  if (!open) {
    $app.classList.remove("is-siteinfo-open");
    document.body.classList.remove("is-siteinfo-open");
    clearSiteInfoFilters();
  }
}

function clearSiteInfoFilters() {
  [
    ".header",
    ".main",
    ".bottom-nav",
    "#bg-wrap",
    ".bg-orbs",
    ".nfc-hint",
    ".golden-overlay",
    ".bg-layer",
  ].forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.filter = "";
    });
  });
  document.body.classList.add("force-unblur");
  setTimeout(() => document.body.classList.remove("force-unblur"), 60);
}

function showSiteInfoAuthChoice() {
  if (!$siteInfoOverlay) return;
  siteInfoAuthChoice = true;
  $siteInfoOverlay.classList.add("is-auth-choice");
  $siteInfoOverlay.classList.remove("is-auth-form");
}

function setSiteInfoError(message) {
  if ($siteInfoFormError) $siteInfoFormError.textContent = message || "";
}

function updateSiteInfoToggleText() {
  if (!$siteInfoToggleLink) return;
  $siteInfoToggleLink.textContent =
    siteInfoAuthMode === "signup" ? "ログインの場合はこちら" : "会員登録の場合はこちら";
}

function showSiteInfoForm(mode) {
  if (!$siteInfoOverlay) return;
  siteInfoAuthMode = mode === "signup" ? "signup" : "login";
  $siteInfoOverlay.classList.add("is-auth-form");
  $siteInfoOverlay.classList.remove("is-auth-choice");
  if ($siteInfoFormTitle) $siteInfoFormTitle.textContent = siteInfoAuthMode === "signup" ? "会員登録" : "ログイン";
  setButtonLabel($siteInfoSubmitBtn, siteInfoAuthMode === "signup" ? "会員登録" : "ログイン");
  updateSiteInfoToggleText();
  setSiteInfoError("");
  if ($siteInfoPassword) $siteInfoPassword.value = "";
  if ($siteInfoUsername) $siteInfoUsername.focus();
}

async function handleSiteInfoAuth() {
  const username = $siteInfoUsername?.value?.trim();
  const password = $siteInfoPassword?.value || "";
  if (!username || !password) {
    setSiteInfoError("ユーザー名とパスワードを入力してください。");
    return;
  }

  const endpoint = siteInfoAuthMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  setButtonLoading($siteInfoSubmitBtn, true);
  showTopNotice(siteInfoAuthMode === "signup" ? "登録中" : "ログイン中");
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSiteInfoError(data?.error || "認証に失敗しました。");
      return;
    }

    currentUser = data;
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem(LS_SITEINFO_SEEN, "1");
    updateUIForLoggedInUser();
    closeSiteInfo();
    await syncFromDB();
    updateOOP();
    showUsageGuide({ greeting: siteInfoAuthMode === "signup" ? "登録が完了しました" : "ログインしました" });
  } catch {
    setSiteInfoError("通信に失敗しました。");
  } finally {
    setButtonLoading($siteInfoSubmitBtn, false);
    hideTopNotice();
  }
}

function toggleSiteInfo() {
  if (siteInfoForced) return;
  if (siteInfoOpen) closeSiteInfo();
  else openSiteInfo({ locked: false, forced: false });
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
    const isOwned = stampAniEl.dataset.variant === 'owned';
    const hold = Math.max(0, Number(STAMP_ANI_HOLD) || 0);
    const tailHold = Math.max(0, Number(STAMP_ANI_TAIL_HOLD) || 0);

    const frames = STAMP_ANI.frames;
    const cols = STAMP_ANI.cols;

    if(stampAniRaf) cancelAnimationFrame(stampAniRaf);
    if(stampAniTimer) clearTimeout(stampAniTimer);
    if(stampAniResolve){ stampAniResolve(); }
    if(stampAniFlyout){
      stampAniFlyout.cancel();
      stampAniFlyout = null;
    }
    stampAniEl.style.visibility = 'hidden';
    stampAniEl.classList.remove('is-show');
    stampAniEl.classList.remove('is-flyout');
    stampAniSprite.style.visibility = 'hidden';
    stampAniSprite.style.opacity = '0';
    stampAniSprite.style.transform = '';
    stampAniResolve = resolve;

    const startDelay = Math.max(0, Number(STAMP_ANI_START_DELAY) || 0);
    const begin = () => {
      const start = performance.now();
      if (stampAniSprite.getAnimations) {
        stampAniSprite.getAnimations().forEach(a => a.cancel());
      }
      stampAniEl.style.setProperty('--stamp-ani-duration', `${duration}ms`);
      stampAniEl.style.visibility = 'hidden';
      stampAniEl.classList.remove('is-flyout');
      stampAniSprite.style.backgroundPosition = '0% 0%';
      stampAniSprite.style.animation = 'none';
      stampAniSprite.style.transform = '';
      stampAniSprite.style.opacity = '0';
      stampAniSprite.style.visibility = 'hidden';
      void stampAniSprite.offsetWidth;

      let frameShown = false;
      let flyoutStarted = false;
      const startFlyout = () => {
        if(flyoutStarted) return;
        flyoutStarted = true;
        if(stampAniRaf) cancelAnimationFrame(stampAniRaf);
        stampAniRaf = 0;
        if(stampAniFlyout) stampAniFlyout.cancel();
        if(!stampAniSprite.animate){
          stampAniSprite.style.opacity = '0';
          stampAniEl.classList.remove('is-show');
          stampAniEl.classList.remove('is-flyout');
          setTimeout(() => {
            stampAniSprite.style.transform = '';
            stampAniSprite.style.opacity = '';
          }, STAMP_ANI_HIDE_DELAY_MS);
          const done = stampAniResolve;
          stampAniResolve = null;
          if(done) done();
          return;
        }
        stampAniEl.classList.add('is-flyout');
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const endX = (isMobile ? 1.6 : 0.7) * window.innerWidth;
        const endY = -0.28 * window.innerHeight;
        stampAniFlyout = stampAniSprite.animate([
          { transform: 'translateZ(0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${endX}px, ${endY}px) rotate(720deg)`, opacity: 0 }
        ], { duration: STAMP_ANI3_FLYOUT_MS, easing: 'cubic-bezier(.12,.6,.2,1)', fill: 'forwards' });
        stampAniFlyout.addEventListener('finish', () => {
          stampAniSprite.style.opacity = '0';
          stampAniEl.classList.remove('is-show');
          stampAniEl.classList.remove('is-flyout');
          setTimeout(() => {
            stampAniSprite.style.transform = '';
            stampAniSprite.style.opacity = '';
          }, STAMP_ANI_HIDE_DELAY_MS);
          stampAniFlyout = null;
          const done = stampAniResolve;
          stampAniResolve = null;
          if(done) done();
        }, { once: true });
      };

      const step = (now) => {
        const elapsed = now - start;
        const activeDuration = Math.max(1, (duration - hold - tailHold));
        const perFrame = activeDuration / Math.max(1, (frames - 1));
        let idx = 0;
        if (elapsed < hold) {
          idx = 0;
        } else if (elapsed < (hold + activeDuration)) {
          const t = Math.min(1, Math.max(0, (elapsed - hold) / activeDuration));
          if(isOwned){
            idx = Math.min(STAMP_ANI3_STOP_FRAME, Math.floor((elapsed - hold) / perFrame));
          }else{
            idx = Math.min(frames - 1, Math.floor(t * frames));
          }
        } else {
          idx = isOwned ? Math.min(STAMP_ANI3_STOP_FRAME, frames - 1) : (frames - 1);
        }
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = cols > 1 ? (col / (cols - 1)) * 100 : 0;
        const y = STAMP_ANI.rows > 1 ? (row / (STAMP_ANI.rows - 1)) * 100 : 0;
        if(!frameShown){
          frameShown = true;
          stampAniEl.style.visibility = 'visible';
          stampAniEl.classList.add('is-show');
          stampAniSprite.style.visibility = 'visible';
          if(isOwned){
            stampAniSprite.style.opacity = '1';
          }else{
            stampAniSprite.style.opacity = '';
            stampAniSprite.style.animation = 'none';
            void stampAniSprite.offsetWidth;
            stampAniSprite.style.animation = STAMP_ANI_FADE_ANIM;
          }
        }
        stampAniSprite.style.backgroundPosition = `${x}% ${y}%`;
        if(isOwned){
          const flyoutAt = hold + (perFrame * (STAMP_ANI3_STOP_FRAME + 1));
          if(elapsed >= flyoutAt){
            startFlyout();
            return;
          }
          stampAniRaf = requestAnimationFrame(step);
          return;
        }
        if(elapsed < duration){
          stampAniRaf = requestAnimationFrame(step);
          return;
        }
        stampAniEl.classList.remove('is-show');
        stampAniRaf = 0;
        const done = stampAniResolve;
        stampAniResolve = null;
        if(done) done();
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
  const variant = owned ? "owned" : "new";
  try{ await showStampAni(STAMP_ANI_DURATION, variant); }catch(e){}
  await waitAfterStampAni(variant, { debug: true });
  applyUid(uid);
}

async function simulatePayShopTouch(uid) {
  try { showNfcRipple(); } catch (e) {}
  setPage("pay");
  await handlePayUidSelection(uid);
}

async function simulatePayStampTouch() {
  const stamp = DEFAULT_STAMPS[0];
  if (!stamp) return;
  await simulatePayShopTouch(stamp.uid);
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

  const payGroup = document.createElement('div');
  payGroup.style.display = 'flex';
  payGroup.style.flexDirection = 'column';
  payGroup.style.gap = '6px';
  DEBUG_SHOPS.forEach(s => {
    const b = document.createElement('button');
    b.textContent = `決済: ${s.name} をタッチ`;
    b.addEventListener('click', () => simulatePayShopTouch(s.uid));
    payGroup.appendChild(b);
  });
  const payStampBtn = document.createElement('button');
  payStampBtn.textContent = '決済: スタンプをタッチ(エラー確認)';
  payStampBtn.addEventListener('click', simulatePayStampTouch);
  payGroup.appendChild(payStampBtn);
  panel.appendChild(payGroup);

//進捗リセットボタン
  const resetProgressBtn = document.createElement('button');
  resetProgressBtn.textContent = '進捗リセット';
  resetProgressBtn.addEventListener('click', resetProgressAndGoStamp);
  panel.appendChild(resetProgressBtn);
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
  return getDisplayedTotal();
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

  showTopNotice("進捗リセット中");
  try {
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
  } finally {
    hideTopNotice();
  }
}

// ================== UIイベント ==================
function handleScanToggle() {
  const btn = document.getElementById("scanBtn");
  const support = getNfcSupportInfo();
  if (!support.hasNdef) {
    showModalMessage(
      "NFC非対応",
      "この端末はWeb NFCに対応していません。iPhoneでも問題なく使えます。NFCタッチ後の通知を押してページを再読み込みしてください。"
    );
    return;
  }
  if (!support.isSecure) {
    showModalMessage("HTTPSが必要", "Web NFCはHTTPS（またはlocalhost）でのみ動作します。");
    return;
  }
  if (nfcScanning) {
    stopScan();
  } else {
    setScanStatus("");
    startScan();
  }
}

const scanBtnEl = document.getElementById("scanBtn");
if (scanBtnEl) scanBtnEl.addEventListener("click", handleScanToggle);

async function resetProgressAndGoStamp() {
  const ok = await showModalConfirm("リセット", "進捗をリセットしてもよいですか？", "リセットする", "キャンセル");
  if (!ok) return;

  // DB reset（ログイン中のみ）
  const u =
    (typeof currentUser !== "undefined" && currentUser)
      ? currentUser
      : JSON.parse(localStorage.getItem("user") || "null");

  if (u?.id) {
    showTopNotice("進捗リセット中");
    try {
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
      transactionLoaded = false;
      transactionLogs = [];
      if ($transactionList) $transactionList.innerHTML = "";
      if ($transactionState) $transactionState.innerHTML = "";
    } finally {
      hideTopNotice();
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
  hideCompleteOverlay();

  render();
  applyGoldenClass();
  updateGoldenUI();
  updateOOP();

  setPage("stamp"); // ← 常に戻す
}

document.getElementById("resetBtn").addEventListener("click", resetProgressAndGoStamp);

if ($chipsBtn) $chipsBtn.addEventListener("click", () => openModal());
if ($oopInfo) {
  $oopInfo.addEventListener("click", () => {
    openModal({
      title: "ポイントについて",
      body: "スタンプを入手するとポイントがたまり、ショッピングなどで利用できます。",
    });
  });
}

$siteInfoTrigger?.addEventListener("click", () => {
  toggleSiteInfo();
});
$siteInfoTrigger?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  toggleSiteInfo();
});
$siteInfoOverlay?.addEventListener("click", () => {
  if (siteInfoLocked) return;
  closeSiteInfo();
});
$siteInfoStartBtn?.addEventListener("click", () => {
  if (currentUser?.id) {
    closeSiteInfo();
    return;
  }
  showSiteInfoAuthChoice();
});
$siteInfoLoginBtn?.addEventListener("click", () => {
  showSiteInfoForm("login");
});
$siteInfoSignupBtn?.addEventListener("click", () => {
  showSiteInfoForm("signup");
});
$siteInfoToggleLink?.addEventListener("click", () => {
  showSiteInfoForm(siteInfoAuthMode === "signup" ? "login" : "signup");
});
$siteInfoSubmitBtn?.addEventListener("click", handleSiteInfoAuth);
$siteInfoUsername?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  $siteInfoPassword?.focus();
});
$siteInfoPassword?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSiteInfoAuth();
});
$completeBonusBtn?.addEventListener("click", claimCompletionBonus);
$tradeLogBtn?.addEventListener("click", openTransactionModal);
$rankingBtn?.addEventListener("click", openRankingModal);
$rankingModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeRankingModal();
});
$transactionModal?.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeTransactionModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeRankingModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTransactionModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !siteInfoLocked) closeSiteInfo();
});
$modal.addEventListener("click", (e) => {

  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

window.addEventListener("resize", () => {
  if (currentPage === "pay") updatePayHeaderOffset();
  if (currentPage === "pay") updatePaySpriteSizing();
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
  preloadStampImages();
  render();
  initLiquidGlass();
  initStampAni();
  initBroadcastListeners();
  // デバッグUIはデスクトップ向けに初期化
  initDebugUI();
  initKiran();
  initPayUI();
  updatePayHeaderOffset();
  updateScanToggleUI();
  // golden 初期化
  applyGoldenClass();
  updateGoldenUI();
  if(goldenActive) startGoldenSparks();
  updateOOP();

  if (!currentUser?.id) {
    openSiteInfo({ locked: true, forced: true });
  } else if (!localStorage.getItem(LS_SITEINFO_SEEN)) {
    openSiteInfo({ locked: false, forced: false });
  }

  (async () => {
   if (currentUser?.id) {
    await fetchBonusStatus();
   }
 })();

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

// ---- Next.js対応: inline onclick を使わずにイベントをバインド ----
const authTriggerBtnEl = document.getElementById('auth-trigger-btn');
if (authTriggerBtnEl) authTriggerBtnEl.addEventListener('click', openAuthModal);

const authSubmitBtnEl = document.getElementById('auth-submit-btn');
if (authSubmitBtnEl) authSubmitBtnEl.addEventListener('click', handleAuth);

const authToggleTextEl = document.getElementById('auth-toggle-text');
if (authToggleTextEl) authToggleTextEl.addEventListener('click', toggleAuthMode);

const logoutBtnEl = document.getElementById('logout-btn');
if (logoutBtnEl) logoutBtnEl.addEventListener('click', handleLogoutClick);

// auth modal close/backdrop
try {
  const authBackdropEl = authModal ? authModal.querySelector('.modal-backdrop') : null;
  const authCloseBtnEl = authModal ? authModal.querySelector('.modal-close') : null;
  if (authBackdropEl) authBackdropEl.addEventListener('click', closeAuthModal);
  if (authCloseBtnEl) authCloseBtnEl.addEventListener('click', closeAuthModal);
} catch {}

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
  setButtonLabel(authSubmitBtn, isLoginMode ? 'ログイン' : '登録');
  if (authToggleText) authToggleText.innerText = isLoginMode ? '新規登録はこちら' : 'ログインはこちら';
}

function initZoomGuards() {}

function initAuthEnterShortcuts() {
  const usernameEl = document.getElementById('auth-username');
  const passwordEl = document.getElementById('auth-password');
  if (!usernameEl || !passwordEl) return;

  usernameEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!isLoginMode) return;
    e.preventDefault();
    passwordEl.focus();
  });

  passwordEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!isLoginMode) return;
    e.preventDefault();
    handleAuth();
  });
}

// 初期化：ログイン状態ならUIを更新
function initAfterDomReady(){
if (currentUser) {
    updateUIForLoggedInUser();
    // 必要に応じてDBから最新状態を取得し同期
    syncFromDB();
    // stamps = currentUser.stamp_progress;
    // points = currentUser.points;
    // renderStamps(); // 既存の描画関数
  }

  if (currentUser?.id) {
    closeSiteInfo();
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

  initAuthEnterShortcuts();
  initZoomGuards();
  consumeTokenFromUrlAndPending();
  syncSiteInfoBlur();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAfterDomReady, { once: true });
} else {
  initAfterDomReady();
}


function openAuthModal() {
  if (!authModal) return;
  authModal.classList.add('is-open');
  authModal.setAttribute('aria-hidden', 'false');
  showAuthChoice();
}

function closeAuthModal() {
  if (!authModal) return;
  if (!currentUser?.id) return;
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

  setButtonLoading(authSubmitBtn, true);
  showTopNotice(isLoginMode ? "ログイン中" : "登録中");
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const user = await res.json();
      currentUser = user;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem(LS_SITEINFO_SEEN, "1");
      transactionLoaded = false;
      transactionLogs = [];
      if ($transactionList) $transactionList.innerHTML = "";
      if ($transactionState) $transactionState.innerHTML = "";

      updateUIForLoggedInUser();
      closeAuthModal();
      closeSiteInfo();

      await syncFromDB(); // ← ここで stamps と points が揃う

      showUsageGuide({ greeting: isLoginMode ? "ログインしました" : "登録が完了しました" });
    } else {
      const err = await res.json();
      alert(err.error);
    }
  } finally {
    setButtonLoading(authSubmitBtn, false);
    hideTopNotice();
  }
}

function updateUIForLoggedInUser() {
  const a = document.getElementById('auth-trigger-btn');
  if (a) a.style.display = 'none';
  const ui = document.getElementById('user-info');
  if (ui) ui.style.display = 'flex';
  const du = document.getElementById('display-username');
  if (du) du.innerText = currentUser.username;
  updateProfileStampSummary();
  closeSiteInfo();
  syncSiteInfoBlur();
}

function updateProfileStampSummary() {
  const listEl = document.getElementById('profileStampList');
  const countEl = document.getElementById('profileStampCount');
  if (!listEl || !countEl) return;
  const maxIcons = 6;
  const stampCount = Array.isArray(stamps) ? stamps.filter(s => s.flag).length : 0;
  const icons = Array.from({ length: maxIcons }).map((_, i) => {
    const active = i < stampCount ? "is-active" : "";
    return `<img class="ranking-stamp ${active}" src="./images/stamp.png" alt="">`;
  }).join("");
  listEl.innerHTML = icons;
  listEl.setAttribute("aria-label", `スタンプ所持数 ${stampCount}`);
  countEl.textContent = String(stampCount);
}

async function handleLogoutClick() {
  const ok = await showModalConfirm("ログアウト", "本当にログアウトしますか？", "はい", "キャンセル");
  if (ok) logout();
}

function logout() {
  localStorage.removeItem('user');
  location.reload(); // 状態リセットのためリロード
}
