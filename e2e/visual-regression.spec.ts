import { test, expect } from '@playwright/test'

test('menu screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveScreenshot('menu-screen.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  })
})

test('game screen initial screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play local game' }).click()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page).toHaveScreenshot('game-screen-initial.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  })
})

test('rules screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'How to Play' }).first().click()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  await expect(page).toHaveScreenshot('rules-screen.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  })
})

test('online screen screenshot', { tag: '@ui-test-only' }, async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play online game' }).click()
  await expect(page.getByText('Online 1v1')).toBeVisible()
  await expect(page).toHaveScreenshot('online-screen.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  })
})
