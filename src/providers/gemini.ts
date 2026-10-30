import type { LlmProvider, ProviderConfig, ProviderResponse } from './types'
import { classifyProviderError } from './types'
export class GeminiProvider implements LlmProvider { name: 'gemini' = 'gemini'; constructor(public config: ProviderConfig) {}
  async complete(prompt: string, system = '', signal?: AbortSignal): Promise<ProviderResponse> { const url = `${this.config.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(this.config.apiKey ?? '')}`; const response = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents: [{ role: 'user', parts: [{ text: prompt }] }] }) }); if (!response.ok) throw new Error(`${response.status} ${await response.text().catch(() => '')}`); const json = await response.json(); return { text: json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '', raw: json, usage: json.usageMetadata }
  }
  async testConnection(signal?: AbortSignal) { try { await this.complete('Reply with the single word OK.', 'Reply only OK.', signal); return { ok: true, message: '連線成功，已收到 Gemini 回覆。' } } catch (error) { return { ok: false, message: classifyProviderError(error) } }
  }
}
