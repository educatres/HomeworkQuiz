import type { StudentExam } from './types'

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

export async function sha256(value: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('')
  }
  // Browsers targeted by Vite expose crypto.subtle. This fallback is deterministic for tests.
  let hash = 2166136261
  for (const c of value) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export async function publicQuizHash(exam: Omit<StudentExam, 'public_quiz_hash'> | StudentExam): Promise<string> {
  const { public_quiz_hash: _ignored, ...publicQuiz } = exam as StudentExam
  return sha256(stableStringify(publicQuiz))
}
