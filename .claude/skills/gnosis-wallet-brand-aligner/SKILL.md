---
name: gnosis-wallet-brand-aligner
description: Apply the Gnosis Wallet visual language to any app by aligning layout, typography, colour, and component patterns with the wallet UI design system. Use this skill when asked to rebrand, restyle, or make another app match the Gnosis wallet look and feel.
---

# Gnosis Wallet Brand Aligner

This skill aligns any app to the Gnosis wallet UI system. It is optimised for Svelte/SvelteKit apps, but can be adapted to other frameworks by applying the same tokens and component conventions.

## Primary source of truth
Use the bundled references in this skill folder:
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/README.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/component-patterns.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/styling-guide.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/layout-patterns.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/typography-and-colour.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/state-and-data.md
- ~/.claude/skills/gnosis-wallet-brand-aligner/references/routing-and-structure.md

If you need a single-file summary, use the concise rules below for quick alignment, then refer to the docs for exact values.

## Concise alignment rules (single-file version)
### Framework and style
- SvelteKit + Svelte 5 runes pattern.
- Tailwind CSS v4 utilities, CSS variables defined in `@theme` (app.css).
- Dark mode via `.dark` on `documentElement` and semantic token overrides.

### Layout
- Fixed desktop viewport: max-width 500px, centred (`DESKTOP_VIEWPORT`).
- Page shell uses the `Page` component with 3 rows: top, scrollable middle, bottom.
- View transitions via `PAGE_COMPONENT` and `DASHBOARD_COMPONENT` classes.
- Use safe-area helpers (`pt-safe`, `pb-safe`, `px-safe`).

### Typography
- Fonts: `Gnosis` for body, `Display` for uppercase display styles.
- Use typography classes (e.g., `typography-body-l-medium`, `typography-h2-semibold`).
- Avoid ad-hoc sizes; rely on tokens from `@theme` or typography classes.

### Colour
- Use semantic tokens like `bg-bg`, `text-fg`, `text-fg-muted`, `border-border`.
- Brand emphasis uses `bg-bg-brand` and `text-fg-brand`.
- Status colours use tokenised success/danger/attention variants.
- Do not add raw hex in components.

### Components
- Buttons: variant/size maps, rounded-full, `typography-body-l-medium`, size-based height/padding.
- Inputs: rounded-xl, border tokens, subtle background, validation borders.
- Modals and sheets: use bottom-sheet system with overlay and blur.
- Navigation: bottom navigation with snippet icons and `goToTransition`.

### Motion
- View transitions use duration 400ms and easing cubic-bezier(0.35, 0.15, 0, 1).
- Page enter animation uses subtle scale/opacity.

## Workflow
1. Identify the target app framework and styling system.
2. Map the app's global tokens to the wallet tokens (or add them if missing).
3. Replace layout shell with the wallet `Page` pattern or equivalent in the framework.
4. Update typography to wallet classes and font stacks.
5. Update colours to semantic tokens (no raw colours).
6. Update key primitives (button, input, card, navigation).
7. Verify dark mode behaviour with `.dark` class and token overrides.

## Output expectations
- Any new UI should look and behave like the wallet app.
- All spacing, typography, colour, and motion should align to the wallet tokens.
- Avoid introducing new tokens or component conventions unless explicitly requested.
