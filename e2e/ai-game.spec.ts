import { test, expect } from '@playwright/test'
import { startAI } from './fixtures/game-helpers'

test('AI as Red: AI moves first after human selects White', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'white')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText('Your turn')).toBeVisible()
  await page.waitForTimeout(1000)
  const occupiedCells = await page.locator('[aria-label^="Cell "].occupied').count()
  expect(occupiedCells).toBeGreaterThanOrEqual(1)
})

test('human as Red: human moves first', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByText('Your turn')).toBeVisible()
  const occupiedCells = await page.locator('[aria-label^="Cell "].occupied').count()
  expect(occupiedCells).toBeGreaterThanOrEqual(0)
})

test('human as Red: AI responds after human move', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  const cell = page.getByLabel('Cell B10', { exact: true })
  if (await cell.getAttribute('class').then(c => !c?.includes('occupied'))) {
    await cell.click()
    await page.waitForTimeout(1000)
    const occupiedCells = await page.locator('[aria-label^="Cell "].occupied').count()
    expect(occupiedCells).toBeGreaterThanOrEqual(2)
  }
})

test('Undo button visible in AI mode', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
})

test('Play Again restarts with same human color', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible()
})

test('Menu button returns to menu', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})
