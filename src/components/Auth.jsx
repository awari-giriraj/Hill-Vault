import { useState, useEffect } from 'react';
import useStore from '../store';
import { FaLock, FaShieldAlt } from 'react-icons/fa';
import './Auth.css';

function Auth() {
  const { setAuthenticated, setLocked, isLocked } = useStore();
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.electronAPI.checkFirstTime().then((firstTime) => {
      setIsFirstTime(firstTime);
    });
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <FaShieldAlt className="auth-icon" />
          <h1>VaultMind</h1>
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
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating Vault...' : 'Create Vault'}
            </button>

            <div className="security-notice">
              <FaShieldAlt />
              <div>
                <strong>Security Notice</strong>
                <p>Your vault uses AES-256 encryption. All data is stored locally with no cloud sync.</p>
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
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Unlocking...' : 'Unlock Vault'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Auth;
