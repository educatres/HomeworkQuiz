import { describe, expect, it } from 'vitest'
import { CGU_ALLOWED_MODELS, CGU_DEFAULT_MODEL, CGU_MODEL_OPTIONS } from './cguModels'

describe('CGU model selector', () => {
  it('exposes exactly the supported models in the requested order', () => {
    expect(CGU_ALLOWED_MODELS).toEqual(['gemma-4-26b-a4b-it', 'gpt-oss:20b', 'gpt-oss-120b'])
    expect(CGU_MODEL_OPTIONS.map(model => model.id)).toEqual([...CGU_ALLOWED_MODELS])
  })

  it('uses gpt-oss:20b as the default', () => {
    expect(CGU_DEFAULT_MODEL).toBe('gemma-4-26b-a4b-it')
  })
})
