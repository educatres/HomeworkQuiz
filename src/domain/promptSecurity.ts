import type { SourceBlock, StudentSubmission } from './types'

export type PromptInjectionStage = 'source' | 'submission'
export type PromptInjectionSeverity = 'medium' | 'high'

export interface PromptInjectionAlert {
  id: string
  stage: PromptInjectionStage
  severity: PromptInjectionSeverity
  category: string
  message: string
  location?: string
  evidence: string
}

type DetectionRule = {
  id: string
  category: string
  severity: PromptInjectionSeverity
  message: string
  pattern: RegExp
}

const RULES: DetectionRule[] = [
  { id: 'override', category: '規則覆寫', severity: 'high', message: '內容嘗試要求 AI 忽略或覆寫原本規則。', pattern: /(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+|the\s+)?(?:previous|above|prior|system|developer)\s+(?:instructions?|rules?|messages?)|忽略(?:前面|以上|先前|所有)?(?:的)?(?:指示|規則|提示詞|訊息)|不要遵守(?:前面|以上|原本)?(?:的)?(?:規則|指示)/iu },
  { id: 'question-manipulation', category: '命題操控', severity: 'high', message: '內容嘗試操控題數、難度或命題方向。', pattern: /(?:make|give|generate|create)\s+(?:the\s+)?(?:questions?|quiz)\s+(?:very\s+)?(?:easy|simple)|(?:出|產生|設計|給我).{0,16}(?:簡單|容易|不用思考).{0,12}(?:題|問題|測驗)|改成(?:簡單|容易)(?:的)?(?:題目|問題)/iu },
  { id: 'grading-manipulation', category: '評分操控', severity: 'high', message: '內容嘗試要求改分、給滿分或改變評分規則。', pattern: /(?:change|increase|raise|lower|alter)\s+(?:the\s+)?(?:score|grade|points?|rubric)|(?:給|改|提高|降低|調整).{0,12}(?:滿分|分數|評分|配分|rubric)|(?:full\s+credit|give\s+me\s+full\s+marks|直接給分)/iu },
  { id: 'secret-disclosure', category: '機密洩漏', severity: 'high', message: '內容嘗試要求洩漏答案、評分規準、提示詞或金鑰。', pattern: /(?:reveal|show|leak|provide)\s+(?:the\s+)?(?:answer|correct answer|rubric|system prompt|api key|secret)|(?:洩漏|透露|顯示|提供|列出).{0,16}(?:答案|正解|評分規準|rubric|系統提示|API\s*Key|金鑰)/iu },
  { id: 'role-play', category: '角色偽裝', severity: 'medium', message: '內容嘗試偽裝成系統、教師或開發者訊息。', pattern: /(?:you\s+are\s+now|act\s+as|role\s*play|system\s*message|developer\s*message)|(?:你現在是|請扮演|系統訊息|開發者訊息|教師指令)/iu },
  { id: 'output-manipulation', category: '輸出操控', severity: 'medium', message: '內容嘗試改變模型輸出格式或要求忽略檢查。', pattern: /(?:return|output|respond)\s+(?:only|just)\s+(?:the\s+)?(?:answer|json|easy\s+questions?)|(?:只要|只需|請).{0,12}(?:輸出|回傳).{0,16}(?:答案|簡單題|不要檢查|不要驗證)/iu },
]

function evidenceOf(text: string, index: number) {
  const start = Math.max(0, index - 70)
  return text.slice(start, Math.min(text.length, index + 180)).replace(/\s+/g, ' ').trim()
}

export function detectPromptInjection(text: string, stage: PromptInjectionStage, location?: string): PromptInjectionAlert[] {
  if (!text.trim()) return []
  const alerts: PromptInjectionAlert[] = []
  for (const rule of RULES) {
    const match = rule.pattern.exec(text)
    if (!match || match.index < 0) continue
    alerts.push({ id: `${stage}:${rule.id}:${location ?? 'document'}`, stage, severity: rule.severity, category: rule.category, message: rule.message, location, evidence: evidenceOf(text, match.index) })
  }
  return alerts
}

export function detectPromptInjectionInSource(blocks: SourceBlock[]): PromptInjectionAlert[] {
  return blocks.flatMap(block => detectPromptInjection(block.text, 'source', block.block_id))
}

export function detectPromptInjectionInSubmission(submission: StudentSubmission): PromptInjectionAlert[] {
  return submission.answers.flatMap(answer => {
    const value = Array.isArray(answer.value) ? answer.value.map(item => String(item)).join(' ') : String(answer.value ?? '')
    return detectPromptInjection(value, 'submission', answer.question_id)
  })
}

export function mergePromptInjectionAlerts(...groups: (PromptInjectionAlert[] | undefined)[]): PromptInjectionAlert[] {
  const seen = new Set<string>()
  return groups.flatMap(group => group ?? []).filter(isPromptInjectionAlert).filter(alert => !seen.has(alert.id) && seen.add(alert.id))
}

function isPromptInjectionAlert(value: unknown): value is PromptInjectionAlert {
  if (!value || typeof value !== 'object') return false
  const alert = value as Record<string, unknown>
  return typeof alert.id === 'string' && (alert.stage === 'source' || alert.stage === 'submission') && (alert.severity === 'medium' || alert.severity === 'high') && typeof alert.category === 'string' && typeof alert.message === 'string' && typeof alert.evidence === 'string'
}
