# CSS Authoring & Template/Style Separation

Keep styling in CSS — don't scatter it across the template. This doc codifies how classes
are written on elements and how their CSS counterparts are structured.

## Rule 1 — At most 3 utility classes inline

An element's literal `class="..."` may carry **no more than three** raw utility classes
(Tailwind utilities like `px-4`, `bg-c-600`, `flex`).

- ≤ 3 utilities → fine to leave inline.
- \> 3 utilities → collapse them into **one semantic class** and move the utilities into the
  component's CSS file (`@apply` them under `@layer components`).

What does _not_ count toward the budget: semantic component classes that map to a CSS rule
(`.input`, `.card-root`, `.btn`) and dynamic bindings (`class={...}`). The cap is about raw
utilities you'd otherwise pile onto the tag.

```svelte
<!-- ❌ too many utilities inline -->
<div class="flex items-center gap-2 rounded-md border bg-c-100 px-4 py-2">…</div>

<!-- ✅ one semantic class; utilities live in CSS -->
<div class="card-root">…</div>
```

```css
/* card.css */
@reference "@wimwian-org/theme";

@layer components {
    .card-root {
        @apply flex items-center gap-2 rounded-md border bg-c-100 px-4 py-2;
    }
}
```

> When the styling is **variant- or state-driven** (`variant`, `tint`, `size`, `disabled`, …),
> don't `@apply` it into CSS — define it in a `tv()` config instead, per
> [variants.md](variants.md). `@apply`/component-CSS is for static, non-variant base styles.

## Rule 2 — Every Svelte component/part has a matching CSS class

The class name is derived from the component (or part) name: dots → hyphens, lowercased —
the same `toClassToken` mapping the migration scripts use.

| Svelte name      | CSS class         |
| ---------------- | ----------------- |
| `Input`          | `.input`          |
| `Card`           | `.card`           |
| `Card.Root`      | `.card-root`      |
| `Dialog.Content` | `.dialog-content` |
| `ThemeToggle`    | `.theme-toggle`   |

The class file lives beside the component and is named after it (`Card.Root.css` → `.card-root`),
per [styling.md](styling.md) § "Component CSS Convention".

> Existing exception: the Button bit's root class is `.btn` (not `.button`) — a deliberate
> shorthand kept for brevity. New components follow the literal-name rule above unless there's a
> strong reason to alias.

## Rule 3 — Prefer descendant selectors over child classes

Don't hang a class on every child. If a child is unambiguous under its parent, target it with a
**descendant selector** off the parent's class instead. This keeps the template free of extra
classes and shrinks the class footprint.

```svelte
<!-- ✅ child carries no class -->
<div class="card-root">
    <span>Label</span>
</div>
```

```css
@layer components {
    .card-root {
        @apply rounded-md border bg-c-100 p-4;
    }
    /* style the span through the parent, not its own class */
    .card-root span {
        @apply text-c-700 text-sm;
    }
}
```

When the descendant is ambiguous (several `<span>`s needing different styles), fall back to a
single semantic class on the one that differs, or a structural selector
(`.card-root > span:first-child`, attribute selectors). Add an extra class only when a selector
can't express it cleanly.

## Rule 4 — Break composite components into data slots

Composite components (a Button with an icon + label, a Select with trigger/content) are broken
into named **data slots**: sub-elements tagged with `data-slot="<name>"` and styled from the
component's CSS via a descendant attribute selector. This is the explicit, stable extension of
Rule 3 — a `data-slot` hook never goes ambiguous the way a bare `span` selector can, and it keeps
all look-and-feel in CSS instead of threading `class`/`style` props down through children.

Slot names are lowercase tokens: `icon`, `label`, `trigger`, `content`, `indicator`, …

> The slot's **classes** come from the component's `tv()` slots (type-safe — see
> [variants.md](variants.md)); the `data-slot` **attribute** is the stable external selector for
> consumer CSS, tests, and parent-state targeting. Use both together.

Tag the parts in the component (children carry a slot, not classes):

```svelte
<!-- Button.svelte -->
<script lang="ts">
    import { Button } from 'bits-ui';
    import './button.css';
    let { icon, children, ...rest } = $props();
</script>

<Button.Root class="btn" {...rest}>
    {#if icon}<span data-slot="icon">{@render icon()}</span>{/if}
    <span data-slot="label">{@render children?.()}</span>
</Button.Root>
```

Style each slot from the parent — and drive child styling off parent state without prop drilling:

```css
@layer components {
    .btn {
        @apply inline-flex items-center gap-2;
    }
    .btn [data-slot='icon'] {
        @apply size-4 shrink-0;
    }
    .btn [data-slot='label'] {
        @apply truncate;
    }
    /* parent state cascades to the slot through one selector */
    .btn:hover [data-slot='icon'] {
        @apply text-c-700;
    }
}
```

Consumers mark their content with the matching slot and inherit the contextual layout for free —
no hardcoded utilities passed down:

```svelte
<Button>
    {#snippet icon()}<SearchIcon />{/snippet}
    Search
</Button>
```

Why slots beat prop drilling: styles stay isolated in the component's CSS, you target internal
parts from the top without breaking encapsulation, and parent-state styling (hover/active/
`data-state`) flows to children through a single selector.

**Inline arbitrary variants — use sparingly.** Tailwind can target slots from the template:
`[&_[data-slot=icon]]:size-4` (a descendant), `data-[slot=icon]:size-4` (the element itself), or
`hover:[&_[data-slot=icon]]:text-c-700` (parent hover). These count toward the Rule 1 ≤3-utility
budget, so reach for them only for a genuine one-off; anything recurring belongs in the component
CSS file.

## Rule 5 — No inline styles

Never use a `style="..."` attribute for static styling — always lean on utilities and `@apply`
against the design tokens. (`transform-svelte.mjs` mechanically extracts any static `style` into a
generated class; don't create that debt in the first place.) The only acceptable `style` is a
genuinely dynamic, per-instance value that can't be a class — bind it to a custom property, e.g.
`style:--progress={pct}`, and consume `var(--progress)` from the component CSS.

## Where the CSS goes

- One `.css` file per component, beside it; `@reference` the global stylesheet (not `@import`);
  all rules in `@layer components`. Full token rules in [styling.md](styling.md).
- `@apply` design-token utilities (`bg-c-600`, `text-g-900`), never hardcoded colours.
  See [component.md](component.md) § 4.

## Checklist

- [ ] No element has more than 3 raw utility classes inline.
- [ ] Overflow utilities collapsed into one semantic class, `@apply`-ed in the component CSS.
- [ ] Component/part name maps to its class (`Card.Root` → `.card-root`).
- [ ] Children styled via descendant selectors (`.card-root span`) unless ambiguity forces a class.
- [ ] Composite parts exposed as `data-slot="…"` and styled from the parent (`.btn [data-slot='icon']`), not via child classes or prop-drilled class strings.
- [ ] No `style="…"` attributes; static styling via utilities/`@apply` (dynamic-only values use `style:--var`).
- [ ] All rules in `@layer components`; colours via tokens.
