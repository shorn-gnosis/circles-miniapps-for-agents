# Gnosis Wallet UI Design System

## Framework and tooling
- Framework: SvelteKit with Svelte 5 runes.
- Styling: Tailwind CSS v4 utilities plus CSS variables defined via `@theme` in global CSS.
- Theming: CSS variables for palettes and semantic roles, dark mode via `.dark` on `:root`.
- Layout: Single-column, mobile-first with a fixed max width (500px) for desktop.

## Quick reference
- component-patterns.md: Component structure, composition, slots/snippets, and shared primitives.
- styling-guide.md: Tailwind usage, CSS utilities, tokens, safe-area helpers, and transitions.
- layout-patterns.md: Page shell, navigation, and layout composition rules.
- typography-and-colour.md: Fonts, type scale, and colour system with concrete values.
- state-and-data.md: Svelte runes, SharedState, and data flow patterns.
- routing-and-structure.md: SvelteKit routes, layouts, and file organisation.

## Task-based routing
- Building a new page: read component-patterns.md, layout-patterns.md, routing-and-structure.md.
- Adding a new component: read component-patterns.md, styling-guide.md.
- Theming or styling work: read typography-and-colour.md, styling-guide.md.
- Adding data/state: read state-and-data.md.
- Extending navigation or routes: read routing-and-structure.md, layout-patterns.md.

## Critical conventions
1. Use Svelte 5 runes: `$props()`, `$state()`, `$derived()`, `$effect()`.
2. Use Tailwind utilities plus CSS variables from `@theme`; do not add ad-hoc colours.
3. Use the shared page shell via the `Page` component and the bottom sheet system for overlays.
4. Keep layouts within the desktop viewport width (max 500px) and use safe-area helpers.
5. Use snippet-based composition (`{#snippet}` / `{@render}`) instead of legacy slots.
