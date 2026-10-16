/**
 * HTML 落地通道提示词
 *
 * 改造前 buildSystemPrompt.js 超过 4000 字符，把组件枚举、属性清单、17 个 JSON 示例、
 * 手写icon 白名单全塞进提示词。复杂度全压在 prompt 上，且多处自相矛盾
 * （示例里 text/fontSize 一会儿放顶层、一会儿放 props）。
 *
 * 改造后：让模型只写它最擅长的东西——语义化 HTML + 内联样式。
 * 组件映射、坐标计算、样式提取全部交给确定性的解析层（htmlToShapes.js），
 * 提示词因此可以砍到几百字符，且不需要维护任何组件枚举。
 *
 * 【重要】截图复刻的第一原则：宽度必须由浏览器算，不能由模型猜。
 *
 * 中间版本曾要求「每个元素都写显式的像素 width 和 height，不要依赖 flex」——
 * 这是错的。模型无法真正测量截图，它写的像素值纯属目测：
 * 实测一次4 卡片布局，模型给的卡片总宽只占容器 67%，右侧空出 1/3，
 * 而浏览器 flex:1 的计算结果是 100% 精确。
 *
 * 所以正确做法是：把布局交给 flex/grid，模型只负责写
 * 「哪些元素横向排列、间距多少、谁flex:1 谁固定宽」。
 * 解析层再用 Range API 取浏览器实测的每个字形的精确坐标，
 * 坐标精度由浏览器保证，不由模型保证。
 *
 * ============================================================
 * 组件写法要求已外部化
 * ============================================================
 * 头像写法、图标 class 清单原先硬编码在下方提示词正文里，
 * 带来漂移（新增组件要改两处）、膨胀（规则互相干扰）、不可测三个问题。
 * 现改为由 componentCatalog.js + src/data/icons 运行时生成，
 * 见 buildHtmlPrompt() 里的 ${COMPONENT_HINTS} 替换。
 *
 * 新增组件时：只在 componentCatalog.js 加一条记录，提示词自动同步。
 */
// 【import 必须带扩展名】项目里其他 import 用的是无扩展名风格（Vite 侧能解析），
// 但本文件被 tests/*.mjs 直接 import —— Node ESM 要求显式扩展名，否则报
// ERR_MODULE_NOT_FOUND。这里必须写 .js，不能跟着别处的风格省略。
import { buildComponentHints } from './componentCatalog.js';
import { iconLibrary } from '../data/icons.js';

export const HTML_MODE_PROMPT = `你是界面结构生成器。根据描述输出 HTML。

规则：
1. 只输出 HTML **片段**，不要输出 <!DOCTYPE>、<html>、<head>、<body>、<style> 标签。
2. 根容器 <div style="width:${'${ROOT_WIDTH}'}px">，宽度即目标宽度。
3. 横向排列一律用 flex：父容器 display:flex，子项写 flex:1 均分或 flex:0 0 <像素>。
4. 段落换行用 <br>，不要靠调窄容器宽度来换行。
5. 样式写成行内 style，颜色/字号/圆角/间距用 px。
6. 内容图用 src="https://placehold.co/400x300" 占位（不要加 ?text= 参数，会渲染出多余文字）；
   头像用正方形纯色 <div> + 圆角 + 首字母文字表示，不要用 img，也不要拼嵌套色块。

现在开始输出 HTML：`;

export const HTML_MODE_PROMPT_VISION = `你是界面结构生成器。用户给你一张界面截图，请还原成 HTML。

【铁律】宽度由浏览器 flex 计算，你不要自己填像素宽度。
你无法真正测量截图，猜出来的宽度必然偏小（实测会让整行只占容器 2/3，右侧大片留白）。

规则：
1. 只输出 HTML **片段**，不要输出 <!DOCTYPE>、<html>、<head>、<body>、<style> 标签。
   所有样式写在元素的 style 属性里。（输出完整文档会让样式表失效）
2. 根容器 <div style="width:${'${ROOT_WIDTH}'}px">（即截图的实际像素宽度）。
3. **横向卡片/列表行**：父容器 display:flex; gap:<像素>;每个卡片 flex:1。
   同排元素必须撑满容器宽度，不要写死宽度。
4. **左右分栏（如价格行：标签在左、数值在右）**：
   父容器 display:flex; justify-content:space-between; align-items:center;
   标签和数值各自是<span>，不要合并成一个字符串。
5. **标签与数值之间的对齐**：原图里数值右对齐且字号更大时，
   数值用 <span style="font-size:<像素>;font-weight:600">。
6. 颜色、字号、圆角、间距、边框全部写成行内 style，取截图里的真实值。
7. 文字必须写完整。原图里某段文字在哪一行断开，就在那个位置写 <br>。
   不要靠调窄容器宽度来让文字折行。
8. 不要用 fixed/absolute 定位，除根容器外一律用 flex 自然流。
9. 卡片类容器写 background、border-radius、border、padding；
   卡片内部上下分区用嵌套 div + flex-direction:column。
   卡片顶部色块若需要跟随卡片圆角，色块自己也要写相同的 border-radius。
10. **横向元素总宽不得超过父容器**，否则会溢出到相邻卡片上。
   装饰性圆形/线条用 flex:1 自适应，或 width 用 max-width 限制，不要写死大于卡片宽的像素值。
11. **不要用空 div 画装饰纹理**。截图里的同心圆、斜线、光晕等属于背景图的一部分，
    用一个纯色 div 表示即可，不要为了「像」而去拼 border-radius:50% 的空心圆或细边框环。
12. **禁止用 CSS 三角 hack**：不要写「width:0;height:0 + 三边 border」来画气泡小尖角。
    该形状无法被正确还原，会画成方块反而更糟。气泡就用圆角矩形即可。
13. **真正的内容图（海报、商品图、插画）**才用<img src="https://placehold.co/400x300"
    width="<像素>" height="<像素>"> 占位，并写 border-radius。
    **绝对不要在 src 里加 ?text=xxx 参数** —— placehold.co 会把该参数渲染成图片上的文字，
    凭空生成截图里不存在的"ME"、"ZT"、"头像"等字样，属于错误还原。

14. **以下组件有专门的写法要求，必须严格遵守**：
\${COMPONENT_HINTS}

现在开始输出 HTML：`;

export const HTML_MODE_PROMPT_EDIT = `你是界面编辑器。下面是当前页面的 HTML 结构，每个元素前有注释标注它的 id。

要求：
1. 只改动用户指定的部分，其余元素保持原样。
2. 修改时保留该元素的注释 id，方便后续定位。
3. 只输出修改后的完整 HTML，不要解释。

当前页面结构：
`;

/**
 * 构建 HTML 模式提示词
 * @param {'vision'|'text'|'edit'} mode
 * @param {object} opts
 * @param {number} opts.rootWidth 容器宽度（应对齐截图真实像素宽度）
 */
export function buildHtmlPrompt(mode = 'text', opts = {}) {
  const { rootWidth = 1080 } = opts;
  if (mode === 'edit') return HTML_MODE_PROMPT_EDIT;
  let base = mode === 'vision' ? HTML_MODE_PROMPT_VISION : HTML_MODE_PROMPT;
  base = base.replace('${ROOT_WIDTH}', String(rootWidth));
  // 【组件片段来自外部清单】头像写法、图标 class 清单都不是手写在这里，
  // 而是由 componentCatalog.js + src/data/icons 在运行时生成。
  // 这样新增组件/图标只改配置，提示词正文永远不会再和真实能力脱节。
  base = base.replace('${COMPONENT_HINTS}', buildComponentHints(iconLibrary));
  return base;
}

/**
 * 从模型回复中提取 HTML 文本。
 * 模型可能输出纯 HTML、```html 代码块、或夹杂前后说明文字，需要稳健提取。
 */
export function extractHtml(content) {
  if (!content) return null;

  // 优先取代码块
  const fence = content.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim()) return fence[1].trim();

  // 取第一个 < 到最后一个 > 之间的内容
  const start = content.indexOf('<');
  const end = content.lastIndexOf('>');
  if (start !== -1 && end > start) {
    const segment = content.slice(start, end + 1);
    // 必须看起来像 HTML 才返回，避免抓到纯文本里的尖括号
    if (/<\/?(div|span|button|input|img|h1|h2|h3|p|header|nav|section|footer|ul|li|hr|i|a|svg|textarea|label)\b/i.test(segment)) {
      return segment;
    }
  }

  return null;
}