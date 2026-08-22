import { test, expect } from '@playwright/test'
import { startPvP, openRules } from './fixtures/game-helpers'

test('rules screen opens from menu', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
})

test('rules screen opens from game screen', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.getByRole('button', { name: 'How to Play' }).click()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
})

test('all four win condition images displayed', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  await expect(page.getByAltText('Red wins by connecting the sides')).toBeVisible()
  await expect(page.getByAltText('White wins by connecting the sides')).toBeVisible()
  await expect(page.getByAltText("Red wins by boxing in an opponent's chain")).toBeVisible()
  await expect(page.getByAltText("White wins by boxing in an opponent's chain")).toBeVisible()
})

test('images load successfully', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  const altTexts = [
    'Red wins by connecting the sides',
    'White wins by connecting the sides',
    "Red wins by boxing in an opponent's chain",
    "White wins by boxing in an opponent's chain",
  ]
  for (const alt of altTexts) {
    const img = page.getByAltText(alt)
    await expect(img).toBeVisible()
    const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  }
})

test('back returns to menu', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})

test('back returns to game screen when opened from game', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.getByRole('button', { name: 'How to Play' }).click()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('main')).toBeVisible()
})
