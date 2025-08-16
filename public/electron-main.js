const path = require('path')
const { app, BrowserWindow, ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const scanner = require('../src/main/scanner')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, '../src/main/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:3000')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../src/renderer/dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: pedido para escanear jogos
ipcMain.handle('scan-games', async (event) => {
  try {
    const games = await scanner.scanAll()
    return { ok: true, games }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})