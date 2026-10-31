import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../domain/types'
import { KEYS_KEY, PLAN_KEY, clearKeys, clearPlan, loadKeys, loadPlan, saveKeys, savePlan } from './localSettings'

describe('reference API key storage', () => {
  const original = (globalThis as any).localStorage
  afterEach(() => { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original }) })
  it('stores provider-specific keys under the reference project key', () => {
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
    saveKeys({ openai: 'test-key', google: 'google-key' })
    expect(values.has(KEYS_KEY)).toBe(true)
    expect(loadKeys()).toEqual({ openai: 'test-key', google: 'google-key' })
    clearKeys()
    expect(loadKeys()).toEqual({})
  })

  it('persists the question plan and teacher guidance locally', () => {
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
    const plan = { ...DEFAULT_PLAN, question_count: 2, teacher_guidance: '請涵蓋每一個作業區塊。' }
    savePlan(plan)
    expect(values.has(PLAN_KEY)).toBe(true)
    expect(loadPlan()).toMatchObject({ question_count: 2, teacher_guidance: '請涵蓋每一個作業區塊。' })
    clearPlan()
    expect(loadPlan()).toEqual(DEFAULT_PLAN)
  })
})
