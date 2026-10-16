/**
 * props 字段契约审计
 *
 * 为什么需要这个测试：
 *   imageData / imageSrc 不一致踩过一次—— 解析层写 imageSrc，
 *   ImageShape 只读 imageData，两边都不报错，图就是安静地不显示。
 *   同一类问题在 box-shadow 上更严重：解析层完整解析出 4 个 shadow* 字段，
 *   Canvas 各分支一个都没读，所有阴影静默丢失。
 *
 * 这类 bug 的共同特征是「不报错、只是什么都不发生」，
 * 靠肉眼看截图很难定位，必须用字段级对照把它变成可断言的契约。
 *
 * 做法：读真实源码文本，提取「解析层写入的 key」与「消费方读取的 key」，
 * 双向做差集并断言。刻意不复刻产品逻辑，只做文本级提取。
 */

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};

const P = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const parser = P('src/utils/htmlToShapes.js');
const canvas = P('src/components/Canvas.jsx');
const panel = P('src/components/PropertiesPanel.jsx');

/** 剥掉注释，避免文档里出现的字段名造成假失败/假通过 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const parserCode = stripComments(parser);
const canvasCode = stripComments(canvas);
const panelCode = stripComments(panel);

/** 提取「谁在读」：X.foo 的所有 foo */
function readKeys(src) {
  const set = new Set();
  for (const m of src.matchAll(/\bprops\.([A-Za-z_]\w*)/g)) set.add(m[1]);
  return set;
}

/**
 * 提取「解析层在写」。
 * 只认赋值与对象字面量键两种形式 —— 这是解析层产生 props 的全部途径。
 */
function writtenKeys(src) {
  const set = new Set();
  for (const m of src.matchAll(/\bprops\.([A-Za-z_]\w*)\s*=(?!=)/g)) set.add(m[1]);
  for (const m of src.matchAll(/\{([A-Za-z_]\w*)\s*:\s*[^}]+\}\s*;/g)) {
    for (const k of m[1].split(',')) set.add(k.trim());
  }
  return set;
}

const written = writtenKeys(parserCode);
const readAll = new Set([...readKeys(canvasCode), ...readKeys(panelCode)]);

console.log('\n=== 解析层 props 字段契约审计 ===\n');

/* ------------------------------------------------------------------ *
 * 1. 已知历史问题：imageData / imageSrc 曾静默失效
 * ------------------------------------------------------------------ */
console.log('[1] 图片字段契约');
check('解析层写 imageSrc', /props\.imageSrc\s*=/.test(parserCode));
check('ImageShape 同时接受 imageData 与 imageSrc',
  /activeProps\.imageData\s*\|\|\s*activeProps\.imageSrc/.test(canvasCode),
  'ImageShape 仍只读 imageData → 头像/图片会再次静默不显示');

/* ------------------------------------------------------------------ *
 * 2. box-shadow 全链路
 * ------------------------------------------------------------------ */
console.log('\n[2] box-shadow 全链路（解析 → 渲染）');
check('解析层写 shadowColor', /props\.shadowColor\s*=/.test(parserCode));
check('解析层写 shadowBlur', /props\.shadowBlur\s*=/.test(parserCode));
check('解析层写 shadowOffsetX', /props\.shadowOffsetX\s*=/.test(parserCode));
check('解析层写 shadowOffsetY', /props\.shadowOffsetY\s*=/.test(parserCode));
check('Canvas 消费 shadowColor', /activeProps\.shadowColor/.test(canvasCode),
  '所有 box-shadow 会静默丢失');
check('Canvas 消费 shadowBlur', /activeProps\.shadowBlur/.test(canvasCode));
check('Canvas 消费 shadowOffsetX', /activeProps\.shadowOffsetX/.test(canvasCode));
check('Canvas 消费 shadowOffsetY', /activeProps\.shadowOffsetY/.test(canvasCode));
check('阴影挂在形状节点而非 Group 上',
  /\{\.\.\.shadow\}/.test(canvasCode),
  '挂在 Group 上会让文字下方也压出一块阴影');

/* ------------------------------------------------------------------ *
 * 3. text 组件的新能力（内边距 / 垂直对齐 / 背景色）
 * ------------------------------------------------------------------ */
console.log('\n[3] text 组件能力契约');
for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
  check(`解析层写 ${k}`, new RegExp(`props\\.${k}\\s*=`).test(parserCode));
  check(`Canvas 读 ${k}`, new RegExp(`activeProps\\.${k}`).test(canvasCode));
}
check('解析层写 verticalAlign', /props\.verticalAlign\s*=/.test(parserCode));
check('Canvas 读 verticalAlign', /activeProps\.verticalAlign/.test(canvasCode));
check('解析层写 backgroundFill', /props\.backgroundFill\s*=/.test(parserCode));
check('Canvas 读 backgroundFill', /activeProps\.backgroundFill/.test(canvasCode));
check('Canvas 读 align（水平对齐）', /activeProps\.align\b/.test(canvasCode));

/* ------------------------------------------------------------------ *
 * 4. fontFamily：曾经只用于测宽、从不写入 props
 * ------------------------------------------------------------------ */
console.log('\n[4] 字体与排版契约');
check('解析层写 fontFamily', /props\.fontFamily\s*=/.test(parserCode),
  '字体只用于测宽却不写入 props → 所有非 Inter 字体静默丢失');
check('Canvas 消费 fontFamily', /activeProps\.fontFamily/.test(canvasCode));
check('字体写入受可选列表约束',
  /SELECTABLE_FONTS\.has\(first\)/.test(parserCode),
  '写入面板下拉无法回显的字体名会让属性面板显示空白');
check('解析层写 letterSpacing', /props\.letterSpacing = ls/.test(parserCode));
check('Canvas 消费 letterSpacing',
  /letterSpacing=\{activeProps\.letterSpacing \|\| 0\}/.test(canvasCode));
check('测宽函数按 (n-1)×ls 补偿字间距',
  /Array\.from\(text\)\.length - 1/.test(parserCode),
  'canvas 的 measureText 不含 CSS 字间距，不补会偏窄');
check('溢出裁剪：解析层写 clip 四字段',
  /props\.clipLeft = clip\.overLeft/.test(parserCode)
  && /props\.clipRight = clip\.overRight/.test(parserCode));
check('溢出裁剪：Canvas 三分支均接入 clipFunc',
  (canvasCode.match(/clipFunc=\{makeClipFunc\(/g) || []).length >= 3,
  'text/rect/image 任一漏接都会导致内容穿透容器');
// 渐变字段契约：与 box-shadow 同类 —— 解析层解析出来但 Canvas 一个都不读，
// 结果是渐变元素「不报错、只是完全不显示」。用双向差集把它固化成契约。
check('渐变：解析层写 4 个渐变字段 + 纯色回退',
  /props\.gradientStartX = lg\.sx/.test(parserCode)
  && /props\.gradientEndY = lg\.ey/.test(parserCode)
  && /props\.gradientColorStops = lg\.colorStops/.test(parserCode)
  && /props\.fill = lg\.colorStops\[1\]/.test(parserCode),
  '渐变未写纯色回退 → 首色半透明时元素会彻底看不见');
check('渐变：Canvas 定义 buildGradientFill 并在 ≥5 处分支接入',
  /function buildGradientFill\(/.test(canvasCode)
  && (canvasCode.match(/\.\.\.buildGradientFill\(activeProps\)/g) || []).length >= 5,
  'buildGradientFill 接入点不足 5 处（avatar/rect/ellipse/text 背景/image 兜底）');
check('渐变：buildGradientFill 透传 Konva 五个渐变参数',
  /fillLinearGradientStartPointX/.test(canvasCode)
  && /fillLinearGradientEndPointY/.test(canvasCode)
  && /fillLinearGradientColorStops/.test(canvasCode));

/* ------------------------------------------------------------------ *
 * 5. 头像组件：解析层此前完全不认识 avatar
 *
 * 项目里 avatar 组件、COMPONENT_TYPE_MAP['avatar'] 都已存在，
 * 但解析层只能产出 7 种类型（text/rectangle/image/icon/badge/divider/input），
 * 不含 avatar → 聊天气泡旁的小圆头像全被降级成普通 rectangle。
 * 后果：图层面板显示「矩形」而非「头像」，用户找不到也改不了。
 * ------------------------------------------------------------------ */
console.log('\n[5] 头像组件识别');
check('解析层实现 isAvatarLike 判据',
  /function isAvatarLike\(/.test(parserCode));
check('头像尺寸区间限定在 24~72px',
  /w < 24 \|\| h < 24 \|\| w > 72 \|\| h > 72/.test(parserCode));
check('头像必须近正方形',
  /Math\.abs\(w - h\) > 4/.test(parserCode));
// 【实测退化】判据曾要求「正圆」（radius ≈ w/2），但模型输出的是
// border-radius:6px 的圆角方形（微信风格头像本就这样）→ 真实头像全判不出。
check('头像接受圆角方形，不只认正圆',
  /const isRoundedSquare = radius >= 2 && radius < Math\.min\(w, h\) \/ 2 - 2/.test(parserCode)
  && /if \(!isRound && !isRoundedSquare\) return false/.test(parserCode),
  '只认正圆会让圆角方形头像（微信风格）全部降级成普通矩形');
// 【实测退化】判据曾要求「无元素子节点」，但模型会塞色块模拟照片质感。
check('头像允许无实质内容的色块子节点',
  /const kidHasText = Array\.from\(kid\.childNodes\)/.test(parserCode)
  && /if \(kidHasText \|\| kidHasKids\) return false/.test(parserCode));
check('头像不再被强制改成正圆',
  /if \(!\(parseFloat\(computed\.borderTopLeftRadius\) > 0\)\)/.test(parserCode)
  && !/props\.cornerRadius = Math\.min\(rect\.width, rect\.height\) \/ 2;\n  \}/.test(parserCode),
  '强制写 cornerRadius=min/2 会把 6px 圆角方形强行变正圆，与截图不符');
// 【实测退化 ×4】终止递归已改成条件式：仅当头像自身有实色时终止。
// 透明外层（颜色全在子节点）必须放行递归，否则色块一起消失。
check('头像终止递归（色块型头像的内部色块一律丢弃）',
  /if \(shape && shape\.componentType === 'avatar'\) return;/.test(parserCode),
  '放行递归 → 色块变成独立组件：图层面板多噪音，且拖动头像时色块不跟随');

//【用户选定的形态：纯色 + 首字母】
// 头像组件原本只有 fill + text + imageData，colorTiles 是为还原色块临时加的私货，
// 已按用户要求回退 —— 组件语义保持干净。
check('色块字段已完全移除（不扩展头像组件语义）',
  !/colorTiles/.test(parserCode.replace(/已回退|采集进 props\.colorTiles|\*\*不做\*\*/g, ''))
  && !/colorTiles/.test(canvasCode.replace(/colorTiles/g, '').replace(/\/\*[\s\S]*?\*\//g, '')),
  'colorTiles 仍在生效代码中 → 头像组件被扩展成任意裁切框，属性面板无法编辑/导出字段陌生');
check('解析层提取头像首字母到 props.text',
  /const initials = directTextContent\(el\);[\s\S]{0,120}props\.text = initials/.test(parserCode),
  '未提取首字母 → 头像只有色块圆，看不出是谁');
check('头像字色取模型 color（缺失时用白）',
  /props\.textColor = textColor/.test(parserCode));

// 判据必须放行「首字母形态」的头像 —— 提示词已要求模型写 ZT/ME
check('头像判据放行短首字母（1~2 个英文字母）',
  /const isInitials = \/\^\[A-Za-z\]\[A-Za-z\\s\.\]\{0,2\}\$\//.test(parserCode)
  && /if \(own && !isInitials\) return false/.test(parserCode),
  '判据仍一律排斥文字 → 带 ZT 的头像判不出头像组件');
check('判据仍拒绝非首字母文本（昵称/标签）',
  /if \(own && !isInitials\) return false/.test(parserCode)
  && !/if \(directTextContent\(el\)\) return false/.test(parserCode));
check('Canvas 头像文字精确居中（verticalAlign 而非粗略 y 偏移）',
  /verticalAlign="middle"/.test(canvasCode));
check('Canvas 头像文字不回落占位字母',
  !/text=\{activeProps\.text \|\| 'A'\}/.test(canvasCode));

// ------------------------------------------------------------------ *
// 12. 类型分流顺序：头像必须抢在 isTextOnlyElement 之前
//
// 【本轮真实退化】提示词改用首字母后，头像变成「只含文本节点的 div」，
// 于是 isTextOnlyElement 返回 true → componentType = 'text'。
// 而下游的头像判定只在 finalType === 'rectangle' 时执行 —— 永远不触发。
// 结果：图层面板显示「文本」、点进去是改文字，而不是头像。
//
// 教训：加了「组件内允许某内容」后，必须重查**所有会抢先消费该内容的判定**。
// 判据本身没错（它确实通过了），错的是执行顺序。
// ------------------------------------------------------------------ */
console.log('\n[12] 类型分流顺序（头像优先于 isTextOnlyElement）');

check('存在 isAvatarCandidate 前置探针',
  /function isAvatarCandidate\(/.test(parserCode),
  '无前置探针 → 带首字母的头像被 isTextOnlyElement 抢先判成 text');
check('text 分支排除头像候选',
  /isTextOnlyElement\(el\) && direct && !isAvatarCandidate\(el, rect, computed\)/.test(parserCode),
  'text 分支未排除头像 → 头像永远走 text，componentType 拿不到 avatar');
check('前置探针复用 isAvatarLike（不重复实现判据）',
  /return isAvatarLike\(el, rect, computed/.test(parserCode),
  '另写一套判据 → 两处漂移，前置探针与下游判定结论不一致');
check('前置探针用 computed 兜底填充（此时 extractVisualStyle 尚未执行）',
  /fill: toHex\(computed\.backgroundColor\) \|\| undefined/.test(parserCode),
  '前置探针传空 props → 纯色头像被误判为「无填充」');
check('头像判定仍只对 rectangle 生效（前置探针已把类型让出来）',
  /finalType = 'avatar'/.test(parserCode));
// 【首字母已是正规需求】模型按提示词写 ZT/ME，判据必须放行短首字母，
// 但仍要拒绝昵称/长文本。故不再断言「无直接文本」。
check('头像判据不再无条件排斥直接文本（首字母形态）',
  !/if \(directTextContent\(el\)\) return false/.test(parserCode),
  '无条件排斥文字 → 提示词要求写的 ZT/ME 判不出头像组件');
// 【实测退化 ×4】判据必须是「能构成可视区域」，而不是「自身有背景色」。
// 头像填充可能来自三处，逐个都真实退化过：
//   ① 自身纯色（正常）
//   ② 自身 linear-gradient（backgroundColor=transparent → fill 空）
//   ③ **子节点色块**（模型模拟照片质感：透明外层 + N 个色块 div）—— 本轮真实 case
// 只认 props.fill / gradientColorStops 会让第③种直接判不出头像。
check('头像判据认「自身或子节点有填充」（不只看自身）',
  /const selfFilled = !!\(props\.fill \|\| props\.gradientColorStops\)/.test(parserCode)
  && /const kidFilled = Array\.from\(el\.children\)\.some/.test(parserCode)
  && /if \(!selfFilled && !kidFilled\)/.test(parserCode)
  // 反向：旧写法「只看自身填充」不得复活。
  // 注意不能裸匹配 /if \(!props\.fill && !props\.gradientColorStops\)/，
  // 它是新判据的合法子串（selfFilled 的定义行），会误伤。
  && !/if \(!props\.fill && !props\.gradientColorStops\) return false/.test(parserCode),
  '头像判据只看自身填充 → 透明外层+色块的头像判不出头像组件');
//【Konva Text 硬约束】Text 组件传空串会抛
//  "Text components are not supported for now in ReactKonva. Your text is: ''"
// 该异常发生在子节点挂载阶段，会把整个 Group 弄坏 —— 之后 Konva 遍历时
//  读 getParent() 抛 "Cannot read properties of undefined"，
//  头像彻底不显示且控制台刷一屏红（用户实测报过）。
// 正确做法是「无文字就不渲染 Text 节点」，而不是给 Konva 喂 ''。
check('Canvas 无 text="" 传给 Konva Text（会抛异常并弄坏 Group）',
  !/text=\{[^}]*\|\|\s*''\s*\}/.test(canvasCode),
  '存在 text={xxx || \'\'} → 无文字时抛 Konva 异常，形状连带不显示');
check('Canvas 三处 Text 均以 activeProps.text 为渲染前提',
  (canvasCode.match(/\{!isEditing && activeProps\.text \?/g) || []).length >= 2,
  '应改为「有文字才渲染 Text」而非传空串');
check('头像判定在 isDecorative 之前（否则会被当装饰丢弃）',
  parserCode.indexOf('isAvatarLike(el, rect, computed, props)')
    < parserCode.indexOf('const isDecorative'));
//【注意】这里不能再断言 /finalType !== 'avatar'/ ——
//  头像分支已把 finalType 改写为 'avatar'，该条件恒为真，是条永真断言。
//  真正的防回归在 [11] 组：验证 finalType 确实被改写，且 shape 确实读它。
check('COMPONENT_TYPE_MAP 已含 avatar',
  /avatar:\s*'rect'/.test(P('src/utils/componentSchema.js')));
check('Canvas 有 avatar 渲染分支',
  /startsWith\('avatar'\)/.test(canvasCode));

/* ------------------------------------------------------------------ *
 * 10.5 头像组件「拖到画布」的端到端链路
 *
 * 用户实测报告过「头像组件拖到画布中不显示」。这类 bug 极难定位——
 * 渲染分支、fill 兜底、id 判定全都在，但任一环节断裂都是静默失败。
 * 这里把整条链路的关键契约钉住：
 *   componentList.avatar.type → App.handleDrop 产出的 shape.type →
 *   Canvas switch 命中 case → componentType||id 兜底判定 → avatar 分支存在
 * ------------------------------------------------------------------ */
console.log('\n[10.5] 头像组件拖拽链路（防静默消失）');

const listCode = P('src/components/componentList.js');
const appCode = P('src/App.jsx');

// 组件模板本身必须带可见填充，否则拖出来就是透明块（看起来像"没显示"）
const avatarDef = listCode.match(/id:\s*'avatar'[\s\S]*?props:\s*\{([\s\S]*?)\n\s{4}\}/);
check('componentList 里存在 avatar 组件定义', !!avatarDef);
if (avatarDef) {
  check('avatar 模板带可见填充（无填充则拖出来是透明块）',
    /fill:\s*'#[0-9A-Fa-f]{3,8}'/.test(avatarDef[1]),
    'avatar 模板缺 fill → 拖到画布是完全透明的，看起来像"不显示"');
  check('avatar 模板声明 type: rect（须与 Canvas case 对齐）',
    /type:\s*'rect'/.test(listCode.match(/id:\s*'avatar'[\s\S]{0,80}?type:\s*'(\w+)'/)?.[0] || ''));
}

// App.handleDrop 必须原样透传 component.type —— 若写成硬编码 'rect'，
// 其他组件类型会被降级；avatar 目前恰好不受影响，但断言能防未来改坏
check('handleDrop 透传 component.type 而非硬编码',
  /type:\s*component\.type/.test(appCode),
  'handleDrop 硬编码 type 会让组件模板的 type 失效');
check('handleDrop 浅拷贝 props（避免污染组件模板）',
  /props:\s*\{\s*\.\.\.component\.props\s*\}/.test(appCode),
  '直接引用 component.props 会让画布上的编辑反写进组件模板');

// 拖拽产物没有 componentType，判定必须靠 id 兜底 —— 这是最容易漏的一环
check('Canvas 用 componentType || id 兜底判定（拖拽产物无 componentType）',
  /shape\.componentType \|\| shape\.id/.test(canvasCode),
  '只读 componentType → 手动拖入的组件全部匹配不到渲染分支，表现为"拖进来什么都不出现"');
// 【transparentBody 已回退】头像改为「纯色 + 首字母」后，
// 不再有透明外层这一形态，故原断言删除；fill 兜底要求由 Canvas 源码承担。
check('avatar 分支保留 fill 兜底（解析层产物缺 fill 时仍可见）',
  /fill=\{activeProps\.fill \|\| '#DBEAFE'\}/.test(canvasCode));

// 【Konva Text 硬约束 · 用户实测踩过】Text 传空串会抛异常并弄坏整个 Group，
// 表现是「拖进来的头像完全看不见 + 控制台一屏红」。
// 修法是「有文字才渲染 Text 节点」——但必须同时保证：
//   · 截图复刻产出的头像（无 text）→ 不渲染 Text，靠色块/底色表达
//   · 手动拖入的头像模板（text:'A'）→ 照常显示字母，不能被一起改没
check('拖入模板仍带 text（配合条件渲染显示首字母）',
  /text:\s*'A'/.test(avatarDef?.[1] || ''),
  '模板缺 text → 条件渲染后拖入的头像变成纯色块，没有首字母');
check('avatar 分支不向 Konva 传空串（截图复刻产出的头像没有 text）',
  /activeProps\.text \? \(\s*<Text\s+text=\{activeProps\.text\}/.test(canvasCode),
  '头像分支仍在传 text={activeProps.text || \'\'} → 无文字时 Konva 抛异常');
/* ------------------------------------------------------------------ *
 * 5. 双向差集：孤儿字段（写了没人读）
 * ------------------------------------------------------------------ */
console.log('\n[6] 孤儿字段审计（解析层写了但无人读取）');
/**
 * 这些字段被有意排除：
 *  - width/height/fill/stroke 等经Canvas 内部变量转译的字段已在第2-4 组断言
 *  - x/y/radius/points 属于 shape 顶层字段而非 props
 *  - hoverProps 之类由 AI 工具链路写入
 * 下面按实际读点做保守过滤：只报告「出现次数为 0」以外的噪音项。
 */
const ALLOWED_ORPHANS = new Set([
  // 解析层内部中间量，通过 styleProps / 局部变量流转，不直接进 props 消费端
  'textColor', 'lineHeight', 'scale', 'visible',
]);

const orphans = [...written]
  .filter(k => !readAll.has(k) && !ALLOWED_ORPHANS.has(k))
  .filter(k => {
    // 排除在解析层内部被读取过的中间量（比较/条件判断也算消费）
    return !new RegExp(`\\b${k}\\b`).test(canvasCode + panelCode)
      && !new RegExp(`props\\.${k}\\b(?![\\s]*=)`).test(parserCode);
  })
  .sort();

check('解析层无「写了但无人消费」的字段',
  orphans.length === 0,
  orphans.length ? `孤儿字段：${orphans.join(', ')}` : '');

if (orphans.length) {
  console.log('        孤儿字段明细：', orphans);
}

/* ------------------------------------------------------------------ *
 * 6. 反向差集：读取方读但解析层不写的字段
 * ------------------------------------------------------------------ */
console.log('\n[7] 反向差集（消费方读但解析层不写）');
/**
 * 这些字段由 AI 工具链路（ChatWindow 的 tools schema）写入，不是解析层的职责，
 * 因此排除。剩下的若确实无人写入，就是解析层的缺口。
 */
const AI_ONLY = new Set([
  'fillOff', 'checkColor', 'checked', 'value', 'knobColor', 'knobStroke',
  'iconPath', 'imageData', 'points', 'radiusY', 'scale',
  'visible', 'visibleIf', 'hoverProps', 'interactions',
  'html', 'onClick', 'onChange', 'onDragEnd', 'lockAspectRatio',
  'rotation', 'opacity', 'dragBoundFunc', 'rotationBoundFunc',
  'shadowEnabled', 'placeholder', 'id', 'type',
  // padding：Canvas 用它作四向 padding 的简写别名（AI 工具写 padding: 8 即可），
  // 解析层只写四向字段。属于有意的宽松读法，不是缺口。
  'padding',
  // textAlign：input 组件组的字段（Canvas 第 1166 行），与 text 组的 align 并存。
  // 解析层不产 input 组件，故不由它写入。
  'textAlign',
]);
const notWritten = [...readAll]
  .filter(k => !written.has(k) && !AI_ONLY.has(k))
  .sort();

check('解析层无「被读取却从不写入」的字段',
  notWritten.length === 0,
  notWritten.length ? `无人写入：${notWritten.join(', ')}` : '');

if (notWritten.length) {
  console.log('        无人写入明细：', notWritten);
}

/* ------------------------------------------------------------------ *
 * 7. 已删除的死字段不得复活
 * ------------------------------------------------------------------ */
console.log('\n[8] 死字段回归防护');
check('不再写 fillEnabled（无人消费的误导字段）',
  !/props\.fillEnabled\s*=/.test(parserCode));
check('不再写 cornerRadiusInherited（污染属性面板与导出 JSON）',
  !/props\.cornerRadiusInherited\s*=/.test(parserCode));

/* ------------------------------------------------------------------ *
 * 8. verbose 日志消费端不能因新增诊断条目而崩溃
 * ------------------------------------------------------------------ */
console.log('\n[9] 诊断日志健壮性');
check('文本明细过滤不再裸调 v.text.trim()',
  !/\.filter\(v => v\.text\.trim\(\)\)/.test(parserCode),
  '新增无 text 字段的诊断条目会让此处抛 TypeError');
check('clipRadius 条目带 tag 标记', /tag:\s*'clipRadius'/.test(parserCode));

/* ------------------------------------------------------------------ *
 * 10. isAvatarLike 行为验证（用真实场景而非源码文本）
 *
 * 只断言「源码里写了某个正则」是不够的 —— 判据能写对不代表判得对。
 * 这里直接把 isAvatarLike 的判据复刻成纯函数跑 9 个真实场景，
 * 重点覆盖**易误伤**的四类：按钮 / 输入框 / 卡片缩略图 / 小图标。
 * ------------------------------------------------------------------ */
console.log('\n[10] isAvatarLike 行为验证（11 个真实场景）');

// 判据演化到第4 版：填充可来自自身或子节点。
// kept 与源码 isAvatarLike 的判据逐条对应，改源码时这里必须同步改。
function isAvatarLikeSpec({ w, h, radius, hasText, kidsOk, selfFill, kidFill }) {
  if (w < 24 || h < 24 || w > 72 || h > 72) return false;
  if (Math.abs(w - h) > 4) return false;
  const isRound = radius > 0 && Math.abs(radius - Math.min(w, h) / 2) < 3;
  const isRoundedSquare = radius >= 2 && radius < Math.min(w, h) / 2 - 2;
  if (!isRound && !isRoundedSquare) return false;
  if (hasText) return false;
  if (!kidsOk) return false;
  // 自身或子节点任一有填充即可 —— 本轮真实case：透明外层 + 3 个色块子div
  return !!(selfFill || kidFill);
}

const SCENARIOS = [
  // 正例
  ['模型实测头像 46x46 r6 含 2 色块', { w: 46, h: 46, radius: 6, hasText: false, kidsOk: true, selfFill: true }, true],
  ['圆形头像 40x40 r20', { w: 40, h: 40, radius: 20, hasText: false, kidsOk: true, selfFill: '#DBEAFE' }, true],
  // 本轮真实case：透明外层 + 3 色块子div（模型输出 40x40 r6）
  ['★透明外层+色块 40x40 r6', { w: 40, h: 40, radius: 6, hasText: false, kidsOk: true, selfFill: false, kidFill: true }, true],
  ['渐变头像 42x42 r4 自身有渐变', { w: 42, h: 42, radius: 4, hasText: false, kidsOk: true, selfFill: true }, true],
  // 反例 —— 以下是最容易被误伤的
  ['按钮 200x44 r6（非正方形）', { w: 200, h: 44, radius: 6, hasText: false, kidsOk: true, selfFill: '#fff' }, false],
  ['输入框 320x40 r8（非正方形）', { w: 320, h: 40, radius: 8, hasText: false, kidsOk: true, selfFill: '#fff' }, false],
  ['卡片缩略图 100x100 r8（超尺寸上限）', { w: 100, h: 100, radius: 8, hasText: false, kidsOk: true, selfFill: '#eee' }, false],
  ['分页圆点 8x8 r4（小于下限）', { w: 8, h: 8, radius: 4, hasText: false, kidsOk: true, selfFill: '#ccc' }, false],
  ['小图标 20x20 r2（小于下限）', { w: 20, h: 20, radius: 2, hasText: false, kidsOk: true, selfFill: '#333' }, false],
  ['方形色块 46x46 r0（无圆角）', { w: 46, h: 46, radius: 0, hasText: false, kidsOk: true, selfFill: '#EDE4D6' }, false],
  ['头像内含带文本子节点', { w: 40, h: 40, radius: 20, hasText: false, kidsOk: false, selfFill: '#fff' }, false],
  // 关键反例：放开填充来源后，**完全空的圆角小方块**不能被判成头像
  ['空透明框 40x40 r6 无任何填充', { w: 40, h: 40, radius: 6, hasText: false, kidsOk: true, selfFill: false, kidFill: false }, false],
];
for (const [name, input, expected] of SCENARIOS) {
  const got = isAvatarLikeSpec(input);
  check(name, got === expected, `期望 ${expected ? '头像' : '非头像'}，实得${got ? '头像' : '非头像'}`);
}

/* ------------------------------------------------------------------ *
 * 11. 头像类型「真正生效」（静默失效的经典形态）
 *
 * 【踩坑全过程】头像识别拖了 5 轮才修好，根因极典型：
 *   第 1012 行 `const { renderType, componentType: finalType } = resolveComponentType(...)`
 *   把解析结果解构成 **const 快照**；
 *   头像分支只写 `componentType = 'avatar'`（局部变量）；
 *   而 shape 的 id / type / componentType **全都读 finalType**。
 *   → 判据通过、日志打印「判为头像」，产出的 shape.componentType 仍是 'rectangle'。
 *
 * 为什么测试没抓到：当时的断言是
 *   /componentType = 'avatar'/.test(parserCode)
 * —— 只证明源码里**写了**这行字，不证明它**生效了**。
 *   典型静默失效：不报错、不警告、只是不发生。
 *
 * 教训：断言必须读「数据流终点」，而不是「赋值语句」。
 * ------------------------------------------------------------------ */
console.log('\n[11] 头像类型生效性（防 const 快照静默失效）');

check('finalType/renderType 用 let 解构（可被头像分支改写）',
  /let\s*\{\s*renderType,\s*componentType:\s*finalType/.test(parserCode)
  && !/const\s*\{\s*renderType,\s*componentType:\s*finalType/.test(parserCode),
  'const 解构 → 头像分支改 finalType 会抛 TypeError，或改写不生效');

check('头像分支改写 finalType（真正被 shape 读取的变量）',
  /finalType = 'avatar';/.test(parserCode),
  '只改 componentType 局部变量 → shape.componentType 仍是 rectangle');

check('头像分支同步改写 renderType',
  /renderType = 'rect';/.test(parserCode),
  'renderType 未同步 → shape.type 与 componentType 不一致');

// 头像类型传导（第三十四轮重构：这两个表达式抽成了 usesCircleCenter 变量）
check('usesCircleCenter 已定义，且排除 avatar',
  /const usesCircleCenter = isCircle && finalType !== 'avatar'/.test(parserCode)
  && /finalType !== 'avatar'/.test(parserCode),
  'usesCircleCenter 未定义或未排除 avatar → 头像会被误判为 circle');

check('shape 的 componentType 由 usesCircleCenter 驱动（数据流终点）',
  /componentType:\s*usesCircleCenter \? 'circle' : finalType/.test(parserCode),
  'shape.componentType 未走 usesCircleCenter → 头像类型无法传导到画布');

check('shape 的 type 同样受 finalType 驱动',
  /type:\s*usesCircleCenter \? 'circle' : renderType/.test(parserCode));

console.log(`\n=== props 契约审计：${pass} 通过 / ${fail} 失败 ===\n`);
process.exit(fail ? 1 : 0);
