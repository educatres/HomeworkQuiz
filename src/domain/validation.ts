import type { PublicQuestion, StudentExam, StudentSubmission, TeacherAnswerKey } from './types'

export interface ValidationResult { valid: boolean; errors: string[] }
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T => typeof v === 'string' && values.includes(v as T)

export function validatePublicQuestion(q: unknown, index = 0): string[] {
  const e: string[] = []; if (!isRecord(q)) return [`第 ${index + 1} 題不是物件`]
  if (typeof q.question_id !== 'string' || !q.question_id) e.push('缺少 question_id')
  if (!oneOf(q.type, ['single_choice', 'multiple_choice', 'short_answer'])) e.push(`第 ${index + 1} 題題型無效`)
  if (!oneOf(q.level, ['comprehension', 'reasoning', 'design_tradeoff'])) e.push('層次無效')
  if (typeof q.question !== 'string' || !q.question.trim()) e.push('題幹不可為空')
  if (typeof q.points !== 'number' || q.points <= 0) e.push('配分必須為正數')
  if (q.type !== 'short_answer') {
    if (!Array.isArray(q.options) || q.options.length < 4) e.push('選擇題至少需要四個選項')
    const ids = Array.isArray(q.options) ? q.options.map((x: any) => x?.id) : []
    if (new Set(ids).size !== ids.length) e.push('選項 ID 不可重複')
  }
  return e
}

export function validateStudentExam(exam: unknown): ValidationResult {
  const errors: string[] = []; if (!isRecord(exam)) return { valid: false, errors: ['試卷必須是 JSON 物件'] }
  for (const key of ['schema_version', 'batch_id', 'student_id', 'quiz_id', 'public_quiz_hash', 'course_title', 'assignment_title']) if (typeof exam[key] !== 'string' || !exam[key]) errors.push(`缺少 ${key}`)
  if (exam.schema_version !== '1.0') errors.push('不支援的 schema_version')
  if (typeof exam.exam_version !== 'number' || exam.exam_version < 1) errors.push('exam_version 無效')
  if (!Array.isArray(exam.questions) || exam.questions.length === 0) errors.push('試卷沒有題目')
  const ids = new Set<string>(); (Array.isArray(exam.questions) ? exam.questions : []).forEach((q, i) => { errors.push(...validatePublicQuestion(q, i)); const id = (q as any)?.question_id; if (id && ids.has(id)) errors.push(`重複 question_id: ${id}`); if (id) ids.add(id) })
  if (typeof exam.total_points !== 'number' || exam.total_points <= 0) errors.push('total_points 無效')
  return { valid: errors.length === 0, errors }
}

export function validateTeacherKey(key: unknown, exam?: StudentExam): ValidationResult {
  const errors: string[] = []; if (!isRecord(key)) return { valid: false, errors: ['答案包必須是 JSON 物件'] }
  for (const k of ['schema_version', 'batch_id', 'student_id', 'quiz_id', 'public_quiz_hash', 'source_sha256']) if (typeof key[k] !== 'string' || !key[k]) errors.push(`答案包缺少 ${k}`)
  if (!Array.isArray(key.questions)) errors.push('答案包沒有 questions')
  if (exam && (key.batch_id !== exam.batch_id || key.student_id !== exam.student_id || key.quiz_id !== exam.quiz_id || key.public_quiz_hash !== exam.public_quiz_hash)) errors.push('答案包與試卷識別欄位不相符')
  const seen = new Set<string>(); (Array.isArray(key.questions) ? key.questions : []).forEach((q: any) => { if (!q?.question_id) errors.push('答案題目缺少 question_id'); else if (seen.has(q.question_id)) errors.push(`答案重複 question_id: ${q.question_id}`); else seen.add(q.question_id); if (!Array.isArray(q?.source_refs)) errors.push(`題目 ${q?.question_id ?? '?'} 缺少 source_refs`) })
  return { valid: errors.length === 0, errors }
}

export function validateSubmission(submission: unknown, exam?: StudentExam): ValidationResult {
  const errors: string[] = []; if (!isRecord(submission)) return { valid: false, errors: ['作答必須是 JSON 物件'] }
  for (const k of ['schema_version', 'batch_id', 'student_id', 'quiz_id', 'public_quiz_hash']) if (typeof submission[k] !== 'string' || !submission[k]) errors.push(`作答缺少 ${k}`)
  if (!Array.isArray(submission.answers)) errors.push('作答沒有 answers')
  if (exam && (submission.batch_id !== exam.batch_id || submission.student_id !== exam.student_id || submission.quiz_id !== exam.quiz_id || submission.public_quiz_hash !== exam.public_quiz_hash)) errors.push('作答與試卷版本不相符')
  const ids = new Set(exam?.questions.map(q => q.question_id) ?? []); const seen = new Set<string>(); (Array.isArray(submission.answers) ? submission.answers : []).forEach((a: any) => { if (!a?.question_id || !ids.has(a.question_id)) errors.push(`未知 question_id: ${a?.question_id ?? ''}`); if (seen.has(a?.question_id)) errors.push(`重複作答: ${a?.question_id}`); seen.add(a?.question_id); if (!(typeof a?.value === 'string' || Array.isArray(a?.value))) errors.push(`作答格式無效: ${a?.question_id}`) })
  return { valid: errors.length === 0, errors }
}
