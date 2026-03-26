module.exports = {
  API_BASE: process.env.TIME_AGENT_API_URL || 'http://127.0.0.1:8000/api/v1',
  HEARTBEAT_INTERVAL: 30000,
  SYNC_INTERVAL: 60000,
  IDLE_THRESHOLD: 600,
  TRACKING_INTERVAL: 5000,
  IDLE_CHECK_INTERVAL: 10000,
  IDLE_POPUP_TIMEOUT: 300000,
  APP_NAME: 'EMS Time Agent',

  // Screenshot capture
  SCREENSHOT_INTERVAL: 600000,     // 10 minutes (base interval)
  SCREENSHOT_RANDOMIZE: true,      // Randomize within +/- 2 minutes
  SCREENSHOT_QUALITY: 70,          // JPEG quality 0-100
  SCREENSHOT_NOTIFY: true,         // Show notification on capture
  SCREENSHOT_DIR: 'time-agent-screenshots', // Temp subdirectory name

  // Activity estimation (from idle time patterns)
  ACTIVITY_ESTIMATE_ENABLED: true, // Enable keystroke/click estimation
};
