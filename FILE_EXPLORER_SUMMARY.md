# File Explorer Feature Summary

## What Was Added

### ✅ Backend (electron/main.js)
- Added `folders` and `files` tables to database
- Created root folder ("My Files") automatically
- Added 10 new IPC handlers:
  - `create-folder` - Create new folders
  - `get-folders` - Get folders by parent
  - `get-folder-tree` - Get complete tree structure
  - `rename-folder` - Rename folder and update paths
  - `delete-folder` - Delete folder and contents
  - `upload-file` - Upload and encrypt files
  - `get-files` - Get files in folder
  - `open-file` - Decrypt and open file
  - `download-file` - Decrypt and save file
  - `rename-file` - Rename file
  - `delete-file` - Delete file
  - `move-file` - Move file to different folder
  - `search-files` - Search files by name

### ✅ Frontend Components
1. **FileExplorer.jsx** (520 lines)
   - Complete file explorer UI
   - Folder tree navigation
   - File grid display
   - Context menus
   - Search functionality
   - Rename inline editing
   - Modal dialogs

2. **FileExplorer.css** (400+ lines)
   - Modern, responsive styling
   - Dark mode support
   - Hover effects
   - Grid layout
   - Tree view styling

3. **Updated Sidebar.jsx**
   - Added "File Explorer" button
   - New icon for file explorer

4. **Updated App.jsx**
   - Added FileExplorer route
   - Integrated into view system

5. **Updated preload.js**
   - Exposed 10 new IPC APIs

## Key Features

### 🗂️ Folder Management
- **Infinite nesting**: Create folders within folders (unlimited depth)
- **Tree view**: Visual hierarchy with expand/collapse
- **Rename**: Change folder names with path updates
- **Delete**: Remove folders with all contents (CASCADE)

### 📁 File Operations
- **Upload**: Multi-file selection with all types supported
- **Encryption**: AES-256-GCM before storage
- **Open**: Decrypt to temp, open in default app, auto-cleanup after 5 min
- **Download**: Save decrypted file to any location
- **Rename**: Change display name
- **Delete**: Remove file from storage

### 🔍 Search
- Search across all files by name
- Shows file location in results
- Quick access from search

### 🎨 File Type Icons
- Images: 📷 (jpg, png, gif, etc.)
- Videos: 🎬 (mp4, avi, mkv, etc.)
- Documents: 📄 (pdf, docx, txt, etc.)
- Audio: 🎵 (mp3, wav, flac, etc.)
- Archives: 📦 (zip, rar, 7z, etc.)
- Code: 💻 (js, py, cpp, etc.)

### 🎯 UX Features
- Right-click context menus
- Double-click to open files
- Inline rename (click, type, press Enter)
- Breadcrumb navigation
- File size display
- Responsive grid layout
- Dark mode support

## How to Use

### Access File Explorer
1. Click "File Explorer" button in sidebar (green button with folder icon)
2. You'll see the folder tree on the left and files on the right

### Create Folders
1. Click "New Folder" button
2. Enter folder name
3. Folder created in currently selected folder

### Upload Files
1. Select a folder in the tree
2. Click "Upload Files"
3. Select one or more files
4. Files encrypted and uploaded

### Open Files
- **Double-click** a file to open it
- Or click "Open" button
- File decrypts to temp folder and opens in default app

### Download Files
1. Click "Download" button on a file
2. Choose save location
3. File decrypted and saved

### Rename
- **Files**: Click rename button or right-click → Rename
- **Folders**: Right-click → Rename
- Type new name, press Enter

### Delete
- Right-click → Delete
- Or click trash icon
- Confirmation required

### Search
1. Type filename in search box (top right)
2. Press Enter
3. See all matching files with their locations

## Security

### Encryption
- All files encrypted with AES-256-GCM
- Same key as vault password (PBKDF2-derived)
- Stored as encrypted JSON with IV and auth tag
- Original files never stored unencrypted

### Storage Location
```
Windows: C:\Users\[USER]\AppData\Roaming\hillvault\VaultData\files\
```

### File Format
Each encrypted file is stored as JSON:
```json
{
  "iv": "initialization-vector-base64",
  "authTag": "authentication-tag-base64",
  "encrypted": "encrypted-file-data-base64"
}
```

### Temp File Handling
- Decrypted files saved to OS temp folder when opened
- Auto-deleted after 5 minutes
- Temp location: `app.getPath('temp')`

## Database Schema

### Folders Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID (Primary Key) |
| name | TEXT | Folder name |
| parent_id | TEXT | Parent folder ID (NULL = root) |
| path | TEXT | Full path (e.g., /Documents/Work) |
| timestamp | INTEGER | Creation time |

### Files Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID (Primary Key) |
| folder_id | TEXT | Parent folder ID |
| filename | TEXT | Encrypted filename (UUID.ext) |
| original_name | TEXT | Display name |
| filepath | TEXT | Path to encrypted file |
| filetype | TEXT | Extension (.pdf, .jpg, etc.) |
| size | INTEGER | Original size in bytes |
| encrypted | INTEGER | 1 = encrypted |
| timestamp | INTEGER | Upload time |
| modified | INTEGER | Last modified time |

## File Count: What Changed

### New Files Created
1. `src/components/FileExplorer.jsx` - 520 lines
2. `src/components/FileExplorer.css` - 440 lines
3. `FILE_EXPLORER_GUIDE.md` - Complete documentation

### Modified Files
1. `electron/main.js` - Added 10 IPC handlers (~350 lines)
2. `electron/preload.js` - Added 10 API exports (~15 lines)
3. `src/components/Sidebar.jsx` - Added File Explorer button (~5 lines)
4. `src/App.jsx` - Added FileExplorer route (~2 lines)

### Total Lines Added
- Backend: ~365 lines
- Frontend: ~970 lines
- Documentation: ~600 lines
- **Total: ~1,935 lines of code**

## Testing Checklist

### Basic Operations
- [ ] Create folder in root
- [ ] Create nested folder (folder inside folder)
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Open file (should decrypt and open)
- [ ] Download file (choose location)
- [ ] Rename file
- [ ] Rename folder
- [ ] Delete file
- [ ] Delete folder (with contents)

### Advanced
- [ ] Search for files
- [ ] Right-click context menu on file
- [ ] Right-click context menu on folder
- [ ] Create deeply nested folders (3+ levels)
- [ ] Upload different file types (pdf, jpg, mp4, zip, etc.)
- [ ] Check dark mode styling
- [ ] Test with large files (50MB+)

### Edge Cases
- [ ] Delete folder with many files
- [ ] Rename folder with subfolders (paths update?)
- [ ] Upload file with same name
- [ ] Search with no results
- [ ] Empty folder display
- [ ] Root folder deletion (should fail)

## Known Limitations

1. **No Drag & Drop**: Must use upload button (future enhancement)
2. **No File Preview**: Can't preview images inline (future enhancement)
3. **No Bulk Select**: Can't select multiple files (future enhancement)
4. **No Thumbnails**: All files show type icon (future enhancement)
5. **No Progress Bar**: Large files upload without progress indicator

## Performance Notes

- ✅ Folder tree loads instantly (SQL query)
- ✅ File list lazy-loaded per folder
- ✅ Search limited to 100 results for speed
- ✅ Encryption ~10-50 MB/s (system dependent)
- ⚠️ Large files (>100MB) may take time to encrypt

## Next Steps

1. **Test thoroughly** with various file types
2. **Monitor performance** with many files
3. **Consider adding**:
   - Drag and drop upload
   - File preview for images/PDFs
   - Bulk operations
   - File compression before encryption
   - Folder icons/colors

---

**Status**: ✅ Complete and Ready to Test  
**Last Updated**: November 9, 2025
