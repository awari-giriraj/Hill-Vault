# Changelog

All notable changes to VaultMind will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-25

### Added
- 🔐 **Security Features**
  - AES-256-GCM encryption for all data at rest
  - PBKDF2 key derivation with 100,000 iterations
  - RSA-2048 keypair generation for advanced features
  - Auto-lock after 5 minutes of inactivity
  - Database tamper detection with SHA-256 checksums
  - Panic wipe functionality for emergency situations
  - Complete network isolation (no telemetry, no cloud)

- 📝 **Content Management**
  - Rich text editor with full markdown support
  - Live markdown preview
  - Category organization (Ideas, Drafts, Final Works)
  - Flexible tagging system
  - Fast local search across all entries
  - Timeline view with date sorting

- 🎨 **Creative Tools**
  - HTML5 Canvas-based sketchpad
  - Drawing tools: pen, eraser
  - Adjustable brush size (1-20px)
  - 10+ preset colors plus custom color picker
  - Undo/redo functionality
  - Save sketches as PNG

- 💾 **Data Management**
  - Local SQLite database (sql.js)
  - Encrypted backup export to `.vault` files
  - Import/restore with password verification
  - Checksum validation on import
  - Automatic metadata tracking

- 🎨 **User Interface**
  - Dark and light theme support
  - Responsive, modern design
  - Sidebar navigation
  - Search and filter capabilities
  - Entry cards with hover actions
  - Clean, distraction-free editor

- ⚙️ **System Features**
  - Cross-platform support (Windows, macOS, Linux)
  - Electron 28 + React 18 + Vite
  - No internet dependencies
  - Offline-first architecture
  - Build scripts for all platforms

### Technical Details
- Database: sql.js (SQLite in WebAssembly)
- State Management: Zustand
- Markdown Rendering: react-markdown
- Icons: react-icons (Font Awesome)
- Date Formatting: date-fns

### Security Notes
- Password cannot be recovered if lost
- All encryption keys cleared on lock
- Database checksums prevent tampering
- No network requests allowed
- Context-isolated IPC for security

### Known Limitations
- No biometric authentication yet
- No offline AI assistant (planned for Pro)
- No multi-user support (planned for Enterprise)
- Password recovery impossible (by design)

## [Unreleased]

### Planned for v1.1.0
- [ ] Biometric authentication (Windows Hello, Touch ID, etc.)
- [ ] Advanced search with regex support
- [ ] File attachment encryption
- [ ] Multiple vault support
- [ ] Enhanced auto-lock settings
- [ ] Import from other note apps

### Planned for v2.0.0 (Pro Edition)
- [ ] Offline AI assistant (GPT4All/Llama.cpp)
- [ ] Grammar and spell checking
- [ ] Auto-summarization
- [ ] Advanced encryption options
- [ ] Secure sharing (encrypted links)

### Planned for v3.0.0 (Enterprise Edition)
- [ ] Multi-user local vaults (LAN)
- [ ] Team collaboration features
- [ ] Audit logging
- [ ] Admin controls
- [ ] Access permissions

---

## Version History

- **v1.0.0** (2025-10-25) - Initial release
  - Full encryption implementation
  - Core note-taking features
  - Sketchpad tool
  - Backup/restore functionality

---

**Legend:**
- 🔐 Security features
- 📝 Content features
- 🎨 UI/UX improvements
- 💾 Data management
- 🐛 Bug fixes
- ⚡ Performance improvements
- 🔧 Technical changes
