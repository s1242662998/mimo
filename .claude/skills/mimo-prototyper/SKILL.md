---
name: mimo-prototyper
description: "MiMo Prototyper - UI prototype generation. Analyze screenshots to generate UI with components: button, input, text, image, rectangle, circle, line, dynamicPanel, switch, checkbox, radio, badge, slider, progress, divider, avatar. Actions: generate, create, modify, build UI. Features: interaction system (interactions[], hoverProps, visibleIf), layout rules, ID naming, icon matching."
---
# MiMo Prototyper - UI Prototype Assistant

AI-powered UI prototype generation with component intelligence and design system awareness.

## When to Apply

- Generating UI from screenshots
- Creating new UI components
- Modifying existing prototypes
- Building interactive prototypes with hover/click states

## Core Capabilities

1. **Screenshot Analysis** - Extract layout, colors, spacing from images
2. **Component Mapping** - Match UI elements to available components
3. **Design System Integration** - Apply design rules and patterns
4. **Interaction Design** - Add hover, click, toggle behaviors

---

## Available Components

### Basic Components

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `button` | Clickable button | text, fill, cornerRadius, fontSize, textColor |
| `input` | Text input field | placeholder, width, height, fill, stroke, fontSize |
| `text` | Text content | text, fontSize, fontFamily, fill, align |
| `image` | Image placeholder | src (URL or base64), width, height, cornerRadius |
| `rectangle` | Rectangle shape | fill, stroke, strokeWidth, cornerRadius, text |
| `circle` | Circle shape | radius, fill, stroke, strokeWidth |
| `line` | Line segment | points[], stroke, strokeWidth |

### Interactive Components

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `switch` | Toggle switch | checked, fill, fillOff, knobColor |
| `checkbox` | Checkbox | checked, checkColor |
| `radio` | Radio button | checked, checkColor |
| `slider` | Slider control | value, fill, barFill, knobColor |
| `progress` | Progress bar | value, fill, barFill |

### Container Components

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `dynamicPanel` | Multi-state panel | width, height, fill, stroke, cornerRadius |
| `divider` | Divider line | width, height, fill |
| `badge` | Badge/notification | text, fill, cornerRadius, fontSize |
| `avatar` | Avatar | text, fill, cornerRadius, imageData |

---

## Interaction System

### Triggers

```
onClick, onMouseEnter, onMouseLeave, onHover, onLoad, onChange
```

### Actions

```
toggleVisibility, setProps, setVariable, switchState,
nextState, prevState, setChecked, toggleChecked,
setValue, incrementValue, startAnimation, stopAnimation
```

### Configuration Format

```json
{
  "interactions": [
    {
      "trigger": "onClick",
      "action": "toggleVisibility",
      "targetId": "panel-1",
      "payload": {}
    }
  ],
  "hoverProps": {
    "fill": "#1E40AF",
    "scale": 1.05
  },
  "visibleIf": {
    "key": "isLoggedIn",
    "operator": "equals",
    "value": true
  }
}
```

### Important

> **onMouseLeave will NOT automatically undo onMouseEnter effects.** You must manually pair hover interactions.

---

## Icon System

Icons use `iconPath` to reference built-in SVG paths:

### Usage

```json
{
  "id": "icon-1",
  "type": "icon",
  "x": 100, "y": 100,
  "width": 24, "height": 24,
  "props": {
    "iconPath": "search",
    "stroke": "#666666",
    "strokeWidth": 2,
    "fill": "#FFFFFF"
  }
}
```

### Available Icons (180+)

| Category | Icons |
|----------|-------|
| navigation | menu, arrow-left, arrow-right, chevron-down, chevron-up, home, x |
| action | plus, minus, check, search, edit, trash, copy, save, download, upload |
| status | check-circle, alert-circle, alert-triangle, loader, clock |
| communication | mail, message-circle, phone, send, bell |
| user | user, users, user-plus, log-in, log-out |
| media | image, camera, video, play, pause, volume-2 |
| commerce | shopping-cart, credit-card, tag, gift |
| data | bar-chart, pie-chart, trending-up, trending-down |
| arrows | refresh, rotate-ccw, arrow-up, arrow-down, arrow-left, arrow-right |

---

## Layout Rules

### Coordinate System
- Origin `(0,0)` at top-left corner
- x increases rightward, y increases downward

### ID Naming
- **Format:** `type-N` (e.g., `button-1`, `text-2`, `rectangle-1`)
- **Uniqueness:** No duplicate IDs on the same page
- **Increment:** Multiple buttons → `button-1`, `button-2`, `button-3`

### Size Constraints
- All dimensions must be actual pixel values (no assumptions)
- Canvas size must match screenshot exactly

### Color Rules
- **Format:** HEX only (e.g., `#FFFFFF`, `#333333`)
- **Forbidden:** `transparent`, `none`, `white`, `black`
- **Source:** Must match screenshot colors exactly

### Text Width Calculation
```
English char width ≈ fontSize × 0.5
Chinese char width ≈ fontSize × 1.2
Number width ≈ fontSize × 0.5
Mixed text: calculate separately and sum
```

---

## Generation Workflow

### Step 1: Layout Analysis
```
- Layout type: grid / flex / absolute
- Main axis direction
- Alignment method
- Overall structure division
```

### Step 2: Position & Size Analysis
```
- x, y for each element (pixel-accurate)
- width, height for each element
```

### Step 3: Spacing Analysis
```
- Margin between elements
- Padding within containers
- Spacing standard (4/8/12/16/20/24/32px)
```

### Step 4: Hierarchy Analysis
```
- z-index for each element
- Overlap/overlay relationships
```

### Step 5: Color Extraction
```
- Extract colors directly from screenshot
- Do NOT invent colors
- Ensure proper contrast for visual hierarchy
```

### Step 6: Tool Generation
```
- Call modify_canvas_shapes tool
- Do NOT output JSON in reply text
```

---

## Component Props Reference

### text
```json
{ "fill": "#333333", "fontSize": 16, "fontFamily": "Inter" }
```

### rectangle
```json
{
  "fill": "#FFFFFF",
  "stroke": "#E2E8F0",
  "strokeWidth": 1,
  "cornerRadius": 8,
  "text": "Label",
  "fontSize": 14,
  "textColor": "#333333"
}
```

### button
```json
{
  "text": "Click Me",
  "fill": "#0891B2",
  "cornerRadius": 8,
  "fontSize": 14,
  "textColor": "#FFFFFF"
}
```

### icon
```json
{
  "iconPath": "search",
  "stroke": "#666666",
  "strokeWidth": 2,
  "fill": "#FFFFFF"
}
```

### image
```json
{ "src": "https://...", "width": 120, "height": 80 }
```

---

## Common Patterns

| Pattern | Composition |
|---------|-------------|
| Card | rectangle (background) + text (title) + button (action) |
| Tab | dynamicPanel + multiple switch buttons |
| Modal | visibleIf control + setVariable toggle |
| Form | label (text) + input + button (submit) |

---

## Design Principles

### Layout
- Maintain consistent visual style
- Use space efficiently, avoid large empty areas
- Ensure harmonious element spacing

### Color
- Extract colors strictly from screenshot
- Do not add colors not present in screenshot
- Maintain proper contrast for hierarchy

### Interaction
- Pair onMouseEnter/onMouseLeave manually
- Use appropriate triggers for the action type
- Keep interaction patterns consistent

---

## Tool Format

```json
{
  "type": "replace_all | add | update | delete | batch_update",
  "elements": [...],
  "targetIds": [...],
  "updates": {...},
  "batchUpdates": [...]
}
```

---

## Output Rules (CRITICAL)

**DO NOT output JSON code blocks in reply text!**

- JSON must be generated via `modify_canvas_shapes` tool call
- Reply should only contain: analysis, conclusions, descriptions
- Use \`\`\`json block only if showing example JSON (not for generation)

---

## Prerequisites

Python 3.x required for advanced search:

```bash
python3 --version
```

---

## Usage

### Basic Generation

```
Generate UI for this screenshot
```

### With Interaction

```
Add hover effect to the navigation buttons
```

### Design System Search

```bash
python3 skills/mimo-prototyper/scripts/search.py "dashboard analytics" --design-system
```

### Domain Search

```bash
python3 skills/mimo-prototyper/scripts/search.py "card layout" --domain layout
```
