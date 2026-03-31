# 原型设计工具 - 更新日志

## 版本 1.3.1 (2026-03-31)

### 🤖 智能 RAG 助手深度集成与画布操控

#### 1. AI 直接操控画布 (Function Calling)

- **精准修改**：支持 AI 直接通过工具调用 (`modify_canvas_shapes`) 修改画布上的组件。可以对指定的组件进行大小、颜色、位置的精确调整（例如：“将所有圆形放大两倍”）。
- **批量更新**：支持对画布内容进行批量排版和复杂布局的调整（例如：“把整体布局改为每行最多显示3个”）。
- **基于截图生成 UI**：AI 现在可以直接解析上传的 UI 截图，并在不需要用户手动导入 JSON 的情况下，直接将其绘制到画布上。

#### 2. AI 交互体验优化

- **操作透明化**：当 AI 对画布进行操作时，除了提示“已为您执行画布修改操作”外，现在还会将 AI 的思考过程（`reasoning_content`）和具体执行的指令参数（原始 JSON 数据）以可视化的方式展示在对话气泡中，方便用户了解 AI 做了什么分析及操作。
- **对话记录持久化**：新增 AI 助手对话记录的本地存储功能，刷新页面后保留聊天记录。在设置中支持一键清空历史。
- **JSON 代码块一键复制**：对 AI 输出中的 Markdown 代码块或纯 JSON 文本实现了高亮渲染，并增加了一键“复制”按钮。
- **异常捕获机制**：修复了在初始加载时，因为 localStorage 中存储了 `"undefined"` 字符串导致的 `SyntaxError` 页面崩溃问题。

#### 3. AI 生成组件类型的智能映射

- **类型自动转换**：AI 按照提示词要求输出的组件类型（如 `rectangle`, `input`, `button`, `image`）现已通过 `convertAiShape` 函数自动转换为底层 Konva Canvas 识别的 `rect` 等标准形状。
- **默认属性增强**：在映射时自动补全必要属性（例如，若有 `stroke` 但无 `strokeWidth`，自动补全为 `1`；针对 `text` 自动设定默认字体为 `Inter`），确保生成结果高度符合预期并带有正确样式。

#### 4. 按钮与输入框组件的渲染增强

- **组件语义识别**：调整了 AI 自动生成的 ID 命名规则，带有语义前缀（如 `input-xxx`，`button-xxx`）。
- **文本渲染支持**：`Canvas.jsx` 中针对 `button` 和 `input` 组件实现了内部文字显示支持。现在 AI 生成的按钮可以直接在矩形居中显示白色文字，输入框也能正确显示占位符或输入文字。
- **双击编辑支持**：拓展了内联编辑器（`textarea`）的支持范围，现在除了纯文本组件外，双击按钮和输入框也能直接在画布上进行文本的内联编辑。

#### 5. 解决 Git 合并冲突

- **事件拦截冲突修复**：修复了在 `Canvas.jsx` 中 `onDblClick` 和 `onDblTap` 事件由于不同分支增加不同双击对象（例如 `circle` 与 `button`）导致的 Git 冲突，确保代码能够正确地将这几个元素都加入到双击编辑的拦截器中。
- **内联编辑样式冲突修复**：修复了 `getEditInputStyle` 函数中关于多类型（文本、圆形、矩形、输入框、按钮）判断导致的样式冲突，整合了计算宽度/高度以及文本对齐方式（`textAlign`）的不同实现。

***

## 版本 1.3.0 (2026-03-30)

### 🎯 新增功能

#### 1. 组件成组功能

- 支持将多个组件合并为组（**Ctrl+G**）
- 支持解散组（**Ctrl+Shift+G**）
- 组可以整体移动、调整大小、旋转
- 拖拽组边框调整大小时，子组件跟随比例变化：
  - 圆形会变成椭圆，跟随组框的 X/Y 比例
  - 文本字体大小跟随变化
  - 矩形等组件按比例缩放

#### 2. 图层面板支持组显示

- 组显示为可折叠容器，带子组件数量标识
- 点击箭头展开/收起组内子组件
- 子组件缩进显示，便于识别层级关系

### 🐛 Bug 修复

#### 1. 撤销/重做功能异常

- **问题**：导入 JSON 后进行操作，按 Ctrl+Z 会直接撤销整个画布内容
- **原因**：拖拽、调整大小、旋转、方向键移动、文本编辑等操作没有保存历史记录
- **修复**：
  - 拖拽结束时保存历史记录
  - 调整大小结束时保存历史记录
  - 旋转结束时保存历史记录
  - 方向键移动后保存历史记录
  - 文本编辑完成后保存历史记录

#### 2. 圆形成组位置偏移

- **问题**：圆形组件的 x,y 是圆心坐标，成组时按左上角坐标计算导致位置偏移
- **修复**：区分圆形（圆心坐标）和矩形（左上角坐标）的边界框计算

### ⌨️ 键盘快捷键更新

| 快捷键          | 功能      |
| ------------ | ------- |
| Ctrl+G       | 将选中组件成组 |
| Ctrl+Shift+G | 解散选中的组  |

### 📁 更新文件清单 (v1.2.0)

| 文件                                  | 变更内容                                    |
| ----------------------------------- | --------------------------------------- |
| `src/App.jsx`                       | 添加 handleGroup、handleUngroup 函数，修复撤销/重做 |
| `src/components/Canvas.jsx`         | 组渲染、组缩放、修复历史记录保存                        |
| `src/components/Toolbar.jsx`        | 添加成组/解组按钮                               |
| `src/components/ComponentPanel.jsx` | 组的折叠/展开显示                               |
| `src/components/ComponentPanel.css` | 组样式、子组件缩进样式                             |

### 🔧 技术改进

1. **组数据结构**：使用 `type: 'group'` 容器，子组件存储在 `children` 数组
2. **坐标系统**：圆形存储圆心相对坐标，矩形存储左上角相对坐标
3. **组缩放**：支持非等比缩放，子组件跟随组框比例变化
4. **椭圆支持**：导入 Ellipse 组件，支持圆形缩放后变成椭圆

## 版本 1.2.0 (2026-03-26)

### 🤖 智能 RAG 助手模块集成

#### 1. 多模态 AI 对话面板

- **面板集成**：在原型设计界面右侧新增可展开/收起的沉浸式 AI 聊天面板。
- **UI/UX 规范**：遵循 `ui-ux-pro-max` 规范，无缝融入设计系统的颜色与动效体系。
- **模型支持**：内置对接 `Xiaomi MiMo (mimo-v2-pro)` 和 `Xiaomi MiMo Omni (多模态)` 模型，并预置了精准的 System Prompt。
- **自定义模型**：支持用户在设置中手动添加兼容 OpenAI 接口格式的自定义模型（需配置 Base URL 和 API Key），并实现本地持久化存储。

#### 2. 图片理解与交互

- **上传与粘贴**：支持点击按钮选择本地图片，同时支持直接在输入框使用 `Ctrl+V` 粘贴剪贴板图片。
- **图片压缩**：前端实现图片自动等比压缩（最大边长限制 1024px），大幅降低长宽比过大的图片带来的 Token 消耗。
- **多模态请求**：自动将图片转为 Base64 并构建 OpenAI 兼容的 `image_url` 多模态消息体发送至模型。

#### 3. 错误处理与展示优化

- **长文本支持**：修复了模型返回大段 JSON 时被截断的问题，将 `max_completion_tokens` 放宽至 8192。
- **代码块渲染**：调整聊天气泡 CSS（`white-space: pre-wrap`, `overflow-x: auto`），完美支持 JSON 和代码的缩进换行与横向滚动。
- **深度思考展示**：针对具备深度思考（Reasoning）能力的模型，若因长度限制导致 `content` 为空，会提供兜底渲染，展示 `reasoning_content`（思考过程）和原始错误 JSON，方便调试。

### 🐛 Bug 修复

- **全局快捷键冲突**：修复了画布全局监听 `keydown` 导致聊天输入框无法使用 `Ctrl+V` 粘贴以及页面选中文本无法使用 `Ctrl+C` 复制的问题。通过判定 `e.target.tagName` 和 `window.getSelection()` 巧妙放行原生事件。

***

## 版本 1.1.0 (2026-03-25)

### 🎯 核心功能增强

#### 1. 元素调整大小

- 新增8方向缩放控制点（NW、N、NE、E、SE、S、SW、W）
- 支持拖拽控制点调整元素尺寸
- 最小尺寸限制（10px），防止元素过小
- 控制点悬停时显示对应方向的光标样式

#### 2. 元素旋转

- 选中元素后显示顶部旋转控制点
- 支持拖拽旋转，15度吸附对齐
- 属性面板支持精确输入旋转角度

#### 3. 多选与框选

- **Ctrl+点击**：在图层面板多选元素
- **框选**：在画布空白区域拖拽创建选择框
- 支持多元素对齐操作（左、右、上、下、水平居中、垂直居中）

#### 4. 对齐辅助线与网格吸附

- 拖拽元素时自动显示红色对齐辅助线
- 支持左/右/上/下/中心对齐检测
- 可切换网格吸附功能（10px网格）

#### 5. 撤销/重做

- **Ctrl+Z**：撤销
- **Ctrl+Y / Ctrl+Shift+Z**：重做
- 最多保存50步历史记录

#### 6. 复制粘贴

- **Ctrl+C**：复制选中元素
- **Ctrl+V**：粘贴
- **Ctrl+D**：复制并粘贴

#### 7. 图层增强

- 显示/隐藏图层（眼睛图标）
- 锁定/解锁图层（锁图标）
- 隐藏的图层半透明显示

#### 8. 属性面板增强

- 新增**旋转角度**控制
- 新增**透明度**滑块
- 新增**快捷操作**（50%、200%、重置角度）

#### 9. 文本/输入框双击编辑

- 双击文本组件可直接编辑内容
- 双击输入框可编辑默认值
- 支持Enter确认、Escape取消
- 自动聚焦并选中文本
- 编辑时保持字体样式（粗体、斜体、下划线、对齐方式）

#### 10. 输入框组件增强

- 新增**默认值**属性
- 新增**占位符**属性
- 新增**字号**属性
- 新增**字体**选择
- 新增**文字颜色**属性
- 输入框内部显示文本内容

#### 11. 字体样式属性

- **字重**：Regular / Medium / Semibold / Bold
- **样式**：正常 / 斜体
- **装饰**：无 / 下划线 / 删除线
- **对齐**：左对齐 / 居中 / 右对齐

***

### 🐛 Bug 修复

#### 1. 画布调整大小控制点无法点击

- **问题**：外层Group设置了`listening={false}`，禁用了所有子元素事件
- **修复**：移除Group包裹，直接渲染控制点元素

#### 2. 拖拽时选中边框不跟随移动

- **问题**：缺少`onDragMove`事件处理
- **修复**：添加`onDragMove`实时更新元素位置

#### 3. 属性栏删除内容时误删组件

- **问题**：Delete/Backspace事件冒泡触发全局删除
- **修复**：在属性面板输入框添加`onKeyDown`阻止事件冒泡

#### 4. 圆形组件边框位置偏移

- **问题**：圆形的x,y是圆心，但边界框计算使用左上角
- **修复**：修正`getShapeBounds`函数，正确计算圆形边界

#### 5. 画布缩放时控制点坐标错误

- **问题**：屏幕坐标未转换为画布坐标
- **修复**：添加坐标转换逻辑

#### 6. 双击编辑文字颜色错误

- **问题**：输入框使用fill作为文字颜色，应使用textColor
- **修复**：区分文本组件和输入框组件的颜色属性

#### 7. 字重属性不生效

- **问题**：fontWeight属性未正确传递给Konva Text组件
- **修复**：显式设置fontWeight属性，并转换为字符串格式

***

### 📝 属性增强

#### 行高属性

- 文本组件新增**行高**属性（lineHeight）
- 输入框组件新增**行高**属性（lineHeight）
- 支持0.5-3范围，步长0.1
- 默认值1.4

***

### ⌨️ 键盘快捷键

| 快捷键                   | 功能          |
| --------------------- | ----------- |
| Delete / Backspace    | 删除选中元素      |
| Ctrl+C                | 复制          |
| Ctrl+V                | 粘贴          |
| Ctrl+D                | 复制并粘贴       |
| Ctrl+Z                | 撤销          |
| Ctrl+Y / Ctrl+Shift+Z | 重做          |
| Ctrl+A                | 全选          |
| Arrow Keys            | 微调位置 (1px)  |
| Shift+Arrow Keys      | 微调位置 (10px) |
| Enter                 | 确认文本编辑      |
| Escape                | 取消文本编辑      |

***

### 📁 更新文件清单

| 文件                                   | 变更内容                    |
| ------------------------------------ | ----------------------- |
| `src/components/Canvas.jsx`          | 调整大小、旋转、对齐辅助线、圆形修复、双击编辑 |
| `src/components/Canvas.css`          | 控制点样式、内联编辑器样式           |
| `src/App.jsx`                        | 撤销重做、多选、对齐功能            |
| `src/components/Toolbar.jsx`         | 新增工具按钮                  |
| `src/components/Toolbar.css`         | 工具栏样式优化                 |
| `src/components/ComponentPanel.jsx`  | 图层显示/隐藏/锁定              |
| `src/components/ComponentPanel.css`  | 图层样式                    |
| `src/components/PropertiesPanel.jsx` | 字体样式属性（字重、斜体、下划线、对齐）    |
| `src/components/PropertiesPanel.css` | 新增属性样式                  |
| `src/components/componentList.js`    | 组件默认属性                  |
| `DESIGN.md`                          | 设计手册更新                  |
| `UPDATE_LOG.md`                      | 更新日志文档                  |

***

### 🔧 技术改进

1. **坐标转换**：修复画布缩放时的坐标转换问题
2. **事件处理**：优化拖拽过程中的事件冲突处理
3. **状态管理**：改进撤销/重做的历史记录管理
4. **性能优化**：拖拽过程中实时更新边框位置
5. **内联编辑**：实现双击文本的内联编辑功能
6. **字体渲染**：支持粗体、斜体、下划线等字体样式
7. **闭包陷阱**：统一使用函数式状态更新避免闭包捕获旧数据

***

### 🔍 技术复盘：Canvas 内联文本编辑的踩坑与解决方案

#### 问题背景

双击文本组件进入编辑模式时，出现多个问题：

1. 编辑时显示两行相同的文字（Canvas 文本 + textarea）
2. textarea 有明显的边框和阴影
3. 编辑完成后调整组件大小，文本内容回退到编辑前

#### 问题1：双行文字显示

**原因**：Canvas 上的 Text 组件和 textarea 同时可见

**解决方案**：添加 `isEditing` 状态，编辑时隐藏 Canvas 文本

```jsx
// ShapeRenderer 新增 isEditing prop
function ShapeRenderer({ shape, isSelected, isEditing, ... }) {
  // text 类型
  {!isEditing && <Text text={shape.props.text} ... />}
  // input 类型
  {!isEditing && <Text text={displayText} ... />}
}

// 传入 isEditing
<ShapeRenderer isEditing={editingShape?.id === shape.id} ... />
```

#### 问题2：textarea 边框和阴影

**原因**：

1. CSS 中设置了 `box-shadow`
2. JS 的 `getEditInputStyle()` 中设置了 `boxShadow`

**解决方案**：两处都移除边框和阴影

```css
.inline-text-editor {
  border: none;
  outline: none;
  background: transparent;
}
.inline-text-editor:focus {
  box-shadow: none;
}
```

#### 问题3：编辑后调整大小文本回退（核心问题）

**原因**：闭包陷阱

`handleResize` 和 `handleFinishEdit` 使用闭包中的 `shape` 引用，但这个引用是组件渲染时的旧数据，不包含编辑后的文本。

```
时间线：
1. 用户双击 → editingShape = shapeA（text: "旧文本"）
2. 用户输入 "新文本" → editText = "新文本"
3. 用户点击边框调整大小 → handleResize 调用 onChange({...shape, ...})
   ↳ 这里的 shape 还是 shapeA（text: "旧文本"）
4. 结果：新文本被旧文本覆盖
```

**解决方案**：使用函数式状态更新

```jsx
// ❌ 错误：闭包捕获旧数据
const handleResize = (newBounds) => {
  onChange({ ...shape, x: newBounds.x, ... });  // shape 是旧的
};

// ✅ 正确：函数式更新获取最新状态
const handleResize = (newBounds) => {
  onChange((prev) => ({ ...prev, x: newBounds.x, ... }));
};

// onChange 回调支持两种模式
onChange={(newShapeOrFn) => {
  setShapes((prev) => {
    if (typeof newShapeOrFn === 'function') {
      const currentShape = prev.find(s => s.id === shape.id);
      return prev.map(s => s.id === shape.id ? newShapeOrFn(currentShape) : s);
    }
    return prev.map(s => s.id === newShapeOrFn.id ? newShapeOrFn : s);
  });
}}
```

#### 问题4：编辑状态下无法调整大小

**原因**：textarea 设置 `zIndex: 1000` 覆盖了 Canvas 上的 resize handles

**解决方案**：缩小 textarea 尺寸，留出边框区域给 resize handles

```jsx
const borderOffset = 8;
return {
  left: bounds.x * scale + position.x + borderOffset,
  top: bounds.y * scale + position.y + borderOffset,
  width: width - borderOffset * 2,
  height: height - borderOffset * 2,
};
```

#### 经验总结

| 问题     | 原因            | 解决方案                |
| ------ | ------------- | ------------------- |
| 双行文字   | Canvas 文本未隐藏  | 添加 isEditing 状态控制显隐 |
| 边框阴影   | CSS + JS 双重设置 | 两处都移除               |
| 文本回退   | 闭包捕获旧 shape   | 改用函数式状态更新           |
| 无法调整大小 | textarea 遮挡   | 缩小 textarea 留出边框区域  |

#### 关键教训

1. **Canvas + DOM 混合编辑**：Canvas 只能绘制像素，真正的文本编辑需要 DOM 元素（textarea），两者需要协调显隐
2. **闭包陷阱**：React 组件中的事件处理函数会捕获渲染时的 props/state，如果后续状态变化，闭包中的引用会过时
3. **函数式更新**：`setState(prev => ...)` 可以获取最新状态，避免闭包陷阱
4. **zIndex 层级管理**：绝对定位的 DOM 元素会覆盖 Canvas，需要预留交互区域

***

*更多详情请查看* *`DESIGN.md`* *设计手册*
