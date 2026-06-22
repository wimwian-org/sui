# Tooling: Lint, Format, Pre-commit

## ESLint (Flat Config)

We use ESLint's flat config with three plugins:

- **`@eslint/js`** — base recommended.
- **`typescript-eslint`** — typed TS rules.
- **`eslint-plugin-svelte` v3** — Svelte 5–aware linting.

```
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-svelte \
            eslint-config-prettier globals
```

```javascript
// eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    prettier,
    ...svelte.configs.prettier,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-undef': 'off', // TS handles this
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
                svelteConfig,
            },
        },
    },
    {
        ignores: [
            'node_modules/',
            '.svelte-kit/',
            'build/',
            'dist/',
            'coverage/',
            'playwright-report/',
            'test-results/',
        ],
    },
);
```

Rules to consider tightening as the codebase matures:

- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/consistent-type-imports: warn`
- `svelte/no-at-html-tags: error`
- `svelte/valid-compile: error`

## Prettier

```
pnpm add -D prettier prettier-plugin-svelte prettier-plugin-tailwindcss
```

```json
// .prettierrc
{
    "useTabs": false,
    "tabWidth": 2,
    "singleQuote": true,
    "semi": true,
    "trailingComma": "all",
    "printWidth": 100,
    "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
    "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

`prettier-plugin-tailwindcss` must be **last** in the `plugins` array — it patches whatever plugin renders the class string.

```
// .prettierignore
.svelte-kit
build
dist
coverage
playwright-report
test-results
pnpm-lock.yaml
```

## TypeScript

```json
// tsconfig.json
{
    "extends": "./.svelte-kit/tsconfig.json",
    "compilerOptions": {
        "allowJs": true,
        "checkJs": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "sourceMap": true,
        "strict": true,
        "moduleResolution": "bundler",
        "verbatimModuleSyntax": true
    }
}
```

`verbatimModuleSyntax` matches Svelte 5's tooling defaults and removes ambiguity between value and type imports.

## svelte-check

Runs as part of `pnpm check`. The root runs `svelte-check` directly (it's not a SvelteKit app). The playground includes `svelte-kit sync` first:

```json
// root package.json
"check": "svelte-check --tsconfig ./tsconfig.json"

// apps/playground/package.json
"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
```

## Commits: Commitizen + commitlint

Conventional commits ([spec](https://www.conventionalcommits.org/)) are required. Two tools enforce this:

- **Commitizen** (`pnpm commit`) — interactive prompt that builds the message for you.
- **commitlint** — validates the message on `commit-msg`; bad messages are rejected before they land.

```
pnpm add -D commitizen cz-conventional-changelog \
            @commitlint/cli @commitlint/config-conventional
```

### `package.json` additions

```json
{
    "scripts": {
        "commit": "cz"
    },
    "config": {
        "commitizen": {
            "path": "cz-conventional-changelog"
        }
    }
}
```

### `commitlint.config.js`

```javascript
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Permit longer subjects than the default 72 — Svelte component names eat chars fast.
        'subject-max-length': [2, 'always', 100],
        'body-max-line-length': [1, 'always', 120],
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
        ],
    },
};
```

### Conventional → Changesets mapping

When a release goes out, the commit type implies the semver bump (this is what makes versioning "automatic"):

| Commit type                                           | Changeset bump          |
| ----------------------------------------------------- | ----------------------- |
| `feat:`                                               | `minor`                 |
| `fix:`                                                | `patch`                 |
| `perf:`, `refactor:` (consumer-visible)               | `patch`                 |
| `feat!:` or `BREAKING CHANGE:` in body                | `major`                 |
| `docs:`, `style:`, `test:`, `build:`, `ci:`, `chore:` | no changeset (internal) |

You still **author the changeset by hand** with `pnpm changeset`, but the bump kind follows the commit type — no judgement call required, no surprise releases.

### Auto-generated changesets (wired by default)

Each conventional commit on a feature/bugfix/hotfix branch automatically gets a matching `.changeset/*.md` written into the same commit by a `post-commit` hook (which generates the changeset and amends it in). You don't run `pnpm changeset` for routine changes.

The script lives at `scripts/auto-changeset.mjs` and:

- Reads the just-made commit's subject and body.
- Parses for a conventional prefix (`feat:`, `fix:`, `perf:`, or `!:` / `BREAKING CHANGE:` for major).
- Picks the bump kind: `feat` → minor, `fix`/`perf` → patch, breaking → major.
- Writes `.changeset/auto-<slug>.md` and amends it into the same commit (`git commit --amend --no-edit --no-verify`).
- **Skips** on `master`, `dev`, during merges and rebases, for `docs:` / `chore:` / `style:` / etc., and if a hand-written changeset was newly added in the commit.
- **Recursion guard:** the amend re-fires `post-commit`. The second pass sees a `.changeset/auto-*.md` was newly **added** to HEAD (via `git show --diff-filter=A`) and exits cleanly. The added-only check matters: a commit that merely _modifies_ a pre-existing auto-changeset (e.g. prettier reformatting one of last week's) must not short-circuit and skip generating its own — that bug landed once and is captured in `54c2447`'s follow-up.

See [.claude/distribution.md](distribution.md) § "auto-changeset.mjs" for the script source, and [.claude/gitflow.md](gitflow.md) for the branch context.

Run `pnpm changeset` only when you want a hand-crafted release-note entry (e.g. a multi-part change you'd rather describe in one bullet than three). The auto-script will detect it and stand down.

## Pre-commit: lefthook

```
pnpm add -D lefthook
pnpm exec lefthook install
```

```yaml
# lefthook.yml  (lefthook v2 — uses `jobs:` list, not `commands:` map)
pre-commit:
    parallel: true
    jobs:
        - name: format
          glob: '*.{js,mjs,cjs,ts,svelte,css,json,md,html}'
          run: pnpm prettier --write {staged_files}
          stage_fixed: true
        - name: lint
          glob: '*.{js,mjs,cjs,ts,svelte}'
          run: pnpm eslint {staged_files}

commit-msg:
    jobs:
        - name: commitlint
          run: pnpm commitlint --edit {1}

post-commit:
    jobs:
        - name: auto-changeset
          # Generates .changeset/auto-*.md from the conventional commit type
          # and amends it into the just-made commit. See .claude/distribution.md
          # for the script and the timing rationale.
          skip:
              - merge
              - rebase
              - ref: master
              - ref: dev
          run: node scripts/auto-changeset.mjs
```

Three stages do real work:

- **`pre-commit`** — format/lint. `stage_fixed: true` re-adds files that the hook auto-fixed so the commit picks them up.
- **`commit-msg`** — commitlint against the message file (`{1}` is the git-supplied path).
- **`post-commit`** — auto-changeset. Generates and amends the changeset into the same commit; recursion is broken by an in-commit guard.

## IDE: VS Code

```json
// .vscode/extensions.json
{
    "recommendations": [
        "svelte.svelte-vscode",
        "bradlc.vscode-tailwindcss",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-playwright.playwright"
    ]
}
```

```json
// .vscode/settings.json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[svelte]": { "editor.defaultFormatter": "svelte.svelte-vscode" },
    "eslint.validate": ["javascript", "typescript", "svelte"],
    "tailwindCSS.experimental.classRegex": [["class:?[a-zA-Z]*\\s*=\\s*[\"'`]([^\"'`]*)[\"'`]"]]
}
```

## Scripts

### Root (`package.json`)

Workspace-level tooling and orchestration. No `dev`/`build`/`preview` at root — those are per-workspace.

```json
{
    "scripts": {
        "check": "svelte-check --tsconfig ./tsconfig.json",
        "lint": "eslint .",
        "lint:fix": "eslint . --fix",
        "format": "prettier --write .",
        "format:check": "prettier --check .",
        "test": "vitest run",
        "coverage": "vitest run --coverage",
        "commit": "cz",
        "changeset": "changeset",
        "version": "changeset version",
        "release": "pnpm package && changeset publish",
        "prepare": "lefthook install"
    }
}
```

### Playground (`apps/playground/package.json`)

```json
{
    "scripts": {
        "dev": "vite dev",
        "build": "vite build",
        "preview": "vite preview",
        "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
    }
}
```

Run playground commands from the root with `pnpm --filter @wimwian-org/playground <script>`.

## Engines & pnpm config

```json
{
    "engines": {
        "node": ">=24.0.0",
        "pnpm": ">=9.0.0"
    },
    "packageManager": "pnpm@9.12.0"
}
```

```
# .npmrc
engine-strict=true
auto-install-peers=true
strict-peer-dependencies=false
```

`engine-strict=true` blocks installs on the wrong Node — catches "works on my machine" before it costs an afternoon.

```
# .nvmrc
24
```
