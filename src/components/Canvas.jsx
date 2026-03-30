import { Stage, Layer, Rect, Circle, Ellipse, Line, Text, RegularPolygon, Transformer, Group } from 'react-konva';
import { useCallback, useRef, useState, useEffect } from 'react';
import './Canvas.css';

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 20;
const SNAP_THRESHOLD = 5;
const GRID_SIZE = 10;

function getShapeBounds(shape) {
  const { x, y, props, type } = shape;
  let width, height, boundsX, boundsY;

  if (type === 'circle') {
    const radius = props.radius || 40;
    width = radius * 2;
    height = width;
    // Circle的x,y是圆心，需要转换为左上角
    boundsX = x - radius;
    boundsY = y - radius;
  } else if (type === 'line') {
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

function AlignmentGuides({ shapes, selectedId }) {
  if (!selectedId) {
    return null;
  }

  const selected = shapes.find(s => s.id === selectedId);
  if (!selected) {
    return null;
  }

  const guides = (() => {

    const selectedBounds = getShapeBounds(selected);
    const selectedCenterX = selectedBounds.x + selectedBounds.width / 2;
    const selectedCenterY = selectedBounds.y + selectedBounds.height / 2;
    const selectedRight = selectedBounds.x + selectedBounds.width;
    const selectedBottom = selectedBounds.y + selectedBounds.height;

    const verticalGuides = [];
    const horizontalGuides = [];

    shapes.forEach(shape => {
      if (shape.id === selectedId) return;

      const bounds = getShapeBounds(shape);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const right = bounds.x + bounds.width;
      const bottom = bounds.y + bounds.height;

      // 左边对齐
      if (Math.abs(selectedBounds.x - bounds.x) < SNAP_THRESHOLD) {
        verticalGuides.push(bounds.x);
      }
      // 右边对齐
      if (Math.abs(selectedBounds.x - right) < SNAP_THRESHOLD) {
        verticalGuides.push(right);
      }
      // 中心X对齐
      if (Math.abs(selectedCenterX - centerX) < SNAP_THRESHOLD) {
        verticalGuides.push(centerX);
      }
      // 右边对左边
      if (Math.abs(selectedRight - bounds.x) < SNAP_THRESHOLD) {
        verticalGuides.push(bounds.x);
      }

      // 上边对齐
      if (Math.abs(selectedBounds.y - bounds.y) < SNAP_THRESHOLD) {
        horizontalGuides.push(bounds.y);
      }
      // 下边对齐
      if (Math.abs(selectedBounds.y - bottom) < SNAP_THRESHOLD) {
        horizontalGuides.push(bottom);
      }
      // 中心Y对齐
      if (Math.abs(selectedCenterY - centerY) < SNAP_THRESHOLD) {
        horizontalGuides.push(centerY);
      }
      // 下边对上边
      if (Math.abs(selectedBottom - bounds.y) < SNAP_THRESHOLD) {
        horizontalGuides.push(bounds.y);
      }
    });

    return {
      vertical: [...new Set(verticalGuides)],
      horizontal: [...new Set(horizontalGuides)],
    };
  })();

  return (
    <>
      {guides.vertical.map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[x, -10000, x, 10000]}
          stroke="#FF6B6B"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
      {guides.horizontal.map((y, i) => (
        <Line
          key={`h-${i}`}
          points={[-10000, y, 10000, y]}
          stroke="#FF6B6B"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
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

function ShapeRenderer({ shape, isSelected, isEditing, onSelect, onChange, onDragEnd, onResizeEnd, onRotateEnd, onDoubleClick, stageRef }) {
  const shapeRef = useRef(null);

  const shapeProps = {
    ...shape.props,
    x: shape.x,
    y: shape.y,
    draggable: true,
    onClick: (e) => {
      e.cancelBubble = true;
      onSelect(shape.id);
    },
    onTap: (e) => {
      e.cancelBubble = true;
      onSelect(shape.id);
    },
    onDblClick: (e) => {
      e.cancelBubble = true;
      if (shape.type === 'text' || shape.id.startsWith('input')) {
        onDoubleClick?.(shape);
      }
    },
    onDblTap: (e) => {
      e.cancelBubble = true;
      if (shape.type === 'text' || shape.id.startsWith('input')) {
        onDoubleClick?.(shape);
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
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'move';
    },
    onMouseLeave: (e) => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
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
        newProps.radius = Math.min(newBounds.width, newBounds.height) / 2;
        return {
          ...shape,
          x: newBounds.x + newProps.radius,
          y: newBounds.y + newProps.radius,
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
      } else if (shape.type !== 'line') {
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
      case 'rect':
        // 输入框类型需要显示内部文本
        if (shape.id.startsWith('input')) {
          const displayText = shape.props.text || shape.props.placeholder || '';
          const textColor = shape.props.textColor || '#0F172A';
          const isPlaceholder = !shape.props.text;
          const fontSize = shape.props.fontSize || 14;
          const padding = 12;
          const width = shape.props.width || 200;
          const height = shape.props.height || 40;
          const centerX = shape.x + width / 2;
          const centerY = shape.y + height / 2;

          // 根据对齐方式计算文本位置
          let textX = padding;
          let align = 'left';
          if (shape.props.textAlign === 'center') {
            textX = 0;
            align = 'center';
          } else if (shape.props.textAlign === 'right') {
            textX = 0;
            align = 'right';
          }

          // 使用Group包裹，支持旋转
          return (
            <Group
              x={centerX}
              y={centerY}
              rotation={rotation}
              draggable
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDblClick={shapeProps.onDblClick}
              onDblTap={shapeProps.onDblTap}
              onDragMove={(e) => {
                onChange({ ...shape, x: e.target.x() - width / 2, y: e.target.y() - height / 2 });
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
                fill={shape.props.fill}
                stroke={shape.props.stroke}
                strokeWidth={shape.props.strokeWidth}
                cornerRadius={shape.props.cornerRadius}
                opacity={shape.props.opacity}
              />
              {!isEditing && (
                <Text
                  text={displayText}
                  x={-width / 2 + textX}
                  y={-height / 2 + (height - fontSize) / 2}
                  width={align === 'left' ? width - padding * 2 : width}
                  fontSize={fontSize}
                  fontFamily={shape.props.fontFamily || 'Inter'}
                  fill={isPlaceholder ? '#94A3B8' : textColor}
                  fontStyle={shape.props.fontStyle === 'italic' ? 'italic' : 'normal'}
                  fontWeight={String(shape.props.fontWeight || '400')}
                  textDecoration={shape.props.textDecoration || 'none'}
                  align={align}
                  lineHeight={shape.props.lineHeight || 1.4}
                  listening={false}
                />
              )}
            </Group>
          );
        }
        // 普通矩形
        if (rotation) {
          return (
            <Group
              x={shape.x + shape.props.width / 2}
              y={shape.y + shape.props.height / 2}
              rotation={rotation}
              draggable
              onClick={shapeProps.onClick}
              onTap={shapeProps.onTap}
              onDragMove={(e) => {
                onChange({ ...shape, x: e.target.x() - shape.props.width / 2, y: e.target.y() - shape.props.height / 2 });
              }}
              onDragEnd={(e) => {
                onChange({ ...shape, x: e.target.x() - shape.props.width / 2, y: e.target.y() - shape.props.height / 2 });
              }}
              onMouseEnter={shapeProps.onMouseEnter}
              onMouseLeave={shapeProps.onMouseLeave}
            >
              <Rect
                ref={shapeRef}
                x={-shape.props.width / 2}
                y={-shape.props.height / 2}
                {...shape.props}
              />
            </Group>
          );
        }
        return <Rect ref={shapeRef} {...shapeProps} />;
      case 'circle':
        return <Circle ref={shapeRef} {...shapeProps} />;
      case 'triangle':
        return (
          <RegularPolygon
            ref={shapeRef}
            {...shapeProps}
            sides={3}
            radius={shape.props.width / 2 || 40}
          />
        );
      case 'line':
        return <Line ref={shapeRef} {...shapeProps} />;
      case 'text': {
        const textWidth = shape.props.width || 150;
        const fontSize = shape.props.fontSize || 16;
        const lineHeight = shape.props.lineHeight || 1.4;
        const textHeight = fontSize * lineHeight;
        const centerX = shape.x + textWidth / 2;
        const centerY = shape.y + textHeight / 2;
        // 使用Group包裹以支持正确的旋转
        return (
          <Group
            x={centerX}
            y={centerY}
            rotation={rotation}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDblClick={shapeProps.onDblClick}
            onDblTap={shapeProps.onDblTap}
            onDragMove={(e) => {
              onChange({ ...shape, x: e.target.x() - textWidth / 2, y: e.target.y() - textHeight / 2 });
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
                text={shape.props.text}
                width={textWidth}
                fontSize={fontSize}
                fontFamily={shape.props.fontFamily}
                fill={shape.props.fill}
                fontStyle={shape.props.fontStyle === 'italic' ? 'italic' : 'normal'}
                fontWeight={String(shape.props.fontWeight || '400')}
                textDecoration={shape.props.textDecoration || 'none'}
                align={shape.props.align || 'left'}
                lineHeight={lineHeight}
                opacity={shape.props.opacity}
              />
            )}
          </Group>
        );
      }
      case 'group': {
        // 渲染组内的子组件
        return (
          <Group
            x={shape.x}
            y={shape.y}
            draggable
            onClick={shapeProps.onClick}
            onTap={shapeProps.onTap}
            onDragMove={(e) => {
              onChange({ ...shape, x: e.target.x(), y: e.target.y() });
            }}
            onDragEnd={(e) => {
              onChange({ ...shape, x: e.target.x(), y: e.target.y() });
            }}
            onMouseEnter={shapeProps.onMouseEnter}
            onMouseLeave={shapeProps.onMouseLeave}
          >
            {/* 组的背景框（可选，用于可视化） */}
            <Rect
              ref={shapeRef}
              x={0}
              y={0}
              width={shape.props.width || 100}
              height={shape.props.height || 100}
              fill="transparent"
              stroke="#0891B2"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
            {/* 渲染子组件 */}
            {shape.children?.map((child) => {
              const childProps = child.props || {};
              const childType = child.id?.split('-')[0];
              
              if (childType === 'circle') {
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
      default:
        return null;
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && (
        <ResizeHandles
          shape={shape}
          onResize={handleResize}
          onResizeEnd={onResizeEnd}
          onRotate={handleRotate}
          onRotateEnd={onRotateEnd}
          stageRef={stageRef}
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

export default function Canvas({
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
}) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [editingShape, setEditingShape] = useState(null);
  const [editText, setEditText] = useState('');
  const lastPosRef = useRef(null);
  const editInputRef = useRef(null);

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
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      setIsPanning(true);
      lastPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    } else if (e.evt.button === 0) {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
        setSelectedIds([]);

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
  }, [setSelectedId, setSelectedIds, position, scale]);

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
  }, [isPanning, isSelecting, position, scale]);

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
  }, [isSelecting, selectionStart, selectionEnd, shapes, setSelectedId, setSelectedIds]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
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
    const isInput = editingShape.id.startsWith('input');
    const textColor = isInput
      ? (editingShape.props.textColor || '#0F172A')
      : (editingShape.props.fill || '#0F172A');

    const fontWeight = editingShape.props.fontWeight || '400';
    const fontStyle = editingShape.props.fontStyle || 'normal';
    const textDecoration = editingShape.props.textDecoration || 'none';
    const rotation = editingShape.rotation || 0;
    const fontSize = editingShape.props.fontSize || 16;
    const lineHeight = editingShape.props.lineHeight || 1.4;
    const padding = isInput ? 12 : 0;

    // 计算旋转中心点（相对于编辑框左上角）
    const borderOffset = 8; // 为 resize handles 留出空间
    const width = (editingShape.props.width || 150) * scale - borderOffset * 2;
    const height = (isInput ? (editingShape.props.height || 40) : fontSize * lineHeight) * scale - borderOffset * 2;

    return {
      position: 'absolute',
      left: bounds.x * scale + position.x + borderOffset,
      top: bounds.y * scale + position.y + borderOffset,
      width: width,
      height: height,
      fontSize: `${fontSize * scale}px`,
      fontFamily: editingShape.props.fontFamily || 'Inter',
      color: textColor,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      textDecoration: textDecoration,
      textAlign: editingShape.props.align || editingShape.props.textAlign || 'left',
      border: 'none',
      borderRadius: isInput ? `${8 * scale}px` : '0',
      padding: `${padding * scale}px`,
      outline: 'none',
      background: isInput ? 'white' : 'transparent',
      zIndex: 1000,
      resize: 'none',
      overflow: 'hidden',
      lineHeight: `${lineHeight}`,
      boxSizing: 'border-box',
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
    };
  };

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
        <Layer>
          {showGuides && (
            <AlignmentGuides
              shapes={shapes}
              selectedId={selectedId}
            />
          )}
          {shapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId || selectedIds?.includes(shape.id)}
              isEditing={editingShape?.id === shape.id}
              onSelect={setSelectedId}
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
            />
          ))}
          <SelectionRectangle startPos={selectionStart} currentPos={selectionEnd} />
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
    </div>
  );
}
