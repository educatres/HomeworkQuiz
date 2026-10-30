import type { ProviderConfig } from './types'
import { OpenAICompatibleProvider } from './openai'
import { GeminiProvider } from './gemini'
export function providerFor(config: ProviderConfig) { return config.provider === 'google' || config.provider === 'gemini' ? new GeminiProvider(config) : new OpenAICompatibleProvider(config, config.provider === 'xai' ? 'xai' : config.provider === 'cgu' ? 'cgu' : 'openai') }
export async function testProvider(config: ProviderConfig, signal?: AbortSignal) { return providerFor(config).testConnection(signal) }
