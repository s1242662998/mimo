/**
 * 组件能力清单（提示词的唯一事实来源）
 *
 * ============================================================
 * 为什么需要这个文件
 * ============================================================
 * 此前组件相关内容硬编码在 buildHtmlPrompt.js 的提示词正文里，
 * 带来三个必然的问题：
 *   1. **漂移**：新增组件要改两处（componentList.js 定义 + 提示词正文），
 *      漏改任一处就会出现「面板能拖、但 AI 不认」或反之。
 *   2. **膨胀**：每加一个组件场景就往正文里塞一条规则，
 *      规则互相干扰、注意力被稀释，且无法撤回某条规则。
 *   3. **不可测**：组件清单与提示词的实际内容无从对比，
 *      无法断言「提示词里说的和组件真正支持的是同一套」。
 *
 * 本文件把「每个组件该怎么在 HTML 里写」结构化，
 * 由 buildHtmlPrompt.js 在运行时生成提示词片段 ——
 * **新增组件只改这一个文件，提示词自动同步。**
 *
 * ============================================================
 * 与 componentList.js 的区别（别搞混）
 * ============================================================
 *   componentList.js  → 拖到画布时的**渲染 props**（width/fill/圆角…）
 *                        面向「用户拖一个组件出来长什么样」
 *   本文件             → 模型写HTML 时的**写法约定**（写什么标签、什么 class、
 *                        模型需要配合什么）
 *                        面向「AI 怎么在 HTML 里表达这个组件」
 *
 * 两者可互相引用校验（见 verify-component-catalog.mjs），
 * 但职责不同，不要合并——合并会让「渲染细节」污染「写作契约」。
 */

/**
 * 组件的识别方式分类，决定它是否需要提示词教模型
 *
 * - `implicit` 隐式：**提示词不要教 AI 用它**。
 *   模型照常输出普通 div，由确定性层从 CSS 特征反推组件身份。
 *   （墨刀就是这么做的：HTML 里根本不出现「卡片」这个词）
 *   加这类组件的成本 = 写判据，**不改提示词**。
 *
 * - `explicit` 显式：模型必须配合写出特定标记，否则确定性层无从识别。
 *   典型如图标（必须写 icon-xxx class）、头像首字母。
 *   加这类组件的成本 = 写判据 **+ 加一条 promptHint**。
 *
 * - `config` 配置：只有取值不同，逻辑完全共用。
 *   如头像的圆形/圆角方形、分割线的实线/虚线。
 *   加这类组件的成本 = 写配置，不改逻辑、不改提示词。
 */
export const DETECTION_MODE = {
  IMPLICIT: 'implicit',
  EXPLICIT: 'explicit',
  CONFIG: 'config',
};

/**
 * 组件能力清单
 *
 * 字段说明：
 *   id          与 componentList.js / COMPONENT_TYPE_MAP 保持一致
 *   name        中文名（用于日志与调试，提示词里用 htmlHint）
 *   mode        见DETECTION_MODE
 *   htmlHint    给模型看的写法要求。**仅 explicit 模式需要**；
 *               implicit 模式留空 —— 刻意不告诉模型有这个组件。
 *   verify      自检要点。供测试断言用，防止「提示词说的」和
 *               「解析层做的」再次脱节。
 */
export const COMPONENT_CATALOG = [
  /* ---------------------------------------------------------------- *
   * 显式型：模型必须配合写出标记
   * ---------------------------------------------------------------- */
  {
    id: 'icon',
    name: '图标',
    mode: DETECTION_MODE.EXPLICIT,
    htmlHint: `功能图标必须用 <i class="icon-xxx"></i>，这是内置图标的唯一入口。
尺寸用 font-size，颜色用 color，会被自动还原。
规则：只用图标库中真实存在的 class（见下方图标清单），不要自己编；
一个图标就是一个独立的 <i>，不要塞多个图标或混文字。
截图里看不清具体是什么的小图形（纯色块、几何形），不要硬套图标。`,
    verify: '解析层 guessIconId 只认 class/id/data-icon —— 必须是 <i class> 形态',
  },
  {
    id: 'avatar',
    name: '头像',
    mode: DETECTION_MODE.EXPLICIT,
    htmlHint: `头像用纯色 div + 首字母，不要用 img，也不要拼嵌套色块。
格式：<div style="width:44px;height:44px;border-radius:6px;background:#7fb0e0;
            color:#fff;font-size:14px;font-weight:600;
            display:flex;align-items:center;justify-content:center">ZT</div>
尺寸 24~72px 的正方形，border-radius 与截图一致（微信风格是 4~8px 圆角方形）；
字母取截图里对应人物的姓名首字母（如「张涛」→ ZT），自己那侧写 ME；
字色与截图里的文字颜色一致。`,
    verify: '解析层 isAvatarLike 认：24~72px + 近正方形 + 有圆角 + 无非首字母文本 + 有填充',
  },

  /* ---------------------------------------------------------------- *
   * 隐式型：**刻意不写 htmlHint**
   *
   * 提示词里不出现这些组件的名字。模型照常输出 div，
   * 由确定性层从 CSS 特征识别 —— 这是墨刀的做法。
   * 教学 AI「什么算卡片」反而会束缚它（它会去找视觉线索硬凑），
   * 而截图转原型本来就应该由浏览器实测样式来还原。
   * ---------------------------------------------------------------- */
  {
    id: 'card',
    name: '卡片',
    mode: DETECTION_MODE.IMPLICIT,
    htmlHint: '',
    verify: '（待实现）判据：圆角矩形 + 有阴影或明显 padding + 内部含文字块',
    planned: true,
  },
  {
    id: 'button',
    name: '按钮',
    mode: DETECTION_MODE.IMPLICIT,
    htmlHint: '',
    verify: '现有判据：圆角矩形 + 有填充 + 内部有短文本（≤12 字）+ 尺寸较小',
  },
  {
    id: 'input',
    name: '输入框',
    mode: DETECTION_MODE.IMPLICIT,
    htmlHint: '',
    verify: '现有判据：矩形/圆角矩形 + 边框或浅填充 + 空内容或 placeholder 文本',
  },
  {
    id: 'badge',
    name: '标签',
    mode: DETECTION_MODE.IMPLICIT,
    htmlHint: '',
    verify: '现有判据 isBadgeLike：带背景色 + 短文本 + 小尺寸 + padding 较小',
  },
  {
    id: 'divider',
    name: '分割线',
    mode: DETECTION_MODE.IMPLICIT,
    htmlHint: '',
    verify: '现有判据 isBorderLine：只有单边border + 厚度 ≤2px',
  },

  /* ---------------------------------------------------------------- *
   * 配置型：逻辑完全共用，只有取值不同
   * ---------------------------------------------------------------- */
  {
    id: 'image',
    name: '图片',
    mode: DETECTION_MODE.CONFIG,
    htmlHint: '',
    verify: 'img 标签；解析层支持 imageData（上传）与 imageSrc（URL）两种来源',
  },
  {
    id: 'circle',
    name: '圆形',
    mode: DETECTION_MODE.CONFIG,
    htmlHint: '',
    verify: 'rectangle 且 border-radius ≈ 宽高一半 → 自动走 circle 渲染分支',
  },
];

/* ------------------------------------------------------------------ *
 * 提示词片段生成
 * ------------------------------------------------------------------ */

/**
 * 生成图标 class 清单（按分类），只包含真实存在的图标名。
 *
 * iconLibrary 来自 src/data/icons，是图标的唯一事实来源——
 * 提示词里的 class 名由它生成，因此**新增图标不需要改提示词**。
 * （此前是手写 84 个 class名，凭印象列的，其中 6 个根本不存在。）
 */
export function buildIconClassList(iconLibrary = []) {
  if (!Array.isArray(iconLibrary) || !iconLibrary.length) return '';
  const byCategory = new Map();
  for (const icon of iconLibrary) {
    const cat = icon.category || 'other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(icon.id);
  }
  // 分类名只是前缀，测试里按「每行第一个 token 是分类名」解析，故保留对齐空格
  return Array.from(byCategory.entries())
    .map(([cat, ids]) => `${cat.padEnd(14, ' ')} ${ids.join(' ')}`)
    .join('\n');
}

/**
 * 生成「显式型组件」提示词片段。
 *
 * 只收explicit 模式的组件 —— 隐式型刻意不出现在提示词里，
 * 这是设计约束，不是遗漏。
 *
 * @param {Array} iconLibrary 图标库（从 src/data/icons 传入）
 */
export function buildComponentHints(iconLibrary = []) {
  const explicit = COMPONENT_CATALOG.filter(c => c.mode === DETECTION_MODE.EXPLICIT);
  const blocks = explicit.map((c) => {
    // 图标块需要附class 清单，其余直接用 htmlHint
    if (c.id === 'icon') {
      const list = buildIconClassList(iconLibrary);
      return `${c.htmlHint}\n\n可用图标 class（按分类，只能从这些里面选）：\n${list}`;
    }
    return c.htmlHint;
  });
  if (!blocks.length) return '';
  return blocks.map((b, i) => `${i + 1}. ${b}`).join('\n\n');
}

/**
 * 自检：显式型组件的 id 是否都在 componentList 里定义过。
 * 防止「提示词教了模型，但面板里没这个组件」的漂移。
 */
export function verifyCatalogAgainstComponentList(componentList = []) {
  const defined = new Set(componentList.map(c => c.id));
  return COMPONENT_CATALOG
    .filter(c => !c.planned)
    .filter(c => !defined.has(c.id))
    .map(c => ({ id: c.id, name: c.name }));
}