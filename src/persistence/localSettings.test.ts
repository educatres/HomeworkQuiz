import { afterEach, describe, expect, it } from 'vitest'
import { KEYS_KEY, clearKeys, loadKeys, saveKeys } from './localSettings'

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
})
