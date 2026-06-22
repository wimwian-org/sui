---
description: Add a new bit component wrapping a bits-ui headless primitive with project theming, tailwind-variants, tests, demo route, and git-flow integration
argument-hint: Primitive name (e.g. Dialog, Tabs, Tooltip) or leave empty to be asked
---

# Create Bit

You are helping the developer add a new bit to **sui** — a Svelte 5 component that wraps a [`bits-ui`](https://bits-ui.com) headless primitive with the project's design tokens, `tailwind-variants` axes, tests, demo route, and release-ready commit. Each bit is its own published package at `components/<name>/` (`@wimwian-org/<name>`). The workflow has seven phases; track them all with `TodoWrite`.

Initial request: $ARGUMENTS

## Core Principles

- **Wrap, don't reinvent.** Every bit sits on top of a `bits-ui` primitive (Root + parts). Accessibility, focus management, keyboard nav, and ARIA come from there — your job is styling and ergonomics, not behaviour.
- **Tokens, not literals.** All colours read `--color-c-*` (retintable per tint) or `--color-g-*` (always neutral). No `bg-blue-500`, no hex. See [`.claude/styling.md`](../styling.md) and [`.claude/css-authoring.md`](../css-authoring.md).
- **`tailwind-variants`, not ad-hoc strings.** Variant/size/tint composition lives in a `<name>.variants.ts` `tv()` config; the `.svelte` file composes it via `twMerge(<name>({ … }), className)`. See [`.claude/variants.md`](../variants.md).
- **The Button bit is the canonical template.** When in doubt, copy its file shape, prop typing, variants config, and CSS conventions. See [`components/button/`](../../components/button/).
- **Use TodoWrite.** Track all phases as todos; mark complete as you finish each.
- **Git flow via `bin/wt`.** Start a `feature/<slug>` worktree via `bin/wt feature` in Phase 5; run the gauntlet in Phase 6; land in Phase 7. Never commit to `master` or `dev` directly. The new bit's branch is ALWAYS cut from `dev`. Multiple bits in flight is supported and expected. See [`.claude/gitflow.md`](../gitflow.md) § "Parallel Work with Worktrees".
- **Auto-changeset is wired.** A `feat:` commit triggers `post-commit` → `scripts/auto-changeset.mjs` → minor-bump changeset amended into the same commit. Don't run `pnpm changeset` manually unless you need a hand-crafted release note.

---

## ⛔ Hard precondition: feature branch + worktree BEFORE any write

**No `Write`, `Edit`, `NotebookEdit`, or any file-creation tool may run until the `bin/wt feature <slug>` step in Phase 5 has completed and the current working directory is the new worktree.** This is non-negotiable and overrides any phase ordering elsewhere in this document.

**Why:** `dev` and `master` working trees only become dirty via merge from a feature/release/hotfix branch, never from a direct commit (the auto-changeset hook is intentionally suppressed on `dev`/`master` for this reason — see [`.claude/gitflow.md`](../gitflow.md)). Writing a single scaffolded file on `dev` puts the repo into a state no other workflow can recover from cleanly.

**How to apply, every single time before any write:**

1. Run `git branch --show-current` and confirm the branch name.
2. **If the branch is `dev`, `master`, or `HEAD` (detached) — STOP. Do not write. Do not edit.** You are in the primary checkout. Phases 1–4 are read-only and conversational.
3. The only acceptable transition out of step 2 is **Phase 5, step 1**: `bin/wt feature <kebab-slug>` followed by `cd ../sui.worktrees/<kebab-slug>`. After that, re-run `git branch --show-current` from the new directory; it must report `feature/<kebab-slug>`.
4. After Phase 7's finish, you are back in the primary checkout on `dev`. Do not write there either — the work is done.

See [`never-commit-protected-branches.md`](../../../.claude/projects/-Users-apancha-WebstormProjects-sui/memory/never-commit-protected-branches.md) (memory) for the project-wide version of this rule.

## Required reading before Phase 4

Before you propose architecture, re-read these in order:

1. [`.claude/bits.md`](../bits.md) — the canonical wrapping pattern (single vs compound exports, `child` snippet, ref binding).
2. [`.claude/component.md`](../component.md) — bit standards: prop design, accessibility checklist, file structure.
3. [`.claude/variants.md`](../variants.md) — `tailwind-variants` `tv()` slot/variant configuration.
4. [`.claude/styling.md`](../styling.md) — design tokens, `--L`/`--D` toggle, elevation tokens, `@layer components` rule.
5. [`.claude/css-authoring.md`](../css-authoring.md) — `@reference "@wimwian-org/theme"`, semantic class naming, `data-slot`.
6. [`.claude/testing.md`](../testing.md) — Vitest browser-mode (`vitest-browser-svelte`, `@vitest/browser/context`, `createRawSnippet` for children).
7. [`components/button/`](../../components/button/) — the seven files (`Button.svelte` / `button.css` / `button.variants.ts` / `button.variants.test.ts` / `types.ts` / `index.ts` / `Button.test.ts`).

---

## Phase 1: Discovery

**Goal:** identify the primitive and its purpose.

**Actions:**

1. Create a todo list covering all seven phases.
2. If `$ARGUMENTS` is empty or ambiguous, ask the user:
    - Which `bits-ui` primitive? Reference the list in [`.claude/bits.md`](../bits.md) (Accordion, Alert Dialog, Aspect Ratio, Avatar, Button, Calendar, Checkbox, Collapsible, Combobox, Command, Context Menu, Date Field, Date Picker, Date Range Field, Date Range Picker, Dialog, Dropdown Menu, Label, Link Preview, Menubar, Meter, Navigation Menu, Pagination, Pin Input, Popover, Progress, Radio Group, Range Calendar, Rating Group, Scroll Area, Select, Separator, Slider, Switch, Tabs, Time Field, Time Range Field, Toggle, Toggle Group, Toolbar, Tooltip).
    - Is there a specific surface area you care about? (e.g. only the floating panel for Popover, not the trigger button.)
    - Any unique props or states the user already knows they want?
3. Confirm the slug you'll use for the package, branch, and route:
    - PascalCase for the component name (`Dialog`, `Tabs`, `Tooltip`).
    - kebab-case for the package, paths, and the git-flow branch (`dialog`, `tabs`, `tooltip`).
4. **Check it doesn't already exist** at `components/<kebab-name>/`. If it does, stop and tell the user — use the standard feature-branch flow to modify it instead.

---

## Phase 2: Reference exploration

**Goal:** understand the primitive's API and the wrapper template.

**Actions:**

1. **Fetch the bits-ui docs** for the primitive via `WebFetch`. The LLM-optimised URL is:

    ```
    https://bits-ui.com/docs/components/<kebab-name>/llms.txt
    ```

    Pay attention to:
    - The parts list (`Root`, `Trigger`, `Content`, `Portal`, …) — tells you single-export vs compound-export.
    - Required props on `Root` and which are bindable.
    - Built-in keyboard / focus behaviour you must NOT reimplement.
    - Data attributes (`data-state`, `data-disabled`, …) you can hook for CSS state targeting.

2. **Launch a `code-explorer` agent** to map the canonical Button bit + any analogous existing wrapper:

    ```
    Trace components/button/ end-to-end: Button.svelte's wrapping pattern and
    import order (bits-ui → '@wimwian-org/theme' → './button.css' → './button.variants'
    → 'tailwind-merge' → './types'), types.ts's prop extension via the bits-ui
    Root props + variant axes, button.variants.ts's tv() config, button.css's
    token-block + @layer components structure, and Button.test.ts's browser-mode
    fixture (createRawSnippet for children). Return the 6–8 patterns I must
    replicate in a new bit, and name the closest analogous existing component.
    ```

3. **Read the files the agent identifies**, plus a sibling that wraps a similar primitive (e.g. [`components/switch/`](../../components/switch/) for a compound thumb part). Don't trust the agent's summary without reading the cited source.

4. Summarise findings: parts list, recommended single-vs-compound shape, the `variant`/`tint`/`size` axes Button uses, the `data-*` attribute conventions, and the `@reference "@wimwian-org/theme"` + `@layer components` CSS rule.

---

## Phase 3: Clarifying questions

**Goal:** lock down every axis before any code is written. **CRITICAL: do not skip. Ask all questions in one organised list and wait.**

**Standard axes to clarify:**

1. **Variants** — which surface treatments? Button has `solid`/`soft`/`outline`/`ghost`. Some primitives need fewer (Tooltip is usually one); some need different terminology.
2. **Sizes** — typically `sm` / `md` / `lg`. Confirm or override.
3. **Tints** — default is `neutral` + `primary` / `secondary` / `error` / `warning` / `success`. Anything to add or remove?
4. **States** — beyond `disabled`: `loading` (Button), `indeterminate` (Checkbox), `invalid` (form fields), `open` (Disclosure)?
5. **Composition shape** — single-export (`<Dialog …>`) or compound (`<Tabs.Root> <Tabs.List> <Tabs.Trigger>`)? See [`.claude/bits.md`](../bits.md) § "Composing Multi-Part Primitives".
6. **`child` snippet?** — does the consumer need full control over the rendered element? If yes, expose the bits-ui `child` snippet pattern.
7. **Demo coverage matrix** — for the demo route, what's the variant × tint × size × state grid?
8. **Tests** — minimum: render, variant/size/tint class composition, event forwarding, disabled/loading state, `ref` binding. Anything bit-specific (e.g. Slider: arrow-key changes the value)?

If the user says "whatever you think is best", recommend based on the Button bit's choices and get explicit confirmation.

---

## Phase 4: Architecture design

**Goal:** propose 2–3 concrete component designs and pick one.

**Actions:**

1. **Launch 2–3 `code-architect` agents in parallel**, each with a different lens:

    ```
    Agent 1 (minimal-changes):
    Design <Component>.svelte as a single-export wrapper of bits-ui <Primitive>,
    matching the Button bit exactly. Inherit variant/tint/size axes from Button's
    tv() config. Return file scaffolds for *.svelte, *.css, *.variants.ts,
    *.variants.test.ts, types.ts, index.ts, *.test.ts, plus the prop type
    signature and the variant class composition.
    ```

    ```
    Agent 2 (idiomatic-bits-ui):
    Design <Component> following bits-ui's compound-export pattern (Root/Trigger/
    Content/…) if the primitive exposes multiple parts. Return the file layout,
    each subpart's wrapper, and the consumer API.
    ```

    ```
    Agent 3 (pragmatic-balance):
    Design <Component> with a single-export default for the common case but expose
    subparts via named exports for advanced use. Compare the resulting consumer API
    to the other two approaches.
    ```

2. **Read all files** each agent flags. Don't trust proposals without reading the cited source.

3. Present to the user: a one-paragraph summary per approach, a trade-offs table (ergonomics / flexibility / file count / consistency with Button), **your recommendation with reasoning** (default lean: match Button's single-export pattern unless the parts list strongly argues for compound), and ask which to proceed with.

---

## Phase 5: Implementation

**WAIT FOR APPROVAL** before writing any code.

**Actions:**

1. **Start the feature worktree via `bin/wt` — always from `dev`.**

    `bin/wt feature` creates `feature/<slug>` from the current `dev` HEAD in a sibling worktree. Never piggyback a new bit on an in-flight feature branch.

    ```bash
    # From the primary checkout (on dev). bin/wt fetches origin/dev and branches off it.
    bin/wt feature <kebab-slug>

    # Move into the new worktree. THIS is where all subsequent writes happen.
    cd ../sui.worktrees/<kebab-slug>

    # Install deps in the worktree (cheap — pnpm hardlinks from the shared store).
    pnpm install

    # Verify before writing anything.
    git branch --show-current       # must print: feature/<kebab-slug>
    git log --oneline -3            # parent should be dev's latest, not stale
    ```

    **Do not skip the `cd`.** Staying in the primary checkout means editing `dev` — forbidden by the [Hard precondition](#-hard-precondition-feature-branch--worktree-before-any-write).

2. **Scaffold the package** at `components/<kebab-name>/`, mirroring [`components/button/`](../../components/button/):
    - **`package.json`** — name `@wimwian-org/<name>`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, `"files": ["src"]`, `"publishConfig": { "access": "public" }`, MIT author/license. `dependencies`: `bits-ui`, `tailwind-merge`, `tailwind-variants`. `peerDependencies`: `@wimwian-org/theme: workspace:*`, `svelte: ^5.0.0`, `tailwindcss: ^4.0.0`. `devDependencies` mirror a sibling. Copy `components/button/package.json` and edit.
    - **`tsconfig.json`** — copy from a sibling component.
    - **`README.md`**, **`LICENSE`**, **`CHANGELOG.md`** (initial) — match siblings.
    - **`src/` files** (each begins with the `@wimwian-org/<name>` MIT license-header comment block, as in existing files):
        - **`<Component>.svelte`** — start from the [Button template](../../components/button/src/Button.svelte). Import order:

            ```svelte
            <script lang="ts">
                import { ComponentName as BitsComponent } from 'bits-ui';
                import '@wimwian-org/theme';
                import './component-name.css';
                import { componentName } from './component-name.variants';
                import { twMerge } from 'tailwind-merge';
                import type { Props } from './types';

                let {
                    variant = 'solid',
                    tint = 'neutral',
                    size = 'md',
                    /* state flags */
                    class: className = '',
                    children,
                    ref = $bindable<HTMLElement | null>(null),
                    ...restProps
                }: Props = $props();

                let cls = $derived(twMerge(componentName({ variant, size, tint }), String(className ?? '')));
            </script>

            <BitsComponent.Root bind:ref class={cls} data-variant={variant} data-tint={tint} {...restProps}>
                {@render children?.()}
            </BitsComponent.Root>
            ```

        - **`component-name.variants.ts`** — `tv()` config exporting the `componentName` const and `ComponentNameVariants = VariantProps<typeof componentName>` type. Base class is a short semantic prefix; variants map to component classes; `tint` maps to the tint utility names; set `defaultVariants`.
        - **`component-name.css`** — `@reference "@wimwian-org/theme";` then all rules inside `@layer components { … }`. **Tokens-first**: declare a `--…` token block at the top of the base class, then reference via `var()` below. All colours via `--color-c-*` / `--color-g-*`; never inline hex/rgb; no `.dark` selector.
        - **`types.ts`** — `Props` derived from the variants (`ComponentNameVariant`/`Tint`/`Size` via `NonNullable<ComponentNameVariants[...]>`) combined with `BitsComponent.RootProps & OwnProps`. Export the axis types.
        - **`index.ts`** — license header; re-export the default component, the `componentName` variants const + `ComponentNameVariants` type, and the `Props`/axis types (see [`components/badge/src/index.ts`](../../components/badge/src/index.ts)).
        - **`<Component>.test.ts`** — Vitest **browser-mode**: `import { page } from '@vitest/browser/context'`, `import { render } from 'vitest-browser-svelte'`, `createRawSnippet` from `svelte` for the `children` prop. Minimum coverage per [`.claude/component.md`](../component.md) § 8 and [`.claude/testing.md`](../testing.md).
        - **`component-name.variants.test.ts`** — assert the `tv()` config returns the expected class strings per variant combination.

3. **Create the demo route** at `apps/playground/src/routes/<kebab-slug>/+page.svelte`:
    - Imports the bit from `@wimwian-org/<name>`.
    - Renders every variant × tint × size matrix agreed in Phase 3.
    - Adds label chips matching the existing demo pages; state-toggle buttons for interactive state (e.g. open/closed for Dialog).

4. **Register the demo** in `apps/playground/src/routes/+page.svelte` — add an entry to the `sections` array:

    ```ts
    { title: '<Component Name>', group: '<Composition | Feedback | Form Field | Visual Element | Stylesheet>', description: '<short blurb>', href: '/<kebab-slug>' },
    ```

---

## Phase 6: Quality review

**Goal:** prove the bit is correct, accessible, and follows project conventions before merging.

**Actions:**

1. **Run the gauntlet** — every step green (see [`CLAUDE.md`](../../CLAUDE.md) § "Before Shipping"):

    ```bash
    pnpm check                                   # svelte-check (workspace)
    pnpm lint                                    # eslint
    pnpm --filter @wimwian-org/<name> check              # the component's own types
    pnpm test:browser                            # browser-mode component tests
    pnpm --filter @wimwian-org/playground build          # demo site builds
    ```

    Any failure: stop, fix, re-run. Do not commit red.

2. **Launch 3 `code-reviewer` agents in parallel** with project context:

    ```
    Agent 1 (conventions):
    Review components/<name>/ against CLAUDE.md, .claude/bits.md, .claude/component.md,
    .claude/variants.md, .claude/styling.md. Flag any deviation: hardcoded colours,
    missing @layer components / @reference "@wimwian-org/theme", missing data-* attrs, missing
    ref bindable, prop type not extending the bits-ui Root props, variant composition
    not going through tailwind-variants, package.json shape (exports/files/peerDeps
    @wimwian-org/theme workspace:*).
    ```

    ```
    Agent 2 (accessibility):
    Review the new bit for the a11y checklist in .claude/component.md § 6. Verify the
    bits-ui primitive's a11y is preserved and not double-wrapped (semantic roles,
    focus indicators via outline-c-500, aria-* attributes, keyboard nav). Confirm AA
    contrast (4.5:1 text / 3:1 UI) in BOTH light and dark via the token scales.
    ```

    ```
    Agent 3 (test coverage):
    Review the *.test.ts and *.variants.test.ts against .claude/testing.md. Confirm
    every variant/size/tint axis has a test, every state flag has a test, event
    forwarding is verified, and ref binding is checked.
    ```

3. **Visually verify in both themes.** Run `pnpm --filter @wimwian-org/playground dev`, open `/<kebab-slug>`, and check AA contrast in light AND dark, all variants retint per tint, and a visible focus indicator on keyboard tab.

4. **Present consolidated findings.** Ask: fix now, fix later, or proceed.

---

## Phase 7: Land

**Goal:** commit, merge, document.

**Actions:**

1. **Pause and show the user** the list of changed files before committing (project convention).

2. **Commit** with a conventional message (use `pnpm commit`, or `git commit -m` directly):

    ```bash
    git add .
    git commit -m "feat(<slug>): add <Component> bit wrapping bits-ui <Primitive>"
    ```

    Hooks fire (per [`.claude/tooling.md`](../tooling.md)): `pre-commit` (prettier + eslint + check), `commit-msg` (commitlint), `post-commit` (`scripts/auto-changeset.mjs` writes a minor-bump `.changeset/auto-*.md` for `feat:` and amends it into the same commit).

3. **Verify the changeset landed in the commit** (not as an orphan):

    ```bash
    git show --stat HEAD | grep changeset
    git status                   # working tree must be clean
    ```

4. **Refresh the homepage status snapshot** the per-component cards read:

    ```bash
    pnpm status
    ```

5. **Pause for user approval, then land.** From the primary checkout (where `dev` lives), per [`.claude/gitflow.md`](../gitflow.md). Order matters — remove the worktree FIRST (so `git branch -d` won't refuse a checked-out branch):

    ```bash
    cd /Users/apancha/WebstormProjects/sui
    bin/wt rm <kebab-slug>                    # remove worktree first (frees the branch)
    git flow feature finish <kebab-slug>      # merges into local dev, deletes the branch
    ```

    Landing on **origin** `dev` is **protected** — it only accepts a PR from a git-flow branch (the `guard-dev` check enforces the prefix), so push the feature branch and open a PR into `dev` rather than pushing `dev` directly:

    ```bash
    git push -u origin feature/<kebab-slug>
    gh pr create --base dev --head feature/<kebab-slug> --title "feat(<slug>): add <Component>" --body "…"
    ```

    The release flow consumes the changeset when a `release/vX.Y.Z` branch is cut from `dev` (see [`.claude/distribution.md`](../distribution.md)).

6. **Mark all todos complete** and produce a summary:
    - Component name + the bits-ui primitive it wraps.
    - File list (`components/<name>/…`, `apps/playground/src/routes/<slug>/…`).
    - Variant × tint × size matrix the demo covers.
    - Test count (component + variants).
    - The changeset (`.changeset/auto-*.md`) and its bump kind.
    - Anything deferred.

---

## Notes on agent reuse

This command reuses the three [`feature-dev`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/feature-dev) agents:

- **`code-explorer`** — Phase 2, mapping the Button template.
- **`code-architect`** — Phase 4, designing alternative shapes.
- **`code-reviewer`** — Phase 6, three parallel reviews.

The specialisation comes from the prompts above plus this project's `CLAUDE.md` + `.claude/*.md` docs.

## When NOT to use this command

- **A `bits-ui` primitive doesn't exist** (e.g. Card, Skeleton, Badge are pure presentation). Skip this command — write a plain Svelte component but keep the bit conventions (file shape, `class` + `ref` + `...restProps`, `tailwind-variants`, types extending `HTMLAttributes<…>`). Document why no primitive is wrapped.
- **You want to adapt a shadcn-svelte component** — use [`/create-shadcn`](./create-shadcn.md).
- **You want to model a Svelte Material UI component** — use [`/create-mui`](./create-mui.md).
- **You want to copy an existing component from a reference repo** — use [`/create-component`](./create-component.md).
- **Single-line fixes or doc-only changes** — use the standard feature-branch flow without this command's overhead.
