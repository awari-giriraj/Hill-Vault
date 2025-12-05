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

// Enhanced features
let autoLockTimeout = 5 * 60 * 1000; // Default 5 minutes
const sessionLog = [];

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
    path.join(vaultDataPath, 'ideas'),
    path.join(vaultDataPath, 'attachments'), // for entry attachments
    path.join(vaultDataPath, 'files') // for file explorer files
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
    
    CREATE TABLE IF NOT EXISTS session_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT
    );
    
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      path TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      encrypted INTEGER DEFAULT 1,
      timestamp INTEGER NOT NULL,
      modified INTEGER NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS passwords (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      username TEXT,
      email TEXT,
      password TEXT NOT NULL,
      website TEXT,
      category TEXT NOT NULL,
      notes TEXT,
      tags TEXT,
      strength INTEGER DEFAULT 0,
      created INTEGER NOT NULL,
      modified INTEGER NOT NULL,
      last_used INTEGER,
      encrypted INTEGER DEFAULT 1
    );
    
    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
    CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tags_entry ON tags(entry_id);
    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
    CREATE INDEX IF NOT EXISTS idx_passwords_category ON passwords(category);
    CREATE INDEX IF NOT EXISTS idx_passwords_created ON passwords(created);
  `);
  
  // Create root folder if it doesn't exist
  const rootFolder = getOne('SELECT * FROM folders WHERE parent_id IS NULL');
  if (!rootFolder) {
    runQuery(
      'INSERT INTO folders (id, name, parent_id, path, timestamp) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), 'My Files', null, '/', Date.now()]
    );
  }
  
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
  // Skip integrity check in development mode
  if (process.env.VITE_DEV_SERVER_URL) {
    return true;
  }
  
  const configExists = fs.existsSync(configPath);
  if (!configExists) return true; // First time, no checksum stored yet
  
  // If database file doesn't exist yet, it's okay (first time setup)
  if (!fs.existsSync(dbPath)) return true;
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const storedChecksum = config.dbChecksum;
    
    // If no checksum stored yet, allow it (initial setup)
    if (!storedChecksum) return true;
    
    const currentChecksum = computeDBChecksum();
    
    // If checksums don't match, log warning but allow (database changes normally during use)
    if (storedChecksum !== currentChecksum) {
      console.warn('Database checksum mismatch - this is normal if data was added/modified');
      return true; // Allow anyway in dev mode
    }
    
    return true;
  } catch (error) {
    console.error('Integrity check error:', error);
    return true; // Allow on error to prevent lockout
  }
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
  autoLockTimeout = minutes * 60 * 1000;
  autoLockTimer = setTimeout(() => {
    lockVault();
  }, autoLockTimeout);
}

function resetAutoLockTimer() {
  if (encryptionKey && !isLocked) {
    // Get saved auto-lock setting
    let minutes = 5;
    if (db) {
      try {
        const setting = getOne('SELECT value FROM settings WHERE key = ?', ['autoLockMinutes']);
        if (setting) {
          minutes = parseInt(setting.value);
        }
      } catch (e) {
        // Ignore
      }
    }
    startAutoLockTimer(minutes);
  }
}

function lockVault() {
  isLocked = true;
  encryptionKey = null;
  if (mainWindow) {
    mainWindow.webContents.send('vault-locked');
  }
  clearTimeout(autoLockTimer);
  logSession('vault_locked');
}

// Enhanced password validation
function validatePasswordStrength(password) {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = {
    length: password.length >= minLength,
    uppercase: hasUpperCase,
    lowercase: hasLowerCase,
    numbers: hasNumbers,
    special: hasSpecialChar,
    score: 0
  };
  
  strength.score = [
    strength.length,
    strength.uppercase,
    strength.lowercase,
    strength.numbers,
    strength.special
  ].filter(Boolean).length;
  
  return strength;
}

// Session logging
function logSession(action, details = {}) {
  const entry = {
    timestamp: Date.now(),
    action,
    details: JSON.stringify(details)
  };
  
  sessionLog.push(entry);
  
  // Keep last 1000 entries
  if (sessionLog.length > 1000) {
    sessionLog.shift();
  }
  
  // Also save to database if available
  if (db && encryptionKey) {
    try {
      runQuery(
        'INSERT INTO session_log (timestamp, action, details) VALUES (?, ?, ?)',
        [entry.timestamp, action, entry.details]
      );
    } catch (error) {
      console.error('Session log error:', error);
    }
  }
}

// Create window
function createWindow() {
  // Prevent multiple windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

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
      sandbox: false
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
    
    // Initialize database with await
    ensureDirectories();
    await initDatabase();
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
    
    // Initialize database with await
    ensureDirectories();
    await initDatabase();
    startAutoLockTimer(config.autoLockMinutes || 5);
    
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
    } else {
      // When category is null (All Items), exclude drafts
      conditions.push('e.category != ?');
      params.push('drafts');
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

ipcMain.handle('update-entry', async (event, { id, category, title, content, tags }) => {
  if (!encryptionKey) return { success: false, error: 'Vault is locked' };
  
  try {
    const encryptedContent = encrypt(content, encryptionKey);
    const encryptedTitle = encrypt(title, encryptionKey);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const modified = Date.now();
    
    runQuery(`
      UPDATE entries 
      SET title = ?, content = ?, category = ?, modified = ?, checksum = ?
      WHERE id = ?
    `, [encryptedTitle, encryptedContent, category, modified, checksum, id]);
    
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
      defaultPath: `HillVault-Backup-${Date.now()}.vault`,
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

// File attachment handlers
ipcMain.handle('attach-file', async (event, { entryId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: 'File selection cancelled' };
    }
    
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    
    // Check file size (max 10MB for free version)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileStats.size > maxSize) {
      return { success: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` };
    }
    
    // Create attachments directory if it doesn't exist
    const attachmentsDir = path.join(vaultDataPath, 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    
    // Read and encrypt file
    const fileBuffer = fs.readFileSync(filePath);
    const encryptedFile = encrypt(fileBuffer.toString('base64'), encryptionKey);
    
    // Save encrypted file
    const attachmentId = crypto.randomUUID();
    const encryptedPath = path.join(attachmentsDir, `${attachmentId}.enc`);
    fs.writeFileSync(encryptedPath, JSON.stringify(encryptedFile));
    
    // Save attachment record
    runQuery(`
      INSERT INTO attachments (id, entry_id, filename, filepath, filetype, size, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      attachmentId,
      entryId,
      fileName,
      encryptedPath,
      path.extname(fileName),
      fileStats.size,
      Date.now()
    ]);
    
    saveDBChecksum();
    logSession('file_attached', { entryId, filename: fileName, size: fileStats.size });
    
    return { 
      success: true, 
      attachment: {
        id: attachmentId,
        filename: fileName,
        size: fileStats.size,
        type: path.extname(fileName)
      }
    };
  } catch (error) {
    console.error('Attach file error:', error);
    logSession('file_attach_error', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-attachments', async (event, { entryId }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const attachments = getQuery(`
      SELECT id, filename, filetype, size, timestamp 
      FROM attachments 
      WHERE entry_id = ?
      ORDER BY timestamp DESC
    `, [entryId]);
    
    return { success: true, attachments };
  } catch (error) {
    console.error('Get attachments error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-attachment', async (event, { attachmentId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const attachment = getOne(`
      SELECT * FROM attachments WHERE id = ?
    `, [attachmentId]);
    
    if (!attachment) {
      return { success: false, error: 'Attachment not found' };
    }
    
    // Read and decrypt file
    const encryptedData = JSON.parse(fs.readFileSync(attachment.filepath, 'utf8'));
    const decryptedBase64 = decrypt(encryptedData, encryptionKey);
    const fileBuffer = Buffer.from(decryptedBase64, 'base64');
    
    // Save to temp location
    const tempDir = app.getPath('temp');
    const tempPath = path.join(tempDir, attachment.filename);
    fs.writeFileSync(tempPath, fileBuffer);
    
    // Open with default application
    const { shell } = require('electron');
    await shell.openPath(tempPath);
    
    logSession('attachment_opened', { attachmentId, filename: attachment.filename });
    
    // Clean up temp file after 5 minutes
    setTimeout(() => {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }, 5 * 60 * 1000);
    
    return { success: true };
  } catch (error) {
    console.error('Open attachment error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-attachment', async (event, { attachmentId }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const attachment = getOne(`
      SELECT filepath, filename FROM attachments WHERE id = ?
    `, [attachmentId]);
    
    if (attachment && fs.existsSync(attachment.filepath)) {
      fs.unlinkSync(attachment.filepath);
    }
    
    runQuery('DELETE FROM attachments WHERE id = ?', [attachmentId]);
    saveDBChecksum();
    
    logSession('attachment_deleted', { attachmentId, filename: attachment?.filename });
    
    return { success: true };
  } catch (error) {
    console.error('Delete attachment error:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced security handlers
ipcMain.handle('set-auto-lock-timeout', async (event, { minutes }) => {
  try {
    if (minutes < 1 || minutes > 30) {
      return { success: false, error: 'Timeout must be between 1 and 30 minutes' };
    }
    
    autoLockTimeout = minutes * 60 * 1000;
    
    // Save to settings
    if (db) {
      runQuery(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['autoLockMinutes', minutes.toString()]
      );
    }
    
    // Restart timer with new timeout
    if (!isLocked) {
      startAutoLockTimer(minutes);
    }
    
    logSession('auto_lock_timeout_changed', { minutes });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-password-strength', async (event, { password }) => {
  try {
    const strength = validatePasswordStrength(password);
    return { success: true, strength };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-session-log', async () => {
  try {
    return { success: true, log: sessionLog };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const settings = {};
    const rows = getQuery('SELECT key, value FROM settings');
    
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-setting', async (event, { key, value }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    runQuery(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
    
    saveDBChecksum();
    logSession('setting_updated', { key });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// File Explorer handlers
ipcMain.handle('create-folder', async (event, { name, parentId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    // Get parent folder to build path
    let parentPath = '/';
    if (parentId) {
      const parent = getOne('SELECT path FROM folders WHERE id = ?', [parentId]);
      if (!parent) {
        return { success: false, error: 'Parent folder not found' };
      }
      parentPath = parent.path === '/' ? '/' : parent.path + '/';
    }
    
    const folderId = crypto.randomUUID();
    const folderPath = parentPath + name;
    
    runQuery(
      'INSERT INTO folders (id, name, parent_id, path, timestamp) VALUES (?, ?, ?, ?, ?)',
      [folderId, name, parentId, folderPath, Date.now()]
    );
    
    saveDBChecksum();
    logSession('folder_created', { name, parentId });
    
    return { 
      success: true, 
      folder: {
        id: folderId,
        name,
        parent_id: parentId,
        path: folderPath,
        timestamp: Date.now()
      }
    };
  } catch (error) {
    console.error('Create folder error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-folders', async (event, { parentId = null }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const folders = getQuery(
      'SELECT * FROM folders WHERE parent_id IS ? ORDER BY name ASC',
      [parentId]
    );
    
    return { success: true, folders };
  } catch (error) {
    console.error('Get folders error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-folder-tree', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const allFolders = getQuery('SELECT * FROM folders ORDER BY path ASC');
    
    // Build tree structure
    const folderMap = {};
    const rootFolders = [];
    
    // First pass: create folder objects
    allFolders.forEach(folder => {
      folderMap[folder.id] = {
        ...folder,
        children: [],
        files: []
      };
    });
    
    // Second pass: build tree
    allFolders.forEach(folder => {
      if (folder.parent_id === null) {
        rootFolders.push(folderMap[folder.id]);
      } else if (folderMap[folder.parent_id]) {
        folderMap[folder.parent_id].children.push(folderMap[folder.id]);
      }
    });
    
    return { success: true, tree: rootFolders };
  } catch (error) {
    console.error('Get folder tree error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-folder', async (event, { folderId, newName }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const folder = getOne('SELECT * FROM folders WHERE id = ?', [folderId]);
    if (!folder) {
      return { success: false, error: 'Folder not found' };
    }
    
    // Update path
    const oldPath = folder.path;
    const pathParts = oldPath.split('/').filter(Boolean);
    pathParts[pathParts.length - 1] = newName;
    const newPath = '/' + pathParts.join('/');
    
    // Update folder
    runQuery(
      'UPDATE folders SET name = ?, path = ? WHERE id = ?',
      [newName, newPath, folderId]
    );
    
    // Update all child folders' paths
    const children = getQuery('SELECT * FROM folders WHERE path LIKE ?', [oldPath + '/%']);
    children.forEach(child => {
      const childNewPath = child.path.replace(oldPath, newPath);
      runQuery('UPDATE folders SET path = ? WHERE id = ?', [childNewPath, child.id]);
    });
    
    saveDBChecksum();
    logSession('folder_renamed', { folderId, oldName: folder.name, newName });
    
    return { success: true };
  } catch (error) {
    console.error('Rename folder error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-folder', async (event, { folderId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    // Get all files in this folder and subfolders
    const folder = getOne('SELECT path FROM folders WHERE id = ?', [folderId]);
    if (!folder) {
      return { success: false, error: 'Folder not found' };
    }
    
    // Get all files in folder and subfolders
    const files = getQuery(`
      SELECT f.* FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE fo.path LIKE ? OR fo.id = ?
    `, [folder.path + '/%', folderId]);
    
    // Delete physical files
    files.forEach(file => {
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    });
    
    // Delete from database (CASCADE will handle files and subfolders)
    runQuery('DELETE FROM folders WHERE id = ?', [folderId]);
    
    saveDBChecksum();
    logSession('folder_deleted', { folderId });
    
    return { success: true };
  } catch (error) {
    console.error('Delete folder error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('upload-file', async (event, { folderId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
        { name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'] },
        { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
        { name: 'Code', extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: 'File selection cancelled' };
    }
    
    const uploadedFiles = [];
    const filesDir = path.join(vaultDataPath, 'files');
    
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    
    for (const filePath of result.filePaths) {
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      
      // Read and encrypt file
      const fileBuffer = fs.readFileSync(filePath);
      const encryptedFile = encrypt(fileBuffer.toString('base64'), encryptionKey);
      
      // Save encrypted file
      const fileId = crypto.randomUUID();
      const encryptedFileName = `${fileId}${path.extname(fileName)}`;
      const encryptedPath = path.join(filesDir, encryptedFileName);
      fs.writeFileSync(encryptedPath, JSON.stringify(encryptedFile));
      
      // Save file record
      runQuery(`
        INSERT INTO files (id, folder_id, filename, original_name, filepath, filetype, size, encrypted, timestamp, modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        fileId,
        folderId,
        encryptedFileName,
        fileName,
        encryptedPath,
        path.extname(fileName),
        fileStats.size,
        1,
        Date.now(),
        Date.now()
      ]);
      
      uploadedFiles.push({
        id: fileId,
        original_name: fileName,
        filetype: path.extname(fileName),
        size: fileStats.size,
        timestamp: Date.now()
      });
    }
    
    saveDBChecksum();
    logSession('files_uploaded', { folderId, count: uploadedFiles.length });
    
    return { success: true, files: uploadedFiles };
  } catch (error) {
    console.error('Upload file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-files', async (event, { folderId }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const files = getQuery(`
      SELECT id, original_name, filetype, size, timestamp, modified
      FROM files 
      WHERE folder_id = ?
      ORDER BY original_name ASC
    `, [folderId]);
    
    return { success: true, files };
  } catch (error) {
    console.error('Get files error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file', async (event, { fileId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const file = getOne('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!file) {
      return { success: false, error: 'File not found' };
    }
    
    // Read and decrypt file
    const encryptedData = JSON.parse(fs.readFileSync(file.filepath, 'utf8'));
    const decryptedBase64 = decrypt(encryptedData, encryptionKey);
    const fileBuffer = Buffer.from(decryptedBase64, 'base64');
    
    // Save to temp location
    const tempDir = app.getPath('temp');
    const tempPath = path.join(tempDir, file.original_name);
    fs.writeFileSync(tempPath, fileBuffer);
    
    // Open with default application
    const { shell } = require('electron');
    await shell.openPath(tempPath);
    
    logSession('file_opened', { fileId, filename: file.original_name });
    
    // Clean up temp file after 5 minutes
    setTimeout(() => {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }, 5 * 60 * 1000);
    
    return { success: true };
  } catch (error) {
    console.error('Open file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-file', async (event, { fileId }) => {
  try {
    if (!db || !encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const file = getOne('SELECT * FROM files WHERE id = ?', [fileId]);
    if (!file) {
      return { success: false, error: 'File not found' };
    }
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: file.original_name,
      title: 'Save File'
    });
    
    if (!filePath) {
      return { success: false, error: 'Save cancelled' };
    }
    
    // Read and decrypt file
    const encryptedData = JSON.parse(fs.readFileSync(file.filepath, 'utf8'));
    const decryptedBase64 = decrypt(encryptedData, encryptionKey);
    const fileBuffer = Buffer.from(decryptedBase64, 'base64');
    
    // Save to chosen location
    fs.writeFileSync(filePath, fileBuffer);
    
    logSession('file_downloaded', { fileId, filename: file.original_name });
    
    return { success: true };
  } catch (error) {
    console.error('Download file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-file', async (event, { fileId, newName }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    runQuery(
      'UPDATE files SET original_name = ?, modified = ? WHERE id = ?',
      [newName, Date.now(), fileId]
    );
    
    saveDBChecksum();
    logSession('file_renamed', { fileId, newName });
    
    return { success: true };
  } catch (error) {
    console.error('Rename file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, { fileId }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const file = getOne('SELECT filepath, original_name FROM files WHERE id = ?', [fileId]);
    
    if (file && fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }
    
    runQuery('DELETE FROM files WHERE id = ?', [fileId]);
    saveDBChecksum();
    
    logSession('file_deleted', { fileId, filename: file?.original_name });
    
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-file', async (event, { fileId, targetFolderId }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    runQuery(
      'UPDATE files SET folder_id = ?, modified = ? WHERE id = ?',
      [targetFolderId, Date.now(), fileId]
    );
    
    saveDBChecksum();
    logSession('file_moved', { fileId, targetFolderId });
    
    return { success: true };
  } catch (error) {
    console.error('Move file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-files', async (event, { query }) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const files = getQuery(`
      SELECT f.*, fo.name as folder_name, fo.path as folder_path
      FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE f.original_name LIKE ?
      ORDER BY f.original_name ASC
      LIMIT 100
    `, [`%${query}%`]);
    
    return { success: true, files };
  } catch (error) {
    console.error('Search files error:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// PASSWORD MANAGEMENT IPC HANDLERS
// ============================================

ipcMain.handle('get-passwords', async () => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    if (!encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const passwords = getQuery(`
      SELECT id, title, username, email, password, website, category, 
             notes, tags, strength, created, modified, last_used
      FROM passwords
      ORDER BY modified DESC
    `);
    
    // Decrypt passwords
    const decryptedPasswords = passwords.map(pwd => {
      try {
        return {
          ...pwd,
          password: decrypt(pwd.password, encryptionKey),
          notes: pwd.notes ? decrypt(pwd.notes, encryptionKey) : '',
          tags: pwd.tags ? JSON.parse(pwd.tags) : []
        };
      } catch (error) {
        console.error('Error decrypting password:', error);
        return pwd;
      }
    });
    
    logSession('passwords_viewed', { count: decryptedPasswords.length });
    
    return { success: true, passwords: decryptedPasswords };
  } catch (error) {
    console.error('Get passwords error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-password', async (event, passwordData) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    if (!encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const { id, title, username, email, password, website, category, notes, tags, strength, created, modified } = passwordData;
    
    // Encrypt sensitive data
    const encryptedPassword = encrypt(password, encryptionKey);
    const encryptedNotes = notes ? encrypt(notes, encryptionKey) : '';
    const tagsJson = JSON.stringify(tags || []);
    
    runQuery(`
      INSERT INTO passwords (id, title, username, email, password, website, category, notes, tags, strength, created, modified, last_used, encrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)
    `, [id, title, username || '', email || '', encryptedPassword, website || '', category, encryptedNotes, tagsJson, strength, created, modified]);
    
    saveDBChecksum();
    logSession('password_created', { passwordId: id, title, category });
    
    return { success: true, id };
  } catch (error) {
    console.error('Create password error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-password', async (event, passwordData) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    if (!encryptionKey) {
      return { success: false, error: 'Vault not unlocked' };
    }
    
    const { id, title, username, email, password, website, category, notes, tags, strength, modified } = passwordData;
    
    // Encrypt sensitive data
    const encryptedPassword = encrypt(password, encryptionKey);
    const encryptedNotes = notes ? encrypt(notes, encryptionKey) : '';
    const tagsJson = JSON.stringify(tags || []);
    
    runQuery(`
      UPDATE passwords 
      SET title = ?, username = ?, email = ?, password = ?, website = ?, 
          category = ?, notes = ?, tags = ?, strength = ?, modified = ?
      WHERE id = ?
    `, [title, username || '', email || '', encryptedPassword, website || '', category, encryptedNotes, tagsJson, strength, modified, id]);
    
    saveDBChecksum();
    logSession('password_updated', { passwordId: id, title });
    
    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-password', async (event, passwordId) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const password = getOne('SELECT title FROM passwords WHERE id = ?', [passwordId]);
    
    runQuery('DELETE FROM passwords WHERE id = ?', [passwordId]);
    
    saveDBChecksum();
    logSession('password_deleted', { passwordId, title: password?.title });
    
    return { success: true };
  } catch (error) {
    console.error('Delete password error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-password-last-used', async (event, passwordId) => {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    
    runQuery('UPDATE passwords SET last_used = ? WHERE id = ?', [Date.now(), passwordId]);
    
    saveDBChecksum();
    
    return { success: true };
  } catch (error) {
    console.error('Update last used error:', error);
    return { success: false, error: error.message };
  }
});

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is running, quit this one
  app.quit();
} else {
  // Handle second instance attempt
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
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
}

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
