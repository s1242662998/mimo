import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { exportToPNG, exportProject, importProject } from './utils/exportUtils';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import JsonImporter from './components/JsonImporter';
import ChatWindow from './rag/ChatWindow';
import PagePanel from './components/PagePanel';
import './App.css';

let shapeIdCounter = 0;
const MAX_HISTORY = 50;

function App() {
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showRagChat, setShowRagChat] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [variables, setVariables] = useState({}); // 全局状态机
  const [chatContextShapes, setChatContextShapes] = useState([]); // 被添加到对话的组件

  // 页面管理
  const [pages, setPages] = useState([{ id: 'page-1', name: '页面 1', shapes: [] }]);
  const [currentPageId, setCurrentPageId] = useState('page-1');

  // 当进入或退出演示模式时，重置全局状态并清除动画
  useEffect(() => {
    setVariables({});
    Object.values(animationIntervals.current).forEach(v => clearInterval(v.intervalId));
    animationIntervals.current = {};
  }, [isPreviewMode]);

  // 撤销/重做历史
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 剪贴板
  const clipboardRef = useRef([]);
  const canvasRef = useRef(null);
  const animationIntervals = useRef({}); // { [targetId]: { intervalId, delta } }
  const pendingTimeouts = useRef({}); // { [sourceId]: [timeoutId, ...] }
  const handleExecuteInteractionRef = useRef(null);

  // 清除指定 source 上所有待执行的延迟交互
  const clearPendingForShape = useCallback((sourceId) => {
    const timeouts = pendingTimeouts.current[sourceId];
    if (timeouts) {
      timeouts.forEach(clearTimeout);
      delete pendingTimeouts.current[sourceId];
    }
  }, []);

  // 注册一个待清除的 timeout
  const registerTimeout = useCallback((sourceId, timeoutId) => {
    if (!pendingTimeouts.current[sourceId]) {
      pendingTimeouts.current[sourceId] = [];
    }
    pendingTimeouts.current[sourceId].push(timeoutId);
  }, []);

  // 同步当前画布数据到页面列表
  useEffect(() => {
    setPages(prevPages => prevPages.map(p => 
      p.id === currentPageId ? { ...p, shapes } : p
    ));
  }, [shapes, currentPageId]);

  const handleSwitchPage = useCallback((pageId) => {
    if (pageId === currentPageId) return;
    const targetPage = pages.find(p => p.id === pageId);
    if (targetPage) {
      setShapes(targetPage.shapes || []);
      setCurrentPageId(pageId);
      setSelectedId(null);
      setSelectedIds([]);
      setHistory([targetPage.shapes || []]);
      setHistoryIndex(0);
    }
  }, [currentPageId, pages]);

  const handleCreatePage = useCallback(() => {
    setPages(prev => {
      const newPageId = `page-${Date.now()}`;
      const newPage = { id: newPageId, name: `页面 ${prev.length + 1}`, shapes: [] };
      const nextPages = [...prev, newPage];
      
      setShapes([]);
      setCurrentPageId(newPageId);
      setSelectedId(null);
      setSelectedIds([]);
      setHistory([[]]);
      setHistoryIndex(0);
      
      return nextPages;
    });
  }, []);

  const handleDeletePage = useCallback((pageId) => {
    setPages(prev => {
      if (prev.length <= 1) {
        alert('至少保留一个页面');
        return prev;
      }
      const newPages = prev.filter(p => p.id !== pageId);
      
      if (currentPageId === pageId) {
        const targetPage = newPages[0];
        setShapes(targetPage.shapes || []);
        setCurrentPageId(targetPage.id);
        setSelectedId(null);
        setSelectedIds([]);
        setHistory([targetPage.shapes || []]);
        setHistoryIndex(0);
      }
      return newPages;
    });
  }, [currentPageId]);

  const handleRenamePage = useCallback((pageId, newName) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, name: newName } : p));
  }, []);

  const handleDuplicatePage = useCallback((pageId) => {
    setPages(prev => {
      const sourcePage = prev.find(p => p.id === pageId);
      if (!sourcePage) return prev;
      
      const newPageId = `page-${Date.now()}`;
      const newShapes = JSON.parse(JSON.stringify(sourcePage.shapes));
      const newPage = { 
        id: newPageId, 
        name: `${sourcePage.name} 副本`, 
        shapes: newShapes 
      };
      
      const index = prev.findIndex(p => p.id === pageId);
      const newPages = [...prev];
      newPages.splice(index + 1, 0, newPage);
      
      setShapes(newShapes);
      setCurrentPageId(newPageId);
      setSelectedId(null);
      setSelectedIds([]);
      setHistory([newShapes]);
      setHistoryIndex(0);
      
      return newPages;
    });
  }, []);

  const selectedShape = useMemo(() => {
    return shapes.find((s) => s.id === selectedId) || null;
  }, [shapes, selectedId]);

  // 监听图层面板的visibility和lock事件
  useEffect(() => {
    const handleToggleVisibility = (e) => {
      const { id } = e.detail;
      setShapes(prev =>
        prev.map(s =>
          s.id === id ? { ...s, visible: s.visible === false ? true : false } : s
        )
      );
    };

    const handleToggleLock = (e) => {
      const { id } = e.detail;
      setShapes(prev =>
        prev.map(s =>
          s.id === id ? { ...s, locked: s.locked === true ? false : true } : s
        )
      );
    };

    window.addEventListener('toggleVisibility', handleToggleVisibility);
    window.addEventListener('toggleLock', handleToggleLock);

    return () => {
      window.removeEventListener('toggleVisibility', handleToggleVisibility);
      window.removeEventListener('toggleLock', handleToggleLock);
    };
  }, []);

  // 保存到历史记录
  const saveToHistory = useCallback((newShapes) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      try {
        newHistory.push(JSON.parse(JSON.stringify(newShapes || [])));
      } catch {
        newHistory.push([]);
      }
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [historyIndex, history]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [historyIndex, history]);

  const handleDrop = useCallback((component, x, y) => {
    // 检查是否拖拽到动态面板内
    const targetPanel = shapes.find(shape => {
      if (shape.type !== 'dynamicPanel') return false;
      const panelX = shape.x;
      const panelY = shape.y;
      const panelWidth = shape.props.width || 300;
      const panelHeight = shape.props.height || 200;
      return x >= panelX && x <= panelX + panelWidth && 
             y >= panelY && y <= panelY + panelHeight;
    });

    // 如果拖拽到动态面板内，添加为子组件
    if (targetPanel && component.id !== 'dynamicPanel' && component.type !== 'dynamicPanel') {
      const childId = `${component.id}-${++shapeIdCounter}`;
      const newChild = {
        id: childId,
        type: component.type,
        x: x - targetPanel.x,
        y: y - targetPanel.y,
        props: { ...component.props },
      };
      
      const newShapes = shapes.map(shape => {
        if (shape.id !== targetPanel.id) return shape;
        
        const newStates = (shape.states || []).map(state => {
          if (state.id !== shape.activeStateId) return state;
          return {
            ...state,
            children: [...(state.children || []), newChild],
          };
        });
        
        return { ...shape, states: newStates };
      });
      
      setShapes(newShapes);
      setSelectedId(targetPanel.id);
      setSelectedIds([targetPanel.id]);
      saveToHistory(newShapes);
      return;
    }

    // 正常添加顶层组件
    const newShape = {
      id: `${component.id}-${++shapeIdCounter}`,
      type: component.type,
      x: x - 50,
      y: y - 20,
      props: { ...component.props },
      rotation: 0,
      visible: true,
      locked: false,
    };
    
    // 动态面板初始化
    if (component.id === 'dynamicPanel' || component.type === 'dynamicPanel') {
      newShape.states = [
        { id: `state-${Date.now()}-1`, name: '状态 1', children: [] },
        { id: `state-${Date.now()}-2`, name: '状态 2', children: [] },
      ];
      newShape.activeStateId = newShape.states[0].id;
    }
    
    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    setSelectedId(newShape.id);
    setSelectedIds([newShape.id]);
    saveToHistory(newShapes);
  }, [shapes, saveToHistory]);

  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      const newShapes = shapes.filter((s) => !selectedIds.includes(s.id));
      setShapes(newShapes);
      setSelectedId(null);
      setSelectedIds([]);
      saveToHistory(newShapes);
    } else if (selectedId) {
      const newShapes = shapes.filter((s) => s.id !== selectedId);
      setShapes(newShapes);
      setSelectedId(null);
      saveToHistory(newShapes);
    }
  }, [selectedId, selectedIds, shapes, saveToHistory]);

  const handleClear = useCallback(() => {
    if (shapes.length === 0) return;
    if (confirm('确定要清空画布吗？')) {
      setShapes([]);
      setSelectedId(null);
      setSelectedIds([]);
      saveToHistory([]);
    }
  }, [shapes.length, saveToHistory]);

  const handleBringForward = useCallback(() => {
    if (!selectedId) return;
    const newShapes = [...shapes];
    const index = newShapes.findIndex((s) => s.id === selectedId);
    if (index < newShapes.length - 1) {
      [newShapes[index], newShapes[index + 1]] = [newShapes[index + 1], newShapes[index]];
      setShapes(newShapes);
      saveToHistory(newShapes);
    }
  }, [selectedId, shapes, saveToHistory]);

  const handleSendBackward = useCallback(() => {
    if (!selectedId) return;
    const newShapes = [...shapes];
    const index = newShapes.findIndex((s) => s.id === selectedId);
    if (index > 0) {
      [newShapes[index], newShapes[index - 1]] = [newShapes[index - 1], newShapes[index]];
      setShapes(newShapes);
      saveToHistory(newShapes);
    }
  }, [selectedId, shapes, saveToHistory]);

  const handleBringToFront = useCallback(() => {
    if (!selectedId) return;
    const newShapes = [...shapes];
    const index = newShapes.findIndex((s) => s.id === selectedId);
    if (index < newShapes.length - 1) {
      const [item] = newShapes.splice(index, 1);
      newShapes.push(item);
      setShapes(newShapes);
      saveToHistory(newShapes);
    }
  }, [selectedId, shapes, saveToHistory]);

  const handleSendToBack = useCallback(() => {
    if (!selectedId) return;
    const newShapes = [...shapes];
    const index = newShapes.findIndex((s) => s.id === selectedId);
    if (index > 0) {
      const [item] = newShapes.splice(index, 1);
      newShapes.unshift(item);
      setShapes(newShapes);
      saveToHistory(newShapes);
    }
  }, [selectedId, shapes, saveToHistory]);

  const handleReorder = useCallback((sourceIndex, targetIndex) => {
    const newShapes = [...shapes];
    const [removed] = newShapes.splice(sourceIndex, 1);
    newShapes.splice(targetIndex, 0, removed);
    setShapes(newShapes);
    saveToHistory(newShapes);
  }, [shapes, saveToHistory]);

  const handleUpdateShape = useCallback((updatedShape) => {
    const newShapes = shapes.map((s) => (s.id === updatedShape.id ? updatedShape : s));
    setShapes(newShapes);
  }, [shapes]);

  const handleUpdateShapeWithHistory = useCallback((updatedShape) => {
    // 检查 ID 是否有变化，如果有变化且新 ID 已存在，则拒绝更新
    if (selectedId && updatedShape.id !== selectedId) {
      if (shapes.some(s => s.id === updatedShape.id)) {
        alert('该组件 ID 已存在，请使用其他 ID。');
        // 需要抛出错误，让 PropertiesPanel 捕获并回滚 UI
        throw new Error('ID_EXISTS');
      }
      
      // 更新 selectedId 为新 ID
      setSelectedId(updatedShape.id);
      setSelectedIds(prev => prev.map(id => id === selectedId ? updatedShape.id : id));
    }

    const newShapes = shapes.map((s) => (s.id === selectedId ? updatedShape : s));
    setShapes(newShapes);
    saveToHistory(newShapes);
  }, [shapes, saveToHistory, selectedId]);

  const handleImport = useCallback((importedShapes) => {
    const newShapes = [...shapes, ...importedShapes];
    setShapes(newShapes);
    if (importedShapes.length > 0) {
      setSelectedId(importedShapes[importedShapes.length - 1].id);
    }
    saveToHistory(newShapes);
  }, [shapes, saveToHistory]);

  // 导入交互 JSON
  const handleImportInteractions = useCallback((interactionData) => {
    setShapes(prevShapes => {
      const newShapes = prevShapes.map(shape => ({ ...shape }));
      interactionData.forEach(item => {
        const shape = newShapes.find(s => s.id === item.sourceId);
        if (shape) {
          shape.interactions = [...(shape.interactions || []), ...item.interactions];
        }
      });
      saveToHistory(newShapes);
      return newShapes;
    });
  }, [saveToHistory]);

  // 复制
  const handleCopy = useCallback(() => {
    const idsToCopy = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (idsToCopy.length === 0) return;

    clipboardRef.current = shapes
      .filter(s => idsToCopy.includes(s.id))
      .map(s => JSON.parse(JSON.stringify(s)));
  }, [selectedId, selectedIds, shapes]);

  // 粘贴
  const handlePaste = useCallback(() => {
    if (clipboardRef.current.length === 0) return;

    const offset = 20;
    const newShapes = clipboardRef.current.map((shape, index) => ({
      ...shape,
      id: `${shape.componentType || shape.id.split('-')[0]}-${++shapeIdCounter}`,
      x: shape.x + offset * (index + 1),
      y: shape.y + offset * (index + 1),
    }));

    const allShapes = [...shapes, ...newShapes];
    setShapes(allShapes);
    setSelectedId(newShapes[newShapes.length - 1].id);
    setSelectedIds(newShapes.map(s => s.id));
    saveToHistory(allShapes);
  }, [shapes, saveToHistory]);

  // 复制选中元素
  const handleDuplicate = useCallback(() => {
    handleCopy();
    handlePaste();
  }, [handleCopy, handlePaste]);

  // 对齐功能
  const handleAlign = useCallback((alignment) => {
    const idsToAlign = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (idsToAlign.length < 2) return;

    const selectedShapes = shapes.filter(s => idsToAlign.includes(s.id));
    let newShapes = [...shapes];

    switch (alignment) {
      case 'left': {
        const minX = Math.min(...selectedShapes.map(s => s.x));
        newShapes = newShapes.map(s =>
          idsToAlign.includes(s.id) ? { ...s, x: minX } : s
        );
        break;
      }
      case 'right': {
        const maxRight = Math.max(...selectedShapes.map(s => {
          const width = s.props.width || s.props.radius * 2 || 0;
          return s.x + width;
        }));
        newShapes = newShapes.map(s => {
          if (!idsToAlign.includes(s.id)) return s;
          const width = s.props.width || s.props.radius * 2 || 0;
          return { ...s, x: maxRight - width };
        });
        break;
      }
      case 'top': {
        const minY = Math.min(...selectedShapes.map(s => s.y));
        newShapes = newShapes.map(s =>
          idsToAlign.includes(s.id) ? { ...s, y: minY } : s
        );
        break;
      }
      case 'bottom': {
        const maxBottom = Math.max(...selectedShapes.map(s => {
          const height = s.props.height || s.props.radius * 2 || 0;
          return s.y + height;
        }));
        newShapes = newShapes.map(s => {
          if (!idsToAlign.includes(s.id)) return s;
          const height = s.props.height || s.props.radius * 2 || 0;
          return { ...s, y: maxBottom - height };
        });
        break;
      }
      case 'centerX': {
        const avgX = selectedShapes.reduce((sum, s) => {
          const width = s.props.width || s.props.radius * 2 || 0;
          return sum + s.x + width / 2;
        }, 0) / selectedShapes.length;
        newShapes = newShapes.map(s => {
          if (!idsToAlign.includes(s.id)) return s;
          const width = s.props.width || s.props.radius * 2 || 0;
          return { ...s, x: avgX - width / 2 };
        });
        break;
      }
      case 'centerY': {
        const avgY = selectedShapes.reduce((sum, s) => {
          const height = s.props.height || s.props.radius * 2 || 0;
          return sum + s.y + height / 2;
        }, 0) / selectedShapes.length;
        newShapes = newShapes.map(s => {
          if (!idsToAlign.includes(s.id)) return s;
          const height = s.props.height || s.props.radius * 2 || 0;
          return { ...s, y: avgY - height / 2 };
        });
        break;
      }
    }

    setShapes(newShapes);
    saveToHistory(newShapes);
  }, [selectedId, selectedIds, shapes, saveToHistory]);

  // 成组功能
  const handleGroup = useCallback(() => {
    if (selectedIds.length < 2) return;

    const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));

    // 计算组的边界框（圆形的x,y是圆心坐标，矩形的x,y是左上角坐标）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedShapes.forEach(shape => {
      const props = shape.props || {};
      if (shape.type === 'circle') {
        // 圆形：x,y 是圆心坐标
        const radius = props.radius || 40;
        minX = Math.min(minX, shape.x - radius);
        minY = Math.min(minY, shape.y - radius);
        maxX = Math.max(maxX, shape.x + radius);
        maxY = Math.max(maxY, shape.y + radius);
      } else if (shape.type === 'text') {
        // 文本：x,y 是左上角坐标，使用 width 和 fontSize * lineHeight 估算高度
        const width = props.width || 150;
        const fontSize = props.fontSize || 16;
        const lineHeight = props.lineHeight || 1.4;
        const height = fontSize * lineHeight;
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + width);
        maxY = Math.max(maxY, shape.y + height);
      } else {
        // 其他形状（矩形、按钮、输入框等）：x,y 是左上角坐标
        const width = props.width || 100;
        const height = props.height || 100;
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + width);
        maxY = Math.max(maxY, shape.y + height);
      }
    });

    // 创建组，子组件坐标转换为相对于组的坐标
    const group = {
      id: `group-${++shapeIdCounter}`,
      type: 'group',
      x: minX,
      y: minY,
      props: {
        width: maxX - minX,
        height: maxY - minY,
      },
      rotation: 0,
      visible: true,
      locked: false,
      children: selectedShapes.map(s => ({
        ...s,
        // 圆形存储圆心相对于组左上角的偏移量，矩形存储左上角的偏移量
        x: s.x - minX,
        y: s.y - minY,
      })),
    };

    // 移除被成组的组件，添加组
    const newShapes = [...shapes.filter(s => !selectedIds.includes(s.id)), group];
    setShapes(newShapes);
    setSelectedId(group.id);
    setSelectedIds([group.id]);
    saveToHistory(newShapes);
  }, [selectedIds, shapes, saveToHistory]);

  // 解组功能
  const handleUngroup = useCallback(() => {
    if (!selectedId) return;

    const selectedShape = shapes.find(s => s.id === selectedId);
    if (!selectedShape || selectedShape.type !== 'group') return;

    // 将子组件坐标转换回绝对坐标
    const ungroupedShapes = selectedShape.children.map(child => ({
      ...child,
      x: selectedShape.x + child.x,
      y: selectedShape.y + child.y,
      id: `${child.componentType || child.id.split('-')[0]}-${++shapeIdCounter}`,
    }));

    // 移除组，添加子组件
    const newShapes = [...shapes.filter(s => s.id !== selectedId), ...ungroupedShapes];
    setShapes(newShapes);
    setSelectedId(ungroupedShapes[0]?.id || null);
    setSelectedIds(ungroupedShapes.map(s => s.id));
    saveToHistory(newShapes);
  }, [selectedId, shapes, saveToHistory]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      handleDelete();
    }
    // Ctrl+G 成组
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      handleGroup();
    }
    // Ctrl+Shift+G 解组
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) {
      e.preventDefault();
      handleUngroup();
    }
  }, [handleDelete, handleGroup, handleUngroup]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedShape?.type === 'group';

  // 处理交互动作
  const handleExecuteInteraction = useCallback((interaction) => {
    if (interaction.action === 'setVariable' && interaction.payload?.key) {
      setVariables(prev => ({ ...prev, [interaction.payload.key]: interaction.payload.value }));
      return; // 全局变量修改不需要直接操作 shapes
    }

    // 动画类动作：在 setShapes 之外处理（需要副作用）
    if (interaction.action === 'startAnimation' && interaction.targetId) {
      const { targetId, payload } = interaction;
      const prop = payload?.prop || 'value';
      const rawDelta = Number(payload?.delta);
      const delta = Number.isNaN(rawDelta) ? 1 : rawDelta;
      const rawInterval = Number(payload?.interval);
      const intervalMs = Number.isNaN(rawInterval) ? 100 : Math.max(10, rawInterval);

      // from/to 为新的直观参数，min/max 保留兼容
      const rawFrom = Number(payload?.from);
      const rawTo = Number(payload?.to);
      const hasFromTo = !Number.isNaN(rawFrom) && !Number.isNaN(rawTo);
      const from = hasFromTo ? rawFrom : (prop === 'opacity' ? 1 : 0);
      const to = hasFromTo ? rawTo : (prop === 'opacity' ? 0 : 100);
      const min = Math.min(from, to);
      const max = Math.max(from, to);

      const loop = payload?.loop === true || payload?.loop === 'true';

      // 如果设置了总时长，自动计算 delta（从 from 到 to 的方向）
      const rawDuration = Number(payload?.duration);
      const duration = Number.isNaN(rawDuration) ? 0 : rawDuration;
      let effectiveDelta = delta;
      if (duration > 0 && intervalMs > 0) {
        const totalTicks = duration / intervalMs;
        const range = to - from;
        if (totalTicks > 0 && range !== 0) {
          effectiveDelta = range / totalTicks;
        }
      } else if (hasFromTo && delta > 0) {
        // 手动模式：如果指定了 from/to，delta 方向应匹配
        effectiveDelta = to >= from ? Math.abs(delta) : -Math.abs(delta);
      }

      // 先清除该 target 已有的动画
      if (animationIntervals.current[targetId]) {
        clearInterval(animationIntervals.current[targetId].intervalId);
      }

      // 先将属性设置为起始值
      setShapes(prev => prev.map(s => {
        if (s.id !== targetId) return s;
        return { ...s, props: { ...s.props, [prop]: prop === 'opacity' ? Math.round(from * 100) / 100 : Math.round(from) } };
      }));

      // effectiveDelta 为 0 时不启动动画
      if (effectiveDelta === 0) return;

      let currentDelta = effectiveDelta; // 用于 loop 模式下的方向翻转
      let active = true; // 标记动画是否仍在运行

      const intervalId = setInterval(() => {
        if (!active) return;

        setShapes(prev => prev.map(s => {
          if (s.id !== targetId) return s;

          const rawVal = Number(s.props[prop]);
          const currentVal = Number.isNaN(rawVal) ? from : rawVal;
          let newVal = currentVal + currentDelta;

          // 边界处理
          if (newVal >= max) {
            if (loop) {
              newVal = max;
              currentDelta = -Math.abs(effectiveDelta);
            } else {
              newVal = max;
              active = false;
              clearInterval(intervalId);
              delete animationIntervals.current[targetId];
              if (interaction.onComplete) {
                setTimeout(() => handleExecuteInteractionRef.current?.(interaction.onComplete), 0);
              }
            }
          } else if (newVal <= min) {
            if (loop) {
              newVal = min;
              currentDelta = Math.abs(effectiveDelta);
            } else {
              newVal = min;
              active = false;
              clearInterval(intervalId);
              delete animationIntervals.current[targetId];
              if (interaction.onComplete) {
                setTimeout(() => handleExecuteInteractionRef.current?.(interaction.onComplete), 0);
              }
            }
          }

          // 对 opacity 精度特殊处理
          if (prop === 'opacity') {
            newVal = Math.round(newVal * 100) / 100;
          } else {
            newVal = Math.round(newVal);
          }

          return { ...s, props: { ...s.props, [prop]: newVal } };
        }));
      }, intervalMs);

      animationIntervals.current[targetId] = { intervalId, delta: currentDelta };
      return;
    }

    if (interaction.action === 'stopAnimation' && interaction.targetId) {
      const { targetId } = interaction;
      if (animationIntervals.current[targetId]) {
        clearInterval(animationIntervals.current[targetId].intervalId);
        delete animationIntervals.current[targetId];
      }
      return;
    }

    if (!interaction.targetId) return;

    setShapes(prev => prev.map(s => {
      if (s.id !== interaction.targetId) return s;

      let updatedShape = { ...s };

      if (interaction.action === 'toggleVisibility') {
        updatedShape.visible = s.visible === false ? true : false;
      } else if (interaction.action === 'setProps' && interaction.payload) {
        // 修改属性
        updatedShape.props = { ...s.props };
        Object.keys(interaction.payload).forEach(key => {
          if (key === 'x' || key === 'y' || key === 'rotation') {
            updatedShape[key] = interaction.payload[key];
          } else {
            updatedShape.props[key] = interaction.payload[key];
          }
        });
      } else if (interaction.action === 'switchState' && interaction.payload?.stateId) {
        // 动态面板：切换到指定状态
        if (s.type === 'dynamicPanel' && s.states) {
          updatedShape.activeStateId = interaction.payload.stateId;
        }
      } else if (interaction.action === 'nextState') {
        // 动态面板：切换到下一个状态
        if (s.type === 'dynamicPanel' && s.states && s.states.length > 0) {
          const currentIndex = s.states.findIndex(st => st.id === s.activeStateId);
          const nextIndex = (currentIndex + 1) % s.states.length;
          updatedShape.activeStateId = s.states[nextIndex].id;
        }
      } else if (interaction.action === 'prevState') {
        // 动态面板：切换到上一个状态
        if (s.type === 'dynamicPanel' && s.states && s.states.length > 0) {
          const currentIndex = s.states.findIndex(st => st.id === s.activeStateId);
          const prevIndex = (currentIndex - 1 + s.states.length) % s.states.length;
          updatedShape.activeStateId = s.states[prevIndex].id;
        }
      } else if (interaction.action === 'setChecked') {
        // 设置开关/复选框/单选框的选中状态
        const checked = interaction.payload?.checked;
        if (checked !== undefined) {
          updatedShape.props = { ...s.props, checked: Boolean(checked) };
        }
      } else if (interaction.action === 'toggleChecked') {
        // 切换开关/复选框/单选框的选中状态
        const currentChecked = s.props.checked === true || s.props.checked === 'true';
        updatedShape.props = { ...s.props, checked: !currentChecked };
      } else if (interaction.action === 'setValue') {
        // 设置滑块/进度条的值
        const value = interaction.payload?.value;
        if (value !== undefined) {
          updatedShape.props = { ...s.props, value: Math.max(0, Math.min(100, Number(value))) };
        }
      } else if (interaction.action === 'incrementValue') {
        // 增减滑块/进度条的值
        const delta = interaction.payload?.delta ?? 1;
        const currentValue = Number(s.props.value) || 0;
        updatedShape.props = { ...s.props, value: Math.max(0, Math.min(100, currentValue + Number(delta))) };
      }

      return updatedShape;
    }));
  }, []);

  // 保持 ref 引用最新，以便 setInterval 中的 onComplete 回调可以递归调用
  handleExecuteInteractionRef.current = handleExecuteInteraction;

  // 处理 AI 发出的精准修改指令
  const handleAiAction = useCallback((action) => {
    const { type, targetIds, updates, newShape, batchUpdates, elements } = action;

    // 辅助函数：将 AI 格式的形状转换为 Konva 需要的格式
    const convertAiShape = (el) => {
      const { type: jsonType, x, y, visible, visibleIf, hoverProps, interactions, states, activeStateId, animation, autoPlay, ...restProps } = el;
      
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
      };
      const elType = typeMap[jsonType] || jsonType || 'rect';
      
      // 如果 el.props 存在（AI JSON 结构），需要正确合并到顶层
      // AI JSON: { type: 'icon', width: 20, height: 20, props: { iconPath: 'search' } }
      // 正确结构: shape.props = { width: 20, height: 20, iconPath: 'search' }
      const { props: nestedProps, ...rest } = restProps;
      const props = nestedProps && typeof nestedProps === 'object'
        ? { ...nestedProps, ...rest }
        : rest;
      if (['input', 'button', 'image', 'rectangle', 'checkbox', 'avatar'].includes(jsonType)) {
        if (props.stroke && props.strokeWidth === undefined) {
          props.strokeWidth = 1;
        }
      }
      if (['text', 'badge', 'avatar'].includes(jsonType)) {
         props.fontFamily = props.fontFamily || 'Inter';
      }
      // 文本组件：AI未指定宽度时，根据文本内容和字号自动估算宽度，避免文字被截断换行
      if (jsonType === 'text' && !el.width && props.text) {
        const fs = Number(props.fontSize) || 16;
        const fw = props.fontWeight === '700' || props.fontWeight === 'bold' ? 1.15 : 1;
        const estimatedWidth = Math.ceil(props.text.length * fs * 0.6 * fw) + 20;
        props.width = Math.max(150, estimatedWidth);
      }
      
      const result = {
        id: el.id || `${jsonType}-${shapeIdCounter++}`,
        type: elType,
        componentType: jsonType, // 保留原始AI类型，用于Canvas渲染分发
        x: x || 0,
        y: y || 0,
        visible: visible !== false, // 默认显示
        visibleIf: visibleIf || null,
        hoverProps: hoverProps || {},
        interactions: interactions || [],
        props: props
      };
      
      // 动态面板特有属性
      if (jsonType === 'dynamicPanel') {
        result.states = states || [];
        result.activeStateId = activeStateId || (states && states[0]?.id);
        result.animation = animation || { type: 'none', duration: 300, direction: 'horizontal' };
        result.autoPlay = autoPlay || { enabled: false, interval: 3000, loop: true };
      }
      
      return result;
    };

    setShapes(prevShapes => {
      let nextShapes = [...prevShapes];

      if (type === 'replace_all') {
        if (!elements || !Array.isArray(elements)) {
          console.error('replace_all requires elements array. Received args:', args);
          return nextShapes;
        }
        // 直接根据截图生成的元素替换整个画布
        console.log('AI replace_all elements:', elements.map(el => ({ id: el.id, type: el.type })));
        nextShapes = elements.map((el, index) => convertAiShape(el, index));
        console.log('Converted shapes:', nextShapes.map(s => ({ id: s.id, type: s.type, propsKeys: Object.keys(s.props) })));
        setSelectedIds([]);
        setSelectedId(null);
      } else if (type === 'update') {
        // 更新指定 ID 的组件
        nextShapes = nextShapes.map(shape => {
          if ((targetIds && targetIds.includes(shape.id)) || (targetIds && targetIds.includes('all'))) {
            let updatedShape = { ...shape };
            
            if (updates) {
              // 基础属性覆盖 (注意需要更新到 shape.props 里面)
              if (updates.fill) updatedShape.props.fill = updates.fill;
              if (updates.stroke) updatedShape.props.stroke = updates.stroke;
              if (updates.text) updatedShape.props.text = updates.text;
              
              // 坐标是在 shape 顶层
              if (updates.x !== undefined) updatedShape.x = updates.x;
              if (updates.y !== undefined) updatedShape.y = updates.y;
              
              // 交互与悬浮状态处理
              if (updates.hoverProps !== undefined) updatedShape.hoverProps = { ...updatedShape.hoverProps, ...updates.hoverProps };
              if (updates.interactions !== undefined) updatedShape.interactions = updates.interactions;
              if (updates.visibleIf !== undefined) updatedShape.visibleIf = updates.visibleIf;
              
              // 缩放处理 (也是在 shape.props 里面)
              if (updates.scale) {
                if (shape.type === 'circle') {
                  updatedShape.props.radius = (updatedShape.props.radius || 40) * updates.scale;
                } else {
                  updatedShape.props.width = (updatedShape.props.width || 100) * updates.scale;
                  updatedShape.props.height = (updatedShape.props.height || 100) * updates.scale;
                }
              }
            }
            
            return updatedShape;
          }
          return shape;
        });
      } else if (type === 'batch_update' && batchUpdates) {
        // 批量精细更新（如重新布局）
        nextShapes = nextShapes.map(shape => {
          const specificUpdate = batchUpdates.find(u => u.id === shape.id);
          if (specificUpdate && specificUpdate.updates) {
            let updatedShape = { ...shape, props: { ...shape.props } };
            const up = specificUpdate.updates;

            // 深度合并 props 对象
            if (up.props) {
              updatedShape.props = { ...updatedShape.props, ...up.props };
            }

            // 处理顶层属性
            if (up.fill !== undefined) updatedShape.props.fill = up.fill;
            if (up.stroke !== undefined) updatedShape.props.stroke = up.stroke;
            if (up.text !== undefined) updatedShape.props.text = up.text;
            if (up.x !== undefined) updatedShape.x = up.x;
            if (up.y !== undefined) updatedShape.y = up.y;
            if (up.width !== undefined) updatedShape.width = up.width;
            if (up.height !== undefined) updatedShape.height = up.height;
            if (up.zIndex !== undefined) updatedShape.zIndex = up.zIndex;

            if (up.hoverProps !== undefined) updatedShape.hoverProps = { ...updatedShape.hoverProps, ...up.hoverProps };
            if (up.interactions !== undefined) updatedShape.interactions = up.interactions;
            if (up.visibleIf !== undefined) updatedShape.visibleIf = up.visibleIf;

            return updatedShape;
          }
          return shape;
        });
      } else if (type === 'delete') {
        // 删除指定 ID 的组件
        nextShapes = nextShapes.filter(shape => !targetIds.includes(shape.id));
        // 清理选中状态
        if (targetIds.includes(selectedId)) setSelectedId(null);
        setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
      } else if (type === 'add') {
        // 添加新组件 (支持批量或单个)
        if (elements && Array.isArray(elements)) {
          const addedShapes = elements.map((el, index) => convertAiShape(el, index));
          console.log('AI add elements:', addedShapes.map(s => ({ id: s.id, type: s.type })));
          nextShapes.push(...addedShapes);
        } else if (newShape) {
          const added = convertAiShape(newShape);
          console.log('AI add single:', { id: added.id, type: added.type });
          nextShapes.push(added);
        }
      }

      return nextShapes;
    });

    saveToHistory();
  }, [saveToHistory, selectedId]);

  const handleExportPNG = useCallback(() => {
    if (canvasRef.current) {
      exportToPNG(canvasRef.current.getStage(), canvasRef.current.getLayer());
    }
  }, []);

  const handleExportProject = useCallback(() => {
    exportProject(pages, variables);
  }, [pages, variables]);

  const handleImportProject = useCallback(async (file) => {
    try {
      const data = await importProject(file);
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages);
        setCurrentPageId(data.pages[0].id);
        setShapes(data.pages[0].shapes || []);
        if (data.variables) {
          setVariables(data.variables);
        }
        setHistory([data.pages[0].shapes || []]);
        setHistoryIndex(0);
        setSelectedId(null);
        setSelectedIds([]);
        alert('项目导入成功！');
      }
    } catch (err) {
      console.error(err);
      alert('导入失败：文件格式不正确或已损坏');
    }
  }, []);

  return (
    <div className="app-container" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="left-panels">
        <PagePanel
          pages={pages}
          currentPageId={currentPageId}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onSwitchPage={handleSwitchPage}
          onDuplicatePage={handleDuplicatePage}
        />
        <ComponentPanel
          shapes={shapes}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={setSelectedId}
          onSelectMultiple={setSelectedIds}
          onReorder={handleReorder}
        />
      </div>
      <main className="canvas-container">
        <Toolbar
          onDelete={handleDelete}
          onClear={handleClear}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onImport={() => setShowImporter(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDuplicate={handleDuplicate}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          canUndo={canUndo}
          canRedo={canRedo}
          canGroup={canGroup}
          canUngroup={canUngroup}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
          hasSelection={!!selectedId || selectedIds.length > 0}
          onAlign={handleAlign}
          multiSelected={selectedIds.length > 1}
          showRagChat={showRagChat}
          onToggleRagChat={() => setShowRagChat(!showRagChat)}
          isPreviewMode={isPreviewMode}
          onTogglePreviewMode={() => setIsPreviewMode(!isPreviewMode)}
          isConnectionMode={isConnectionMode}
          onToggleConnectionMode={() => setIsConnectionMode(!isConnectionMode)}
          onExportPNG={handleExportPNG}
          onExportProject={handleExportProject}
          onImportProject={handleImportProject}
        />
        <Canvas
          ref={canvasRef}
          shapes={shapes}
          setShapes={setShapes}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onDrop={handleDrop}
          onUpdateShape={handleUpdateShape}
          onSaveToHistory={saveToHistory}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onUndo={handleUndo}
          onRedo={handleRedo}
          snapToGrid={snapToGrid}
          showGuides={showGuides}
          onExecuteInteraction={handleExecuteInteraction}
          onClearPendingForShape={clearPendingForShape}
          onRegisterTimeout={registerTimeout}
          isPreviewMode={isPreviewMode}
          isConnectionMode={isConnectionMode}
          variables={variables}
          onAddToChat={(shapeIds) => {
            const ids = Array.isArray(shapeIds) ? shapeIds : [shapeIds];
            const newShapes = ids.map(id => shapes.find(s => s.id === id)).filter(Boolean);
            if (newShapes.length > 0) {
              setChatContextShapes(prev => {
                const toAdd = newShapes.filter(ns => !prev.some(ps => ps.id === ns.id));
                return [...prev, ...toAdd];
              });
              setShowRagChat(true);
            }
          }}
        />
      </main>
      <PropertiesPanel
        selectedShape={selectedShape}
        shapes={shapes}
        onUpdate={handleUpdateShapeWithHistory}
      />

      {showImporter && (
        <JsonImporter
          onClose={() => setShowImporter(false)}
          onImport={handleImport}
          onImportInteractions={handleImportInteractions}
          canvasShapes={shapes}
        />
      )}

      {showRagChat && (
        <ChatWindow 
          onClose={() => setShowRagChat(false)} 
          canvasShapes={shapes}
          onAiAction={handleAiAction}
          chatContextShapes={chatContextShapes}
          setChatContextShapes={setChatContextShapes}
        />
      )}
    </div>
  );
}

export default App;
