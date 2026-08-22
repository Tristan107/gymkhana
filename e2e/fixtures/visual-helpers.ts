import { type Page, expect } from '@playwright/test'

export async function screenshotMatch(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    maxDiffPixels: 100,
    threshold: 0.2,
  })
}
