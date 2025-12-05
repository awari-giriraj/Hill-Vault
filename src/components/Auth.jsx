import { useState, useEffect } from 'react';
import useStore from '../store';
import { FaLock, FaShieldAlt, FaCheck, FaTimes } from 'react-icons/fa';
import './Auth.css';

function Auth() {
  const { setAuthenticated, setLocked, isLocked } = useStore();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    window.electronAPI.checkFirstTime().then((firstTime) => {
      setIsFirstTime(firstTime);
    });
  }, []);
  
  useEffect(() => {
    if (isFirstTime && password) {
      checkPasswordStrength();
    }
  }, [password, isFirstTime]);
  
  const checkPasswordStrength = async () => {
    const result = await window.electronAPI.validatePasswordStrength({ password });
    if (result.success) {
      setPasswordStrength(result.strength);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Password must be at least 12 characters long');
      return;
    }
    
    if (passwordStrength && passwordStrength.score < 4) {
      setError('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await window.electronAPI.setupVault(password);
    setLoading(false);

    if (result.success) {
      setAuthenticated(true);
      setLocked(false);
    } else {
      setError(result.error);
    }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await window.electronAPI.unlockVault(password);
    setLoading(false);

    if (result.success) {
      setAuthenticated(true);
      setLocked(false);
    } else {
      setError(result.error);
    }
  };

  const getStrengthColor = (score) => {
    if (score <= 2) return '#ef4444';
    if (score === 3) return '#f59e0b';
    if (score === 4) return '#10b981';
    return '#10b981';
  };
  
  const getStrengthText = (score) => {
    if (score <= 2) return 'Weak';
    if (score === 3) return 'Medium';
    if (score === 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <FaShieldAlt className="auth-icon" />
          <h1>HillVault</h1>
          <p>Secure Offline Creative Vault</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <FaLock />
            <span>{error}</span>
          </div>
        )}

        {isFirstTime ? (
          <form onSubmit={handleSetup} className="auth-form">
            <h2>Create Your Vault</h2>
            <p className="auth-description">
              Set up a strong password to encrypt your vault. This password cannot be recovered if lost.
            </p>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password (min 12 characters)"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              
              {passwordStrength && password.length > 0 && (
                <div className="password-strength">
                  <div className="strength-bar-container">
                    <div 
                      className="strength-bar" 
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        background: getStrengthColor(passwordStrength.score)
                      }} 
                    />
                  </div>
                  <div className="strength-text" style={{ color: getStrengthColor(passwordStrength.score) }}>
                    {getStrengthText(passwordStrength.score)}
                  </div>
                  <div className="strength-requirements">
                    <span className={passwordStrength.length ? 'met' : 'unmet'}>
                      {passwordStrength.length ? <FaCheck /> : <FaTimes />}
                      12+ characters
                    </span>
                    <span className={passwordStrength.uppercase ? 'met' : 'unmet'}>
                      {passwordStrength.uppercase ? <FaCheck /> : <FaTimes />}
                      Uppercase
                    </span>
                    <span className={passwordStrength.lowercase ? 'met' : 'unmet'}>
                      {passwordStrength.lowercase ? <FaCheck /> : <FaTimes />}
                      Lowercase
                    </span>
                    <span className={passwordStrength.numbers ? 'met' : 'unmet'}>
                      {passwordStrength.numbers ? <FaCheck /> : <FaTimes />}
                      Numbers
                    </span>
                    <span className={passwordStrength.special ? 'met' : 'unmet'}>
                      {passwordStrength.special ? <FaCheck /> : <FaTimes />}
                      Special (!@#$%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <div className="alert alert-warning" style={{ fontSize: '13px', marginBottom: '16px' }}>
              <strong>⚠️ Important:</strong> If you forget your password, your data cannot be recovered. Write it down in a safe place!
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating Vault...' : '🔒 Create Vault'}
            </button>

            <div className="security-notice">
              <FaShieldAlt />
              <div>
                <strong>Military-Grade Security</strong>
                <p>Your data is protected with AES-256 encryption. Only you can access your vault.</p>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="auth-form">
            <h2>{isLocked ? 'Vault Locked' : 'Unlock Your Vault'}</h2>
            <p className="auth-description">
              {isLocked ? 'Your vault has been locked due to inactivity.' : 'Enter your password to access your vault.'}
            </p>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Unlocking...' : '🔓 Unlock Vault'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Auth;
