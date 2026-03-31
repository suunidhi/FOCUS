// ============================================================
// FOCUS - YouTube Content Script
// Reads video title → classifies → shows overlay or badge
// ============================================================

(function () {
  'use strict';

  let sessionActive = false;
  let sessionMode = 'smart';
  let overlayShown = false;
  let currentVideoTitle = '';
  let titleObserver = null;

  // ─── Init ────────────────────────────────────────────────
  function init() {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      if (res?.session?.active) {
        sessionActive = true;
        sessionMode = res.session.mode;
        startTitleObserver();
        checkCurrentVideo();
      }
    });
  }

  // ─── Listen for messages from background ─────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SESSION_ENDED') {
      sessionActive = false;
      removeAllOverlays();
      showSessionEndBanner(msg.session);
      return;
    }
    if (msg.type === 'TAB_SWITCH_WARNING') {
      showTabSwitchWarning(msg.count);
      return;
    }
    if (msg.type === 'SESSION_STARTED') {
      sessionActive = true;
      sessionMode = msg.mode;
      startTitleObserver();
      checkCurrentVideo();
    }
  });

  // ─── Title Observer (YouTube SPA) ────────────────────────
  function startTitleObserver() {
    if (titleObserver) titleObserver.disconnect();

    titleObserver = new MutationObserver(() => {
      const title = getVideoTitle();
      if (title && title !== currentVideoTitle) {
        currentVideoTitle = title;
        analyzeAndAct(title);
      }
    });

    titleObserver.observe(document.head, { childList: true, subtree: true });
    titleObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function checkCurrentVideo() {
    setTimeout(() => {
      const title = getVideoTitle();
      if (title) {
        currentVideoTitle = title;
        analyzeAndAct(title);
      }
    }, 1500);
  }

  function getVideoTitle() {
    // Multiple selectors for different YouTube layouts
    const selectors = [
      'h1.title.style-scope.ytd-video-primary-info-renderer',
      'h1.ytd-watch-metadata yt-formatted-string',
      '#title h1',
      'ytd-watch-metadata h1',
      '.ytd-video-primary-info-renderer h1',
      'h1[class*="title"]',
      'meta[name="title"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.getAttribute('content') || el.textContent?.trim();
        if (text && text.length > 2) return text;
      }
    }
    // Fallback: document title
    const docTitle = document.title?.replace(' - YouTube', '').trim();
    return docTitle && docTitle !== 'YouTube' ? docTitle : null;
  }

  // ─── Analyze & Act ───────────────────────────────────────
  function analyzeAndAct(title) {
    if (!sessionActive || !title) return;

    const classification = window.FocusClassifier
      ? window.FocusClassifier.classifyText(title)
      : 'neutral';

    chrome.runtime.sendMessage(
      { type: 'CONTENT_CLASSIFIED', classification, title },
      (res) => {
        const action = res?.action || 'warn';
        handleAction(action, title, classification);
      }
    );
  }

  function handleAction(action, title, classification) {
    removeAllOverlays();

    if (action === 'block') {
      pauseVideo();
      showBlockOverlay(title);
    } else if (action === 'warn') {
      showWarnBadge(title);
    } else {
      showAllowedBadge();
    }
  }

  // ─── Video Control ───────────────────────────────────────
  function pauseVideo() {
    const video = document.querySelector('video');
    if (video && !video.paused) video.pause();
  }

  function resumeVideo() {
    const video = document.querySelector('video');
    if (video && video.paused) video.play();
  }

  // ─── Overlay: Block ──────────────────────────────────────
  function showBlockOverlay(title) {
    if (overlayShown) return;
    overlayShown = true;

    const overlay = document.createElement('div');
    overlay.id = 'focus-block-overlay';
    overlay.innerHTML = `
      <div class="focus-overlay-backdrop"></div>
      <div class="focus-overlay-card">
        <div class="focus-icon">🚫</div>
        <h2>This looks distracting</h2>
        <p class="focus-video-title">"${escapeHtml(title)}"</p>
        <p class="focus-sub">You started a focus session. Stay on track.</p>
        <div class="focus-actions">
          <button class="focus-btn-secondary" id="focus-go-back">← Go Back</button>
          <button class="focus-btn-primary" id="focus-continue">Continue Anyway</button>
        </div>
        <div class="focus-tip">💡 Tip: Switch to Study mode videos to stay in focus</div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('focus-go-back').addEventListener('click', () => {
      history.back();
    });

    document.getElementById('focus-continue').addEventListener('click', () => {
      removeAllOverlays();
      resumeVideo();
    });
  }

  // ─── Overlay: Tab Switch Warning ─────────────────────────
  function showTabSwitchWarning(count) {
    const existing = document.getElementById('focus-tab-warning');
    if (existing) existing.remove();

    const warn = document.createElement('div');
    warn.id = 'focus-tab-warning';
    warn.innerHTML = `
      <div class="focus-warn-inner">
        <span class="focus-warn-icon">⚠️</span>
        <div class="focus-warn-text">
          <strong>You're losing focus</strong>
          <span>You've switched ${count} tabs in 2 mins</span>
        </div>
        <div class="focus-warn-actions">
          <button id="focus-warn-dismiss">Ignore</button>
        </div>
      </div>
    `;
    document.body.appendChild(warn);

    document.getElementById('focus-warn-dismiss').addEventListener('click', () => {
      warn.classList.add('focus-warn-hide');
      setTimeout(() => warn.remove(), 400);
    });

    // Auto-dismiss after 7 seconds
    setTimeout(() => {
      if (document.getElementById('focus-tab-warning')) {
        warn.classList.add('focus-warn-hide');
        setTimeout(() => warn.remove(), 400);
      }
    }, 7000);
  }

  // ─── Badge: Allowed ──────────────────────────────────────
  function showAllowedBadge() {
    const badge = document.createElement('div');
    badge.id = 'focus-allowed-badge';
    badge.innerHTML = `<span>✅ Allowed by Focus</span>`;
    document.body.appendChild(badge);
    setTimeout(() => {
      badge.classList.add('focus-badge-fade');
      setTimeout(() => badge.remove(), 600);
    }, 3000);
  }

  // ─── Badge: Warn ─────────────────────────────────────────
  function showWarnBadge(title) {
    const badge = document.createElement('div');
    badge.id = 'focus-warn-badge';
    badge.innerHTML = `<span>⚠️ Possibly distracting — use wisely</span>`;
    document.body.appendChild(badge);
    setTimeout(() => {
      badge.classList.add('focus-badge-fade');
      setTimeout(() => badge.remove(), 600);
    }, 5000);
  }

  // ─── Session End Banner ───────────────────────────────────
  function showSessionEndBanner(session) {
    const banner = document.createElement('div');
    banner.id = 'focus-session-end';
    banner.innerHTML = `
      <div class="focus-end-inner">
        <div class="focus-end-emoji">🎉</div>
        <h3>Session Complete!</h3>
        <p>You stayed focused for <strong>${session.duration} mins</strong>. Great work!</p>
        <button id="focus-end-dismiss">Awesome!</button>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('focus-end-dismiss')?.addEventListener('click', () => banner.remove());
    setTimeout(() => banner.remove(), 10000);
  }

  // ─── Cleanup ─────────────────────────────────────────────
  function removeAllOverlays() {
    overlayShown = false;
    ['focus-block-overlay', 'focus-allowed-badge', 'focus-warn-badge', 'focus-tab-warning'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Kick off ────────────────────────────────────────────
  init();

  // Re-check on YouTube navigation (SPA)
  window.addEventListener('yt-navigate-finish', () => {
    if (sessionActive) {
      removeAllOverlays();
      setTimeout(checkCurrentVideo, 1500);
    }
  });

})();
