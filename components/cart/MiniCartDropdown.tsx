"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/CustomToast";
import { getOrderSummaryPricing } from "@/utils/pricing";
import ConfirmRemoveModal from "@/components/ui/ConfirmRemoveModal";

function formatCurrency(n = 0) {
  return `£${n.toFixed(2)}`;
}

export default function MiniCartDropdown({ onClose }: { onClose: () => void }) {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Variant-level min/max/stock override the product-level default when set —
  // same resolution order as the full cart page's getItemMinQty/getItemMaxQty/getItemStock.
  const getItemVariant = (item: (typeof cart)[number]) => {
    if (item.variantId && item.productData?.variants?.length) {
      return item.productData.variants.find((v: any) => v.id === item.variantId) ?? null;
    }
    return null;
  };
  const getItemMinQty = (item: (typeof cart)[number]) =>
    getItemVariant(item)?.orderMinimumQuantity ?? item.productData?.orderMinimumQuantity ?? 1;
  const getItemMaxQty = (item: (typeof cart)[number]) =>
    getItemVariant(item)?.orderMaximumQuantity ?? item.productData?.orderMaximumQuantity ?? Infinity;
  const getItemStock = (item: (typeof cart)[number]) => {
    const variant = getItemVariant(item);
    if (variant && typeof variant.stockQuantity === "number") return variant.stockQuantity;
    if (item.productData && typeof item.productData.stockQuantity === "number") return item.productData.stockQuantity;
    return 9999; // safety fallback — always high, not zero
  };

  // Same threshold logic as the full cart page — highest "standard" free-shipping
  // threshold across the products actually in the basket (0 = no threshold configured).
  const freeShippingThreshold = useMemo(() => {
    let threshold = 0;
    for (const item of cart) {
      if (item.productData) {
        if (item.productData?.productType === "variable" && item.variantId && item.productData.variants?.length) {
          const v = item.productData.variants.find((x: any) => x.id === item.variantId);
          if (v) {
            const standardThresh = v.freeShippingThresholds?.find((t: any) => t.name === "standard")?.threshold ?? v.freeShippingThreshold;
            if (standardThresh && standardThresh > 0) threshold = Math.max(threshold, standardThresh);
          }
        }
        const pdStandardThresh = item.productData.freeShippingThresholds?.find((t: any) => t.name === "standard")?.threshold ?? item.productData.freeShippingThreshold;
        if (pdStandardThresh && pdStandardThresh > 0) threshold = Math.max(threshold, pdStandardThresh);
      }
    }
    return threshold;
  }, [cart]);

  // Same pricing breakdown as the full cart page (Subtotal/VAT/Discount/Total) —
  // kept in sync here so the discount details are visible from the dropdown too,
  // not just after navigating to /cart.
  const oldPriceSummary = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const pricing = getOrderSummaryPricing({
          price: item.price,
          oldPrice: item.oldPrice ?? item.productData?.oldPrice,
          quantity: item.quantity ?? 1,
          hasDiscount: item.displayDiscountType === "System",
        });
        acc.discount += pricing.discount;
        return acc;
      },
      { discount: 0 }
    );
  }, [cart]);

  const totalDiscount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discountAmount ?? 0) * (item.quantity ?? 1), 0),
    [cart]
  );

  const bundleSavings = useMemo(
    () =>
      cart
        .filter((i) => i.hasBundleDiscount)
        .reduce((sum, i) => sum + (i.individualSavings ?? 0) * (i.quantity ?? 1), 0),
    [cart]
  );

  const finalDiscount = totalDiscount + oldPriceSummary.discount;
  const totalCombinedDiscount = bundleSavings + finalDiscount;

  const correctSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const qty = item.quantity ?? 1;

      // Coupon discount takes priority — finalPrice + discountAmount reconstructs
      // the pre-coupon price reliably both before and after a page refresh.
      if (item.couponCode && (item.discountAmount ?? 0) > 0) {
        const preCouponPrice = (item.finalPrice ?? item.price) + (item.discountAmount ?? 0);
        return sum + preCouponPrice * qty;
      }

      if (item.displayDiscountType === "System") {
        const base = item.price + (item.discountAmount ?? 0);
        return sum + base * qty;
      }

      const oldPrice = item.oldPrice ?? item.productData?.oldPrice;
      const basePrice = item.price;
      if (item.displayDiscountType === "OldPrice" && oldPrice && oldPrice > basePrice) {
        return sum + oldPrice * qty;
      }

      return sum + basePrice * qty;
    }, 0);
  }, [cart]);

  const orderVatAmount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const rate = typeof item.vatRate === "number" ? item.vatRate : 0;
      if (rate <= 0) return sum;
      const lineTotal = (item.finalPrice ?? item.price) * (item.quantity ?? 1);
      return sum + (lineTotal * rate) / (100 + rate);
    }, 0);
  }, [cart]);

  const finalTotalAmount = correctSubtotal - totalCombinedDiscount;

  const remaining = Math.max(0, freeShippingThreshold - finalTotalAmount);

  // Per-item original (pre-discount) vs final line total — same priority order as
  // correctSubtotal above (coupon > system discount > old price > none).
  const getItemLineTotals = (item: (typeof cart)[number]) => {
    const qty = item.quantity ?? 1;
    const finalTotal = (item.finalPrice ?? item.price) * qty;

    if (item.couponCode && (item.discountAmount ?? 0) > 0) {
      return { original: ((item.finalPrice ?? item.price) + (item.discountAmount ?? 0)) * qty, final: finalTotal };
    }
    if (item.displayDiscountType === "System") {
      return { original: (item.price + (item.discountAmount ?? 0)) * qty, final: finalTotal };
    }
    const oldPrice = item.oldPrice ?? item.productData?.oldPrice;
    if (item.displayDiscountType === "OldPrice" && oldPrice && oldPrice > item.price) {
      return { original: oldPrice * qty, final: finalTotal };
    }
    return { original: finalTotal, final: finalTotal };
  };

  const goTo = (path: string) => {
    onClose();
    router.push(path);
  };

  // Same gate as the full cart page: logged-in customers go straight to checkout,
  // guests go through the login-or-continue-as-guest step first.
  const goToCheckout = () => goTo(isAuthenticated ? "/checkout" : "/account?from=checkout");

  return (
    <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[92vw] bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] flex flex-col max-h-[80vh] text-gray-900">
      {/* Free-delivery message + actions */}
      <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        {freeShippingThreshold > 0 ? (
          remaining > 0 ? (
            <div className="text-xs text-gray-700 leading-tight">
              <span className="font-semibold text-red-600">Spend {formatCurrency(remaining)} more</span> for{" "}
              <span className="font-semibold">FREE delivery</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <Truck size={14} /> You've unlocked FREE delivery!
            </div>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => goTo("/cart")}
            className="px-3 py-1.5 text-xs font-semibold border border-[#445D41] text-[#445D41] rounded-md hover:bg-[#445D41]/5 transition"
          >
            View Basket
          </button>
          <button
            onClick={goToCheckout}
            disabled={cart.length === 0}
            className="px-3 py-1.5 text-xs font-semibold bg-[#445D41] text-white rounded-md hover:bg-[#374d34] transition disabled:opacity-50 disabled:hover:bg-[#445D41]"
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="overflow-y-auto flex-1">
        {cart.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            <ShoppingBag className="mx-auto mb-2 text-gray-300" size={32} />
            Your basket is empty
          </div>
        ) : (
          cart.map((item) => {
            const { original, final } = getItemLineTotals(item);
            const hasItemDiscount = original > final + 0.001;
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0">
                <Link href={`/product/${item.slug}`} onClick={onClose} className="flex-shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="rounded object-contain border border-gray-100 w-10 h-10"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={onClose}
                    className="text-xs font-medium text-gray-800 hover:text-[#445D41] line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <div className="text-xs mt-0.5">
                    {hasItemDiscount && (
                      <span className="text-gray-400 line-through mr-1.5">{formatCurrency(original)}</span>
                    )}
                    <span className="font-semibold text-gray-900">{formatCurrency(final)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      const minQty = getItemMinQty(item);
                      if (item.quantity <= minQty) {
                        toast.error(`Minimum order quantity is ${minQty}`);
                        return;
                      }
                      updateQuantity(item.id, item.quantity - 1);
                    }}
                    aria-label="Decrease quantity"
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                      const maxQty = getItemMaxQty(item);
                      const stock = getItemStock(item);
                      const limit = Math.min(maxQty, stock);
                      if (item.quantity >= limit) {
                        toast.error(`You can add only ${limit} Quantity in your cart.`);
                        return;
                      }
                      updateQuantity(item.id, item.quantity + 1);
                    }}
                    aria-label="Increase quantity"
                    className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id, item.type)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Price breakdown + footer */}
      {cart.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-700">
            <span>Subtotal (Incl. VAT)</span>
            <span>{formatCurrency(correctSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-700">
            <span>VAT</span>
            <span>{formatCurrency(orderVatAmount)}</span>
          </div>
          {totalCombinedDiscount > 0 && (
            <div className="flex items-center justify-between text-xs text-green-600">
              <span>Discount</span>
              <span>- {formatCurrency(totalCombinedDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-1">
            <span>Total Amount</span>
            <span>{formatCurrency(finalTotalAmount)}</span>
          </div>

          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition pt-1"
          >
            <Trash2 size={14} /> Empty Basket
          </button>
        </div>
      )}

      {/* Empty Basket Confirmation Modal */}
      <ConfirmRemoveModal
        open={showEmptyConfirm}
        title="Empty Basket"
        description="Are you sure you want to remove all items from your basket?"
        onConfirm={() => {
          cart.forEach((i) => removeFromCart(i.id, i.type));
          setShowEmptyConfirm(false);
        }}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </div>
  );
}
