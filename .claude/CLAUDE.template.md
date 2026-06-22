# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is a standalone **`@smuit/smuit-*`** component library — one bit, built on the
`@smuit/smuit-theme` design tokens and published to GitHub Packages.

> **Read [`.claude/claude-config.toml`](.claude/claude-config.toml) first.** Everything specific to
> this component — its package name, kind (compound / flat / action / tokens), parts, component-local
> token prefix, CSS file, design spec, and release history — lives there. Every doc below is
> **generic**: it describes the smuit conventions with `<name>` / `--<name>-*` placeholders and uses
> the tab set (`smuit-tabs`) as the worked reference example. Resolve every placeholder against the
> config.

Component behaviour is implemented **natively** — roles, ARIA wiring, roving focus, keyboard nav, and
activation modes are hand-rolled. There is no external behavioural runtime dependency.

Read child docs in order as needed:

1. [.claude/karpathy.md](.claude/karpathy.md) — Behavioral guidelines (think before coding, minimal changes)
2. [.claude/process.md](.claude/process.md) — Plan-before-execute discipline
3. [.claude/gitflow.md](.claude/gitflow.md) — Branching model
4. [.claude/svelte.md](.claude/svelte.md) — SvelteKit + Svelte 5 runes, snippets, routing
5. [.claude/styling.md](.claude/styling.md) — smuit-theme design tokens and how a bit consumes them
6. [.claude/css-authoring.md](.claude/css-authoring.md) — ≤3 inline utilities, semantic class naming, `data-slot`
7. [.claude/component.md](.claude/component.md) — Bit component standards, prop design, a11y
8. [.claude/variants.md](.claude/variants.md) — tailwind-variants: type-safe variant/slot config
9. [.claude/testing.md](.claude/testing.md) — Vitest projects (node + Playwright browser mode)
10. [.claude/how-to-mcr.md](.claude/how-to-mcr.md) — unified MCR coverage (Node V8 + Playwright) into one 100%-gated report
11. [.claude/tooling.md](.claude/tooling.md) — ESLint, Prettier, lefthook, commitlint, auto-changeset
12. [.claude/distribution.md](.claude/distribution.md) — svelte-package build + GitHub Packages release

The **only** authoring command is
[.claude/commands/create-from-design.md](.claude/commands/create-from-design.md) — build the bit from
a design-markdown spec, honouring its MVP scope.

---

## Repo Layout

A standalone SvelteKit **library** (the `sv create --template library` shape):

```
smuit-<name>/
├── .claude/
│   ├── claude-config.toml — THIS component's specific config (read first)
│   └── *.md               — generic smuit conventions (identical across every bit)
├── src/lib/               — the published library (svelte-package input)
│   ├── index.ts           — public entry: namespace/component + variants + types
│   ├── <name>/            — compound-bit parts (Root / … + context), or flat Component.svelte
│   ├── <name>.css         — token-driven component CSS (@layer components)
│   ├── <name>.variants.ts — tailwind-variants slot/variant config
│   └── *.test.*           — colocated tests (excluded from the package)
├── src/routes/            — showcase app (dev sandbox, NOT published)
├── src/test-setup.ts      — browser-test setup: loads Tailwind + theme tokens
├── scripts/               — auto-changeset hook script
└── .github/workflows/     — CI + release (GitHub Packages)
```

There is **no monorepo**: `pnpm-workspace.yaml` exists only for pnpm 11's `allowBuilds` settings. No
`--filter` is ever needed.

**Theme dependency.** `@smuit/smuit-theme` is a peerDependency, consumed locally as
`link:../smuit-theme` (a sibling checkout — CI checks it out and builds it). The bit's `Root` imports
`@smuit/smuit-theme/theme.minified.css` so it renders with tokens even when the host app hasn't
imported the theme.

---

## Commands

| Command          | Does                                                 |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | Vite dev server (showcase app)                       |
| `pnpm check`     | `svelte-kit sync` + `svelte-check`                   |
| `pnpm lint`      | Prettier check + ESLint                              |
| `pnpm format`    | Prettier write                                       |
| `pnpm test`      | Vitest run — both projects (node + browser)          |
| `pnpm test:unit` | Vitest watch                                         |
| `pnpm prepack`   | `svelte-kit sync` + `svelte-package` + `publint`     |
| `pnpm build`     | Showcase build + `prepack`                           |
| `pnpm commit`    | Commitizen prompt — conventional commit message      |
| `pnpm changeset` | Author a changeset (one is auto-attached per commit) |

---

## Branching at a Glance

Full details in [.claude/gitflow.md](.claude/gitflow.md).

- Integration branch: `dev`. Production: `master`. Both protected.
- Feature work on `feature/<slug>` cut from `dev`. Each conventional commit auto-attaches a changeset.
- Releases on `release/vX.Y.Z` cut from `dev` — run `pnpm changeset version` there.
- The release lands on `dev` (tagged), then `master` is **fast-forwarded** to `dev` (`git merge --ff-only dev` → push) — never `git flow release finish`, which would leave a merge commit on `master`. The push to `master` triggers the publish workflow.
- **Never commit directly to `master` or `dev`.**

---

## Design Tokens (quick reference)

Full docs in [.claude/styling.md](.claude/styling.md). The theme is `@smuit/smuit-theme` — a **flat, pre-baked stylesheet** of CSS custom properties (no Tailwind `@theme`, no runtime `color-mix` in the theme itself).

- **Three elevation layers** — `--page-*`, `--canvas-*`, `--surface-*`, each with `bg` / `fg` / `border` (+ `border-bold`, `bg-hover`, `bg-focus`, `shadow` on surfaces).
- **Tinted surfaces** — `--surface-{primary|secondary|tertiary|error|warning|success}-*` mirror the neutral surface set.
- **Theming** — light is the default; dark via `html[data-theme="dark"]` **and** a `prefers-color-scheme` fallback. Toggle with `setTheme()`/`toggleTheme()` from `@smuit/smuit-theme`.
- **No content/ground scales, no tint utilities, no type ramp** — the old `--color-c-*`/`--color-g-*`/`--text-label-*` vocabulary does not exist here. Components consume tokens via `var(--surface-*)` in component CSS and derive muted steps with `color-mix()`.
- **Elevation/fonts** — `--elevation-2xs…2xl`, `--font-sans`, `--font-mono`.

This bit declares component-local tokens (the `--<name>-*` prefix in `[tokens]` of claude-config.toml)
on its root class in its component CSS, resolved through the theme tokens — keep that indirection for
any new styling.

---

## Before Shipping

- [ ] `pnpm check` — types pass
- [ ] `pnpm lint` — Prettier + ESLint clean
- [ ] `pnpm test` — both vitest projects pass
- [ ] `pnpm prepack` — package builds + publint clean
- [ ] AA contrast (4.5:1) in both light and dark for any new token mapping
- [ ] All commits are conventional (`pnpm commit` if unsure)
- [ ] A changeset exists for any consumer-visible change (the post-commit hook auto-generates one; author manually for anything non-default)
