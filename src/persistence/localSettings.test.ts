import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../domain/types'
import { KEYS_KEY, MODEL_CONFIG_KEY, PLAN_KEY, SETTINGS_KEY, clearKeys, clearPlan, loadKeys, loadPlan, loadSettings, saveKeys, savePlan } from './localSettings'

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

  it('normalizes a persisted CGU setting to the supported default model', () => {
    const values = new Map<string, string>([
      [SETTINGS_KEY, JSON.stringify({ provider: 'cgu', model: 'luna-1' })],
      [MODEL_CONFIG_KEY, JSON.stringify({ id: 'cgu', modelId: 'luna-1' })]
    ])
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
    expect(loadSettings()).toMatchObject({ provider: 'cgu', model: 'gpt-oss:20b' })
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
