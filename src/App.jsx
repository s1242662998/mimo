import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ScreenshotImporter from './components/ScreenshotImporter';
import ChatWindow from './rag/ChatWindow';
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
  const [variables, setVariables] = useState({}); // 全局状态机
  const [chatContextShapes, setChatContextShapes] = useState([]); // 被添加到对话的组件

  // 当进入或退出演示模式时，重置全局状态
  useEffect(() => { 
    setVariables({});
  }, [isPreviewMode]);

  // 撤销/重做历史
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 剪贴板
  const clipboardRef = useRef([]);

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
      } catch (e) {
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
    const newShape = {
      id: `${component.id}-${++shapeIdCounter}`,
      type: component.type,
      x: Math.max(0, x - 50),
      y: Math.max(0, y - 20),
      props: { ...component.props },
      rotation: 0,
      visible: true,
      locked: false,
    };
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
      id: `${shape.id.split('-')[0]}-${++shapeIdCounter}`,
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
      id: `${child.id.split('-')[0]}-${++shapeIdCounter}`,
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
      }

      return updatedShape;
    }));
  }, []);

  // 处理 AI 发出的精准修改指令
  const handleAiAction = useCallback((action) => {
    const { type, targetIds, updates, newShape, batchUpdates, elements } = action;

    // 辅助函数：将 AI 格式的形状转换为 Konva 需要的格式
    const convertAiShape = (el, index = 0) => {
      const { type: jsonType, x, y, visible, visibleIf, hoverProps, interactions, ...restProps } = el;
      
      const typeMap = {
        text: 'text',
        button: 'rect',
        input: 'rect',
        rectangle: 'rect',
        circle: 'circle',
        image: 'image',
      };
      const elType = typeMap[jsonType] || jsonType || 'rect';
      
      const props = { ...restProps };
      if (jsonType === 'input' || jsonType === 'button' || jsonType === 'image' || jsonType === 'rectangle') {
        if (props.stroke && props.strokeWidth === undefined) {
          props.strokeWidth = 1;
        }
      }
      if (jsonType === 'text') {
         props.fontFamily = props.fontFamily || 'Inter';
      }
      
      return {
        id: el.id || `${jsonType}-${shapeIdCounter++}`,
        type: elType,
        x: x || 0,
        y: y || 0,
        visible: visible !== false, // 默认显示
        visibleIf: visibleIf || null,
        hoverProps: hoverProps || {},
        interactions: interactions || [],
        props: props
      };
    };

    setShapes(prevShapes => {
      let nextShapes = [...prevShapes];

      if (type === 'replace_all') {
        if (!elements || !Array.isArray(elements)) {
          console.error('replace_all requires elements array');
          return nextShapes;
        }
        // 直接根据截图生成的元素替换整个画布
        nextShapes = elements.map((el, index) => convertAiShape(el, index));
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
            let updatedShape = { ...shape };
            const up = specificUpdate.updates;
            
            if (up.fill) updatedShape.props.fill = up.fill;
            if (up.stroke) updatedShape.props.stroke = up.stroke;
            if (up.text) updatedShape.props.text = up.text;
            if (up.x !== undefined) updatedShape.x = up.x;
            if (up.y !== undefined) updatedShape.y = up.y;
            
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
          nextShapes.push(...addedShapes);
        } else if (newShape) {
          nextShapes.push(convertAiShape(newShape));
        }
      }

      return nextShapes;
    });

    saveToHistory();
  }, [saveToHistory, selectedId]);

  return (
    <div className="app-container" onKeyDown={handleKeyDown} tabIndex={0}>
      <ComponentPanel
        shapes={shapes}
        selectedId={selectedId}
        selectedIds={selectedIds}
        onSelect={setSelectedId}
        onSelectMultiple={setSelectedIds}
        onReorder={handleReorder}
      />
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
        />
        <Canvas
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
          isPreviewMode={isPreviewMode}
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
        <ScreenshotImporter
          onClose={() => setShowImporter(false)}
          onImport={handleImport}
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
