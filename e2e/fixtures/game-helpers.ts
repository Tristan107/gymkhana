import { type Page, expect } from '@playwright/test'

export const WINNING_MOVES = {
  redConnection: [
    [1, 1], [2, 10], [3, 1], [4, 10], [5, 1], [6, 10], [7, 1], [8, 10], [9, 1],
  ] as [number, number][],
  whiteConnection: [
    [2, 2], [1, 1], [4, 2], [1, 3], [6, 2], [1, 5], [8, 2], [1, 7], [10, 2], [1, 9],
  ] as [number, number][],
  redBoxIn: [
    [0, 4], [2, 10], [2, 4], [4, 10], [1, 3], [6, 10], [1, 5],
  ] as [number, number][],
  whiteBoxIn: [
    [4, 6], [1, 3], [6, 6], [3, 3], [8, 6], [2, 2], [10, 6], [2, 4],
  ] as [number, number][],
}

function cellLocator(page: Page, row: number, col: number) {
  const colLabel = String.fromCodePoint(65 + col)
  const rowLabel = 11 - row
  return page.getByLabel(`Cell ${colLabel}${rowLabel}`, { exact: true })
}

export async function clickCell(page: Page, row: number, col: number): Promise<void> {
  await cellLocator(page, row, col).click()
}

export async function playMoves(page: Page, moves: [number, number][]): Promise<void> {
  for (const [row, col] of moves) {
    await clickCell(page, row, col)
    await expect(
      cellLocator(page, row, col),
    ).toHaveClass(/occupied/, { timeout: 2000 })
  }
}

export async function startPvP(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play local game' }).click()
  await expect(page.getByRole('main')).toBeVisible()
}

export async function startAI(page: Page, human: 'red' | 'white'): Promise<void> {
  await page.getByRole('button', { name: 'Play vs AI' }).click()
  await page.getByRole('button', { name: `Play as ${human === 'red' ? 'Red' : 'White'}` }).click()
  await expect(page.getByRole('main')).toBeVisible()
}

export async function openRules(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'How to Play' }).first().click()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
}

export async function openDevMenu(page: Page): Promise<void> {
  await page.keyboard.press('Control+Shift+X')
  await expect(page.getByRole('dialog', { name: 'Developer Menu' })).toBeVisible()
}

export async function expectGameOver(
  page: Page,
  winner: 'red' | 'white' | 'draw',
): Promise<void> {
  const overlay = page.getByRole('dialog')
  await expect(overlay).toBeVisible()
  if (winner === 'draw') {
    await expect(overlay.getByText(/draw/i)).toBeVisible()
  } else {
    await expect(overlay.getByText(new RegExp(winner, 'i'))).toBeVisible()
  }
}
