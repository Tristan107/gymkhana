import { describe, expect, it } from 'vitest'
import { runPuzzle } from './puzzleRunner'

const puzzleFiles = import.meta.glob('./ai-training-puzzles/*_puzzle.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('puzzle runners', () => {
  it('runs chooseMove 10 times on every inline-solution puzzle', () => {
    const entries = Object.entries(puzzleFiles).filter(([, text]) =>
      /accepte?d\s*solutions/i.test(text)
    )
    expect(entries.length).toBeGreaterThan(0)
    for (const [path, text] of entries) {
      const result = runPuzzle(text)
      expect(result.chosen, path).toHaveLength(10)
      expect(result.missing, path).toBe(0)
      expect(result.invalid, path).toEqual([])
      expect(result.ok, path).toBe(true)
    }
  })
})
