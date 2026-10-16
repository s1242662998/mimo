/**
 * 文本宽度契约：防止 Konva 静默截尾（回归测试）
 *
 * 【本轮修复的 bug】卡片页四个标题全部少最后一个字母：
 *   MiMo-V2.6-Pro   → MiMo-V2.6-Pr
 *   MiMo-V2.6-Flash → MiMo-V2.6-Flas
 *   MiMo-V2.5-Pro   → MiMo-V2.5-Pr
 *   / MTok          → / MTo
 *
 * 【关键认知：wrap="none" 拦不住截尾】
 * Konva Text._setTextData 的源码结构是：
 *     for (let i = 0; i < lines.length; ++i) {
 *         let lineWidth = this._getTextWidth(line);
 *         if (fixedWidth && lineWidth > maxWidth) {   // ← 无 shouldWrap 守卫！
 *             ...二分查找能放下的前缀，丢掉剩余字符
 *         }
 *     }
 * `shouldWrap`（= wrap !== NONE）只影响后续**折行**逻辑，
 * 截断分支在它之外，**先于**折行判断执行。
 *
 * 此前代码里有一句注释写着「关掉 Konva 自动折行：…wrap="none"」，
 * 隐含假设 wrap="none" 也能防截断 —— 这是错的，也是这个 bug 迟迟未被发现的原因。
 *
 * 【根因：度量源不一致】
 *   · props.width  = 浏览器用真实 CSS 字体栈（Arial / PingFang SC）量的行盒宽
 *   · Konva 量宽  = 用 props.fontFamily（默认 Inter）走 Canvas 2D measureText
 * Inter 比 Arial 略宽 → Konva 判定放不下 → 砍尾。
 * 字号越大误差越大：19px 标题被截，15px 正文没事。
 *
 * 【修法】
 *   1. 解析层写入 props.textWidth（用 Konva 的字体重新量一遍）
 *   2. 渲染层按 textWidth - width 的差值给 <Text> 加 8%+2px 余量
 *   3. badge 分支直接把文字盒放宽到 2 倍宽并左移，几何中心不变
 */
import { readFileSync } from 'node:fs';

const konvaSrc = readFileSync(new URL('../node_modules/konva/lib/shapes/Text.js', import.meta.url), 'utf8');
const parserSrc = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');
const canvasSrc = readFileSync(new URL('../src/components/Canvas.jsx', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (c, n, d = '') => {
  if (c) { pass++; console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); }
  else { fail++; console.log(`  ✗ ${n}  ${d}`); }
};
const section = t => console.log(`\n[${t}]`);

/* ============================================================
   [1] Konva 源码事实：截断分支不受 wrap 保护
   ============================================================ */
section('1. Konva 源码事实（这是整个修复的依据）');

const setDataIdx = konvaSrc.indexOf('let lines = this.text().split');
ok(setDataIdx > 0, '定位到 Text._setTextData 实现');
const setData = konvaSrc.slice(setDataIdx, setDataIdx + 4000);

const truncIdx = setData.indexOf('if (fixedWidth && lineWidth > maxWidth)');
ok(truncIdx > 0, '存在截断分支 if (fixedWidth && lineWidth > maxWidth)');

// 关键断言：截断分支之前不应出现 shouldWrap 的提前 return / 分支包裹
const beforeTrunc = setData.slice(0, truncIdx);
ok(!/if \(!shouldWrap\)\s*\{?\s*return/.test(beforeTrunc),
  '截断分支之前没有 shouldWrap 的提前 return');
ok(!/if \(shouldWrap\)\s*\{[^}]*if \(fixedWidth/.test(beforeTrunc),
  '截断分支未被 if (shouldWrap) 包裹');
ok(/wrapAtWord = wrap !== CHAR && shouldWrap/.test(setData),
  'wrapAtWord 确实依赖 shouldWrap（说明 wrap 只管折行，不管截断）');

// 截断确实会丢字符：无论 wrapAtWord 真假，最终都只把砍剩的 match 作为整行绘制，
// match 之后的字符被永久丢弃（实测「MiMo-V2.6-Pro」→「MiMo-V2.6-Pr」）。
ok(/this\._addTextLine\(match\)/.test(setData), '截断后只绘制 match（剩余字符被丢弃）');
// 关键：_addTextLine(match) 之前有 `if (wrapAtWord) {...}`，但 _addTextLine 本身在其之外
// —— 所以 wrap="none"（wrapAtWord=false）时，砍完直接绘制，不会递归折行，但字符照样没了。
const addIdx = setData.indexOf('this._addTextLine(match)');
const wrapIdx = setData.lastIndexOf('if (wrapAtWord)', addIdx);
ok(wrapIdx > 0 && addIdx > wrapIdx,
  '_addTextLine(match) 位于 if (wrapAtWord) 之后（不在其包裹范围内）');
ok(!/if \(wrapAtWord\) \{[^}]*this\._addTextLine\(match\)/.test(setData),
  '_addTextLine(match) 未被 if (wrapAtWord) 单层花括号完整包裹 → wrap=none 也照样截断');

// 顺带确认 Konva 的量宽公式：measureText + letterSpacing * length
ok(/_getTextWidth\(text\)\s*\{[\s\S]{0,200}?measureText\(text\)\.width \+ letterSpacing \* length/.test(konvaSrc),
  'Konva 量宽 = measureText + letterSpacing × length（与解析层算法不同）');

/* ============================================================
   [2] 解析层：写入 props.textWidth
   ============================================================ */
section('2. 解析层写入 props.textWidth');

ok(/props\.textWidth = Math\.max\(Math\.ceil\(konvaW\) \+ 2, props\.width\)/.test(parserSrc),
  'textWidth 取「canvas 量宽」与「浏览器实测宽」的较大者');
ok(/measureTextWidth\(ln, fs, props\.fontWeight, props\.fontFamily, props\.letterSpacing\)/.test(parserSrc),
  '用与 Canvas 相同的 fontFamily/字号/字重/字间距重新量宽');
ok(/props\.width = Math\.max\(Math\.ceil\(maxLineW\) \+ 2, 8\)/.test(parserSrc),
  'props.width 仍保持浏览器实测值（背景框尺寸不受影响）');

/* ============================================================
   [3] 渲染层：给 <Text> 加余量
   ============================================================ */
section('3. 渲染层加余量');

const textCaseIdx = canvasSrc.indexOf("case 'text': {");
ok(textCaseIdx > 0, '定位到 Canvas text 分支');
// 【踩坑】切片要给足长度：textSlack 的计算在 2054 行附近，
// 而 <Text> 的 width 在 2100 行之后，6000 字符切不到末尾。
const textCase = canvasSrc.slice(textCaseIdx, textCaseIdx + 12000);

ok(/TEXT_WIDTH_SLACK_PX = 2/.test(textCase), '定义 2px 固定余量');
// 余量必须覆盖 textWidth - width 的**全部**差值。
// 曾写成 diff * 0.08 + 2 —— 19px 标题差值 5.43px 只补 2.43px，等于没修。
// 这条断言就是防止再次退化成「按比例补一部分」。
ok(/Math\.max\(activeProps\.textWidth \|\| 0, textWidth\) - textWidth \+ TEXT_WIDTH_SLACK_PX/.test(textCase),
  '余量覆盖 textWidth 与 width 的完整差值（非按比例）');
ok(!/TEXT_WIDTH_SLACK_RATIO/.test(textCase), '不再存在按比例缩小的余量系数');
ok(/width=\{Math\.max\(textWidth - padL - padR \+ textSlack, 1\)\}/.test(textCase),
  '<Text> 的 width 加上了 textSlack');
ok(/wrap="none"/.test(textCase), '保留 wrap="none"（关折行，仍需要）');
ok(!/width=\{Math\.max\(textWidth - padL - padR, 1\)\}/.test(textCase),
  '旧的满宽写法已移除');

// 余量不能影响 Group 定位（否则整个文本会位移）
ok(/const textWidth = hasBox[\s\S]{0,200}?activeProps\.width \|\| 150/.test(textCase),
  'textWidth（Group 定位基准）未被余量污染');
const groupIdx = textCase.indexOf('const centerX = shape.x + textWidth / 2');
ok(groupIdx > 0, 'Group 仍用未加余量的 textWidth 定位');

/* ============================================================
   [4] badge 分支：满宽会被截
   ============================================================ */
section('4. badge 分支防截尾');
const badgeIdx = canvasSrc.indexOf("startsWith('badge')");
ok(badgeIdx > 0, '定位到 badge 分支');
const badgeBlock = canvasSrc.slice(badgeIdx, badgeIdx + 3500);

ok(/x=\{-width\}/.test(badgeBlock), 'badge 文字盒 x 左移一整宽（保持几何中心）');
ok(/width=\{width \* 2\}/.test(badgeBlock), 'badge 文字盒放宽到 2 倍宽');
ok(/wrap="none"/.test(badgeBlock), 'badge 文字设 wrap="none"');
// 校验几何中心不变：x + width/2 = -width + (2*width)/2 = 0 ✓
ok(-1 * 1 + (2 * 1) / 2 === 0, '几何中心校验：x + width/2 仍为 0（居中不变）');

/* ============================================================
   [5] 反证：模拟截断，确认余量策略有效
   ============================================================ */
section('5. 行为模拟（复现 Konva 的截断算法）');

// 复刻 Konva 的 _setTextData 截断逻辑（wrap=none 时它仍会执行，只是砍完不再折行）
// 【踩坑】measure 必须闭包捕获 fontSize —— 若按 (text, fontSize) 签名调用却只传了 text，
// 内部 fs 变 undefined → NaN → 所有比较恒为 false → 模拟「永不截断」，
// 测试会 falsely 通过，恰好漏掉要验证的行为。
function konvaTruncate(line, width, measure) {
  if (!(width !== undefined && measure(line) > width)) return line;
  const arr = Array.from(line);
  let low = 0, high = arr.length, match = '';
  while (low < high) {
    const mid = (low + high) >>> 1;
    const substr = arr.slice(0, mid + 1).join('');
    if (measure(substr) <= width) { low = mid + 1; match = substr; }
    else high = mid;
  }
  return match;
}

// 模拟度量偏差：浏览器用 CSS 字体栈量，Konva 用 Inter 量，Inter 约宽 4%
// （这是本 bug 的核心 —— 两个度量源不一致，不是 Konva 算错）
//
// 【系数说明】西文按 0.55em/字、中文按 1.0em/字（全角）估算，
// 与 measureTextWidth 的退化估算保持同一套口径。
const mkMeasure = (fs, ratio) => (s) => {
  let units = 0;
  for (const ch of Array.from(s)) {
    units += /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1.0 : 0.55;
  }
  return units * fs * ratio;
};

const cases = [
  ['MiMo-V2.6-Pro', 19],
  ['MiMo-V2.6-Flash', 19],
  ['MiMo-V2.5-Pro', 19],
  ['/ MTok', 13],
  ['即将下线', 11],
];

for (const [text, fs] of cases) {
  const browserW = mkMeasure(fs, 1)(text) + 2;      // 解析层 props.width
  const konvaW = mkMeasure(fs, 1.04)(text) + 2;    // 解析层 props.textWidth
  const konvaMeasure = mkMeasure(fs, 1.04);        // Konva 内部量宽

  // 修复前：直接传浏览器实测宽
  const before = konvaTruncate(text, browserW, konvaMeasure);

  // 修复后：余量 = max(textWidth, width) - width + 2，即覆盖完整差值
  const slack = Math.max(Math.max(konvaW, browserW) - browserW + 2, 0);
  const after = konvaTruncate(text, browserW + slack, konvaMeasure);

  const truncated = before.length < Array.from(text).length;
  const diff = konvaW - browserW;

  if (truncated) {
    // 长文本（≥13 西文字符）在 4% 偏差下必然触发截断 —— 这正是截图里的四个标题
    ok(after === text,
      `修复后「${text}」@${fs}px 完整`, `修复前→「${before}」，差值 ${diff.toFixed(1)}px，余量 ${slack.toFixed(1)}px`);
  } else {
    // 短文本在 4% 偏差下误差不足以跨越 Konva 的取整，本次模拟不触发截断。
    // 如实记录而非强行构造失败 —— 测试的价值在于反映真实，不是凑满断言数。
    ok(after === text, `「${text}」@${fs}px 完整（差值 ${diff.toFixed(1)}px，本场景不触发截断）`);
    console.log(`      ℹ 修复前该用例未被截断，属模拟事实而非缺陷`);
  }
}

// 反证：按比例补一部分（曾经的错误做法）不足以修复
{
  const fs = 19, text = 'MiMo-V2.6-Pro';
  const browserW = mkMeasure(fs, 1)(text) + 2;
  const konvaW = mkMeasure(fs, 1.04)(text) + 2;
  const m = mkMeasure(fs, 1.04);
  const badSlack = (konvaW - browserW) * 0.08 + 2;
  const badResult = konvaTruncate(text, browserW + badSlack, m);
  ok(badResult !== text,
    '反证：按差值 8% 补余量仍然被截（说明比例余量是无效修复）',
    `→「${badResult}」`);
  ok(konvaTruncate(text, browserW + (konvaW - browserW) + 2, m) === text,
    '反证：覆盖完整差值后正常');
}

// badge：2 倍宽策略（x 左移同量，几何中心不变）
// 注：徽标走的是「浏览器实测宽满宽 + align=center」，同样暴露在截尾风险下。
// 11px 短文本在 4% 模拟偏差下不触发截断，但真实字体回退（PingFang SC 缺失时
// 回退到系统字体）可能偏差更大，所以策略上仍按 2 倍宽处理。
const badgeText = '即将下线';
const badgeFs = 11;
const badgeW = mkMeasure(badgeFs, 1)(badgeText) + 2;
const badgeMeasure = mkMeasure(badgeFs, 1.04);
const badgeAfter = konvaTruncate(badgeText, badgeW * 2, badgeMeasure);
ok(badgeAfter === badgeText, 'badge 2 倍宽后完整', `→「${badgeAfter}」`);
ok(badgeW * 2 > badgeMeasure(badgeText),
  'badge 2 倍宽足以容纳 4% 偏差', `2×宽 ${(badgeW * 2).toFixed(1)} vs 需要 ${badgeMeasure(badgeText).toFixed(1)}`);

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);
