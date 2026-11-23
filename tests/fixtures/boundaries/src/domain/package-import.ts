import { ref } from 'vue'

/** A reactive counter, built from a package the library may not import. */
export function counter(): unknown {
  return ref(0)
}
