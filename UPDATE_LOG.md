# 原型设计工具 - 更新日志

## 版本 1.10.0 (2026-04-10)

### 🎯 新增核心体验闭环功能

#### 1. 项目文件导入与导出 (.mimo)
- **本地项目存档**：新增将整个项目（包括多页面数据、组件结构、全局交互变量等）导出打包的功能。
- **专属格式**：引入专属的 `.mimo` JSON 文件格式，提供更加专业的交付体验。
- **一键恢复**：通过顶部工具栏的“加载”按钮，可以随时上传 `.mimo` 文件瞬间恢复原型项目的所有状态。

#### 2. 高清 PNG 智能裁剪导出
- **摒弃全屏截图**：优化了导出为 PNG 的算法逻辑。
- **智能计算包围盒**：自动遍历当前页面所有可视组件，精确计算最小边界（Bounding Box），并在外围增加舒适的留白（Padding）。
- **内容居中展示**：导出的图片会自动裁剪掉无用的画布空白，确保核心设计内容居中，方便直接贴入 PRD 或汇报文档。

#### 3. 连线模式与智能箭头
- **连线模式 (Connection Mode)**：在工具栏新增连线模式开关，开启后悬停或选中组件即可显示 4 个连接锚点。
- **动态绑定**：支持拖拽锚点生成箭头连接线，箭头会自动吸附目标组件的锚点，并在拖动组件时动态重算路径。
- **隐藏组件池**：将箭头（Arrow）从左侧的基础组件库中隐藏，强化其作为“关联性元素”的定位。
- **交互与属性**：连线同样支持交互选中，并能在右侧属性面板配置线条粗细和颜色，其图层置于底层，不干扰上层业务组件。

#### 4. AI 助手模型管理增强
- **内部唯一标识映射**：彻底修复了“添加同名自定义模型 ID”时产生的冲突问题，底层通过生成时间戳 ID 防止 React key 重复。
- **全自动持久化**：优化添加自定义模型流程，添加成功后无需再点击“保存设置”，系统将自动选中新模型并持久化到 localStorage。
- **防呆校验设计**：增强了 Base URL 的 `/v1` 后缀提示，防止用户配置错误导致无法调用 OpenAI 兼容接口。

### 🎨 界面与体验优化

- **左侧导航栏流式滚动**：重构了 `ComponentPanel` 和 `PagePanel` 的 Flex 布局，打破面板间的高度挤压限制。现在左侧的所有面板（页面、组件、图层、图标库）展开时支持全局流畅滚动。
- **下拉框交互修复**：修复了在设置面板中选择下拉框后，因为点击取消按钮导致的意外状态回滚 Bug。
- **面板层级优化**：调整了图层和图标库的默认上下位置，提升日常查阅图层的操作效率。

---

## 版本 1.9.0 (2026-04-10)

### 新增 8 个高频 UI 组件

补齐原型设计中常用的表单控件和状态组件，所有组件均支持画布拖拽、属性面板编辑、AI 生成和截图导入。

#### 1. 开关 (Switch)
- 胶囊形背景 + 圆形滑块，支持开启/关闭两种状态
- 属性：宽度、高度、开启颜色、关闭颜色、滑块颜色、圆角、状态
- AI 类型：`switch`

#### 2. 复选框 (Checkbox)
- 方形边框 + 勾选标记，支持选中/未选中状态
- 属性：宽度、高度、背景、边框、边框宽度、圆角、选中状态、勾选颜色
- AI 类型：`checkbox`

#### 3. 单选框 (Radio)
- 圆形外框 + 内部圆点，扩展自 circle 渲染分支
- 属性：半径、背景、边框、边框宽度、选中状态、选中颜色
- AI 类型：`radio`

#### 4. 徽标 (Badge)
- 小胶囊/圆形背景 + 数字文字，用于通知角标
- 属性：宽度、高度、背景、圆角、文字、字号、文字颜色
- AI 类型：`badge`

#### 5. 滑块 (Slider)
- 轨道 + 激活条 + 圆形滑块，支持 0-100 值
- 属性：宽度、高度、轨道颜色、激活颜色、滑块颜色、滑块边框、圆角、值
- AI 类型：`slider`

#### 6. 进度条 (Progress)
- 轨道 + 进度条，支持 0-100 进度值
- 属性：宽度、高度、轨道颜色、进度颜色、圆角、进度
- AI 类型：`progress`

#### 7. 分割线 (Divider)
- 细矩形，用于内容分隔
- 属性：宽度、高度、颜色
- AI 类型：`divider`

#### 8. 头像 (Avatar)
- 圆角方形 + 文字（支持图片），用于用户头像展示
- 属性：宽度、高度、背景、圆角、文字、字号、文字颜色
- AI 类型：`avatar`

### 技术改进

1. **类型映射扩展**：`App.jsx` convertAiShape typeMap 新增 8 个映射，AI 输出的语义类型自动转为内部渲染类型
2. **属性面板增强**：`PropertiesPanel.jsx` 新增 8 个 propertyConfigs，radio 组件特殊处理 shapeType 解析（type 为 circle 但配置用 radio）
3. **AI 系统提示更新**：`ChatWindow.jsx` 截图解析规则扩展，新增各组件的必需/可选属性说明
4. **截图导入扩展**：`ScreenshotImporter.jsx` convertType + convertToShapes 支持 8 个新类型
5. **组件面板图标**：`ComponentPanel.jsx` 新增 8 个 SVG 图标、IconMap 和 TypeNameMap 映射
6. **组内子组件渲染**：`Canvas.jsx` group 子组件渲染支持所有新组件类型

### 更新文件清单 (v1.9.0)

| 文件 | 变更内容 |
|------|----------|
| `src/components/componentList.js` | 新增 8 个组件定义 |
| `src/components/Canvas.jsx` | 新增 8 个组件的渲染逻辑（rect 分支 + circle radio 分支 + group 子组件） |
| `src/components/PropertiesPanel.jsx` | 新增 8 个属性配置、radio shapeType 解析 |
| `src/components/ComponentPanel.jsx` | 新增 8 个 SVG 图标、IconMap、TypeNameMap |
| `src/App.jsx` | convertAiShape typeMap 扩展、strokeWidth/fontFamily 条件扩展 |
| `src/rag/ChatWindow.jsx` | 系统提示新增组件类型说明 |
| `src/components/ScreenshotImporter.jsx` | convertType + convertToShapes 扩展 |

---

## 版本 1.8.0 (2026-04-01)

### 🎯 新增功能

#### 1. 多页面管理

- **页面面板**：左侧新增独立的页面管理面板，支持多页面原型设计
- **创建页面**：点击 `+` 按钮创建新页面
- **删除页面**：支持删除页面（至少保留一个页面）
- **重命名页面**：双击或点击编辑按钮修改页面名称
- **复制页面**：一键复制页面及其所有组件
- **切换页面**：点击页面项切换到对应页面
- **数据持久化**：页面数据自动保存到 localStorage，刷新不丢失

#### 2. 面板折叠展开

- **页面面板**：支持折叠/展开，点击 header 区域切换
- **组件面板**：支持折叠/展开
- **图标库面板**：支持折叠/展开
- **图层面板**：支持折叠/展开
- **统一视觉**：所有面板使用一致的折叠图标和动画效果

#### 3. 双击图层定位

- **快速定位**：双击图层中的组件，画布自动平移使该组件居中显示
- **智能计算**：自动计算组件中心位置（支持矩形、圆形、文本等不同类型）
- **选中联动**：定位同时自动选中该组件

### 🐛 Bug 修复

#### 1. 左侧面板滚动问题

- **问题**：当组件、图标库、图层都展开时，无法滚动查看图层内容
- **修复**：重构左侧面板布局，改为整个面板统一滚动

### 📁 更新文件清单 (v1.8.0)

| 文件 | 变更内容 |
|------|----------|
| `src/App.jsx` | 添加页面状态管理、focusShapeId、handleFocusShape |
| `src/App.css` | 左侧面板滚动样式 |
| `src/components/PagePanel.jsx` | 新增页面管理面板组件 |
| `src/components/PagePanel.css` | 页面面板样式 |
| `src/components/ComponentPanel.jsx` | 面板折叠展开、组件图标、双击定位 |
| `src/components/ComponentPanel.css` | 折叠样式、滚动修复 |
| `src/components/Canvas.jsx` | focusShapeId 定位逻辑 |

### 🔧 技术改进

1. **页面数据结构**：`pages` 数组存储多个页面，每个页面包含 `id`、`name`、`shapes`
2. **状态管理重构**：`shapes` 改为从当前页面动态获取，`setShapes` 自动更新当前页面
3. **画布定位算法**：根据不同组件类型（圆形/矩形/文本）计算中心点，实现精准定位
4. **localStorage 持久化**：页面数据和当前页面 ID 自动保存

---

## 版本 1.7.0 (2026-04-01)

### 🚀 高级交互引擎：全局状态机与条件渲染

#### 1. 全局变量 (Variables)
- **轻量级状态机**：在 `App.jsx` 中引入了全局变量字典 `variables`，用于存储原型运行时的各种状态（如 `currentTab: 'home'`，`isLoggedIn: true` 等）。
- **演示模式隔离**：每次进入或退出演示模式（Preview Mode）时，系统会自动清空并重置所有全局变量，确保每次测试都有干净的初始状态。

#### 2. 新增交互动作：修改全局变量 (setVariable)
- **状态驱动设计**：在属性面板的交互配置中，新增了 `setVariable` 动作。
- **配置方式**：用户可以为组件配置键值对（例如 `key: 'tab'`, `value: 'home'`）。当点击（或触发其他事件）该组件时，系统会更新全局字典中的对应变量。
- **应用场景**：无需再像以前那样繁琐地交叉控制多个组件的显示/隐藏，通过一个变量即可管理复杂的多状态业务流（如底部导航栏切换）。

#### 3. 条件渲染 (Visible If)
- **数据绑定视图**：所有组件的属性面板新增了“条件渲染 (Visible If)”配置开关。
- **逻辑判断**：支持配置 `变量名`、`判断条件（==, !=, >, < 等）`、`目标值`。
- **智能呈现**：
  - **编辑模式下**：如果不满足条件，组件会以 `30%` 的半透明状态显示，既不影响整体视觉，又方便用户继续选中和编辑。
  - **演示模式下**：如果不满足条件，组件将彻底从 DOM 中移除（不可见且不可交互），完美模拟真实的页面切换效果。

#### 4. 全局初始化触发器 (onLoad)
- **自动触发机制**：将原有的 `onTimer` 触发器升级为更通用的 `onLoad`（加载完成时）触发器。
- **状态初始化**：配合 `setVariable` 动作，用户可以在任意组件上挂载 `onLoad` 事件，实现在进入演示模式的一瞬间，自动为全局变量赋予初始默认值（例如默认显示首页 Tab）。

#### 5. 延迟修饰符 (Delay)
- **通用延迟**：取消了单独的“延时触发”类型，将“延迟”作为一种通用的修饰符下放给所有交互事件。
- **自由组合**：现在你可以配置“点击后延迟 1000ms 变色”，或者“加载完成后延迟 3000ms 弹出弹窗”，极大增强了交互的时间维度控制能力。

### 🐛 Bug 修复
- **Hooks 顺序崩溃**：修复了在 `Canvas.jsx` 中因为提前 `return null` 隐藏条件不满足的组件，导致 React 报错 `Rendered more hooks than during the previous render` 的致命崩溃问题。
- **状态残留**：修复了退出演示模式后，由于全局变量未重置导致条件渲染组件无法恢复半透明占位状态的 Bug。

---

## 版本 1.6.0 (2026-04-01)

### 🎯 新增功能

#### 1. 多选组件同步操作

- **Ctrl+点击多选**：按住 Ctrl（或 Mac 的 Command）键点击组件可进行多选，再次点击已选中的组件可取消选择
- **同步移动**：多选后拖动边界框可同时移动所有选中组件
- **同步缩放**：多选后通过8个缩放手柄可同时缩放所有选中组件，支持等比和非等比缩放
- **智能显示**：多选时隐藏单个组件的缩放手柄，显示统一的多选边界框

#### 2. 图片组件增强

- **图片上传**：图片组件现在支持上传本地图片
- **图片预览**：属性面板中显示已上传图片的预览
- **图片移除**：支持一键移除已上传的图片

#### 3. 颜色取色器

- **屏幕取色**：所有颜色属性旁边新增取色器按钮，点击后可从屏幕任意位置取色
- **实时预览**：拖拽颜色选择器时，组件实时预览颜色变化
- **流畅体验**：使用节流优化，每50ms最多更新一次，保证拖拽流畅度

### 🎨 界面优化

#### 1. 组显示优化

- **未选中隐藏边框**：组在未选中状态下不再显示虚线边框，选中时才显示

#### 2. 图层面板优化

- **显示完整ID**：图层名称格式改为 `类型（完整id）`，如 `按钮（button-1）`
- **悬浮提示**：鼠标悬停显示完整组件ID，防止名称过长显示不全

#### 3. 面板宽度调整

- **左侧导航栏**：宽度从 220px 增加到 260px
- **右侧属性面板**：宽度从 240px 增加到 280px

### 📁 更新文件清单 (v1.6.0)

| 文件 | 变更内容 |
|------|----------|
| `src/components/Canvas.jsx` | 多选同步操作、组边框显示优化、图片组件渲染 |
| `src/components/PropertiesPanel.jsx` | 图片上传功能、颜色取色器、颜色选择器优化 |
| `src/components/PropertiesPanel.css` | 取色器按钮样式、图片上传样式 |
| `src/components/ComponentPanel.jsx` | 图层显示完整ID |
| `src/components/ComponentPanel.css` | 左侧导航栏宽度调整 |
| `src/components/componentList.js` | 图片组件类型改为 image |
| `src/App.jsx` | 图片类型映射更新 |
| `src/components/ScreenshotImporter.jsx` | 图片类型映射更新 |

### 🔧 技术改进

1. **MultiSelectionHandles 组件**：新增多选操作处理组件，计算多选边界框、处理同步移动和缩放
2. **ImageShape 组件**：新增图片渲染组件，支持图片加载和显示
3. **ColorInput 组件**：独立的颜色输入组件，使用本地状态和节流优化拖拽体验
4. **EyeDropper API**：使用浏览器原生取色器 API 实现屏幕取色功能

---

## 版本 1.5.0 (2026-04-01)

### 🚀 画布交互引擎与 AI 配置增强

#### 1. 声明式交互架构
- **零组件侵入**：在不增加新组件类型的前提下，基于现有 JSON 数据结构扩展了 `hoverProps` (悬浮样式) 和 `interactions` (交互事件) 两个可选字段。
- **动态渲染引擎**：改造了 `Canvas.jsx` 中的 `ShapeRenderer`，实现了鼠标悬浮时的动态样式合并与过渡，支持包括颜色变化、中心点缩放 (`scale`) 等视觉反馈。

#### 2. 全新演示模式 (Preview Mode)
- **一键沉浸体验**：在顶部工具栏新增绿色的“演示”按钮，点击后画布进入锁定状态（禁止拖拽与框选）。
- **实时交互触发**：在演示模式下，配置了交互的组件光标会自动变为小手（Pointer），点击即可直接触发目标组件的显示隐藏或样式修改。
- **编辑态快捷测试**：在日常编辑模式下，无需切换演示模式，按住 `Alt` 键点击组件也可快速预览交互效果。

#### 3. 动态交互配置面板 (Properties Panel)
- **状态切换器**：属性面板顶部新增“默认状态 / 悬浮状态” Toggle 切换，用户在悬浮状态下修改的任何样式，都会自动被记录为 Hover 交互。
- **可视化事件配置**：面板底部新增“交互 (Interactions)”区域，支持为组件添加多个点击事件。
- **动态目标属性面板**：当选择 `setProps` (修改属性) 动作并绑定目标后，系统会**根据目标组件的真实类型**动态渲染出对应的可视化配置表单（如颜色选择器、文本输入框），彻底告别手写 JSON，极大降低了用户心智负担。
- **ID 深度编辑与保护**：原本只读的组件 ID 现在支持直接修改，并配有一键复制按钮。内置了防重名校验、防误触刷新（失焦/回车保存机制）与错误回滚策略，方便用户进行逻辑复用与批量操作。

#### 4. RAG AI 助手深度进化
- **批量元素生成**：修复了 AI 无法在非清空画布状态下同时添加多个新元素的问题。现在 AI 能熟练使用 `add` + `elements` 数组将多个组件完美叠加到现有画布中。
- **交互逻辑生成**：通过系统 Prompt 升级，AI 现在已经完全掌握了画布的交互配置规则，用户可以直接用自然语言说：“让这个按钮点击后，把旁边的矩形变成红色”，AI 会自动生成带 `setProps` 和 `payload` 的精准操作指令。
- **纯净对话体验**：严厉限制了 AI 在聊天窗口输出原始 JSON 代码块的行为，AI 现在会默默在后台调用工具修改画布，并用自然语言给用户友好的反馈。
- **UI 及交互细节打磨**：
  - AI 聊天面板宽度从 `320px` 增加至 `400px`，提供更舒适的阅读空间。
  - 修复了“清空对话历史”按钮在点击后无论确认或取消都会强制清空数据的浏览器默认行为 Bug，并保持了设置面板的稳定展开状态。

---

## 版本 1.4.0 (2026-03-31)

### 🎯 新增功能

#### 1. 图标库

- 新增常用图标库，包含 70+ 个 SVG 图标
- 图标按分类组织：箭头、操作、界面、媒体、通讯、文件、形状、符号、编辑
- 支持搜索和分类筛选
- 图标以网格形式展示，显示图标名称
- 支持拖拽图标到画布直接使用
- 图标支持自定义：描边颜色、描边宽度、填充颜色、尺寸、透明度

#### 2. 按钮/矩形/圆形组件双击编辑文字

- 按钮组件支持双击编辑文字
- 矩形组件支持双击编辑文字
- 圆形组件支持双击编辑文字
- 文字在组件内水平垂直居中显示
- 复用已有的文字编辑规则（Enter 确认、Escape 取消）

### 🗑️ 移除功能

#### 1. 三角形组件

- 从组件面板移除三角形组件
- 从属性面板移除三角形配置
- 清理相关渲染代码

### 📁 更新文件清单 (v1.4.0)

| 文件 | 变更内容 |
|------|----------|
| `src/data/icons.js` | 新增图标库数据文件 |
| `src/components/ComponentPanel.jsx` | 添加图标库面板、移除三角形 |
| `src/components/ComponentPanel.css` | 图标库样式 |
| `src/components/Canvas.jsx` | 添加 icon 渲染、按钮/矩形/圆形双击编辑、移除三角形 |
| `src/components/PropertiesPanel.jsx` | 添加 icon 属性配置、按钮/矩形/圆形文字属性、移除三角形 |

***

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

## 版本 1.11.0 (2026-04-14)

### ✨ 新增组件交互控制能力

#### 1. 新增交互触发器：onChange
- **触发时机**：当组件内置状态发生变化时自动触发（如开关切换、复选框点击、滑块拖动）。
- **使用场景**：开关组件添加 `onChange` 触发器 + `setVariable` 动作，即可实现"切换开关 → 修改全局变量 → 控制其他组件显隐"的联动效果。
- **适用组件**：switch（开关）、checkbox（复选框）、radio（单选框）、slider（滑块）。

#### 2. 新增交互动作：状态控制类
- **setChecked**：直接设置开关/复选框/单选框的选中状态。payload: `{ "checked": true/false }`
- **toggleChecked**：切换开关/复选框/单选框的选中状态，无需 payload。
- **setValue**：直接设置滑块/进度条的值（0-100）。payload: `{ "value": 50 }`
- **incrementValue**：增减滑块/进度条的值。payload: `{ "delta": 10 }`（正数增加，负数减少）

#### 3. 新增交互动作：持续动画类
- **startAnimation**：启动持续动画，逐帧修改目标组件的属性值。
  - `prop`：要修改的属性，支持 `value`（滑块/进度条值）和 `opacity`（透明度）
  - `delta`：每次 tick 的变化量，支持正数（递增）和负数（递减）
  - `interval`：每次 tick 的间隔毫秒数
  - `min` / `max`：值的边界范围
  - `loop`：到达边界后是否反向循环
  - 不勾选循环时，到达边界自动停止
- **stopAnimation**：停止目标组件上正在进行的动画。

#### 4. 组件内置交互行为
- **开关/复选框/单选框**：预览模式下点击自动切换选中状态，无需手动配置交互。组件添加后自带 `onChange` 能力，可通过交互面板配置联动逻辑。
- **滑块**：预览模式下支持鼠标拖拽实时调整值，拖动过程中自动触发 `onChange` 交互。

#### 5. AI 助手联动
- 以上所有新触发器和动作均已同步至 AI 助手的系统提示，AI 可根据自然语言描述自动配置交互。
- 示例："点击按钮后进度条自动从0增长到100" → AI 自动生成 `startAnimation` 交互配置。
- 示例："开关打开时显示暗色面板" → AI 自动生成 `onChange` + `setVariable` + `visibleIf` 联动。

#### 6. 属性面板交互编辑器更新
- 触发器下拉新增 `onChange` 选项。
- 动作下拉新增 6 个选项：`setChecked`、`toggleChecked`、`setValue`、`incrementValue`、`startAnimation`、`stopAnimation`。
- 每种动作配有对应的配置 UI：
  - setChecked/toggleChecked：目标选择器（自动过滤开关/复选框/单选框）
  - setValue/incrementValue：目标选择器（自动过滤滑块/进度条）+ 值/变化量输入
  - startAnimation：目标选择器 + 属性下拉 + 变化量 + 间隔 + 最小值 + 最大值 + 循环开关
  - stopAnimation：目标选择器

---

### 🐛 修复开始动画交互中的边界与参数解析问题

#### 1. 修复默认 min/max 下动画不停止的问题
- **问题**：`Number(payload?.delta) || 1` 中，`||` 运算符会将 `delta=0` 静默转换为 `1`；同理 `Number(payload?.interval) || 100` 也存在类似隐患。当用户未手动修改最小值/最大值时，`payload.min` / `payload.max` 为 `undefined`，`Number(undefined)` 返回 `NaN`，虽然 `NaN ?? 0` 能正确回退，但 `||` 与 `??` 的混用导致参数解析不一致，出现动画一直增加/减少不停止的异常。
- **修复**：将 App.jsx 中 `startAnimation` 的参数解析全部改为显式 `Number.isNaN()` 检查，替代原先 `||` 与 `??` 混用的方式。同时为 `delta=0` 增加前置守卫（不启动动画），为 `interval` 增加最小值限制 `Math.max(10, ...)`。

#### 2. 修复自定义 min/max 时循环边界异常
- **问题**：PropertiesPanel 中 min/max/delta 的 `onChange` 处理使用 `parseFloat(e.target.value) || 0`，当用户输入 `0` 时 `0 || 0 = 0` 虽然结果正确，但无法区分"用户输入了 0"和"输入为空回退到 0"，导致用户清空输入框后值变为 0 而非恢复默认。此外，当 min=1、max=99、loop=true 时，值到 11 即开始循环反向，推测与参数解析不一致有关。
- **修复**：PropertiesPanel 中 startAnimation 的 delta/interval/min/max 四个输入框的 `onChange` 改为 `Number.isNaN` 检查，空值时传入空字符串触发 `handleUpdatePayload` 的删除逻辑（回退到 App.jsx 中的默认值），非空值原样传递，确保用户输入的 0 和负数都能正确保留。

#### 3. 关键代码变更

**`src/App.jsx` — startAnimation 参数解析**
```javascript
// 旧代码（|| 与 ?? 混用）
const delta = Number(payload?.delta) || 1;
const intervalMs = Number(payload?.interval) || 100;
const min = Number(payload?.min) ?? 0;
const max = Number(payload?.max) ?? 100;

// 新代码（显式 NaN 检查）
const rawDelta = Number(payload?.delta);
const delta = Number.isNaN(rawDelta) ? 1 : rawDelta;
const rawInterval = Number(payload?.interval);
const intervalMs = Number.isNaN(rawInterval) ? 100 : Math.max(10, rawInterval);
const rawMin = Number(payload?.min);
const min = Number.isNaN(rawMin) ? 0 : rawMin;
const rawMax = Number(payload?.max);
const max = Number.isNaN(rawMax) ? 100 : rawMax;

// delta 为 0 时不启动动画
if (delta === 0) return;
```

**`src/components/PropertiesPanel.jsx` — onChange 处理**
```javascript
// 旧代码（|| 0 无法区分空值和 0）
onChange={(e) => handleUpdatePayload(idx, 'min', parseFloat(e.target.value) || 0)}

// 新代码（NaN 时传空字符串触发删除逻辑）
onChange={(e) => { const v = parseFloat(e.target.value); handleUpdatePayload(idx, 'min', Number.isNaN(v) ? '' : v); }}
```

#### 经验总结

| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| 动画不停止 | `||` 将 0 视为假值回退 | 统一用 `Number.isNaN()` 替代 `||` 和 `??` |
| min=1 到 11 就循环 | `|| 0` 无法区分空值和 0，参数传递链路不一致 | 空值传空字符串走删除逻辑，确保默认值回退 |
| 负数 delta 不生效 | `||` 运算符对 0 的处理干扰参数解析 | 显式 NaN 检查，0 值单独守卫 |

#### 关键教训

1. **`||` vs `??` vs `Number.isNaN()`**：`||` 会将 `0`、`''`、`false` 等所有假值都回退，`??` 只对 `null`/`undefined` 回退，`Number.isNaN()` 最精确——只对 `NaN` 回退。数值参数解析应优先使用 `Number.isNaN()`。
2. **受控输入的空值处理**：`parseFloat('')` 返回 `NaN`，`NaN || 0` 返回 `0`，导致空值被误认为有效输入。应显式检测 `NaN` 并走删除/回退逻辑。
3. **动画参数一致性**：参数解析逻辑（UI 层 onChange → 数据层 payload → 执行层 App.jsx）必须保持一致，任何一层的 `||`/`??` 混用都可能导致边界值异常。

---

## 版本 1.12.0 (2026-04-15)

### ✨ 新增功能

#### 1. 导入功能重构：JSON 导入取代截图导入
- **移除截图导入**：删除 `ScreenshotImporter` 组件，移除图片导入功能。
- **新增 JSON 导入**：替换为 `JsonImporter` 组件，支持两个标签页：
  - **导入组件**：粘贴 AI 生成的组件 JSON（`elements` 数组格式），批量创建画布组件。组件 ID 优先使用 JSON 中指定的 `id` 字段。
  - **导入交互**：粘贴 AI 生成的交互 JSON，为画布上已有组件批量添加交互配置。
- **双格式支持**：交互导入同时支持两种 AI 输出格式：
  - 按组件分组数组：`[{ "sourceId": "x", "interactions": [...] }]`
  - batch_update 格式：`{ "type": "batch_update", "batchUpdates": [{ "id": "x", "updates": { "interactions": [...] } }] }`
- **JSON 校验**：导入时校验 trigger/action 合法性、targetId 是否存在于画布、onComplete 字段完整性等，错误信息逐条列出。

#### 2. 交互目标可选择组件自身
- **现状**：属性面板中交互的 targetId 下拉框排除了组件自身（`s.id !== selectedShape.id`），但 AI 导入的 JSON 允许 targetId 指向自身且实际生效。
- **修改**：移除 `startAnimation`、`stopAnimation` 及默认 action 的 targetId 下拉框中的自身过滤，统一允许选择组件自身作为交互目标。

#### 3. startAnimation 增加总时长模式（duration）
- **新增参数**：`duration`（总时长，毫秒）。设置后系统根据 `(to - from) / (duration / intervalMs)` 自动推算 delta，用户无需手动计算变化量。
- **UI 变化**：startAnimation 配置区新增"总时长 (ms)"输入框。填写 duration 后，"每次变化量"变为只读自动计算值；清空后恢复手动输入。
- **向后兼容**：未设置 duration 时仍使用原有的 delta + interval 手动模式。

#### 4. startAnimation 参数重命名：min/max → 起始值/目标值
- **原因**：用户设置从 100 降到 1 时需要 min>max，这种表示方式不直观。
- **修改**：UI 层将 min/max 重命名为"起始值 (from)"和"目标值 (to)"，系统自动根据 from/to 推算 min/max 供引擎使用。
- **负数支持**：from 和 to 均支持负数和零值输入。

#### 5. 动画完成后的回调动作（onComplete）
- **新增字段**：`interaction.onComplete`，存储动画自然结束（非 loop 模式到达边界）后执行的交互对象。
- **数据结构**：
  ```json
  {
    "trigger": "onClick",
    "action": "startAnimation",
    "targetId": "rect-1",
    "payload": { "prop": "opacity", "from": 1, "to": 100, "duration": 1000, "loop": false },
    "onComplete": { "action": "setProps", "targetId": "rect-2", "payload": { "fill": "#FF0000" } }
  }
  ```
- **支持动作**：onComplete 的 action 支持所有交互动作类型（setProps、setVariable、setChecked、toggleChecked、setValue、incrementValue、switchState、nextState、prevState）。
- **UI 配置**：属性面板中 startAnimation 区域底部新增"完成后动作"配置区，可添加/移除，根据选择的动作类型显示对应的 targetId 选择器和 payload 配置。
- **setProps 预填**：选择 setProps 动作的目标组件后，自动用目标组件的当前属性值预填 payload，方便用户在此基础上修改。

#### 6. 动画执行中的抢占机制
- **问题**：快速触发同一组件的不同交互（如快速鼠标移入移出），旧动画/延迟执行未被清理，导致状态冲突。
- **方案**：引入 `pendingTimeouts` 跟踪和 `clearPendingForShape` 机制：
  - 当新交互触发时，清除该 source 组件上所有待执行的 setTimeout（延迟交互）。
  - startAnimation 已有的同 targetId 动画清除逻辑保留。
  - Canvas 的 `triggerInteraction` 在触发前先调用 `onClearPendingForShape` 清除旧的待执行交互。
  - 延迟交互的 timeoutId 通过 `onRegisterTimeout` 注册，可被后续交互抢占清除。

### 🐛 Bug 修复

#### 1. 修复交互输入框无法输入数字的问题
- **问题**：交互配置区的所有数字输入框（起始值、目标值、总时长、每次变化量、间隔、延迟触发、setValue 值、incrementValue 增减量等）在输入时触发画布键盘快捷键（方向键移动组件、Delete 删除组件），导致无法正常输入。
- **修复**：为交互配置区所有 `<input type="number">` 添加 `onKeyDown={(e) => e.stopPropagation()}`，阻止键盘事件冒泡到画布。

#### 2. 修复起始值/目标值输入后值被重置的问题
- **问题**：`handleUpdatePayload` 在值为空字符串 `''` 时会从 payload 中删除该属性，导致下一次渲染时输入框回退到默认值。同时 from/to 的 onChange 调用多次 `handleUpdatePayload`（分别设置 from、min、max），但每次调用都从 `selectedShape.interactions` 读取旧状态，导致后续调用覆盖前面的修改。
- **修复**：
  - `handleUpdatePayload` 不再因空字符串而删除属性（仅 `null` 触发删除）。
  - `handleUpdatePayload` 支持批量更新签名：`handleUpdatePayload(idx, { from, min, max })`，在同一次状态更新中修改所有相关字段。
  - from/to 的 onChange 改为单次批量调用。

#### 3. 修复 onComplete setProps 不显示属性面板的问题
- **问题**：onComplete 选择 setProps 动作并选择目标组件后，不显示属性配置面板。
- **修复**：onComplete 的 setProps 改为使用 `PropertyInput` 组件渲染各属性输入（与主交互编辑器一致），支持 color、number、text、select、range 等类型。

#### 4. 修复 setProps 预填值为空的问题
- **问题**：选择 setProps 动作的目标组件后，payload 为 `{}`，属性输入框全部为空。
- **修复**：在 `handleUpdateInteraction` 和 `handleUpdateOnComplete` 中，当 targetId 变更且动作为 setProps 时，自动读取目标组件的当前属性值预填到 payload 中。

#### 5. 修复动画不支持负方向变化的问题
- **问题**：`effectiveDelta` 始终为正数（使用 `Math.abs`），导致透明度无法从 100% 降到 1%。
- **修复**：delta 根据 from/to 的大小关系自动确定正负方向，手动模式下也根据 from/to 调整 delta 的符号。

#### 6. 修复组件默认透明度读取为 0% 的问题
- **问题**：setProps 预填值时，组件未显式设置 opacity 属性，fallback 到 `prop.min`（0），导致透明度显示为 0% 而非实际的 100%。
- **修复**：所有组件类型的 opacity 配置增加 `defaultValue: 1`，预填逻辑优先使用 `defaultValue`。

#### 7. 修复鼠标在组件子元素间移动误触发 onMouseLeave 交互的问题
- **问题**：当鼠标从一个 Group 子元素移动到另一个子元素时，Konva 触发 Group 的 `mouseleave` 事件，导致 `onMouseLeave` 交互被错误执行。
- **修复**：在 `onMouseLeave` 处理函数中，通过 `getClientRect()` 获取 Group 的实际包围盒，检查当前鼠标位置是否仍在盒内。如果仍在范围内则忽略此次 leave 事件，只有真正离开包围盒时才触发。

#### 8. 修复动画不支持负方向变化的问题（详细）
- **问题**：startAnimation 引擎中 `effectiveDelta` 的计算使用 `Math.abs(max - min)` 始终为正，配合 from/to 重命名后，`effectiveDelta = to >= from ? abs(delta) : -abs(delta)` 确保方向正确。

### 🔧 代码变更

| 文件 | 变更内容 |
|------|----------|
| `src/components/JsonImporter.jsx` | **新增**：替代 ScreenshotImporter，支持组件/交互双标签页导入，JSON 校验，双格式归一化 |
| `src/components/JsonImporter.css` | **新增**：JSON 导入弹窗样式 |
| `src/components/ScreenshotImporter.jsx` | **删除**：移除截图导入功能 |
| `src/components/ScreenshotImporter.css` | **删除**：移除截图导入样式 |
| `src/components/PropertiesPanel.jsx` | targetId 允许选自身；startAnimation 增加 duration/from/to/onComplete 配置区；所有交互数字输入 stopPropagation；handleUpdatePayload 支持批量更新；setProps 预填当前属性值；opacity defaultValue |
| `src/App.jsx` | 导入改为 JsonImporter；新增 handleImportInteractions；startAnimation 引擎支持 duration 自动计算 delta/from/to 方向/onComplete 回调；pendingTimeouts 抢占机制；clearPendingForShape/registerTimeout |
| `src/components/Canvas.jsx` | triggerInteraction 传递 sourceId 并清除 pending；onMouseLeave 包围盒检测防误触 |
| `src/components/Toolbar.jsx` | 导入按钮 tooltip 更新 |
