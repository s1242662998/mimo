import { useState, useEffect } from 'react';
import './ChatWindow.css';

const DEFAULT_PROVIDERS = [
  { id: 'mimo-v2-pro', name: 'Xiaomi MiMo (mimo-v2-pro)', baseUrl: 'https://api.xiaomimimo.com/v1', isDefault: true },
  { id: 'mimo-v2-omni', name: 'Xiaomi MiMo Omni (多模态)', baseUrl: 'https://api.xiaomimimo.com/v1', isDefault: true },
  { id: 'openai-gpt-4', name: 'OpenAI (GPT-4)', baseUrl: 'https://api.openai.com/v1', isDefault: true }
];

export default function ChatWindow({ onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: '你好！我是 RAG 助手，请问有什么可以帮你的？' }
  ]);
  const [input, setInput] = useState('');
  
  // 模型配置相关状态
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState(DEFAULT_PROVIDERS[0].id);
  const [apiKeys, setApiKeys] = useState({}); // { providerId: apiKey }
  const [showSettings, setShowSettings] = useState(false);
  
  // 新增自定义模型表单状态
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 图片上传相关状态
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  // 初始化从 localStorage 加载配置
  useEffect(() => {
    const savedProviders = localStorage.getItem('rag_custom_providers');
    if (savedProviders) {
      setProviders([...DEFAULT_PROVIDERS, ...JSON.parse(savedProviders)]);
    }
    
    const savedKeys = localStorage.getItem('rag_api_keys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
    
    const savedSelected = localStorage.getItem('rag_selected_provider');
    if (savedSelected) {
      setSelectedProviderId(savedSelected);
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('rag_api_keys', JSON.stringify(apiKeys));
    localStorage.setItem('rag_selected_provider', selectedProviderId);
    setShowSettings(false);
  };

  const handleAddCustomModel = () => {
    if (!newModelName || !newModelId || !newModelBaseUrl) {
      alert('请填写完整的模型信息');
      return;
    }
    
    const newProvider = {
      id: newModelId,
      name: newModelName,
      baseUrl: newModelBaseUrl,
      isDefault: false
    };
    
    const updatedProviders = [...providers, newProvider];
    setProviders(updatedProviders);
    
    // 保存自定义提供商（排除默认的）
    const customProviders = updatedProviders.filter(p => !p.isDefault);
    localStorage.setItem('rag_custom_providers', JSON.stringify(customProviders));
    
    setSelectedProviderId(newModelId);
    setNewModelName('');
    setNewModelId('');
    setNewModelBaseUrl('');
  };

  const removeCustomModel = (idToRemove) => {
    const updatedProviders = providers.filter(p => p.id !== idToRemove);
    setProviders(updatedProviders);
    
    const customProviders = updatedProviders.filter(p => !p.isDefault);
    localStorage.setItem('rag_custom_providers', JSON.stringify(customProviders));
    
    if (selectedProviderId === idToRemove) {
      setSelectedProviderId(DEFAULT_PROVIDERS[0].id);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 检查是否为图片
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // 在此处对图片进行压缩处理，限制最大边长为 1024 像素
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const MAX_SIDE = 1024; // 限制最大边长，显著降低 Token 消耗

        if (width > MAX_SIDE || height > MAX_SIDE) {
          if (width > height) {
            height = Math.round((height * MAX_SIDE) / width);
            width = MAX_SIDE;
          } else {
            width = Math.round((width * MAX_SIDE) / height);
            height = MAX_SIDE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 使用 jpeg 格式并设置适当的质量以减少 Base64 字符串长度
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedImage(compressedDataUrl);
        setImagePreviewUrl(compressedDataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // 重置 input 以允许选择同一文件
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentProvider = providers.find(p => p.id === selectedProviderId);
    const apiKey = apiKeys[selectedProviderId];

    if (!apiKey) {
      alert(`请先在设置中配置 ${currentProvider?.name} 的 API Key`);
      setShowSettings(true);
      return;
    }

    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      image: selectedImage // 附带图片数据
    };

    const newMessagesList = [...messages, newMessage];
    setMessages(newMessagesList);
    setInput('');
    removeImage(); // 发送后清除图片预览
    setIsLoading(true);

    try {
      // 组装发给 OpenAI 格式 API 的消息历史
      const apiMessages = newMessagesList.map(msg => {
        if (msg.image && selectedProviderId === 'mimo-v2-omni') {
          // 多模态消息格式
          return {
            role: msg.role,
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: msg.image
                }
              },
              {
                type: 'text',
                text: msg.content || '请描述这张图片'
              }
            ]
          };
        }
        
        // 普通文本消息格式
        return {
          role: msg.role,
          content: msg.content
        };
      });

      // 如果是 MiMo，加上推荐的 system prompt
      if (selectedProviderId.startsWith('mimo')) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const weekStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
        
        apiMessages.unshift({
          role: 'system',
          content: `You are MiMo, an AI assistant developed by Xiaomi. Today's date: ${dateStr} ${weekStr}. Your knowledge cutoff date is December 2024.\n\nIMPORTANT: Please provide the final JSON output directly. Keep your reasoning brief to avoid hitting the maximum token limit.`
        });
      }

      // 注意 MiMo API 要求的 header 是 api-key，而标准 OpenAI 是 Authorization: Bearer
      const isMimo = selectedProviderId.startsWith('mimo');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (isMimo) {
        headers['api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${currentProvider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: currentProvider.id,
          messages: apiMessages,
          max_completion_tokens: 8192, // 再次增大 token 限制，防止复杂推理过程被截断
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      
      const messageObj = data.choices?.[0]?.message || {};
      let replyContent = messageObj.content || '';
      const reasoningContent = messageObj.reasoning_content || '';
      
      // 如果没有普通内容但有思考过程（通常是因为被长度截断了），则显示思考过程
      if (!replyContent && reasoningContent) {
        replyContent = `[模型正在思考，但因长度限制未完成最终输出]\n\n思考过程：\n${reasoningContent}`;
      } else if (!replyContent && !reasoningContent) {
        replyContent = JSON.stringify(data); // 兜底显示原始 JSON
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: replyContent,
        reasoning: reasoningContent // 保存思考过程供后续可能的 UI 展开使用
      }]);
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `请求失败: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          // 同样对粘贴的图片进行压缩
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const MAX_SIDE = 1024;

            if (width > MAX_SIDE || height > MAX_SIDE) {
              if (width > height) {
                height = Math.round((height * MAX_SIDE) / width);
                width = MAX_SIDE;
              } else {
                width = Math.round((width * MAX_SIDE) / height);
                height = MAX_SIDE;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setSelectedImage(compressedDataUrl);
            setImagePreviewUrl(compressedDataUrl);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(blob);
        e.preventDefault(); // 阻止默认粘贴行为（如将图片粘贴为路径等）
        break;
      }
    }
  };

  return (
    <div className="rag-chat-window">
      <div className="rag-chat-header">
        <div className="rag-chat-title">AI 助手</div>
        <div className="rag-chat-controls">
          <button 
            className="rag-settings-btn" 
            onClick={() => setShowSettings(!showSettings)}
            title="模型设置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="rag-close-btn" onClick={onClose} title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="rag-settings-panel">
          <h3 className="rag-settings-title">模型配置</h3>
          
          <div className="rag-settings-group">
            <label>当前选择模型</label>
            <select 
              value={selectedProviderId} 
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="rag-provider-select-full"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="rag-settings-group">
            <label>API Key</label>
            <input 
              type="password" 
              value={apiKeys[selectedProviderId] || ''}
              onChange={(e) => setApiKeys({...apiKeys, [selectedProviderId]: e.target.value})}
              placeholder="输入该模型的 API Key"
              className="rag-settings-input"
            />
          </div>

          <hr className="rag-settings-divider" />

          <h4 className="rag-settings-subtitle">添加自定义模型 (OpenAI 兼容)</h4>
          <div className="rag-settings-group">
            <input 
              type="text" 
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="显示名称 (如: DeepSeek)"
              className="rag-settings-input"
            />
            <input 
              type="text" 
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder="模型 ID (如: deepseek-chat)"
              className="rag-settings-input"
            />
            <input 
              type="text" 
              value={newModelBaseUrl}
              onChange={(e) => setNewModelBaseUrl(e.target.value)}
              placeholder="Base URL (包含 /v1)"
              className="rag-settings-input"
            />
            <button onClick={handleAddCustomModel} className="rag-settings-add-btn">
              添加模型
            </button>
          </div>

          {!providers.find(p => p.id === selectedProviderId)?.isDefault && (
            <button 
              onClick={() => removeCustomModel(selectedProviderId)}
              className="rag-settings-remove-btn"
            >
              删除当前自定义模型
            </button>
          )}

          <div className="rag-settings-actions">
            <button onClick={() => setShowSettings(false)} className="rag-settings-cancel-btn">取消</button>
            <button onClick={handleSaveSettings} className="rag-settings-save-btn">保存设置</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rag-chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`rag-message ${msg.role}`}>
                <div className="rag-message-content">
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="uploaded" 
                      className="rag-message-image" 
                    />
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="rag-message assistant">
                <div className="rag-message-content loading">
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                </div>
              </div>
            )}
          </div>

          <div className="rag-chat-input-area">
            {imagePreviewUrl && (
              <div className="rag-image-preview">
                <img src={imagePreviewUrl} alt="Preview" />
                <button onClick={removeImage} className="rag-remove-image-btn">×</button>
              </div>
            )}
            <div className="rag-input-controls">
              <label className="rag-upload-btn" title="上传图片">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`发送消息给 ${providers.find(p => p.id === selectedProviderId)?.name}...`}
                rows={1}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={(!input.trim() && !selectedImage) || isLoading} className="rag-send-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

