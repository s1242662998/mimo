import { Stage, Layer, Rect, Circle, Ellipse, Line, Arrow, Text, Path, Transformer, Group, Image as KonvaImage } from 'react-konva';
import { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './Canvas.css';

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 20;
const SNAP_THRESHOLD = 8;
const GRID_SIZE = 10;

// 计算选中形状相对于其他形状的吸附偏移和辅助线
function computeSnapGuides(selectedBounds, allShapes, excludeId) {
  const selectedCenterX = selectedBounds.x + selectedBounds.width / 2;
  const selectedCenterY = selectedBounds.y + selectedBounds.height / 2;
  const selectedRight = selectedBounds.x + selectedBounds.width;
  const selectedBottom = selectedBounds.y + selectedBounds.height;

  let bestDx = null;
  let bestDy = null;
  let bestDxAbs = SNAP_THRESHOLD;
  let bestDyAbs = SNAP_THRESHOLD;

  const verticalGuides = [];
  const horizontalGuides = [];

  // 距离标注信息
  const distanceLabels = [];

  allShapes.forEach(shape => {
    if (shape.id === excludeId) return;

    const bounds = getShapeBounds(shape);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const right = bounds.x + bounds.width;
    const bottom = bounds.y + bounds.height;

    // ===== 垂直吸附线 (X轴方向) =====
    const xChecks = [
      { selEdge: selectedBounds.x, otherEdge: bounds.x, guideX: bounds.x },
      { selEdge: selectedBounds.x, otherEdge: right, guideX: right },
      { selEdge: selectedCenterX, otherEdge: centerX, guideX: centerX },
      { selEdge: selectedRight, otherEdge: bounds.x, guideX: bounds.x },
      { selEdge: selectedRight, otherEdge: right, guideX: right },
    ];

    xChecks.forEach(({ selEdge, otherEdge, guideX }) => {
      const diff = otherEdge - selEdge;
      if (Math.abs(diff) < bestDxAbs) {
        bestDxAbs = Math.abs(diff);
        bestDx = diff;
      }
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        verticalGuides.push(guideX);
      }
    });

    // ===== 水平吸附线 (Y轴方向) =====
    const yChecks = [
      { selEdge: selectedBounds.y, otherEdge: bounds.y, guideY: bounds.y },
      { selEdge: selectedBounds.y, otherEdge: bottom, guideY: bottom },
      { selEdge: selectedCenterY, otherEdge: centerY, guideY: centerY },
      { selEdge: selectedBottom, otherEdge: bounds.y, guideY: bounds.y },
      { selEdge: selectedBottom, otherEdge: bottom, guideY: bottom },
    ];

    yChecks.forEach(({ selEdge, otherEdge, guideY }) => {
      const diff = otherEdge - selEdge;
      if (Math.abs(diff) < bestDyAbs) {
        bestDyAbs = Math.abs(diff);
        bestDy = diff;
      }
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        horizontalGuides.push(guideY);
      }
    });

    // ===== 距离标注 =====
    // 水平方向距离：只在两个形状在Y轴上有重叠时显示
    const yOverlap = !(selectedBounds.y >= bottom || selectedBottom <= bounds.y);
    if (yOverlap) {
      // 选中形状右边 → 目标左边
      const gapRight = bounds.x - selectedRight;
      if (gapRight > 0 && gapRight < 200) {
        distanceLabels.push({
          x1: selectedRight, y1: selectedCenterY,
          x2: bounds.x, y2: selectedCenterY,
          distance: Math.round(gapRight),
          orientation: 'horizontal',
        });
      }
      // 目标右边 → 选中形状左边
      const gapLeft = selectedBounds.x - right;
      if (gapLeft > 0 && gapLeft < 200) {
        distanceLabels.push({
          x1: right, y1: centerY,
          x2: selectedBounds.x, y2: centerY,
          distance: Math.round(gapLeft),
          orientation: 'horizontal',
        });
      }
    }

    // 垂直方向距离：只在两个形状在X轴上有重叠时显示
    const xOverlap = !(selectedBounds.x >= right || selectedRight <= bounds.x);
    if (xOverlap) {
      // 选中形状下边 → 目标上边
      const gapBottom = bounds.y - selectedBottom;
      if (gapBottom > 0 && gapBottom < 200) {
        distanceLabels.push({
          x1: selectedCenterX, y1: selectedBottom,
          x2: selectedCenterX, y2: bounds.y,
          distance: Math.round(gapBottom),
          orientation: 'vertical',
        });
      }
      // 目标下边 → 选中形状上边
      const gapTop = selectedBounds.y - bottom;
      if (gapTop > 0 && gapTop < 200) {
        distanceLabels.push({
          x1: centerX, y1: bottom,
          x2: centerX, y2: selectedBounds.y,
          distance: Math.round(gapTop),
          orientation: 'vertical',
        });
      }
    }
  });

  return {
    dx: bestDxAbs < SNAP_THRESHOLD ? bestDx : 0,
    dy: bestDyAbs < SNAP_THRESHOLD ? bestDy : 0,
    verticalGuides: [...new Set(verticalGuides.map(v => v.toFixed(1)))].map(Number),
    horizontalGuides: [...new Set(horizontalGuides.map(v => v.toFixed(1)))].map(Number),
    distanceLabels,
  };
}

// 对给定形状位置应用吸附，返回吸附后的 {x, y}
// enableSnap: 是否开启吸附（控制所有吸附行为）
function applySnap(shape, allShapes, enableSnap) {
  let { x, y } = shape;
  if (!enableSnap) return { x, y };

  const bounds = getShapeBounds({ ...shape, x, y });
  const otherShapes = allShapes.filter(s => s.id !== shape.id);
  const snap = computeSnapGuides(bounds, otherShapes, shape.id);

  if (snap.dx !== 0 || snap.dy !== 0) {
    // 辅助线吸附优先
    x += snap.dx;
    y += snap.dy;
  } else {
    // 没有辅助线吸附时，网格吸附
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;
  }

  return { x, y };
}

function ImageShape({ shape, activeProps, shapeRef, rotation, shapeProps, onChange, onDragEnd, allShapes, snapToGrid, showGuides }) {
  const width = activeProps.width || 120;
  const height = activeProps.height || 80;
  const centerX = shape.x + width / 2;
  const centerY = shape.y + height / 2;
  const [imageObj, setImageObj] = useState(null);

  useEffect(() => {
    if (activeProps.imageData) {
      const img = new window.Image();
      img.src = activeProps.imageData;
      img.onload = () => setImageObj(img);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageObj(null);
    }
  }, [activeProps.imageData]);

  return (
    <Group
      scaleX={activeProps.scale || 1}
      scaleY={activeProps.scale || 1}
      x={centerX}
      y={centerY}
      rotation={rotation}
      draggable
      onClick={shapeProps.onClick}
      onTap={shapeProps.onTap}
      onDragStart={shapeProps.onDragStart}
      onDragMove={(e) => {
        let shapeX = e.target.x() - width / 2;
        let shapeY = e.target.y() - height / 2;

        let snappedByGuide = false;
        if (showGuides) {
          const tempShape = { ...shape, x: shapeX, y: shapeY };
          const bounds = getShapeBounds(tempShape);
          const otherShapes = (allShapes || []).filter(s => s.id !== shape.id);
          const snap = computeSnapGuides(bounds, otherShapes, shape.id);
          if (snap.dx !== 0 || snap.dy !== 0) {
            shapeX += snap.dx;
            shapeY += snap.dy;
            snappedByGuide = true;
          }
        }

        if (snapToGrid && !snappedByGuide) {
          shapeX = Math.round(shapeX / GRID_SIZE) * GRID_SIZE;
          shapeY = Math.round(shapeY / GRID_SIZE) * GRID_SIZE;
        }

        e.target.x(shapeX + width / 2);
        e.target.y(shapeY + height / 2);
        onChange({ ...shape, x: shapeX, y: shapeY });
      }}
      onDragEnd={(e) => {
        onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
        onDragEnd?.();
      }}
      onMouseEnter={shapeProps.onMouseEnter}
      onMouseLeave={shapeProps.onMouseLeave}
    >
      <Rect
        ref={shapeRef}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={activeProps.fill}
        stroke={activeProps.stroke}
        strokeWidth={activeProps.strokeWidth}
        cornerRadius={activeProps.cornerRadius}
        opacity={activeProps.opacity}
      />
      {imageObj && (
        <KonvaImage
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          image={imageObj}
          cornerRadius={activeProps.cornerRadius}
        />
      )}
    </Group>
  );
}

function getShapeBounds(shape) {
  const { x, y, props, type } = shape;
  let width, height, boundsX, boundsY;

  if (type === 'circle') {
    const radius = props.radius || 40;
    const radiusY = props.radiusY !== undefined ? props.radiusY : radius;
    width = radius * 2;
    height = radiusY * 2;
    // Circle的x,y是圆心，需要转换为左上角
    boundsX = x - radius;
    boundsY = y - radiusY;
  } else if (type === 'line' || type === 'arrow') {
    const points = props.points || [0, 0, 100, 0];
    width = Math.abs(points[2] - points[0]) || 100;
    height = Math.abs(points[3] - points[1]) || 2;
    boundsX = x;
    boundsY = y;
  } else if (type === 'text') {
    // 文本组件的高度根据 fontSize 和 lineHeight 计算
    width = props.width || 150;
    const fontSize = props.fontSize || 16;
    const lineHeight = props.lineHeight || 1.4;
    height = fontSize * lineHeight;
    boundsX = x;
    boundsY = y;
  } else {
    width = props.width || 100;
    height = props.height || 100;
    boundsX = x;
    boundsY = y;
  }

  return { x: boundsX, y: boundsY, width, height };
}

function AlignmentGuides({ shapes, selectedId, multiSelectedIds }) {
  // 支持单选和多选的辅助线
  const targetId = selectedId || (multiSelectedIds?.length === 1 ? multiSelectedIds[0] : null);

  // 对于多选，计算包围盒作为"选中区域"
  let selectedBounds = null;
  if (multiSelectedIds && multiSelectedIds.length >= 2) {
    const selectedShapes = shapes.filter(s => multiSelectedIds.includes(s.id));
    if (selectedShapes.length >= 2) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedShapes.forEach(s => {
        const b = getShapeBounds(s);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      });
      selectedBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  } else if (targetId) {
    const selected = shapes.find(s => s.id === targetId);
    if (selected) selectedBounds = getShapeBounds(selected);
  }

  if (!selectedBounds) return null;

  const guides = computeSnapGuides(selectedBounds, shapes, targetId);

  return (
    <>
      {guides.verticalGuides.map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[x, -10000, x, 10000]}
          stroke="#FF6B6B"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
      {guides.horizontalGuides.map((y, i) => (
        <Line
          key={`h-${i}`}
          points={[-10000, y, 10000, y]}
          stroke="#FF6B6B"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
      {/* 距离标注 */}
      {guides.distanceLabels.map((label, i) => (
        <Group key={`dist-${i}`} listening={false}>
          {/* 距离线 */}
          <Line
            points={[label.x1, label.y1, label.x2, label.y2]}
            stroke="#0891B2"
            strokeWidth={1}
            dash={[2, 2]}
          />
          {/* 距离标注背景和文字 */}
          <Rect
            x={(label.x1 + label.x2) / 2 - 16}
            y={(label.y1 + label.y2) / 2 - 8}
            width={32}
            height={16}
            fill="#0891B2"
            cornerRadius={3}
          />
          <Text
            x={(label.x1 + label.x2) / 2 - 16}
            y={(label.y1 + label.y2) / 2 - 8}
            width={32}
            height={16}
            text={`${label.distance}`}
            fontSize={10}
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </Group>
      ))}
    </>
  );
}

function SelectionBox({ shape }) {
  if (!shape) return null;

  const bounds = getShapeBounds(shape);
  const padding = 4;

  return (
    <Group listening={false}>
      <Rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        stroke="#0891B2"
        strokeWidth={1}
        dash={[4, 4]}
        fill="transparent"
        rotation={shape.rotation || 0}
        offsetX={(bounds.width + padding * 2) / 2}
        offsetY={(bounds.height + padding * 2) / 2}
        {...(bounds.x !== undefined ? {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        } : {})}
      />
    </Group>
  );
}

function ResizeHandles({ shape, onResize, onResizeEnd, onRotate, onRotateEnd, stageRef }) {
  if (!shape) return null;

  const bounds = getShapeBounds(shape);
  const { x, y, width, height } = bounds;

  const handles = [
    { pos: 'nw', hx: x, hy: y, cursor: 'nw-resize' },
    { pos: 'n', hx: x + width / 2, hy: y, cursor: 'n-resize' },
    { pos: 'ne', hx: x + width, hy: y, cursor: 'ne-resize' },
    { pos: 'e', hx: x + width, hy: y + height / 2, cursor: 'e-resize' },
    { pos: 'se', hx: x + width, hy: y + height, cursor: 'se-resize' },
    { pos: 's', hx: x + width / 2, hy: y + height, cursor: 's-resize' },
    { pos: 'sw', hx: x, hy: y + height, cursor: 'sw-resize' },
    { pos: 'w', hx: x, hy: y + height / 2, cursor: 'w-resize' },
  ];

  const handleMouseDown = (e, pos) => {
    e.cancelBubble = true;
    const stage = stageRef.current;
    if (!stage) return;

    // 暂时禁用Stage的事件，防止组件的draggable干扰
    stage.listening(false);

    const stagePos = stage.getPointerPosition();
    const stageScale = stage.scaleX();
    const stagePosition = { x: stage.x(), y: stage.y() };

    // 将屏幕坐标转换为画布坐标
    const startPos = {
      x: (stagePos.x - stagePosition.x) / stageScale,
      y: (stagePos.y - stagePosition.y) / stageScale,
    };
    const startBounds = { ...bounds };

    const handleMouseMove = () => {
      const currentStagePos = stage.getPointerPosition();
      if (!currentStagePos) return;

      // 将当前屏幕坐标转换为画布坐标
      const currentPos = {
        x: (currentStagePos.x - stagePosition.x) / stageScale,
        y: (currentStagePos.y - stagePosition.y) / stageScale,
      };

      const dx = currentPos.x - startPos.x;
      const dy = currentPos.y - startPos.y;

      let newX = startBounds.x;
      let newY = startBounds.y;
      let newWidth = startBounds.width;
      let newHeight = startBounds.height;

      switch (pos) {
        case 'nw':
          newX = startBounds.x + dx;
          newY = startBounds.y + dy;
          newWidth = startBounds.width - dx;
          newHeight = startBounds.height - dy;
          break;
        case 'n':
          newY = startBounds.y + dy;
          newHeight = startBounds.height - dy;
          break;
        case 'ne':
          newY = startBounds.y + dy;
          newWidth = startBounds.width + dx;
          newHeight = startBounds.height - dy;
          break;
        case 'e':
          newWidth = startBounds.width + dx;
          break;
        case 'se':
          newWidth = startBounds.width + dx;
          newHeight = startBounds.height + dy;
          break;
        case 's':
          newHeight = startBounds.height + dy;
          break;
        case 'sw':
          newX = startBounds.x + dx;
          newWidth = startBounds.width - dx;
          newHeight = startBounds.height + dy;
          break;
        case 'w':
          newX = startBounds.x + dx;
          newWidth = startBounds.width - dx;
          break;
      }

      if (newWidth < 10) {
        newWidth = 10;
        newX = startBounds.x;
      }
      if (newHeight < 10) {
        newHeight = 10;
        newY = startBounds.y;
      }

      onResize({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      stage.listening(true);
      onResizeEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotateStart = (e) => {
    e.cancelBubble = true;
    const stage = stageRef.current;
    if (!stage) return;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const stageScale = stage.scaleX();
    const stagePosition = { x: stage.x(), y: stage.y() };

    const handleRotateMove = () => {
      const currentStagePos = stage.getPointerPosition();
      if (!currentStagePos) return;

      // 将屏幕坐标转换为画布坐标
      const pos = {
        x: (currentStagePos.x - stagePosition.x) / stageScale,
        y: (currentStagePos.y - stagePosition.y) / stageScale,
      };

      const angle = Math.atan2(pos.y - centerY, pos.x - centerX) * 180 / Math.PI + 90;
      const snappedAngle = Math.round(angle / 15) * 15;
      onRotate(snappedAngle);
    };

    const handleRotateUp = () => {
      window.removeEventListener('mousemove', handleRotateMove);
      window.removeEventListener('mouseup', handleRotateUp);
      stage.listening(true);
      onRotateEnd?.();
    };

    stage.listening(false);
    window.addEventListener('mousemove', handleRotateMove);
    window.addEventListener('mouseup', handleRotateUp);
  };

  const rotation = shape.rotation || 0;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <Group x={centerX} y={centerY} rotation={rotation}>
      {/* 选中边框 */}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        stroke="#0891B2"
        strokeWidth={1}
        fill="transparent"
        listening={false}
      />

      {/* 缩放控制点 */}
      {handles.map(handle => {
        const hx = handle.hx - centerX;
        const hy = handle.hy - centerY;
        return (
          <Rect
            key={handle.pos}
            x={hx - HANDLE_SIZE / 2}
            y={hy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#FFFFFF"
            stroke="#0891B2"
            strokeWidth={1}
            cornerRadius={2}
            onMouseDown={(e) => handleMouseDown(e, handle.pos)}
            onMouseEnter={(e) => {
              const container = e.target.getStage().container();
              container.style.cursor = handle.cursor;
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage().container();
              container.style.cursor = 'default';
            }}
            hitStrokeWidth={15}
          />
        );
      })}

      {/* 旋转控制线 */}
      <Line
        points={[0, -height / 2, 0, -height / 2 - ROTATE_HANDLE_OFFSET]}
        stroke="#0891B2"
        strokeWidth={1}
        listening={false}
      />
      {/* 旋转控制点 */}
      <Circle
        x={0}
        y={-height / 2 - ROTATE_HANDLE_OFFSET}
        radius={8}
        fill="#FFFFFF"
        stroke="#0891B2"
        strokeWidth={1}
        onMouseDown={handleRotateStart}
        onMouseEnter={(e) => {
          const container = e.target.getStage().container();
          container.style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage().container();
          container.style.cursor = 'default';
        }}
        hitStrokeWidth={15}
      />
    </Group>
  );
}

function ConnectionHandles({ shape, onHandleMouseDown }) {
  if (!shape) return null;

  const handles = [
    { pos: 'top', ...getHandlePosition(shape, 'top') },
    { pos: 'right', ...getHandlePosition(shape, 'right') },
    { pos: 'bottom', ...getHandlePosition(shape, 'bottom') },
    { pos: 'left', ...getHandlePosition(shape, 'left') },
  ];

  return (
    <Group listening={true}>
      {handles.map(handle => {
        return (
          <Rect
            key={handle.pos}
            x={handle.x - 4}
            y={handle.y - 4}
            width={8}
            height={8}
            fill="#10B981"
            cornerRadius={2}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              onHandleMouseDown(shape.id, handle.pos, { x: handle.x, y: handle.y });
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
            hitStrokeWidth={10}
          />
        );
      })}
    </Group>
  );
}

function getHandlePosition(shape, handlePos) {
  const bounds = getShapeBounds(shape);
  const { x, y, width, height } = bounds;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const rotation = (shape.rotation || 0) * Math.PI / 180;

  let hx, hy;
  switch (handlePos) {
    case 'top': hx = centerX; hy = y; break;
    case 'right': hx = x + width; hy = centerY; break;
    case 'bottom': hx = centerX; hy = y + height; break;
    case 'left': hx = x; hy = centerY; break;
    default: hx = centerX; hy = centerY; break;
  }

  // Rotate point around center
  const dx = hx - centerX;
  const dy = hy - centerY;
  const rotatedX = centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation);
  const rotatedY = centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation);

  return { x: rotatedX, y: rotatedY };
}

function ShapeRenderer({ shape, shapes, isSelected, isMultiSelected, isEditing, onSelect, onSelectMultiple, onChange, onDragEnd, onResizeEnd, onRotateEnd, onDoubleClick, stageRef, onExecuteInteraction, onClearPendingForShape, onRegisterTimeout, isPreviewMode, isConnectionMode, variables, selectedChildId, onSelectChild, onHandleMouseDown, snapToGrid, showGuides, onSliderDragStart }) {
  const shapeRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // 处理 visibleIf 逻辑（先计算状态，不能提前 return 以免破坏 Hook 顺序）
  let isVisibleByCondition = true;
  if (shape.visibleIf) {
    const { key, operator, value } = shape.visibleIf;
    const currentVal = variables?.[key] ?? '';
    
    if (operator === '==') isVisibleByCondition = currentVal == value;
    else if (operator === '===') isVisibleByCondition = currentVal === value;
    else if (operator === '!=') isVisibleByCondition = currentVal != value;
    else if (operator === '!==') isVisibleByCondition = currentVal !== value;
    else if (operator === '>') isVisibleByCondition = currentVal > value;
    else if (operator === '<') isVisibleByCondition = currentVal < value;
    else if (operator === '>=') isVisibleByCondition = currentVal >= value;
    else if (operator === '<=') isVisibleByCondition = currentVal <= value;
  }

  const shouldHideInPreview = isPreviewMode && shape.visibleIf && !isVisibleByCondition;
  const isHiddenByCondition = !isPreviewMode && shape.visibleIf && !isVisibleByCondition;

  const activeProps = { ...(isHovered && shape.hoverProps ? { ...shape.props, ...shape.hoverProps } : shape.props) };
  if (isHiddenByCondition) {
    activeProps.opacity = (activeProps.opacity || 1) * 0.3; // 编辑模式下条件不满足时半透明显示
  }

  const triggerInteraction = useCallback((interaction) => {
    // 清除该 source 上所有待执行的延迟交互（抢占机制）
    onClearPendingForShape?.(shape.id);

    if (interaction.delay && interaction.delay > 0) {
      const timeoutId = setTimeout(() => {
        onExecuteInteraction?.(interaction, shape.id);
      }, interaction.delay);
      onRegisterTimeout?.(shape.id, timeoutId);
    } else {
      onExecuteInteraction?.(interaction, shape.id);
    }
  }, [onExecuteInteraction, onClearPendingForShape, onRegisterTimeout, shape.id]);

  // 定时器交互 (仅在演示模式下激活)
  useEffect(() => {
    if (!isPreviewMode || !shape.interactions?.length) return;

    const timeouts = [];
    shape.interactions.forEach(interaction => {
      if (interaction.trigger === 'onLoad') {
        const delay = interaction.delay ?? 0;
        const timerId = setTimeout(() => {
          onExecuteInteraction?.(interaction);
        }, delay);
        timeouts.push(timerId);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isPreviewMode, shape.interactions, onExecuteInteraction]);

  // 所有 Hook 声明完毕后，再执行提前返回
  if (shouldHideInPreview) {
    return null;
  }

  let calculatedPoints = activeProps.points;
  if (shape.type === 'arrow' && shape.startBinding && shape.endBinding) {
    const startShape = shapes.find(s => s.id === shape.startBinding.shapeId);
    const endShape = shapes.find(s => s.id === shape.endBinding.shapeId);
    if (startShape && endShape) {
      const startPos = getHandlePosition(startShape, shape.startBinding.handle);
      const endPos = getHandlePosition(endShape, shape.endBinding.handle);
      calculatedPoints = [startPos.x, startPos.y, endPos.x, endPos.y];
    }
  }

  const shapeProps = {
    ...activeProps,
    points: calculatedPoints,
    x: shape.x,
    y: shape.y,
    draggable: !isPreviewMode && !(shape.type === 'arrow' && shape.startBinding),
    onClick: (e) => {
      e.cancelBubble = true;
      const prefix = shape.id.split('-')[0];
      const isToggleable = ['switch', 'checkbox', 'radio'].includes(prefix);
      if ((isPreviewMode || e.evt.altKey) && isToggleable) {
        // 内置切换行为：点击切换 checked 状态
        const currentChecked = shape.props.checked === true || shape.props.checked === 'true';
        onChange({ ...shape, props: { ...shape.props, checked: !currentChecked } });
        // 触发 onChange 交互
        shape.interactions?.forEach(interaction => {
          if (interaction.trigger === 'onChange') {
            triggerInteraction(interaction);
          }
        });
      }
      if ((isPreviewMode || e.evt.altKey) && shape.interactions?.length > 0) {
        shape.interactions.forEach(interaction => {
          if (interaction.trigger === 'onClick') {
            triggerInteraction(interaction);
          }
        });
      } else if (!isPreviewMode && !isToggleable && (e.evt.ctrlKey || e.evt.metaKey)) {
        onSelectMultiple?.(shape.id);
      } else if (!isPreviewMode && !isToggleable) {
        onSelect(shape.id);
      } else if (!isPreviewMode && isToggleable) {
        onSelect(shape.id);
      }
    },
    onTap: (e) => {
      e.cancelBubble = true;
      const prefix = shape.id.split('-')[0];
      const isToggleable = ['switch', 'checkbox', 'radio'].includes(prefix);
      if ((isPreviewMode || e.evt.altKey) && isToggleable) {
        const currentChecked = shape.props.checked === true || shape.props.checked === 'true';
        onChange({ ...shape, props: { ...shape.props, checked: !currentChecked } });
        shape.interactions?.forEach(interaction => {
          if (interaction.trigger === 'onChange') {
            triggerInteraction(interaction);
          }
        });
      }
      if ((isPreviewMode || e.evt.altKey) && shape.interactions?.length > 0) {
        shape.interactions.forEach(interaction => {
          if (interaction.trigger === 'onClick') {
            triggerInteraction(interaction);
          }
        });
      } else if (!isPreviewMode && (e.evt.ctrlKey || e.evt.metaKey)) {
        onSelectMultiple?.(shape.id);
      } else if (!isPreviewMode) {
        onSelect(shape.id);
      }
    },
    onDblClick: (e) => {
      e.cancelBubble = true;
      if (['text', 'rect', 'circle'].includes(shape.type) || shape.id.startsWith('input') || shape.id.startsWith('button')) {
        onDoubleClick?.(shape);
      }
    },
    onDblTap: (e) => {
      e.cancelBubble = true;
      if (['text', 'rect', 'circle'].includes(shape.type) || shape.id.startsWith('input') || shape.id.startsWith('button')) {
        onDoubleClick?.(shape);
      }
    },
    onDragStart: () => {
      if (!isPreviewMode) {
        onSelect(shape.id);
      }
    },
    onDragMove: (e) => {
      const newX = e.target.x();
      const newY = e.target.y();
      onChange((prev) => {
        if (prev.rotation && prev.type === 'rect') {
          return { ...prev, x: newX - prev.props.width / 2, y: newY - prev.props.height / 2 };
        }
        return { ...prev, x: newX, y: newY };
      });
    },
    onDragEnd: (e) => {
      const newX = e.target.x();
      const newY = e.target.y();
      onChange((prev) => {
        if (prev.rotation && prev.type === 'rect') {
          return { ...prev, x: newX - prev.props.width / 2, y: newY - prev.props.height / 2 };
        }
        return { ...prev, x: newX, y: newY };
      });
      onDragEnd?.();
    },
    onMouseEnter: (e) => {
      setIsHovered(true);
      const stage = e.target.getStage();
      const hasInteraction = shape.interactions?.length > 0;
      if (stage) {
        stage.container().style.cursor = (isPreviewMode || e.evt.altKey) && hasInteraction ? 'pointer' : (isPreviewMode ? 'default' : 'move');
      }

      if ((isPreviewMode || e.evt.altKey) && hasInteraction) {
        shape.interactions.forEach(interaction => {
          if (interaction.trigger === 'onMouseEnter') {
            triggerInteraction(interaction);
          }
        });
      }
    },
    onMouseLeave: (e) => {
      // 检查鼠标是否真的离开了 Group 的包围盒（排除子元素间移动产生的虚假 leave）
      const group = e.currentTarget;
      const stage = group.getStage();
      if (stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          const box = group.getClientRect();
          if (pointerPos.x >= box.x && pointerPos.x <= box.x + box.width &&
              pointerPos.y >= box.y && pointerPos.y <= box.y + box.height) {
            // 鼠标仍在 Group 范围内，忽略此次 leave
            return;
          }
        }
      }

      setIsHovered(false);
      if (stage) {
        stage.container().style.cursor = 'default';
      }

      const hasInteraction = shape.interactions?.length > 0;
      if ((isPreviewMode || e.evt.altKey) && hasInteraction) {
        shape.interactions.forEach(interaction => {
          if (interaction.trigger === 'onMouseLeave') {
            triggerInteraction(interaction);
          }
        });
      }
    },
  };

  if (shape.rotation) {
    shapeProps.rotation = shape.rotation;
    if (shape.type === 'rect') {
      shapeProps.offsetX = shape.props.width / 2;
      shapeProps.offsetY = shape.props.height / 2;
      shapeProps.x = shape.x + shape.props.width / 2;
      shapeProps.y = shape.y + shape.props.height / 2;
    }
  }

  const handleResize = (newBounds) => {
    onChange((shape) => {
      const newProps = { ...shape.props };

      if (shape.type === 'circle') {
        const radiusX = newBounds.width / 2;
        const radiusY = newBounds.height / 2;
        newProps.radius = radiusX;
        newProps.radiusY = radiusY;
        return {
          ...shape,
          x: newBounds.x + radiusX,
          y: newBounds.y + radiusY,
          props: newProps,
        };
      } else if (shape.type === 'text') {
        const fontSize = shape.props.fontSize || 16;
        const newLineHeight = Math.max(0.5, parseFloat((newBounds.height / fontSize).toFixed(2)));
        newProps.width = newBounds.width;
        newProps.lineHeight = newLineHeight;
        return {
          ...shape,
          x: newBounds.x,
          y: newBounds.y,
          props: newProps,
        };
      } else if (shape.type === 'group') {
        // 组缩放：跟随组框比例缩放所有子组件
        const oldWidth = shape.props.width || 1;
        const oldHeight = shape.props.height || 1;
        const scaleX = newBounds.width / oldWidth;
        const scaleY = newBounds.height / oldHeight;

        const scaledChildren = shape.children.map(child => {
          const childProps = child.props || {};
          const scaledChild = {
            ...child,
            x: child.x * scaleX,
            y: child.y * scaleY,
            props: { ...childProps },
          };

          // 缩放子组件的尺寸
          if (child.type === 'circle') {
            scaledChild.props.radius = (childProps.radius || 40) * scaleX;
            scaledChild.props.radiusY = (childProps.radiusY || childProps.radius || 40) * scaleY;
          } else if (child.type === 'text') {
            scaledChild.props.width = (childProps.width || 150) * scaleX;
            scaledChild.props.fontSize = (childProps.fontSize || 16) * scaleX;
          } else {
            scaledChild.props.width = (childProps.width || 100) * scaleX;
            scaledChild.props.height = (childProps.height || 100) * scaleY;
          }

          return scaledChild;
        });

        return {
          ...shape,
          x: newBounds.x,
          y: newBounds.y,
          props: {
            ...shape.props,
            width: newBounds.width,
            height: newBounds.height,
          },
          children: scaledChildren,
        };
      } else if (shape.type === 'dynamicPanel') {
        // 动态面板缩放：跟随面板比例缩放所有状态中的子组件
        const oldWidth = shape.props.width || 1;
        const oldHeight = shape.props.height || 1;
        const scaleX = newBounds.width / oldWidth;
        const scaleY = newBounds.height / oldHeight;

        const scaledStates = (shape.states || []).map(state => {
          const scaledChildren = (state.children || []).map(child => {
            const childProps = child.props || {};
            const scaledChild = {
              ...child,
              x: child.x * scaleX,
              y: child.y * scaleY,
              props: { ...childProps },
            };

            if (child.type === 'circle') {
              scaledChild.props.radius = (childProps.radius || 40) * scaleX;
              scaledChild.props.radiusY = (childProps.radiusY || childProps.radius || 40) * scaleY;
            } else if (child.type === 'text') {
              scaledChild.props.width = (childProps.width || 150) * scaleX;
              scaledChild.props.fontSize = (childProps.fontSize || 16) * scaleX;
            } else {
              scaledChild.props.width = (childProps.width || 100) * scaleX;
              scaledChild.props.height = (childProps.height || 100) * scaleY;
            }

            return scaledChild;
          });

          return { ...state, children: scaledChildren };
        });

        return {
          ...shape,
          x: newBounds.x,
          y: newBounds.y,
          props: {
            ...shape.props,
            width: newBounds.width,
            height: newBounds.height,
          },
          states: scaledStates,
        };
      } else if (shape.type !== 'line' && shape.type !== 'arrow') {
        newProps.width = newBounds.width;
        newProps.height = newBounds.height;
        return {
          ...shape,
          x: newBounds.x,
          y: newBounds.y,
          props: newProps,
        };
      } else {
        return {
          ...shape,
          x: newBounds.x,
          y: newBounds.y,
        };
      }
    });
  };

  const handleRotate = (angle) => {
    onChange((shape) => ({
      ...shape,
      rotation: angle,
    }));
  };

  const renderShape = () => {
    const rotation = shape.rotation || 0;

    switch (shape.type) {
      case 'image':
        return (
          <ImageShape
            shape={shape}
            activeProps={activeProps}
            shapeRef={shapeRef}
            rotation={rotation}
            shapeProps={shapeProps}
            onChange={onChange}
            onDragEnd={onDragEnd}
            allShapes={shapes}
            snapToGrid={snapToGrid}
            showGuides={showGuides}
          />
        );
      case 'rect':
        // 输入框或按钮类型需要显示内部文本
        if (shape.id.startsWith('input') || shape.id.startsWith('button')) {
          const displayText = activeProps.text || activeProps.placeholder || '';
          const textColor = shape.id.startsWith('input') 
            ? (activeProps.textColor || '#0F172A')
            : (activeProps.textColor || '#FFFFFF'); // 按钮默认白色文字
          const isPlaceholder = shape.id.startsWith('input') && !activeProps.text;
          const fontSize = activeProps.fontSize || 14;
          const padding = 12;
          const width = activeProps.width || 200;
          const height = activeProps.height || 40;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;

          // 根据对齐方式计算文本位置
          let textX = padding;
          let align = 'left';
          if (activeProps.textAlign === 'center') {
            textX = 0;
            align = 'center';
          } else if (activeProps.textAlign === 'right') {
            textX = 0;
            align = 'right';
          }

          // 使用Group包裹，支持旋转
          return (
            <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDblClick={shapeProps.onDblClick}
              onDblTap={shapeProps.onDblTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill}
                stroke={activeProps.stroke}
                strokeWidth={activeProps.strokeWidth}
                cornerRadius={activeProps.cornerRadius}
                opacity={activeProps.opacity}
              />
              {!isEditing && (
                <Text
                  text={displayText}
                  x={-width / 2 + textX}
                  y={-height / 2 + (height - fontSize) / 2}
                  width={align === 'left' ? width - padding * 2 : width}
                  fontSize={fontSize}
                  fontFamily={activeProps.fontFamily || 'Inter'}
                  fill={isPlaceholder ? '#94A3B8' : textColor}
                  fontStyle={activeProps.fontStyle === 'italic' ? 'italic' : 'normal'}
                  fontWeight={String(activeProps.fontWeight || '400')}
                  textDecoration={activeProps.textDecoration || 'none'}
                  align={align}
                  lineHeight={activeProps.lineHeight || 1.4}
                  listening={false}
                />
              )}
            </Group>
          );
        }
        // 开关组件
        else if (shape.id.startsWith('switch')) {
          const width = activeProps.width || 44;
          const height = activeProps.height || 24;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;
          const isChecked = activeProps.checked === true || activeProps.checked === 'true';
          const knobRadius = height / 2 - 2;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable={!isPreviewMode}
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={isChecked ? (activeProps.fill || '#22C55E') : (activeProps.fillOff || '#E2E8F0')}
                cornerRadius={height / 2}
              />
              <Circle
                x={isChecked ? width / 2 - height / 2 : -width / 2 + height / 2}
                y={0}
                radius={knobRadius}
                fill={activeProps.knobColor || '#FFFFFF'}
                listening={false}
              />
            </Group>
          );
        }
        // 复选框组件
        else if (shape.id.startsWith('checkbox')) {
          const width = activeProps.width || 20;
          const height = activeProps.height || 20;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;
          const isChecked = activeProps.checked === true || activeProps.checked === 'true';

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable={!isPreviewMode}
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill || '#FFFFFF'}
                stroke={activeProps.stroke || '#CBD5E1'}
                strokeWidth={activeProps.strokeWidth || 2}
                cornerRadius={activeProps.cornerRadius || 4}
              />
              {isChecked && (
                <Text
                  text="✓"
                  x={-width / 2}
                  y={-height / 2 + 1}
                  width={width}
                  height={height}
                  fontSize={height * 0.7}
                  fontFamily="Inter"
                  fill={activeProps.checkColor || '#0891B2'}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              )}
            </Group>
          );
        }
        // 徽标组件
        else if (shape.id.startsWith('badge')) {
          const width = activeProps.width || 20;
          const height = activeProps.height || 20;
          const fontSize = activeProps.fontSize || 11;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill || '#EF4444'}
                cornerRadius={activeProps.cornerRadius || 10}
              />
              <Text
                text={activeProps.text || '5'}
                x={-width / 2}
                y={-fontSize / 2}
                width={width}
                fontSize={fontSize}
                fontFamily="Inter"
                fill={activeProps.textColor || '#FFFFFF'}
                align="center"
                listening={false}
              />
            </Group>
          );
        }
        // 滑块组件
        else if (shape.id.startsWith('slider')) {
          const width = activeProps.width || 200;
          const height = activeProps.height || 20;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;
          const value = Math.max(0, Math.min(100, Number(activeProps.value ?? 50)));
          const trackHeight = Math.max(4, height * 0.3);
          const barWidth = width * value / 100;
          const thumbRadius = height / 2 - 1;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable={!isPreviewMode}
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
              onMouseDown={(e) => {
                if (!isPreviewMode) return;
                e.cancelBubble = true;
                const stage = e.target.getStage();
                if (!stage) return;
                const pointerPos = stage.getPointerPosition();
                if (!pointerPos) return;
                // 根据点击位置计算 value
                const trackLeft = shape.x;
                const relX = pointerPos.x - trackLeft;
                const newValue = Math.max(0, Math.min(100, (relX / width) * 100));
                onChange({ ...shape, props: { ...shape.props, value: Math.round(newValue) } });
                // 开始拖拽跟踪
                onSliderDragStart?.(shape.id, shape.x, width);
              }}
            >
              {/* 轨道 */}
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-trackHeight / 2}
                width={width}
                height={trackHeight}
                fill={activeProps.fill || '#E2E8F0'}
                cornerRadius={activeProps.cornerRadius || 4}
              />
              {/* 激活轨道 */}
              <Rect
                x={-width / 2}
                y={-trackHeight / 2}
                width={barWidth}
                height={trackHeight}
                fill={activeProps.barFill || '#0891B2'}
                cornerRadius={activeProps.cornerRadius || 4}
                listening={false}
              />
              {/* 滑块 */}
              <Circle
                x={-width / 2 + barWidth}
                y={0}
                radius={thumbRadius}
                fill={activeProps.knobColor || '#FFFFFF'}
                stroke={activeProps.knobStroke || '#0891B2'}
                strokeWidth={2}
                listening={false}
              />
            </Group>
          );
        }
        // 进度条组件
        else if (shape.id.startsWith('progress')) {
          const width = activeProps.width || 200;
          const height = activeProps.height || 8;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;
          const value = Math.max(0, Math.min(100, Number(activeProps.value ?? 60)));
          const barWidth = width * value / 100;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              {/* 轨道 */}
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill || '#E2E8F0'}
                cornerRadius={activeProps.cornerRadius || 4}
                opacity={activeProps.opacity}
              />
              {/* 进度条 */}
              <Rect
                x={-width / 2}
                y={-height / 2}
                width={barWidth}
                height={height}
                fill={activeProps.barFill || '#0891B2'}
                cornerRadius={activeProps.cornerRadius || 4}
                listening={false}
              />
            </Group>
          );
        }
        // 分割线组件
        else if (shape.id.startsWith('divider')) {
          const width = activeProps.width || 200;
          const height = activeProps.height || 1;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill || '#E2E8F0'}
              />
            </Group>
          );
        }
        // 头像组件
        else if (shape.id.startsWith('avatar')) {
          const width = activeProps.width || 40;
          const height = activeProps.height || 40;
          const fontSize = activeProps.fontSize || 16;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;

          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill || '#DBEAFE'}
                cornerRadius={activeProps.cornerRadius || 20}
              />
              <Text
                text={activeProps.text || 'A'}
                x={-width / 2}
                y={-fontSize / 2}
                width={width}
                fontSize={fontSize}
                fontFamily="Inter"
                fill={activeProps.textColor || '#1E40AF'}
                align="center"
                listening={false}
              />
            </Group>
          );
        }
        // 普通矩形
        {
          const width = activeProps.width || 100;
          const height = activeProps.height || 100;
          const fontSize = activeProps.fontSize || 14;
          const textColor = activeProps.textColor || '#0F172A';
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;
          
          return (
            <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDblClick={shapeProps.onDblClick}
              onDblTap={shapeProps.onDblTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x() - width / 2;
                const rawY = e.target.y() - height / 2;
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x + width / 2);
                e.target.y(snapped.y + height / 2);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-width / 2}
                y={-height / 2}
                width={width}
                height={height}
                fill={activeProps.fill}
                stroke={activeProps.stroke}
                strokeWidth={activeProps.strokeWidth}
                cornerRadius={activeProps.cornerRadius}
                opacity={activeProps.opacity}
              />
              {!isEditing && (
                <Text
                  text={activeProps.text || ''}
                  x={-width / 2}
                  y={-fontSize / 2}
                  width={width}
                  fontSize={fontSize}
                  fontFamily={activeProps.fontFamily || 'Inter'}
                  fill={textColor}
                  align="center"
                  listening={false}
                />
              )}
            </Group>
          );
        }
      case 'circle': {
        // 单选框组件
        if (shape.id.startsWith('radio')) {
          const radius = activeProps.radius || 10;
          const isChecked = activeProps.checked === true || activeProps.checked === 'true';
          return (
            <Group
              scaleX={activeProps.scale || 1}
              scaleY={activeProps.scale || 1}
              x={shape.x}
              y={shape.y}
              rotation={rotation}
              draggable={!isPreviewMode}
              opacity={activeProps.opacity}
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragStart={shapeProps.onDragStart}
              onDragMove={(e) => {
                const rawX = e.target.x();
                const rawY = e.target.y();
                const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
                onChange({ ...shape, x: snapped.x, y: snapped.y });
                e.target.x(snapped.x);
                e.target.y(snapped.y);
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x(), y: e.target.y() });
                onDragEnd?.();
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Circle
                ref={shapeRef}
                radius={radius}
                fill={activeProps.fill || '#FFFFFF'}
                stroke={activeProps.stroke || '#CBD5E1'}
                strokeWidth={activeProps.strokeWidth || 2}
              />
              {isChecked && (
                <Circle
                  radius={radius * 0.5}
                  fill={activeProps.checkColor || '#0891B2'}
                  listening={false}
                />
              )}
            </Group>
          );
        }
        const radius = activeProps.radius || 40;
        const radiusY = activeProps.radiusY !== undefined ? activeProps.radiusY : radius;
        const fontSize = activeProps.fontSize || 14;
        const isEllipse = activeProps.radiusY !== undefined;
        return (
          <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
            x={shape.x}
            y={shape.y}
            rotation={rotation}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDblClick={shapeProps.onDblClick}
            onDblTap={shapeProps.onDblTap}
            onDragStart={shapeProps.onDragStart}
            onDragMove={(e) => {
              const rawX = e.target.x();
              const rawY = e.target.y();
              const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
              onChange({ ...shape, x: snapped.x, y: snapped.y });
              e.target.x(snapped.x);
              e.target.y(snapped.y);
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x(), y: e.target.y() });
              onDragEnd?.();
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            {isEllipse ? (
              <Ellipse
                ref={shapeRef}
                radiusX={radius}
                radiusY={radiusY}
                fill={activeProps.fill}
                stroke={activeProps.stroke}
                strokeWidth={activeProps.strokeWidth}
                opacity={activeProps.opacity}
              />
            ) : (
              <Circle
                ref={shapeRef}
                radius={radius}
                fill={activeProps.fill}
                stroke={activeProps.stroke}
                strokeWidth={activeProps.strokeWidth}
                opacity={activeProps.opacity}
              />
            )}
            {!isEditing && (
              <Text
                text={activeProps.text || ''}
                x={-radius}
                y={-fontSize / 2}
                width={radius * 2}
                fontSize={fontSize}
                fontFamily={activeProps.fontFamily || 'Inter'}
                fill={activeProps.textColor || '#0F172A'}
                align="center"
                listening={false}
              />
            )}
          </Group>
        );
      }
      case 'line':
        return <Line ref={shapeRef} {...shapeProps} />;
      case 'arrow':
        return (
          <Group>
            {isSelected && (
              <Arrow 
                x={shapeProps.x}
                y={shapeProps.y}
                points={shapeProps.points}
                stroke="#0891B2"
                strokeWidth={(shapeProps.strokeWidth || 2) + 4}
                pointerLength={10} 
                pointerWidth={10} 
                opacity={0.3}
                listening={false}
              />
            )}
            <Arrow 
              ref={shapeRef} 
              {...shapeProps} 
              pointerLength={10} 
              pointerWidth={10} 
              fill={activeProps.stroke} 
              hitStrokeWidth={15}
            />
          </Group>
        );
      case 'icon': {
        const iconWidth = activeProps.width || 24;
        const iconHeight = activeProps.height || 24;
        const iconPath = activeProps.iconPath || '';
        const iconStroke = activeProps.stroke || '#64748B';
        const iconStrokeWidth = activeProps.strokeWidth || 2;
        const iconFill = activeProps.fill || '#FFFFFF';
        const centerX = shape.x + iconWidth / 2;
        const centerY = shape.y + iconHeight / 2;
        
        return (
          <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
            x={centerX}
            y={centerY}
            rotation={rotation}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDragStart={shapeProps.onDragStart}
            onDragMove={(e) => {
              const rawX = e.target.x() - iconWidth / 2;
              const rawY = e.target.y() - iconHeight / 2;
              const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
              onChange({ ...shape, x: snapped.x, y: snapped.y });
              e.target.x(snapped.x + iconWidth / 2);
              e.target.y(snapped.y + iconHeight / 2);
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x() - iconWidth / 2, y: e.target.y() - iconHeight / 2 });
              onDragEnd?.();
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            <Path
              ref={shapeRef}
              data={iconPath}
              x={-iconWidth / 2}
              y={-iconHeight / 2}
              scaleX={iconWidth / 24}
              scaleY={iconHeight / 24}
              stroke={iconStroke}
              strokeWidth={iconStrokeWidth}
              fill={iconFill}
              lineCap="round"
              lineJoin="round"
              opacity={activeProps.opacity}
            />
          </Group>
        );
      }
      case 'text': {
        const textWidth = activeProps.width || 150;
        const fontSize = activeProps.fontSize || 16;
        const lineHeight = activeProps.lineHeight || 1.4;
        const textHeight = fontSize * lineHeight;
        const centerX = shape.x + textWidth / 2;
        const centerY = shape.y + textHeight / 2;
        // 使用Group包裹以支持正确的旋转
        return (
          <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
            x={centerX}
            y={centerY}
            rotation={rotation}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDblClick={shapeProps.onDblClick}
            onDblTap={shapeProps.onDblTap}
            onDragStart={shapeProps.onDragStart}
            onDragMove={(e) => {
              const rawX = e.target.x() - textWidth / 2;
              const rawY = e.target.y() - textHeight / 2;
              const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
              onChange({ ...shape, x: snapped.x, y: snapped.y });
              e.target.x(snapped.x + textWidth / 2);
              e.target.y(snapped.y + textHeight / 2);
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x() - textWidth / 2, y: e.target.y() - textHeight / 2 });
              onDragEnd?.();
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            {!isEditing && (
              <Text
                ref={shapeRef}
                x={-textWidth / 2}
                y={-textHeight / 2}
                text={activeProps.text}
                width={textWidth}
                fontSize={fontSize}
                fontFamily={activeProps.fontFamily}
                fill={activeProps.fill}
                fontStyle={activeProps.fontStyle === 'italic' ? 'italic' : 'normal'}
                fontWeight={String(activeProps.fontWeight || '400')}
                textDecoration={activeProps.textDecoration || 'none'}
                align={activeProps.align || 'left'}
                lineHeight={lineHeight}
                opacity={activeProps.opacity}
              />
            )}
          </Group>
        );
      }
      case 'group': {
        // 渲染组内的子组件
        return (
          <Group

            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
            x={shape.x}
            y={shape.y}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDragStart={shapeProps.onDragStart}
            onDragMove={(e) => {
              const rawX = e.target.x();
              const rawY = e.target.y();
              const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
              onChange({ ...shape, x: snapped.x, y: snapped.y });
              e.target.x(snapped.x);
              e.target.y(snapped.y);
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x(), y: e.target.y() });
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            {/* 组的背景框（可选，用于可视化） */}
            {isSelected && (
              <Rect
                ref={shapeRef}
                x={0}
                y={0}
                width={activeProps.width || 100}
                height={activeProps.height || 100}
                fill="transparent"
                stroke="#0891B2"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )}
            {/* 渲染子组件 */}
            {shape.children?.map((child) => {
              const childProps = child.props || {};
              const childType = child.id?.split('-')[0];

              if (childType === 'radio') {
                const cr = childProps.radius || 10;
                const isChecked = childProps.checked === true || childProps.checked === 'true';
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Circle radius={cr} fill={childProps.fill || '#FFFFFF'} stroke={childProps.stroke || '#CBD5E1'} strokeWidth={childProps.strokeWidth || 2} />
                    {isChecked && <Circle radius={cr * 0.5} fill={childProps.checkColor || '#0891B2'} />}
                  </Group>
                );
              } else if (childType === 'circle') {
                // 圆形：child.x, child.y 是圆心相对于组左上角的偏移量，直接作为圆心坐标
                // 如果有 radiusY，使用 Ellipse；否则使用 Circle
                if (childProps.radiusY !== undefined) {
                  return (
                    <Ellipse
                      key={child.id}
                      x={child.x}
                      y={child.y}
                      radiusX={childProps.radius || 40}
                      radiusY={childProps.radiusY}
                      fill={childProps.fill || '#F1F5F9'}
                      stroke={childProps.stroke}
                      strokeWidth={childProps.strokeWidth || 0}
                    />
                  );
                }
                return (
                  <Circle
                    key={child.id}
                    x={child.x}
                    y={child.y}
                    radius={childProps.radius || 40}
                    fill={childProps.fill || '#F1F5F9'}
                    stroke={childProps.stroke}
                    strokeWidth={childProps.strokeWidth || 0}
                  />
                );
              } else if (childType === 'text') {
                return (
                  <Text
                    key={child.id}
                    x={child.x}
                    y={child.y}
                    text={childProps.text || '文本'}
                    fontSize={childProps.fontSize || 16}
                    fontFamily={childProps.fontFamily || 'Inter'}
                    fill={childProps.fill || '#0F172A'}
                    width={childProps.width || 150}
                  />
                );
              } else if (childType === 'switch') {
                const cw = childProps.width || 44;
                const ch = childProps.height || 24;
                const isChecked = childProps.checked === true || childProps.checked === 'true';
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={ch} fill={isChecked ? (childProps.fill || '#22C55E') : (childProps.fillOff || '#E2E8F0')} cornerRadius={ch / 2} />
                    <Circle x={isChecked ? cw - ch / 2 : ch / 2} y={ch / 2} radius={ch / 2 - 2} fill={childProps.knobColor || '#FFFFFF'} />
                  </Group>
                );
              } else if (childType === 'checkbox') {
                const cw = childProps.width || 20;
                const ch = childProps.height || 20;
                const isChecked = childProps.checked === true || childProps.checked === 'true';
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={ch} fill={childProps.fill || '#FFFFFF'} stroke={childProps.stroke || '#CBD5E1'} strokeWidth={childProps.strokeWidth || 2} cornerRadius={childProps.cornerRadius || 4} />
                    {isChecked && <Text text="✓" y={1} width={cw} height={ch} fontSize={ch * 0.7} fill={childProps.checkColor || '#0891B2'} align="center" />}
                  </Group>
                );
              } else if (childType === 'badge') {
                const cw = childProps.width || 20;
                const ch = childProps.height || 20;
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={ch} fill={childProps.fill || '#EF4444'} cornerRadius={childProps.cornerRadius || 10} />
                    <Text text={childProps.text || '5'} y={(ch - (childProps.fontSize || 11)) / 2} width={cw} fontSize={childProps.fontSize || 11} fill={childProps.textColor || '#FFFFFF'} align="center" />
                  </Group>
                );
              } else if (childType === 'slider') {
                const cw = childProps.width || 200;
                const ch = childProps.height || 20;
                const val = Math.max(0, Math.min(100, Number(childProps.value) || 50));
                const tH = Math.max(4, ch * 0.3);
                const bW = cw * val / 100;
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={tH} y={-tH / 2} fill={childProps.fill || '#E2E8F0'} cornerRadius={childProps.cornerRadius || 4} />
                    <Rect width={bW} height={tH} y={-tH / 2} fill={childProps.barFill || '#0891B2'} cornerRadius={childProps.cornerRadius || 4} />
                    <Circle x={bW} radius={ch / 2 - 1} fill={childProps.knobColor || '#FFFFFF'} stroke={childProps.knobStroke || '#0891B2'} strokeWidth={2} />
                  </Group>
                );
              } else if (childType === 'progress') {
                const cw = childProps.width || 200;
                const ch = childProps.height || 8;
                const val = Math.max(0, Math.min(100, Number(childProps.value) || 60));
                const bW = cw * val / 100;
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={ch} fill={childProps.fill || '#E2E8F0'} cornerRadius={childProps.cornerRadius || 4} />
                    <Rect width={bW} height={ch} fill={childProps.barFill || '#0891B2'} cornerRadius={childProps.cornerRadius || 4} />
                  </Group>
                );
              } else if (childType === 'divider') {
                return (
                  <Rect key={child.id} x={child.x} y={child.y} width={childProps.width || 200} height={childProps.height || 1} fill={childProps.fill || '#E2E8F0'} />
                );
              } else if (childType === 'avatar') {
                const cw = childProps.width || 40;
                const ch = childProps.height || 40;
                const fs = childProps.fontSize || 16;
                return (
                  <Group key={child.id} x={child.x} y={child.y}>
                    <Rect width={cw} height={ch} fill={childProps.fill || '#DBEAFE'} cornerRadius={childProps.cornerRadius || 20} />
                    <Text text={childProps.text || 'A'} y={(ch - fs) / 2} width={cw} fontSize={fs} fill={childProps.textColor || '#1E40AF'} align="center" />
                  </Group>
                );
              } else {
                // 默认矩形
                return (
                  <Rect
                    key={child.id}
                    x={child.x}
                    y={child.y}
                    width={childProps.width || 100}
                    height={childProps.height || 100}
                    fill={childProps.fill || '#F1F5F9'}
                    stroke={childProps.stroke}
                    strokeWidth={childProps.strokeWidth || 0}
                    cornerRadius={childProps.cornerRadius || 0}
                  />
                );
              }
            })}
          </Group>
        );
      }
      case 'dynamicPanel': {
        const width = activeProps.width || 300;
        const height = activeProps.height || 200;
        const states = shape.states || [];
        const activeStateId = shape.activeStateId || (states[0]?.id);
        const activeState = states.find(s => s.id === activeStateId) || states[0];
        
        return (
          <Group
            scaleX={activeProps.scale || 1}
            scaleY={activeProps.scale || 1}
            x={shape.x}
            y={shape.y}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDragStart={shapeProps.onDragStart}
            onDragMove={(e) => {
              const rawX = e.target.x();
              const rawY = e.target.y();
              const snapped = applySnap({ ...shape, x: rawX, y: rawY }, shapes, snapToGrid);
              onChange({ ...shape, x: snapped.x, y: snapped.y });
              e.target.x(snapped.x);
              e.target.y(snapped.y);
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x(), y: e.target.y() });
              onDragEnd?.();
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            <Rect
              ref={shapeRef}
              x={0}
              y={0}
              width={width}
              height={height}
              fill={activeProps.fill}
              stroke={activeProps.stroke}
              strokeWidth={activeProps.strokeWidth}
              cornerRadius={activeProps.cornerRadius}
              opacity={activeProps.opacity}
            />
            {isSelected && (
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="transparent"
                stroke="#0891B2"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )}
            {activeState?.children?.map((child) => {
              const childProps = child.props || {};
              const childType = child.id?.split('-')[0];
              const isChildSelected = selectedChildId === child.id;
              
              const handleChildClick = (e) => {
                e.cancelBubble = true;
                onSelectChild?.(child.id);
                onSelect?.(shape.id);
              };

              const handleChildDragStart = (e) => {
                e.cancelBubble = true;
                onSelectChild?.(child.id);
                onSelect?.(shape.id);
              };
              
              const handleChildDragMove = (e) => {
                e.cancelBubble = true;
                const newX = e.target.x();
                const newY = e.target.y();

                onChange(prev => {
                  const prevStates = prev.states || [];
                  const newStates = prevStates.map(state => {
                    if (state.id !== prev.activeStateId) return state;
                    return {
                      ...state,
                      children: (state.children || []).map(c => {
                        if (c.id !== child.id) return c;
                        return { ...c, x: newX, y: newY };
                      }),
                    };
                  });
                  return { ...prev, states: newStates };
                });
              };

              const handleChildDragEnd = (e) => {
                e.cancelBubble = true;
                const newX = e.target.x();
                const newY = e.target.y();

                onChange(prev => {
                  const prevStates = prev.states || [];
                  const newStates = prevStates.map(state => {
                    if (state.id !== prev.activeStateId) return state;
                    return {
                      ...state,
                      children: (state.children || []).map(c => {
                        if (c.id !== child.id) return c;
                        return { ...c, x: newX, y: newY };
                      }),
                    };
                  });
                  return { ...prev, states: newStates };
                });
                onDragEnd?.();
              };
              
              if (childType === 'circle') {
                const radius = childProps.radius || 40;
                if (childProps.radiusY !== undefined) {
                  return (
                    <Group key={child.id}>
                      <Ellipse
                        x={child.x}
                        y={child.y}
                        radiusX={radius}
                        radiusY={childProps.radiusY}
                        fill={childProps.fill || '#F1F5F9'}
                        stroke={isChildSelected ? '#0891B2' : childProps.stroke}
                        strokeWidth={isChildSelected ? 2 : (childProps.strokeWidth || 0)}
                        draggable
                        onClick={handleChildClick}
                        onTap={handleChildClick}
                        onDragStart={handleChildDragStart}
                        onDragMove={handleChildDragMove}
                        onDragEnd={handleChildDragEnd}
                      />
                      {isChildSelected && (
                        <Rect
                          x={child.x - radius - 2}
                          y={child.y - childProps.radiusY - 2}
                          width={radius * 2 + 4}
                          height={childProps.radiusY * 2 + 4}
                          stroke="#0891B2"
                          strokeWidth={1}
                          dash={[4, 4]}
                          fill="transparent"
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                }
                return (
                  <Group key={child.id}>
                    <Circle
                      x={child.x}
                      y={child.y}
                      radius={radius}
                      fill={childProps.fill || '#F1F5F9'}
                      stroke={isChildSelected ? '#0891B2' : childProps.stroke}
                      strokeWidth={isChildSelected ? 2 : (childProps.strokeWidth || 0)}
                      draggable
                      onClick={handleChildClick}
                      onTap={handleChildClick}
                      onDragStart={handleChildDragStart}
                      onDragMove={handleChildDragMove}
                      onDragEnd={handleChildDragEnd}
                    />
                    {isChildSelected && (
                      <Rect
                        x={child.x - radius - 2}
                        y={child.y - radius - 2}
                        width={radius * 2 + 4}
                        height={radius * 2 + 4}
                        stroke="#0891B2"
                        strokeWidth={1}
                        dash={[4, 4]}
                        fill="transparent"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              } else if (childType === 'text') {
                const textWidth = childProps.width || 150;
                const fontSize = childProps.fontSize || 16;
                const textHeight = fontSize * 1.4;
                return (
                  <Group key={child.id}>
                    <Text
                      x={child.x}
                      y={child.y}
                      text={childProps.text || '文本'}
                      fontSize={fontSize}
                      fontFamily={childProps.fontFamily || 'Inter'}
                      fill={childProps.fill || '#0F172A'}
                      width={textWidth}
                      draggable
                      onClick={handleChildClick}
                      onTap={handleChildClick}
                      onDragStart={handleChildDragStart}
                      onDragMove={handleChildDragMove}
                      onDragEnd={handleChildDragEnd}
                    />
                    {isChildSelected && (
                      <Rect
                        x={child.x - 2}
                        y={child.y - 2}
                        width={textWidth + 4}
                        height={textHeight + 4}
                        stroke="#0891B2"
                        strokeWidth={1}
                        dash={[4, 4]}
                        fill="transparent"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              } else {
                const childWidth = childProps.width || 100;
                const childHeight = childProps.height || 100;
                return (
                  <Group key={child.id}>
                    <Rect
                      x={child.x}
                      y={child.y}
                      width={childWidth}
                      height={childHeight}
                      fill={childProps.fill || '#F1F5F9'}
                      stroke={isChildSelected ? '#0891B2' : childProps.stroke}
                      strokeWidth={isChildSelected ? 2 : (childProps.strokeWidth || 0)}
                      cornerRadius={childProps.cornerRadius || 0}
                      draggable
                      onClick={handleChildClick}
                      onTap={handleChildClick}
                      onDragStart={handleChildDragStart}
                      onDragMove={handleChildDragMove}
                      onDragEnd={handleChildDragEnd}
                    />
                    {isChildSelected && (
                      <Rect
                        x={child.x - 2}
                        y={child.y - 2}
                        width={childWidth + 4}
                        height={childHeight + 4}
                        stroke="#0891B2"
                        strokeWidth={1}
                        dash={[4, 4]}
                        fill="transparent"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              }
            })}
            <Text
              x={8}
              y={height - 20}
              text={`${activeState?.name || '无状态'} (${states.findIndex(s => s.id === activeStateId) + 1}/${states.length})`}
              fontSize={11}
              fontFamily="Inter"
              fill="#64748B"
              listening={false}
            />
          </Group>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && !isMultiSelected && shape.type !== 'arrow' && (
        <ResizeHandles
          shape={shape}
          onResize={handleResize}
          onResizeEnd={onResizeEnd}
          onRotate={handleRotate}
          onRotateEnd={onRotateEnd}
          stageRef={stageRef}
        />
      )}
      {(isSelected || isHovered) && !isPreviewMode && isConnectionMode && !isMultiSelected && shape.type !== 'line' && shape.type !== 'arrow' && (
        <ConnectionHandles 
          shape={shape} 
          onHandleMouseDown={onHandleMouseDown} 
        />
      )}
    </>
  );
}

function SelectionRectangle({ startPos, currentPos }) {
  if (!startPos || !currentPos) return null;

  const x = Math.min(startPos.x, currentPos.x);
  const y = Math.min(startPos.y, currentPos.y);
  const width = Math.abs(currentPos.x - startPos.x);
  const height = Math.abs(currentPos.y - startPos.y);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(8, 145, 178, 0.1)"
      stroke="#0891B2"
      strokeWidth={1}
      dash={[4, 4]}
      listening={false}
    />
  );
}

function MultiSelectionHandles({ shapes, selectedIds, onShapesChange, onSaveToHistory, stageRef, snapToGrid }) {
  const startPosRef = useRef(null);
  const startShapesRef = useRef(null);
  const handleRef = useRef(null);

  if (!selectedIds || selectedIds.length < 2) return null;

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  if (selectedShapes.length < 2) return null;

  // 计算所有选中组件的边界框
  const getMultiSelectionBounds = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedShapes.forEach(shape => {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const bounds = getMultiSelectionBounds();

  const handleDragStart = (e) => {
    const node = e.target;
    startPosRef.current = { x: node.x(), y: node.y() };
    startShapesRef.current = selectedShapes.map(s => ({ ...s, props: { ...s.props } }));
  };

  const handleDragMove = (e) => {
    if (!startPosRef.current || !startShapesRef.current) return;

    const node = e.target;
    let dx = node.x() - startPosRef.current.x;
    let dy = node.y() - startPosRef.current.y;

    // 计算移动后的多选包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    startShapesRef.current.forEach(s => {
      const b = getShapeBounds({ ...s, x: s.x + dx, y: s.y + dy });
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });
    const moveBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

    // 吸附（由 snapToGrid 统一控制）
    if (snapToGrid) {
      const otherShapes = shapes.filter(s => !selectedIds.includes(s.id));
      const snap = computeSnapGuides(moveBounds, otherShapes, null);
      if (snap.dx !== 0 || snap.dy !== 0) {
        dx += snap.dx;
        dy += snap.dy;
      } else {
        const snappedX = Math.round(moveBounds.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(moveBounds.y / GRID_SIZE) * GRID_SIZE;
        dx += snappedX - moveBounds.x;
        dy += snappedY - moveBounds.y;
      }
    }

    onShapesChange(prev => {
      return prev.map(shape => {
        const startShape = startShapesRef.current.find(s => s.id === shape.id);
        if (!startShape) return shape;

        return {
          ...shape,
          x: startShape.x + dx,
          y: startShape.y + dy,
        };
      });
    });
  };

  const handleDragEnd = (e) => {
    const node = e.target;
    node.position({ x: 0, y: 0 });
    startPosRef.current = null;
    startShapesRef.current = null;
    onSaveToHistory?.();
  };

  const handleResizeStart = (e, handlePos) => {
    e.cancelBubble = true;
    const stage = stageRef.current;
    if (!stage) return;

    stage.listening(false);
    handleRef.current = handlePos;

    const stagePos = stage.getPointerPosition();
    const stageScale = stage.scaleX();
    const stagePosition = { x: stage.x(), y: stage.y() };

    startPosRef.current = {
      x: (stagePos.x - stagePosition.x) / stageScale,
      y: (stagePos.y - stagePosition.y) / stageScale,
    };
    startShapesRef.current = selectedShapes.map(s => ({ ...s, props: { ...s.props } }));

    const handleResizeMove = () => {
      if (!startPosRef.current || !startShapesRef.current || !handleRef.current) return;

      const currentStagePos = stage.getPointerPosition();
      if (!currentStagePos) return;

      const currentPos = {
        x: (currentStagePos.x - stagePosition.x) / stageScale,
        y: (currentStagePos.y - stagePosition.y) / stageScale,
      };

      const dx = currentPos.x - startPosRef.current.x;
      const dy = currentPos.y - startPosRef.current.y;

      let newX = bounds.x;
      let newY = bounds.y;
      let newWidth = bounds.width;
      let newHeight = bounds.height;

      switch (handleRef.current) {
        case 'nw':
          newX = bounds.x + dx;
          newY = bounds.y + dy;
          newWidth = bounds.width - dx;
          newHeight = bounds.height - dy;
          break;
        case 'n':
          newY = bounds.y + dy;
          newHeight = bounds.height - dy;
          break;
        case 'ne':
          newY = bounds.y + dy;
          newWidth = bounds.width + dx;
          newHeight = bounds.height - dy;
          break;
        case 'e':
          newWidth = bounds.width + dx;
          break;
        case 'se':
          newWidth = bounds.width + dx;
          newHeight = bounds.height + dy;
          break;
        case 's':
          newHeight = bounds.height + dy;
          break;
        case 'sw':
          newX = bounds.x + dx;
          newWidth = bounds.width - dx;
          newHeight = bounds.height + dy;
          break;
        case 'w':
          newX = bounds.x + dx;
          newWidth = bounds.width - dx;
          break;
      }

      if (newWidth < 10) {
        newWidth = 10;
        newX = bounds.x;
      }
      if (newHeight < 10) {
        newHeight = 10;
        newY = bounds.y;
      }

      const scaleX = newWidth / bounds.width;
      const scaleY = newHeight / bounds.height;

      onShapesChange(prev => {
        return prev.map(shape => {
          const startShape = startShapesRef.current.find(s => s.id === shape.id);
          if (!startShape) return shape;

          const relX = (startShape.x - bounds.x) / bounds.width;
          const relY = (startShape.y - bounds.y) / bounds.height;

          const newShape = {
            ...shape,
            x: newX + relX * newWidth,
            y: newY + relY * newHeight,
            props: { ...shape.props },
          };

          if (shape.type === 'circle') {
            const startProps = startShape.props || {};
            const radiusX = (startProps.radius || 40) * scaleX;
            const radiusY = (startProps.radiusY || startProps.radius || 40) * scaleY;
            newShape.props.radius = radiusX;
            newShape.props.radiusY = radiusY;
          } else if (shape.type === 'text') {
            const startProps = startShape.props || {};
            newShape.props.width = (startProps.width || 150) * scaleX;
            newShape.props.fontSize = Math.max(8, (startProps.fontSize || 16) * Math.min(scaleX, scaleY));
          } else if (shape.type !== 'line' && shape.type !== 'arrow') {
            const startProps = startShape.props || {};
            newShape.props.width = (startProps.width || 100) * scaleX;
            newShape.props.height = (startProps.height || 100) * scaleY;
          }

          return newShape;
        });
      });
    };

    const handleResizeEnd = () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      stage.listening(true);
      handleRef.current = null;
      startPosRef.current = null;
      startShapesRef.current = null;
      onSaveToHistory?.();
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handles = [
    { pos: 'nw', hx: bounds.x, hy: bounds.y, cursor: 'nw-resize' },
    { pos: 'n', hx: bounds.x + bounds.width / 2, hy: bounds.y, cursor: 'n-resize' },
    { pos: 'ne', hx: bounds.x + bounds.width, hy: bounds.y, cursor: 'ne-resize' },
    { pos: 'e', hx: bounds.x + bounds.width, hy: bounds.y + bounds.height / 2, cursor: 'e-resize' },
    { pos: 'se', hx: bounds.x + bounds.width, hy: bounds.y + bounds.height, cursor: 'se-resize' },
    { pos: 's', hx: bounds.x + bounds.width / 2, hy: bounds.y + bounds.height, cursor: 's-resize' },
    { pos: 'sw', hx: bounds.x, hy: bounds.y + bounds.height, cursor: 'sw-resize' },
    { pos: 'w', hx: bounds.x, hy: bounds.y + bounds.height / 2, cursor: 'w-resize' },
  ];

  return (
    <Group>
      {/* 多选边界框 */}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        stroke="#0891B2"
        strokeWidth={1}
        dash={[4, 4]}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
      {/* 缩放手柄 */}
      {handles.map(({ pos, hx, hy }) => (
        <Rect
          key={pos}
          x={hx - HANDLE_SIZE / 2}
          y={hy - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="white"
          stroke="#0891B2"
          strokeWidth={1}
          onMouseDown={(e) => handleResizeStart(e, pos)}
        />
      ))}
    </Group>
  );
}

const Canvas = forwardRef(function Canvas({
  shapes,
  setShapes,
  selectedId,
  setSelectedId,
  selectedIds,
  setSelectedIds,
  onDrop,
  onUpdateShape,
  onSaveToHistory,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  snapToGrid,
  showGuides,
  onExecuteInteraction,
  onClearPendingForShape,
  onRegisterTimeout,
  isPreviewMode,
  isConnectionMode,
  variables,
  onAddToChat,
}, ref) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [drawingConnection, setDrawingConnection] = useState(null);
  const [editingShape, setEditingShape] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedChildId, setSelectedChildId] = useState(null);
  const lastPosRef = useRef(null);
  const editInputRef = useRef(null);
  const draggingSliderRef = useRef(null); // 跟踪滑块拖拽 { shapeId, shapeX, width }

  const layerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getLayer: () => layerRef.current
  }));

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setCanvasSize({ width: clientWidth, height: clientHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setScale(clampedScale);
    setPosition(newPos);
  }, [scale, position]);

  const handleMouseDown = useCallback((e) => {
    if (isPreviewMode) return; // 演示模式下禁用框选和拖拽画布
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      setIsPanning(true);
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    } else if (e.evt.button === 0) {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedChildId(null);

        // 开始框选
        const stage = stageRef.current;
        if (stage) {
          const pos = stage.getPointerPosition();
          const adjustedPos = {
            x: (pos.x - position.x) / scale,
            y: (pos.y - position.y) / scale,
          };
          setIsSelecting(true);
          setSelectionStart(adjustedPos);
          setSelectionEnd(adjustedPos);
        }
      }
    }
  }, [setSelectedId, setSelectedIds, position, scale, isPreviewMode]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning && lastPosRef.current) {
      const dx = e.evt.clientX - lastPosRef.current.x;
      const dy = e.evt.clientY - lastPosRef.current.y;

      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    }

    if (isSelecting) {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        const adjustedPos = {
          x: (pos.x - position.x) / scale,
          y: (pos.y - position.y) / scale,
        };
        setSelectionEnd(adjustedPos);
      }
    }

    if (drawingConnection) {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        const adjustedPos = {
          x: (pos.x - position.x) / scale,
          y: (pos.y - position.y) / scale,
        };
        setDrawingConnection(prev => ({ ...prev, currentPos: adjustedPos }));
      }
    }

    // 滑块拖拽
    if (draggingSliderRef.current && isPreviewMode) {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const { shapeId, shapeX, width } = draggingSliderRef.current;
          const adjustedX = (pos.x - position.x) / scale;
          const relX = adjustedX - shapeX;
          const newValue = Math.max(0, Math.min(100, (relX / width) * 100));
          setShapes(prev => prev.map(s =>
            s.id === shapeId
              ? { ...s, props: { ...s.props, value: Math.round(newValue) } }
              : s
          ));
        }
      }
    }
  }, [isPanning, isSelecting, drawingConnection, position, scale, isPreviewMode]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    lastPosRef.current = null;

    if (isSelecting && selectionStart && selectionEnd) {
      const selRect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      };

      if (selRect.width > 5 && selRect.height > 5) {
        const selected = shapes.filter(shape => {
          const bounds = getShapeBounds(shape);
          return (
            bounds.x >= selRect.x &&
            bounds.y >= selRect.y &&
            bounds.x + bounds.width <= selRect.x + selRect.width &&
            bounds.y + bounds.height <= selRect.y + selRect.height
          );
        });

        if (selected.length > 0) {
          setSelectedIds(selected.map(s => s.id));
          setSelectedId(selected[0].id);
        }
      }
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);

    if (drawingConnection) {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        const adjustedPos = {
          x: (pos.x - position.x) / scale,
          y: (pos.y - position.y) / scale,
        };

        // Find the closest handle
        let closestHandle = null;
        let minDistance = 40; // Snap threshold for handle

        shapes.forEach(shape => {
          if (shape.id === drawingConnection.startShapeId) return;
          if (shape.type === 'line' || shape.type === 'arrow') return;

          const handles = ['top', 'right', 'bottom', 'left'];
          handles.forEach(handle => {
            const hPos = getHandlePosition(shape, handle);
            const dist = Math.hypot(hPos.x - adjustedPos.x, hPos.y - adjustedPos.y);
            if (dist < minDistance) {
              minDistance = dist;
              closestHandle = { shapeId: shape.id, handle };
            }
          });
        });

        if (closestHandle) {
          // create arrow shape
          const newArrow = {
            id: `arrow-${Date.now()}`,
            type: 'arrow',
            x: 0,
            y: 0,
            props: {
              points: [
                drawingConnection.startPos.x,
                drawingConnection.startPos.y,
                adjustedPos.x,
                adjustedPos.y
              ],
              stroke: '#64748B',
              strokeWidth: 2,
            },
            startBinding: { shapeId: drawingConnection.startShapeId, handle: drawingConnection.startHandlePos },
            endBinding: { shapeId: closestHandle.shapeId, handle: closestHandle.handle },
          };
          
          setShapes(prev => {
            const newShapes = [...prev, newArrow];
            onSaveToHistory?.(newShapes);
            return newShapes;
          });
        }
      }
      setDrawingConnection(null);
    }

    // 滑块拖拽结束：触发 onChange 交互
    if (draggingSliderRef.current) {
      const { shapeId } = draggingSliderRef.current;
      draggingSliderRef.current = null;
      const sliderShape = shapes.find(s => s.id === shapeId);
      if (sliderShape?.interactions) {
        sliderShape.interactions.forEach(interaction => {
          if (interaction.trigger === 'onChange') {
            onExecuteInteraction?.(interaction);
          }
        });
      }
    }
  }, [isSelecting, selectionStart, selectionEnd, shapes, drawingConnection, position, scale, setSelectedId, setSelectedIds, setShapes, onSaveToHistory, onExecuteInteraction]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleConnectionMouseDown = useCallback((shapeId, handlePos, pos) => {
    setDrawingConnection({
      startShapeId: shapeId,
      startHandlePos: handlePos,
      startPos: pos,
      currentPos: pos
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('component');
    if (!data) return;

    const component = JSON.parse(data);
    const rect = containerRef.current.getBoundingClientRect();
    let x = (e.clientX - rect.left - position.x) / scale;
    let y = (e.clientY - rect.top - position.y) / scale;

    if (snapToGrid) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    onDrop(component, x, y);
  }, [onDrop, position, scale, snapToGrid]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (shapes.length === 0) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    const scaleX = canvasSize.width / contentWidth;
    const scaleY = canvasSize.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 2);

    setScale(newScale);
    setPosition({
      x: (canvasSize.width - contentWidth * newScale) / 2 - minX * newScale + 50,
      y: (canvasSize.height - contentHeight * newScale) / 2 - minY * newScale + 50,
    });
  }, [shapes, canvasSize]);

  const handleKeyDown = useCallback((e) => {
    // 检查事件是否发生在输入框、文本域内或被选中的文本
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable ||
        window.getSelection().toString().length > 0) {
      
      // 如果按下了 Ctrl+C 且有选中文本，让浏览器原生处理复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && window.getSelection().toString().length > 0) {
        return;
      }
      
      // 如果只是在输入框中，不拦截
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') {
        e.preventDefault();
        onCopy?.();
      }
      if (e.key === 'v') {
        e.preventDefault();
        onPaste?.();
      }
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      }
      if (e.key === 'y') {
        e.preventDefault();
        onRedo?.();
      }
      if (e.key === 'a') {
        e.preventDefault();
        setSelectedIds(shapes.map(s => s.id));
        if (shapes.length > 0) {
          setSelectedId(shapes[0].id);
        }
      }
    }

    // 方向键微调位置
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const delta = {
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
      }[e.key];

      setShapes(prev => {
        const newShapes = prev.map(s =>
          s.id === selectedId
            ? { ...s, x: s.x + delta.x, y: s.y + delta.y }
            : s
        );
        onSaveToHistory?.(newShapes);
        return newShapes;
      });
    }
  }, [selectedId, shapes, setShapes, setSelectedId, setSelectedIds, onCopy, onPaste, onUndo, onRedo, onSaveToHistory]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 双击编辑文本
  const handleDoubleClick = useCallback((shape) => {
    setEditingShape(shape);
    setEditText(shape.props.text || '');
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }, []);

  // 完成编辑
  const handleFinishEdit = useCallback(() => {
    if (editingShape) {
      const newShape = {
        ...editingShape,
        props: {
          ...editingShape.props,
          text: editText,
        },
      };
      setShapes((prev) => {
        const newShapes = prev.map((s) => (s.id === newShape.id ? newShape : s));
        onSaveToHistory?.(newShapes);
        return newShapes;
      });
      onUpdateShape?.(newShape);
    }
    setEditingShape(null);
    setEditText('');
  }, [editingShape, editText, setShapes, onUpdateShape, onSaveToHistory]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingShape(null);
    setEditText('');
  }, []);

  // 编辑框的样式
  const getEditInputStyle = () => {
    if (!editingShape) return { display: 'none' };

    const bounds = getShapeBounds(editingShape);
    const isInputOrButton = editingShape.id.startsWith('input') || editingShape.id.startsWith('button');
    const isInput = editingShape.id.startsWith('input');
    const isTextType = editingShape.type === 'text';
    const isCircle = editingShape.type === 'circle';
    
    // HEAD 版本的颜色逻辑
    const textColor = isTextType
      ? (editingShape.props.fill || '#0F172A')
      : (editingShape.props.textColor || '#0F172A');

    const fontWeight = editingShape.props.fontWeight || '400';
    const fontStyle = editingShape.props.fontStyle || 'normal';
    const textDecoration = editingShape.props.textDecoration || 'none';
    const rotation = editingShape.rotation || 0;
    const fontSize = editingShape.props.fontSize || 16;
    const lineHeight = editingShape.props.lineHeight || 1.4;
    const inputPadding = isInput ? 12 : 0;

    // HEAD 版本的尺寸计算逻辑
    const borderOffset = 8; // 为 resize handles 留出空间
    
    // 根据组件类型计算宽度和高度
    let componentWidth, componentHeight;
    if (isCircle) {
      const radius = editingShape.props.radius || 40;
      const radiusY = editingShape.props.radiusY !== undefined ? editingShape.props.radiusY : radius;
      componentWidth = radius * 2;
      componentHeight = radiusY * 2;
    } else if (isTextType) {
      componentWidth = editingShape.props.width || 150;
      componentHeight = fontSize * lineHeight;
    } else {
      // rect 类型（包括 button、rectangle、input）
      componentWidth = editingShape.props.width || 150;
      componentHeight = editingShape.props.height || 40;
    }

    const width = componentWidth * scale - borderOffset * 2;
    const height = componentHeight * scale - borderOffset * 2;

    // HEAD 版本的对齐方式逻辑
    let textAlign = 'center';
    if (isInput) {
      textAlign = editingShape.props.textAlign || 'left';
    } else if (isTextType) {
      textAlign = editingShape.props.align || 'left';
    }

    // HEAD 版本的垂直居中 padding 逻辑
    const scaledFontSize = fontSize * scale;
    const textHeight = scaledFontSize * lineHeight;
    const verticalPadding = isInput ? inputPadding * scale : Math.max(0, (height - textHeight) / 2);

    return {
      position: 'absolute',
      left: bounds.x * scale + position.x + borderOffset,
      top: bounds.y * scale + position.y + borderOffset,
      width: width,
      height: height,
      fontSize: `${scaledFontSize}px`,
      fontFamily: editingShape.props.fontFamily || 'Inter',
      color: textColor,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      textDecoration: textDecoration,
      textAlign: textAlign,
      border: 'none',
      borderRadius: isInput ? `${8 * scale}px` : (isCircle ? `${width / 2}px` : '0'),
      padding: `${verticalPadding}px ${inputPadding * scale}px`,
      outline: 'none',
      background: isInputOrButton ? (isInput ? 'white' : 'transparent') : 'transparent',
      zIndex: 1000,
      resize: 'none',
      overflow: 'hidden',
      lineHeight: `${lineHeight}`,
      boxSizing: 'border-box',
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
    };
  };

  const getSelectionActionBounds = () => {
    // 组组件也使用 actionBounds
    const hasSelection = (selectedIds && selectedIds.length > 0) || selectedId;
    if (!hasSelection) return null;
    
    // 如果是单选
    if (selectedIds?.length <= 1 && selectedId) {
      const singleShape = shapes.find(s => s.id === selectedId);
      if (singleShape) {
        if (singleShape.type === 'arrow' || singleShape.type === 'line') return null;
        return getShapeBounds(singleShape);
      }
    }
    
    // 多选
    const selectedShapes = shapes.filter(s => selectedIds.includes(s.id) && s.type !== 'arrow' && s.type !== 'line');
    if (selectedShapes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedShapes.forEach(shape => {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const actionBounds = getSelectionActionBounds();
  const selectedShape = shapes.find(s => s.id === selectedId);

  return (
    <div
      className="canvas-wrapper"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        className="canvas-stage"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <Layer ref={layerRef}>
          {showGuides && (
            <AlignmentGuides
              shapes={shapes}
              selectedId={selectedId}
              multiSelectedIds={selectedIds}
            />
          )}
          {/* 首先渲染箭头，确保它们在底层 */}
          {shapes.filter(s => s.visible !== false && s.type === 'arrow').map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              shapes={shapes}
              isSelected={shape.id === selectedId || selectedIds?.includes(shape.id)}
              isMultiSelected={selectedIds?.length > 1}
              isEditing={editingShape?.id === shape.id}
              onSelect={setSelectedId}
              onSelectMultiple={(id) => {
                setSelectedIds((prev) => {
                  if (prev.includes(id)) return prev.filter((i) => i !== id);
                  return [...prev, id];
                });
              }}
              onChange={(newShapeOrFn) => {
                setShapes((prev) => {
                  if (typeof newShapeOrFn === 'function') {
                    const currentShape = prev.find(s => s.id === shape.id);
                    const newShape = newShapeOrFn(currentShape);
                    return prev.map((s) => (s.id === newShape.id ? newShape : s));
                  }
                  return prev.map((s) => (s.id === newShapeOrFn.id ? newShapeOrFn : s));
                });
              }}
              onDragEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onResizeEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onRotateEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onDoubleClick={handleDoubleClick}
              stageRef={stageRef}
              onExecuteInteraction={onExecuteInteraction}
              onClearPendingForShape={onClearPendingForShape}
              onRegisterTimeout={onRegisterTimeout}
              isPreviewMode={isPreviewMode}
              isConnectionMode={isConnectionMode}
              variables={variables}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              onHandleMouseDown={handleConnectionMouseDown}
              snapToGrid={snapToGrid}
              showGuides={showGuides}
              onSliderDragStart={(shapeId, shapeX, width) => {
                draggingSliderRef.current = { shapeId, shapeX, width };
              }}
            />
          ))}
          {/* 然后渲染其他组件 */}
          {shapes.filter(s => s.visible !== false && s.type !== 'arrow').map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              shapes={shapes}
              isSelected={shape.id === selectedId || selectedIds?.includes(shape.id)}
              isMultiSelected={selectedIds?.length > 1}
              isEditing={editingShape?.id === shape.id}
              onSelect={setSelectedId}
              onSelectMultiple={(id) => {
                setSelectedIds((prev) => {
                  if (prev.includes(id)) {
                    return prev.filter((i) => i !== id);
                  }
                  return [...prev, id];
                });
              }}
              onChange={(newShapeOrFn) => {
                setShapes((prev) => {
                  if (typeof newShapeOrFn === 'function') {
                    const currentShape = prev.find(s => s.id === shape.id);
                    const newShape = newShapeOrFn(currentShape);
                    return prev.map((s) => (s.id === newShape.id ? newShape : s));
                  }
                  return prev.map((s) => (s.id === newShapeOrFn.id ? newShapeOrFn : s));
                });
              }}
              onDragEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onResizeEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onRotateEnd={() => {
                setShapes((prev) => {
                  onSaveToHistory?.(prev);
                  return prev;
                });
              }}
              onDoubleClick={handleDoubleClick}
              stageRef={stageRef}
              onExecuteInteraction={onExecuteInteraction}
              onClearPendingForShape={onClearPendingForShape}
              onRegisterTimeout={onRegisterTimeout}
              isPreviewMode={isPreviewMode}
              isConnectionMode={isConnectionMode}
              variables={variables}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              onHandleMouseDown={handleConnectionMouseDown}
              snapToGrid={snapToGrid}
              showGuides={showGuides}
              onSliderDragStart={(shapeId, shapeX, width) => {
                draggingSliderRef.current = { shapeId, shapeX, width };
              }}
            />
          ))}
          {/* 将箭头的渲染提前，让组件显示在箭头上方，或者通过zIndex控制。为了避免选中框被覆盖，把绘制箭头逻辑放这里 */}
          <SelectionRectangle startPos={selectionStart} currentPos={selectionEnd} />
          {drawingConnection && (
            <Arrow
              points={[
                drawingConnection.startPos.x,
                drawingConnection.startPos.y,
                drawingConnection.currentPos.x,
                drawingConnection.currentPos.y
              ]}
              stroke="#64748B"
              strokeWidth={2}
              pointerLength={10}
              pointerWidth={10}
              fill="#64748B"
              listening={false}
            />
          )}
          <MultiSelectionHandles
            shapes={shapes}
            selectedIds={selectedIds}
            onShapesChange={setShapes}
            onSaveToHistory={onSaveToHistory}
            stageRef={stageRef}
            snapToGrid={snapToGrid}
          />
        </Layer>
      </Stage>

      {/* 内联文本编辑器 */}
      {editingShape && (
        <textarea
          ref={editInputRef}
          className="inline-text-editor"
          style={getEditInputStyle()}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleFinishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFinishEdit();
            }
            if (e.key === 'Escape') {
              handleCancelEdit();
            }
            e.stopPropagation();
          }}
        />
      )}

      <div className="zoom-controls">
        <button onClick={handleZoomOut} title="缩小 (Ctrl+-)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} title="放大 (Ctrl++)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button onClick={handleResetZoom} title="重置缩放">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <div className="zoom-divider" />
        <button onClick={handleFitToScreen} title="适应屏幕">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>

      {selectedShape && (
        <div className="shape-info">
          <span>{Math.round(selectedShape.x)}, {Math.round(selectedShape.y)}</span>
          <span className="info-separator">|</span>
          <span>
            {Math.round(selectedShape.props.width || selectedShape.props.radius * 2 || 0)} × {Math.round(selectedShape.props.height || selectedShape.props.radius * 2 || 0)}
          </span>
          {selectedShape.rotation ? (
            <>
              <span className="info-separator">|</span>
              <span>{Math.round(selectedShape.rotation)}°</span>
            </>
          ) : null}
        </div>
      )}

      {actionBounds && (
        <button
          className="add-to-chat-btn"
          style={{
            position: 'absolute',
            left: `${actionBounds.x * scale + position.x}px`,
            top: `${actionBounds.y * scale + position.y - 30}px`,
            zIndex: 100,
            padding: '4px 8px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onClick={() => onAddToChat?.(selectedIds?.length > 1 ? selectedIds : [selectedId])}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          添加到对话
        </button>
      )}
    </div>
  );
});

export default Canvas;
