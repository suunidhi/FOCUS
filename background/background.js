// ============================================================
// FOCUS - Background Service Worker
// Handles: session state, tab tracking, behavior analysis,
//          notifications, alarm/timer management
// ============================================================

import { BehaviorEngine } from './behaviorEngine.js';

const behavior = new BehaviorEngine();

// ─── Session Defaults ─────────────────────────────────────
const DEFAULT_SESSION = {
  active: false,
  mode: 'smart',       // 'smart' | 'strict'
  duration: 45,        // minutes
  startTime: null,
  endTime: null,
  tabSwitches: 0,
  blockedCount: 0,
  allowedCount: 0,
};

// ─── Init ─────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ session: DEFAULT_SESSION });
  console.log('[Focus] Extension installed, session initialized.');
});

// ─── Message Router ───────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {

      case 'START_SESSION': {
        const session = {
          ...DEFAULT_SESSION,
          active: true,
          mode: msg.mode || 'smart',
          duration: msg.duration || 45,
          startTime: Date.now(),
          endTime: Date.now() + (msg.duration || 45) * 60 * 1000,
          tabSwitches: 0,
          blockedCount: 0,
          allowedCount: 0,
        };
        await chrome.storage.local.set({ session });
        behavior.reset();

        // Set alarm to end session
        chrome.alarms.create('sessionEnd', { delayInMinutes: msg.duration || 45 });

        // Icon: active state
        setIcon('active');
        sendResponse({ success: true, session });
        break;
      }

      case 'STOP_SESSION': {
        const { session } = await chrome.storage.local.get('session');
        const finalSession = { ...session, active: false };
        await chrome.storage.local.set({ session: finalSession });
        chrome.alarms.clear('sessionEnd');
        setIcon('idle');
        sendResponse({ success: true, session: finalSession });
        break;
      }

      case 'GET_SESSION': {
        const { session } = await chrome.storage.local.get('session');
        sendResponse({ session });
        break;
      }

      case 'CONTENT_CLASSIFIED': {
        // Called from content script with result
        const { session } = await chrome.storage.local.get('session');
        if (!session?.active) { sendResponse({ action: 'allow' }); break; }

        const action = decideAction(session, msg.classification);

        // Update counters
        if (action === 'block' || action === 'warn') {
          session.blockedCount = (session.blockedCount || 0) + 1;
        } else {
          session.allowedCount = (session.allowedCount || 0) + 1;
        }
        await chrome.storage.local.set({ session });
        sendResponse({ action });
        break;
      }

      case 'STRICT_CHECK': {
        const { session } = await chrome.storage.local.get('session');
        if (!session?.active) { sendResponse({ block: false }); break; }
        sendResponse({ block: session.mode === 'strict' });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async
});

// ─── Tab Switch Tracking ──────────────────────────────────
let lastActiveTab = null;
let switchTimes = [];

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { session } = await chrome.storage.local.get('session');
  if (!session?.active) return;

  const now = Date.now();
  if (lastActiveTab !== null && lastActiveTab !== tabId) {
    switchTimes.push(now);
    // Keep only switches from last 2 minutes
    switchTimes = switchTimes.filter(t => now - t < 2 * 60 * 1000);
    session.tabSwitches = (session.tabSwitches || 0) + 1;
    await chrome.storage.local.set({ session });

    const alert = behavior.analyzeSwitches(switchTimes.length);
    if (alert) {
      sendTabSwitchNotification(switchTimes.length, tabId);
    }
  }
  lastActiveTab = tabId;
});

// ─── Alarm Handler (Session End) ─────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sessionEnd') {
    const { session } = await chrome.storage.local.get('session');
    const finalSession = { ...session, active: false };
    await chrome.storage.local.set({ session: finalSession });
    setIcon('idle');

    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SESSION_ENDED', session: finalSession });
      } catch (_) { /* tab might not have content script */ }
    }

    chrome.notifications.create('sessionEnd', {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: '🎉 Focus Session Complete!',
      message: `You stayed focused for ${session.duration} mins. Great work!`,
      priority: 2,
    });
  }
});

// ─── Helpers ──────────────────────────────────────────────
function decideAction(session, classification) {
  if (session.mode === 'strict') return 'block';
  if (classification === 'study') return 'allow';
  if (classification === 'neutral') return 'warn';
  return 'block'; // distraction
}

function sendTabSwitchNotification(count, tabId) {
  chrome.notifications.create('tabSwitch_' + Date.now(), {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: '⚠️ You\'re losing focus',
    message: `You've switched ${count} tabs in 2 mins. Stay on task!`,
    priority: 1,
  });

  // Also inject overlay into the current tab
  chrome.tabs.sendMessage(tabId, { type: 'TAB_SWITCH_WARNING', count }).catch(() => {});
}

function setIcon(state) {
  const suffix = state === 'active' ? 'active' : '';
  // Single icon for now — can be swapped for active variant
  chrome.action.setBadgeText({ text: state === 'active' ? '●' : '' });
  chrome.action.setBadgeBackgroundColor({ color: state === 'active' ? '#00C896' : '#333333' });
}
