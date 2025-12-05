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
  
  // Attachments (NEW)
  attachFile: (data) => ipcRenderer.invoke('attach-file', data),
  getAttachments: (data) => ipcRenderer.invoke('get-attachments', data),
  openAttachment: (data) => ipcRenderer.invoke('open-attachment', data),
  deleteAttachment: (data) => ipcRenderer.invoke('delete-attachment', data),
  
  // Enhanced Security (NEW)
  setAutoLockTimeout: (data) => ipcRenderer.invoke('set-auto-lock-timeout', data),
  validatePasswordStrength: (data) => ipcRenderer.invoke('validate-password-strength', data),
  getSessionLog: () => ipcRenderer.invoke('get-session-log'),
  
  // Settings (NEW)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (data) => ipcRenderer.invoke('update-setting', data),
  
  // File Explorer (NEW)
  createFolder: (data) => ipcRenderer.invoke('create-folder', data),
  getFolders: (data) => ipcRenderer.invoke('get-folders', data),
  getFolderTree: () => ipcRenderer.invoke('get-folder-tree'),
  renameFolder: (data) => ipcRenderer.invoke('rename-folder', data),
  deleteFolder: (data) => ipcRenderer.invoke('delete-folder', data),
  
  uploadFile: (data) => ipcRenderer.invoke('upload-file', data),
  getFiles: (data) => ipcRenderer.invoke('get-files', data),
  openFile: (data) => ipcRenderer.invoke('open-file', data),
  downloadFile: (data) => ipcRenderer.invoke('download-file', data),
  renameFile: (data) => ipcRenderer.invoke('rename-file', data),
  deleteFile: (data) => ipcRenderer.invoke('delete-file', data),
  moveFile: (data) => ipcRenderer.invoke('move-file', data),
  searchFiles: (data) => ipcRenderer.invoke('search-files', data),
  
  // Password Management (NEW)
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  createPassword: (data) => ipcRenderer.invoke('create-password', data),
  updatePassword: (data) => ipcRenderer.invoke('update-password', data),
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
  updatePasswordLastUsed: (id) => ipcRenderer.invoke('update-password-last-used', id),
  
  // Events
  onVaultLocked: (callback) => ipcRenderer.on('vault-locked', callback),
  removeVaultLockedListener: () => ipcRenderer.removeAllListeners('vault-locked')
});
