# Security Documentation

## 🔐 Encryption Implementation

### AES-256-GCM Encryption
VaultMind uses AES-256 in Galois/Counter Mode (GCM) for encrypting user data:

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes), randomly generated per encryption
- **Authentication**: Built-in authentication tag (GCM mode)

### Key Derivation
User passwords are never stored directly. Instead, encryption keys are derived using PBKDF2:

- **Algorithm**: PBKDF2 with SHA-256
- **Iterations**: 100,000
- **Salt**: 32 bytes, randomly generated per vault
- **Output**: 32-byte encryption key

### RSA Keypair (Optional)
Each vault has an optional RSA keypair for advanced features:

- **Algorithm**: RSA-2048
- **Format**: PEM
- **Usage**: Signing, secure backup export
- **Storage**: Private key encrypted with AES-256-GCM using user's derived key

## 🛡️ Security Features

### 1. Data-at-Rest Encryption
- All entry titles and content are encrypted before storage
- Database file contains only encrypted data
- Metadata (timestamps, categories) stored in plaintext for indexing

### 2. Auto-Lock Mechanism
- Vault automatically locks after 5 minutes of inactivity
- All encryption keys cleared from memory on lock
- User must re-authenticate to access data

### 3. Tamper Detection
- SHA-256 checksum calculated for entire database
- Checksum verified on every vault unlock
- Application refuses to open if tampering detected

### 4. Panic Wipe
- Emergency feature to destroy all encryption keys
- Overwrites config file with random data before deletion
- Makes vault permanently inaccessible
- **WARNING**: This action is irreversible

### 5. Network Isolation
- All network requests blocked at application level
- No telemetry, analytics, or external API calls
- Electron configured to disable background networking
- Application functions fully offline

## 🔍 Threat Model

### Protected Against:
✅ **Offline Attacks**: Data encrypted at rest with strong encryption  
✅ **Memory Dumps**: Keys cleared on lock, not persisted to disk  
✅ **Database Tampering**: Checksum verification detects modifications  
✅ **Network Surveillance**: No network access whatsoever  
✅ **Telemetry Leaks**: All telemetry disabled at framework level  

### NOT Protected Against:
❌ **Keyloggers**: Can capture password during entry  
❌ **Screen Recording**: Decrypted content visible while vault unlocked  
❌ **Physical Access**: Attacker with physical access while unlocked  
❌ **Password Brute Force**: If weak password chosen  
❌ **Social Engineering**: Tricking user into revealing password  

## 🔑 Best Practices

### For Users:

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Avoid dictionary words or personal information
   - Consider using a passphrase (e.g., "Correct-Horse-Battery-Staple")

2. **Password Management**
   - **Never** forget your password (cannot be recovered)
   - Do not store password in plaintext anywhere
   - Consider using a password manager for backup
   - Do not share password with anyone

3. **Physical Security**
   - Lock your computer when leaving
   - Enable full-disk encryption (BitLocker, FileVault, LUKS)
   - Keep backups on encrypted USB drives
   - Store backup drives in secure location

4. **Backup Strategy**
   - Regular encrypted exports to external media
   - Test restore process periodically
   - Keep multiple backup versions
   - Store backups offsite securely

5. **Operational Security**
   - Use panic wipe if device compromised
   - Don't use on shared/public computers
   - Close application when not in use
   - Monitor for suspicious system behavior

### For Developers:

1. **Code Review**
   - Audit all encryption implementations
   - Review IPC security boundaries
   - Check for credential leaks in logs
   - Verify network isolation

2. **Testing**
   - Test encryption/decryption with various inputs
   - Verify auto-lock functionality
   - Test tamper detection with modified DB
   - Confirm no network requests in production

3. **Dependencies**
   - Keep Electron and dependencies updated
   - Audit npm packages for vulnerabilities
   - Use `npm audit` regularly
   - Lock dependency versions

## 📊 Cryptographic Details

### Encryption Format
```
[16-byte IV]:[16-byte Auth Tag]:[Encrypted Data]
```
All parts hex-encoded and concatenated with `:` separator.

### Database Schema Security
```sql
-- Encrypted fields:
- entries.title (AES-256-GCM encrypted)
- entries.content (AES-256-GCM encrypted)

-- Plaintext fields (for indexing/performance):
- entries.id (UUID)
- entries.category (ideas/drafts/final)
- entries.timestamp (milliseconds since epoch)
- entries.checksum (SHA-256 of plaintext content)
- tags.tag (tag names)
```

### Key Storage
- Encryption key: **Never** written to disk, only in memory
- Derived from password on each unlock
- Cleared immediately on lock or app close

### Config File Structure
```json
{
  "salt": "hex-encoded 32-byte salt",
  "publicKey": "RSA public key (PEM format)",
  "encryptedPrivateKey": "AES-256-GCM encrypted private key",
  "createdAt": timestamp,
  "autoLockMinutes": 5,
  "dbChecksum": "SHA-256 of database file"
}
```

## 🐛 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security details to: [your-security-email]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work on a fix.

## 📝 Security Audit Log

### v1.0.0 (Current)
- ✅ AES-256-GCM encryption implemented
- ✅ PBKDF2 key derivation (100k iterations)
- ✅ Auto-lock after inactivity
- ✅ Tamper detection with checksums
- ✅ Network isolation verified
- ✅ Panic wipe functionality
- ⚠️ No biometric authentication yet
- ⚠️ No hardware security module (HSM) support

### Known Limitations
1. **Password Recovery**: None (by design)
2. **Biometric Auth**: Not yet implemented
3. **Multi-Factor Auth**: Not available
4. **Hardware Encryption**: No TPM/HSM integration
5. **Audit Logging**: Basic, not tamper-proof

## 🔬 Security Testing

### Manual Tests
```bash
# 1. Network isolation test
# Run app in airplane mode - should function normally

# 2. Encryption verification
# Check database file - should be encrypted binary
# Wrong password should fail to decrypt

# 3. Tamper detection
# Modify database file externally
# App should detect and refuse to open

# 4. Auto-lock test
# Wait 5 minutes without interaction
# Vault should lock automatically

# 5. Panic wipe test (DESTRUCTIVE!)
# Trigger panic wipe
# Verify vault becomes inaccessible
```

### Automated Tests (Future)
- Unit tests for encryption functions
- Integration tests for IPC security
- Penetration testing
- Fuzzing inputs
- Memory leak detection

## 📚 References

- [NIST AES Specification](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)
- [PBKDF2 RFC 2898](https://tools.ietf.org/html/rfc2898)
- [GCM Mode (NIST SP 800-38D)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)

## ⚖️ Compliance

VaultMind is designed for personal use and does not claim compliance with:
- GDPR (no data processing)
- HIPAA (not intended for healthcare data)
- SOC 2 (no service operations)
- PCI DSS (not for payment data)

Users are responsible for ensuring compliance with applicable regulations.

---

**Last Updated**: October 25, 2025  
**Version**: 1.0.0
