---
description: Build a @wimwian-org/<name> bit from a design markdown spec — code, test, and document the component on this project's design tokens, tailwind-variants, conventions, demo route, and git-flow integration, honouring the design doc's MVP scope
argument-hint: A component name and the path to its design markdown (e.g. "TextField components/text-field/text-field-design.md"), or leave empty to be asked
---

# Create From Design

You are helping the developer add a component to **sui** by treating a **design markdown
document as the authoritative spec**, then building a native `@wimwian-org/<name>` bit that expresses
it on this project's design tokens, Svelte 5 runes, `tailwind-variants` conventions, tests, demo
route, and release-ready commit.

**The design doc is the source of truth — not your memory of the component, and not an external
library.** A sui design doc (e.g. [`components/text-field/text-field-design.md`](../../components/text-field/text-field-design.md))
already resolves the architecture, anatomy/parts, variants, design elements, key behaviours,
accessibility, **and an explicit MVP scope** (what ships now vs. what's deferred). Your job is to
**implement exactly what that doc specifies — no more, no less** — on sui's tokens and
conventions. Do not re-design from first principles, do not add features the doc defers, and do
not pull in the upstream libraries the doc was synthesised from as dependencies.

The workflow has seven phases. Use `TodoWrite` to track them all upfront. If the doc describes
**several** components (rare), run phases 1–4 once to scope the batch, then repeat phases 5–7 per
component (each is its own `components/<name>/` package on its own `feature/<slug>` branch).

Initial request: $ARGUMENTS

## Core Principles

- **The design doc is the spec; implement it, don't reinvent it.** Read the doc end-to-end and
  build precisely what it describes. Its architecture, parts, variants, behaviours, and a11y are
  authoritative. Where the doc is silent, fall back to the closest existing `@wimwian-org/*` bit's
  convention — never to an external library's behaviour from memory.
- **Honour the MVP scope. This is the defining rule of this command.** If the doc has an **MVP
  Scope** (or "In scope / Deferred", "v1", "Out of scope") section, build **only the in-scope
  items**. Do not implement, test, or document deferred features — instead leave a clean seam
  (a TODO note in the README's _Scope_ section) for the next release. See the
  [Scope guard](#-scope-guard-build-mvp-defer-the-rest). When the doc has no scope section,
  STOP and confirm the scope with the user before any code.
- **Resolve the design doc first; if it's missing or thin, ask.** You must have a concrete design
  markdown before designing or coding. See the [Design-doc resolution guard](#-design-doc-resolution-guard).
- **Don't depend on the doc's source libraries.** A design doc is typically synthesised from
  references (e.g. MUI, Material Web). Those are **design references**, not dependencies — never
  add `@mui/*`, `@material/*`, `@smui/*`, etc. Build on sui tokens and a `bits-ui` primitive
  where one fits. **Credit the references the doc cites** in the component's README
  Acknowledgements (mirroring how [`@wimwian-org/data-grid`](../../components/data-grid/) credits SVAR).
- **Wrap a `bits-ui` primitive when one exists for the behaviour.** Interactive components
  (Dialog, Menu, Select, Checkbox, Switch, Slider, Tabs, Tooltip, …) have headless `bits-ui`
  equivalents that already own focus management, keyboard nav, and ARIA. Wrap those rather than
  reimplementing behaviour — exactly like [`/create-bit`](./create-bit.md). For purely
  presentational components, build a plain Svelte component keeping the bit file conventions.
- **`tailwind-variants`, not ad-hoc strings.** Variant/size/tint composition lives in a
  `<name>.variants.ts` `tv()` config; the `.svelte` file composes it via
  `twMerge(<name>({ ... }), className)`. See [`.claude/variants.md`](../variants.md).
- **Tokens, not literals.** All colours read `--color-c-*` (retintable per tint) or `--color-g-*`
  (always neutral) plus the surface/elevation tokens. No `bg-blue-500`, no hex, no upstream Sass
  variables. If the design doc ships its own token-mapping table, **that table wins**; otherwise
  use the [standard mapping](#design-role--token-mapping-reference). See
  [`.claude/css-authoring.md`](../css-authoring.md).
- **Git flow via `bin/wt`.** Feature branch + worktree before any write. Never commit to `master`
  or `dev` directly. See [`.claude/gitflow.md`](../gitflow.md).
- **Auto-changeset is wired.** A `feat:` commit triggers `post-commit` → minor-bump changeset
  amended into the same commit. Don't run `pnpm changeset` manually.

---

## ⛔ Hard precondition: feature branch + worktree BEFORE any write

**No `Write`, `Edit`, `NotebookEdit`, or any file-creation tool may run until the
`bin/wt feature <slug>` step in Phase 5 has completed and the current working directory is the
new worktree.** This is non-negotiable and overrides any phase ordering elsewhere in this
document.

**Why:** `dev` and `master` working trees only become dirty via merge from a
feature/release/hotfix branch, never from a direct commit (the auto-changeset hook is
intentionally suppressed on `dev`/`master` — see [`.claude/gitflow.md`](../gitflow.md)).

**How to apply, every time before any write:**

1. Run `git branch --show-current` and confirm the branch name.
2. **If the branch is `dev`, `master`, or `HEAD` (detached) — STOP. Do not write.** Phases 1–4 are
   read-only and conversational.
3. The only acceptable transition is Phase 5, step 1: `bin/wt feature <kebab-slug>` followed by
   `cd ../sui.worktrees/<kebab-slug>`. After that, `git branch --show-current` must print
   `feature/<kebab-slug>`.
4. After Phase 7's `bin/wt feature finish` (or PR merge), you are back in the primary checkout on
   `dev`. Do not write there either.

---

## ⛔ Design-doc resolution guard

Before any design or code, you MUST have an authoritative design markdown:

1. **A path was given** (in `$ARGUMENTS` or by the user) → read it in full with `Read`. Confirm it
   describes the named component and contains, at minimum, the component's **anatomy/parts** and
   **key behaviours**. If it's a stub or clearly incomplete, treat as case 3.
2. **A component name was given but no doc** → look for `components/<kebab-name>/*-design.md` (or
   `*.design.md`, `design.md`). If exactly one plausible doc exists, confirm it with the user and
   use it. If several or none, ask.
3. **No usable design doc** → **STOP and ask the user** for the design markdown (a path or pasted
   content). Do **not** invent the component's anatomy/behaviour from memory or from an external
   library. Quote what you looked for (`$ARGUMENTS`, the `components/<name>/` directory) and wait.

Record the doc path; it is the reference you carry into every later phase and the Phase 7 summary.

---

## ⛔ Scope guard: build MVP, defer the rest

The design doc's scope section is a **contract**. Parse it before Phase 4 and treat it as a hard
boundary:

1. **Find the scope section** — headings like "MVP Scope", "In scope / Deferred", "v1",
   "Out of scope". Extract two lists: **IN** (build now) and **DEFERRED** (do not build).
2. **Build only IN items.** Every IN item must appear in the code, the tests, and the demo matrix.
   No DEFERRED item may appear in any of them — not as a prop, a variant, a CSS branch, a test, or
   a demo cell. A half-built deferred feature is worse than its absence.
3. **Leave a clean seam.** The README gets a **Scope** section listing what v1 ships and what's
   deferred (copied/condensed from the doc), so the boundary is discoverable. Optionally add a
   single `// Deferred (next): …` comment at the natural extension point in the `.svelte`/types —
   no scaffolding, no dead code.
4. **If a request conflicts with the doc's scope**, surface it in Phase 4 and let the user decide
   (amend the doc, or hold the line). Don't silently expand scope.
5. **No scope section in the doc** → STOP and agree an explicit IN/DEFERRED split with the user in
   Phase 4 before writing code.

---

## Required reading before Phase 4

Before proposing architecture, re-read these in order:

1. [`.claude/bits.md`](../bits.md) — the canonical `bits-ui` wrapping pattern (single vs compound
   exports, `child` snippet, ref binding).
2. [`.claude/component.md`](../component.md) — bit standards: prop design, accessibility checklist,
   file structure.
3. [`.claude/variants.md`](../variants.md) — `tailwind-variants` `tv()` slot/variant configuration.
4. [`.claude/styling.md`](../styling.md) — design tokens, `--L`/`--D` toggle, elevation tokens.
5. [`.claude/css-authoring.md`](../css-authoring.md) — `@reference "@wimwian-org/theme"`,
   `@layer components`, semantic class naming.
6. [`.claude/testing.md`](../testing.md) — Vitest browser-mode (`vitest-browser-svelte`,
   `@vitest/browser/context`).
7. A representative existing component — [`components/switch/`](../../components/switch/) (bits-ui
   wrapper) or [`components/badge/`](../../components/badge/) (polymorphic presentational). These
   are the canonical templates for file shape, prop typing, variants, and CSS.

---

## Design-role → token mapping reference

Use this only when the design doc does **not** supply its own token-mapping table. If it does, that
table is authoritative — apply it verbatim and skip this one. (Map by role, not by exact name.)

| Design role                     | Project equivalent                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| primary / accent                | `--surface-accent` / `bg-c-600` (solid) / `--color-c-*`                             |
| on-primary                      | `text-c-0` / `--surface-solid-fg`                                                   |
| surface (card, menu, field bg)  | `var(--surface-bg)` / `var(--canvas-bg)`                                            |
| on-surface                      | `var(--surface-fg)` / `var(--canvas-fg)`                                            |
| muted surface / fill            | `var(--surface-bg-muted)`                                                           |
| background (page ground)        | `var(--page-bg)` / `var(--page-fg)`                                                 |
| outline / border / divider      | `var(--surface-border)` / `border-g-200`                                            |
| error / danger                  | the **error** RAG palette — `var(--color-error-*)` / `var(--surface-error-*)`       |
| elevation (dp shadow)           | `var(--surface-shadow)` / `var(--canvas-shadow)` / the `--shadow-*` ramp            |
| state layer (hover/focus/press) | hover background ramp (`hover:bg-c-700`) + `focus-visible` outline — no ink overlay |
| shape / corner radius           | fixed Tailwind radii (`rounded-md`, `rounded`, `rounded-full`)                      |
| typography                      | the type ramp utilities / `--text-<role>-<label>` tokens                            |
| disabled                        | `data-disabled` hook + dimmed token, **not** raw opacity                            |

> **Dark mode is automatic.** The project's `--page-*`, `--canvas-*`, `--surface-*`, `--color-g-*`,
> and `--color-c-*` tokens flip via the `--L`/`--D` space-toggle bound to `html[data-theme]`.
> **Never** add a `.dark` selector or a `@media (prefers-color-scheme: dark)` block.

---

## Phase 1: Discovery

**Goal:** locate the design doc and extract the component identity and scope. **Read-only.**

**Actions:**

1. Create a `TodoWrite` list covering all seven phases.
2. Resolve names from `$ARGUMENTS` (or ask):
    - PascalCase for the component (`TextField`).
    - kebab-case for the package, paths, route, and branch (`text-field`).
3. Apply the [Design-doc resolution guard](#-design-doc-resolution-guard) — `Read` the full doc.
4. Apply the [Scope guard](#-scope-guard-build-mvp-defer-the-rest) — extract the **IN** and
   **DEFERRED** lists and record them.
5. **Check it doesn't already exist** at `components/<kebab-name>/` (the design doc often lives
   there already — its _presence_ is fine; an existing `src/` package is the blocker). If the
   component package exists, stop and tell the user — modify it via the standard feature-branch
   flow instead.

---

## Phase 2: Design review

**Goal:** internalise the spec and decide the backing primitive. **Read-only.**

**Actions:**

1. **Map the doc's structure** to an implementation outline: the **anatomy/parts** → DOM/slots;
   the **variants** → the `tv()` `variant` axis; **design elements** (sizes, density, shape,
   typography, token mapping) → variant axes + CSS tokens; **key behaviours** → component logic or
   a `bits-ui` primitive; **accessibility** → roles/ARIA/keyboard.
2. **Decide the backing** for the behaviour the doc describes:
    - **Wrap bits-ui** when a headless primitive matches (cross-reference [`.claude/bits.md`](../bits.md)
      and `https://bits-ui.com/docs/components/<kebab-name>/llms.txt`).
    - **Plain bit** for presentational components with no headless behaviour.
3. **Note the references the doc cites** (its "synthesised from" / reconciliation section) — these
   become the README **Acknowledgements** credit. Do not fetch or depend on them; the doc has
   already distilled what you need.
4. **Launch a `code-explorer` agent** to map the closest existing `@sui` component as a template:

    ```
    Trace components/switch/ (or components/badge/ for a presentational component)
    end-to-end: the .svelte wrapping pattern and import order, types.ts prop
    extension, <name>.variants.ts tv() config, <name>.css token-block + @layer
    components structure, index.ts re-exports, and the *.test.ts browser-mode
    fixture. Return the 6–8 patterns I must replicate for a new component.
    ```

5. **Summarise** the implementation outline: parts → files, the chosen backing, the variant axes,
   the IN/DEFERRED boundary, the a11y model, and the closest existing template.

---

## Phase 3: Inspection and token mapping

**Goal:** turn the design doc into a concrete file + token plan. **Read-only — no files written.**

**Actions:**

1. Build the concrete plan **scoped to the IN list**:
    - Every design colour/elevation/shape/type role → project token (the doc's own mapping table if
      present; else the [standard mapping](#design-role--token-mapping-reference)).
    - The `tv()` variant axes (`variant`, `size`, `tint`, plus any IN-scope state flags) and their
      class names.
    - Which parts become separate `.svelte` files (compound export) vs a single component
      (see [`.claude/bits.md`](../bits.md) § "Composing Multi-Part Primitives").
    - The focus/hover state strategy (focus outline + hover ramp).
    - Any behaviour delegated to bits-ui and the props that bind through.
2. **Explicitly list the DEFERRED items** you will NOT build, so the boundary is visible in review.
3. **Present the mapping** to the user as a table (design role → token/class) plus the file list and
   the IN/DEFERRED split. Wait for review before Phase 4.

---

## Phase 4: Clarifying questions

**Goal:** lock down axes, composition, scope boundary, and demo coverage before any code. **Do not
skip. Ask all questions in one organised message and wait.**

**Standard axes:**

1. **Variants** — confirm the doc's variant set maps onto the `variant` axis (lean on existing
   names `solid`/`soft`/`outline`/`ghost`, or keep the doc's names where clearer). For the
   text-field example: `filled` / `outlined`.
2. **Tints** — retintable via `.primary` / `.secondary` / `.error` / `.warning` / `.success`?
   (Interactive/semantic components usually yes.)
3. **Sizes** — `sm` / `md` / `lg`, or a fixed set the doc names (e.g. small + medium + hidden-label).
4. **States** — which of `disabled`, `readonly`, `error`, `loading`, etc. are **IN scope** per the
   doc? Confirm none of the deferred states leak in.
5. **Composition shape** — single export or compound (`<X.Root> <X.Slot>`)? Confirm the part set.
6. **bits-ui `child` snippet?** — does the consumer need control over the rendered element?
7. **Scope confirmation** — restate the IN/DEFERRED split and get explicit sign-off. **This is the
   gate that prevents scope creep.**
8. **Demo coverage matrix** — the variant × tint × size × state grid the demo route renders (IN
   items only).

If the user says "your call", recommend based on the doc + the closest existing `@sui` component
and get explicit confirmation.

---

## Phase 5: Implementation

**WAIT FOR APPROVAL FROM PHASE 4** before writing any code.

**Actions:**

1. **Start the feature worktree** (always cut from `dev`):

    ```bash
    bin/wt feature <kebab-slug>
    cd ../sui.worktrees/<kebab-slug>
    pnpm install
    git branch --show-current        # must print: feature/<kebab-slug>
    ```

    Do not skip the `cd`. All subsequent writes happen inside the worktree.

2. **Scaffold the package** at `components/<kebab-name>/`, mirroring an existing component: - **`package.json`** — name `@wimwian-org/<name>`, `"type": "module"`,
   `"exports": { ".": "./src/index.ts" }`, `"files": ["src"]`,
   `"publishConfig": { "access": "public" }`, MIT license/author. `dependencies`:
   `tailwind-merge`, `tailwind-variants`, and `bits-ui` **only if** wrapping a primitive.
   `peerDependencies`: `@wimwian-org/theme: workspace:*`, `svelte: ^5.0.0`, `tailwindcss: ^4.0.0`.
   `devDependencies` mirror an existing package. Copy
   [`components/switch/package.json`](../../components/switch/package.json) and edit. **No
   upstream `@mui/*` / `@material/*` / `@smui/*`.** - **`tsconfig.json`** — copy from a sibling component. - **`README.md`**, **`LICENSE`**, **`CHANGELOG.md`** (empty/initial) — match siblings. The
   README **must** include: - a **Scope** section stating what v1 ships and what's deferred (from the doc's MVP section); - an **Acknowledgements** section crediting the references the design doc was synthesised
   from, stating `@wimwian-org/<name>` is an independent implementation on sui tokens that does
   not depend on or copy them — mirror
   [`@wimwian-org/data-grid`](../../components/data-grid/README.md)'s credit. - **`src/` files** (each begins with the `@wimwian-org/<name>` MIT license header comment block): - **`<Component>.svelte`** — import order: backing `bits-ui` import (if any) →
   `import '@wimwian-org/theme'` → `import './<name>.css'` →
   `import { <name> } from './<name>.variants'` → `import { twMerge } from 'tailwind-merge'`
   → `import type { Props } from './types'`. Destructure `$props()` with
   `variant`/`tint`/`size` defaults, **IN-scope** state flags, `class: className = ''`,
   `children`, `ref = $bindable<HTMLElement | null>(null)`, `...restProps`. Compose
   `let cls = $derived(twMerge(<name>({ variant, size, tint }), String(className ?? '')))`.
   Put `class={cls}`, `bind:ref`, `data-*` state hooks, `{...restProps}` on the root. Render
   `{@render children?.()}`. Implement **only** the in-scope behaviours from the doc. - **`<name>.variants.ts`** — `tv()` config exporting the `<name>` const and
   `<Name>Variants = VariantProps<typeof <name>>` type. Base class is a short semantic prefix;
   variants map to component classes; `tint` maps to the tint utility names; set
   `defaultVariants`. - **`<name>.css`** — `@reference "@wimwian-org/theme";` then all rules inside
   `@layer components { … }`. **Tokens-first**: a `--…` token block at the top of the base
   class, referenced via `var()` below. All colours via `--color-c-*` / `--color-g-*` /
   surface/elevation tokens. No hex/rgb, no `.dark` selector. - **`types.ts`** — `Props` derived from the variants combined with the element or `bits-ui`
   Root props. Export the axis types. Add a single `// Deferred (next): …` comment naming the
   out-of-scope props, so the extension seam is documented (no stub props). - **`index.ts`** — license header; re-export the default component, the `<name>` variants
   const + `<Name>Variants` type, and the `Props`/axis types. - **`<Component>.test.ts`** — Vitest **browser-mode**:
   `import { page } from '@vitest/browser/context'`, `import { render } from
'vitest-browser-svelte'`. Cover **every IN-scope item**: renders with defaults; each
   `variant`/`tint`/`size` applies the expected class; each in-scope state; event forwarding;
   `ref` binds; plus any behaviour delegated to bits-ui (role, `data-state`, keyboard). **Do
   not** test deferred features. - **`<name>.variants.test.ts`** — assert the `tv()` config returns the expected class strings
   per variant combination.

3. **Create the demo route** at `apps/playground/src/routes/<kebab-name>/+page.svelte`:
    - Import the component from `@wimwian-org/<name>`.
    - Render the **IN-scope** variant × tint × size × state matrix agreed in Phase 4 — nothing
      deferred.
    - Add label chips matching existing demo pages (see [`components/badge/`](../../components/badge/)).

4. **Register the demo** in `apps/playground/src/routes/+page.svelte` — add an entry to the
   `sections` array:

    ```ts
    {
        title: '<Component Name>',
        group: 'Components',
        description: '<short blurb — variants, tints, sizes; note "v1 / MVP" if partial>',
        href: '/<kebab-name>',
    },
    ```

---

## Phase 6: Quality review

**Goal:** prove the component is correct, accessible, token-clean, **faithful to the design doc**,
and **within MVP scope** before merging.

**Actions:**

1. **Run the gauntlet** — every step green:

    ```bash
    pnpm check                                   # svelte-check (workspace)
    pnpm lint                                    # eslint
    pnpm --filter @wimwian-org/<name> check            # the component's own types
    pnpm test:browser                            # browser-mode component tests
    pnpm --filter @wimwian-org/playground build        # demo site builds
    ```

    Any failure: stop, fix, re-run. Do not commit red. (See [`CLAUDE.md`](../../CLAUDE.md) §
    "Before Shipping".)

2. **Launch `code-reviewer` agents in parallel:**

    ```
    Agent 1 (design fidelity + scope):
    Compare components/<name>/ against <design-doc-path>. Verify every IN-scope
    anatomy part, variant, design element, and key behaviour is implemented, and
    that NO deferred item leaked in (no deferred prop, variant, CSS branch, test,
    or demo cell). Confirm the README Scope section matches the doc's MVP split.
    ```

    ```
    Agent 2 (token + theming fidelity):
    Review for leftover upstream artefacts — @mui/*, @material/*, @smui/* imports,
    hardcoded hex, .dark selectors, raw opacity for disabled. Verify every colour
    reads --color-c-*/--color-g-*/surface tokens (or the doc's own token table),
    elevation uses the shadow tokens, CSS uses @reference "@wimwian-org/theme" + @layer
    components with a tokens-first block, and variants go through tailwind-variants.
    ```

    ```
    Agent 3 (accessibility):
    Review against .claude/component.md a11y checklist. If a bits-ui primitive backs
    the behaviour, verify it's preserved and not double-wrapped. Check the doc's
    accessibility section is honoured: label/description association, roles, keyboard
    operability, visible focus via outline-c-500, ARIA, and AA contrast in BOTH
    light and dark.
    ```

    ```
    Agent 4 (Svelte 5 + conventions):
    Confirm $props()/$state/$derived/$bindable(null) (no on:*, $$props, $:,
    createEventDispatcher). Verify package.json shape (exports, files, peerDeps
    @wimwian-org/theme workspace:*, no upstream deps), index.ts re-exports
    component+variants+types, types.ts extends the right base, and the *.test.ts +
    *.variants.test.ts cover every IN-scope axis.
    ```

3. **Visually verify in both themes.** Run `pnpm --filter @wimwian-org/playground dev`, open
   `/<kebab-name>`, and check: all in-scope variants render in light + dark, focus indicator visible
   on keyboard tab, tint retinting works, and the deferred features are genuinely absent.

4. **Present consolidated findings.** Ask: fix now, fix later, or proceed.

---

## Phase 7: Land

**Goal:** commit, merge, document.

**Actions:**

1. **Pause and show the user** the list of changed files before committing (project convention).

2. **Commit** with a conventional message (use `pnpm commit`, or `git commit -m` directly):

    ```bash
    git add .
    git commit -m "feat(<kebab-slug>): add <Component> (v1) from design spec"
    ```

    Hooks fire: `pre-commit` (prettier + eslint + check), `commit-msg` (commitlint), `post-commit`
    (`scripts/auto-changeset.mjs` writes a minor-bump `.changeset/auto-*.md` for `feat:` and amends
    it into the same commit).

3. **Verify the changeset landed:**

    ```bash
    git show --stat HEAD | grep changeset
    git status                  # clean
    ```

4. **Refresh the homepage status snapshot:**

    ```bash
    pnpm status
    ```

5. **Pause for user approval, then land.** From the primary checkout (where `dev` lives), per
   [`.claude/gitflow.md`](../gitflow.md):

    ```bash
    cd /Users/apancha/WebstormProjects/sui
    bin/wt rm <kebab-slug>                  # remove worktree FIRST (frees the branch)
    git flow feature finish <kebab-slug>    # merges into local dev, deletes the branch
    ```

    `origin` `dev` is protected — it only accepts a PR from a git-flow branch. Push the feature
    branch and open a PR into `dev`:

    ```bash
    git push -u origin feature/<kebab-slug>
    gh pr create --base dev --head feature/<kebab-slug> --title "feat(<slug>): add <Component> (v1)" --body "…"
    ```

6. **Mark all todos complete** and produce a summary:
    - Component name + the design doc it was built from (path).
    - Backing: `bits-ui <primitive>` or plain presentational.
    - File list (`components/<name>/…`, `apps/playground/src/routes/<name>/…`).
    - The IN-scope feature set shipped, and the DEFERRED set held for next (matching the doc).
    - Token mapping applied (the doc's table, or the standard mapping).
    - Confirmation the README has both a **Scope** section and an **Acknowledgements** credit for the
      doc's cited references.
    - Variant × tint × size × state matrix the demo covers.
    - Test count (component + variants).
    - Changeset file and bump kind.
    - Anything deferred or open.

---

## When NOT to use this command

- **There's no design markdown** — write one first (a design doc with architecture, anatomy, key
  behaviours, and an MVP scope). This command refuses to invent the spec.
- **The component already exists in `components/`** (a built `src/` package) — modify it via the
  standard feature-branch flow.
- **You're working from a live library reference, not a doc** — use [`/create-mui`](./create-mui.md)
  (Svelte Material UI) or [`/create-shadcn`](./create-shadcn.md) (shadcn-svelte).
- **You want to wrap a `bits-ui` primitive from scratch with no design doc** — use
  [`/create-bit`](./create-bit.md).
- **Single-line fixes or doc-only changes** — use the standard feature-branch flow.

---

## Notes on working from a design doc

- **The doc outranks your training.** If the doc and your memory of "how component X usually works"
  disagree, the doc wins. Implement what's written.
- **Scope is a feature, not a limitation.** Shipping exactly the MVP — clean, tested, documented,
  with a clear seam for the deferred set — is the goal. Resist the urge to "just add" a deferred
  prop because it's easy; that breaks the contract the doc and the user agreed to.
- **A good design doc already did the reconciliation.** If it was synthesised from multiple
  references with a precedence rule (e.g. "later wins"), trust its resolved decisions rather than
  re-litigating them from the upstream sources.
- **Credit, don't depend.** The references the doc names are acknowledged in the README; they are
  never added to `package.json`.
- **Leave the next release easy.** The deferred items in the doc are your backlog — name them in the
  README Scope section and at the natural code seam so the follow-up is a small, obvious step.
