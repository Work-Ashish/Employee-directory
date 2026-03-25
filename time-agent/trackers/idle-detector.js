const { powerMonitor, BrowserWindow } = require('electron');
const path = require('path');
const config = require('../config');

let checkInterval = null;
let isRunning = false;
let isIdle = false;
let idleStartTime = null;
let idleEvents = [];
let idlePopupWindow = null;
let popupTimeout = null;
let parentWindow = null;

/**
 * Start monitoring system idle time.
 * @param {BrowserWindow} mainWin - Reference to main window for IPC
 */
function start(mainWin) {
  if (isRunning) return;
  isRunning = true;
  parentWindow = mainWin;

  checkInterval = setInterval(checkIdle, config.IDLE_CHECK_INTERVAL);
}

/**
 * Stop idle detection and close any open popup.
 */
function stop() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(checkInterval);
  checkInterval = null;
  closePopup();
}

/**
 * Check system idle time and trigger popup if threshold exceeded.
 */
function checkIdle() {
  const idleSeconds = powerMonitor.getSystemIdleTime();

  if (!isIdle && idleSeconds >= config.IDLE_THRESHOLD) {
    isIdle = true;
    idleStartTime = Date.now() - idleSeconds * 1000;
    showIdlePopup(idleSeconds);
  } else if (isIdle && idleSeconds < 30) {
    // User came back from idle but didn't answer popup yet
    if (!idlePopupWindow) {
      // Popup was never shown or already closed; auto-record as break
      recordIdleEvent('NO_RESPONSE', '');
    }
  }
}

/**
 * Show the idle detection popup window.
 * @param {number} idleSeconds - How long the user has been idle
 */
function showIdlePopup(idleSeconds) {
  if (idlePopupWindow) return;

  idlePopupWindow = new BrowserWindow({
    width: 420,
    height: 340,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    skipTaskbar: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  idlePopupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'idle-popup.html'));

  idlePopupWindow.webContents.on('did-finish-load', () => {
    const minutes = Math.floor(idleSeconds / 60);
    idlePopupWindow.webContents.send('idle:detected', { minutes });
  });

  idlePopupWindow.on('closed', () => {
    idlePopupWindow = null;
  });

  // Auto-close after 5 minutes with NO_RESPONSE
  popupTimeout = setTimeout(() => {
    recordIdleEvent('NO_RESPONSE', '');
    closePopup();
  }, config.IDLE_POPUP_TIMEOUT);
}

/**
 * Close the idle popup window.
 */
function closePopup() {
  if (popupTimeout) {
    clearTimeout(popupTimeout);
    popupTimeout = null;
  }
  if (idlePopupWindow && !idlePopupWindow.isDestroyed()) {
    idlePopupWindow.close();
  }
  idlePopupWindow = null;
}

/**
 * Handle user response to the idle popup.
 * @param {'WORKING'|'BREAK'|'NO_RESPONSE'} response
 * @param {string} description - Work description if response is WORKING
 */
function handleResponse(response, description) {
  recordIdleEvent(response, description || '');
  closePopup();
}

/**
 * Record an idle event.
 * @param {'WORKING'|'BREAK'|'NO_RESPONSE'} response
 * @param {string} description
 */
function recordIdleEvent(response, description) {
  if (!idleStartTime) return;

  const now = Date.now();
  const durationSeconds = Math.round((now - idleStartTime) / 1000);

  idleEvents.push({
    started_at: new Date(idleStartTime).toISOString(),
    duration_seconds: durationSeconds,
    response: response,
    work_description: description,
  });

  // Reset idle state
  isIdle = false;
  idleStartTime = null;

  // Notify main window about the resolution
  if (parentWindow && !parentWindow.isDestroyed()) {
    parentWindow.webContents.send('status:update', { idleResolved: true });
  }
}

/**
 * Get all recorded idle events since last reset.
 * @returns {Array}
 */
function getIdleEvents() {
  return [...idleEvents];
}

/**
 * Check if user is currently idle.
 * @returns {boolean}
 */
function isCurrentlyIdle() {
  return isIdle;
}

/**
 * Reset idle events after a successful sync.
 */
function reset() {
  idleEvents = [];
}

module.exports = { start, stop, handleResponse, getIdleEvents, isCurrentlyIdle, reset };
