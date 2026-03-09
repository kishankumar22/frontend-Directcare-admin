"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/components/toast/CustomToast";

// ================== CART ITEM TYPE ==================
export interface CartItem {
  id: string; // variant id OR product id
  productId?: string; // main product id
  name: string;

  // basePrice (original price from product before discount)
  price: number;

  // ⭐ REQUIRED FOR COUPON SYSTEM
  priceBeforeDiscount?: number; // original price
  finalPrice?: number;          // after discount
  discountAmount?: number;      // discount applied
  appliedDiscountId?: string | null;
  couponCode?: string | null;

  image: string;
  quantity: number;

  sku?: string;
  variantId?: string | null;
slug: string;

  variantOptions?: {
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  };
   // ⭐ NEW fields
  type?: "one-time" | "subscription";
 frequency?: number | string | null;
  frequencyPeriod?: string | null;
  subscriptionTotalCycles?: number | null;
  vatRate?: number | null;
  vatIncluded?: boolean;
  // ⭐ FULL PRODUCT DATA REQUIRED FOR CART COUPON LOGIC
  productData?: any; // store product JSON here
  maxStock?: number;
    // 🔥 GROUPED PRODUCT SUPPORT (UI PURPOSE ONLY)
  parentProductId?: string;
// 🔥 GROUPED BUNDLE DISPLAY (BACKEND DRIVEN)
bundlePrice?: number;            // per grouped product bundle price
individualSavings?: number;      // price - bundlePrice
hasBundleDiscount?: boolean;
// ✅ DELIVERY FLAGS
  nextDayDeliveryEnabled?: boolean;
  sameDayDeliveryEnabled?: boolean;
  // 🔥 BUNDLE SUPPORT
  purchaseContext?: "bundle" | "standalone";
  bundleId?: string | null;
  isBundleParent?: boolean;
  bundleParentId?: string | null;
  // 🔥 INSTANCE LEVEL BUNDLE ID (FRONTEND ONLY)
  bundleInstanceId?: string;            // for bundle parent
  bundleParentInstanceId?: string;      // for bundle children
shipSeparately?: boolean;

}
// ================== CONTEXT TYPE ==================
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
   removeFromCart: (id: string, type?: string) => void; // <-- FIXED HERE
  updateQuantity: (id: string, qty: number) => void;
  updateCart: (updatedItems: CartItem[]) => void; // ⭐ NEW
  clearCart: () => void;

  cartCount: number;
  cartTotal: number;

  isInitialized: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ================== PROVIDER ==================
export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
const toast = useToast();

  // Load cart from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setCart(JSON.parse(stored));
    } catch (err) {
      console.error("Error reading cart:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Persist cart
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  // ================== ADD TO CART ==================
const addToCart = (item: CartItem) => {




  setCart((prev) => {


    // ===================== SUBSCRIPTION MERGE LOGIC =====================
    if (item.type === "subscription") {
      const existingSub = prev.find(
        (p) =>
          p.productId === item.productId &&
          p.variantId === item.variantId &&
          p.type === "subscription"
      );

      if (existingSub) {
        return prev.map((p) =>
          p.productId === item.productId &&
          p.variantId === item.variantId &&
          p.type === "subscription"
            ? {
                ...p,
                quantity: item.quantity, // update quantity
                frequency: item.frequency,
                frequencyPeriod: item.frequencyPeriod,
                subscriptionTotalCycles: item.subscriptionTotalCycles,
                sku: item.sku ?? p.sku,
                
              }
            : p
        );
      }
    }

    // ===================== NORMAL PRODUCT MERGE LOGIC =====================
const existing = prev.find(
  (p) =>
    p.productId === item.productId &&
    (p.variantId ?? null) === (item.variantId ?? null) &&
    (p.type ?? "one-time") === (item.type ?? "one-time") &&
    (p.purchaseContext ?? "standalone") ===
      (item.purchaseContext ?? "standalone")
);



if (existing) {
  const product = item.productData;

  const mainMax = product?.orderMaximumQuantity ?? Infinity;

  const variantStock = item.variantId
    ? product?.variants?.find((v: any) => v.id === item.variantId)?.stockQuantity
    : product?.stockQuantity;

  const maxStock =
    item.maxStock ??
    variantStock ??
    product?.stockQuantity ??
    Infinity;

  const allowedMax = Math.min(mainMax, maxStock);

 const newQty = existing.quantity + item.quantity;

if (newQty > allowedMax) {
  toast.error(`Maximum order quantity is ${allowedMax}`);
  return prev;
}


  return prev.map((p) =>
    p.productId === item.productId &&
    (p.variantId ?? null) === (item.variantId ?? null) &&
    (p.type ?? "one-time") === (item.type ?? "one-time") &&
    (p.purchaseContext ?? "standalone") ===
      (item.purchaseContext ?? "standalone")
      ? {
          ...p,
          quantity: p.quantity + item.quantity,
          sku: item.sku ?? p.sku,
          finalPrice: item.finalPrice ?? p.finalPrice,
          discountAmount: item.discountAmount ?? p.discountAmount,
        }
      : p
  );
}



    // ===================== ADD NEW ITEM =====================
    return [
      ...prev,
      {
        ...item,
          sku: item.sku,
        priceBeforeDiscount: item.priceBeforeDiscount ?? item.price,
        finalPrice: item.finalPrice ?? item.price,
        discountAmount: item.discountAmount ?? 0,
        type: item.type ?? "one-time",
      },
    ];
  });
};


  // ================== REMOVE ITEM ==================
 const removeFromCart = (id: string, type?: string) => {
  setCart((prev) => {
    const itemToRemove = prev.find(
      (p) => p.id === id && (p.type ?? "one-time") === (type ?? p.type)
    );

    if (!itemToRemove) return prev;

    // 🔥 REMOVE ONLY THIS BUNDLE INSTANCE
    if (itemToRemove.isBundleParent && itemToRemove.bundleInstanceId) {
      return prev.filter(
        (p) =>
          p.id !== id &&
          p.bundleParentInstanceId !== itemToRemove.bundleInstanceId
      );
    }

    // 🔥 normal standalone or child remove
    return prev.filter(
      (p) => !(p.id === id && (p.type ?? "one-time") === (type ?? p.type))
    );
  });
};

  // ================== UPDATE QUANTITY ==================
const updateQuantity = (id: string, qty: number) => {
  setCart((prev) => {
    const target = prev.find(p => p.id === id);
    if (!target) return prev;

    // ❌ BLOCK MANUAL UPDATE FOR GROUPED CHILD
    if (target.parentProductId) {
      return prev;
    }

    const product = target.productData;
    const variantStock = target.variantId
      ? product?.variants?.find((v: any) => v.id === target.variantId)?.stockQuantity
      : product?.stockQuantity;

    const maxStock =
      target.maxStock ??
      variantStock ??
      product?.stockQuantity ??
      9999;

   const mainMin = product?.orderMinimumQuantity ?? 1;
const mainMax = product?.orderMaximumQuantity ?? Infinity;

let finalQty = qty;

if (qty === 0) finalQty = 0;
else if (qty < mainMin) finalQty = mainMin;
else if (qty > mainMax) finalQty = mainMax;
else if (qty > maxStock) finalQty = maxStock;

    return prev.map((item) => {
      // 🔥 MAIN PRODUCT
      if (item.id === id) {
        return { ...item, quantity: finalQty };
      }

      // 🔥 AUTO-SYNC GROUPED PRODUCTS
      if (
  item.bundleParentInstanceId &&
  item.bundleParentInstanceId === target.bundleInstanceId
) {
  return { ...item, quantity: finalQty };
}


      return item;
    });
  });
};
  // ================== UPDATE CART (COUPON APPLY) ==================
  const updateCart = (updatedItems: CartItem[]) => {
    setCart(updatedItems);
  };
  // ================== CLEAR CART ==================
  const clearCart = () => {
  // 🔥 BUY NOW PROTECTION
  const preserveCart = sessionStorage.getItem("preserveCart");

  if (preserveCart === "1") {
    // Buy Now flow → cart ko mat chhedo
    sessionStorage.removeItem("preserveCart");
    return;
  }

  // ✅ Normal checkout
  setCart([]);
  localStorage.removeItem("cart");
};


  // ================== CART COUNT ==================
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ================== CART TOTAL (FINAL PRICE AWARE) ==================
 const cartTotal = cart.reduce(
  (sum, item) =>
    sum + (item.finalPrice ?? item.price) * (item.quantity ?? 1),
  0
);


  // ================== RETURN CONTEXT ==================
  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,

        updateCart, // ⭐ important for coupon system

        cartCount,
        cartTotal,

        isInitialized,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
// ================== CUSTOM HOOK ==================
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
};
