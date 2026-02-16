"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Trash2, GiftIcon, AwardIcon } from "lucide-react";
import { useToast } from "@/components/toast/CustomToast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProductOffersModal from "@/components/cart/ProductOffersModal";
import ConfirmRemoveModal from "@/components/ui/ConfirmRemoveModal";

export default function CartPage() {
  const toast = useToast();
  const { cart, updateQuantity, removeFromCart, updateCart, cartTotal } = useCart();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
useEffect(() => {
  console.log("CART VAT DEBUG:", cart.map(i => ({
    name: i.name,
    vatRate: i.vatRate,
    vatIncluded: i.vatIncluded,
  })));
}, [cart]);

 const handleCheckout = () => {
  const inStockItems = cart.filter(item => getItemStock(item) > 0);

  if (inStockItems.length === 0) {
    toast.error("All selected items are out of stock. Please remove them to continue.");
    return;
  }

  // Send only valid items to checkout
  updateCart(inStockItems);

  if (isAuthenticated) {
    sessionStorage.removeItem("buyNowItem");
router.push("/checkout");

  } else {
    router.push("/account?from=checkout");
  }
};
const [removeTarget, setRemoveTarget] = useState<any | null>(null);
  // Single input to try a coupon (applies to every eligible product)
  const [couponInput, setCouponInput] = useState("");
  const [offersItem, setOffersItem] = useState<any | null>(null);
// ⭐ Product Offers Modal state
const [showOffers, setShowOffers] = useState(false);
const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // map itemId->error for stock/qty UI (keeps your existing state shape)
  const [stockError, setStockError] = useState<{ [key: string]: string | null }>({});
  // -------------------------
  // Helpers: determine if discount object is valid now
  // -------------------------
  const isDiscountActive = (d: any) => {
    if (!d || !d.isActive) return false;
    try {
      const now = new Date();
      const start = d.startDate ? new Date(d.startDate) : null;
      const end = d.endDate ? new Date(d.endDate) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    } catch {
      return false;
    }
  };
// 🎁 Loyalty points per cart item
const getItemLoyaltyPoints = (item: any) => {
  const pd = item.productData;
  if (!pd || pd.excludeFromLoyaltyPoints) return 0;

  // variant priority
  if (item.variantId && pd.variants?.length) {
    const v = pd.variants.find((x: any) => x.id === item.variantId);
    if (v?.loyaltyPointsEarnable) {
      return v.loyaltyPointsEarnable;
    }
  }

  // product fallback
  if (pd.loyaltyPointsEarnable) {
    return pd.loyaltyPointsEarnable;
  }

  return 0;
};
  // -------------------------
  // BUILD list of available coupon-able discounts from cart (for UI hint)
  // -------------------------
  const availableCoupons = useMemo(() => {
    const map = new Map<string, { code: string; productIds: string[]; discount: any }>();
    cart.forEach((item) => {
      const pd = item.productData;
      const assigns: any[] = pd?.assignedDiscounts ?? [];
      for (const d of assigns) {
        if (!isDiscountActive(d)) continue;
        if (!d.requiresCouponCode) continue;
        if (!d.couponCode) continue;
        const code = d.couponCode.trim().toLowerCase();
        if (!map.has(code)) {
          map.set(code, { code, productIds: [item.id], discount: d });
        } else {
          map.get(code)!.productIds.push(item.id);
        }
      }
    });
    return Array.from(map.values());
  }, [cart]);

  const subtotalBeforeDiscount = useMemo(() => {
  return cart.reduce((sum, item) => {
    const base = item.priceBeforeDiscount ?? item.price;
    return sum + base * (item.quantity ?? 1);
  }, 0);
}, [cart]);
const totalDiscount = useMemo(() => {
  return cart.reduce(
    (sum, item) =>
      sum + (item.discountAmount ?? 0) * (item.quantity ?? 1),
    0
  );
}, [cart]);
const bundleSavings = useMemo(() => {
  return cart
    .filter(i => i.hasBundleDiscount)
    .reduce(
      (sum, i) => sum + (i.individualSavings ?? 0) * (i.quantity ?? 1),
      0
    );
}, [cart]);
const totalCombinedDiscount = bundleSavings + totalDiscount;

const applyCouponForItem = (item: any, code: string) => {
  const coupon = code.trim();
  if (!coupon) {
    toast.error("Enter a coupon code");
    return;
  }

  const assigns = item.productData?.assignedDiscounts ?? [];

  const match = assigns.find((d: any) => {
    if (!d.requiresCouponCode) return false;
    if (!isDiscountActive(d)) return false;
    return d.couponCode?.toLowerCase() === coupon.toLowerCase();
  });

  if (!match) {
    toast.error("Invalid coupon for this product");
    return;
  }

  const base = item.priceBeforeDiscount ?? item.price;

  let discount = match.usePercentage
    ? (base * match.discountPercentage) / 100
    : match.discountAmount ?? 0;

  if (match.maximumDiscountAmount && discount > match.maximumDiscountAmount) {
    discount = match.maximumDiscountAmount;
  }

  const updated = cart.map((ci) =>
    ci.id === item.id && ci.type === item.type
      ? {
          ...ci,
          appliedDiscountId: match.id,
          couponCode: coupon,
          discountAmount: discount,
          finalPrice: +(base - discount).toFixed(2),
        }
      : ci
  );

  updateCart(updated);
  toast.success("Coupon applied successfully");
};

  // -------------------------
  // APPLY COUPON (global input) -> applies to each item that has a matching assignedDiscount
  // -------------------------
 const applyCouponInput = () => {
  const code = couponInput.trim();
  if (!code) {
    toast.error("Enter a coupon code.");
    return;
  }

  let appliedAny = false;

  const updated = cart.map((item) => {
    // ❌ subscription pe coupon nahi
    if (item.type === "subscription") return item;

    const assigns: any[] = item.productData?.assignedDiscounts ?? [];

    const match = assigns.find((d: any) => {
      if (!d || !d.requiresCouponCode) return false;
      if (!isDiscountActive(d)) return false;
      if (!d.couponCode) return false;
      return d.couponCode.trim().toLowerCase() === code.toLowerCase();
    });

    if (!match) return item;

    // ❌ same coupon dubara apply na ho
    if (
      item.appliedDiscountId === match.id &&
      item.couponCode?.toLowerCase() === code.toLowerCase()
    ) {
      return item;
    }

    const basePrice = item.priceBeforeDiscount ?? item.price;

    let discountValue = match.usePercentage
      ? (basePrice * match.discountPercentage) / 100
      : match.discountAmount ?? 0;

    if (
      match.maximumDiscountAmount &&
      discountValue > match.maximumDiscountAmount
    ) {
      discountValue = match.maximumDiscountAmount;
    }

    appliedAny = true;

    return {
      ...item,
      appliedDiscountId: match.id,
      discountAmount: discountValue,
      finalPrice: +(basePrice - discountValue).toFixed(2),
      couponCode: code,
      priceBeforeDiscount: item.priceBeforeDiscount ?? item.price,
    };
  });

  if (!appliedAny) {
    toast.error("This coupon is not valid for any product in your cart.");
    return;
  }

  updateCart(updated);
  setCouponInput("");
  toast.success("Coupon applied to eligible items.");
};


  // -------------------------
  // Remove coupon only from a single item
  // -------------------------
  const removeCouponFromItem = (itemId: string, itemType?: string) => {
    const updated = cart.map((item) => {
      if (!(item.id === itemId && (item.type ?? "one-time") === (itemType ?? item.type ?? "one-time"))) {
        return item;
      }

      return {
        ...item,
        appliedDiscountId: null,
        discountAmount: 0,
        finalPrice: item.priceBeforeDiscount ?? item.price,
        couponCode: null,
      };
    });

    updateCart(updated);
    toast.success("Coupon removed from item.");
  };
// 🎁 TOTAL LOYALTY POINTS (ORDER LEVEL)
// 🎁 TOTAL LOYALTY POINTS (PER PRODUCT LINE)
const totalLoyaltyPoints = useMemo(() => {
  return cart.reduce((sum, item) => {
    const pts = getItemLoyaltyPoints(item);
    if (!pts) return sum;
    return sum + pts; // ❗ no quantity multiplication
  }, 0);
}, [cart]);



  // -------------------------
  // Group applied coupons for right side UI
  // -------------------------
  const groupedApplied = useMemo(() => {
    const map = new Map<string, { code: string; items: { id: string; name: string; amount: number }[]; totalDiscount: number }>();
    cart.forEach((item) => {
      const code = item.couponCode ?? null;
      if (!code) return;
      const key = code.toLowerCase();
      const amount = item.discountAmount ?? 0;
      if (!map.has(key)) {
        map.set(key, { code, items: [{ id: item.id, name: item.name, amount }], totalDiscount: amount });
      } else {
        const entry = map.get(key)!;
        entry.items.push({ id: item.id, name: item.name, amount });
        entry.totalDiscount += amount;
      }
    });
    return Array.from(map.values());
  }, [cart]);
const getItemStock = (item: any) => {
  // Variant stock check
  if (item.variantId) {
    const variant = item.productData?.variants?.find(
      (v: any) => v.id === item.variantId
    );

    if (variant && typeof variant.stockQuantity === "number") {
      return variant.stockQuantity;
    }
  }

  // Product stock check
  if (
    item.productData &&
    typeof item.productData.stockQuantity === "number"
  ) {
    return item.productData.stockQuantity;
  }

  // ❗Safety fallback — always high value, not zero
  return 9999;
};

// ================= BUNDLE HELPERS =================
const isBundleParent = (item: any) => Boolean(item.isBundleParent && item.bundleId);
const isBundleChild = (item: any) => Boolean(item.bundleParentId);

const getBundleChildren = (bundleId: string) =>
  cart.filter((i) => i.bundleParentId === bundleId);


// 🔥 BUNDLE MAX QTY (GROUPED MIN STOCK)
const getBundleMaxQty = (bundleParent: any, bundleChildren: any[]) => {
  if (!bundleParent || !bundleChildren.length) return Infinity;

  // main product stock
  const mainStock = getItemStock(bundleParent);

  // grouped products min stock
  const groupedMinStock = Math.min(
    ...bundleChildren.map((c) => getItemStock(c))
  );

  return Math.min(mainStock, groupedMinStock);
};
// 🔹 Count only visible purchasable items (exclude bundle children)
const purchasableItemCount = useMemo(() => {
  return cart.filter(
    (i) => !isBundleChild(i)
  ).length;
}, [cart]);
// ================= GROUPED PRODUCTS UI HELPERS =================
const isGroupedChild = (item: any) => Boolean(item.parentProductId);

const getGroupedItems = (parentProductId?: string) => {
  if (!parentProductId) return [];
  return cart.filter(
    (i) => i.parentProductId === parentProductId
  );
};
const orderVatAmount = useMemo(() => {
  return cart.reduce((sum, item) => {
    const rate =
      typeof item.vatRate === "number" ? item.vatRate : 0;

    // line total (VAT inclusive)
    const lineTotal =
      (item.finalPrice ?? item.price) * (item.quantity ?? 1);

    if (rate <= 0) return sum;

    // VAT-inclusive formula
    const vat = (lineTotal * rate) / (100 + rate);
    return sum + vat;
  }, 0);
}, [cart]);

const getAllowedQtyArray = (item: any): number[] => {
  const allowed: string | undefined =
    item.productData?.allowedQuantities;

  if (!allowed) return [];

  const stock: number = getItemStock(item);

  return allowed
    .split(",")
    .map((q: string) => Number(q.trim()))
    .filter(
      (q: number) =>
        !isNaN(q) &&
        q > 0 &&
        q <= stock
    )
    .sort((a: number, b: number) => a - b);
};


  // UI render
  // -------------------------
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-gray-600">
        <div className="relative">
          <svg width="240" height="240" viewBox="0 0 24 24" stroke="#9aa1ab" fill="none" strokeWidth="1.4" className="opacity-80 drop-shadow">
            <circle cx="12" cy="12" r="11" fill="#f5f6f7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 6h2l1.5 9h10l2-6H6M8 17.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
          </svg>
        </div>

        <p className="text-xl font-semibold text-gray-700 mt-6">Your cart is empty</p>

        <Link href="/" className="mt-4 bg-[#445D41] text-white px-6 py-2 rounded-lg hover:bg-black transition-all">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Shopping Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: items */}
        <div className="lg:col-span-2 space-y-4">
        {cart.map((item) => {
  // ❌ bundle child direct render nahi hoga
  if (isBundleChild(item)) return null;

  const bundleChildren = isBundleParent(item)
    ? item.bundleId ? getBundleChildren(item.bundleId) : []

    : [];


  return (
    <React.Fragment
      key={item.id + (item.variantId ?? "") + (item.type ?? "")}
    >

            <div key={item.id + (item.variantId ?? "") + (item.type ?? "")} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 shadow-sm">
           <div className="relative w-24 h-24 flex-shrink-0">
  <Link href={`/products/${item.slug}`}>

    <img
      src={item.image}
      alt="no image"
      className="w-24 h-24 object-cover rounded-md border bg-gray-50"
    />
 

  </Link>

  {/* Remove icon */}
 <button
  onClick={() => {
    setRemoveTarget({
      item,
      bundleChildren,
    });
  }}
  className="absolute -top-2 -left-2 bg-white border border-gray-200 rounded-full p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 shadow-sm transition" aria-label="Remove item" >
  <Trash2 size={18} />
</button>
</div>
<div className="flex flex-col flex-1">
  <div className="flex items-start justify-between">
    <div>
      <Link href={`/products/${item.slug}`}>

       <h2 className="font-semibold text-gray-900 leading-tight 
               line-clamp-2 max-w-[430px]">
  {item.name}
</h2>
      </Link>
                    {getItemStock(item) === 0 && (
  <p className="text-red-600 text-xs font-semibold mt-1">
    Out of Stock — Please remove this item
  </p>
)}
                    {item.type === "subscription" && (
                      <p className="text-xs font-semibold text-indigo-600 mt-1">
                        Subscription • Every {item.frequency ?? ""} {item.frequencyPeriod ?? ""} • {item.subscriptionTotalCycles ?? ""} Cycles
                      </p>
                    )}
                  </div>
           <div className="flex items-center justify-end gap-2 text-right">
  {/* Price */}
  <p className="text-gray-800 font-semibold">
    £{((item.finalPrice ?? item.price) * (item.quantity ?? 1)).toFixed(2)}
  </p>

  {/* % OFF badge */}
  {(item.discountAmount ?? 0) > 0 && (
    <span className="text-[12px] font-semibold text-green-700">
      (
      {Math.round(
        ((item.discountAmount ?? 0) /
          (item.priceBeforeDiscount ?? item.price)) *
          100
      )}
      % OFF)
    </span>
  )}
</div>
                </div>

                {/* VARIANT / SKU / small meta could go here */}

                {/* Coupon pill (per item) */}
                <div className="mt-1 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Quantity + Saved row */}
<div className="flex items-center gap-3">
  {/* Quantity controls */}
 {(() => {
  const allowedQtyArray = getAllowedQtyArray(item);

  // 🔥 IF ALLOWED QUANTITIES EXIST → DROPDOWN
  if (allowedQtyArray.length > 0) {
    return (
      <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
        <select
          value={item.quantity}
          onChange={(e) => {
            const val = Number(e.target.value);

            updateQuantity(item.id, val);

            // 🔥 bundle sync
            if (item.isBundleParent && item.bundleId) {
              bundleChildren.forEach((c) =>
                updateQuantity(c.id, val)
              );
            }
          }}
          className="outline-none bg-transparent font-medium"
        >
          {allowedQtyArray.map((qty: number) => (
            <option key={qty} value={qty}>
              {qty}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // 🔥 OTHERWISE → EXISTING LOGIC SAME
  return (
    <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
      {(item.quantity ?? 1) === 1 ? (
        <button
          onClick={() =>
            setRemoveTarget({ item, bundleChildren })
          }
          className="text-black hover:text-red-600 w-6 flex justify-center"
        >
          <Trash2 size={16} />
        </button>
      ) : (
        <button
          onClick={() => {
            const minQty =
              item.productData?.orderMinimumQuantity ?? 1;

            if ((item.quantity ?? 1) <= minQty) {
              toast.error(
                `Minimum order quantity is ${minQty}`
              );
              return;
            }

            const newQty = (item.quantity ?? 1) - 1;
            updateQuantity(item.id, newQty);

            if (
              item.isBundleParent &&
              item.bundleId
            ) {
              bundleChildren.forEach((c) =>
                updateQuantity(c.id, newQty)
              );
            }
          }}
          className="text-gray-700 font-bold text-lg w-6 text-center"
        >
          -
        </button>
      )}

      <input
        type="number"
        className="w-12 text-center outline-none font-medium"
        value={item.quantity}
        onChange={(e) => {
          let val = parseInt(e.target.value || "1", 10);
          if (val < 1) return;

          updateQuantity(item.id, val);

          if (
            item.isBundleParent &&
            item.bundleId
          ) {
            bundleChildren.forEach((c) =>
              updateQuantity(c.id, val)
            );
          }
        }}
      />

      <button
        onClick={() => {
          let newQty = (item.quantity ?? 1) + 1;
          updateQuantity(item.id, newQty);

          if (
            item.isBundleParent &&
            item.bundleId
          ) {
            bundleChildren.forEach((c) =>
              updateQuantity(c.id, newQty)
            );
          }
        }}
        className="text-gray-700 font-bold text-lg w-6 text-center"
      >
        +
      </button>
    </div>
  );
})()}

</div>
                    {/* applied coupon badge */}
                    {item.couponCode ? (
                      <div className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        <span>Coupon Code:</span>
                        <span className="font-medium">{item.couponCode}</span>
                        <button
                          onClick={() => removeCouponFromItem(item.id, item.type)}
                          className="ml-2 text-red-600 underline text-xs"
                        >
                          Remove Coupon
                        </button>
                      </div>
                    ) : (
                      // show small hint if available coupons include this product (non-blocking)
                      <div className="text-xs text-green-500">
                       {availableCoupons.some((c) => c.productIds.includes(item.id)) && (
<button
  onClick={() => {
    setSelectedItem(item);
    setShowOffers(true);
  }}
  className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:underline"
>
  <GiftIcon className="h-6 w-6" />
  <span>Click here to apply coupons</span>
</button>

)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-[-20px]">
                    {/* <button onClick={() => removeFromCart(item.id, item.type)} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium">
                      <Trash2 size={16} /> Remove
                    </button> */}

  
  {getItemLoyaltyPoints(item) > 0 && (
  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-0.5 py-0.5 rounded-md">
    <AwardIcon className="h-4 w-4 text-green-600" />
   Earn {getItemLoyaltyPoints(item)} points

  </div>
)}
 {item.shipSeparately === true && purchasableItemCount > 1 && (
    <div className="inline-flex items-center gap-1.5 text-[13px]
      text-amber-700 bg-amber-50 border border-amber-200
      px-2 py-0.5 rounded-md font-medium w-fit">
      📦 This item will be shipped separately
    </div>
  )}
                    {stockError[item.id] && <p className="text-red-600 text-xs">{stockError[item.id]}</p>}
                  </div>
                </div>
              </div>
            </div>
            {/* 🔥 GROUPED PRODUCTS (NESTED) */}
{bundleChildren.length > 0 && (
  <div className="mt-3 ml-6 border-l-2 border-dashed border-gray-300 pl-4 space-y-3">
{/* 🔥 SINGLE GROUP REMOVE BUTTON (TOP-LEFT) */}
{!item.productData?.automaticallyAddProducts && (
  <div className="mb-2">
    
  </div>
)}
    {bundleChildren.map((gp: any) => (
      <div
        key={gp.id}
        className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
      >
        <div className="flex items-center gap-3">
          <Link
  href={`/products/${gp.slug}`}
  className="flex items-center gap-3 group"
>
          <img
            src={gp.image}
            alt={"no img"}
            className="w-16 h-16 object-cover rounded border"
          />
</Link>
          <div>
            <Link href={`/products/${gp.slug}`}>
           <p className="text-sm font-semibold text-gray-800 
              line-clamp-2 max-w-[220px]">
  {gp.name}
</p>

</Link>
           <div className="flex flex-col">
  {/* 🔥 BUNDLE PRICE */}
 {gp.hasBundleDiscount ? (
  <>
   
    {/* FINAL PRICE + SAVING */}
    <div className="flex items-center gap-2">
      <p className="text-sm font-semibold text-green-700">
        £{(gp.price * gp.quantity).toFixed(2)}
      </p>

      {(gp.individualSavings ?? 0) > 0 && (
        <span className="text-[11px] text-green-600 whitespace-nowrap">
          (You save £{(gp.individualSavings * gp.quantity).toFixed(2)})
        </span>
      )}
    </div>
  </>
) : (
  <p className="text-sm font-semibold text-gray-800">
    £{(gp.price * gp.quantity).toFixed(2)}
  </p>
)}

</div>

          </div>
        </div>
<div className="flex flex-col items-end">
  <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-gray-100">
    <span className="text-sm font-semibold text-gray-800">
      Qty: {gp.quantity}
    </span>
  </div>

  <span className="text-[11px] text-gray-500 mt-1">
    Quantity matches main product
  </span>
</div>

       
      </div>
    ))}
  </div>
)}

             </React.Fragment>
  );
})}

        </div>

        {/* RIGHT: order summary + coupon input */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-md p-2 sticky top-24">
            {/* Inline coupon input */}
            <div className="border border-gray-300 rounded-lg p-4 mb-2">
              <h3 className="text-sm font-semibold mb-2">Apply Coupon</h3>

              <div className="flex gap-1">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 border px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#445D41]"
                />
                <button onClick={applyCouponInput} className="bg-[#445D41] text-white px-4 py-2 rounded-lg text-sm">
                  Apply
                </button>
              </div>

             
            </div>
            {totalLoyaltyPoints > 0 && (
  <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg mb-3">
    <div className="flex items-center gap-2">
      
      <span>🎁Total Loyalty Points</span>
    </div>
    <span className="font-semibold">
      {totalLoyaltyPoints} points
    </span>
  </div>
)}

            {/* Price details */}
            <h3 className="text-lg font-semibold mb-3">Price Details</h3>
            <div className="space-y-2 text-sm">
          <div className="flex justify-between">
  <span>Subtotal</span>
  <span>£{subtotalBeforeDiscount.toFixed(2)}</span>
</div>
<div className="flex justify-between">
  <span>Includes VAT</span>
  <span>£{orderVatAmount.toFixed(2)}</span>
</div>
{bundleSavings > 0 && (
  <div className="flex justify-between text-green-700">
    <span>Bundle Savings</span>
    <span>- £{bundleSavings.toFixed(2)}</span>
  </div>
)}

{totalDiscount > 0 && (
  <div className="flex justify-between text-green-600">
    <span>Discount</span>
    <span>- £{totalDiscount.toFixed(2)}</span>
  </div>
)}

{/* 🔥 TOTAL DISCOUNT (NEW LINE) */}
{totalCombinedDiscount > 0 && (
  <div className="flex justify-between text-green-800 font-semibold border-t pt-2 mt-1">
    <span>Total Discount</span>
    <span>- £{totalCombinedDiscount.toFixed(2)}</span>
  </div>
)}
              <div className="flex justify-between font-semibold text-gray-900 border-t pt-3">
                <span>Total Amount</span>
                <span>£{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleCheckout} className="w-full mt-5 bg-[#445D41] hover:bg-black text-white py-3 rounded-xl font-semibold text-sm shadow-md">
              Proceed to Checkout
            </button>
        {showOffers && selectedItem && (
  <ProductOffersModal
    item={selectedItem}
    onClose={() => {
      setShowOffers(false);
      setSelectedItem(null);
    }}
    onApply={(code) => applyCouponForItem(selectedItem, code)}
    isDiscountActive={isDiscountActive}
  />
)}
<ConfirmRemoveModal
  open={!!removeTarget}
  title="Remove item from cart?"
  description="This item will be permanently removed from your shopping bag."
  onCancel={() => setRemoveTarget(null)}
  onConfirm={() => {
    if (!removeTarget) return;

    const { item, bundleChildren } = removeTarget;

    // 🔥 bundle parent → remove children first
    if (
      item.isBundleParent === true &&
      item.purchaseContext === "bundle" &&
      item.bundleId
    ) {
      bundleChildren.forEach((c: any) =>
        removeFromCart(c.id, c.type)
      );
    }

    removeFromCart(item.id, item.type);

    setRemoveTarget(null);
    toast.success("Item removed from cart");
  }}
/>

          </div>
        </div>
      </div>
    </div>
    
  );
}
