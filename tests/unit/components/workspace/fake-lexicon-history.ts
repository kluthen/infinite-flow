/**
 * A fake of the lexicon page's history seam: a list of entries (an address's `#` part and
 * whether the entry is the page's own) and the one the browser is on. The player's moves (Back,
 * Forward, an address typed) move it and tell the listener at once; the page's own step back is
 * held until `settle()`, as the browser's is asynchronous.
 */
import type { LexiconHistory } from '@/components/workspace/lexicon-history'

/** One entry of the fake history. */
export interface FakeHistoryEntry {
  readonly hash: string
  readonly pageEntry: boolean
}

/** The fake, with the player's moves and a view of the entries. */
export interface FakeLexiconHistory extends LexiconHistory {
  /** The entries, oldest first. */
  readonly entries: () => readonly FakeHistoryEntry[]
  /** The entry the browser is on. */
  readonly current: () => FakeHistoryEntry
  /** The browser's Back button. */
  readonly back: () => void
  /** The browser's Forward button. */
  readonly forward: () => void
  /** An address typed into the address bar: a new entry at this `#` part. */
  readonly type: (hash: string) => void
  /** Deliver the page's own pending step back. */
  readonly settle: () => void
}

/** A fake history on one bare entry, or at `startHash` (a load at that address). */
export function fakeLexiconHistory(startHash = ''): FakeLexiconHistory {
  let entries: FakeHistoryEntry[] = [{ hash: startHash, pageEntry: false }]
  let at = 0
  let pendingBacks = 0
  const listeners = new Set<() => void>()
  /** The entry the browser is on; there always is one. */
  const current = (): FakeHistoryEntry => {
    const entry = entries[at]
    if (entry === undefined) throw new Error('fake history: no current entry')
    return entry
  }
  /** Tell every listener of a move. */
  const moved = (): void => {
    for (const listener of listeners) listener()
  }
  /** Replace the current entry. */
  const replace = (entry: FakeHistoryEntry): void => {
    entries = entries.map((old, index) => (index === at ? entry : old))
  }
  /** Add an entry on top of the current one, dropping the forward ones. */
  const push = (entry: FakeHistoryEntry): void => {
    entries = [...entries.slice(0, at + 1), entry]
    at += 1
  }
  return {
    entries: () => entries,
    current,
    atLexiconAddress: () => current().hash === '#lexicon',
    onPageEntry: () => current().hash === '#lexicon' && current().pageEntry,
    pushPageEntry: () => push({ hash: '#lexicon', pageEntry: true }),
    markPageEntry: () => replace({ hash: '#lexicon', pageEntry: true }),
    replaceWithBareAddress: () => replace({ hash: '', pageEntry: false }),
    stepBack: () => {
      pendingBacks += 1
    },
    listen: (onMove) => {
      listeners.add(onMove)
      return () => listeners.delete(onMove)
    },
    back: () => {
      if (at === 0) throw new Error('fake history: Back would leave the app')
      at -= 1
      moved()
    },
    forward: () => {
      if (at === entries.length - 1) throw new Error('fake history: nothing to go forward to')
      at += 1
      moved()
    },
    type: (hash) => {
      push({ hash, pageEntry: false })
      moved()
    },
    settle: () => {
      for (; pendingBacks > 0; pendingBacks -= 1) {
        at -= 1
        moved()
      }
    },
  }
}
