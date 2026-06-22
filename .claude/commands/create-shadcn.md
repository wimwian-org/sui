---
description: Download a shadcn-svelte component from the registry and adapt it to the project's design tokens, bit conventions, tests, demo route, and git-flow integration
argument-hint: Component name (e.g. Badge, Card, InputField, Skeleton) or leave empty to be asked
---

# Create Shadcn

You are helping the developer add a new bit to **svelte-bits-ui** by downloading a [`shadcn-svelte`](https://www.shadcn-svelte.com) component from its registry and adapting it to use this project's design tokens, Svelte 5 runes, bit conventions, tests, demo route, and release-ready commit.

The workflow has seven phases. Use `TodoWrite` to track them all upfront.

Initial request: $ARGUMENTS

## Core Principles

- **Adapt, don't rewrite blindly.** Download the shadcn source first. Read every line before changing anything. Understand what each class and CSS variable does before mapping it.
- **Tokens, not literals.** All colours must read `--color-c-*` (retintable) or `--color-g-*` (always neutral). No `bg-blue-500`, `#3b82f6`, or shadcn's own CSS variables (`--primary`, `--background`, etc.) in the final output.
- **The Button bit is the canonical template.** When in doubt, copy its file shape, prop typing, and CSS conventions. See [`src/lib/bits/Button/`](../../src/lib/bits/Button/).
- **shadcn's `cn()` utility is banned.** Replace `cn(...)` with a [`tailwind-variants`](../variants.md) `tv()` config for variant/slot composition (type-safe props via `VariantProps`); a plain `[...].filter(Boolean).join(' ')` join is an acceptable fallback for trivial static cases. `tailwind-merge` now ships with `tailwind-variants` (`twMerge` on), so it's allowed; `clsx` is unnecessary.
- **Git flow via `bin/wt` for everything.** Feature branch + worktree before any write. Never commit to `master` or `dev` directly.
- **Auto-changeset is wired.** A `feat:` commit triggers `post-commit` → minor-bump changeset. Don't run `pnpm changeset` manually.

---

## ⛔ Hard precondition: feature branch + worktree BEFORE any write

**No `Write`, `Edit`, or any file-creation tool may run until the `bin/wt feature start <slug>` step in Phase 5 has completed and the current working directory is the new worktree.** This is non-negotiable and overrides any phase ordering elsewhere in this document.

**How to apply, every time before any write:**

1. Run `git branch --show-current` and confirm the branch name.
2. **If the branch is `dev`, `master`, or `HEAD` (detached) — STOP. Do not write.** Phases 1–4 are read-only and conversational.
3. The only acceptable transition is Phase 5, step 1: `bin/wt feature start <kebab-slug>` followed by moving into the new worktree. After that, `git branch --show-current` must print `feature/<kebab-slug>`.
4. After Phase 7's `bin/wt feature finish`, you are back in the primary checkout on `dev`. Do not write there either.

---

## Token Mapping Reference

This is the authoritative shadcn → project token translation table. Consult it during Phase 3 and apply it mechanically during Phase 5.

### CSS variable mapping

| shadcn variable            | Project equivalent       | Rationale                                                  |
| -------------------------- | ------------------------ | ---------------------------------------------------------- |
| `--background`             | `var(--page-bg)`         | Page/document ground                                       |
| `--foreground`             | `var(--page-fg)`         | Text on page ground                                        |
| `--card`                   | `var(--canvas-bg)`       | Elevated card/panel                                        |
| `--card-foreground`        | `var(--canvas-fg)`       | Text on card                                               |
| `--popover`                | `var(--canvas-bg)`       | Floating popover surface                                   |
| `--popover-foreground`     | `var(--canvas-fg)`       | Text in popover                                            |
| `--primary`                | `var(--surface-bg)`      | Primary interactive surface (retintable via `--color-c-*`) |
| `--primary-foreground`     | `var(--surface-fg)`      | Text on primary surface                                    |
| `--secondary`              | `var(--color-g-200)`     | Neutral secondary background                               |
| `--secondary-foreground`   | `var(--color-g-800)`     | Text on secondary                                          |
| `--muted`                  | `var(--color-g-100)`     | Subdued background area                                    |
| `--muted-foreground`       | `var(--color-g-500)`     | Subdued text                                               |
| `--accent`                 | `var(--color-g-100)`     | Hover/focus highlight (neutral)                            |
| `--accent-foreground`      | `var(--color-g-900)`     | Text on accent                                             |
| `--destructive`            | `var(--color-error-500)` | Error / danger                                             |
| `--destructive-foreground` | `var(--color-mono-0)`    | Text on destructive                                        |
| `--border`                 | `var(--canvas-border)`   | Default border                                             |
| `--input`                  | `var(--canvas-border)`   | Input border                                               |
| `--ring`                   | `var(--color-c-500)`     | Focus ring (retintable)                                    |
| `--radius`                 | `0.375rem`               | Fixed border radius; replace with `rounded-md` in classes  |

> **Dark-mode note:** The project's `--page-*`, `--canvas-*`, and `--surface-*` structural tokens already include the `var(--L, ...) var(--D, ...)` space-toggle internally. You do **not** need to add dark variants when mapping to these tokens. For `--color-g-*` (ground scale) and `--color-c-*` (content scale), those too flip automatically via their own `--L`/`--D` declarations. Never add a `.dark` selector or a `@media (prefers-color-scheme: dark)` block — they are incompatible with the `data-theme` attribute system. See [`.claude/styling.md`](../styling.md) § "Theme Registers".

### Tailwind class mapping

| shadcn utility class                | Project replacement                                                                  | Notes                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `bg-background`                     | `bg-page-bg`                                                                         | Or skip if inherited                               |
| `text-foreground`                   | `text-page-fg`                                                                       |                                                    |
| `bg-card`                           | `bg-canvas-bg`                                                                       |                                                    |
| `text-card-foreground`              | `text-canvas-fg`                                                                     |                                                    |
| `bg-popover`                        | `bg-canvas-bg`                                                                       |                                                    |
| `text-popover-foreground`           | `text-canvas-fg`                                                                     |                                                    |
| `bg-primary`                        | `bg-c-600`                                                                           | Solid variant. Use `bg-c-*` for the retint system. |
| `text-primary-foreground`           | `text-c-0`                                                                           |                                                    |
| `hover:bg-primary/90`               | `hover:bg-c-700`                                                                     | Ramp one step darker                               |
| `bg-secondary`                      | `bg-g-100`                                                                           |                                                    |
| `text-secondary-foreground`         | `text-g-800`                                                                         |                                                    |
| `bg-muted`                          | `bg-g-100`                                                                           |                                                    |
| `text-muted-foreground`             | `text-g-500`                                                                         |                                                    |
| `bg-accent`                         | `bg-g-100`                                                                           |                                                    |
| `text-accent-foreground`            | `text-g-900`                                                                         |                                                    |
| `bg-destructive`                    | `bg-error-500`                                                                       |                                                    |
| `text-destructive-foreground`       | `text-mono-0`                                                                        |                                                    |
| `border-border`                     | `border-canvas-border`                                                               | or `border-g-200`                                  |
| `border-input`                      | `border-canvas-border`                                                               |                                                    |
| `ring-ring`                         | `ring-c-500`                                                                         |                                                    |
| `focus-visible:ring-ring`           | `focus-visible:outline-c-500 focus-visible:outline-2 focus-visible:outline-offset-2` | Project uses `outline`, not `ring`                 |
| `rounded-[var(--radius)]`           | `rounded-md`                                                                         | Fixed value                                        |
| `rounded-[calc(var(--radius)-...)]` | `rounded` or `rounded-sm`                                                            | Adjust per context                                 |
| `text-sm font-medium`               | keep or `subtitle-sm`                                                                | Typography util if it matches                      |

---

## Phase 1: Discovery

**Goal:** identify the shadcn component and confirm it exists in the registry.

**Actions:**

1. Create a `TodoWrite` list covering all seven phases.
2. If `$ARGUMENTS` is empty or ambiguous, ask the user:
    - Which shadcn-svelte component? Available components (as of the shadcn-svelte registry): `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `checkbox`, `collapsible`, `command`, `context-menu`, `data-table`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `range-calendar`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`, `toggle-group`, `toolbar`, `tooltip`.
    - Is there a specific variant or behaviour you care about?
3. Determine the bit's name:
    - PascalCase for the component name (`Badge`, `Card`, `Skeleton`)
    - kebab-case for paths and branch (`badge`, `card`, `skeleton`)
4. Check whether the component already exists at `src/lib/bits/<PascalName>/`. If it does, stop and tell the user.

---

## Phase 2: Download

**Goal:** retrieve the shadcn-svelte source for the target component.

**Actions:**

1. Fetch the component from the shadcn-svelte registry using `WebFetch`:

    ```
    https://www.shadcn-svelte.com/r/<kebab-name>.json
    ```

    If that 404s, try:

    ```
    https://www.shadcn-svelte.com/registry/styles/default/<kebab-name>.json
    ```

    The JSON response contains a `files` array. Each entry has:
    - `name` — file name
    - `content` — the raw file contents (Svelte component, TypeScript, CSS)

2. If the component depends on other shadcn components (look for `dependencies` or `registryDependencies` in the JSON), note each one. You may need to fetch those too. Fetch them now via the same URL pattern.

3. Note any npm `dependencies` listed in the registry JSON. The project may or may not already have them installed.

4. Do **not** run `pnpm dlx shadcn-svelte add` — the CLI rewrites `tailwind.config.js`, injects its own CSS variables into `app.css`, and places files in the wrong directory for this project. Fetch-and-adapt manually.

---

## Phase 3: Inspection and Token Mapping

**Goal:** read every downloaded file, identify all shadcn CSS variables and Tailwind utility classes, and plan the full mapping to project tokens.

**This phase is read-only. No files are written.**

**Actions:**

1. **Read every file** from the downloaded JSON carefully. For each file, identify:
    - All shadcn CSS variables used (`--background`, `--primary`, `--border`, …) — use the [Token Mapping Reference](#token-mapping-reference) above.
    - All shadcn Tailwind utility classes (`bg-primary`, `text-muted-foreground`, …) — use the mapping table above.
    - Uses of `cn(...)` or `clsx(...)` — mark every call site for replacement.
    - Uses of `$lib/utils` imports — these need to be removed.
    - Dark-mode selectors (`.dark { ... }`) — mark for deletion; the project uses `--L`/`--D` tokens instead.
    - Any `<style>` block — note it; scoped styles are discouraged in bits.
    - Any dependency on other shadcn primitives (`import { ... } from '../ui/button'`, etc.) — decide whether to inline or wrap.
    - Whether the component wraps a `bits-ui` primitive underneath (many shadcn-svelte components do — preserve the bits-ui layer if present; do not double-wrap).

2. **Identify structural departures.** shadcn components often:
    - Accept `class` but compose it with `cn()` — replace with the array-filter pattern.
    - Lack `ref = $bindable(null)` — add it.
    - Export multiple sub-components from one file — split into separate files per the compound-export pattern if the surface area warrants it, or keep in one file for simple components.
    - Use Svelte 4 event directives (`on:click`) — convert to Svelte 5 prop syntax (`onclick`).
    - Use `$$props` or `$$restProps` — replace with `$props()` destructuring and `...restProps`.
    - Use `$$slots` — replace with `children` snippet.

3. **Summarise findings** for the user:
    - Table of every shadcn variable/class → project token mapping you'll apply.
    - List of `cn()` call sites.
    - List of dark-mode selectors to delete.
    - Whether a bits-ui primitive is already present (and which).
    - Any npm dependency that needs adding.
    - Any compound-export decisions.

    Wait for user to review the mapping before proceeding to Phase 4.

---

## Phase 4: Clarifying Questions

**Goal:** lock down variant axes, demo coverage, and any open questions from Phase 3 before writing code.

**CRITICAL:** Do not skip. Ask all questions in one organised message and wait.

**Standard axes to clarify:**

1. **Variants** — does the shadcn component have visual variants? (e.g. `Badge` has `default`, `secondary`, `destructive`, `outline`). Map each to the project's `variant` axis. Propose mapping or confirm keeping shadcn names.
2. **Tints** — should this component be retintable via the `.primary`, `.error`, etc. tint utilities? Simple presentational components (Skeleton, Separator) usually are not. Interactive or semantic components (Badge, Button, Alert) usually are.
3. **Sizes** — does the component need `sm`/`md`/`lg`? Or does it have a fixed size?
4. **States** — beyond `disabled`, what else? `loading`, `invalid`, `selected`?
5. **npm dependencies** — if the registry JSON lists new packages, confirm installing them.
6. **Compound vs. single export** — for multi-part components, confirm the export shape.
7. **Demo coverage** — what grid of variant × tint × size × state should the demo route render?

If the user says "your call", make a recommendation grounded in how analogous existing bits behave and get explicit confirmation.

---

## Phase 5: Implementation

**WAIT FOR APPROVAL FROM PHASE 4** before writing any code.

**Actions:**

1. **Start the feature worktree.**

    ```bash
    bin/wt feature start <kebab-slug>
    cd ../svelte-bits-ui.worktrees/<kebab-slug>
    pnpm install
    git branch --show-current   # must print: feature/<kebab-slug>
    ```

    Do not skip the `cd`. All subsequent writes happen inside the worktree.

2. **Scaffold the bit files** at `src/lib/bits/<ComponentName>/`:

    **`<ComponentName>.svelte`** — adapted from the shadcn source with these changes applied:
    - Remove all `import { cn } from '$lib/utils'` (and any other shadcn utility imports).
    - Replace `cn(...)` with the array-filter pattern:
        ```svelte
        let composedClass = $derived( ['base-class', `component-${size}`, `component-${variant}`, tint !== 'neutral' &&
        tint, className] .filter(Boolean) .join(' '), );
        ```
    - Add `import '../../../assets/index.css'` and `import './<component-name>.css'` at the top (after any bits-ui imports).
    - Add `import type { Props } from './types'`.
    - Add `ref = $bindable(null)` and `bind:ref` on the root element.
    - Convert any Svelte 4 syntax to Svelte 5 runes (`$state`, `$derived`, `$props`, snippets).
    - Add `data-variant={variant}` and `data-tint={tint}` attributes (where applicable) for CSS state hooks.
    - Replace all shadcn Tailwind classes with project equivalents per the mapping table.
    - Delete all `.dark { ... }` style blocks.

    **`<component-name>.css`** — do **not** copy shadcn's CSS verbatim. Instead:
    - Start with `@reference "../../../assets/index.css";`
    - Wrap all rules in `@layer components { ... }`.
    - Port any shadcn `@apply` statements, replacing shadcn classes with project token classes.
    - If shadcn defines CSS variables in `:root` (e.g. `--background: 0 0% 100%`), do **not** copy them — the project's tokens supersede them.
    - Follow the Button CSS pattern: declare a token block at the top of the base class, then reference those tokens in rules below.

    **`types.ts`** — define `Props` extending the underlying element or bits-ui primitive type:
    - If the shadcn component wraps a bits-ui primitive: `type Props = Primitive.RootProps & { variant?: ...; tint?: ...; size?: ... }`.
    - If it's pure presentational HTML: `type Props = HTMLAttributes<HTMLDivElement> & { variant?: ...; ... }`.
    - Export `variant`, `tint`, `size` union types separately so `src/lib/index.ts` can re-export them.

    **`<ComponentName>.test.ts`** — minimum coverage:
    - Renders with default props.
    - Each `variant` value applies the expected class.
    - Each `tint` value applies the tint class.
    - `disabled` prop disables the element.
    - Events forward correctly.
    - `ref` binds to the underlying element.

3. **Update `src/lib/index.ts`** to re-export the bit and its types.

4. **Create the demo route** at `src/routes/bits/<kebab-slug>/+page.svelte`:
    - Import the bit from `$lib`.
    - Render every variant × tint × size matrix agreed in Phase 4.
    - Add label chips (`<code class="btn btn-sm btn-solid pointer-events-none select-none">.<variant></code>`) matching the existing colors/contrast page pattern.
    - Add state toggles for any interactive states.

5. **Add a Playwright E2E spec** at `tests/e2e/<kebab-slug>.spec.ts` if the component's behaviour spans routing or full-page interaction. Skip for purely presentational components — component tests are sufficient.

6. **Update the layout nav** at `src/routes/+layout.svelte` to link to the new demo route.

---

## Phase 6: Quality Review

**Goal:** prove the adapted bit is correct, accessible, and token-clean before merging.

**Actions:**

1. **Run the gauntlet** — every step must be green:

    ```bash
    pnpm check                 # svelte-check + tsc
    pnpm lint                  # eslint + prettier
    pnpm exec vitest --run     # component tests
    pnpm build                 # demo site builds
    pnpm test:e2e              # Playwright (if you added a spec)
    pnpm package               # svelte-package + publint
    ```

    Any failure: stop, fix, re-run. Do not commit red.

2. **Launch 3 `code-reviewer` agents in parallel**:

    ```
    Agent 1 (token compliance):
    Review src/lib/bits/<Component>/ for any remaining shadcn CSS variables
    (--background, --primary, --border, etc.), shadcn Tailwind classes
    (bg-background, text-muted-foreground, etc.), cn() calls, dark: selectors,
    $lib/utils imports, or hardcoded hex/rgb colours. Report each as a violation
    with the file and line. Also check that @layer components is used, that
    @reference (not @import) is used in the CSS file, and that no scoped <style>
    block exists in the Svelte file.
    ```

    ```
    Agent 2 (accessibility):
    Review the adapted bit for a11y. If a bits-ui primitive is present, verify
    it is preserved and not double-wrapped. Check: keyboard operability, visible
    focus indicator using outline-c-500 (not ring), ARIA attributes, contrast
    AA in both light and dark (use the ground/content token scales). Verify that
    the .dark selector removal does not break dark-mode behaviour (the --L/--D
    space-toggle must handle it instead).
    ```

    ```
    Agent 3 (Svelte 5 correctness):
    Review for Svelte 4 remnants: $:, on:*, $$props, $$restProps, $$slots,
    createEventDispatcher. Confirm $props() destructuring, $state, $derived,
    $bindable(null) for ref, snippet-based children. Verify types.ts uses
    correct type extension pattern and that src/lib/index.ts re-exports both
    the component and its variant/tint/size types.
    ```

3. **Visually verify in both themes.** Run `pnpm dev` and open the new demo route. Check:
    - All variants render correctly in light and dark.
    - Focus indicator is visible on keyboard tab.
    - Tint retinting works (add `.primary` class and confirm the colour shifts).
    - No shadcn-coloured pixels remain (no indigo-600 masquerading as primary, etc.).

4. **Present consolidated findings** to the user. Ask: fix now, fix later, or proceed.

---

## Phase 7: Land

**Goal:** commit, merge, document.

**Actions:**

1. **Pause and show the user** the list of changed files before committing. Per project convention, always pause here.

2. **Commit** with a conventional message:

    ```bash
    git add .
    git commit -m "feat(<kebab-slug>): add <ComponentName> shadcn bit"
    ```

    Watch the hooks fire:
    - `pre-commit` → prettier + eslint + `pnpm check`
    - `commit-msg` → commitlint
    - `post-commit` → `scripts/auto-changeset.mjs` writes `.changeset/auto-*.md` (minor bump for `feat:`) and amends it into the same commit

3. **Verify the changeset landed**:

    ```bash
    git show --stat HEAD | grep changeset
    git status   # must be clean
    ```

4. **Pause for user approval**, then finish the feature:

    ```bash
    bin/wt feature finish <kebab-slug>
    cd /Users/apancha/WebstormProjects/svelte-bits-ui
    ```

    `bin/wt feature finish` does NOT push. The release flow consumes the changeset when a `release/vX.Y.Z` branch is cut from `dev`.

5. **Mark all todos complete** and produce a summary:
    - Component name + shadcn source URL
    - File list (`src/lib/bits/...`, `src/routes/bits/...`, `tests/e2e/...`)
    - Token mapping applied (which shadcn vars were replaced and with what)
    - Variant × tint × size matrix the demo covers
    - Test count
    - Changeset file and bump kind
    - Anything deferred

---

## When NOT to use this command

- **The component already exists in `src/lib/bits/`** — use the standard feature-branch flow to modify it.
- **You want to wrap a `bits-ui` primitive from scratch.** Use [`/create-bit`](./create-bit.md) instead.
- **The shadcn component has no registry entry** (custom or community-only). Fetch the source manually and follow the same adaptation phases.
- **Single-line fixes or doc-only changes.** Use the standard feature-branch flow.

---

## Notes on shadcn-svelte internals

- **shadcn-svelte v2+** uses `bits-ui` as its headless layer for interactive components. When you see `import { ... } from 'bits-ui'` in the downloaded source, preserve it — do not re-wrap.
- **Older shadcn-svelte (v0/v1)** used `melt-ui` internally. If you see `melt-ui` imports, note them for the user — melt-ui is deprecated and you may need to replace with bits-ui equivalents.
- **`cn()` is always `clsx` + `tailwind-merge`** under the hood. The project does not use `tailwind-merge` because Tailwind v4's specificity model handles conflicts differently. The array-filter join is sufficient.
- **shadcn's `forwardRef` pattern (React)** does not apply — shadcn-svelte uses Svelte's `bind:ref` which maps directly to this project's `ref = $bindable(null)` convention.
