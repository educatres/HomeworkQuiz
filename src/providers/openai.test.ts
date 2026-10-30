import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleProvider } from './openai'

describe('OpenAI-compatible provider request options', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not send temperature to CGU chat completions', async () => {
    let requestBody: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }), text: async () => '' } as Response
    }))

    const provider = new OpenAICompatibleProvider({ provider: 'cgu', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'luna-1' }, 'cgu')
    await provider.complete('prompt')

    expect(requestBody).not.toHaveProperty('temperature')
    expect(requestBody?.max_completion_tokens).toBe(4096)
  })

  it('keeps low temperature for other OpenAI-compatible providers', async () => {
    let requestBody: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }), text: async () => '' } as Response
    }))

    const provider = new OpenAICompatibleProvider({ provider: 'openai', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'gpt-test' })
    await provider.complete('prompt')

    expect(requestBody?.temperature).toBe(0.2)
    expect(requestBody).not.toHaveProperty('max_completion_tokens')
  })
})
