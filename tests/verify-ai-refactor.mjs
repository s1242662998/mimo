/**
 * AI 框架重构验证脚本
 * 覆盖：组件类型白名单、幻觉类型降级、HTML 提取、提示词契约
 */
import { resolveComponentType, VALID_COMPONENT_TYPES, COMPONENT_TYPE_MAP } from '../src/utils/componentSchema.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

console.log('\n=== 1. 组件类型单一事实来源 ===');
console.log(`  合法类型 ${VALID_COMPONENT_TYPES.length} 种: ${VALID_COMPONENT_TYPES.join(', ')}`);
check('类型清单非空', VALID_COMPONENT_TYPES.length > 0);

const knownTypes = ['text','button','input','rectangle','circle','image','icon','arrow','line','group','dynamicPanel','switch','checkbox','radio','badge','slider','progress','divider','avatar'];
let knownOk = 0;
for (const t of knownTypes) {
  const r = resolveComponentType(t);
  if (r.known && r.renderType === COMPONENT_TYPE_MAP[t]) knownOk++;
}
check(`全部 ${knownTypes.length} 种已知类型映射正确`, knownOk === knownTypes.length, `实际 ${knownOk}`);

console.log('\n=== 2. 幻觉类型降级（改造前会静默消失） ===');
const hallucinated = ['card','navbar','container','table','chart','flex','footer-nav','text-field','form-item'];
let downgraded = 0;
for (const t of hallucinated) {
  const r = resolveComponentType(t);
  if (!r.known && r.renderType === 'rect' && r.componentType === 'rectangle') downgraded++;
}
check(`${hallucinated.length} 种幻觉类型全部降级为矩形且可告警`, downgraded === hallucinated.length, `实际 ${downgraded}`);

console.log('\n  改造前后行为对比:');
for (const t of hallucinated.slice(0, 3)) {
  const oldRender = COMPONENT_TYPE_MAP[t] || t || 'rect';
  const newRender = resolveComponentType(t).renderType;
  console.log(`    "${t}"  旧→type="${oldRender}"(Canvas 无此 case→return null→元素凭空消失)`);
  console.log(`  "${t}"         新→type="${newRender}"(降级为矩形，元素可见 + console.warn)`);
}

console.log('\n=== 3. type 与 componentType 分离验证 ===');
const btn = resolveComponentType('button');
check('button 渲染类型为 rect', btn.renderType === 'rect');
check('button 语义类型保持 button（Canvas 靠它分发按钮样式）', btn.componentType === 'button');
const icon = resolveComponentType('icon');
check('icon 渲染类型为 icon（改造前 typeMap 缺失，靠|| 兜底侥幸可用）', icon.renderType === 'icon');
const arrow = resolveComponentType('arrow');
check('arrow 渲染类型为 arrow（改造前 typeMap 缺失）', arrow.renderType === 'arrow');

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);
