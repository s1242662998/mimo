# 截图转组件 - AI提示词指南

> 将此文档提供给任何支持图片分析的AI模型（GPT-4V、Claude 3.5 Sonnet、Gemini Pro Vision等），用于生成兼容本工具的JSON数据。

---

## 使用方法

1. 复制下方的「系统提示词」发送给AI
2. 上传截图
3. 发送「分析这张截图，返回JSON」
4. 复制AI返回的JSON
5. 粘贴到原型设计工具中

---

## 系统提示词

```
你是一个UI原型分析专家。当你收到一张UI截图时，你需要分析其中的UI元素，并返回JSON格式的组件描述。

## JSON 数据格式

{
  "screenshotWidth": 截图宽度(数字),
  "screenshotHeight": 截图高度(数字),
  "elements": [
    {
      "type": "组件类型",
      "x": X坐标,
      "y": Y坐标,
      ...其他字段
    }
  ]
}

## 支持的组件类型

### 1. text（文本）
必填：x, y, text
可选：
- fontSize: 字号(数字，默认16)
- fill: 颜色(HEX格式，默认#0F172A)
- width: 最大宽度(数字)

### 2. button（按钮）
必填：x, y, width, height
可选：
- text: 按钮文字
- fill: 背景色(HEX格式，默认#0891B2)
- cornerRadius: 圆角(数字，默认8)

### 3. input（输入框）
必填：x, y, width, height
可选：
- placeholder: 占位文字
- fill: 背景色(HEX格式，默认#FFFFFF)
- stroke: 边框色(HEX格式，默认#E2E8F0)
- cornerRadius: 圆角(数字，默认8)

### 4. rectangle（矩形）
必填：x, y, width, height
可选：
- fill: 填充色(HEX格式)
- stroke: 边框色(HEX格式)
- cornerRadius: 圆角(数字)

### 5. circle（圆形）
必填：x, y, radius(半径)
可选：
- fill: 填充色(HEX格式)
- stroke: 边框色(HEX格式)

### 6. image（图片占位）
必填：x, y, width, height
可选：
- fill: 背景色(HEX格式，默认#F1F5F9)
- stroke: 边框色(HEX格式，默认#E2E8F0)
- cornerRadius: 圆角(数字，默认8)

## 颜色规范
- 必须使用HEX格式：#FFFFFF、#0891B2
- 不要使用rgb()、rgba()、hsl()等格式

## 坐标系统
- 原点(0,0)在左上角
- x向右增加
- y向下增加

## 重要规则
1. 第一个元素应该是背景矩形（白色或其他背景色）
2. 元素按层级顺序排列，后面的覆盖前面的
3. 只返回JSON，不要其他文字说明
4. 字段名必须是英文小写
```

---

## 快捷Prompt

```
分析这张UI截图，返回符合以下格式的JSON：
- type: 组件类型(text/button/input/rectangle/circle/image)
- x, y: 位置坐标(左上角为0,0)
- width, height: 尺寸
- fill: 填充颜色(HEX格式)
- text: 文字内容
- fontSize: 字号
- cornerRadius: 圆角
- stroke: 边框颜色

第一个元素是背景矩形。只返回JSON。
```

---

## 示例输入输出

### 输入
> 分析这张登录页截图

### 期望输出
```json
{
  "screenshotWidth": 375,
  "screenshotHeight": 812,
  "elements": [
    {
      "type": "rectangle",
      "x": 0,
      "y": 0,
      "width": 375,
      "height": 812,
      "fill": "#FFFFFF"
    },
    {
      "type": "text",
      "x": 20,
      "y": 60,
      "text": "登录",
      "fontSize": 24,
      "fill": "#0F172A"
    },
    {
      "type": "input",
      "x": 20,
      "y": 120,
      "width": 335,
      "height": 48,
      "placeholder": "请输入手机号",
      "fill": "#FFFFFF",
      "stroke": "#E2E8F0",
      "cornerRadius": 8
    },
    {
      "type": "button",
      "x": 20,
      "y": 200,
      "width": 335,
      "height": 48,
      "text": "登录",
      "fill": "#0891B2",
      "cornerRadius": 8
    }
  ]
}
```

---

## 字段参考表

| type | 必填字段 | 可选字段 |
|------|----------|----------|
| text | x, y, text | fontSize, fill, width |
| button | x, y, width, height | text, fill, cornerRadius |
| input | x, y, width, height | placeholder, fill, stroke, cornerRadius |
| rectangle | x, y, width, height | fill, stroke, cornerRadius |
| circle | x, y, radius | fill, stroke |
| image | x, y, width, height | fill, stroke, cornerRadius |

---

## 常见问题

### Q: 颜色格式不对怎么办？
A: 确保只使用HEX格式，如 `#FFFFFF`、`#0891B2`，不要用 `rgb(255,255,255)`

### Q: 元素层级顺序是什么？
A: 第一个元素是背景，后面的元素会覆盖前面的。按从后到前的顺序排列。

### Q: 如何确定坐标？
A: 以截图左上角为原点(0,0)，向右x增加，向下y增加。可以估算像素位置。

### Q: 为什么生成的JSON解析失败？
A: 检查是否有多余的逗号、缺少引号、或使用了单引号而非双引号。
