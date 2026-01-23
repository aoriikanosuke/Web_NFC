'use client';

import Script from 'next/script';

export default function Page() {
  const callGlobal = (fnName: string) => {
    const w = window as any;
    if (typeof w?.[fnName] === 'function') w[fnName]();
  };

  return (
    <>
      <div className="bg-layer" aria-hidden="true"></div>

      <div className="device">
        <div className="phone">
          <div className="app">
            <div id="topNotice" className="top-notice" role="status" aria-live="polite" aria-hidden="true">
              <div className="top-notice-pill glass">
                <span className="top-notice-dots" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span id="topNoticeText" className="top-notice-text">読み込み中</span>
              </div>
            </div>
            {/* 背景（ガラス映え用） */}
            <div id="bg-wrap" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="Gradient1" cx="50%" cy="50%" fx="0.441602%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="34s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(232, 16, 245, 0.9)" />
                    <stop offset="100%" stopColor="rgba(232, 16, 245, 0)" />
                  </radialGradient>

                  <radialGradient id="Gradient2" cx="50%" cy="50%" fx="2.68147%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="23.5s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(245, 240, 0, 0.9)" />
                    <stop offset="100%" stopColor="rgba(245, 240, 0, 0)" />
                  </radialGradient>

                  <radialGradient id="Gradient3" cx="50%" cy="50%" fx="0.836536%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="21.5s" values="0%;3%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(0, 255, 255, 1)" />
                    <stop offset="100%" stopColor="rgba(0, 255, 255, 0)" />
                  </radialGradient>

                  <radialGradient id="Gradient4" cx="50%" cy="50%" fx="4.56417%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="23s" values="0%;5%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(0, 255, 0, 1)" />
                    <stop offset="100%" stopColor="rgba(0, 255, 0, 0)" />
                  </radialGradient>

                  <radialGradient id="Gradient5" cx="50%" cy="50%" fx="2.65405%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="24.5s" values="0%;5%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(40, 120, 255, 1)" />
                    <stop offset="100%" stopColor="rgba(40, 120, 255, 0)" />
                  </radialGradient>

                  <radialGradient id="Gradient6" cx="50%" cy="50%" fx="0.981338%" fy="50%" r=".5">
                    <animate attributeName="fx" dur="25.5s" values="0%;5%;0%" repeatCount="indefinite" />
                    <stop offset="0%" stopColor="rgba(255,0,0, 1)" />
                    <stop offset="100%" stopColor="rgba(255,0,0, 0)" />
                  </radialGradient>
                </defs>

                <rect
                  x="13.744%"
                  y="1.18473%"
                  width="100%"
                  height="100%"
                  fill="url(#Gradient1)"
                  transform="rotate(334.41 50 50)"
                >
                  <animate attributeName="x" dur="20s" values="25%;0%;25%" repeatCount="indefinite" />
                  <animate attributeName="y" dur="21s" values="0%;25%;0%" repeatCount="indefinite" />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="7s"
                    repeatCount="indefinite"
                  />
                </rect>

                <rect
                  x="-2.17916%"
                  y="35.4267%"
                  width="100%"
                  height="100%"
                  fill="url(#Gradient2)"
                  transform="rotate(255.072 50 50)"
                >
                  <animate attributeName="x" dur="23s" values="-25%;0%;-25%" repeatCount="indefinite" />
                  <animate attributeName="y" dur="24s" values="0%;50%;0%" repeatCount="indefinite" />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="12s"
                    repeatCount="indefinite"
                  />
                </rect>

                <rect
                  x="9.00483%"
                  y="14.5733%"
                  width="100%"
                  height="100%"
                  fill="url(#Gradient3)"
                  transform="rotate(139.903 50 50)"
                >
                  <animate attributeName="x" dur="25s" values="0%;25%;0%" repeatCount="indefinite" />
                  <animate attributeName="y" dur="12s" values="0%;25%;0%" repeatCount="indefinite" />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="360 50 50"
                    to="0 50 50"
                    dur="9s"
                    repeatCount="indefinite"
                  />
                </rect>
              </svg>
            </div>

            <div className="bg-orbs" aria-hidden="true">
              <span className="orb o1"></span>
              <span className="orb o2"></span>
              <span className="orb o3"></span>
            </div>

            {/* Golden overlay for full-background sparkles */}
            <div id="goldenOverlay" className="golden-overlay" aria-hidden="true"></div>

            {/* NFC hint (non-text) */}
            <div className="nfc-hint" aria-hidden="true">
              <span className="nfc-ring r1"></span>
              <span className="nfc-ring r2"></span>
              <span className="nfc-ring r3"></span>
              <span className="nfc-tag"></span>
            </div>

            {/* Header */}
            <header className="header">
              <div
                id="siteInfoTrigger"
                className="title is-clickable"
                role="button"
                tabIndex={0}
                aria-label="サイト説明を表示"
              >
                <img className="title-png" src="/images/NEW_title.png" alt="NFCスタンプラリー" />
              </div>

              <button id="oopInfo" className="oop-pill glass" type="button" aria-label="ポイントの説明を表示">
                <span id="oopValue" className="oop-value">
                  0
                </span>
                <span className="oop-label">P</span>
              </button>

              <div className="scan-top">
                <button id="scanBtn" className="scan-mini glass" type="button">
                  SCAN
                </button>
              </div>
            </header>

            {/* Pages (no reload) */}
            <main className="main">
              {/* Stamp */}
              <section id="page-stamp" className="page is-active" aria-label="スタンプ">
                <div className="stamp-card glass">
                  <div id="stampCarousel" className="stamp-carousel" aria-label="スタンプ押印エリア">
                    <div className="stamp-track"></div>
                  </div>

                  <div id="indicator" className="indicator" aria-label="ページインジケータ"></div>

                  <div className="below-row inside-card">
                    <button id="chipsBtn" className="chips-btn glass" type="button">
                      Chips
                    </button>
                  </div>
                </div>

                <button id="resetBtn" className="reset-hidden" type="button">
                  RESET
                </button>
              </section>

              {/* Pay */}
              <section id="page-pay" className="page" aria-label="決済">
                <div className="pay-shell glass">
                  <div id="payRotator" className="pay-rotator" aria-live="polite">
                    <div className="pay-view pay-view--customer">
                      <div className="pay-header">
                        <div className="pay-title">決済</div>
                        <div className="pay-balance">
                          利用可能 <span id="payAvailable">0</span>P
                        </div>
                      </div>

                      <div className="pay-display">
                        <div id="payAmount" className="pay-amount">
                          0
                        </div>
                        <div className="pay-currency">P</div>
                      </div>

                      <div id="payKeypad" className="pay-keypad" aria-label="金額入力テンキー">
                        <button className="pay-key glass" data-paykey="1" type="button">
                          1
                        </button>
                        <button className="pay-key glass" data-paykey="2" type="button">
                          2
                        </button>
                        <button className="pay-key glass" data-paykey="3" type="button">
                          3
                        </button>
                        <button className="pay-key glass" data-paykey="4" type="button">
                          4
                        </button>
                        <button className="pay-key glass" data-paykey="5" type="button">
                          5
                        </button>
                        <button className="pay-key glass" data-paykey="6" type="button">
                          6
                        </button>
                        <button className="pay-key glass" data-paykey="7" type="button">
                          7
                        </button>
                        <button className="pay-key glass" data-paykey="8" type="button">
                          8
                        </button>
                        <button className="pay-key glass" data-paykey="9" type="button">
                          9
                        </button>
                        <button className="pay-key glass" data-paykey="clear" type="button">
                          C
                        </button>
                        <button className="pay-key glass" data-paykey="0" type="button">
                          0
                        </button>
                        <button className="pay-key glass" data-paykey="back" type="button">
                          ←
                        </button>
                      </div>

                      <div className="pay-actions">
                        <button id="payConfirmBtn" className="pay-primary pay-primary--wide" type="button">
                          決定
                        </button>
                      </div>
                    </div>

                    <div className="pay-view pay-view--staff" aria-label="店員確認画面">
                      <div className="pay-display pay-display--staff">
                        <div id="payConfirmAmount" className="pay-amount">
                          0
                        </div>
                        <div className="pay-currency">P</div>
                      </div>
                      <div className="pay-actions pay-actions--staff">
                        <button id="payCommitBtn" className="pay-primary pay-primary--staff" type="button">
                          決済確定
                        </button>
                        <button id="payBackBtn" className="pay-action pay-action--staff glass" type="button">
                          キャンセル
                        </button>
                      </div>
                      <div id="payStatus" className="pay-status" aria-live="polite"></div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Profile */}
              <section id="page-profile" className="page" aria-label="プロフィール">
                <div className="page-center glass">
                  <h2 className="page-title">プロフィール</h2>

                  <div id="user-info" style={{ display: 'none' }}>
                    <p>
                      ようこそ、<span id="display-username"></span>さん
                    </p>
                    <div className="profile-actions">
                      <button
                        className="chips-btn glass danger"
                        type="button"
                        onClick={() => callGlobal('logout')}
                      >
                        ログアウト
                      </button>
                      <button id="rankingBtn" className="chips-btn glass" type="button">
                        ランキング
                      </button>
                    </div>
                  </div>

                  <button
                    id="auth-trigger-btn"
                    className="chips-btn glass"
                    type="button"
                    onClick={() => callGlobal('openAuthModal')}
                  >
                    ログイン/会員登録
                  </button>
                </div>

                <div id="auth-modal" className="modal" aria-hidden="true">
                  <div className="modal-backdrop" onClick={() => callGlobal('closeAuthModal')}></div>
                  <div className="modal-panel glass" role="dialog" aria-labelledby="auth-title">
                    <div className="modal-head">
                      <div id="auth-title" className="modal-title">
                        ログイン
                      </div>
                      <button
                        className="modal-close"
                        type="button"
                        onClick={() => callGlobal('closeAuthModal')}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-body auth-form">
                      <div id="auth-choice" className="auth-actions">
                        <button id="auth-login-choice" className="chips-btn glass" type="button">
                          ログイン
                        </button>
                        <button id="auth-register-choice" className="chips-btn glass" type="button">
                          新規会員登録
                        </button>
                      </div>
                      <div id="auth-form" hidden>
                        <div className="auth-input-group">
                          <input type="text" id="auth-username" className="glass" placeholder="ユーザー名" />
                          <input type="password" id="auth-password" className="glass" placeholder="パスワード" />
                        </div>
                        <div className="auth-actions">
                          <button
                            id="auth-submit-btn"
                            className="chips-btn glass"
                            type="button"
                            onClick={() => callGlobal('handleAuth')}
                          >
                            実行
                          </button>
                        </div>
                        <p
                          id="auth-toggle-text"
                          className="auth-toggle-btn"
                          onClick={() => callGlobal('toggleAuthMode')}
                        >
                          新規登録はこちら
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="rankingModal" className="ranking-modal" aria-hidden="true">
                  <div className="ranking-backdrop" data-close="1"></div>
                  <div
                    className="ranking-panel glass"
                    role="dialog"
                    aria-modal="true"
                    aria-label="ランキング"
                  >
                    <div className="ranking-head">
                      <div className="ranking-title">ランキング</div>
                      <button className="modal-close" type="button" data-close="1">
                        ✕
                      </button>
                    </div>
                    <div id="rankingList" className="ranking-list"></div>
                  </div>
                </div>
              </section>
            </main>

            {/* Stamp animation overlay */}
            <div id="stampAni" className="stamp-ani" aria-hidden="true">
              <div className="stamp-ani-sprite"></div>
            </div>

            {/* Bottom Nav */}
            <nav className="bottom-nav glass-nav" aria-label="ボトムナビゲーション">
              <button className="nav-btn is-active" data-target="stamp" aria-label="スタンプ">
                <span className="nav-ico">
                  <img className="nav-ico-img" src="/images/stamp.png" alt="スタンプ" />
                </span>
              </button>
              <button className="nav-btn" data-target="pay" aria-label="決済">
                <span className="nav-ico">
                  <img className="nav-ico-img" src="/images/pay.png" alt="決済" />
                </span>
              </button>
              <button className="nav-btn" data-target="profile" aria-label="プロフィール">
                <span className="nav-ico">
                  <img className="nav-ico-img" src="/images/profile.png" alt="プロフィール" />
                </span>
              </button>
            </nav>

            {/* Modal */}
            <div id="modal" className="modal" aria-hidden="true">
              <div className="modal-backdrop" data-close="1"></div>
              <div className="modal-panel glass" role="dialog" aria-modal="true" aria-label="location情報">
                <div className="modal-head">
                  <div id="modalTitle" className="modal-title">
                    location
                  </div>
                  <button className="modal-close" type="button" data-close="1">
                    ✕
                  </button>
                </div>
                <div id="modalBody" className="modal-body"></div>
              </div>
            </div>

            <div id="paySuccess" className="pay-success" aria-hidden="true">
              <div className="pay-success-card">
                <div className="pay-success-title">決済完了</div>
                <div className="pay-success-amount">
                  <span id="paySuccessAmount">0</span>
                  <span className="pay-success-unit">P</span>
                </div>
                <div className="pay-success-sub">ご利用ありがとうございました</div>
                <div className="pay-success-consumed">
                  消費ポイント <span id="paySuccessConsumed">0</span>P
                </div>
              </div>
            </div>

            <div id="completeOverlay" className="complete-overlay" aria-hidden="true">
              <div className="complete-card glass">
                <div className="complete-title">congratulation!!</div>
                <div className="complete-text">全てのスタンプを獲得しました。</div>
                <button id="completeBonusBtn" className="pay-primary" type="button">
                  100Pを受け取る
                </button>
              </div>
            </div>

            <div id="siteInfoOverlay" className="site-info" aria-hidden="true">
              <div className="site-info-top">
                <img className="site-info-title" src="/images/NEW_title.png" alt="NFCスタンプラリー" />
                <p className="site-info-text">
                  NFCスタンプを集めてポイントをため、
                  <br />
                  決済で使えるスタンプラリーアプリです。
                </p>
              </div>

              <div className="site-info-flow">
                <button id="siteInfoStartBtn" className="site-info-btn site-info-btn--start" type="button">
                  はじめる
                </button>

                <div className="site-info-actions" aria-label="ログインまたは会員登録">
                  <button id="siteInfoLoginBtn" className="site-info-btn" type="button">
                    ログイン
                  </button>
                  <button id="siteInfoSignupBtn" className="site-info-btn" type="button">
                    会員登録
                  </button>
                </div>

                <div id="siteInfoForm" className="site-info-form" aria-hidden="true">
                  <div id="siteInfoFormTitle" className="site-info-form-title" aria-hidden="true"></div>

                  <div className="site-info-form-fields">
                    <input id="siteInfoUsername" className="site-info-input" type="text" placeholder="ユーザー名" />
                    <input id="siteInfoPassword" className="site-info-input" type="password" placeholder="パスワード" />
                  </div>

                  <button id="siteInfoSubmitBtn" className="site-info-btn site-info-btn--submit" type="button">
                    ログイン
                  </button>

                  <button id="siteInfoToggleLink" className="site-info-link" type="button">
                    会員登録の場合はこちら
                  </button>

                  <div id="siteInfoFormError" className="site-info-error" aria-live="polite"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* デバッグUI（デスクトップ時のみ表示） */}
        <div className="debug-tools" aria-hidden="true">
          <button id="debugToggle" className="glass debug-toggle-btn" type="button">
            デバッグモード
          </button>
          <div id="debugPanel" className="debug-panel glass" aria-hidden="true"></div>
        </div>
      </div>

      {/* app */}
      <Script src="/js/script.js?v=20250115" strategy="afterInteractive" />
    </>
  );
}
