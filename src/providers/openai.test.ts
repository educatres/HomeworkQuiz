import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleProvider } from './openai'

describe('OpenAI-compatible provider request options', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('tests the selected model with a completion request', async () => {
    let requestUrl = ''
    let requestBody: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input)
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'OK' } }] }), text: async () => '' } as Response
    }))

    const provider = new OpenAICompatibleProvider({ provider: 'cgu', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'gpt-oss:20b' }, 'cgu')
    await expect(provider.testConnection()).resolves.toMatchObject({ ok: true })

    expect(requestUrl).toBe('https://example.test/v1/chat/completions')
    expect(requestBody?.model).toBe('gpt-oss:20b')
  })

  it('does not send temperature to CGU chat completions', async () => {
    let requestBody: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }), text: async () => '' } as Response
    }))

    const provider = new OpenAICompatibleProvider({ provider: 'cgu', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'gpt-oss-test' }, 'cgu')
    await provider.complete('prompt')

    expect(requestBody).not.toHaveProperty('temperature')
    expect(requestBody?.max_completion_tokens).toBe(4096)
  })

  it('uses the CGU responses format for Luna models', async () => {
    let requestUrl = ''
    let requestBody: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input)
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] }), text: async () => '' } as Response
    }))

    const provider = new OpenAICompatibleProvider({ provider: 'cgu', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'luna-1' }, 'cgu')
    await provider.complete('prompt')

    expect(requestUrl).toBe('https://example.test/v1/responses')
    expect(requestBody?.max_output_tokens).toBe(4096)
    expect(requestBody?.reasoning).toEqual({ effort: 'none' })
    expect(requestBody).not.toHaveProperty('temperature')
  })

  it('reports the gateway error body instead of hiding it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'model is unavailable' } }) })) as unknown as Response)

    const provider = new OpenAICompatibleProvider({ provider: 'cgu', apiKey: 'test-key', baseUrl: 'https://example.test/v1', model: 'gpt-oss-test' }, 'cgu')
    await expect(provider.complete('prompt')).rejects.toThrow('CGU chat/completions HTTP 400: model is unavailable')
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
