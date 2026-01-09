// ====== 設定：スタンプ一覧（points/locationはUI用。裏の流れは同じ）======
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前", uid: "04:18:be:aa:96:20:90", image: "./images/computer_tokui_boy.png", flag: false, points: 10, location: "本部前：入口付近" },
  { id: 2, name: "体育館", uid: "04:18:BD:AA:96:20:90", image: "./images/school_taiikukan2.png", flag: false, points: 10, location: "体育館：正面入口" },
  { id: 3, name: "図書館", uid: "04:18:bc:aa:96:20:90", image: "./images/stamp3.png", flag: false, points: 15, location: "図書館：受付横" },
  { id: 4, name: "中庭", uid: "04:18:bb:aa:96:20:90", image: "./images/stamp4.png", flag: false, points: 15, location: "中庭：ベンチ付近" },
  { id: 5, name: "100コイン決済", uid: "04:18:ba:aa:96:20:90", image: "./images/stamp5.png", flag: false, points: 0, location: "決済：100コイン" },
  { id: 6, name: "200コイン決済", uid: "04:18:b9:aa:96:20:90", image: "./images/stamp6.png", flag: false, points: 0, location: "決済：200コイン" },
];

const LS_KEY = "nfc_stamps_v2_images";

let stamps = loadStamps();
let currentIndex = 0;
let $track = null;
let swipeBound = false;

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

function updateOOP() {
  if (oopAnimating) return;
  const total = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
  setOOPValue(total);
}

function setOOPValue(value) {
  $oopValue.textContent = String(value);
}

function spawnPointsFloat(amount) {
  if (!amount || !Number.isFinite(amount)) return;
  const stampCard = document.querySelector(".stamp-card");
  const target = $oopInfo || $oopValue;
  if (!stampCard || !target) return;

  const startRect = stampCard.getBoundingClientRect();
  const endRect = target.getBoundingClientRect();
  const startX = startRect.right - 24;
  const startY = startRect.top + 20;
  const endX = endRect.left + endRect.width / 2;
  const endY = endRect.top + endRect.height / 2;

  const el = document.createElement("div");
  el.className = "points-float";
  el.textContent = `+${amount}`;
  el.style.left = `${startX}px`;
  el.style.top = `${startY}px`;
  document.body.appendChild(el);

  const dx = endX - startX;
  const dy = endY - startY;
  const anim = el.animate([
    { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
    { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.2 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.25 }
  ], { duration: 650, easing: "cubic-bezier(.2,.9,.2,1)" });
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
    hit.justStamped = true;
    saveStamps();

    currentIndex = stamps.indexOf(hit);
    if (currentIndex < 0) currentIndex = 0;

    render();
    const nextTotal = calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
    animateOOPIncrease(prevTotal, nextTotal, Number(hit.points) || 0);
    vibrate(50);
  }
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
      // ビジュアル波紋を表示
      try { showNfcRipple(); } catch (e) { /* no-op */ }
      applyUid(uid);
    };
    reader.onreadingerror = () => toast("読み取りに失敗しました。再度タッチしてください。");
  } catch (err) {
    console.error(err);
    alert("NFCスキャンを開始できませんでした。権限・HTTPS・端末対応を確認してください。");
  }
}

// ================== Modal ==================
function openModal(custom) {
  if (custom) {
    $modalTitle.textContent = custom.title;
    $modalBody.textContent = custom.body;
  } else {
    syncChipsModalContent();
  }
  $modal.classList.add("is-open");
  $modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  $modal.classList.remove("is-open");
  $modal.setAttribute("aria-hidden", "true");
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

// ================== misc ==================
function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }
function toast(msg) { console.log(msg); }

/* NFC読み取り時にトップ中央で派手な波紋を出す (DOM操作) */
function showNfcRipple(){
  const el = document.createElement('div');
  el.className = 'nfc-ripple';
  document.body.appendChild(el);
  // 強制リフローでアニメーションを確実に開始
  void el.offsetWidth;
  // アニメーション終了で削除
  el.addEventListener('animationend', () => {
    try { el.remove(); } catch(e){}
  }, { once: true });
}

/* ================== Debug UI ================== */
function simulateTouch(uid){
  try{ showNfcRipple(); }catch(e){}
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
    if(!goldenActive) return;
    // Add denser sparks to random .glass elements (1-3 per element occasionally)
    document.querySelectorAll('.app.golden .glass').forEach(el => {
      if(Math.random() > 0.55) return; // increased chance
      const count = 1 + Math.floor(Math.random()*3);
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
      const spawn = 1 + Math.floor(Math.random()*4); // 1-4 sparks
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
  }, 220);
}

function stopGoldenSparks(){
  if(_goldenSparkTimer){ clearInterval(_goldenSparkTimer); _goldenSparkTimer = null; }
  // remove remaining sparks
  document.querySelectorAll('.gold-spark').forEach(e=>e.remove());
}

function updateGoldenUI(){
  const unlockBtn = document.getElementById('unlockGoldenBtn');
  const toggleBtn = document.getElementById('toggleGoldenBtn');
  const status = document.getElementById('goldenStatus');
  if(!unlockBtn || !toggleBtn || !status) return;

  if(goldenUnlocked){
    unlockBtn.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    toggleBtn.textContent = `ゴールデン: ${goldenActive ? 'ON' : 'OFF'}`;
    status.textContent = goldenActive ? 'ゴールデン有効' : '解禁済み';
  } else {
    unlockBtn.style.display = 'inline-block';
    toggleBtn.style.display = 'none';
    status.textContent = '解禁なし';
  }
}

function availablePoints(){
  return calcPoints() - (consumedPoints || 0) + (window.debugPointsOffset || 0);
}

function unlockGolden(){
  if(goldenUnlocked) return;
  const need = 50;
  if(availablePoints() < need){
    alert('ポイントが不足しています。');
    return;
  }
  if(!confirm(`本当に ${need}P を使用してゴールデンモードを解禁しますか？`)) return;
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

// ================== UIイベント ==================
document.getElementById("scanBtn").addEventListener("click", startScan);

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("進捗をリセットしてもよいですか？")) return;
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;
  // reset golden and consumed points
  consumedPoints = 0;
  goldenUnlocked = false;
  goldenActive = false;
  persistConsumed();
  persistGolden();
  render();
  applyGoldenClass();
  updateGoldenUI();
  updateOOP();
});

document.getElementById("resetBtn2").addEventListener("click", () => {
  if (!confirm("進捗をリセットしてもよいですか？")) return;
  stamps = structuredClone(DEFAULT_STAMPS);
  saveStamps();
  currentIndex = 0;
  // reset golden and consumed points
  consumedPoints = 0;
  goldenUnlocked = false;
  goldenActive = false;
  persistConsumed();
  persistGolden();
  render();
  applyGoldenClass();
  updateGoldenUI();
  updateOOP();
  setPage("stamp");
});

$chipsBtn.addEventListener("click", openModal);
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
  // デバッグUIはデスクトップ向けに初期化
  initDebugUI();
  // golden 初期化
  applyGoldenClass();
  updateGoldenUI();
  if(goldenActive) startGoldenSparks();
  updateOOP();

})();
