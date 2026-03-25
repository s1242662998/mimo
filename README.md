# Prototyper (Web 原型设计工具)

基于 Web 的轻量级原型设计工具，支持拖拽式组件布局、画布缩放、层级管理以及丰富的交互编辑功能。面向 UI/UX 设计师、产品经理及前端开发者，旨在提供高效、直观的原型设计体验。

## ✨ 核心特性

- **可视化编辑**：支持拖拽式组件布局、8 方向调整元素大小、精确旋转。
- **画布操作**：支持鼠标滚轮无限缩放，Alt/中键拖拽平移画布。
- **高级交互**：多选（Ctrl+点击/框选）、多元素对齐、网格吸附与智能对齐辅助线。
- **状态管理**：完整的撤销/重做（Undo/Redo）机制，支持最多 50 步历史记录。
- **内联编辑**：支持双击文本和输入框直接进行内联编辑，支持丰富的字体样式设置。
- **层级与属性管理**：直观的图层面板（支持锁定、隐藏、拖拽排序）和灵活的属性编辑面板（样式、位置、透明度、快捷操作等）。
- **截图导入**：支持截图导入并结合 AI 分析提取布局数据转换为可编辑组件。
- **快捷键支持**：完善的键盘快捷键映射，大幅提升操作效率。

## 🛠️ 技术栈

- **框架**: React 18+
- **构建工具**: Vite 8.x
- **画布引擎**: [react-konva](https://github.com/konvajs/react-konva) / [konva](https://konvajs.org/) 9.x
- **语言**: JavaScript (JSX) ES2022
- **样式**: 原生 CSS (CSS Variables)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

## ⌨️ 常用快捷键

| 快捷键 | 功能说明 |
| --- | --- |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` / `Ctrl + Shift + Z` | 重做 |
| `Ctrl + C` / `Ctrl + V` | 复制 / 粘贴选中元素 |
| `Ctrl + D` | 复制并直接粘贴 |
| `Ctrl + A` | 全选 |
| `Delete` / `Backspace` | 删除选中元素 |
| `Alt + 左键拖拽` / `中键拖拽` | 平移画布 |
| `鼠标滚轮` | 缩放画布 |
| `方向键` | 微调选中元素位置 (1px) |
| `Shift + 方向键` | 大步微调元素位置 (10px) |
| `Enter` / `Escape` | 确认 / 取消文本内联编辑 |

## 📁 项目结构

```text
src/
├── components/
│   ├── ComponentPanel.jsx    # 左侧面板（组件列表 + 图层管理）
│   ├── Canvas.jsx            # 画布核心（渲染、调整大小、旋转、对齐辅助）
│   ├── PropertiesPanel.jsx   # 右侧属性面板（样式、坐标、快捷操作）
│   ├── Toolbar.jsx           # 顶部工具栏
│   ├── ScreenshotImporter.jsx# 截图导入组件
│   └── componentList.js      # 组件类型配置数据
├── App.jsx                   # 主应用入口与核心状态管理
├── App.css                   # 应用整体布局样式
├── index.css                 # 全局样式与 CSS 变量定义
└── main.jsx                  # React 渲染入口
```

## 📖 更多文档

- [设计标准与规范](./DESIGN.md) - 详细的颜色、排版、交互与架构设计标准。
- [更新日志](./UPDATE_LOG.md) - 项目历史版本与功能更新记录。
- [截图转 JSON 指南](./SCREENSHOT-TO-JSON-GUIDE.md) - AI 截图解析功能说明。
