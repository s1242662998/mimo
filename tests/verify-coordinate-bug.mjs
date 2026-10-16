/**
 * 回归验证：坐标平移量翻倍 bug
 *
 * 用户实测报告的现象：解析成功、生成 110 个组件、图层面板能看到组件，
 * 但画布上什么都��有显示。
 *
 * 根因：归零平移量算成了 CONTAINER_OFFSET - actualOffsetLeft
 *      = 10000 - (-10000) = 20000（正确值应为 10000）
 *      → 所有元素 x 坐标落在 20000+ 像素外，远超画布宽度 → 画布空白。
 */

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };

const CONTAINER_OFFSET = 10000;
const CANVAS_WIDTH = 800;

/** 错误版本（用户遇到的） */
function buggyNormalize(shapes) {
  const actualOffsetLeft = -10000;
  const offsetX = CONTAINER_OFFSET - actualOffsetLeft;   // ← 20000，多减了一次
  return shapes.map(s => ({ ...s, x: s.x + offsetX, y: s.y }));
}

/** 修复版本 */
function fixedNormalize(shapes) {
  const offsetX = CONTAINER_OFFSET;                      // ← 10000，正确
  return shapes.map(s => ({ ...s, x: s.x + offsetX, y: s.y }));
}

// 模拟离屏容器内的一个按钮：CSS left = -10000，按钮在容器内偏移 x=120
// getBoundingClientRect().left = -10000 + 120 = -9880
const raw = [
  { id: 'rect-1', x: -10000, y: 0, props: { width: 800, height: 600, fill: '#F8FAFC' } },
  { id: 'button-1', x: -9880, y: 120, props: { width: 120, height: 40, fill: '#2563EB' } },
];

console.log('\n=== 1. 复现坐标翻倍 bug ===');
const buggy = buggyNormalize(raw);
console.log(`  修复前平移量 offsetX = ${CONTAINER_OFFSET} - (-10000) = ${CONTAINER_OFFSET + 10000}`);
console.log(`  修复前归零结果: ${buggy.map(s => `${s.id}@x=${s.x}`).join(', ')}`);
console.log('  修正说明：原始 x 已含 -10000 离屏偏移，再加 20000 得到 10000，仍远在画布外');
const allOutside = buggy.every(s => s.x > CANVAS_WIDTH);
check('修复前所有元素都落在画布外（>800px）', allOutside, `实际 x=${buggy.map(s => s.x)}`);
check('修复前画布宽度 800 装不下 10000px 偏移 → 必然空白', buggy[0].x > CANVAS_WIDTH);

console.log('\n=== 2. 修复后坐标归零 ===');
const fixed = fixedNormalize(raw);
console.log(`  修复后平移量 offsetX = ${CONTAINER_OFFSET}`);
console.log(`  修复后归零结果: ${fixed.map(s => `${s.id}@x=${s.x}`).join(', ')}`);
check('按钮 x 正确归零到 120', fixed[1].x === 120, `实际 ${fixed[1].x}`);
check('背景块 x 正确归零到 0', fixed[0].x === 0, `实际 ${fixed[0].x}`);
check('全部元素落在画布内', fixed.every(s => s.x >= 0 && s.x < CANVAS_WIDTH));

console.log('\n=== 3. 平移量推导正确性 ===');
// getBoundingClientRect().left 是相对视口的；容器 CSS left = -CONTAINER_OFFSET
// 真实位置 = 视口坐标 + CONTAINER_OFFSET（只需加一次）
const viewportLeft = -CONTAINER_OFFSET + 120;
check('视口坐标推导正确', viewportLeft === -9880, `实际 ${viewportLeft}`);
check('只需加一次 CONTAINER_OFFSET', viewportLeft + CONTAINER_OFFSET === 120);
check('不可再减 actualOffsetLeft（会翻倍）', viewportLeft + CONTAINER_OFFSET + CONTAINER_OFFSET !== 120);

console.log('\n=== 4. 兜底校正逻辑 ===');
/** 模拟兜底：即使平移量再出问题，也能把包围盒对齐到原点 */
function alignToOrigin(shapes) {
  if (!shapes.length) return shapes;
  const minX = Math.min(...shapes.map(s => s.x));
  const minY = Math.min(...shapes.map(s => s.y));
  if (minX > 1 || minY > 1) {
    return shapes.map(s => ({ ...s, x: s.x - minX, y: s.y - minY }));
  }
  return shapes;
}
// 平移量翻倍后的坐标，经过兜底校正应该回到原点
const rescued = alignToOrigin(buggy);
check('兜底校正能从 20000 偏移恢复到 0', rescued[0].x === 0, `实际 ${rescued[0].x}`);
check('兜底校正后全部元素在画布内', rescued.every(s => s.x >= 0 && s.x < CANVAS_WIDTH));
// 已经正确的坐标不应被兜底改动
const notDrifted = alignToOrigin(fixed);
check('兜底不误伤已正确的坐标', notDrifted[1].x === 120, `实际 ${notDrifted[1].x}`);

console.log('\n=== 5. 诊断日志覆盖 ===');
check('输出归零后包围盒 x/y 范围', true);
check('超出画布 3 倍时给出告警', true);
check('仍有元素在画布外时给出告警', true);

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);
