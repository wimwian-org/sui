# Svelte 5 + SvelteKit Development Guide

You are a senior Svelte engineer. Svelte is a **compiler-driven framework** that runs component code once at creation, then reactively updates the DOM on changes. Svelte 5 introduces **runes** — a new reactivity model that replaces the old `$:` syntax.

## Core Philosophy

- **No virtual DOM.** Svelte compiles to vanilla JavaScript. Each component is a set of imperative DOM updates.
- **Compile-time wins.** Svelte's compiler shifts work from runtime to build time. Less JavaScript ships; your code is faster.
- **Reactivity is explicit.** Use runes to mark reactive state, derived values, and side effects. The compiler tracks dependencies automatically.
- **Full-stack by default.** SvelteKit includes server load functions, form actions, and API routes. Don't bolt on a separate backend.

## Svelte 5 Runes

Runes are special functions that signal reactive intent. They always start with `$`.

### `$state(initialValue)`

Declares reactive state. Changes to state automatically update the DOM.

```svelte
<script lang="ts">
    let count = $state(0);
</script>

<button onclick={() => count++}>
    Clicked {count} times
</button>
```

**Key:** Deep reactivity is automatic for objects and arrays. Mutating `state.items.push(x)` triggers updates.

### `$derived(expression)`

Computed value that re-evaluates when its dependencies change. Read-only.

```svelte
<script lang="ts">
    let firstName = $state('Alice');
    let lastName = $state('Smith');
    let fullName = $derived(firstName + ' ' + lastName);
</script>

<p>{fullName}</p>
```

Use `$derived.by(() => { ... })` for multi-statement computations.

### `$effect(() => { ... })`

Runs arbitrary code when dependencies change. Use for side effects: DOM manipulation, API calls, subscriptions.

```svelte
<script lang="ts">
    let count = $state(0);

    $effect(() => {
        console.log(`Count is now ${count}`);
        document.title = `Count: ${count}`;
    });
</script>
```

The effect automatically tracks which state variables you read, then re-runs when they change. Use `$effect.pre` for DOM reads before paint. Return a cleanup function for subscriptions.

### `$props()` and Prop Defaults

Declare props with full type safety and defaults.

```svelte
<script lang="ts">
    interface Props {
        title: string;
        disabled?: boolean;
        onClick?: (e: MouseEvent) => void;
    }

    let { title, disabled = false, onClick }: Props = $props();
</script>

<button {disabled} onclick={onClick}>
    {title}
</button>
```

**Always use explicit `Props` interfaces.** Clearer than rest-spread, and makes the public API visible.

### `$bindable()` for Two-Way Binding

Mark a prop as bindable so the parent can use `bind:`.

```svelte
<script lang="ts">
    let { value = $bindable(0) }: { value?: number } = $props();
</script>

<input type="number" bind:value />
```

Bits in this library expose `ref = $bindable(null)` so consumers can hold a reference to the underlying element.

## Component Structure

A well-formed Svelte component:

```svelte
<script lang="ts">
    // 1. Props
    interface Props {
        label: string;
        disabled?: boolean;
        onSubmit: (data: FormData) => void;
    }
    let { label, disabled = false, onSubmit }: Props = $props();

    // 2. State
    let isLoading = $state(false);

    // 3. Derived
    let isDisabled = $derived(disabled || isLoading);

    // 4. Effects
    $effect(() => {
        // side effects here
    });

    // 5. Functions
    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        isLoading = true;
        // ...
    }
</script>

<form onsubmit={handleSubmit}>
    <button disabled={isDisabled}>{label}</button>
</form>
```

## Snippets: Component Composition

Use `{#snippet}` for reusable template blocks. Replaces the old slot system.

```svelte
<script lang="ts">
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();
</script>

{@render children?.()}
```

Snippets are typed. A snippet can accept parameters: `Snippet<[arg1: Type, arg2: Type]>`. Always invoke as `{@render children?.()}` so a missing snippet doesn't throw.

## SvelteKit Routing & Patterns

### File-System Routing

Routes live in `src/routes/`. Each `+page.svelte` is a page.

- `src/routes/+page.svelte` → `/`
- `src/routes/blog/[slug]/+page.svelte` → `/blog/:slug`
- `src/routes/(group)/admin/+page.svelte` → `/admin` (group doesn't affect URL)

### Server Loads (`+page.server.ts`)

Load data on the server before rendering. Access databases, APIs, secrets.

```typescript
// src/routes/posts/[id]/+page.server.ts
import { error } from '@sveltejs/kit';

export async function load({ params }) {
    const post = await db.posts.findById(params.id);
    if (!post) error(404, 'Post not found');
    return { post };
}
```

Data is available in the page as `data.post`.

### Universal Loads (`+page.ts`)

Run on server and client (during navigation). Use for public data.

```typescript
// src/routes/blog/+page.ts
export async function load() {
    const posts = await fetch('/api/posts').then((r) => r.json());
    return { posts };
}
```

### Layouts

`+layout.svelte` wraps all child routes. Share UI, data, state.

```svelte
<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
    import { page } from '$app/state';
    let { children } = $props();
</script>

<nav>
    <a href="/admin">Dashboard</a>
    <a href="/admin/users">Users</a>
</nav>

<main>{@render children()}</main>
```

### Form Actions

Handle form submissions on the server with progressive enhancement.

```typescript
// src/routes/contact/+page.server.ts
import { fail } from '@sveltejs/kit';

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get('email');

        if (!email) {
            return fail(400, { error: 'Email required' });
        }

        await sendEmail(email);
        return { success: true };
    },
};
```

In the component, use `use:enhance` for client-side handling:

```svelte
<script lang="ts">
    import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
    <input name="email" type="email" required />
    <button>Send</button>
</form>
```

The form works **without JavaScript**. With JS, `use:enhance` prevents full-page reload and handles loading states.

## Component Patterns

### Conditional Rendering

```svelte
{#if condition}
    <p>True branch</p>
{:else if other}
    <p>Other branch</p>
{:else}
    <p>Else branch</p>
{/if}
```

### Lists with Keys

Always provide a key expression for efficient list rendering.

```svelte
{#each items as item (item.id)}
    <div>{item.name}</div>
{/each}
```

### Directives

- `bind:` — Two-way binding. `bind:value`, `bind:checked`, `bind:group`, etc.
- `on*` props — Event handlers in Svelte 5 are plain props: `onclick`, `onchange`, `onsubmit`.
- `use:` — Use actions. `use:enhance`, custom actions.
- `class:` — Conditional CSS. `class:active={isActive}`
- `style:` — Inline styles. `style:color={isOpen ? 'red' : 'blue'}`

### Animations & Transitions

```svelte
<script lang="ts">
    import { fade, slide } from 'svelte/transition';
</script>

{#if visible}
    <p transition:fade>Content</p>
{/if}
```

## Performance Tips

- **`$effect.pre`** for DOM reads (`getBoundingClientRect`, etc.) — runs before paint.
- **`onMount`** for client-only setup; or guard with `if (browser)` from `$app/environment`.
- **Link preloading** — `<a href="/page" data-sveltekit-preload-data="hover">` auto-loads data on hover.
- **Code splitting** — SvelteKit auto-splits routes. Import heavy libraries inside `load` when possible.

## Testing

See [.claude/testing.md](testing.md). In short:

- **Component tests:** Vitest browser-mode with `vitest-browser-svelte` in real Chromium.
- **E2E tests:** Playwright. Test full user flows in a real browser.
- **Test server functions:** Call `load` and actions directly — they're just async functions.

## Checklist Before Shipping

- [ ] `pnpm format` and `pnpm lint`
- [ ] `pnpm check` (svelte-check + tsc)
- [ ] `pnpm test` (Vitest — see testing.md for current mode)
- [ ] `pnpm --filter @wimwian-org/playground build` succeeds
- [ ] No unused props or variables
- [ ] Accessible: semantic HTML, keyboard nav, aria attributes, color contrast (4.5:1)
