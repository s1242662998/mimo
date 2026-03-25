import { useState, useEffect } from 'react';
import './PropertiesPanel.css';

const propertyConfigs = {
  button: [
    { key: 'width', label: '宽度', type: 'number', min: 20, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 10, max: 400 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
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
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 50 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  rectangle: [
    { key: 'width', label: '宽度', type: 'number', min: 10, max: 800 },
    { key: 'height', label: '高度', type: 'number', min: 10, max: 600 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    { key: 'cornerRadius', label: '圆角', type: 'number', min: 0, max: 100 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  circle: [
    { key: 'radius', label: '半径', type: 'number', min: 5, max: 300 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  triangle: [
    { key: 'width', label: '宽度', type: 'number', min: 10, max: 600 },
    { key: 'height', label: '高度', type: 'number', min: 10, max: 600 },
    { key: 'fill', label: '填充', type: 'color' },
    { key: 'stroke', label: '边框', type: 'color' },
    { key: 'strokeWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.1 },
  ],
  line: [
    { key: 'stroke', label: '颜色', type: 'color' },
    { key: 'strokeWidth', label: '宽度', type: 'number', min: 1, max: 20 },
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
  triangle: '三角形',
  line: '线条',
};

function PropertyInput({ config, value, onChange }) {
  const handleKeyDown = (e) => {
    // 阻止Delete/Backspace事件冒泡，避免删除组件
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation();
    }
  };

  if (config.type === 'color') {
    return (
      <div className="property-color">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(config.key, e.target.value)}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(config.key, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="#000000"
        />
      </div>
    );
  }

  if (config.type === 'number') {
    const step = config.step || 1;
    const displayValue = step < 1
      ? (value ?? config.min ?? 0)
      : Math.round(value || 0);

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

export default function PropertiesPanel({ selectedShape, onUpdate }) {
  const [localProps, setLocalProps] = useState(() => {
    return selectedShape ? { ...selectedShape.props } : {};
  });

  useEffect(() => {
    if (selectedShape) {
      const timer = setTimeout(() => {
        setLocalProps({ ...selectedShape.props });
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

  const shapeType = selectedShape.id.split('-')[0];
  const properties = propertyConfigs[shapeType] || [];
  const typeName = TypeNameMap[shapeType] || '形状';

  const handleChange = (key, value) => {
    const newProps = { ...localProps, [key]: value };
    setLocalProps(newProps);
    onUpdate({ ...selectedShape, props: newProps });
  };

  const handlePositionChange = (axis, value) => {
    onUpdate({ ...selectedShape, [axis]: parseFloat(value) || 0 });
  };

  const handleRotationChange = (value) => {
    onUpdate({ ...selectedShape, rotation: parseFloat(value) || 0 });
  };

  return (
    <aside className="properties-panel">
      <div className="properties-header">
        <span>属性</span>
      </div>
      <div className="properties-content">
        <div className="properties-type">
          <span className="type-label">{typeName}</span>
          <span className="type-id">{selectedShape.id}</span>
        </div>

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

        <div className="properties-section">
          <div className="section-title">样式</div>
          {properties.map((config) => (
            <div className="property-row" key={config.key}>
              <label>{config.label}</label>
              <PropertyInput
                config={config}
                value={localProps[config.key]}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>

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
      </div>
    </aside>
  );
}
