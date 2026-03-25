const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  Notification,
} = require('electron');
const path = require('path');
const config = require('./config');
const auth = require('./auth');
const appTracker = require('./trackers/app-tracker');
const idleDetector = require('./trackers/idle-detector');
const syncEngine = require('./trackers/sync-engine');
const screenshotCapture = require('./trackers/screenshot-capture');

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let tray = null;
let mainWindow = null;
let loginWindow = null;
let isPaused = false;
let isTracking = false;
let statusUpdateInterval = null;

// ─── App lifecycle ───────────────────────────────────────────────

app.whenReady().then(() => {
  createTray();

  if (auth.isLoggedIn()) {
    startTracking();
    createMainWindow();
  } else {
    createLoginWindow();
  }
});

app.on('window-all-closed', (e) => {
  // Don't quit when windows close; keep running in tray
  e.preventDefault();
});

app.on('before-quit', async () => {
  if (isTracking) {
    await stopTracking();
  }
});

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show();
    loginWindow.focus();
  }
});

// ─── Tray ────────────────────────────────────────────────────────

function createTray() {
  // Create a simple 16x16 clock icon programmatically
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) throw new Error('empty');
  } catch {
    // Fallback: create a simple colored square as tray icon
    trayIcon = nativeImage.createFromBuffer(createFallbackIcon());
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip(config.APP_NAME);
  updateTrayMenu();

  tray.on('click', () => {
    if (auth.isLoggedIn()) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createMainWindow();
      } else {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    }
  });
}

function updateTrayMenu() {
  const loggedIn = auth.isLoggedIn();
  const template = [];

  if (loggedIn) {
    template.push(
      {
        label: isTracking && !isPaused ? 'Status: Tracking' : 'Status: Paused',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open Status',
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
          else mainWindow.show();
        },
      },
      {
        label: isPaused ? 'Resume Tracking' : 'Pause Tracking',
        click: () => (isPaused ? resumeTracking() : pauseTracking()),
      },
      {
        label: 'Sync Now',
        click: () => syncEngine.forceSync(),
      },
      { type: 'separator' },
      {
        label: 'Logout',
        click: handleLogout,
      }
    );
  } else {
    template.push({
      label: 'Login',
      click: () => {
        if (!loginWindow || loginWindow.isDestroyed()) createLoginWindow();
        else loginWindow.show();
      },
    });
  }

  template.push({ type: 'separator' }, { label: 'Quit', click: () => app.quit() });

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

/**
 * Create a simple 16x16 PNG buffer as fallback tray icon.
 * @returns {Buffer}
 */
function createFallbackIcon() {
  // Minimal 16x16 RGBA BMP-like buffer that Electron can parse.
  // We use nativeImage.createFromBuffer with raw RGBA data.
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Green circle on transparent background
      const cx = x - 7.5;
      const cy = y - 7.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < 7) {
        buf[i] = 76;     // R
        buf[i + 1] = 175; // G
        buf[i + 2] = 80;  // B
        buf[i + 3] = 255; // A
      } else {
        buf[i + 3] = 0;   // Transparent
      }
    }
  }
  return nativeImage
    .createFromBitmap(buf, { width: size, height: size })
    .toPNG();
}

// ─── Windows ─────────────────────────────────────────────────────

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 380,
    height: 480,
    resizable: false,
    frame: false,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    sendStatusToRenderer();
  });

  mainWindow.on('blur', () => {
    // Hide when clicking away, like a tray popup
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show();
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 400,
    height: 520,
    resizable: false,
    frame: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loginWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'));

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

// ─── Tracking lifecycle ──────────────────────────────────────────

async function startTracking() {
  if (isTracking) return;
  isTracking = true;
  isPaused = false;

  // Register device with backend (non-blocking)
  syncEngine.registerDevice().catch(() => {});

  // Start all trackers
  appTracker.start();
  idleDetector.start(mainWindow);
  screenshotCapture.start();
  syncEngine.start((syncResult) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status:update', {
        lastSync: syncResult.lastSyncTime,
        syncSuccess: syncResult.success,
        pendingCount: syncResult.pendingCount,
      });
    }
  });

  // Periodic status updates to renderer
  statusUpdateInterval = setInterval(sendStatusToRenderer, 10000);

  updateTrayMenu();
  showNotification('Tracking Started', 'Your activity is now being tracked.');
}

async function stopTracking() {
  if (!isTracking) return;
  isTracking = false;

  clearInterval(statusUpdateInterval);
  statusUpdateInterval = null;

  appTracker.stop();
  idleDetector.stop();
  screenshotCapture.stop();
  await syncEngine.stop();

  updateTrayMenu();
}

function pauseTracking() {
  if (isPaused || !isTracking) return;
  isPaused = true;

  appTracker.stop();
  idleDetector.stop();
  screenshotCapture.stop();

  updateTrayMenu();
  sendStatusToRenderer();
  showNotification('Tracking Paused', 'Activity tracking is paused.');

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracking:state-change', { paused: true });
  }
}

function resumeTracking() {
  if (!isPaused || !isTracking) return;
  isPaused = false;

  appTracker.start();
  idleDetector.start(mainWindow);
  screenshotCapture.start();

  updateTrayMenu();
  sendStatusToRenderer();
  showNotification('Tracking Resumed', 'Activity tracking has resumed.');

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracking:state-change', { paused: false });
  }
}

async function handleLogout() {
  await stopTracking();
  auth.logout();
  updateTrayMenu();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  createLoginWindow();
}

// ─── Status ──────────────────────────────────────────────────────

function sendStatusToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const currentApp = appTracker.getCurrentApp();
  const userInfo = auth.getUserInfo();

  mainWindow.webContents.send('status:update', {
    tracking: isTracking,
    paused: isPaused,
    currentApp: currentApp.app,
    currentTitle: currentApp.title,
    lastSync: syncEngine.getLastSyncTime(),
    pendingCount: syncEngine.getPendingCount(),
    email: userInfo.email,
    idle: idleDetector.isCurrentlyIdle(),
  });
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────

ipcMain.handle('auth:login', async (_event, tenantSlug, email, password) => {
  const result = await auth.login(tenantSlug, email, password);
  if (result.success) {
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close();
    }
    await startTracking();
    createMainWindow();
  }
  return result;
});

ipcMain.handle('auth:logout', async () => {
  await handleLogout();
  return { success: true };
});

ipcMain.handle('auth:is-logged-in', () => {
  return auth.isLoggedIn();
});

ipcMain.handle('auth:user-info', () => {
  return auth.getUserInfo();
});

ipcMain.handle('tracking:pause', () => {
  pauseTracking();
  return { paused: true };
});

ipcMain.handle('tracking:resume', () => {
  resumeTracking();
  return { paused: false };
});

ipcMain.handle('tracking:status', () => {
  const currentApp = appTracker.getCurrentApp();
  return {
    tracking: isTracking,
    paused: isPaused,
    currentApp: currentApp.app,
    currentTitle: currentApp.title,
    lastSync: syncEngine.getLastSyncTime(),
    pendingCount: syncEngine.getPendingCount(),
    idle: idleDetector.isCurrentlyIdle(),
  };
});

ipcMain.handle('tracking:force-sync', async () => {
  await syncEngine.forceSync();
  return { success: true, lastSync: syncEngine.getLastSyncTime() };
});

ipcMain.handle('idle:response', (_event, response, description) => {
  idleDetector.handleResponse(response, description);
  return { success: true };
});
