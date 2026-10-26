/**
 * The quantized doodle's two typed failures: a doodle that breaks the quantized doodle's rules,
 * and untrusted doodle input that cannot be parsed. They sit apart from the constructor and the
 * parser (`quantized-doodle.ts`, which re-exports them) so that a caller that only recognises
 * these failures, such as the kept-session refusal check the database's upgrade steps run, does
 * not load the doodle's reading. Pure.
 */

/** Typed failure for a doodle that breaks the quantized doodle's rules. */
// @spec-link [[entity_quantized_doodle]]
export class QuantizedDoodleViolation extends Error {
  readonly kind = 'QuantizedDoodleViolation' as const

  constructor(message: string) {
    super(message)
    this.name = 'QuantizedDoodleViolation'
  }
}

/** Typed failure for untrusted doodle input that cannot be parsed. */
// @spec-link [[entity_quantized_doodle]]
export class QuantizedDoodleParseError extends Error {
  readonly kind = 'QuantizedDoodleParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'QuantizedDoodleParseError'
  }
}
