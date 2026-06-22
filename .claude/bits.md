# Bits UI Wrapping Conventions

[`bits-ui`](https://bits-ui.com) is a **headless** component library for Svelte 5. It ships behavior, accessibility, focus management, and ARIA — but no styling. Every component in this library wraps a `bits-ui` primitive.

## The Wrapping Pattern (canonical)

Every bit follows the same shape. Use Button as the template:

```svelte
<!-- components/button/src/Button.svelte -->
<script lang="ts">
    import { Button } from 'bits-ui';
    // @wimwian-org/theme is a peerDependency; consumers import it once in their layout.
    // Import it here too so the bit works in isolation (Vite dedupes).
    import '@wimwian-org/theme';
    import './button.css';
    import type { Props } from './types';

    let {
        variant = 'solid',
        tint = 'neutral',
        size = 'md',
        loading = false,
        fullWidth = false,
        disabled = false,
        class: className = '',
        children,
        ref = $bindable(null),
        ...restProps
    }: Props = $props();

    let isDisabled = $derived(disabled || loading);

    let buttonClass = $derived(
        ['btn', `btn-${size}`, `btn-${variant}`, tint !== 'neutral' && tint, fullWidth && 'w-full', className]
            .filter(Boolean)
            .join(' '),
    );
</script>

<Button.Root
    bind:ref
    class={buttonClass}
    disabled={isDisabled}
    data-variant={variant}
    data-tint={tint}
    data-loading={loading || undefined}
    {...restProps}
>
    {#if loading}
        <svg class="btn-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
    {/if}
    {@render children?.()}
</Button.Root>
```

> **Variant/slot composition now uses [`tailwind-variants`](variants.md)**, not the
> `[...].filter(Boolean).join(' ')` derivation shown above. Define `variant`/`tint`/`size`/slots in a
> `tv()` config with type-safe props; the `bind:ref`, `data-*`, and `...restProps` forwarding below
> still apply. The array-filter example is kept only to show the forwarding shape.

Read this as five rules:

1. **Import the primitive from `bits-ui`** at the top. Use named imports (`import { Button } from 'bits-ui'`) and reach into `Button.Root`, `Button.Trigger`, `Dialog.Content`, etc.
2. **Import the theme inside the bit.** `import '@wimwian-org/theme'` plus the bit's own CSS. Vite dedupes; consumers get tokens even if they haven't imported the theme in their own layout.
3. **Type props by extending the primitive's RootProps.** `type Props = Button.RootProps & { variant?: ... }`. All native attributes pass through.
4. **Forward `ref` via `$bindable(null)`** and `bind:ref` on the `Root`. Consumers can hold the underlying element.
5. **Add `data-*` attributes** for variants / states. Tests and consumer CSS hook these.

## Composing Multi-Part Primitives

`bits-ui` primitives often expose multiple parts (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Content`, `Dialog.Title`, …). Two patterns:

### A. Single export, opinionated composition

Best for primitives with one obvious layout (Dialog, Popover, Tooltip).

```svelte
<!-- components/dialog/src/Dialog.svelte -->
<script lang="ts">
    import { Dialog as BitsDialog } from 'bits-ui';
    // ...
    let { trigger, title, children, ...rest }: Props = $props();
</script>

<BitsDialog.Root {...rest}>
    <BitsDialog.Trigger class="dlg-trigger">{@render trigger()}</BitsDialog.Trigger>
    <BitsDialog.Portal>
        <BitsDialog.Overlay class="dlg-overlay" />
        <BitsDialog.Content class="dlg-content">
            <BitsDialog.Title class="dlg-title">{title}</BitsDialog.Title>
            {@render children?.()}
        </BitsDialog.Content>
    </BitsDialog.Portal>
</BitsDialog.Root>
```

### B. Compound export, consumer composes

Best for primitives with many valid layouts (Tabs, Menu, Accordion).

```typescript
// components/tabs/src/index.ts
export { default as Root } from './Tabs.Root.svelte';
export { default as List } from './Tabs.List.svelte';
export { default as Trigger } from './Tabs.Trigger.svelte';
export { default as Content } from './Tabs.Content.svelte';
```

Each sub-file is a thin wrapper around its `bits-ui` counterpart, applying classes and forwarding props.

## Slot vs. Snippet vs. Child Snippet

Three ways a bit can accept content; pick deliberately:

- **`children` snippet** — default content. Always invoke with `{@render children?.()}`.
- **Named snippets** — e.g. `trigger`, `header`, `footer`. Document each in the `Props` interface.
- **`child` snippet (bits-ui pattern)** — see [bits-ui Child Snippet docs](https://bits-ui.com/docs/child-snippet). The primitive's behavior + attributes are exposed to your snippet; you provide the element. Use this when consumers need full control over the rendered element.

## Useful Utilities from bits-ui

- **`Portal`** — render outside the DOM tree (modals, tooltips).
- **`mergeProps`** — merge event handlers and attributes from multiple sources.
- **`useId`** — generate SSR-safe unique IDs.
- **`isUsingKeyboard`** — boolean for keyboard-vs-pointer focus styling.

## Reference Documentation

`bits-ui` ships LLM-optimised docs. When picking a primitive, fetch the relevant page:

- **Index:** https://bits-ui.com/docs/llms.txt
- **Getting Started:** https://bits-ui.com/docs/getting-started/llms.txt
- **Styling:** https://bits-ui.com/docs/styling/llms.txt
- **Child Snippet:** https://bits-ui.com/docs/child-snippet/llms.txt
- **State Management:** https://bits-ui.com/docs/state-management/llms.txt
- **Transitions:** https://bits-ui.com/docs/transitions/llms.txt

Components (alphabetical, each at `https://bits-ui.com/docs/components/<name>/llms.txt`):

Accordion · Alert Dialog · Aspect Ratio · Avatar · Button · Calendar · Checkbox · Collapsible · Combobox · Command · Context Menu · Date Field · Date Picker · Date Range Field · Date Range Picker · Dialog · Dropdown Menu · Label · Link Preview · Menubar · Meter · Navigation Menu · Pagination · Pin Input · Popover · Progress · Radio Group · Range Calendar · Rating Group · Scroll Area · Select · Separator · Slider · Switch · Tabs · Time Field · Time Range Field · Toggle · Toggle Group · Toolbar · Tooltip

Utilities: `bits-config`, `is-using-keyboard`, `merge-props`, `portal`, `use-id`.

Type helpers: `WithElementRef`, `WithoutChild`, `WithoutChildren`, `WithoutChildrenOrChild`.

## When `bits-ui` Doesn't Have a Primitive

Some components (Card, Skeleton, Badge) have no headless counterpart — they're pure presentation. For those:

- Skip the wrapper, write a plain Svelte component.
- Still keep `class`, `ref = $bindable(null)`, `...restProps`, and `children`.
- Still extend a base type like `HTMLAttributes<HTMLDivElement>` so native attributes flow through.

Document in the component file why no `bits-ui` primitive is used.
