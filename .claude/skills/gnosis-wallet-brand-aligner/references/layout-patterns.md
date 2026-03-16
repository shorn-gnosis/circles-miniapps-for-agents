# Layout Patterns

## Overview
The app is built for a fixed-width mobile viewport even on desktop. The main shell uses a three-row grid with a scrollable middle region, and top/bottom areas for header and navigation. Overlays use a bottom sheet modal system.

## Conventions
- Use the `Page` component to structure full-page layouts.
- Keep main viewport within 500px width using the `DESKTOP_VIEWPORT` class.
- Use `PAGE_COMPONENT` or `DASHBOARD_COMPONENT` classes to enable view transitions.
- Use safe-area padding in bottom areas (`pb-safe`) for iOS compatibility.

## Values
- Desktop viewport: `max-width: 500px; margin-left/right: auto`.
- Page shell: `grid-rows-[auto_1fr_auto]` with full-height middle scroll.
- Gradient header: top overlay `h-80` with `rounded-b-2xl`.

## Examples
### Page shell
From Page.svelte:
- `grid h-screen w-full grid-rows-[auto_1fr_auto] {background}`
- Middle scroll: `relative h-full overflow-y-auto overscroll-y-none`.

### Bottom navigation
From BottomNavigation.svelte:
- `grid w-full auto-cols-fr grid-flow-col items-center justify-items-center px-3 pb-safe`.

### Bottom sheet
From BottomSheet.svelte:
- Fixed overlay with `inset-0`, `z-60`, `h-screen`, and `rounded-t-3xl`.
- Modal-style uses `mx-4` and `rounded-b-3xl`.

## Anti-patterns
- Avoid custom page wrappers that bypass `Page`.
- Avoid multi-column layouts for main screens; use vertical stacking.
- Avoid fixed heights that break the 100dvh behaviour.
