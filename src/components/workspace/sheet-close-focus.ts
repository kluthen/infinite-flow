/**
 * Where focus goes when the connection sheet closes, by any path. Pure; the header moves focus to
 * the element it names.
 */

/** The header element focus moves to when the connection sheet closes. */
// @spec-link [[rule_controller_connects_between_sessions]]
export type SheetCloseFocusTarget = 'session-action' | 'phrase-action' | 'controller-status'

/**
 * Intent: the first enabled of the session action, then the phrase action, then
 * `controller-status`, the element that opened the sheet, which is always interactive outside a
 * session (both header actions are disabled while a phrase loads and under an unsupported rhythm).
 */
// @spec-link [[rule_controller_connects_between_sessions]]
export function sheetCloseFocusTarget(actions: {
  readonly sessionActionEnabled: boolean
  readonly phraseActionEnabled: boolean
}): SheetCloseFocusTarget {
  if (actions.sessionActionEnabled) return 'session-action'
  if (actions.phraseActionEnabled) return 'phrase-action'
  return 'controller-status'
}
