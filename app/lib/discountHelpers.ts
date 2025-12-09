// app/lib/discountHelpers.ts

export function getActiveDiscount(product: any) {
  if (!product?.assignedDiscounts || product.assignedDiscounts.length === 0) {
    return null;
  }

  const now = new Date();

  return product.assignedDiscounts.find((d: any) => {
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);

    return (
      d.isActive &&
      !d.requiresCouponCode && // Only non-coupon discounts show badge
      now >= start &&
      now <= end
    );
  }) || null;
}

export function getProductDiscountPercent(product: any, basePrice?: number) {
  const active = getActiveDiscount(product);
  if (!active) return null;

  const price = basePrice ?? product.price;

  const percent = active.usePercentage
    ? active.discountPercentage
    : Math.round((active.discountAmount / price) * 100);

  return isNaN(percent) ? null : percent;
}
