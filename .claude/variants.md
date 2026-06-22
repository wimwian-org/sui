# Variants & Slots with tailwind-variants

[`tailwind-variants`](https://www.tailwind-variants.org) (`tv`) is the **canonical layer for
attribute-specific styling** in this project: variants (`variant`, `tint`, `size`, state flags)
and per-part **slots**, with **type-safe props** derived straight from the config. It replaces the
old hand-rolled `[...].filter(Boolean).join(' ')` composition.

- Library: `tailwind-variants` (installed as a runtime `dependency`).
- `twMerge` is **on** (the tv default), so later classes win conflicts — `tailwind-merge` is a real,
  used dependency now (this supersedes the earlier "no tailwind-merge" note in
  [commands/create-shadcn.md](commands/create-shadcn.md)).

## File convention

Each component gets a sibling `<component>.variants.ts` holding one `tv()` definition and its
exported `VariantProps` type. Re-export both from the component package's entry point (`index.ts`).

```
components/button/src/
├── Button.svelte
├── button.variants.ts     # tv() config + ButtonVariants type
├── Button.test.ts
└── …
```

## Anatomy

```ts
// button.variants.ts
import { tv, type VariantProps } from 'tailwind-variants';

export const button = tv({
    slots: {
        base: 'inline-flex items-center justify-center gap-2 rounded-md font-medium focus-visible:outline-c-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
        icon: 'size-4 shrink-0',
        label: 'truncate',
    },
    variants: {
        variant: {
            solid: { base: 'bg-c-600 text-c-0 hover:bg-c-700' },
            soft: { base: 'bg-c-100 text-c-700 hover:bg-c-200' },
            outline: { base: 'border border-c-600 text-c-600 hover:bg-c-50' },
        },
        size: {
            sm: { base: 'h-8 px-3 text-sm' },
            md: { base: 'h-10 px-4' },
            lg: { base: 'h-12 px-6 text-lg' },
        },
        tint: { primary: '', error: '', success: '' }, // retint via the .primary/.error utilities
    },
    compoundVariants: [{ variant: 'outline', size: 'lg', class: { base: 'border-2' } }],
    defaultVariants: { variant: 'solid', size: 'md' },
});

export type ButtonVariants = VariantProps<typeof button>;
```

> Use design tokens in the class strings (`bg-c-600`, `text-g-900`), never hardcoded colours —
> see [styling.md](styling.md).

## Type-safe props

Derive the prop types from the config — never hand-maintain a parallel union:

```svelte
<script lang="ts">
    import type { Snippet } from 'svelte';
    import { button, type ButtonVariants } from './button.variants';

    interface Props {
        label: string;
        variant?: ButtonVariants['variant']; // 'solid' | 'soft' | 'outline'
        size?: ButtonVariants['size']; // 'sm' | 'md' | 'lg'
        icon?: Snippet;
    }
    let { label, variant, size, icon }: Props = $props();

    const styles = $derived(button({ variant, size })); // one fn per slot
</script>

<button class={styles.base()}>
    {#if icon}<span class={styles.icon()}>{@render icon()}</span>{/if}
    <span class={styles.label()}>{label}</span>
</button>
```

Passing an undeclared variant (`button({ variant: 'bogus' })`) is a **compile error** — that's the
whole point. `pnpm check` enforces it.

## Slots ↔ `data-slot`

`tv` slots assign the right classes to each sub-element. When a sub-element also needs to be a
stable **external** hook (consumer CSS, tests, parent-state targeting), additionally tag it with
`data-slot="icon"` per [css-authoring.md](css-authoring.md) § Rule 4 — the class comes from the tv
slot, the attribute is the public selector.

```svelte
<span data-slot="icon" class={styles.icon()}>{@render icon()}</span>
```

## Per-instance overrides

Slot functions accept a `class` to merge an extra class onto that instance (twMerge resolves
conflicts):

```svelte
<button class={styles.base({ class: extraClass })}>…</button>
```

## How this relates to the other rules

- **Supersedes the array-filter composition** shown in [bits.md](bits.md) — variant/slot class
  logic lives in `tv()`, not in `[...].filter(Boolean).join(' ')`.
- **css-authoring Rule 1 (≤3 inline utilities)** still governs raw utilities written _inline on an
  element in the template_. Variant utilities now live in the `tv()` config instead of being
  `@apply`-ed into a component CSS class.
- **`@apply` + component CSS** remains valid for global/structural styles and truly static,
  non-variant base rules; reach for `tv()` whenever styling depends on a variant/state/slot.
- **No inline `style`** (css-authoring Rule 5) is unchanged.

## Checklist

- [ ] Variant/slot styling defined in a `<component>.variants.ts` via `tv()`, not array-filter joins.
- [ ] Prop types derived with `VariantProps<typeof x>` (no hand-kept unions).
- [ ] Class strings use design tokens, not hardcoded colours.
- [ ] Sub-elements that need an external hook also carry `data-slot="…"`.
- [ ] `tv()` config + `VariantProps` type re-exported from the component package's entry point.
