# Component Patterns

## Overview
The app uses Svelte 5 single-file components with runes, snippet-based composition, and a small set of shared primitives. Components are heavily Tailwind-driven with semantic colour tokens via CSS variables.

## Conventions
- Props defined with `$props()` and defaults assigned in destructuring.
- State uses `$state()` and derived values use `$derived()` / `$derived.by()`.
- Composition uses `{#snippet}` and `{@render}` instead of legacy `<slot>`.
- Variants are expressed via data attributes or class switches, not inline styles.
- Components are generally presentational; data comes from `state*.svelte.ts` or utilities.

## Shared primitives and patterns
- Button: variant and size driven via maps and Tailwind classes.
- Page: three-row shell (top, middle scroll, bottom) with view-transition classes.
- Bottom sheet: global overlay system with open/close helpers and animations.
- Navigation: bottom navigation uses snippet icons and `goToTransition` routing.
- Inputs: text inputs use shared layout, validation, and Tailwind tokens.

## Examples
### Button (variants, size maps, snippets)
Source: Button.svelte
- Variants map to background and text colours.
- Size maps define height, padding, gap, and text classes.
- Snippets for `leading` and `trailing` content.

Key pattern:
- Use data attributes for `data-variant` and `data-size`.
- Use `aria-label` for analytics and accessibility.

### Page shell (top/middle/bottom)
Source: Page.svelte
- Grid layout `grid-rows-[auto_1fr_auto]` with middle scroll container.
- Background gradient overlay uses `stateColorTheme.getClassName()`.
- View transitions use `PAGE_COMPONENT` and `DASHBOARD_COMPONENT` classes.

### Bottom navigation
Source: BottomNavigation.svelte
- Tab order is growth-book driven.
- Each link renders icon snippet and label.
- Uses `goToTransition` for view transitions.

### Input text
Source: InputText.svelte
- Grid layout `grid-cols-[auto_1fr_auto]`.
- Validation styles map to semantic border tokens.
- Optional leading/trailing snippets.

## Anti-patterns
- Do not use legacy Svelte 4 `export let` props in new code.
- Do not add inline colours or pixel values that bypass CSS tokens.
- Do not introduce layout wrappers outside the `Page` component for full pages.
- Avoid direct `window.location` routing; use navigation utilities.
