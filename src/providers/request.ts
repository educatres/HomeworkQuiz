const REQUEST_TIMEOUT_MS = 240_000
let activeRequests = 0
const listeners = new Set<() => void>()

export function subscribeToApiRequests(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function hasActiveApiRequests() {
  return activeRequests > 0
}

export async function requestJson(
  url: string,
  options: RequestInit,
  responseError: (response: Response) => Promise<Error>,
) {
  const controller = new AbortController()
  const callerSignal = options.signal
  callerSignal?.throwIfAborted()

  const cancel = () => controller.abort(callerSignal?.reason)
  callerSignal?.addEventListener('abort', cancel, { once: true })
  const timeoutError = new Error('API 請求逾時（240 秒），請重試。')
  const timer = setTimeout(() => controller.abort(timeoutError), REQUEST_TIMEOUT_MS)

  activeRequests++
  listeners.forEach(listener => listener())
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw await responseError(response)
    return await response.json()
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason
    throw error
  } finally {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', cancel)
    activeRequests--
    listeners.forEach(listener => listener())
  }
}
