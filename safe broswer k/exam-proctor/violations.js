// Violation types and their cheat score weights
const VIOLATION_WEIGHTS = {
  TAB_SWITCH:       2,
  WINDOW_BLUR:      2,
  FULLSCREEN_EXIT:  3,
  NO_FACE:          5,
  MULTIPLE_FACES:  10,
  LOOKING_AWAY:     3,
  MOBILE_DETECTED:  8,
  EXTRA_PERSON:    10
};

class ViolationLogger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.totalScore = 0;
    this.log = [];
    // Throttle: don't log same event more than once per N seconds
    this._lastLogged = {};
    this._throttleMs = 5000;
  }

  async record(type, detail = '') {
    const now = Date.now();
    const lastTime = this._lastLogged[type] || 0;
    if (now - lastTime < this._throttleMs) return; // throttled
    this._lastLogged[type] = now;

    const score = VIOLATION_WEIGHTS[type] || 1;
    this.totalScore += score;
    const entry = { type, detail, score, timestamp: new Date().toISOString() };
    this.log.push(entry);

    // Show banner
    showViolationBanner(type);

    // Send to server
    try {
      await fetch('/api/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, type, detail, score })
      });
    } catch (e) {
      console.warn('Could not send violation to server:', e);
    }
  }

  getScore() { return this.totalScore; }
}

function showViolationBanner(type) {
  const messages = {
    TAB_SWITCH:      '⚠️ Tab switch detected',
    WINDOW_BLUR:     '⚠️ Window focus lost',
    FULLSCREEN_EXIT: '⚠️ Fullscreen exited',
    NO_FACE:         '⚠️ Face not detected — please stay in frame',
    MULTIPLE_FACES:  '🚨 Multiple faces detected',
    LOOKING_AWAY:    '⚠️ Please look at the screen',
    MOBILE_DETECTED: '🚨 Mobile phone detected in frame',
    EXTRA_PERSON:    '🚨 Another person detected in frame'
  };
  const banner = document.getElementById('violation-banner');
  if (!banner) return;
  banner.textContent = messages[type] || '⚠️ Suspicious activity detected';
  banner.style.display = 'block';
  banner.style.animation = 'none';
  // Restart animation
  void banner.offsetWidth;
  banner.style.animation = 'fadeOut 3s forwards';
  setTimeout(() => { banner.style.display = 'none'; }, 3000);
}
