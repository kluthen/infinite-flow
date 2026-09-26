/**
 * The single ambient declaration of the workspace harness's published `window.__workspaceHarness`
 * API, shared by the harness page (tests/e2e/workspace-harness/main.ts) and every release journey
 * spec. It is a script file with no imports so both the application and the e2e TypeScript
 * projects can include it directly without pulling each other's files into their programs.
 */

/** The closed set of typed generation-failure codes a real orchestration run can produce. */
type WorkspaceHarnessGenerationFailureCode =
  | 'no_legal_harmony_plan'
  | 'no_legal_rhythm_plan'
  | 'no_legal_pitch_plan'
  | 'no_eligible_register_window'
  | 'search_limit_exceeded'
  | 'result_validation_failed'

/** One deterministic-replay / presentation-isolation snapshot of the current workspace session. */
interface WorkspaceHarnessSnapshot {
  readonly operation: 'idle' | 'generating' | 'notating'
  /** The active instrument profile: notation always reads its own written pitch from this. */
  readonly instrumentProfileId: string
  /** The player's written-pitch tonal-center selection (ISS-003): null with no result yet. */
  readonly writtenTonalCenter: string | null
  /** The concert-pitch tonal center the generator actually consumed, converted from `writtenTonalCenter`. */
  readonly concertTonalCenter: string | null
  readonly requestId: string | null
  readonly seed: number | null
  /** `JSON.stringify` of the latest result's concert-event timeline, or null with no result yet. */
  readonly timeline: string | null
}

interface WorkspaceHarnessApi {
  /** Append deterministic seeds to the queue `nextSeed()` draws from first, in call order. */
  queueSeeds: (seeds: readonly number[]) => void
  /** Hold every subsequent `generate` call before it reaches the real worker, until released. */
  holdGeneration: () => void
  /** Release the current hold; every gated `generate` call resumes immediately. */
  releaseGeneration: () => void
  /** Arm exactly one forced generation failure using the given real orchestration failure code. */
  failNextGeneration: (code: WorkspaceHarnessGenerationFailureCode) => void
  /** Arm exactly one forced notation engraving-module load failure on the next redraw attempt. */
  failNextNotation: () => void
  /** The current workspace session snapshot. */
  snapshot: () => WorkspaceHarnessSnapshot
}

interface Window {
  __workspaceHarness: WorkspaceHarnessApi
}
