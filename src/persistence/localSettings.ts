import type { BatchPlan } from '../domain/types'
export interface AppSettings { provider: 'mock' | 'openai' | 'gemini' | 'xai' | 'cgu'; model: string; base_url: string; language: 'zh-TW' | 'en'; concurrency: number; rememberKey: boolean; theme: 'light' | 'dark' }
export const SETTINGS_KEY = 'aihwq.settings.v1'; export const KEYS_KEY = 'aihwq.keys.v1'; export const ACTIVE_BATCH_KEY = 'aihwq.activeBatch.v1'
export const DEFAULT_BASE_URLS: Record<AppSettings['provider'], string> = { mock: '', openai: 'https://api.openai.com/v1', gemini: 'https://generativelanguage.googleapis.com/v1beta', xai: 'https://api.x.ai/v1', cgu: 'https://air.cgu.edu.tw/cgullmapi/v1' }
export const DEFAULT_SETTINGS: AppSettings = { provider: 'mock', model: 'gpt-4o-mini', base_url: 'https://air.cgu.edu.tw/cgullmapi/v1', language: 'zh-TW', concurrency: 2, rememberKey: false, theme: 'light' }
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false } }
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(SETTINGS_KEY, {}) })
export const saveSettings = (settings: AppSettings) => write(SETTINGS_KEY, settings)
export const loadKeys = () => read<Record<string, string>>(KEYS_KEY, {})
export const saveKeys = (keys: Record<string, string>) => write(KEYS_KEY, keys)
export const setActiveBatch = (batchId: string) => write(ACTIVE_BATCH_KEY, batchId)
export const getActiveBatch = () => read<string | null>(ACTIVE_BATCH_KEY, null)
export const planFromSettings = (plan: BatchPlan) => write('aihwq.plan.v1', plan)
