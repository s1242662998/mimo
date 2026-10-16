/**
 * badge 组件的 props 语义契约（回归测试）
 *
 * 【本轮修复的 bug】卡片页「即将下线」标签只剩一个灰色矩形块，文字消失。
 *
 * 模型 HTML：
 *   <span style="font-size:11px;color:#8a8782;background:#f1efec;
 *                border:1px solid #e5e2dd;border-radius:4px;padding:2px 7px;">即将下线</span>
 *
 * 排查过程（值得记录，因为判据全过、错在判据之后）：
 *   1. isBadgeLike 判据 7 项全 PASS → 确实是 badge，判据没问题
 *   2. Canvas badge 分支 Rect + Text 都在，textColor 有兜底 → 渲染层没问题
 *   3. applyTextStyle 确实会写 props.textColor → 也没问题
 *   → 于是开始怀疑「textColor 是不是丢了」。方向就错了。
 *
 * 真根因：applyTextStyle 里有一段「填充色语义换算」——
 *   hasBackground = !!props.fill        // badge 分支在此之前已把 fill 设成底色
 *   props.backgroundFill = props.fill   // #F1EFEC
 *   props.fill = props.textColor        // ← 覆盖成 #8A8782
 *
 * 这段是为 **text 组件** 写的：Konva <Text> 的 fill 是字色，
 * 所以元素有背景时必须把底色挪到 backgroundFill，字色才能占 fill。
 * 但 **badge 的 props 契约正好相反**：fill = 徽标底色，textColor = 字色。
 *
 * 于是 Canvas 画出「字色底 #8A8782 + 字色字 #8A8782」—— 字底同色，文字彻底消失，
 * 只剩一个比预期更深的灰块。不报错、不警告，只是标签文字不见了。
 *
 * 修法：applyTextStyle 增加 options.fillIsTextColor 开关（默认 true 保持 text 语义），
 *      badge 分支传 false 整体跳过换算。
 *
 * 【测试策略】从 htmlToShapes.js **抠出真实的 applyTextStyle 函数体**注入沙箱执行，
 * 而不是手抄一份等价实现 —— 否则测试就变成在验证「我抄的代码和我写的代码一致」。
 */
import { readFileSync } from 'node:fs';

const parserSrc = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

let pass = 0;
let fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}
function section(t) { console.log(`\n[${t}]`); }

function grab(name) {
  const start = parserSrc.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`找不到 ${name}`);
  // 【踩坑】不能直接 indexOf('{', start) —— 参数默认值 `options = {}` 里也有花括号，
  // 会把函数体的括号配对数算错。必须先跳过成对的参数圆括号。
  let paren = 0;
  let bodyStart = -1;
  for (let j = parserSrc.indexOf('(', start); j < parserSrc.length; j++) {
    if (parserSrc[j] === '(') paren++;
    else if (parserSrc[j] === ')') { paren--; if (paren === 0) { bodyStart = parserSrc.indexOf('{', j); break; } }
  }
  if (bodyStart < 0) throw new Error(`${name} 找不到函数体`);
  let depth = 0;
  for (let j = bodyStart; j < parserSrc.length; j++) {
    if (parserSrc[j] === '{') depth++;
    else if (parserSrc[j] === '}') { depth--; if (depth === 0) return parserSrc.slice(start, j + 1); }
  }
  throw new Error(`${name} 括号不配对`);
}

function toHex(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (s === 'transparent') return null;
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return s.toUpperCase();
  const p = m[1].split(',').map(x => x.trim());
  if (p[3] !== undefined && parseFloat(p[3]) === 0) return null;
  return '#' + p.slice(0, 3).map(n => Math.round(parseFloat(n) || 0).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// 【踩坑记录】applyTextStyle 依赖 resolveFontFamily，必须一并注入
const resolveFontFamily = () => 'Inter';

const applyTextStyle = new Function(
  'toHex', 'resolveFontFamily',
  `${grab('applyTextStyle')} return applyTextStyle;`,
)(toHex, resolveFontFamily);

/* ============================================================
   [1] badge 语义：fill 必须保持底色，绝不能被覆盖成字色
   ============================================================ */
section('1. badge 的 fill 语义不被 applyTextStyle 破坏');

const badgeComputed = {
  color: 'rgb(138, 135, 130)',             // #8a8782 字色
  backgroundColor: 'rgb(241, 239, 236)',   // #f1efec 底色
  fontFamily: 'Inter',
  fontSize: '11px',
  fontWeight: '400',
  fontStyle: 'normal',
  letterSpacing: 'normal',
  textDecorationLine: 'none',
  textAlign: 'center',
  paddingLeft: '7px', paddingRight: '7px',
  paddingTop: '2px', paddingBottom: '2px',
  borderTopLeftRadius: '4px',
  borderTopWidth: '1px', borderTopColor: 'rgb(229, 226, 221)',
};

// 复刻 badge 分支的调用方式：先设 fill（底色），再调 applyTextStyle
const badgeProps = { fill: toHex(badgeComputed.backgroundColor) };
applyTextStyle(badgeProps, badgeComputed, { fillIsTextColor: false });

ok(badgeProps.fill === '#F1EFEC', 'fill 仍是徽标底色', `实际 ${badgeProps.fill}`);
ok(badgeProps.textColor === '#8A8782', 'textColor 是字色', `实际 ${badgeProps.textColor}`);
ok(badgeProps.fill !== badgeProps.textColor, 'fill ≠ textColor（不同色才可见）');

// Canvas badge 分支：Rect 用 fill，Text 用 textColor
// 若两者同色 → 文字不可见。这就是截图现象。
const rectColor = badgeProps.fill || '#EF4444';
const textColor = badgeProps.textColor || '#FFFFFF';
ok(rectColor !== textColor, 'Canvas 实绘：底色 ≠ 字色（文字可见）', `底 ${rectColor} / 字 ${textColor}`);

// 反证：如果不传 fillIsTextColor:false（修复前的行为），fill 会被覆盖
const buggy = { fill: toHex(badgeComputed.backgroundColor) };
applyTextStyle(buggy, badgeComputed);
ok(buggy.fill === '#8A8782', '反证：不传开关时 fill 会被覆盖成字色（即修复前的 bug）', `实际 ${buggy.fill}`);
ok(buggy.fill === buggy.textColor, '反证：修复前字底同色 → 文字不可见');

/* ============================================================
   [2] text 语义不回归：聊天气泡仍需 backgroundFill 换算
   ============================================================ */
section('2. text 组件的换算行为保持不变（气泡不回归）');

const bubbleComputed = {
  ...badgeComputed,
  color: 'rgb(17, 17, 17)',
  backgroundColor: 'rgb(149, 236, 105)',  // #95EC69 微信绿气泡
  fontSize: '14px',
  paddingLeft: '10px', paddingRight: '14px',
  paddingTop: '9px', paddingBottom: '9px',
  borderTopLeftRadius: '4px',
  borderTopWidth: '0px',
};

const bubbleProps = { fill: toHex(bubbleComputed.backgroundColor) };
applyTextStyle(bubbleProps, bubbleComputed);   // 无开关 = text 语义

ok(bubbleProps.backgroundFill === '#95EC69', '气泡底色挪到 backgroundFill', `实际 ${bubbleProps.backgroundFill}`);
ok(bubbleProps.fill === '#111111', 'fill 让给字色', `实际 ${bubbleProps.fill}`);
ok(bubbleProps.paddingLeft === 10, '气泡 padding 透传', `左 ${bubbleProps.paddingLeft}`);
ok(bubbleProps.verticalAlign === 'middle', '气泡垂直居中', bubbleProps.verticalAlign);

// 无背景的普通文本：fill 就是字色
const plainProps = {};
applyTextStyle(plainProps, { ...bubbleComputed, backgroundColor: 'rgba(0, 0, 0, 0)' });
ok(plainProps.fill === '#111111', '无背景文本 fill = 字色', `实际 ${plainProps.fill}`);
ok(plainProps.backgroundFill === undefined, '无背景文本不产生 backgroundFill');

/* ============================================================
   [3] Canvas badge 分支渲染能力（源码静态核对）
   ============================================================ */
section('3. Canvas badge 分支渲染能力');
const canvasSrc = readFileSync(new URL('../src/components/Canvas.jsx', import.meta.url), 'utf8');
const badgeStart = canvasSrc.indexOf("startsWith('badge')");
const badgeBlock = badgeStart < 0 ? '' : canvasSrc.slice(badgeStart, badgeStart + 3200);

ok(badgeStart > 0, 'Canvas 存在 badge 分支');
ok(/fill=\{activeProps\.fill \|\| '#EF4444'\}/.test(badgeBlock), 'Rect 用 fill（底色）');
ok(/fill=\{activeProps\.textColor \|\| '#FFFFFF'\}/.test(badgeBlock), 'Text 用 textColor（字色）');
ok(/stroke=\{activeProps\.stroke\}/.test(badgeBlock), 'Rect 渲染边框（本轮补上）');
ok(/letterSpacing=\{activeProps\.letterSpacing\}/.test(badgeBlock), '透传字间距（本轮补上）');
ok(/fontFamily=\{activeProps\.fontFamily \|\| 'Inter'\}/.test(badgeBlock), '透传字体（本轮补上）');
// 之前 y={-fontSize / 2}，与 verticalAlign="middle" + height 叠加会双重偏移
ok(/y=\{-height \/ 2\}/.test(badgeBlock), '文字 y 用 -height/2（不与 verticalAlign 叠加偏移）');

/* ============================================================
   [4] 调用点纪律：只有 badge 传开关
   ============================================================ */
section('4. 调用点纪律');
// 注意：正则会连函数定义那一行一起数进去（定义也以 applyTextStyle( 开头），
// 所以这里断言的是 4 行 = 3 处调用 + 1 处定义。
const callSites = [...parserSrc.matchAll(/applyTextStyle\((\w+), computed([^)]*)\)/g)];
ok(callSites.length === 4, `applyTextStyle 出现 4 次（3 处调用 + 1 处定义）`, `实际 ${callSites.length}`);
ok(callSites.filter(c => c[2].includes('fillIsTextColor')).length === 1, '只有 badge 分支传 fillIsTextColor:false');
ok(!/applyTextStyle\(props, computed\)/.test(
  parserSrc.slice(parserSrc.indexOf("componentType = 'badge'"), parserSrc.indexOf("componentType = 'badge'") + 700)
), 'badge 分支不再裸调 applyTextStyle');

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);
