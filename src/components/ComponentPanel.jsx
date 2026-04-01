import { useState } from 'react';
import { componentList } from './componentList';
import { iconLibrary, iconCategories } from '../data/icons';
import './ComponentPanel.css';

const Icons = {
  Button: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="14" height="8" rx="2" />
    </svg>
  ),
  Input: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="16" height="8" rx="1.5" />
      <line x1="5" y1="10" x2="12" y2="10" />
    </svg>
  ),
  Text: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="16" y2="6" />
      <line x1="4" y1="10" x2="13" y2="10" />
      <line x1="4" y1="14" x2="10" y2="14" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <circle cx="7.5" cy="7.5" r="1.5" />
      <path d="M3 14l4-4 3 3 4-5 3 4" />
    </svg>
  ),
  Rect: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="10" rx="1" />
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
    </svg>
  ),
  Triangle: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L17 17H3L10 3Z" />
    </svg>
  ),
  Line: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="10" x2="17" y2="10" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L2 7l8 5 8-5-8-5z" />
      <path d="M2 12l8 5 8-5" />
    </svg>
  ),
  DragHandle: () => (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7" cy="6" r="1.5" />
      <circle cx="13" cy="6" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="14" r="1.5" />
      <circle cx="13" cy="14" r="1.5" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="9" width="10" height="8" rx="1" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  ),
  Unlock: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="9" width="10" height="8" rx="1" />
      <path d="M7 9V6a3 3 0 016 0" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 4 14 10 8 16" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 8 10 14 16 8" />
    </svg>
  ),
};

const IconMap = {
  button: Icons.Button,
  input: Icons.Input,
  text: Icons.Text,
  image: Icons.Image,
  rectangle: Icons.Rect,
  circle: Icons.Circle,
  triangle: Icons.Triangle,
  line: Icons.Line,
  group: Icons.Layers,
  icon: Icons.Image,
};

const TypeNameMap = {
  button: '按钮',
  input: '输入框',
  text: '文本',
  image: '图片',
  rectangle: '矩形',
  circle: '圆形',
  triangle: '三角形',
  line: '线条',
  icon: '图标',
};

function DraggableItem({ component }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const Icon = IconMap[component.id];

  return (
    <div className="component-item" draggable onDragStart={handleDragStart}>
      <div className="component-icon">
        {Icon && <Icon />}
      </div>
      <span>{component.name}</span>
    </div>
  );
}

function DraggableIcon({ icon }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('component', JSON.stringify({
      id: `icon-${icon.id}`,
      name: icon.name,
      type: 'icon',
      props: {
        iconId: icon.id,
        iconPath: icon.path,
        width: 24,
        height: 24,
        stroke: '#64748B',
        strokeWidth: 2,
        fill: '#FFFFFF',
      },
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="icon-item" draggable onDragStart={handleDragStart} title={icon.name}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
      <span className="icon-name">{icon.name}</span>
    </div>
  );
}

function IconLibraryPanel() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filteredIcons = iconLibrary.filter(icon => {
    const matchesCategory = selectedCategory === 'all' || icon.category === selectedCategory;
    const matchesSearch = icon.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         icon.id.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedIcons = {};
  filteredIcons.forEach(icon => {
    if (!groupedIcons[icon.category]) {
      groupedIcons[icon.category] = [];
    }
    groupedIcons[icon.category].push(icon);
  });

  return (
    <div className="panel-section icon-library-section">
      <div className="panel-section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>图标库</span>
      </div>
      <div className="icon-library-content">
        <input
          type="text"
          className="icon-search"
          placeholder="搜索图标..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div className="icon-categories">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            全部
          </button>
          {Object.entries(iconCategories).map(([key, label]) => (
            <button
              key={key}
              className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="icon-list">
          {Object.entries(groupedIcons).map(([category, icons]) => (
            <div key={category} className="icon-category-group">
              {selectedCategory === 'all' && (
                <div className="icon-category-title">{iconCategories[category] || category}</div>
              )}
              <div className="icon-grid">
                {icons.map(icon => (
                  <DraggableIcon key={icon.id} icon={icon} />
                ))}
              </div>
            </div>
          ))}
          {filteredIcons.length === 0 && (
            <div className="icon-empty">未找到匹配的图标</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LayerItem({
  shape,
  index,
  isSelected,
  isMultiSelected,
  onSelect,
  onMultiSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleVisibility,
  onToggleLock,
  isExpanded,
  onToggleExpand,
  selectedIds,
}) {
  const isGroup = shape.type === 'group';
  const Icon = isGroup ? Icons.Layers : (IconMap[shape.id.split('-')[0]] || Icons.Rect);
  const typeName = isGroup ? '组' : (TypeNameMap[shape.id.split('-')[0]] || '形状');
  const isVisible = shape.visible !== false;
  const isLocked = shape.locked === true;

  const handleClick = (e) => {
    if (e.ctrlKey || e.metaKey) {
      onMultiSelect(shape.id);
    } else {
      onSelect(shape.id);
    }
  };

  return (
    <>
      <div
        className={`layer-item ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${!isVisible ? 'hidden-layer' : ''} ${isGroup ? 'group-item' : ''}`}
        draggable={!isLocked}
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
        onClick={handleClick}
      >
        {isGroup && (
          <button
            className="layer-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(shape.id);
            }}
          >
            {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
          </button>
        )}
        {!isGroup && <div className="layer-drag-handle">
          <Icons.DragHandle />
        </div>}
        <div className="layer-icon">
          <Icon />
        </div>
        <span className="layer-name" title={shape.id}>{typeName}（{shape.id}）</span>
        <div className="layer-actions">
          <button
            className={`layer-action-btn ${!isVisible ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(shape.id);
            }}
            title={isVisible ? '隐藏' : '显示'}
          >
            {isVisible ? <Icons.Eye /> : <Icons.EyeOff />}
          </button>
          <button
            className={`layer-action-btn ${isLocked ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(shape.id);
            }}
            title={isLocked ? '解锁' : '锁定'}
          >
            {isLocked ? <Icons.Lock /> : <Icons.Unlock />}
          </button>
        </div>
      </div>
      {isGroup && isExpanded && shape.children?.map((child, childIndex) => (
        <div
          key={child.id}
          className={`layer-item layer-child-item ${selectedIds?.includes(child.id) ? 'selected multi-selected' : ''} ${child.visible === false ? 'hidden-layer' : ''}`}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              onMultiSelect(child.id);
            } else {
              onSelect(child.id);
            }
          }}
        >
          <div className="layer-drag-handle" style={{ width: 24 }}></div>
          <div className="layer-icon">
            {IconMap[child.id?.split('-')[0]] ? (() => { const ChildIcon = IconMap[child.id.split('-')[0]]; return <ChildIcon />; })() : <Icons.Rect />}
          </div>
          <span className="layer-name" title={child.id}>{TypeNameMap[child.id?.split('-')[0]] || '形状'}（{child.id}）</span>
        </div>
      ))}
    </>
  );
}

export default function ComponentPanel({
  shapes,
  selectedId,
  selectedIds,
  onSelect,
  onSelectMultiple,
  onReorder,
}) {
  const [expandedGroups, setExpandedGroups] = useState({});

  const handleToggleExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleLayerDragStart = (e, index) => {
    e.dataTransfer.setData('layerIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLayerDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('layerIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    onReorder(sourceIndex, targetIndex);
  };

  const handleLayerDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  const handleMultiSelect = (id) => {
    if (selectedIds.includes(id)) {
      const newSelectedIds = selectedIds.filter(sid => sid !== id);
      onSelectMultiple(newSelectedIds);
      if (newSelectedIds.length > 0) {
        onSelect(newSelectedIds[0]);
      } else {
        onSelect(null);
      }
    } else {
      onSelectMultiple([...selectedIds, id]);
      onSelect(id);
    }
  };

  const handleToggleVisibility = (id) => {
    // 这里需要通过父组件来更新shape的visible属性
    // 暂时通过全局事件来处理
    const event = new CustomEvent('toggleVisibility', { detail: { id } });
    window.dispatchEvent(event);
  };

  const handleToggleLock = (id) => {
    // 这里需要通过父组件来更新shape的locked属性
    const event = new CustomEvent('toggleLock', { detail: { id } });
    window.dispatchEvent(event);
  };

  return (
    <aside className="component-panel">
      <div className="panel-section">
        <div className="panel-section-header">
          <span>组件</span>
        </div>
        <div className="component-list">
          {componentList.map((comp) => (
            <DraggableItem key={comp.id} component={comp} />
          ))}
        </div>
      </div>

      <IconLibraryPanel />

      <div className="panel-section layers-section">
        <div className="panel-section-header">
          <Icons.Layers />
          <span>图层</span>
          <span className="layer-count">{shapes.length}</span>
        </div>
        <div className="layer-list">
          {shapes.length === 0 ? (
            <div className="layer-empty">暂无元素</div>
          ) : (
            [...shapes].reverse().map((shape, reversedIndex) => {
              const actualIndex = shapes.length - 1 - reversedIndex;
              return (
                <LayerItem
                  key={shape.id}
                  shape={shape}
                  index={actualIndex}
                  isSelected={shape.id === selectedId}
                  isMultiSelected={selectedIds?.includes(shape.id)}
                  onSelect={onSelect}
                  onMultiSelect={handleMultiSelect}
                  onDragStart={handleLayerDragStart}
                  onDragOver={handleLayerDragOver}
                  onDrop={handleLayerDrop}
                  onDragEnd={handleLayerDragEnd}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  isExpanded={expandedGroups[shape.id] !== false}
                  onToggleExpand={handleToggleExpand}
                  selectedIds={selectedIds}
                />
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
