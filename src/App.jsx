import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ScreenshotImporter from './components/ScreenshotImporter';
import './App.css';

let shapeIdCounter = 0;
const MAX_HISTORY = 50;

function App() {
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImporter, setShowImporter] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

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
      newHistory.push(JSON.parse(JSON.stringify(newShapes)));
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
    const newShapes = shapes.map((s) => (s.id === updatedShape.id ? updatedShape : s));
    setShapes(newShapes);
    saveToHistory(newShapes);
  }, [shapes, saveToHistory]);

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

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      handleDelete();
    }
  }, [handleDelete]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
          canUndo={canUndo}
          canRedo={canRedo}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
          hasSelection={!!selectedId || selectedIds.length > 0}
          onAlign={handleAlign}
          multiSelected={selectedIds.length > 1}
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
        />
      </main>
      <PropertiesPanel
        selectedShape={selectedShape}
        onUpdate={handleUpdateShapeWithHistory}
      />

      {showImporter && (
        <ScreenshotImporter
          onClose={() => setShowImporter(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

export default App;
