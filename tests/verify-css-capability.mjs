/**
 * CSS 概念支持度盘点
 *
 * 与 verify-props-contract.mjs 的区别：
 *   那份查「字段名是否一一对应」（契约一致性）
 *   这份查「CSS 概念有没有被支持」（能力边界）
 *
 * 为什么要做成测试而非文档：
 *   能力边界会随代码演进变化，写成 markdown 必然过期。
 *   作为可执行断言，每次改代码都能立刻看到「支持了什么、还缺什么」。
 *
 * 盘点方法：读真实源码，提取解析层读取的 computed.* 属性全集，
 * 与「CSS 概念基准清单」做差集。基准清单按W3C 常见还原项选取，
 * 不是穷举—— 目的是暴露缺口，不是当CSS 规范文档。
 */

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0, gap = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const note = (n) => { gap++; console.log(`  GAP   ${n}`); };

const P = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const parser = P('src/utils/htmlToShapes.js');
const canvas = P('src/components/Canvas.jsx');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const parserCode = strip(parser);
const canvasCode = strip(canvas);

/** 解析层实际读取的 computed 属性全集 —— 这是能力边界的硬边界 */
const readComputed = new Set(
  [...parserCode.matchAll(/\bcomputed\.([a-zA-Z]+)/g)].map(m => m[1])
);

/** 解析层实际写入的 props 字段 */
const writtenProps = new Set([
  ...[...parserCode.matchAll(/\bprops\.([A-Za-z_]\w*)\s*=(?!=)/g)].map(m => m[1]),
]);

console.log('\n=== CSS 概念支持度盘点 ===\n');
console.log(`解析层读取的CSS 属性：${readComputed.size} 个`);
console.log(`  ${[...readComputed].sort().join(' ')}\n`);

/* ------------------------------------------------------------------ *
 * 1. 完全支持的概念（解析层读取 + Canvas 消费）
 * ------------------------------------------------------------------ */
console.log('[1] 已支持的基础视觉属性');
const SUPPORTED = [
  ['背景色', 'backgroundColor'],
  ['文字颜色', 'color'],
  ['字号', 'fontSize'],
  ['字重', 'fontWeight'],
  ['斜体', 'fontStyle'],
  ['字体', 'fontFamily'],
  ['透明度', 'opacity'],
  ['圆角', 'borderTopLeftRadius'],
  ['边框色', 'borderTopColor'],
  ['边框宽', 'borderTopWidth'],
  ['阴影', 'boxShadow'],
  ['四向内边距', 'paddingLeft'],
  ['下划线/删除线', 'textDecorationLine'],
];
for (const [label, prop] of SUPPORTED) {
  check(`${label}（${prop}）`, readComputed.has(prop), `解析层未读取 ${prop}`);
}

/* ------------------------------------------------------------------ *
 * 2. 部分支持：有解析但有损，或有组件能力但解析层不产出
 * ------------------------------------------------------------------ */
console.log('\n[2] 部分支持（有损或单向）');

// background-image：linear-gradient 已完整还原，radial/图片仍降级
check('backgroundImage 被读取',
  readComputed.has('backgroundImage'),
  'backgroundImage 未被读取');
check('linear-gradient 被解析为 Konva 渐变四元组+色标',
  /gradientStartX = lg\.sx/.test(parserCode)
  && /gradientColorStops = lg\.colorStops/.test(parserCode));
check('渐变首色写入 fill 作为纯色回退（避免完全透明消失）',
  /props\.fill = lg\.colorStops\[1\]/.test(parserCode),
  '渐变元素缺少纯色回退，首色为透明时会看不见');
check('非linear 渐变退回 hasBackgroundImage',
  /hasBackgroundImage = true/.test(parserCode));
check('半透明色标不被 toHex 丢弃（否则透明渐隐整条失效）',
  /normalizeRgba/.test(parserCode)
  && !/const color = toHex\(cs\[1\]\)/.test(parserCode),
  '渐变色标走了 toHex，alpha=0 会返回 null 导致整条渐变被丢弃');
check('Canvas 五处分支均接入渐变',
  (canvasCode.match(/\.\.\.buildGradientFill\(activeProps\)/g) || []).length >= 5,
  'buildGradientFill 接入点少于 5 处');
note('linear-gradient：已完整支持（任意角度/方向词/任意色标数/半透明）。'
  + 'radial-gradient 与 repeating-linear-gradient 仍走 hasBackgroundImage 降级。');

// text-align 多行：extractRenderedLines 返回了每行的 left/right，
// 但上层只取了 rendered[0].left —— 多行居中/右对齐时后续行仍按左对齐绘制。
// 这是「有数据但没用上」的典型缺口，容易被误判为已解决，故加断言固化现状。
check('extractRenderedLines 逐行返回 left/right（数据已具备）',
  /if \(rect\.right > line\.right\) line\.right = rect\.right/.test(parserCode)
  && /prev\.right = Math\.max\(prev\.right, l\.right\)/.test(parserCode));
check('text-align 被解析并写入 props',
  readComputed.has('textAlign') && /props\.align = ta/.test(parserCode));
check('上层仅取首行 left 作为整体坐标（已知缺口，未修复）',
  /shapeTextBox\.left = rendered\[0\]\.left/.test(parserCode));
note('text-align 多行居中：extractRenderedLines 已算出每行 left/right，'
  + '但上层只取 rendered[0].left。多行居中标题的尾部行会偏左。'
  + '修复成本低（Konva Text 支持每行独立 x），但需改 Konva 渲染方式为多 Text 节点。');

/* ------------------------------------------------------------------ *
 * 3. 完全缺失：解析层根本没读
 * ------------------------------------------------------------------ */
console.log('\n[3] 完全缺失的概念（解析层从未读取）');

const MISSING = [
  ['line-height', '行高', '解析层改用浏览器实测行盒推算，绕过该属性 → 多数情况等价但极端值会偏'],
  ['white-space', '空白处理', 'nowrap/pre 会导致换行决策不同，Range API 能兜住但 pre 保留空格会丢'],
  ['word-break/overflow-wrap', '断词规则', '长串URL/英文的换行位置会与浏览器不同'],
  ['vertical-align', '垂直对齐', '行内元素基线对齐，影响混排观感'],
  ['writing-mode', '书写方向', '竖排文本基本不支持'],
  ['object-fit', '图片填充方式', 'cover/contain 会影响图片在框内的缩放方式'],
];

for (const [prop, label, impact] of MISSING) {
  const supported = readComputed.has(prop);
  if (supported) {
    check(`${label}（${prop}）已支持`, true);
  } else {
    note(`${label}（${prop}）缺失 — ${impact}`);
  }
}

/* ------------------------------------------------------------------ *
 * 3b. 本轮已补上的能力（防止被误列为缺口）
 * ------------------------------------------------------------------ */
console.log('\n[3b] 本轮新增支持（已从缺口清单移除）');

check('letter-spacing：解析层读取 computed',
  readComputed.has('letterSpacing')
  && /props\.letterSpacing = ls/.test(parserCode));
check('letter-spacing：Canvas 传给 Konva',
  /letterSpacing=\{activeProps\.letterSpacing \|\| 0\}/.test(canvasCode));
check('letter-spacing：测宽函数按 (n-1)×ls 补偿',
  /measureTextWidth[\s\S]{0,120}?letterSpacing = 0/.test(parserCode)
  && /Array\.from\(text\)\.length - 1/.test(parserCode));
check('letter-spacing：属性面板可调',
  /key: 'letterSpacing', label: '字间距'/.test(
    readFileSync(new URL('../src/components/PropertiesPanel.jsx', import.meta.url), 'utf8')));

check('text-transform：解析层应用转换',
  /function applyTextTransform\(/.test(parserCode)
  // 【第三十六轮】行文本先经collapseBlank 清掉行首缩进空白，
  // 再套 text-transform —— 两个变换是串联的，顺序不能反。
  && /applyTextTransform\(collapseBlank\(l\.text\), computed\.textTransform\)/.test(parserCode));
check('text-transform：兜底路径同样应用（两条路径不分叉）',
  /applyTextTransform\(directTextContent\(el\), computed\.textTransform\)/.test(parserCode));
note('text-transform 必须在解析层做：Konva Text 无此属性；'
  + '且 extractRenderedLines 的文本取自 textContent（原始大小写）'
  + '而行盒 rect 是浏览器转换后坐标 —— 不转换会「宽度按大写量、文本却是小写」。');

check('overflow 裁剪：解析层检测真实超出',
  /function detectOverflowClip\(/.test(parserCode)
  && /props\.clipLeft = clip\.overLeft/.test(parserCode));
check('overflow 裁剪：Canvas 生成 clipFunc',
  /function buildOverflowClip\(/.test(canvasCode)
  && /function makeClipFunc\(/.test(canvasCode));
check('裁剪函数定义在 ImageShape 之前（eslint no-undef 约束）',
  canvasCode.indexOf('function buildOverflowClip(') < canvasCode.indexOf('function ImageShape(')
  && canvasCode.indexOf('function buildOverflowClip(') !== -1,
  '函数声明虽会被运行时提升，但 eslint no-undef 会判为未定义');
check('overflow 裁剪：仅在超出时生效（不拖慢常规渲染）',
  /if \(cl <= 0 && ct <= 0 && cr <= 0 && cb <= 0\) return null/.test(canvasCode));
check('overflow 裁剪：rect/text/image 三分支均已接入',
  (canvasCode.match(/clipFunc=\{makeClipFunc\(/g) || []).length >= 3);

/* ------------------------------------------------------------------ *
 * 3c. 伪缺口（曾被误列，已查明无需处理）
 * ------------------------------------------------------------------ */
console.log('\n[3c] 伪缺口（无需处理，避免误导）');
// text-indent：Range API 实测的 rendered[0].left 本身就在缩进后的位置，
// 缩进已被自动吸收，再读text-indent 反而会二次偏移。
check('text-indent 已被 Range API 自动吸收（无需读取）',
  /shapeTextBox\.left = rendered\[0\]\.left/.test(parserCode)
  && !readComputed.has('text-indent'));
note('text-indent 不是缺口：extractRenderedLines 取的是浏览器实测行盒，'
  + '首行 left 已包含缩进位移。读取该属性会导致二次偏移。');

/* ------------------------------------------------------------------ *
 * 4. 关键结论断言：层级模型的真实边界
 * ------------------------------------------------------------------ */
console.log('\n[4] 层级模型（z-index 缺位的补偿机制）');
check('两阶段收集：背景层与叶子层分离',
  /const bgShapes = \[\]/.test(parserCode) && /const leafShapes = \[\]/.test(parserCode));
check('背景层先绘制，叶子层后绘制',
  /bgShapes\.concat\(leafShapes\)|bgShapes[\s\S]{0,80}leafShapes[\s\S]{0,40}(concat|\.\.\.)/.test(parserCode));
check('Canvas 未对 shape 排序（依赖数组顺序）',
  !/\.sort\(.*zIndex/.test(canvasCode),
  '若 Canvas 自行排序，需与解析层顺序约定对齐');
note('z-index 缺失由两阶段收集补偿：所有文字恒在最上层。'
  + '代价是无法还原「文字压在图片之上」的合法遮挡关系（如下拉菜单浮层）。');

/* ------------------------------------------------------------------ *
 * 5. 渐变与滤镜：当前明确不支持的清单
 * ------------------------------------------------------------------ */
console.log('\n[5] 明确不支持的渲染能力');
for (const [label, note_] of [
  ['背景图片', 'background-image: url(...) 不渲染'],
  ['滤镜', 'filter: blur/drop-shadow 不渲染'],
  ['混合模式', 'mix-blend-mode 不渲染'],
  ['SVG 图标', '只支持 <i> 类名的图标库与 path，未知图标渲染为空'],
  ['边框图片', 'border-image 不渲染'],
  ['outline', 'outline 与 box-shadow 视觉不同，不渲染'],
  ['多边框', 'border 简写只取 top，其余边忽略'],
]) {
  note(`${label} — ${note_}`);
}

/* ------------------------------------------------------------------ *
 * 5b. 关键区分：「解析层缺口」≠「组件缺能力」
 *
 * 盘点最容易犯的错误：把「Canvas 没接这个属性」当成「Konva 不支持」。
 * 实际查证 node_modules/konva 的类型定义后发现多个属性是Konva 原生支持的，
 * 只是我们没接线 —— 这类属于纯接线成本，远低于真正的能力建设。
 * 下面的断言用于防止把这两类混淆。
 * ------------------------------------------------------------------ */
console.log('\n[5b] Konva 原生能力 vs 本项目接线状态');
const konvaTypes = P('node_modules/konva/lib/shapes/Text.d.ts');
const konvaContext = P('node_modules/konva/lib/Context.d.ts');

check('Konva Text 原生支持 letterSpacing',
  /letterSpacing\?:/.test(konvaTypes));
check('Konva Text 原生支持 ellipsis（我们未接线）',
  /ellipsis\?:/.test(konvaTypes));
check('Canvas 已接线 letterSpacing',
  /letterSpacing=\{activeProps\.letterSpacing \|\| 0\}/.test(canvasCode));
check('Canvas 未接线 ellipsis（属接线缺口，非能力缺口）',
  !/ellipsis/.test(canvasCode));
check('Konva Context 原生支持线性/径向渐变',
  /createLinearGradient/.test(konvaContext)
  && /createRadialGradient/.test(konvaContext));
note('渐变（linear-gradient）：已在解析层翻成 Konva 渐变参数并全分支接线（见 [2] 节）；'
  + 'radial-gradient 仍需另一套 startRadius/endRadius 参数，属B 类。');
note('行数截断（line-clamp）：Konva Text 有 ellipsis，'
  + '但无 -webkit-line-clamp 的多行截断，需自行算截断位置 → 成本高于单行 ellipsis。');

/* ------------------------------------------------------------------ *
 * 6. 溢出裁剪
 * ------------------------------------------------------------------ */
console.log('\n[6] overflow 裁剪');
check('解析层用祖先 overflow:hidden 补偿圆角',
  /inheritClipRadius/.test(parserCode));
check('解析层检测真实溢出并给出裁剪量',
  /function detectOverflowClip\(/.test(parserCode));
check('仅在元素真的超出祖先时返回（圆角重叠不算）',
  /if \(overLeft <= EPS && overTop <= EPS && overRight <= EPS && overBottom <= EPS\) \{\s*return null/.test(parserCode),
  '圆角重叠也返回裁剪量会给绝大多数元素强加 clipFunc');
check('Canvas 侧 rect/text/image 均接入裁剪',
  (canvasCode.match(/clipFunc=\{makeClipFunc\(/g) || []).length >= 3);
note('z-index 缺失由两阶段收集补偿：所有文字恒在最上层。'
  + '代价是无法还原「文字压在图片之上」的合法遮挡关系（如下拉菜单浮层）。');

/* ------------------------------------------------------------------ *
 * 汇总
 * ------------------------------------------------------------------ */
console.log(`\n=== 盘点汇总：${pass} 通过 / ${fail} 失败 / ${gap} 项能力缺口 ===\n`);
console.log('本轮已补上（从缺口清单移除）：');
console.log('  ✓ letter-spacing（解析 + 渲染 + 测宽补偿 + 属性面板）');
console.log('  ✓ text-transform（解析层应用，因Konva 无此属性）');
console.log('  ✓ overflow 边界裁剪（rect/text/image 三分支接入 clipFunc）');
console.log('  ✓ text-indent 确认为伪缺口（已被 Range API 自动吸收）');
console.log('  ✓ linear-gradient（解析层翻 Konva 参数 + Canvas 五处分支接线）\n');
console.log('剩余缺口按处理成本分三类：');
console.log('  A 纯接线（Konva 已支持，只需接线）');
console.log('     → 单行 ellipsis');
console.log('  B 需新增逻辑（Konva 无等价 API，得自己算）');
console.log('     → 多行 line-clamp、z-index 层叠、多行居中、radial-gradient');
console.log('  C 明确不做（成本远高于收益，需先确认真实需求）');
console.log('     → 滤镜、混合模式、SVG 全量支持、border-image\n');

process.exit(fail ? 1 : 0);