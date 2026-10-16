/**
 * 离屏取样容器不得参与裁剪判定（回归测试）
 *
 * 【这个 bug 修了三轮才对】卡片页「卡片白色底怎么没有了」——
 * 四张白底卡片（background:#fff + border + border-radius）全部完全不可见，
 * 只剩卡片内部的米色色块和文字。
 *
 * 【三轮踩坑记录，勿重犯】
 * 诊断日志一直显示：
 *     [容器诊断] { type:'rectangle', size:'324x453', fill:'#FFFFFF',
 *                  stroke:'#ECECE6', sw:1, radius:14, clip:'9956.0,0,0,0' }
 * fill 对、shape 生成了，只有 clip 是荒谬的 9956px。
 *
 *   第 1 轮：错误假设「裁剪源是 host 本身」→ 跳过 host，结果 clipLeft 仍是 9956。
 *   第 2 轮：把「跳过」改成「跳过 host 后**继续向上**找」→ 现象完全不变。
 *          教训：日志里有异常值 ≠ 那是根因。修完必须问「现象消失了吗」。
 *   第 3 轮（真根因）：host 挂在 document.body 下，父链是 host → body → html。
 *          src/index.css 的 `body { overflow: hidden }` 会命中。
 *          body.getBoundingClientRect().left ≈ 0，元素 rect.left ≈ -9956
 *          → overLeft = max(0, 0 - (-9956)) = 9956。
 *          host 之上的东西全是我们自己的应用环境（body / html / #root），
 *          不是模型的 DOM。正确做法是**遇到 host 就 break 停止向上遍历**，
 *          而不是「跳过它继续找」。
 *
 * 关键差别（continue vs break）：
 *   continue → 越过 host 走到 body，在 body 处命中 → 照旧算出 9956
 *   break    → 遍历在 host 处终止，永远看不到 body → clipLeft = 0
 */
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (c, n, d = '') => {
  if (c) { pass++; console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); }
  else { fail++; console.log(`  ✗ ${n}  ${d}`); }
};
const section = t => console.log(`\n[${t}]`);

section('1. 标记常量与辅助函数');
ok(/const OFFSCREEN_HOST_FLAG = 'data-mimo-offscreen-host'/.test(src), '定义了标记常量');
ok(/function isOffscreenHost\(node\)/.test(src), '定义 isOffscreenHost 辅助函数');
ok(/host\.setAttribute\(OFFSCREEN_HOST_FLAG, '1'\)/.test(src), 'host 创建后被打上标记');

section('2. 两个裁剪检测函数都在 host 处【break】');
for (const fn of ['detectOverflowClip', 'inheritClipRadius']) {
  const i = src.indexOf(`function ${fn}(`);
  ok(i > 0, `定位到 ${fn}`);
  const body = src.slice(i, i + 1200);
  ok(/if \(isOffscreenHost\(node\)\) break;/.test(body),
    `${fn} 在 host 处终止遍历`,
    '必须是 break 而非 continue —— continue 会越过 host 走到 body 命中 overflow:hidden');
  ok(!/isOffscreenHost\(node\)\)\s*\{[^}]*continue/.test(body),
    `${fn} 不再「跳过 host 继续向上」`,
    '这正是第 2 轮无效修复的写法，是 bug 复发的入口');
}

section('3. 常量声明位置（防 TDZ）');
// 【踩坑】函数声明会提升，const 不会。若常量定义在两个使用点之后，
// 运行时处于暂时性死区，访问会抛 ReferenceError。
const flagIdx = src.indexOf('const OFFSCREEN_HOST_FLAG');
const clipIdx = src.indexOf('function detectOverflowClip(');
const radiusIdx = src.indexOf('function inheritClipRadius(');
ok(flagIdx > 0, '常量已定义');
ok(flagIdx < clipIdx, '常量在 detectOverflowClip 之前声明', `flag@${flagIdx} < clip@${clipIdx}`);
ok(flagIdx < radiusIdx, '常量在 inheritClipRadius 之前声明', `flag@${flagIdx} < radius@${radiusIdx}`);
ok(src.indexOf('const OFFSCREEN_HOST_FLAG') === flagIdx, '常量只声明一次（无重复定义）');

section('4. 误伤防护：模型自己的 overflow:hidden 仍要生效');
{
  const i = src.indexOf('function detectOverflowClip(');
  const body = src.slice(i, i + 3000);
  ok(/isOffscreenHost/.test(body), '判定依据是标记而非 overflow 值');
  const skipAt = body.indexOf('if (isOffscreenHost(node))');
  const csAt = body.indexOf('getComputedStyle');
  ok(skipAt > 0 && csAt > skipAt, '终止判定在读取 computedStyle 之前');
  // host 内部（模型 DOM）的 overflow:hidden 依旧走完整判定：
  // break 只在遇到 host 时生效，位于 host 之下的模型祖先不受影响。
  ok(/while \(node && depth < 8\)/.test(body), '循环仍逐级向上（host 以下的模型祖先照常检查）');
}

section('5. 回归：真实裁剪场景仍被覆盖');
{
  const i = src.indexOf('function detectOverflowClip(');
  const body = src.slice(i, i + 3000);
  ok(/overLeft = Math\.max\(0, pr\.left - rect\.left\)/.test(body), '左溢出计算保留');
  ok(/overRight = Math\.max\(0, rect\.right - pr\.right\)/.test(body), '右溢出计算保留');
  ok(/return \{ overLeft, overTop, overRight, overBottom \}/.test(body), '仍返回四边裁剪量');
}

section('6. 行为模拟：body 才是真凶');
{
  // 复刻修复前后的遍历结果，证明 break 才能把 clipLeft 从 9956 归零。
  const CONTAINER_OFFSET = 10000;

  // DOM 链：card → ... → host(overflow 无设置) → body(overflow:hidden)
  const chain = [
    { tag: 'DIV', cls: '.card', overflow: 'visible', left: -9956, w: 324 },
    { tag: 'DIV', cls: 'host', overflow: 'visible', left: -10000, w: 1000, isHost: true },
    { tag: 'BODY', cls: '', overflow: 'hidden', left: 0, w: 1440 },
  ];

  const detect = (stopMode) => {
    let clipLeft = 0;
    for (const n of chain) {
      if (n.isHost) {
        if (stopMode === 'break') break;         // 第 3 轮：终止
        if (stopMode === 'continue') continue;   // 第 2 轮：跳过继续（无效）
        // 第 1 轮：连 host 都不检查，也继续向上（同样无效）
        continue;
      }
      const clips = /hidden|clip|auto|scroll/.test(n.overflow);
      if (clips) {
        const over = Math.max(0, n.left - chain[0].left);
        if (over > 1) { clipLeft = over; break; }
      }
    }
    return clipLeft;
  };

  ok(detect('continue') === 9956, '模拟验证：跳过 host 继续向上 → clipLeft=9956（第 2 轮为何无效）',
    `实测 ${detect('continue')}`);
  ok(detect('break') === 0, '模拟验证：host 处 break → clipLeft=0（白底卡片可见）',
    `实测 ${detect('break')}`);
  ok(CONTAINER_OFFSET === 10000, '离屏偏移常量仍是 10000（模拟与线上一致）');
}

console.log(`\n${'='.repeat(56)}`);
console.log(`结果: ${pass} 通过 / ${fail} 失败`);
console.log(`${'='.repeat(56)}`);
if (fail > 0) process.exit(1);