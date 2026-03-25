const { execSync } = require('child_process');
const config = require('../config');

let trackingInterval = null;
let appUsageMap = {};      // { appName: { totalSeconds, titles: Set } }
let currentApp = null;
let currentTitle = '';
let lastCheckTime = null;
let isRunning = false;

// Activity estimation state
let lastIdleTime = 0;
let estimatedKeystrokes = 0;
let estimatedMouseClicks = 0;

/**
 * Get the currently active window on Windows using PowerShell.
 * Falls back gracefully on error or non-Windows platforms.
 * @returns {{ app: string, title: string }}
 */
function getActiveWindow() {
  if (process.platform === 'win32') {
    try {
      const ps = [
        '$ErrorActionPreference="SilentlyContinue"',
        'Add-Type -TypeDefinition @"',
        'using System;',
        'using System.Runtime.InteropServices;',
        'using System.Text;',
        'public class WinAPI {',
        '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
        '  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder t, int c);',
        '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);',
        '}',
        '"@',
        '$h=[WinAPI]::GetForegroundWindow()',
        '$t=New-Object Text.StringBuilder 512',
        '[void][WinAPI]::GetWindowText($h,$t,512)',
        '$pid=0;[void][WinAPI]::GetWindowThreadProcessId($h,[ref]$pid)',
        '$p=Get-Process -Id $pid -EA 0',
        '[PSCustomObject]@{app=$p.ProcessName;title=$t.ToString()}|ConvertTo-Json -Compress',
      ].join(';');

      const result = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`,
        { encoding: 'utf8', timeout: 3000, windowsHide: true }
      );
      const data = JSON.parse(result.trim());
      return {
        app: data.app || 'Unknown',
        title: data.title || '',
      };
    } catch {
      return { app: 'Unknown', title: '' };
    }
  }

  if (process.platform === 'darwin') {
    try {
      const script =
        'tell application "System Events" to get {name, title} of first application process whose frontmost is true';
      const result = execSync(`osascript -e '${script}'`, {
        encoding: 'utf8',
        timeout: 3000,
      });
      const parts = result.trim().split(', ');
      return { app: parts[0] || 'Unknown', title: parts[1] || '' };
    } catch {
      return { app: 'Unknown', title: '' };
    }
  }

  return { app: 'Unknown', title: '' };
}

/**
 * Record time spent on the current app since last check.
 * Also estimates keystrokes and mouse clicks from idle time patterns.
 */
function recordAppTime() {
  const now = Date.now();
  const win = getActiveWindow();

  if (lastCheckTime && currentApp) {
    const elapsed = (now - lastCheckTime) / 1000;
    if (!appUsageMap[currentApp]) {
      appUsageMap[currentApp] = { totalSeconds: 0, titles: new Set() };
    }
    appUsageMap[currentApp].totalSeconds += elapsed;
    if (currentTitle) {
      appUsageMap[currentApp].titles.add(currentTitle);
    }
  }

  // Estimate activity from idle time patterns
  if (config.ACTIVITY_ESTIMATE_ENABLED) {
    estimateActivity();
  }

  currentApp = win.app;
  currentTitle = win.title;
  lastCheckTime = now;
}

/**
 * Estimate keystrokes and mouse clicks from system idle time.
 *
 * Strategy: check powerMonitor.getSystemIdleTime(). If idle time is very low
 * (0-2 seconds), the user is actively typing/clicking. We estimate input
 * events proportional to the check interval and the non-idle time.
 *
 * Average typing speed: ~200 chars/min = ~3.3 chars/sec
 * Average mouse clicks: ~0.5 clicks/sec during active use
 */
function estimateActivity() {
  try {
    const { powerMonitor } = require('electron');
    const currentIdle = powerMonitor.getSystemIdleTime();
    const checkIntervalSec = config.TRACKING_INTERVAL / 1000;

    // If idle time is less than the check interval, user was active
    // during (checkInterval - idleTime) seconds
    if (currentIdle < checkIntervalSec) {
      const activeSeconds = checkIntervalSec - currentIdle;
      // ~3.3 keystrokes/sec, ~0.5 clicks/sec during active time
      estimatedKeystrokes += Math.round(activeSeconds * 3.3);
      estimatedMouseClicks += Math.round(activeSeconds * 0.5);
    }

    lastIdleTime = currentIdle;
  } catch {
    // powerMonitor not available in all contexts
  }
}

/**
 * Start tracking active window usage.
 */
function start() {
  if (isRunning) return;
  isRunning = true;
  lastCheckTime = Date.now();

  // Do an initial capture
  const win = getActiveWindow();
  currentApp = win.app;
  currentTitle = win.title;

  trackingInterval = setInterval(recordAppTime, config.TRACKING_INTERVAL);
}

/**
 * Stop tracking.
 */
function stop() {
  if (!isRunning) return;
  // Record final interval before stopping
  recordAppTime();
  clearInterval(trackingInterval);
  trackingInterval = null;
  isRunning = false;
}

/**
 * Get accumulated app usage data and format for the sync payload.
 * @returns {Array<{ app_name: string, window_title: string, total_seconds: number, category: string }>}
 */
function getAppUsageData() {
  const result = [];
  for (const [appName, data] of Object.entries(appUsageMap)) {
    const titles = Array.from(data.titles);
    result.push({
      app_name: appName,
      window_title: titles.slice(0, 5).join(' | '),
      total_seconds: Math.round(data.totalSeconds),
      category: categorizeApp(appName),
    });
  }
  return result;
}

/**
 * Get the currently tracked app name and title.
 * @returns {{ app: string, title: string }}
 */
function getCurrentApp() {
  return { app: currentApp || 'None', title: currentTitle || '' };
}

/**
 * Get estimated keystroke count since last reset.
 * @returns {number}
 */
function getEstimatedKeystrokes() {
  return estimatedKeystrokes;
}

/**
 * Get estimated mouse click count since last reset.
 * @returns {number}
 */
function getEstimatedMouseClicks() {
  return estimatedMouseClicks;
}

/**
 * Reset accumulated data after a successful sync.
 */
function reset() {
  appUsageMap = {};
  estimatedKeystrokes = 0;
  estimatedMouseClicks = 0;
}

/**
 * Categorize an app into a broad category.
 * @param {string} appName
 * @returns {string}
 */
function categorizeApp(appName) {
  const name = (appName || '').toLowerCase();

  const categories = {
    development: [
      'code', 'vscode', 'visual studio', 'intellij', 'webstorm', 'pycharm',
      'sublime', 'atom', 'vim', 'nvim', 'terminal', 'cmd', 'powershell',
      'wt', 'git', 'postman', 'insomnia', 'docker', 'devtools',
    ],
    communication: [
      'slack', 'teams', 'discord', 'zoom', 'meet', 'skype', 'outlook',
      'thunderbird', 'telegram', 'whatsapp',
    ],
    browser: [
      'chrome', 'firefox', 'edge', 'msedge', 'safari', 'brave', 'opera', 'arc',
    ],
    productivity: [
      'excel', 'word', 'powerpoint', 'notion', 'obsidian', 'onenote',
      'figma', 'canva', 'sheets', 'docs',
    ],
    entertainment: [
      'spotify', 'netflix', 'youtube', 'vlc', 'media player',
    ],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

module.exports = {
  start,
  stop,
  getAppUsageData,
  getCurrentApp,
  getEstimatedKeystrokes,
  getEstimatedMouseClicks,
  reset,
};
