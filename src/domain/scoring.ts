import type { GradingResult, StudentExam, StudentSubmission, TeacherAnswerKey } from './types'
import { validateSubmission, validateTeacherKey } from './validation'

const setEqual = (a: string[], b: string[]) => a.length === b.length && [...new Set(a)].every(x => b.includes(x)) && [...new Set(b)].every(x => a.includes(x))
export function gradeObjective(exam: StudentExam, key: TeacherAnswerKey, submission: StudentSubmission): GradingResult {
  const errors = [...validateTeacherKey(key, exam).errors, ...validateSubmission(submission, exam).errors]
  const answers = new Map(submission.answers.map(a => [a.question_id, a.value]))
  const keyMap = new Map(key.questions.map(q => [q.question_id, q]))
  const per_question = exam.questions.map(q => {
    const k = keyMap.get(q.question_id); const given = answers.get(q.question_id); let earned = 0; let review = false; let feedback = '未作答。'
    if (!k) { review = true; feedback = '找不到教師答案，需人工處理。' }
    else if (q.type === 'short_answer') { review = true; feedback = given ? '問答題需要依 rubric 評閱。' : '未作答，需人工確認。' }
    else { const expected = Array.isArray(k.answer) ? k.answer : [k.answer]; const actual = Array.isArray(given) ? given : (given ? [given] : []); const validIds = new Set((q.options ?? []).map(o => o.id)); if (actual.some(id => !validIds.has(id))) { review = true; feedback = '答案包含不存在的選項 ID。' } else if (setEqual(expected, actual)) { earned = q.points; feedback = '答案正確。' } else feedback = '答案與標準答案不符。' }
    return { question_id: q.question_id, earned_points: earned, max_points: q.points, feedback, review_required: review }
  })
  const total_score = round(per_question.reduce((s, x) => s + x.earned_points, 0)); const max_score = round(exam.total_points)
  return { schema_version: '1.0', batch_id: exam.batch_id, student_id: exam.student_id, quiz_id: exam.quiz_id, total_score, max_score, status: errors.length || per_question.some(q => q.review_required) ? 'needs_review' : 'auto_graded', per_question, teacher_overrides: [] }
}
export const round = (n: number, digits = 2) => Math.round((n + Number.EPSILON) * 10 ** digits) / 10 ** digits
export function scoreRubric(maxPoints: number, rubric: { id: string; weight: number }[], ratios: Record<string, number>) { return round(maxPoints * rubric.reduce((s, r) => s + r.weight * Math.min(1, Math.max(0, ratios[r.id] ?? 0)), 0)) }
export function masteryLabel(rate: number) { return rate >= 80 ? '掌握良好' : rate >= 55 ? '部分掌握' : '仍需加強' }
