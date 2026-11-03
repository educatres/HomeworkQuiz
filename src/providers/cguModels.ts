import type { ModelInfo } from './types'

/** Models exposed in the CGU selector. Keep this list explicit so a gateway
 * response cannot make unsupported or internal models appear in the UI. */
export const CGU_ALLOWED_MODELS = ['gemma-4-26b-a4b-it', 'gpt-oss:20b', 'gpt-oss-120b'] as const
export const CGU_DEFAULT_MODEL = 'gemma-4-26b-a4b-it'

export const CGU_MODEL_OPTIONS: ModelInfo[] = CGU_ALLOWED_MODELS.map(id => ({
  id,
  displayName: id,
  capabilities: ['text-generation'],
  source: 'cgu'
}))
