/**
 * 组件类型单一事实来源
 *
 * 改造背景：改造前组件类型清单散落在三处且互相漂移——
 *   1. src/components/componentList.js   组件面板模板（缺 icon / arrow / line）
 *   2. src/App.jsx convertAiShape 的 typeMap  缺 icon / arrow / line
 *   3. src/components/Canvas.jsx 的 switch         覆盖全类型
 * 另有两份 typeMap（App.jsx、JsonImporter.jsx）和两份属性表（PropertiesPanel.jsx、提示词）。
 * 任何新增组件漏改一处，就会出现「提示词说有、渲染层没有」→ 元素静默消失。
 *
 * 现在统一从此处派生，AI 工具 schema 的 enum 也直接引用，保证契约一致。
 */

/** 语义类型 → Konva 渲染类型 */
export const COMPONENT_TYPE_MAP = {
  text: 'text',
  button: 'rect',
  input: 'rect',
  rectangle: 'rect',
  circle: 'circle',
  image: 'image',
  icon: 'icon',
  arrow: 'arrow',
  line: 'line',
  dynamicPanel: 'dynamicPanel',
  switch: 'rect',
  checkbox: 'rect',
  radio: 'circle',
  badge: 'rect',
  slider: 'rect',
  progress: 'rect',
  divider: 'rect',
  avatar: 'rect',
  group: 'group',
};

/** 全部合法的语义类型，供 AI tools schema 的 enum 使用 */
export const VALID_COMPONENT_TYPES = Object.keys(COMPONENT_TYPE_MAP);

/**
 * 把 AI 返回的语义类型转换为渲染类型。
 * 未知类型降级为 rect 并告警—— 绝不能静默透传，
 * 否则会在 Canvas 的 switch default 分支渲染成 null，导致元素凭空消失且无任何报错。
 */
export function resolveComponentType(jsonType) {
  const renderType = COMPONENT_TYPE_MAP[jsonType];
  if (renderType) {
    return { renderType, componentType: jsonType, known: true };
  }
  if (jsonType) {
    console.warn(
      `[AI] 未知组件类型 "${jsonType}"，已降级为 rectangle。` +
      `如需支持，请在 COMPONENT_TYPE_MAP、componentList.js 与 Canvas.jsx switch 中同步补充。`
    );
  }
  return { renderType: 'rect', componentType: 'rectangle', known: false };
}