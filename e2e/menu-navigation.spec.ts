import { test, expect } from '@playwright/test'
import { startPvP, startAI, openRules } from './fixtures/game-helpers'

test('loads menu screen', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})

test('Play local game opens game screen', async ({ page }) => {
  await page.goto('/')
  await startPvP(page)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByTestId('status-bar')).toBeVisible()
})

test('Play vs AI opens side picker', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play vs AI' }).click()
  await expect(page.getByText('Choose your side')).toBeVisible()
})

test('side picker: select Red starts AI game', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'red')
  await expect(page.getByRole('main')).toBeVisible()
})

test('side picker: select White starts AI game', async ({ page }) => {
  await page.goto('/')
  await startAI(page, 'white')
  await expect(page.getByRole('main')).toBeVisible()
})

test('side picker: cancel returns to menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play vs AI' }).click()
  await expect(page.getByText('Choose your side')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Choose your side')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})

test('side picker: close button closes dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play vs AI' }).click()
  await expect(page.getByText('Choose your side')).toBeVisible()
  await page.getByRole('button', { name: 'Close side selection' }).click()
  await expect(page.getByText('Choose your side')).not.toBeVisible()
})

test('Play online game opens online screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play online game' }).click()
  await expect(page.getByText('Online 1v1')).toBeVisible()
})

test('How to Play opens rules screen', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
})

test('rules screen: back returns to menu', async ({ page }) => {
  await page.goto('/')
  await openRules(page)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Play local game' })).toBeVisible()
})

test('escape key closes side picker', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play vs AI' }).click()
  await expect(page.getByText('Choose your side')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Choose your side')).not.toBeVisible()
})
