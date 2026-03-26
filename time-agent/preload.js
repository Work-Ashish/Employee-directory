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
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('status:update', handler);
    return () => ipcRenderer.removeListener('status:update', handler);
  },
  onIdleDetected: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('idle:detected', handler);
    return () => ipcRenderer.removeListener('idle:detected', handler);
  },
  onTrackingStateChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('tracking:state-change', handler);
    return () => ipcRenderer.removeListener('tracking:state-change', handler);
  },
});
