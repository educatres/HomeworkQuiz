/** Runtime validators kept dependency-free so the static site works offline. */
export { validatePublicQuestion, validateStudentExam, validateTeacherKey, validateSubmission } from './validation'
export type { ValidationResult } from './validation'
