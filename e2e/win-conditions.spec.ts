import { test, expect } from '@playwright/test'
import { startPvP, playMoves, WINNING_MOVES } from './fixtures/game-helpers'

test('Red connection win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redConnection)
  const overlay = page.getByRole('dialog')
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText(/red wins/i)).toBeVisible()
})

test('White connection win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.whiteConnection)
  const overlay = page.getByRole('dialog')
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText(/white wins/i)).toBeVisible()
})

test('Red box-in win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.redBoxIn)
  const overlay = page.getByRole('dialog')
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText(/red wins/i)).toBeVisible()
})

test('White box-in win', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await playMoves(page, WINNING_MOVES.whiteBoxIn)
  const overlay = page.getByRole('dialog')
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText(/white wins/i)).toBeVisible()
})
