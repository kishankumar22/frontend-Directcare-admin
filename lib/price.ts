export function normalizePrice(
  ...values: Array<number | null | undefined>
): number | null {
  for (const v of values) {
    if (typeof v === "number" && !Number.isNaN(v)) {
      return v;
    }
  }
  return null;
}
