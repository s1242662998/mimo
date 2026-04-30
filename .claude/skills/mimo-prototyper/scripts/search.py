#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiMo Prototyper Search - BM25 search engine for UI/UX prototyping
Usage:
    python search.py "<query>" [--domain <domain>] [--max-results 3]
    python search.py "<query>" --design-system [-p "Project Name"]
"""

import os
import sys
import csv
import math
import io
from collections import defaultdict

# Force UTF-8 for stdout/stderr
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Get skill directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(SKILL_DIR, 'data')

# CSV configurations
CSV_CONFIG = {
    'style': {'file': 'styles.csv', 'fields': ['style', 'best_for', 'keywords', 'effects', 'avoid']},
    'layout': {'file': 'layout.csv', 'fields': ['pattern', 'structure', 'spacing', 'responsive']},
    'color': {'file': 'colors.csv', 'fields': ['palette', 'primary', 'secondary', 'accent', 'background', 'text']},
    'ux': {'file': 'ux-guidelines.csv', 'fields': ['rule', 'do', 'dont', 'category']},
    'component': {'file': 'components.csv', 'fields': ['component', 'description', 'props', 'example']},
    'interaction': {'file': 'interactions.csv', 'fields': ['pattern', 'trigger', 'action', 'example']},
}

MAX_RESULTS = 5


class BM25:
    """BM25 ranking algorithm"""

    def __init__(self, corpus, k1=1.5, b=0.75):
        # corpus is a list of tokenized documents (list of lists)
        self.corpus = corpus
        self.k1 = k1
        self.b = b
        self.avgdl = sum(len(doc) for doc in corpus) / len(corpus) if corpus else 0
        self.idf = {}
        self._calculate_idf()

    def _calculate_idf(self):
        df = defaultdict(int)
        for doc in self.corpus:
            seen = set()
            for token in doc:
                if token not in seen:
                    df[token] += 1
                    seen.add(token)
        N = len(self.corpus)
        for term, freq in df.items():
            self.idf[term] = math.log((N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query, doc):
        scores = {}
        doc_len = len(doc)
        for term in query:
            if term not in self.idf:
                continue
            tf = doc.count(term)
            if tf == 0:
                continue
            term_freq = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl))
            scores[term] = self.idf[term] * term_freq
        return sum(scores.values())


def tokenize(text):
    if not text:
        return []
    return [t.lower() for t in text.replace('/', ' ').replace('-', ' ').split() if t]


def load_csv_data(domain):
    config = CSV_CONFIG.get(domain)
    if not config:
        return []
    filepath = os.path.join(DATA_DIR, config['file'])
    if not os.path.exists(filepath):
        return []
    data = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
    except Exception as e:
        print(f"Error loading {domain}: {e}", file=sys.stderr)
    return data


def search(query, domain=None, max_results=MAX_RESULTS):
    tokens = tokenize(query)
    if not tokens:
        return {'error': 'Empty query', 'domain': domain, 'query': query, 'results': []}

    domains = [domain] if domain else list(CSV_CONFIG.keys())
    all_results = []

    for dom in domains:
        data = load_csv_data(dom)
        if not data:
            continue

        corpus = []
        raw_data = []
        for row in data:
            text_parts = []
            for field in CSV_CONFIG[dom]['fields']:
                if field in row and row[field]:
                    text_parts.append(str(row[field]))
            text = ' '.join(text_parts)
            corpus.append(tokenize(text))
            raw_data.append(text)

        bm25 = BM25(corpus)
        scores = []
        for i, doc_tokens in enumerate(corpus):
            score = bm25.score(tokens, doc_tokens)
            if score > 0:
                scores.append((i, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        for idx, score in scores[:max_results]:
            result = {k: v for k, v in data[idx].items() if v}
            all_results.append((score, result))

    all_results.sort(key=lambda x: x[0], reverse=True)
    all_results = all_results[:max_results]

    return {
        'query': query,
        'domain': domain or 'all',
        'count': len(all_results),
        'results': [r for _, r in all_results]
    }


def generate_design_system(query, project_name=None, output_format='ascii'):
    """Generate design system recommendation"""
    colors = load_csv_data('color')
    styles = load_csv_data('style')
    ux_rules = load_csv_data('ux')

    keywords = query.lower().split()

    # Score styles
    style_scores = []
    for row in styles:
        text = ' '.join([str(v) for v in row.values()])
        score = sum(1 for kw in keywords if kw in text.lower())
        if score > 0:
            style_scores.append((score, row))

    style_scores.sort(key=lambda x: x[0], reverse=True)
    top_style = style_scores[0][1] if style_scores else None

    # Score colors
    color_scores = []
    for row in colors:
        text = ' '.join([str(v) for v in row.values()])
        score = sum(1 for kw in keywords if kw in text.lower())
        if score > 0:
            color_scores.append((score, row))

    color_scores.sort(key=lambda x: x[0], reverse=True)
    top_colors = [r for _, r in color_scores[:3]]

    # Score UX
    ux_scores = []
    for row in ux_rules:
        text = ' '.join([str(v) for v in row.values()])
        score = sum(1 for kw in keywords if kw in text.lower())
        if score > 0:
            ux_scores.append((score, row))

    ux_scores.sort(key=lambda x: x[0], reverse=True)
    top_ux = [r for _, r in ux_scores[:5]]

    # Build output
    lines = []
    target = project_name or query

    if output_format == 'markdown':
        lines.append(f"# Design System: {target}\n")
        lines.append(f"**Query:** {query}\n")

        if top_style:
            lines.append(f"\n## Style")
            for k, v in top_style.items():
                if v and k != 'style':
                    lines.append(f"- **{k}:** {v}")
        else:
            lines.append("\n## Style: (no matching style found)")

        if top_colors:
            lines.append(f"\n## Color Palette")
            for c in top_colors:
                palette_name = c.get('Product Type', c.get('palette', 'N/A'))
                primary = c.get('Primary (Hex)', c.get('primary', ''))
                lines.append(f"- **{palette_name}**: Primary {primary}")
        else:
            lines.append("\n## Color Palette: (no matching palette found)")

        if top_ux:
            lines.append(f"\n## UX Guidelines")
            for u in top_ux[:3]:
                rule_name = u.get('Rule', u.get('rule', 'N/A'))
                lines.append(f"- {rule_name}")
    else:
        lines.append("+" + "-" * 78 + "+")
        lines.append(f"|  TARGET: {target[:68]:<68} |")
        lines.append("+" + "-" * 78 + "+")

        if top_style:
            lines.append("|  STYLE RECOMMENDATION")
            for k, v in top_style.items():
                if v:
                    lines.append(f"|  - {k}: {str(v)[:74]:<74} |")
        else:
            lines.append("|  STYLE: (no matching style found)")

        if top_colors:
            lines.append("|  COLOR PALETTE")
            for c in top_colors:
                palette_name = c.get('Product Type', 'N/A')
                primary = c.get('Primary (Hex)', '')
                lines.append(f"|  - {palette_name}: Primary {primary:<50} |")

        if top_ux:
            lines.append("|  UX GUIDELINES")
            for u in top_ux[:3]:
                rule_name = u.get('Rule', u.get('rule', 'N/A'))
                lines.append(f"|  - {rule_name[:74]:<74} |")

        lines.append("+" + "-" * 78 + "+")

    return '\n'.join(lines)


def generate_system_prompt(query=None, context=None):
    """
    Generate a complete system prompt for the AI assistant.
    This combines the skill's core guidelines with optional contextual data.
    """
    # Load component and interaction data
    components = load_csv_data('component')
    interactions = load_csv_data('interaction')
    layouts = load_csv_data('layout')

    # Build component descriptions
    component_desc = []
    for c in components:
        component_desc.append(f"- **{c['component']}**: {c['description']} [Props: {c['props']}]")

    # Build interaction patterns
    interaction_desc = []
    for i in interactions:
        interaction_desc.append(f"- **{i['pattern']}**: {i['trigger']} -> {i['action']}")

    # Build layout patterns
    layout_desc = []
    for l in layouts:
        layout_desc.append(f"- **{l['pattern']}**: {l['structure']} (spacing: {l['spacing']})")

    prompt = f"""You are MiMo, Xiaomi's UI prototype assistant. Date: {context.get('date', '') if context else ''}.

== OUTPUT RULES (CRITICAL) ==
**DO NOT output JSON code blocks in your reply text!**
- JSON must be generated via the modify_canvas_shapes tool
- Reply should only contain: analysis, conclusions, descriptions

== AVAILABLE COMPONENTS ==
{chr(10).join(component_desc)}

== INTERACTION SYSTEM ==
**Triggers**: onClick, onMouseEnter, onMouseLeave, onHover, onLoad, onChange
**Actions**: toggleVisibility, setProps, setVariable, switchState, nextState, prevState, setChecked, toggleChecked, setValue, incrementValue, startAnimation, stopAnimation

**Important**: onMouseLeave will NOT automatically undo onMouseEnter effects. You must manually pair hover interactions.

**Interaction Patterns**:
{chr(10).join(interaction_desc[:8])}

== ICON SYSTEM ==
Use iconPath to reference built-in icons:
- navigation: menu, arrow-left, home, x, chevron-down
- action: plus, minus, check, search, edit, trash, copy
- status: check-circle, alert-circle, loader, clock
- communication: mail, message-circle, phone, bell
- user: user, users, log-in, log-out

**Example**: {{"type": "icon", "props": {{"iconPath": "search", "stroke": "#666666", "strokeWidth": 2, "fill": "#FFFFFF"}}}}

== LAYOUT RULES ==
- Coordinate: (0,0) top-left, x right, y down
- ID format: type-N (e.g., button-1, text-2)
- **No duplicate IDs on the same page!**
- All dimensions must be actual pixel values
- Color format: HEX only (#FFFFFF), no transparent/none/white/black

== GENERATION WORKFLOW ==
**Step 1**: Analyze layout (type, axis, alignment, structure)
**Step 2**: Analyze position/size for each element (x, y, width, height)
**Step 3**: Analyze spacing (margin, padding, spacing standard)
**Step 4**: Analyze hierarchy (z-index, overlap)
**Step 5**: Extract colors from screenshot (do NOT invent colors)
**Step 6**: Call modify_canvas_shapes tool (do NOT output JSON in reply)

== LAYOUT PATTERNS ==
{chr(10).join(layout_desc)}

== DESIGN PRINCIPLES ==
- Maintain consistent visual style
- Use space efficiently, avoid large empty areas
- Colors must match the screenshot exactly
- Do not add colors not present in screenshot

== TOOL FORMAT ==
{{"type": "replace_all|add|update|delete|batch_update", "elements": [...], ...}}

== COMPONENT PROPS ==
- **text**: fill, fontSize, fontFamily
- **rectangle**: fill, stroke, strokeWidth, cornerRadius, text, fontSize, textColor
- **button**: text, fill, cornerRadius, fontSize, textColor
- **icon**: iconPath, stroke, strokeWidth, fill="#FFFFFF"
- **image**: src (URL or base64)
- **dynamicPanel**: width, height, fill, stroke, cornerRadius
- **switch**: checked, fill, fillOff, knobColor
- **checkbox**: checked, checkColor
- **slider**: value, fill, barFill
- **progress**: value, fill, barFill
"""

    return prompt


def get_skill_context(query, max_results=3):
    """Get relevant context from skill data based on query"""
    results = {}

    # Search relevant domains
    for domain in ['component', 'layout', 'ux']:
        search_results = search(query, domain, max_results)
        if search_results.get('results'):
            results[domain] = search_results['results']

    # Get design system
    ds = generate_design_system(query, output_format='markdown')
    results['design_system'] = ds

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MiMo Prototyper Search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Search domain")
    parser.add_argument("--max-results", "-n", type=int, default=MAX_RESULTS, help=f"Max results (default: {MAX_RESULTS})")
    parser.add_argument("--design-system", "-ds", action="store_true", help="Generate design system")
    parser.add_argument("--project-name", "-p", type=str, default=None, help="Project name for design system")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--system-prompt", "-sp", action="store_true", help="Generate system prompt")

    args = parser.parse_args()

    if args.system_prompt:
        print(generate_system_prompt(args.query))
    elif args.design_system:
        result = generate_design_system(args.query, args.project_name, args.format)
        print(result)
    elif args.json:
        result = search(args.query, args.domain, args.max_results)
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        result = search(args.query, args.domain, args.max_results)
        print(format_output(result))


def format_output(result):
    if "error" in result:
        return f"Error: {result['error']}"

    output = []
    output.append(f"## MiMo Prototyper Search Results")
    output.append(f"**Query:** {result['query']} | **Domain:** {result['domain']} | **Found:** {result['count']} results\n")

    for i, row in enumerate(result['results'], 1):
        output.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if len(value_str) > 200:
                value_str = value_str[:200] + "..."
            output.append(f"- **{key}:** {value_str}")
        output.append("")

    return "\n".join(output)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MiMo Prototyper Search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Search domain")
    parser.add_argument("--max-results", "-n", type=int, default=MAX_RESULTS, help=f"Max results (default: {MAX_RESULTS})")
    parser.add_argument("--design-system", "-ds", action="store_true", help="Generate design system")
    parser.add_argument("--project-name", "-p", type=str, default=None, help="Project name for design system")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.design_system:
        result = generate_design_system(args.query, args.project_name, args.format)
        print(result)
    elif args.json:
        result = search(args.query, args.domain, args.max_results)
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        result = search(args.query, args.domain, args.max_results)
        print(format_output(result))
