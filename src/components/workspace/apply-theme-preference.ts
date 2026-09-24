import type { ThemePreference } from '@/composables/use-generation-session'

/**
 * Applies the session's presentation-only theme preference to `document.documentElement`'s
 * `data-theme` attribute: System removes the override so the OS-level `prefers-color-scheme`
 * rule in theme.css decides, Light/Dark force that value. Purely a DOM side effect -- it never
 * touches generation or notation, so switching themes never regenerates or redraws the phrase.
 */
// @spec-link [[rule_presentation_preference_preserves_phrase]]
export function applyThemePreference(theme: ThemePreference): void {
  if (theme === 'System') {
    document.documentElement.removeAttribute('data-theme')
    return
  }
  document.documentElement.dataset.theme = theme === 'Light' ? 'light' : 'dark'
}
