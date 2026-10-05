/**
 * The typed wire protocol between the workspace session and its one long-lived generation worker:
 * one request/response envelope shape plus hand-written boundary parsers. `structuredClone` (the
 * postMessage transport) strips branding and freezing but preserves plain-object/array shape, so
 * every field re-validated here goes back through the same domain constructors/parsers the
 * orchestrator itself uses wherever one exists, and a minimal structural check where none does
 * (GenerationProvenance and GenerationDiagnostics have no existing boundary parser because nothing
 * upstream ever accepted them as untrusted input before this worker boundary existed). This module
 * holds the message types, the shared field checks and the response side, which the main thread
 * parses; the worker-bound side, which rebuilds intents and their carry-in, lives in
 * generation-worker-inbound.ts so the main thread's start-up code never loads the carry-in checks.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import { parseGenerationRequest } from '../domain/generation/generation-request'
import { makeGenerationResult } from '../domain/generation/generation-result'
import { parseConcertEventTimeline } from '../domain/events/timeline-parser'
import type {
  GenerationDiagnostics,
  GenerationFailureCode,
  GenerationOutcome,
  GenerationProvenance,
} from '../domain/generation/orchestration/orchestration-types'

/** Typed failure for a malformed generation-worker protocol envelope on either side of the wire. */
// @spec-link [[module_generation_worker_protocol]]
export class GenerationWorkerProtocolError extends Error {
  readonly kind = 'GenerationWorkerProtocolError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationWorkerProtocolError'
  }
}

/** One correlated request posted from the session to the worker: run generation for one intent. */
// @spec-link [[module_generation_worker_protocol]]
export interface GenerationWorkerRequest {
  readonly type: 'generate'
  readonly id: number
  readonly intent: GenerationIntent
}

/**
 * One uncorrelated prewarm message posted from the session to the worker: build this intent's
 * rhythm domain into the memo in the background. It carries no id and is never answered.
 */
// @spec-link [[module_generation_worker_protocol]]
export interface GenerationWorkerPrewarm {
  readonly type: 'prewarm'
  readonly intent: GenerationIntent
}

/** Every worker-bound message: a correlated generate request or an unanswered prewarm. */
// @spec-link [[module_generation_worker_protocol]]
export type GenerationWorkerInboundMessage = GenerationWorkerRequest | GenerationWorkerPrewarm

/** One correlated response posted from the worker back to the session. */
// @spec-link [[module_generation_worker_protocol]]
export type GenerationWorkerResponse =
  | { readonly type: 'outcome'; readonly id: number; readonly outcome: GenerationOutcome }
  | { readonly type: 'crash'; readonly id: number; readonly name: string; readonly message: string }

const GENERATION_FAILURE_CODES: readonly GenerationFailureCode[] = [
  'no_legal_harmony_plan',
  'no_legal_rhythm_plan',
  'no_legal_pitch_plan',
  'no_eligible_register_window',
  'search_limit_exceeded',
  'result_validation_failed',
]

/** Intent: narrow an unknown value to a plain, non-null, non-array object record. */
// @spec-link [[module_generation_worker_protocol]]
export function asPlainRecord(input: unknown, context: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new GenerationWorkerProtocolError(
      `${context} must be a plain object, got ${typeof input}.`,
    )
  }
  return input as Record<string, unknown>
}

/** Intent: reject any record key outside the given allowed set, never silently ignoring extras. */
// @spec-link [[module_generation_worker_protocol]]
export function requireAllowedKeys(
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  context: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new GenerationWorkerProtocolError(`${context} has unknown field "${key}".`)
    }
  }
}

/** Intent: parse an untrusted correlation id, rejecting anything but a finite integer. */
// @spec-link [[module_generation_worker_protocol]]
export function parseCorrelationId(input: unknown, context: string): number {
  if (typeof input !== 'number' || !Number.isInteger(input)) {
    throw new GenerationWorkerProtocolError(
      `${context}.id must be an integer, got ${typeof input}.`,
    )
  }
  return input
}

const PROVENANCE_ALLOWED_KEYS = new Set(['harmony', 'rhythm', 'tensionBinding'])

/**
 * Intent: minimally validate an untrusted wire GenerationProvenance. No existing boundary parser
 * covers HarmonyCandidate/RhythmCandidate/ConcreteTensionBinding (nothing upstream ever accepted
 * them as untrusted input before this worker boundary), so this checks only that the three
 * expected fields are present as plain objects and rejects any other shape.
 */
function parseGenerationProvenance(input: unknown): GenerationProvenance {
  const record = asPlainRecord(input, 'GenerationOutcome.provenance')
  requireAllowedKeys(record, PROVENANCE_ALLOWED_KEYS, 'GenerationOutcome.provenance')
  asPlainRecord(record.harmony, 'GenerationOutcome.provenance.harmony')
  asPlainRecord(record.rhythm, 'GenerationOutcome.provenance.rhythm')
  asPlainRecord(record.tensionBinding, 'GenerationOutcome.provenance.tensionBinding')
  return record as unknown as GenerationProvenance
}

const DIAGNOSTICS_ALLOWED_KEYS = new Set([
  'version',
  'harmonyDomainSize',
  'rhythmDomainSize',
  'windows',
  'successfulRegisters',
  'selectedRegister',
])

/**
 * Intent: minimally validate an untrusted wire GenerationDiagnostics. No existing boundary parser
 * covers this internal-only diagnostics shape; this checks the versioned tag and the top-level
 * field types/arity and rejects any other shape.
 */
function parseGenerationDiagnostics(input: unknown): GenerationDiagnostics {
  const record = asPlainRecord(input, 'GenerationOutcome.diagnostics')
  requireAllowedKeys(record, DIAGNOSTICS_ALLOWED_KEYS, 'GenerationOutcome.diagnostics')
  if (record.version !== 'generation-diagnostics-v1') {
    throw new GenerationWorkerProtocolError(
      `GenerationOutcome.diagnostics.version must be "generation-diagnostics-v1", got ${JSON.stringify(record.version)}.`,
    )
  }
  if (typeof record.harmonyDomainSize !== 'number' || typeof record.rhythmDomainSize !== 'number') {
    throw new GenerationWorkerProtocolError(
      'GenerationOutcome.diagnostics domain sizes must be numbers.',
    )
  }
  if (!Array.isArray(record.windows) || !Array.isArray(record.successfulRegisters)) {
    throw new GenerationWorkerProtocolError(
      'GenerationOutcome.diagnostics.windows/successfulRegisters must be arrays.',
    )
  }
  return record as unknown as GenerationDiagnostics
}

const OUTCOME_SUCCESS_ALLOWED_KEYS = new Set([
  'kind',
  'request',
  'result',
  'provenance',
  'diagnostics',
])
const OUTCOME_FAILURE_ALLOWED_KEYS = new Set(['kind', 'code', 'diagnostics'])
const GENERATION_RESULT_ALLOWED_KEYS = new Set(['requestId', 'seed', 'timeline'])

/**
 * Intent: parse an untrusted wire GenerationOutcome. A success outcome re-validates its retained
 * `request` through `parseGenerationRequest` and its `result.timeline` through
 * `parseConcertEventTimeline` — the two existing boundary parsers that cover GenerationResult's
 * fields — and requires `result.requestId`/`result.seed` to match the validated request exactly.
 * A failure outcome requires `code` to be one of the closed GenerationFailureCode values. Either
 * way the parsed outcome is deep-frozen before being returned, since `structuredClone` strips the
 * freezing generatePhrase itself applied.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationOutcome(input: unknown): GenerationOutcome {
  const record = asPlainRecord(input, 'GenerationOutcome')

  if (record.kind === 'generation_success') {
    requireAllowedKeys(record, OUTCOME_SUCCESS_ALLOWED_KEYS, 'GenerationOutcome')
    const request = parseGenerationRequest(record.request)
    const resultRecord = asPlainRecord(record.result, 'GenerationOutcome.result')
    requireAllowedKeys(resultRecord, GENERATION_RESULT_ALLOWED_KEYS, 'GenerationOutcome.result')
    if (
      typeof resultRecord.requestId !== 'string' ||
      resultRecord.requestId !== request.requestId
    ) {
      throw new GenerationWorkerProtocolError(
        'GenerationOutcome.result.requestId does not match GenerationOutcome.request.requestId.',
      )
    }
    if (resultRecord.seed !== request.seed) {
      throw new GenerationWorkerProtocolError(
        'GenerationOutcome.result.seed does not match GenerationOutcome.request.seed.',
      )
    }
    const timeline = parseConcertEventTimeline(resultRecord.timeline)
    const result = makeGenerationResult({
      requestId: request.requestId,
      seed: request.seed,
      timeline,
    })
    const provenance = parseGenerationProvenance(record.provenance)
    const diagnostics = parseGenerationDiagnostics(record.diagnostics)
    return deepFreeze({ kind: 'generation_success', request, result, provenance, diagnostics })
  }

  if (record.kind === 'generation_failure') {
    requireAllowedKeys(record, OUTCOME_FAILURE_ALLOWED_KEYS, 'GenerationOutcome')
    if (
      typeof record.code !== 'string' ||
      !GENERATION_FAILURE_CODES.includes(record.code as GenerationFailureCode)
    ) {
      throw new GenerationWorkerProtocolError(
        `GenerationOutcome.code must be one of ${JSON.stringify(GENERATION_FAILURE_CODES)}, got ${JSON.stringify(record.code)}.`,
      )
    }
    const diagnostics = parseGenerationDiagnostics(record.diagnostics)
    return deepFreeze({
      kind: 'generation_failure',
      code: record.code as GenerationFailureCode,
      diagnostics,
    })
  }

  throw new GenerationWorkerProtocolError(
    `GenerationOutcome.kind must be "generation_success" or "generation_failure", got ${JSON.stringify(record.kind)}.`,
  )
}

/**
 * Intent: parse an untrusted response envelope received back from the worker. An `outcome`
 * response re-validates its outcome via `parseGenerationOutcome`; a `crash` response requires a
 * string `name`/`message`. Any other shape is a typed GenerationWorkerProtocolError.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerResponse(input: unknown): GenerationWorkerResponse {
  const record = asPlainRecord(input, 'GenerationWorkerResponse')

  if (record.type === 'outcome') {
    requireAllowedKeys(record, new Set(['type', 'id', 'outcome']), 'GenerationWorkerResponse')
    const id = parseCorrelationId(record.id, 'GenerationWorkerResponse')
    const outcome = parseGenerationOutcome(record.outcome)
    return { type: 'outcome', id, outcome }
  }

  if (record.type === 'crash') {
    requireAllowedKeys(
      record,
      new Set(['type', 'id', 'name', 'message']),
      'GenerationWorkerResponse',
    )
    const id = parseCorrelationId(record.id, 'GenerationWorkerResponse')
    if (typeof record.name !== 'string' || typeof record.message !== 'string') {
      throw new GenerationWorkerProtocolError(
        'GenerationWorkerResponse crash name/message must be strings.',
      )
    }
    return { type: 'crash', id, name: record.name, message: record.message }
  }

  throw new GenerationWorkerProtocolError(
    `GenerationWorkerResponse.type must be "outcome" or "crash", got ${JSON.stringify(record.type)}.`,
  )
}
