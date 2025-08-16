const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { execFile } = require("child_process");
const isDev = require("electron-is-dev");
const scanner = require("./scanner");

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
  icon: path.join(__dirname, '..', 'assets', 'oblivion-icon.ico'), // Caminho relativo ao main.js

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Escanear jogos
ipcMain.handle("scan-games", async () => {
  try {
    const games = await scanner.scanAll();
    return { ok: true, games };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Abrir executável do jogo
ipcMain.handle('open-game', async (event, game) => {
  console.log(game);
  try {
    if (game.source === 'Steam' && game.steamAppId) {
      await shell.openExternal(`steam://rungameid/${game.steamAppId}`);
    } else {
console.log(game);
       execFile(game.exe, (err) => {
        if (err) console.error('Erro ao abrir jogo:', err);
      });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Abrir pasta do jogo
ipcMain.handle("open-path", async (event, dir) => {
  if (!dir) return { ok: false, error: "Diretório não encontrado" };
  try {
    await shell.openPath(dir);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
