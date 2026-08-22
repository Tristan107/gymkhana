# Plan: Tag visual regression tests + document Playwright commands

## Context

Visual regression tests pass in Playwright UI mode but fail in headed mode due to rendering differences (font anti-aliasing, sub-pixel rendering). We need to tag these tests so they can be easily skipped when running headed, and document the relevant Playwright commands in the README.

## Changes

### 1. `e2e/visual-regression.spec.ts` — Add `@ui-test-only` tag

Add `{ tag: '@ui-test-only' }` as the second argument to each of the 4 `test()` calls:

```ts
test('menu screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  // ...
})

test('game screen initial screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  // ...
})

test('rules screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  // ...
})

test('online screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  // ...
})
```

### 2. `playwright.config.ts` — Add slowMo for headed mode

Add `launchOptions.slowMo` to the `use` block. Only apply when `--headed` is used (via env var to avoid slowing CI):

```ts
use: {
  baseURL: "http://localhost:5173",
  trace: "on-first-retry",
  launchOptions: {
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  },
},
```

### 3. `README.md` — Add e2e testing section

Add a new section after the existing "How to test" section:

```markdown
# How to e2e test

Interactive test runner (headless, with snapshot inspection):
npx playwright test --ui

Watch tests live in a real browser (skips visual regression):
npx playwright test --headed --grep-invert "@ui-test-only"

Slow down tests (useful with --ui or --headed):
SLOW_MO=200 npx playwright test --headed --workers=1

# --workers=1     forces tests to run sequentially (no parallel browsers)
# SLOW_MO=200     adds 200ms delay between each action (tweak as needed)
```

## Verification

- Run `npx playwright test --grep "@ui-test-only"` — should match only the 4 visual regression tests
- Run `npx playwright test --grep-invert "@ui-test-only"` — should skip those 4 tests
- Run `npx playwright test --ui` — visual regression tests should still pass
- Run `npx playwright test --headed --grep-invert "@ui-test-only"` — should run all non-visual tests in headed mode
