import { useState, useEffect } from 'react';
import './PropertiesPanel.css';

const propertyConfigs = {
  button: [
    { key: 'text', label: '文字', type: 'text' },
    { key: 'width', label: '宽度', type: 'number', min: 20, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 10, max: 400 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'scale', label: '缩放', type: 'number', min: 0.1, max: 5, step: 0.05, defaultValue: 1 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 72 },
    { key: 'fontFamily', label: '字体', type: 'select', options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'system-ui', label: 'System UI' },
    ]},
    { key: 'textColor', label: '文字颜色', type: 'color' },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  input: [
    { key: 'text', label: '默认值', type: 'text' },
    { key: 'placeholder', label: '占位符', type: 'text' },
    { key: 'width', label: '宽度', type: 'number', min: 50, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 20, max: 200 },
    { key: 'fill', label: '背景', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 10 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
    { key: 'fontSize', label: '字号', type: 'number', min: 10, max: 48 },
    { key: 'fontFamily', label: '字体', type: 'select', options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'system-ui', label: 'System UI' },
    ]},
    { key: 'fontWeight', label: '字重', type: 'select', options: [
      { value: '400', label: 'Regular' },
      { value: '500', label: 'Medium' },
      { value: '600', label: 'Semibold' },
      { value: '700', label: 'Bold' },
    ]},
    { key: 'fontStyle', label: '样式', type: 'select', options: [
      { value: 'normal', label: '正常' },
      { value: 'italic', label: '斜体' },
    ]},
    { key: 'textDecoration', label: '装饰', type: 'select', options: [
      { value: 'none', label: '无' },
      { value: 'underline', label: '下划线' },
      { value: 'line-through', label: '删除线' },
    ]},
    { key: 'textAlign', label: '对齐', type: 'select', options: [
      { value: 'left', label: '左对齐' },
      { value: 'center', label: '居中' },
      { value: 'right', label: '右对齐' },
    ]},
    { key: 'lineHeight', label: '行高', type: 'number', min: 0.5, max: 3, step: 0.1 },
    { key: 'textColor', label: '文字颜色', type: 'color' },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  text: [
    { key: 'text', label: '内容', type: 'text' },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 200 },
    { key: 'fontFamily', label: '字体', type: 'select', options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Times New Roman', label: 'Times New Roman' },
      { value: 'Courier New', label: 'Courier New' },
      { value: 'system-ui', label: 'System UI' },
    ]},
    { key: 'fontWeight', label: '字重', type: 'select', options: [
      { value: '400', label: 'Regular' },
      { value: '500', label: 'Medium' },
      { value: '600', label: 'Semibold' },
      { value: '700', label: 'Bold' },
    ]},
    { key: 'fontStyle', label: '样式', type: 'select', options: [
      { value: 'normal', label: '正常' },
      { value: 'italic', label: '斜体' },
    ]},
    { key: 'textDecoration', label: '装饰', type: 'select', options: [
      { value: 'none', label: '无' },
      { value: 'underline', label: '下划线' },
      { value: 'line-through', label: '删除线' },
    ]},
    { key: 'align', label: '对齐', type: 'select', options: [
      { value: 'left', label: '左对齐' },
      { value: 'center', label: '居中' },
      { value: 'right', label: '右对齐' },
    ]},
    { key: 'lineHeight', label: '行高', type: 'number', min: 0.5, max: 3, step: 0.1 },
    { key: 'fill', label: '颜色', type: 'color' },
    { key: 'width', label: '宽度', type: 'number', min: 20, max: 800 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  image: [
    { key: 'width', label: '宽度', type: 'number', min: 20, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 20, max: 600 },
    { key: 'fill', label: '背景', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 10 },
    { key: 'scale', label: '缩放', type: 'number', min: 0.1, max: 5, step: 0.05, defaultValue: 1 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  rectangle: [
    { key: 'text', label: '文字', type: 'text' },
    { key: 'width', label: '宽度', type: 'number', min: 10, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 10, max: 600 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    { key: 'scale', label: '缩放', type: 'number', min: 0.1, max: 5, step: 0.05, defaultValue: 1 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 100 },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 72 },
    { key: 'fontFamily', label: '字体', type: 'select', options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'system-ui', label: 'System UI' },
    ]},
    { key: 'textColor', label: '文字颜色', type: 'color' },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  circle: [
    { key: 'text', label: '文字', type: 'text' },
    { key: 'radius', label: '半径', type: 'number', min: 5, max: 300 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    { key: 'scale', label: '缩放', type: 'number', min: 0.1, max: 5, step: 0.05, defaultValue: 1 },
    { key: 'fontSize', label: '字号', type: 'number', min: 8, max: 72 },
    { key: 'fontFamily', label: '字体', type: 'select', options: [
      { value: 'Inter', label: 'Inter' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'system-ui', label: 'System UI' },
    ]},
    { key: 'textColor', label: '文字颜色', type: 'color' },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  line: [
    { key: 'stroke', label: '颜色', type: 'color' },
    { key: 'strokeWidth', label: '宽度', type: 'number', min: 1, max: 20 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  icon: [
    { key: 'width', label: '宽度', type: 'number', min: 8, max: 200 },
    { key: 'height', label: '高度', type: 'number', min: 8, max: 200 },
    { key: 'stroke', label: '描边颜色', type: 'color' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', min: 0.5, max: 10, step: 0.5 },
    { key: 'fill', label: '填充颜色', type: 'color' },
    { key: 'scale', label: '缩放', type: 'number', min: 0.1, max: 5, step: 0.05, defaultValue: 1 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
};

const TypeNameMap = {
  button: '按钮',
  input: '输入框',
  text: '文本',
  image: '图片',
  rectangle: '矩形',
  circle: '圆形',
  line: '线条',
  icon: '图标',
};

function PropertyInput({ config, value, onChange }) {
  const handleKeyDown = (e) => {
    // 阻止Delete/Backspace事件冒泡，避免删除组件
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation();
    }
  };

  if (config.type === 'color') {
    // 处理透明值
    const isTransparent = !value || value === 'transparent' || value === 'none';
    const colorValue = isTransparent ? '#000000' : value;
    
    return (
      <div className="property-color">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(config.key, e.target.value)}
        />
        <input
          type="text"
          value={isTransparent ? 'transparent' : value}
          onChange={(e) => onChange(config.key, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="transparent"
        />
      </div>
    );
  }

  if (config.type === 'number') {
    const step = config.step || 1;
    const displayValue = step < 1
      ? (value ?? config.defaultValue ?? config.min ?? 0)
      : Math.round(value ?? config.defaultValue ?? 0);

    return (
      <input
        type="number"
        className="property-number"
        value={displayValue}
        min={config.min}
        max={config.max}
        step={step}
        onChange={(e) => onChange(config.key, parseFloat(e.target.value) || 0)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  if (config.type === 'text') {
    return (
      <input
        type="text"
        className="property-text"
        value={value || ''}
        onChange={(e) => onChange(config.key, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={config.label}
      />
    );
  }

  if (config.type === 'range') {
    return (
      <div className="property-range">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step || 1}
          value={value ?? config.max}
          onChange={(e) => onChange(config.key, parseFloat(e.target.value))}
        />
        <span className="range-value">{Math.round((value ?? config.max) * 100)}%</span>
      </div>
    );
  }

  if (config.type === 'select') {
    return (
      <select
        className="property-select"
        value={value || config.options[0]?.value}
        onChange={(e) => onChange(config.key, e.target.value)}
      >
        {config.options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return null;
}

export default function PropertiesPanel({ selectedShape, shapes = [], onUpdate }) {
  const [editMode, setEditMode] = useState('default');
  
  const [localProps, setLocalProps] = useState(() => {
    return selectedShape ? { ...selectedShape.props } : {};
  });

  const [localHoverProps, setLocalHoverProps] = useState(() => {
    return selectedShape ? { ...(selectedShape.hoverProps || {}) } : {};
  });

  // 用于本地维护 ID 文本框的值，防止 onChange 时过于频繁触发报错
  const [localId, setLocalId] = useState(selectedShape ? selectedShape.id : '');

  useEffect(() => {
    if (selectedShape) {
      const timer = setTimeout(() => {
        setLocalProps({ ...selectedShape.props });
        setLocalHoverProps({ ...(selectedShape.hoverProps || {}) });
        setLocalId(selectedShape.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedShape]);

  if (!selectedShape) {
    return (
      <aside className="properties-panel">
        <div className="properties-header">
          <span>属性</span>
        </div>
        <div className="properties-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6M9 13h6M9 17h4" />
          </svg>
          <p>选择元素查看属性</p>
        </div>
      </aside>
    );
  }

  // 获取形状类型，对于 icon 类型需要特殊处理
  const idPrefix = selectedShape.id.split('-')[0];
  let shapeType = selectedShape.type === 'rect' ? idPrefix : selectedShape.type;
  if (!propertyConfigs[shapeType]) {
    shapeType = 'rectangle'; // 降级到基础矩形
  }
  const properties = propertyConfigs[shapeType] || [];
  const typeName = TypeNameMap[shapeType] || '形状';

  const handleChange = (key, value) => {
    if (editMode === 'hover') {
      const newHoverProps = { ...localHoverProps, [key]: value };
      setLocalHoverProps(newHoverProps);
      onUpdate({ ...selectedShape, hoverProps: newHoverProps });
    } else {
      const newProps = { ...localProps, [key]: value };
      setLocalProps(newProps);
      onUpdate({ ...selectedShape, props: newProps });
    }
  };

  const handlePositionChange = (axis, value) => {
    onUpdate({ ...selectedShape, [axis]: parseFloat(value) || 0 });
  };

  const handleRotationChange = (value) => {
    onUpdate({ ...selectedShape, rotation: parseFloat(value) || 0 });
  };

  const handleAddInteraction = () => {
    const newInteractions = [...(selectedShape.interactions || []), { trigger: 'onClick', action: 'toggleVisibility', targetId: '' }];
    onUpdate({ ...selectedShape, interactions: newInteractions });
  };

  const handleUpdateInteraction = (index, key, value) => {
    const newInteractions = [...(selectedShape.interactions || [])];
    
    // 如果修改了 targetId 且动作为 setProps，为了防止目标组件没有该属性，可以清空 payload
    if (key === 'targetId' && newInteractions[index].action === 'setProps') {
       newInteractions[index] = { ...newInteractions[index], [key]: value, payload: {} };
    } else {
       newInteractions[index] = { ...newInteractions[index], [key]: value };
    }
    
    onUpdate({ ...selectedShape, interactions: newInteractions });
  };

  const handleUpdatePayload = (index, propKey, propValue) => {
    const newInteractions = [...(selectedShape.interactions || [])];
    const currentPayload = newInteractions[index].payload || {};
    
    // 如果值为空字符串，则从 payload 中删除该属性
    let newPayload = { ...currentPayload };
    if (propValue === '' || propValue === null) {
      delete newPayload[propKey];
    } else {
      newPayload[propKey] = propValue;
    }
    
    newInteractions[index] = { ...newInteractions[index], payload: newPayload };
    onUpdate({ ...selectedShape, interactions: newInteractions });
  };

  const handleRemoveInteraction = (index) => {
    const newInteractions = (selectedShape.interactions || []).filter((_, i) => i !== index);
    onUpdate({ ...selectedShape, interactions: newInteractions });
  };

  return (
    <aside className="properties-panel">
      <div className="properties-header">
        <span>属性</span>
      </div>
      <div className="properties-content">
        <div className="properties-type">
          <span className="type-label">{typeName}</span>
          <div className="type-id-container">
            <input 
              type="text" 
              className="type-id-input" 
              value={localId} 
              title="组件 ID (可修改)"
              onChange={(e) => {
                setLocalId(e.target.value);
              }}
              onBlur={() => {
                const newId = localId.trim();
                if (newId && newId !== selectedShape.id) {
                  try {
                    onUpdate({ ...selectedShape, id: newId });
                  } catch (e) {
                    if (e.message === 'ID_EXISTS') {
                      setLocalId(selectedShape.id); // 发生冲突时立刻回滚到原 ID
                    }
                  }
                } else if (!newId) {
                  setLocalId(selectedShape.id); // 恢复原状
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                  e.stopPropagation(); // 防止触发删除组件快捷键
                }
                if (e.key === 'Enter') {
                  e.target.blur(); // 按回车时触发失焦保存
                }
              }}
            />
            <button 
              className="copy-id-btn" 
              onClick={() => {
                navigator.clipboard.writeText(selectedShape.id);
              }}
              title="复制 ID"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="state-toggle-container">
          <div className="state-toggle">
            <button 
              className={editMode === 'default' ? 'active' : ''} 
              onClick={() => setEditMode('default')}
            >
              默认状态
            </button>
            <button 
              className={editMode === 'hover' ? 'active' : ''} 
              onClick={() => setEditMode('hover')}
            >
              悬浮状态
            </button>
          </div>
        </div>

        {editMode === 'default' && (
          <div className="properties-section">
            <div className="section-title">变换</div>
            <div className="property-row">
              <label>X</label>
              <input
                type="number"
                className="property-number"
                value={Math.round(selectedShape.x)}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') e.stopPropagation();
                }}
              />
            </div>
            <div className="property-row">
              <label>Y</label>
              <input
                type="number"
                className="property-number"
                value={Math.round(selectedShape.y)}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') e.stopPropagation();
                }}
              />
            </div>
            <div className="property-row">
              <label>旋转</label>
              <div className="property-rotation">
                <input
                  type="number"
                  className="property-number"
                  value={Math.round(selectedShape.rotation || 0)}
                  min={-360}
                  max={360}
                  onChange={(e) => handleRotationChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') e.stopPropagation();
                  }}
                />
                <span className="unit">°</span>
              </div>
            </div>
          </div>
        )}

        <div className="properties-section">
          <div className="section-title">样式</div>
          {properties.map((config) => (
            <div className="property-row" key={config.key}>
              <label>{config.label}</label>
              <PropertyInput
                config={config}
                value={editMode === 'hover' ? localHoverProps[config.key] : localProps[config.key]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

        {editMode === 'default' && (
          <div className="properties-section">
            <div className="section-title">快捷操作</div>
            <div className="quick-actions">
              <button
                className="quick-action-btn"
                onClick={() => {
                  const newProps = { ...localProps };
                  if (newProps.width) newProps.width = Math.round(newProps.width * 0.5);
                  if (newProps.height) newProps.height = Math.round(newProps.height * 0.5);
                  if (newProps.radius) newProps.radius = Math.round(newProps.radius * 0.5);
                  setLocalProps(newProps);
                  onUpdate({ ...selectedShape, props: newProps });
                }}
                title="缩小50%"
              >
                50%
              </button>
              <button
                className="quick-action-btn"
                onClick={() => {
                  const newProps = { ...localProps };
                  if (newProps.width) newProps.width = Math.round(newProps.width * 2);
                  if (newProps.height) newProps.height = Math.round(newProps.height * 2);
                  if (newProps.radius) newProps.radius = Math.round(newProps.radius * 2);
                  setLocalProps(newProps);
                  onUpdate({ ...selectedShape, props: newProps });
                }}
                title="放大200%"
              >
                200%
              </button>
              <button
                className="quick-action-btn"
                onClick={() => {
                  onUpdate({ ...selectedShape, rotation: 0 });
                }}
                title="重置旋转"
              >
                重置角度
              </button>
            </div>
          </div>
        )}

        <div className="properties-section interactions-section">
          <div className="section-title">交互 (Interactions)</div>
          <div className="interactions-list">
            {(selectedShape.interactions || []).map((ix, idx) => (
              <div key={idx} className="interaction-item">
                <div className="interaction-header">
                  <span className="interaction-badge">交互 {idx + 1}</span>
                  <button className="remove-interaction-btn" onClick={() => handleRemoveInteraction(idx)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="interaction-body">
                  <div className="interaction-field">
                    <label>触发</label>
                    <select value={ix.trigger} onChange={(e) => handleUpdateInteraction(idx, 'trigger', e.target.value)} className="property-select">
                      <option value="onClick">点击 (Alt+Click)</option>
                    </select>
                  </div>
                  <div className="interaction-field">
                    <label>动作</label>
                    <select value={ix.action} onChange={(e) => handleUpdateInteraction(idx, 'action', e.target.value)} className="property-select">
                      <option value="toggleVisibility">切换显示/隐藏</option>
                      <option value="setProps">修改属性 (setProps)</option>
                    </select>
                  </div>
                  <div className="interaction-field">
                    <label>目标</label>
                    <select value={ix.targetId} onChange={(e) => handleUpdateInteraction(idx, 'targetId', e.target.value)} className="property-select">
                      <option value="">请选择目标...</option>
                      {shapes.filter(s => s.id !== selectedShape.id).map(s => (
                        <option key={s.id} value={s.id}>
                          {TypeNameMap[s.type || s.id.split('-')[0]] || '组件'} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  {ix.action === 'setProps' && ix.targetId && (
                    <div className="interaction-payload-config">
                      <div className="payload-divider"></div>
                      <div className="payload-title">配置目标新属性</div>
                      {(() => {
                        const targetShape = shapes.find(s => s.id === ix.targetId);
                        if (!targetShape) return <div className="payload-empty">请重新选择目标</div>;
                        
                        const targetPrefix = targetShape.id.split('-')[0];
                        let targetType = targetShape.type === 'rect' ? targetPrefix : targetShape.type;
                        if (!propertyConfigs[targetType]) targetType = 'rectangle';
                        const targetProps = propertyConfigs[targetType] || [];
                        const payloadData = ix.payload || {};

                        return targetProps.map((config) => (
                          <div className="property-row payload-row" key={config.key}>
                            <label>{config.label}</label>
                            <PropertyInput
                              config={config}
                              value={payloadData[config.key]}
                              onChange={(key, val) => handleUpdatePayload(idx, key, val)}
                            />
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button className="add-interaction-btn" onClick={handleAddInteraction}>
              + 添加交互
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
