import { useState, useEffect } from 'react';
import useStore from '../store';
import { 
  FaKey, FaPlus, FaEdit, FaTrash, FaCopy, FaEye, FaEyeSlash, 
  FaShieldAlt, FaEnvelope, FaUniversity, FaUsers, FaBriefcase,
  FaGlobe, FaGamepad, FaShoppingCart, FaLock, FaRandom,
  FaSearch, FaExclamationTriangle, FaCheck, FaTimes
} from 'react-icons/fa';
import './PasswordManager.css';

function PasswordManager() {
  const { setCurrentView } = useStore();
  const [passwords, setPasswords] = useState([]);
  const [selectedPassword, setSelectedPassword] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list, add, edit
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPasswordCategory, setSelectedPasswordCategory] = useState('all');
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    email: '',
    password: '',
    website: '',
    category: 'other',
    notes: '',
    tags: []
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  
  // Password Generator Settings
  const [genSettings, setGenSettings] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: true,
    excludeAmbiguous: true
  });

  const passwordCategories = [
    { id: 'all', name: 'All Passwords', icon: FaKey, color: '#6c63ff' },
    { id: 'email', name: 'Email', icon: FaEnvelope, color: '#ff6b6b' },
    { id: 'banking', name: 'Banking & Finance', icon: FaUniversity, color: '#4ecdc4' },
    { id: 'social', name: 'Social Media', icon: FaUsers, color: '#45b7d1' },
    { id: 'work', name: 'Work', icon: FaBriefcase, color: '#f9ca24' },
    { id: 'website', name: 'Websites', icon: FaGlobe, color: '#95e1d3' },
    { id: 'gaming', name: 'Gaming', icon: FaGamepad, color: '#ff6348' },
    { id: 'shopping', name: 'Shopping', icon: FaShoppingCart, color: '#ff9ff3' },
    { id: 'other', name: 'Other', icon: FaLock, color: '#a29bfe' }
  ];

  useEffect(() => {
    loadPasswords();
  }, []);

  useEffect(() => {
    if (formData.password) {
      checkPasswordStrength(formData.password);
    }
  }, [formData.password]);

  const loadPasswords = async () => {
    try {
      const result = await window.electronAPI.getPasswords();
      if (result.success) {
        setPasswords(result.passwords);
      }
    } catch (error) {
      console.error('Failed to load passwords:', error);
    }
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Common password check
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'password123'];
    if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
      score = Math.max(0, score - 2);
      feedback.push('Contains common password pattern');
    }

    let strengthText = '';
    let strengthColor = '';

    if (score <= 2) {
      strengthText = 'Weak';
      strengthColor = '#ff6b6b';
    } else if (score <= 4) {
      strengthText = 'Moderate';
      strengthColor = '#f9ca24';
    } else if (score <= 5) {
      strengthText = 'Strong';
      strengthColor = '#4ecdc4';
    } else {
      strengthText = 'Very Strong';
      strengthColor = '#00d2d3';
    }

    setPasswordStrength({ score, text: strengthText, color: strengthColor, feedback });
  };

  const generatePassword = () => {
    const { length, uppercase, lowercase, numbers, symbols, excludeSimilar, excludeAmbiguous } = genSettings;
    
    let charset = '';
    if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) charset += '0123456789';
    if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }
    if (excludeAmbiguous) {
      charset = charset.replace(/[{}[\]()\/\\'"~,;:.<>]/g, '');
    }

    if (charset === '') {
      alert('Please select at least one character type');
      return '';
    }

    let password = '';
    const cryptoArray = new Uint32Array(length);
    window.crypto.getRandomValues(cryptoArray);
    
    for (let i = 0; i < length; i++) {
      password += charset[cryptoArray[i] % charset.length];
    }

    setGeneratedPassword(password);
    return password;
  };

  const handleSavePassword = async () => {
    if (!formData.title || !formData.password) {
      alert('Title and password are required');
      return;
    }

    try {
      console.log('Saving password with data:', {
        title: formData.title,
        category: formData.category,
        hasPassword: !!formData.password
      });

      const passwordData = {
        ...formData,
        id: selectedPassword?.id || `pwd_${Date.now()}`,
        created: selectedPassword?.created || Date.now(),
        modified: Date.now(),
        lastUsed: selectedPassword?.lastUsed || null,
        strength: passwordStrength.score
      };

      console.log('Calling electronAPI.createPassword...');
      const result = viewMode === 'edit' 
        ? await window.electronAPI.updatePassword(passwordData)
        : await window.electronAPI.createPassword(passwordData);

      console.log('Save result:', result);

      if (result.success) {
        await loadPasswords();
        resetForm();
        setViewMode('list');
        alert(viewMode === 'edit' ? 'Password updated!' : 'Password saved!');
      } else {
        alert('Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save password:', error);
      alert('Failed to save password: ' + error.message);
    }
  };

  const handleDeletePassword = async (passwordId) => {
    if (!confirm('Are you sure you want to delete this password?')) return;

    try {
      const result = await window.electronAPI.deletePassword(passwordId);
      if (result.success) {
        await loadPasswords();
        if (selectedPassword?.id === passwordId) {
          setSelectedPassword(null);
        }
        alert('Password deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete password:', error);
      alert('Failed to delete password');
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    alert(`${field} copied to clipboard!`);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      email: '',
      password: '',
      website: '',
      category: 'other',
      notes: '',
      tags: []
    });
    setSelectedPassword(null);
    setGeneratedPassword('');
    setPasswordStrength({ score: 0, text: '', color: '' });
  };

  const handleEditPassword = (password) => {
    setSelectedPassword(password);
    setFormData({
      title: password.title,
      username: password.username || '',
      email: password.email || '',
      password: password.password,
      website: password.website || '',
      category: password.category,
      notes: password.notes || '',
      tags: password.tags || []
    });
    setViewMode('edit');
  };

  const useGeneratedPassword = () => {
    setFormData({ ...formData, password: generatedPassword });
    setShowPasswordGenerator(false);
  };

  const getPasswordAge = (created) => {
    const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    if (days < 30) return { text: `${days} days old`, color: '#4ecdc4' };
    if (days < 90) return { text: `${days} days old`, color: '#f9ca24' };
    return { text: `${days} days old - Consider updating`, color: '#ff6b6b' };
  };

  const filteredPasswords = passwords.filter(pwd => {
    const matchesSearch = pwd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pwd.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pwd.website?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedPasswordCategory === 'all' || pwd.category === selectedPasswordCategory;
    return matchesSearch && matchesCategory;
  });

  // Statistics
  const stats = {
    total: passwords.length,
    weak: passwords.filter(p => p.strength <= 2).length,
    moderate: passwords.filter(p => p.strength <= 4 && p.strength > 2).length,
    strong: passwords.filter(p => p.strength > 4).length,
    old: passwords.filter(p => (Date.now() - p.created) > 90 * 24 * 60 * 60 * 1000).length
  };

  return (
    <div className="password-manager">
      {viewMode === 'list' ? (
        <>
          <div className="password-header">
            <div className="password-title-section">
              <FaShieldAlt className="shield-icon" />
              <h1>Password Manager</h1>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setViewMode('add');
              }}
            >
              <FaPlus /> Add Password
            </button>
          </div>

          {/* Statistics Dashboard */}
          <div className="password-stats">
            <div className="stat-card">
              <FaKey className="stat-icon" style={{ color: '#6c63ff' }} />
              <div className="stat-info">
                <h3>{stats.total}</h3>
                <p>Total Passwords</p>
              </div>
            </div>
            <div className="stat-card">
              <FaExclamationTriangle className="stat-icon" style={{ color: '#ff6b6b' }} />
              <div className="stat-info">
                <h3>{stats.weak}</h3>
                <p>Weak Passwords</p>
              </div>
            </div>
            <div className="stat-card">
              <FaShieldAlt className="stat-icon" style={{ color: '#f9ca24' }} />
              <div className="stat-info">
                <h3>{stats.moderate}</h3>
                <p>Moderate</p>
              </div>
            </div>
            <div className="stat-card">
              <FaCheck className="stat-icon" style={{ color: '#4ecdc4' }} />
              <div className="stat-info">
                <h3>{stats.strong}</h3>
                <p>Strong Passwords</p>
              </div>
            </div>
            <div className="stat-card">
              <FaExclamationTriangle className="stat-icon" style={{ color: '#ff9f43' }} />
              <div className="stat-info">
                <h3>{stats.old}</h3>
                <p>Need Update (90+ days)</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="password-controls">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search passwords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="password-categories">
            {passwordCategories.map(cat => {
              const Icon = cat.icon;
              const count = cat.id === 'all' 
                ? passwords.length 
                : passwords.filter(p => p.category === cat.id).length;
              
              return (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedPasswordCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedPasswordCategory(cat.id)}
                  style={{ 
                    borderColor: selectedPasswordCategory === cat.id ? cat.color : 'transparent',
                    backgroundColor: selectedPasswordCategory === cat.id ? `${cat.color}15` : 'transparent'
                  }}
                >
                  <Icon style={{ color: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Password List */}
          <div className="password-list">
            {filteredPasswords.length === 0 ? (
              <div className="empty-state">
                <FaKey className="empty-icon" />
                <h3>No passwords found</h3>
                <p>Add your first password to get started</p>
              </div>
            ) : (
              filteredPasswords.map(password => {
                const category = passwordCategories.find(c => c.id === password.category);
                const Icon = category?.icon || FaLock;
                const age = getPasswordAge(password.created);
                
                return (
                  <div key={password.id} className="password-card">
                    <div className="password-card-header">
                      <div className="password-icon" style={{ backgroundColor: category?.color || '#a29bfe' }}>
                        <Icon />
                      </div>
                      <div className="password-info">
                        <h3>{password.title}</h3>
                        <div className="password-meta">
                          {password.username && <span>👤 {password.username}</span>}
                          {password.email && <span>✉️ {password.email}</span>}
                          {password.website && (
                            <span>
                              🌐 <a href={password.website} target="_blank" rel="noopener noreferrer">
                                {password.website}
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="password-actions">
                        <button
                          className="icon-btn"
                          onClick={() => copyToClipboard(password.password, 'Password')}
                          title="Copy Password"
                        >
                          <FaCopy />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleEditPassword(password)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => handleDeletePassword(password.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    
                    <div className="password-strength-bar">
                      <div 
                        className="strength-fill"
                        style={{ 
                          width: `${(password.strength / 6) * 100}%`,
                          backgroundColor: password.strength <= 2 ? '#ff6b6b' : 
                                         password.strength <= 4 ? '#f9ca24' : '#4ecdc4'
                        }}
                      />
                    </div>
                    
                    <div className="password-footer">
                      <span className="password-age" style={{ color: age.color }}>
                        {age.text}
                      </span>
                      <span className="password-category">
                        {category?.name}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Add/Edit Form */
        <div className="password-form">
          <div className="form-header">
            <h2>{viewMode === 'edit' ? 'Edit Password' : 'Add New Password'}</h2>
            <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
              <FaTimes /> Cancel
            </button>
          </div>

          <div className="form-content">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g., Gmail Account, Bank Login"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <div className="password-input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button 
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordGenerator(!showPasswordGenerator)}
                >
                  <FaRandom /> Generate
                </button>
              </div>
              
              {formData.password && (
                <div className="password-strength-indicator">
                  <div className="strength-bar">
                    <div 
                      className="strength-progress"
                      style={{ 
                        width: `${(passwordStrength.score / 6) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span style={{ color: passwordStrength.color }}>
                    {passwordStrength.text}
                  </span>
                </div>
              )}
            </div>

            {showPasswordGenerator && (
              <div className="password-generator">
                <h3>Password Generator</h3>
                
                <div className="gen-settings">
                  <div className="form-group">
                    <label>Length: {genSettings.length}</label>
                    <input
                      type="range"
                      min="8"
                      max="32"
                      value={genSettings.length}
                      onChange={(e) => setGenSettings({ ...genSettings, length: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.uppercase}
                        onChange={(e) => setGenSettings({ ...genSettings, uppercase: e.target.checked })}
                      />
                      Uppercase (A-Z)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.lowercase}
                        onChange={(e) => setGenSettings({ ...genSettings, lowercase: e.target.checked })}
                      />
                      Lowercase (a-z)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.numbers}
                        onChange={(e) => setGenSettings({ ...genSettings, numbers: e.target.checked })}
                      />
                      Numbers (0-9)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.symbols}
                        onChange={(e) => setGenSettings({ ...genSettings, symbols: e.target.checked })}
                      />
                      Symbols (!@#$...)
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.excludeSimilar}
                        onChange={(e) => setGenSettings({ ...genSettings, excludeSimilar: e.target.checked })}
                      />
                      Exclude similar (i, l, 1, L, o, 0, O)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={genSettings.excludeAmbiguous}
                        onChange={(e) => setGenSettings({ ...genSettings, excludeAmbiguous: e.target.checked })}
                      />
                      Exclude ambiguous ({`{} [] () / \\ ' " ~`})
                    </label>
                  </div>
                </div>

                <div className="gen-output">
                  <input
                    type="text"
                    value={generatedPassword}
                    readOnly
                    placeholder="Click generate to create password"
                  />
                  <button className="btn btn-primary" onClick={generatePassword}>
                    <FaRandom /> Generate
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={useGeneratedPassword}
                    disabled={!generatedPassword}
                  >
                    <FaCheck /> Use This
                  </button>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Website URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {passwordCategories.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Secure Notes</label>
              <textarea
                placeholder="Additional information, security questions, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSavePassword}>
                <FaCheck /> {viewMode === 'edit' ? 'Update Password' : 'Save Password'}
              </button>
              <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PasswordManager;
