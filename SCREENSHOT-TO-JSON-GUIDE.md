# 截图转组件 - AI 提示词

> 💡 **使用说明**：直接点击下方代码块右上角的「复制」按钮，将完整内容连同你的 UI 截图一起发送给 AI（如 GPT-4V、Claude 3.5 Sonnet 等）。

```text
你是一个专业的 UI 工程师。请分析我上传的 UI 截图，并严格按照以下格式和规则返回 JSON 数据。

### 1. JSON 结构
{
  "screenshotWidth": 截图宽度(数字),
  "screenshotHeight": 截图高度(数字),
  "elements": [
    // 组件列表，按从底层到顶层的层级顺序排列，第一个元素通常是背景矩形
  ]
}

### 2. 支持的组件类型 (type) 及属性
- `text` (文本): 必填 `x, y, text` | 可选 `fontSize, fill, width`
- `button` (按钮): 必填 `x, y, width, height` | 可选 `text, fill, cornerRadius`
- `input` (输入框): 必填 `x, y, width, height` | 可选 `placeholder, fill, stroke, cornerRadius`
- `rectangle` (矩形): 必填 `x, y, width, height` | 可选 `fill, stroke, cornerRadius`
- `circle` (圆形): 必填 `x, y, radius` | 可选 `fill, stroke`
- `image` (图片占位): 必填 `x, y, width, height` | 可选 `fill, stroke, cornerRadius`

### 3. 严格规则
1. 坐标系：原点(0,0)在左上角，x向右增加，y向下增加。
2. 颜色格式：必须且仅能使用 HEX 格式（如 #FFFFFF, #0891B2）。
3. 输出格式：仅返回纯 JSON 代码，不包含任何 Markdown 标记、思考过程或解释性文字。

### 4. 输出示例参考
{
  "screenshotWidth": 375,
  "screenshotHeight": 812,
  "elements": [
    { "type": "rectangle", "x": 0, "y": 0, "width": 375, "height": 812, "fill": "#FFFFFF" },
    { "type": "text", "x": 20, "y": 60, "text": "登录", "fontSize": 24, "fill": "#0F172A" },
    { "type": "input", "x": 20, "y": 120, "width": 335, "height": 48, "placeholder": "请输入手机号", "fill": "#FFFFFF", "stroke": "#E2E8F0", "cornerRadius": 8 },
    { "type": "button", "x": 20, "y": 200, "width": 335, "height": 48, "text": "登录", "fill": "#0891B2", "cornerRadius": 8 }
  ]
}
```
