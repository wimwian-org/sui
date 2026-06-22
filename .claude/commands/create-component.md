---
description: Plan, review, and implement a component by copying from a reference repo into this project
argument-hint: Component name and source path (example: "Kbd from ../svelte-bits-ui")
---

# Create Component

Initial request: $ARGUMENTS

## Goal

Add a component from a reference project into this repository with a predictable workflow:

1. Plan
2. Review
3. Execute
4. Validate

## Precheck

1. **Check the reference project first.** Look for the component in `../svelte-bits-ui` (e.g. `../svelte-bits-ui/src/lib/bits/<ComponentName>/`).
    - If found: use it as the authoritative source and proceed.
    - If not found: stop and ask the user:
        > Component `<Name>` was not found in `../svelte-bits-ui`. How would you like to proceed?
        > **a)** Abort
        > **b)** Implement using the `bits-ui` headless primitive (run `/create-bit`)
        > **c)** Download from `shadcn-svelte` registry (run `/create-shadcn`)
        > Wait for the user's answer before continuing.
2. If the component is using an external dependency, add it to the package.json. Do not change code to avoid dependency.
3. If it is using an internal component as dependency, then migrate that component before the current component.
4. Lastly, do not take short cuts. review and memorize karpathy.md

## Git Setup (before any edits)

Create a worktree and work there — never edit directly on `dev`:

```sh
# From the repo root (primary checkout, on dev)
bin/wt feature start <component-slug>    # e.g. bin/wt feature start card-component
cd ../sui.worktrees/<component-slug>
pnpm install                             # hooks + node_modules for this worktree
```

All Phase 1–4 work happens inside the worktree.

## Phase 1: Plan

1. Identify source files from the reference repo.
2. List destination files in this repo.
3. Confirm dependency impact:
    - CSS imports and token usage
    - alias/path compatibility
    - exports from `src/lib/index.ts`
    - route/demo integration
    - test impact
4. Produce a short implementation checklist before edits.

## Phase 2: Review

1. Read source component files and supporting CSS/types.
2. Read current target project files that will be touched.
3. Call out required adaptations (paths, lint rules, route conventions).
4. Confirm any missing assets/utilities before writing files.

## Phase 3: Execute

1. Create destination directories/files.

- The source and types go to `$src/components/<name>/`
- The tests go to `$src/tests/<name>/`
- The playground goes to `apps/playground/src/routes/<name>/` (the common app)
- The css go to `$assets/<name>.css`
- The stories go to `$src/components/<name>/*.stories.svelte`

2. Copy/adapt component code.
3. Add route showcase page under `apps/playground/src/routes/<name>/` (the common app — all component demos live here).
4. Update `apps/playground/src/routes/+page.svelte` to add the new component to the `sections` array so it appears on the home navigation.
5. Create Storybook stories for the component (`*.stories.svelte`) with at least:
    - a default story
    - one variant/state story (size, tint, loading, invalid, etc.)
6. Wire exports in `$src/lib/index.ts`.
7. Keep changes minimal and focused.

## Phase 4: Validate

Run:

```sh
pnpm check
pnpm lint
pnpm exec storybook dev --smoke-test --ci
```

If errors occur, fix them before finishing.

## Phase 5: Land

From inside the worktree, commit the work:

```sh
pnpm commit          # conventional commit: feat: add <Name> component
```

Then return to the primary checkout to finish:

```sh
cd /Users/apancha/WebstormProjects/sui         # primary (on dev)
bin/wt feature finish <component-slug>          # removes worktree, merges to dev, deletes branch
```

## Output Contract

When done, report:

1. Files created/updated
2. Adaptations made vs source
3. Validation results
