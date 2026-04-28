const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

ipcMain.handle('save-file', async (event, content) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Floorplan Data',
    defaultPath: 'rooms.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    return { success: true };
  }
  return { success: false };
});

app.whenReady().then(createWindow);
