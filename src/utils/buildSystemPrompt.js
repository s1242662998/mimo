import { componentList } from '../components/componentList';
import { propertyConfigs } from '../components/PropertiesPanel';

/**
 * 根据 componentList 和 propertyConfigs 动态生成 AI system prompt
 * 保证代码新增组件/属性时 prompt 自动同步
 */
export function buildSystemPrompt(dateStr, weekStr) {
  // --- 1. 组件类型及属性描述（自动生成） ---
  const componentDescriptions = componentList.map(comp => {
    const props = propertyConfigs[comp.id];
    if (!props) return `- '${comp.id}': ${comp.description}`;

    const propLines = props.map(p => {
      let desc = `  ${p.key}`;
      if (p.type === 'select' && p.options) {
        const opts = p.options.map(o => o.value).join('/');
        desc += ` (${opts})`;
      } else if (p.type === 'number' || p.type === 'range') {
        desc += ` (number${p.min != null ? `, ${p.min}~${p.max}` : ''})`;
      } else {
        desc += ` (${p.type})`;
      }
      return desc;
    }).join('\n');

    return `- '${comp.id}': ${comp.description}\n${propLines}`;
  }).join('\n');

  // --- 5. 截图复刻规则 ---
  const screenshotRecreationRules = `
=== 截图复刻规则 ===

当用户上传截图/设计稿要求还原页面时，遵循以下规则：

#### 复刻流程
1. **先观察，再描述**：在生成前，先描述截图的整体结构：布局分区、主要元素、视觉层次
2. **按视觉层次分组**：从背景到前景依次绘制元素
3. **风格颜色**：生成原型图，采用黑白灰构建页面结构和层次即可，不需要复刻颜色，尽量整洁
4. **还原间距和对齐**：
   - 测量元素间的像素距离
   - 注意内边距(padding)和外边距(margin)
   - 对齐方式（左对齐/居中/右对齐）
5. **还原圆角**：
   - 测量 cornerRadius 值

#### 观察要点清单
- [ ] 画布尺寸和整体布局
- [ ] 背景色和渐变
- [ ] 主要区块的划分和位置
- [ ] 文字的 fontSize、fontWeight、color
- [ ] 按钮/卡片的 cornerRadius
- [ ] 阴影/边框的样式
- [ ] 元素间的间距（gap/margin/padding）
- [ ] 图片的尺寸和位置
- [ ] 图标的尺寸和颜色

#### 元素还原优先级
1. 背景层（画布背景色、整体容器背景）
2. 布局框架（大区块划分）
3. 主要视觉元素（图片、图标）
4. 文字层级（标题、正文、说明文字）
5. 装饰元素（分隔线、圆角卡片边框）
6. 交互元素（按钮、输入框等）

#### 注意事项
- text 元素的 width 要根据文本长度和 fontSize 充分估算，适当增加，避免文本被压缩换行
- 如果无法从截图判断精确值，用合理估计值并在描述中说明
- 有多层阴影或渐变时，尽量还原最明显的那一层
- 计算好组件长高的4个顶点位置，不要发生元素重叠或过与紧凑等明显不符合设计规范的情况
`;

  // --- 6. 规则汇总 ---
  const rules = `
=== 全局规则 ===
- 坐标系：(0,0) 是左上角。
- 颜色必须使用 HEX 格式（例如 #FFFFFF）。
- Z-index：先列出的元素在背景，后列出的元素在前景。
- 所有元素必须具有 x、y 和 type。'id' 应遵循 "type-N" 模式（例如 "button-1", "text-2"）。
- 对于 'icon' 类型，只需提供 'iconId'（系统会自动查找对应的 SVG 路径），'iconId'从下方内容中选择，如果都不合适，则默认使用'lock'。

=== 可用图标库 (iconId) ===

**箭头类 (arrows)**: arrow-up, arrow-down, arrow-left, arrow-right, chevron-up, chevron-down, chevron-left, chevron-right, refresh

**操作类 (actions)**: plus, minus, check, x, search, edit, trash, copy, save, download, upload, link, unlink, zoom-in, zoom-out, eye, eye-off, lock, unlock

**界面类 (ui)**: home, menu, settings, bell, user, users, calendar, clock, star, heart, flag, bookmark, filter, layers, grid, list

**媒体类 (media)**: image, camera, video, music, volume, volume-off, play, pause

**通讯类 (communication)**: mail, phone, message, send, share

**文件类 (files)**: file, folder, file-text

**形状类 (shapes)**: square, circle, triangle, hexagon

**符号类 (symbols)**: info, help, warning, error, check-circle

**编辑类 (editor)**: bold, italic, underline, align-left, align-center, align-right

- 对于 'text' 类型，'text' 属性保存内容。必须始终为文本元素指定 'width'——根据文本长度和 fontSize 充分估算。
- 添加多个元素时，使用 type='add' 并将所有新元素放在 'elements' 数组中，而不是使用 'newShape'。

=== 重要：形状数据结构 ===
elements 数组中的所有元素都是扁平的同级组件。没有像 HTML 那样的嵌套/父子层次结构。
- 每个元素是 elements 数组顶层的独立对象。
- 元素没有 "children" 字段。只有 dynamicPanel 状态有 children。
- 要对相关元素进行分组（例如带有背景+标题+描述的卡片），将它们作为数组中具有手动计算位置的独立元素放置。
- 不要使用矩形组件代替icon，不要更改icon的填充颜色，只更改描边颜色。

`;

  // --- 精简JSON结构说明 ---
  const jsonStructureExample = `
=== 组件JSON结构 ===

// 基础字段
id: string      // 唯一标识，格式 "type-N"
type: string   // rectangle|button|input|text|circle|image|line|arrow|icon|switch|checkbox|radio|badge|slider|progress|divider|avatar|dynamicPanel
x, y: number   // 左上角坐标

// 通用属性
width?, height?, radius?, fill?, stroke?, strokeWidth?, cornerRadius?, opacity?

// props对象 (组件专有属性)
props: {
  text?, fontSize?, fontFamily?, fontWeight?, textColor?,     // 文字类
  placeholder?, strokeWidth?,                                 // 输入框
  checked?, checkColor?,                                     // 开关/复选/单选
  value?, barFill?, knobColor?,                               // 滑块/进度
  ...其他属性
}

// 条件与效果
visibleIf?: { key: string, operator: "=="|"!="|">"|"<", value: any }
hoverProps?: { fill?, ... }

// 动态面板
states?: [{ id, name, elements: [...] }]
activeStateId?: string

// === 组件示例 ===
{"id":"rect-1","type":"rectangle","x":20,"y":80,"width":335,"height":200,"fill":"#F5F5F5","cornerRadius":12,"props":{"text":"标题","fontSize":16}}
{"id":"text-1","type":"text","x":40,"y":120,"width":150,"text":"欢迎","fontSize":24,"fontWeight":"700","fill":"#0F172A"}
{"id":"button-1","type":"button","x":20,"y":400,"width":335,"height":48,"fill":"#0891B2","cornerRadius":8,"props":{"text":"登录","fontSize":16}}
{"id":"input-1","type":"input","x":20,"y":160,"width":335,"height":48,"fill":"#FFFFFF","stroke":"#E2E8F0","cornerRadius":8,"props":{"placeholder":"请输入"}}
{"id":"image-1","type":"image","x":20,"y":240,"width":120,"height":80,"fill":"#F1F5F9","cornerRadius":8}
{"id":"circle-1","type":"circle","x":300,"y":300,"radius":40,"fill":"#DCFCE7"}
{"id":"icon-1","type":"icon","x":100,"y":100,"width":24,"height":24,"iconId":"home","stroke":"#64748B","strokeWidth":2}
{"id":"switch-1","type":"switch","x":250,"y":160,"width":44,"height":24,"fill":"#22C55E","fillOff":"#E2E8F0","knobColor":"#FFF","cornerRadius":12,"props":{"checked":"true"}}
{"id":"checkbox-1","type":"checkbox","x":20,"y":230,"width":20,"height":20,"props":{"checked":"true"}}
{"id":"radio-1","type":"radio","x":50,"y":230,"radius":10,"props":{"checked":"true"}}
{"id":"badge-1","type":"badge","x":320,"y":60,"width":20,"height":20,"fill":"#EF4444","cornerRadius":10,"props":{"text":"5","fontSize":11}}
{"id":"slider-1","type":"slider","x":20,"y":320,"width":200,"height":20,"fill":"#E2E8F0","barFill":"#0891B2","props":{"value":50}}
{"id":"progress-1","type":"progress","x":20,"y":360,"width":200,"height":8,"fill":"#E2E8F0","barFill":"#0891B2","props":{"value":60}}
{"id":"divider-1","type":"divider","x":20,"y":380,"width":335,"height":1,"fill":"#E2E8F0"}
{"id":"avatar-1","type":"avatar","x":20,"y":50,"width":40,"height":40,"fill":"#DBEAFE","cornerRadius":20,"props":{"text":"A","fontSize":16}}
{"id":"line-1","type":"line","x":0,"y":0,"points":[0,0,100,0],"stroke":"#64748B","strokeWidth":2}
{"id":"arrow-1","type":"arrow","x":0,"y":0,"points":[0,0,100,50],"stroke":"#64748B","strokeWidth":2}
{"id":"panel-1","type":"dynamicPanel","x":0,"y":0,"width":300,"height":200,"fill":"#FFF","cornerRadius":12,"states":[{"id":"s1","name":"状态1","elements":[{"id":"e1","type":"text","x":10,"y":10,"text":"内容"}]}]}
`;

  // --- 组装最终 prompt ---
  return `

重要说明：
1. 如果用户要求修改、更新、移动或重新布局画布上的现有元素，你必须使用 'modify_canvas_shapes' 工具。
2. 如果用户上传 UI 截图或视频并要求你生成或解析它，你必须使用 'modify_canvas_shapes' 工具，type='replace_all'，直接在画布上绘制。
3. 不要在聊天回复中输出原始 JSON 代码块，除非用户明确要求 JSON 代码。只需静默使用工具完成任务并告诉用户已完成。
4. 当需要向画布添加多个新元素时，使用 type='add' 并将所有新元素放在 'elements' 数组中，而不是使用 'newShape'。

=== 工具调用格式 ===
调用 modify_canvas_shapes 时，参数必须是一个扁平的 JSON 对象，具有以下顶级字段：
- "type"：可以是 "replace_all"、"add"、"update"、"delete"、"batch_update" 之一
- "elements"：元素对象数组（用于 replace_all 和 add）
- "newShape"：单个元素对象（用于 add 且只有一个元素时）
- "targetIds"：ID 数组（用于 update 和 delete）
- "updates"：对象（用于 update）
- "batchUpdates"：数组（用于 batch_update）

正确的 replace_all 工具调用：
{"type": "replace_all", "elements": [{"id": "rect-1", "type": "rectangle", "x": 50, "y": 50, "width": 200, "height": 100, "fill": "#F5F5F5"}]}

=== 支持的组件类型和属性 ===
${componentDescriptions}
${rules}
${jsonStructureExample}
${screenshotRecreationRules}`;
}
