import { useState } from 'react';
import useStore from '../store';
import { FaSearch, FaMoon, FaSun, FaLock, FaDownload, FaUpload, FaExclamationTriangle } from 'react-icons/fa';
import './Header.css';

function Header() {
  const { theme, toggleTheme, searchQuery, setSearchQuery, reset } = useStore();
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const handleLock = async () => {
    await window.electronAPI.lockVault();
    reset();
  };

  const handleExport = async () => {
    const result = await window.electronAPI.exportVault();
    if (result.success) {
      alert('Vault exported successfully!');
    } else if (result.error && !result.error.includes('cancelled')) {
      alert('Export failed: ' + result.error);
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.importVault();
    if (result.success) {
      alert(`Successfully imported ${result.imported} entries!`);
      window.location.reload();
    } else if (result.error && !result.error.includes('cancelled')) {
      alert('Import failed: ' + result.error);
    }
  };

  const handlePanicWipe = async () => {
    const result = await window.electronAPI.panicWipe();
    if (result.success) {
      alert('Vault wiped successfully. All encryption keys have been destroyed.');
      reset();
      window.location.reload();
    }
  };

  return (
    <header className="header">
      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search your vault..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <button className="icon-btn" onClick={handleExport} title="Export Vault">
          <FaDownload />
        </button>
        <button className="icon-btn" onClick={handleImport} title="Import Vault">
          <FaUpload />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
        <button className="icon-btn" onClick={handleLock} title="Lock Vault">
          <FaLock />
        </button>
        <button 
          className="icon-btn panic-btn" 
          onClick={() => setShowPanicConfirm(true)}
          title="Panic Wipe"
        >
          <FaExclamationTriangle />
        </button>
      </div>

      {showPanicConfirm && (
        <div className="modal-overlay" onClick={() => setShowPanicConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Panic Wipe Confirmation</h2>
            <p className="panic-warning">
              This will permanently delete all encryption keys and destroy access to your vault.
              This action CANNOT be undone!
            </p>
            <p>Are you absolutely sure you want to proceed?</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPanicConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => {
                setShowPanicConfirm(false);
                handlePanicWipe();
              }}>
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
