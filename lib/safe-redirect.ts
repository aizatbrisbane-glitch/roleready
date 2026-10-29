/**
 * Returns true only for same-origin relative paths.
 * Accepts "/", "/path", "/path?q=v". Rejects null/undefined/empty,
 * absolute URLs (https://...), and protocol-relative URLs (//...).
 */
export function isSafeRedirect(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}
