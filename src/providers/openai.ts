import type { LlmProvider, ProviderConfig, ProviderResponse } from './types'
import { classifyProviderError } from './types'
export class OpenAICompatibleProvider implements LlmProvider { name: 'openai' | 'xai' | 'cgu'; constructor(public config: ProviderConfig, name: 'openai' | 'xai' | 'cgu' = 'openai') { this.name = name }
  async complete(prompt: string, system = 'You are a helpful assistant. Return valid JSON only.', signal?: AbortSignal): Promise<ProviderResponse> { const url = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`; const response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) }, body: JSON.stringify({ model: this.config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.2 }) }); if (!response.ok) throw new Error(`${response.status} ${await response.text().catch(() => '')}`); const json = await response.json(); return { text: json.choices?.[0]?.message?.content ?? '', raw: json, usage: json.usage }
  }
  async testConnection(signal?: AbortSignal) { try { await this.complete('Reply with the single word OK.', 'You are a connection test. Reply only OK.', signal); return { ok: true, message: '連線成功，已收到供應商回覆。' } } catch (error) { return { ok: false, message: classifyProviderError(error) } }
  }
}
export const createOpenAIProvider = (config: ProviderConfig) => new OpenAICompatibleProvider(config, 'openai')
