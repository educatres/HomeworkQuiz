import { describe, expect, it } from 'vitest'
import { calculateLinkedValues } from './TriplePercentageSlider'

const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0)

describe('calculateLinkedValues', () => {
  it('keeps the requested value and redistributes the remainder by the other two proportions', () => {
    expect(calculateLinkedValues([40, 35, 25], 0, 55)).toEqual([55, 25, 20])
    expect(calculateLinkedValues([40, 35, 25], 1, 50)).toEqual([30, 50, 20])
    expect(calculateLinkedValues([40, 35, 25], 2, 0)).toEqual([55, 45, 0])
  })

  it('supports endpoints and zero-proportion edge cases', () => {
    expect(calculateLinkedValues([40, 35, 25], 0, 100)).toEqual([100, 0, 0])
    expect(calculateLinkedValues([100, 0, 0], 0, 95)).toEqual([95, 5, 0])
    expect(calculateLinkedValues([40, 60, 0], 0, 55)).toEqual([55, 45, 0])
  })

  it('always returns 5-point integer multiples that sum to 100', () => {
    for (const index of [0, 1, 2]) {
      for (let requested = 0; requested <= 100; requested += 5) {
        const values = calculateLinkedValues([40, 35, 25], index, requested)
        expect(values.every(value => value >= 0 && value <= 100 && value % 5 === 0)).toBe(true)
        expect(total(values)).toBe(100)
      }
    }
  })
})
