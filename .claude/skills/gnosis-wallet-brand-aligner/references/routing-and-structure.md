# Routing and Structure

## Overview
This is a SvelteKit app with route groups and client-side rendering only. The root layout initialises global behaviour and renders the page shell and overlays.

## Conventions
- Routing uses SvelteKit file-based routes in `src/routes`.
- Grouped routes use parentheses, for example `(authenticated)` or `(unauthenticated)`.
- The root layout disables SSR and prerender.
- Use `$app/navigation` helpers instead of direct URL changes.

## Structure
- Root layout: `+layout.svelte` bootstraps global behaviour and overlays.
- Root load: `+layout.ts` registers analytics, growthbook, and service worker.
- Global styles: `src/app.css` imports all CSS layers.

## Examples
- Route groups: `(authenticated)/`, `(unauthenticated)/`, `(email_recovery)/`.
- Error page: `+error.svelte` in routes root.
- Desktop-only flows: `desktop/` route group.

## Anti-patterns
- Do not enable SSR unless the whole layout is audited for it.
- Avoid introducing route files outside the established groups.
- Avoid direct `window.location` navigation for in-app transitions.
