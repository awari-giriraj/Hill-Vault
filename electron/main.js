const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

// Disable all telemetry and network features
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-metrics');
app.commandLine.appendSwitch('disable-metrics-repo');
app.commandLine.appendSwitch('disable-background-networking');

// Security: Disable GPU if not needed (optional)
// app.disableHardwareAcceleration();

let mainWindow = null;
let autoLockTimer = null;
let isLocked = false;
let db = null;
let SQL = null;
let encryptionKey = null;

// Paths
const userDataPath = app.getPath('userData');
const vaultDataPath = path.join(userDataPath, 'VaultData');
const dbPath = path.join(vaultDataPath, 'vault.db');
const configPath = path.join(vaultDataPath, 'config.json');

// Ensure VaultData directories exist
function ensureDirectories() {
  const dirs = [
    vaultDataPath,
    path.join(vaultDataPath, 'text'),
    path.join(vaultDataPath, 'audio'),
    path.join(vaultDataPath, 'sketches'),
    path.join(vaultDataPath, 'ideas')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initialize database
async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => path.join(__dirname, '../node_modules/sql.js/dist', file)
    });
  }
  
  // Load or create database
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      encrypted INTEGER DEFAULT 1,
      timestamp INTEGER NOT NULL,
      modified INTEGER NOT NULL,
      checksum TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
    CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tags_entry ON tags(entry_id);
    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
  `);
  
  saveDatabase();
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

// Helper to run SQL queries
function runQuery(sql, params = []) {
  try {
    db.run(sql, params);
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('Query error:', error);
    return { success: false, error: error.message };
  }
}

// Helper to get query results
function getQuery(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Query error:', error);
    return [];
  }
}

// Helper to get single row
function getOne(sql, params = []) {
  const results = getQuery(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Compute database checksum for tamper detection
function computeDBChecksum() {
  if (!fs.existsSync(dbPath)) return null;
  const fileBuffer = fs.readFileSync(dbPath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Verify database integrity
function verifyDatabaseIntegrity() {
  const configExists = fs.existsSync(configPath);
  if (!configExists) return true; // First time, no checksum stored yet
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const storedChecksum = config.dbChecksum;
  const currentChecksum = computeDBChecksum();
  
  return storedChecksum === currentChecksum;
}

// Save database checksum
function saveDBChecksum() {
  const checksum = computeDBChecksum();
  let config = {};
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  config.dbChecksum = checksum;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Encryption utilities
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData, key) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Generate RSA keypair
function generateRSAKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

// Auto-lock functionality
function startAutoLockTimer(minutes = 5) {
  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    lockVault();
  }, minutes * 60 * 1000);
}

function resetAutoLockTimer() {
  if (encryptionKey && !isLocked) {
    startAutoLockTimer(5);
  }
}

function lockVault() {
  isLocked = true;
  encryptionKey = null;
  if (mainWindow) {
    mainWindow.webContents.send('vault-locked');
  }
  clearTimeout(autoLockTimer);
}

// Create window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // Disable default menu for security
  mainWindow.setMenuBarVisibility(false);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Track user activity for auto-lock
  mainWindow.on('focus', resetAutoLockTimer);
  mainWindow.webContents.on('did-finish-load', resetAutoLockTimer);
}

// IPC Handlers
ipcMain.handle('check-first-time', async () => {
  return !fs.existsSync(configPath);
});

ipcMain.handle('setup-vault', async (event, { password }) => {
  try {
    const salt = crypto.randomBytes(32);
    const key = deriveKey(password, salt);
    
    // Generate RSA keypair
    const { publicKey, privateKey } = generateRSAKeypair();
    
    // Encrypt private key with user password
    const encryptedPrivateKey = encrypt(privateKey, key);
    
    // Save configuration
    const config = {
      salt: salt.toString('hex'),
      publicKey: publicKey,
      encryptedPrivateKey: encryptedPrivateKey,
      createdAt: Date.now(),
      autoLockMinutes: 5
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Initialize database
    ensureDirectories();
    initDatabase();
    saveDBChecksum();
    
    encryptionKey = key;
    isLocked = false;
    startAutoLockTimer(5);
    
    return { success: true };
  } catch (error) {
    console.error('Setup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unlock-vault', async (event, { password }) => {
  try {
    // Verify database integrity first
    if (!verifyDatabaseIntegrity()) {
      return { success: false, error: 'Database tamper detected! Integrity check failed.' };
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const salt = Buffer.from(config.salt, 'hex');
    const key = deriveKey(password, salt);
    
    // Verify password by trying to decrypt private key
    try {
      decrypt(config.encryptedPrivateKey, key);
    } catch (e) {
      return { success: false, error: 'Invalid password' };
    }
    
    encryptionKey = key;
    isLocked = false;
    
    // Initialize database
    ensureDirectories();
    initDatabase();
    startAutoLockTimer(5);
    
    return { success: true };
  } catch (error) {
    console.error('Unlock error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('lock-vault', async () => {
  lockVault();
  return { success: true };
});

ipcMain.handle('panic-wipe', async () => {
  try {
    // Delete encryption keys
    encryptionKey = null;
    
    // Overwrite sensitive data
    if (fs.existsSync(configPath)) {
      const randomData = crypto.randomBytes(1024 * 100);
      fs.writeFileSync(configPath, randomData);
      fs.unlinkSync(configPath);
    }
    
    // Close and delete database
    if (db) {
      db.close();
      db = null;
    }
    
    if (fs.existsSync(dbPath)) {
      const randomData = crypto.randomBytes(1024 * 1024);
      fs.writeFileSync(dbPath, randomData);
      fs.unlinkSync(dbPath);
    }
    
    lockVault();
    
    return { success: true };
  } catch (error) {
    console.error('Panic wipe error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-entry', async (event, { category, title, content, tags }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const encryptedContent = encrypt(content, encryptionKey);
    const encryptedTitle = encrypt(title, encryptionKey);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    
    runQuery(`
      INSERT INTO entries (id, category, title, content, encrypted, timestamp, modified, checksum)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `, [id, category, encryptedTitle, encryptedContent, timestamp, timestamp, checksum]);
    
    // Insert tags
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        runQuery('INSERT INTO tags (entry_id, tag) VALUES (?, ?)', [id, tag]);
      });
    }
    
    resetAutoLockTimer();
    saveDBChecksum();
    
    return { success: true, id };
  } catch (error) {
    console.error('Create entry error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-entries', async (event, { category, search, tags }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    let query = 'SELECT DISTINCT e.* FROM entries e';
    let params = [];
    let conditions = [];
    
    if (tags && tags.length > 0) {
      query += ' INNER JOIN tags t ON e.id = t.entry_id';
      conditions.push(`t.tag IN (${tags.map(() => '?').join(',')})`);
      params.push(...tags);
    }
    
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY e.timestamp DESC';
    
    const entries = getQuery(query, params);
    
    // Decrypt entries
    const decryptedEntries = entries.map(entry => {
      try {
        const entryTags = getQuery('SELECT tag FROM tags WHERE entry_id = ?', [entry.id]);
        return {
          ...entry,
          title: decrypt(entry.title, encryptionKey),
          content: decrypt(entry.content, encryptionKey),
          tags: entryTags.map(t => t.tag)
        };
      } catch (e) {
        console.error('Decryption error for entry:', entry.id, e);
        return null;
      }
    }).filter(e => e !== null);
    
    // Apply search filter after decryption
    let filteredEntries = decryptedEntries;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEntries = decryptedEntries.filter(e => 
        e.title.toLowerCase().includes(searchLower) || 
        e.content.toLowerCase().includes(searchLower)
      );
    }
    
    resetAutoLockTimer();
    
    return { success: true, entries: filteredEntries };
  } catch (error) {
    console.error('Get entries error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-entry', async (event, { id }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const entry = getOne('SELECT * FROM entries WHERE id = ?', [id]);
    
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }
    
    const entryTags = getQuery('SELECT tag FROM tags WHERE entry_id = ?', [id]);
    const decryptedEntry = {
      ...entry,
      title: decrypt(entry.title, encryptionKey),
      content: decrypt(entry.content, encryptionKey),
      tags: entryTags.map(t => t.tag)
    };
    
    resetAutoLockTimer();
    
    return { success: true, entry: decryptedEntry };
  } catch (error) {
    console.error('Get entry error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-entry', async (event, { id, title, content, tags }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const encryptedContent = encrypt(content, encryptionKey);
    const encryptedTitle = encrypt(title, encryptionKey);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const modified = Date.now();
    
    runQuery(`
      UPDATE entries 
      SET title = ?, content = ?, modified = ?, checksum = ?
      WHERE id = ?
    `, [encryptedTitle, encryptedContent, modified, checksum, id]);
    
    // Update tags
    runQuery('DELETE FROM tags WHERE entry_id = ?', [id]);
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        runQuery('INSERT INTO tags (entry_id, tag) VALUES (?, ?)', [id, tag]);
      });
    }
    
    resetAutoLockTimer();
    saveDBChecksum();
    
    return { success: true };
  } catch (error) {
    console.error('Update entry error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-entry', async (event, { id }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    runQuery('DELETE FROM entries WHERE id = ?', [id]);
    
    resetAutoLockTimer();
    saveDBChecksum();
    
    return { success: true };
  } catch (error) {
    console.error('Delete entry error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-vault', async () => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Vault',
      defaultPath: `VaultMind-Backup-${Date.now()}.vault`,
      filters: [{ name: 'Vault Files', extensions: ['vault'] }]
    });
    
    if (!filePath) return { success: false, error: 'Export cancelled' };
    
    // Create backup data
    const backup = {
      version: '1.0.0',
      timestamp: Date.now(),
      entries: getQuery('SELECT * FROM entries'),
      tags: getQuery('SELECT * FROM tags')
    };
    
    // Encrypt and save
    const backupJson = JSON.stringify(backup);
    const encryptedBackup = encrypt(backupJson, encryptionKey);
    fs.writeFileSync(filePath, encryptedBackup);
    
    return { success: true };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-vault', async () => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Vault',
      filters: [{ name: 'Vault Files', extensions: ['vault'] }],
      properties: ['openFile']
    });
    
    if (!filePaths || filePaths.length === 0) {
      return { success: false, error: 'Import cancelled' };
    }
    
    const encryptedBackup = fs.readFileSync(filePaths[0], 'utf8');
    const backupJson = decrypt(encryptedBackup, encryptionKey);
    const backup = JSON.parse(backupJson);
    
    // Import entries
    backup.entries.forEach(entry => {
      runQuery(`
        INSERT OR REPLACE INTO entries (id, category, title, content, encrypted, timestamp, modified, checksum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [entry.id, entry.category, entry.title, entry.content, entry.encrypted, entry.timestamp, entry.modified, entry.checksum]);
    });
    
    // Import tags
    backup.tags.forEach(tag => {
      runQuery('INSERT OR IGNORE INTO tags (entry_id, tag) VALUES (?, ?)', [tag.entry_id, tag.tag]);
    });
    
    saveDBChecksum();
    
    return { success: true, imported: backup.entries.length };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-tags', async () => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const tags = getQuery('SELECT DISTINCT tag FROM tags ORDER BY tag');
    return { success: true, tags: tags.map(t => t.tag) };
  } catch (error) {
    console.error('Get tags error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-sketch', async (event, { entryId, dataUrl }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const sketchDir = path.join(vaultDataPath, 'sketches');
    const filename = `sketch-${Date.now()}.png`;
    const filepath = path.join(sketchDir, filename);
    
    // Convert data URL to buffer and save
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    // Save attachment record
    const id = crypto.randomUUID();
    runQuery(`
      INSERT INTO attachments (id, entry_id, filename, filepath, filetype, size, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, entryId, filename, filepath, 'image/png', buffer.length, Date.now()]);
    
    saveDBChecksum();
    
    return { success: true, id, filepath };
  } catch (error) {
    console.error('Save sketch error:', error);
    return { success: false, error: error.message };
  }
});

// App lifecycle
app.whenReady().then(() => {
  ensureDirectories();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    saveDBChecksum();
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    saveDBChecksum();
    db.close();
  }
});

// Disable all network requests
app.on('web-contents-created', (event, contents) => {
  contents.session.webRequest.onBeforeRequest((details, callback) => {
    // Block all external requests except local dev server
    const url = details.url;
    if (url.startsWith('http://localhost:5173') || url.startsWith('file://')) {
      callback({});
    } else {
      callback({ cancel: true });
    }
  });
});
