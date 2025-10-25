import { useState, useEffect } from 'react';
import useStore from '../store';
import { format } from 'date-fns';
import { FaClock, FaTag, FaEdit, FaTrash } from 'react-icons/fa';
import './Dashboard.css';

function Dashboard() {
  const { 
    selectedCategory, 
    entries, 
    setEntries, 
    searchQuery, 
    filterTags,
    setFilterTags,
    tags,
    setTags,
    setSelectedEntry,
    setCurrentView,
    removeEntry
  } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [showTagFilter, setShowTagFilter] = useState(false);

  useEffect(() => {
    loadEntries();
    loadTags();
  }, [selectedCategory, searchQuery, filterTags]);

  const loadEntries = async () => {
    setLoading(true);
    const result = await window.electronAPI.getEntries({
      category: selectedCategory === 'all' ? null : selectedCategory,
      search: searchQuery,
      tags: filterTags.length > 0 ? filterTags : null
    });
    
    if (result.success) {
      setEntries(result.entries);
    }
    setLoading(false);
  };

  const loadTags = async () => {
    const result = await window.electronAPI.getAllTags();
    if (result.success) {
      setTags(result.tags);
    }
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setCurrentView('editor');
  };

  const handleDeleteEntry = async (id) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      const result = await window.electronAPI.deleteEntry(id);
      if (result.success) {
        removeEntry(id);
      }
    }
  };

  const toggleTagFilter = (tag) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter(t => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading entries...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>
            {selectedCategory === 'all' ? 'All Items' : 
             selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </h1>
          <p className="entry-count">{entries.length} entries</p>
        </div>
        
        {tags.length > 0 && (
          <button 
            className={`btn ${showTagFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowTagFilter(!showTagFilter)}
          >
            <FaTag /> Filter by Tags
          </button>
        )}
      </div>

      {showTagFilter && tags.length > 0 && (
        <div className="tag-filter">
          <p>Select tags to filter:</p>
          <div className="tag-list">
            {tags.map(tag => (
              <button
                key={tag}
                className={`tag ${filterTags.includes(tag) ? 'tag-active' : ''}`}
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>No entries yet</h2>
          <p>Start creating your first entry to see it here</p>
        </div>
      ) : (
        <div className="entries-grid">
          {entries.map(entry => (
            <div key={entry.id} className="entry-card fade-in">
              <div className="entry-header">
                <h3>{entry.title}</h3>
                <div className="entry-actions">
                  <button 
                    className="entry-action-btn"
                    onClick={() => handleEditEntry(entry)}
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="entry-action-btn delete-btn"
                    onClick={() => handleDeleteEntry(entry.id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <p className="entry-content">
                {entry.content.substring(0, 150)}
                {entry.content.length > 150 ? '...' : ''}
              </p>
              
              <div className="entry-footer">
                <div className="entry-meta">
                  <FaClock />
                  <span>{format(new Date(entry.timestamp), 'MMM d, yyyy')}</span>
                </div>
                
                {entry.tags && entry.tags.length > 0 && (
                  <div className="entry-tags">
                    {entry.tags.map(tag => (
                      <span key={tag} className="tag-small">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
