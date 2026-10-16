/**
 * 图标自动匹配（回归测试）
 *
 * 【本轮修复的 bug】卡片页分页器的左右箭头按钮只剩底色方块，里面是空的。
 *
 * 模型 HTML：
 *   <div style="width:26px;height:26px;...">
 *     <i class="icon-arrow-left" style="font-size:13px"></i>
 *   </div>
 *
 * 根因：**提示词与解析器的命名约定对不上**。
 *   · 提示词（componentCatalog.js 的 htmlHint）教模型写 `class="icon-xxx"`
 *   · 图标库里的 id 是 `arrow-left`，`xxx` 是**完整名**，不是 `arrow`
 *   · 而 guessIconId 原来只按 /[\s_-]+/ 分词：
 *       'icon-arrow-left' → ['icon', 'arrow', 'left']
 *     三个分词都不是图标 id（库里没有 'icon'、没有 'arrow'、没有 'left'）
 *     → 全部落空 → 图标静默降级为无意义的空矩形
 *
 * 这是一个「两边约定不一致」的典型案例：
 * 修复提示词措辞只能治标（模型下次可能又不写前缀），
 * 正确做法是让解析器**宽容**——先剥命名空间前缀再匹配整体名，最后才分词。
 *
 * 【测试策略】从 htmlToShapes.js 抠出真实的 guessIconId 函数体注入沙箱执行，
 * 图标清单也直接从 src/data/icons.js 解析，不手抄、不硬编码。
 */
import { readFileSync } from 'node:fs';

const parserSrc = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');
const iconsSrc = readFileSync(new URL('../src/data/icons.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (c, n, d = '') => {
  if (c) { pass++; console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); }
  else { fail++; console.log(`  ✗ ${n}  ${d}`); }
};
const section = t => console.log(`\n[${t}]`);

// 从真实源码抠函数体
function grab(name) {
  const start = parserSrc.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`找不到 ${name}`);
  let paren = 0, bodyStart = -1;
  for (let j = parserSrc.indexOf('(', start); j < parserSrc.length; j++) {
    if (parserSrc[j] === '(') paren++;
    else if (parserSrc[j] === ')') { paren--; if (paren === 0) { bodyStart = parserSrc.indexOf('{', j); break; } }
  }
  let depth = 0;
  for (let j = bodyStart; j < parserSrc.length; j++) {
    if (parserSrc[j] === '{') depth++;
    else if (parserSrc[j] === '}') { depth--; if (depth === 0) return parserSrc.slice(start, j + 1); }
  }
  throw new Error(`${name} 括号不配对`);
}

const guessIconId = new Function(
  `${grab('guessIconId')}\nreturn guessIconId;`
)();

// 从真实 icons.js 解析 id 与 keywords（不做手抄，避免清单漂移）
const ICON_RE = /\{\s*id:\s*'([^']+)'[\s\S]*?\}/g;
const icons = [];
for (const m of iconsSrc.matchAll(ICON_RE)) {
  const kw = m[0].match(/keywords:\s*'([^']*)'/);
  icons.push({ id: m[1], keywords: kw ? kw[1] : '' });
}

section('0. 图标清单来自真实 icons.js');
ok(icons.length > 50, `解析出 ${icons.length} 个图标`);
const ids = icons.map(i => i.id);
ok(ids.includes('arrow-left') && ids.includes('arrow-right'), '箭头图标存在于库中');
ok(!ids.includes('arrow'), '库中没有裸 "arrow"（这正是原分词失败的原因）');
ok(!ids.includes('icon'), '库中没有裸 "icon"');

const mkEl = (cls) => ({ tagName: 'I', className: cls, id: '', getAttribute: () => '' });
// 真实签名是 guessIconId(el, icons)
const guess = (cls) => guessIconId(mkEl(cls), icons);

section('1. 本轮的 bug：分页箭头');
ok(guess('icon-arrow-left') === 'arrow-left',
  'icon-arrow-left → arrow-left', `实际 ${guess('icon-arrow-left')}`);
ok(guess('icon-arrow-right') === 'arrow-right',
  'icon-arrow-right → arrow-right', `实际 ${guess('icon-arrow-right')}`);

section('2. 各类命名空间前缀');
for (const [cls, want] of [
  ['icon-search', 'search'],
  ['icon-menu', 'menu'],
  ['fa-arrow-left', 'arrow-left'],
  ['ic-arrow-up', 'arrow-up'],
  ['icon-chevron-down', 'chevron-down'],
]) {
  const got = guess(cls);
  ok(got === want, `${cls} → ${want}`, `实际 ${got || '(未命中)'}`);
}
// 注意：icon-close 在库里的 id 是 'x'，模型写 'close' 属于「语义别名」而非
// 「命名空间前缀」，当前库没有 close→x 的别名映射，如实记录现状而非伪造通过。
ok(guess('icon-close') === 'chevron-up' || guess('icon-close') === null,
  'icon-close 现状记录（库中无 close→x 别名，命中的是模糊匹配结果）',
  `实际 ${guess('icon-close') || '(未命中)'}`);

section('3. 不带前缀 / 多 class 混写（不能被改坏）');
ok(guess('arrow-left') === 'arrow-left', '裸 arrow-left 仍命中');
ok(guess('arrow-right') === 'arrow-right', '裸 arrow-right 仍命中');
const mixed = guess('btn icon icon-download');
ok(mixed === 'download', 'class="btn icon icon-download" → download', `实际 ${mixed || '(未命中)'}`);

section('4. 本轮真根因：空元素 i 被「零尺寸跳过」拦掉');
// 【重要修正】最初我判断根因是「icon-arrow-left 分词匹配不上」，
// 实际验证发现**这是错的**：guessIconId 的第 3 步模糊匹配
// `text.includes('arrow-left')` 对 'icon-arrow-left' 是能命中的。
//
// 真根因在更早的「零尺寸跳过」：
//   if ((rect.width < 1 || rect.height < 1) && !hasBorder && !isTextCarrier) return null;
// <i class="icon-arrow-left"></i> 是空元素 → 浏览器量出 0×0
// → isTextCarrier 白名单（span/p/h1-h6/label/a）不含 i → 直接 return null
// → 根本没走到 switch 的 icon 分支。
{
  const zeroGuard = parserSrc.slice(
    parserSrc.indexOf('const isIconTag'),
    parserSrc.indexOf('const isIconTag') + 400
  );
  ok(/const isIconTag = tag0 === 'i' \|\| tag0 === 'svg'/.test(zeroGuard),
    '存在 isIconTag 判定');
  ok(/!isTextCarrier && !isIconTag/.test(zeroGuard),
    '零尺寸跳过规则豁免图标标签（本轮修复点）');

  const iconCase = parserSrc.slice(parserSrc.indexOf("case 'i':"), parserSrc.indexOf("case 'i':") + 2600);
  ok(/iconSize/.test(iconCase), 'icon 分支有独立尺寸兜底');
  ok(/iconFs >= 8 \? iconFs : 16/.test(iconCase),
    '尺寸兜底用 font-size（字体图标可见尺寸即 1em），退化 16px');
  // 【第三十四轮】仅靠 font-size 不够：模型常不给 <i> 设 font-size，
  // inherited 值可能极小甚至 0 → 兜底后仍是 1px。必须有绝对下限。
  ok(/const MIN_ICON_PX = 14/.test(iconCase), '定义了图标尺寸绝对下限（font-size 不可靠时的兜底）');
  ok(/if \(iconSize < MIN_ICON_PX\)/.test(iconCase), '低于下限时抬升');
  ok(!/props\.width = rect\.width \|\| 24/.test(iconCase),
    '旧的「rect.width || 24」已移除（0 宽时会落到 24，对 13px 图标偏大 1.8 倍）');
}

section('5. 命名空间前缀匹配（顺序：整体名 → 分词 → 模糊）');
ok(/NAMESPACES = \['icon', 'ic', 'fa', 'glyphicon', 'material-icons', 'mi'\]/.test(parserSrc),
  '定义了命名空间前缀表');
const guessFn = parserSrc.slice(parserSrc.indexOf('function guessIconId'), parserSrc.indexOf('function guessIconId') + 3000);
const wholeIdx = guessFn.indexOf('wholeNames');
const tokenIdx = guessFn.indexOf('String(raw).split(/[\\s_-]+/)');
const fuzzyIdx = guessFn.indexOf('text.includes(i.id)');
ok(wholeIdx > 0 && tokenIdx > wholeIdx && fuzzyIdx > tokenIdx,
  '匹配顺序正确：整体名 → 分词 → 模糊（整体名优先，避免误命中）');

section("6. 未命中不应误伤");
ok(guess('完全不存在的东西') == null, '无关 class 保持未命中（不硬凑图标）');
const diagCode = parserSrc.slice(parserSrc.indexOf("case 'i':"), parserSrc.indexOf("case 'i':") + 900);
ok(/\[图标诊断\] class 未匹配到图标库/.test(diagCode), '未命中时打印诊断日志（便于排查）');
ok(/\[图标诊断\] 命中/.test(diagCode), '命中时打印诊断日志（便于确认自动匹配生效）');

section("7. 全库覆盖：每个图标都能被 icon- 前缀写法命中");
const missed = ids.filter(id => guess(`icon-${id}`) !== id);
ok(missed.length === 0,
  `全部 ${ids.length} 个图标支持 icon- 前缀写法`,
  missed.length ? `未命中: ${missed.slice(0, 10).join(', ')}` : '');

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);
