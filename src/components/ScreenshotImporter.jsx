import { useState, useRef, useCallback } from 'react';
import './ScreenshotImporter.css';

const Icons = {
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
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
    image: 'rect',
  };
  return typeMap[jsonType] || 'rect';
}

function convertToShapes(data) {
  // 如果是旧版的 update 格式或包含 action 类型的 JSON，拦截提示
  if (data && data.type === 'update') {
    throw new Error('当前面板仅支持导入 "截图生成 (replace_all/elements)" 的数据结构，更新组件请在右侧 AI 助手聊天框中直接输入指令。');
  }

  if (!data || !Array.isArray(data.elements)) {
    throw new Error('JSON 格式错误：缺少 elements 数组。如果您想更新现有组件，请关闭此弹窗并在右侧 AI 助手中直接发送指令。');
  }

  const timestamp = Date.now();
  
  return data.elements.map((el, index) => {
    if (!el.type || el.x === undefined || el.y === undefined) {
      throw new Error(`第 ${index + 1} 个元素缺少必需字段 (type, x, y)`);
    }

    const shape = {
      id: `${el.type}-${timestamp}-${index}`,
      type: convertType(el.type),
      x: Number(el.x) || 0,
      y: Number(el.y) || 0,
      props: {},
    };

    switch (el.type) {
      case 'text':
        shape.props = {
          text: el.text || '文本',
          fontSize: Number(el.fontSize) || 16,
          fontFamily: 'Inter',
          fill: el.fill || '#0F172A',
          width: Number(el.width) || 150,
        };
        break;

      case 'button':
        shape.props = {
          width: Number(el.width) || 100,
          height: Number(el.height) || 36,
          fill: el.fill || '#0891B2',
          cornerRadius: Number(el.cornerRadius) || 8,
        };
        break;

      case 'input':
        shape.props = {
          width: Number(el.width) || 200,
          height: Number(el.height) || 40,
          fill: el.fill || '#FFFFFF',
          stroke: el.stroke || '#E2E8F0',
          strokeWidth: 1,
          cornerRadius: Number(el.cornerRadius) || 8,
        };
        break;

      case 'rectangle':
        shape.props = {
          width: Number(el.width) || 100,
          height: Number(el.height) || 100,
          fill: el.fill || '#F1F5F9',
          stroke: el.stroke,
          strokeWidth: el.stroke ? 1 : 0,
          cornerRadius: Number(el.cornerRadius) || 0,
        };
        break;

      case 'circle':
        shape.props = {
          radius: Number(el.radius) || 40,
          fill: el.fill || '#F1F5F9',
          stroke: el.stroke,
          strokeWidth: el.stroke ? 1 : 0,
        };
        break;

      case 'image':
        shape.props = {
          width: Number(el.width) || 120,
          height: Number(el.height) || 80,
          fill: el.fill || '#F1F5F9',
          stroke: el.stroke || '#E2E8F0',
          strokeWidth: 1,
          cornerRadius: Number(el.cornerRadius) || 8,
        };
        break;

      default:
        shape.props = {
          width: Number(el.width) || 100,
          height: Number(el.height) || 100,
          fill: el.fill || '#E2E8F0',
        };
    }

    return shape;
  });
}

export default function ScreenshotImporter({ onClose, onImport }) {
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件 (PNG, JPG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageName(file.name);
      setError('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

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

  const handleGenerate = useCallback(() => {
    setError('');
    setSuccess('');

    if (!jsonText.trim()) {
      setError('请粘贴 JSON 数据');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      const shapes = convertToShapes(data);
      onImport(shapes);
      setSuccess(`成功生成 ${shapes.length} 个组件`);
      
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'JSON 解析失败，请检查格式');
    }
  }, [jsonText, onImport, onClose]);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="screenshot-importer" onClick={(e) => e.stopPropagation()}>
        <div className="importer-header">
          <h3>截图导入</h3>
          <button className="close-btn" onClick={onClose}>
            <Icons.Close />
          </button>
        </div>

        <div className="importer-content">
          {/* 上传区域 */}
          <div className="section">
            <label className="section-label">截图预览</label>
            {!image ? (
              <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icons.Upload />
                <p>拖拽截图到此处或点击上传</p>
                <span>支持 PNG、JPG 格式</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  hidden
                />
              </div>
            ) : (
              <div className="preview-container">
                <img src={image} alt="预览" className="preview-image" />
                <div className="preview-info">
                  <span className="preview-name">{imageName}</span>
                  <button className="reupload-btn" onClick={handleRemoveImage}>
                    重新上传
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* JSON输入区域 */}
          <div className="section">
            <label className="section-label">AI 分析结果 (JSON)</label>
            <textarea
              className="json-input"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder={`{
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
}`}
              rows={12}
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

          {/* 状态提示 */}
          {error && (
            <div className="status-message error">
              <Icons.Alert />
              {error}
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
            生成到画布
          </button>
        </div>
      </div>
    </div>
  );
}
