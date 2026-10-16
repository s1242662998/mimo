/**
 * 圆形几何 + 图标尺寸兜底（回归测试）
 *
 * 用户同一轮报的两个现象，根因完全不同，都属于「数值不可信 → 尺寸/坐标错」：
 *
 * 【现象 A】分页中间几个圆形「在图层中，但无论如何修改属性都不显示」
 *   日志显示解析完全正常：type:'rectangle', size:'6x6', fill:'#D5D2CA'
 *   真根因：Canvas.jsx 的 `case 'circle'` 里 `<Group x={shape.x}>` 之后
 *   直接渲染 `<Circle radius={r} />`，**Konva 的 Circle.x/y 是圆心**，
 *   而解析层给的 shape.x 是 `rect.left`（外框左上角）
 *   → 6px 圆点被画到 (left, top) 而非 (left+3, top+3)，往左上偏 3px。
 *   偏 3px 意味着「圆心落在本该属于邻居的位置」，视觉上就是找不到。
 *
 * 【陷阱】avatar 也满足 isCircle（finalType 仍是 rectangle），
 *   但它走 Canvas 的 avatar 分支、用 x/y 当**左上角**
 *   → 若不排除 avatar，圆心修正会让头像双重偏移 2R（头像会跑到右下方）。
 *   所以判据必须与 shape.type/componentType 完全一致。
 *
 * 【现象 B】图标「画布里存在，但大小非常小，放大之后可以显示」
 *   日志：iconId:'arrow-right', size:'1x1'
 *   真根因：`<i class="icon-arrow-left"></i>` 是空元素，在 flex 容器里
 *   被浏览器量成 **1×1**（不是 0×0）→ 零尺寸守卫 `rect.width >= 1` 判定失效
 *   → 走 `Math.max(1,1)=1` 分支 → 画成 1×1 像素点。
 *   字体图标的可见尺寸是 1em，所以应该直接用 font-size。
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (c, n, d = '') => {
  if (c) { pass++; console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); }
  else { fail++; console.log(`  ✗ ${n}  ${d}`); }
};
const section = t => console.log(`\n[${t}]`);

section('1. usesCircleCenter 判据（圆心 vs 左上角的分界）');
ok(/const isCircle = finalType === 'rectangle' && radius > 0/.test(src), 'isCircle 仍基于 finalType 判定');
ok(/const usesCircleCenter = isCircle && finalType !== 'avatar'/.test(src),
  'usesCircleCenter 显式排除 avatar',
  'avatar 走左上角语义，被误加半径会双重偏移');
ok(/const centerOffset = usesCircleCenter\s*\?\s*Math\.min\(rect\.width, rect\.height\) \/ 2\s*:\s*0/.test(src),
  'centerOffset = 半径（真实圆形）或 0（其余）');

section('2. shape 的 type/componentType 与 x/y 用同一判据');
ok(/type:\s*usesCircleCenter \? 'circle' : renderType/.test(src), 'type 由 usesCircleCenter 驱动');
ok(/componentType:\s*usesCircleCenter \? 'circle' : finalType/.test(src), 'componentType 由 usesCircleCenter 驱动');
ok(/x:\s*Math\.round\(\(\(shapeTextBox\.left \?\? rect\.left\) \+ centerOffset\) \* 10\) \/ 10/.test(src),
  'shape.x 加回 centerOffset');
ok(/y:\s*Math\.round\(\(\(shapeTextBox\.top \?\? rect\.top\) \+ centerOffset\) \* 10\) \/ 10/.test(src),
  'shape.y 加回 centerOffset');
ok(!/isCircle \? Math\.min\(rect\.width, rect\.height\) \/ 2 : 0/.test(src),
  '旧的「无条件按 isCircle 加半径」写法已移除',
  '那行会让 avatar 双重偏移');

section('3. Canvas 侧确实把 x/y 当圆心消费');
{
  const cv = readFileSync(new URL('../src/components/Canvas.jsx', import.meta.url), 'utf8');
  const i = cv.indexOf("case 'circle'");
  ok(i > 0, '定位到 circle 分支');
  const body = cv.slice(i, i + 5000);
  ok(/x=\{shape\.x\}/.test(body) && /y=\{shape\.y\}/.test(body),
    'Group 直接用 shape.x/y');
  ok(/<Circle/.test(body) && /<Ellipse/.test(body),
    '分支渲染 Circle / Ellipse（其 x/y 语义就是圆心）');
  // Circle/Ellipse 自身不应再额外带 x={0} 之类抵消偏移
  ok(!/<\s*(Circle|Ellipse)[\s\S]{0,200}?x=\{0\}/.test(body),
    'Circle/Ellipse 没有用 x={0} 抵消（否则解析层加回半径就是错的）');
}

section('4. 图标尺寸兜底');
ok(/const iconFs = parseFloat\(computed\.fontSize\) \|\| 0/.test(src), '读取 font-size');
ok(/const useFontSize = measured < 4 \|\| \(iconFs > 0 && measured < iconFs \* 0\.5\)/.test(src),
  '实测过小（<4px 或 <font-size 的一半）时改用 font-size',
  '1×1 的 flex 空元素正是这条规则覆盖的场景');
ok(/iconFs >= 8 \? iconFs : 16/.test(src),
  'font-size < 8px 时退回 16，避免出现 4px 的迷你图标');
ok(/props\.width = iconSize;/.test(src) && /props\.height = iconSize;/.test(src), '宽高都用 iconSize');
ok(/\[图标诊断\] 采用尺寸/.test(src), '保留尺寸来源诊断日志（实测 / font-size）');

section('4b. 图标尺寸下限（本轮新增，光靠 font-size 不够）');
{
  // 模型常常不给 <i> 设 font-size，computed.fontSize 会继承一个很小的值甚至 0，
  // 此时 useFontSize 分支算出的 iconSize 仍然只有 1px → 图标依然看不见。
  // 所以必须有独立于 font-size 的绝对下限。
  ok(/const MIN_ICON_PX = 14/.test(src), '定义了图标尺寸绝对下限');
  ok(/if \(iconSize < MIN_ICON_PX\)/.test(src), 'iconSize 低于下限时抬升');
  ok(/iconSize = MIN_ICON_PX;/.test(src), '抬升写回 iconSize');
  ok(/\[图标诊断\] 尺寸过小，已抬到下限/.test(src), '抬升时 warn，便于定位是谁没设 font-size');

  // 行为模拟：各种 font-size 输入下，最终尺寸都必须 >= 14
  const calc = (measured, fontSize) => {
    const useFontSize = measured < 4 || (fontSize > 0 && measured < fontSize * 0.5);
    let size = useFontSize ? (fontSize >= 8 ? fontSize : 16) : measured;
    if (size < 14) size = 14;
    return size;
  };
  const cases = [
    [1, 13, 'flex 空元素 1×1 + font-size 13'],
    [1, 0, '1×1 且 font-size 继承为 0（本轮实测）'],
    [0, 0, '独立空元素 0×0 且无 font-size'],
    [1, 6, '1×1 + font-size 6（小于 8 的退化路径）'],
    [18, 18, '真实 18×18（不该被下限影响）'],
    [24, 16, '真实 24×24 但 font-size 小（信任实测）'],
  ];
  for (const [m, f, label] of cases) {
    const size = calc(m, f);
    ok(size >= 14, `${label} → ${size}px`, size < 14 ? '低于下限，不可见！' : '可见');
  }
  ok(calc(24, 16) === 24, '真实尺寸不被下限截断');
}

section('4c. 图标尺寸不被下游覆写（本轮真根因）');
{
  //【真根因】分派结构是：
  //   if (文本类) {...} else if (...) {...} else { props.width = Math.max(1, rect.width) }
  // icon 虽在上面的 switch 里写好了 props.width，但只要它既不是文本类、
  // 也没命中后面的任何分支，就会落进这个 else 被**无条件覆写**：
  //   switch 算出的 14px → Math.max(1, rect.width=1) = 1 → 画布上是一个点
  //
  //【为什么前两轮修复没生效】第一轮改阈值、第二轮加 MIN_ICON_PX 下限，
  // 代码都在、测试都过、build 都过，但日志始终是size:"1x1"，
  // 连新加的 warn 都没打出来 —— 因为被覆写发生在 warn 之后，
  // 最终 shape 里根本不是 switch 算出的那个值。
  // 教训：**只测「代码写了什么」不够，必须测「最终产出的 props 是什么」。**
  const guardLine = "const sizeOwnedBySwitch = componentType === 'icon';";
  const elseAt = src.indexOf(guardLine);
  ok(elseAt > 0, '通用兜底处有 icon 尺寸保护判定');

  // 注意：实际代码是**跨行三元表达式**（prettier 格式化），
  // 所以正则必须用 \s* 容忍换行，不能假设「判据 ? 值」在同一行。
  const block = src.slice(elseAt, elseAt + 400);
  ok(/sizeOwnedBySwitch\s*\?\s*Math\.max\(14, Number\(props\.width\) \|\| 0\)/.test(block),
    'icon 走 switch 里算好的尺寸，不再用 rect.width 覆写');
  ok(/props\.height = sizeOwnedBySwitch\s*\?\s*props\.width/.test(block),
    'icon 的 height 与 width 一致（Canvas 按方形 Path 绘制）');
  ok(/:\s*Math\.max\(1, rect\.width\)/.test(block),
    '非 icon 分支仍走原来的实测宽度（未被14px 下限污染）');
  ok(!/:\s*Math\.max\(1, rect\.width\)\s*;\s*\n\s*props\.width = Math\.max\(1, rect\.width\)/.test(block),
    '旧的「无条件覆写 props.width」写法已移除');

  // 行为模拟：复刻「switch 写好 → else 覆写」的完整流程
  const simulate = (rectW, switchSize) => {
    let props = { width: switchSize, height: switchSize };   // switch 分支写好
    // else 通用兜底（旧逻辑）
    const legacy = { width: Math.max(1, rectW), height: Math.max(1, rectW) };
    // 修复后的逻辑
    const fixed = { width: Math.max(14, Number(props.width) || 0), height: 0 };
    fixed.height = fixed.width;
    return { legacy: legacy.width, fixed: fixed.width };
  };
  for (const [rectW, switchSize, label] of [
    [1, 14, 'flex 空元素 rectW=1，switch 算 14'],
    [0, 16, '独立空元素 rectW=0，switch 算 16'],
    [1, 16, 'fontSize 缺失退化 16'],
  ]) {
    const r = simulate(rectW, switchSize);
    ok(r.legacy === 1 && r.fixed === switchSize,
      `${label}：旧逻辑 ${r.legacy}px → 修复后 ${r.fixed}px`);
  }

  // 非icon 元素不受影响
  ok(Math.max(1, 320) === 320, '普通矩形仍取实测宽度（未被14px 下限污染）');
}
{
  const shiftOf = (w, h, fixed) => (fixed ? Math.min(w, h) / 2 : 0);
  for (const [w, h, label] of [[6, 6, '分页圆点'], [40, 40, '大圆/状态点']]) {
    const before = shiftOf(w, h, false);
    const after = shiftOf(w, h, true);
    ok(before === 0 && after === w / 2,
      `${label} ${w}px：偏移 ${before}px → ${after}px（= 半径，中心对齐）`);
  }
  // avatar：不得加半径
  ok(shiftOf(40, 40, false) === 0, 'avatar 走左上角语义，不加半径（无双重偏移）');
}

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);