import { useState } from 'react';
import './PagePanel.css';

const Icons = {
  Plus: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="4" x2="10" y2="16" />
      <line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 17 6" />
      <path d="M16 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="8" height="8" rx="1" />
      <path d="M13 5H5a2 2 0 00-2 2v8" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 10 8 14 16 6" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
    </svg>
  ),
  Page: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 4 14 10 8 16" />
    </svg>
  ),
};

function PagePanel({ pages, currentPageId, onCreatePage, onDeletePage, onRenamePage, onSwitchPage, onDuplicatePage }) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleStartEdit = (page) => {
    setEditingId(page.id);
    setEditingName(page.name);
  };

  const handleConfirmEdit = () => {
    if (editingId && editingName.trim()) {
      onRenamePage(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={`section-chevron ${isExpanded ? 'expanded' : ''}`}>
          <Icons.ChevronRight />
        </span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
          <line x1="6" y1="9" x2="14" y2="9" />
          <line x1="6" y1="13" x2="10" y2="13" />
        </svg>
        <span>页面</span>
        {isExpanded && (
          <button 
            className="page-panel-add-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage();
            }}
            title="新建页面"
          >
            <Icons.Plus />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="page-panel-list">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`page-panel-item ${currentPageId === page.id ? 'active' : ''}`}
              onClick={() => onSwitchPage(page.id)}
            >
              <div className="page-panel-item-icon">
                <Icons.Page />
              </div>
              {editingId === page.id ? (
                <div className="page-panel-item-edit">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    className="page-panel-item-btn confirm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmEdit();
                    }}
                  >
                    <Icons.Check />
                  </button>
                  <button 
                    className="page-panel-item-btn cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                  >
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <>
                  <div className="page-panel-item-name">{page.name}</div>
                  <div className="page-panel-item-actions">
                    <button 
                      className="page-panel-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(page);
                      }}
                      title="重命名"
                    >
                      <Icons.Edit />
                    </button>
                    <button 
                      className="page-panel-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(page.id);
                      }}
                      title="复制页面"
                    >
                      <Icons.Copy />
                    </button>
                    <button 
                      className="page-panel-item-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(page.id);
                      }}
                      title="删除页面"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PagePanel;
