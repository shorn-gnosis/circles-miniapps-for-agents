# State and Data Patterns

## Overview
State is managed through Svelte 5 runes and a `SharedState` helper that supports optional localStorage persistence. Data flows into components via derived values and explicit props.

## Conventions
- Global state is encapsulated in `state*.svelte.ts` files.
- `SharedState<T>` exposes `.current` and `.set()` for updates.
- Components use `$derived()` for computed values and `$effect()` for reactions.
- Side effects are triggered in `+layout.svelte` or `onMount` blocks.

## Values and utilities
- `SharedState` supports persistence with `options.persistence.key`.
- `SharedState` reads/writes JSON to `localStorage` under `state.<key>`.

## Examples
### SharedState
- Constructor reads from localStorage when persistence is enabled.
- `set()` updates state and optionally writes to storage.

### Error handling
- `stateError` extends `SharedState` to add error IDs and controlled logging.

### Navigation history
- `stateNavigation` stores a stack of route paths and exposes `removeItem`.

## Anti-patterns
- Avoid direct `localStorage` access in components; use `SharedState`.
- Avoid global mutable exports without the `SharedState` wrapper.
- Avoid heavy logic in components; keep it in utilities or state modules.
