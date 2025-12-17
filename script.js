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

let currentIndex = 0;   // 今表示しているインデックス
let $track = null;
let swipeBound = false;

// ===== DOM =====
const $oopValue = document.getElementById("oopValue");
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

function updateOOP() {
  $oopValue.textContent = String(calcPoints());
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
  const dots = stamps.map((_, i) => {
    const active = i === currentIndex ? "is-active" : "";
    return `<div class="dot ${active}" data-i="${i}"></div>`;
  }).join("");
  $indicator.innerHTML = dots;

  // クリックでも移動できる（PC用）
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
  // track を作り直す
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
}

function updateSlidePosition(withAnim) {
  if (!$track) return;
  $track.style.transition = withAnim ? "transform 0.25s ease-out" : "none";
  $track.style.transform = `translateX(-${currentIndex * 100}%)`;

  // indicator active 更新
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

    // 新しく押したスタンプの位置へ移動
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

  const getClientX = (e) => e.clientX;

  const onPointerDown = (e) => {
    if (!$track) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    activePointerId = e.pointerId;
    startX = getClientX(e);
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

    const x = getClientX(e);
    deltaX = x - startX;

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

  const onPointerUp = (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    finishDrag();
  };

  const onPointerCancel = (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    finishDrag();
  };

  $carousel.addEventListener("pointerdown", onPointerDown, { passive: false });
  $carousel.addEventListener("pointermove", onPointerMove, { passive: false });
  $carousel.addEventListener("pointerup", onPointerUp, { passive: true });
  $carousel.addEventListener("pointercancel", onPointerCancel, { passive: true });

  // PC: 矢印キー
  window.addEventListener("keydown", (e) => {
    if (!$track) return;
    if (e.key === "ArrowRight") {
      if (currentIndex < stamps.length - 1) currentIndex++;
      updateSlidePosition(true);
      syncChipsModalContent();
    }
    if (e.key === "ArrowLeft") {
      if (currentIndex > 0) currentIndex--;
      updateSlidePosition(true);
      syncChipsModalContent();
    }
  });
}

function bindWheelSwipe() {
  let wheelAccum = 0;
  let wheelTimeout = null;

  $carousel.addEventListener(
    "wheel",
    (e) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // 縦方向は無効化したいが、誤爆防止で横成分が強いときだけ反応
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
    },
    { passive: false }
  );
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

// ================== Modal (Chips) ==================
function openModal() {
  syncChipsModalContent();
  $modal.classList.add("is-open");
  $modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  $modal.classList.remove("is-open");
  $modal.setAttribute("aria-hidden", "true");
}

// ================== Bottom nav (no reload) ==================
function setPage(name) {
  const pages = ["stamp", "pay", "profile"];
  pages.forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle("is-active", p === name);
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.target === name);
  });
}

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
})();
