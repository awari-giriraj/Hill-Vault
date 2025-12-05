import { useState, useEffect, useRef } from 'react';
import useStore from '../store';
import ReactMarkdown from 'react-markdown';
import { FaSave, FaTimes, FaEye, FaEdit, FaTag, FaPlus } from 'react-icons/fa';
import './Editor.css';

function Editor() {
  const { selectedEntry, setCurrentView, addEntry, updateEntry, setSelectedEntry } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('ideas');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const draftIdRef = useRef(null);

  useEffect(() => {
    if (selectedEntry) {
      setTitle(selectedEntry.title);
      setContent(selectedEntry.content);
      setCategory(selectedEntry.category);
      setTags(selectedEntry.tags || []);
      // Only set draftIdRef for actual draft entries
      if (selectedEntry.category === 'drafts') {
        draftIdRef.current = selectedEntry.id;
      } else {
        draftIdRef.current = null;
      }
      setHasUnsavedChanges(false);
    } else {
      // New entry - start fresh
      setTitle('');
      setContent('');
      setCategory('ideas');
      setTags([]);
      draftIdRef.current = null;
      setHasUnsavedChanges(false);
      setPreviewMode(false);
      setTagInput('');
    }
  }, [selectedEntry]);

  // Auto-save to drafts when content changes
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if:
    // 1. There's content and unsaved changes
    // 2. We're creating a new entry OR editing an existing draft
    // 3. NOT editing a saved entry from other categories
    const shouldAutoSave = (title.trim() || content.trim()) && 
                          hasUnsavedChanges && 
                          (!selectedEntry || selectedEntry.category === 'drafts');
    
    if (shouldAutoSave) {
      // Wait 2 seconds after user stops typing before auto-saving
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }

    // Cleanup timer on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, tags, hasUnsavedChanges]);

  // Track changes
  useEffect(() => {
    if (title || content) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags]);

  const handleAutoSave = async () => {
    // Don't auto-save if there's no content
    if (!title.trim() && !content.trim()) {
      return;
    }

    const entryData = {
      category: 'drafts', // Always auto-save to drafts
      title: title.trim() || 'Untitled Draft',
      content: content.trim() || ' ',
      tags
    };

    if (draftIdRef.current) {
      // Update existing draft
      const result = await window.electronAPI.updateEntry({
        id: draftIdRef.current,
        ...entryData
      });

      if (result.success) {
        const updatedEntry = {
          id: draftIdRef.current,
          ...entryData,
          modified: Date.now(),
          timestamp: selectedEntry?.timestamp || Date.now()
        };
        updateEntry(updatedEntry);
      }
    } else {
      // Create new draft
      const result = await window.electronAPI.createEntry(entryData);

      if (result.success) {
        draftIdRef.current = result.id;
        const newEntry = {
          id: result.id,
          ...entryData,
          timestamp: Date.now(),
          modified: Date.now()
        };
        addEntry(newEntry);
      }
    }
  };

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

    if (selectedEntry || draftIdRef.current) {
      // Update existing entry (including drafts)
      const entryId = selectedEntry?.id || draftIdRef.current;
      const result = await window.electronAPI.updateEntry({
        id: entryId,
        category, // This will move draft to the selected category
        title: title.trim(),
        content: content.trim(),
        tags
      });

      if (result.success) {
        // Clear draft reference and unsaved changes flag
        draftIdRef.current = null;
        setHasUnsavedChanges(false);
        
        const updatedEntry = {
          id: entryId,
          category,
          title: title.trim(),
          content: content.trim(),
          tags,
          modified: Date.now(),
          timestamp: selectedEntry?.timestamp || Date.now()
        };
        updateEntry(updatedEntry);
        
        // Update the local selectedEntry to reflect the changes
        // This allows user to continue editing or create new entry without issues
        setSelectedEntry(updatedEntry);
        
        alert('Entry saved successfully!');
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
        // Clear unsaved changes flag
        setHasUnsavedChanges(false);
        
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
        
        // Clear selectedEntry to allow creating another new entry
        setSelectedEntry(null);
        
        alert('Entry created successfully!');
        setCurrentView('dashboard');
      } else {
        alert('Failed to create entry: ' + result.error);
      }
    }

    setSaving(false);
  };

  const handleCancel = async () => {
    // Auto-save before canceling if there are unsaved changes
    if ((title.trim() || content.trim()) && hasUnsavedChanges) {
      const shouldSave = confirm('You have unsaved changes. Save as draft before closing?');
      
      if (shouldSave) {
        await handleAutoSave();
        alert('Changes saved to drafts!');
      }
    }
    
    setCurrentView('dashboard');
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

          {hasUnsavedChanges && (
            <span className="auto-save-indicator">
              ● Unsaved changes (auto-saving to drafts...)
            </span>
          )}
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
