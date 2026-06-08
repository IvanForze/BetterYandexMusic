const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  installMod: () => ipcRenderer.invoke('install-mod'),
  uninstallMod: () => ipcRenderer.invoke('uninstall-mod'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  onLog: (callback) => ipcRenderer.on('install-log', (event, message) => callback(message)),
  closeApp: () => ipcRenderer.send('close-app')
});
