---
description: Review a Svelte Material UI (SMUI) component and rebuild it as a @sui bit adapted to this project's design tokens, tailwind-variants, conventions, tests, demo route, and git-flow integration
argument-hint: One or more component names (e.g. "Button", "Card, Textfield") or leave empty to be asked
---

# Create MUI

You are helping the developer add one or more components to **sui** by **referring to** a specific [**Svelte Material UI (SMUI)**](https://sveltematerialui.com) component as the blueprint, then building a native `@wimwian-org/<name>` bit that adapts it to this project's design tokens, Svelte 5 runes, `tailwind-variants` conventions, tests, demo route, and release-ready commit.

**This is "refer to", not "wholesale rewrite", and not "depend on".** The model is exactly how [`@wimwian-org/data-grid`](../../components/data-grid/) relates to [SVAR](https://svar.dev): SVAR's column model and feature set were the **reference**, and `@wimwian-org/data-grid` is an **independent implementation** on sui tokens that neither bundles nor copies SVAR. Do the same here — treat the named SMUI component (e.g. **MaterialInput**, **TimePicker**) as the authoritative source for anatomy, API surface, behaviour, and accessibility, then express that on sui's tokens and conventions. Don't reinvent Material from first principles (that's a wholesale rewrite), and don't add `@smui/*` / `@material/*` as a dependency (that's depending). **Credit the reference you resolved** — the SMUI component, or the Material Design 3 spec when SMUI ships none — in the component's README, the way data-grid credits SVAR.

The workflow has seven phases. Use `TodoWrite` to track them all upfront. When the user requests **several** components, run phases 1–4 once to scope the whole batch, then repeat phases 5–7 per component (each component is its own `components/<name>/` package on its own `feature/<slug>` branch).

Initial request: $ARGUMENTS

## Core Principles

- **Refer to the SMUI component; don't depend on it, don't reinvent it.** SMUI is built on Material Components for the Web (MDC) — SCSS/Sass theming, `@material/*` packages, and a ripple engine. That stack is fundamentally incompatible with this project's Tailwind v4 + oklch design-token system, so it can't be wrapped directly. **Never add `@smui/*` or `@material/*` as dependencies.** Equally, don't ignore SMUI and rebuild Material from memory — the named SMUI component **is** the spec. Read its markup, props, behaviour, and a11y, then re-express them on sui tokens. (Same posture as `@wimwian-org/data-grid` ↔ SVAR.)
- **Resolve the reference in order: SMUI → Material 3 → ask.** SMUI doesn't cover every Material component (e.g. it ships **no time picker**). If SMUI doesn't publish the requested component, fall back to the **[Material Design 3 spec](https://m3.material.io)** (same design language); if it's in **neither**, **STOP and ask the user for a reference link** rather than inventing it. See the [Reference resolution guard](#-reference-resolution-guard-smui--material-3--ask). Then build on sui tokens and a `bits-ui` primitive where one fits. (TimePicker → [M3 time-pickers](https://m3.material.io/components/time-pickers/overview) + `bits-ui` Time Field.)
- **Adapt the Material language, keep the project's tokens.** Express Material's visual cues — elevation/shadow, shape (corner radius), state layers, typography scale — through the project's existing tokens (`--surface-*`, `--canvas-*`, `--page-*`, `--color-c-*`, `--color-g-*`). See the [Material → token mapping](#material--token-mapping-reference) below and [`.claude/styling.md`](../styling.md).
- **Credit the reference.** Every component built via this command gets an **Acknowledgements** section in its README crediting the reference it was modelled on — the SMUI component, or the Material Design 3 spec when SMUI has none (mirroring [`@wimwian-org/data-grid`](../../components/data-grid/README.md)'s SVAR credit; see [`@wimwian-org/material-time-picker`](../../components/material-time-picker/README.md) for the M3 case). Phase 7 enforces this.
- **Wrap a `bits-ui` primitive when one exists for the behaviour.** Material's interactive components (Dialog, Menu, Select, Checkbox, Switch, Slider, Tabs, Tooltip, …) have headless `bits-ui` equivalents that already own focus management, keyboard nav, and ARIA. Wrap those rather than reimplementing behaviour — exactly like [`/create-bit`](./create-bit.md). For purely presentational Material components (Card, Paper, Badge, Linear/Circular Progress chrome), build a plain Svelte component keeping the bit file conventions.
- **`tailwind-variants`, not ad-hoc strings.** Variant/size/tint composition lives in a `<name>.variants.ts` `tv()` config; the `.svelte` file composes it via `twMerge(<name>({ ... }), className)`. See [`.claude/variants.md`](../variants.md) and an existing component such as [`components/switch/`](../../components/switch/).
- **Tokens, not literals.** All colours read `--color-c-*` (retintable per tint) or `--color-g-*` (always neutral). No `bg-blue-500`, no `#6200ee` (Material purple), no MDC Sass variables in the output. See [`.claude/css-authoring.md`](../css-authoring.md).
- **Drop the ripple.** Material's ink ripple is not part of this design system. Replace it with the project's focus + hover affordances (`focus-visible` outline via `--color-c-500`, a hover background ramp). Note the omission to the user; do not port MDC's ripple JS.
- **Git flow via `bin/wt`.** Feature branch + worktree before any write. Never commit to `master` or `dev` directly. See [`.claude/gitflow.md`](../gitflow.md).
- **Auto-changeset is wired.** A `feat:` commit triggers `post-commit` → minor-bump changeset amended into the same commit. Don't run `pnpm changeset` manually.

---

## ⛔ Hard precondition: feature branch + worktree BEFORE any write

**No `Write`, `Edit`, `NotebookEdit`, or any file-creation tool may run until the `bin/wt feature <slug>` step in Phase 5 has completed and the current working directory is the new worktree.** This is non-negotiable and overrides any phase ordering elsewhere in this document.

**Why:** `dev` and `master` working trees only become dirty via merge from a feature/release/hotfix branch, never from a direct commit (the auto-changeset hook is intentionally suppressed on `dev`/`master` for this reason — see [`.claude/gitflow.md`](../gitflow.md)).

**How to apply, every time before any write:**

1. Run `git branch --show-current` and confirm the branch name.
2. **If the branch is `dev`, `master`, or `HEAD` (detached) — STOP. Do not write.** Phases 1–4 are read-only and conversational.
3. The only acceptable transition is Phase 5, step 1: `bin/wt feature <kebab-slug>` followed by `cd ../sui.worktrees/<kebab-slug>`. After that, `git branch --show-current` must print `feature/<kebab-slug>`.
4. After Phase 7's `bin/wt feature finish` (or PR merge), you are back in the primary checkout on `dev`. Do not write there either.

---

## ⛔ Reference resolution guard: SMUI → Material 3 → ask

Before any design or code, you MUST have an authoritative reference for the requested component. Resolve it in this strict order and **stop at the first hit**:

1. **SMUI publishes it** → use the SMUI demo + source as the reference (Phase 2). Confirm by finding the component in the SMUI nav (`https://sveltematerialui.com/`) or a `200` demo page (`https://sveltematerialui.com/demo/<component>/`, slugs lower-cased) or a `packages/<name>` dir in [`hperrin/svelte-material-ui`](https://github.com/hperrin/svelte-material-ui/tree/master/packages).
2. **SMUI does NOT publish it** → fall back to the **Material Design 3 spec**: `https://m3.material.io/components/<name>/overview`. Confirm the page exists and documents the component (e.g. TimePicker → [m3 time-pickers](https://m3.material.io/components/time-pickers/overview)).
3. **Not in SMUI and not in Material 3** → **STOP and ask the user for a reference link** (a demo, spec, or design URL). Do **not** invent the component's anatomy/behaviour from memory. Quote what you checked (SMUI nav + demo + `packages/`, and the M3 `/components/<name>/` path) and wait for the user's link before continuing to Phase 2.

Record which rung resolved the reference; carry it into Phase 2 and the Phase 7 summary. (This is the create-mui analogue of how `@wimwian-org/data-grid` named SVAR as its reference — every component must cite a concrete source.)

---

## Required reading before Phase 4

Before proposing architecture, re-read these in order:

1. [`.claude/bits.md`](../bits.md) — the canonical `bits-ui` wrapping pattern (single vs compound exports, `child` snippet, ref binding).
2. [`.claude/component.md`](../component.md) — bit standards: prop design, accessibility checklist, file structure.
3. [`.claude/variants.md`](../variants.md) — `tailwind-variants` `tv()` slot/variant configuration.
4. [`.claude/styling.md`](../styling.md) — design tokens, `--L`/`--D` toggle, elevation tokens.
5. [`.claude/css-authoring.md`](../css-authoring.md) — `@reference "@wimwian-org/theme"`, `@layer components`, semantic class naming.
6. [`.claude/testing.md`](../testing.md) — Vitest browser-mode (`vitest-browser-svelte`, `@vitest/browser/context`).
7. A representative existing component — [`components/switch/`](../../components/switch/) (bits-ui wrapper) or [`components/badge/`](../../components/badge/) (polymorphic presentational). These are the canonical templates for file shape, prop typing, variants, and CSS.

---

## Material → token mapping reference

Authoritative Material/MDC → project translation. Consult during Phase 3, apply mechanically during Phase 5. (Material theme keys vary slightly across MDC versions — map by role, not by exact name.)

| Material / MDC role                         | Project equivalent                                                                    | Rationale                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `primary`                                   | `bg-c-600` (solid) / `--color-c-*`                                                    | Primary interactive colour — retintable via tint utils |
| `on-primary`                                | `text-c-0`                                                                            | Text/icon on the primary surface                       |
| `secondary`                                 | `.secondary` tint or `--color-g-*`                                                    | Secondary identity                                     |
| `surface`                                   | `var(--canvas-bg)`                                                                    | Cards, menus, sheets, dialogs                          |
| `on-surface`                                | `var(--canvas-fg)`                                                                    | Text on a surface                                      |
| `background`                                | `var(--page-bg)`                                                                      | Page/document ground                                   |
| `on-background`                             | `var(--page-fg)`                                                                      | Text on the page ground                                |
| `error`                                     | `var(--color-error-500)`                                                              | Error / danger                                         |
| `outline` / divider                         | `var(--canvas-border)` or `border-g-200`                                              | Borders, dividers, outlined fields                     |
| elevation (dp shadow, e.g. `$elevation-8`)  | `var(--surface-shadow)` / `var(--canvas-shadow)` / `var(--page-shadow)`               | Use the project's three-layer elevation tokens         |
| state layer (hover/focus/press overlay)     | hover background ramp (`hover:bg-c-700`) + `focus-visible` outline                    | No translucent ink overlay; ramp the token instead     |
| ripple                                      | _omit_ — `focus-visible:outline-c-500 outline-2 outline-offset-2` + hover ramp        | Ripple is not part of this design system               |
| shape / corner radius (`$shape-radius`)     | `rounded-md` (or `rounded`, `rounded-full` per component)                             | Fixed Tailwind radii                                   |
| typography (Roboto scale, `mdc-typography`) | project typography utilities (`@wimwian-org/theme/typography`) — keep or map nearest  | See [`.claude/styling.md`](../styling.md)              |
| disabled (38% opacity convention)           | project disabled treatment — `data-disabled` hook + dimmed token, **not** raw opacity | Mirror an existing component's disabled rules          |

> **Dark mode is automatic.** The project's `--page-*`, `--canvas-*`, `--surface-*`, `--color-g-*`, and `--color-c-*` tokens all flip via the internal `--L`/`--D` space-toggle bound to `html[data-theme]`. **Never** add a `.dark` selector, a `@media (prefers-color-scheme: dark)` block, or Material's own dark-theme mixins. See [`.claude/styling.md`](../styling.md) § "Theme Registers".

---

## Phase 1: Discovery

**Goal:** identify the requested Material component(s) and confirm SMUI provides each.

**Actions:**

1. Create a `TodoWrite` list covering all seven phases (plus a per-component sub-list if a batch was requested).
2. If `$ARGUMENTS` is empty or ambiguous, ask the user which Material component(s) they want. The current named targets are **MaterialInput** (Material text field) — reference SMUI's [Text Field](https://sveltematerialui.com/demo/textfield/) — and **TimePicker** — SMUI ships no time picker, so reference the **[Material Design 3 time-pickers spec](https://m3.material.io/components/time-pickers/overview)** (dial + keyboard-input modes, hour/minute selectors, AM/PM toggle), backing the interactive behaviour with the `bits-ui` Time Field primitive. Other SMUI components worth building: `Button`, `Icon Button`, `Fab`, `Segmented Button`, `Card`, `Paper`, `Badge`, `Chips`, `Checkbox`, `Radio`, `Switch`, `Slider`, `Select`, `Autocomplete`, `Form Field`, `Dialog`, `Drawer`, `Menu`, `List`, `Tab Bar`, `Data Table`, `Snackbar`, `Banner`, `Tooltip`, `Linear Progress`, `Circular Progress`, `Top App Bar`, `Layout Grid`, `Image List`.
3. For each, determine names:
    - PascalCase for the component (`Button`, `Card`, `Textfield`).
    - kebab-case for the package, paths, route, and branch (`button`, `card`, `textfield`).
4. **Check it doesn't already exist** at `components/<kebab-name>/`. If it does, stop and tell the user — use the standard feature-branch flow to modify it instead. (Note: many Material components overlap with existing `@wimwian-org/*` bits — Button, Card, Checkbox, Switch, Slider, Dialog, Tooltip, etc. already exist. Flag overlaps early.)

---

## Phase 2: Reference review

**Goal:** understand each Material component's anatomy, API, behaviour, and accessibility from SMUI — and decide whether a `bits-ui` primitive backs the behaviour.

**Actions:**

1. **Fetch the SMUI demo/docs** for the component with `WebFetch`:

    ```
    https://sveltematerialui.com/demo/<component>/
    ```

    SMUI demo slugs are **lower-cased** (e.g. `/demo/button/`, `/demo/card/`, `/demo/textfield/`). If a slug 404s, fetch the SMUI home page `https://sveltematerialui.com/` and find the component's nav link. Apply the [Reference resolution guard](#-reference-resolution-guard-smui--material-3--ask): **if SMUI has no such component** (e.g. the time picker), reference the **Material Design 3 spec** (`https://m3.material.io/components/<name>/overview`); **if it's in neither**, STOP and ask the user for a reference link before continuing. Back the behaviour with the closest `bits-ui` primitive.

2. **Fetch the SMUI source** for deeper structure when the demo isn't enough:

    ```
    https://github.com/hperrin/svelte-material-ui/tree/master/packages/<kebab-name>
    ```

    Read the component's `.svelte` markup and exported props. Note the SMUI sub-component breakdown (e.g. `Card` → `Content`, `Actions`, `Media`; `Textfield` → `Textfield`, `HelperText`, `Icon`).

3. **Map the behaviour to a `bits-ui` primitive** where one exists. Cross-reference [`.claude/bits.md`](../bits.md) and the bits-ui docs (`https://bits-ui.com/docs/components/<kebab-name>/llms.txt`). Decide per component:
    - **Wrap bits-ui** — interactive components with a headless equivalent (Dialog, Menu, Select, Checkbox, Radio, Switch, Slider, Tabs, Tooltip, Accordion, Progress…).
    - **Plain bit** — presentational Material chrome with no behaviour (Card, Paper, Badge, Layout Grid, Image List, the visual shells of progress indicators).

4. **Launch a `code-explorer` agent** to map the closest existing `@sui` component as a template:

    ```
    Trace components/switch/ (or components/badge/ for a presentational
    component) end-to-end: the .svelte wrapping pattern and import order,
    types.ts prop extension, <name>.variants.ts tv() config, <name>.css
    token-block + @layer components structure, and the *.test.ts browser-mode
    fixture. Return the 6–8 patterns I must replicate for a new component.
    ```

5. **Summarise** per component: Material anatomy + sub-parts, the SMUI prop surface, the chosen backing (bits-ui primitive vs plain), a11y notes (roles, keyboard, focus), and the closest existing template.

---

## Phase 3: Inspection and token mapping

**Goal:** translate each component's Material theming and structure to project tokens and the bit conventions. **Read-only — no files written.**

**Actions:**

1. For each component, build the concrete plan:
    - Every Material colour/elevation/shape role → project token, via the [mapping table](#material--token-mapping-reference).
    - The `tv()` variant axes (`variant`, `size`, `tint`) and their class names.
    - Which Material sub-parts become separate `.svelte` files (compound export) vs a single component. See [`.claude/bits.md`](../bits.md) § "Composing Multi-Part Primitives".
    - The ripple/state-layer replacement strategy (focus outline + hover ramp).
    - Any Material behaviour that must be delegated to bits-ui (and which props bind through).
2. **Identify Material → project departures** explicitly: ripple removal, elevation-token substitution, typography mapping, disabled-treatment substitution, and the deletion of any MDC theme/dark mixins.
3. **Present the mapping** to the user as a table (Material role → project token/class) plus the file list you'll create. Wait for review before Phase 4.

---

## Phase 4: Clarifying questions

**Goal:** lock down variant axes, composition shape, and demo coverage before any code. **Do not skip. Ask all questions in one organised message and wait.**

**Standard axes:**

1. **Variants** — Material often defines visual variants (Button: `text`/`outlined`/`raised`/`unelevated`; Card: `elevated`/`outlined`; Fab: `regular`/`mini`/`extended`). Map each to the project's `variant` axis (lean on existing names: `solid`/`soft`/`outline`/`ghost`) or keep Material names where they're clearer. Propose a mapping.
2. **Tints** — should the component be retintable via `.primary` / `.secondary` / `.error` / `.warning` / `.success`? Interactive/semantic components usually yes; neutral chrome (Paper, Layout Grid) usually no.
3. **Sizes** — `sm` / `md` / `lg`, or a fixed size (e.g. Fab mini/regular)?
4. **States** — beyond `disabled`: `loading`, `invalid`, `selected`, `indeterminate`, `open`?
5. **Composition shape** — single export (`<Card>`) or compound (`<Card.Root> <Card.Content> <Card.Actions>`)? Confirm the sub-part set.
6. **bits-ui `child` snippet?** — does the consumer need control over the rendered element?
7. **Demo coverage matrix** — the variant × tint × size × state grid the demo route renders.

If the user says "your call", recommend based on the closest existing `@sui` component and get explicit confirmation.

---

## Phase 5: Implementation

**WAIT FOR APPROVAL FROM PHASE 4** before writing any code. Repeat this phase per component in a batch.

**Actions:**

1. **Start the feature worktree** (always cut from `dev`):

    ```bash
    bin/wt feature <kebab-slug>
    cd ../sui.worktrees/<kebab-slug>
    pnpm install
    git branch --show-current        # must print: feature/<kebab-slug>
    ```

    Do not skip the `cd`. All subsequent writes happen inside the worktree.

2. **Scaffold the package** at `components/<kebab-name>/`, mirroring an existing component:
    - **`package.json`** — name `@wimwian-org/<name>`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, `"files": ["src"]`, `"publishConfig": { "access": "public" }`, MIT license/author. `dependencies`: `tailwind-merge`, `tailwind-variants`, and `bits-ui` **only if** wrapping a primitive. `peerDependencies`: `@wimwian-org/theme: workspace:*`, `svelte: ^5.0.0`, `tailwindcss: ^4.0.0`. `devDependencies` mirror an existing package. Copy [`components/switch/package.json`](../../components/switch/package.json) and edit. **No `@smui/*` or `@material/*`.**
    - **`tsconfig.json`** — copy from a sibling component.
    - **`README.md`**, **`LICENSE`**, **`CHANGELOG.md`** (empty/initial) — match siblings. The README **must** end with an **Acknowledgements** section crediting the reference it was modelled on — the SMUI component (link its demo), or the Material Design 3 spec (link the `m3.material.io` page) when SMUI ships none — stating that `@wimwian-org/<name>` is an independent implementation that doesn't depend on or copy SMUI / MDC / `@material/*` — mirror [`@wimwian-org/data-grid`](../../components/data-grid/README.md)'s SVAR credit (or [`@wimwian-org/material-time-picker`](../../components/material-time-picker/README.md) for the M3 case) exactly.
    - **`src/` files** (each begins with the `@wimwian-org/<name>` MIT license header comment block, as in existing files):
        - **`<Component>.svelte`** — import order: backing `bits-ui` import (if any) → `import '@wimwian-org/theme'` → `import './<name>.css'` → `import { <name> } from './<name>.variants'` → `import { twMerge } from 'tailwind-merge'` → `import type { Props } from './types'`. Destructure `$props()` with `variant`/`tint`/`size` defaults, state flags, `class: className = ''`, `children`, `ref = $bindable<HTMLElement | null>(null)`, `...restProps`. Compose: `let cls = $derived(twMerge(<name>({ variant, size, tint }), String(className ?? '')))`. Put `class={cls}`, `bind:ref`, `data-*` state hooks, `{...restProps}` on the root. Render `{@render children?.()}`. Convert any SMUI Svelte-4 syntax (`on:click`, `$$props`, `createEventDispatcher`) to Svelte 5 runes/props.
        - **`<name>.variants.ts`** — `tv()` config exporting the `<name>` const and `<Name>Variants = VariantProps<typeof <name>>` type. Base class is a short semantic prefix (e.g. `sw`, `bdg`); variants map to component classes; `tint` maps to the tint utility names; set `defaultVariants`.
        - **`<name>.css`** — `@reference "@wimwian-org/theme";` then all rules inside `@layer components { … }`. **Tokens-first**: declare a token block of `--…` values at the top of the base class, then reference them via `var()` below. All colours via `--color-c-*` / `--color-g-*` / elevation tokens. No hex/rgb, no `.dark` selector.
        - **`types.ts`** — `Props` derived from the variants (`<Name>Variant`/`<Name>Tint`/`<Name>Size` via `NonNullable<<Name>Variants[...]>`) combined with the element or `bits-ui` Root props (e.g. `Primitive.RootProps & OwnProps` for a wrapper, or `HTMLAttributes<HTMLElement> & OwnProps` for presentational). Export the axis types.
        - **`index.ts`** — license header; re-export the default component, the `<name>` variants const + `<Name>Variants` type, and the `Props`/axis types (see [`components/badge/src/index.ts`](../../components/badge/src/index.ts)).
        - **`<Component>.test.ts`** — Vitest **browser-mode**: `import { page } from '@vitest/browser/context'`, `import { render } from 'vitest-browser-svelte'`. Cover: renders with defaults; each `variant`/`tint`/`size` applies the expected class; `disabled` (and other states); event forwarding; `ref` binds; plus any behaviour delegated to bits-ui (role, `data-state`, keyboard).
        - **`<name>.variants.test.ts`** — assert the `tv()` config returns the expected class strings per variant combination.

3. **Create the demo route** at `apps/playground/src/routes/<kebab-name>/+page.svelte`:
    - Import the component from `@wimwian-org/<name>`.
    - Render the full variant × tint × size × state matrix agreed in Phase 4.
    - Add label chips matching the existing demo pages (see [`components/badge/`](../../components/badge/) demo for the pattern).

4. **Register the demo** in `apps/playground/src/routes/+page.svelte` — add an entry to the `sections` array:

    ```ts
    {
        title: '<Component Name>',
        group: 'Material UI',
        description: '<short blurb — variants, tints, sizes, behaviour>',
        href: '/<kebab-name>',
    },
    ```

    **Always use `group: 'Material UI'`** for components built with this command — every `/create-mui` component lands in a dedicated **Material UI** group on the playground home, regardless of what it does. (The home page groups dynamically, so the group appears automatically.)

---

## Phase 6: Quality review

**Goal:** prove each rebuilt component is correct, accessible, token-clean, and Material-faithful before merging.

**Actions:**

1. **Run the gauntlet** — every step green:

    ```bash
    pnpm check                                   # svelte-check (workspace)
    pnpm lint                                    # eslint
    pnpm --filter @wimwian-org/<name> check              # the component's own types
    pnpm test:browser                            # browser-mode component tests
    pnpm --filter @wimwian-org/playground build          # demo site builds
    ```

    Any failure: stop, fix, re-run. Do not commit red. (See [`CLAUDE.md`](../../CLAUDE.md) § "Before Shipping".)

2. **Launch 3 `code-reviewer` agents in parallel:**

    ```
    Agent 1 (token + Material fidelity):
    Review components/<name>/ for leftover Material/MDC artefacts — @smui/* or
    @material/* imports, MDC Sass variables, hardcoded Material hex (#6200ee,
    #03dac6, etc.), ripple JS, .dark selectors, raw opacity for disabled. Verify
    every colour reads --color-c-*/--color-g-*, elevation uses the project shadow
    tokens, the CSS uses @reference "@wimwian-org/theme" + @layer components with a
    tokens-first block, and variant composition goes through tailwind-variants.
    Confirm the Material anatomy (parts, shape, elevation intent) is faithfully
    reproduced with project tokens.
    ```

    ```
    Agent 2 (accessibility):
    Review against .claude/component.md a11y checklist. If a bits-ui primitive
    backs the behaviour, verify it is preserved and not double-wrapped. Check
    semantic roles, keyboard operability, visible focus via outline-c-500 (not a
    ring, not ripple), ARIA attributes, and AA contrast (4.5:1 text / 3:1 UI) in
    BOTH light and dark via the token scales.
    ```

    ```
    Agent 3 (Svelte 5 + conventions):
    Review for Svelte 4 remnants (on:*, $$props, $$restProps, $$slots, $:,
    createEventDispatcher) and confirm $props()/$state/$derived/$bindable(null).
    Verify the package.json shape (exports, files, peerDeps @wimwian-org/theme workspace:*,
    no @smui/* deps), index.ts re-exports component+variants+types, types.ts
    extends the right base, and the *.test.ts + *.variants.test.ts cover every axis.
    ```

3. **Visually verify in both themes.** Run `pnpm --filter @wimwian-org/playground dev`, open `/<kebab-name>`, and check: all variants render in light + dark, focus indicator visible on keyboard tab, tint retinting works (`.primary` shifts the colour), and no Material-purple pixels remain.

4. **Present consolidated findings.** Ask: fix now, fix later, or proceed.

---

## Phase 7: Land

**Goal:** commit, merge, document.

**Actions:**

1. **Pause and show the user** the list of changed files before committing (project convention).

2. **Commit** with a conventional message (use `pnpm commit`, or `git commit -m` directly):

    ```bash
    git add .
    git commit -m "feat(<kebab-slug>): add <Component> — Material component rebuilt on sui tokens"
    ```

    Hooks fire: `pre-commit` (prettier + eslint + check), `commit-msg` (commitlint), `post-commit` (`scripts/auto-changeset.mjs` writes a minor-bump `.changeset/auto-*.md` for `feat:` and amends it into the same commit).

3. **Verify the changeset landed:**

    ```bash
    git show --stat HEAD | grep changeset
    git status                  # clean
    ```

4. **Refresh the homepage status snapshot** (the per-component card data):

    ```bash
    pnpm status
    ```

5. **Pause for user approval, then land.** From the primary checkout (where `dev` lives), per [`.claude/gitflow.md`](../gitflow.md):

    ```bash
    cd /Users/apancha/WebstormProjects/sui
    bin/wt rm <kebab-slug>            # remove worktree FIRST (frees the branch)
    git flow feature finish <kebab-slug>   # merges into local dev, deletes the branch
    ```

    To land on **origin** `dev` is **protected** — it only accepts a PR from a git-flow branch (the `guard-dev` check enforces the prefix). So push the feature branch and open a PR into `dev` instead of pushing `dev` directly:

    ```bash
    git push -u origin feature/<kebab-slug>
    gh pr create --base dev --head feature/<kebab-slug> --title "feat(<slug>): add <Component>" --body "…"
    ```

    The release flow consumes the changeset when a `release/vX.Y.Z` branch is cut from `dev` (see [`/create-bit`](./create-bit.md) and [`.claude/distribution.md`](../distribution.md)).

6. **Mark all todos complete** and produce a summary per component:
    - Component name + the SMUI component it was modelled on (with demo URL).
    - Backing: `bits-ui <primitive>` or plain presentational.
    - File list (`components/<name>/…`, `apps/playground/src/routes/<name>/…`).
    - Material → token mapping applied (ripple removed, elevation/shape/typography substitutions).
    - Confirmation the README **Acknowledgements** section credits the resolved reference (SMUI, or Material Design 3 when SMUI has none).
    - Variant × tint × size matrix the demo covers.
    - Test count (component + variants).
    - Changeset file and bump kind.
    - Anything deferred.

---

## When NOT to use this command

- **The component already exists in `components/`** — most Material staples (Button, Card, Checkbox, Switch, Slider, Dialog, Tooltip, Progress, Menu, Select, Tabs…) are already `@wimwian-org/*` bits. Modify the existing one via the standard feature-branch flow.
- **You want to wrap a `bits-ui` primitive from scratch with no Material reference** — use [`/create-bit`](./create-bit.md).
- **You want to adapt a shadcn-svelte component** — use [`/create-shadcn`](./create-shadcn.md).
- **You want a verbatim Material look-and-feel including ripple and MDC theming** — that contradicts this design system. This command refers to SMUI and re-expresses it on project tokens; if true MDC fidelity is required, SMUI should be consumed directly in a separate app, not added here.
- **Single-line fixes or doc-only changes** — use the standard feature-branch flow.

---

## Notes on SMUI internals

- **SMUI wraps MDC (Material Components for the Web).** Its theming is SCSS/Sass (`@material/theme`, `@material/typography`) compiled at build time — there is no runtime token system to map. Treat SMUI as a **design + behaviour reference**, then express the result with `@wimwian-org/theme` tokens.
- **SMUI components are heavily compound** (e.g. `Textfield` pairs with `HelperText`, `Icon`, `CharacterCounter`; `List` with `Item`, `Graphic`, `Meta`). Decide in Phase 4 which sub-parts this project needs — don't blindly mirror every MDC sub-component.
- **SMUI uses `use:` actions and a ripple store.** Replace `use:Ripple` and MDC actions with project conventions: bits-ui behaviour for interactivity, CSS state hooks (`data-state`, `data-disabled`) for styling.
- **SMUI may still ship Svelte-4-era syntax** (`on:click`, `createEventDispatcher`, `$$restProps`). Convert all of it to Svelte 5 runes and prop callbacks during Phase 5.
- **Material accessibility is generally strong** — preserve the roles, `aria-*`, and keyboard model you observe, but source them from the `bits-ui` primitive where one backs the component (it already implements them).
