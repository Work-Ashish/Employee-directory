# EMS Time Agent

Desktop productivity tracking agent for EMS Pro.

## Features
- Application tracking (active window monitoring)
- Idle detection with break prompts (10-minute threshold)
- Periodic screenshots (randomized, every 8-12 minutes)
- Keystroke and mouse activity estimation
- Auto-sync to Django backend every 60 seconds
- Offline resilience (retry on network failure)
- System tray with pause/resume/logout

## Setup
```bash
cd time-agent
npm install
npm start
```

## Configuration
Edit `config.js`:
- `API_BASE` -- Django server URL (default `http://127.0.0.1:8000/api/v1`)
- `HEARTBEAT_INTERVAL` -- Heartbeat frequency (default 30s)
- `SYNC_INTERVAL` -- Data sync frequency (default 60s)
- `IDLE_THRESHOLD` -- Idle detection threshold (default 600s = 10 min)
- `SCREENSHOT_INTERVAL` -- Screenshot frequency (default 600000ms = 10 min)
- `SCREENSHOT_RANDOMIZE` -- Randomize within +/- 2 minutes (default true)
- `SCREENSHOT_QUALITY` -- JPEG quality 0-100 (default 70)
- `SCREENSHOT_NOTIFY` -- Show notification on capture (default true)
- `TRACKING_INTERVAL` -- Active window polling frequency (default 5s)
- `ACTIVITY_ESTIMATE_ENABLED` -- Enable keystroke/click estimation (default true)

## Build Installers
```bash
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
```

## Architecture

```
time-agent/
  main.js                    # Electron main process, tray, windows, IPC
  auth.js                    # Django JWT login/refresh/logout
  config.js                  # Configuration constants
  preload.js                 # Context bridge for renderer
  trackers/
    app-tracker.js           # Active window monitoring (PowerShell/osascript)
    idle-detector.js         # System idle detection + popup
    screenshot-capture.js    # Periodic screenshot capture via desktopCapturer
    sync-engine.js           # Heartbeat, data sync, screenshot upload
  renderer/
    index.html               # Status dashboard
    login.html               # Login form
    idle-popup.html          # Idle detection popup
  assets/
    icon.png                 # Tray icon
```

## Data Flow

1. **App Tracker** polls the active window every 5 seconds using platform-specific APIs
2. **Idle Detector** checks `powerMonitor.getSystemIdleTime()` every 10 seconds; shows popup after 10 minutes idle
3. **Screenshot Capture** takes a screenshot every 8-12 minutes (randomized); saves to temp directory as JPEG
4. **Sync Engine** uploads all buffered data every 60 seconds:
   - Registers device on first launch (idempotent, returns device ID)
   - Sends heartbeat every 30 seconds
   - Uploads pending screenshots as base64 to `/agent/screenshot/upload/`
   - Sends bulk activity payload to `/agent/ingest/` with device_id, sessions, app usage, website visits, idle events, and screenshot URLs
5. On sync failure, data is queued locally and retried on the next cycle

## Django Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/agent/register/` | Device registration (idempotent) |
| POST | `/api/v1/agent/heartbeat/` | Heartbeat ping |
| POST | `/api/v1/agent/ingest/` | Bulk activity data upload |
| POST | `/api/v1/agent/screenshot/upload/` | Screenshot upload (base64) |
| GET | `/api/v1/agent/commands/` | Poll pending commands |
| GET | `/api/v1/agent/daily-report/` | Employee daily activity report |
| GET | `/api/v1/admin/agent/dashboard/` | Admin dashboard stats |
| GET/POST | `/api/v1/admin/agent/devices/` | Device list / status update |
| POST | `/api/v1/admin/agent/command/` | Issue command to device |

## Authentication

The agent authenticates via Django JWT. Tokens are stored locally using `electron-store`. The agent automatically refreshes tokens 60 seconds before expiry.

Login flow:
1. User enters tenant slug, email, and password in the login window
2. Agent calls `POST /api/v1/auth/login/` with `X-Tenant-Slug` header
3. JWT access and refresh tokens are stored locally
4. All subsequent API calls include `Authorization: Bearer <token>` and `X-Tenant-Slug` headers
