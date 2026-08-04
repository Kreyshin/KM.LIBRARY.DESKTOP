const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('karmaDesktop', {
  getConnection: () => ipcRenderer.invoke('connection:get'),
  setConnection: (url) => ipcRenderer.invoke('connection:set', url),
  getStorageInfo: () => ipcRenderer.invoke('storage:get'),
  selectStorageDirectory: () => ipcRenderer.invoke('storage:select'),
  moveStorage: (directory) => ipcRenderer.invoke('storage:move', directory),
  platform: process.platform,
});
