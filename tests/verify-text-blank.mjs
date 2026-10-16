/**
 * 行首缩进空白清理（回归测试）
 *
 * 【症状】卡片页 4 条描述文字「换行错乱」，用户报的第三条现象。
 *
 * 【日志实证】[HTML解析] 文本明细里 4 条多行描述全是这个形态：
 *     { text: '          MiMo 迄今为止最强大的旗', lines: 4, w: 254, ... }
 *     { text: '          全模态、高性能、低成本的高效', lines: 4, w: 257, ... }
 *     { text: '          兼顾 V2.6-Pro 旗舰',         lines: 4, w: 257, ... }
 *     { text: '          万亿参数，高效架构： 1T ',   lines: 4, w: 261, ... }
 * 行首那 10 个空格不是内容，是模型 HTML 的**缩进**：
 *     <p>
 *       MiMo 迄今为止最强大的旗舰推理模型。
 *     </p>
 * Range API 逐字符取 rect 时，textContent 里的 "\n      " 会一起被量进去，
 * 于是「行盒宽度」把缩进空格算成正文宽度 → Konva 按这个宽度排版 → 首行被顶偏。
 *
 * 【为什么原来只 trimEnd 不够】
 * 修复前是 `l.text.replace(/\s+$/, '')`，只去尾部空白，行首原样保留。
 * 所以缩进完整地进了 props.text。
 *
 * 【关键设计：只清两端，绝不折叠中间空格】
 * 价格行靠中间空格排版：
 *     ￥ 0.025 / MTok
 *     输入（缓存命中）    ￥ 3 / MTok
 * 如果用全局 /\s+/g → ' '，「￥ 0.025」会变成「￥0.025」、
 * 标签与价格挤在一起，比原问题更糟。所以只动两端。
 *
 * 【踩坑：不要把全角空格直接写进正则字面量】
 * 实际写的时候正则里混进了 U+00A0（不换行空格，编辑器粘贴带进来的）：
 *   1) eslint 的 no-irregular-whitespace 直接报错；
 *   2) 更危险的是它可能被工具链静默替换成普通空格 —— 代码看起来一样、行为却变了。
 * 正确做法：统一用 Unicode 转义（\u00A0 \u3000 等）+ new RegExp 构造。
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (c, n, d = '') => {
  if (c) { pass++; console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); }
  else { fail++; console.log(`  ✗ ${n}  ${d}`); }
};
const section = t => console.log(`\n[${t}]`);

section('1. collapseBlank 已接入行文本处理');
ok(/function collapseBlank\(s\)/.test(src), '定义了 collapseBlank');
ok(/applyTextTransform\(collapseBlank\(l\.text\), computed\.textTransform\)/.test(src),
  '行文本先过 collapseBlank 再套 text-transform（两个变换串联，顺序固定）');
ok(!/l\.text\.replace\(\/\\s\+\$\/, ''\)/.test(src),
  '旧的「只 trimEnd」写法已移除',
  '行首空白从未被处理，正是本 bug 的原因');

section('2. 空白字符类的写法（防工具链静默替换）');
ok(/\\u3000/.test(src), '含全角空格 U+3000 的 Unicode 转义');
ok(/\\u00A0/.test(src), '含 NBSP U+00A0 的 Unicode 转义');
ok(/new RegExp\(BLANK, 'g'\)/.test(src),
  '用 new RegExp 构造而非正则字面量',
  '字面量里的 irregular whitespace 会触发 eslint，且可能被静默替换成普通空格');

section('3. 行为模拟：只清两端');
{
  const BLANK_SRC = '^[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+'
    + '|[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+$';
  const clean = t => t.replace(new RegExp(BLANK_SRC, 'g'), '');

  const cases = [
    ['\n          MiMo 迄今为止最强大的旗', 'MiMo 迄今为止最强大的旗', '行首缩进+换行（本轮 bug）'],
    ['\n          全模态、高性能、低成本的高效', '全模态、高性能、低成本的高效', '第2 张卡同形态'],
    ['万亿参数，高效架构： 1T \n', '万亿参数，高效架构： 1T', '行尾空白'],
    ['  两端都有  ', '两端都有', '两端同时存在'],
    ['\t\t制表符缩进', '制表符缩进', 'tab 缩进'],
  ];
  for (const [input, expect, label] of cases) {
    const got = clean(input);
    ok(got === expect, `${label}：${JSON.stringify(input)} → ${JSON.stringify(got)}`,
      got === expect ? '' : `期望 ${JSON.stringify(expect)}`);
  }
}

section('4. 反证：中间空格必须原样保留');
{
  const BLANK_SRC = '^[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+'
    + '|[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+$';
  const clean = t => t.replace(new RegExp(BLANK_SRC, 'g'), '');

  // 这两行是价格表排版，全靠中间空格撑着
  ok(clean('￥ 0.025') === '￥ 0.025', '「￥ 0.025」中间空格保留');
  ok(clean('输入（缓存命中）    ￥ 3') === '输入（缓存命中）    ￥ 3',
    '「输入（缓存命中）    ￥ 3」的 4 个连续空格保留');

  // 若误用全局 /\s+/g → ' '，结果会变成什么样
  const wrong = '￥ 0.025'.replace(/\s+/g, ' ');
  ok(wrong === '￥ 0.025', '对照：这里恰好没被误改');
  const wrong2 = '输入（缓存命中）    ￥ 3'.replace(/\s+/g, ' ');
  ok(wrong2 === '输入（缓存命中） ￥ 3',
    '反证：全局折叠会把 4 个空格压成 1 个，价格与标签挤在一起',
    `全局折叠结果 = ${JSON.stringify(wrong2)}`);
}

section('5. 与既有 trim 路径不冲突');
{
  // directTextContent 自带 .trim()，是另一条路径，不该被改坏
  ok(/return out\.trim\(\);/.test(src), 'directTextContent 仍用 trim()（未被 collapseBlank 侵入）');
}

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);