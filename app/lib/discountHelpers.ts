// app/lib/discountHelpers.ts

/**
 * Computes the effective discount amount for a single discount against a base price.
 * Mirrors backend PriceDisplayHelper.CalculateSystemDiscountAmount:
 *  - percentage => basePrice * (pct / 100)
 *  - flat       => discountAmount
 *  - then capped by MaximumDiscountAmount (if set)
 * Returns 0 when the discount is not applicable.
 */
function computeDiscountAmount(d: any, basePrice: number): number {
  if (!d || basePrice <= 0) return 0;

  let amount = 0;

  if (d.usePercentage === true) {
    if (typeof d.discountPercentage === "number" && d.discountPercentage > 0) {
      amount = (basePrice * d.discountPercentage) / 100;
    }
  } else if (d.usePercentage === false) {
    if (typeof d.discountAmount === "number" && d.discountAmount > 0) {
      amount = d.discountAmount;
    }
  }

  if (amount <= 0) return 0;

  // MaximumDiscountAmount cap — matches backend
  if (
    typeof d.maximumDiscountAmount === "number" &&
    d.maximumDiscountAmount > 0 &&
    amount > d.maximumDiscountAmount
  ) {
    amount = d.maximumDiscountAmount;
  }

  // Never discount more than the price itself
  if (amount > basePrice) amount = basePrice;

  return amount;
}

/**
 * Returns the BEST active AUTO discount (non-coupon) for a base price.
 * Mirrors backend: picks the discount producing the HIGHEST effective amount
 * (NOT the first match). basePrice defaults to product.price for badge usage.
 */
export function getActiveDiscount(product: any, basePrice?: number) {
  if (!product?.assignedDiscounts?.length) return null;

  const price =
    typeof basePrice === "number" && basePrice > 0
      ? basePrice
      : typeof product.price === "number"
      ? product.price
      : 0;

  if (price <= 0) return null;

  const now = new Date();

  let best: any = null;
  let bestAmount = 0;

  for (const d of product.assignedDiscounts) {
    if (!d.isActive) continue;
    if (d.requiresCouponCode) continue;
    if (d.startDate && now < new Date(d.startDate)) continue;
    if (d.endDate && now > new Date(d.endDate)) continue;

    const amount = computeDiscountAmount(d, price);
    if (amount <= 0) continue;

    if (amount > bestAmount) {
      bestAmount = amount;
      best = d;
    }
  }

  return best;
}

/**
 * Returns badge display info
 * - percentage discount → { type: "percent", value: 20 }
 * - flat discount → { type: "amount", value: 500 }
 */
export function getDiscountBadge(product: any) {
  const discount = getActiveDiscount(product);
  if (!discount) return null;

  if (discount.usePercentage) {
    return {
      type: "percent" as const,
      value: discount.discountPercentage,
    };
  }

  return {
    type: "amount" as const,
    value: discount.discountAmount,
  };
}

/**
 * Returns final price after discount.
 * Picks the BEST discount for this base price and applies the
 * MaximumDiscountAmount cap, matching the backend order price exactly.
 */
export function getDiscountedPrice(
  product: any,
  basePrice: number
): number {
  if (basePrice <= 0) return basePrice;

  const discount = getActiveDiscount(product, basePrice);
  if (!discount) return basePrice;

  const amount = computeDiscountAmount(discount, basePrice);
  if (amount <= 0) return basePrice;

  const final = basePrice - amount;
  return +(final < 0 ? 0 : final).toFixed(2);
}
