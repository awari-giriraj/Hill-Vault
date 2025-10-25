# 🚀 Quick Start Guide - VaultMind

## Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd VaultMind
npm install
```

### Step 2: Run the Application
```bash
npm run electron:dev
```

**Or on Windows, simply double-click:** `start-dev.bat`

### Step 3: Create Your Vault
1. The app will open
2. Create a strong password (minimum 8 characters)
3. Confirm your password
4. Your encrypted vault is ready!

---

## 📝 First Entry

1. Click **"New Entry"** in the sidebar
2. Choose a category (Ideas, Drafts, or Final Works)
3. Write your title and content
4. Add tags (optional)
5. Click **"Save"**

---

## 🎨 Create a Sketch

1. Click **"New Sketch"** in the sidebar
2. Use the drawing tools:
   - Pen for drawing
   - Eraser for corrections
   - Adjust brush size
   - Choose colors
3. Click **"Save Sketch"** when done

---

## 🔍 Find Your Content

### Search
Type in the search bar to find entries by title or content

### Filter by Category
Click on categories in the sidebar:
- All Items
- Ideas
- Drafts
- Sketches
- Final Works

### Filter by Tags
Click "Filter by Tags" to select specific tags

---

## 💾 Backup Your Vault

### Export
1. Click the download icon in the header
2. Choose where to save the `.vault` file
3. Keep this file safe and encrypted!

### Import
1. Click the upload icon in the header
2. Select your `.vault` backup file
3. Enter your password to import

---

## 🔒 Security Tips

### Password
- **Use a strong password** (12+ characters)
- **Never forget it** (cannot be recovered!)
- Consider using a password manager

### Auto-Lock
- Vault locks after 5 minutes of inactivity
- Re-enter password to unlock

### Manual Lock
- Click the lock icon anytime to lock vault
- Protects data when stepping away

### Panic Wipe ⚠️
- **Emergency use only!**
- Permanently destroys encryption keys
- Makes vault completely inaccessible
- Have backups before using!

---

## 🎨 Customize

### Dark Mode
Click the moon/sun icon to toggle dark/light theme

### Categories
Organize entries as:
- **Ideas**: Brainstorms and thoughts
- **Drafts**: Work in progress
- **Final Works**: Completed items

---

## 🏗️ Build for Distribution

### Build All Platforms
```bash
npm run build
```

### Build Specific Platform
```bash
npm run build:win    # Windows (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

Installers will be in the `release/` folder.

---

## ❓ Troubleshooting

### Application Won't Start
- Ensure Node.js 18+ is installed
- Run `npm install` again
- Check for error messages

### Can't Unlock Vault
- Verify password is correct
- Check if database file exists
- Try exporting/importing if corrupted

### Features Not Working
- Check vault is unlocked
- Ensure no errors in console (DevTools)
- Restart the application

---

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **Security Details**: See `SECURITY.md`
- **Contributing**: See `CONTRIBUTING.md`
- **Changes**: See `CHANGELOG.md`

---

## 🆘 Need Help?

1. Check the documentation
2. Review known issues
3. Open a GitHub issue
4. Provide detailed information

---

## ✅ You're All Set!

VaultMind is now ready to securely store your creative works!

**Remember:**
- ✅ All data is encrypted
- ✅ No internet required
- ✅ Your password is the key
- ✅ Regular backups recommended

Happy creating! 🎉
