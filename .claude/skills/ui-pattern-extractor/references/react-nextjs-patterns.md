# React / Next.js - Where to Look

Framework-specific guidance for analysing React and Next.js codebases. Read this before starting the deep analysis in the main SKILL.md.

## Project Structure Indicators

### Next.js App Router (modern)
```
src/app/           or  app/
├── layout.tsx          # Root layout - check for providers, fonts, global styles
├── page.tsx            # Home page
├── globals.css         # Global styles - often contains CSS variables
├── (groups)/           # Route groups - layout without URL segment
│   └── layout.tsx      # Group-specific layouts
└── api/                # API routes
```

### Next.js Pages Router (legacy)
```
pages/
├── _app.tsx            # App wrapper - check for providers, global imports
├── _document.tsx       # HTML document - check for font links, meta
├── index.tsx           # Home page
└── api/                # API routes
```

### Standalone React (Vite, CRA, etc.)
```
src/
├── App.tsx             # Root component
├── main.tsx            # Entry point - check for providers
├── index.css           # Global styles
└── components/         # Component tree
```

## Key Files to Examine First

These files typically contain the most concentrated design system information. Check them early to frontload your understanding:

1. **Tailwind config** (`tailwind.config.js/ts`) - If present, this is the single most valuable file. It contains the extended colour palette, custom spacing, font definitions, breakpoints, and any design token overrides.

2. **Global CSS** (`globals.css`, `global.css`, `index.css`) - Look for CSS custom properties (`:root { --primary: ... }`), base resets, and font-face declarations.

3. **Root layout or App wrapper** (`layout.tsx`, `_app.tsx`, `App.tsx`) - Shows global providers, font loading strategy, and layout shell.

4. **Theme config** (`theme.ts`, `theme/index.ts`, `stitches.config.ts`) - If using a theme object or CSS-in-JS, this defines the token system.

5. **Component library barrel** (`components/ui/index.ts`, `components/index.ts`) - Shows what shared primitives exist.

## React-Specific Patterns to Watch For

### Component Composition
- **forwardRef usage** - Are components wrapped in `forwardRef`? This indicates a mature component API.
- **Compound components** - e.g., `<Dialog>`, `<Dialog.Trigger>`, `<Dialog.Content>` - built using Context.
- **Polymorphic components** - `as` prop pattern for rendering different HTML elements.
- **className merging** - Look for `cn()`, `clsx()`, `twMerge()` utilities - these indicate how classes are composed and overridden.

### Styling Patterns
- **CVA (class-variance-authority)** - If present, component variants are defined declaratively. Extract the variant definitions.
- **shadcn/ui** - Check for `components/ui/` with individual component files. These are typically customised copies - document the customisations, not the shadcn defaults.
- **CSS Modules** - Look at how `styles.container` type references map to class names. Note the naming convention within modules.

### State Patterns
- **Server Components vs Client Components** - In Next.js App Router, note which components have `"use client"` and what triggers the client boundary.
- **Server Actions** - Look for `"use server"` in form handling.
- **React Query / SWR** - Check for query key conventions, custom hook wrappers, and how cache invalidation is handled.
- **Zustand / Jotai / Redux** - Look at store organisation, slice patterns, selector conventions.

### Next.js Specifics
- **Image handling** - Is `next/image` used consistently? What are the common width/height/quality settings?
- **Font loading** - `next/font/google` or `next/font/local`? Extract the exact font configuration including subsets and variable names.
- **Metadata** - How is page metadata handled? `generateMetadata` functions, static metadata objects?
- **Dynamic routes** - Bracket notation patterns, `generateStaticParams` usage.

## Common File Locations for Design Tokens

| Token Type | Typical Locations |
|---|---|
| Colours | `tailwind.config`, `globals.css :root`, `theme.ts`, `tokens/colors.ts` |
| Typography | `tailwind.config.theme.fontFamily`, `next/font` config in `layout.tsx`, `globals.css` |
| Spacing | `tailwind.config.theme.spacing`, CSS variables, theme objects |
| Breakpoints | `tailwind.config.theme.screens`, CSS media queries in global styles |
| Shadows | `tailwind.config.theme.boxShadow`, CSS variables, theme objects |
| Border radii | `tailwind.config.theme.borderRadius`, CSS variables |
| Z-indices | `tailwind.config.theme.zIndex`, constants file, CSS variables |

## Watch Out For

- **next/dynamic** imports can hide component patterns - check for lazy-loaded components.
- **Middleware** (`middleware.ts`) may affect routing behaviour - note if present.
- **Parallel routes** and **intercepting routes** in App Router use special folder conventions (`@slot`, `(.)path`).
- **Server-only utilities** (`server-only` package) indicate strict server/client boundaries.