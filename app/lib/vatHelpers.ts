export function getVatRate(
  vatRates: any[],
  vatRateId: string | null | undefined,
  vatExempt?: boolean
) {
  if (vatExempt) return 0;
  if (!vatRateId || !vatRates) return null;

  const rate = vatRates.find((r: any) => r.id === vatRateId)?.rate;
  return rate ?? null;
}
