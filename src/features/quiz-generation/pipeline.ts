import { publicQuizHash } from '../../domain/canonical'
import { validateStudentExam } from '../../domain/validation'
import type { BatchPlan, Difficulty, Level, PublicQuestion, QuestionType, RubricCriterion, SourceDocument, SourceRef, TeacherAnswerKey } from '../../domain/types'
import type { LlmProvider } from '../../providers/types'
import { buildQuestionPrompt, buildQuestionRepairPrompt, SYSTEM_PROMPT } from './prompts'
import { makeQuotas } from './plan'
import { detectPromptInjectionInSource } from '../../domain/promptSecurity'

const QUESTION_TYPES: QuestionType[] = ['single_choice', 'multiple_choice', 'short_answer']
const LEVELS: Level[] = ['comprehension', 'reasoning', 'design_tradeoff']
const DIFFICULTIES: Difficulty[] = ['basic', 'intermediate', 'advanced']
const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)

function parseJson(text: string): Record<string, any> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('AI 回應不是可解析的 JSON')
    try { parsed = JSON.parse(cleaned.slice(start, end + 1)) } catch { throw new Error('AI 回應不是可解析的 JSON') }
  }
  if (!isRecord(parsed)) throw new Error('AI 回應不是 JSON 物件')
  return parsed
}

function sourceRefsOf(value: unknown, validBlockIds: Set<string>, index: number): SourceRef[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`第 ${index + 1} 題缺少 source_refs`)
  return value.map((ref: any) => {
    if (!isRecord(ref) || typeof ref.block_id !== 'string' || !validBlockIds.has(ref.block_id)) throw new Error(`第 ${index + 1} 題 source_refs 指向不存在的 block_id`)
    for (const field of ['page', 'line_start', 'line_end']) {
      if (field in ref && typeof ref[field] !== 'number') throw new Error(`第 ${index + 1} 題 source_refs.${field} 必須是 number`)
    }
    if ('pageNumber' in ref || 'lineStart' in ref || 'lineEnd' in ref) throw new Error(`第 ${index + 1} 題 source_refs 使用非標準欄位 pageNumber/lineStart/lineEnd，請改用 page/line_start/line_end`)
    return {
      block_id: ref.block_id,
      ...(typeof ref.page === 'number' ? { page: ref.page } : {}),
      ...(typeof ref.line_start === 'number' ? { line_start: ref.line_start } : {}),
      ...(typeof ref.line_end === 'number' ? { line_end: ref.line_end } : {}),
    }
  })
}

function validateGeneratedItem(raw: unknown, expectedType: QuestionType, expectedLevel: Level, validBlockIds: Set<string>, index: number) {
  if (!isRecord(raw)) throw new Error(`第 ${index + 1} 題不是物件`)
  if (typeof raw.question_id !== 'string' || !/^Q\d{2,}$/.test(raw.question_id)) throw new Error(`第 ${index + 1} 題 question_id 格式錯誤`)
  if (raw.type !== expectedType || !QUESTION_TYPES.includes(raw.type)) throw new Error(`第 ${index + 1} 題 type 不符合本批次題型`)
  if (raw.level !== expectedLevel || !LEVELS.includes(raw.level)) throw new Error(`第 ${index + 1} 題 level 不符合本批次層次`)
  if (!DIFFICULTIES.includes(raw.difficulty)) throw new Error(`第 ${index + 1} 題 difficulty 無效`)
  if (typeof raw.question !== 'string' || raw.question.trim().length < 8) throw new Error(`第 ${index + 1} 題題幹過短`)
  if (typeof raw.concept !== 'string' || !raw.concept.trim() || typeof raw.explanation !== 'string' || !raw.explanation.trim()) throw new Error(`第 ${index + 1} 題缺少 concept 或 explanation`)
  const source_refs = sourceRefsOf(raw.source_refs, validBlockIds, index)
  if (expectedType === 'short_answer') {
    if ('options' in raw && raw.options !== undefined) throw new Error(`第 ${index + 1} 題 short_answer 不得有 options`)
    if (typeof raw.answer !== 'string' || !raw.answer.trim()) throw new Error(`第 ${index + 1} 題 answer 無效`)
    if (!Array.isArray(raw.rubric) || raw.rubric.length === 0) throw new Error(`第 ${index + 1} 題缺少 rubric`)
    raw.rubric.forEach((criterion: any) => {
      if (!isRecord(criterion) || typeof criterion.id !== 'string' || typeof criterion.description !== 'string' || typeof criterion.weight !== 'number' || criterion.weight <= 0 || !Array.isArray(criterion.acceptable_alternatives) || !Array.isArray(criterion.common_mistakes)) throw new Error(`第 ${index + 1} 題 rubric 格式錯誤`)
    })
  } else {
    if (!Array.isArray(raw.options) || raw.options.length !== 4) throw new Error(`第 ${index + 1} 題必須恰好有四個 options`)
    const ids = raw.options.map((option: any) => option?.id)
    if (ids.some((id: unknown) => !['A', 'B', 'C', 'D'].includes(String(id))) || new Set(ids).size !== 4 || raw.options.some((option: any) => typeof option?.text !== 'string' || !option.text.trim())) throw new Error(`第 ${index + 1} 題 options 必須是 A/B/C/D 且都有文字`)
    const answerIds = Array.isArray(raw.answer) ? raw.answer : [raw.answer]
    if ((expectedType === 'single_choice' && (typeof raw.answer !== 'string' || answerIds.length !== 1)) || (expectedType === 'multiple_choice' && (!Array.isArray(raw.answer) || answerIds.length === 0)) || answerIds.some((id: unknown) => !ids.includes(id))) throw new Error(`第 ${index + 1} 題 answer 必須指向 options`)
  }
  return { raw, source_refs }
}

function validateQuestionResponse(text: string, expectedType: QuestionType, expectedLevel: Level, count: number, validBlockIds: Set<string>) {
  const data = parseJson(text)
  if (!Array.isArray(data.questions) || data.questions.length !== count) throw new Error(`AI 回應題數不符：要求 ${count} 題，收到 ${Array.isArray(data.questions) ? data.questions.length : 0} 題`)
  const validated = data.questions.map((item: unknown, index: number) => validateGeneratedItem(item, expectedType, expectedLevel, validBlockIds, index))
  return { data, validated }
}

async function completeValidatedQuestions(source: SourceDocument, plan: BatchPlan, provider: LlmProvider, questionType: QuestionType, level: Level, count: number, existing: string[], retryHint: string) {
  const validBlockIds = new Set(source.blocks.map(block => block.block_id))
  const firstResponse = await provider.complete(buildQuestionPrompt(plan, questionType, level, count, source.blocks, existing, retryHint), SYSTEM_PROMPT)
  let repairPrompt: string
  try {
    return validateQuestionResponse(firstResponse.text, questionType, level, count, validBlockIds)
  } catch (error) {
    repairPrompt = buildQuestionRepairPrompt(plan, questionType, level, count, source.blocks, firstResponse.text, (error as Error).message, existing)
  }

  const repairResponse = await provider.complete(repairPrompt, SYSTEM_PROMPT)
  let retryPrompt: string
  try {
    return validateQuestionResponse(repairResponse.text, questionType, level, count, validBlockIds)
  } catch (error) {
    retryPrompt = buildQuestionPrompt(plan, questionType, level, count, source.blocks, existing, (error as Error).message)
  }

  const retryResponse = await provider.complete(retryPrompt, SYSTEM_PROMPT)
  return validateQuestionResponse(retryResponse.text, questionType, level, count, validBlockIds)
}

export async function classifyAssignment(source: SourceDocument, provider: LlmProvider) {
  const response = await provider.complete(`請輸出 JSON：{"category":"","content_type":"","summary":"","insufficient_content":false,"reason":""}\n來源：${source.blocks.slice(0, 8).map(b => `[${b.block_id}] ${b.text}`).join('\n')}`, SYSTEM_PROMPT)
  return parseJson(response.text)
}

export async function generateQuestionsByPlan(source: SourceDocument, plan: BatchPlan, provider: LlmProvider, onProgress?: (completed: number, total: number) => void, retryHint = ''): Promise<{ questions: PublicQuestion[]; keys: Omit<TeacherAnswerKey, 'schema_version' | 'batch_id' | 'student_id' | 'quiz_id' | 'exam_version' | 'public_quiz_hash' | 'source_sha256'>['questions'] }> {
  const quotas = makeQuotas(plan)
  const questions: PublicQuestion[] = []
  const keys: TeacherAnswerKey['questions'] = []
  for (const [type, count] of Object.entries(quotas.types)) {
    if (!count) continue
    const questionType = type as QuestionType
    const level = Object.entries(quotas.levels).sort((a, b) => b[1] - a[1])[0][0] as Level
    const { validated } = await completeValidatedQuestions(source, plan, provider, questionType, level, count, questions.map(q => q.question), retryHint)
    validated.forEach(({ raw, source_refs }) => {
      const questionId = `Q${String(questions.length + 1).padStart(2, '0')}`
      const options = questionType === 'short_answer' ? undefined : raw.options.map((option: any) => ({ id: String(option.id), text: String(option.text) }))
      questions.push({ question_id: questionId, type: questionType, level, difficulty: raw.difficulty as Difficulty, question: raw.question, options, points: 1 })
      keys.push({ question_id: questionId, answer: raw.answer, explanation: raw.explanation, concept: raw.concept, source_refs, rubric: questionType === 'short_answer' ? raw.rubric as RubricCriterion[] : undefined, review_status: 'draft' })
    })
    onProgress?.(questions.length, plan.question_count)
  }
  return { questions, keys }
}

export async function generateExamWithProvider(source: SourceDocument, plan: BatchPlan, studentId: string, provider: LlmProvider, onProgress?: (completed: number, total: number) => void, retryHint = '') {
  const generated = await generateQuestionsByPlan(source, plan, provider, onProgress, retryHint)
  if (generated.questions.length !== plan.question_count) throw new Error(`AI 只產生 ${generated.questions.length}/${plan.question_count} 題，請重試或人工補題。`)
  const points = 100 / generated.questions.length
  const publicBase = { schema_version: '1.0' as const, batch_id: plan.batch_id, student_id: studentId, quiz_id: `${plan.batch_id}-${studentId}-${Date.now().toString(36)}`, exam_version: 1, course_title: plan.course_title, assignment_title: plan.assignment_title, language: plan.language, total_points: plan.total_points, questions: generated.questions.map((q, i) => ({ ...q, points: i === generated.questions.length - 1 ? plan.total_points - points * (generated.questions.length - 1) : points })) }
  const hash = await publicQuizHash(publicBase)
  const exam = { ...publicBase, public_quiz_hash: hash }
  const validation = validateStudentExam(exam)
  if (!validation.valid) throw new Error(`生成試卷驗證失敗：${validation.errors.join('、')}`)
  return { exam, key: { schema_version: '1.0' as const, batch_id: plan.batch_id, student_id: studentId, quiz_id: exam.quiz_id, exam_version: 1, public_quiz_hash: hash, questions: generated.keys, source_sha256: source.source_sha256, prompt_injection_alerts: detectPromptInjectionInSource(source.blocks) } }
}
