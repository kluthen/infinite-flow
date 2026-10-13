/**
 * The worker-bound half of the generation worker protocol: parsing what the session posts to the
 * worker (a generate request or a prewarm message) and the intent rebuild they share with the
 * phrase replay key decoder. Kept apart from generation-worker-protocol.ts, whose response side the
 * main thread parses at start-up, because rebuilding an intent with a carry-in loads the carry-in
 * checks (the harmony planner among them), which only the worker and phrase replay ever need.
 */

import {
  makeGenerationControls,
  MUSICAL_PROFILES,
  PITCH_CLASSES,
  type GenerationControls,
  type PitchClass,
} from '../domain/controls/generation-controls'
import type { ProfileSelection } from '../domain/controls/profile-selection'
import { deepEqual } from '../domain/events/deep-equal'
import { parseCarryIn } from '../domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '../domain/generation/carry-in/carry-in-intent'
import { makeGenerationIntent, type GenerationIntent } from '../domain/generation/generation-intent'
import { makeRequestId } from '../domain/generation/generation-request'
import { makeSeed } from '../domain/random/seed'
import {
  asPlainRecord,
  GenerationWorkerProtocolError,
  parseCorrelationId,
  requireAllowedKeys,
  type GenerationWorkerInboundMessage,
  type GenerationWorkerPrewarm,
  type GenerationWorkerRequest,
} from './generation-worker-protocol'

const PROFILE_SELECTION_ALLOWED_KEYS = new Set(['musicalProfile', 'isCustom'])

/** Intent: parse an untrusted wire ProfileSelection, rejecting an unknown profile or extra field. */
function parseProfileSelection(input: unknown): ProfileSelection {
  const record = asPlainRecord(input, 'GenerationIntent.musicalProfile')
  requireAllowedKeys(record, PROFILE_SELECTION_ALLOWED_KEYS, 'GenerationIntent.musicalProfile')
  const { musicalProfile, isCustom } = record
  if (typeof musicalProfile !== 'string' || !MUSICAL_PROFILES.includes(musicalProfile as never)) {
    throw new GenerationWorkerProtocolError(
      `GenerationIntent.musicalProfile.musicalProfile must be one of ${JSON.stringify(MUSICAL_PROFILES)}, got ${JSON.stringify(musicalProfile)}.`,
    )
  }
  if (typeof isCustom !== 'boolean') {
    throw new GenerationWorkerProtocolError(
      'GenerationIntent.musicalProfile.isCustom must be a boolean.',
    )
  }
  return { musicalProfile: musicalProfile as ProfileSelection['musicalProfile'], isCustom }
}

const GENERATION_INTENT_ALLOWED_KEYS = new Set([
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'musicalProfile',
  'instrumentProfile',
  'registerIntent',
  'carryIn',
])

/**
 * Intent: validate the owning fields of an untrusted GenerationIntent record (requestId, seed,
 * writtenTonalCenter, controls, musicalProfile and an optional carryIn) through the existing domain
 * constructors and rebuild the full intent via `makeGenerationIntent`, or `makeCarryInGenerationIntent`
 * when the record holds a carry-in, with no default for a missing or invalid field. Both builders
 * take the player's written-pitch tonal center (never the record's already-converted concert
 * `controls.tonalCenter`) and re-derive the concert value themselves, so the rebuild substitutes the
 * record's `writtenTonalCenter` back into the controls. A `carryIn`, when present, is parsed field
 * by field (any fault is a CarryInError) and then checked against the rebuilt intent by
 * `makeCarryInGenerationIntent` itself; its `finalHarmony` is a carried chord or an explicit null
 * (dropped by a key or collection change), never missing. Shared by the worker request parser and
 * the phrase replay key decoder so neither keeps a parallel schema.
 */
// @spec-link [[module_generation_worker_protocol]]
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function rebuildGenerationWorkerIntent(record: Record<string, unknown>): GenerationIntent {
  if (typeof record.requestId !== 'string') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.intent.requestId must be a string, got ${typeof record.requestId}.`,
    )
  }
  const requestId = makeRequestId(record.requestId)
  if (typeof record.seed !== 'number') {
    throw new GenerationWorkerProtocolError('GenerationWorkerRequest.intent.seed must be a number.')
  }
  const seed = makeSeed(record.seed)
  if (
    typeof record.writtenTonalCenter !== 'string' ||
    !PITCH_CLASSES.includes(record.writtenTonalCenter as PitchClass)
  ) {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.intent.writtenTonalCenter must be one of ${JSON.stringify(PITCH_CLASSES)}, got ${JSON.stringify(record.writtenTonalCenter)}.`,
    )
  }
  const writtenTonalCenter = record.writtenTonalCenter as PitchClass
  const wireControls = asPlainRecord(record.controls, 'GenerationWorkerRequest.intent.controls')
  const controls = makeGenerationControls({
    ...(wireControls as unknown as GenerationControls),
    tonalCenter: writtenTonalCenter,
  })
  const musicalProfile = parseProfileSelection(record.musicalProfile)
  const carryIn = 'carryIn' in record ? parseCarryIn(record.carryIn) : undefined
  const input = { requestId, seed, controls, musicalProfile }

  return carryIn === undefined
    ? makeGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/**
 * Intent: parse one untrusted wire GenerationIntent by rejecting any unknown field, rebuilding the
 * intent from its owning fields via `rebuildGenerationWorkerIntent`, then asserting the rebuilt
 * intent deep-equals the received record field-for-field. `instrumentProfile` and `registerIntent`
 * are derived deterministically from those owning fields, so this both validates them and proves
 * the wire value was not tampered with or corrupted in transit; an intent without a carry-in must
 * have no such field.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[entity_phrase_carry_in]]
export function parseGenerationWorkerIntent(input: unknown): GenerationIntent {
  const record = asPlainRecord(input, 'GenerationWorkerRequest.intent')
  requireAllowedKeys(record, GENERATION_INTENT_ALLOWED_KEYS, 'GenerationWorkerRequest.intent')

  const rebuilt = rebuildGenerationWorkerIntent(record)

  if (!deepEqual(rebuilt, record)) {
    throw new GenerationWorkerProtocolError(
      'GenerationWorkerRequest.intent does not match its rebuilt GenerationIntent.',
    )
  }
  return rebuilt
}

/**
 * Intent: parse one untrusted request envelope posted to the worker. Rejects a wrong `type`, an
 * unparsable `id` (never inventing one), or an invalid `intent` as a typed
 * GenerationWorkerProtocolError so a malformed request crashes the worker loudly.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerRequest(input: unknown): GenerationWorkerRequest {
  const record = asPlainRecord(input, 'GenerationWorkerRequest')
  requireAllowedKeys(record, new Set(['type', 'id', 'intent']), 'GenerationWorkerRequest')
  if (record.type !== 'generate') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.type must be "generate", got ${JSON.stringify(record.type)}.`,
    )
  }
  const id = parseCorrelationId(record.id, 'GenerationWorkerRequest')
  const intent = parseGenerationWorkerIntent(record.intent)
  return { type: 'generate', id, intent }
}

/**
 * Intent: parse one untrusted prewarm message posted to the worker: exactly `type` and `intent`,
 * the intent parsed exactly like a generate request's. Any other shape throws a typed
 * GenerationWorkerProtocolError so a malformed prewarm crashes the worker as loudly as a
 * malformed generate request.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerPrewarm(input: unknown): GenerationWorkerPrewarm {
  const record = asPlainRecord(input, 'GenerationWorkerPrewarm')
  requireAllowedKeys(record, new Set(['type', 'intent']), 'GenerationWorkerPrewarm')
  if (record.type !== 'prewarm') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerPrewarm.type must be "prewarm", got ${JSON.stringify(record.type)}.`,
    )
  }
  const intent = parseGenerationWorkerIntent(record.intent)
  return { type: 'prewarm', intent }
}

/**
 * Intent: parse any untrusted worker-bound message, dispatching on its `type` to the generate
 * request or the prewarm parser. A non-object or an unknown `type` throws a typed
 * GenerationWorkerProtocolError, never guessing which message was meant.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerInboundMessage(
  input: unknown,
): GenerationWorkerInboundMessage {
  const record = asPlainRecord(input, 'GenerationWorkerInboundMessage')
  if (record.type === 'generate') return parseGenerationWorkerRequest(record)
  if (record.type === 'prewarm') return parseGenerationWorkerPrewarm(record)
  throw new GenerationWorkerProtocolError(
    `GenerationWorkerInboundMessage.type must be "generate" or "prewarm", got ${JSON.stringify(record.type)}.`,
  )
}
