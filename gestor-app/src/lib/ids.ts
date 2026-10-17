/**
 * Generador de ids compatibles con el mock (`prefix_hex`).
 */
export function createId(prefix: string): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${prefix}_${hex}`;
}
