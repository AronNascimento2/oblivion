const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  scanGames: () => ipcRenderer.invoke("scan-games"),
  openGame: (exePath) => ipcRenderer.invoke("open-game", exePath),
  openPath: (dir) => ipcRenderer.invoke("open-path", dir),
});
