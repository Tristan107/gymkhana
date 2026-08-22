import { test, expect } from '@playwright/test'
import { startPvP } from './fixtures/game-helpers'

test('board visible on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByRole('grid', { name: 'Game board' })).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
})

test('board visible on desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByRole('grid', { name: 'Game board' })).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
})

test('buttons accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play vs AI' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play online game' })).toBeVisible()
})

test('menu accessible from game on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
})
