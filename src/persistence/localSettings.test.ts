import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PLAN } from '../domain/types'
import { DEFAULT_BASE_URLS, GOOGLE_DEFAULT_MODEL, KEYS_KEY, MODEL_CONFIG_KEY, PLAN_KEY, SETTINGS_KEY, clearKeys, clearPlan, loadKeys, loadPlan, loadSettings, saveKeys, savePlan } from './localSettings'

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
    expect(loadSettings()).toMatchObject({ provider: 'cgu', model: 'gemma-4-26b-a4b-it' })
  })

  it('uses the Gemini flash lite latest alias when no Google model is saved', () => {
    const values = new Map<string, string>([[SETTINGS_KEY, JSON.stringify({ provider: 'google' })]])
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
    expect(loadSettings()).toMatchObject({ provider: 'google', model: GOOGLE_DEFAULT_MODEL })
  })

  it('defaults a fresh browser to Google AI Studio and Flash Lite', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
    expect(loadSettings()).toMatchObject({ provider: 'google', model: 'gemini-flash-lite-latest', base_url: DEFAULT_BASE_URLS.google })
  })

  it.each(['openai', 'xai'])('migrates a disabled %s selection without reusing its endpoint or model', provider => {
    const values = new Map<string, string>([
      [SETTINGS_KEY, JSON.stringify({ provider, model: 'old-model', base_url: 'https://old.example/v1', language: 'en' })],
      [MODEL_CONFIG_KEY, JSON.stringify({ id: provider, modelId: 'old-model', baseUrl: 'https://old.example/v1' })]
    ])
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null } })
    expect(loadSettings()).toMatchObject({ provider: 'google', model: GOOGLE_DEFAULT_MODEL, base_url: DEFAULT_BASE_URLS.google, language: 'en' })
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
