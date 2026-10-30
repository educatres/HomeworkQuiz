export type JobStatus = 'queued' | 'running' | 'completed' | 'retryable_failed' | 'fatal_failed' | 'cancelled'
export interface QueueJob<T = unknown> { id: string; status: JobStatus; attempts: number; result?: T; error?: string }
export async function runQueue<T>(jobs: QueueJob<T>[], worker: (job: QueueJob<T>, signal: AbortSignal) => Promise<T>, concurrency = 2, signal?: AbortSignal, onUpdate?: (jobs: QueueJob<T>[]) => void) {
  const controller = new AbortController(); signal?.addEventListener('abort', () => controller.abort()); let cursor = 0
  async function runOne() { while (cursor < jobs.length && !controller.signal.aborted) { const job = jobs[cursor++]; job.status = 'running'; job.attempts++; onUpdate?.(jobs); try { job.result = await worker(job, controller.signal); job.status = 'completed' } catch (error) { job.error = error instanceof Error ? error.message : String(error); if (job.attempts < 3) { job.status = 'retryable_failed'; jobs.push(job) } else job.status = 'fatal_failed' } onUpdate?.(jobs) } }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, concurrency)) }, runOne)); return jobs
}
