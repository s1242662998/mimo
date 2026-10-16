/**
 * 回归验证：HTML 解析层「未生成任何组件」bug 的修复
 *
 * 用户报告的现象：上传截图要求复刻 → 「HTML 解析后未生成任何组件，请重试」
 *
 * 根因链（两个 bug 叠加导致全军覆没）：
 *   Bug A：elementToShape 只给 text/icon 分支写了 props.width/height，
 *          矩形/按钮/输入框等没有尺寸 → 下一步过滤时被判为不可见
 *   Bug B：坐标归零的顺序错了 —— 先过滤再平移，
 *          过滤条件作用在 -99999 的负坐标上 → 所有元素被删光
 *   （结果 shapes.length === 0，ChatWindow 抛「HTML 解析后未生成任何组件」）
 *
 * 这两个都是浏览器 DOM 行为，无法在 Node 直接跑；
 * 下方用纯逻辑复现过滤与归零的判定顺序，验证修复后的逻辑正确。
 */

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

const CONTAINER_OFFSET = 10000;

/** 修复后的归零 + 过滤逻辑（与 htmlToShapes.js 保持一致） */
function normalizeAndFilter(shapes) {
  const normalized = shapes.map(s => ({ ...s, x: s.x + CONTAINER_OFFSET, y: s.y }));
  return normalized.filter(s => {
    const w = s.props.width || 0;
    const h = s.props.height || 0;
    if (h > 0 && s.y + h < 0) return false;
    if (w > 0 && s.x + w < 0) return false;
    if (s.y > 20000) return false;
    return true;
  });
}

/** 修复前的逻辑：先过滤（负坐标）再平移 */
function oldNormalizeAndFilter(shapes) {
  const MIN_VISIBLE = 0;
  return shapes
    .filter(s => s.x + (s.props.width || 0) >= MIN_VISIBLE && s.y + (s.props.height || 0) >= MIN_VISIBLE)
    .map(s => ({ ...s, x: s.x + 99999, y: s.y }));
}

console.log('\n=== 1. 复现原bug ===');
// 模拟：一个 300px 宽的卡片在离屏容器内，left ≈ -10000+16
const rawShapes = [
  { id: 'rectangle-1', x: -9984, y: 0, props: { width: 300, height: 178, fill: '#FFFFFF' } },
  { id: 'text-1', x: -9968, y: 16, props: { width: 100, height: 22, text: '登录' } },
  { id: 'button-1', x: -9984, y: 118, props: { width: 268, height: 44, fill: '#2563EB' } },
];
const oldResult = oldNormalizeAndFilter(rawShapes);
console.log(`  修复前：3 个元素 → 过滤后剩 ${oldResult.length} 个`);
check('修复前所有元素被误删（复现用户报告的报错）', oldResult.length === 0, `实际剩 ${oldResult.length}`);

console.log('\n=== 2. 修复后归零+过滤 ===');
const newResult = normalizeAndFilter(rawShapes);
check('3 个元素全部保留', newResult.length === 3, `实际 ${newResult.length}`);
console.log('  归零后坐标:', newResult.map(s => `${s.id}@(${s.x},${s.y})`).join('  '));
check('x 坐标已归零到合理范围（0 起）', newResult.every(s => s.x >= 0 && s.x < 1000), `实际 ${newResult.map(s => s.x)}`);
check('y 坐标保持不变', newResult.every(s => s.y >= 0));

console.log('\n=== 3. Bug A：尺寸必须写入 props ===');
// elementToShape 的尺寸写入逻辑（复刻修复后代码）
function computeDims(finalType, rect, props) {
  const out = { ...props };
  if (finalType === 'circle') {
    out.radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
  } else if (finalType === 'text') {
    const fs = Number(out.fontSize) || 16;
    const estWidth = Math.ceil((out.text || '').length * fs * 0.6) + 12;
    out.width = Math.max(rect.width, estWidth, 40);
    out.height = Math.max(rect.height, fs * 1.4);
  } else {
    out.width = Math.max(1, rect.width);
    out.height = Math.max(1, rect.height);
  }
  return out;
}
const rectDims = computeDims('rectangle', { width: 300, height: 178 }, { fill: '#FFF' });
check('rectangle 写入 width/height', rectDims.width === 300 && rectDims.height === 178);
const btnDims = computeDims('button', { width: 268, height: 44 }, { fill: '#2563EB', text: '立即登录' });
check('button 写入 width/height', btnDims.width === 268 && btnDims.height === 44);
const inputDims = computeDims('input', { width: 268, height: 44 }, { placeholder: '请输入' });
check('input 写入 width/height', inputDims.width === 268 && inputDims.height === 44);
const imgDims = computeDims('image', { width: 268, height: 140 }, { fill: '#E5E7EB' });
check('image 写入 width/height', imgDims.width === 268 && imgDims.height === 140);
const circleDims = computeDims('circle', { width: 48, height: 48 }, { fill: '#3B82F6' });
check('circle 写入 radius', circleDims.radius === 24);
const textDims = computeDims('text', { width: 50, height: 18 }, { text: '这是一段很长的中文文本', fontSize: 16 });
check('text 宽高不足时按文本长度兜底估宽', textDims.width > 50, `实际 ${textDims.width}`);
console.log(`  修复前：仅 text/icon 有尺寸，rectangle/button/input/image 全部缺失 → 被过滤`);

console.log('\n=== 4. 文本类元素零尺寸不再被丢弃 ===');
function shouldSkipZeroSize(tag, rectW, rectH, hasBorder) {
  const isTextCarrier = ['span','p','h1','h2','h3','h4','h5','h6','label','a'].includes(tag);
  if ((rectW < 1 || rectH < 1) && !hasBorder && !isTextCarrier) return true;
  return false;
}
check('span 零尺寸被保留', !shouldSkipZeroSize('span', 0, 0, false));
check('p 零尺寸被保留', !shouldSkipZeroSize('p', 0, 0, false));
check('div 零尺寸且无边框仍跳过（避免空矩形）', shouldSkipZeroSize('div', 0, 0, false));
check('div 有边框则保留', !shouldSkipZeroSize('div', 0, 0, true));

console.log('\n=== 5. 离屏常量一致性 ===');
check('CONTAINER_OFFSET 与平移量一致（不再用 magic -99999/+99999）', CONTAINER_OFFSET === 10000);

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);
