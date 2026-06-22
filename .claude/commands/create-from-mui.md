---
description: Build a brand-new @smuit/smuit-<name> library from a MUI (or Material) requirement URL — generate the design spec, scaffold the repo, implement + test (100% coverage) + lint/format/check in a worktree, create the public GitHub repo (dev primary), wire CI + release workflows, push and PR-merge to dev, cut the minor 0.1.0 release to GitHub Packages, and add a showcase to smuit-demo
argument-hint: <ComponentName> <requirement-url>  (e.g. "Chip https://github.com/material-components/material-web/blob/main/docs/components/chip.md")
---

# Create From MUI

You are creating a **complete, published `@smuit/smuit-<name>` component library from scratch**, given
only a component **name** and a **requirement URL** (a MUI / Material Web / MUI-X / Material Design 3
docs page). You will: synthesise a design spec from that URL, scaffold a new repo from
`smuit-template`, implement the bit **natively** on smuit theme tokens, test it to **100% coverage**,
make it lint/format/check/prepack clean **in a `bin/wt` worktree**, create the **public** GitHub repo
under the **smuit** org with **`dev` as the primary branch**, enable the CI + release workflows, push to
remote and **PR-merge the feature into `dev`**, **cut the minor `0.1.0` release and publish to GitHub
Packages**, and finally **add a showcase route to `smuit-demo`**.

This wraps the existing authoring command: the **component-build phase reuses
[`create-from-design.md`](./create-from-design.md) verbatim** (its conventions, scope guard, and native
behaviour rules are authoritative). This command adds: **(1) generate the design spec from a URL,
(2) scaffold a fresh repo, (3) develop in a worktree and land it on `dev` via PR, (4) cut + publish the
first (minor) release, and (5) add a `smuit-demo` showcase.**

Initial request: $ARGUMENTS

---

## Inputs

Parse `$ARGUMENTS` into exactly two values; if either is missing or ambiguous, **STOP and ask**:

- **`<ComponentName>`** — PascalCase export / namespace (e.g. `Chip`, `Slider`). Derive:
  - `name` = kebab-case slug → repo `smuit-<name>`, package `@smuit/smuit-<name>` (often the plural,
    e.g. `chips`, matching sibling naming — confirm with the user if unsure).
  - `display_name` = the PascalCase symbol.
- **`<requirement-url>`** — the authoritative requirement page (MUI component docs, Material Web
  `docs/components/*.md`, or m3.material.io). Must be a public, fetchable URL.

Then work the phases in order. Use `TodoWrite` to track all of them.

---

## ⛔ Non-negotiable guardrails

- **Credit, never depend.** MUI / Material Web / MUI-X are **design references only**. Never add
  `@mui/*`, `@material/*`, `@mui-x/*`, `@smui/*`, etc. to `package.json`. Implement behaviour natively
  (roles, ARIA, roving focus, keyboard) exactly as `smuit-tabs` does. Credit the URL in the README
  **Acknowledgements** as an independent implementation.
- **Tokens, not literals.** All colour/elevation/shape reads the smuit-theme tokens
  (`--page-*` / `--canvas-*` / `--surface-*` + tinted `--surface-{primary|…}-*`) through a component-local
  `--<name>-*` block, deriving steps with `color-mix()`. No hex, no `.dark` selector, no
  `prefers-color-scheme` block. (See `.claude/styling.md`.)
- **No part may be named after a JS built-in.** `Set`, `Map`, `Date`, `Promise`, `Array`, etc. as a
  Svelte component export collide with the global and break Svelte 5 instantiation
  (`component_api_invalid_new`). Use a safe synonym (e.g. a chip-set container → **`Group`**).
- **Honour the MVP scope** the design spec defines. Build only the IN list; leave deferred items as a
  README **Scope** seam. (See `create-from-design.md` § Scope guard.)
- **Public repo, `dev`-primary.** The GitHub repo is created **public** under the `smuit` org with
  `dev` as the default branch, so PRs target `dev`.
- **The finish is one continuous flow.** After the bit is green, this command carries it through to the
  end: push the feature branch, **PR-merge it into `dev`**, cut the **minor `0.1.0`** release, push
  `master` (which the release workflow publishes to GitHub Packages), then add the `smuit-demo`
  showcase. These are the normal tail of the workflow.

---

## Phase 1 — Fetch + synthesise the design spec

1. `WebFetch` the requirement URL. Extract: purpose, **anatomy/parts**, **variants**, **states**,
   selection/removal/interaction model, **accessibility** (roles, ARIA, keyboard map), and the
   **API surface** (props/attributes/events).
2. Decide the composition shape and, if it's a multi-part/compound bit, the part names (avoid
   built-in collisions — see guardrails). Prefer **distinct named parts** over a single `variant`
   prop when the reference defines distinct element types, unless the user prefers otherwise — ask if
   it's a real toss-up.
3. Write **`<name>-design.md`** at the (soon-to-be) repo root, modelled on
   [`smuit-tabs/tabs-design.md`](../../smuit-tabs/tabs-design.md) / `smuit-list/list-design.md`:
   Scope (explicit **In scope** + **Deferred** tables), Architecture (layering, anatomy ASCII,
   parts & slots, state ownership), Variants, Design elements (shape/density/typography +
   a **token-mapping table** MUI-role → smuit token), Key behaviours, Accessibility, a behavioural
   state matrix, Out of scope, **Source reconciliation**, and **Acknowledgements** (credit the URL,
   state it's an independent implementation).
4. Keep the first release lean: a v1 MVP that covers the reference's core variants/states; defer
   gesture systems (drag/reorder), overflow→menu, virtualisation, and the like.

---

## Phase 2 — Scaffold the repo

From the workspace root (sibling to `smuit-theme`):

```bash
rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.svelte-kit' --exclude 'dist' \
  smuit-template/ smuit-<name>/
ln -sfn /Users/apancha/.ssh/.env smuit-<name>/.env      # gitignored — never committed
```

Then fill the per-component identity (do not hand-edit ad hoc — these are the source of truth):

- **`.claude/claude-config.toml`** — `[component]` (name/package/display_name/kind/summary),
  `[package]` (description/keywords/repository), `[source]` (lib_dir/component_css/variants/design_spec/parts),
  `[tokens].prefix = "--<name>-"`, `[references].credits` (the URL).
- **`package.json`** — substitute `@smuit/smuit-<name>`, `description`, `keywords`, repository URL.
- **`.github/workflows/{ci,release}.yml`** — replace every `smuit-<name>` placeholder with `smuit-<name>`
  (checkout path + `working-directory` + `cache-dependency-path`).
- **`mcr.config.js`** — fix the coverage matcher: `LIBRARY_TS` = your runtime `.ts` modules
  (`index.ts`, `<name>.variants.ts`, `<name>-context.ts`), and the `.svelte` filter to your part files
  (drop `*.test.svelte` and route `+page`/`+layout`). The `name:` string too. **This is required or
  coverage only sees `index.ts`.**

---

## Phase 3 — Init git + create the remote (gated)

```bash
cd smuit-<name>
git init -b master
git add -A && git commit --no-verify -m "chore: scaffold @smuit/smuit-<name> from template"
git branch dev && git switch dev                  # dev is the PRIMARY working branch
```

**Approval gate → create the public repo** (confirm with the user first; the classifier blocks this):

```bash
gh repo create smuit/smuit-<name> --public --description "<one-liner>" --source . --remote origin
git push -u origin master
git push -u origin dev
```

Set **`dev` as the default branch** so PRs target it:
`gh repo edit smuit/smuit-<name> --default-branch dev`. (CI runs on push/PR to `master` + `dev`; the
release workflow runs on push to `master`.)

---

## Phase 4 — Implement, test, and verify in a worktree (reuse create-from-design)

**All component development happens in a `bin/wt` worktree**, never in the primary checkout — `bin/wt
feature start <name>-v1` cuts `feature/<name>-v1` from `dev` into its own sibling working directory, so
the primary tree stays on `dev` and parallel sessions never collide on HEAD.

Run the **[`create-from-design`](./create-from-design.md)** workflow against `<name>-design.md`:

```bash
cd smuit-<name>
bin/wt feature start <name>-v1 && cd ../smuit-<name>.worktrees/<name>-v1
pnpm install
# Install Playwright AND all three browser engines (the vitest browser project +
# any cross-engine visual checks rely on them). Use --with-deps so CI/Linux pulls
# the system libraries too.
pnpm exec playwright install --with-deps chromium firefox webkit
```

Build under `src/lib/` mirroring `smuit-tabs/src/lib/`: parts in `src/lib/<name>/` (one `.svelte` per
part + `<name>-context.ts` + `index.ts`), `<name>.variants.ts` (tailwind-variants), `<name>.css`
(token block in `@layer components`), `src/lib/types.ts`, `src/lib/index.ts`, colocated
`*.svelte.test.ts` (browser) + `*.variants.test.ts` (node), plus a `src/routes/+page.svelte` showcase
and a README (usage, props, **Scope**, **Acknowledgements**).

**Quality bar — every gate green before committing:**

```bash
pnpm check        # svelte-check: 0 errors
pnpm lint         # prettier --check + eslint  (pnpm format first to auto-fix)
pnpm test         # both vitest projects pass
pnpm test:coverage  # 100% statements / functions / lines (branches: cover real
                    # branches; only the unreachable defensive `?? ''` may remain —
                    # add a null-class test + targeted cases to reach the gate)
pnpm prepack      # svelte-package + publint clean
pnpm build        # showcase route compiles
```

Visually verify the showcase in **light + dark** (run `pnpm dev`, screenshot with Playwright) — confirm
every in-scope variant/state renders, AA focus rings show, tints retint, and no deferred feature leaked
in. Fix anything off (e.g. a Tailwind `items-*` utility overriding a `@layer components` rule — express
layout axes through tailwind-variants so the utilities win).

---

## Phase 5 — Land on dev via PR

`dev` is protected and **requires a PR** (the `guard-dev` check enforces the branch prefix), so the
feature lands through a pull request — not a local merge. Run this straight through:

```bash
# in the worktree (../smuit-<name>.worktrees/<name>-v1)
git add -A
git commit -m "feat(<name>): add <Component> (v1) from design spec"   # post-commit hook auto-attaches a minor changeset
git show --stat HEAD | grep changeset                                  # confirm the changeset landed
git push -u origin feature/<name>-v1

gh pr create --repo smuit/smuit-<name> --base dev --head feature/<name>-v1 \
  --title "feat(<name>): add <Component> (v1)" \
  --body "Adds the <Component> bit (v1) generated from <name>-design.md. See the design spec for in-scope vs deferred."
gh pr merge feature/<name>-v1 --repo smuit/smuit-<name> --merge --delete-branch   # --merge keeps the no-ff merge commit dev/master expect

# back in the primary checkout: drop the worktree and fast-forward dev to the merged PR
cd ../smuit-<name>
bin/wt rm <name>-v1
git switch dev && git pull --ff-only origin dev
git branch -D feature/<name>-v1 2>/dev/null || true                    # local branch may linger after the remote PR merge
```

> If `pnpm install` left an untracked `pnpm-lock.yaml` in the worktree, `git add` it as part of the
> feature before committing — the lockfile belongs in the PR.

---

## Phase 6 — Cut the minor 0.1.0 release + publish

The accumulated changeset is a **minor** bump, so `changeset version` takes `0.0.0 → 0.1.0` — the first
minor release. The release branch lands on `dev` by PR (same protection as Phase 5), then `master`
fast-forwards to `dev` and is pushed to publish. Run the whole release straight through:

```bash
bin/wt release start v0.1.0 && cd ../smuit-<name>.worktrees/v0.1.0
pnpm install
pnpm changeset version            # consumes the changeset → minor bump 0.0.0 → 0.1.0 + writes CHANGELOG
pnpm format && git add -A
git commit -m "chore(release): release v0.1.0"      # `chore` → no stray changeset
git push -u origin release/v0.1.0

gh pr create --repo smuit/smuit-<name> --base dev --head release/v0.1.0 \
  --title "chore(release): v0.1.0" --body "Release v0.1.0 (minor — first published version)."
gh pr merge release/v0.1.0 --repo smuit/smuit-<name> --merge --delete-branch

# back in the primary checkout: ff dev, tag, ff master, publish
cd ../smuit-<name>
bin/wt rm v0.1.0
git switch dev && git pull --ff-only origin dev
git tag v0.1.0 && git push origin v0.1.0
git switch master && git merge --ff-only dev        # master fast-forwards to dev (no merge commit)
git push origin master                              # triggers .github/workflows/release.yml → changeset publish
git switch dev                                      # leave the primary checkout on dev
git branch -D release/v0.1.0 2>/dev/null || true
```

Watch the publish and CI:

```bash
gh run watch "$(gh run list --repo smuit/smuit-<name> --workflow Release --branch master --limit 1 --json databaseId -q '.[0].databaseId')" --repo smuit/smuit-<name> --exit-status
```

Confirm the **Publish to GitHub Packages** step is green.

---

## Phase 7 — Add a showcase to smuit-demo

The published bit gets a page in the aggregated **`smuit-demo`** showcase (a sibling checkout — a
private SvelteKit app, never published). Each page consumes the **real published component** through a
local `link:` dep, so the component's `dist/` must exist first:

```bash
cd ../smuit-<name>
pnpm prepack                 # ensure ../smuit-<name>/dist exists for the demo's link: dep + Tailwind scanner
```

`smuit-demo` has no `bin/wt`, so land the showcase on its `dev` with a plain feature branch + PR:

```bash
cd ../smuit-demo
git switch dev && git pull --ff-only origin dev
git switch -c feature/<name>-showcase
```

Wire the five touch-points — copy how an existing route does it (e.g. `src/routes/chips/+page.svelte`):

1. **`package.json`** — add `"@smuit/smuit-<name>": "link:../smuit-<name>"` to `dependencies`.
2. **`src/app.css`** — add `@source '../../smuit-<name>/dist';` alongside the other `@source` lines so
   Tailwind scans the built component's class strings.
3. **`src/routes/<name>/+page.svelte`** — the showcase route. Import the component + its variant/tint
   types and `$lib/Showcase.svelte`, then render the standardized matrix: `variants` across the
   columns, one row per `tint`, an `allOptions` row, and an `extra` snippet for the remaining states
   (sizes, disabled, …). Mirror the structure of `src/routes/chips/+page.svelte`.
4. **`src/routes/+page.svelte`** — add a card to the `components` array (`href`, `name`, `pkg`, `desc`).
5. **`README.md`** — add the component's row to the routes table.

Verify, then land by PR:

```bash
pnpm install
pnpm check && pnpm build        # the route compiles against the built dist
# spot-check /<name> in light + dark (pnpm dev, Playwright screenshot)

git add -A
git commit -m "feat: add <Component> showcase"
git push -u origin feature/<name>-showcase
gh pr create --repo smuit/smuit-demo --base dev --head feature/<name>-showcase \
  --title "feat: add <Component> showcase" --body "Adds the /<name> route to the demo."
gh pr merge feature/<name>-showcase --repo smuit/smuit-demo --merge --delete-branch

git switch dev && git pull --ff-only origin dev
git branch -D feature/<name>-showcase 2>/dev/null || true
```

---

## Phase 8 — Report

Summarise: the design spec path + source URL; composition (parts) and the MVP shipped vs deferred;
file list; the token mapping applied; test count + coverage (stmts/fns/lines/branches); the repo URL
(public, default branch `dev`); CI + Release workflow status; the published version
(`@smuit/smuit-<name>@0.1.0`); and the `smuit-demo` showcase route (`/<name>`) + its merged PR.

---

## When NOT to use this command

- **The component already ships** under an existing `smuit-<name>` repo → modify it via the standard
  feature-branch flow in that repo, not this scaffolder.
- **No requirement URL** (or it isn't fetchable) → either provide a design markdown and use
  `create-from-design` directly, or supply a reachable URL.
- **You only want the bit built, not released** → run `create-from-design` and stop before Phase 3/6.
