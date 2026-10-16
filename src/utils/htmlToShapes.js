/**
 * 文字宽度测量器（离屏 canvas 实测）
 *
 * 为什么必须实测：Canvas 画布是固定宽度的，没有自动换行能力——
 * Konva 的 Text 组件一旦 width 偏小就会自己折行，导致「¥30 / MTok」
 * 被挤成「¥6O / MTok」、「MiMo-V2.6-Pro-UltraSpeed」被截断。
 *
 * 改造前用 length * fontSize * 0.6 估算，中英混排严重偏小
 * （中文按0.6 算而实际接近 1.0，英文字符又普遍窄于 0.6），必然溢出。
 * 这里直接用浏览器 measureText 拿到真实像素宽度，与浏览器渲染完全一致。
 */
const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
let measureCtx = null;

/**
 * 应用 CSS text-transform。
 *
 * Konva Text 没有 text-transform 属性，必须在解析层就把文本转好。
 * 更关键的是：extractRenderedLines 的文本取自 node.textContent（原始大小写），
 * 而行盒 rect 是浏览器转换后的坐标 —— 不转换就会出现
 * 「宽度按大写量、文本却是小写」的尺寸错配。
 */
function applyTextTransform(text, textTransform) {
  if (!text) return text;
  switch (textTransform) {
    case 'uppercase': return text.toUpperCase();
    case 'lowercase': return text.toLowerCase();
    // capitalize：每个词首字母大写。用 Unicode 属性类避开正则状态问题
    case 'capitalize': return text.replace(/\b\p{L}/gu, c => c.toUpperCase());
    default: return text;
  }
}

/**
 * 量一段文本在指定字体下的实际像素宽度。
 * letterSpacing：CSS 字间距不参与 canvas 的 measureText，需按「字符间隔数」手工补。
 * n 个字符之间只有 n-1 个间隔，所以是 (n-1) × ls 而不是 n × ls。
 */
export function measureTextWidth(text, fontSize = 16, fontWeight = 400, fontFamily = '', letterSpacing = 0) {
  if (!text) return 0;
  if (!measureCtx && measureCanvas) {
    measureCtx = measureCanvas.getContext('2d');
  }
  const ls = Number(letterSpacing) || 0;
  const spacing = ls * Math.max(0, Array.from(text).length - 1);
  if (!measureCtx) {
    // 退化估算（SSR 或 canvas 不可用）：中文按 1.0、英文按 0.58 折中
    let units = 0;
    for (const ch of text) {
      units += /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1.0 : 0.58;
    }
    return units * fontSize + spacing;
  }
  measureCtx.font = `${fontWeight === '700' || fontWeight === 'bold' ? 700 : fontWeight || 400} ${fontSize}px ${fontFamily || 'Inter, sans-serif'}`;
  return measureCtx.measureText(text).width + spacing;
}

/**
 * 提取浏览器**实际渲染出来的每一行**文本及其精确坐标。
 *
 * 为什么必须这样做（这是还原度的关键）：
 * Konva的 Text 没有自动换行能力，只能靠 width 折行，且折行规则与浏览器不同。
 * 于是无论width 怎么设都会错：
 *   - width = 浏览器量到的 rect.width（换行后单行宽度）→ Konva 认为放不下，按自己的规则再折一次
 *   - width = 单行完整文本的实测宽度 → 文字溢出容器，被下一张卡片的背景矩形盖住，
 *     表现为「MiMo-V2.6-Pro-UltraSpeed」变成「MiMo-V2.6-Pro-UltraSp」
 *
 * 唯一可靠的做法是**直接问浏览器每行画在哪**：
 * 用 Range API 取每个字符的实际矩形，按 top 分组还原成行。
 * 这样换行决策100% 来自浏览器，与截图一致；Konva 只需按 \n 画单行，永不折行、永不溢出。
 */
/**
 * 提取浏览器**实际渲染出来的每一行**文本及其精确坐标。
 /**
 * 归一化行文本里的缩进空白。
 *
 *【要解决的 bug】模型输出的 HTML 带缩进排版：
 *     <p>
 *       MiMo 迄今为止最强大的旗舰推理模型。
 *     </p>
 * textContent 里那段「\n      」混进了行首，
 * 于是 Konva 画出的首行是"      MiMo 迄今为止..."，
 * 缩进空格被算进文本宽度 → 首行被顶偏，表现为「换行错乱」。
 *
 * 【为什么只清行首/行尾，不折叠中间的连续空格】
 * 中间的空格是有语义的，价格行就靠它排版：
 *     ￥ 0.025/ MTok
 *     输入（缓存命中）    ￥ 3 / MTok
 * 全局/\s+/g → ' ' 会把「￥0.025」压成「￥ 0.025」、
 * 让本该有间隔的价格和标签挤在一起，比原问题更糟。
 * 所以只处理两端，保留中间。
 */
function collapseBlank(s) {
  // 【踩坑】不要把全角空格/不换行空格直接写进正则字面量：
  //   1) eslint 的 no-irregular-whitespace 会直接报错；
  //   2) 更危险的是编辑器/工具链会把它静默转成普通空格，
  //      代码看起来一样、行为却变了，非常难查（本次就踩到了 \xa0）。
  // 所以统一用 Unicode 转义写法：\s 覆盖常规空白，
  // 再显式补上 NBSP / 全角空格 / 各类 thin space。
  const BLANK = '^[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+'
    + '|[\\s\\u00A0\\u1680\\u2000-\\u200B\\u202F\\u205F\\u3000]+$';
  return String(s == null ? '' : s).replace(new RegExp(BLANK, 'g'), '');
}

/**
 * 用 Range API 逐字符量出浏览器实际渲染的每一行。
 *
 * 为什么必须这样做（这是还原度的关键）：
 * Konva的 Text 没有自动换行能力，只能靠 width 折行，且折行规则与浏览器不同。
 * 于是无论width 怎么设都会错：
 *   - width = 浏览器量到的 rect.width（换行后单行宽度）→ Konva 认为放不下，按自己的规则再折一次
 *   - width = 单行完整文本的实测宽度 → 文字溢出容器，被下一张卡片的背景矩形盖住，
 *     表现为「MiMo-V2.6-Pro-UltraSpeed」变成「MiMo-V2.6-Pro-UltraSp」
 *
 * 唯一可靠的做法是**直接问浏览器每行画在哪**：
 * 用 Range API 取每个字符的实际矩形，按 top 分组还原成行。
 * 这样换行决策100% 来自浏览器，与截图一致；Konva 只需按 \n 画单行，永不折行、永不溢出。
 *
 * 【只取直接子文本节点】ownOnly=true 时不递归进入元素子节点。
 * 否则像聊天气泡 <div>文字<div>三角</div></div> 会把后代文本也纳入，
 * 与子节点自己成组件重复（与 textContent 递归拼接是同一类错误）。
 */
export function extractRenderedLines(el, ownOnly = true) {
  const lines = [];
  if (!el || typeof document === 'undefined') return lines;

  // ownOnly 时手动遍历直接子节点，避免 TreeWalker 递归下沉
  const textNodes = [];
  if (ownOnly) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) textNodes.push(node);
    }
  } else {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);
  }

  const range = document.createRange();
  let any = false;

  for (const node of textNodes) {
    const text = node.textContent;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\n' || ch === '\r' || ch === '\t') continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      // 空白字符可能拿到零宽矩形，落在已有行里也算（保留原始空格由上层处理）
      if (rect.top === 0 && rect.left === 0 && rect.width === 0) continue;
      any = true;

      // 按 top 归行（同一行内字符 top 一致，跨行差值远大于 2px 容差）
      let line = null;
      for (const l of lines) {
        if (Math.abs(l.top - rect.top) <= 2) { line = l; break; }
      }
      if (!line) {
        line = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, chars: [] };
        lines.push(line);
      }
      line.chars.push(ch);
      if (rect.left < line.left) line.left = rect.left;
      if (rect.right > line.right) line.right = rect.right;
      if (rect.bottom > line.bottom) line.bottom = rect.bottom;
    }
  }

  if (!any) {
    range.detach?.();
    return [];
  }

  lines.sort((a, b) => a.top - b.top);
  range.detach?.();

  // 合并同一行的字符（此前是按 top 找行，但字符顺序可能交错）
  const merged = [];
  for (const l of lines) {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.top - l.top) <= 2) {
      prev.text += l.chars.join('');
      prev.left = Math.min(prev.left, l.left);
      prev.right = Math.max(prev.right, l.right);
      prev.bottom = Math.max(prev.bottom, l.bottom);
    } else {
      merged.push({ ...l, text: l.chars.join('') });
    }
  }
  return merged;
}

/**
 * 解析 HTML → 原生组件 确定性解析层
 *
 * 改造动机（对标墨刀的核心架构）
 * 墨刀官方帮助中心的生成原理是：「AI 进行识别…转换为遵循提示词意图的 **html 页面**」，
 * 再由「AI 智能识别 HTML 结构，将其转化为墨刀的容器、按钮、文本等可编辑组件」。
 * 即两段式：LLM → HTML → 组件映射 → 原生元件。
 *
 * 改造前 mimo 是单段式：LLM 直接吐 Konva 组件 JSON。
 * 问题在于把「看图理解布局 + 算坐标 + 选组件类型 + 输出严格JSON」四件事压进一次调用，
 * 任一环节出错就整页失败；且模型幻觉出的未知 type 会在 Canvas 的 switch default 分支
 * 渲染成 null，元素凭空消失且无任何报错。
 *
 * 本模块是第二段——完全确定性，不依赖模型：
 *   1. DOMParser 解析 HTML
 *   2. 放入离屏容器真实渲染（浏览器盒模型会算出精确的 x/y/宽高）
 *   3. getComputedStyle 读取真实视觉样式
 *   4. 标签 → 本项目组件类型映射
 *   5. 输出与现有 shapes 数据结构完全一致的对象，Canvas 无需任何改动
 *
 * 核心价值：坐标来自浏览器而不是模型猜测，保真度是量级提升。
 */

import { iconLibrary } from '../data/icons';
import { resolveComponentType } from './componentSchema';

/** 视觉样式属性白名单，避免把 computedStyle 的上百个字段塞进 props */
const STYLE_FIELDS = [
  'color', 'backgroundColor', 'backgroundImage',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomRightRadius', 'borderBottomLeftRadius',
  'boxShadow', 'opacity', 'padding', 'margin',
];

/** 内联样式字符串 → 对象。CSSOM 的 style 属性在现代浏览器上直接可枚举 */
function inlineStyleToObject(el) {
  const obj = {};
  if (!el || !el.style) return obj;
  for (let i = 0; i < el.style.length; i++) {
    const key = el.style[i];
    obj[key] = el.style.getPropertyValue(key);
  }
  return obj;
}

/** 颜色归一化：rgb(...) / transparent / named color → #RRGGBB，取不到返回 null */
function toHex(value) {
  if (!value) return null;
  const v = String(value).trim();

  if (v === 'transparent') return null;

  if (v.startsWith('#')) {
    if (v.length === 4) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3].toUpperCase();
    return v.toUpperCase();
  }

  const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').map(s => s.trim());
    const [r, g, b, a] = parts;
    // 全透明视为无背景色，避免画出多余矩形
    if (a !== undefined && parseFloat(a) === 0) return null;
    const hex = [r, g, b]
      .map(n => Math.max(0, Math.min(255, Math.round(parseFloat(n) || 0))).toString(16).padStart(2, '0'))
      .join('');
    return '#' + hex.toUpperCase();
  }

  // 颜色关键字（white / rebeccapurple / …）。
  // 实测模型会在渐变色标里写英文颜色名，不识别会让整条渐变解析失败。
  // 用浏览器兜底：把颜色名赋给一个元素的 color，getComputedStyle 会回 rgb()。
  const named = resolveColorKeyword(v);
  if (named) return named;
  return null;
}

/** rgba() 归一化：统一小数/百分比写法，交给 Konva 原生 rgba 串 */
function normalizeRgba(value) {
  const v = String(value).trim().replace(/\s+/g, '');
  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(',').map(s => s.trim());
  if (parts.length < 3) return null;
  const [r, g, b] = parts.slice(0, 3).map(n => Math.max(0, Math.min(255, Math.round(parseFloat(n) || 0))));
  const aRaw = parts[3];
  let a = 1;
  if (aRaw !== undefined) {
    a = aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw);
    if (!Number.isFinite(a)) a = 1;
    a = Math.max(0, Math.min(1, a));
  }
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

/** 用浏览器把颜色关键字转成 hex（懒初始化，SSR/无 DOM 时安全返回 null） */
let colorKeywordProbe = null;
function resolveColorKeyword(name) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  if (!colorKeywordProbe) {
    colorKeywordProbe = document.createElement('span');
    colorKeywordProbe.style.display = 'none';
  }
  colorKeywordProbe.style.color = '';
  colorKeywordProbe.style.color = name;
  // 浏览器接受不了会保留空串，此时说明不是合法颜色名
  const computed = window.getComputedStyle(colorKeywordProbe).color;
  if (!computed) return null;
  return toHex(computed);
}

/**
 * 剥掉占位图 URL 上的 `?text=xxx` 参数。
 *
 * 来源：提示词让模型用 placehold.co 占位，而模型常自作主张补上
 * `?text=Me` / `?text=ZT`。placehold.co 会把该参数**渲染成图片上的文字**，
 * 于是画布上凭空出现截图里根本不存在的 "ME"、"ZT" 头像——
 * 纯视觉臆造，且依赖外部网络（离线打开必然失效）。
 *
 * 这里直接删掉整个 query，让它退回无字占位图。
 * 提示词里已同时加了禁令，此处是第二道保险：
 * 提示词会因模型版本不同而失效，确定性层不该依赖模型听话。
 */
function stripPlaceholderTextParam(src) {
  if (!src) return '';
  // 只处理带 text 参数的占位图 URL，其他 src 原样放行
  if (!/[?&]text=/i.test(src)) return src;
  try {
    const u = new URL(src, 'https://placeholder.invalid');
    u.searchParams.delete('text');
    // 删完 query 后若退化为纯占位图域名，且没有任何真实图片语义，返回空串让上层走兜底底色
    return u.pathname === '/' ? '' : (u.origin === 'https://placeholder.invalid' ? src.replace(/[?&]text=[^&]*/i, '').replace(/[?&]$/, '') : u.toString());
  } catch {
    return src.replace(/[?&]text=[^&]*/i, '').replace(/[?&]$/, '');
  }
}

/** 四边边框汇总成 Konva 需要的单值 stroke / strokeWidth（四边不一致时取上边框） */
function resolveBorder(inline, computed) {
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const widths = sides.map(s => parseFloat(computed[`border${s}Width`]) || 0);
  const colors = sides.map(s => computed[`border${s}Color`]);
  const styles = sides.map(s => computed[`border${s}Style`]);

  const visible = sides.filter((_, i) => widths[i] > 0 && styles[i] !== 'none' && styles[i] !== 'hidden');
  if (!visible.length) return { stroke: undefined, strokeWidth: undefined };

  const maxWidth = Math.max(...widths);
  // 圆角：四边一致时统一用一个 cornerRadius；不一致时取左上角近似
  const radii = sides.map(s => parseFloat(computed[`border${s}LeftRadius`.replace('Left', 'Left')]) || 0);

  return {
    stroke: toHex(colors[0]),
    strokeWidth: maxWidth,
    cornerRadius: radii[0] || undefined,
    hasUniformBorder: new Set(visible).size === 1,
  };
}

/**
 * 离屏取样容器的标记属性。
 *
 * 【背景】离屏 host 为了拿到真实布局，被放在
 *   position:absolute; left:-10000px
 * 这个偏移是**我们施加的取样技巧**，不是模型的裁剪意图。
 *
 * 【真根因（这个 bug 排查了三轮，见 tests/verify-offscreen-clip.mjs 顶部记录）】
 *   裁剪检测的祖先遍历必须在 host 处**终止**，而不是「跳过 host 继续向上」。
 *
 *   因为 host 挂在 document.body 下，父链是 host → body → html，
 *   而 src/index.css 的 `body { overflow: hidden }` 会在 body 处命中：
 *       body.getBoundingClientRect().left ≈ 0
 *       元素 rect.left ≈ -9956
 *       → overLeft = max(0, 0 - (-9956)) = 9956px
 *   每个 shape 因此被写入 props.clipLeft ≈ 9956，
 *   Canvas 的 makeClipFunc 拿它裁剪 → **整张卡片（含白底、边框）被裁得完全不可见**，
 *   只剩卡片内部的米色色块和文字。典型症状正是用户报的「卡片白色底没有了」。
 *
 *   → continue（跳过 host 继续向上）会走到 body，照旧算出 9956，**完全无效**。
 *   → break（遍历在 host 处终止）才有效。
 *
 * 【踩坑一：不要在诊断日志里看到异常值就直接当根因】
 *   第一轮日志里 clip 是 9956，我据此断定「裁剪源是 host 本身」，
 *   写完修复、测试过、build 过 → 用户反馈现象一点没变。
 *   「日志里有异常值」不等于「那是根因」。修完必须追问：现象消失了吗？
 *
 * 【踩坑二：声明位置】本常量必须在 inheritClipRadius / detectOverflowClip
 *   **之前**完成初始化，否则这两个函数运行时它还处于 const 的暂时性死区
 *   （TDZ），访问会抛 ReferenceError。函数声明会提升，但 const 不会。
 *   所以放在这两个函数上方，而不是「用得到的地方」。
 */
const OFFSCREEN_HOST_FLAG = 'data-mimo-offscreen-host';

/** 判断节点是否为离屏取样容器（是则不参与裁剪判定）。 */
function isOffscreenHost(node) {
  return !!(node && node.getAttribute && node.getAttribute(OFFSCREEN_HOST_FLAG) !== null);
}

/**
 * 处理祖先 `overflow:hidden` + `border-radius` 对子元素的裁剪。
 *
 * 为什么需要：CSS 里 `overflow:hidden` + `border-radius` 会把子元素裁进圆角，
 * 典型如「白卡片 border-radius:12px; overflow:hidden」包着「顶部棕色矩形」。
 * 浏览器里棕色矩形的顶部两角自动被裁成圆角，
 * 但 Konva 每个 Rect 独立绘制、没有裁剪概念 → 直角矩形压在圆角卡片上，非常刺眼。
 *
 * 只有当子元素**确实贴住祖先某条边**时才继承圆角；
 * 贴上/下边就给圆角，贴满整高也给圆角，内部元素不继承（否则中间层会被误圆角）。
 */
function inheritClipRadius(el, rect) {
  let node = el.parentElement;
  let depth = 0;
  while (node && depth < 6) {
    // 【必须 break，不能 continue】见 OFFSCREEN_HOST_FLAG 注释。
    // host 之上的一切（body / html / #root）都是我们自己的应用环境，
    // 不是模型 DOM：body 有 overflow:hidden，会在这里命中并把
    // 「元素 left≈-9956」与「body left≈0」之差误算成 overLeft≈9956 的裁剪量。
    if (isOffscreenHost(node)) break;
    const cs = window.getComputedStyle(node);
    const overflow = `${cs.overflowX || ''} ${cs.overflowY || ''}`.toLowerCase();
    const r = parseFloat(cs.borderTopLeftRadius) || 0;
    if ((overflow.includes('hidden') || overflow.includes('clip')) && r > 0) {
      const pr = node.getBoundingClientRect();
      const EPS = 1.5;
      const touchesTop = Math.abs(rect.top - pr.top) <= EPS;
      const touchesBottom = Math.abs(rect.bottom - pr.bottom) <= EPS;
      if (touchesTop || touchesBottom) {
        // 不超过祖先圆角上限，避免小元素被过度圆角成胶囊
        return Math.min(r, Math.min(rect.width, rect.height) / 2);
      }
      return 0;
    }
    node = node.parentElement;
    depth++;
  }
  return 0;
}

/**
 * 检测元素是否真的被祖先 overflow:hidden 裁掉了内容。
 *
 * 背景：浏览器会对 overflow:hidden 祖先做边界裁剪，Konva 没有这个概念 ——
 * 于是「列表只显示 3 条」「卡片内固定高度带滚动条」这类结构，
 * Konva 会把第4 条也画出来，直接穿透容器。
 *
 * 判定方式（保守，避免给不需要裁剪的元素强加 clip 拖慢渲染）：
 *   祖先带 overflow:hidden/clip，且元素的实测边界**超出**祖先可视区。
 * 仅圆角重叠不算超出—— 那种情况浏览器也不会裁掉内容。
 *
 * 返回 { clipLeft, clipTop, clipRight, clipBottom }（相对元素自身的偏移，均 ≥ 0）
 * 或 null 表示无需裁剪。
 */
function detectOverflowClip(el, rect) {
  let node = el.parentElement;
  let depth = 0;
  while (node && depth < 8) {
    // 【必须 break，不能 continue】见 OFFSCREEN_HOST_FLAG 注释。
    // 曾经的写法是「跳过 host 继续向上」，结果在 body 处命中 overflow:hidden，
    // 把离屏偏移当成裁剪量 —— 白底卡片就是这样被裁没的。
    if (isOffscreenHost(node)) break;
    const cs = window.getComputedStyle(node);
    const overflow = `${cs.overflowX || ''} ${cs.overflowY || ''}`.toLowerCase();
    const clips = overflow.includes('hidden') || overflow.includes('clip')
      || overflow.includes('auto') || overflow.includes('scroll');
    if (clips) {
      const pr = node.getBoundingClientRect();
      const EPS = 1.0;
      // 超出量：正数表示被裁掉的部分
      const overLeft = Math.max(0, pr.left - rect.left);
      const overTop = Math.max(0, pr.top - rect.top);
      const overRight = Math.max(0, rect.right - pr.right);
      const overBottom = Math.max(0, rect.bottom - pr.bottom);
      // 四边都未超出 → 浏览器不会裁掉这个元素，无需 clip
      if (overLeft <= EPS && overTop <= EPS && overRight <= EPS && overBottom <= EPS) {
        return null;
      }
      // 【诊断】打印到底是谁在裁剪。若裁剪源的 left 是个大负数（≈ -10000），
      // 说明它是离屏 host —— 那isOffscreenHost 没拦住，需要查标记是否生效。
      console.log('[裁剪命中]', {
        被裁元素: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        裁剪源: node.tagName + (node.className ? '.' + String(node.className).slice(0, 20) : ''),
        是离屏host: isOffscreenHost(node),
        裁剪源rect: `left=${Math.round(pr.left)} top=${Math.round(pr.top)}`,
        被裁rect: `left=${Math.round(rect.left)} top=${Math.round(rect.top)}`,
        超出量: `${Math.round(overLeft)},${Math.round(overTop)},${Math.round(overRight)},${Math.round(overBottom)}`,
      });
      return { overLeft, overTop, overRight, overBottom };
    }
    node = node.parentElement;
    depth++;
  }
  return null;
}

/**
 * 解析 CSS linear-gradient，转成 Konva 的渐变参数。
 *
 * 背景：模型常用渐变画头像（实测 `linear-gradient(160deg,#e8d5c4 0%,#c9a88c 40%,...)`），
 * 而此前解析层对background-image 只写hasBackgroundImage、不写任何填充——
 * 头像因此变成完全透明，什么都看不见。
 *
 * Konva 原生支持：fillLinearGradientStartPoint / EndPoint / ColorStops，
 * 所以这不是「从零建设」，只是把 CSS 语法翻成 Konva 语法。
 *
 * 支持：任意角度 + 任意个色标（含百分比与缺省百分比）。
 * 不支持：repeating-linear-gradient、radial-gradient（径向另需一套参数，先不做）。
 *
 * @returns {{sx:number,sy:number,ex:number,ey:number,colorStops:Array}|null}
 */
export function parseLinearGradient(cssGradient) {
  const str = String(cssGradient || '').trim();
  const m = str.match(/^linear-gradient\s*\(([\s\S]*)\)$/i);
  if (!m) return null;
  const body = m[1];

  // 拆出参数：按顶层逗号切分（colorStops 内部有逗号，不能直接切）
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  if (parts.length < 2) return null;

  // 第一个参数若是方向（角度或 to X），单独取出
  let angleDeg = 180; // CSS 默认：to bottom
  let startIdx = 0;
  const first = parts[0];
  const dirWord = first.match(/^to\s+(left|right|top|bottom)(?:\s+(left|right|top|bottom))?$/i);
  const angleNum = first.match(/^(-?[\d.]+)\s*(deg|turn|rad)?$/i);
  if (dirWord) {
    startIdx = 1;
    // 单值（to right）与双值（to top right）都要处理：
    // 此前用 dirMatch[2] !== undefined 判断，单值时 [2] 是 undefined 会漏掉整个分支。
    const kv = (dirWord[1] + (dirWord[2] ? ' ' + dirWord[2] : '')).toLowerCase();
    const table = {
      top: 0, right: 90, bottom: 180, left: 270,
      'top left': 315, 'top right': 45,
      'right top': 45, 'right bottom': 135,
      'bottom right': 135, 'bottom left': 225,
      'left bottom': 225, 'left top': 315,
    };
    angleDeg = table[kv] ?? 180;
  } else if (angleNum) {
    startIdx = 1;
    const num = parseFloat(angleNum[1]);
    const unit = (angleNum[2] || '').toLowerCase();
    angleDeg = unit === 'turn' ? num * 360
      : unit === 'rad' ? (num * 180) / Math.PI
        : num;
  }

  // 解析色标
  const colorStops = [];
  for (const p of parts.slice(startIdx)) {
    const cs = p.match(/^(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*([\d.]+)?%?$/);
    if (!cs) continue;
    // 注意：这里不能用 toHex —— 它对 alpha=0 返回 null（背景色的语义是「透明=没颜色」），
    // 但渐变色标里的 transparent 是**有意义的一端**：
    // `linear-gradient(rgba(0,0,0,0),#fff)` 这种「透明渐隐」是极常见写法，
    // 若整条丢弃，退化成 hasBackgroundImage，元素直接画不出来（头像曾因此完全消失）。
    // 所以渐变里保留 rgba 串交给 Konva，它原生支持半透明色标。
    const color = cs[1].startsWith('rgb') ? normalizeRgba(cs[1]) : toHex(cs[1]);
    if (!color) continue;
    const pos = cs[2] !== undefined ? parseFloat(cs[2]) : null;
    colorStops.push(pos === null ? null : [Math.max(0, Math.min(1, pos / 100)), color]);
  }
  if (colorStops.length < 2) return null;

  // 缺省位置按 CSS 规则补齐：
  //   · 第一个色标若无位置 → 0%
  //   · 最后一个色标若无位置 → 100%
  //   · 中间色标若无位置 → 取前后已知位置的中间值
  // 注意不能简单等分—— 等分只在「所有色标都缺省」时才成立。
  const known = colorStops.map(c => c !== null);
  if (!known[0]) {
    colorStops[0] = [0, colorStops.find((c, i) => known[i])?.[1] ?? colorStops[0]?.[1] ?? '#000000'];
  }
  if (!known[colorStops.length - 1]) {
    const lastKnown = [...known].lastIndexOf(true);
    colorStops[colorStops.length - 1] = [
      1,
      colorStops[lastKnown]?.[1] ?? colorStops[0][1],
    ];
  }
  // 中间仍缺位置的：线性插值前后已知位置
  for (let i = 1; i < colorStops.length - 1; i++) {
    if (colorStops[i] !== null) continue;
    let prev = i - 1;
    while (prev > 0 && colorStops[prev] === null) prev--;
    let next = i + 1;
    while (next < colorStops.length - 1 && colorStops[next] === null) next++;
    const pv = colorStops[prev]?.[0] ?? 0;
    const nv = colorStops[next]?.[0] ?? 1;
    colorStops[i] = [pv + (nv - pv) * ((i - prev) / (next - prev)), colorStops[i + 1]?.[1] ?? colorStops[prev][1]];
  }

  // CSS 角度：0deg =「向上」，顺时针增加（90deg 向右，180deg 向下）。
  //
  // 【符号】渐变方向向量 = (sin a, -cos a)：
  //   a=0   → (0,-1)   向上
  //   a=90  → (1, 0)   向右
  //   a=180 → (0, 1)   向下   ✓（CSS 180deg = to bottom）
  // 起点在「反方向」那一端，这样 colorStops[0] 正好落在 CSS 指定的一侧。
  //
  // Konva 渐变坐标是形状**局部归一化坐标**（0~1），以0.5 为中心延伸半个单位。
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = 0.5;
  return {
    sx: half - dx * half, sy: half - dy * half,
    ex: half + dx * half, ey: half + dy * half,
    colorStops: colorStops.flat(),
  };
}

/** 从 computedStyle 提取可映射到 props 的视觉属性 */
function extractVisualStyle(inline, computed) {
  const props = {};
  const fill = toHex(computed.backgroundColor);
  // 只有存在背景色或背景图时才写 fill，否则留空让 Konva 默认透明
  if (fill) props.fill = fill;
  if (computed.backgroundImage && computed.backgroundImage !== 'none') {
    // 【渐变支持】Konva 原生有 fillLinearGradientStartPoint / EndPoint / ColorStops，
    // 因此这不是「从零建设」，只需把 CSS 语法翻成 Konva 语法。
    //
    // 此前此处直接丢弃（只写 hasBackgroundImage）导致**渐变元素完全透明**——
    // 实测退化：模型用 linear-gradient 画头像，头像直接消失不见。
    const lg = parseLinearGradient(computed.backgroundImage);
    if (lg) {
      props.gradientStartX = lg.sx;
      props.gradientStartY = lg.sy;
      props.gradientEndX = lg.ex;
      props.gradientEndY = lg.ey;
      props.gradientColorStops = lg.colorStops;
      // 渐变的第一个色标同时作为纯色回退：
      // Konva 若因某种原因不渲染渐变，至少还有个接近的颜色，不至于透明消失。
      props.fill = lg.colorStops[1];
    } else {
      props.hasBackgroundImage = true;
    }
  }

  const border = resolveBorder(inline, computed);
  if (border.stroke && border.strokeWidth) {
    props.stroke = border.stroke;
    props.strokeWidth = border.strokeWidth;
    if (border.cornerRadius) props.cornerRadius = border.cornerRadius;
  }

  const radius = parseFloat(computed.borderTopLeftRadius) || 0;
  if (radius > 0 && props.cornerRadius === undefined) props.cornerRadius = radius;

  const opacity = parseFloat(computed.opacity);
  if (!Number.isNaN(opacity) && opacity < 1) props.opacity = opacity;

  // 阴影：转成 Konva 可用的 shadow 属性
  if (computed.boxShadow && computed.boxShadow !== 'none') {
    const shadow = parseBoxShadow(computed.boxShadow);
    if (shadow) {
      props.shadowColor = shadow.color;
      props.shadowBlur = shadow.blur;
      props.shadowOffsetX = shadow.offsetX;
      props.shadowOffsetY = shadow.offsetY;
    }
  }

  return props;
}

/** 解析 CSS box-shadow 字符串 */
function parseBoxShadow(value) {
  // 形如 rgba(0,0,0,0.2) 0px 4px 12px rgba(...)
  const colorMatch = value.match(/rgba?\(([^)]+)\)/);
  const rest = value.replace(/rgba?\([^)]+\)/g, ' ').trim();
  const nums = rest.split(/[\s,]+/).filter(Boolean).map(parseFloat).filter(n => !Number.isNaN(n));
  if (!colorMatch) {
    if (!nums.length) return null;
    return { color: '#000000', blur: nums[2] || 0, offsetX: nums[0] || 0, offsetY: nums[1] || 0 };
  }
  const parts = colorMatch[1].split(',').map(s => s.trim());
  const hex = toHex(`rgba(${colorMatch[1]})`);
  const alpha = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if (!hex || alpha === 0) return null;
  return {
    color: hex,
    blur: nums[2] || 0,
    offsetX: nums[0] || 0,
    offsetY: nums[1] || 0,
  };
}

/** 判断元素是否只有单个文本子节点 → 适合渲染为单个 text 组件 */
/**
 * 只取元素**直接子文本节点**的内容，不含后代元素的文本。
 *
 * 与 el.textContent 的区别：后者递归拼接所有后代，
 * 会让「嵌套 span 的 flex 行」既被父级当一整串文本、又被子级各自分别渲染，导致叠字。
 */
function directTextContent(el) {
  let out = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent;
  }
  return out.trim();
}

/**
 * 判断元素是否有「实质的」元素子节点。
 *
 * 【必须统一走这个函数，不要各处自己写 Array.from(el.children).length > 0】
 * <br> / <wbr> 只是强制换行，不承载独立内容，不该算作子节点。
 * 模型复刻截图时极常用 <p>文字<br>文字</p> 表达换行，
 * 一旦把 br 误判为子节点，整段文本会降级为矩形 → 文字全部消失。
 * 这个坑踩过一次（4 张卡片描述全消失），所以三处判断全部收敛到此函数。
 */
function hasSubstantiveChildren(el) {
  return Array.from(el.children)
    .some(c => !NON_CONTENT_TAGS.has(c.tagName.toLowerCase()));
}

/**
 * 判断是否是「CSS 三角 hack」——0×0 元素靠三边border 拼出的三角形。
 *
 * 典型用途：聊天气泡左侧/右侧的小尖角。
 * 模型输出 `<div style="width:0;height:0;border-top:5px solid transparent;
 *   border-bottom:5px solid transparent;border-right:6px solid #ededed"></div>`
 *
 * Konva 没有三角形组件，把它当矩形画出来是一个无意义的小方块，比不画更像 bug。
 * 提示词已要求模型不要用这种写法，这里做兜底跳过。
 */
function isCssTriangleHack(el, computed) {
  const rect = el.getBoundingClientRect();
  if (rect.width > 1 || rect.height > 1) return false;
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const widths = sides.map(s => parseFloat(computed[`border${s}Width`]) || 0);
  const visible = widths.filter(w => w > 0).length;
  // 零尺寸 + 恰好三条边有边框 = 三角形
  return visible === 3;
}

/** 是否承载独立内容、不应触发「有子节点」判断的标签 */
const NON_CONTENT_TAGS = new Set(['br', 'wbr', 'script', 'style']);

/**
 * 判断元素是否是一条「分割线」而非矩形框。
 *
 * 典型场景：模型用 `<div style="border-top:1px solid #ededed;padding-top:16px">`
 * 来表达卡片内的横向分隔线。这类元素在浏览器里就是一条 1px 细线，
 * 但 Konva 的 Rect 只有统一 strokeWidth，无法只画上边框 →
 * 渲染成一个完整的空心矩形框，看起来像「边框没消掉」。
 *
 * 判定：只有上边框可见、其余三边无边框、且元素够宽够扁。
 */
function isBorderLine(el, computed, rect) {
  if (el.children.length > 0) return false;
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const visible = sides.filter(s => {
    const w = parseFloat(computed[`border${s}Width`]) || 0;
    const style = computed[`border${s}Style`];
    return w > 0 && style !== 'none' && style !== 'hidden';
  });
  // 恰好只有一条边有边框，且足够宽（>=80px）、足够扁（<=8px）
  if (visible.length !== 1 || visible[0] !== 'Top') return false;
  return rect.width >= 80 && rect.height <= 8;
}

/**
 * 判断带背景色的短文本是否为「徽标/标签」。
 *
 * 典型场景：`<span style="font-size:10px;color:#8a8a8a;background:#f2f1ef;
 *                     border:1px solid #e6e5e3;border-radius:4px;padding:2px 7px">即将上线</span>`
 * 它在浏览器里是一个带底色的小圆角标签，
 * 但 Konva 的 text 组件只画文字不画背景 → 样式全丢只剩裸文字。
 *
 *【关键】必须排除「聊天气泡」这类大面积块，否则会误判。
 * 初版条件只有「文字短 + 有内边距」，结果微信/QQ 聊天截图里的
 * 每条消息气泡（文字 ≤12 字 + padding 10px 14px）全部被判成 badge，
 * 而 badge 分支取 `textColor || '#FFFFFF'` → 白字画在浅色气泡上 → 整屏文字消失。
 *
 * 徽标的可靠特征（气泡都不满足）：
 *   1. **有边框**（气泡通常无边框，或只有极浅的）
 *   2. **字号明显偏小**（<=13px，而气泡正文通常 >=14px）
 *   3. 元素总宽远小于文字所需宽度也不影响——徽标本身就是紧凑包裹
 *   4. 圆角较小（<=8px），气泡圆角通常 >=8px 且相对尺寸更大
 */
function isBadgeLike(el, computed) {
  const text = directTextContent(el);
  if (!text || text.length > 12) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  // 排除聊天气泡：高度超过 32px 一定是消息块，不是徽标
  if (rect.height > 32) return false;

  const cs = computed;
  // 徽标必须有边框；气泡通常无边框
  const borderWidth = parseFloat(cs.borderTopWidth) || 0;
  if (!(borderWidth > 0)) return false;

  // 徽标字号小；气泡字号是正文级别
  const fontSize = parseFloat(cs.fontSize) || 16;
  if (fontSize > 13) return false;

  // 圆角小
  const radius = parseFloat(cs.borderTopLeftRadius) || 0;
  if (radius > 8) return false;

  return true;
}

function isTextOnlyElement(el) {
  const childNodes = Array.from(el.childNodes).filter(n =>
 n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
  );
  if (childNodes.length === 0) return false;
  // <br> 不承载内容，只是强制换行，不算「有元素子节点」——
  // 模型常写 <p>文字<br>更多文字</p>，若把 br 计入会让整段降级为 rectangle 而丢失文本。
  return childNodes.every(n =>
    n.nodeType === Node.TEXT_NODE
    || (n.nodeType === Node.ELEMENT_NODE && NON_CONTENT_TAGS.has(n.tagName.toLowerCase()))
  );
}

/** 从图标类标签/类名中猜测 iconId（如<i class="icon-search">） */
/**
 * 判断「是否**可能**是头像」——用于类型分流，必须在 isTextOnlyElement 之前调用。
 *
 * 【为什么单独存在】头像 div 内写着首字母（ZT/ME），
 * 于是它同时满足 isTextOnlyElement（只含文本节点），
 * 会被抢先判成 text 组件；而真正的头像判定在下游只对 rectangle 生效，
 * 于是头像永远拿不到 avatar 类型。
 *
 * 因此需要一个「前置探针」。它复用 isAvatarLike 的完整判据，
 * 不重复实现，避免两处判据漂移。
 *
 * 注意：这里传入的 props 可能尚未填充（extractVisualStyle 在后面才跑），
 * 所以 isAvatarLike 的「填充来源」判据要能容忍 props 为空——
 * 元素自身有 computed 背景色即可，isAvatarLike 内部会读 computed 兜底。
 */
function isAvatarCandidate(el, rect, computed) {
  return isAvatarLike(el, rect, computed, {
    fill: toHex(computed.backgroundColor) || undefined,
  });
}

/**
 * 判定一个圆形/圆角小色块是否是「头像」。
 *
 * 背景：项目里本来就有 avatar 组件（圆形底色 + 首字母），
 * 但解析层此前只认div/section/... → rectangle，
 * 于是聊天气泡旁的小圆头像全部降级成普通矩形 ——
 * 既丢了组件语义（图层面板显示「矩形」而不是「头像」），
 * 也让用户无法像墨刀那样直接双击改文字。
 *
 * 判据（全部满足才认，保守避免把普通圆形按钮/分页圆点误判成头像）：
 *   1. 小尺寸：24px ~ 72px（真实头像区间；分页圆点通常 <16px，图标按钮更小）
 *   2. 圆形或大圆角（radius ≥ 宽高一半 - 2px）
 *   3. 无直接文本 —— 头像底色块本身不含文字，文字由overlay或首字母另行表达
 *   4. 子节点均无实质内容 —— 头像不是容器
 *   5. 能构成可视区域 —— 自身有填充，**或**子节点有填充
 *
 * 「分页器圆点」为何不误伤：它们通常 ≤16px，被第1 条挡掉。
 * 「圆形图标按钮」为何不误伤：它们内部有 <i>/<svg> 子节点，被第 4 条挡掉。
 */
function isAvatarLike(el, rect, computed, props) {
  const w = rect.width;
  const h = rect.height;
  if (w < 24 || h < 24 || w > 72 || h > 72) return false;
  // 非正方形也排除：真实头像是 1:1 的
  if (Math.abs(w - h) > 4) return false;

  const radius = parseFloat(computed.borderTopLeftRadius) || 0;
  // 【判据修正·实测退化】此前要求「正圆」（radius ≈ 宽高一半），
  // 但实际模型输出的是 border-radius:6px 的**圆角方形**—— 微信风格头像本就是圆角方形，
  // 不是正圆。结果所有真实头像都判不出、全部降级成普通矩形。
  //
  // 现在放宽为「有明显圆角即可」：正圆（≈w/2）与圆角方形（6~8px）都认。
  // 风险控制靠另外两条（尺寸 + 无文本）—— 小尺寸方块通常只有头像这一种用途。
  const isRound = radius > 0 && Math.abs(radius - Math.min(w, h) / 2) < 3;
  const isRoundedSquare = radius >= 2 && radius < Math.min(w, h) / 2 - 2;
  if (!isRound && !isRoundedSquare) return false;

  // 【允许首字母】头像要显示姓名首字母（ZT / ME），所以**不能**一律排斥文字。
  // 但必须是「短字母」形态，否则就可能是文字标签而非头像：
  //   · 允许：1~2 个英文字母（可含内部空格/点，如 "A" "ZT" "M."）
  //   · 拒绝：任何包含中文或超过 3 个字符的内容（那是昵称/标签，不可能是头像首字母）
  const own = directTextContent(el);
  const isInitials = /^[A-Za-z][A-Za-z\s.]{0,2}$/.test(own);
  if (own && !isInitials) return false;

  // 【判据修正·实测退化】此前要求「无元素子节点」，
  // 但模型为模拟照片质感会在头像里塞色块（实测输出两个 height:24px/22px 的子div）。
  // 这类子节点本身**没有文字、没有内容**，只是装饰。
  // 判定改为「子节点均无实质内容」—— 只要有带文字或带自己的子结构的子节点才排除。
  const kids = el.children;
  for (const kid of kids) {
    const kidHasText = Array.from(kid.childNodes)
      .some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const kidHasKids = hasSubstantiveChildren(kid);
    if (kidHasText || kidHasKids) return false;
  }

  // 【判据修正·实测退化 ×3】这条判据先后退化了三次，每次都是真实case 打脸：
  //   第1 次 纯色头像：要求 props.fill ——正常。
  //   第 2 次 渐变头像：模型改用 linear-gradient，backgroundColor 为 transparent → fill 空。
  //   第 3 次（本轮）拼接头像：模型用「透明外层 + 3 个色块子div」模拟照片质感，
  //      连子节点都只是色块。此时外层 **自身和渐变都没有任何填充**，
  //      判据直接失败 → 头像又退回普通矩形。
  //
  // 教训：头像的填充**不一定来自自己**。模型为模拟照片质感会把它拆成外层容器 + 色块子div，
  // 外层只是个裁切框（overflow:hidden），颜色全在子节点上。
  // 所以判据应问「这个元素能不能构成一块可视区域」，而不是「你自己有没有背景色」。
  //
  // 风险控制：前4 条（尺寸/近正方形/圆角/无文本无实质子内容）已足够收敛，
  // 这里放开填充来源不会把普通小色块误判成头像。
  const selfFilled = !!(props.fill || props.gradientColorStops);
  const kidFilled = Array.from(el.children).some(kid => {
    const kc = window.getComputedStyle(kid);
    return !!(toHex(kc.backgroundColor) || (kc.backgroundImage && kc.backgroundImage !== 'none'));
  });
  // 头像判据退化了 5 轮才修好，根因是 finalType 被 const 解构成快照、
  // 头像分支只改了局部 componentType → 判据通过但类型从未生效。
  // 若日后再次退化，这里是第一个该看的地方。
  // 刻意只打**未命中**的：头像数量已在收集阶段汇总输出，
  // 再逐个打印会在几十个头像的页面上刷屏。
  if (!selfFilled && !kidFilled) {
    console.warn('[头像判据] 无任何填充来源，判为普通矩形', {
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      radius: parseFloat(computed.borderTopLeftRadius) || 0,
      selfFill: props.fill || null,
      gradient: !!props.gradientColorStops,
      kids: el.children.length,
    });
    return false;
  }
  return true;
}

function guessIconId(el, icons) {
  const candidates = [];
  if (el.tagName?.toLowerCase() === 'i') candidates.push(el.className || '');
  candidates.push(el.id || '', el.getAttribute?.('data-icon') || '', el.getAttribute?.('data-icon-id') || '');

  // 【必须先试整体名，再分词】
  // 提示词要求模型写 `class="icon-arrow-left"`，而图标库里的 id 是 `arrow-left`。
  // 若直接按 /[\s_-]+/ 分词，会得到 ['icon','arrow','left']：
  //   · 'icon' 不是图标 id
  //   · 'arrow' 也不是（库里是 arrow-left / arrow-right 这种完整名）
  //   · 'left' 同样不是
  // → 三个分词全部落空，图标静默降级为无意义的空矩形，
  //   表现为「箭头按钮的底色画出来了，但里面是空的」（实测分页器左右箭头）。
  //
  // 所以要先剥掉 'icon-' / 'ic-' / 'fa-' 这类命名空间前缀，
  // 把**整个剩余串**当作候选去匹配，命中就直接返回。
  const NAMESPACES = ['icon', 'ic', 'fa', 'glyphicon', 'material-icons', 'mi'];
  const rawCandidates = candidates.filter(Boolean);
  const wholeNames = [];
  for (const raw of rawCandidates) {
    for (const token of String(raw).trim().split(/\s+/)) {
      // icon-arrow-left → arrow-left；icon-ic-arrow-left → arrow-left
      let name = token;
      for (;;) {
        const lower = name.toLowerCase();
        const ns = NAMESPACES.find(n => lower === n || lower.startsWith(n + '-'));
        if (!ns) break;
        name = name.slice(ns.length).replace(/^[-_]/, '');
      }
      if (name) wholeNames.push(name);
    }
  }
  for (const name of wholeNames) {
    const hit = icons.find(i => i.id === name || i.id.toLowerCase() === name.toLowerCase());
    if (hit) return hit.id;
  }

  // 分词匹配：兼容 class 里混写的场景，如 `btn icon icon-search`
  for (const raw of rawCandidates) {
    for (const token of String(raw).split(/[\s_-]+/)) {
      const hit = icons.find(i => i.id === token || i.id === token.toLowerCase());
      if (hit) return hit.id;
    }
  }

  // 关键词模糊匹配：class 名里带 search 就用 search 图标
  const text = candidates.join(' ').toLowerCase();
  if (text) {
    const hit = icons.find(i => text.includes(i.id) || (i.keywords || '').toLowerCase().split(/\s+/).some(k => k.length > 2 && text.includes(k)));
    if (hit) return hit.id;
  }
  return null;
}

/**
 * 把一个 DOM 元素转成 shape。
 * 返回 null 表示该元素不应独立成组件（由父级统一处理，如纯文本节点）。
 */
function elementToShape(el, ctx, index) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

  const rect = el.getBoundingClientRect();
  const inline = inlineStyleToObject(el);
  const computed = window.getComputedStyle(el);

  // 零尺寸且无边框的元素跳过（如空白的布局占位）。
  // 但含文本的元素即使自身零尺寸也有意义（文本会由后续分支估宽），不能丢。
  const hasBorder = resolveBorder(inline, computed).strokeWidth > 0;
  const tag0 = el.tagName.toLowerCase();
  const isTextCarrier = ['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a'].includes(tag0);

  // 【CSS 三角 hack】模型常用「0×0 元素 + 三边 border」画气泡的小三角：
  //   <div style="width:0;height:0;border-top:5px solid transparent;
  //                border-bottom:5px solid transparent;border-right:6px solid #ededed"></div>
  // Konva 没有三角形组件，画出来只会是一个无意义的小方块，反而更像 bug。
  // 直接跳过，让气泡保持干净。
  if (isCssTriangleHack(el, computed)) {
    return null;
  }

  // 【图标元素豁免零尺寸】
  // 模型用 <i class="icon-arrow-left"></i> 表达图标，这是**空元素**——
  // 浏览器量出来是 0×0（字体图标的字形来自 CSS content，而离屏容器里没有这个 class，
  // 所以连伪元素内容都不存在）。而 isTextCarrier 白名单只有 span/p/h1-h6/label/a，
  // 不含 i/svg，于是这里把图标直接 return null 了。
  //
  // 症状：分页器/轮播的左右箭头按钮只剩底色方块，里面是空的（实测卡片页分页器）。
  //
  // 图标有自己的尺寸来源（见下方 icon 分支的 fontSize 兜底），
  // 不该被「零尺寸空白占位」的规则拦掉。
  const isIconTag = tag0 === 'i' || tag0 === 'svg';
  if ((rect.width < 1 || rect.height < 1) && !hasBorder && !isTextCarrier && !isIconTag) {
    return null;
  }

  const tag = tag0;
  const styleProps = extractVisualStyle(inline, computed);

  // 判定组件类型
  let componentType = null;
  let props = { ...styleProps };
  let sourceHtml = el.outerHTML;

  switch (tag) {
    case 'button':
    case 'input': {
      componentType = tag === 'input' ? 'input' : 'button';
      const label = (el.innerText || el.value || '').trim();
      if (tag === 'input') {
        props.placeholder = el.getAttribute('placeholder') || '';
      } else if (label) {
        props.text = label;
      }
      // input 的 placeholder 用浅色文字呈现
      if (tag === 'input' && computed.color) props.textColor = toHex(computed.color);
      break;
    }
case 'img': {
      componentType = 'image';
      const src = el.getAttribute('src') || '';
      const cleanSrc = stripPlaceholderTextParam(src);
      if (cleanSrc) props.imageSrc = cleanSrc;
      // 图片外框通常有圆角（头像/缩略图），透传后 Konva 才能正确裁切
      const imgRadius = parseFloat(computed.borderTopLeftRadius) || 0;
      if (imgRadius > 0) props.cornerRadius = imgRadius;
      // 无背景色时给个中性占位底色：外部图片（尤其是占位图 URL）常加载失败或较慢，
      // 没有底色会导致这里先是一片空白/完全透明，用户看不出本该有个图
      if (!props.fill) props.fill = '#E2E8F0';
      break;
    }
    case 'hr':
      componentType = 'divider';
      props.fill = styleProps.fill || '#E2E8F0';
      break;
    case 'i':
    case 'svg': {
      const iconId = guessIconId(el, ctx.icons);
      // 【图标诊断】模型用 <i class="icon-xxx"> 表达图标（分页箭头、返回箭头等），
      // 命中即转成本项目的 icon 组件。命中失败时静默降级为无意义的空矩形，
      // 表现为「箭头按钮出现但里面是空的」，所以未命中必须打日志。
      if (!iconId) {
        console.warn('[图标诊断] class 未匹配到图标库', {
          tag,
          className: el.className || '(空)',
          iconsLoaded: ctx.icons?.length || 0,
          sample: (ctx.icons || []).slice(0, 5).map(i => i.id).join(','),
        });
      } else {
        console.log('[图标诊断] 命中', { className: el.className, iconId });
      }
      if (iconId) {
        componentType = 'icon';
        props.iconId = iconId;
        // 【尺寸兜底】<i class="icon-xxx"></i> 是空元素，浏览器量出来的尺寸不可信：
        //   · 独立出现时是 0×0
        //   · 在 flex 容器里被 align-items 拉伸/对齐后，可能量成 1×1（实测）
        // 两种都不是图标的真实可见尺寸。
        //
        // 字体图标的可见尺寸就是 1em × 1em（`font-size:14px` → 14×14），
        // 所以只要实测值明显小于 font-size，就一律用 font-size。
        // 阈值取 4px：小于它一定是量测噪声而非真实尺寸。
        //
        // 【本轮修掉的致命问题】光靠 font-size 不够：模型常常不给 <i> 设 font-size，
        // 于是 computed.fontSize 会**继承**一个很小的值（甚至 0），
        // 兜底后仍是 1px → 图标依然看不见（实测分页箭头）。
        // 所以最终再兜一层 MIN_ICON_PX，保证任何路径下都至少能看见。
        const MIN_ICON_PX = 14;
        const iconFs = parseFloat(computed.fontSize) || 0;
        const measured = Math.max(rect.width, rect.height);
        const useFontSize = measured < 4 || (iconFs > 0 && measured < iconFs * 0.5);
        let iconSize = useFontSize
          ? (iconFs >= 8 ? iconFs : 16)
          : measured;
        if (iconSize < MIN_ICON_PX) {
          console.warn('[图标诊断] 尺寸过小，已抬到下限', {
            iconId, measured: `${rect.width}x${rect.height}`, fontSize: computed.fontSize,
            计算值: iconSize, 抬到: MIN_ICON_PX,
          });
          iconSize = MIN_ICON_PX;
        }
        props.width = iconSize;
        props.height = iconSize;
        console.log('[图标诊断] 采用尺寸', {
          iconId, measured: `${rect.width}x${rect.height}`, fontSize: computed.fontSize,
          final: `${iconSize}x${iconSize}`, 依据: useFontSize ? 'font-size（实测不可信）' : '实测',
        });
      }
      break;
    }
    case 'span':
    case 'label':
    case 'p':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      //【关键】只有「直接文本节点」才能自成text 组件。
      // 若用 el.textContent（递归含所有后代），像
      //   <span style="display:flex"><span>¥</span><span>0.025</span><span>/ MTok</span></span>
      // 这种嵌套结构里，外层 span 会把「¥0.025/ MTok」拼成一整串，
      // 同时 3 个子 span 又各自独立成组件 → 父子重复渲染、文字叠在一起。
      // 实测症状：价格行「¥0.025/MTok」三层重叠、卡片标题与徽标叠字。
      // 【重要】<br> 不算「有元素子节点」。
      // 模型极常写 <p>文字<br>更多文字</p>（截图复刻的首选换行方式），
      // 若把 br 计入元素子节点，整段会降级为 rectangle → 文字全部丢失。
      // 实测退化：4 张卡片的描述段落全部消失、卡片3 色块内标题消失。
      const hasElementChild = hasSubstantiveChildren(el);
      const ownText = directTextContent(el);

      // 【判据修正】决定「能否自成文本」的依据是**有没有直接文本**，
      // 而不是「有没有元素子节点」。
      //
      // 错误判据（有子节点就降级为容器）实测退化：
      //   <div style="background:#95EC69;border-radius:6px;padding:9px 12px;color:#111">
      //     rea太猛了
      //     <div style="position:absolute;..."></div>   <!-- 聊天气泡的小三角 -->
      //   </div>
      // 聊天气泡几乎都带一个绝对定位的小三角作为元素子节点，
      // 用「有子节点就降级」判定 → 气泡变空矩形 → 整屏消息文字消失。
      //
      // 正确判据：
      //   - 有直接文本 → 自成text（子节点由 collectElements 递归另行处理）
      //   - 无直接文本 → 才当容器/装饰形状
      // 这样「气泡」和「纯 flex 行容器」能同时正确处理：
      // 前者有文字自成文本，后者没文字只做容器。
      if (hasElementChild && !ownText) {
        // 无自身文字的容器 → 不绘制，只递归子节点
        componentType = 'rectangle';
        delete props.text;
      } else if (!ownText && (styleProps.fill || styleProps.stroke)) {
        // 无文字但有背景/边框 → 装饰形状（分页圆点、箭头按钮底、色块等）
        componentType = 'rectangle';
      } else if (ownText && styleProps.fill && isBadgeLike(el, computed)) {
        // 带背景色的短文本（标签/徽标，如「即将上线」）→ badge 组件。
        // 判成 text 会丢掉背景色、边框、圆角、内边距，只剩一行裸文字。
        componentType = 'badge';
        props.text = ownText;
        props.fill = styleProps.fill;
        props.cornerRadius = parseFloat(computed.borderTopLeftRadius) || 4;
        // 【必须】透传字体样式，且必须声明 fillIsTextColor:false ——
        // badge 的 props.fill 是底色，绝不能被 applyTextStyle 覆盖成字色
        // （覆盖后 Canvas 会画出「字色底 + 字色字」，标签文字彻底看不见）。
        // 缺 textColor 时 Canvas 回退 '#FFFFFF'，白字画在浅色底上，同样看不见。
        applyTextStyle(props, computed, { fillIsTextColor: false });
        if (styleProps.stroke) {
          props.stroke = styleProps.stroke;
          props.strokeWidth = styleProps.strokeWidth || 1;
        }
      } else {
        componentType = 'text';
        props.text = ownText;
        applyTextStyle(props, computed);
      }
      break;
    }
    case 'textarea':
      componentType = 'input';
      props.placeholder = el.getAttribute('placeholder') || '';
      break;
    default:
      break;
  }

  // 未识别标签：若只含直接文本节点，按 text 处理
  if (!componentType) {
    const direct = directTextContent(el);
    // 【头像优先于 text】提示词要求把姓名首字母（ZT/ME）写在头像 div 内，
    // 于是头像变成了「只含文本节点」的 div → isTextOnlyElement 为 true →
    // 走text 分支 → componentType='text'。
    // 而下游的头像判定只在 finalType==='rectangle' 时执行，
    // 结果头像永远被判成文本组件（图层面板显示「文本」，编辑也是改文字）。
    //
    // 所以这里必须先问一次「这是头像吗」—— 是就按 rectangle 走，
    // 留给下游的头像分支去改写类型（那里会提取首字母、设置颜色圆角）。
    if (isTextOnlyElement(el) && direct && !isAvatarCandidate(el, rect, computed)) {
      componentType = 'text';
      props.text = direct;
      applyTextStyle(props, computed);
    } else if (isBorderLine(el, computed, rect)) {
      // 分割线：用上边框的颜色作为线色，高度取边框宽度
      const topWidth = parseFloat(computed.borderTopWidth) || 1;
      const topColor = toHex(computed.borderTopColor);
      props.width = rect.width;
      props.height = topWidth;
      props.fill = topColor || '#E2E8F0';
    } else {
      componentType = 'rectangle';
    }
  }

  // 【必须是 let】头像识别会在后面把类型改写为 'avatar'，
  // 而 shape 的 id/type/componentType 全部读这两个变量 —— 用 const 解构会导致
  // 「判据通过但类型没变」的静默失效（头像永远画成矩形）。
  let { renderType, componentType: finalType, known } = resolveComponentType(componentType);
  if (!known) {
    console.warn(`[HTML解析] 标签 <${tag}> 映射失败，已降级为 rectangle`);
  }

  // 文本元素实测行盒后会覆盖坐标（比 rect 更贴合字形实际位置）
  const shapeTextBox = {};

  // 尺寸必须写入 props —— Canvas 渲染层读的是 props.width / props.height，
  // 改造前只有 text/icon 分支写了尺寸，导致矩形/按钮/输入框全部无宽高而被跳过。
  if (finalType === 'circle') {
    props.radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
  } else if (finalType === 'text') {
    // 【关键】不猜换行、不撑宽度——直接采用浏览器实测的每一行。
    // Konva 的折行规则与浏览器不同，任何「估算」都会导致溢出或二次折行。
    const fs = Number(props.fontSize) || 16;
    const rendered = extractRenderedLines(el);
    if (rendered.length > 0) {
      // 1. 用 \n 固化浏览器的换行决策，Konva 只需按 \n 逐行绘制，永不自行折行
      //
      // 【text-transform 必须在这里应用，不能靠 Konva】
      // Konva Text 没有 text-transform 属性，而 extractRenderedLines 的文本
      // 来自 node.textContent（原始大小写），而行盒 rect 是浏览器转换后的坐标。
      // 不转换就会出现「宽度按大写量、文本却是小写」的尺寸错配。
      //【本轮修复：行首空白必须去掉】
      // 原来只做了 trimEnd（去尾部空白），行首的空白原样保留。
      // 而模型的HTML 是带缩进排版的：
      //     <p>
      //       MiMo 迄今为止最强大的旗舰推理模型。
      //     </p>
      // 节点 textContent 里那段「换行 + 10 个缩进空格」就混进了首行文本，
      // 于是 Konva 画出的第一行是"           MiMo 迄今为止..."。
      //
      // 【症状实测】日志里 4 条多行描述全是这个形态：
      //   { text: '          MiMo 迄今为止最强大的旗', lines: 4, w: 254, ... }
      //   { text: '          全模态、高性能、低成本的高效', lines: 4, ... }
      //   { text: '          兼顾 V2.6-Pro 旗舰', lines: 4, ... }
      //   { text: '          万亿参数，高效架构： 1T ', lines: 4, ... }
      // 缩进空格被算进文本宽度 → 首行被顶偏，看起来就是「换行错乱」。
      //
      // 【为什么用 trimStart 而不是全trim】
      // 行首的空白在 HTML 里通常是缩进/换行，**不属于语义内容**；
      // 而中文段落里作者可能有意的行首空格极少，且我们已经在用
      // 浏览器实测的行盒坐标定位，行首空白留着毫无意义只有害处。
      props.text = rendered
        .map(l => applyTextTransform(collapseBlank(l.text), computed.textTransform))
        .join('\n');
      // 2. 宽度取实测最长行 —— 不多不少，恰好不溢出容器
      const maxLineW = Math.max(...rendered.map(l => l.right - l.left));
      props.width = Math.max(Math.ceil(maxLineW) + 2, 8);

      // 2.5 【防截尾】记录「用 Konva 实际会用的字体重新量一次」的宽度。
      //
      // 背景：Konva Text 的截断判据只看 width，不看 wrap：
      //     _setTextData(): if (fixedWidth && lineWidth > maxWidth) { 二分砍尾 }
      // 所以 wrap="none" 只关掉自动折行，**不关掉静默截尾**。
      //
      // 而两者度量源不同：
      //   · props.width  = 浏览器用真实 CSS 字体栈（Arial / PingFang SC）量的行盒宽
      //   · Konva 量宽  = 用 props.fontFamily（默认 Inter）走 Canvas 2D measureText
      // Inter 通常比 Arial 略宽，于是 Konva 判定「放不下」→ 从末尾悄悄砍掉字符。
      // 实测卡片页四个 19px 标题全部少最后一个字母：
      //   MiMo-V2.6-Pro → MiMo-V2.6-Pr、MiMo-V2.6-Flash → MiMo-V2.6-Flas
      // 字号越大误差越大，所以 15px 的正文没事、19px 的标题出事。
      //
      // 这里用与 Canvas 完全相同的 fontFamily/字号/字重重新量一遍，
      // 两者之差即「Konva 会多需要多少像素」，由渲染层按比例加成余量。
      const slackLines = props.text.split('\n');
      let konvaW = 0;
      for (const ln of slackLines) {
        konvaW = Math.max(
          konvaW,
          measureTextWidth(ln, fs, props.fontWeight, props.fontFamily, props.letterSpacing)
        );
      }
      props.textWidth = Math.max(Math.ceil(konvaW) + 2, props.width);
      // 3. 行高取浏览器实测的两行 top 差值，比任何默认值都准
      const lhFromBrowser = rendered.length > 1
        ? (rendered[1].top - rendered[0].top) / fs
        : (rendered[0].bottom - rendered[0].top) / fs;
      const lh = Number(props.lineHeight);
      props.lineHeight = lh > 0 && lh !== 1.5
        ? lh
        : Math.max(0.8, Math.min(2.5, lhFromBrowser || 1.5));
      props.height = Math.max(Math.round(rect.height), Math.ceil(fs * props.lineHeight * rendered.length));
      // 4. 坐标直接取实测行盒，绕开text-align 的居中/右对齐推算
      shapeTextBox.left = rendered[0].left;
      shapeTextBox.top = rendered[0].top;
      props.align = 'left';

      // 【对齐诊断】文字在容器内是否居中，取决于浏览器实测的行盒位置，
      // 而不是 Konva 的 align。若这里 left 贴近父容器左边，说明浏览器的
      // flex 居中没生效（多半是离屏容器的样式影响了布局）。
      // 打印 父子左边界差 + 行盒宽vs 父容器宽，一眼能看出是否居中。
      if (ctx.verbose && (computed.textAlign === 'center' || computed.textAlign === 'right')) {
        ctx.verbose.push({
          tag: 'alignDebug',
          text: String(props.text || '').slice(0, 20),
          textAlign: computed.textAlign,
          selfLeft: Math.round(rendered[0].left),
          selfRight: Math.round(rendered[Math.min(1, rendered.length - 1)].right),
          selfW: Math.round(rendered[0].right - rendered[0].left),
          boxW: Math.round(rect.width),
          parentLeft: Math.round(rect.left),
        });
      }

      // 5.【带背景时】props.width/height 必须是**含内边距的外框**，
      //    因为 Canvas 会用它们画背景矩形；而 x/y 要回退到外框左上角，
      //    否则背景会整体右移 paddingLeft、下移 paddingTop。
      //    浏览器实测的 rect 本身就是外框（padding 已包含在内），
      //    rect.left/top 才是外框左上角——这正是我们要的。
      if (props.backgroundFill) {
        props.width = Math.max(Math.round(rect.width), 8);
        props.height = Math.max(Math.round(rect.height), 8);
        shapeTextBox.left = rect.left;
        shapeTextBox.top = rect.top;
      }
    } else {
      // Range API 拿不到时的兜底：实测单行宽度
      // 传 letterSpacing：canvas 的 measureText 不含 CSS 字间距，不补会偏窄
      props.text = applyTextTransform(directTextContent(el), computed.textTransform);
      const measured = measureTextWidth(props.text || '', fs, props.fontWeight, props.fontFamily, props.letterSpacing);
      props.width = Math.max(Math.ceil(measured) + Math.ceil(fs * 0.4), 24);
      props.height = Math.max(rect.height, Math.ceil(fs * (Number(props.lineHeight) || 1.5)));
    }
  } else {
    // 【本轮修复：icon 分支的尺寸被这里抹掉】
    // 分派结构是 `if (文本类) {...} else if (...) {...} else { props.width = Math.max(1, rect.width) }`，
    // icon 虽然在上面的 switch 里已经写好了 props.width，
    // 但只要它既不是文本类、也没命中后面的任何分支，就会落进这个 else 被**无条件覆写**。
    // `<i class="icon-arrow-left">` 正是这种元素 →
    //   switch 里辛苦算出的 14px → 这里 Math.max(1, rect.width=1) = 1
    //   → 画布上是一个 1×1 的点，用户看到「图标小到看不见」。
    //
    // 【踩坑：为什么前两轮的修复没生效】
    // 第一轮把阈值改成 `measured < 4`、第二轮加了 MIN_ICON_PX 下限，
    // 代码都在、测试都过、build 都过，但两处日志都显示 size:"1x1"、
    // 连我自己的 warn 都没打出来 —— 说明**这段代码根本没被执行到结果**，
    // 问题出在它下游被覆写。而我又一次靠「代码在+ 测试过」自我说服，
    // 没去核对「改了之后日志变没变」。
    //
    // 修法：icon / arrow 这类有专属尺寸来源的组件，尺寸以switch 里算好的为准，
    // 不能被通用兜底覆盖。判据用 componentType 而不是 tag，
    // 这样以后新增走icon 组件的类型也自动受保护。
    const sizeOwnedBySwitch = componentType === 'icon';
    props.width = sizeOwnedBySwitch
      ? Math.max(14, Number(props.width) || 0)
      : Math.max(1, rect.width);
    props.height = sizeOwnedBySwitch
      ? props.width
      : Math.max(1, rect.height);

    // 祖先 overflow:hidden + border-radius 的裁剪补偿：
    // 浏览器会把贴边子元素（如卡片顶部色块）裁成圆角，Konva 没有裁剪概念，
    // 不补偿就会看到直角矩形压在圆角卡片上。
    if (renderType === 'rect' && !props.cornerRadius) {
      const inherited = inheritClipRadius(el, rect);
      if (inherited > 0) {
        props.cornerRadius = inherited;
        // 补偿出来的圆角并不等于元素自身的 border-radius（它来自祖先的 overflow:hidden 裁剪）。
        // 因此只记进诊断日志、不写进 props：
        //   写进 props 会让属性面板的「圆角」输入框显示一个用户从未设置过的值，
        //   导出 JSON 里也会多出一个模型从未声明的字段。
        ctx.verbose && ctx.verbose.push({
          tag: 'clipRadius',
          inherited: Math.round(inherited),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    }

    // 【溢出裁剪】浏览器会裁掉超出 overflow:hidden 祖先的内容，
    // Konva 没有这个概念 —— 不处理就会「列表只显示 3 条却画出第 4 条」。
    // detectOverflowClip 只在**真的超出**时返回结果，
    // 圆角重叠这类不裁内容的场景不会误触发。
    const clip = detectOverflowClip(el, rect);
    if (clip) {
      // 裁剪量以「元素自身左上角为原点」记录，Canvas 侧据此设置 clipFunc
      props.clipLeft = clip.overLeft;
      props.clipTop = clip.overTop;
      props.clipRight = clip.overRight;
      props.clipBottom = clip.overBottom;
      ctx.verbose && ctx.verbose.push({
        tag: 'overflowClip',
        l: Math.round(clip.overLeft),
        t: Math.round(clip.overTop),
        r: Math.round(clip.overRight),
        b: Math.round(clip.overBottom),
      });
    }
  }

  // icon / arrow / line 需要 points 或显式尺寸兜底
  if (finalType === 'icon' && !props.width) {
    props.width = rect.width || 24;
    props.height = rect.height || 24;
  }

  // 圆形识别：border-radius 接近宽高一半
  const radius = parseFloat(computed.borderTopLeftRadius) || 0;
  const isCircle = finalType === 'rectangle' && radius > 0
    && Math.abs(radius - rect.width / 2) < 2
    && Math.abs(radius - rect.height / 2) < 2;

  // 【圆心 vs 左上角】只对**真正渲染成 circle 的 shape** 加回半径。
  // avatar 虽然 finalType 是 rectangle（因此 isCircle 为真），但它走 Canvas 的
  // avatar 分支、用 x/y 当外框左上角 —— 若也加半径就会双重偏移 2R。
  // 这里必须和下面 type/componentType 的判据保持完全一致。
  const usesCircleCenter = isCircle && finalType !== 'avatar';
  const centerOffset = usesCircleCenter
    ? Math.min(rect.width, rect.height) / 2
    : 0;

  // 头像候选判定。此处**不**预先排除带文字的元素 ——
  // 提示词已要求模型把姓名首字母（ZT/ME）写在头像 div 内，
  // 是否算「首字母」由 isAvatarLike 内部判定（短字母放行、昵称/标签拒绝）。
  const avatarLike = finalType === 'rectangle'
    && rect.width >= 16 && rect.width <= 96 && rect.height >= 16 && rect.height <= 96
    && isAvatarLike(el, rect, computed, props);

  // 【头像识别】项目本就有 avatar 组件，但解析层此前只产出 7 种类型
  // （text/rectangle/image/icon/badge/divider/input），不含 avatar，
  // 于是聊天气泡旁的小圆头像全部降级成普通矩形：
  //   · 图层面板显示「矩形」而非「头像」，用户找不到也改不了
  //   · 无法像墨刀那样双击头像改文字
  //
  // 必须在 isDecorative 之前判定 —— 头像恰好是「无文本无子节点的圆形色块」，
  // 会被装饰判定当作背景纹理丢弃。
  if (finalType === 'rectangle' && avatarLike) {
    //【真正生效的赋值】此前这里只写 `componentType = 'avatar'`，
  // 但 componentType 是**局部变量**：第 1012 行已经把解析结果解构成了 const 快照
  //   const { renderType, componentType: finalType } = resolveComponentType(componentType);
  // 后面 shape 的 id / type / componentType **全都读 finalType / renderType**，
  // 于是判据明明通过、日志也打印「判为头像」，产出的 shape.componentType仍是
  // 'rectangle' —— 画布上照旧是矩形，图层面板也显示「矩形」。
  //
  // 之所以拖了这么多轮：此前的断言只检查「源码里存在 componentType = 'avatar'」，
  // 属于**文本级断言**——它证明代码「写了」，不证明代码「生效了」。
  // 静默失效的经典形态：不报错、不警告、只是不发生。
  //
  // 因此这里必须改 finalType/renderType 这两个真正被读取的变量。
  finalType = 'avatar';
  renderType = 'rect';
  props.width = Math.max(1, rect.width);
  props.height = Math.max(1, rect.height);
    // 【保持原圆角】只补一个「没有圆角」的兜底（画成小圆角方块），
    // 不能强制写成 min(w,h)/2 —— 微信风格头像是 6px 圆角方形而非正圆，
    // 强行改成正圆反而与截图不符（实测截图里 avatar 是 46px + radius 6px）。
    if (!(parseFloat(computed.borderTopLeftRadius) > 0)) {
      props.cornerRadius = Math.min(rect.width, rect.height) / 2;
    }

    // 【首字母】提示词要求模型把姓名首字母（ZT / ME）写在头像 div 内，
    // 这里把它提取成 props.text 交给 Canvas 渲染。
    // 这样「纯色 + 首字母」的稳定形态就闭环了：
    // 模型负责语义（谁是谁），确定性层负责颜色/圆角/尺寸/文字位置。
    const initials = directTextContent(el);
    if (initials) {
      props.text = initials;
      props.fontSize = parseFloat(computed.fontSize) || Math.round(rect.width * 0.4);
      // 字色取模型写的color；模型没写就用与底色对比的白色（底色通常较深）
      const textColor = toHex(computed.color);
      props.textColor = textColor && textColor.toLowerCase() !== '#000000' ? textColor : '#FFFFFF';
    }

    // 【头像一律实色】用户明确选择「纯色 + 首字母」这条稳定路线：
    // 色块模拟照片质感不可控（AI 拼出的颜色层次因截图而异，容易出副作用），
    // 而头像组件的语义本就是「圆/圆角方 + 首字母或图片」。
    //
    // 因此这里**不做**任何色块采集（此前短暂引入过 props.colorTiles，已回退），
    // 外层永远画自己的填充色，首字母由 Canvas 渲染。
    // 若模型仍输出嵌套色块头像，被终止递归丢弃 —— 观感退化成一个平色方块，
    // 但组件语义与可编辑性都是正确的。
  }


  // 【纯装饰丢弃】空内容 + 只有边框/背景的圆形或环形元素直接不生成组件。
  //
  // 典型场景：卡片顶部色块上的同心圆装饰（模型写成 border-radius:50% 的空 div），
  // 以及分页器的圆点。用户明确要求这类「大概率属于背景图」的元素不要复原——
  // 它们视觉上就是背景纹理，做成独立组件反而增加图层面板噪音、且缩放后走形。
  //
  // 判定条件（全部满足才丢，保守避免误杀）：
  //   1. 无任何直接文本
  //   2. 无元素子节点
  //   3. 自身无阴影、无背景图
  //   4. 是圆形，或宽高均> 24px 的细边框环（border-width ≤ 2px）
  // 实心小色块（如分页器圆点、状态点）是有意义的 UI 元素，不能丢：
  // 它们有小尺寸 + 有填充色 + 无边框环特征。
  const isSolidDot = isCircle && rect.width <= 16 && rect.height <= 16 && props.fill && !props.stroke;
  const isDecorative = !isSolidDot
    && finalType === 'rectangle'
    && !directTextContent(el)
    && el.children.length === 0
    && !props.shadowColor
    && !props.hasBackgroundImage
    && (
      isCircle
      || (props.stroke && props.strokeWidth <= 2 && rect.width > 24 && rect.height > 24
        && rect.width <= rect.height * 3 && rect.height <= rect.width * 3)
    );
  if (isDecorative) {
    ctx.stats = ctx.stats || { decorative: 0 };
    ctx.stats.decorative++;
    return null;
  }

  // 诊断：文本元素的实测行数与最终宽度，便于核对「某个标题没出现」。
  // 典型场景：flex/absolute 布局里的文字可能因父容器 overflow 裁剪而不可见，
  // 此时 rect 尺寸正常但浏览器没实际绘制；这里把行数暴露出来便于对照截图排查。
  if (finalType === 'text' && ctx.verbose) {
    ctx.verbose.push({
      text: String(props.text || '').slice(0, 24),
      lines: String(props.text || '').split('\n').length,
      w: Math.round(props.width || 0),
      h: Math.round(props.height || 0),
      rectW: Math.round(rect.width),
      rectH: Math.round(rect.height),
    });
  }

  const shape = {
    id: `${finalType}-${ctx.idPrefix}-${index}`,
    // 【头像必须走 rect 分支而非 circle 分支】
    // Canvas 的 avatar 组件（圆形底色 + 首字母）挂在 case 'rect' 下的
    // startsWith('avatar') 判断里；若这里把 type 设成 'circle'，
    // 会走到 circle 分支渲染成纯椭圆，组件语义和文字能力全部丢失。
    type: usesCircleCenter ? 'circle' : renderType,
    componentType: usesCircleCenter ? 'circle' : finalType,
    // 【圆心坐标】Konva 的 Circle/Ellipse 的 x/y 是**圆心**，而 rect.left/top 是外框左上角。
    // 不加回半径的话，每个圆形都会往左上偏移一个半径：
    //   · 分页器 6px 圆点 → 偏 3px，几乎看不出「在这里」，像是没画出来
    //   · 状态点 / 大圆 → 偏移肉眼可见，位置全错
    // 症状实测：分页圆点「在图层里但画布上无论如何都看不见，改属性也没用」。
    // 注意 avatar 走的是左上角语义（见 usesCircleCenter 注释），不受此修正影响。
    x: Math.round(((shapeTextBox.left ?? rect.left) + centerOffset) * 10) / 10,
    y: Math.round(((shapeTextBox.top ?? rect.top) + centerOffset) * 10) / 10,
    visible: true,
    visibleIf: null,
    hoverProps: {},
    interactions: [],
    props: isCircle ? { ...props, radius: Math.max(1, Math.min(rect.width, rect.height) / 2) } : props,
    html: sourceHtml.length > 4000 ? sourceHtml.slice(0, 4000) + '...' : sourceHtml,
  };

  // 【容器诊断】本轮实测：白底卡片在画布上不是「不显示」，而是显示为**米白 #FBFAF7**。
  // 像素采样（用户截图 vs 原截图）对比：
  //     原图卡片主体 = rgb(255,255,255) 纯白
  //     画布卡片主体 = rgb(251,250,247) 米白
  // 且把画布背景换成对比色后卡片仍有颜色 → 说明白底 Rect **确实画出来了**，
  // 只是被一个更大范围的米白元素盖住，或模型本身写的就是米白。
  //
  // 【本轮要区分的三种可能，日志一次问清】
  //   ① 白底 Rect 正常存在，fill='#FFFFFF'，但 z 序在某个米白容器之后 → 被盖住
  //   ② 白底 Rect 的 fill 本身被算成 #FBFAF7 → 色值/透明度解析错
  //   ③ 模型 HTML 里就没有纯白卡片背景，只有米白容器 → 模型层面就不对
  // 打印 computed 原始值 + inline 值，能把这三种一次分开。
  if (hasSubstantiveChildren(el) && (props.fill || props.stroke)) {
    console.log('[容器诊断]', {
      type: shape.componentType,
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      xy: `${Math.round(shape.x)},${Math.round(shape.y)}`,
      fill: props.fill || 'NONE',
      stroke: props.stroke || 'none',
      sw: props.strokeWidth || 0,
      radius: props.cornerRadius || 0,
      opacity: props.opacity ?? '(默认1)',
      clip: `${props.clipLeft || 0},${props.clipTop || 0},${props.clipRight || 0},${props.clipBottom || 0}`,
      // 色值溯源：computed 与 inline 分开打，能看出是谁把色值改掉的
      computedBg: computed.backgroundColor,
      inlineBg: el.style.background || el.style.backgroundColor || '(无)',
      computedOpacity: computed.opacity,
      html: sourceHtml.slice(0, 100),
    });
  }

  return shape;
}

/**
 * 离屏容器的默认字体栈，与下方 host.style 中的声明保持一致。
 * 用于判断模型是否「显式指定了字体」—— 只有偏离这个栈才需要写进 props。
 */
const DEFAULT_FONT_STACK =
  'Inter, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

/**
 * 从 computed.fontFamily 中提取应当写入 props.fontFamily 的字体名。
 *
 * 此前解析层只用 computed.fontFamily 做文本测宽（measureTextWidth 的入参），
 * 却从不把它写进 props —— Canvas 各分支一律回落 'Inter'，
 * 于是所有 serif / monospace / 衬线标题的字体全部丢失，且不报任何错。
 *
 * 判定规则：
 *   1. 取字体栈第一项（CSS 里生效的就是它）
 *   2. 剥掉引号
 *   3. 与默认栈第一项（Inter）相同 → 返回 null，不写 props
 *      （否则每个元素都会带上 fontFamily='Inter'，属性面板下拉框才被迫显示全量字体列表）
 *   4. 命中属性面板可选列表的字体才写入，避免写入面板无法回显的字体名
 *      —— 面板是 select，写入列表外的值会导致控件显示空白
 */
const SELECTABLE_FONTS = new Set([
  'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'system-ui', 'sans-serif', 'serif', 'monospace',
]);

function resolveFontFamily(computedFontFamily) {
  const stack = String(computedFontFamily || '').trim();
  if (!stack) return null;
  const first = stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '').trim();
  if (!first || first.toLowerCase() === 'inter') return null;
  // 面板下拉无法回显列表外字体名，此时保持 Inter 而不是写入一个显示空白的值
  return SELECTABLE_FONTS.has(first) ? first : null;
}

/** 提取字体相关样式到 props */
function applyTextStyle(props, computed, options = {}) {
  // 【背景色归属必须由调用方声明】props.fill 这个字段在不同组件里语义相反：
  //   · text 组件：Konva <Text> 的 fill 就是字色，盒子底色要挪到 backgroundFill
  //     → 需要下面的换算（有背景就把 fill 让给字色）
  //   · badge 组件：props.fill 是**徽标底色**，props.textColor 才是字色
  //     → 绝不能换算，否则 fill 被覆盖成字色，Canvas 画出「字色底 + 字色字」，
  //       文字与底同色彻底消失（实测「即将下线」标签只剩一个深灰块）。
  //
  // 之前这里无条件按 text 语义换算，badge 分支因为「先设 fill 再调 applyTextStyle」
  // 而被误伤 —— 不报错、不警告，只是标签文字不见了。
  const fillIsTextColor = options.fillIsTextColor !== false;
  const hasBackground = fillIsTextColor && !!props.fill;
  const color = toHex(computed.color);
  if (color) props.textColor = color;
  const fontFamily = resolveFontFamily(computed.fontFamily);
  if (fontFamily) props.fontFamily = fontFamily;
  const fs = parseFloat(computed.fontSize);
  if (!Number.isNaN(fs) && fs > 0) props.fontSize = fs;
  const fw = computed.fontWeight;
  if (fw && (fw === 'bold' || fw === '700')) props.fontWeight = '700';
  else if (fw === '500' || fw === 'medium') props.fontWeight = '500';
  else props.fontWeight = '400';
  if (computed.fontStyle === 'italic') props.fontStyle = 'italic';
  // 【字间距】CSS 的 letter-spacing 是设计师做标题微调的高频手段，
  // 缺失时标题/正文的字距与截图明显不符，一眼能看出来。
  // Konva Text 原生就有 letterSpacing 属性，这里只需透传。
  const ls = parseFloat(computed.letterSpacing);
  // normal 会被浏览器算成 'normal' 而非数值，parseFloat 得 NaN，属正常情况。
  // 0 值也不必写入——省掉一次无意义的 props 变更。
  if (!Number.isNaN(ls) && ls !== 0) props.letterSpacing = ls;
  const deco = computed.textDecorationLine || computed.textDecoration;
  if (deco && deco.includes('underline')) props.textDecoration = 'underline';
  else if (deco && deco.includes('line-through')) props.textDecoration = 'line-through';
  const ta = computed.textAlign;
  if (ta === 'center' || ta === 'right' || ta === 'left') props.align = ta;

  // 【换算仅适用于 text 语义】badge 的 props.fill 已经是徽标底色，
  // 圆角/边框由 badge 分支自己写入，这里整体跳过，绝不碰 fill。
  if (!fillIsTextColor) return;

  // Konva 的 <Text> 用 props.fill 当文字颜色。
  // 若元素自身有背景色（props.fill 已是背景），绝不能回写 fill，
  // 否则文字会被画成底色 → 整段隐形（实测：聊天气泡文字全部消失）。
  if (props.textColor && !hasBackground) {
    props.fill = props.textColor;
  } else if (props.textColor && hasBackground) {
    // 有背景色时，背景与文字必须分两个字段承载
    props.backgroundFill = props.fill;
    props.fill = props.textColor;

    // 【内边距透传】带背景的文字（聊天气泡 / 标签块 / 按钮）靠 padding 把文字推离边缘。
    // 此前完全丢弃 padding，导致背景矩形正确但文字压在左上角。
    const pl = parseFloat(computed.paddingLeft) || 0;
    const pr = parseFloat(computed.paddingRight) || 0;
    const pt = parseFloat(computed.paddingTop) || 0;
    const pb = parseFloat(computed.paddingBottom) || 0;
    if (pl || pr || pt || pb) {
      props.paddingLeft = pl;
      props.paddingRight = pr;
      props.paddingTop = pt;
      props.paddingBottom = pb;
    }
    // 圆角也要透传，气泡的圆角边框才是完整的
    const radius = parseFloat(computed.borderTopLeftRadius) || 0;
    if (radius > 0) props.cornerRadius = radius;
    // 边框同理
    const borderWidth = parseFloat(computed.borderTopWidth) || 0;
    if (borderWidth > 0 && !props.stroke) {
      props.stroke = toHex(computed.borderTopColor);
      props.strokeWidth = borderWidth;
    }
    // 有背景盒子的文字默认垂直居中（与浏览器 flex 容器内常见表现一致）
    props.verticalAlign = 'middle';
  }
}

/**
 * 收集需要独立成组件的元素。
 * 策略：容器（div/section/header/nav 等）若自身有可见背景或边框，也应成为 rectangle 充当背景块；
 * 否则只收集叶子组件与带样式的容器，避免大量无意义的空矩形。
 */
function collectElements(root, ctx) {
  // 【关键】两阶段收集，保证绘制层级正确。
  //
  // Konva 没有 zIndex，按 shapes 数组顺序绘制（后画的盖先画的）。
  // 若深度优先一次收集，「先出现的卡片背景」会压在「后出现的卡片文字」之上——
  // 实测症状：卡片2的标题被卡片1的椭圆盖住、卡片标题被相邻卡片背景截断。
  //
  // 所以：阶段一把所有「有背景/边框」的容器收完（底层），
  // 阶段二再把所有叶子（文本/图标/图片/按钮）收完（顶层）。
  // 这样任何文字都不可能被任何背景遮挡。
  const bgShapes = [];
  const leafShapes = [];
  let index = 0;

  const walk = (el) => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    const tag = el.tagName.toLowerCase();

    // script/style 不渲染
    if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'head') return;

    const shape = elementToShape(el, ctx, index);

    const hasElementChildren = hasSubstantiveChildren(el);

    if (shape) {
      const isBackgroundLike = shape.props.fill
        || (shape.props.stroke && shape.props.strokeWidth)
        || shape.props.shadowColor;
      if (isBackgroundLike && hasElementChildren) {
        // 带背景且有子节点 → 背景层
        bgShapes.push(shape);
        index++;
      } else if (hasElementChildren && !shape.props.text) {
        // 无视觉样式的纯容器 → 不绘制，只递归
      } else {
        // 叶子（含背景的独立元素如 badge/按钮）→ 顶层
        leafShapes.push(shape);
        index++;
      }
    }

    // 【头像终止递归】模型若仍输出「嵌套色块」型头像，
    // 内部色块一律丢弃、不单独成组件：
    //   · 成组件→ 图层面板多出无意义矩形，且拖动头像时色块不跟随
    //   · 画在头像内部 → 需要给头像引入 colorTiles 这类额外字段（已回退）
    // 用户选择「纯色 + 首字母」这条稳定路线，色块层次不值得为此扩展组件语义。
    if (shape && shape.componentType === 'avatar') return;

    // 递归子节点（容器即使自己不绘制，子元素仍需绘制）
    Array.from(el.children).forEach(walk);
  };

  Array.from(root.children).forEach(walk);

  const shapes = bgShapes.concat(leafShapes);
  console.log(`[HTML解析] 分层收集：背景/边框层 ${bgShapes.length} 个，叶子/文本层 ${leafShapes.length} 个`);
  // 头像单独报数：区分「判据没认出来」与「认出来了但没进画布」两类完全不同的问题
  const avatarCount = shapes.filter(s => s.componentType === 'avatar').length;
  console.log(`[HTML解析] 其中头像组件 ${avatarCount} 个${avatarCount === 0 ? '（若截图里有头像，说明判据未命中，见上方「头像判据」日志）' : ''}`);
  if (ctx.stats?.decorative) {
    console.log(`[HTML解析] 已跳过 ${ctx.stats.decorative} 个纯装饰元素（空心圆环/实心大圆，归为背景纹理不复原）`);
  }
  return shapes;
}

/**
 * 主导入函数：HTML → shapes
 *
 * @param {string} html       模型产出的 HTML
 * @param {object} options
 * @param {number} options.width    离屏渲染容器宽度，默认 800
 * @param {number} options.height   容器高度，默认按内容自适应
 * @param {string} options.idPrefix id 前缀，便于多次导入区分
 * @returns {Array} shapes 数组，结构与现有 shapes 数据结构一致
 */
export function htmlToShapes(html, options = {}) {
  const { width = 800, idPrefix = 'ai' } = options;

  const t0 = performance.now();
  console.groupCollapsed(`[HTML解析] 开始（容器宽度 ${width}px）`);

  if (!html || typeof html !== 'string') {
    console.warn('[HTML解析] 输入为空或不是字符串');
    console.groupEnd();
    return [];
  }

  // 1. 提取纯 HTML（模型可能包在```html 代码块里）
  let source = html.trim();
  const fenceMatch = source.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    source = fenceMatch[1];
    console.log('[HTML解析] 已剥离 ```html 代码块包裹');
  }
  source = source.trim();

  console.log(`[HTML解析] 原始输入 ${html.length} 字符 → 清洗后 ${source.length} 字符`);
  console.log('[HTML解析] HTML 内容：', source);

  if (source.length < 10) {
    console.warn('[HTML解析] HTML 过短，很可能模型只返回了说明文字而没有 HTML');
    console.groupEnd();
    return [];
  }

  // 2. 容错解析：某些模型会输出不完整标签
  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body>${source}</body></html>`,
    'text/html'
  );
  const body = doc.body;

  // 模型有时会输出完整文档（含 <html><head><style>）。
  // 直接塞进嵌套 html 里的 <style> 不会生效——浏览器会忽略嵌套 head 中的样式表，
  // 导致 `* { margin:0; box-sizing:border-box }`、`body { background:#fff }`
  // 这类关键重置全部丢失 → 字号偏大、留白错乱。
  // 这里把 style 内容提取出来，在离屏渲染前由 style 标签重新注入。
  const extractedCss = [];
  doc.querySelectorAll('style').forEach(st => {
    const css = st.textContent?.trim();
    if (css) extractedCss.push(css);
  });
  if (extractedCss.length) {
    console.log(`[HTML解析] 提取到 ${extractedCss.length} 个 <style> 块（${extractedCss.join('').length} 字符），已注入离屏容器`);
  }

  // body 上的行内样式（如 background）也提取出来应用到容器，
  // 否则 body 的背景色不会生效（body 在离屏容器里只是个包裹层）
  const bodyStyle = doc.body?.getAttribute('style');
  if (bodyStyle) {
    console.log(`[HTML解析] 提取到 body 行内样式：${bodyStyle}`);
  }

  console.log(`[HTML解析] DOM 解析后 body 直接子节点 ${body?.children.length ?? 0} 个`);

  if (!body || body.children.length === 0) {
    console.warn('[HTML解析] 解析后没有可渲染元素（模型可能返回了纯文本或被拦截）');
    console.groupEnd();
    return [];
  }

// 3. 放入离屏容器真实渲染，让浏览器盒模型算出精确坐标
  //   离屏偏移用固定常量并配合 containerLeft 记录，避免早期版本用 -99999 硬编码
  //    再靠 +99999 平移回来—— 平移量一旦和实际值不一致，所有坐标都会错位。
  const CONTAINER_OFFSET = 10000;
  const host = document.createElement('div');
  host.style.cssText = [
    'position: absolute',
    `left: -${CONTAINER_OFFSET}px`,
    'top: 0',
    `width: ${width}px`,
    `font-family: ${DEFAULT_FONT_STACK}`,
    'line-height: 1.5',
    'box-sizing: border-box',
  ].join('; ');
  // body 的背景/字号等声明等价于根容器样式，这里平移过来（body 只是包裹层，不会自己生效）
  if (bodyStyle) host.setAttribute('style', `${host.getAttribute('style')};${bodyStyle}`);

  // 把提取出的 CSS 注入到页面<head>，让它对离屏容器真实生效。
  // 必须在 innerHTML 赋值之前完成，且用独立 <style> 便于清理。
  const styleEls = [];
  for (const css of extractedCss) {
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    styleEls.push(styleEl);
  }

  // 【必须打标记】host 的 left:-10000px 是取样偏移，不是模型的裁剪意图。
  // detectOverflowClip / inheritClipRadius 沿父链查找时会命中 host，
  // 把这10000px 偏移误算成「元素被祖先裁掉了 9956px」，
  // 于是 Canvas 用 clipFunc 把整个元素裁没（实测卡片白底整张不可见）。
  // 详见 OFFSCREEN_HOST_FLAG 的注释。
  host.setAttribute(OFFSCREEN_HOST_FLAG, '1');
  host.innerHTML = source;
  document.body.appendChild(host);
  console.log(`[HTML解析] 离屏容器已挂载，实际 offsetLeft=${host.offsetLeft}`);

  const ctx = { icons: iconLibrary, idPrefix, verbose: [] };

  let shapes = [];
  try {
    // 强制一次布局，确保 getBoundingClientRect 拿到真实值
    void host.offsetHeight;
    shapes = collectElements(host, ctx);
  } catch (err) {
    console.error('[HTML解析] 渲染取样抛异常：', err);
  } finally {
    document.body.removeChild(host);
    // 必须移除注入的 style —— 否则模型的 CSS 会泄漏到整个应用（按钮变样、字体错乱）
    styleEls.forEach(el => el.remove());
  }

  console.log(`[HTML解析] 遍历提取到 ${shapes.length} 个元素`);
  if (shapes.length > 0) {
    console.log('[HTML解析] 元素明细：', shapes.map(s => ({
      type: s.componentType,
      x: Math.round(s.x),
      y: Math.round(s.y),
      w: Math.round(s.props.width || s.props.radius || 0),
      h: Math.round(s.props.height || s.props.radius || 0),
    })));

    // 【本轮诊断】白底卡片/箭头图标「有解析结果但画不出来」的定位。
    // 画布上「看不见」只有三种可能，一次性区分开：
    //   ① 压根没产出 shape→ 这里查不到
    //   ② 产出了但被裁剪没净→ clip* 字段不为0
    //   ③ 产出了但颜色不对 → fill 字段异常
    // 之前只打了 [容器诊断]（逐个），信息零散且需要肉眼比对，
    // 这里改成按类型汇总 + 单独列出「可疑项」（被裁剪 / 透明 / 图标），一眼可判。
    const rects = shapes.filter(s => s.componentType === 'rectangle' || s.componentType === 'rect');
    const icons = shapes.filter(s => s.componentType === 'icon');
    const badges = shapes.filter(s => s.componentType === 'badge');

    console.log('[HTML解析] 汇总：矩形', rects.length, '· 图标', icons.length, '· 徽标', badges.length);

    const suspicious = shapes.filter(s => {
      const p = s.props || {};
      const clipped = ['clipLeft', 'clipTop', 'clipRight', 'clipBottom']
        .some(k => (Number(p[k]) || 0) > 1);
      const invisible = !p.fill && !p.gradientColorStops && !p.backgroundFill
        && !p.text && !p.iconId;
      return clipped || invisible;
    });
    if (suspicious.length) {
      console.warn('[HTML解析] 可疑元素（有裁剪量或无任何可见内容）：', suspicious.map(s => ({
        type: s.componentType,
        size: `${Math.round(s.props.width || 0)}x${Math.round(s.props.height || 0)}`,
        fill: s.props.fill || 'NONE',
        clip: [s.props.clipLeft, s.props.clipTop, s.props.clipRight, s.props.clipBottom]
          .map(v => Math.round(Number(v) || 0)).join(','),
        iconId: s.props.iconId || undefined,
        text: s.props.text ? String(s.props.text).slice(0, 16) : undefined,
        html: String(s.html || '').slice(0, 70),
      })));
    } else {
      console.log('[HTML解析] 无可疑元素（所有 shape 均有可见内容且无裁剪量）');
    }

    if (icons.length) {
      console.log('[HTML解析] 图标清单：', icons.map(s => ({
        iconId: s.props.iconId,
        size: `${Math.round(s.props.width || 0)}x${Math.round(s.props.height || 0)}`,
        x: Math.round(s.x), y: Math.round(s.y),
      })));
    } else {
      console.warn('[HTML解析] **图标数量为 0** ——若截图里有箭头/图标，说明 <i class="icon-xxx"> 未被识别为 icon 组件');
    }

    /* ============================================================
     * 【本轮核心诊断】大面积填充色的z 序冲突
     *
     * 现象：白底卡片在画布上呈米白 #FBFAF7，原图是纯白 #FFFFFF。
     * 像素采样只能证明「最终呈现是米色」，
     * **无法**证明「白底被盖住了」——像素看不到绘制次数。
     * 所以这里必须先把两种可能分开：
     *
     *   A. 白底 Rect 存在，被后面的非白Rect 覆盖（z 序问题）
     *   B. 白底 Rect **根本没产出**，画出来的就是米色（解析/模型问题）
     *
     * 【踩坑】第一版这里用 `z > whites[0]?.z ?? -1` 判断"谁盖住白底"，
     * 当白底**不存在**时 whites 为空 → 阈值退化成 -1 →
     * **所有**非白矩形都被列成"元凶"，结论完全反向。
     * 这种「用缺失值推导结论」的逻辑比没日志更糟，会把排查带偏。
     * 现在改成先按有无白底分流，两种情况各说各话。
     *
     * 判读方式：这张表把大面积矩形连同 z 序（数组下标，越大越上层）一起列出，
     * 直接看两件事：
     *   · 有没有 fill≈#FFFFFF 的矩形？有 → 看它上面压着什么
     *   · 压根没有？→ 说明模型 HTML 里就没写白底，或解析层没产出（B）
     * ============================================================ */
    {
      const bigFills = rects
        .map((s, i) => ({
          z: i,
          fill: s.props.fill || s.props.backgroundFill || '(none)',
          w: Math.round(s.props.width || 0),
          h: Math.round(s.props.height || 0),
          x: Math.round(s.x), y: Math.round(s.y),
          opacity: s.props.opacity ?? 1,
          html: String(s.html || '').replace(/\s+/g, ' ').slice(0, 48),
        }))
        .filter(r => r.w >= 120 && r.h >= 80)
        .sort((a, b) => (b.w * b.h) - (a.w * a.h))
        .slice(0, 14);
      if (bigFills.length) {
        console.log('[色值诊断] 大面积矩形（按面积降序；z 越大越在上层）：', bigFills);

        const isWhiteish = f => /^#(FFF|FFFFFF|FDFDFD|FEFAF7|F8F8F8)$/i.test(f)
          || /^rgba\(2[45]\d,\s*2[45]\d,\s*2[45]\d/i.test(f);
        const whites = bigFills.filter(r => isWhiteish(r.fill));

        if (whites.length) {
          // 情况 A：白底存在 → 列出压在它上面的非白矩形
          const firstWhiteZ = Math.min(...whites.map(r => r.z));
          const above = bigFills.filter(r => r.z > firstWhiteZ && r.fill !== '(none)' && !isWhiteish(r.fill));
          if (above.length) {
            console.warn('[色值诊断] 情况A：白底之上压着这些非白矩形，按 z 序（后者更上层）：', above);
          } else {
            console.log('[色值诊断] 情况A：白底之上没有别的填充色 → 看白底自己的 fill 是否被算错');
          }
        } else {
          // 情况 B：压根没有白底 → 画出来的本来就是米色
          console.warn('[色值诊断] 情况B：**没有任何近白色的大矩形** → 说明模型 HTML 里就没写白底卡片背景'
            + '（或解析层未产出），当前米色就是唯一真实填充，不是遮挡问题');
          console.log('[色值诊断] 情况B：这些矩形就是画出来的全部填充，按面积降序：', bigFills);
        }
      }
    }

    /* ============================================================
     * 【图标尺寸诊断】Canvas 只按 props.width/height 画 Path，
     * 若解析层给的是 1 或 0，屏幕上就是「看不见」。
     * 直接列出全部图标的最终尺寸 + 换算依据，不用再去翻逐条日志。
     * ============================================================ */
    if (icons.length) {
      console.log('[HTML解析] 图标最终尺寸（Canvas 按此绘制；<4px 即为不可见）：', icons.map(s => ({
        iconId: s.props.iconId,
        size: `${s.props.width}x${s.props.height}`,
        判定: (s.props.width < 4 || s.props.height < 4) ? '不可见！' : 'ok',
        x: Math.round(s.x), y: Math.round(s.y),
      })));
    }

    // 文本专项：若某段文字在截图里看不到但这里没有对应记录，
    // 说明它在 DOM 阶段就被丢弃了（装饰判定/ 零尺寸过滤），对照此表即可确认。
    // 注意按 tag 过滤而非直接读 v.text —— verbose 里还有 clipRadius 等无 text 字段的诊断条目，
    // 直接 v.text.trim() 会抛 TypeError（此前只因恰好没有这类条目才没暴露）。
    const texts = ctx.verbose.filter(v => v.tag !== 'clipRadius' && String(v.text || '').trim());
    if (texts.length) {
      console.log('[HTML解析] 文本明细（文字内容/实测行数/实测宽高）：', texts);
    }
    const clipped = ctx.verbose.filter(v => v.tag === 'clipRadius');
    if (clipped.length) {
      console.log('[HTML解析] 圆角补偿明细（来自祖先 overflow:hidden 裁剪，非元素自身圆角）：', clipped);
    }
  }

  if (shapes.length === 0) {
 console.warn('[HTML解析] 未能从 HTML 中提取到元素。若上面的元素明细为空，' +
      '通常是标签全部落进了容器分支且自身无背景无边框。HTML 内容：', source);
    console.groupEnd();
    return [];
  }

  // 4. 坐标归零：先平移回原点，再做边界过滤。
  //    顺序颠倒会导致过滤条件作用在负坐标上，把所有元素误删（早期版本的真实 bug）。
  //
  //    平移量推导：getBoundingClientRect().left 返回的是「相对视口」的坐标，
  //    离屏容器 CSS 写了 left: -CONTAINER_OFFSET，所以元素真实位置 = 视口坐标 + CONTAINER_OFFSET。
  //    注意不要再减一次 actualOffsetLeft —— 那会让平移量翻倍，所有元素被推到画布外，
  //    表现为「解析成功、图层面板有组件、但画布空白」。
  const offsetX = CONTAINER_OFFSET;
  const normalized = shapes.map(s => ({
    ...s,
    x: s.x + offsetX,
    y: s.y,
  }));

  // 只剔除完全落在画布外的元素；宽度缺失时不做水平判定，避免误杀
  let visible = normalized.filter(s => {
const w = s.props.width || 0;
    const h = s.props.height || 0;
    if (h > 0 && s.y + h < 0) return false;      // 完全在画布上方
    if (w > 0 && s.x + w < 0) return false;       // 完全在画布左侧
    if (s.y > 20000) return false;                 // 离屏容器下方（异常值）
    return true;
  });

  console.log(`[HTML解析] 归零平移量 offsetX=${offsetX}（x 由负坐标还原到原点）`);
  console.log(`[HTML解析] 边界过滤：归零前 ${normalized.length} → 保留 ${visible.length}（剔除 ${normalized.length - visible.length}）`);

  // === 兜底校正 ===
  // 无论上面计算如何，只要整体明显偏离原点（表现为「解析成功但画布空白」），
  // 就按实际包围盒平移到原点附近。这是保底手段，正常情况下不会触发。
  if (visible.length > 0) {
    const minX = Math.min(...visible.map(s => s.x));
  const minY = Math.min(...visible.map(s => s.y));
    const maxX = Math.max(...visible.map(s => s.x + (s.props.width || s.props.radius || 0)));
    const maxY = Math.max(...visible.map(s => s.y + (s.props.height || s.props.radius || 0)));

    console.log(`[HTML解析] 归零后包围盒: x∈[${Math.round(minX)}, ${Math.round(maxX)}] y∈[${Math.round(minY)}, ${Math.round(maxY)}]`);

    // 整体偏离原点（允许 1px 误差）时纠正
    const driftX = Math.round(minX);
    const driftY = Math.round(minY);
    if (driftX > 1 || driftY > 1) {
      console.warn(`[HTML解析] 检测到整体偏移（x=${driftX}, y=${driftY}），已自动对齐到原点`);
    visible = visible.map(s => ({
        ...s,
        x: Math.round((s.x - driftX) * 10) / 10,
        y: Math.round((s.y - driftY) * 10) / 10,
      }));
    }
  }

  const missingSize = visible.filter(s => {
    if (s.type === 'circle') return !(s.props.radius > 0);
    return !(s.props.width > 0) || !(s.props.height > 0);
  });
if (missingSize.length > 0) {
    console.warn('[HTML解析] 以下组件缺少尺寸，Canvas 上可能显示不出来：',
  missingSize.map(s => ({ id: s.id, type: s.componentType, props: s.props })));
  }

  if (visible.length > 0) {
    const xs = visible.map(s => s.x);
    const ys = visible.map(s => s.y);
    const bounds = {
      x: [Math.round(Math.min(...xs)), Math.round(Math.max(...visible.map(s => s.x + (s.props.width || s.props.radius || 0))))],
      y: [Math.round(Math.min(...ys)), Math.round(Math.max(...visible.map(s => s.y + (s.props.height || s.props.radius || 0))))],
    };
    console.log(`[HTML解析] 内容包围盒 x=${bounds.x[0]}~${bounds.x[1]} y=${bounds.y[0]}~${bounds.y[1]}`);

    // 与画布尺寸对照，一眼看出是否超出可见范围
    const DEFAULT_CANVAS = { width: 800, height: 600 };
    if (bounds.x[1] > DEFAULT_CANVAS.width * 3 || bounds.y[1] > DEFAULT_CANVAS.height * 3) {
      console.warn(`[HTML解析] 内容尺寸远超默认画布(${DEFAULT_CANVAS.width}×${DEFAULT_CANVAS.height})，` +
        '可能需要缩小视图才能看到全部内容');
    }
    if (bounds.x[0] < -1 || bounds.y[0] < -1) {
  console.warn('[HTML解析] 仍有元素位于画布外，坐标归零可能未完全生效');
    }
  }

  console.log(`[HTML解析] 完成，共 ${visible.length} 个组件，耗时 ${Math.round(performance.now() - t0)}ms`);
  console.groupEnd();
  return visible;
}

/**
 * shapes → HTML 反向序列化，供「对话改组件」时把当前画布结构交给模型理解。
 * 模型看到语义化 HTML 比看到一堆 x/y/fill 更容易定位到目标元素。
 */
export function shapesToHtml(shapes) {
  if (!Array.isArray(shapes) || !shapes.length) return '';

  const parts = shapes.map((s) => {
    const p = s.props || {};
    if (s.html) {
      // 解析层产出的元素直接复用原始 HTML，最忠实
      return `<!-- id:${s.id} type:${s.componentType || s.type} -->\n${s.html}`;
    }
    // 手工创建的组件按类型生成简化 HTML
    switch (s.componentType || s.type) {
      case 'text':
        return `<!-- id:${s.id} -->\n<span style="font-size:${p.fontSize || 14}px;font-weight:${p.fontWeight || 400};color:${p.textColor || p.fill || '#000'}">${escapeHtml(p.text || '')}</span>`;
      case 'button':
        return `<!-- id:${s.id} -->\n<button style="width:${p.width}px;height:${p.height}px;background:${p.fill || '#2563EB'};color:#fff;border:none;border-radius:${p.cornerRadius || 4}px">${escapeHtml(p.text || '')}</button>`;
      case 'input':
        return `<!-- id:${s.id} -->\n<input placeholder="${escapeHtml(p.placeholder || '')}" style="width:${p.width}px;height:${p.height}px;border:1px solid ${p.stroke || '#E2E8F0'};border-radius:${p.cornerRadius || 4}px" />`;
      case 'image':
        return `<!-- id:${s.id} -->\n<img src="${p.imageSrc || p.imageData || 'placeholder'}" style="width:${p.width}px;height:${p.height}px;border-radius:${p.cornerRadius || 0}px" />`;
      default:
        return `<!-- id:${s.id} type:${s.componentType || s.type} -->\n<div style="position:absolute;left:${s.x}px;top:${s.y}px;width:${p.width || 0}px;height:${p.height || 0}px;background:${p.fill || 'transparent'};border-radius:${p.cornerRadius || 0}px">${escapeHtml(p.text || '')}</div>`;
    }
  });

  return `<div style="width:${Math.max(...shapes.map(s => s.x + (s.props?.width || 0)))}px">\n${parts.join('\n')}\n</div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}