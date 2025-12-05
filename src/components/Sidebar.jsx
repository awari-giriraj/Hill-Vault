import useStore from '../store';
import { FaHome, FaLightbulb, FaEdit, FaPalette, FaCheckCircle, FaPlus, FaFolderOpen, FaKey } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar() {
  const { selectedCategory, setSelectedCategory, setCurrentView, setSelectedEntry } = useStore();

  const categories = [
    { id: 'all', name: 'All Items', icon: FaHome },
    { id: 'ideas', name: 'Ideas', icon: FaLightbulb },
    { id: 'drafts', name: 'Drafts', icon: FaEdit },
    { id: 'sketches', name: 'Sketches', icon: FaPalette },
    { id: 'final', name: 'Final Works', icon: FaCheckCircle }
  ];

  const handleNewEntry = () => {
    setSelectedEntry(null);
    setCurrentView('editor');
  };

  const handleNewSketch = () => {
    setSelectedEntry(null);
    setCurrentView('sketchpad');
  };

  const handleFileExplorer = () => {
    setCurrentView('fileExplorer');
  };

  const handlePasswordManager = () => {
    setCurrentView('passwordManager');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>HillVault</h2>
      </div>

      <div className="sidebar-actions">
        <button className="btn btn-primary sidebar-btn" onClick={handleNewEntry}>
          <FaPlus /> New Entry
        </button>
        <button className="btn btn-secondary sidebar-btn" onClick={handleNewSketch}>
          <FaPalette /> New Sketch
        </button>
        <button className="btn btn-success sidebar-btn" onClick={handleFileExplorer}>
          <FaFolderOpen /> File Explorer
        </button>
        <button className="btn btn-warning sidebar-btn" onClick={handlePasswordManager}>
          <FaKey /> Passwords
        </button>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-label">Categories</p>
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentView('dashboard');
              }}
            >
              <Icon />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar;
