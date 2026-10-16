import { useState, useEffect } from 'react';
import { IconMap, TypeNameMap, Icons } from '../components/ComponentPanel';
import { buildSystemPrompt } from '../utils/buildSystemPrompt';
import { buildHtmlPrompt, extractHtml } from '../utils/buildHtmlPrompt';
import { htmlToShapes } from '../utils/htmlToShapes';
import { VALID_COMPONENT_TYPES } from '../utils/componentSchema';
import ProviderSettings from './ProviderSettings';
import {
  loadProviders, saveProviders, loadSelectedId, saveSelectedId,
  makeInternalId, buildAuthHeaders, testProviderConnection,
} from '../utils/providerStore';
import './ChatWindow.css';

// 请求超时保护（改造前无 AbortController，接口挂起会一直转圈）
//
// 排查记录：最初固定 120s，导致「上传截图复刻」这类任务被误杀，
// 报错为 signal is aborted without reason（用户完全看不出是超时）。
// 两个问题：
//   1. 超时时长不合理 —— 多模态请求要处理图片 + 输出上百个组件的 HTML，
//      5 分钟都可能不够。改为按通道区分，且可在模型配置里调。
//   2. abort 时没有 reason → fetch 抛 AbortError，message 是
//      「signal is aborted without reason」，毫无信息量。现在带上明确 reason。
const DEFAULT_TIMEOUT_TEXT = 180000;   // 纯文本生成
const DEFAULT_TIMEOUT_VISION = 600000; // 截图/视频多模态复刻
const MIN_TIMEOUT = 30000;

function resolveTimeout(provider, isVision) {
  const custom = Number(provider?.timeout);
  if (Number.isFinite(custom) && custom >= MIN_TIMEOUT) return custom;
  return isVision ? DEFAULT_TIMEOUT_VISION : DEFAULT_TIMEOUT_TEXT;
}

function buildTimeoutSignal(ms) {
  if (typeof AbortController === 'undefined') return undefined;
  const controller = new AbortController();
  setTimeout(() => {
    // 带上 reason，fetch 会把它作为 error.message 抛出，用户能看懂
    controller.abort(`请求超时（${Math.round(ms / 1000)} 秒），模型可能仍在生成。可在模型配置里调大超时时间后重试。`);
  }, ms);
  return controller.signal;
}

/** 把 fetch 的各类异常翻译成用户能看懂的中文提示 */
function describeRequestError(error) {
  if (!error) return '未知错误';

  const raw = error.message || String(error);
  const isAbort = error.name === 'AbortError'
    || /aborted without reason|signal is aborted|The user aborted/i.test(raw);

  if (isAbort) {
    // 有 reason 时直接用 reason
    if (raw && !/aborted without reason|signal is aborted/i.test(raw)) return raw;
    return '请求超时。截图复刻这类任务耗时较长，可在模型配置里把「超时时间」调大后重试。';
  }
  if (/fetch failed|network|networkerror|Failed to fetch/i.test(raw)) {
    return '网络请求失败：无法连接到模型服务。请检查 Base URL、网络或代理设置。';
  }
  return raw;
}

export default function ChatWindow({ onClose, canvasShapes, selectedIds = [], onAiAction, chatContextShapes = [], setChatContextShapes }) {
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
  // 改造前有 DEFAULT_PROVIDERS 硬编码预设 + 三个分散的 localStorage 键 + 两步保存。
  // 现在零预设，单一存储键，任何变更即时写入，点「保存并使用」即完成配置。
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [configTestResult, setConfigTestResult] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  // AI 处理阶段状态
  const [aiProcessingStage, setAiProcessingStage] = useState('');

  // 图片上传相关状态
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  // 截图原始像素尺寸 —— HTML 通道用它作为容器宽度，保证 flex 布局与截图一致
  const [selectedImageMeta, setSelectedImageMeta] = useState(null);
  // 视频上传相关状态
  const [selectedVideo, setSelectedVideo] = useState(null); // base64 dataUrl
  const [videoMeta, setVideoMeta] = useState(null); // { name, duration, size }
  const [copiedId, setCopiedId] = useState(null);

  // 生成通道选择（对标墨刀的两段式架构）
  //   html    —— 模型输出 HTML，由确定性解析层转组件。截图/从零生成时保真度最高
  //   shapes  —— 模型直吐组件 JSON，走 tools 工具调用。用于精确增量修改，省 token
  // auto 模式下：上传了截图/视频 → html；纯文本 → shapes
  const [generateMode, setGenerateMode] = useState('auto');

  // 初始化：单一存储键读取，零预设。清理旧版分散的三个键
  useEffect(() => {
    const saved = loadProviders();
    setProviders(saved);

    const savedSelected = loadSelectedId();
    // 选中的模型若已失效，回落到第一个可用模型
    if (savedSelected && saved.some(p => p.internalId === savedSelected)) {
      setSelectedProviderId(savedSelected);
    } else if (saved.length > 0) {
      setSelectedProviderId(saved[0].internalId);
      saveSelectedId(saved[0].internalId);
    }

    // 首次配置完成后自动打开设置面板，避免用户面对空下拉框不知道该做什么
    if (saved.length === 0) setShowSettings(true);

    // 清理改造前遗留的三个分散存储键
    ['rag_custom_providers', 'rag_api_keys', 'rag_selected_provider'].forEach(k => {
      try { localStorage.removeItem(k); } catch { /* 忽略 */ }
    });
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
          const { dataUrl: _omit, ...meta } = saveMsg.video;
          saveMsg.video = meta;
        }
        return saveMsg;
      });
      localStorage.setItem('rag_chat_history', JSON.stringify(messagesToSave));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
  }, [messages]);

  // === 模型配置：所有变更即时落盘，不需要额外的「保存设置」步骤 ===

  const handleAddProvider = (draft) => {
    const record = { ...draft, internalId: makeInternalId(draft.modelId) };
    const next = [...providers, record];
    setProviders(next);
    saveProviders(next);
    setSelectedProviderId(record.internalId);
    saveSelectedId(record.internalId);
    // 首次配置完成 → 关掉面板，直接进入使用状态
    if (providers.length === 0) setShowSettings(false);
  };

  const handleUpdateProvider = (internalId, draft) => {
    const next = providers.map(p =>
      p.internalId === internalId ? { ...draft, internalId } : p
    );
    setProviders(next);
    saveProviders(next);
  };

  const handleRemoveProvider = (internalId) => {
    const target = providers.find(p => p.internalId === internalId);
    if (!target) return;
    if (!window.confirm(`确定删除模型「${target.name}」？`)) return;

    const next = providers.filter(p => p.internalId !== internalId);
    setProviders(next);
    saveProviders(next);

    if (selectedProviderId === internalId) {
      const fallback = next[0]?.internalId || '';
      setSelectedProviderId(fallback);
      saveSelectedId(fallback);
    }
  };

  const handleSelectProvider = (internalId) => {
    setSelectedProviderId(internalId);
    saveSelectedId(internalId);
  };

  const handleTestExistingProvider = async (provider) => {
    setConfigTestResult({ name: provider.name, testing: true });
    const res = await testProviderConnection(provider);
    setConfigTestResult({ name: provider.name, ...res });
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
        const originalWidth = img.width;
        const originalHeight = img.height;
        let width = originalWidth;
        let height = originalHeight;
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
        // 记录原始尺寸：HTML 通道需要用真实像素宽度作为容器宽度，
        // 否则 flex 布局会被压缩（1080px 截图按 800px 渲染会缩水 26%）
        setSelectedImageMeta({
          width: originalWidth,
          height: originalHeight,
          compressedWidth: width,
          compressedHeight: height,
        });
        console.log(`[截图] 原始 ${originalWidth}×${originalHeight} → 压缩后 ${width}×${height}`);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // 重置 input 以允许选择同一文件
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImageMeta(null);
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

    // 零预设后可能一个模型都没配，直接引导去配置而不是报错
    const currentProvider = providers.find(p => p.internalId === selectedProviderId);
    if (!currentProvider) {
      setShowSettings(true);
      return;
    }
    const apiKey = currentProvider.apiKey;
    if (!apiKey) {
      alert(`请先完善「${currentProvider.name}」的 API Key`);
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
    setAiProcessingStage('构建消息中...');

    try {
   // 组装画布上下文信息
      setAiProcessingStage('读取画布上下文...');
      // 改造前这里读的是 s.fill / s.text / s.width，但实际数据都存在s.props 里，
      // 导致模型收到的每一条上下文都是 undefined，完全不知道画布上有什么。
      // 现在改为读 props，并用 HTML 序列化让模型看懂「结构」而不是一堆坐标。
      const simplifiedShapes = (canvasShapes || []).map(s => ({
        id: s.id,
        type: s.componentType || s.type,
        x: Math.round(s.x),
        y: Math.round(s.y),
        ...(s.props?.width ? { width: s.props.width } : {}),
        ...(s.props?.height ? { height: s.props.height } : {}),
        ...(s.props?.radius ? { radius: s.props.radius } : {}),
        ...(s.props?.fill ? { fill: s.props.fill } : {}),
        ...(s.props?.text ? { text: s.props.text } : {}),
        ...(s.props?.placeholder ? { placeholder: s.props.placeholder } : {}),
      }));
      const canvasContext = `当前画布共 ${canvasShapes?.length || 0} 个元素：\n${JSON.stringify(simplifiedShapes, null, 0)}`;

// 当前选中元素——这是「对话改组件」的关键上下文。
      // 改造前完全没传给模型，导致模型不知道用户说的是哪个元素，只能推倒重来。
      const selectionContext = selectedIds.length
        ? `\n\n【用户当前选中的元素】共 ${selectedIds.length} 个：\n${JSON.stringify(
          simplifiedShapes.filter(s => selectedIds.includes(s.id)),
          null, 0
        )}\n用户接下来的指令很可能只针对这些元素，请优先使用 update/batch_update 精确修改它们，不要重建整个画布。`
        : '\n\n【当前没有选中任何元素】如果用户说「这个」「它」，请先询问要改哪个元素。';

      // 组装发给 OpenAI 格式 API 的消息历史
      const apiMessages = newMessagesList.map(msg => {
        // 视频消息：直接发送 video_url
        if (msg.video && msg.video.dataUrl) {
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

        if (msg.image) {
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

        contextToAdd += selectionContext;

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

// === 通道判定 ===
      // 有截图/视频 → HTML 通道（模型只写 HTML，解析层负责坐标与组件映射，保真度最高）
      // 纯文本 → shapes 通道（走 tools 工具调用，适合精确增量修改）
      const useHtmlChannel = generateMode === 'html'
        || (generateMode === 'auto' && !!(selectedImage || selectedVideo));

      setAiProcessingStage(selectedImage ? 'AI 正在分析截图中...' : 'AI 正在思考中...');

      // 改造前靠 id.startsWith('mimo') 猜鉴权方式，用户自定义模型若名字里没有 mimo
      // 一律走 Bearer，遇到需要 api-key header 的私有服务就会认证失败。
      // 现在鉴权方式是模型配置里的显式字段，带自动推断兜底。
      const headers = buildAuthHeaders(currentProvider, apiKey);
      const actualModelId = currentProvider.modelId;

// === HTML 通道：提示词极简，不带 tools，让模型专注输出 HTML ===
    if (useHtmlChannel) {
 setAiProcessingStage('构建 HTML 结构...');

        // 容器宽度必须对齐截图的真实像素宽度。
        // 改造前固定 800px（只从已有画布推断），而截图常是 1080/1440 等宽度，
        // 导致 flex 布局被压缩 26%+ → 文字大面积折行、卡片被纵向拉高，
        // 还原度严重偏离截图。
        let rootWidth = canvasShapes?.length
          ? Math.max(400, ...canvasShapes.map(s => s.x + (s.props?.width || 0))) + 40
          : 1080;
        if (selectedImageMeta?.width) {
          // 直接用原始像素宽度。
          // 注意：不能乘压缩比——上传时图片被压到 MAX_SIDE=1024，
          // 但提示词里声明的根容器宽度就是「截图原始宽度」，
          // 模型按这个宽度写死坐标，解析层也按这个宽度渲染，再乘一次就双重缩放了。
          rootWidth = Math.round(selectedImageMeta.width);
          console.log(
            `[HTML通道] 采用截图原始宽度 ${selectedImageMeta.width}px`
            + `（上传时压缩到 ${selectedImageMeta.compressedWidth}px）作为容器宽度`
          );
        }
        console.log('[HTML通道] 最终容器宽度:', rootWidth, 'px');

        const htmlPrompt = buildHtmlPrompt(selectedImage ? 'vision' : 'text', { rootWidth });

        const htmlMessages = [
          { role: 'system', content: htmlPrompt },
          ...apiMessages.filter(m => m.role !== 'system'),
        ];

console.group('[HTML通道] 开始');
        console.log('[HTML通道] 模型:', actualModelId);
        console.log('[HTML通道] Base URL:', currentProvider.baseUrl);
        console.log('[HTML通道] 鉴权方式:', currentProvider.authType);
        console.log('[HTML通道] 容器宽度:', rootWidth);
        console.log('[HTML通道] 提示词长度:', htmlPrompt.length, '字符');
        console.log('[HTML通道] 提示词内容:', htmlPrompt);
        console.log('[HTML通道] 输入类型:', selectedImage ? '截图' : selectedVideo ? '视频' : '纯文本');

        // 多模态截图复刻耗时长，超时按 10 分钟兜底（可在模型配置里覆盖）
        const htmlTimeout = resolveTimeout(currentProvider, !!(selectedImage || selectedVideo));
        console.log('[HTML通道] 超时设置:', Math.round(htmlTimeout / 1000), '秒');

      const htmlResp = await fetch(`${currentProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
   signal: buildTimeoutSignal(htmlTimeout),
      body: JSON.stringify({
  model: actualModelId,
    messages: htmlMessages,
   max_tokens: 16384,
            temperature: 0.2,   // 结构化生成需要确定性
          }),
        });

        if (!htmlResp.ok) {
  const errText = await htmlResp.text();
   console.error('[HTML通道] 接口返回非 2xx:', htmlResp.status, errText);
  console.groupEnd();
          throw new Error(`API Error (${htmlResp.status}): ${errText}`);
      }

        const htmlData = await htmlResp.json();
        const htmlContent = htmlData.choices?.[0]?.message?.content || '';
   const finishReason = htmlData.choices?.[0]?.finish_reason;

        console.log('[HTML通道] finish_reason:', finishReason);
        console.log('[HTML通道] 回复长度:', htmlContent.length, '字符');
        console.log('[HTML通道] 模型原始回复：', htmlContent);

        if (finishReason === 'length') {
          console.warn('[HTML通道] 输出因长度上限被截断，HTML 可能不完整');
        }
        if (finishReason === 'content_filter') {
          console.error('[HTML通道] 输出被内容安全策略拦截');
        }

   setAiProcessingStage('转换为原生组件...');
    const htmlSource = extractHtml(htmlContent);
        if (!htmlSource) {
       console.error('[HTML通道] extractHtml 未能提取到 HTML，原始回复：', htmlContent);
          console.groupEnd();
throw new Error('模型未返回可解析的 HTML。可能是模型能力不支持，或输出被安全策略拦截。可切换到「组件」模式重试。');
        }
        console.log('[HTML通道] 已提取 HTML:', htmlSource);

        const shapes = htmlToShapes(htmlSource, { width: rootWidth, idPrefix: 'ai' });
 if (!shapes.length) {
      console.error('[HTML通道] 解析结果为空，HTML 全文：', htmlSource);
          console.groupEnd();
          throw new Error(
  'HTML 解析后未生成任何组件。已把模型返回的 HTML 打印到控制台（F12），' +
  '请查看是否只返回了说明文字而没有 HTML。也可切换到「组件」模式重试。'
   );
        }

        console.log('[HTML通道] 解析成功，组件数:', shapes.length);
        console.groupEnd();

        // 走原有 replace_all 通道落地，保证写历史/选中态逻辑一致
        onAiAction?.({ type: 'replace_all', elements: shapes.map(s => ({
          id: s.id,
          type: s.componentType,
          x: s.x,
          y: s.y,
          width: s.props.width,
          height: s.props.height,
          radius: s.props.radius,
          fill: s.props.fill,
          stroke: s.props.stroke,
          strokeWidth: s.props.strokeWidth,
          cornerRadius: s.props.cornerRadius,
          opacity: s.props.opacity,
          rotation: 0,
          props: s.props,
          html: s.html,
        })) });

const truncated = finishReason === 'length';
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
     content: truncated
     ? `已生成 ${shapes.length} 个组件，但输出达到长度上限被截断，页面可能不完整。\n\n` +
              `可以：① 缩小截图范围后重试；② 简化描述（只要求复刻主要区块）；③ 分区域多次生成。`
         : `已根据你的描述生成 ${shapes.length} 个组件。\n\n可以直接在画布上手工微调，也可以选中某个组件后继续让我调整。`,
        }]);
        setIsLoading(false);
        return;
      }

      // === shapes 通道：走 tools 工具调用 ===
   // system prompt 改为对所有 provider 注入（改造前只有 MiMo 注入，
      // 切换到 GPT-4 时提示词完全失效，模型完全自由发挥）
      setAiProcessingStage('构建系统提示词...');

      apiMessages.unshift({
        role: 'system',
        content: buildSystemPrompt()
      });

      const requestBody = {
        model: actualModelId,
        messages: apiMessages,
        max_tokens: 16384,
        temperature: 0.3,
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
                    enum: ["update", "delete", "add", "batch_update", "replace_all", "replace"],
                    description: [
                      "操作类型。",
                      "局部改属性用 update；批量改属性用 batch_update；",
                      "删除用 delete；新增用 add；",
                      "把已有组件换成另一批组件（换样式、换类型、把矩形改成横线等）用 replace；",
                      "从截图生成全新画布必须使用 replace_all。",
                      "重要：当用户要求「把某元素换成另一种东西」时，必须用 replace 一步完成，",
                      "不要先 delete 再 add——单次调用只能执行一个 type，无法连续两步。"
                    ].join("")
                  },
                  targetIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "要操作的组件 ID 列表。update/delete/replace 需要。replace 时填要被替换掉的旧组件 ID。"
                  },
                  updates: {
                    type: "object",
                    description: "仅在 type='update' 时需要。只需给出要修改的字段，其余字段保持原样。可用字段包括 x/y/width/height/fill/stroke/strokeWidth/cornerRadius/opacity/text/fontSize/fontWeight/textColor/rotation/visible/scale/hoverProps/interactions/visibleIf。",
                    additionalProperties: true
                  },
                  batchUpdates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        updates: { type: "object", additionalProperties: true }
                      },
                      required: ["id", "updates"]
                    },
                    description: "type='batch_update' 时需要；type='replace' 时不需要（replace 用 targetIds 指定要删的旧组件）。"
                  },
                  elements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "唯一标识，格式 type-N" },
                        type: {
                          type: "string",
                          enum: VALID_COMPONENT_TYPES,
                          description: "组件类型。只能使用列表中的值。"
                        },
                        x: { type: "number", description: "左上角 x 坐标" },
                        y: { type: "number", description: "左上角 y 坐标" },
                        width: { type: "number" },
                        height: { type: "number" },
                        radius: { type: "number", description: "圆形/头像的半径" },
                        fill: { type: "string", description: "HEX 颜色，如 #FFFFFF" },
                        stroke: { type: "string" },
                        strokeWidth: { type: "number" },
                        cornerRadius: { type: "number" },
                        opacity: { type: "number" },
                        text: { type: "string" },
                        fontSize: { type: "number" },
                        fontWeight: { type: "string", enum: ["400", "500", "700", "bold"] },
                        textColor: { type: "string" },
                        rotation: { type: "number" },
                        iconId: { type: "string", description: "icon 类型的图标 id" },
                        visibleIf: { type: "object", additionalProperties: true },
                        hoverProps: { type: "object", additionalProperties: true },
                        interactions: { type: "array", items: { type: "object", additionalProperties: true } },
                        html: { type: "string", description: "该元素对应的 HTML 片段，供后续对话修改使用" }
                      },
                      required: ["id", "type", "x", "y"],
                      additionalProperties: false
                    },
                    description: "当 type='replace_all'（生成整个页面）或 type='add'（批量添加多个组件）时需要。"
                  },
                  newShape: {
                    type: "object",
                    description: "仅在 type='add' 时需要（单元素）。包含要添加的组件对象。",
                    additionalProperties: true
                  }
                },
                required: ["type"]
              }
            }
          }
        ],
        // 强制调用工具：否则模型常判定"只是聊天"而只回文本，画布毫无变化
        tool_choice: { type: "function", function: { name: "modify_canvas_shapes" } }
      };

      // shapes 通道也可能是带图的大任务，同样按多模态给长超时
      const shapesTimeout = resolveTimeout(currentProvider, !!(selectedImage || selectedVideo));
      const response = await fetch(`${currentProvider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
   signal: buildTimeoutSignal(shapesTimeout),
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
        setAiProcessingStage('解析 AI 响应中...');
        for (const toolCall of messageObj.tool_calls) {
          if (toolCall.function.name === 'modify_canvas_shapes') {
            try {
              setAiProcessingStage('生成组件中...');
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
      console.error('[AI] 请求失败：', error);
      console.error('[AI] 错误堆栈：', error?.stack);
    console.error('[AI] 错误名:', error?.name);
      const friendly = describeRequestError(error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `请求失败：${friendly}`,
  isError: true
      }]);
 } finally {
      setIsLoading(false);
      setAiProcessingStage('');
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
          <ProviderSettings
            providers={providers}
            selectedId={selectedProviderId}
            onAdd={handleAddProvider}
            onUpdate={handleUpdateProvider}
            onRemove={handleRemoveProvider}
            onSelect={handleSelectProvider}
            onTestExisting={handleTestExistingProvider}
          />

          {configTestResult && (
            <div className={`provider-msg ${configTestResult.testing ? '' : configTestResult.ok ? 'provider-msg-ok' : 'provider-msg-error'}`}>
              {configTestResult.testing
                ? `正在测试「${configTestResult.name}」...`
                : `${configTestResult.name}：${configTestResult.message}`}
            </div>
          )}

          {providers.length > 0 && (
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
              <button onClick={() => setShowSettings(false)} className="rag-settings-save-btn">
                完成
              </button>
            </div>
          )}
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
                  {aiProcessingStage ? (
                    <div className="ai-processing-stage">{aiProcessingStage}</div>
                  ) : (
                    <><span className="dot"></span><span className="dot"></span><span className="dot"></span></>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rag-chat-input-area">
            {/* 当前模型切换：多模型时无需进设置面板即可快速切换 */}
{providers.length > 0 && (
              <div className="rag-current-model">
                <select
                  value={selectedProviderId}
                  onChange={(e) => handleSelectProvider(e.target.value)}
                  className="rag-current-model-select"
                  title="切换当前使用的模型"
                >
                  {providers.map(p => (
                    <option key={p.internalId} value={p.internalId}>
                      {p.name} · {p.modelId}
                    </option>
                  ))}
                </select>
                <button
                  className="rag-current-model-config"
                  onClick={() => setShowSettings(true)}
                  title="配置模型"
                >
                  配置
                </button>
              </div>
            )}
            {/* 生成通道切换：截图/从零生成走 HTML 通道（保真度高），局部修改走组件通道（省 token） */}
            <div className="rag-mode-switch" role="group" aria-label="生成通道">
              {[
                { key: 'auto', label: '自动', hint: '有截图走 HTML，无截图走组件' },
                { key: 'html', label: 'HTML', hint: '模型输出 HTML，坐标由浏览器计算，保真度最高' },
                { key: 'shapes', label: '组件', hint: '模型直吐组件 JSON，适合精确改单个组件' },
              ].map(m => (
                <button
                  key={m.key}
                  className={`rag-mode-btn ${generateMode === m.key ? 'active' : ''}`}
                  onClick={() => setGenerateMode(m.key)}
                  title={m.hint}
                >
                  {m.label}
                </button>
              ))}
            </div>
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
placeholder={
     providers.length === 0
       ? '请先点击右上角齿轮配置 AI 模型...'
       : `发送消息给 ${providers.find(p => p.internalId === selectedProviderId)?.name}...`
   }
 rows={3}
 disabled={isLoading}
              />
              <button
onClick={handleSend}
    disabled={(!input.trim() && !selectedImage && !selectedVideo) || isLoading || providers.length === 0}
 className="rag-send-btn"
              >
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

