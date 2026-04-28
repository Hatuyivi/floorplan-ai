const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (content) => ipcRenderer.invoke('save-file', content)
});
