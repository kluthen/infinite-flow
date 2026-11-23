import { ref } from 'vue'

/** A reactive counter, built from a package session may not import. */
export function counter(): unknown {
  return ref(0)
}
