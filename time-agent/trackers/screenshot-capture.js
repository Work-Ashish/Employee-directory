const path = require('path');
const fs = require('fs');
const config = require('../config');

// Lazy-load Electron modules — desktopCapturer is only available in the main
// process and may throw if loaded in other contexts (e.g. utility processes).
let desktopCapturer, nativeImage, Notification;
try {
  const electron = require('electron');
  desktopCapturer = electron.desktopCapturer;
  nativeImage = electron.nativeImage;
  Notification = electron.Notification;
} catch {
  // Running outside Electron main process — capture will be a no-op
}

let captureTimer = null;
let isRunning = false;
let screenshotDir = '';
let pendingScreenshots = []; // { filePath, capturedAt }

/**
 * Ensure the screenshot temp directory exists.
 * @returns {string} Path to the screenshot directory
 */
function ensureScreenshotDir() {
  if (screenshotDir) return screenshotDir;

  const { app } = require('electron');
  screenshotDir = path.join(app.getPath('temp'), config.SCREENSHOT_DIR);
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  return screenshotDir;
}

/**
 * Get a randomized interval for the next screenshot capture.
 * If SCREENSHOT_RANDOMIZE is true, randomize within +/- 2 minutes of the base interval.
 * @returns {number} Milliseconds until next capture
 */
function getNextInterval() {
  const base = config.SCREENSHOT_INTERVAL;
  if (!config.SCREENSHOT_RANDOMIZE) return base;

  // Randomize within +/- 2 minutes (120000 ms)
  const jitter = 120000;
  const min = Math.max(base - jitter, 60000); // At least 1 minute
  const max = base + jitter;
  return min + Math.floor(Math.random() * (max - min));
}

/**
 * Capture a screenshot of the primary screen.
 * @returns {Promise<{ filePath: string, capturedAt: string } | null>}
 */
async function captureScreenshot() {
  if (!desktopCapturer) {
    // desktopCapturer not available — skip silently
    return null;
  }
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources || sources.length === 0) return null;

    // Use primary screen (first source)
    const source = sources[0];
    const thumbnail = source.thumbnail;

    if (!thumbnail || thumbnail.isEmpty()) return null;

    // Convert to JPEG with configured quality
    const jpegBuffer = thumbnail.toJPEG(config.SCREENSHOT_QUALITY);

    // Save to temp directory
    const dir = ensureScreenshotDir();
    const capturedAt = new Date().toISOString();
    const filename = `screenshot-${Date.now()}.jpg`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, jpegBuffer);

    const entry = { filePath, capturedAt };
    pendingScreenshots.push(entry);

    // Show notification if enabled
    if (config.SCREENSHOT_NOTIFY && Notification && Notification.isSupported()) {
      new Notification({
        title: 'Screenshot Captured',
        body: 'A screenshot of your screen was taken.',
        silent: true,
      }).show();
    }

    return entry;
  } catch (err) {
    // Non-critical; will retry at next interval
    console.error('Screenshot capture failed:', err.message);
    return null;
  }
}

/**
 * Schedule the next screenshot capture with a randomized delay.
 */
function scheduleNext() {
  if (!isRunning) return;

  const delay = getNextInterval();
  captureTimer = setTimeout(async () => {
    await captureScreenshot();
    scheduleNext();
  }, delay);
}

/**
 * Start the screenshot capture loop.
 */
function start() {
  if (isRunning) return;
  isRunning = true;

  // Ensure directory exists on start
  ensureScreenshotDir();

  // Schedule first capture
  scheduleNext();
}

/**
 * Stop the screenshot capture loop.
 */
function stop() {
  if (!isRunning) return;
  isRunning = false;

  if (captureTimer) {
    clearTimeout(captureTimer);
    captureTimer = null;
  }
}

/**
 * Get all pending screenshots that haven't been uploaded yet.
 * @returns {Array<{ filePath: string, capturedAt: string }>}
 */
function getPendingScreenshots() {
  // Filter out any screenshots whose files have been deleted
  pendingScreenshots = pendingScreenshots.filter((s) => {
    try {
      return fs.existsSync(s.filePath);
    } catch {
      return false;
    }
  });
  return [...pendingScreenshots];
}

/**
 * Remove uploaded screenshots from the pending list and delete files.
 * @param {string[]} filePaths - File paths of successfully uploaded screenshots
 */
function clearUploaded(filePaths) {
  const pathSet = new Set(filePaths);
  const remaining = [];

  for (const entry of pendingScreenshots) {
    if (pathSet.has(entry.filePath)) {
      // Delete the file
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
        }
      } catch {
        // Ignore deletion errors
      }
    } else {
      remaining.push(entry);
    }
  }

  pendingScreenshots = remaining;
}

/**
 * Reset all pending screenshots (for testing or cleanup).
 */
function reset() {
  pendingScreenshots = [];
}

module.exports = { start, stop, getPendingScreenshots, clearUploaded, reset };
