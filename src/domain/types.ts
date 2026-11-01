export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer'
export type Level = 'comprehension' | 'reasoning' | 'design_tradeoff'
export type Difficulty = 'basic' | 'intermediate' | 'advanced'

export interface SourceRef { block_id: string; page?: number; line_start?: number; line_end?: number }
export interface SourceBlock { block_id: string; text: string; page?: number; line_start?: number; line_end?: number; kind: 'paragraph' | 'code' | 'page' }
export interface SourceDocument { id: string; file_name: string; file_type: string; text: string; source_sha256: string; blocks: SourceBlock[]; warnings: string[]; needs_review: boolean }
export interface StudentRecord { student_id: string; name?: string; file_name: string; source_id: string; status: 'ready' | 'needs_review' | 'duplicate' | 'error'; error?: string }
export interface RubricCriterion { id: string; description: string; weight: number; acceptable_alternatives: string[]; common_mistakes: string[] }
export interface PublicQuestion { question_id: string; type: QuestionType; level: Level; difficulty: Difficulty; question: string; options?: { id: string; text: string }[]; points: number }
export interface TeacherQuestionKey { question_id: string; answer: string[] | string; explanation: string; concept: string; source_refs: SourceRef[]; rubric?: RubricCriterion[]; review_status: 'draft' | 'approved' }
export interface StudentExam { schema_version: '1.0'; batch_id: string; student_id: string; quiz_id: string; exam_version: number; public_quiz_hash: string; course_title: string; assignment_title: string; language: 'zh-TW' | 'en'; total_points: number; questions: PublicQuestion[] }
import type { PromptInjectionAlert } from './promptSecurity'
export interface TeacherAnswerKey { schema_version: '1.0'; batch_id: string; student_id: string; quiz_id: string; exam_version: number; public_quiz_hash: string; questions: TeacherQuestionKey[]; source_sha256: string; prompt_injection_alerts?: PromptInjectionAlert[] }
export interface StudentSubmission { schema_version: '1.0'; batch_id: string; student_id: string; quiz_id: string; exam_version: number; public_quiz_hash: string; answers: { question_id: string; value: string | string[] }[]; submitted_at_client?: string }
export interface RubricAssessment { criterion_id: string; earned_points: number; reason: string }
export interface GradingResult { schema_version: '1.0'; batch_id: string; student_id: string; quiz_id: string; total_score: number; max_score: number; status: 'auto_graded' | 'needs_review' | 'approved'; per_question: { question_id: string; earned_points: number; max_points: number; feedback: string; rubric_assessment?: RubricAssessment[]; confidence?: number; review_required: boolean }[]; teacher_overrides: { question_id: string; before: number; after: number; reason: string; updated_at: string }[] }
export interface BatchPlan { batch_id: string; course_title: string; assignment_title: string; language: 'zh-TW' | 'en'; question_count: number; type_weights: Record<QuestionType, number>; level_weights: Record<Level, number>; difficulty_weights: Record<Difficulty, number>; total_points: number; teacher_guidance: string }
export interface QuizBundle { exam: StudentExam; key: TeacherAnswerKey }

export const DEFAULT_PLAN: BatchPlan = { batch_id: `B-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`, course_title: '', assignment_title: '', language: 'zh-TW', question_count: 10, type_weights: { single_choice: 40, multiple_choice: 20, short_answer: 40 }, level_weights: { comprehension: 40, reasoning: 35, design_tradeoff: 25 }, difficulty_weights: { basic: 25, intermediate: 50, advanced: 25 }, total_points: 100, teacher_guidance: '' }
