# File Explorer Feature - Complete Documentation

## Overview
HillVault now includes a powerful encrypted file storage system that works like a file explorer, allowing you to organize any type of file in an infinite folder structure with military-grade encryption.

## Features

### 1. **Infinite Folder Nesting**
- Create folders within folders (unlimited depth)
- Hierarchical tree structure for perfect organization
- Visual folder tree navigation with expand/collapse

### 2. **Universal File Support**
- Upload **ANY file type**: images, videos, documents, code, archives, etc.
- Multi-file upload support (select multiple files at once)
- File type detection with custom icons
- Size display for each file

### 3. **Military-Grade Encryption**
- All files encrypted with AES-256-GCM before storage
- Uses the same encryption key as your vault password
- Files stored as encrypted base64 in secure location
- Zero-knowledge architecture (only you can decrypt)

### 4. **File Operations**
- **Upload**: Select and upload multiple files at once
- **Open**: Decrypt and open files in their default application
- **Download**: Export decrypted files to any location
- **Rename**: Change file or folder names
- **Delete**: Remove files/folders (with confirmation)
- **Move**: Change file location between folders (future enhancement)

### 5. **Search Functionality**
- Search across all files by name
- See file location in search results
- Quick access to files from search

### 6. **Context Menu**
- Right-click on files for quick actions
- Right-click on folders for management
- Intuitive interface similar to Windows Explorer

### 7. **Visual File Type Icons**
- 📷 Images: jpg, jpeg, png, gif, webp, svg, bmp
- 🎬 Videos: mp4, avi, mkv, mov, wmv, flv, webm
- 📄 Documents: pdf, doc, docx, txt, md, rtf, odt
- 🎵 Audio: mp3, wav, m4a, ogg, flac, aac
- 📦 Archives: zip, rar, 7z, tar, gz
- 💻 Code: js, jsx, ts, tsx, py, java, cpp, c, css, html
- 📊 Spreadsheets: xls, xlsx

## Database Schema

### Folders Table
```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,            -- Folder name
  parent_id TEXT,                -- Parent folder ID (NULL for root)
  path TEXT NOT NULL,            -- Full path (e.g., /Documents/Work)
  timestamp INTEGER NOT NULL,    -- Creation timestamp
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

### Files Table
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,           -- UUID
  folder_id TEXT NOT NULL,       -- Parent folder ID
  filename TEXT NOT NULL,        -- Encrypted filename (UUID.ext)
  original_name TEXT NOT NULL,   -- Original filename for display
  filepath TEXT NOT NULL,        -- Path to encrypted file
  filetype TEXT NOT NULL,        -- File extension (.pdf, .jpg, etc.)
  size INTEGER NOT NULL,         -- Original file size in bytes
  encrypted INTEGER DEFAULT 1,   -- Encryption flag
  timestamp INTEGER NOT NULL,    -- Upload timestamp
  modified INTEGER NOT NULL,     -- Last modified timestamp
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

## File Storage Structure

```
AppData/Roaming/hillvault/VaultData/
├── vault.db                    # SQLite database (encrypted)
├── files/                      # Encrypted files directory
│   ├── a1b2c3d4-e5f6.pdf     # Encrypted file (JSON)
│   ├── f7e8d9c0-b1a2.jpg     # Encrypted file (JSON)
│   └── ...
├── attachments/               # Entry attachments
└── sketches/                  # Sketch data
```

## API Reference

### Folder Operations

#### `createFolder({ name, parentId })`
Creates a new folder in the specified parent.
```javascript
const result = await window.electronAPI.createFolder({
  name: 'Work Documents',
  parentId: 'parent-folder-id' // null for root
});
```

#### `getFolders({ parentId })`
Gets all folders within a parent folder.
```javascript
const result = await window.electronAPI.getFolders({
  parentId: 'parent-folder-id' // null for root
});
```

#### `getFolderTree()`
Gets the complete folder tree structure.
```javascript
const result = await window.electronAPI.getFolderTree();
// Returns: { success: true, tree: [...] }
```

#### `renameFolder({ folderId, newName })`
Renames a folder and updates all child paths.
```javascript
const result = await window.electronAPI.renameFolder({
  folderId: 'folder-id',
  newName: 'New Folder Name'
});
```

#### `deleteFolder({ folderId })`
Deletes a folder and all its contents (CASCADE).
```javascript
const result = await window.electronAPI.deleteFolder({
  folderId: 'folder-id'
});
```

### File Operations

#### `uploadFile({ folderId })`
Opens file dialog and uploads selected files (encrypted).
```javascript
const result = await window.electronAPI.uploadFile({
  folderId: 'target-folder-id'
});
// Returns: { success: true, files: [...] }
```

#### `getFiles({ folderId })`
Gets all files in a specific folder.
```javascript
const result = await window.electronAPI.getFiles({
  folderId: 'folder-id'
});
```

#### `openFile({ fileId })`
Decrypts and opens file in default application.
```javascript
const result = await window.electronAPI.openFile({
  fileId: 'file-id'
});
// File is decrypted to temp folder and opened
// Temp file auto-deleted after 5 minutes
```

#### `downloadFile({ fileId })`
Decrypts and saves file to user-selected location.
```javascript
const result = await window.electronAPI.downloadFile({
  fileId: 'file-id'
});
```

#### `renameFile({ fileId, newName })`
Renames a file (display name only, encrypted file unchanged).
```javascript
const result = await window.electronAPI.renameFile({
  fileId: 'file-id',
  newName: 'New Filename.pdf'
});
```

#### `deleteFile({ fileId })`
Deletes a file (both database record and encrypted file).
```javascript
const result = await window.electronAPI.deleteFile({
  fileId: 'file-id'
});
```

#### `searchFiles({ query })`
Searches for files by name across all folders.
```javascript
const result = await window.electronAPI.searchFiles({
  query: 'invoice'
});
```

## User Interface

### Main Components

1. **Folder Tree Sidebar** (Left)
   - Expandable/collapsible tree view
   - Click to select folder
   - Right-click for context menu
   - Shows folder hierarchy

2. **Files Area** (Right)
   - Grid layout of files
   - File icon, name, and size
   - Action buttons (Open, Download, Rename, Delete)
   - Double-click to open

3. **Toolbar** (Top)
   - New Folder button
   - Upload Files button
   - Search box

4. **Breadcrumb** (Above files)
   - Shows current folder path
   - Visual indicator of location

### Keyboard Shortcuts
- **Enter** on rename input: Confirm rename
- **Escape** on rename input: Cancel rename
- **Enter** in search: Execute search
- **Double-click** file: Open file

### Context Menu Actions

**File Context Menu:**
- Open
- Download
- Rename
- Delete

**Folder Context Menu:**
- Rename
- Delete

## Security Features

### Encryption Process
1. **Upload**:
   - Read file as buffer
   - Convert to base64
   - Encrypt base64 with AES-256-GCM
   - Save as JSON with IV and auth tag
   - Store encrypted file with UUID filename

2. **Download/Open**:
   - Read encrypted JSON file
   - Decrypt using vault encryption key
   - Convert base64 back to buffer
   - Write to temp/target location

### File Permissions
- Files stored in user's AppData (Windows) or equivalent
- Only accessible when vault is unlocked
- Encrypted files are useless without password

### Session Logging
All file operations are logged:
- `folder_created`
- `folder_renamed`
- `folder_deleted`
- `files_uploaded`
- `file_opened`
- `file_downloaded`
- `file_renamed`
- `file_deleted`
- `file_moved`

## Workflow Examples

### Example 1: Organizing Project Files
```
1. Open File Explorer
2. Create folder "Projects"
3. Select "Projects" folder
4. Create subfolder "Web Development"
5. Select "Web Development"
6. Click "Upload Files"
7. Select HTML, CSS, JS files
8. Files uploaded and encrypted
9. Double-click to view/edit
```

### Example 2: Storing Personal Documents
```
1. Open File Explorer
2. Create folder "Documents"
3. Create subfolders:
   - Passport
   - Bank Statements
   - Medical Records
   - Insurance
4. Upload PDFs to respective folders
5. Access anytime by navigating tree
```

### Example 3: Media Library
```
1. Create "Media" folder
2. Create subfolders:
   - Photos/Vacation/2025
   - Photos/Family
   - Videos/Projects
   - Music/Playlists
3. Upload files with multi-select
4. Search by name to find quickly
5. Download when needed
```

## File Size Limits

- **Per File**: No hard limit (system dependent)
- **Recommended**: Keep files under 100MB for performance
- **Large Files**: Videos/archives work but may take time to encrypt
- **Total Storage**: Limited by available disk space

## Performance Considerations

1. **Encryption Speed**: ~10-50 MB/s depending on system
2. **Startup**: Loads folder tree on mount (fast)
3. **File List**: Lazy-loaded per folder (fast)
4. **Search**: SQL LIKE query (fast for moderate file counts)
5. **Memory**: Only active files loaded in memory

## Future Enhancements

### Planned Features
- [ ] Drag and drop file upload
- [ ] Drag and drop to move files between folders
- [ ] File preview (images, PDFs)
- [ ] Bulk operations (select multiple, delete all)
- [ ] Folder icons/colors
- [ ] File tags/labels
- [ ] Advanced search (by type, size, date)
- [ ] File versioning (keep old versions)
- [ ] Shared folders (if multi-user added)
- [ ] Cloud backup integration
- [ ] File compression before encryption
- [ ] Thumbnail generation for images

## Troubleshooting

### Issue: Files not opening
**Solution**: Check that default application is set for file type in OS

### Issue: Upload failing
**Solution**: 
- Check file permissions
- Ensure vault is unlocked
- Check available disk space

### Issue: Folder tree not loading
**Solution**: 
- Restart application
- Check database integrity
- Look for errors in console

### Issue: Search not working
**Solution**: Ensure search query is at least 1 character

### Issue: Context menu not appearing
**Solution**: Use right-click (not left-click)

## Technical Notes

### Cascade Deletion
- Deleting a folder deletes all subfolders and files
- Physical encrypted files are deleted from disk
- Database uses CASCADE constraints for cleanup

### Path Management
- Paths stored as strings (e.g., `/Documents/Work/2025`)
- Path separator: `/` (cross-platform)
- Root folder has path `/`
- No duplicate paths allowed

### File Naming
- Original names stored for display
- Physical files use UUID + extension
- Prevents filename conflicts
- Preserves extension for type detection

### Encryption Format
```json
{
  "iv": "base64-initialization-vector",
  "authTag": "base64-authentication-tag",
  "encrypted": "base64-encrypted-data"
}
```

## Browser Compatibility
- Works in Electron (Chromium-based)
- Uses Node.js fs module (not browser API)
- Requires IPC communication with main process

---

**Version**: 1.0.0  
**Last Updated**: November 9, 2025  
**Status**: ✅ Production Ready
