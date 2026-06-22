# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Guidance for Claude Code on the **sui** monorepo. Read child docs in order as needed:

1. [.claude/karpathy.md](.claude/karpathy.md) — Behavioral guidelines (think before coding, minimal changes)
2. [.claude/process.md](.claude/process.md) — Plan-before-execute discipline
3. [.claude/gitflow.md](.claude/gitflow.md) — Branching model + worktree workflow
4. [.claude/svelte.md](.claude/svelte.md) — SvelteKit + Svelte 5 runes, snippets, routing
5. [.claude/styling.md](.claude/styling.md) — Design tokens, oklch palettes, `--L`/`--D` theming
6. [.claude/css-authoring.md](.claude/css-authoring.md) — ≤3 inline utilities, semantic class naming, `data-slot`
7. [.claude/bits.md](.claude/bits.md) — bits-ui headless wrapping pattern
8. [.claude/component.md](.claude/component.md) — Bit component standards, prop design, a11y
9. [.claude/variants.md](.claude/variants.md) — tailwind-variants: type-safe variant/slot config
10. [.claude/testing.md](.claude/testing.md) — Vitest + Playwright browser mode
11. [.claude/tooling.md](.claude/tooling.md) — ESLint, Prettier, lefthook, commitlint, auto-changeset
12. [.claude/distribution.md](.claude/distribution.md) — Package publishing and release workflows

See [README.md](README.md) for the project overview and consumer-facing documentation.

---

## Workspace Layout

```
sui/
├── apps/
│   └── playground/      (@wimwian-org/playground) — SvelteKit dev sandbox, NOT published
├── packages/
│   └── theme/           (@wimwian-org/theme) — CSS design tokens + Tailwind v4 theme, published
├── components/          — ~50 bit component packages, each published as @wimwian-org/<name>
├── bin/wt               — worktree helper (see gitflow.md)
└── scripts/             — coverage/status/metadata scripts; migration utilities
```

Dependency direction: `apps/` → `components/` → `packages/`. No reverse dependencies.

`@wimwian-org/theme` entry points:

```css
@import '@wimwian-org/theme'; /* full bundle */
@import '@wimwian-org/theme/tokens'; /* CSS custom properties only */
@import '@wimwian-org/theme/tints'; /* tint @utility classes only */
@import '@wimwian-org/theme/typography'; /* typography @utility classes only */
```

---

## Commands

Run from the repo root, or target a workspace with `--filter`.

| Command                                       | Does                                                  |
| --------------------------------------------- | ----------------------------------------------------- |
| `pnpm format`                                 | Prettier write (all workspaces)                       |
| `pnpm lint`                                   | ESLint (all workspaces)                               |
| `pnpm check`                                  | `svelte-check` (picks up playground)                  |
| `pnpm commit`                                 | Commitizen prompt — conventional commit message       |
| `pnpm changeset`                              | Author a changeset                                    |
| `pnpm test`                                   | Vitest (node mode)                                    |
| `pnpm test:browser`                           | Vitest (browser mode, Playwright)                     |
| `pnpm test:all`                               | Both suites                                           |
| `pnpm coverage`                               | Full coverage run + regenerate playground status JSON |
| `pnpm --filter @wimwian-org/playground dev`   | Vite dev server                                       |
| `pnpm --filter @wimwian-org/playground build` | Static build                                          |

---

## Slash Commands

| Command          | Does                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/create-bit`    | 7-phase workflow to wrap a `bits-ui` primitive as a new component in `components/`. See `.claude/commands/create-bit.md`.                  |
| `/create-shadcn` | Fetch + adapt a shadcn-svelte component to this design system. See `.claude/commands/create-shadcn.md`.                                    |
| `/create-mui`    | Review a Svelte Material UI (SMUI) component and rebuild it as a `@wimwian-org` bit on this design system. See `.claude/commands/create-mui.md`. |

---

## Branching at a Glance

Full details in [.claude/gitflow.md](.claude/gitflow.md).

- Integration branch: `dev`. Production: `master`. Both protected.
- Feature work on `feature/<slug>` cut from `dev`. Each conventional commit auto-attaches a changeset.
- Releases on `release/vX.Y.Z` cut from `dev` — run `pnpm changeset version` there.
- `git flow release finish` merges to `master` (tagged) and back to `dev`.
- Hotfixes on `hotfix/vX.Y.Z` cut from `master`, same finish flow.
- **Never commit directly to `master` or `dev`.**
- Parallel sessions use git worktrees: `bin/wt feature <slug>` → `../sui.worktrees/<slug>`.

---

## Design Tokens (quick reference)

Full docs in [.claude/styling.md](.claude/styling.md).

- **Palettes** — `mono` (21-step neutral) + `primary`, `secondary`, `error`, `warning`, `success` (11 steps). All oklch.
- **Theming** — `--L` / `--D` space-toggle. `html[data-theme="light|dark"]`.
- **Ground scale** — `--color-g-*` mirrors mono, flips in dark.
- **Content scale** — `--color-c-*` defaults to ground; tint utilities retint it per element.
- **Tint utilities** — `.primary`, `.error`, etc. retint `--color-c-*` and `--surface-*` tokens.
- **Elevation tokens** — `--page-*` / `--canvas-*` / `--surface-*` (three layers, each with bg/fg/border/shadow).

Example classes: `bg-primary-500`, `text-error-700`, `bg-c-600`, `text-c-0`, `border-mono-200`.

---

## Before Shipping

- [ ] `pnpm check` — types pass
- [ ] `pnpm lint` — no errors
- [ ] `pnpm test:all` — both suites pass
- [ ] `pnpm --filter @wimwian-org/playground build` — playground builds clean
- [ ] AA contrast (4.5:1) in both light and dark for any new token or component
- [ ] All commits are conventional (`pnpm commit` if unsure)
- [ ] A changeset exists for any consumer-visible change (`pnpm changeset`)
