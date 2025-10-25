import { useState, useEffect } from 'react';
import useStore from './store';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Editor from './components/Editor';
import Sketchpad from './components/Sketchpad';
import './App.css';

function App() {
  const { isAuthenticated, isLocked, currentView, setLocked, reset } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if vault is already set up
    window.electronAPI.checkFirstTime().then((isFirstTime) => {
      setLoading(false);
    });

    // Listen for vault lock events
    window.electronAPI.onVaultLocked(() => {
      setLocked(true);
    });

    return () => {
      window.electronAPI.removeVaultLockedListener();
    };
  }, [setLocked]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading VaultMind...</p>
      </div>
    );
  }

  if (!isAuthenticated || isLocked) {
    return <Auth />;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-area">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'editor' && <Editor />}
          {currentView === 'sketchpad' && <Sketchpad />}
        </div>
      </div>
    </div>
  );
}

export default App;
