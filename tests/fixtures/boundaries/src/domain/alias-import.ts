import { formatTime } from '@/components/format-time'

/** A time label, built through an `@/` import that leaves the library set. */
export function timeLabel(seconds: number): string {
  return formatTime(seconds)
}
