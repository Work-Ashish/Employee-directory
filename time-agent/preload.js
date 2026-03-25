const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('timeAgent', {
  // Auth
  login: (tenantSlug, email, password) =>
    ipcRenderer.invoke('auth:login', tenantSlug, email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  isLoggedIn: () => ipcRenderer.invoke('auth:is-logged-in'),
  getUserInfo: () => ipcRenderer.invoke('auth:user-info'),

  // Tracking controls
  pauseTracking: () => ipcRenderer.invoke('tracking:pause'),
  resumeTracking: () => ipcRenderer.invoke('tracking:resume'),
  getStatus: () => ipcRenderer.invoke('tracking:status'),
  forceSync: () => ipcRenderer.invoke('tracking:force-sync'),

  // Idle popup responses
  idleResponse: (response, description) =>
    ipcRenderer.invoke('idle:response', response, description),

  // Events from main process
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status:update', (_event, data) => callback(data));
  },
  onIdleDetected: (callback) => {
    ipcRenderer.on('idle:detected', (_event, data) => callback(data));
  },
  onTrackingStateChange: (callback) => {
    ipcRenderer.on('tracking:state-change', (_event, data) => callback(data));
  },
});
