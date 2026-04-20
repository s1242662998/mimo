import { useState, useCallback } from 'react';
import './JsonImporter.css';

const Icons = {
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Paste: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

function convertType(jsonType) {
  const typeMap = {
    text: 'text',
    button: 'rect',
    input: 'rect',
    rectangle: 'rect',
    circle: 'circle',
    image: 'image',
    dynamicPanel: 'dynamicPanel',
    switch: 'rect',
    checkbox: 'rect',
    radio: 'circle',
    badge: 'rect',
    slider: 'rect',
    progress: 'rect',
    divider: 'rect',
    avatar: 'rect',
    line: 'line',
    arrow: 'arrow',
    icon: 'icon',
  };
  return typeMap[jsonType] || 'rect';
}

function convertToShapes(data) {
  if (data && data.type === 'update') {
    throw new Error('当前面板仅支持导入组件数据，更新组件请在右侧 AI 助手聊天框中直接输入指令。');
  }

  if (!data || !Array.isArray(data.elements)) {
    throw new Error('JSON 格式错误：缺少 elements 数组。');
  }

  const timestamp = Date.now();

  // 辅助函数：从 el 或 el.props 中获取值
  const getVal = (el, key, defaultVal) => {
    if (el[key] !== undefined) return el[key];
    if (el.props && el.props[key] !== undefined) return el.props[key];
    return defaultVal;
  };

  // 辅助函数：安全转数字
  const getNum = (el, key, defaultVal) => {
    const val = getVal(el, key, defaultVal);
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
  };

  return data.elements.map((el, index) => {
    if (!el.type || el.x === undefined || el.y === undefined) {
      throw new Error(`第 ${index + 1} 个元素缺少必需字段 (type, x, y)`);
    }

    const shape = {
      id: el.id || `${el.type}-${timestamp}-${index}`,
      type: convertType(el.type),
      componentType: el.type,
      x: getNum(el, 'x', 0),
      y: getNum(el, 'y', 0),
      zIndex: getNum(el, 'zIndex', 0),
      props: {},
    };

    switch (el.type) {
      case 'text':
        shape.props = {
          text: getVal(el, 'text', '文本'),
          fontSize: getNum(el, 'fontSize', 16),
          fontFamily: getVal(el, 'fontFamily', 'Inter'),
          fontWeight: getVal(el, 'fontWeight', '400'),
          fontStyle: getVal(el, 'fontStyle', 'normal'),
          textDecoration: getVal(el, 'textDecoration', 'none'),
          align: getVal(el, 'align', 'left'),
          lineHeight: getNum(el, 'lineHeight', 1.5),
          fill: getVal(el, 'fill', '#0F172A'),
          width: getNum(el, 'width', 150),
        };
        break;

      case 'input':
        shape.props = {
          width: getNum(el, 'width', 200),
          height: getNum(el, 'height', 40),
          fill: getVal(el, 'fill', '#FFFFFF'),
          stroke: getVal(el, 'stroke', '#E2E8F0'),
          strokeWidth: 1,
          cornerRadius: getNum(el, 'cornerRadius', 8),
        };
        break;

      case 'rectangle':
        shape.props = {
          text: getVal(el, 'text', ''),
          fontSize: getNum(el, 'fontSize', 14),
          fontFamily: getVal(el, 'fontFamily', 'Inter'),
          textColor: getVal(el, 'textColor', '#0F172A'),
          width: getNum(el, 'width', 100),
          height: getNum(el, 'height', 100),
          fill: getVal(el, 'fill', '#F1F5F9'),
          stroke: getVal(el, 'stroke', ''),
          strokeWidth: getVal(el, 'stroke', '') ? getNum(el, 'strokeWidth', 1) : 0,
          cornerRadius: getNum(el, 'cornerRadius', 0),
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      case 'circle':
        shape.props = {
          text: getVal(el, 'text', ''),
          fontSize: getNum(el, 'fontSize', 14),
          fontFamily: getVal(el, 'fontFamily', 'Inter'),
          textColor: getVal(el, 'textColor', '#0F172A'),
          radius: getNum(el, 'radius', 40),
          fill: getVal(el, 'fill', '#F1F5F9'),
          stroke: getVal(el, 'stroke', ''),
          strokeWidth: getVal(el, 'stroke', '') ? getNum(el, 'strokeWidth', 1) : 0,
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      case 'image':
        shape.props = {
          width: getNum(el, 'width', 120),
          height: getNum(el, 'height', 80),
          fill: getVal(el, 'fill', '#F1F5F9'),
          stroke: getVal(el, 'stroke', '#E2E8F0'),
          strokeWidth: 1,
          cornerRadius: getNum(el, 'cornerRadius', 8),
        };
        break;

      case 'switch':
        shape.props = {
          width: getNum(el, 'width', 44),
          height: getNum(el, 'height', 24),
          fill: getVal(el, 'fill', '#22C55E'),
          fillOff: getVal(el, 'fillOff', '#E2E8F0'),
          knobColor: getVal(el, 'knobColor', '#FFFFFF'),
          cornerRadius: getNum(el, 'cornerRadius', 12),
          checked: el.checked !== false,
        };
        break;

      case 'checkbox':
        shape.props = {
          width: getNum(el, 'width', 20),
          height: getNum(el, 'height', 20),
          fill: getVal(el, 'fill', '#FFFFFF'),
          stroke: getVal(el, 'stroke', '#CBD5E1'),
          strokeWidth: getNum(el, 'strokeWidth', 2),
          cornerRadius: getNum(el, 'cornerRadius', 4),
          checked: el.checked === true || el.checked === 'true',
          checkColor: getVal(el, 'checkColor', '#0891B2'),
        };
        break;

      case 'radio':
        shape.props = {
          radius: getNum(el, 'radius', 10),
          fill: getVal(el, 'fill', '#FFFFFF'),
          stroke: getVal(el, 'stroke', '#CBD5E1'),
          strokeWidth: getNum(el, 'strokeWidth', 2),
          checked: el.checked === true || el.checked === 'true',
          checkColor: getVal(el, 'checkColor', '#0891B2'),
        };
        break;

      case 'badge':
        shape.props = {
          width: getNum(el, 'width', 20),
          height: getNum(el, 'height', 20),
          fill: getVal(el, 'fill', '#EF4444'),
          cornerRadius: getNum(el, 'cornerRadius', 10),
          text: getVal(el, 'text', '5'),
          fontSize: getNum(el, 'fontSize', 11),
          textColor: getVal(el, 'textColor', '#FFFFFF'),
        };
        break;

      case 'slider':
        shape.props = {
          width: getNum(el, 'width', 200),
          height: getNum(el, 'height', 20),
          fill: getVal(el, 'fill', '#E2E8F0'),
          barFill: getVal(el, 'barFill', '#0891B2'),
          knobColor: getVal(el, 'knobColor', '#FFFFFF'),
          cornerRadius: getNum(el, 'cornerRadius', 4),
          value: getNum(el, 'value', 50),
        };
        break;

      case 'progress':
        shape.props = {
          width: getNum(el, 'width', 200),
          height: getNum(el, 'height', 8),
          fill: getVal(el, 'fill', '#E2E8F0'),
          barFill: getVal(el, 'barFill', '#0891B2'),
          cornerRadius: getNum(el, 'cornerRadius', 4),
          value: getNum(el, 'value', 60),
        };
        break;

      case 'divider':
        shape.props = {
          width: getNum(el, 'width', 200),
          height: getNum(el, 'height', 1),
          fill: getVal(el, 'fill', '#E2E8F0'),
        };
        break;

      case 'avatar':
        shape.props = {
          width: getNum(el, 'width', 40),
          height: getNum(el, 'height', 40),
          fill: getVal(el, 'fill', '#DBEAFE'),
          cornerRadius: getNum(el, 'cornerRadius', 20),
          text: getVal(el, 'text', 'A'),
          fontSize: getNum(el, 'fontSize', 16),
          textColor: getVal(el, 'textColor', '#1E40AF'),
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      case 'line':
        shape.props = {
          stroke: getVal(el, 'stroke', '#000000'),
          strokeWidth: getNum(el, 'strokeWidth', 1),
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      case 'arrow':
        shape.props = {
          stroke: getVal(el, 'stroke', '#000000'),
          strokeWidth: getNum(el, 'strokeWidth', 1),
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      case 'icon':
        shape.props = {
          width: getNum(el, 'width', 24),
          height: getNum(el, 'height', 24),
          stroke: getVal(el, 'stroke', '#000000'),
          strokeWidth: getNum(el, 'strokeWidth', 2),
          fill: getVal(el, 'fill', '#FFFFFF'),
          iconId: getVal(el, 'iconId', 'arrow-right'),
          iconPath: getVal(el, 'iconPath', ''),
          opacity: getNum(el, 'opacity', 1),
        };
        break;

      default:
        shape.props = {
          width: getNum(el, 'width', 100),
          height: getNum(el, 'height', 100),
          fill: getVal(el, 'fill', '#E2E8F0'),
        };
    }

    return shape;
  });
}

const VALID_TRIGGERS = ['onClick', 'onMouseEnter', 'onMouseLeave', 'onLoad', 'onChange'];
const VALID_ACTIONS = [
  'toggleVisibility', 'setProps', 'setVariable', 'switchState',
  'nextState', 'prevState', 'setChecked', 'toggleChecked',
  'setValue', 'incrementValue', 'startAnimation', 'stopAnimation',
];

function validateInteractions(interactions, itemLabel, existingShapeIds) {
  const errors = [];

  if (!Array.isArray(interactions)) {
    errors.push(`${itemLabel}：interactions 必须是数组`);
    return errors;
  }

  interactions.forEach((inter, j) => {
    const interPrefix = `${itemLabel} 第 ${j + 1} 条交互`;

    if (!inter.trigger) {
      errors.push(`${interPrefix}：缺少 trigger 字段`);
    } else if (!VALID_TRIGGERS.includes(inter.trigger)) {
      errors.push(`${interPrefix}：trigger "${inter.trigger}" 无效，必须是 ${VALID_TRIGGERS.join('、')} 之一`);
    }

    if (!inter.action) {
      errors.push(`${interPrefix}：缺少 action 字段`);
    } else if (!VALID_ACTIONS.includes(inter.action)) {
      errors.push(`${interPrefix}：action "${inter.action}" 无效，必须是 ${VALID_ACTIONS.join('、')} 之一`);
    }

    if (inter.targetId && !existingShapeIds.has(inter.targetId)) {
      errors.push(`${interPrefix}：画布中不存在 ID 为 "${inter.targetId}" 的目标组件`);
    }

    // 校验 onComplete
    if (inter.onComplete) {
      const oc = inter.onComplete;
      if (!oc.action || !VALID_ACTIONS.includes(oc.action)) {
        errors.push(`${interPrefix} 的完成后动作：action "${oc.action || ''}" 无效`);
      }
      if (oc.targetId && !existingShapeIds.has(oc.targetId)) {
        errors.push(`${interPrefix} 的完成后动作：画布中不存在 ID 为 "${oc.targetId}" 的目标组件`);
      }
    }
  });

  return errors;
}

/**
 * 校验并归一化交互 JSON，支持两种格式：
 * 1. 按组件分组数组: [{ sourceId: "x", interactions: [...] }]
 * 2. batch_update 格式: { type: "batch_update", batchUpdates: [{ id: "x", updates: { interactions: [...] } }] }
 *
 * 返回统一格式: [{ sourceId: string, interactions: array }]
 */
function validateAndNormalizeInteractions(data, existingShapeIds) {
  let items = [];

  if (Array.isArray(data)) {
    // 格式 1: 按组件分组数组
    items = data;
  } else if (data && data.type === 'batch_update' && Array.isArray(data.batchUpdates)) {
    // 格式 2: batch_update 格式，归一化为分组数组
    items = data.batchUpdates.map(bu => ({
      sourceId: bu.id,
      interactions: bu.updates?.interactions || [],
    }));
  } else {
    throw new Error('交互 JSON 格式错误：\n• 按组件分组数组: [{ "sourceId": "...", "interactions": [...] }]\n• batch_update 格式: { "type": "batch_update", "batchUpdates": [...] }');
  }

  if (items.length === 0) {
    throw new Error('交互 JSON 不能为空。');
  }

  const errors = [];

  items.forEach((item, i) => {
    const prefix = `第 ${i + 1} 个条目`;

    if (!item.sourceId || typeof item.sourceId !== 'string') {
      errors.push(`${prefix}：缺少 sourceId 字段`);
      return;
    }

    if (!existingShapeIds.has(item.sourceId)) {
      errors.push(`${prefix}：画布中不存在 ID 为 "${item.sourceId}" 的组件`);
    }

    const interErrors = validateInteractions(item.interactions, prefix, existingShapeIds);
    errors.push(...interErrors);
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return items;
}

export default function JsonImporter({ onClose, onImport, onImportInteractions, canvasShapes }) {
  const [activeTab, setActiveTab] = useState('components');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      setError('');
      setSuccess('');
    } catch {
      setError('无法读取剪贴板，请手动粘贴');
    }
  }, []);

  const handleClear = useCallback(() => {
    setJsonText('');
    setError('');
    setSuccess('');
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setJsonText('');
    setError('');
    setSuccess('');
  }, []);

  const handleImportComponents = useCallback(() => {
    setError('');
    setSuccess('');

    if (!jsonText.trim()) {
      setError('请粘贴组件 JSON 数据');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      const shapes = convertToShapes(data);
      onImport(shapes);
      setSuccess(`成功导入 ${shapes.length} 个组件`);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'JSON 解析失败，请检查格式');
    }
  }, [jsonText, onImport, onClose]);

  const handleImportInteractions = useCallback(() => {
    setError('');
    setSuccess('');

    if (!jsonText.trim()) {
      setError('请粘贴交互 JSON 数据');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      const existingShapeIds = new Set(canvasShapes.map(s => s.id));
      const validated = validateAndNormalizeInteractions(data, existingShapeIds);
      onImportInteractions(validated);

      const count = validated.reduce((sum, item) => sum + item.interactions.length, 0);
      setSuccess(`成功为 ${validated.length} 个组件应用了 ${count} 条交互`);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'JSON 解析失败，请检查格式');
    }
  }, [jsonText, canvasShapes, onImportInteractions, onClose]);

  const handleGenerate = useCallback(() => {
    if (activeTab === 'components') {
      handleImportComponents();
    } else {
      handleImportInteractions();
    }
  }, [activeTab, handleImportComponents, handleImportInteractions]);

  const componentsPlaceholder = `{
  "screenshotWidth": 375,
  "screenshotHeight": 812,
  "elements": [
    {
      "type": "text",
      "x": 20,
      "y": 60,
      "text": "标题",
      "fontSize": 24
    },
    {
      "type": "button",
      "x": 20,
      "y": 300,
      "width": 335,
      "height": 48,
      "text": "按钮",
      "fill": "#0891B2"
    }
  ]
}`;

  const interactionsPlaceholder = `支持两种格式：

格式 1 - 按组件分组数组:
[
  {
    "sourceId": "button-1",
    "interactions": [
      {
        "trigger": "onClick",
        "action": "setVariable",
        "payload": { "key": "currentTab", "value": "home" }
      }
    ]
  }
]

格式 2 - batch_update:
{
  "type": "batch_update",
  "batchUpdates": [
    {
      "id": "card1-bg",
      "updates": {
        "interactions": [
          {
            "trigger": "onMouseEnter",
            "action": "setProps",
            "targetId": "card1-bg",
            "payload": { "fill": "#000000" }
          }
        ]
      }
    }
  ]
}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="json-importer" onClick={(e) => e.stopPropagation()}>
        <div className="importer-header">
          <h3>导入 JSON</h3>
          <button className="close-btn" onClick={onClose}>
            <Icons.Close />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="importer-tabs">
          <button
            className={`importer-tab ${activeTab === 'components' ? 'active' : ''}`}
            onClick={() => handleTabChange('components')}
          >
            导入组件
          </button>
          <button
            className={`importer-tab ${activeTab === 'interactions' ? 'active' : ''}`}
            onClick={() => handleTabChange('interactions')}
          >
            导入交互
          </button>
        </div>

        <div className="importer-content">
          <div className="section">
            <label className="section-label">
              {activeTab === 'components' ? '组件数据 (JSON)' : '交互数据 (JSON)'}
            </label>
            <textarea
              className="json-input"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder={activeTab === 'components' ? componentsPlaceholder : interactionsPlaceholder}
              rows={14}
            />
            <div className="json-actions">
              <button className="action-btn" onClick={handlePaste}>
                <Icons.Paste />
                粘贴剪贴板
              </button>
              <button className="action-btn" onClick={handleClear}>
                <Icons.Trash />
                清空
              </button>
            </div>
          </div>

          {activeTab === 'components' && (
            <div className="importer-hint">
              格式要求：JSON 需包含 <code>elements</code> 数组，每个元素需要 <code>type</code>、<code>x</code>、<code>y</code> 字段。
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="importer-hint">
              支持两种格式：<code>[&#123; "sourceId": "...", "interactions": [...] &#125;]</code> 或 <code>&#123; "type": "batch_update", "batchUpdates": [...] &#125;</code>。
              <code>sourceId</code> / <code>id</code> 需匹配画布中已有组件的 ID。
            </div>
          )}

          {error && (
            <div className="status-message error">
              <Icons.Alert />
              <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
          )}
          {success && (
            <div className="status-message success">
              <Icons.Check />
              {success}
            </div>
          )}
        </div>

        <div className="importer-footer">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="generate-btn" onClick={handleGenerate}>
            {activeTab === 'components' ? '导入到画布' : '应用交互'}
          </button>
        </div>
      </div>
    </div>
  );
}
