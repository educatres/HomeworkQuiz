import type { BatchPlan } from '../domain/types'
export type AppProvider = 'mock' | 'openai' | 'google' | 'xai' | 'cgu'
export interface AppSettings { provider: AppProvider; model: string; base_url: string; language: 'zh-TW' | 'en'; concurrency: number; rememberKey: boolean; theme: 'light' | 'dark' }
export const SETTINGS_KEY = 'aihwq.settings.v1'; export const KEYS_KEY = 'meetingtutor.api-keys.v1'; export const MODEL_CONFIG_KEY = 'meetingtutor.model-config.v1'; export const ACTIVE_BATCH_KEY = 'aihwq.activeBatch.v1'
export const DEFAULT_BASE_URLS: Record<AppProvider, string> = { mock: '', openai: 'https://api.openai.com/v1', google: 'https://generativelanguage.googleapis.com/v1beta', xai: 'https://api.x.ai/v1', cgu: 'https://air.cgu.edu.tw/cgullmapi/v1' }
export const DEFAULT_SETTINGS: AppSettings = { provider: 'mock', model: 'gpt-4o-mini', base_url: '', language: 'zh-TW', concurrency: 2, rememberKey: true, theme: 'light' }
function read<T>(key: string, fallback: T): T { try { const value = globalThis.localStorage?.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function write(key: string, value: unknown) { try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); return true } catch { return false } }
export const loadSettings = () => {
  const saved = read<Partial<AppSettings>>(SETTINGS_KEY, {})
  const modelConfig = read<{ id?: AppProvider; baseUrl?: string; modelId?: string }>(MODEL_CONFIG_KEY, {})
  const candidate = modelConfig.id ?? saved.provider
  const provider = candidate === 'openai' || candidate === 'google' || candidate === 'xai' || candidate === 'cgu' || candidate === 'mock' ? candidate : DEFAULT_SETTINGS.provider
  return { ...DEFAULT_SETTINGS, ...saved, provider, ...(modelConfig.baseUrl ? { base_url: modelConfig.baseUrl } : {}), ...(modelConfig.modelId ? { model: modelConfig.modelId } : {}) }
}
export const saveSettings = (settings: AppSettings) => write(SETTINGS_KEY, settings)
export const saveModelConfig = (settings: AppSettings) => write(MODEL_CONFIG_KEY, { id: settings.provider, baseUrl: settings.base_url, modelId: settings.model })
export const loadKeys = () => {
  const saved = read<Record<string, string>>(KEYS_KEY, {})
  // Keep keys entered by an earlier HomeworkQuiz build available after the storage migration.
  const legacy = read<Record<string, string>>('aihwq.keys.v1', {})
  const merged = { ...legacy, ...saved }
  if (!merged.google && merged.gemini) merged.google = merged.gemini
  return merged
}
export const saveKeys = (keys: Record<string, string>) => write(KEYS_KEY, keys)
export const clearKeys = () => { try { globalThis.localStorage?.removeItem(KEYS_KEY) } catch { /* storage can be unavailable */ } }
export const setActiveBatch = (batchId: string) => write(ACTIVE_BATCH_KEY, batchId)
export const getActiveBatch = () => read<string | null>(ACTIVE_BATCH_KEY, null)
export const planFromSettings = (plan: BatchPlan) => write('aihwq.plan.v1', plan)
