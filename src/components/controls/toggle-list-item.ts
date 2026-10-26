// @lint-ignore-atd shared UI plumbing: the item shape of the generic toggle list; no business rule

/** One ToggleList toggle: the raw value it reports, its rendered name and whether it is on. */
export interface ToggleListItem {
  readonly value: string
  readonly label: string
  /** The toggle is shown on (`aria-pressed="true"`). */
  readonly pressed: boolean
  /**
   * The item can't be changed here: rendered natively disabled, so it reports nothing. Its reason
   * is given in words elsewhere, in the element `describedBy` names.
   */
  readonly disabled?: boolean
  /** The id of the element giving the reason a disabled item can't be changed. */
  readonly describedBy?: string
}
