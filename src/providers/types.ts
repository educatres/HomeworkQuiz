import type { BatchPlan, SourceDocument, StudentExam, TeacherAnswerKey } from '../domain/types'
export type ProviderName = 'openai' | 'google' | 'gemini' | 'xai' | 'cgu' | 'mock'
export interface ProviderConfig { provider: ProviderName; apiKey?: string; baseUrl: string; model: string }
export interface ProviderResponse { text: string; raw?: unknown; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }
export interface ModelInfo { id: string; displayName: string; capabilities: string[]; source: ProviderName; created?: number }
export interface LlmProvider { name: ProviderName; testConnection(signal?: AbortSignal): Promise<{ ok: boolean; message: string }>; listModels?(signal?: AbortSignal): Promise<ModelInfo[]>; complete(prompt: string, system?: string, signal?: AbortSignal): Promise<ProviderResponse> }
export interface GenerationService { generate(source: SourceDocument, plan: BatchPlan, studentId: string, provider: LlmProvider): Promise<{ exam: StudentExam; key: TeacherAnswerKey }> }
export function classifyProviderError(error: unknown): string { const message = error instanceof Error ? error.message : String(error); if (/cors|failed to fetch|network/i.test(message)) return '瀏覽器無法直連此供應商（可能是 CORS）；請確認 provider 的瀏覽器政策或改用教師自有 proxy。'; if (/401|403|api key|unauthorized/i.test(message)) return 'API 金鑰無效或沒有權限。'; if (/429|quota/i.test(message)) return '已達速率或配額限制，請稍後重試。'; if (/timeout|abort/i.test(message)) return '請求逾時。'; return message }
