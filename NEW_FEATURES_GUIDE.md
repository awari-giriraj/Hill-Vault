# HillVault - New Features Quick Guide

## 🎉 What's New in v1.1.0

### 1. 🔐 Enhanced Password Security

**Password Strength Meter**
- Real-time feedback as you type
- Visual indicators for all requirements
- Color-coded strength (Red=Weak, Yellow=Medium, Green=Strong)

**Requirements:**
- ✅ Minimum 12 characters (was 8)
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character (!@#$%^&*)

**How to Use:**
1. Create a new vault
2. Watch the strength meter as you type
3. Ensure all 5 checkmarks are green
4. Only strong passwords (4/5 or 5/5) are accepted

### 2. 📎 File Attachments

**What You Can Attach:**
- 📷 Images: JPG, PNG, GIF, WEBP, SVG
- 📄 Documents: PDF, DOC, DOCX, TXT, MD
- 🎵 Audio: MP3, WAV, M4A, OGG
- 📦 Any file (up to 10MB)

**Security:**
- All files are encrypted before storage
- Files can only be opened when vault is unlocked
- Temporary files are automatically cleaned up

**API Usage:**
```javascript
// Attach a file to an entry
const result = await window.electronAPI.attachFile({ entryId: 'entry-id' });

// Get all attachments for an entry
const result = await window.electronAPI.getAttachments({ entryId: 'entry-id' });

// Open an attachment
await window.electronAPI.openAttachment({ attachmentId: 'attachment-id' });

// Delete an attachment
await window.electronAPI.deleteAttachment({ attachmentId: 'attachment-id' });
```

### 3. ⏱️ Configurable Auto-Lock

**What It Does:**
- Automatically locks your vault after a period of inactivity
- Prevents unauthorized access if you walk away

**Settings:**
- Default: 5 minutes
- Range: 1-30 minutes
- Saved preference persists across sessions

**How to Configure:**
```javascript
// Set auto-lock timeout to 10 minutes
await window.electronAPI.setAutoLockTimeout({ minutes: 10 });
```

### 4. 📊 Activity Logging

**What's Tracked:**
- Vault lock/unlock events
- Entry creation, modification, deletion
- File attachments added/removed
- Settings changes
- Any vault operations

**Storage:**
- Last 1000 actions kept in memory
- Full history in encrypted database
- Only accessible when vault is unlocked

**How to Access:**
```javascript
// Get session log
const result = await window.electronAPI.getSessionLog();
console.log(result.log);
// Returns: [{ timestamp, action, details }, ...]
```

### 5. 👁️ Password Visibility Toggle

**What It Does:**
- Show/hide password as you type
- Available on both setup and unlock screens
- Helps prevent typos

**How to Use:**
- Click the eye icon (👁️) next to password field
- Toggle between visible and hidden

### 6. ⚙️ Settings System

**What's Available:**
- Persistent settings storage
- Auto-lock timeout preference
- Expandable for future settings

**API Usage:**
```javascript
// Get all settings
const result = await window.electronAPI.getSettings();
console.log(result.settings);

// Update a setting
await window.electronAPI.updateSetting({ 
  key: 'autoLockMinutes', 
  value: '10' 
});
```

## 🔧 For Developers

### New Database Tables

```sql
-- Session logging
CREATE TABLE session_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT
);

-- Settings storage
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- File attachments (enhanced)
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);
```

### New IPC Handlers

```javascript
// File attachments
ipcMain.handle('attach-file', async (event, { entryId }) => { ... });
ipcMain.handle('get-attachments', async (event, { entryId }) => { ... });
ipcMain.handle('open-attachment', async (event, { attachmentId }) => { ... });
ipcMain.handle('delete-attachment', async (event, { attachmentId }) => { ... });

// Security
ipcMain.handle('set-auto-lock-timeout', async (event, { minutes }) => { ... });
ipcMain.handle('validate-password-strength', async (event, { password }) => { ... });
ipcMain.handle('get-session-log', async () => { ... });

// Settings
ipcMain.handle('get-settings', async () => { ... });
ipcMain.handle('update-setting', async (event, { key, value }) => { ... });
```

### Password Strength Function

```javascript
function validatePasswordStrength(password) {
  return {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    score: 0-5 // Overall strength score
  };
}
```

## 📖 Usage Examples

### Example 1: Attach a File to Entry

```javascript
// In your Editor component
async function handleAddAttachment() {
  const result = await window.electronAPI.attachFile({ 
    entryId: currentEntry.id 
  });
  
  if (result.success) {
    console.log('Attached:', result.attachment.filename);
    // Refresh attachments list
    loadAttachments();
  } else {
    console.error('Failed:', result.error);
  }
}
```

### Example 2: Check Password Strength

```javascript
// In Auth component
const [password, setPassword] = useState('');
const [strength, setStrength] = useState(null);

useEffect(() => {
  if (password) {
    checkStrength();
  }
}, [password]);

async function checkStrength() {
  const result = await window.electronAPI.validatePasswordStrength({ 
    password 
  });
  setStrength(result.strength);
}
```

### Example 3: Configure Auto-Lock

```javascript
// In Settings component
async function updateAutoLock(minutes) {
  const result = await window.electronAPI.setAutoLockTimeout({ 
    minutes 
  });
  
  if (result.success) {
    alert(`Auto-lock set to ${minutes} minutes`);
  }
}
```

### Example 4: View Activity Log

```javascript
// In Activity Log component
async function loadActivityLog() {
  const result = await window.electronAPI.getSessionLog();
  
  if (result.success) {
    result.log.forEach(entry => {
      console.log(new Date(entry.timestamp), entry.action);
    });
  }
}
```

## 🎨 UI Components Needed

To fully utilize these features, you'll need:

### 1. Settings Panel
```jsx
function Settings() {
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  
  const handleSave = async () => {
    await window.electronAPI.setAutoLockTimeout({ 
      minutes: autoLockMinutes 
    });
  };
  
  return (
    <div>
      <h2>Settings</h2>
      <label>
        Auto-lock after:
        <input 
          type="number" 
          min="1" 
          max="30"
          value={autoLockMinutes}
          onChange={(e) => setAutoLockMinutes(e.target.value)}
        />
        minutes
      </label>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### 2. Attachments Panel
```jsx
function AttachmentsPanel({ entryId }) {
  const [attachments, setAttachments] = useState([]);
  
  useEffect(() => {
    loadAttachments();
  }, [entryId]);
  
  const loadAttachments = async () => {
    const result = await window.electronAPI.getAttachments({ entryId });
    if (result.success) {
      setAttachments(result.attachments);
    }
  };
  
  const handleAttach = async () => {
    const result = await window.electronAPI.attachFile({ entryId });
    if (result.success) {
      loadAttachments();
    }
  };
  
  return (
    <div>
      <button onClick={handleAttach}>📎 Attach File</button>
      <ul>
        {attachments.map(att => (
          <li key={att.id}>
            {att.filename} ({(att.size / 1024).toFixed(1)} KB)
            <button onClick={() => window.electronAPI.openAttachment({ 
              attachmentId: att.id 
            })}>
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Activity Log Viewer
```jsx
function ActivityLog() {
  const [log, setLog] = useState([]);
  
  useEffect(() => {
    loadLog();
  }, []);
  
  const loadLog = async () => {
    const result = await window.electronAPI.getSessionLog();
    if (result.success) {
      setLog(result.log);
    }
  };
  
  return (
    <div>
      <h2>Activity Log</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry, i) => (
            <tr key={i}>
              <td>{new Date(entry.timestamp).toLocaleString()}</td>
              <td>{entry.action}</td>
              <td>{entry.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## 🔒 Security Notes

- ✅ All attachments are encrypted with AES-256-GCM
- ✅ Session logs are only accessible when vault is unlocked
- ✅ Password requirements enforced at vault creation
- ✅ Auto-lock ensures vault security
- ✅ No data ever leaves your computer

## 🐛 Troubleshooting

### Password too weak error
- Ensure all 5 requirements are met
- Use a mix of character types
- Minimum 12 characters required

### File attachment fails
- Check file size (max 10MB)
- Ensure vault is unlocked
- Verify sufficient disk space

### Auto-lock not working
- Check settings value (1-30 minutes)
- Ensure vault is unlocked
- Try restarting the application

## 📚 Additional Resources

- [Full Feature Documentation](./FEATURES_IMPLEMENTED.md)
- [Roadmap](./ROADMAP.md)
- [Security Details](./SECURITY.md)
- [API Reference](./docs/API.md)

---

**Version:** 1.1.0-beta  
**Last Updated:** November 6, 2025  
**Status:** Development
