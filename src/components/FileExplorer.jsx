import { useState, useEffect } from 'react';
import useStore from '../store';
import { 
  FaFolder, 
  FaFolderOpen, 
  FaFile, 
  FaPlus, 
  FaUpload, 
  FaDownload,
  FaEdit,
  FaTrash,
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaImage,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileVideo,
  FaFileAudio,
  FaFileArchive,
  FaFileCode,
  FaTimes
} from 'react-icons/fa';
import './FileExplorer.css';

function FileExplorer() {
  const { setCurrentView } = useStore();
  const [folderTree, setFolderTree] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadFolderTree();
  }, []);

  useEffect(() => {
    if (currentFolder) {
      loadFiles(currentFolder.id);
    }
  }, [currentFolder]);

  const loadFolderTree = async () => {
    const result = await window.electronAPI.getFolderTree();
    if (result.success) {
      setFolderTree(result.tree);
      if (result.tree.length > 0 && !currentFolder) {
        setCurrentFolder(result.tree[0]);
        setExpandedFolders(new Set([result.tree[0].id]));
      }
    }
  };

  const loadFiles = async (folderId) => {
    const result = await window.electronAPI.getFiles({ folderId });
    if (result.success) {
      setFiles(result.files);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    const result = await window.electronAPI.createFolder({
      name: newFolderName,
      parentId: currentFolder?.id || null
    });

    if (result.success) {
      setNewFolderName('');
      setShowNewFolderDialog(false);
      await loadFolderTree();
    } else {
      alert('Failed to create folder: ' + result.error);
    }
  };

  const handleUploadFiles = async () => {
    if (!currentFolder) {
      alert('Please select a folder first');
      return;
    }

    const result = await window.electronAPI.uploadFile({
      folderId: currentFolder.id
    });

    if (result.success) {
      await loadFiles(currentFolder.id);
      alert(`${result.files.length} file(s) uploaded successfully!`);
    } else if (result.error && !result.error.includes('cancelled')) {
      alert('Upload failed: ' + result.error);
    }
  };

  const handleOpenFile = async (fileId) => {
    const result = await window.electronAPI.openFile({ fileId });
    if (!result.success) {
      alert('Failed to open file: ' + result.error);
    }
  };

  const handleDownloadFile = async (fileId) => {
    const result = await window.electronAPI.downloadFile({ fileId });
    if (result.success) {
      alert('File downloaded successfully!');
    } else if (result.error && !result.error.includes('cancelled')) {
      alert('Download failed: ' + result.error);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    const result = await window.electronAPI.deleteFile({ fileId });
    if (result.success) {
      await loadFiles(currentFolder.id);
    } else {
      alert('Failed to delete file: ' + result.error);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!confirm(`Delete folder "${folderName}" and all its contents?`)) return;

    const result = await window.electronAPI.deleteFolder({ folderId });
    if (result.success) {
      await loadFolderTree();
      if (currentFolder?.id === folderId) {
        setCurrentFolder(folderTree[0]);
      }
    } else {
      alert('Failed to delete folder: ' + result.error);
    }
  };

  const handleRenameFile = async (fileId) => {
    if (!renameValue.trim()) return;

    const result = await window.electronAPI.renameFile({
      fileId,
      newName: renameValue
    });

    if (result.success) {
      setRenaming(null);
      setRenameValue('');
      await loadFiles(currentFolder.id);
    } else {
      alert('Failed to rename file: ' + result.error);
    }
  };

  const handleRenameFolder = async (folderId) => {
    if (!renameValue.trim()) return;

    const result = await window.electronAPI.renameFolder({
      folderId,
      newName: renameValue
    });

    if (result.success) {
      setRenaming(null);
      setRenameValue('');
      await loadFolderTree();
    } else {
      alert('Failed to rename folder: ' + result.error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const result = await window.electronAPI.searchFiles({ query: searchQuery });
    if (result.success) {
      setSearchResults(result.files);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (filetype) => {
    const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const videoTypes = ['.mp4', '.avi', '.mkv', '.mov', '.wmv'];
    const audioTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac'];
    const docTypes = ['.doc', '.docx', '.odt'];
    const archiveTypes = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    const codeTypes = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.css', '.html'];

    if (imageTypes.includes(filetype)) return <FaImage />;
    if (filetype === '.pdf') return <FaFilePdf />;
    if (docTypes.includes(filetype)) return <FaFileWord />;
    if (['.xls', '.xlsx'].includes(filetype)) return <FaFileExcel />;
    if (videoTypes.includes(filetype)) return <FaFileVideo />;
    if (audioTypes.includes(filetype)) return <FaFileAudio />;
    if (archiveTypes.includes(filetype)) return <FaFileArchive />;
    if (codeTypes.includes(filetype)) return <FaFileCode />;
    return <FaFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolder?.id === folder.id;

    return (
      <div key={folder.id} className="folder-item-container">
        <div
          className={`folder-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
          onClick={() => setCurrentFolder(folder)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ type: 'folder', item: folder, x: e.clientX, y: e.clientY });
          }}
        >
          <button
            className="folder-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
          >
            {folder.children.length > 0 && (
              isExpanded ? <FaChevronDown /> : <FaChevronRight />
            )}
          </button>
          {isExpanded ? <FaFolderOpen /> : <FaFolder />}
          {renaming?.type === 'folder' && renaming.id === folder.id ? (
            <input
              className="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder.id);
                if (e.key === 'Escape') {
                  setRenaming(null);
                  setRenameValue('');
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="folder-name">{folder.name}</span>
          )}
        </div>
        {isExpanded && folder.children.length > 0 && (
          <div className="folder-children">
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h2>📁 File Explorer</h2>
        <button className="btn btn-secondary" onClick={() => setCurrentView('dashboard')}>
          <FaTimes /> Close
        </button>
      </div>

      <div className="explorer-toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => setShowNewFolderDialog(true)}>
            <FaPlus /> New Folder
          </button>
          <button className="btn btn-success" onClick={handleUploadFiles}>
            <FaUpload /> Upload Files
          </button>
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>
              <FaSearch />
            </button>
          </div>
        </div>
      </div>

      <div className="explorer-content">
        <div className="sidebar-tree">
          <h3>Folders</h3>
          <div className="folder-tree">
            {folderTree.map(folder => renderFolder(folder))}
          </div>
        </div>

        <div className="files-area">
          {searchQuery && searchResults.length > 0 ? (
            <>
              <h3>Search Results ({searchResults.length})</h3>
              <div className="files-grid">
                {searchResults.map(file => (
                  <div key={file.id} className="file-card">
                    <div className="file-icon">
                      {getFileIcon(file.filetype)}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{file.original_name}</div>
                      <div className="file-meta">
                        {formatFileSize(file.size)} • {file.folder_path}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className="btn-sm"
                        onClick={() => handleOpenFile(file.id)}
                        title="Open"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="breadcrumb">
                <FaFolder /> {currentFolder?.path || '/'}
              </div>
              <div className="files-grid">
                {files.length === 0 ? (
                  <div className="empty-folder">
                    <FaFolder size={64} color="#ccc" />
                    <p>This folder is empty</p>
                    <button className="btn btn-primary" onClick={handleUploadFiles}>
                      <FaUpload /> Upload Files
                    </button>
                  </div>
                ) : (
                  files.map(file => (
                    <div
                      key={file.id}
                      className="file-card"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ type: 'file', item: file, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <div className="file-icon">
                        {getFileIcon(file.filetype)}
                      </div>
                      <div className="file-info">
                        {renaming?.type === 'file' && renaming.id === file.id ? (
                          <input
                            className="rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameFile(file.id)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleRenameFile(file.id);
                              if (e.key === 'Escape') {
                                setRenaming(null);
                                setRenameValue('');
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="file-name"
                            onDoubleClick={() => handleOpenFile(file.id)}
                          >
                            {file.original_name}
                          </div>
                        )}
                        <div className="file-meta">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <div className="file-actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenFile(file.id)}
                          title="Open"
                        >
                          Open
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDownloadFile(file.id)}
                          title="Download"
                        >
                          <FaDownload />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setRenaming({ type: 'file', id: file.id });
                            setRenameValue(file.original_name);
                          }}
                          title="Rename"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteFile(file.id, file.original_name)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showNewFolderDialog && (
        <div className="modal-overlay" onClick={() => setShowNewFolderDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Folder</h3>
            <input
              type="text"
              className="input"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNewFolderDialog(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateFolder}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.type === 'file' && (
            <>
              <button onClick={() => {
                handleOpenFile(contextMenu.item.id);
                setContextMenu(null);
              }}>
                Open
              </button>
              <button onClick={() => {
                handleDownloadFile(contextMenu.item.id);
                setContextMenu(null);
              }}>
                <FaDownload /> Download
              </button>
              <button onClick={() => {
                setRenaming({ type: 'file', id: contextMenu.item.id });
                setRenameValue(contextMenu.item.original_name);
                setContextMenu(null);
              }}>
                <FaEdit /> Rename
              </button>
              <button
                className="danger"
                onClick={() => {
                  handleDeleteFile(contextMenu.item.id, contextMenu.item.original_name);
                  setContextMenu(null);
                }}
              >
                <FaTrash /> Delete
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={() => {
                setRenaming({ type: 'folder', id: contextMenu.item.id });
                setRenameValue(contextMenu.item.name);
                setContextMenu(null);
              }}>
                <FaEdit /> Rename
              </button>
              <button
                className="danger"
                onClick={() => {
                  handleDeleteFolder(contextMenu.item.id, contextMenu.item.name);
                  setContextMenu(null);
                }}
              >
                <FaTrash /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
