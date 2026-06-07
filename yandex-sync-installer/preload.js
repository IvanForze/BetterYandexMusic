const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  installMod: () => ipcRenderer.invoke('install-mod'),
  uninstallMod: () => ipcRenderer.invoke('uninstall-mod'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  onLog: (callback) => ipcRenderer.on('install-log', (event, message) => callback(message))
});
