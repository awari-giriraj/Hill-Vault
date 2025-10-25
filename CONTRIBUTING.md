# Contributing to VaultMind

Thank you for your interest in contributing to VaultMind! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment
- Report unacceptable behavior

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- Git
- Code editor (VS Code recommended)

### Setup Development Environment

1. **Fork and Clone**
```bash
git clone https://github.com/YOUR_USERNAME/vaultmind.git
cd vaultmind
```

2. **Install Dependencies**
```bash
npm install
```

3. **Run in Development Mode**
```bash
npm run electron:dev
```

## 📝 How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Verify you're using the latest version
3. Test if the issue persists in a clean install

**Bug Report Template:**
```markdown
**Description:** Clear description of the bug

**Steps to Reproduce:**
1. Step one
2. Step two
3. ...

**Expected Behavior:** What should happen

**Actual Behavior:** What actually happens

**Environment:**
- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- VaultMind Version: 1.0.0
- Node.js Version: 18.17.0

**Screenshots:** If applicable

**Additional Context:** Any other relevant information
```

### Suggesting Features

**Feature Request Template:**
```markdown
**Feature Description:** Clear description of the feature

**Use Case:** Why is this feature needed?

**Proposed Solution:** How should it work?

**Alternatives Considered:** Other approaches you've thought about

**Additional Context:** Mockups, examples, etc.
```

### Pull Requests

#### Before Starting
1. Check if an issue exists for your contribution
2. Comment on the issue to claim it
3. Wait for maintainer approval
4. Fork the repository

#### Development Workflow

1. **Create a Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

2. **Make Your Changes**
- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

3. **Test Your Changes**
- Test all affected functionality
- Verify encryption still works
- Check for memory leaks
- Test on your platform

4. **Commit Your Changes**
```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve issue #123"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

5. **Push and Create PR**
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

#### Pull Request Template
```markdown
**Description:** What does this PR do?

**Related Issue:** Fixes #123

**Type of Change:**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing:**
- [ ] Tested locally
- [ ] All existing tests pass
- [ ] Added new tests if applicable

**Screenshots:** If applicable

**Checklist:**
- [ ] Code follows project style
- [ ] Self-reviewed my code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Security implications considered
```

## 🎨 Code Style Guidelines

### JavaScript/React
- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use destructuring where appropriate
- Use template literals for strings
- Follow React Hooks best practices

**Example:**
```javascript
// Good
const handleSubmit = async (data) => {
  const { title, content } = data;
  const result = await createEntry({ title, content });
  return result;
};

// Avoid
var handleSubmit = function(data) {
  var title = data.title;
  var content = data.content;
  var result = await createEntry({ title: title, content: content });
  return result;
}
```

### CSS
- Use meaningful class names
- Follow BEM naming convention
- Use CSS variables for colors
- Keep selectors simple and flat
- Group related styles together

### File Structure
```
src/
  components/
    ComponentName/
      ComponentName.jsx
      ComponentName.css
      index.js (optional)
```

## 🔒 Security Considerations

### Before Submitting Security-Related Code

1. **Review Encryption Logic**
   - Don't weaken existing encryption
   - Use established cryptographic libraries
   - Never roll your own crypto

2. **Check for Vulnerabilities**
   - No plaintext password storage
   - No credential leaks in logs
   - Proper input validation
   - No SQL injection risks

3. **Network Isolation**
   - Don't add network requests
   - No analytics or telemetry
   - No external API calls

4. **Memory Safety**
   - Clear sensitive data from memory
   - No key persistence to disk
   - Proper cleanup on app close

### Security Review Checklist
- [ ] No new network dependencies
- [ ] Encryption keys handled safely
- [ ] No credential leaks
- [ ] Input properly validated
- [ ] SQL queries parameterized
- [ ] No XSS vulnerabilities

## 🧪 Testing

### Manual Testing
1. Create a new vault
2. Add various entries
3. Test search and filtering
4. Export and import vault
5. Test auto-lock
6. Test panic wipe (use test vault!)

### Platform Testing
If changing core functionality:
- Test on Windows
- Test on macOS (if available)
- Test on Linux (if available)

## 📚 Documentation

### When to Update Docs
- New features added
- API changes
- Configuration changes
- Security implications
- User-facing changes

### Documentation Files
- `README.md` - User guide, setup instructions
- `SECURITY.md` - Security details, best practices
- `CONTRIBUTING.md` - This file
- `CHANGELOG.md` - Version history
- Code comments - Complex logic

## 🏗️ Architecture Guidelines

### Electron Main Process
- Handle file system operations
- Manage database connections
- Implement IPC handlers
- Security-critical operations

### React Renderer Process
- UI components only
- No direct file access
- Use IPC for data operations
- State management with Zustand

### IPC Communication
- Always validate inputs
- Use typed parameters
- Return consistent response format
- Handle errors gracefully

## 🎯 Priority Areas for Contribution

### High Priority
- [ ] Bug fixes (especially security-related)
- [ ] Performance improvements
- [ ] Documentation improvements
- [ ] Cross-platform compatibility

### Medium Priority
- [ ] UI/UX enhancements
- [ ] New features (with discussion)
- [ ] Code refactoring
- [ ] Test coverage

### Future Enhancements
- [ ] Biometric authentication
- [ ] Offline AI integration
- [ ] Advanced search
- [ ] Plugin system

## ❓ Questions?

- Open a GitHub Discussion
- Check existing issues and PRs
- Read the documentation
- Review code comments

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in commit history

Thank you for helping make VaultMind better! 🎉
