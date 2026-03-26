const fetch = require('node-fetch');
const fs = require('fs');
const config = require('../config');
const auth = require('../auth');
const appTracker = require('./app-tracker');
const idleDetector = require('./idle-detector');
const screenshotCapture = require('./screenshot-capture');

let syncInterval = null;
let heartbeatInterval = null;
let isRunning = false;
let sessionStartTime = null;
let lastSyncTime = null;
let pendingPayloads = [];
let onSyncCallback = null;
let cachedDeviceId = null;

/**
 * Start the sync engine: periodic heartbeats and data syncs.
 * @param {Function} [onSync] - Optional callback after each sync attempt
 */
function start(onSync) {
  if (isRunning) return;
  isRunning = true;
  sessionStartTime = new Date().toISOString();
  onSyncCallback = onSync || null;

  // Send heartbeat every 30 seconds
  heartbeatInterval = setInterval(sendHeartbeat, config.HEARTBEAT_INTERVAL);

  // Sync tracking data every 60 seconds
  syncInterval = setInterval(syncData, config.SYNC_INTERVAL);

  // Send initial heartbeat
  sendHeartbeat();
}

/**
 * Stop the sync engine. Performs a final sync before stopping.
 */
async function stop() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(syncInterval);
  clearInterval(heartbeatInterval);
  syncInterval = null;
  heartbeatInterval = null;

  // Final sync
  await syncData();
}

/**
 * Send a heartbeat to the backend.
 */
async function sendHeartbeat() {
  try {
    const headers = await auth.getAuthHeaders();
    const body = {
      machine_id: getMachineId(),
      timestamp: new Date().toISOString(),
    };
    if (cachedDeviceId) {
      body.device_id = cachedDeviceId;
    }
    await fetch(`${config.API_BASE}/agent/heartbeat/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Heartbeat failures are non-critical; will retry next interval
  }
}

/**
 * Get the device ID for this machine, registering if needed.
 * Caches the result so registration only happens once per session.
 * @returns {Promise<string|null>}
 */
async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  // Try to register (idempotent) and cache the returned device ID
  try {
    const os = require('os');
    const headers = await auth.getAuthHeaders();
    const res = await fetch(`${config.API_BASE}/agent/register/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        machine_id: getMachineId(),
        device_name: os.hostname(),
        platform: process.platform,
        os_version: os.release(),
        agent_version: '1.0.0',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      cachedDeviceId = data.id || null;
    }
  } catch {
    // Will retry on next sync
  }
  return cachedDeviceId;
}

/**
 * Collect tracking data and sync to the backend.
 */
async function syncData() {
  const appUsage = appTracker.getAppUsageData();
  const idleEvents = idleDetector.getIdleEvents();

  // Skip sync if there is no data to send
  if (appUsage.length === 0 && idleEvents.length === 0 && pendingPayloads.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const totalAppSeconds = appUsage.reduce((sum, a) => sum + a.total_seconds, 0);
  const totalIdleSeconds = idleEvents.reduce((sum, e) => sum + e.duration_seconds, 0);

  // Upload pending screenshots and collect URLs
  const screenshotEntries = await uploadPendingScreenshots();

  const session = {
    started_at: sessionStartTime,
    ended_at: now,
    active_seconds: Math.max(0, totalAppSeconds - totalIdleSeconds),
    idle_seconds: totalIdleSeconds,
    keystrokes: appTracker.getEstimatedKeystrokes(),
    mouse_clicks: appTracker.getEstimatedMouseClicks(),
    app_usages: appUsage,
    website_visits: extractWebsiteVisits(appUsage),
    idle_events: idleEvents,
    screenshots: screenshotEntries,
  };

  // device_id is required by the Django IngestBulkSerializer
  const deviceId = await getDeviceId();
  if (!deviceId) {
    // Device not registered yet — store for retry
    pendingPayloads.push({ sessions: [session] });
    if (pendingPayloads.length > 100) pendingPayloads.shift();
    appTracker.reset();
    idleDetector.reset();
    sessionStartTime = new Date().toISOString();
    if (onSyncCallback) {
      onSyncCallback({ success: false, lastSyncTime, pendingCount: pendingPayloads.length });
    }
    return;
  }
  const payload = { device_id: deviceId, sessions: [session] };

  // Add any pending payloads from previous failed syncs
  if (pendingPayloads.length > 0) {
    for (const pending of pendingPayloads) {
      payload.sessions.push(...pending.sessions);
    }
  }

  const success = await sendPayload(payload);

  if (success) {
    // Clear buffers on success
    appTracker.reset();
    idleDetector.reset();
    pendingPayloads = [];
    lastSyncTime = now;
    sessionStartTime = now;
  } else {
    // Keep data for retry; store current session as pending
    pendingPayloads.push({ sessions: [session] });
    if (pendingPayloads.length > 100) pendingPayloads.shift();
    // Still reset trackers to avoid double-counting
    appTracker.reset();
    idleDetector.reset();
    sessionStartTime = now;
  }

  if (onSyncCallback) {
    onSyncCallback({ success, lastSyncTime, pendingCount: pendingPayloads.length });
  }
}

/**
 * Send payload to the Django ingest endpoint.
 * @param {object} payload
 * @returns {Promise<boolean>}
 */
async function sendPayload(payload) {
  try {
    const headers = await auth.getAuthHeaders();
    const res = await fetch(`${config.API_BASE}/agent/ingest/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      // Token expired, try refresh
      const refreshed = await auth.refreshToken();
      if (refreshed) {
        const newHeaders = await auth.getAuthHeaders();
        const retryRes = await fetch(`${config.API_BASE}/agent/ingest/`, {
          method: 'POST',
          headers: newHeaders,
          body: JSON.stringify(payload),
        });
        return retryRes.ok;
      }
      return false;
    }

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Upload pending screenshots via multipart POST and return entries for the ingest payload.
 * Each uploaded screenshot gets back a URL from the server.
 * @returns {Promise<Array<{ image_url: string, captured_at: string }>>}
 */
async function uploadPendingScreenshots() {
  const pending = screenshotCapture.getPendingScreenshots();
  if (pending.length === 0) return [];

  const entries = [];
  const uploaded = [];

  for (const shot of pending) {
    try {
      const url = await uploadScreenshotFile(shot.filePath);
      if (url) {
        entries.push({ image_url: url, captured_at: shot.capturedAt });
        uploaded.push(shot.filePath);
      }
    } catch {
      // Skip failed uploads; will retry next cycle
    }
  }

  // Clean up uploaded files
  if (uploaded.length > 0) {
    screenshotCapture.clearUploaded(uploaded);
  }

  return entries;
}

/**
 * Upload a single screenshot file to the backend.
 * @param {string} filePath
 * @returns {Promise<string|null>} The URL of the uploaded screenshot, or null on failure
 */
async function uploadScreenshotFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const fileName = require('path').basename(filePath);

    const headers = await auth.getAuthHeaders();
    const res = await fetch(`${config.API_BASE}/agent/screenshot/upload/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: fileName,
        data: base64,
        captured_at: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      const body = await res.json();
      return body.url || body.image_url || null;
    }

    if (res.status === 401) {
      const refreshed = await auth.refreshToken();
      if (refreshed) {
        const newHeaders = await auth.getAuthHeaders();
        const retryRes = await fetch(`${config.API_BASE}/agent/screenshot/upload/`, {
          method: 'POST',
          headers: newHeaders,
          body: JSON.stringify({
            filename: fileName,
            data: base64,
            captured_at: new Date().toISOString(),
          }),
        });
        if (retryRes.ok) {
          const body = await retryRes.json();
          return body.url || body.image_url || null;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract website visits from browser app usage based on window titles.
 * @param {Array} appUsage
 * @returns {Array}
 */
function extractWebsiteVisits(appUsage) {
  const browserApps = ['chrome', 'firefox', 'edge', 'msedge', 'safari', 'brave', 'opera', 'arc'];
  const visits = [];

  for (const usage of appUsage) {
    const appLower = (usage.app_name || '').toLowerCase();
    if (!browserApps.some((b) => appLower.includes(b))) continue;

    // Try to extract domain from window title (browsers typically show "Page Title - Domain")
    const titles = (usage.window_title || '').split(' | ');
    for (const title of titles) {
      const domainMatch = title.match(
        /[-\u2013\u2014]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*[-\u2013\u2014]?/
      );
      if (domainMatch) {
        visits.push({
          domain: domainMatch[1],
          total_seconds: Math.round(usage.total_seconds / titles.length),
          category: 'browser',
        });
      }
    }
  }

  return visits;
}

/**
 * Force an immediate sync.
 */
async function forceSync() {
  await syncData();
}

/**
 * Register this device with the backend.
 * @returns {Promise<boolean>}
 */
async function registerDevice() {
  try {
    const os = require('os');
    const headers = await auth.getAuthHeaders();
    const res = await fetch(`${config.API_BASE}/agent/register/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        machine_id: getMachineId(),
        device_name: os.hostname(),
        platform: process.platform,
        os_version: os.release(),
        agent_version: '1.0.0',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      cachedDeviceId = data.id || null;
    }
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Generate a simple machine identifier.
 * @returns {string}
 */
function getMachineId() {
  const os = require('os');
  const crypto = require('crypto');
  const info = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || ''}`;
  return crypto.createHash('sha256').update(info).digest('hex').substring(0, 32);
}

/**
 * Get the last successful sync time.
 * @returns {string|null}
 */
function getLastSyncTime() {
  return lastSyncTime;
}

/**
 * Get the count of pending (unsent) payloads.
 * @returns {number}
 */
function getPendingCount() {
  return pendingPayloads.length;
}

module.exports = {
  start,
  stop,
  forceSync,
  registerDevice,
  getLastSyncTime,
  getPendingCount,
};
