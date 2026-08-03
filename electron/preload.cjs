const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('karmaDesktop', {
  getConnection: () => ipcRenderer.invoke('connection:get'),
  setConnection: (url) => ipcRenderer.invoke('connection:set', url),
  platform: process.platform,
});
