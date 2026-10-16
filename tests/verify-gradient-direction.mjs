/**
 * 渐变方向自检：把 CSS 角度语义写成「期望的起点/终点象限」，
 * 而不是手算具体坐标 —— 手算容易把自己的公式抄进期望值里，自证无效。
 *
 * 运行：node tests/verify-gradient-direction.mjs
 *
 * 注：不import 源码（src/data/icons 无扩展名，Node ESM 解析不了），
 * 与其他 verify-* 测试一致，改为提取函数源码注入沙箱执行。
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

/** 从源码里抠出一个函数定义（含前置注释）的完整文本 */
function grab(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`源码里找不到 ${name}`);
  const from = src.lastIndexOf('/**', start);
  let depth = 0;
  let i = src.indexOf('{', start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1).replace(/^export /, ''); }
  }
  throw new Error(`${name} 花括号不配对`);
}

const sandbox = new Function(
  'document', 'window', 'Node',
  `${grab('resolveColorKeyword')}
   ${grab('toHex')}
   ${grab('normalizeRgba')}
   ${grab('parseLinearGradient')}
   return parseLinearGradient;`,
)(undefined, undefined, undefined);

const parseLinearGradient = sandbox;

let pass = 0;
let fail = 0;

function check(name, css, expect) {
  const r = parseLinearGradient(css);
  if (!r) { console.log(`✗ ${name.padEnd(22)} 解析失败`); fail++; return; }
  const { sx, sy, ex, ey, colorStops } = r;
  const bad = [];
  if ([sx, sy, ex, ey].some(n => Number.isNaN(n))) bad.push('含 NaN');
  // 判据：起点相对中心 0.5 的侧向（不能对 0 取符号 —— 纯轴向渐变的 sx 恰好是 0）
  if (expect.sx !== undefined && Math.sign(sx - 0.5) !== expect.sx) bad.push(`起点在期望${expect.sx > 0 ? '右' : '左'}侧之外 (sx=${sx.toFixed(2)})`);
  if (expect.sy !== undefined && Math.sign(sy - 0.5) !== expect.sy) bad.push(`起点在期望${expect.sy > 0 ? '下' : '上'}侧之外 (sy=${sy.toFixed(2)})`);
  if (expect.stops !== undefined && colorStops.length / 2 !== expect.stops) bad.push(`色标 ${colorStops.length / 2} 期望 ${expect.stops}`);

  if (bad.length) { console.log(`✗ ${name.padEnd(22)} ${bad.join(' / ')}`); fail++; }
  else { console.log(`✓ ${name.padEnd(22)} (${sx.toFixed(2)},${sy.toFixed(2)})→(${ex.toFixed(2)},${ey.toFixed(2)})  ${colorStops.length / 2} 色标`); pass++; }
}

// CSS 角度语义：0deg=向上，顺时针增加。起点永远在「方向的反侧」，
// colorStops[0] 落在 CSS 指定的那一侧。下面用「起点相对中心的象限」表达期望。
check('0deg 向上', 'linear-gradient(0deg,#000,#fff)', { sy: 1 });
check('90deg 向右', 'linear-gradient(90deg,#000,#fff)', { sx: -1 });
check('180deg 向下', 'linear-gradient(180deg,#000,#fff)', { sy: -1 });
check('270deg 向左', 'linear-gradient(270deg,#000,#fff)', { sx: 1 });
check('45deg 右上', 'linear-gradient(45deg,#000,#fff)', { sx: -1, sy: 1 });
check('160deg 下偏右', 'linear-gradient(160deg,#000,#fff)', { sx: -1, sy: -1 });
check('0.5turn 向下', 'linear-gradient(0.5turn,#000,#fff)', { sy: -1 });
check('3.14rad 向下', 'linear-gradient(3.14rad,#000,#fff)', { sy: -1 });
check('to right', 'linear-gradient(to right,#000,#fff)', { sx: -1 });
check('to left', 'linear-gradient(to left,#000,#fff)', { sx: 1 });
check('to top', 'linear-gradient(to top,#000,#fff)', { sy: 1 });
check('to bottom', 'linear-gradient(to bottom,#000,#fff)', { sy: -1 });
check('to top left', 'linear-gradient(to top left,#000,#fff)', { sx: 1, sy: 1 });
check('to bottom right', 'linear-gradient(to bottom right,#000,#fff)', { sx: -1, sy: -1 });

// 真实模型输出
check('模型头像A', 'linear-gradient(160deg, #e8d5c4 0%, #c9a88c 40%, #6b5b7a 100%)', { sx: -1, sy: -1, stops: 3 });
check('模型头像B', 'linear-gradient(180deg, rgb(159, 196, 221) 0%, rgb(127, 176, 105) 55%, rgb(62, 107, 72) 100%)', { sy: -1, stops: 3 });

// 缺省色标位置（曾崩过：lastKnown 为 undefined）
check('全缺省位置', 'linear-gradient(90deg,#000,#fff)', { sx: -1, stops: 2 });
check('中间缺位置', 'linear-gradient(90deg,#000 10%,#888,#fff 90%)', { sx: -1, stops: 3 });
// 半透明色标必须保留：透明渐隐是极常见写法，丢掉就整条渐变失效
check('透明渐隐', 'linear-gradient(rgba(0,0,0,0),#fff)', { sx: -1, stops: 2 });
check('rgba多色标', 'linear-gradient(180deg, rgba(255,0,0,.5) 0%, rgba(0,0,255,0.25) 100%)', { sy: -1, stops: 2 });

// 非 linear 必须返回 null，走 hasBackgroundImage 分支
for (const bad of ['radial-gradient(circle,#fff,#000)', 'url("a.png")', 'none', '', 'linear-gradient(#fff)']) {
  const r = parseLinearGradient(bad);
  if (r === null) { console.log(`✓ 拒绝非linear ${JSON.stringify(bad).slice(0, 30).padEnd(24)}`); pass++; }
  else { console.log(`✗ 拒绝非linear ${JSON.stringify(bad).slice(0, 30)} → 误解析`); fail++; }
}

console.log(`\n渐变方向自检：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);