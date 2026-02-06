"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Trash2, GiftIcon } from "lucide-react";
import { useToast } from "@/components/toast/CustomToast";
import { useAuth } from "@/app/admin/_context/AuthContext";
import { useRouter } from "next/navigation";
import ProductOffersModal from "@/components/cart/ProductOffersModal";


export default function CartPage() {
  const toast = useToast();
  const { cart, updateQuantity, removeFromCart, updateCart, cartTotal } = useCart();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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

// ================= GROUPED PRODUCTS UI HELPERS =================
const isGroupedChild = (item: any) => Boolean(item.parentProductId);

const getGroupedItems = (parentProductId?: string) => {
  if (!parentProductId) return [];
  return cart.filter(
    (i) => i.parentProductId === parentProductId
  );
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
  <Link href={`/products/${item.productData?.slug}`}>
    <img
      src={item.image}
      alt="no image"
      className="w-24 h-24 object-cover rounded-md border bg-gray-50"
    />
  </Link>

  {/* Remove icon */}
  <button
  onClick={() => {
    // 🔥 remove bundle parent + children
   if (
  item.isBundleParent === true &&
  item.purchaseContext === "bundle" &&
  item.bundleId
) {

      bundleChildren.forEach((c) =>
        removeFromCart(c.id, c.type)
      );
    }
    removeFromCart(item.id, item.type);
  }}
    className="absolute -top-2 -left-2 bg-white border border-gray-200 
               rounded-full p-1.5 text-red-500 
               hover:bg-red-50 hover:text-red-600
               shadow-sm transition"
    aria-label="Remove item"
  >
    <Trash2 size={14} />
  </button>
</div>


<div className="flex flex-col flex-1">
  <div className="flex items-start justify-between">
    <div>
      <Link href={`/products/${item.productData?.slug}`}>
       <h2 className="font-semibold text-gray-900 leading-tight 
               line-clamp-2 max-w-[500px]">
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
                        Subscription • Every {item.frequency ?? ""} {item.frequencyPeriod ?? ""} • {item.subscriptionTotalCycles ?? ""}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-gray-800 font-semibold">
                      £{((item.finalPrice ?? item.price) * (item.quantity ?? 1)).toFixed(2)}
                    </p>
                    {/* {(item.discountAmount ?? 0) > 0 && <p className="text-xs text-green-600 font-medium">Saved £{((item.discountAmount ?? 0) * (item.quantity ?? 1)).toFixed(2)}</p>} */}
                  </div>
                </div>

                {/* VARIANT / SKU / small meta could go here */}

                {/* Coupon pill (per item) */}
                <div className="mt-1 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Quantity + Saved row */}
<div className="flex items-center gap-3">
  {/* Quantity controls */}
  <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
  <button
    onClick={() => {
      const newQty = Math.max(1, (item.quantity ?? 1) - 1);
      updateQuantity(item.id, newQty);

      // 🔥 sync children
      if (
  item.isBundleParent === true &&
  item.purchaseContext === "bundle" &&
  item.bundleId
) {
  bundleChildren.forEach((c) =>
    updateQuantity(c.id, newQty)
  );
}

    }}
    disabled={(item.quantity ?? 1) <= 1}
    className="text-gray-700 font-bold text-lg w-6 text-center"
  >
    -
  </button>

  <input
    type="number"
    className="w-12 text-center outline-none font-medium"
    value={item.quantity}
    onChange={(e) => {
     let val = parseInt(e.target.value || "1", 10);
if (val < 1) return;

if (isBundleParent(item)) {
  const maxQty = getBundleMaxQty(item, bundleChildren);
  if (val > maxQty) {
    toast.error(
      `Maximum allowed quantity is ${maxQty} due to grouped product stock`
    );
    val = maxQty;
  }
}

updateQuantity(item.id, val);

if (item.isBundleParent && item.bundleId) {
  bundleChildren.forEach((c) =>
    updateQuantity(c.id, val)
  );
}


     if (
  item.isBundleParent === true &&
  item.purchaseContext === "bundle" &&
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

  if (isBundleParent(item)) {
    const maxQty = getBundleMaxQty(item, bundleChildren);

    if (newQty > maxQty) {
      toast.error(
        `Only ${maxQty} items can be ordered due to grouped product stock`
      );
      return;
    }
  }

  updateQuantity(item.id, newQty);

  if (item.isBundleParent && item.bundleId) {
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

                  <div className="flex flex-col items-end gap-2 mt-[-30px]">
                    {/* <button onClick={() => removeFromCart(item.id, item.type)} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium">
                      <Trash2 size={16} /> Remove
                    </button> */}

  {(item.discountAmount ?? 0) > 0 && (
    <p className="text-xs text-green-600 font-medium">
      Saved £{((item.discountAmount ?? 0) * (item.quantity ?? 1)).toFixed(2)}
    </p>
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 sticky top-24">
            {/* Inline coupon input */}
            <div className="border border-gray-300 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-semibold mb-2">Apply Coupon</h3>

              <div className="flex gap-2">
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

              {/* show small list of available coupons as hints */}
              {/* {availableCoupons.length > 0 && (
                <div className="mt-3 text-xs text-gray-600">
                  <div className="font-medium text-xs mb-1">Available coupons in cart:</div>
                  <div className="flex flex-wrap gap-2">
                    {availableCoupons.map((c) => (
                      <div key={c.code} className="text-xs bg-gray-100 px-2 py-1 rounded-md">
                        {c.code.toUpperCase()} • {c.productIds.length} item(s)
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </div>

            {/* Applied coupons grouped */}
            {/* <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Applied Offers</h3>

              {groupedApplied.length === 0 ? (
                <div className="text-xs text-gray-500">No coupons applied</div>
              ) : (
                groupedApplied.map((g) => (
                  <div key={g.code} className="mb-2 border p-2 rounded-md">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium">{g.code.toUpperCase()}</div>
                        <div className="text-xs text-gray-600">{g.items.length} item(s)</div>
                      </div>
                      <div className="text-sm text-green-600 font-semibold">- £{g.totalDiscount.toFixed(2)}</div>
                    </div>

                    <div className="mt-2 text-xs text-gray-700">
                      {g.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span className="truncate">{it.name}</span>
                          <span>£{it.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div> */}

            {/* Price details */}
            <h3 className="text-lg font-semibold mb-3">Price Details</h3>
            <div className="space-y-2 text-sm">
          <div className="flex justify-between">
  <span>Subtotal</span>
  <span>£{subtotalBeforeDiscount.toFixed(2)}</span>
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

          </div>
        </div>
      </div>
    </div>
    
  );
}
