'use client';

import { useEffect, useState, use } from 'react';
import Script from 'next/script';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Home(props: { searchParams: SearchParams }) {
  const searchParams = use(props.searchParams);

  return (
    <>
      <div className="bg-layer" aria-hidden="true"></div>
      <div className="device">
        <div className="phone">
          <div className="app">
            {/* 背景SVGアニメーション [cite: 1-9] */}
            <div id="bg-wrap" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="Gradient1" cx="50%" cy="50%" fx="0.44%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="34s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(232, 16, 245, 0.9)" />
                    <stop offset="100%" stopColor="rgba(232, 16, 245, 0)" />
                  </radialGradient>
                  <radialGradient id="Gradient2" cx="50%" cy="50%" fx="2.68%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="23.5s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(245, 240, 0, 0.9)" />
                    <stop offset="100%" stopColor="rgba(245, 240, 0, 0)" />
                  </radialGradient>
                  <radialGradient id="Gradient3" cx="50%" cy="50%" fx="0.83%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="21.5s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(0, 255, 255, 1)" />
                    <stop offset="100%" stopColor="rgba(0, 255, 255, 0)" />
                  </radialGradient>
                </defs>
                <rect x="13.7%" y="1.1%" width="100%" height="100%" fill="url(#Gradient1)">
                  <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="7s" repeatCount="indefinite" />
                </rect>
                <rect x="-2.1%" y="35.4%" width="100%" height="100%" fill="url(#Gradient2)">
                  <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="12s" repeatCount="indefinite" />
                </rect>
              </svg>
            </div>

            <div className="bg-orbs" aria-hidden="true">
              <span className="orb o1"></span><span className="orb o2"></span><span className="orb o3"></span>
            </div>
            <div id="goldenOverlay" className="golden-overlay" aria-hidden="true"></div>

            <header className="header">
              <div className="title">
                <img className="title-png" src="/images/NEW_title.png" alt="NFCスタンプラリー" />
              </div>
              <button id="oopInfo" className="oop-pill glass" type="button">
                <span id="oopValue" className="oop-value">0</span>
                <span className="oop-label">P</span>
              </button>
              <div className="scan-top">
                <button id="scanBtn" className="scan-mini glass" type="button">SCAN</button>
              </div>
            </header>

            <main className="main">
              {/* スタンプページ [cite: 13] */}
              <section id="page-stamp" className="page is-active">
                <div className="stamp-card glass">
                  <div id="stampCarousel" className="stamp-carousel">
                    <div className="stamp-track"></div>
                  </div>
                  <div id="indicator" className="indicator"></div>
                  <div className="below-row inside-card">
                    <button id="chipsBtn" className="chips-btn glass" type="button">Chips</button>
                  </div>
                </div>
                <button id="resetBtn" className="reset-hidden" type="button">RESET</button>
              </section>

              {/* 決済・プロフィールページ（省略：index.htmlと同様のID構造） [cite: 15-16] */}
              <section id="page-pay" className="page">
                <div className="page-center glass">
                  <h2 className="page-title">決済</h2>
                </div>
              </section>

              <section id="page-profile" className="page">
                <div className="page-center glass">
                  <h2 className="page-title">プロフィール</h2>
                  <div id="user-info" style={{ display: 'none' }}>
                    <p>ようこそ、<span id="display-username"></span>さん</p>
                    <button className="chips-btn glass" type="button"   onClick={() => {
    localStorage.removeItem("user");
    location.reload();
  }} id="logout-btn-manual">ログアウト</button>
                  </div>
                  <button id="auth-trigger-btn" className="chips-btn glass" type="button">ログイン/会員登録</button>
                  <button className="danger" type="button" id="resetBtn2">進捗リセット</button>
                </div>
                {/* ゴールデンカード  */}
                <div className="golden-card glass" aria-hidden="true">
                  <div className="golden-head">
                    <h4 style={{margin:0, fontWeight:800, fontSize:'15px'}}>ゴールデンモード</h4>
                    <div id="goldenStatus" style={{fontWeight:700, fontSize:'13px'}}>未解禁</div>
                  </div>
                  <div className="golden-body">
                    <div className="golden-actions">
                      <button id="unlockGoldenBtn" className="chips-btn glass">50Pで解禁</button>
                      <button id="toggleGoldenBtn" className="chips-btn glass" style={{display:'none'}}>OFF</button>
                    </div>
                  </div>
                </div>
              </section>
            </main>

            {/* ボトムナビ [cite: 25-26] */}
            <nav className="bottom-nav glass-nav">
              <button className="nav-btn is-active" data-target="stamp">
                <span className="nav-ico"><img className="nav-ico-img" src="/images/stamp.png" alt="S" /></span>
              </button>
              <button className="nav-btn" data-target="pay">
                <span className="nav-ico"><img className="nav-ico-img" src="/images/pay.png" alt="P" /></span>
              </button>
              <button className="nav-btn" data-target="profile">
                <span className="nav-ico"><img className="nav-ico-img" src="/images/profile.png" alt="Pr" /></span>
              </button>
            </nav>

            {/* 各種モーダル [cite: 17, 27] */}
            <div id="modal" className="modal" aria-hidden="true">
              <div className="modal-backdrop" data-close="1"></div>
              <div className="modal-panel glass">
                <div className="modal-head">
                  <div id="modalTitle" className="modal-title">location</div>
                  <button className="modal-close" data-close="1">✕</button>
                </div>
                <div id="modalBody" className="modal-body"></div>
              </div>
            </div>

            <div id="auth-modal" className="modal" aria-hidden="true">
              <div className="modal-backdrop" id="auth-backdrop"></div>
              <div className="modal-panel glass">
                <div id="auth-title" className="modal-title">ログイン</div>
                <div className="modal-body auth-form">
                  <div id="auth-choice" className="auth-actions">
                    <button id="auth-login-choice" className="chips-btn glass">ログイン</button>
                    <button id="auth-register-choice" className="chips-btn glass">新規登録</button>
                  </div>
                  <div id="auth-form" hidden>
                    <input type="text" id="auth-username" className="glass" placeholder="ユーザー名" />
                    <input type="password" id="auth-password" className="glass" placeholder="パスワード" />
                    <button id="auth-submit-btn" className="chips-btn glass">実行</button>
                  </div>
                </div>
              </div>
            </div>

            <div id="stampAni" className="stamp-ani" aria-hidden="true">
              <div className="stamp-ani-sprite"></div>
            </div>
          </div>
        </div>
        <div className="debug-tools">
          <button id="debugToggle" className="glass debug-toggle-btn">デバッグモード</button>
          <div id="debugPanel" className="debug-panel glass"></div>
        </div>
      </div>

      <Script 
        src="/js/script.js" 
        strategy="afterInteractive" 
      />
    </>
  );
}