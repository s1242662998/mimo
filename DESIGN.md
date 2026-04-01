# 原型设计工具 - 设计标准文档

## 1. 项目概述

### 1.1 产品定位
- 基于 Web 的原型设计工具
- 支持拖拽式组件布局、画布缩放、层级管理
- 目标用户：UI/UX 设计师、产品经理、前端开发者

### 1.2 技术栈
| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18+ |
| 构建工具 | Vite | 8.x |
| 画布引擎 | react-konva / konva | 9.x |
| 语言 | JavaScript (JSX) | ES2022 |
| 样式 | CSS (原生) | - |

---

## 2. 设计系统

### 2.1 颜色规范

```css
:root {
  /* 主色调 */
  --color-primary: #0891B2;       /* 主色 - 青色，用于选中、高亮 */
  --color-primary-light: #22D3EE; /* 浅主色 */
  
  /* 中性色 */
  --color-bg: #FFFFFF;            /* 背景色 */
  --color-bg-canvas: #F8FAFC;     /* 画布背景 - 浅灰网格 */
  --color-secondary: #F1F5F9;     /* 次要背景 */
  --color-hover: #F1F5F9;         /* 悬停背景 */
  --color-active: #E0F2FE;        /* 选中/激活背景 */
  
  /* 功能色 */
  --color-cta: #22C55E;           /* 行动按钮 - 绿色 */
  
  /* 文字色 */
  --color-text: #0F172A;          /* 主文字 - 深色 */
  --color-text-muted: #64748B;    /* 次要文字 - 灰色 */
  
  /* 边框 */
  --color-border: #E2E8F0;        /* 边框颜色 */
}
```

### 2.2 字体规范

```css
/* 主字体 */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

| 用途 | 字号 | 字重 |
|------|------|------|
| 标题 | 14px | 600 |
| 正文 | 13px | 450 |
| 说明文字 | 12px | 400/500 |
| 标签 | 11px | 500 |

### 2.3 间距规范

| 场景 | 间距值 |
|------|--------|
| 面板内边距 | 16px |
| 组件间距 | 8px |
| 列表项内边距 | 8px 10px / 10px 12px |
| 按钮内边距 | 8px 14px |
| 输入框内边距 | 0 8px |

### 2.4 圆角规范

| 元素 | 圆角值 |
|------|--------|
| 按钮 | 6px / 8px |
| 输入框 | 6px |
| 面板区域 | 8px |
| 图标容器 | 6px |
| 画布 | 12px |

### 2.5 阴影规范

```css
/* 轻微阴影 - 用于浮动元素 */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* 中等阴影 - 用于弹窗等 */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
```

---

## 3. 图标规范

### 3.1 图标风格
- 使用 **线性图标** (stroke)，非填充
- 线条粗细：**1.5px**
- 图标尺寸：16px ~ 20px
- 颜色：跟随 `--color-text-muted`，悬停时变 `--color-primary`

### 3.2 图标结构
```jsx
const IconName = () => (
  <svg 
    viewBox="0 0 20 20" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* 图标路径 */}
  </svg>
);
```

### 3.3 图标库参考
- 风格参考：Lucide Icons / Heroicons
- 不使用 emoji 作为 UI 图标

---

## 4. 交互规范

### 4.1 悬停效果
- 背景色变化：`background: var(--color-hover)`
- 边框高亮：`border-color: var(--color-primary)`
- 过渡时间：**150ms ease**
- **禁止**使用 `transform: scale()` 导致布局偏移

### 4.2 选中状态
- 画布元素：青色边框 `stroke: #0891B2, strokeWidth: 2`
- 列表项：浅蓝色背景 `background: var(--color-active)`
- 输入框聚焦：青色边框 + 轻微阴影

### 4.3 演示模式 (Preview Mode)
- **开启方式**：点击顶部工具栏“▶ 演示”按钮。
- **行为变化**：
  - 画布元素锁定，禁止拖拽与框选。
  - 拥有 `interactions` 的组件，鼠标悬浮时变为 Pointer 手型。
  - 点击交互组件直接触发 `setProps`、`toggleVisibility`、`setVariable` 等目标动作。
  - 会自动重置全局状态机 `variables`。
  - 根据 `visibleIf` 条件严格渲染或卸载组件。
- **编辑态快捷测试**：在编辑模式下，按住 `Alt` 键点击组件也可触发配置的交互效果。

### 4.4 拖拽行为
| 操作 | 触发方式 |
|------|----------|
| 添加组件 | 从左侧面板拖拽到画布 |
| 移动元素 | 在画布上拖拽元素 |
| 调整层级 | 在图层面板拖拽排序 |
| 平移画布 | Alt + 左键拖拽 或 中键拖拽 |
| 缩放画布 | 鼠标滚轮 |

### 4.4 键盘快捷键
| 快捷键 | 功能 |
|--------|------|
| Delete / Backspace | 删除选中元素 |
| Ctrl+C | 复制选中元素 |
| Ctrl+V | 粘贴元素 |
| Ctrl+D | 复制并粘贴 |
| Ctrl+Z | 撤销 |
| Ctrl+Y / Ctrl+Shift+Z | 重做 |
| Ctrl+G | 将选中组件成组 |
| Ctrl+Shift+G | 解散选中的组 |
| Ctrl+A | 全选 |
| Arrow Keys | 微调位置 (1px) |
| Shift + Arrow Keys | 微调位置 (10px) |
| Alt + Click | 快捷触发交互测试 |

### 4.5 元素变换
| 操作 | 触发方式 |
|------|----------|
| 调整大小 | 拖拽8个方向的控制点 |
| 旋转 | 拖拽顶部的旋转控制点 |
| 等比缩放 | 按住Shift拖拽角控制点 |

### 4.6 多选操作
| 操作 | 触发方式 |
|------|----------|
| 多选 | Ctrl+点击图层 |
| 框选 | 在空白区域拖拽选择框 |
| 取消选择 | 点击空白区域 |

---

## 5. 布局结构

### 5.1 整体布局
```
┌─────────────────────────────────────────────────────────┐
│                      App Container                       │
├──────────┬────────────────────────────────┬─────────────┤
│          │           Toolbar              │             │
│  组件    ├────────────────────────────────┤   属性     │
│  面板    │                                │   面板     │
│          │                                │             │
│  图层    │         Canvas                 │             │
│  面板    │                                │             │
│          │                                │             │
└──────────┴────────────────────────────────┴─────────────┘
```

### 5.2 面板宽度
| 面板 | 宽度 |
|------|------|
| 左侧组件/图层面板 | 220px (固定) |
| 右侧属性面板 | 240px (固定) |
| 中间画布区域 | 自适应 |

### 5.3 面板结构

#### 左侧面板 (ComponentPanel)
```
┌────────────────┐
│    组件        │ ← 固定区域
├────────────────┤
│  [组件列表]    │ ← 可滚动，max-height: 280px
├────────────────┤
│    图层        │ ← 填充剩余空间
│  [图层列表]    │ ← 可滚动，支持多选
└────────────────┘
```

#### 右侧面板 (PropertiesPanel)
```
┌────────────────┐
│    属性        │ ← 头部
├────────────────┤
│  类型名称 & ID │ ← 支持修改 ID 及一键复制
├────────────────┤
│  状态切换器    │ ← 默认状态 / 悬浮状态
├────────────────┤
│  变换          │ ← X, Y, 旋转角度
├────────────────┤
│  样式属性      │ ← 可滚动
├────────────────┤
│  快捷操作      │ ← 50%, 200%, 重置角度
├────────────────┤
│  交互配置      │ ← 添加 Click 事件等
└────────────────┘
```

---

## 6. 组件数据结构

### 6.1 Shape 对象
```javascript
{
  id: "button-1",           // 类型前缀 + 递增ID（支持用户自定义）
  type: "rect",             // 渲染类型: rect/circle/text/line/image/group
  x: 100,                   // X 坐标
  y: 100,                   // Y 坐标
  rotation: 0,              // 旋转角度
  visible: true,            // 是否可见
  locked: false,            // 是否锁定
  hoverProps: {             // 【可选】悬停状态下的样式合并覆盖
    fill: "#FF0000",
    scale: 1.1
  },
  interactions: [           // 【可选】交互配置数组
    {
      trigger: "onClick",   // 触发条件: onClick / onMouseEnter / onMouseLeave / onLoad
      delay: 1000,          // 【可选】支持所有 trigger，延迟触发的时间(ms)
      action: "setProps",   // 执行动作: toggleVisibility / setProps / setVariable
      targetId: "rect-2",   // 【动作专属参数】目标组件 ID (toggleVisibility / setProps 需配置)
      payload: {            // 【动作专属参数】
        fill: "blue"        // 若 action 为 setProps，表示要修改的属性字典
        // key: "tab",      // 若 action 为 setVariable，表示要修改的全局变量名
        // value: "home"    // 若 action 为 setVariable，表示要修改的全局变量值
      }
    }
  ],
  visibleIf: {              // 【可选】条件渲染逻辑
    key: "currentTab",      // 依赖的全局变量名
    operator: "==",         // 比较运算符 (==, !=, >, <, >=, <=, ===, !==)
    value: "home"           // 期望匹配的值
  },
  props: {                  // 基础样式属性
    width: 100,
    height: 36,
    fill: "#0891B2",
    cornerRadius: 8,
    opacity: 1
  },
  children: []              // 仅在 type: 'group' 时存在
}
```

### 6.2 组件类型定义
| id 前缀 | type | 名称 | 说明 |
|---------|------|------|------|
| button | rect | 按钮 | 可点击按钮 |
| input | rect | 输入框 | 文本输入 |
| text | text | 文本 | 文字内容 |
| image | rect | 图片 | 图片占位 |
| rectangle | rect | 矩形 | 形状 |
| circle | circle | 圆形 | 形状 |
| triangle | triangle | 三角形 | 形状 (v1.4已移除) |
| icon | icon | 图标 | SVG图标 |
| line | line | 线条 | 直线 |

---

## 7. 文件组织

### 7.1 目录结构
```
src/
├── components/
│   ├── ComponentPanel.jsx    # 左侧面板（组件 + 图层）
│   ├── ComponentPanel.css
│   ├── Canvas.jsx            # 画布核心（含调整大小、旋转、对齐）
│   ├── Canvas.css
│   ├── PropertiesPanel.jsx   # 右侧属性面板
│   ├── PropertiesPanel.css
│   ├── Toolbar.jsx           # 工具栏
│   ├── Toolbar.css
│   ├── ScreenshotImporter.jsx # 截图导入
│   ├── ScreenshotImporter.css
│   └── componentList.js      # 组件配置数据
├── App.jsx                   # 主应用入口
├── App.css
├── index.css                 # 全局样式 / CSS 变量
└── main.jsx                  # React 入口
```

### 7.2 命名规范
- 组件文件：PascalCase (如 `ComponentPanel.jsx`)
- 样式文件：与组件同名 (如 `ComponentPanel.css`)
- CSS 类名：kebab-case (如 `component-item`)
- 变量/函数：camelCase (如 `handleClick`)

---

## 8. 开发规范

### 8.1 组件开发原则
1. **单一职责**：每个组件只负责一个功能区域
2. **受控组件**：状态由父组件管理，通过 props 传递
3. **回调通信**：子组件通过回调函数通知父组件变更

### 8.2 状态管理
```javascript
// App.jsx 中的核心状态
const [shapes, setShapes] = useState([]);           // 所有元素
const [selectedId, setSelectedId] = useState(null); // 选中元素ID
const [selectedIds, setSelectedIds] = useState([]); // 多选元素IDs
const [history, setHistory] = useState([[]]);       // 撤销历史
const [historyIndex, setHistoryIndex] = useState(0); // 历史索引
const [snapToGrid, setSnapToGrid] = useState(true); // 网格吸附
const [showGuides, setShowGuides] = useState(true); // 对齐辅助线
```

### 8.3 新增组件类型步骤
1. 在 `componentList.js` 中添加配置
2. 在 `Canvas.jsx` 的 `ShapeRenderer` 中添加渲染逻辑
3. 在 `PropertiesPanel.jsx` 的 `propertyConfigs` 中添加属性配置
4. 在 `ComponentPanel.jsx` 的图标映射中添加图标

### 8.4 新增属性步骤
1. 在 `propertyConfigs` 中添加属性定义
2. 选择合适的输入类型：`number / text / color / range / select`
3. 设置合理的 `min / max` 范围

---

## 9. 样式编写规范

### 9.1 禁止事项
- ❌ 使用 emoji 作为图标
- ❌ 使用 `transform: scale()` 作为悬停效果
- ❌ 使用固定的深色值 (如 `#333`)，应使用 CSS 变量
- ❌ 显示滚动条（使用 `scrollbar-width: none` 隐藏）

### 9.2 推荐事项
- ✅ 所有颜色使用 CSS 变量
- ✅ 过渡动画使用 `150ms ease` 或 `200ms ease`
- ✅ 输入框聚焦时添加 `border-color: var(--color-primary)`
- ✅ 可交互元素添加 `cursor: pointer`

### 9.3 滚动条隐藏标准写法
```css
.element {
  overflow-y: auto;
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE/Edge */
}

.element::-webkit-scrollbar {
  display: none;                /* Chrome/Safari */
}
```

---

## 10. 功能清单

### 10.1 已实现功能
- [x] 基础拖拽组件布局
- [x] 画布缩放和平移
- [x] 元素删除和清空
- [x] 图层管理（排序、显示/隐藏、锁定）
- [x] 属性面板编辑
- [x] 截图导入（AI分析）
- [x] **撤销/重做** (Undo/Redo)
- [x] **复制/粘贴元素**
- [x] **元素缩放**（拖拽控制点）
- [x] **元素旋转**
- [x] **多选元素** (Ctrl+点击、框选)
- [x] **对齐辅助线**
- [x] **网格吸附**
- [x] **多元素对齐**（左、右、上、下、居中）
- [x] **快捷键支持**
- [x] **元素可见性/锁定控制**
- [x] **内置图标库**
- [x] **AI 对话与多模态解析**
- [x] **交互引擎 (Hover / Click 动作)**
- [x] **组件成组 (Group)**
- [x] **动态交互属性面板**
- [x] **全局演示模式**

### 10.2 待实现功能
- [ ] 导出为图片/JSON
- [ ] 标尺/参考线
- [ ] 组件分组
- [ ] 深色模式
- [ ] 多页面支持
- [ ] 历史记录可视化
- [ ] 元素复制粘贴跨画布
- [ ] 组件库自定义

---

## 11. 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-24 | 初始版本，基础功能完成 |
| 1.1.0 | 2026-03-25 | 新增调整大小、旋转、多选、撤销重做、对齐辅助线、网格吸附等功能 |
| 1.2.0 | 2026-03-26 | 新增多模态 AI 聊天面板、支持图片上传解析、修复长文本截断 |
| 1.3.0 | 2026-03-30 | 新增组件成组/解组、支持图层嵌套显示、修复撤销重做记录问题 |
| 1.3.1 | 2026-03-31 | AI 深度集成（支持 Function Calling 修改画布）、文本/按钮双击编辑增强 |
| 1.4.0 | 2026-03-31 | 新增内置图标库、完善双击编辑支持、移除冗余组件 |
| 1.5.0 | 2026-04-01 | 声明式交互架构（支持 Hover/Click 交互）、新增演示模式、可视化交互配置面板 |
| 1.6.0 | 2026-04-01 | 新增多选组件同步操作、图片组件增强、全局颜色取色器 |
| 1.7.0 | 2026-04-01 | 全局状态机与条件渲染、支持 `setVariable` 动作、新增 `onLoad` 触发器、交互延迟修饰符 |

---

## 12. 快捷键参考卡

### 全局快捷键
| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z | 撤销 |
| Ctrl+Y / Ctrl+Shift+Z | 重做 |
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+D | 复制并粘贴 |
| Ctrl+A | 全选 |

### 画布快捷键
| 快捷键 | 功能 |
|--------|------|
| Delete / Backspace | 删除选中元素 |
| Arrow Keys | 微调位置 1px |
| Shift+Arrow Keys | 微调位置 10px |
| Alt+拖拽 | 平移画布 |
| 鼠标滚轮 | 缩放画布 |
| 中键拖拽 | 平移画布 |

### 图层操作
| 操作 | 功能 |
|------|------|
| Ctrl+点击 | 多选图层 |
| 拖拽 | 重新排序 |

---

*本文档应随功能更新同步维护*
