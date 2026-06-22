# Styling & Design Tokens

This library ships a small, opinionated design system built on three pillars:

1. **Tailwind CSS v4** as the utility engine (`@tailwindcss/vite`).
2. **oklch() color palettes** with tapered chroma curves to stay in-gamut.
3. **A `--L` / `--D` space-toggle** for theming — pure CSS, no JS shim, no `light-dark()` fallback dance.

All tokens live in `packages/theme/src/`. Per-component CSS files `@reference "@wimwian-org/theme"` so `@apply` resolves without re-emitting the bundle.

## 1. File Layout

```
packages/theme/src/
├── index.css        # Full bundle: @import tailwindcss + tailwind.css + tokens + tints + typography
├── tailwind.css     # @theme block: raw palette custom properties (mono, primary, …)
├── tokens.css       # --L/--D toggle, ground scale (--color-g-*), content scale (--color-c-*), elevation tokens
├── tints.css        # @utility primary/secondary/error/warning/success
└── typography.css   # @utility heading-*, subtitle-*, body-*, code-*, svg-*, elevation-*
```

`apps/playground/src/routes/+layout.svelte` imports `@wimwian-org/theme` once. Each future bit's own `.css` file `@reference`s `"@wimwian-org/theme"` and adds component rules in `@layer components`.

## 2. Theme Registers — the `--L` / `--D` trick

```css
:root {
    color-scheme: light;
    --L: initial;
    --D: ;
}
@media (prefers-color-scheme: dark) {
    :root {
        color-scheme: dark;
        --L: ;
        --D: initial;
    }
}
html[data-theme='light'] {
    color-scheme: light;
    --L: initial;
    --D: ;
}
html[data-theme='dark'] {
    color-scheme: dark;
    --L: ;
    --D: initial;
}
```

Why this works:

- `initial` is a **guaranteed-invalid value** for a custom property, so `var(--L, X)` falls back to `X` when `--L: initial`.
- The empty value (`--D: ;`) makes `var(--D, Y)` resolve to **nothing**.
- So `var(--L, LIGHT) var(--D, DARK)` resolves to `LIGHT` in light mode and `DARK` in dark mode, in every browser, with no `@supports` fallback or `light-dark()` polyfill.

Priority: `data-theme` attribute > `prefers-color-scheme` > light default.

## 3. Palettes

All raw palettes live inside `@theme static { ... }`. `static` forces Tailwind to emit every token even if no utility uses it (the docs/colors page needs them all).

### `mono` — neutral gray

21 steps from `mono-0` (white) to `mono-1000` (black), in even 0.05 lightness increments. Chroma = 0.

```css
--color-mono-0: oklch(1 0 0);
--color-mono-50: oklch(0.95 0 0);
--color-mono-100: oklch(0.9 0 0);
/* ...every 0.05... */
--color-mono-1000: oklch(0 0 0);
```

### Chromatic palettes

`primary` (blue), `secondary` (purple), `error` (red), `warning` (amber), `success` (green). Each has 11 steps (50, 100, …, 950).

- **Lightness** ramps linearly: `50 = 0.97`, `500 = 0.5`, `950 = 0.03`.
- **Chroma** is bell-tapered around step 500 to stay in sRGB: `0.10 → 0.22 → 0.42 → 0.65 → 0.88 → 1.00 → 0.95 → 0.78 → 0.55 → 0.30 → 0.10`, multiplied by the palette's peak chroma.
- **Hue** is constant per palette, with one exception: `warning-500` is re-anchored to H 105 because amber at H 86 reads muddy at peak chroma.

| Palette   | Base chroma | Hue            |
| --------- | ----------- | -------------- |
| primary   | 0.16        | 236            |
| secondary | 0.16        | 296            |
| error     | 0.17        | 25             |
| warning   | 0.17        | 86 (500 → 105) |
| success   | 0.17        | 162            |

## 4. Ground & Content Scales

The palettes are raw. Components use two **alias scales** that flip with the theme:

### Ground (`--color-g-*`) — neutral

Maps to `mono-*` in light mode and the mirror step in dark mode:

```css
--color-g-50: var(--L, var(--color-mono-50)) var(--D, var(--color-mono-950));
--color-g-100: var(--L, var(--color-mono-100)) var(--D, var(--color-mono-900));
/* ... mirror pairs: light step X uses dark step (1000-X) ... */
```

Use ground tokens for backgrounds, borders, and text that should stay neutral regardless of tint.

### Content (`--color-c-*`) — retintable

By default, `--color-c-*` aliases `--color-g-*`. A **tint utility** (`.primary`, `.error`, …) redeclares `--color-c-*` to a different palette:

```css
@utility primary {
    --color-c-0: var(--L, var(--color-primary-50)) var(--D, var(--color-primary-950));
    --color-c-100: var(--L, var(--color-primary-100)) var(--D, var(--color-primary-900));
    /* ... */
}
```

A `<button class="primary">` retints every `--color-c-*` it owns; nested elements that read `--color-c-*` inherit the tint.

## 5. Structural Tokens

Three elevation levels — each has `-bg`, `-fg`, `-border`, and (for canvas/surface) `-border-bold`:

| Token group   | Use for                                 | Reads                               |
| ------------- | --------------------------------------- | ----------------------------------- |
| `--page-*`    | Document background                     | `--color-g-50` / `g-950` / `g-400`  |
| `--canvas-*`  | Cards, panels, sections                 | `--color-g-100` / `g-900` / `g-500` |
| `--surface-*` | Interactive surfaces (buttons, dialogs) | `--color-c-*`                       |

Because `--surface-*` reads `--color-c-*`, a tinted parent (`.error`) cascades down: the surface inside it is automatically error-tinted.

### Semantic surface tokens — fixed-hue state colours

`--surface-*` follows the content tint, so it can't express a colour that must stay a **fixed
semantic** regardless of the element's tint (an invalid border is red even on a `.primary` field; a
toast's "success" green is green in any context; a presence dot's "busy" red is always red).

For those, use the **semantic surface tokens** — one group per named palette
(`primary`, `secondary`, `error`, `warning`, `success`), pinned to that palette and `--L`/`--D`-flipped
so they stay theme-correct in both modes. Components must **never** reach into a raw palette
(`var(--color-error-600)`) for state styling — read these tokens instead.

| Facet                         | Reads (light / dark) | Use for                                    |
| ----------------------------- | -------------------- | ------------------------------------------ |
| `--surface-<sem>-bg`          | `100` / `900`        | soft container fill (toast/banner bg)      |
| `--surface-<sem>-bg-muted`    | `200` / `800`        | muted fill (a track behind a bar)          |
| `--surface-<sem>-fg`          | `800` / `200`        | text / icon on the soft fill               |
| `--surface-<sem>-border`      | `300` / `700`        | soft border, focus halo                    |
| `--surface-<sem>-accent`      | `500` (invariant)    | mid-emphasis line: invalid border, ring    |
| `--surface-<sem>-solid`       | `600` / `400`        | strong fill / strong border, solid control |
| `--surface-<sem>-solid-hover` | `700` / `300`        | strong fill, hovered                       |
| `--surface-<sem>-solid-fg`    | `50` / `950`         | text / icon on the strong fill             |

`<sem>` ∈ `primary | secondary | error | warning | success`. Example: an invalid input sets
`border-color: var(--surface-error-accent)`; a Sonner success toast reads `--surface-success-bg/-border/-fg`.
The only raw-palette refs left in component CSS are the `--color-mono-1000` modal scrims and shadows
(neutral black, no semantic-surface equivalent).

## 6. Tailwind Utility Classes

Tailwind v4 emits a class for every `@theme` token. So you can write:

| Token                 | Utility                                                    |
| --------------------- | ---------------------------------------------------------- |
| `--color-primary-500` | `bg-primary-500`, `text-primary-500`, `border-primary-500` |
| `--color-g-100`       | `bg-g-100`, `text-g-100`, `border-g-100`                   |
| `--color-c-600`       | `bg-c-600`, `text-c-600`, `border-c-600`                   |
| `--color-mono-200`    | `bg-mono-200`, `text-mono-200`, `border-mono-200`          |

Inside `@layer components` you can `@apply` them.

## 7. Component CSS Convention

Each bit has its own CSS file beside it (in the `components/` workspace):

```css
/* components/button/src/button.css */
@reference "@wimwian-org/theme";

@layer components {
    .btn {
        @apply focus-visible:outline-c-500 inline-flex cursor-pointer items-center justify-center rounded-md border font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50;
    }
    .btn-solid {
        @apply bg-c-600 text-c-0 border-c-600 hover:bg-c-700 hover:border-c-700 active:bg-c-800 active:border-c-800;
    }
    /* ... */
}
```

Rules:

- **`@reference "@wimwian-org/theme"`** so `@apply` finds tokens. `@reference` does **not** re-emit the imported stylesheet.
- **Always `@layer components`** so consumer utilities still win.
- **Read tokens, not literals.** Never `@apply bg-blue-500`.
- **Variants ride on `--color-c-*`.** Switching tint should change the look without rewriting variant classes.
- **Cap inline utilities at 3; name classes after the component.** How class strings are split between template and CSS — the ≤3-utilities rule, `Card.Root` → `.card-root` naming, and descendant selectors like `.card-root span` — is specified in [css-authoring.md](css-authoring.md).

## 8. Typography Utilities

`packages/theme/src/typography.css` exposes a scale of typography utilities you can `@apply`:

- **Headings:** `heading-3xl` (48px) → `heading-sm` (18px). Bold, tight tracking, no leading.
- **Subtitles:** `subtitle-xl` (24px) → `subtitle-xs` (12px). Semi-bold small-caps for labels and badges.
- **`small-caps`** modifier — `capitalize` + `font-variant-caps: small-caps`.

## 9. Theme JavaScript

A tiny module will live in a bit (e.g. `ThemeToggle`) to manage the `data-theme` attribute:

- `setTheme(t)` writes `documentElement.dataset.theme` + `localStorage.theme`.
- `getTheme()` reads `data-theme`, falling back to `matchMedia('(prefers-color-scheme: dark)')`.
- `initTheme()` — call in `+layout.svelte` to restore persisted preference on load.

The playground's `apps/playground/src/routes/+layout.svelte` toggles theme via a button that writes `document.documentElement.dataset.theme`.

## 10. Authoring Checklist

When adding or modifying styles:

- [ ] No hardcoded colors. Tokens only.
- [ ] AA contrast (4.5:1 text / 3:1 UI) in **both** light and dark.
- [ ] `@layer components` for component rules.
- [ ] `@reference` (not `@import`) for token access inside component CSS.
- [ ] Test in both themes (the `ThemeToggle` is on the demo layout).
- [ ] If you add a new palette, update both `index.css` and `tints.css` (the tint utility).
