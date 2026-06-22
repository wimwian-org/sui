# Bit Component Standards

When building reusable, portable UI components for **sui**, follow these principles.

## 1. Component Philosophy: The "Bit"

A **bit component** is:

- **Independent:** Imported and used standalone with zero setup beyond Svelte, Tailwind, and `bits-ui`.
- **Single-purpose:** Does one thing well. Button, Card, Modal, Input — not ButtonWithLoader.
- **Headless-backed:** Wraps a `bits-ui` primitive so accessibility, focus, keyboard nav, and ARIA come for free.
- **Themeable via tokens:** Uses the `--color-c-*` / `--color-g-*` design tokens (see [.claude/styling.md](styling.md)). No hardcoded colors.
- **Portable:** No dependency on project structure, naming conventions, or parent state.
- **Publishable:** Bits ship as source `.svelte` files (no bundling). Write as if every file is a public API.

## 2. Svelte 5 Runes (Always Use)

Never use the old `$:` reactive declarations. Always use runes:

- `$state()` for mutable reactive values.
- `$derived()` / `$derived.by()` for computed values.
- `$effect()` for side effects.
- `$props()` with explicit interfaces.
- `$bindable()` for two-way bindings — every bit exposes `ref = $bindable(null)`.

```svelte
<script lang="ts">
    interface Props {
        value: string;
        disabled?: boolean;
        onChange?: (val: string) => void;
    }

    let { value, disabled = false, onChange }: Props = $props();

    let isValidating = $state(false);
    let error = $derived.by(() => {
        // validation logic
        return null;
    });
</script>
```

## 3. Prop Design

Props are your **public API.** Design them with care.

### Rules

- **Explicit interfaces.** Always define a `Props` interface in `types.ts`.
- **Extend the bits-ui primitive's props.** `type Props = Button.RootProps & { variant?: ... }`. This forwards every native attribute (`href`, `type`, `aria-*`, …) automatically.
- **Sensible defaults.** Boolean props default to `false`. Optional props have clear defaults.
- **Callbacks over events.** Pass `onChange`, `onSubmit`. Svelte 5 event handlers are already prop-shaped.
- **Type everything.** No `any`. Use union types for variants.
- **`class` over `className`.** Svelte 5 accepts `class` directly; consumers expect it.

### Example: Button types

```typescript
// components/button/src/types.ts
import type { Button } from 'bits-ui';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost';
export type ButtonTint = 'neutral' | 'primary' | 'secondary' | 'error' | 'warning' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type Props = Button.RootProps & {
    /** Visual treatment. @default "solid" */
    variant?: ButtonVariant;
    /** Colour identity. @default "neutral" */
    tint?: ButtonTint;
    /** Size scale. @default "md" */
    size?: ButtonSize;
    /** Show a spinner and block interaction. @default false */
    loading?: boolean;
    /** Stretch to fill the available inline space. @default false */
    fullWidth?: boolean;
};
```

## 4. Styling: Tailwind v4 + Component CSS

Bits style themselves through three layers:

1. **Inline Tailwind classes** for one-off layout.
2. **A component CSS file** beside the component, in `@layer components`, using `@apply` against design tokens.
3. **Tint utilities** from `@wimwian-org/theme` (`tints.css`) that retint `--color-c-*` per element.

### Rules

- Use design tokens, never hardcoded colors: `bg-c-600`, `text-g-900`, `border-c-500`.
- Put recurring class compositions in the component's `.css` file under `@layer components`, so user utilities still override.
- Use `class:` for state-based styles: `class:opacity-50={disabled}`.
- Forward `class` from props and concatenate.
- **Avoid scoped `<style>`** unless absolutely necessary — it breaks portability and bypasses the token system.

### Color Tokens

See [.claude/styling.md](styling.md). Quick reference:

- `--color-g-*` — ground / neutral scale (mono in both themes).
- `--color-c-*` — content / tint scale; retinted per-element by tint utilities.
- Palettes: `mono`, `primary`, `secondary`, `error`, `warning`, `success`. Steps 50 → 950 (mono also has 0, 1000 and even-50 sub-steps).

## 5. TypeScript: Strict Mode

- Every `<script>` uses `lang="ts"`.
- Define interfaces in `types.ts` and re-export from the component package's entry point.
- No `any`. Use union types or branded strings for variants.

## 6. Accessibility (a11y)

Bits must be accessible **out of the box**. Most of this is delivered by `bits-ui`; your job is not to break it.

### Rules

- **Use the `bits-ui` primitive** rather than rolling your own. `Button.Root`, `Dialog.Root`, `Tooltip.Root` etc. handle focus traps, ARIA roles, keyboard semantics.
- **Keyboard navigation:** Tab + Enter/Space for buttons; arrow keys for grouped controls. Verify in tests.
- **ARIA attributes:** Forward whatever `bits-ui` sets; add `aria-label` where the visible label is an icon.
- **Color contrast:** Ensure AA (4.5:1 for text, 3:1 for UI). Verify in both light and dark.
- **Focus styles:** Always visible. The base `.btn` style in the Button bit applies `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-500` — replicate this discipline.

### Checklist

- [ ] Built on a `bits-ui` primitive (unless none exists — then justify)
- [ ] Keyboard operable (Tab navigates, Enter/Space activates, arrows where grouped)
- [ ] Visible focus indicator
- [ ] Color contrast 4.5:1 (text) or 3:1 (UI) in light AND dark
- [ ] Works at 200% browser zoom

## 7. File Structure

Each bit lives in the `components/` workspace (not yet created). Intended anatomy:

```
components/button/src/
├── Button.svelte          # The component (wraps bits-ui)
├── Button.test.ts         # vitest-browser-svelte tests
├── button.css             # Component CSS in @layer components
├── button.variants.ts     # tv() config + VariantProps type
└── types.ts               # Props interface + re-exports
```

Each bit is its own package (`components/button/package.json`) or sub-package within a shared library package. Export from the package entry point:

```typescript
export { default as Button } from './Button.svelte';
export type { Props as ButtonProps } from './types';
```

## 8. Testing

Every bit has tests. Use `vitest-browser-svelte` — see [.claude/testing.md](testing.md). Minimum coverage:

- Renders with default props.
- Respects each variant axis (variant / tint / size).
- Forwards events (`onclick`, `onchange`, …).
- Reflects state correctly (`disabled`, `loading`).
- Accessible (role, name, keyboard).

```typescript
// Button.test.ts
import { expect, test, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

test('renders with children', async () => {
    render(Button, { children: () => 'Click me' });
    await expect.element(page.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});

test('fires onclick', async () => {
    const onclick = vi.fn();
    render(Button, { onclick, children: () => 'go' });
    await page.getByRole('button').click();
    expect(onclick).toHaveBeenCalledOnce();
});

test('is disabled when loading', async () => {
    render(Button, { loading: true, children: () => 'go' });
    await expect.element(page.getByRole('button')).toBeDisabled();
});
```

## 9. Documentation

Each bit has a demo route at `apps/playground/src/routes/bits/component-name/+page.svelte` showing:

- Basic usage.
- All variants / tints / sizes.
- States (disabled, loading, error).
- Accessibility hooks.
- Edge cases worth seeing.

The demo route doubles as a manual visual-regression baseline and as a target for Playwright E2E.

## 10. Before Shipping

- [ ] `pnpm check` — types pass
- [ ] `pnpm lint` — clean
- [ ] `pnpm test` — all variants covered, all pass
- [ ] `pnpm --filter @wimwian-org/playground build` — playground builds clean
- [ ] Accessibility verified (keyboard, contrast, ARIA)
- [ ] Works in both light and dark modes
- [ ] `pnpm changeset` — described change for consumers

## 11. Never Do This

- ❌ Use global stores for component state. Props only.
- ❌ Skip the `bits-ui` primitive when one exists.
- ❌ Hardcode colors. Use tokens.
- ❌ Scoped `<style>` blocks for anything theme-related.
- ❌ `any` types or rest-spread props without an interface.
- ❌ Dynamic imports or bundler-specific code in a bit.
- ❌ Props that accept functions containing component logic (accept data, not behavior).
- ❌ Ship a bit without its demo route and tests.
