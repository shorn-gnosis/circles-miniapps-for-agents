---
name: ui-pattern-extractor
description:  Analyse a frontend codebase to extract its complete UI design system - component patterns, styling approach, theming tokens, layout conventions, and structural patterns - then produce a set of agent-consumable reference documents that enable any AI agent to build new features or entire applications in exactly the same visual style and component architecture. Use this skill whenever the user wants to reverse-engineer a repo's design patterns, extract a design system from existing code, create a style guide from a codebase, prepare instructions for an agent to replicate a UI style, audit frontend patterns for consistency, or says anything like "analyse this repo's frontend", "extract the design system", "I want to build something that looks like this app", or "create a style reference from this codebase". Also trigger when the user mentions replicating, matching, or extending an existing app's look and feel. Supports React, Next.js, Svelte, and SvelteKit.
---
---

# UI Pattern Extractor

Reverse-engineer a frontend codebase's design system and produce structured reference documents that an AI agent can use to build new features or applications in exactly the same style.

## Overview

This skill analyses an existing frontend repo and produces a `ui-design-system/` directory containing separate reference files for each concern - components, styling, layout, typography, colour, state management, and routing. A central README acts as the agent entry point, guiding it to the right files based on what it's building.

The goal is concrete and actionable output. Every reference file should contain real values extracted from the codebase - actual hex codes, actual font stacks, actual spacing values, actual component composition patterns. An agent consuming these files should be able to reproduce the look, feel, and structure of the original app without guessing.

## Step 1: Identify the Framework and Codebase Structure

Before analysing anything, determine what you're working with.

Examine the repo root for framework indicators:
- `next.config.js` / `next.config.ts` / `next.config.mjs` - Next.js
- `svelte.config.js` + `src/routes/` - SvelteKit
- `svelte.config.js` without routes - Svelte
- `package.json` with `react` / `react-dom` - React (standalone)

Check the styling approach:
- `tailwind.config.js` / `tailwind.config.ts` - Tailwind CSS
- `*.module.css` / `*.module.scss` files - CSS Modules
- `styled-components` or `@emotion` in package.json - CSS-in-JS
- `src/styles/` or `src/theme/` directories - Custom theme system
- Global CSS files and where they're imported

Once identified, read the appropriate framework reference:
- **React / Next.js** - Read `references/react-nextjs-patterns.md`
- **Svelte / SvelteKit** - Read `references/svelte-sveltekit-patterns.md`

These references contain framework-specific guidance on where to look and what patterns to expect. Read the relevant one before proceeding.

## Step 2: Deep Analysis

Work through each of these areas systematically. The value of this skill is in the specificity of what gets extracted - surface-level observations aren't useful to an agent that needs to replicate the exact style.

### 2a. Component Patterns

Analyse the component directory structure and identify:
- **Naming conventions** - PascalCase, kebab-case, how files map to component names
- **File organisation** - Co-located styles? Index barrels? Flat or nested?
- **Composition patterns** - How are complex UIs built up from primitives? Wrapper/container patterns, compound components, render props, slot patterns?
- **Prop conventions** - Common prop names, typing patterns, default value conventions
- **Shared primitives** - Button, Input, Card, Modal, etc. - what base components exist and how are they structured?
- **Component variants** - How does the codebase handle variations (size, colour, state)? Props, className overrides, variant props, compound selectors?

Look at 8-12 representative components to identify consistent patterns. Prioritise components that are clearly shared/reusable (typically in `components/ui/`, `components/common/`, or `lib/components/`).

### 2b. Styling and Theming

Extract the actual design tokens and styling methodology:
- **Colour palette** - Every colour value used, organised by role (primary, secondary, accent, background, surface, text, border, error, success, warning). Extract the actual hex/rgb/hsl values.
- **Colour semantics** - How are colours assigned to purposes? CSS variables? Theme objects? Tailwind config?
- **Dark/light mode** - Is there theme switching? How is it implemented? What changes between modes?
- **Spacing scale** - The actual spacing values used (e.g., 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px). Are they following a system (4px grid, 8px grid)?
- **Border radius values** - What radii are used and where?
- **Shadow definitions** - Box shadows, text shadows, elevation system
- **Transition/animation defaults** - Common durations, easing functions, animation patterns
- **Z-index scale** - If there's a layering system, document it

### 2c. Typography

Extract the full typographic system:
- **Font families** - The exact font-family strings, including fallbacks. Where are fonts loaded from (Google Fonts, local files, CDN)?
- **Font scale** - Every font-size value used, mapped to where it's applied (headings, body, captions, labels, etc.)
- **Font weights** - Which weights are used and for what purposes
- **Line heights** - The line-height values paired with each size
- **Letter spacing** - Any tracking adjustments
- **Text colour assignments** - Which colours map to which text roles (heading, body, muted, link, etc.)

### 2d. Layout Patterns

Document how pages and sections are structured:
- **Grid system** - CSS Grid, Flexbox patterns, or a framework grid? Column counts, gap values, max-widths
- **Page shells** - How is the main layout structured (sidebar + content, top nav + main, etc.)?
- **Responsive breakpoints** - The exact breakpoint values and what changes at each
- **Container widths** - Max-width values for content areas
- **Section spacing** - Vertical rhythm between page sections
- **Common layout compositions** - Header/content/footer, sidebar layouts, card grids, list views

### 2e. State and Data Patterns

Understand how the app manages state and fetches data:
- **State management** - Context, Redux, Zustand, Svelte stores, signals? How is global vs local state handled?
- **Data fetching** - Server components, SWR, React Query, SvelteKit load functions, fetch patterns
- **Loading states** - How are loading/skeleton/placeholder states handled visually?
- **Error states** - Error boundaries, error UI patterns, toast notifications
- **Form patterns** - Form libraries, validation approach, input handling conventions
- **Shared hooks/utilities** - Custom hooks or utility functions that are used across components

### 2f. Routing and File Structure

Document the structural conventions:
- **Route organisation** - File-based routing structure, route grouping, nested layouts
- **Navigation patterns** - How navigation works (links, programmatic navigation, breadcrumbs)
- **Page structure convention** - Do pages follow a template? Common page-level patterns?
- **API routes** - If present, how are they structured?
- **Naming conventions** - File and folder naming patterns across the codebase

## Step 3: Produce the Output

Create a `ui-design-system/` directory with the following files. Each file should be written as instructions for an AI agent - direct, imperative, and packed with concrete values.

### Output Structure

```
ui-design-system/
├── README.md
├── component-patterns.md
├── styling-guide.md
├── layout-patterns.md
├── typography-and-colour.md
├── state-and-data.md
└── routing-and-structure.md
```

### README.md

The README is the agent's entry point. It should contain:

1. **Framework and tooling summary** - What framework, what styling approach, what key dependencies
2. **Quick reference** - A short description of what each file covers
3. **Task-based routing** - Tell the agent which files to read based on what it's doing:
   - "Building a new page?" - Read `component-patterns.md`, `layout-patterns.md`, `routing-and-structure.md`
   - "Adding a new component?" - Read `component-patterns.md`, `styling-guide.md`
   - "Theming or styling work?" - Read `typography-and-colour.md`, `styling-guide.md`
   - "Adding data fetching or state?" - Read `state-and-data.md`
   - "Extending navigation or adding routes?" - Read `routing-and-structure.md`
4. **Critical conventions** - The 3-5 most important "do it this way, not that way" rules that apply across the board

### Writing Style for Output Files

Each reference file should follow this structure:
- **Overview** - One paragraph on the approach and philosophy
- **Conventions** - The rules and patterns, with concrete examples
- **Values** - The actual extracted values (colours, sizes, fonts, etc.) presented in a format an agent can directly use
- **Examples** - 2-3 real examples pulled from the codebase showing the pattern in action (component snippets, style blocks, layout structures)
- **Anti-patterns** - Things to avoid, based on what the codebase does NOT do

When including code examples, use actual code from the repo (or close adaptations of it). Don't invent generic examples - the whole point is capturing this specific codebase's patterns.

Write as if you're briefing a developer who's about to start contributing. Be specific and opinionated:

- "Use `gap-4` for card grid spacing, `gap-6` for section spacing" - not "use appropriate spacing"
- "Buttons use the `<Button>` component with variant prop: `primary`, `secondary`, `ghost`, `destructive`" - not "the codebase has a button component with variants"
- "Page max-width is 1280px, centred with `mx-auto`" - not "pages have a max-width container"

The files should be useful enough that an agent could build a pixel-accurate new feature without ever looking at the original codebase.

## Important Notes

- If the codebase is inconsistent (some components follow one pattern, others follow another), document the dominant pattern and note the inconsistencies. The agent should follow the majority pattern.
- If the codebase uses a component library (shadcn/ui, Radix, Skeleton, etc.), document which library and how it's customised - not the library's defaults.
- If theming values live in a config file (tailwind.config, theme.ts, CSS custom properties), extract the values directly from those files - they're the source of truth.
- Don't document third-party library APIs. Focus on how the codebase uses them and what conventions wrap them.
- Keep each output file under 300 lines. If a section is getting too long, you're probably including too much low-value detail. Prioritise patterns that an agent will actually need when building new features.