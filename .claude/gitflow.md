# Git Flow Branching Model

We use [git flow](https://nvie.com/posts/a-successful-git-branching-model/) — the long-lived branch model with explicit release and hotfix paths.

## Branches

| Branch              | Lives for                          | Cut from                  | Merges into      | Notes                                       |
| ------------------- | ---------------------------------- | ------------------------- | ---------------- | ------------------------------------------- |
| `master`            | Forever                            | —                         | —                | Production. Every commit tagged. Protected. |
| `dev`               | Forever                            | `master` (once, at start) | —                | Integration. Protected.                     |
| `feature/<slug>`    | A feature                          | `dev`                     | `dev`            | Standard development work.                  |
| `bugfix/<slug>`     | A fix during release stabilisation | `release/*`               | `release/*`      | Only used while a release branch exists.    |
| `release/<version>` | Until released                     | `dev`                     | `master` + `dev` | Where `changeset version` runs.             |
| `hotfix/<version>`  | Until released                     | `master`                  | `master` + `dev` | Emergency patch on production.              |

Branch names use kebab-case slugs: `feature/dialog-bit`, `hotfix/v0.3.2`, `release/v0.4.0`. Tag names use `v` prefix: `v0.4.0`.

## Branch Protection (enforced on GitHub)

Both long-lived branches are protected, with **admins included** (`enforce_admins` on — no one bypasses):

| Branch   | Who can update  | How it advances                                                          | Other                                                          |
| -------- | --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `dev`    | Repo owner only | PR from a git-flow branch; the `guard-dev` check enforces the prefix     | PR required; no force-push; no deletion                        |
| `master` | Repo owner only | **Fast-forward from `dev` only** (`git push origin dev:master`) — no PRs | no force-push; no deletion; `guard-master` blocks any stray PR |

`master` is push-restricted to the owner with **no PR requirement**, precisely so the owner can fast-forward it — GitHub can't fast-forward through a PR merge, and a PR merge-commit would leave `master` one commit ahead of `dev`. So a release/sync is:

```bash
# master := dev, exactly (no new commit; master never gets ahead of dev)
pnpm push:master            # fast-forwards master → origin/dev using GITHUB_TOKEN in .env
git push origin dev:master  # equivalent, over your own SSH/credentials
```

`pnpm push:master` ([scripts/push-master.mjs](../scripts/push-master.mjs)) reads the owner token from `.env` and fast-forwards the master ref via the GitHub API (`force: false`, so a non-fast-forward is rejected) — so anyone holding the token can promote `dev` → `master` without local push rights.

Because a fast-forward only succeeds when `master` is already an ancestor of `dev`, this is self-enforcing: `master` can never diverge from or lead `dev`. The `guard-master` / `guard-dev` workflows live in `.github/workflows/`.

> Note: `master` carries `dev`'s merge commits (from feature PRs), so it is **not** linear-history — don't enable "require linear history" on `master`, it would reject the fast-forward.

## One-Time Setup

Use the [nvie/gitflow-avh](https://github.com/petervanderdoes/gitflow-avh) CLI for branch automation. It's optional — every command below has a plain-git equivalent — but the CLI removes a class of slip-ups.

```bash
brew install git-flow-avh         # macOS

# Pre-set the branch names so `git flow init -d` won't prompt for `develop`.
# (master is git flow's production default already, so no override needed for it.)
git config gitflow.branch.develop dev
git config gitflow.prefix.versiontag v
git flow init -d                   # picks up the configured names + the rest of the defaults
```

If you'd rather not install the CLI, every command below shows the plain-git equivalent. The branch model is:

- Production branch: `master`
- Integration branch: `dev`
- Prefixes: `feature/`, `release/`, `hotfix/`, `bugfix/`, version tag `v`

> Heads up: classic git flow defaults are `master` + `develop`. We override `develop` → `dev`. Anyone running `git flow init` on a fresh clone needs to apply the `git config` lines above first — or be ready to type `dev` at the prompt.

## Parallel Work with Worktrees

Multiple sessions (e.g. two Claude Code sessions in two terminals, or human + agent) on the same checkout collide on `HEAD`: one session does `git switch feature/foo`, the other does `git switch feature/bar`, and now neither knows which branch they're really on. Files get committed to the wrong branch, partially-staged work disappears, agents reset each other.

The fix is **git worktrees** — separate working directories that all share one `.git`. Each session pins its own branch, none of them stomp on the others.

### Convention: `../sui.worktrees/<branch-slug>`

Keep worktrees in a **sibling directory** to the repo (not inside it), one folder per branch, named after the branch's slug:

```
WebstormProjects/
├── sui/                                     ← primary checkout (this repo)
│   └── .git/                                ← the one real git dir
└── sui.worktrees/                           ← all session worktrees live here
    ├── dialog-bit/                          ← worktree on feature/dialog-bit
    ├── tooltip-bit/                         ← worktree on feature/tooltip-bit
    └── v0.4.0/                              ← worktree on release/v0.4.0
```

Why outside the repo: a `worktrees/` _inside_ the repo shows up as untracked files in `git status`, confuses IDE indexers (Webstorm rescans the whole subtree), and risks being accidentally added to a commit. Sibling-directory layout sidesteps all of that.

### Helper script: `bin/wt`

Drop this in the repo so creating a session worktree is one command. It's intentionally small — just wraps `git worktree add` with the naming convention.

```bash
#!/usr/bin/env bash
# bin/wt — create or remove a session worktree alongside the repo
#
# usage:
#   bin/wt start <branch>        create worktree for an existing branch
#   bin/wt feature <slug>        new feature/<slug> from dev, in its own worktree
#   bin/wt list                  show all worktrees for this repo
#   bin/wt rm <slug>             remove a worktree (branch is kept)
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
repo_name=$(basename "$repo_root")
wt_root="$(dirname "$repo_root")/${repo_name}.worktrees"
mkdir -p "$wt_root"

case "${1:-}" in
  start)
    branch="$2"; slug="${branch##*/}"
    git -C "$repo_root" worktree add "$wt_root/$slug" "$branch"
    echo "→ $wt_root/$slug ($branch)"
    ;;
  feature)
    slug="$2"; branch="feature/$slug"
    git -C "$repo_root" fetch origin dev || true
    git -C "$repo_root" worktree add -b "$branch" "$wt_root/$slug" dev
    echo "→ $wt_root/$slug ($branch, from dev)"
    ;;
  list)
    git -C "$repo_root" worktree list
    ;;
  rm)
    slug="$2"
    git -C "$repo_root" worktree remove "$wt_root/$slug"
    ;;
  *)
    echo "usage: $0 {start <branch>|feature <slug>|list|rm <slug>}" >&2
    exit 1
    ;;
esac
```

Make it executable once: `chmod +x bin/wt`.

### Day-to-day worktree lifecycle

```bash
# Start a new feature in its own worktree (cuts feature/dialog-bit from dev)
bin/wt feature dialog-bit
cd ../sui.worktrees/dialog-bit

# Install deps the first time you enter a worktree (pnpm uses a shared store, so it's cheap)
pnpm install

# Open this directory in a fresh editor/Claude Code session and work normally
pnpm --filter @wimwian-org/playground dev
pnpm commit                # auto-changeset still fires — hooks run in the worktree

# When done: push, then leave the worktree before finishing
git push origin feature/dialog-bit         # optional, if you want the branch on origin
cd /Users/apancha/WebstormProjects/sui

# Order matters: remove the worktree FIRST, then finish.
# `git flow feature finish` ends with `git branch -d`, which refuses to delete
# a branch that's still checked out in any worktree.
bin/wt rm dialog-bit
git flow feature finish dialog-bit
```

For an existing branch (e.g. picking up a colleague's PR):

```bash
git fetch origin
bin/wt start feature/their-branch
cd ../sui.worktrees/their-branch
```

### Constraints (the things that bite)

1. **A branch can only be checked out in one worktree at a time.** If `feature/foo` is checked out in the primary repo, `bin/wt start feature/foo` fails. Switch the primary to `dev` first, or pick a different branch.
2. **Keep `dev` and `master` in the PRIMARY checkout.** Git-flow's `feature finish`, `release finish`, and `hotfix finish` all merge into `dev` (and `master`) and need to check those branches out. If `dev` is pinned to a worktree, the finish fails. Rule of thumb: the primary checkout sits on `dev`, worktrees hold short-lived branches.
3. **Run `git flow … finish` from the primary checkout — and `bin/wt rm` the worktree _first_.** The merge-back belongs in primary where `dev` lives. The order matters because `git flow feature finish` ends with `git branch -d feature/<slug>`, which refuses to delete a branch that's still checked out in any worktree. So: push from the worktree → `cd` to primary → `bin/wt rm <slug>` → `git flow feature finish <slug>`. Same order for `release finish` and `hotfix finish`.
4. **One `node_modules` per worktree.** pnpm's content-addressable store makes this nearly free (deps are hardlinked), but the first `pnpm install` in a new worktree still runs. Don't try to symlink `node_modules` across worktrees — Vite + svelte-kit's generated files (`.svelte-kit/`) will collide.
5. **Lefthook hooks are per-worktree.** The first time you commit in a new worktree, run `pnpm install` (which re-runs `lefthook install`) so the hooks are wired up. The auto-changeset hook works identically in worktrees.
6. **Don't open two editor windows on the same worktree.** That's the original problem in miniature. One session per worktree.

### Multi-agent / multi-session pattern

For running two or more Claude Code sessions in parallel without collision:

```bash
# Terminal 1: primary checkout, stays on dev for finish operations / quick checks
cd /Users/apancha/WebstormProjects/sui
claude

# Terminal 2: agent working on feature/dialog-bit
bin/wt feature dialog-bit
cd ../sui.worktrees/dialog-bit
pnpm install
claude

# Terminal 3: agent working on feature/tooltip-bit
bin/wt feature tooltip-bit
cd ../sui.worktrees/tooltip-bit
pnpm install
claude
```

Each session has its own `pwd`, its own `HEAD`, its own dev server (use different ports if running concurrently: `pnpm dev --port 5174`). They can't reset each other because they're not sharing a working directory.

When you spawn **sub-agents** from within a Claude Code session, prefer the harness's built-in isolation: pass `isolation: "worktree"` to the `Agent` tool. The harness creates a temp worktree, runs the sub-agent there, and cleans up automatically if no changes were made. No `bin/wt` needed for that case — `bin/wt` is for top-level sessions you control by hand.

### Cleanup & recovery

- `git worktree list` — see every worktree and its branch.
- `git worktree prune` — drop entries for worktree directories that have been deleted manually (e.g. by `rm -rf`).
- `git worktree remove <path>` — the correct way to delete a worktree (refuses if there are uncommitted changes; add `--force` only if you're sure).
- If `bin/wt feature foo` fails with _"already checked out"_: someone else has the branch in another worktree. `git worktree list` will show where.

## Day-to-Day: Features

```bash
# Start
git flow feature start dialog-bit
# (plain git: git switch -c feature/dialog-bit dev)

# Work
pnpm commit                        # conventional commit; auto-changeset attaches
# Repeat...

# Finish: merges into dev and deletes the branch
git flow feature finish dialog-bit
# (plain git: git switch dev && git merge --no-ff feature/dialog-bit && git branch -d feature/dialog-bit)

# Refresh the per-bit working-tree snapshot the homepage reads
pnpm status
```

Each `feat:` / `fix:` / `feat!:` commit gets a `.changeset/auto-*.md` written into the same commit by the `post-commit` hook (the hook generates the changeset, then amends it into the just-made commit so they share one hash). You don't run `pnpm changeset` manually.

**When you DO want to author a changeset by hand:** run `pnpm changeset`, stage it, then commit. The auto-hook detects an already-staged changeset and skips so you don't double up.

## Releases

```bash
# Cut a release branch from dev
git flow release start v0.4.0

# Consume all pending changesets — bumps versions + writes CHANGELOG.md
pnpm changeset version

# Stage and commit the version bump
git add .
git commit -m "chore(release): v0.4.0"

# Optional: smoke-test one more time on the release branch
pnpm check && pnpm test --run && pnpm --filter @wimwian-org/playground build

# Finish: merges into master + dev, tags v0.4.0 on master, deletes the branch
git flow release finish v0.4.0
# Or plain git:
#   git switch master && git merge --no-ff release/v0.4.0 && git tag -a v0.4.0 -m "v0.4.0"
#   git switch dev && git merge --no-ff release/v0.4.0
#   git branch -d release/v0.4.0

# Push everything that matters
git push origin master dev --tags
```

Pushing `master` (or the tag) triggers the **release** GitHub workflow, which runs `pnpm changeset publish` to push to npm with provenance.

### What happens to pending changesets on the release branch

`pnpm changeset version` consumes every `.changeset/*.md` (except `README.md`), aggregates them into a single version bump, and writes a CHANGELOG.md entry. The changeset files themselves are deleted. That's the "all-or-nothing" model — there's no half-released changeset.

## Hotfixes

```bash
# Cut from master
git flow hotfix start v0.4.1

# Fix it (each commit auto-attaches a changeset)
pnpm commit                        # fix: critical NPE in Tooltip

# Bump + changelog
pnpm changeset version
git add .
git commit -m "chore(release): v0.4.1"

# Finish: merges to master + dev, tags
git flow hotfix finish v0.4.1
git push origin master dev --tags
```

Hotfixes are structurally identical to releases — same `changeset version` + tag + publish flow, just a different starting point.

## When the auto-changeset hook skips

| Situation                                                                | Skipped?       | Why                                                             |
| ------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------- |
| Commit on `master`                                                       | yes            | No invention of releases on production.                         |
| Commit on `dev`                                                          | yes            | Direct commits to integration should be administrative.         |
| Merge commit                                                             | yes            | Merge subjects don't follow conventional grammar.               |
| Rebase commit                                                            | yes            | Conflict noise; the original commits' changesets already exist. |
| `docs:` / `chore:` / `style:` / `test:` / `ci:` / `build:` / `refactor:` | yes            | Internal — nothing for consumers to learn.                      |
| Hand-written changeset already staged                                    | yes            | Don't overwrite intent.                                         |
| `feat:` / `fix:` / `perf:` / `feat!:` on a feature/bugfix/hotfix branch  | **no — fires** | The default consumer-visible path.                              |

## CI Awareness

- **PRs to `dev`** (from `feature/*`, `bugfix/*`) — full CI: check, lint, test, build, e2e, package.
- **PRs to `master`** (from `release/*`, `hotfix/*`) — same CI, plus a strict `changeset status --since=dev` to verify the bump is complete.
- **Push to `master`** — release workflow runs `pnpm changeset publish` (publishes whichever versions are not yet on npm).

See [.claude/distribution.md](distribution.md) for the workflow files.

## Quick Reference Card

```
# new feature
git flow feature start <slug>
… pnpm commit, pnpm commit, …
git flow feature finish <slug>

# release
git flow release start vX.Y.Z
pnpm changeset version
git commit -am "chore(release): vX.Y.Z"
git flow release finish vX.Y.Z
git push origin master dev --tags

# hotfix
git flow hotfix start vX.Y.Z
… pnpm commit (fix: …) …
pnpm changeset version
git commit -am "chore(release): vX.Y.Z"
git flow hotfix finish vX.Y.Z
git push origin master dev --tags

# parallel session in its own worktree
bin/wt feature <slug>                     # creates ../sui.worktrees/<slug>
cd ../sui.worktrees/<slug>
pnpm install && claude
# … work, commit, push …
cd /Users/apancha/WebstormProjects/sui
bin/wt rm <slug>                          # remove worktree FIRST (frees the branch)
git flow feature finish <slug>            # then finish from primary (where dev lives)
```
