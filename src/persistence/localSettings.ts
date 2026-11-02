import { DEFAULT_PLAN, type BatchPlan } from '../domain/types'
import { CGU_DEFAULT_MODEL } from '../providers/cguModels'
export type AppProvider = 'mock' | 'openai' | 'google' | 'xai' | 'cgu'
export interface AppSettings { provider: AppProvider; model: string; base_url: string; language: 'zh-TW' | 'en'; concurrency: number; rememberKey: boolean; theme: 'light' | 'dark' }
export const GOOGLE_DEFAULT_MODEL = 'gemini-flash-lite-latest'
export const SETTINGS_KEY = 'aihwq.settings.v1'; export const KEYS_KEY = 'meetingtutor.api-keys.v1'; export const MODEL_CONFIG_KEY = 'meetingtutor.model-config.v1'; export const ACTIVE_BATCH_KEY = 'aihwq.activeBatch.v1'; export const PLAN_KEY = 'aihwq.plan.v1'
export const DEFAULT_BASE_URLS: Record<AppProvider, string> = { mock: '', openai: 'https://api.openai.com/v1', google: 'https://generativelanguage.googleapis.com/v1beta', xai: 'https://api.x.ai/v1', cgu: 'https://air.cgu.edu.tw/cgullmapi/v1' }
export const DEFAULT_SETTINGS: AppSettings = { provider: 'google', model: GOOGLE_DEFAULT_MODEL, base_url: DEFAULT_BASE_URLS.google, language: 'zh-TW', concurrency: 2, rememberKey: true, theme: 'light' }
function read<T>(key: string, fallback: T): T { try { const value = globalThis.localStorage?.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function write(key: string, value: unknown) { try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); return true } catch { return false } }
export const loadSettings = () => {
  const saved = read<Partial<AppSettings>>(SETTINGS_KEY, {})
  const modelConfig = read<{ id?: AppProvider; baseUrl?: string; modelId?: string }>(MODEL_CONFIG_KEY, {})
  const candidate = modelConfig.id ?? saved.provider
  if (candidate === 'openai' || candidate === 'xai') return { ...DEFAULT_SETTINGS, ...saved, provider: DEFAULT_SETTINGS.provider, model: GOOGLE_DEFAULT_MODEL, base_url: DEFAULT_BASE_URLS.google }
  const provider = candidate === 'google' || candidate === 'cgu' || candidate === 'mock' ? candidate : DEFAULT_SETTINGS.provider
  const model = modelConfig.modelId ?? saved.model ?? DEFAULT_SETTINGS.model
  const googleModel = modelConfig.modelId?.trim() || saved.model?.trim() || GOOGLE_DEFAULT_MODEL
  return { ...DEFAULT_SETTINGS, ...saved, provider, model: provider === 'cgu' ? CGU_DEFAULT_MODEL : provider === 'google' ? googleModel : model, base_url: modelConfig.baseUrl ?? saved.base_url ?? DEFAULT_BASE_URLS[provider] }
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
function numeric(value: unknown, fallback: number, min = 0) { return typeof value === 'number' && Number.isFinite(value) && value >= min ? value : fallback }
function weights<T extends Record<string, number>>(defaults: T, value: unknown): T { const candidate = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; return Object.fromEntries(Object.keys(defaults).map(key => [key, numeric(candidate[key], defaults[key])])) as T }
export const loadPlan = (): BatchPlan => {
  const saved = read<Partial<BatchPlan>>(PLAN_KEY, {})
  return { ...DEFAULT_PLAN, ...saved, batch_id: typeof saved.batch_id === 'string' && saved.batch_id.trim() ? saved.batch_id : DEFAULT_PLAN.batch_id, course_title: typeof saved.course_title === 'string' ? saved.course_title : DEFAULT_PLAN.course_title, assignment_title: typeof saved.assignment_title === 'string' ? saved.assignment_title : DEFAULT_PLAN.assignment_title, language: saved.language === 'en' ? 'en' : 'zh-TW', question_count: Math.min(100, Math.max(1, Math.round(numeric(saved.question_count, DEFAULT_PLAN.question_count, 1)))), total_points: numeric(saved.total_points, DEFAULT_PLAN.total_points, 1), teacher_guidance: typeof saved.teacher_guidance === 'string' ? saved.teacher_guidance : DEFAULT_PLAN.teacher_guidance, type_weights: weights(DEFAULT_PLAN.type_weights, saved.type_weights), level_weights: weights(DEFAULT_PLAN.level_weights, saved.level_weights), difficulty_weights: weights(DEFAULT_PLAN.difficulty_weights, saved.difficulty_weights) }
}
export const savePlan = (plan: BatchPlan) => write(PLAN_KEY, plan)
export const clearPlan = () => { try { globalThis.localStorage?.removeItem(PLAN_KEY) } catch { /* storage can be unavailable */ } }
export const setActiveBatch = (batchId: string) => write(ACTIVE_BATCH_KEY, batchId)
export const getActiveBatch = () => read<string | null>(ACTIVE_BATCH_KEY, null)
export const planFromSettings = savePlan
