import { afterEach, expect, it, vi } from 'vitest'
import { hasActiveApiRequests, requestJson } from './request'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('keeps the notice active while reading a response and aborts after 360 seconds', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async (_url, { signal }: RequestInit) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    }),
  })))

  const request = requestJson('https://example.test', {}, async () => new Error('HTTP error'))
  const rejection = expect(request).rejects.toThrow('360')
  await vi.advanceTimersByTimeAsync(359_999)
  expect(hasActiveApiRequests()).toBe(true)
  await vi.advanceTimersByTimeAsync(1)
  await rejection
  expect(hasActiveApiRequests()).toBe(false)
})
