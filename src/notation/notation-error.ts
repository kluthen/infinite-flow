/**
 * The notation failure, defined in the library (`src/domain/notation/notation-error.ts`, which the
 * staff layout's planners throw) and re-exported here for the notation adapters and the app, so
 * `NotationError` stays one class and every `instanceof` check holds whichever path it is read from.
 */
export {
  NotationError,
  isStaffLayoutFailure,
  type NotationErrorCode,
  type StaffLayoutFailureCode,
} from '../domain/notation/notation-error'
