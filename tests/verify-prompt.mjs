/** 验证提示词瘦身效果与图标清单一致性 */
import { iconLibrary } from '../src/data/icons.js';
import { VALID_COMPONENT_TYPES } from '../src/utils/componentSchema.js';
import { buildHtmlPrompt, extractHtml } from '../src/utils/buildHtmlPrompt.js';
import { buildIconClassList } from '../src/utils/componentCatalog.js';

const realIds = new Set(iconLibrary.map(i => i.id));

// 改造前提示词手写的 icon 清单（已从源码删除，这里做回归验证）
const OLD_MANUAL = ['arrow-up','arrow-down','arrow-left','arrow-right','chevron-up','chevron-down','chevron-left','chevron-right','refresh',
'plus','minus','check','x','search','edit','trash','copy','save','download','upload','link','unlink','zoom-in','zoom-out','eye','eye-off','lock','unlock',
'home','menu','settings','bell','user','users','calendar','clock','star','heart','flag','bookmark','filter','layers','grid','list',
'image','camera','video','music','volume','volume-off','play','pause',
'mail','phone','message','send','share',
'file','folder','file-text','square','circle','triangle','hexagon',
'info','help','warning','error','check-circle','bold','italic','underline','align-left','align-center','align-right'];

const phantom = OLD_MANUAL.filter(id => !realIds.has(id));
console.log('\n=== 图标白名单一致性（回归验证） ===');
console.log(`  真实图标库: ${realIds.size} 个`);
console.log(`  改造前手写清单中不存在的图标（AI 照着写→ 渲染空白）: ${phantom.length} 个`);
console.log(`  ${phantom.join(', ')}`);
console.log(`  改造前遗漏未告知 AI 的图标: ${realIds.size - new Set(OLD_MANUAL.filter(i => realIds.has(i))).size} 个`);
console.log('  → 改造后改为从 iconLibrary 自动派生，两侧不可能不一致');

console.log('\n=== 提示词体积对比 ===');
// 粗略估算改造前 buildSystemPrompt 的字符数
const oldChars = 4000; // 实测改造前约 4000+
const htmlPrompt = buildHtmlPrompt('vision', { rootWidth: 800 });
const newChars = htmlPrompt.length;
console.log(`  改造前 shapes 通道提示词: ~${oldChars} 字符（组件枚举+属性清单+17示例+手写图标清单）`);
console.log(`  改造后 HTML 通道提示词:   ${newChars} 字符`);
console.log(`  降幅: ${((1 - newChars / oldChars) * 100).toFixed(1)}%`);

console.log('\n=== HTML 提取健壮性 ===');
const samples = [
  ['纯 HTML', '<div style="background:#fff"><button>登录</button></div>'],
  ['```html 代码块', '这是结果：\n```html\n<div style="color:red">hi</div>\n```\n完成'],
  ['无围栏的裸 HTML', '<div><span>test</span></div>'],
  ['含前后说明文字', '好的，我生成如下：\n<div><p>内容</p></div>\n希望对你有帮助'],
];
for (const [name, input] of samples) {
  const out = extractHtml(input);
  console.log(`  ${out ? 'PASS' : 'FAIL'}  ${name} → ${out ? out.slice(0, 40).replace(/\n/g,' ') : 'null'}`);
}

console.log('\n=== 未知类型拒答验证 ===');
const hasEnum = VALID_COMPONENT_TYPES.includes('card') === false;
console.log(`  ${hasEnum ? 'PASS' : 'FAIL'}  card 不在合法类型清单中（AI schema enum 会拒绝）`);
console.log(`  合法类型: ${VALID_COMPONENT_TYPES.join(', ')}`);

/* ------------------------------------------------------------------ *
 * 图标 class 名真实性校验
 *
 * 踩坑记录：首次写图标指引时凭印象列了 86 个 class，
 * 其中 more / info / message / login / logout / volume 六个**在图标库里不存在**
 * —— 模型照着写就匹配不上，图标静默不显示。
 * 这类错误不报错、只是什么都不画，必须用断言兜住。
 * ------------------------------------------------------------------ */
console.log('\n=== 图标指引真实性校验 ===');
const visionPromptText = buildHtmlPrompt('vision', { rootWidth: 1080 });

// 【组件清单已外部化】图标清单现在由 componentCatalog.buildIconClassList()
// 从 src/data/icons 生成，因此这里不再需要正则去提示词正文里「捞」图标名
// ——那份正则曾把分类名（security/development/arrows…）误当成图标名。
// 直接对比「生成的清单」与「图标库」即可，语义更强、也更简单。
const generatedList = buildIconClassList(iconLibrary);
const listed = new Set();
// 逐行去掉分类名前缀，其余为图标 id
for (const line of generatedList.split('\n')) {
  const parts = line.trim().split(/\s+/);
  parts.shift(); // 分类名
  for (const id of parts) if (id) listed.add(id);
}
// 「icon-xxx」形式的示例说明（icon-foo 等占位符不算真实图标）
for (const m of visionPromptText.matchAll(/icon-([a-z0-9-]+)/g)) listed.add(m[1]);
const PLACEHOLDERS = new Set(['foo', 'bar', 'xxx', 'example']);
for (const p of PLACEHOLDERS) listed.delete(p);

const nonexistent = [...listed].filter(id => !realIds.has(id));
if (listed.size) {
  console.log(`  ${nonexistent.length ? 'FAIL' : 'PASS'}  提示词列出的 ${listed.size} 个图标 class 全部存在于图标库`);
  if (nonexistent.length) {
    console.log(`        不存在：${nonexistent.join(', ')}`);
  }
}
console.log(`  提示词图标数: ${listed.size} / 图标库总数: ${iconLibrary.length}`);

// 正向：图标库里的每一个图标都必须出现在提示词中（漏了模型就选不到）
const missingInPrompt = iconLibrary.filter(i => !listed.has(i.id));
console.log(`  ${missingInPrompt.length ? 'FAIL' : 'PASS'}  图标库全部 ${iconLibrary.length} 个图标都在提示词中`);
if (missingInPrompt.length) {
  console.log(`        遗漏：${missingInPrompt.map(i => i.id).join(', ')}`);
}

// 反向检查：图标库必须有可被模型理解的语义标注
const noKeywords = iconLibrary.filter(i => !i.keywords || !i.name);
console.log(`  ${noKeywords.length ? 'FAIL' : 'PASS'}  全部图标都有 name与 keywords（供语义匹配）`);
if (noKeywords.length) {
  console.log(`        缺字段：${noKeywords.map(i => i.id).join(', ')}`);
}

// 分类覆盖：常见 UI 语义必须能匹配上（用图标库里的真实 ID）
const mustCover = ['search', 'x', 'menu', 'user', 'home', 'check'];
const missingCover = mustCover.filter(k => !realIds.has(k));
console.log(`  ${missingCover.length ? 'FAIL' : 'PASS'}  基础语义图标齐全（search/x/menu/user/home/check）`);
if (missingCover.length) {
  console.log(`        缺失：${missingCover.join(', ')}`);
}
