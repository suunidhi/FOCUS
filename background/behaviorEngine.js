// ============================================================
// FOCUS - Behavior Engine
// Tracks tab-switch patterns and decides when to alert
// ============================================================

export class BehaviorEngine {
  constructor() {
    this.switchCount = 0;
    this.lastAlertAt = 0;
    this.ALERT_THRESHOLD = 5;       // switches before alerting
    this.COOLDOWN_MS = 60 * 1000;   // 1 min between alerts
  }

  reset() {
    this.switchCount = 0;
    this.lastAlertAt = 0;
  }

  /**
   * @param {number} recentSwitches - switches in last 2 mins
   * @returns {boolean} true if should alert
   */
  analyzeSwitches(recentSwitches) {
    const now = Date.now();
    const cooledDown = now - this.lastAlertAt > this.COOLDOWN_MS;

    if (recentSwitches >= this.ALERT_THRESHOLD && cooledDown) {
      this.lastAlertAt = now;
      return true;
    }
    return false;
  }
}
