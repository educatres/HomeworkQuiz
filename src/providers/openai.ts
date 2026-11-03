import { requestJson } from './request'
import type { LlmProvider, ModelInfo, ProviderConfig, ProviderResponse } from './types'
import { classifyProviderError } from './types'

function responseText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'value' in value && typeof (value as { value?: unknown }).value === 'string') return (value as { value: string }).value
  return ''
}

function extractResponseText(json: any): string {
  if (typeof json?.output_text === 'string' && json.output_text.trim()) return json.output_text
  if (Array.isArray(json?.output)) {
    return json.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
      .map((part: any) => responseText(part?.text) || responseText(part?.content))
      .filter(Boolean)
      .join('')
  }
  if (Array.isArray(json?.choices?.[0]?.message?.content)) {
    return json.choices[0].message.content.map((part: any) => responseText(part?.text) || responseText(part)).filter(Boolean).join('')
  }
  return responseText(json?.choices?.[0]?.message?.content)
}

async function providerError(response: Response, endpoint: string): Promise<Error> {
  const body = await response.text().catch(() => '')
  let detail = body.trim()
  try {
    const parsed = JSON.parse(body)
    detail = String(parsed?.error?.message ?? parsed?.message ?? detail)
  } catch {
    // Keep the plain response body when the gateway did not return JSON.
  }
  const suffix = detail ? `: ${detail.slice(0, 800)}` : ''
  return new Error(`${endpoint} HTTP ${response.status}${suffix}`)
}

export class OpenAICompatibleProvider implements LlmProvider { name: 'openai' | 'xai' | 'cgu'; constructor(public config: ProviderConfig, name: 'openai' | 'xai' | 'cgu' = 'openai') { this.name = name }
  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> { const url = `${this.config.baseUrl.replace(/\/$/, '')}/models`; const json = await requestJson(url, { method: 'GET', signal, headers: { ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) } }, response => providerError(response, `${this.name === 'cgu' ? 'CGU' : this.name} models`)); const rows = Array.isArray(json) ? json : (json.data ?? json.models ?? []); return rows.map((model: any) => { const id = String(model.id ?? model.name ?? '').replace(/^models\//, ''); return { id, displayName: String(model.displayName ?? id), capabilities: ['text-generation'], source: this.name, created: typeof model.created === 'number' ? model.created : undefined } }).filter((model: ModelInfo) => model.id) }
  async complete(prompt: string, system = 'You are a helpful assistant. Return valid JSON only.', signal?: AbortSignal): Promise<ProviderResponse> { const base = this.config.baseUrl.replace(/\/$/, ''); const headers = { 'Content-Type': 'application/json', ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) }; if (!this.config.model?.trim()) throw new Error(`${this.name} 未設定模型 ID，請先在 AI 設定中測試 Key 並選擇模型。`); if (this.name === 'cgu' && /luna/i.test(this.config.model)) { const json = await requestJson(`${base}/responses`, { method: 'POST', signal, headers, body: JSON.stringify({ model: this.config.model, input: prompt, instructions: system, max_output_tokens: 4096, reasoning: { effort: 'none' } }) }, response => providerError(response, 'CGU responses')); const text = extractResponseText(json); if (!text.trim()) throw new Error('CGU responses 回傳空白內容（可能是模型未產生文字或回應格式不相容）。'); return { text, raw: json, usage: json.usage }
    } const url = `${base}/chat/completions`; const body: Record<string, unknown> = { model: this.config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }; if (this.name === 'cgu') body.max_completion_tokens = 4096; else body.temperature = 0.2; const json = await requestJson(url, { method: 'POST', signal, headers, body: JSON.stringify(body) }, response => providerError(response, `${this.name === 'cgu' ? 'CGU' : this.name} chat/completions`)); const text = extractResponseText(json); if (!text.trim()) throw new Error(`${this.name} chat/completions 回傳空白內容。`); return { text, raw: json, usage: json.usage }
  }
  async testConnection(signal?: AbortSignal) {
    try {
      await this.complete('Reply with the single word OK.', 'Reply only OK.', signal)
      return { ok: true, message: '連線成功，已收到模型回覆。' }
    } catch (error) {
      return { ok: false, message: classifyProviderError(error) }
    }
  }
}
export const createOpenAIProvider = (config: ProviderConfig) => new OpenAICompatibleProvider(config, 'openai')
