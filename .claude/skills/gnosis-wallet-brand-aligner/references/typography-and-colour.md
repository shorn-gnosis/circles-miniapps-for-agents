# Typography and Colour

## Overview
Typography is defined via custom fonts and a tokenised scale. Colours are defined in `@theme` and mapped to semantic roles (bg, fg, border). Dark mode swaps semantic tokens under `.dark`.

## Typography
### Fonts
- `--font-body` and `--font-sans`: `Gnosis, -apple-system, ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`
- `--font-display`: `Display, Gnosis, -apple-system, ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`

### Font faces
- Gnosis 600, 500, 400 (woff2)
- Display 400 (ttf)

### Type scale tokens
- Headings: `--text-h1: 2.5rem` / `--spacing-line-height-h1: 3rem`, `--text-h2: 2.25rem` / `--spacing-line-height-h2: 2.75rem`, `--text-h3: 2rem` / `--spacing-line-height-h3: 2.5rem`, `--text-h4: 1.5rem` / `--spacing-line-height-h4: 2rem`, `--text-h5: 1.25rem` / `--spacing-line-height-h5: 1.75rem`
- Body: `--text-xl: 1.125rem` / `--spacing-line-height-xl: 1.625rem`, `--text-lg: 1rem` / `--spacing-line-height-lg: 1.5rem`, `--text-md: 0.875rem` / `--spacing-line-height-md: 1.25rem`, `--text-sm: 0.75rem` / `--spacing-line-height-sm: 1.125rem`, `--text-xs: 0.65rem` / `--spacing-line-height-xs: 1rem`
- Tracking: `--tracking-h1: -0.025rem`, `--tracking-h2: -0.0225rem`
- Weights: normal 400, medium 500, semibold 600, bold 700

### Typography classes
- Display: `typography-h1-display`, `typography-h2-display`, `typography-h3-display`, `typography-h4-display`
- Headings: `typography-h1-*` to `typography-h5-*`
- Body: `typography-body-xl-*`, `typography-body-l-*`, `typography-body-m-*`, `typography-body-s-*`
- Buttons: `typography-button-small`, `typography-button-medium`, `typography-button-large`

## Colour system
### Base colours
- `--color-black: #000000`
- `--color-white: #ffffff`

### Palettes (selected)
- Sage: `--color-sage-10: #f6f7f9`, `--color-sage-500: #828d97`, `--color-sage-950: #191a1a`
- Beige: `--color-beige-10: #faf5f1`, `--color-beige-400: #c6bab1`, `--color-beige-700: #55473b`
- Navy: `--color-navy-400: #b4b5c6`, `--color-navy-800: #303150`, `--color-navy-970: #05061a`
- Green: `--color-green-100: #dcfce7`, `--color-green-500: #22c54b`, `--color-green-900: #145324`
- Amber: `--color-amber-100: #feebc7`, `--color-amber-500: #f79009`, `--color-amber-900: #8a482c`
- Red: `--color-red-100: #fee2e2`, `--color-red-500: #ef4444`, `--color-red-900: #7f1d1d`
- Blue: `--color-blue-500: #4335df`, `--color-blue-700: #0e00a8`, `--color-blue-900: #07052c`
- Orange: `--color-orange-400: #ff7d3e`, `--color-orange-500: #fe5511`, `--color-orange-600: #ef3a07`

### Semantic colours
- Background: `--color-bg: #ffffff`, `--color-bg-muted: var(--color-beige-50)`, `--color-bg-subtle: var(--color-beige-10)`
- Foreground: `--color-fg: var(--color-navy-950)`, `--color-fg-muted: var(--color-navy-700)`, `--color-fg-subtle: var(--color-navy-500)`
- Borders: `--color-border: var(--color-beige-100)`, `--color-border-muted: var(--color-beige-50)`, `--color-border-strong: var(--color-beige-300)`
- Brand: `--color-bg-brand: var(--color-blue-700)`, `--color-fg-brand: var(--color-navy-950)`
- Status: `--color-bg-success: var(--color-green-100)`, `--color-fg-success: var(--color-green-700)`; `--color-bg-danger: var(--color-red-100)`, `--color-fg-danger: var(--color-red-700)`

### Gradients
- `--gradient-the-g-horizontal: linear-gradient(270deg, var(--color-orange-400) 0%, var(--color-blue-500) 50%, var(--color-blue-900) 100%)`
- `--gradient-the-g-vertical: linear-gradient(180deg, var(--color-blue-900) 0%, var(--color-blue-500) 50%, var(--color-orange-400) 100%)`
- Theme classes: `COLOR_THEME_SUNSET`, `COLOR_THEME_MIDNIGHT`, `COLOR_THEME_PEACH`, `COLOR_THEME_THE_G`

## Dark mode
- Apply `.dark` on `documentElement`.
- Semantic tokens remap under `:root.dark` (foregrounds, borders, backgrounds).

## Anti-patterns
- Do not use raw hex values in components except in theme definitions.
- Do not introduce new font families outside `Gnosis` and `Display`.
- Avoid ad-hoc font sizes; use the typography classes or tokens.
