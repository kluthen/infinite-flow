/** One SegmentedControl choice: the raw value it selects and its rendered display label. */
export interface SegmentedControlOption {
  readonly value: string
  readonly label: string
  /**
   * The option can't be chosen here: rendered natively disabled, never the checked option, and
   * skipped by arrow-key, Home and End selection. Its reason is given in words elsewhere, in the
   * element `describedBy` names.
   */
  readonly disabled?: boolean
  /** The id of the element giving the reason a disabled option can't be chosen. */
  readonly describedBy?: string
}
