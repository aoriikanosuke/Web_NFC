// ====== 設定：スタンプ一覧（画像パスを追加）======
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前",    uid: "04:18:be:aa:96:20:90", image: "./images/computer_tokui_boy.png", flag: false },
  { id: 2, name: "体育館",    uid: "04:18:BD:AA:96:20:90", image: "./images/school_taiikukan2.png", flag: false },
  { id: 3, name: "図書館",    uid: "04:18:bc:aa:96:20:90", image: "./images/stamp3.png", flag: false },
  { id: 4, name: "中庭",      uid: "04:18:bb:aa:96:20:90", image: "./images/stamp4.png", flag: false },
  { id: 5, name: "100コイン決済", uid: "04:18:ba:aa:96:20:90", image: "./images/stamp5.png", flag: false },
  { id: 6, name: "200コイン決済", uid: "04:18:b9:aa:96:20:90", image: "./images/stamp6.png", flag: false },
];

const LS_KEY = "nfc_stamps_v2_images"; // 旧キーと区別（キャッシュ衝突回避）

let stamps = loadStamps();

const $grid = document.getElementById("stampGrid");
const $complete = document.getElementById("completeBox");

let currentIndex = 0;   // 今表示しているカードのインデックス
let $track = null;      // スライド全体を動かす要素
let swipeBound = false; // イベントを一度だけ紐づける用

// ================== 永続化 ==================
function loadStamps() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return structuredClone(DEFAULT_STAMPS);
  try {
    const saved = JSON.parse(raw);
    const byUid = new Map(saved.map(s => [s.uid, s]));
    return DEFAULT_STAMPS.map(def => {
      const hit = byUid.get(def.uid);
      return hit
        ? { ...def, flag: !!hit.flag, name: hit.name ?? def.name }
        : { ...def };
    });
  } catch {
    return structuredClone(DEFAULT_STAMPS);
  }
}
function saveStamps() {
  localStorage.setItem(LS_KEY, JSON.stringify(stamps));
}

// ================== 表示 ==================
function cardHTML(s) {
  const on = s.flag ? "stamp-on" : "";
  return `
    <div class="card ${on}">
      <div class="stamp-img-wrap skel">
        <img class="stamp-img" src="${s.image}" alt="${s.name}のスタンプ"
             loading="lazy" decoding="async"
             onload="this.parentElement.classList.remove('skel')"
             onerror="this.parentElement.classList.remove('skel'); this.replaceWith(fallbackImg())">
        ${s.flag ? `<div class="checkmark">✅ GET</div>` : ``}
      </div>
      <h3>${s.name}</h3>
      <div class="uid mono muted">UID: ${s.uid}</div>
      <div>
        <span class="badge ${s.flag ? 'ok':''}">${s.flag ? '押されました ✅' : '未取得 ⬜'}</span>
      </div>
    </div>
  `;
}

function fallbackImg() {
  const img = document.createElement('div');
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.display = "grid";
  img.style.placeItems = "center";
  img.style.color = "#9fb2d6";
  img.style.fontSize = ".9rem";
  img.textContent = "画像が見つかりません";
  return img;
}

function render() {
  $grid.innerHTML = `
    <div class="carousel-track">
      ${stamps.map(cardHTML).join("")}
    </div>
  `;

  $track = $grid.querySelector(".carousel-track");

  updateSlidePosition();

  // コンプリート表示
  $complete.style.display = stamps.every(s => s.flag) ? "block" : "none";

  // スワイプイベント（スマホ＆PC対応）を一回だけバインド
  if (!swipeBound) {
    bindSwipeEvents();
    bindWheelSwipe(); 
    swipeBound = true;
  }
}

function updateSlidePosition() {
  if (!$track) return;
  $track.style.transform = `translateX(-${currentIndex * 100}%)`;
}

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
  // Pointer Events を使う（PCマウス / トラックパッド / スマホタッチを統一）
  let startX = 0;
  let deltaX = 0;
  let isDragging = false;
  let activePointerId = null;

  const getClientX = (e) => {
    // PointerEventは clientX がある
    return e.clientX;
  };

  const onPointerDown = (e) => {
    if (!$track) return;

    // 左クリック or タッチ or ペンのみ
    // マウスなら button===0 だけ許可（右クリックで変になるのを防ぐ）
    if (e.pointerType === "mouse" && e.button !== 0) return;

    activePointerId = e.pointerId;
    startX = getClientX(e);
    deltaX = 0;
    isDragging = true;

    // ドラッグ中はアニメ切って手動感
    $track.style.transition = "none";

    // これが超重要：ドラッグ中のポインタを確実に捕まえる
    try { $grid.setPointerCapture(activePointerId); } catch {}

    // テキスト選択や画像ドラッグを抑制
    e.preventDefault();

    // 見た目（掴む）
    $grid.classList.add("dragging");
  };

  const onPointerMove = (e) => {
    if (!isDragging || !$track) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    const x = getClientX(e);
    deltaX = x - startX;

    const width = $grid.clientWidth || 1;
    const percent = (deltaX / width) * 100;

    // 指（マウス）に追従
    $track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${percent}%))`;

    // ブラウザの横スクロール等を抑える
    e.preventDefault();
  };

  const finishDrag = () => {
    if (!isDragging || !$track) return;
    isDragging = false;

    const width = $grid.clientWidth || 1;
    const threshold = width * 0.2; // 2割以上動いたらページ送り

    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && currentIndex < stamps.length - 1) currentIndex++;
      else if (deltaX > 0 && currentIndex > 0) currentIndex--;
    }

    $track.style.transition = "transform 0.25s ease-out";
    updateSlidePosition();

    $grid.classList.remove("dragging");
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

  // pointerイベント
  $grid.addEventListener("pointerdown", onPointerDown, { passive: false });
  $grid.addEventListener("pointermove", onPointerMove, { passive: false });
  $grid.addEventListener("pointerup", onPointerUp, { passive: true });
  $grid.addEventListener("pointercancel", onPointerCancel, { passive: true });

  // ついで：矢印キーでも移動できるとPCが快適
  window.addEventListener("keydown", (e) => {
    if (!$track) return;
    if (e.key === "ArrowRight") {
      if (currentIndex < stamps.length - 1) currentIndex++;
      $track.style.transition = "transform 0.25s ease-out";
      updateSlidePosition();
    }
    if (e.key === "ArrowLeft") {
      if (currentIndex > 0) currentIndex--;
      $track.style.transition = "transform 0.25s ease-out";
      updateSlidePosition();
    }
  });
  
}
function bindWheelSwipe() {
  let wheelAccum = 0;
  let wheelTimeout = null;

  $grid.addEventListener(
    "wheel",
    (e) => {
      // 横方向 or 横成分が強い縦スクロールを対象にする
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // 横スワイプと判断する条件
      if (absX < absY) return; // 縦スクロール優先

      e.preventDefault(); // 横スクロールだけ止める

      wheelAccum += e.deltaX;

      const THRESHOLD = 80; // 感度（小さいほど軽い）

      if (Math.abs(wheelAccum) > THRESHOLD) {
        if (wheelAccum > 0 && currentIndex < stamps.length - 1) {
          currentIndex++;
        } else if (wheelAccum < 0 && currentIndex > 0) {
          currentIndex--;
        }

        $track.style.transition = "transform 0.25s ease-out";
        updateSlidePosition();

        wheelAccum = 0;
      }

      // 慣性対策（止まったらリセット）
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        wheelAccum = 0;
      }, 120);
    },
    { passive: false }
  );
}


function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }
function toast(msg) { console.log(msg); }

// ================== Web NFC ==================
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

// ================== UIイベント ==================
document.getElementById("scanBtn").addEventListener("click", startScan);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("進捗をリセットしてもよいですか？")) return;
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;
  render();
});

// ================== 初期化 ==================
(function init() {
  render();
})();
