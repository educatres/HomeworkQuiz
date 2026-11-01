import { OpenAICompatibleProvider } from './openai'
import type { ProviderConfig } from './types'
export { CGU_ALLOWED_MODELS, CGU_DEFAULT_MODEL, CGU_MODEL_OPTIONS } from './cguModels'
export const CGU_DEFAULT_BASE_URL = 'https://air.cgu.edu.tw/cgullmapi/v1'
export const createCGUProvider = (config: Omit<ProviderConfig, 'baseUrl'> & { baseUrl?: string }) => new OpenAICompatibleProvider({ ...config, baseUrl: config.baseUrl || CGU_DEFAULT_BASE_URL }, 'cgu')
