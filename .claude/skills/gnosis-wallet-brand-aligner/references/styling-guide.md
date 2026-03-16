# Styling Guide

## Overview
Styling is Tailwind CSS v4 plus global CSS. Design tokens are defined in `@theme` in app.css and referenced via Tailwind utilities (e.g., `bg-bg`, `text-fg-muted`). Dark mode is driven by `.dark` on `:root` with token overrides.

## Conventions
- Use Tailwind utilities for layout, spacing, colours, and typography.
- Use CSS variables from `@theme` for tokens, not raw hex values.
- Use safe-area utilities for iOS (`pt-safe`, `pb-safe`, etc.).
- Use view transitions defined in transitions.css with `PAGE_COMPONENT` or `DASHBOARD_COMPONENT` classes.

## Values
### Spacing
- `--spacing-gno-page: 1.5rem`
- `--spacing-gno-page-internal: 1rem`
- `--spacing-gno-bottom-space: 2rem`
- `--spacing-xl: 1.125rem`, `--spacing-lg: 1rem`, `--spacing-md: 0.875rem`, `--spacing-sm: 0.75rem`, `--spacing-2xl: 1.25rem`

### Heights and widths
- `--height-gno-button: 50px`
- `--max-width-gno-button-square: 50px`
- `--min-height-gno-page-content: calc(100dvh - 2rem)`
- `--max-bottom-sheet-height: calc(100vh - 60px)`

### Borders and rings
- `--border-width: 1px`, `--border-width-1_5: 1.5px`, `--border-width-2: 2px`, `--border-width-3: 3px`
- `--ring-width: 1px`, `--ring-width-0: 0px`
- `--outline-width: 1px`, `--outline-width-0: 0px`

### Radii
- `--radius-sm: 0.25rem`, `--radius-md: 0.375rem`, `--radius-lg: 0.5rem`
- `--radius-xl: 0.75rem`, `--radius-2xl: 1rem`, `--radius-3xl: 1.5rem`

### View transitions
- `--view-transition-duration: 400ms`
- `--view-transition-easing: cubic-bezier(0.35, 0.15, 0, 1)`

## Utilities and helpers
- `.gno-container` is a global utility with padding `1.5rem 1rem 0.75rem`.
- `.no-scrollbar` hides scrollbars while preserving scroll.
- Safe area helpers: `pt-safe`, `pb-safe`, `px-safe`, `py-safe`, `top-safe`, `bottom-safe`.
- Global input styling in inputs.css: rounded, bordered, token-based colours.

## Examples
### Input base
- `rounded-xl border border-border bg-bg px-4 py-3 text-fg placeholder-fg-muted`
- Focus uses `outline-color: var(--color-border-primary)`.

### Button base (from Button.svelte)
- `rounded-full`, size-based height/padding, `typography-body-l-medium`, `transition-all duration-200`.

### Skeleton
- `.SKELETON` uses a `bg-bg-subtle` overlay with rounded corners.

## Anti-patterns
- Do not introduce hard-coded colours for UI states.
- Do not disable view transitions unless the component is part of the transitions system.
- Avoid bespoke spacing values that are not part of the tokens.
