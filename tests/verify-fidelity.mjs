/**
 * 回归验证：还原度（用户实测对比截图后发现的问题）
 *
 * 用户现象：截图 1080×570 卡片墙，还原后出现
 *   1. 标题被截断「MiMo-V2.6-Pro-UltraSp」
 *   2. 金额粘连「¥30 / MTok」→「¥6O / MTok」
 *   3. 价格行大面积折行「输入（缓存 ¥0.025 / MTok 命中）」占两行
 *   4. 卡片被纵向拉高，与截图比例不符
 *   5. 卡片间距异常
 *
 * 根因：
 *   A. 文字宽度用length * fontSize * 0.6 估算 → 中英混排严重偏小
 *   B. 离屏容器固定 800px，而截图 1080px → flex 布局被压缩 26%
 *   C. 提示词未要求显式像素尺寸，模型依赖 flex 自动分配
 *
 * 说明：断言一律读**真实源码/真实模块**，不在测试里复刻一份产品逻辑，
 * 避免「测试通过但产品没改」这类假阳性。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildHtmlPrompt, extractHtml, HTML_MODE_PROMPT, HTML_MODE_PROMPT_VISION, HTML_MODE_PROMPT_EDIT } from '../src/utils/buildHtmlPrompt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? ' → ' + d : ''}`); } };

const htmlToShapes = SRC('src/utils/htmlToShapes.js');
const chatWindow = SRC('src/rag/ChatWindow.jsx');
// 断言「旧逻辑是否还在」时必须先剥掉注释，否则文档里写着「改造前用 0.6 估算」会造成假失败
const stripComments = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const htmlToShapesCode = stripComments(htmlToShapes);
const chatWindowCode = stripComments(chatWindow);

console.log('\n=== 1. 文字宽度改用离屏 canvas 实测（而非 length*fs*0.6 粗估） ===');
check('导出 measureTextWidth', /export function measureTextWidth\(/.test(htmlToShapes));
check('使用 canvas getContext(\'2d\') 实测', /getContext\('2d'\)/.test(htmlToShapes));
check('调用 measureText 拿真实像素宽度', /measureCtx\.measureText\(/.test(htmlToShapes));
check('旧的 length * fs * 0.6 粗估已从代码中移除（注释不算）',
  !/length\s*\*\s*(fs|fontSize)\s*\*\s*0\.6/.test(htmlToShapesCode),
  '代码里仍有 0.6 系数粗估');
check('无 canvas 环境时保留退化估算兜底',
  /退化估算/.test(htmlToShapes) && /1\.0\s*:\s*0\.58/.test(htmlToShapes));
check('text 分支把实测宽度写进 props.width',
  /props\.width = Math\.max\(Math\.ceil\(maxLineW\)/.test(htmlToShapesCode));
check('text 分支按实测行数放大 props.height',
  /props\.height = Math\.max\(Math\.round\(rect\.height\)/.test(htmlToShapesCode));

console.log('\n=== 2. 容器宽度跟随截图真实像素 ===');
check('ChatWindow 持有截图原始尺寸 selectedImageMeta', /selectedImageMeta/.test(chatWindow));
check('上传时记录 width/height 与compressedWidth/Height',
  /setSelectedImageMeta\(\{[\s\S]{0,200}?width:[\s\S]{0,200}?compressedWidth/.test(chatWindow));
check('移除截图时清理 meta，避免沿用上次尺寸',
  /removeImage[\s\S]{0,300}?setSelectedImageMeta\(null\)/.test(chatWindow));
check('存在「采用截图原始宽度作为容器宽度」分支',
  /采用截图原始宽度/.test(chatWindowCode));
check('rootWidth 直接取截图原始宽度，未二次乘压缩比',
  /rootWidth\s*=\s*Math\.round\(selectedImageMeta\.width\)/.test(chatWindowCode)
  && !/rootWidth\s*=\s*Math\.round\([^)]*\*\s*scale/.test(chatWindowCode));
check('容器宽度写进提示词（rootWidth 参数）',
  /buildHtmlPrompt\([^)]*rootWidth/.test(chatWindow));
check('rootWidth 同时传给解析层，保证测量宽度一致',
  /htmlToShapes\(htmlSource,\s*\{[^}]*width:\s*rootWidth/.test(chatWindow));

// 纯逻辑验证：800px 容器 vs 1080px 容器，4 张卡片的可用宽度差异
console.log('\n  实际影响：');
const cardsFit = (containerW, count, gap = 20) => (containerW - gap * (count - 1)) / count;
const oldCardW = cardsFit(800, 4);
const newCardW = cardsFit(1080, 4);
console.log(`  4 张卡片在 800px 容器下每张 ${Math.round(oldCardW)}px，在 1080px 下为 ${Math.round(newCardW)}px（缩水 ${Math.round((1 - oldCardW / newCardW) * 100)}%）`);
check('800px 容器下 4 卡片宽度确实不足 200px（文字必然折行）', oldCardW < 200, `实测 ${Math.round(oldCardW)}px`);
check('1080px 容器下 4 卡片宽度 > 240px', newCardW > 240, `实测 ${Math.round(newCardW)}px`);
check('无截图时默认容器宽度为 1080', /rootWidth\s*=\s*canvasShapes\?\.length[\s\S]{0,200}?:\s*1080/.test(chatWindow));

console.log('\n=== 3. 提示词约束（真实常量）===');
const visionPrompt = buildHtmlPrompt('vision', { rootWidth: 1080 });
check('【铁律】宽度由浏览器 flex 计算，禁止模型自填像素宽度',
  /宽度由浏览器\s*flex\s*计算/.test(visionPrompt)
  && !/不要依赖 flex/.test(visionPrompt));
check('禁止写死卡片宽度，要求 flex:1 均分',
  /flex:1/.test(visionPrompt) && /不要写死宽度/.test(visionPrompt));
check('价格行要求 space-between 左右分栏',
  /justify-content:space-between/.test(visionPrompt));
check('要求标签与数值各自是 span，不合并成字符串',
  /各自是\s*<span>/.test(visionPrompt));
check('要求根容器宽度 = 截图宽度', visionPrompt.includes('1080') && /截图的实际像素宽度/.test(visionPrompt));
check('禁止用 fixed/absolute 定位（除根容器）',
  /不要用\s*fixed\/absolute\s*定位/.test(visionPrompt));
check('要求卡片容器写 background/border-radius/border/padding',
  /background/.test(visionPrompt) && /border-radius/.test(visionPrompt) && /padding/.test(visionPrompt));
check('要求卡片内上下分区用嵌套 flex column',
  /flex-direction:column/.test(visionPrompt));
check('要求用 <br> 控制换行位置，不靠调窄容器',
  /就在那个位置写 <br>/.test(visionPrompt)
  && /不要靠调窄容器宽度/.test(visionPrompt));
check('禁止输出完整文档与 style 标签',
  /不要输出 <!DOCTYPE>、<html>、<head>、<body>、<style> 标签/.test(visionPrompt));
check('要求横向元素总宽不超过父容器（防溢出到相邻卡片）',
  /总宽不得超过父容器/.test(visionPrompt)
  && /溢出到相邻卡片/.test(visionPrompt));
check('rootWidth 正确注入到 vision 提示词', !visionPrompt.includes('${ROOT_WIDTH}') && visionPrompt.includes('1080px'));
check('text 模式提示词同样强调 flex 由浏览器算宽度',
  /flex:1/.test(HTML_MODE_PROMPT));
check('buildHtmlPrompt 对 edit 模式单独分支',
  buildHtmlPrompt('edit', { rootWidth: 1080 }) === HTML_MODE_PROMPT_EDIT);
check('VISION 常量保留 ${ROOT_WIDTH} 占位符，运行时才注入',
  HTML_MODE_PROMPT_VISION.includes('${ROOT_WIDTH}'));

console.log('\n=== 4. extractHtml 稳健提取 ===');
check('提取 ```html 代码块', extractHtml('说明文字\n```html\n<div style="width:10px">a</div>\n```') === '<div style="width:10px">a</div>');
check('提取裸 HTML', extractHtml('<div><span>x</span></div>') === '<div><span>x</span></div>');
check('纯文本不误判为 HTML', extractHtml('这里有 < 和 > 符号但不是标签') === null);
check('空输入返回 null', extractHtml('') === null);

console.log('\n=== 5. 换行由浏览器实测（Range API），不再靠估算 ===');
const canvas = SRC('src/components/Canvas.jsx');
const canvasCode = stripComments(canvas);
check('导出 extractRenderedLines', /export function extractRenderedLines\(/.test(htmlToShapes));
check('使用 TreeWalker 遍历文本节点', /createTreeWalker/.test(htmlToShapes));
check('使用 Range API 逐字符取真实矩形', /range\.setStart/.test(htmlToShapes) && /range\.getBoundingClientRect\(\)/.test(htmlToShapes));
check('按 top 归行（top 容差 2px）', /Math\.abs\(prev\.top - l\.top\) <= 2/.test(htmlToShapesCode));
check('行按 top 排序', /lines\.sort\(\(a, b\) => a\.top - b\.top\)/.test(htmlToShapesCode));
check('用 \\n 固化浏览器换行决策', /props\.text\s*=\s*rendered\.map\(l => l\.text[\s\S]{0,80}?join\('\\\\n'\)/.test(htmlToShapesCode)
  || /join\('\\n'\)/.test(htmlToShapesCode));
check('宽度取实测最长行，而非 rect.width 或估算',
  /const maxLineW = Math\.max\(\.\.\.rendered\.map\(l => l\.right - l\.left\)\)/.test(htmlToShapesCode)
  && /props\.width = Math\.max\(Math\.ceil\(maxLineW\)/.test(htmlToShapesCode));
check('行高取浏览器实测的两行 top 差值',
  /rendered\[1\]\.top - rendered\[0\]\.top/.test(htmlToShapesCode));
check('文本坐标用实测行盒覆盖 rect',
  /shapeTextBox\.left = rendered\[0\]\.left/.test(htmlToShapesCode)
  && /shapeTextBox\.top = rendered\[0\]\.top/.test(htmlToShapesCode));
check('坐标取值确实用上 shapeTextBox',
  /shapeTextBox\.left \?\? rect\.left/.test(htmlToShapesCode)
  && /shapeTextBox\.top \?\? rect\.top/.test(htmlToShapesCode));

console.log('\n=== 6. Konva 侧配合：多行文本高度 + 关闭自动折行 ===');
// 注意：本轮把 contentHeight 合并进 textHeight（外框高不再叠加上下 padding），
// 变量名变了，但「必须按 \n 行数算高度、不能恒取单行」的原意不变。
check('case \'text\' 按\\n 行数计算高度，而非恒取单行',
  /split\('\\n'\)\.length/.test(canvasCode)
  && /const textHeight = Math\.max\(\s*activeProps\.height \|\| 0,\s*fontSize \* lineHeight \* lineCount\s*\)/.test(canvasCode));
check('getShapeBounds 同样按行数算高度',
  /Math\.max\(props\.height \|\| 0, fontSize \* lineHeight \* lineCount\)/.test(canvasCode));
check('Konva Text 设置 wrap="none"，避免二次折行',
  /wrap="none"/.test(canvasCode));
check('Konva Text 传入 height（多行垂直居中基准）',
  /height=\{textHeight\}/.test(canvasCode));
check('fontFamily 有兜底（此前无兜底，中文回退不可控）',
  /fontFamily=\{activeProps\.fontFamily \|\| 'Inter'\}/.test(canvasCode));

console.log('\n=== 7. 嵌套 span 不再父子重复渲染（叠字/重叠的根因） ===');
check('新增 directTextContent，只取直接子文本节点',
  /function directTextContent\(/.test(htmlToShapes)
  && /node\.nodeType === Node\.TEXT_NODE\) out \+= node\.textContent/.test(htmlToShapesCode));
check('span/p/h* 分支改用共享的 hasSubstantiveChildren 判断子节点',
  /const hasElementChild = hasSubstantiveChildren\(el\)/.test(htmlToShapesCode)
  && !/Array\.from\(el\.children\)\.length > 0/.test(htmlToShapesCode));
check('有子节点但无自身文字才降级为容器（聊天气泡有文字须保留）',
  /hasElementChild && !ownText/.test(htmlToShapesCode));
check('text 内容改用 ownText（=directTextContent 的结果）',
  /props\.text = ownText/.test(htmlToShapesCode)
  && /const ownText = directTextContent\(el\)/.test(htmlToShapesCode));
check('空文本但有背景/边框的 span 判为装饰形状（分页圆点）',
  /!ownText && \(styleProps\.fill \|\| styleProps\.stroke\)/.test(htmlToShapesCode)
  && /装饰形状（分页圆点/.test(htmlToShapes));
check('<br> 不算「有元素子节点」，否则 <p>文字<br>文字</p> 整段丢失',
  /NON_CONTENT_TAGS\.has\(n\.tagName\.toLowerCase\(\)\)/.test(htmlToShapesCode)
  && /NON_CONTENT_TAGS\.has\(c\.tagName\.toLowerCase\(\)\)/.test(htmlToShapesCode));
check('主流程不再把 el.textContent 直接赋给 props.text',
  !/props\.text = textContent/.test(htmlToShapesCode));

console.log('\n=== 8. 两阶段收集：叶子层永远在背景层之上 ===');
check('背景/边框层与叶子层分开收集',
  /const bgShapes = \[\]/.test(htmlToShapesCode) && /const leafShapes = \[\]/.test(htmlToShapesCode));
check('最终顺序为 背景层 concat 叶子层',
  /bgShapes\.concat\(leafShapes\)/.test(htmlToShapesCode));
check('带背景且有子节点 → 归入背景层',
  /isBackgroundLike && hasElementChildren[\s\S]{0,120}?bgShapes\.push\(shape\)/.test(htmlToShapesCode));
check('纯容器（无视觉无文字）不绘制只递归',
  /hasElementChildren && !shape\.props\.text/.test(htmlToShapesCode));
check('输出分层统计日志，便于用户核对',
  /分层收集：背景\/边框层/.test(htmlToShapes));

console.log('\n=== 9. overflow:hidden 圆角裁剪补偿 ===');
check('新增 inheritClipRadius 查找裁剪祖先',
  /function inheritClipRadius\(/.test(htmlToShapes));
check('判定祖先 overflow为 hidden/clip',
  /overflow\.includes\('hidden'\).*overflow\.includes\('clip'\)/.test(htmlToShapesCode));
check('仅当贴住祖先上/下边时才继承圆角（内部元素不误圆角）',
  /touchesTop \|\| touchesBottom/.test(htmlToShapesCode));
check('圆角不超过元素自身尺寸一半（避免小元素被圆成胶囊）',
  /Math\.min\(r, Math\.min\(rect\.width, rect\.height\) \/ 2\)/.test(htmlToShapesCode));
check('矩形分支实际调用并写入 props.cornerRadius',
  /const inherited = inheritClipRadius\(el, rect\)/.test(htmlToShapesCode)
  && /props\.cornerRadius = inherited/.test(htmlToShapesCode));
check('仅对 rect 且自身无圆角时生效',
  /renderType === 'rect' && !props\.cornerRadius/.test(htmlToShapesCode));
check('向上查找深度有限（性能）', /depth < 6/.test(htmlToShapesCode));

console.log('\n=== 10. 纯装饰元素不复原（背景纹理） ===');
check('新增 isDecorative 判定',
  /const isDecorative = !isSolidDot/.test(htmlToShapesCode));
check('丢弃条件：无直接文本、无元素子节点',
  /!directTextContent\(el\)/.test(htmlToShapesCode) && /el\.children\.length === 0/.test(htmlToShapesCode));
check('丢弃空心圆/ 细边框环等背景纹理',
  /props\.strokeWidth <= 2 && rect\.width > 24/.test(htmlToShapesCode));
check('实心小圆点豁免（分页器/状态点是有意义的 UI）',
  /const isSolidDot = isCircle && rect\.width <= 16/.test(htmlToShapesCode));
check('带阴影或背景图的不丢（避免误杀真实内容）',
  /!props\.shadowColor/.test(htmlToShapesCode)
  && /computed\.backgroundImage && computed\.backgroundImage !== 'none'/.test(htmlToShapesCode));
check('装饰元素返回 null 不入 shapes',
  /if \(isDecorative\) \{[\s\S]{0,120}?return null/.test(htmlToShapesCode));
check('输出丢弃数量日志，便于核对',
  /已跳过 \$\{ctx\.stats\.decorative\} 个纯装饰元素/.test(htmlToShapes));

console.log('\n=== 11. 提示词：禁止装饰纹理 + 圆角提示 ===');
check('禁止用空 div 画装饰纹理',
  /不要用空 div 画装饰纹理/.test(visionPrompt));
check('说明同心圆/斜线/光晕属于背景图', /属于背景图的一部分/.test(visionPrompt));
check('卡片顶部色块需跟随卡片圆角',
  /色块自己也要写相同的 border-radius/.test(visionPrompt));

console.log('\n=== 12. 分割线不被渲染成矩形框 ===');
check('新增 isBorderLine 判定',
  /function isBorderLine\(/.test(htmlToShapes));
check('要求恰好只有一条边可见且是上边框',
  /visible.length !== 1 \|\| visible\[0\] !== 'Top'/.test(htmlToShapesCode));
check('要求够宽（>=80px）够扁（<=8px）',
  /rect.width >= 80 && rect.height <= 8/.test(htmlToShapesCode));
check('映射为 divider 而非 rectangle',
  /componentType = 'divider'/.test(htmlToShapesCode));
check('divider 取上边框颜色为线色、高度为边框宽度',
  /props\.fill = topColor \|\| '#E2E8F0'/.test(htmlToShapesCode)
  && /props\.height = topWidth/.test(htmlToShapesCode));

console.log('\n=== 13. 徽标/标签保留背景样式 ===');
check('新增 isBadgeLike 判定',
  /function isBadgeLike\(/.test(htmlToShapes));
check('要求文字短（<=12 字）',
  /text.length > 12/.test(htmlToShapesCode));
check('徽标必须有边框（排除无边框的聊天气泡）',
  /if \(!\(borderWidth > 0\)\) return false/.test(htmlToShapesCode));
check('排除大面积消息块（高度 >32px）',
  /if \(rect\.height > 32\) return false/.test(htmlToShapesCode));
check('要求字号偏小（<=13px，排除正文级气泡文字）',
  /if \(fontSize > 13\) return false/.test(htmlToShapesCode));
check('要求圆角较小（<=8px）',
  /if \(radius > 8\) return false/.test(htmlToShapesCode));
// 【本轮修正】badge 透传字体样式时必须声明 fillIsTextColor:false ——
// 无条件调用会让 applyTextStyle 把徽标底色覆盖成字色，字底同色导致文字消失。
check('badge 透传字体样式时声明 fillIsTextColor:false（防底色被字色覆盖）',
  /componentType = 'badge';[\s\S]{0,300}?applyTextStyle\(props, computed, \{ fillIsTextColor: false \}\)/.test(htmlToShapesCode));
check('映射为 badge 组件而非 text',
  /componentType = 'badge'/.test(htmlToShapesCode));
check('badge 保留 fill / cornerRadius / stroke',
  /props\.cornerRadius = parseFloat\(computed\.borderTopLeftRadius\) \|\| 4/.test(htmlToShapesCode)
  && /props\.stroke = styleProps\.stroke/.test(htmlToShapesCode));

console.log('\n=== 14. AI 工具：支持一步「删旧换新」 ===');
const app = SRC('src/App.jsx');
const appCode = stripComments(app);
check('ChatWindow schema enum 含 replace',
  /enum: \["update", "delete", "add", "batch_update", "replace_all", "replace"\]/.test(chatWindow));
check('schema 明确要求「换成另一种东西」必须用 replace',
  /必须用 replace 一步完成/.test(chatWindow)
  && /不要先 delete 再add|不要先 delete 再 add/.test(chatWindow));
check('App 实现 replace 分支',
  /type === 'replace'/.test(appCode));
check('replace 先删 targetIds 再加 elements',
  /nextShapes = nextShapes\.filter\(shape => !ids\.includes\(shape\.id\)\)[\s\S]{0,200}?nextShapes\.push\(\.\.\.replacements\)/.test(appCode));
check('replace 缺 targetIds 或 elements 时跳过并告警',
  /\[AI\] replace 缺少 targetIds/.test(app)
  && /\[AI\] replace 缺少 elements/.test(app));
check('replace 输出执行日志',
  /\[AI\] replace:/.test(appCode));
check('line/arrow 强制补 stroke 与 strokeWidth（否则完全画不出）',
  /elType === 'line' \|\| elType === 'arrow'/.test(appCode)
  && /if \(props\.strokeWidth === undefined\) props\.strokeWidth = 1/.test(appCode));
check('line 缺 points 时用 width/height 兜底',
  /Array\.isArray\(props\.points\) \|\| props\.points\.length < 4/.test(appCode));

console.log('\n=== 15. 文本专项诊断日志 ===');
check('ctx 携带 verbose 收集数组', /verbose: \[\]/.test(htmlToShapesCode));
check('text 分支记录文字/行数/实测宽高',
  /ctx\.verbose\.push\(\{[\s\S]{0,200}?lines:/.test(htmlToShapesCode));
check('输出「文本明细」日志，便于核对某段文字是否被丢弃',
  /文本明细（文字内容\/实测行数\/实测宽高）/.test(htmlToShapes));

console.log('\n=== 16. <br> 不得被误判为元素子节点（本轮退化根因） ===');
check('收敛为共享函数 hasSubstantiveChildren',
  /function hasSubstantiveChildren\(/.test(htmlToShapesCode));
check('NON_CONTENT_TAGS 集合含 br/wbr/script/style',
  /NON_CONTENT_TAGS = new Set\(\['br', 'wbr', 'script', 'style'\]\)/.test(htmlToShapesCode));
check('span/p/h* 分支使用共享函数（不再裸写 children.length）',
  /const hasElementChild = hasSubstantiveChildren\(el\)/.test(htmlToShapesCode));
check('isTextOnlyElement 使用同一集合',
  /NON_CONTENT_TAGS\.has\(n\.tagName\.toLowerCase\(\)\)/.test(htmlToShapesCode));
check('collectElements 使用同一集合',
  /const hasElementChildren = hasSubstantiveChildren\(el\)/.test(htmlToShapesCode));
check('代码中不存在裸的 children.length > 0 判断',
  !/Array\.from\(el\.children\)\.length > 0/.test(htmlToShapesCode));

console.log('\n=== 17. 完整文档的 <style> 与 body 样式必须生效 ===');
check('提取全部 <style> 内容',
  /doc\.querySelectorAll\('style'\)/.test(htmlToShapesCode));
check('提取 body 行内样式',
  /doc\.body\?\.getAttribute\('style'\)/.test(htmlToShapesCode));
check('style 注入到 document.head 且在 innerHTML 赋值之前',
  /document\.head\.appendChild\(styleEl\)/.test(htmlToShapesCode)
  && /host\.innerHTML = source/.test(htmlToShapesCode));
check('body 样式平移应用到离屏容器',
  /if \(bodyStyle\) host\.setAttribute/.test(htmlToShapesCode));
check('finally 中清理注入的 style，防止污染应用',
  /styleEls\.forEach\(el => el\.remove\(\)\)/.test(htmlToShapesCode));
check('输出 style 与 body 提取日志',
  /提取到 \$\{extractedCss\.length\} 个 <style> 块/.test(htmlToShapes)
  && /提取到 body 行内样式/.test(htmlToShapes));

console.log('\n=== 18. 聊天气泡文字不丢失（本轮退化根因） ===');
check('extractRenderedLines 支持 ownOnly，只取直接子文本',
  /export function extractRenderedLines\(el, ownOnly = true\)/.test(htmlToShapesCode)
  && /if \(node\.nodeType === Node\.TEXT_NODE\) textNodes\.push\(node\)/.test(htmlToShapesCode));
check('ownOnly 时不递归进入元素子节点（避免与子组件重复）',
  /ownOnly 时手动遍历直接子节点，避免 TreeWalker 递归下沉/.test(htmlToShapes));
check('判据改为「有无直接文本」，而非「有无元素子节点」',
  /hasElementChild && !ownText/.test(htmlToShapesCode)
  && /const ownText = directTextContent\(el\)/.test(htmlToShapesCode));
check('applyTextStyle 区分背景色与文字色',
  /const fillIsTextColor = options\.fillIsTextColor !== false/.test(htmlToShapesCode)
  && /const hasBackground = fillIsTextColor && !!props\.fill/.test(htmlToShapesCode)
  && /props\.backgroundFill = props\.fill/.test(htmlToShapesCode));
check('有背景时 fill 改为文字色，不再画成底色',
  /props\.fill = props\.textColor/.test(htmlToShapesCode));
check('badge 语义下整体跳过换算（fill 是底色，绝不动）',
  /if \(!fillIsTextColor\) return;/.test(htmlToShapesCode));
check('Canvas 的 text 分支画背景矩形',
  /activeProps\.backgroundFill && \(/.test(canvasCode));
check('背景矩形支持圆角与描边',
  /cornerRadius=\{activeProps\.cornerRadius \|\| 0\}/.test(canvasCode));
check('badge 渲染补verticalAlign=middle（多行徽标垂直居中）',
  /verticalAlign="middle"/.test(canvasCode));

console.log('\n=== 19. text 组件支持内边距与垂直对齐（组件能力补齐） ===');
const propsPanel = SRC('src/components/PropertiesPanel.jsx');
check('属性面板 text 暴露四向内边距',
  /paddingLeft.*左内边距/.test(propsPanel)
  && /paddingRight.*右内边距/.test(propsPanel)
  && /paddingTop.*上内边距/.test(propsPanel)
  && /paddingBottom.*下内边距/.test(propsPanel));
check('属性面板 text 暴露垂直对齐',
  /verticalAlign.*垂直对齐/.test(propsPanel)
  && /value: 'middle', label: '居中'/.test(propsPanel));
check('属性面板 text 暴露背景色与圆角',
  /backgroundFill.*背景色/.test(propsPanel)
  && /cornerRadius.*圆角/.test(propsPanel));
check('解析层透传四向 padding',
  /props\.paddingLeft = pl/.test(htmlToShapesCode)
  && /props\.paddingRight = pr/.test(htmlToShapesCode)
  && /props\.paddingTop = pt/.test(htmlToShapesCode)
  && /props\.paddingBottom = pb/.test(htmlToShapesCode));
check('带背景时透传圆角与边框',
  /if \(radius > 0\) props\.cornerRadius = radius/.test(htmlToShapesCode)
  && /props\.stroke = toHex\(computed\.borderTopColor\)/.test(htmlToShapesCode));
check('带背景时默认垂直居中',
  /props\.verticalAlign = 'middle'/.test(htmlToShapesCode));
check('带背景时 width/height 用含内边距的 rect',
  /if \(props\.backgroundFill\) \{[\s\S]{0,200}?props\.width = Math\.max\(Math\.round\(rect\.width\)/.test(htmlToShapesCode));
check('带背景时坐标回退到 rect 外框左上角',
  /shapeTextBox\.left = rect\.left/.test(htmlToShapesCode)
  && /shapeTextBox\.top = rect\.top/.test(htmlToShapesCode));
// 【本条断言在本轮被修正】
// 此前写的是「Canvas text 外框 = 内容 + padding」，要求 textWidth = props.width + padL + padR。
// 但解析层对带背景的文本写的是 props.width = rect.width ——
// 浏览器实测的 border-box 宽，padding 已经包含在内。
// Canvas 再加一遍就是把同一份 padding 算两次：气泡右侧凭空多出约 24px 空白，
// 且 Konva 以中心为原点绘制，多出的宽度会向左溢出，把气泡整体推离头像。
// 正确语义与浏览器 box 一致：外框宽 = props.width，文字在框内按 padding 偏移。
check('Canvas text 外框宽直接用 props.width（不重复叠加 padding）',
  /const textWidth = hasBox[\s\S]{0,160}?Math\.max\(activeProps\.width \|\| 0, 8\)/.test(canvasCode)
  && !/const textWidth = hasBox[\s\S]{0,160}?\+ padL \+ padR/.test(canvasCode));
check('Canvas text 外框高不重复叠加上下 padding',
  /const textHeight = Math\.max\([\s\S]{0,120}?fontSize \* lineHeight \* lineCount/.test(canvasCode)
  && !/textHeight = hasBox \? contentHeight \+ padT \+ padB/.test(canvasCode));
check('Canvas text 渲染时按 padding 偏移',
  /x=\{-textWidth \/ 2 \+ padL\}/.test(canvasCode)
  && /y=\{-textHeight \/ 2 \+ padT\}/.test(canvasCode));
// 【本轮修正】<Text> 的 width 额外加 textSlack —— Konva 的截断判据
// (fixedWidth && lineWidth > maxWidth) 不受 wrap 保护，满宽会把长文本末尾悄悄砍掉
// （实测 19px 标题「MiMo-V2.6-Pro」→「MiMo-V2.6-Pr」）。
// 余量只作用于文字盒，背景矩形与 Group 定位仍用未加余量的 textWidth。
check('Canvas text 内容宽高扣除四向 padding，并加防截尾余量 textSlack',
  /width=\{Math\.max\(textWidth - padL - padR \+ textSlack, 1\)\}/.test(canvasCode)
  && /height=\{Math\.max\(textHeight - padT - padB, 1\)\}/.test(canvasCode));
check('防截尾余量覆盖 textWidth 与 width 的完整差值（非按比例）',
  /Math\.max\(activeProps\.textWidth \|\| 0, textWidth\) - textWidth \+ TEXT_WIDTH_SLACK_PX/.test(canvasCode));
check('背景矩形仍用未加余量的 textWidth（视觉框尺寸不变）',
  /<Rect[\s\S]{0,200}?x=\{-textWidth \/ 2\}[\s\S]{0,120}?width=\{textWidth\}/.test(canvasCode));
check('Canvas text 透传 verticalAlign（带背景默认 middle）',
  /verticalAlign=\{activeProps\.verticalAlign \|\| \(hasBox \? 'middle' : 'top'\)\}/.test(canvasCode));
// 包围盒语义与渲染层对齐：props.width 已是含 padding 的外框宽，不再叠加 padding。
// 此前写成 (props.width || 150) + padL + padR，会让选中框比可见气泡宽出约 24px。
check('getShapeBounds 的 text 包围盒与渲染层同语义（不重复叠加 padding）',
  /width = Math\.max\(props\.width \|\| 150, 1\)/.test(canvasCode)
  && /height = Math\.max\(props\.height \|\| 0, fontSize \* lineHeight \* lineCount\)/.test(canvasCode)
  && !/\(props\.width \|\| 150\) \+ padL \+ padR/.test(canvasCode));

console.log('\n=== 20. 图片组件支持外部 URL 与加载失败兜底 ===');
check('ImageShape 同时支持 imageData 与 imageSrc',
  /const src = activeProps\.imageData \|\| activeProps\.imageSrc/.test(canvasCode));
check('设置 crossOrigin，Konva 才能读到像素',
  /img\.crossOrigin = 'anonymous'/.test(canvasCode));
check('有 onerror 兜底并记录失败态',
  /img\.onerror = \(\) => \{[\s\S]{0,120}?setLoadFailed\(true\)/.test(canvasCode));
check('useEffect 依赖 src 而非仅 imageData',
  /\}, \[src\]\);/.test(canvasCode));
check('清理时解绑 onload/onerror，避免竞态',
  /img\.onload = null; img\.onerror = null;/.test(canvasCode));
check('加载失败时给出灰色占位底色',
  /loadFailed \? '#CBD5E1' : '#E2E8F0'/.test(canvasCode));
check('加载失败时画斜线标记，表示这里本该是图',
  /!imageObj && loadFailed && \(/.test(canvasCode));
check('解析层 img 分支透传 border-radius',
  /if \(imgRadius > 0\) props\.cornerRadius = imgRadius/.test(htmlToShapesCode));
check('解析层给图片默认占位底色',
  /if \(!props\.fill\) props\.fill = '#E2E8F0'/.test(htmlToShapesCode));

console.log('\n=== 21. CSS 三角 hack 识别与跳过 ===');
check('新增 isCssTriangleHack 判定',
  /function isCssTriangleHack\(/.test(htmlToShapesCode));
check('要求元素零尺寸',
  /if \(rect\.width > 1 \|\| rect\.height > 1\) return false/.test(htmlToShapesCode));
check('要求恰好三条边有边框',
  /return visible === 3/.test(htmlToShapesCode));
check('在零尺寸过滤之前拦截',
  /if \(isCssTriangleHack\(el, computed\)\) \{[\s\S]{0,60}?return null/.test(htmlToShapesCode)
  && /isCssTriangleHack/.test(htmlToShapesCode.indexOf('零尺寸过滤') > 0
    ? htmlToShapesCode.slice(0, htmlToShapesCode.indexOf('零尺寸过滤'))
    : htmlToShapesCode));
check('提示词禁止三角 hack',
  /禁止用 CSS 三角 hack/.test(visionPrompt));

// ------------------------------------------------------------------ //
// 22. 占位图文字臆造（头像凭空出现 ME / ZT）
//
// 来源：提示词让模型用 placehold.co 占位，模型自行补上 ?text=Me，
// 而 placehold.co 会把该参数渲染成图片上的文字 —— 画布上出现截图里
// 根本不存在的字样。修复分两层：提示词禁令 + 解析层确定性剥离。
// ------------------------------------------------------------------ //
console.log('\n=== 22. 占位图文字臆造不得进入画布 ===');
// 【组件清单已外部化】这两条断言查的是**生成后的完整提示词**，
// 而不是源码正文 —— 规则现在由 componentCatalog 生成，
// 只 grep 源码会漏判（body 里已不再出现这些字面量）。
const fullPrompt = buildHtmlPrompt('vision', { rootWidth: 1080 });
check('提示词要求头像用纯色 div + 首字母而非 img',
  /头像用纯色 div \+ 首字母，不要用 img/.test(fullPrompt));
// 【禁色块】用户已明确选择「纯色 + 首字母」：
// 色块模拟照片质感不可控，且会给头像组件引入 colorTiles 这类额外字段。
check('提示词明令禁止用嵌套 div 拼色块模拟头像',
  /不要拼色块|不要拼嵌套色块/.test(fullPrompt));
check('提示词给出首字母头像的完整写法示例',
  /align-items:center;justify-content:center/.test(fullPrompt));
check('提示词明令禁止 ?text= 参数',
  /不要在 src 里加 \?text=xxx 参数/.test(visionPrompt));
check('文字版提示词同样加了禁令',
  /不要加 \?text= 参数/.test(buildHtmlPrompt('text', { rootWidth: 1080 })));
check('解析层新增 stripPlaceholderTextParam',
  /function stripPlaceholderTextParam\(/.test(htmlToShapesCode));
check('img 分支调用剥离函数',
  /const cleanSrc = stripPlaceholderTextParam\(src\)/.test(htmlToShapesCode)
  && /if \(cleanSrc\) props\.imageSrc = cleanSrc/.test(htmlToShapesCode));
check('剥除逻辑保留其余 query 参数',
  /searchParams\.delete\('text'\)/.test(htmlToShapesCode));
check('无 text 参数的 src 原样放行',
  /if \(!\/\[\?&\]text=\/i\.test\(src\)\) return src;/.test(htmlToShapesCode));

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`);
process.exit(fail > 0 ? 1 : 0);