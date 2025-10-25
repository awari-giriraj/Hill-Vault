import { useState, useEffect } from 'react';
import useStore from '../store';
import ReactMarkdown from 'react-markdown';
import { FaSave, FaTimes, FaEye, FaEdit, FaTag, FaPlus } from 'react-icons/fa';
import './Editor.css';

function Editor() {
  const { selectedEntry, setCurrentView, addEntry, updateEntry } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('ideas');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedEntry) {
      setTitle(selectedEntry.title);
      setContent(selectedEntry.content);
      setCategory(selectedEntry.category);
      setTags(selectedEntry.tags || []);
    }
  }, [selectedEntry]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter both title and content');
      return;
    }

    setSaving(true);

    if (selectedEntry) {
      // Update existing entry
      const result = await window.electronAPI.updateEntry({
        id: selectedEntry.id,
        title: title.trim(),
        content: content.trim(),
        tags
      });

      if (result.success) {
        const updatedEntry = {
          ...selectedEntry,
          title: title.trim(),
          content: content.trim(),
          tags,
          modified: Date.now()
        };
        updateEntry(updatedEntry);
        alert('Entry updated successfully!');
        setCurrentView('dashboard');
      } else {
        alert('Failed to update entry: ' + result.error);
      }
    } else {
      // Create new entry
      const result = await window.electronAPI.createEntry({
        category,
        title: title.trim(),
        content: content.trim(),
        tags
      });

      if (result.success) {
        const newEntry = {
          id: result.id,
          category,
          title: title.trim(),
          content: content.trim(),
          tags,
          timestamp: Date.now(),
          modified: Date.now()
        };
        addEntry(newEntry);
        alert('Entry created successfully!');
        setCurrentView('dashboard');
      } else {
        alert('Failed to create entry: ' + result.error);
      }
    }

    setSaving(false);
  };

  const handleCancel = () => {
    if (title || content) {
      if (confirm('Discard unsaved changes?')) {
        setCurrentView('dashboard');
      }
    } else {
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <select 
            className="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ideas">Ideas</option>
            <option value="drafts">Drafts</option>
            <option value="final">Final Works</option>
          </select>
          
          <button 
            className={`btn ${previewMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <FaEdit /> : <FaEye />}
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
        
        <div className="editor-toolbar-right">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <FaTimes /> Cancel
          </button>
          <button 
            className="btn btn-success" 
            onClick={handleSave}
            disabled={saving}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <input
          type="text"
          className="editor-title"
          placeholder="Entry title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="tags-section">
          <div className="tags-input">
            <FaTag />
            <input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddTag}>
              <FaPlus />
            </button>
          </div>
          
          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <span className="tag-remove" onClick={() => handleRemoveTag(tag)}>
                    ×
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {previewMode ? (
          <div className="markdown-preview">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="editor-textarea"
            placeholder="Start writing... (Markdown supported)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default Editor;
