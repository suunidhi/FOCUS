// ============================================================
// FOCUS - Distraction Site Content Script
// Applied to: Instagram, Twitter/X, Reddit, Netflix, Twitch
// Shows block overlay immediately when session is active in strict mode
// Or a subtle warning in smart mode
// ============================================================

(function () {
  'use strict';

  const SITE_NAMES = {
    'instagram.com': 'Instagram',
    'twitter.com': 'Twitter / X',
    'x.com': 'X (Twitter)',
    'reddit.com': 'Reddit',
    'netflix.com': 'Netflix',
    'twitch.tv': 'Twitch',
  };

  const hostname = location.hostname.replace('www.', '');
  const siteName = SITE_NAMES[hostname] || hostname;
  let overlayShown = false;

  function init() {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      if (!res?.session?.active) return;
      const mode = res.session.mode;

      if (mode === 'strict') {
        showStrictBlock(siteName);
      } else {
        showSmartWarning(siteName);
      }
    });
  }

  // ─── Strict Block ────────────────────────────────────────
  function showStrictBlock(name) {
    if (overlayShown) return;
    overlayShown = true;

    const overlay = document.createElement('div');
    overlay.id = 'focus-block-overlay';
    overlay.innerHTML = `
      <div class="focus-overlay-backdrop"></div>
      <div class="focus-overlay-card">
        <div class="focus-icon">🔒</div>
        <h2>${name} is blocked</h2>
        <p class="focus-sub">You're in a strict focus session. This site is not allowed.</p>
        <div class="focus-actions">
          <button class="focus-btn-secondary" id="focus-go-back">← Go Back</button>
          <button class="focus-btn-primary" id="focus-continue">Override</button>
        </div>
      </div>
    `;  
    document.body.appendChild(overlay);

    document.getElementById('focus-go-back').addEventListener('click', () => history.back());
    document.getElementById('focus-continue').addEventListener('click', () => {
      overlay.remove();
      overlayShown = false;
    });
  }

  // ─── Smart Reminder (subtle) ─────────────────────────────
  function showSmartWarning(name) {
    const toast = document.createElement('div');
    toast.id = 'focus-tab-warning';
    toast.innerHTML = `
      <div class="focus-warn-inner">
        <span class="focus-warn-icon">🧠</span>
        <div class="focus-warn-text">
          <strong>Focus Session Active</strong>
          <span>${name} may break your focus</span>
        </div>
        <div class="focus-warn-actions">
          <button id="focus-warn-dismiss">Got it</button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    document.getElementById('focus-warn-dismiss').addEventListener('click', () => {
      toast.classList.add('focus-warn-hide');
      setTimeout(() => toast.remove(), 400);
    });
    setTimeout(() => {
      if (document.getElementById('focus-tab-warning')) {
        toast.classList.add('focus-warn-hide');
        setTimeout(() => toast.remove(), 400);
      }
    }, 8000);
  }

  // Also listen for session_started from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SESSION_STARTED') {
      overlayShown = false;
      init();
    }
    if (msg.type === 'SESSION_ENDED') {
      document.getElementById('focus-block-overlay')?.remove();
      document.getElementById('focus-tab-warning')?.remove();
      overlayShown = false;
    }
  });

  init();
})();
