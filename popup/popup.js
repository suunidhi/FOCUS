// ============================================================
// FOCUS - Popup Script
// Manages session start/stop, timer countdown, live stats
// ============================================================

// ── State ──────────────────────────────────────────────────
let selectedDuration = 45; // minutes
let selectedMode = 'smart';
let timerInterval = null;
const RING_CIRCUMFERENCE = 326.7; // 2π × 52

// ── DOM Refs ───────────────────────────────────────────────
const setupView     = document.getElementById('setupView');
const activeView    = document.getElementById('activeView');
const statusDot     = document.getElementById('statusDot');
const footerStatus  = document.getElementById('footerStatus');
const ringProgress  = document.getElementById('ringProgress');
const ringTime      = document.getElementById('ringTime');
const statBlocked   = document.getElementById('statBlocked');
const statAllowed   = document.getElementById('statAllowed');
const statSwitches  = document.getElementById('statSwitches');
const activeModeTag = document.getElementById('activeModeTag');
const customInput   = document.getElementById('customDuration');

// ── Duration Buttons ───────────────────────────────────────
document.querySelectorAll('.fp-dur-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fp-dur-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDuration = parseInt(btn.dataset.mins, 10);
    customInput.value = '';
  });
});

customInput.addEventListener('input', () => {
  const val = parseInt(customInput.value, 10);
  if (!isNaN(val) && val >= 1) {
    document.querySelectorAll('.fp-dur-btn').forEach(b => b.classList.remove('active'));
    selectedDuration = val;
  }
});

// ── Mode Cards ─────────────────────────────────────────────
document.querySelectorAll('.fp-mode-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.fp-mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedMode = card.dataset.mode;
  });
});

// ── Start Button ───────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  const dur = parseInt(customInput.value, 10) || selectedDuration;
  if (!dur || dur < 1) return;

  chrome.runtime.sendMessage(
    { type: 'START_SESSION', duration: dur, mode: selectedMode },
    (res) => {
      if (res?.success) {
        showActiveView(res.session);
        notifyContentScripts({ type: 'SESSION_STARTED', mode: selectedMode });
      }
    }
  );
});

// ── Stop Button ────────────────────────────────────────────
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_SESSION' }, (res) => {
    if (res?.success) {
      clearInterval(timerInterval);
      showSetupView();
      notifyContentScripts({ type: 'SESSION_ENDED', session: res.session });
    }
  });
});

// ── Views ──────────────────────────────────────────────────
function showSetupView() {
  setupView.classList.remove('fp-hidden');
  activeView.classList.add('fp-hidden');
  statusDot.classList.remove('active');
  setFooter('Ready to focus');
}

function showActiveView(session) {
  setupView.classList.add('fp-hidden');
  activeView.classList.remove('fp-hidden');
  statusDot.classList.add('active');

  const modeLabel = session.mode === 'strict' ? '🔒 Strict Block Active' : '🤖 Smart Filter Active';
  activeModeTag.textContent = modeLabel;

  startCountdown(session);
  updateStats(session);
  setFooter('⚡ Session active');
}

// ── Timer ──────────────────────────────────────────────────
function startCountdown(session) {
  clearInterval(timerInterval);
  const totalMs = session.duration * 60 * 1000;

  function tick() {
    const now = Date.now();
    const remaining = Math.max(0, session.endTime - now);
    const fraction = remaining / totalMs;

    // Update ring
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    ringProgress.style.strokeDashoffset = offset;

    // Update time text
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    ringTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Fetch live stats
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      if (res?.session) updateStats(res.session);
    });

    if (remaining <= 0) {
      clearInterval(timerInterval);
      handleSessionEnd();
    }
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

function updateStats(session) {
  statBlocked.textContent  = session.blockedCount  || 0;
  statAllowed.textContent  = session.allowedCount  || 0;
  statSwitches.textContent = session.tabSwitches   || 0;
}

function handleSessionEnd() {
  showSetupView();
  setFooter('🎉 Session complete! Great focus!');
  setTimeout(() => setFooter('Ready to focus'), 5000);
}

// ── Helpers ────────────────────────────────────────────────
function setFooter(msg) {
  footerStatus.textContent = msg;
}

function notifyContentScripts(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  });
}

// ── Init: restore state on popup open ─────────────────────
chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
  const session = res?.session;
  if (session?.active && Date.now() < session.endTime) {
    showActiveView(session);
  } else {
    showSetupView();
  }
});
