# Svelte / SvelteKit - Where to Look

Framework-specific guidance for analysing Svelte and SvelteKit codebases. Read this before starting the deep analysis in the main SKILL.md.

## Project Structure Indicators

### SvelteKit
```
src/
├── routes/              # File-based routing
│   ├── +layout.svelte   # Root layout - check for nav, providers, global structure
│   ├── +layout.ts       # Root layout load function
│   ├── +page.svelte     # Home page
│   ├── +error.svelte    # Error page
│   └── (groups)/        # Route groups
│       └── +layout.svelte
├── lib/                 # Shared code ($lib alias)
│   ├── components/      # Reusable components
│   ├── stores/          # Svelte stores
│   ├── utils/           # Utility functions
│   └── server/          # Server-only code ($lib/server)
├── app.html             # HTML template - check for font links, base structure
├── app.css / app.pcss   # Global styles
└── hooks.server.ts      # Server hooks - middleware equivalent
```

### Standalone Svelte (Vite)
```
src/
├── App.svelte           # Root component
├── main.ts              # Entry point
├── app.css              # Global styles
└── lib/
    └── components/      # Component tree
```

## Key Files to Examine First

1. **Tailwind / PostCSS config** - Same as React. If `tailwind.config.js` exists, it's the primary token source.

2. **Global styles** (`app.css`, `app.pcss`, `global.css`) - CSS custom properties, base resets, font-face declarations. Svelte projects often lean more heavily on global CSS variables than React projects.

3. **Root layout** (`+layout.svelte`) - Shows the page shell, navigation structure, and any global component wrapping.

4. **$lib/components/** - The shared component library. Svelte components are single-file (`.svelte`) with markup, script, and style co-located.

5. **Svelte config** (`svelte.config.js`) - Check for preprocessors (scss, postcss), aliases, and adapter configuration.

## Svelte-Specific Patterns to Watch For

### Component Composition
- **Single-file components** - Svelte co-locates `<script>`, markup, and `<style>` in one `.svelte` file. Note the ordering convention used in the codebase (script-first vs markup-first).
- **Slot patterns** - Svelte uses `<slot>` (Svelte 4) or `{@render children()}` (Svelte 5) for composition. Check which version is in use.
- **Named slots** - `<slot name="header">` allows multiple insertion points. Document which components use named slots and what the slot names are.
- **Component events** - Svelte 4 uses `createEventDispatcher()` and `on:event`. Svelte 5 uses callback props. Note which pattern the codebase follows.
- **Snippet blocks** - Svelte 5 introduces `{#snippet}` blocks as an alternative to slots. Check if these are used.

### Svelte 4 vs Svelte 5 (Runes)
This is critical to identify early as it affects every pattern:

**Svelte 4 indicators:**
- `export let prop` for component props
- `$:` reactive declarations
- `on:click`, `on:change` event syntax
- `createEventDispatcher()`
- `<slot>` for composition
- Stores accessed with `$storeName` auto-subscription

**Svelte 5 indicators:**
- `let { prop } = $props()` for component props
- `$state()`, `$derived()`, `$effect()` runes
- `onclick`, `onchange` (lowercase, no colon) event attributes
- Callback props instead of dispatched events
- `{@render children()}` instead of `<slot>`
- `$state` for reactive state (stores still work but runes are preferred)

Document which version the codebase uses. If it's mid-migration, note both patterns and which is preferred for new code.

### Styling Patterns
- **Scoped styles** - Svelte styles are scoped by default. Look for `:global()` usage to understand where scoping is intentionally broken.
- **CSS variables for theming** - Svelte projects commonly use `--css-variables` passed through `style:` directives for component-level theming.
- **Style directives** - `style:color={value}` for dynamic inline styles.
- **Class directives** - `class:active={isActive}` for conditional classes. Note the naming convention.
- **Preprocessors** - Check `svelte.config.js` for SCSS, PostCSS, or other preprocessor usage.

### State Patterns
- **Svelte stores** (`writable`, `readable`, `derived`) - Look in `$lib/stores/` for store definitions. Note naming conventions and how stores are composed.
- **Context API** - `setContext()` / `getContext()` for dependency injection. Check what's provided at the layout level.
- **Page and navigation stores** - `$page`, `$navigating` from `$app/stores` - how does the codebase use these?

### SvelteKit Specifics
- **Load functions** - `+page.ts` (universal) vs `+page.server.ts` (server-only). Note the convention the codebase follows and how data flows to components.
- **Form actions** - `+page.server.ts` with `actions` export. Check for `use:enhance` on forms.
- **Layout data** - How data cascades through `+layout.ts` / `+layout.server.ts` to child routes.
- **Error handling** - `+error.svelte` pages, `handleError` hook, how errors are displayed.
- **Adapters** - Check `svelte.config.js` for the adapter (auto, node, static, vercel, etc.) as it affects what's possible.
- **Route parameters** - `[param]`, `[...rest]`, `[[optional]]` patterns.
- **Page options** - `export const prerender`, `export const ssr`, `export const csr` in `+page.ts`.

## Common File Locations for Design Tokens

| Token Type | Typical Locations |
|---|---|
| Colours | `tailwind.config`, `app.css :root`, `$lib/styles/variables.css`, theme stores |
| Typography | `tailwind.config`, `app.html` font links, `app.css`, `+layout.svelte` |
| Spacing | `tailwind.config`, CSS variables, component-level `<style>` blocks |
| Breakpoints | `tailwind.config`, CSS media queries, `$lib/utils/breakpoints.ts` |
| Shadows | `tailwind.config`, CSS variables |
| Border radii | `tailwind.config`, CSS variables |

## Component Libraries to Watch For

- **Skeleton UI** - Check for `@skeletonlabs/skeleton` in package.json. Uses Tailwind + CSS variables for theming.
- **shadcn-svelte** - Port of shadcn/ui for Svelte. Look for `$lib/components/ui/` with bits-ui primitives.
- **Melt UI** - Headless component library. Look for `@melt-ui/svelte` - document the wrapper patterns.
- **DaisyUI** - Tailwind component classes. Check `tailwind.config` plugins.
- **Flowbite Svelte** - Check for `flowbite-svelte` in dependencies.

## Watch Out For

- **`$lib` alias** resolves to `src/lib/` - all shared code lives here.
- **`$app` imports** (`$app/stores`, `$app/navigation`, `$app/environment`) are SvelteKit-specific runtime modules.
- **Progressive enhancement** - SvelteKit defaults to working without JavaScript. Check if the codebase relies on this or opts out with `export const csr = true`.
- **Svelte transitions and animations** - `transition:`, `in:`, `out:`, `animate:` directives. Document which transition functions are used and where custom ones are defined.
- **Actions** - `use:action` directives for reusable DOM behaviour. Check `$lib/actions/` or similar directories.