/**
 * Minimal class-name joiner. Deliberately dependency-free — this app styles
 * with plain Tailwind, so there is no clsx/tailwind-merge to lean on. Order
 * matters: later classes win, so pass overrides last.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
