/**
 * 组件清单外部化自检
 *
 * 背景：组件写法原先硬编码在 buildHtmlPrompt.js 正文里，导致三件事：
 *   1. 图标 class 名是**手写**的 84 个 —— 其中 6 个根本不存在
 *      （more / info / message / login / logout / volume），模型照着写就是无效图标
 *   2. 头像写法散落在正文第 12 条，与解析层判据各说各话
 *   3. 新增组件要改两处，漏改就漂移
 *
 * 现在这些都收进 componentCatalog.js + 由 src/data/icons 生成，
 * 本测试确保「外部化之后不会退化回去」。
 */

import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { console.log(`  PASS  ${name}`); pass++; }
  else { console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); fail++; }
};

const catalogCode = readFileSync(new URL('../src/utils/componentCatalog.js', import.meta.url), 'utf8');
const promptCode = readFileSync(new URL('../src/utils/buildHtmlPrompt.js', import.meta.url), 'utf8');
const iconsCode = readFileSync(new URL('../src/data/icons.js', import.meta.url), 'utf8');
const parserCode = readFileSync(new URL('../src/utils/htmlToShapes.js', import.meta.url), 'utf8');

console.log('\n[1] 提示词不再手写组件清单');
// import 必须带 .js 扩展名：buildHtmlPrompt.js 被 tests/*.mjs 直接 import，
// Node ESM 不像Vite 那样容错省略扩展名（踩过一次 ERR_MODULE_NOT_FOUND）。
check('buildHtmlPrompt 引用组件清单生成器',
  /import \{ buildComponentHints \} from '\.\/componentCatalog\.js'/.test(promptCode)
  && /buildComponentHints\(iconLibrary\)/.test(promptCode));
check('图标库被导入（不再是硬编码白名单）',
  /import \{ iconLibrary \} from '\.\.\/data\/icons\.js'/.test(promptCode));
check('提示词正文用占位符而非手写规则',
  promptCode.includes('${COMPONENT_HINTS}'),
  '占位符缺失 → 组件写法又退回手写');
check('提示词正文不再残留手写图标清单',
  !/chevron-left\s+chevron-up\s+chevron-right/.test(promptCode)
  && !/^\s+navigation\s+menu\s+arrow-left/m.test(promptCode),
  '检测到手写的图标分类清单');
check('提示词正文不再残留头像格式示例',
  !/border-radius:6px;background:#7fb0e0/.test(promptCode),
  '头像写法应来自 componentCatalog');

console.log('\n[2] 组件清单按识别方式分类');
check('定义了 DETECTION_MODE 三种模式',
  /IMPLICIT:\s*'implicit'/.test(catalogCode)
  && /EXPLICIT:\s*'explicit'/.test(catalogCode)
  && /CONFIG:\s*'config'/.test(catalogCode));
check('隐式组件刻意不写 htmlHint（墨刀做法）',
  /id:\s*'card'[\s\S]{0,220}htmlHint:\s*''/.test(catalogCode)
  && /id:\s*'button'[\s\S]{0,220}htmlHint:\s*''/.test(catalogCode),
  '隐式组件不应出现在提示词里 —— 教 AI「什么算卡片」反而束缚它');
check('显式组件有 htmlHint',
  /id:\s*'icon'[\s\S]{0,120}htmlHint:\s*`/.test(catalogCode)
  && /id:\s*'avatar'[\s\S]{0,120}htmlHint:\s*`/.test(catalogCode));
check('每个组件都写了 verify 自检要点',
  (catalogCode.match(/verify:/g) || []).length >= 8,
  'verify 是「提示词说的」与「解析层做的」的连接点');

console.log('\n[3] 头像写法与解析层判据对齐');
// 提示词说「24~72px 正方形 + 圆角 + 首字母」，解析层判据必须一致
const hint = catalogCode.slice(catalogCode.indexOf("id: 'avatar'"));
check('提示词写的尺寸区间与解析层判据一致',
  /24~72px/.test(hint) && /w < 24 \|\| h < 24 \|\| w > 72 \|\| h > 72/.test(parserCode),
  '提示词与 isAvatarLike 的尺寸区间不一致');
check('提示词禁色块，解析层也终止递归',
  /不要拼色块|不要拼嵌套色块/.test(hint)
  && /componentType === 'avatar'\) return;/.test(parserCode));
check('提示词要求首字母，解析层确实提取到 props.text',
  /首字母/.test(hint)
  && /props\.text = initials/.test(parserCode),
  '提示词教了首字母但解析层不提取 → 头像无字');

console.log('\n[4] 图标清单由图标库生成（防手写漂移）');
check('buildIconClassList 按 category 分组生成',
  /byCategory/.test(catalogCode) && /icon\.category/.test(catalogCode));
check('生成逻辑不含任何硬编码图标名',
  !/navigation\s+menu\s+arrow-left/.test(catalogCode),
  'catalog 里出现硬编码图标名 → 又要手工维护了');
check('图标库仍是唯一事实来源',
  /export const iconLibrary = \[/.test(iconsCode));

console.log(`\n组件清单外部化自检：${pass} 通过 / ${fail} 失败\n`);
process.exit(fail ? 1 : 0);