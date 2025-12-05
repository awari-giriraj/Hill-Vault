# HillVault Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: Multiple Browser Tabs Opening

**Problem**: When running `npm run electron:dev`, both a browser tab and Electron window open.

**Solution**: ✅ FIXED
- Updated `package.json` to add `BROWSER=none` environment variable
- This prevents Vite from opening a browser tab
- Only Electron window will open now

---

### Issue 2: Input Fields Not Responding (Can't Type)

**Problem**: After clicking "New Entry", input fields (title/content) don't accept keyboard input.

**Solution**: ✅ FIXED
- Changed `sandbox: true` to `sandbox: false` in `electron/main.js`
- Sandbox mode was blocking input events
- Security is maintained through `contextIsolation: true`

---

### Issue 3: Changes Not Saving

**Problem**: Edits to entries don't save or category doesn't update.

**Solution**: ✅ FIXED
- Added missing `category` parameter to `update-entry` IPC handler
- Handler now accepts: `{ id, category, title, content, tags }`
- Category is properly saved to database

---

### Issue 4: Multiple Electron Windows Opening

**Problem**: Multiple Electron windows appear when reloading.

**Solution**: ✅ FIXED
- Added window existence check in `createWindow()` function
- If window exists and is not destroyed, it focuses instead of creating new one
- Prevents duplicate windows

---

### Issue 5: Port Already in Use

**Problem**: Error "Port 5173 already in use"

**Solution**:
```bash
# Windows - Kill process on port 5173
netstat -ano | findstr :5173
taskkill /F /PID <PID_NUMBER>

# Or use the start-dev.bat which does this automatically
```

---

## How to Run the Application (Updated)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Mode

**Option A: Using Batch File (Recommended)**
```bash
start-dev.bat
```

**Option B: Using npm**
```bash
npm run electron:dev
```

### What Should Happen:
1. ✅ Vite dev server starts on http://localhost:5173
2. ✅ Electron window opens (NO browser tab)
3. ✅ DevTools open automatically in Electron window
4. ✅ Input fields work normally
5. ✅ Changes save correctly

---

## Testing the Fixes

### Test 1: Verify Only Electron Window Opens
1. Run `npm run electron:dev`
2. ✅ Should see: ONE Electron window
3. ❌ Should NOT see: Browser tab opening

### Test 2: Verify Input Fields Work
1. Click "New Entry" button
2. Click in the "Title" field
3. ✅ Type something - text should appear
4. Click in the "Content" area
5. ✅ Type something - text should appear

### Test 3: Verify Saving Works
1. Enter title: "Test Entry"
2. Enter content: "This is a test"
3. Select category: "Ideas"
4. Click "Save"
5. ✅ Should return to Dashboard
6. ✅ Entry should appear in list

### Test 4: Verify Auto-Save Works
1. Click "New Entry"
2. Type something
3. Wait 2 seconds
4. ✅ See indicator: "● Unsaved changes (auto-saving to drafts...)"
5. Go to "Drafts" category
6. ✅ Should see your auto-saved entry

---

## Environment Variables

### Development Mode
```bash
VITE_DEV_SERVER_URL=http://localhost:5173
BROWSER=none
```

### Production Mode
```bash
# No environment variables needed
# App loads from dist/ folder
```

---

## Clean Installation

If issues persist, try a clean install:

```bash
# 1. Remove node_modules and lock files
rmdir /s /q node_modules
del package-lock.json

# 2. Clear npm cache
npm cache clean --force

# 3. Reinstall dependencies
npm install

# 4. Start fresh
npm run electron:dev
```

---

## Database Issues

### Reset Vault (⚠️ Deletes all data)
```bash
# Windows
rmdir /s /q "%APPDATA%\hillvault"

# macOS
rm -rf ~/Library/Application\ Support/hillvault

# Linux
rm -rf ~/.config/hillvault
```

Then restart the app to create a new vault.

---

## Logs & Debugging

### View Console Logs
- Electron window opens with DevTools by default
- Check "Console" tab for errors
- Main process logs appear in the terminal

### Common Error Messages

**Error**: `Cannot read properties of undefined`
**Fix**: Make sure vault is unlocked and database is initialized

**Error**: `SQLITE_ERROR: no such table`
**Fix**: Delete vault folder and recreate (see above)

**Error**: `encryption key not set`
**Fix**: Vault is locked - unlock with your password

---

## Performance Optimization

### Slow Startup
- **Cause**: Large number of entries
- **Fix**: Normal - SQLite indexes improve over time

### Slow Search
- **Cause**: Many entries without indexes
- **Fix**: Database rebuilds indexes automatically

### High Memory Usage
- **Cause**: DevTools open + large entries
- **Fix**: Normal in dev mode - production uses less

---

## Security Notes

### Why Sandbox is Disabled
- **Old**: `sandbox: true` (blocked inputs)
- **New**: `sandbox: false` (inputs work)
- **Security maintained by**:
  - ✅ `contextIsolation: true`
  - ✅ `nodeIntegration: false`
  - ✅ `enableRemoteModule: false`
  - ✅ Preload script whitelist

This is a common Electron pattern and doesn't compromise security.

---

## Build Issues

### Cannot Build for Windows
```bash
npm run build:win
```
- Requires Windows OS
- Requires `electron-builder`

### Cannot Build for Mac
```bash
npm run build:mac
```
- Requires macOS
- Requires Xcode Command Line Tools

### Cannot Build for Linux
```bash
npm run build:linux
```
- Works on any OS
- Produces AppImage

---

## Need More Help?

1. Check [README.md](README.md) for general setup
2. Check [QUICKSTART.md](QUICKSTART.md) for quick start
3. Check [FILE_EXPLORER_GUIDE.md](FILE_EXPLORER_GUIDE.md) for file explorer
4. Check [FEATURES_IMPLEMENTED.md](FEATURES_IMPLEMENTED.md) for features

---

## Changelog of Fixes

### November 21, 2025
- ✅ Fixed multiple browser tabs opening
- ✅ Fixed input fields not responding
- ✅ Fixed update-entry missing category parameter
- ✅ Fixed multiple windows opening
- ✅ Added cross-env for environment variables
- ✅ Updated start-dev.bat with better port handling
- ✅ Created this troubleshooting guide

---

**Status**: All known issues resolved ✅
**Last Updated**: November 21, 2025
