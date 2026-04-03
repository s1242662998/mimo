import { useState, useEffect, useRef, useCallback } from 'react';
import './PropertiesPanel.css';

function ColorInput({ config, value, onChange }) {
  const [localValue, setLocalValue] = useState(value);
  const isDragging = useRef(false);
  const lastUpdateRef = useRef(0);
  
  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  const isTransparent = !localValue || localValue === 'transparent' || localValue === 'none';
  const colorValue = isTransparent ? '#000000' : localValue;

  const handleMouseDown = () => {
    isDragging.current = true;
    lastUpdateRef.current = Date.now();
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    onChange(config.key, localValue);
  };

  const handleInput = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // 节流更新，每50ms最多更新一次
    const now = Date.now();
    if (now - lastUpdateRef.current >= 50) {
      lastUpdateRef.current = now;
      onChange(config.key, newValue);
    }
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) {
      alert('您的浏览器不支持取色器功能');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      setLocalValue(result.sRGBHex);
      onChange(config.key, result.sRGBHex);
    } catch (e) {
      // 用户取消取色
    }
  };

  return (
    <div className="property-color">
      <input
        type="color"
        value={colorValue}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onInput={handleInput}
        onChange={handleInput}
      />
      <input
        type="text"
        value={isTransparent ? 'transparent' : localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(config.key, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.stopPropagation();
          }
        }}
        placeholder="transparent"
      />
      <button
        className="eye-dropper-btn"
        onClick={handleEyeDropper}
        title="取色器"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.71 4.29a2 2 0 0 0-2.82 0l-8.29 8.29-1-1a1 1 0 0 0-1.42 0l-3.17 3.17a1 1 0 0 0 0-1.42l1 1-4.29 4.29a1 1 0 0 0 0 1.42l1.17 1.17a1 1 0 0 0 1.42 0l4.29-4.29 1 1a1 1 0 0 0 1.42 0l3.17-3.17a1 1 0 0 0 0-1.42l-1-1 8.29-8.29a2 2 0 0 0 0-2.82z"/>
        </svg>
      </button>
    </div>
  );
}

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
  dynamicPanel: [
    { key: 'width', label: '宽度', type: 'number', min: 50, max: 1200 },
    { key: 'height', label: '高度', type: 'number', min: 50, max: 800 },
    { key: 'fill', label: '背景', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 10 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
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
  dynamicPanel: '动态面板',
};

function PropertyInput({ config, value, onChange }) {
  const handleKeyDown = (e) => {
    // 阻止Delete/Backspace事件冒泡，避免删除组件
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation();
    }
  };

  if (config.type === 'color') {
    return <ColorInput config={config} value={value} onChange={onChange} />;
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

        {shapeType === 'image' && (
          <div className="properties-section">
            <div className="section-title">图片</div>
            <div className="image-upload-section">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      handleChange('imageData', event.target.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                className="image-upload-btn"
                onClick={() => document.getElementById('image-upload').click()}
              >
                {localProps.imageData ? '更换图片' : '上传图片'}
              </button>
              {localProps.imageData && (
                <button
                  className="image-remove-btn"
                  onClick={() => handleChange('imageData', null)}
                >
                  移除图片
                </button>
              )}
              {localProps.imageData && (
                <div className="image-preview">
                  <img src={localProps.imageData} alt="预览" />
                </div>
              )}
            </div>
          </div>
        )}

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

        {shapeType === 'dynamicPanel' && editMode === 'default' && (
          <div className="properties-section">
            <div className="section-title">状态管理</div>
            <div className="states-list">
              {(selectedShape.states || []).map((state, idx) => (
                <div key={state.id} className={`state-item ${state.id === selectedShape.activeStateId ? 'active' : ''}`}>
                  <div className="state-item-header">
                    <button 
                      className="state-activate-btn"
                      onClick={() => onUpdate({ ...selectedShape, activeStateId: state.id })}
                      title="设为当前状态"
                    >
                      {state.id === selectedShape.activeStateId ? '●' : '○'}
                    </button>
                    <input
                      type="text"
                      className="state-name-input"
                      value={state.name}
                      onChange={(e) => {
                        const newStates = [...(selectedShape.states || [])];
                        newStates[idx] = { ...state, name: e.target.value };
                        onUpdate({ ...selectedShape, states: newStates });
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <span className="state-children-count">{(state.children || []).length} 个元素</span>
                    <button 
                      className="remove-state-btn"
                      onClick={() => {
                        if ((selectedShape.states || []).length <= 1) {
                          alert('至少保留一个状态');
                          return;
                        }
                        const newStates = (selectedShape.states || []).filter((_, i) => i !== idx);
                        const newActiveStateId = state.id === selectedShape.activeStateId 
                          ? newStates[0]?.id 
                          : selectedShape.activeStateId;
                        onUpdate({ ...selectedShape, states: newStates, activeStateId: newActiveStateId });
                      }}
                      title="删除状态"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {state.id === selectedShape.activeStateId && (
                    <div className="state-children">
                      {(state.children || []).length === 0 ? (
                        <div className="state-children-empty">拖拽组件到面板内添加</div>
                      ) : (
                        (state.children || []).map((child, childIdx) => (
                          <div key={child.id} className="state-child-item">
                            <span className="child-type">{TypeNameMap[child.id.split('-')[0]] || child.type}</span>
                            <span className="child-id">{child.id}</span>
                            <button 
                              className="remove-child-btn"
                              onClick={() => {
                                const newStates = (selectedShape.states || []).map(s => {
                                  if (s.id !== state.id) return s;
                                  return {
                                    ...s,
                                    children: (s.children || []).filter((_, i) => i !== childIdx),
                                  };
                                });
                                onUpdate({ ...selectedShape, states: newStates });
                              }}
                              title="删除子组件"
                            >
                              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button 
              className="add-state-btn"
              onClick={() => {
                const newStates = [...(selectedShape.states || [])];
                const newStateId = `state-${Date.now()}`;
                newStates.push({ id: newStateId, name: `状态 ${newStates.length + 1}`, children: [] });
                onUpdate({ ...selectedShape, states: newStates });
              }}
            >
              + 添加状态
            </button>
          </div>
        )}

        {editMode === 'default' && (
          <div className="properties-section">
            <div className="section-title">条件渲染 (Visible If)</div>
            <div className="property-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', width: '100%' }}>
                <input 
                  type="checkbox" 
                  checked={!!selectedShape.visibleIf}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate({ ...selectedShape, visibleIf: { key: '', operator: '==', value: '' } });
                    } else {
                      onUpdate({ ...selectedShape, visibleIf: null });
                    }
                  }}
                />
                启用条件渲染
              </label>
              
              {selectedShape.visibleIf && (
                <div className="interaction-payload-config" style={{ width: '100%', marginTop: '0', padding: '8px' }}>
                  <div className="property-row payload-row">
                    <label style={{ width: '60px' }}>变量名</label>
                    <input
                      type="text"
                      className="property-text"
                      value={selectedShape.visibleIf.key}
                      placeholder="如: currentTab"
                      onChange={(e) => onUpdate({ ...selectedShape, visibleIf: { ...selectedShape.visibleIf, key: e.target.value } })}
                    />
                  </div>
                  <div className="property-row payload-row">
                    <label style={{ width: '60px' }}>条件</label>
                    <select 
                      className="property-select"
                      value={selectedShape.visibleIf.operator}
                      onChange={(e) => onUpdate({ ...selectedShape, visibleIf: { ...selectedShape.visibleIf, operator: e.target.value } })}
                    >
                      <option value="==">等于 (==)</option>
                      <option value="!=">不等于 (!=)</option>
                      <option value=">">大于 (&gt;)</option>
                      <option value="<">小于 (&lt;)</option>
                    </select>
                  </div>
                  <div className="property-row payload-row">
                    <label style={{ width: '60px' }}>目标值</label>
                    <input
                      type="text"
                      className="property-text"
                      value={selectedShape.visibleIf.value}
                      placeholder="如: home"
                      onChange={(e) => onUpdate({ ...selectedShape, visibleIf: { ...selectedShape.visibleIf, value: e.target.value } })}
                    />
                  </div>
                </div>
              )}
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
                      <option value="onMouseEnter">鼠标移入</option>
                      <option value="onMouseLeave">鼠标移出</option>
                      <option value="onLoad">加载完成时 (onLoad)</option>
                    </select>
                  </div>
                  <div className="interaction-field">
                    <label>动作</label>
                    <select value={ix.action} onChange={(e) => handleUpdateInteraction(idx, 'action', e.target.value)} className="property-select">
                      <option value="toggleVisibility">切换显示/隐藏</option>
                      <option value="setProps">修改属性 (setProps)</option>
                      <option value="setVariable">修改全局变量 (setVariable)</option>
                      <option value="switchState">切换到指定状态</option>
                      <option value="nextState">切换到下一状态</option>
                      <option value="prevState">切换到上一状态</option>
                    </select>
                  </div>
                  {ix.action === 'setVariable' ? (
                    <div className="interaction-payload-config">
                      <div className="payload-divider"></div>
                      <div className="payload-title">配置变量</div>
                      <div className="property-row payload-row">
                        <label>变量名(key)</label>
                        <input
                          type="text"
                          className="property-text"
                          value={ix.payload?.key || ''}
                          placeholder="例如: currentTab"
                          onChange={(e) => handleUpdatePayload(idx, 'key', e.target.value)}
                        />
                      </div>
                      <div className="property-row payload-row">
                        <label>变量值(value)</label>
                        <input
                          type="text"
                          className="property-text"
                          value={ix.payload?.value || ''}
                          placeholder="例如: home"
                          onChange={(e) => handleUpdatePayload(idx, 'value', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : ix.action === 'switchState' ? (
                    <>
                      <div className="interaction-field">
                        <label>目标</label>
                        <select value={ix.targetId} onChange={(e) => handleUpdateInteraction(idx, 'targetId', e.target.value)} className="property-select">
                          <option value="">请选择动态面板...</option>
                          {shapes.filter(s => s.type === 'dynamicPanel').map(s => (
                            <option key={s.id} value={s.id}>
                              动态面板 ({s.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      {ix.targetId && (() => {
                        const targetPanel = shapes.find(s => s.id === ix.targetId);
                        if (!targetPanel || !targetPanel.states) return null;
                        return (
                          <div className="interaction-field">
                            <label>目标状态</label>
                            <select 
                              value={ix.payload?.stateId || ''} 
                              onChange={(e) => handleUpdatePayload(idx, 'stateId', e.target.value)} 
                              className="property-select"
                            >
                              <option value="">请选择状态...</option>
                              {targetPanel.states.map(state => (
                                <option key={state.id} value={state.id}>
                                  {state.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </>
                  ) : ix.action === 'nextState' || ix.action === 'prevState' ? (
                    <div className="interaction-field">
                      <label>目标</label>
                      <select value={ix.targetId} onChange={(e) => handleUpdateInteraction(idx, 'targetId', e.target.value)} className="property-select">
                        <option value="">请选择动态面板...</option>
                        {shapes.filter(s => s.type === 'dynamicPanel').map(s => (
                          <option key={s.id} value={s.id}>
                            动态面板 ({s.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
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
                  )}
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
                  <div className="interaction-field" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={ix.delay !== undefined}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleUpdateInteraction(idx, 'delay', 1000);
                          } else {
                            handleUpdateInteraction(idx, 'delay', undefined);
                          }
                        }}
                      />
                      延迟触发
                    </label>
                    {ix.delay !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                        <input 
                          type="number" 
                          className="property-number" 
                          style={{ width: '60px' }}
                          value={ix.delay} 
                          onChange={(e) => handleUpdateInteraction(idx, 'delay', parseInt(e.target.value, 10) || 0)}
                        />
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>ms</span>
                      </div>
                    )}
                  </div>
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
