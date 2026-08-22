import { test, expect } from '@playwright/test'
import { startPvP } from './fixtures/game-helpers'

test('DevMenu opens with Ctrl+Shift+X', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
})

test('Export copies board to clipboard', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
  await page.getByRole('button', { name: 'Export board' }).click()
  await expect(page.getByText('Board copied to clipboard!')).toBeVisible()
})

test('Toggle Coordinates shows board labels', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await page.getByRole('switch', { name: 'Show coordinates' }).click()
  await expect(page.locator('.board')).toHaveClass(/coords/)
  await page.getByTestId('dev-close').click()
})

test('Close button hides DevMenu', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
  await page.getByTestId('dev-close').click()
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).not.toBeVisible()
})

test('Import toggle shows textarea', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await page.getByRole('button', { name: 'Import board' }).click()
  await expect(page.getByLabel('Board data to import')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load board' })).toBeVisible()
})
