// app/lib/discountHelpers.ts

/**
 * Returns active AUTO discount (non-coupon)
 */
export function getActiveDiscount(product: any) {
  if (!product?.assignedDiscounts?.length) return null;

  const now = new Date();

  return (
    product.assignedDiscounts.find((d: any) => {
      if (!d.isActive) return false;
      if (d.requiresCouponCode) return false;

      const start = new Date(d.startDate);
      const end = new Date(d.endDate);

      if (now < start || now > end) return false;

      // Valid discount
      if (d.usePercentage === true) {
        return typeof d.discountPercentage === "number" && d.discountPercentage > 0;
      }

      if (d.usePercentage === false) {
        return typeof d.discountAmount === "number" && d.discountAmount > 0;
      }

      return false;
    }) || null
  );
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
 * Returns final price after discount
 */
export function getDiscountedPrice(
  product: any,
  basePrice: number
): number {
  const discount = getActiveDiscount(product);
  if (!discount || basePrice <= 0) return basePrice;

  let final = basePrice;

  if (discount.usePercentage) {
    final = basePrice - (basePrice * discount.discountPercentage) / 100;
  } else {
    final = basePrice - discount.discountAmount;
  }

  return +(final < 0 ? 0 : final).toFixed(2);
}
