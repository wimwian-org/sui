# Testing Strategy

## Current state (interim)

`pnpm test` runs **Vitest in node mode** from the repo root. This is an interim setup that lets `pnpm coverage` emit coverage-summary.json for the metadata scripts. No real Chromium, no bit component tests exist yet.

```typescript
// vitest.config.ts (current)
export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.{ts,js,mjs,svelte.ts}'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
            reporter: ['text', 'json-summary', 'html', 'lcov'],
            include: ['src/components/**/*.{ts,svelte}'],
            exclude: ['src/components/**/*.{test,spec}.ts'],
        },
    },
});
```

## Planned: two layers

Once bits exist in `components/`, switch to:

- **Component tests** (`pnpm test`) — Vitest in **browser mode**, driven by `vitest-browser-svelte`, running in real Chromium via Playwright. Per-file isolation.
- **E2E tests** (`pnpm --filter @wimwian-org/playground test:e2e`) — Playwright against the built playground. Full user flows across multiple routes.

Coverage collected by `@vitest/coverage-v8`. HTML + LCOV outputs.

## Dependencies (when switching to browser mode)

```
pnpm add -D vitest @vitest/browser vitest-browser-svelte playwright \
            @vitest/coverage-v8 @playwright/test
pnpm exec playwright install --with-deps chromium
```

## Vitest browser-mode configuration (target)

```typescript
// vitest.config.ts (target — replace the interim config above)
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
        },
        include: ['components/**/*.{test,spec}.{ts,svelte.ts}'],
        setupFiles: ['./test-setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['components/**/*.{ts,svelte}'],
            exclude: ['components/**/*.test.ts'],
        },
    },
});
```

```typescript
// test-setup.ts
import '@wimwian-org/theme';
```

Importing the theme in setup ensures component tests render with design tokens applied.

## 3. Writing a Component Test

Use `render` from `vitest-browser-svelte` and `page` from `@vitest/browser/context`. Queries follow Testing Library conventions (`getByRole`, `getByLabelText`, …) but return Playwright-style locators.

```typescript
// components/button/src/Button.test.ts
import { expect, test, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

test('renders children inside a button', async () => {
    render(Button, { children: () => 'Click me' });
    await expect.element(page.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});

test('composes variant + tint classes', async () => {
    render(Button, { variant: 'outline', tint: 'error', children: () => 'Delete' });
    const btn = page.getByRole('button');
    await expect.element(btn).toHaveClass(/btn/);
    await expect.element(btn).toHaveClass(/btn-outline/);
    await expect.element(btn).toHaveClass(/error/);
});

test('fires onclick', async () => {
    const onclick = vi.fn();
    render(Button, { onclick, children: () => 'go' });
    await page.getByRole('button').click();
    expect(onclick).toHaveBeenCalledOnce();
});

test('is disabled while loading', async () => {
    render(Button, { loading: true, children: () => 'go' });
    await expect.element(page.getByRole('button')).toBeDisabled();
});
```

### What to assert

For each bit, cover:

1. **Render contract** — does it render the right element with the right role?
2. **Variant axes** — for each variant / size / tint, the expected class composition.
3. **State flags** — `disabled`, `loading`, `error`, etc.
4. **Event forwarding** — clicks, changes, focus.
5. **Accessibility** — `aria-*`, keyboard interactions where the primitive's own tests don't cover them.

Don't re-test what `bits-ui` already guarantees (focus trapping in `Dialog`, roving tabindex in `Tabs`). Test your wrapper.

## 4. Theme-Aware Tests

To test something in dark mode:

```typescript
test('dark theme uses g-900 background', async () => {
    document.documentElement.dataset.theme = 'dark';
    render(Card, { children: () => 'content' });
    const card = page.getByText('content');
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('');
    // assert resolved oklch / rgb value if you need exactness
});
```

Reset the theme in `afterEach` if you flip it inside a test:

```typescript
import { afterEach } from 'vitest';
afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
});
```

## 5. Playwright E2E

E2E exercises the **built** playground, not source files. It catches integration issues that component tests miss — routing, hydration, real network, multi-page flows.

```typescript
// apps/playground/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'pnpm preview --port 4173 --strictPort',
        port: 4173,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        // Add firefox/webkit when you actually need cross-browser
    ],
});
```

```typescript
// tests/e2e/button.spec.ts
import { expect, test } from '@playwright/test';

test('Button demo route renders all variants', async ({ page }) => {
    await page.goto('/bits/button');
    for (const variant of ['solid', 'soft', 'outline', 'ghost']) {
        await expect(page.locator(`[data-button-root][data-variant="${variant}"]`).first()).toBeVisible();
    }
});

test('theme toggle flips the document', async ({ page }) => {
    await page.goto('/bits/button');
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.locator('.theme-toggle').click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toBe(before);
});
```

## 6. Visual Regression (optional)

Playwright has built-in screenshot diffing. Add a spec per demo route once styles stabilise:

```typescript
test('button variants match baseline', async ({ page }) => {
    await page.goto('/bits/button');
    await expect(page.locator('main')).toHaveScreenshot('button.png', {
        maxDiffPixelRatio: 0.01,
    });
});
```

Snapshots live next to the test, `__screenshots__/button.png`. Update with `pnpm --filter @wimwian-org/playground test:e2e --update-snapshots`.

## 7. Coverage

```
pnpm coverage          # text + html + lcov
open coverage/index.html
```

CI uploads `coverage/lcov.info` to Codecov / Coveralls.

## 8. What Not to Test

- `bits-ui`'s own behavior. Their primitives are already tested upstream.
- Tailwind class generation. Trust the build.
- TypeScript types. `pnpm check` covers that.

## 9. CI Wiring

GitHub Actions runs the matrix on every PR:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm check
- run: pnpm lint
- run: pnpm test --run
- run: pnpm --filter @wimwian-org/playground build
```

Full file in [.claude/distribution.md](distribution.md).
