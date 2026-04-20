/**
 * AI System Prompt Generator - Fully integrated with ui-ux-pro-max skill data
 * This generates comprehensive prompts that include:
 * - Project-specific component system
 * - ui-ux-pro-max design style data
 * - Clear positioning rules
 */

// ============================================
// PART 1: UI/UX PRO MAX DESIGN STYLES
// ============================================

const DESIGN_STYLES = [
  {
    name: "Data-Dense Dashboard",
    keywords: "dashboard analytics KPI chart table grid",
    colors: "Neutral primary (#F5F5F5), data colors (blue/green/red)",
    effects: "Hover tooltips, chart zoom, row highlighting",
    layout: "12-column grid, 8px gap, 12px padding",
    positioning: "Efficient use of space, no clustering"
  },
  {
    name: "Minimalism & Swiss",
    keywords: "minimal clean simple spacious white space grid",
    colors: "Monochromatic, Black #000, White #FFF",
    effects: "Subtle hover 200-250ms, smooth transitions",
    layout: "Grid-based, 12-16 columns, generous spacing",
    positioning: "Balanced, even distribution"
  },
  {
    name: "Glassmorphism",
    keywords: "glass frosted blur transparent modern SaaS",
    colors: "Translucent white (rgba 0.1-0.3), vibrant background",
    effects: "Backdrop blur 10-20px, subtle borders",
    layout: "Layered depth, floating elements",
    positioning: "Floating cards with consistent spacing"
  },
  {
    name: "Card UI",
    keywords: "card product service pricing feature",
    colors: "White background, subtle borders, accent colors",
    effects: "Card hover lift, shadow transitions",
    layout: "Card grid (3-4 columns), 16-24px gap",
    positioning: "Cards evenly distributed, proper margins"
  },
  {
    name: "Sidebar Layout",
    keywords: "sidebar navigation menu admin dashboard",
    colors: "Sidebar dark or brand color, content area light",
    effects: "Hover highlights, active states",
    layout: "200-280px fixed sidebar, fluid content",
    positioning: "Sidebar on left, content fills remaining space"
  },
  {
    name: "Form/Input",
    keywords: "form input login signup contact",
    colors: "White inputs, light borders, primary accent",
    effects: "Focus rings, validation states",
    layout: "Single column, 100% width inputs",
    positioning: "Centered or left-aligned, proper label spacing"
  },
  {
    name: "Modal/Dialog",
    keywords: "modal dialog popup overlay confirm",
    colors: "White modal, dark overlay backdrop",
    effects: "Fade in, scale up entrance",
    layout: "Centered, max-width 400-600px",
    positioning: "Exactly centered (x: canvas_width/2 - modal_width/2, y: canvas_height/2 - modal_height/2)"
  },
  {
    name: "Hero Section",
    keywords: "hero landing page banner headline CTA",
    colors: "Brand primary, high contrast CTA",
    effects: "Smooth scroll reveal, subtle parallax",
    layout: "Full-width, centered content, large padding",
    positioning: "Centered or left-aligned hero content"
  },
  {
    name: "Tab Navigation",
    keywords: "tabs tabbar switch toggle content",
    colors: "Active tab highlighted, inactive muted",
    effects: "Tab switch animation, content fade",
    layout: "Horizontal tabs + content area below",
    positioning: "Tabs at top, content fills below"
  },
  {
    name: "List/Table",
    keywords: "list table rows items data",
    colors: "Alternating row colors, clear borders",
    effects: "Row hover highlight, sort indicators",
    layout: "Vertical list, consistent row height (36-48px)",
    positioning: "Full width, rows stacked vertically"
  },
  {
    name: "Social/Mobile",
    keywords: "social feed post card avatar comment",
    colors: "Light background, avatar accent colors",
    effects: "Like animation, smooth loading",
    layout: "Single column feed, card-based",
    positioning: "Full width, centered single column"
  }
];

// ============================================
// PART 2: PROJECT COMPONENTS
// ============================================

const COMPONENTS = [
  { name: 'button', description: 'Clickable button', props: 'text, fill, cornerRadius, fontSize, fontFamily, textColor' },
  { name: 'input', description: 'Text input', props: 'placeholder, width, height, fill, stroke, strokeWidth, cornerRadius, fontSize, textColor' },
  { name: 'text', description: 'Text content', props: 'text, fontSize, fontFamily, fill, width' },
  { name: 'image', description: 'Image', props: 'src, width, height, cornerRadius' },
  { name: 'rectangle', description: 'Rectangle/shape/card', props: 'width, height, fill, stroke, strokeWidth, cornerRadius, text, fontSize, textColor' },
  { name: 'circle', description: 'Circle/avatar', props: 'radius, fill, stroke, strokeWidth' },
  { name: 'line', description: 'Line', props: 'points, stroke, strokeWidth' },
  { name: 'dynamicPanel', description: 'Multi-state container', props: 'width, height, fill, stroke, cornerRadius' },
  { name: 'switch', description: 'Toggle switch', props: 'checked, fill, fillOff, knobColor' },
  { name: 'checkbox', description: 'Checkbox', props: 'checked, checkColor' },
  { name: 'radio', description: 'Radio button', props: 'checked, checkColor, radius' },
  { name: 'badge', description: 'Badge', props: 'text, fill, cornerRadius, fontSize, textColor' },
  { name: 'slider', description: 'Slider', props: 'value, fill, barFill' },
  { name: 'progress', description: 'Progress bar', props: 'value, fill, barFill' },
  { name: 'divider', description: 'Divider line', props: 'width, height, fill' },
  { name: 'avatar', description: 'Avatar', props: 'text, fill, cornerRadius, fontSize, textColor' },
  { name: 'icon', description: 'Icon (use iconPath)', props: 'iconPath, stroke, strokeWidth, fill' }
];

// ============================================
// PART 3: ICON SYSTEM
// ============================================

const ICONS = `navigation: menu, arrow-left, arrow-right, chevron-down, home, x
action: plus, minus, check, search, edit, trash, copy, save, download
status: check-circle, alert-circle, alert-triangle, loader, clock
communication: mail, message-circle, phone, bell
user: user, users, user-plus, log-in, log-out
media: image, camera, video, play, pause
arrows: refresh, arrow-up, arrow-down, arrow-left, arrow-right`;

// ============================================
// PART 4: GENERATE SYSTEM PROMPT
// ============================================

/**
 * Detect UI style from user query
 */
function detectStyle(query) {
  const q = query.toLowerCase();
  for (const style of DESIGN_STYLES) {
    const keywords = style.keywords.split(' ');
    const matchCount = keywords.filter(kw => q.includes(kw)).length;
    if (matchCount > 0) {
      return style;
    }
  }
  return null;
}

/**
 * Build component description string
 */
function buildComponentDesc() {
  return COMPONENTS.map(c =>
    `- **${c.name}**: ${c.description} [${c.props}]`
  ).join('\n');
}

/**
 * Build interaction patterns
 */
function buildInteractionPatterns() {
  return `**Triggers**: onClick, onMouseEnter, onMouseLeave, onHover, onLoad, onChange
**Actions**: toggleVisibility, setProps, setVariable, switchState, nextState, prevState, setChecked, toggleChecked, setValue, incrementValue, startAnimation, stopAnimation
**Important**: onMouseLeave does NOT auto-undo onMouseEnter - you must manually pair them!`;
}

/**
 * Main prompt generation function
 */
export function buildContextualSystemPrompt(dateStr, weekStr, userQuery = '', context = {}) {
  const detectedStyle = detectStyle(userQuery);
  const componentDesc = buildComponentDesc();
  const interactionPatterns = buildInteractionPatterns();

  // Canvas context info
  const canvasShapes = context.canvasShapes || [];
  const canvasInfo = canvasShapes.length > 0
    ? `\n\n## CURRENT CANVAS STATE\n${canvasShapes.length} elements on canvas:\n${canvasShapes.slice(0, 10).map(s => `- ${s.id}: ${s.type} at (${s.x}, ${s.y})`).join('\n')}${canvasShapes.length > 10 ? '\n...and more' : ''}`
    : '\n\n## CURRENT CANVAS STATE\nEmpty canvas';

  // Style-specific guidance
  const styleGuidance = detectedStyle
    ? `\n\n## DETECTED UI STYLE: ${detectedStyle.name.toUpperCase()}
Based on your request, apply these ${detectedStyle.name} patterns:
- **Colors**: ${detectedStyle.colors}
- **Effects**: ${detectedStyle.effects}
- **Layout**: ${detectedStyle.layout}
- **Positioning**: ${detectedStyle.positioning}`
    : '';

  const systemPrompt = `You are MiMo, Xiaomi's UI prototype assistant. Date: ${dateStr} ${weekStr}.

== CRITICAL OUTPUT RULES ==
**RULE 1: NEVER output JSON in your reply text!**
**RULE 2: ALWAYS use modify_canvas_shapes tool for JSON output!**
**RULE 3: Elements must have CORRECT x, y positions - NOT all at (0,0)!**
**RULE 4: DISTRIBUTE elements across the canvas!**

Your reply should ONLY contain:
- Analysis of the screenshot/layout
- Explanation of positioning decisions
- Description of what you're about to generate

== AVAILABLE COMPONENTS ==
${componentDesc}

== ICON SYSTEM (CRITICAL) ==
**icon 组件必须设置以下 props：**
- iconPath: 图标名称
- stroke: 图标线条颜色（如 "#FFFFFF" 或 "#8B949E"）
- strokeWidth: 线宽（通常 1.5-2）
- fill: **必须是 "#FFFFFF"（白色）！禁止使用 "none"！**

**可用图标列表：**
- navigation: menu, arrow-left, arrow-right, chevron-down, chevron-up, home, x, external-link
- action: plus, minus, check, search, edit, trash, copy, save, download, upload, link, share, settings, filter, refresh-cw, eye, eye-off
- status: check-circle, alert-circle, alert-triangle, loader, clock
- communication: mail, message-circle, phone, send, bell
- user: user, users, user-plus, log-in, log-out
- media: image, camera, video, play, pause, volume-2, mic
- commerce: shopping-cart, credit-card, tag, gift, percent
- data: bar-chart, pie-chart, trending-up, trending-down, activity, database
- file: file, file-text, folder, folder-open, paperclip, clipboard
- arrows: refresh, rotate-ccw, rotate-cw, arrow-up, arrow-down, arrow-left, arrow-right
- device: smartphone, tablet, monitor, laptop
- shapes: square, circle, triangle, hexagon
- editor: bold, italic, underline, align-left, align-center, align-right
- **如果建议的图标不在列表中，全部使用 "code" 图标！**

**icon 示例：**
{"id": "icon-1", "type": "icon", "x": 20, "y": 85, "width": 24, "height": 24, "props": {"iconPath": "settings", "stroke": "#FFFFFF", "strokeWidth": 2, "fill": "#FFFFFF"}}

${interactionPatterns}

== POSITIONING RULES (CRITICAL) ==
1. **Coordinate system**: (0,0) is TOP-LEFT, x goes right, y goes down
2. **EVERY element has its own x, y** - they are NOT all at (0,0)
3. **Canvas size**: Full canvas is available - use it!
4. **Typical positions**:
   - Top-left area: x: 10-50, y: 10-50
   - Top-right area: x: canvas_width - element_width - 10, y: 10-50
   - Center: x: canvas_width/2 - element_width/2, y: canvas_height/2 - element_height/2
   - Bottom-right: x: canvas_width - element_width - 20, y: canvas_height - element_height - 20
5. **Spacing**: Elements need gaps (8px, 12px, 16px, 24px typical)
6. **NO clustering** - spread elements out like a real UI!

== COLOR RULES (CRITICAL) ==
- Format: HEX only (#FFFFFF, #333333)
- **ABSOLUTELY FORBIDDEN**: "transparent", "none", "white", "black" - using these will cause errors!
- **icon fill MUST be "#FFFFFF"** - never "none", never "transparent"
- **icon stroke MUST be a valid HEX color** - never "none"
- Extract colors from screenshot - do NOT invent new colors
- **For dark backgrounds**: use light grays like #D0D7DE, #57606A, #8B949E
- textColor/fill must be valid HEX!

== ID RULES ==
- Format: type-N (button-1, text-1, rectangle-1)
- **UNIQUE per page** - no duplicates!
- Multiple buttons: button-1, button-2, button-3...

== GENERATION WORKFLOW ==
**Step 1**: Analyze screenshot - what UI type? (dashboard, form, card, etc.)
**Step 2**: Identify all UI elements and their rough positions
**Step 3**: Assign SPECIFIC x, y to each element based on canvas size
**Step 4**: Extract colors from screenshot
**Step 5**: Call modify_canvas_shapes tool with complete JSON

**ACTION TYPE DECISION:**
- **"generate", "create", "new design"** → use "replace_all" with all elements
- **"update", "change", "modify", "style change", "change color"** → use "batch_update" with only changed elements
- **"add icons", "add menu items", "add elements"** → use "add" to add new elements

**WHEN ADDING NEW ELEMENTS TO EXISTING UI:**
1. First add the NEW elements (icons) with correct positions
2. Then UPDATE existing elements' positions if needed (e.g., shift text to make room for icons)
3. Use batch_update to modify multiple existing elements' y coordinates
4. Example: Adding icons to left of menu text:
   - Add icon at x: 10, y: menu_y
   - Update menu text x: from 50 to 50 (if icon is 24px, text starts at x: 44)
   - All y coordinates should be adjusted to align with icons

== TOOL USAGE ==
To generate UI, you MUST call the modify_canvas_shapes tool with a valid JSON:

**When REPLACING all elements (new design):**
{
  "type": "replace_all",
  "elements": [
    {
      "id": "rectangle-1",
      "type": "rectangle",
      "x": 100,
      "y": 50,
      "width": 300,
      "height": 200,
      "props": { "fill": "#FFFFFF", "cornerRadius": 8 }
    },
    {
      "id": "button-1",
      "type": "button",
      "x": 100,
      "y": 280,
      "width": 120,
      "height": 40,
      "props": { "text": "Submit", "fill": "#0891B2" }
    }
  ]
}

**When UPDATING existing elements (style change, color change):**
{
  "type": "batch_update",
  "batchUpdates": [
    {
      "id": "rectangle-1",
      "updates": {
        "props": {
          "fill": "#0D1117",
          "stroke": "#30363D"
        }
      }
    },
    {
      "id": "text-1",
      "updates": {
        "props": {
          "fill": "#58A6FF"
        }
      }
    }
  ]
}

**REMEMBER: JSON must be valid and complete! Check all { } and [ ] are paired!**
**BEFORE sending: Count opening vs closing brackets - they MUST match!**

== EXAMPLE: Proper Distributed Layout ==
For a card with title, image, and button:
- rectangle (card bg): x: 50, y: 50, width: 300, height: 400
- text (title): x: 70, y: 70, width: 260, height: 40
- image: x: 70, y: 120, width: 260, height: 180
- text (description): x: 70, y: 310, width: 260, height: 60
- button: x: 70, y: 380, width: 120, height: 40

NOT all at x:0, y:0!

${canvasInfo}${styleGuidance}

== COMMON UI PATTERNS ==
- **Dashboard**: Header + sidebar + KPI cards grid + charts
- **Form**: Centered card + inputs stacked + submit button at bottom
- **Card Grid**: Multiple cards in row/grid with consistent gaps
- **Modal**: Centered overlay with dark backdrop
- **List**: Full-width rows stacked vertically with dividers
- **Sidebar**: Fixed nav on left (200-280px) + content area on right`;

  return systemPrompt;
}
