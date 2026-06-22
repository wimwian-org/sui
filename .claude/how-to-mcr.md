# How to set up unified MCR coverage (Node + Playwright)

This bit collects **native V8 coverage from both Vitest projects** — the Node project (pure-TS
tests) and the Playwright/Chromium browser project (`.svelte` component tests) — and consolidates
them into **one** HTML report at `coverage/index.html`, gated at 100%.

It uses [`monocart-coverage-reports`](https://github.com/cenfun/monocart-coverage-reports) (MCR) via
the [`vitest-monocart-coverage`](https://github.com/cenfun/vitest-monocart-coverage) custom provider.
This guide reproduces the same setup in another project.

---

## Why this and not `@vitest/coverage-v8`?

The stock provider can't merge a Node run and a browser (CDP) run into a single report — you get
either one runner's numbers or two disjoint reports. The `vitest-monocart-coverage/browser` provider
adds Chrome DevTools Protocol (`Profiler.takePreciseCoverage`) collection for the browser project and
still orchestrates the Node project, then feeds **both** raw V8 streams into one `CoverageReport`.

---

## 1. Install dev dependencies

```bash
pnpm add -D vitest-monocart-coverage monocart-coverage-reports @vitest/coverage-v8 \
            @vitest/browser-playwright playwright
```

Pin `@vitest/coverage-v8` to your exact Vitest version (this repo uses `4.1.8` for both). Version
skew between Vitest and the v8 provider is the most common cause of empty reports.

---

## 2. Wire the custom provider into `vite.config.ts`

In your Vitest config, set the coverage provider to the MCR browser module and declare your two
projects. Report options live in `mcr.config.js` (step 3) — keep `vite.config.ts` to _what to
instrument_ and _project topology_.

```ts
test: {
  coverage: {
    // Consolidate V8 coverage from BOTH projects into one report.
    // The `/browser` entry adds CDP collection AND still orchestrates Node.
    provider: 'custom',
    customProviderModule: 'vitest-monocart-coverage/browser',
    // Instrument the published library only — exclude the showcase app, tests, type-only modules.
    include: ['src/lib/**'],
    exclude: ['src/lib/**/*.{test,spec}.{js,ts}', 'src/lib/types.ts']
  },
  projects: [
    {
      extends: './vite.config.ts',
      test: {
        name: 'client',
        browser: {
          enabled: true,
          provider: playwright(),
          instances: [{ browser: 'chromium', headless: true }]
        },
        include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        exclude: ['src/lib/server/**']
      }
    },
    {
      extends: './vite.config.ts',
      test: {
        name: 'server',
        environment: 'node',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
      }
    }
  ]
}
```

Top-of-file import for the browser provider:

```ts
import { playwright } from '@vitest/browser-playwright';
```

> The naming convention `*.svelte.test.ts` (browser) vs `*.test.ts` (node) is what routes a test to
> the right runner — the `include`/`exclude` globs above depend on it. Keep it.

---

## 3. Author `mcr.config.js`

MCR auto-discovers `mcr.config.js` at the project root. This is where the report formats, the
source-path normalisation, the source filter, and the coverage gate live.

```js
// Monocart Coverage Reports config — consolidates Node V8 + Playwright/CDP into one report.

// The browser project reports sources by BASENAME (e.g. `Component.svelte`); the Node project
// reports a workspace PATH (e.g. `src/lib/foo.ts`). Filter/normalise accordingly.
const LIBRARY_TS = new Set(['index.ts', 'foo.variants.ts', 'foo-context.ts']);
const isLibrarySource = (sourcePath) => {
	const base = sourcePath.split('/').pop() ?? '';
	if (base.endsWith('.svelte')) return base.startsWith('Component.');
	return LIBRARY_TS.has(base);
};

const METRICS = ['statements', 'branches', 'functions', 'lines'];

export default {
	name: 'my-lib — unified coverage (Node V8 + Playwright)',
	outputDir: './coverage',
	// v8 = the rich unified HTML UI; lcovonly + console-details ride along.
	reports: [['v8'], ['lcovonly'], ['console-details']],
	// Drop raw entries that aren't library code BEFORE source extraction: deps, Vite's
	// client runtime, and imported CSS (not executable code).
	entryFilter: (entry) => {
		const url = entry.url ?? '';
		return !url.includes('node_modules') && !url.includes('@vite') && !url.endsWith('.css');
	},
	// Canonicalise both labellings to `src/lib/<basename>` so a file covered by BOTH
	// runners merges into one row instead of splitting into two.
	sourcePath: (filePath) => `src/lib/${filePath.split('/').pop()}`,
	sourceFilter: isLibrarySource,
	// Enforce a coverage floor across the CONSOLIDATED report (both runners combined).
	onEnd: (results) => {
		const summary = results.summary ?? {};
		const failed = METRICS.filter((m) => (summary[m]?.pct ?? 0) < 100);
		if (failed.length) {
			const detail = failed.map((m) => `${m} ${summary[m]?.pct ?? 0}%`).join(', ');
			console.error(`\n✗ Unified coverage below 100%: ${detail}`);
			process.exitCode = 1;
		} else {
			console.log('\n✓ Unified coverage 100% — statements / branches / functions / lines');
		}
	}
};
```

### Three pitfalls this config defends against

1. **Dual labelling.** The two runners name the _same_ file differently — the browser by basename,
   Node by workspace path. Without `sourcePath` canonicalising both to `src/lib/<basename>`, a file
   exercised by both runners splits into two half-covered rows. This is the single most important
   line.
2. **Non-code entries.** Imported CSS, `@vite/client`, and `node_modules` show up as raw coverage
   entries. `entryFilter` drops them before source extraction; `sourceFilter` (`isLibrarySource`)
   keeps only your published sources and drops test fixtures that don't carry your component prefix.
3. **Gating the merge, not a runner.** The `onEnd` gate reads `results.summary` — the _consolidated_
   numbers — so the build fails only if the combined coverage dips, not if one runner alone is
   incomplete (each runner only covers part of the library by design).

Adapt the three placeholders to your project: the `LIBRARY_TS` set, the `.svelte` prefix check
(`Component.`), and the `src/lib/` path root.

---

## 4. Add the script

```jsonc
// package.json
"scripts": {
  "test:coverage": "vitest run --coverage"
}
```

---

## 5. Ignore the output

```gitignore
# .gitignore
coverage/
```

---

## Run it

```bash
pnpm test:coverage
```

Open `coverage/index.html` for the unified UI. `lcovonly` (`coverage/lcov.info`) is emitted for CI /
Codecov; `console-details` prints a per-file table to the terminal. A non-100% result sets a failing
exit code via the `onEnd` gate.

---

## Adapting to a different structure

| If your project…                       | Change…                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| isn't a `src/lib/` library             | the `sourcePath` root and the `include` glob                         |
| uses a different component-name prefix | the `base.startsWith('Component.')` check + the `LIBRARY_TS` set     |
| wants a lower floor (e.g. 80%)         | compare against `80` instead of `100` in `onEnd`                     |
| uses Firefox/WebKit                    | the `instances` browser in `vite.config.ts`                          |
| has only one runner                    | drop a project — MCR still works, `sourcePath` merge becomes a no-op |
