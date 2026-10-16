/**
 * 用真实 DOM 桩件跑 isAvatarLike（不依赖 jsdom —— 项目没装）。
 *
 * 为什么需要桩件而不是纯函数 spec：
 *   verify-props-contract 里的 spec 版判据是**手抄**的，
 *   源码一改它不会跟着变，两边漂移就等于没测。
 *   这里直接从htmlToShapes.js 抠出真实函数体注入沙箱执行，
 *   确保测的就是线上跑的那份代码。
 *
 * 桩件覆盖 3 类真实结构：
 *   ① 外层有背景色 + 子色块（本轮模型输出）
 *   ② 纯色无子节点
 *   ③ 透明外层 + 子色块（上一轮模型输出）
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

function grab(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`找不到 ${name}`);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1).replace(/^export /, ''); }
  }
  throw new Error(`${name} 括号不配对`);
}

const NON_CONTENT_TAGS = new Set(['br', 'wbr']);

/* ---------- DOM 桩件 ---------- */
class TextNode {
  constructor(t) { this.nodeType = 3; this.textContent = t; }
}
class El {
  constructor({ tag = 'div', text = '', bg = 'rgba(0, 0, 0, 0)', w = 40, h = 40, radius = 4, kids = [] }) {
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.childNodes = [new TextNode(text), ...kids];
    this.children = kids;
    this._bg = bg;
    this._rect = { width: w, height: h };
    this._radius = radius;
  }
  getBoundingClientRect() { return this._rect; }
}

function makeComputedStyle(el) {
  const kids = el.children.map(c => ({ backgroundColor: c._bg, backgroundImage: 'none' }));
  return {
    borderTopLeftRadius: el._radius + 'px',
    get backgroundColor() { return el._bg; },
    get backgroundImage() { return 'none'; },
    __kids: kids,
  };
}

// 【作用域坑】isAvatarLike 内部直接引用 window.getComputedStyle，
// 若通过 globalThis.window 事后赋值，沙箱闭包取到的仍是 undefined。
// 正确做法：构造时就把一个稳定的 window 桩注入，元素自身的 computed 挂在实例上。
const windowStub = { getComputedStyle: (e) => e.__computed || makeComputedStyle(e) };

const parseFn = new Function(
  'document', 'window', 'Node', 'NON_CONTENT_TAGS',
  `${grab('directTextContent')}
   ${grab('hasSubstantiveChildren')}
   ${grab('toHex')}
   ${grab('resolveColorKeyword')}
   ${grab('isAvatarLike')}
   return isAvatarLike;`,
)(undefined, windowStub, { TEXT_NODE: 3 }, NON_CONTENT_TAGS);

/* ---------- 测试 ---------- */
let pass = 0, fail = 0;

function run(name, { el, props }, expected) {
  for (const k of el.children) k.__computed = makeComputedStyle(k);
  el.__computed = makeComputedStyle(el);

  let got;
  try {
    got = parseFn(el, el.getBoundingClientRect(), makeComputedStyle(el), props);
  } catch (e) {
    console.log(`✗ ${name.padEnd(34)} 抛异常: ${e.message}`);
    fail++;
    return;
  }

  if (got === expected) { console.log(`✓ ${name.padEnd(34)} → ${got ? '头像' : '非头像'}`); pass++; }
  else { console.log(`✗ ${name.padEnd(34)} 期望${expected ? '头像' : '非头像'} 实得${got ? '头像' : '非头像'}`); fail++; }
}

const tile = (bg, h = 16) => new El({ bg, h, w: 40 });

console.log('\n[1] 本轮真实 HTML（40x40 r4，外层有色 + 3 色块子div）');
const nowCase = new El({
  bg: 'rgb(233, 226, 212)', w: 40, h: 40, radius: 4,
  kids: [tile('rgb(244, 239, 228)', 16), tile('rgb(143, 182, 222)', 14), tile('rgb(93, 111, 140)', 10)],
});
run('我方头像 #e9e2d4 + 3 色块', { el: nowCase, props: { fill: '#E9E2D4' } }, true);

const nowCase2 = new El({
  bg: 'rgb(127, 176, 224)', w: 40, h: 40, radius: 4,
  kids: [tile('rgb(127, 176, 224)', 16), tile('rgb(79, 125, 74)', 12), tile('rgb(47, 79, 51)', 12)],
});
run('对方头像 #7fb0e0 + 3 色块', { el: nowCase2, props: { fill: '#7FB0E0' } }, true);

console.log('\n[2] 上一轮真实 HTML（透明外层 + 3 色块）');
const prevCase = new El({
  bg: 'rgba(0, 0, 0, 0)', w: 40, h: 40, radius: 4,
  kids: [tile('rgb(207, 227, 245)', 18), tile('rgb(232, 217, 200)', 14), tile('rgb(143, 168, 196)', 8)],
});
run('透明外层 + 色块（props.fill 空）', { el: prevCase, props: {} }, true);

console.log('\n[3] 其他已知形态');
run('纯色圆头像 40x40 r20', { el: new El({ bg: 'rgb(219, 234, 254)', radius: 20 }), props: { fill: '#DBEAFE' } }, true);
run('渐变头像（props 无 fill，有渐变色标）', { el: new El({ bg: 'rgba(0, 0, 0, 0)', radius: 4 }), props: { gradientColorStops: [0, '#E8D5C4', 1, '#6B5B7A'] } }, true);

console.log('\n[3.5] 首字母形态（提示词要求模型写 ZT/ME）');
// 模型输出：<div style="...background:#7fb0e0;color:#fff...">ZT</div>
// 直写文字节点（非子元素），判据的 directTextContent 能取到 'ZT'
const withInitials = (text, bg, radius = 6) => {
  const el = new El({ bg, w: 40, h: 40, radius });
  el.childNodes = [new TextNode(text)];
  return el;
};
run('首字母 ZT 40x40 r6', { el: withInitials('ZT', 'rgb(127, 176, 224)'), props: { fill: '#7FB0E0' } }, true);
run('首字母 ME 40x40 r6', { el: withInitials('ME', 'rgb(233, 226, 212)'), props: { fill: '#E9E2D4' } }, true);
run('单字母 A 40x40 r20', { el: withInitials('A', 'rgb(219, 234, 254)', 20), props: { fill: '#DBEAFE' } }, true);
// 昵称/标签不该判成头像（必须仍是「非头像」）
run('长昵称「产品经理王」40x40 r6（非首字母）', { el: withInitials('产品经理王', 'rgb(200, 200, 200)'), props: { fill: '#CCC' } }, false);
run('长英文名 alexandra 40x40 r6（非首字母）', { el: withInitials('alexandra', 'rgb(200, 200, 200)'), props: { fill: '#CCC' } }, false);

console.log('\n[4] 必须判负的（防误伤）');
run('完全空框 40x40 r4 无任何填充', { el: new El({ bg: 'rgba(0, 0, 0, 0)', radius: 4 }), props: {} }, false);
run('按钮 200x44 r6', { el: new El({ bg: 'rgb(255,255,255)', w: 200, h: 44, radius: 6 }), props: { fill: '#fff' } }, false);
run('输入框 320x40 r8', { el: new El({ bg: 'rgb(255,255,255)', w: 320, h: 40, radius: 8 }), props: { fill: '#fff' } }, false);
run('卡片缩略图 100x100 r8', { el: new El({ bg: 'rgb(238,238,238)', w: 100, h: 100, radius: 8 }), props: { fill: '#eee' } }, false);
run('分页圆点 8x8 r4', { el: new El({ bg: 'rgb(204,204,204)', w: 8, h: 8, radius: 4 }), props: { fill: '#ccc' } }, false);
run('直角色块 46x46 r0', { el: new El({ bg: 'rgb(237,228,214)', w: 46, h: 46, radius: 0 }), props: { fill: '#EDE4D6' } }, false);
// 注意：「单字母 A」现在应判为头像（首字母形态），
// 故原先「含直接文本 → 非头像」的断言已改为「含非首字母文本 → 非头像」，见 [3.5]。
run('中文昵称文本 40x40 r20（非首字母）', { el: new El({ bg: 'rgb(219,234,254)', radius: 20, text: '产品经理' }), props: { fill: '#DBEAFE' } }, false);
run('含带文本子节点 40x40 r20', {
  el: new El({ bg: 'rgb(255,255,255)', radius: 20, kids: [new El({ bg: 'rgba(0,0,0,0)', w: 10, h: 10, text: 'x' })] }),
  props: { fill: '#fff' },
}, false);

// ------------------------------------------------------------------
// [5] 类型分流顺序（本轮真实 bug）
//
// 提示词改用首字母后，头像变成「只含文本节点的 div」，
// isTextOnlyElement 为 true → 若直接走 text 分支，
// 下游的 avatar 判定（只对 rectangle 生效）永远不触发，
// 头像被降级成文本组件。
// 这里直接跑分流逻辑，验证 isAvatarCandidate 能把它挡下来。
// ------------------------------------------------------------------
console.log('\n[5] 类型分流顺序（头像不能被 text 分支抢走）');

const isTextOnlyEl = (el) => {
  const nodes = Array.from(el.childNodes).filter(n =>
    n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
  if (nodes.length === 0) return false;
  return nodes.every(n => n.nodeType === 3 || NON_CONTENT_TAGS.has(n.tagName.toLowerCase()));
};

function runSplit(name, el, expected) {
  // 复刻 elementToShape 里的分流条件
  const isTextOnly = isTextOnlyEl(el) && !!el.childNodes.find(n => n.nodeType === 3 && n.textContent.trim());
  const result = isTextOnly && !parseFn(el, el.getBoundingClientRect(), makeComputedStyle(el),
    { fill: toHexStub(makeComputedStyle(el).backgroundColor) || undefined }) ? 'text' : 'rectangle';
  const got = result === 'text' ? 'text' : (result === 'rectangle' && parseFn(el, el.getBoundingClientRect(), makeComputedStyle(el), { fill: toHexStub(makeComputedStyle(el).backgroundColor) || undefined }) ? 'avatar' : 'rectangle');
  if (got === expected) { console.log(`✓ ${name.padEnd(34)} → ${got}`); pass++; }
  else { console.log(`✗ ${name.padEnd(34)} 期望${expected} 实得${got}`); fail++; }
}

function toHexStub(v) {
  if (!v) return null;
  if (v === 'transparent') return null;
  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return v;
  const p = m[1].split(',').map(s => s.trim());
  if (p[3] !== undefined && parseFloat(p[3]) === 0) return null;
  return '#' + p.slice(0, 3).map(n => Math.round(parseFloat(n) || 0).toString(16).padStart(2, '0')).join('').toUpperCase();
}

runSplit('首字母头像 ZT（不应被text 抢走）', withInitials('ZT', 'rgb(127, 176, 224)'), 'avatar');
runSplit('首字母头像 ME（不应被 text 抢走）', withInitials('ME', 'rgb(233, 226, 212)'), 'avatar');
runSplit('普通文本标签「张涛」应仍是 text', withInitials('张涛', 'rgba(0, 0, 0, 0)', 0), 'text');

console.log(`\n头像判据桩件验证：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);