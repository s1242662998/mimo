import { useState, useEffect } from 'react';
import { IconMap, TypeNameMap, Icons } from '../components/ComponentPanel';
import { buildSystemPrompt } from '../utils/buildSystemPrompt';
import './ChatWindow.css';

const DEFAULT_PROVIDERS = [
  { id: 'mimo-v2-pro', name: 'Xiaomi MiMo (mimo-v2-pro)', baseUrl: 'https://api.xiaomimimo.com/v1', isDefault: true },
  { id: 'mimo-v2-omni', name: 'Xiaomi MiMo Omni (多模态)', baseUrl: 'https://api.xiaomimimo.com/v1', isDefault: true },
  { id: 'openai-gpt-4', name: 'OpenAI (GPT-4)', baseUrl: 'https://api.openai.com/v1', isDefault: true }
];

export default function ChatWindow({ onClose, canvasShapes, onAiAction, chatContextShapes = [], setChatContextShapes }) {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem('rag_chat_history');
      if (savedMessages && savedMessages !== 'undefined') {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse chat history from localStorage", e);
    }
    return [{ id: 1, role: 'assistant', content: '你好！我是 RAG 助手，请问有什么可以帮你的？' }];
  });
  
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
  // 视频上传相关状态
  const [selectedVideo, setSelectedVideo] = useState(null); // base64 dataUrl
  const [videoMeta, setVideoMeta] = useState(null); // { name, duration, size }
  const [copiedId, setCopiedId] = useState(null);

  // 初始化从 localStorage 加载配置
  useEffect(() => {
    try {
      const savedProviders = localStorage.getItem('rag_custom_providers');
      if (savedProviders && savedProviders !== 'undefined') {
        setProviders([...DEFAULT_PROVIDERS, ...JSON.parse(savedProviders)]);
      }
      
      const savedKeys = localStorage.getItem('rag_api_keys');
      if (savedKeys && savedKeys !== 'undefined') {
        setApiKeys(JSON.parse(savedKeys));
      }
      
      const savedSelected = localStorage.getItem('rag_selected_provider');
      if (savedSelected && savedSelected !== 'undefined') {
        setSelectedProviderId(savedSelected);
      }
    } catch (e) {
      console.error("Failed to parse localStorage data", e);
    }
  }, []);

  // 监听 messages 变化并保存到 localStorage（去除大型媒体数据）
  useEffect(() => {
    try {
      const messagesToSave = messages.map(msg => {
        const saveMsg = { ...msg };
        // 保留图片缩略图用于历史展示，但限制大小
        if (saveMsg.image && saveMsg.image.length > 200000) {
          saveMsg.image = null;
        }
        // 视频不保存 base64（太大），只保留元信息
        if (saveMsg.video) {
          const { dataUrl, ...meta } = saveMsg.video;
          saveMsg.video = meta;
        }
        return saveMsg;
      });
      localStorage.setItem('rag_chat_history', JSON.stringify(messagesToSave));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
  }, [messages]);

  const handleSaveSettings = () => {
    localStorage.setItem('rag_api_keys', JSON.stringify(apiKeys));
    localStorage.setItem('rag_selected_provider', selectedProviderId);
    setShowSettings(false);
  };

  const handleAddCustomModel = () => {
    const id = newModelId.trim();
    const name = newModelName.trim();
    const url = newModelBaseUrl.trim();

    if (!name || !id || !url) {
      alert('请填写完整的模型信息');
      return;
    }
    
    // 确保 baseUrl 包含 /v1 (这只是一个简单的提示，并不强制修改)
    if (!url.includes('/v1')) {
      if(!window.confirm('你输入的 Base URL 似乎不包含 /v1。对于大多数 OpenAI 兼容接口，URL 应该以 /v1 结尾。是否继续？')) {
        return;
      }
    }

    // 生成一个内部唯一标识符，以支持同名 ID
    const internalId = `${id}-${Date.now()}`;

    const newProvider = {
      id: internalId,
      originalId: id, // 保存用户输入的真实 ID，用于后续 API 请求
      name: name,
      baseUrl: url,
      isDefault: false
    };
    
    setProviders(prevProviders => {
      const updatedProviders = [...prevProviders, newProvider];
      // 保存自定义提供商（排除默认的）
      const customProviders = updatedProviders.filter(p => !p.isDefault);
      localStorage.setItem('rag_custom_providers', JSON.stringify(customProviders));
      return updatedProviders;
    });
    
    setSelectedProviderId(internalId);
    // 自动保存选中状态
    localStorage.setItem('rag_selected_provider', internalId);
    
    setNewModelName('');
    setNewModelId('');
    setNewModelBaseUrl('');
    
    alert(`模型 ${name} 添加成功并已自动保存！\n请在上方配置该模型的 API Key。`);
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

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('请选择视频文件');
      return;
    }

    // 视频大小限制 20MB（base64 会更大）
    if (file.size > 20 * 1024 * 1024) {
      alert('视频文件不能超过 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedVideo(reader.result);
      setVideoMeta({ name: file.name, size: file.size, type: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoMeta(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedVideo) || isLoading) return;

    const currentProvider = providers.find(p => p.id === selectedProviderId);
    const apiKey = apiKeys[selectedProviderId];

    // 非多模态模型提示
    if ((selectedImage || selectedVideo) && selectedProviderId !== 'mimo-v2-omni') {
      alert('图片和视频功能需要使用多模态模型 (MiMo Omni)，请在设置中切换模型');
      setShowSettings(true);
      return;
    }

    if (!apiKey) {
      alert(`请先在设置中配置 ${currentProvider?.name} 的 API Key`);
      setShowSettings(true);
      return;
    }

    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      image: selectedImage,
      video: selectedVideo ? { dataUrl: selectedVideo, ...videoMeta } : null
    };

    const newMessagesList = [...messages, newMessage];
    setMessages(newMessagesList);
    setInput('');
    removeImage(); // 发送后清除图片预览
    removeVideo(); // 发送后清除视频预览
    setIsLoading(true);

    try {
      // 组装画布上下文信息
      const simplifiedShapes = canvasShapes?.map(s => ({
        id: s.id, type: s.type, x: s.x, y: s.y, fill: s.fill, 
        ...(s.text ? {text: s.text} : {}),
        ...(s.radius ? {radius: s.radius} : {width: s.width, height: s.height})
      })) || [];
      const canvasContext = `当前画布上的元素列表：${JSON.stringify(simplifiedShapes)}`;

      // 组装发给 OpenAI 格式 API 的消息历史
      const apiMessages = newMessagesList.map(msg => {
        // 视频消息：直接发送 video_url
        if (msg.video && msg.video.dataUrl && selectedProviderId === 'mimo-v2-omni') {
          const content = [];
          content.push({
            type: 'video_url',
            video_url: {
              url: msg.video.dataUrl
            }
          });
          content.push({
            type: 'text',
            text: msg.content || '请分析这段视频内容并根据视频中的 UI 设计生成原型'
          });
          return { role: msg.role, content };
        }

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

      // 补充画布上下文到最近的一条用户消息中
      if (apiMessages.length > 0) {
        const lastMsg = apiMessages[apiMessages.length - 1];
        let contextToAdd = canvasContext;

        if (chatContextShapes && chatContextShapes.length > 0) {
          const selectedContext = `用户特别指定的上下文组件：${JSON.stringify(chatContextShapes.map(s => ({
            id: s.id, type: s.type, x: s.x, y: s.y, ...s.props
          })))}\n\n`;
          contextToAdd = selectedContext + canvasContext;
        }

        if (typeof lastMsg.content === 'string') {
          lastMsg.content = `${lastMsg.content}\n\n${contextToAdd}`;
        } else if (Array.isArray(lastMsg.content)) {
          lastMsg.content.push({ type: 'text', text: contextToAdd });
        }
      }

      // 发送后清空指定的上下文组件
      if (chatContextShapes && chatContextShapes.length > 0) {
        setChatContextShapes?.([]);
      }

      // 如果是 MiMo，加上推荐的 system prompt
      if (selectedProviderId.startsWith('mimo')) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const weekStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

        const systemPrompt = buildSystemPrompt(dateStr, weekStr);

        apiMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }

      // 注意 MiMo API 要求的 header 是 api-key，而标准 OpenAI 是 Authorization: Bearer
      const isMimo = currentProvider.id.startsWith('mimo') || currentProvider.originalId?.startsWith('mimo');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (isMimo) {
        headers['api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // 这里必须使用真实提供商的 originalId 或 id 来发起请求
      const actualModelId = currentProvider.originalId || currentProvider.id;

      const requestBody = {
        model: actualModelId,
        messages: apiMessages,
        max_completion_tokens: 8192,
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "modify_canvas_shapes",
              description: "修改或重新布局画布上的组件，或根据截图生成全新画布。当用户要求修改元素，或者上传截图要求生成UI时调用此工具。",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["update", "delete", "add", "batch_update", "replace_all"],
                    description: "操作类型。修改用 update/batch_update，从截图生成新画布必须使用 replace_all。"
                  },
                  targetIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "要操作的组件 ID 列表。仅在 update/delete 时需要。"
                  },
                  updates: {
                    type: "object",
                    description: "仅在 type='update' 时需要。包含要更新的属性（包括 hoverProps 和 interactions）。"
                  },
                  batchUpdates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        updates: { type: "object" }
                      }
                    },
                    description: "仅在 type='batch_update' 时需要。"
                  },
                  elements: {
                    type: "array",
                    items: {
                      type: "object"
                    },
                    description: "当 type='replace_all'（生成整个页面）或 type='add'（批量添加多个组件）时需要。"
                  },
                  newShape: {
                    type: "object",
                    description: "仅在 type='add' 时需要（单元素）。包含要添加的组件对象。"
                  }
                },
                required: ["type"]
              }
            }
          }
        ]
      };

      const response = await fetch(`${currentProvider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
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
      
      // 处理工具调用
      if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
        for (const toolCall of messageObj.tool_calls) {
          if (toolCall.function.name === 'modify_canvas_shapes') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (onAiAction) {
                onAiAction(args);
                
                // 构建详细的执行反馈内容
                let actionFeedback = `✅ **已执行画布修改操作**\n\n`;
                
                if (reasoningContent) {
                  actionFeedback += `🤔 **AI 分析过程：**\n${reasoningContent}\n\n`;
                }
                
                actionFeedback += `🛠️ **执行的具体指令：**\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``;
                
                replyContent = actionFeedback;
              }
            } catch (e) {
              console.error("解析工具参数失败", e);
              replyContent = `❌ 解析工具参数失败：${e.message}\n\n原始数据：\n\`\`\`json\n${toolCall.function.arguments}\n\`\`\``;
            }
          }
        }
      } else {
        // 如果没有普通内容但有思考过程（通常是因为被长度截断了），则显示思考过程
        if (!replyContent && reasoningContent) {
          replyContent = `[模型正在思考，但因长度限制未完成最终输出]\n\n思考过程：\n${reasoningContent}`;
        } else if (!replyContent && !reasoningContent) {
          replyContent = JSON.stringify(data); // 兜底显示原始 JSON
        }
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const renderMessageContent = (msg) => {
    // 简单的 Markdown 粗体解析
    let formattedContent = msg.content;
    
    // 1. 先尝试匹配 ``` 包裹的标准代码块
    const parts = formattedContent.split(/(```[\s\S]*?```)/g);
    
    // 如果没有任何标准代码块，但内容看起来像是一个完整的 JSON（以 { 或 [ 开头和结尾）
    if (parts.length === 1 && msg.content.trim().startsWith('{') && msg.content.trim().endsWith('}')) {
       const codeId = `${msg.id}-code-raw-json`;
       return (
         <div className="rag-code-block-container">
           <div className="rag-code-block-header">
             <span className="rag-code-language">json</span>
             <button 
               className="rag-code-copy-btn"
               onClick={() => copyToClipboard(msg.content.trim(), codeId)}
             >
               {copiedId === codeId ? (
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <polyline points="20 6 9 17 4 12" />
                 </svg>
               ) : (
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                   <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                 </svg>
               )}
               {copiedId === codeId ? '已复制' : '复制'}
             </button>
           </div>
           <pre className="rag-code-block">
             <code>{msg.content.trim()}</code>
           </pre>
         </div>
       );
    }

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim();
        const codeContent = lines.slice(1, -1).join('\n');
        const codeId = `${msg.id}-code-${index}`;

        return (
          <div key={index} className="rag-code-block-container">
            <div className="rag-code-block-header">
              <span className="rag-code-language">{language || 'code'}</span>
              <button 
                className="rag-code-copy-btn"
                onClick={() => copyToClipboard(codeContent, codeId)}
              >
                {copiedId === codeId ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                {copiedId === codeId ? '已复制' : '复制'}
              </button>
            </div>
            <pre className="rag-code-block">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }
      
      // 普通文本（支持简单的 Markdown 粗体渲染）
      const renderBoldText = (text) => {
        const textParts = text.split(/(\*\*[\s\S]*?\*\*)/g);
        return textParts.map((t, i) => {
          if (t.startsWith('**') && t.endsWith('**')) {
            return <strong key={i}>{t.slice(2, -2)}</strong>;
          }
          return <span key={i}>{t}</span>;
        });
      };

      return <span key={index}>{renderBoldText(part)}</span>;
    });
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
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm('确定要清空所有对话历史吗？此操作不可恢复。')) {
                  setMessages([{ id: 1, role: 'assistant', content: '你好！我是 RAG 助手，请问有什么可以帮你的？' }]);
                  localStorage.removeItem('rag_chat_history');
                }
              }} 
              className="rag-settings-clear-btn"
            >
              清空对话历史
            </button>
            <div style={{ flex: 1 }}></div>
            <button onClick={() => setShowSettings(false)} className="rag-settings-cancel-btn">
              关闭
            </button>
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
                  {msg.video && (
                    <div className="rag-message-video">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>{msg.video.name || '视频'}</span>
                    </div>
                  )}
                  {renderMessageContent(msg)}
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
            {chatContextShapes && chatContextShapes.length > 0 && (
              <div className="rag-context-shapes">
                {chatContextShapes.map(shape => {
                  const typeKey = shape.componentType || shape.id.split('-')[0];
                  const Icon = IconMap[typeKey] || Icons.Rect;
                  const typeName = TypeNameMap[typeKey] || '组件';
                  return (
                    <div key={shape.id} className="rag-context-shape-pill">
                      <Icon />
                      <span>{typeName}</span>
                      <button 
                        onClick={() => setChatContextShapes(prev => prev.filter(s => s.id !== shape.id))}
                        className="rag-context-shape-remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {imagePreviewUrl && (
              <div className="rag-image-preview">
                <img src={imagePreviewUrl} alt="Preview" />
                <button onClick={removeImage} className="rag-remove-image-btn">×</button>
              </div>
            )}
            {selectedVideo && (
              <div className="rag-video-preview">
                <video src={selectedVideo} muted />
                <div className="rag-video-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>{videoMeta?.name || '视频'}</span>
                </div>
                <button onClick={removeVideo} className="rag-remove-image-btn">×</button>
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
              <label className="rag-upload-btn" title="上传视频">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  style={{ display: 'none' }}
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={`发送消息给 ${providers.find(p => p.id === selectedProviderId)?.name}...`}
                rows={3}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={(!input.trim() && !selectedImage && !selectedVideo) || isLoading} className="rag-send-btn">
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

