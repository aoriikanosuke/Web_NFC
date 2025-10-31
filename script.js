// ====== 設定：スタンプ一覧（画像パスを追加）======
const DEFAULT_STAMPS = [
  { id: 1, name: "本部前",    uid: "04A2B3C1", image: "./images/computer_tokui_boy.png", flag: false },
  { id: 2, name: "体育館",    uid: "0493FE21", image: "./images/stamp2.png", flag: false },
  { id: 3, name: "図書館",    uid: "0477AC9E", image: "./images/stamp3.png", flag: false },
  { id: 4, name: "中庭",      uid: "04F1D002", image: "./images/stamp4.png", flag: false },
  { id: 5, name: "美術室",    uid: "0455AA10", image: "./images/stamp5.png", flag: false },
  { id: 6, name: "屋上入口",  uid: "04C0BE77", image: "./images/stamp6.png", flag: false },
];
const LS_KEY = "nfc_stamps_v2_images"; // 旧キーと区別（キャッシュ衝突回避）

let stamps = loadStamps();

const $grid = document.getElementById("stampGrid");
const $complete = document.getElementById("completeBox");
const $nfcSupport = document.getElementById("nfcSupport");

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
  } catch { return structuredClone(DEFAULT_STAMPS); }
}
function saveStamps() {
  localStorage.setItem(LS_KEY, JSON.stringify(stamps));
}

// ================== 表示 ==================
function cardHTML(s) {
  const on = s.flag ? "stamp-on" : "";
  // 画像プリロード用に loading="lazy" を使用
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
  $grid.innerHTML = stamps.map(cardHTML).join("");
  $complete.style.display = stamps.every(s => s.flag) ? "block" : "none";
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
    render();
    vibrate(50);
  }
}

function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }
function toast(msg) { console.log(msg); }

// ================== Web NFC ==================
async function startScan() {
  if (!('NDEFReader' in window)) {
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
  saveStamps(); render();
});
document.getElementById("testBtn").addEventListener("click", () => {
  const v = document.getElementById("testUid").value.trim();
  if (!v) return alert("UIDを入力してください。");
  applyUid(v);
});

// ================== 書き出し / 読み込み ==================
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(stamps, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stamps-state.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("配列ではありません");
      for (const it of imported) {
        if (typeof it.uid !== "string" || typeof it.flag !== "boolean") {
          throw new Error("形式が不正です");
        }
      }
      const byUid = new Map(imported.map(s => [s.uid, s]));
      stamps = DEFAULT_STAMPS.map(def => {
        const hit = byUid.get(def.uid);
        return hit ? { ...def, flag: !!hit.flag, name: hit.name ?? def.name } : { ...def };
      });
      saveStamps(); render();
      alert("読み込みました。");
    } catch (e) {
      alert("読み込みに失敗しました。JSON形式を確認してください。");
    }
  };
  reader.readAsText(file, "utf-8");
  e.target.value = "";
});

// ================== 初期化 ==================
(function init(){
  document.getElementById("nfcSupport").textContent =
    ('NDEFReader' in window) ? "利用可能 ✅" : "未対応 ❌";
  render();
})();
