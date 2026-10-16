/**
 * The words that tell the player which kept sessions of my instrument a change erases or a
 * deletion takes with it, verbatim from the design: the My instrument sheet's erase warning, delete
 * confirmation and reload line (screens/my-instrument/handoff.md, States), and the transposition
 * check's Use and erase and its reload line (screens/controller-connection/handoff.md, States).
 * `count` is the number of the sessions of my instrument, 1 or more; `reviewed`, whether the
 * review on screen shows one of them. Loaded with the sheets, never in the entry chunk.
 */

/** The erase warning's and the check's error line after a refused save-and-erase. */
export const ERASE_FAILED_LINE = "That couldn't be saved, and nothing was erased. Try again."

/** The delete confirmation's error line after a refused deletion. */
export const DELETE_FAILED_LINE = "That couldn't be deleted. Try again."

/** Intent: the sentence saying the review on screen closes, after what a change erases. */
function reviewCloses(count: number): string {
  return count === 1
    ? 'It is the session reviewed on screen, so its review closes.'
    : 'The session reviewed on screen is one of them, so its review closes.'
}

/** Intent: `sentence`, then, when the review on screen shows one of them, that it closes. */
function withReview(sentence: string, count: number, reviewed: boolean): string {
  return reviewed ? `${sentence} ${reviewCloses(count)}` : sentence
}

/** Intent: the erase warning's first paragraph: what a range or transposition change erases. */
// @spec-link [[entity_my_instrument_record]]
export function eraseWarningText(count: number, reviewed: boolean): string {
  const erased =
    count === 1
      ? 'Changing the range or the transposition erases the session played with this instrument, with its favorite phrases, comment and played notes.'
      : `Changing the range or the transposition erases the ${count} sessions played with this instrument, with their favorite phrases, comments and played notes.`
  return withReview(erased, count, reviewed)
}

/** Intent: the sheet's hint on keeping a session before it goes. */
export function keepSessionHint(count: number): string {
  return count === 1
    ? 'To keep it, cancel, then export it from its review first.'
    : 'To keep a session, cancel, then export it from its review first.'
}

/**
 * Intent: the delete confirmation's first paragraph: what goes, the `count` sessions with it
 * (none at 0), whether the review on screen closes, and, while my instrument is selected,
 * `template`, the profile the selection goes back to (null when it is not selected).
 */
// @spec-link [[entity_my_instrument_record]]
export function deleteConfirmationText(
  name: string,
  count: number,
  reviewed: boolean,
  template: string | null,
): string {
  const sentences = [`${name} will be deleted, with its clef, range and transposition.`]
  if (count === 1)
    sentences.push(
      withReview(
        'The session played with it goes too, with its favorite phrases, comment and played notes.',
        count,
        reviewed,
      ),
    )
  else if (count > 1)
    sentences.push(
      withReview(
        `The ${count} sessions played with it go too, with their favorite phrases, comments and played notes.`,
        count,
        reviewed,
      ),
    )
  if (template !== null)
    sentences.push(`The instrument goes back to ${template}, the profile it was made from.`)
  return sentences.join(' ')
}

/** Intent: the sheet's reload line, in a tab that must be reloaded while sessions would go. */
// @spec-link [[rule_outdated_tab_stops_saving]]
export function reloadToChangeText(name: string): string {
  return `Reload this page to change the range or the transposition, or to delete ${name}: either would erase the sessions played with this instrument, and this page can't delete anything until it is reloaded.`
}

/** Intent: the check's Use and erase paragraph: what a transposition change erases. */
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export function checkEraseText(count: number, reviewed: boolean): string {
  const erased =
    count === 1
      ? 'Changing the transposition erases the session played with my instrument, with its favorite phrases, comment and played notes.'
      : `Changing the transposition erases the ${count} sessions played with my instrument, with their favorite phrases, comments and played notes.`
  return withReview(erased, count, reviewed)
}

/** Intent: the check's hint on keeping a session before it goes. */
export function checkKeepSessionHint(count: number): string {
  return count === 1
    ? 'To keep it, choose Back, close this sheet, then export it from its review.'
    : 'To keep a session, choose Back, close this sheet, then export it from its review.'
}

/** Intent: the check result's reload line, in a tab that must be reloaded while sessions would go. */
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_transposition_check_sets_my_instrument]]
export function checkReloadText(name: string): string {
  return `To use this for ${name}, reload the page first: changing its transposition would erase the sessions played with my instrument.`
}
