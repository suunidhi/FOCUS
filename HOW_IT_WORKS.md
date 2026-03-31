# 🧠 Focus — How It All Works
### A complete technical + concept explanation (with code)

---

## 🎯 The Big Idea

Most website blockers just block. Focus is different:

> **"It understands what you're doing on a website, and intervenes only when needed."**

- On YouTube → it **reads the video title**, classifies it as Study or Entertainment, and decides what to do
- On Instagram/Netflix/Twitter → it warns you or blocks you based on your chosen mode
- If you rapidly switch tabs → it detects that **behavioral pattern** and alerts you
- It never interrupts when it doesn't need to

---

## 🏗️ System Architecture

```
┌─────────────────────────────┐
│        USER CLICKS ICON     │
│         (Popup UI)          │
└────────────┬────────────────┘
             │ Sets duration + mode
             ▼
┌─────────────────────────────┐
│      chrome.storage.local   │  ← session state lives here
│  { active, mode, duration,  │
│    startTime, endTime, ...} │
└────────────┬────────────────┘
             │
     ┌───────┴────────┐
     ▼                ▼
┌─────────┐    ┌──────────────────┐
│Background│   │  Content Scripts │
│ Worker  │   │  (per-tab AI)    │
└────┬────┘   └──────┬───────────┘
     │               │
     │  Tab tracking │  YouTube title reading
     │  Timer alarm  │  Overlay injection
     │  Notifications│  Classification
     ▼               ▼
┌────────────────────────────┐
│     AI Decision Layer      │
│  study → allow             │
│  neutral → warn            │
│  distraction → block       │
└────────────────────────────┘
```

---

## 📁 Every File Explained

---

### 1. `manifest.json` — The Extension's ID Card

This is the **first file Chrome reads**. It tells Chrome:
- What the extension is called
- What permissions it needs
- Which scripts to run where

```json
"permissions": ["storage", "tabs", "notifications", "alarms", "scripting"]
```

| Permission | Why it's needed |
|---|---|
| `storage` | Save session state (active, duration, mode) |
| `tabs` | Detect tab switching behavior |
| `notifications` | Show system alerts |
| `alarms` | End session after the timer runs out |
| `scripting` | Inject overlays into web pages |

```json
"host_permissions": ["https://www.youtube.com/*", "https://www.instagram.com/*", ...]
```
These are the **sites Focus can interact with**. Without this, Chrome blocks any script from reading or modifying those pages.

```json
"background": { "service_worker": "background/background.js" }
```
The background script runs **silently in the background** — always listening, even when the popup is closed.

```json
"content_scripts": [{ "matches": ["https://www.youtube.com/*"], "js": [...] }]
```
Content scripts are injected **inside the YouTube tab** when you open it. They have direct access to the page's HTML.

---

### 2. `background/background.js` — The Brain

This is the **core engine**. It runs as a Chrome Service Worker — always alive during a session.

#### 🔹 Starting a Session
```js
case 'START_SESSION': {
  const session = {
    active: true,
    mode: msg.mode,         // 'smart' or 'strict'
    duration: msg.duration, // in minutes
    startTime: Date.now(),
    endTime: Date.now() + msg.duration * 60 * 1000,
  };
  await chrome.storage.local.set({ session });
  chrome.alarms.create('sessionEnd', { delayInMinutes: msg.duration });
}
```
- Saves the session to `chrome.storage` so every tab can access it
- Creates a **Chrome Alarm** — like a timer. When it fires, the session ends automatically

#### 🔹 Tab Switch Detection
```js
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  // Every time user switches tab → record the time
  switchTimes.push(Date.now());
  // Keep only last 2 minutes of switches
  switchTimes = switchTimes.filter(t => now - t < 2 * 60 * 1000);

  const alert = behavior.analyzeSwitches(switchTimes.length);
  if (alert) sendTabSwitchNotification(switchTimes.length, tabId);
});
```
Every tab switch is timestamped. If there are **5+ switches in 2 minutes**, the BehaviorEngine says "alert".

#### 🔹 Handling Content Classification Result
```js
case 'CONTENT_CLASSIFIED': {
  const action = decideAction(session, msg.classification);
  // classification = 'study' | 'neutral' | 'distraction'
  sendResponse({ action }); // 'allow' | 'warn' | 'block'
}

function decideAction(session, classification) {
  if (session.mode === 'strict') return 'block'; // always block in strict
  if (classification === 'study') return 'allow';
  if (classification === 'neutral') return 'warn';
  return 'block'; // distraction in smart mode
}
```

---

### 3. `background/behaviorEngine.js` — The Pattern Detector

A small but powerful class that watches **how you use your browser**:

```js
analyzeSwitches(recentSwitches) {
  const cooledDown = now - this.lastAlertAt > this.COOLDOWN_MS; // 1 minute cooldown

  if (recentSwitches >= this.ALERT_THRESHOLD && cooledDown) {
    // 5+ switches AND haven't alerted recently
    this.lastAlertAt = now;
    return true; // → trigger alert!
  }
  return false; // → stay silent
}
```

**Why the cooldown?** Without it, you'd get an alert on every single tab switch after crossing the threshold. The 1-minute cooldown makes Focus smart — it alerts, waits, then watches again.

---

### 4. `content/classifier.js` — The AI Brain (Phase 1)

This is the **keyword-based AI classifier**. It compares the YouTube video title against two lists:

```js
const STUDY_KEYWORDS = [
  'tutorial', 'lecture', 'programming', 'algorithm', 'dsa',
  'machine learning', 'system design', 'explained', 'how to', ...
];

const DISTRACTION_KEYWORDS = [
  'funny', 'prank', 'reaction', 'vlog', 'music video',
  'gameplay', 'minecraft', 'trending', 'viral', ...
];
```

**Scoring logic:**
```js
function classifyText(text) {
  const lower = text.toLowerCase();
  let studyScore = 0, distractionScore = 0;

  for (const kw of STUDY_KEYWORDS)      if (lower.includes(kw)) studyScore++;
  for (const kw of DISTRACTION_KEYWORDS) if (lower.includes(kw)) distractionScore++;

  if (studyScore > distractionScore) return 'study';
  if (distractionScore > studyScore) return 'distraction';
  return 'neutral'; // tie or no match
}
```

**Example:**
- `"Node.js Tutorial for Beginners"` → `studyScore=2, distractionScore=0` → ✅ **study**
- `"Minecraft Funny Moments Compilation"` → `studyScore=0, distractionScore=3` → 🚫 **distraction**
- `"My Day in Mumbai"` → `studyScore=0, distractionScore=0` → ⚠️ **neutral**

---

### 5. `content/content.js` — The YouTube Controller

This script lives **inside the YouTube tab**. It does three things:

#### 🔹 Reading the Video Title
YouTube is a SPA (Single Page App) — the page doesn't reload when you click a video. So we use a **MutationObserver** to detect when the title changes:

```js
titleObserver = new MutationObserver(() => {
  const title = getVideoTitle(); // reads from <h1> or document.title
  if (title !== currentVideoTitle) {
    currentVideoTitle = title;
    analyzeAndAct(title); // → classify → decide → show overlay
  }
});
titleObserver.observe(document.body, { childList: true, subtree: true });
```

#### 🔹 Sending to Background for Decision
```js
function analyzeAndAct(title) {
  const classification = window.FocusClassifier.classifyText(title);

  chrome.runtime.sendMessage(
    { type: 'CONTENT_CLASSIFIED', classification },
    (res) => handleAction(res.action, title) // 'allow'|'warn'|'block'
  );
}
```

#### 🔹 Showing the Block Overlay
```js
function showBlockOverlay(title) {
  const overlay = document.createElement('div');
  overlay.id = 'focus-block-overlay';
  overlay.innerHTML = `
    <div class="focus-overlay-backdrop"></div>
    <div class="focus-overlay-card">
      <div class="focus-icon">🚫</div>
      <h2>This looks distracting</h2>
      <p>"${title}"</p>
      <button id="focus-go-back">← Go Back</button>
      <button id="focus-continue">Continue Anyway</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pauseVideo(); // stops the video immediately
}
```
The overlay is **injected directly into YouTube's DOM** — it sits on top of everything using `z-index: 2147483647` (the maximum possible value).

---

### 6. `content/distraction_content.js` — Instagram, Twitter, Netflix, etc.

Simpler than the YouTube script. When the page loads during a session:

```js
function init() {
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
    if (res.session.mode === 'strict') {
      showStrictBlock(siteName); // full block overlay
    } else {
      showSmartWarning(siteName); // gentle reminder toast
    }
  });
}
```

No classification needed here — these sites are **always considered distracting** by definition.

---

### 7. `content/content.css` — The Overlay Styles

All the visual magic for the injected UI. Key design decisions:

```css
/* Blur the entire screen */
.focus-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 10, 0.87);
  backdrop-filter: blur(18px); /* frosted glass effect */
}

/* Card animates in with spring bounce */
@keyframes focus-card-in {
  from { transform: scale(0.85) translateY(20px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

/* Warning toast slides up from bottom */
@keyframes focus-slide-up {
  from { transform: translateX(-50%) translateY(80px); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0); opacity: 1; }
}
```

---

### 8. `popup/popup.html` + `popup.css` — The Control Panel

The popup has **two views**:

1. **Setup View** (when no session is active):
   - Duration picker (preset buttons + custom input)
   - Mode selector (Smart / Strict cards)
   - Start button

2. **Active View** (during a session):
   - Animated SVG ring timer (fills as time passes)
   - Live stats: Blocked / Allowed / Tab Switches
   - Mode badge + Stop button

Key CSS technique for the dark premium look:
```css
/* Gradient text for the logo */
.fp-logo-text {
  background: linear-gradient(135deg, #fff 0%, #00c896 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Pulsing dot during active session */
@keyframes fp-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(0,200,150,0.25); }
  50%       { box-shadow: 0 0 18px rgba(0,200,150,0.5); }
}
```

---

### 9. `popup/popup.js` — The Controller

Handles user interaction in the popup:

```js
// When user clicks Start
document.getElementById('startBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { type: 'START_SESSION', duration: selectedDuration, mode: selectedMode },
    (res) => showActiveView(res.session) // switch to timer view
  );
});
```

**The Ring Timer** — calculates how much of the circle to fill:
```js
const RING_CIRCUMFERENCE = 326.7; // 2π × radius(52px)

function tick() {
  const remaining = session.endTime - Date.now();
  const fraction = remaining / totalMs;
  // Higher fraction = more ring visible
  ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  ringTime.textContent = `${mins}:${secs}`;
}
setInterval(tick, 1000);
```

**State restoration** — if you close and reopen the popup mid-session:
```js
chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
  if (res.session?.active && Date.now() < res.session.endTime) {
    showActiveView(res.session); // resume the timer where it left off
  }
});
```

---

## 🔄 Full Flow — Step by Step

```
1. User clicks 🧠 icon → popup.html opens

2. User picks: 45 mins, Smart Filter → clicks Start

3. popup.js → sends 'START_SESSION' to background.js

4. background.js:
   - Saves session to chrome.storage
   - Creates alarm for 45 mins from now
   - Sets badge dot to green 🟢

5. User opens YouTube

6. Chrome injects classifier.js + content.js into the YouTube tab

7. content.js reads the video title using MutationObserver

8. classifier.js scores the title:
   "React JS Full Course" → study ✅

9. content.js sends 'CONTENT_CLASSIFIED' to background.js

10. background.js → decideAction('smart', 'study') → returns 'allow'

11. content.js shows ✅ "Allowed by Focus" badge (fades after 3s)

---

12. User switches to YouTube funny video:
   "Try Not To Laugh #42" → distraction 🚫

13. background.js → returns 'block'

14. content.js:
   - Pauses the video
   - Injects blur overlay with "Go Back / Continue Anyway"

---

15. 45 minutes pass → Chrome alarm fires

16. background.js:
   - Sets session.active = false in storage
   - Sends 'SESSION_ENDED' message to all tabs
   - Shows Chrome notification: "🎉 Session Complete!"

17. content.js receives SESSION_ENDED → shows celebration banner
```

---

## 🧩 Chrome APIs Used

| API | Where | What it does |
|---|---|---|
| `chrome.storage.local` | background + popup + content | Share session state across all scripts |
| `chrome.tabs.onActivated` | background | Detect tab switches |
| `chrome.alarms` | background | End session after timer |
| `chrome.notifications` | background | System-level alerts |
| `chrome.runtime.sendMessage` | all scripts | Scripts talk to each other |
| `chrome.tabs.sendMessage` | background → content | Push events to open tabs |
| `MutationObserver` (Web API) | content.js | Watch for YouTube title changes |

---

## 🚀 Phase Roadmap

| Phase | What gets added |
|---|---|
| **Now (MVP)** | Keyword classifier, YouTube overlay, tab tracking |
| **Phase 2** | LLM API (Gemini/GPT) for smarter classification |
| **Phase 3** | Pattern learning ("you distract after 20 mins") |
| **Phase 4** | Cross-device sync, Mobile companion app |
| **Phase 5** | Personal AI coach that adapts to your behavior |
