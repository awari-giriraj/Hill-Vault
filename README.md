# VaultMind - Secure Offline Creative Vault

![VaultMind](public/icon.png)

## 🔒 Overview

VaultMind is a secure, offline-first desktop application designed for creators who value privacy and security. Store your ideas, drafts, sketches, and creative works with military-grade encryption—completely offline, no cloud, no telemetry.

## ✨ Features

### 🛡️ Security & Privacy
- **AES-256-GCM Encryption** - All data encrypted at rest
- **PBKDF2 Key Derivation** - Secure password-based encryption
- **RSA Keypair Support** - Optional signing and secure backup
- **Offline-Only Operation** - No internet dependencies
- **Auto-Lock** - Automatic vault locking after inactivity
- **Tamper Detection** - Database integrity verification on startup
- **Panic Wipe** - Emergency key destruction feature
- **No Telemetry** - Zero analytics, tracking, or external calls

### 📝 Content Management
- **Rich Text Editor** - Full markdown support with live preview
- **Categorization** - Organize as Ideas, Drafts, or Final Works
- **Tagging System** - Flexible tag-based organization
- **Search & Filter** - Fast local search across all content
- **Timeline View** - Chronological sorting and browsing

### 🎨 Creative Tools
- **HTML5 Sketchpad** - Draw and sketch with various tools
- **Color Palette** - 10+ preset colors plus custom picker
- **Brush Controls** - Adjustable size and eraser tool
- **Undo/Redo** - Full drawing history support

### 💾 Data Management
- **Local SQLite Database** - Fast, reliable local storage
- **Encrypted Backups** - Export to `.vault` files
- **Import/Restore** - Easy vault restoration with checksum verification
- **Metadata Tracking** - Automatic timestamps and checksums

### 🎨 User Experience
- **Dark/Light Themes** - Comfortable viewing in any lighting
- **Responsive Layout** - Optimized for various screen sizes
- **Modern UI** - Clean, intuitive interface
- **Cross-Platform** - Windows, macOS, and Linux support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd VaultMind
```

2. **Install dependencies**
```bash
npm install
```

3. **Run in development mode**
```bash
npm run electron:dev
```

4. **Build for production**

For your current platform:
```bash
npm run build
```

For specific platforms:
```bash
# Windows (.exe)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux
```

Built applications will be in the `release/` directory.

## 📁 Project Structure

```
VaultMind/
├── electron/
│   ├── main.js          # Main Electron process
│   └── preload.js       # Secure IPC bridge
├── src/
│   ├── components/      # React components
│   │   ├── Auth.jsx     # Login/setup
│   │   ├── Dashboard.jsx # Entry overview
│   │   ├── Editor.jsx   # Markdown editor
│   │   ├── Header.jsx   # Top navigation
│   │   ├── Sidebar.jsx  # Category navigation
│   │   └── Sketchpad.jsx # Drawing canvas
│   ├── App.jsx          # Main app component
│   ├── store.js         # State management (Zustand)
│   └── main.jsx         # React entry point
├── VaultData/           # User data directory
│   ├── text/
│   ├── audio/
│   ├── sketches/
│   ├── ideas/
│   ├── vault.db         # Encrypted SQLite database
│   └── config.json      # Vault configuration
├── package.json
├── vite.config.js
└── README.md
```

## 🔐 Security Features

### Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 32-byte random salt per vault
- **IV**: 16-byte random initialization vector per entry

### Data Protection
- All entries encrypted before database storage
- Encryption keys derived from user password
- Keys only in memory, never written to disk
- Optional RSA keypair for advanced features

### Threat Model Protection
- ✅ Offline attacks (encrypted at rest)
- ✅ Memory dumps (keys cleared on lock)
- ✅ Database tampering (SHA-256 checksums)
- ✅ Network surveillance (no network access)
- ✅ Telemetry/tracking (completely disabled)

## 🎯 Usage Guide

### First-Time Setup
1. Launch VaultMind
2. Create a strong password (min 8 characters)
3. Confirm password
4. Vault is created with AES-256 encryption

### Creating Entries
1. Click "New Entry" in sidebar
2. Choose category (Ideas/Drafts/Final)
3. Write title and content (markdown supported)
4. Add tags for organization
5. Click "Save"

### Creating Sketches
1. Click "New Sketch" in sidebar
2. Use pen/eraser tools
3. Adjust brush size and colors
4. Draw your sketch
5. Click "Save Sketch"

### Backup & Restore
**Export:**
1. Click download icon in header
2. Choose save location
3. Encrypted `.vault` file created

**Import:**
1. Click upload icon in header
2. Select `.vault` file
3. Vault content merged with password verification

### Panic Wipe
⚠️ **Emergency Use Only**
1. Click warning icon in header
2. Confirm action
3. All encryption keys destroyed
4. Vault becomes permanently inaccessible

## 🔧 Configuration

### Auto-Lock Timer
Default: 5 minutes of inactivity

Modify in `electron/main.js`:
```javascript
startAutoLockTimer(5); // Change to desired minutes
```

### Database Location
Default: `{userData}/VaultData/`

On Windows: `C:\Users\{Username}\AppData\Roaming\vaultmind\VaultData\`
On macOS: `~/Library/Application Support/vaultmind/VaultData/`
On Linux: `~/.config/vaultmind/VaultData/`

## 🧪 Security Audit

### Verification Steps
1. **Network isolation test**
   - Run app in airplane mode ✅
   - No errors or degraded functionality ✅

2. **Encryption validation**
   - Database file is binary/encrypted ✅
   - Wrong password fails to decrypt ✅

3. **Tamper detection**
   - Modify database file externally
   - App detects corruption on startup ✅

4. **Memory safety**
   - Keys cleared on lock ✅
   - Panic wipe overwrites sensitive data ✅

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite
- **Desktop Framework**: Electron 28
- **Database**: sql.js (SQLite compiled to WebAssembly)
- **State Management**: Zustand
- **Markdown**: react-markdown
- **Icons**: react-icons
- **Date Utilities**: date-fns
- **Build Tool**: electron-builder

**Note**: We use sql.js instead of better-sqlite3 for better cross-platform compatibility without requiring native build tools.

## 📝 Database Schema

```sql
-- Entries table
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,           -- Encrypted
  content TEXT NOT NULL,          -- Encrypted
  encrypted INTEGER DEFAULT 1,
  timestamp INTEGER NOT NULL,
  modified INTEGER NOT NULL,
  checksum TEXT NOT NULL
);

-- Tags table
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- Attachments table
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 🚧 Roadmap

### Community Edition (Current)
- ✅ Text entries with encryption
- ✅ Sketchpad
- ✅ Basic backup/restore
- ✅ Tag organization

### Pro Edition (Planned)
- 🔲 Biometric authentication
- 🔲 Advanced search (regex)
- 🔲 Attachment encryption
- 🔲 Multiple vaults
- 🔲 Offline AI assistant (GPT4All/Llama.cpp)

### Enterprise Edition (Future)
- 🔲 Multi-user local vaults (LAN)
- 🔲 Team collaboration features
- 🔲 Audit logs
- 🔲 Admin controls

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Disclaimer

VaultMind is provided as-is. While we implement industry-standard encryption and security practices, no system is 100% secure. Users are responsible for:
- Choosing strong passwords
- Keeping backups of important data
- Understanding the panic wipe feature
- Not losing their password (it cannot be recovered)

## 🆘 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review security guidelines

## 🙏 Acknowledgments

- Electron.js team for the framework
- React team for the UI library
- better-sqlite3 maintainers
- All open-source contributors

---

**Built with ❤️ for creators who value privacy**
