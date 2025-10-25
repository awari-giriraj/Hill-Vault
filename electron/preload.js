const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  checkFirstTime: () => ipcRenderer.invoke('check-first-time'),
  setupVault: (password) => ipcRenderer.invoke('setup-vault', { password }),
  unlockVault: (password) => ipcRenderer.invoke('unlock-vault', { password }),
  lockVault: () => ipcRenderer.invoke('lock-vault'),
  panicWipe: () => ipcRenderer.invoke('panic-wipe'),
  
  // Entry management
  createEntry: (data) => ipcRenderer.invoke('create-entry', data),
  getEntries: (filters) => ipcRenderer.invoke('get-entries', filters),
  getEntry: (id) => ipcRenderer.invoke('get-entry', { id }),
  updateEntry: (data) => ipcRenderer.invoke('update-entry', data),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', { id }),
  
  // Tags
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  
  // Backup/Restore
  exportVault: () => ipcRenderer.invoke('export-vault'),
  importVault: () => ipcRenderer.invoke('import-vault'),
  
  // Sketches
  saveSketch: (data) => ipcRenderer.invoke('save-sketch', data),
  
  // Events
  onVaultLocked: (callback) => ipcRenderer.on('vault-locked', callback),
  removeVaultLockedListener: () => ipcRenderer.removeAllListeners('vault-locked')
});
