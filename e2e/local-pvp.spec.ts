import { test, expect } from '@playwright/test'
import { startPvP, playMoves, expectGameOver, WINNING_MOVES } from './fixtures/game-helpers'

test('Red starts the game', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByText('Your turn')).toBeVisible()
})

test('tiles remaining start at 20', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByText('Red tiles left:')).toContainText('20')
  await expect(page.getByText('White tiles left:')).toContainText('20')
})

test('alternate placements: Red then White', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, [[1, 1], [2, 2]])
  await expect(page.getByLabel('Cell B10', { exact: true })).toHaveClass(/occupied/)
  await expect(page.getByLabel('Cell C9', { exact: true })).toHaveClass(/occupied/)
  await expect(page.getByText('Red tiles left:')).toContainText('19')
  await expect(page.getByText('White tiles left:')).toContainText('19')
})

test('tiles decrement after placement', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, [[1, 1]])
  await expect(page.getByText('Red tiles left:')).toContainText('19')
  await playMoves(page, [[2, 2]])
  await expect(page.getByText('White tiles left:')).toContainText('19')
})

test('last-move indicator appears on most recent placement', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, [[1, 1]])
  await expect(page.getByLabel('Cell B10', { exact: true }).locator('.last-move-dot')).toBeVisible()
  await playMoves(page, [[2, 2]])
  await expect(page.getByLabel('Cell B10', { exact: true }).locator('.last-move-dot')).not.toBeVisible()
  await expect(page.getByLabel('Cell C9', { exact: true }).locator('.last-move-dot')).toBeVisible()
})

test('invalid move: occupied cell rejected', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, [[1, 1]])
  await page.getByLabel('Cell B10', { exact: true }).click()
  await expect(page.getByText('Red tiles left:')).toContainText('19')
})

test('game over: Play Again restarts', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redConnection)
  await expectGameOver(page, 'red')
  await page.getByRole('button', { name: 'Play Again' }).click()
  await expect(page.getByTestId('game-over-panel')).not.toBeVisible()
  await expect(page.getByText('Red tiles left:')).toContainText('20')
})

test('game over: Menu returns to menu', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redConnection)
  await expectGameOver(page, 'red')
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})

test('How to Play from game screen', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.getByRole('button', { name: 'How to Play' }).click()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('main')).toBeVisible()
})

test('DevMenu opens with Ctrl+Shift+X', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
})

test('DevMenu: Toggle Coordinates shows labels', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
  await page.getByRole('switch', { name: 'Show coordinates' }).click()
  await expect(page.locator('.board')).toHaveClass(/coords/)
  await page.getByRole('button', { name: 'Close' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).not.toBeVisible()
})
