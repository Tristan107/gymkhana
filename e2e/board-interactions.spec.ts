import { test, expect } from '@playwright/test'
import { startPvP } from './fixtures/game-helpers'

test('empty playable cell shows preview on hover', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  const cell = page.getByLabel('Cell B10', { exact: true })
  await cell.hover()
  await expect(cell.locator('.preview')).toBeVisible()
})

test('occupied cell has occupied class', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.getByLabel('Cell B10', { exact: true }).click()
  await expect(page.getByLabel('Cell B10', { exact: true })).toHaveClass(/occupied/)
})

test('board container has accessible name', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByRole('grid', { name: 'Game board' })).toBeVisible()
})

test('click places token', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  const cell = page.getByLabel('Cell B10', { exact: true })
  await cell.click()
  await expect(cell).toHaveClass(/occupied/)
})

test('DevMenu Toggle Coordinates shows labels', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
  await page.getByRole('switch', { name: 'Show coordinates' }).click()
  await expect(page.locator('.board')).toHaveClass(/coords/)
})
