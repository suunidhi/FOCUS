# 🧠 Focus — AI Attention Guard

> **"A personal AI that protects your time like a bodyguard"**

A startup-level Chrome Extension that uses AI + behavior analysis to protect your attention in real-time. Not just a blocker — a smart system that *understands* what you're doing and intervenes at exactly the right moment.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **Smart Filter** | AI classifies YouTube videos as Study vs Distraction |
| 🔒 **Strict Block** | Hard-blocks all distracting sites |
| ⏱ **Session Timer** | Beautiful animated ring countdown |
| ⚠️ **Tab Switch Detection** | Alerts when losing focus |
| 🎯 **Real-time Overlay** | Blur screen + intervention UI on YouTube |
| 📊 **Live Stats** | Blocked / Allowed / Tab Switches tracked |
| 🔔 **Session End Celebration** | Completion notification + in-page banner |

---

## 📁 File Structure

```
Focus/
├── manifest.json              ← Manifest V3
├── background/
│   ├── background.js          ← Service Worker (session, tracking, alarms)
│   └── behaviorEngine.js      ← Tab-switch pattern detection
├── content/
│   ├── classifier.js          ← AI keyword classifier (Study vs Distraction)
│   ├── content.js             ← YouTube overlay system
│   ├── distraction_content.js ← Instagram/Twitter/Reddit/Netflix/Twitch
│   └── content.css            ← All injected overlay styles
├── popup/
│   ├── popup.html             ← Popup UI
│   ├── popup.css              ← Dark premium theme
│   └── popup.js               ← Timer, session control, stats
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── generate_icons.py          ← Icon generator utility
```

---

##  How to Load (Chrome)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load Unpacked"**
4. Select the `d:\Focus` folder
5.  Focus icon appears in your toolbar!

---

##  How It Works

```
[ Click Extension Popup ]
         ↓
[ Set Duration + Mode ]
         ↓
[ Start Session → Chrome Storage ]
         ↓
[ Background Worker tracks tab switches ]
         ↓
[ Content Script reads YouTube title ]
         ↓
[ Classifier: "study" | "distraction" | "neutral" ]
         ↓
[ Decision: Allow ✅ | Warn ⚠️ | Block 🚫 ]
         ↓
[ Real-time Overlay or Badge shown ]
```

---

##  Modes

###  Smart Filter
- YouTube: classifies video title with AI keyword engine
- Study content: allowed with ✅ badge
- Distraction: blur + overlay with "Go Back" / "Continue Anyway"
- Neutral: soft ⚠️ warning badge
- Other sites: gentle reminder toast

###  Strict Block
- All distracting sites (Instagram, Twitter, Reddit, Netflix, Twitch) → hard blocked
- YouTube shows block overlay regardless of content

---

## Behavior Engine

| Trigger | Action |
|---|---|
| 1–4 tab switches in 2 min | Silent (no interruption) |
| 5+ tab switches in 2 min | Warning toast |
| Session timer ends | Celebration banner + notification |

---

## 🎨 Design Philosophy

- **Dark mode** — easy on eyes during long sessions
- **Minimal** — like MetaMask, not overwhelming
- **Animated** — ring timer, smooth overlays, micro-animations
- **Non-aggressive** — warns before blocks, always gives user agency

---

## 🔜 Roadmap (Phase 2+)

- [ ] LLM-based classification (GPT/Gemini API)
- [ ] Instagram Reels detection
- [ ] Cross-device sync via backend
- [ ] Behavior pattern learning ("you distract after 20 mins")
- [ ] Personal AI productivity coach

---

## 💡 Built With

- **Chrome Extension Manifest V3**
- **Vanilla HTML/CSS/JS** (zero dependencies)
- **Chrome APIs**: `storage`, `tabs`, `notifications`, `alarms`, `scripting`
- **AI Layer**: Keyword classifier (Phase 1 MVP)

---

*Made with 🧠 by a builder(shikhaa) who believes in Focus is key!*
