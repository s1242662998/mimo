import './Toolbar.css';

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
  </svg>
);

const ClearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

const ImportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const PasteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const DuplicateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <rect x="4" y="4" width="12" height="12" rx="2" />
  </svg>
);

const GridIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const GuideIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    {active && <circle cx="12" cy="12" r="3" fill="currentColor" />}
  </svg>
);

const BringToFrontIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M4 16V8a2 2 0 012-2h8" />
  </svg>
);

const SendToBackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="12" height="12" rx="2" />
    <path d="M16 8h4a2 2 0 012 2v8" />
  </svg>
);

const AlignLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="4" x2="4" y2="20" />
    <rect x="8" y="6" width="12" height="4" />
    <rect x="8" y="14" width="8" height="4" />
  </svg>
);

const AlignCenterHIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="4" x2="12" y2="20" />
    <rect x="6" y="6" width="12" height="4" />
    <rect x="8" y="14" width="8" height="4" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="20" y1="4" x2="20" y2="20" />
    <rect x="4" y="6" width="12" height="4" />
    <rect x="8" y="14" width="8" height="4" />
  </svg>
);

const AlignTopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="4" x2="20" y2="4" />
    <rect x="6" y="8" width="4" height="12" />
    <rect x="14" y="8" width="4" height="8" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="12" x2="20" y2="12" />
    <rect x="6" y="6" width="4" height="12" />
    <rect x="14" y="8" width="4" height="8" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="4" width="4" height="12" />
    <rect x="14" y="8" width="4" height="8" />
  </svg>
);

const AIAssistantIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2z" />
    <path d="M19 8h-1.5a1.5 1.5 0 0 0-1.5 1.5v4.5A1.5 1.5 0 0 0 17.5 15.5h1a2.5 2.5 0 0 1 0 5H16" />
    <path d="M5 8h1.5A1.5 1.5 0 0 1 8 9.5v4.5A1.5 1.5 0 0 1 6.5 15.5h-1a2.5 2.5 0 0 0 0 5h2.5" />
    <path d="M12 6v14" />
    <path d="M9 13h6" />
  </svg>
);

const GroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
    <path d="M11 7h6a2 2 0 0 1 2 2v6" />
  </svg>
);

const UngroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
    <path d="M7 11v-4" />
    <path d="M17 13v4" />
  </svg>
);

export default function Toolbar({
  onDelete,
  onClear,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onImport,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDuplicate,
  onGroup,
  onUngroup,
  canUndo,
  canRedo,
  canGroup,
  canUngroup,
  snapToGrid,
  onToggleSnapToGrid,
  showGuides,
  onToggleGuides,
  hasSelection,
  onAlign,
  multiSelected,
  showRagChat,
  onToggleRagChat,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={onImport} title="导入截图">
          <ImportIcon />
          <span>导入</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button 
          className={`ai-assistant-btn ${showRagChat ? 'active' : ''}`}
          onClick={onToggleRagChat} 
          title="AI 助手"
        >
          <AIAssistantIcon active={showRagChat} />
          <span>AI 助手</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
          <UndoIcon />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Y)">
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={onCopy} disabled={!hasSelection} title="复制 (Ctrl+C)">
          <CopyIcon />
        </button>
        <button onClick={onPaste} title="粘贴 (Ctrl+V)">
          <PasteIcon />
        </button>
        <button onClick={onDuplicate} disabled={!hasSelection} title="复制并粘贴 (Ctrl+D)">
          <DuplicateIcon />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={onDelete} disabled={!hasSelection} title="删除选中 (Delete)">
          <TrashIcon />
        </button>
        <button className="danger" onClick={onClear} title="清空画布">
          <ClearIcon />
          <span>清空</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={onBringToFront} disabled={!hasSelection} title="置于顶层">
          <BringToFrontIcon />
        </button>
        <button onClick={onBringForward} disabled={!hasSelection} title="上移一层">
          <ArrowUpIcon />
        </button>
        <button onClick={onSendBackward} disabled={!hasSelection} title="下移一层">
          <ArrowDownIcon />
        </button>
        <button onClick={onSendToBack} disabled={!hasSelection} title="置于底层">
          <SendToBackIcon />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={snapToGrid ? 'active' : ''}
          onClick={onToggleSnapToGrid}
          title="网格吸附"
        >
          <GridIcon active={snapToGrid} />
        </button>
        <button
          className={showGuides ? 'active' : ''}
          onClick={onToggleGuides}
          title="对齐辅助线"
        >
          <GuideIcon active={showGuides} />
        </button>
      </div>

      {multiSelected && (
        <>
          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button onClick={() => onAlign?.('left')} disabled={!multiSelected} title="左对齐">
              <AlignLeftIcon />
            </button>
            <button onClick={() => onAlign?.('centerX')} disabled={!multiSelected} title="水平居中">
              <AlignCenterHIcon />
            </button>
            <button onClick={() => onAlign?.('right')} disabled={!multiSelected} title="右对齐">
              <AlignRightIcon />
            </button>
            <button onClick={() => onAlign?.('top')} disabled={!multiSelected} title="顶对齐">
              <AlignTopIcon />
            </button>
            <button onClick={() => onAlign?.('centerY')} disabled={!multiSelected} title="垂直居中">
              <AlignCenterVIcon />
            </button>
            <button onClick={() => onAlign?.('bottom')} disabled={!multiSelected} title="底对齐">
              <AlignBottomIcon />
            </button>
          </div>
        </>
      )}

      {(canGroup || canUngroup) && (
        <>
          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <button onClick={onGroup} disabled={!canGroup} title="成组 (Ctrl+G)">
              <GroupIcon />
            </button>
            <button onClick={onUngroup} disabled={!canUngroup} title="解组 (Ctrl+Shift+G)">
              <UngroupIcon />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
