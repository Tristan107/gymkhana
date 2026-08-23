import { test, expect } from '@playwright/test'
import { startPvP, playMoves, WINNING_MOVES } from './fixtures/game-helpers'

test('Red connection win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redConnection)
  const panel = page.getByTestId('game-over-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/red wins/i)).toBeVisible()
})

test('White connection win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.whiteConnection)
  const panel = page.getByTestId('game-over-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/white wins/i)).toBeVisible()
})

test('Red box-in win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redBoxIn)
  const panel = page.getByTestId('game-over-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/red wins/i)).toBeVisible()
})

test('White box-in win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.whiteBoxIn)
  const panel = page.getByTestId('game-over-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByText(/white wins/i)).toBeVisible()
})
