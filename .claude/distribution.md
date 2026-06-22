# Distribution: Packaging & Releases

This is a pnpm monorepo. Published packages live under `packages/` (and eventually `components/`). The `apps/playground` is never published.

## Current published packages

| Package              | Path              | Description                           |
| -------------------- | ----------------- | ------------------------------------- |
| `@wimwian-org/theme` | `packages/theme/` | CSS design tokens + Tailwind v4 theme |

Bit components in `components/` are planned but not yet scaffolded.

## 1. `@wimwian-org/theme` distribution

CSS-only package — no Svelte, no JS bundler step. Distribution is direct CSS source:

```json
// packages/theme/package.json (exports)
{
    "exports": {
        ".": "./src/index.css",
        "./tailwind": "./src/tailwind.css",
        "./tokens": "./src/tokens.css",
        "./tints": "./src/tints.css",
        "./typography": "./src/typography.css",
        "./package.json": "./package.json"
    },
    "files": ["src"],
    "peerDependencies": { "tailwindcss": "^4.0.0" }
}
```

No build step. `pnpm publish` (or CI) ships `src/` directly.

## 2. Bit component distribution (planned)

Each bit in `components/<name>/` will be its own package (or sub-package) using `@sveltejs/package`:

```
pnpm add -D @sveltejs/package publint
```

`svelte-package` reads the component's `src/`, runs preprocessors, emits `.svelte` (source) and `.svelte.d.ts` (types) into `dist/`. Nothing pre-bundled — consumers compile with their own toolchain.

```javascript
// components/button/svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
    preprocess: vitePreprocess(),
    package: {
        source: 'src',
        dir: 'dist',
        emitTypes: true,
        exports: (filepath) => !filepath.endsWith('.test.ts') && !filepath.endsWith('.spec.ts'),
    },
};
```

Canonical `package.json` shape for a bit:

```json
{
    "name": "@wimwian-org/button",
    "version": "0.0.0",
    "type": "module",
    "files": ["dist", "!dist/**/*.test.*"],
    "svelte": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "svelte": "./dist/index.js"
        }
    },
    "peerDependencies": {
        "svelte": "^5.0.0",
        "tailwindcss": "^4.0.0",
        "bits-ui": "^2.0.0"
    },
    "sideEffects": ["**/*.css"]
}
```

Notes:

- `peerDependencies` — keep Svelte, Tailwind, and `bits-ui` out of the bundle; consumers own their versions.
- `sideEffects: ["**/*.css"]` — prevents consumer bundlers from tree-shaking CSS imports inside `.svelte` files.

## 3. Changesets + Conventional Commits

Two tools, one workflow:

- **Conventional commits** (enforced by Commitizen + commitlint, see [tooling.md](tooling.md)) describe **what** changed.
- **Changesets** decide **when and how** that turns into a release — they aggregate `.changeset/*.md` intent files, compute the next semver, write CHANGELOG, and publish.

```
pnpm add -D @changesets/cli
pnpm exec changeset init
```

```json
// .changeset/config.json (current)
{
    "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
    "changelog": "@changesets/cli/changelog",
    "commit": false,
    "access": "public",
    "baseBranch": "master",
    "updateInternalDependencies": "patch"
}
```

Conventional commit → changeset bump mapping:

| Commit type                                           | Changeset bump |
| ----------------------------------------------------- | -------------- |
| `feat:`                                               | `minor`        |
| `fix:`, `perf:`                                       | `patch`        |
| `feat!:` or `BREAKING CHANGE:`                        | `major`        |
| `docs:`, `style:`, `test:`, `build:`, `ci:`, `chore:` | no changeset   |

Workflow (see [gitflow.md](gitflow.md) for the full branching picture):

1. **Feature work** on `feature/*` from `dev`. Each conventional commit auto-attaches a `.changeset/auto-*.md` via the `post-commit` hook.
2. Merge `feature/*` → `dev`. Changesets accumulate.
3. **Cut a release**: `git flow release start vX.Y.Z` from `dev`. Run `pnpm changeset version` — consumes every pending changeset, bumps `package.json` versions, writes CHANGELOG.
4. Commit: `git commit -am "chore(release): vX.Y.Z"`.
5. `git flow release finish vX.Y.Z` — merges to `master` (tagged) and back to `dev`.
6. `git push origin master dev --tags` — push to `master` triggers the release workflow → `pnpm changeset publish` → npm.

Run `pnpm changeset` manually only for hand-crafted release-note entries. The auto-hook stands down if it detects a hand-written changeset staged in the commit.

### `scripts/auto-changeset.mjs`

```javascript
// scripts/auto-changeset.mjs
//
// post-commit hook. Reads the just-made commit, and if it's a consumer-
// visible conventional commit (feat / fix / perf / breaking), generates a
// matching .changeset/auto-*.md and AMENDS it into the same commit.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function git(cmd) {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

// Skip merge commits.
const parents = git('log -1 --pretty=%P').split(/\s+/).filter(Boolean);
if (parents.length > 1) process.exit(0);

const subject = git('log -1 --pretty=%s');
const body = git('log -1 --pretty=%b');
const m = subject.match(/^(\w+)(?:\([^)]+\))?(!)?:\s*(.+)$/);
if (!m) process.exit(0);
const [, type, bang, summary] = m;

const breaking = bang === '!' || /BREAKING CHANGE/i.test(body);
let bump;
if (breaking) bump = 'major';
else if (type === 'feat') bump = 'minor';
else if (type === 'fix' || type === 'perf') bump = 'patch';
else process.exit(0);

// --diff-filter=A: only newly-added paths. A commit that merely *touches*
// a pre-existing .changeset/auto-*.md must still generate its own changeset.
const addedFiles = git('show --diff-filter=A --pretty= --name-only HEAD').split('\n').filter(Boolean);

// Defer to a hand-written changeset newly added in this commit.
const hasManual = addedFiles.some(
    (f) => f.startsWith('.changeset/') && f.endsWith('.md') && !f.includes('auto-') && f !== '.changeset/README.md',
);
if (hasManual) process.exit(0);

// Break the recursive loop: if we already added an auto-* in this commit, stop.
const hasAuto = addedFiles.some((f) => f.startsWith('.changeset/auto-') && f.endsWith('.md'));
if (hasAuto) process.exit(0);

const pkg = JSON.parse(readFileSync('package.json', 'utf8')).name;
mkdirSync('.changeset', { recursive: true });
const slug = randomBytes(3).toString('hex');
const file = `.changeset/auto-${slug}.md`;
writeFileSync(file, `---\n"${pkg}": ${bump}\n---\n\n${summary}\n`);

execSync(`git add ${file}`);
execSync(`git commit --amend --no-edit --no-verify`, { stdio: 'inherit' });
```

Why `post-commit` + amend (not `prepare-commit-msg`): with `git commit -m`, git snapshots the index to build the commit tree _before_ `prepare-commit-msg` runs — a `git add` from inside that hook updates the index but misses the already-built tree, so the changeset lands in the _next_ commit. `post-commit` + amend guarantees the changeset and its originating diff share one hash.

## 4. GitHub Actions

### CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
    push: { branches: [master, dev] }
    pull_request: { branches: [master, dev] }

jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with: { fetch-depth: 0 }
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with: { node-version: 24, cache: pnpm }
            - run: pnpm install --frozen-lockfile
            - run: pnpm check
            - run: pnpm lint
            - run: pnpm test --run
            - run: pnpm --filter @wimwian-org/playground build

    changeset-consumed:
        if: github.event_name == 'pull_request' && github.base_ref == 'master'
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with: { fetch-depth: 0 }
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with: { node-version: 24, cache: pnpm }
            - run: pnpm install --frozen-lockfile
            - name: Verify all changesets are consumed
              run: |
                  if ls .changeset/*.md 2>/dev/null | grep -v README.md | grep -q .; then
                    echo "::error::Pending changesets on a release/hotfix branch. Run 'pnpm changeset version'."
                    exit 1
                  fi
```

### Release (`.github/workflows/release.yml`)

Triggered when `master` advances. `changeset version` already ran on the release branch locally.

```yaml
name: Release
on:
    push:
        branches: [master]
        tags: ['v*']

permissions:
    contents: write
    id-token: write # npm provenance

jobs:
    publish:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with: { fetch-depth: 0 }
            - uses: pnpm/action-setup@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 24
                  cache: pnpm
                  registry-url: 'https://registry.npmjs.org'
            - run: pnpm install --frozen-lockfile
            # changeset publish is idempotent — safe to run on every master push.
            - run: pnpm changeset publish
              env:
                  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
                  NPM_CONFIG_PROVENANCE: 'true'
            - run: git push --follow-tags
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 5. Versioning Policy

Semver:

- **Patch** — bug fixes, internal refactors, doc updates that touch published files.
- **Minor** — new bits, new variants, new tokens, additive props.
- **Major** — renames, removed props, breaking token changes (the `--color-c-*` / `@wimwian-org/theme` API surface).

Pre-1.0 (`0.x.y`): minor = breaking change, patch = everything else.

## 6. Pre-publish Sanity

```
pnpm dlx publint
pnpm dlx @arethetypeswrong/cli --pack .
```

Run both after packaging to catch bad `exports`, wrong `types` paths, and CJS/ESM mismatches before pushing.

## 7. Pinning the Toolchain

`packageManager` in `package.json` pins pnpm; `.tool-versions` pins Node. CI matches both. Don't drift.
