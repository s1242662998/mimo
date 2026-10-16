# CSS 概念支持度盘点

> 生成日期：2026-10-16
> 数据来源：`tests/verify-css-capability.mjs`（读真实源码 + `node_modules/konva` 类型定义）
> 本文是**该测试输出的人工解读**，能力边界以测试为准。

## 一句话结论

解析层目前只读取 **20 个 CSS 属性**，这 20 个构成了截图还原的能力天花板。
Konva 本身还有一批能力我们没接线（成本低），另有一批是真正的能力空白（成本高）。

---

## 一、已完整支持（12 项）

这些概念有「解析层读取 + Canvas 消费」的完整链路：

背景色、文字颜色、字号、字重、斜体、字体、透明度、圆角、
边框色、边框宽、阴影（box-shadow）、四向内边距、下划线/删除线

> 注意：`box-shadow` 是本轮第10 次修复才接通的，此前解析层算出了 4 个
> `shadow*` 字段但 Canvas 一个都没读，全部静默丢失。

---

## 二、A 类：纯接线缺口（Konva 已支持，只需接线）

**这类最划算** —— 不用碰 Konva 底层，只需「解析层读值 → 写 props → Canvas 传属性」。

| 概念 | Konva 支持情况 | 我们的状态 |
|---|---|---|
| `letter-spacing` | `Text` 原生有 `letterSpacing` 属性 | ✅ **本轮已补上** |
| `ellipsis`（单行截断） | `Text` 原生有 `ellipsis` 属性 | 未接线 |
| `linear-gradient` | `Context` 有 `createLinearGradient` | ✅ **已补上**（任意角度 / 方向词 / 任意色标数 / 半透明） |
| `radial-gradient` | `Context` 有 `createRadialGradient` | 未接线（需另一套 startRadius/endRadius 参数，属 B 类） |

**letter-spacing 实现要点**（不只是加一行）：
- 解析层读 `computed.letterSpacing`，0 值不写 props（省掉无意义变更）
- Canvas 透传给 Konva `Text`
- **测宽函数要按 `(n-1) × ls` 补偿** —— canvas 的 `measureText()` 不含 CSS 字间距。
  n 个字符之间只有 n-1 个间隔，写成 `n × ls` 会多补一个间距。
- 属性面板加「字间距」输入框，让用户能手动调

---

## 二之二、本轮补上的其他两项

### text-transform（Konva 无此属性，必须解析层做）

**为什么不能靠 Konva**：`Text` 没有 `text-transform` 属性。

**更隐蔽的问题**：`extractRenderedLines` 的文本取自 `node.textContent`
（**原始大小写**），而行盒 `rect` 是浏览器**转换后**的坐标。
于是模型写 `text-transform:uppercase` 时会出现
**「宽度按大写量、文本却是小写」** —— 尺寸偏窄且文字与截图不符。

所以在解析层把文本转好，转换后与已实测的坐标天然对齐。
Range API 成功路径和兜底路径都要转，已抽成 `applyTextTransform()` 避免两处分叉。

### overflow 边界裁剪（B 类里最可能频繁撞上的）

**原状**：只补偿了圆角，**边界裁剪没做**。
列表只显示 3 条时，Konva 会把第 4 条也画出来，直接穿透容器。

**实现**：
- 解析层 `detectOverflowClip()`：祖先带 `overflow:hidden/clip/auto/scroll`
  **且元素实测边界真的超出**时才返回裁剪量。
  圆角重叠不算超出（那种情况浏览器也不裁内容），避免误触发。
- Canvas `buildOverflowClip()` + `makeClipFunc()`，接入 rect / text / image 三个分支。
- **仅在需要时挂 clipFunc** —— 否则给绝大多数元素挂裁剪函数会拖慢渲染。

---

## 二之三、伪缺口：text-indent

盘点时我把 `text-indent` 列为缺口，**事后验证发现是错的**。

`extractRenderedLines` 取的是浏览器实测行盒，`rendered[0].left`
**本身就是缩进后的真实位置** —— 缩进已被 Range API 自动吸收。
再去读 `text-indent` 反而会造成二次偏移。

已在测试里加断言固化，避免后人重新误列。

---

## 三、B 类：需新增逻辑（Konva 无等价 API）

| 概念 | 缺什么 | 典型症状 |
|---|---|---|
| `z-index` 层叠 | Konva 按数组顺序绘制，无 zIndex 概念 | 无法还原「浮层压住内容」的合法遮挡 |
| `line-clamp`（多行截断） | Konva 只有单行 `ellipsis`，无多行 | 描述摘要的「两行后省略号」做不出来 |
| 多行 `text-align` | 数据已有，但 Konva 单个 Text 不支持每行独立 x | 多行居中标题的尾部行偏左 |

（`overflow` 裁剪与 `text-indent` 已分别解决/证伪，见前两节。）

**关于 z-index 的现状与代价**：
目前靠「两阶段收集」补偿 —— 先收所有背景层，再收所有叶子层，
保证任何文字都不被背景遮挡。这对绝大多数页面够用（还原度反而更好）。
但它**无法表达合法的遮挡关系**：比如下拉菜单浮层应该盖住下方内容、
图片上的浮层文字（这轮头像里的文字就属于这类）。

**关于多行 text-align**：
`extractRenderedLines` 已经算出每行的 `left`/`right`（第 107、127 行都在维护），
但上层第 749 行只取 `rendered[0].left`。数据已具备，
缺的是渲染方式 —— Konva 单个 `<Text>` 不支持每行独立 x，
需要改成「每行一个 `<Text>` 节点」。已固化为断言防止误判为"已解决"。

---

## 四、C 类：明确不做（需先确认真实需求）

| 概念 | 原因 |
|---|---|
| `filter`（blur/drop-shadow） | Konva 有 filter 机制但每个滤镜都要调canvas context，收益低 |
| `mix-blend-mode` | Konva 无等价 API |
| SVG 全量支持 | 当前只支持图标库 class 与 path，覆盖主流图标已够 |
| `border-image` | 极少见 |
| `outline` | 可用 `stroke` 近似 |
| 多边框（border 简写只取 top） | 界面设计趋势是单边框，极少四边异色 |

---

## 五、部分支持（有损）

**linear-gradient 的实现要点**（不只是「透传一下」）：
- 解析层 `parseLinearGradient()` 把 CSS 渐变翻成 Konva 的局部归一化四元组
  （`gradientStartX/Y`…`gradientColorStops`），Canvas 侧 `buildGradientFill()` 统一透传
- **方向公式不能靠手算验证**：`(sin a, -cos a)` 满足 CSS 的
  `0deg=向上 / 90deg=向右 / 180deg=向下`，但手算期望值容易把自己的公式抄进去、自证无效。
  `tests/verify-gradient-direction.mjs` 改为断言「起点相对中心 0.5 的象限」，与公式无关
- **半透明色标不能走 `toHex`**：该函数对 `alpha=0` 返回 null（背景色语义是「透明=没颜色」），
  但渐变里 `transparent` 是一端有意义的位置 —— `linear-gradient(rgba(0,0,0,0),#fff)`
  这种「透明渐隐」是极常见写法，整条丢弃会让元素彻底画不出来。新增 `normalizeRgba()` 保留 rgba 串
- **必须同时写纯色回退**（`fill = 色标首色`），避免 Konva 不支持时首色透明导致「不报错、不显示」

**回退选择**：`radial-gradient` / `repeating-linear-gradient` / `url()` 背景图
仍退回「只记 `hasBackgroundImage`、不写填充」——
所以这类元素变成「只有边框和内容」，而不是「留一个错误的纯色块」。
后者比缺填充更像 bug（凭空多出一个模型没画的色块）。

**`text-align` 多行的隐蔽问题**（盘点中发现的真实缺口，非推测）：

`extractRenderedLines` 用 Range API 逐字符实测，**每行的 `left`/`right` 都算出来了**
（第107 行 `line.right = Math.max(...)`、第 127 行合并时同样维护）。
但上层只取首行：

```js
shapeTextBox.left = rendered[0].left;   // ← 第 717 行
```

结果是：**多行居中/右对齐的标题，尾部几行会偏左**。
截图里若有两行居中的大标题，第一行对、后面几行不对。

修复成本中等：数据已具备，但 Konva 的单个 `<Text>` 节点不支持每行独立 x，
需要改成「每行一个 `<Text>` 节点」的渲染方式。
已固化为断言防止被误判为"已解决"。

---

## 六、盘点脚本自身的价值

写成测试而非 markdown 的原因：能力边界会随代码演进变化，
写成文档必然过期。现在每次改代码都能立刻看到：
- 新支持了什么（PASS 变多）
- 新丢了什么（FAIL 出现）
- 还缺什么（缺口清单）

脚本里有一组断言专门防止把「Canvas 没接这个属性」误判成「Konva 不支持」——
这类混淆会让成本估算失真，进而做出错误的优先级决策。

### 本轮踩到的一个坑：断言自己也会骗人

补linear-gradient 时，为了验证方向公式，我手写了 14 个角度的期望坐标。
跑出 1 个失败（160deg），第一反应是「公式错了」。

实际是我把 160deg 的语义描述写错了。更值得记的是手算期望值的**结构性缺陷**：
`(sin a, -cos a)` 是我自己写进源码的，再手算一遍期望值，
等于把同一个公式抄进两个地方互证——**无论对错都测不出东西**。

改法：断言只表达「起点相对中心的象限」（0deg 起点在下方、90deg 起点在左方），
这来自 CSS 规范而非来自公式实现，才具备证伪能力。
`to right` 曾因纯轴向 `sx` 恰好为 0 而误判，也是同一类问题：
**判据必须相对语义基准（中心 0.5），不能对 0 取符号。**

---

## 附：原始数据

```
解析层读取的 CSS 属性（20 个）：
  backgroundColor  backgroundImage  borderTopColor  borderTopLeftRadius
  borderTopWidth  boxShadow  color  fontFamily  fontSize  fontStyle
  fontWeight  opacity  paddingBottom  paddingLeft  paddingRight  paddingTop
  textAlign  textDecoration  textDecorationLine

Canvas 读取的 props 字段（38 个）：
  align  backgroundFill  barFill  checkColor  checked  cornerRadius  fill
  fillOff  fontFamily  fontSize  fontStyle  fontWeight  height  iconId
  iconPath  imageData  imageSrc  knobColor  knobStroke  lineHeight  opacity
  padding  paddingBottom  paddingLeft  paddingRight  paddingTop  placeholder
  points  radius  radiusY  scale  shadowBlur  shadowColor  shadowOffsetX
  shadowOffsetY  stroke  strokeWidth  text  textAlign  textColor
  textDecoration  value  verticalAlign  width
```

（字段级对应关系由 `verify-props-contract.mjs` 保证，双向差集目前均为空。）