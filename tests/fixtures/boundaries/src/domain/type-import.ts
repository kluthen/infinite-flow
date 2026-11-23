import type { Session } from '../session/session'

/** A session's id, typed through a type-only import that leaves the library set. */
export function sessionId(session: Session): string {
  return session.id
}
