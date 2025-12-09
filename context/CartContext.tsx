"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
slug?: string;

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

  // ⭐ FULL PRODUCT DATA REQUIRED FOR CART COUPON LOGIC
  productData?: any; // store product JSON here
  maxStock?: number;
  

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
              }
            : p
        );
      }
    }

    // ===================== NORMAL PRODUCT MERGE LOGIC =====================
    const existing = prev.find(
      (p) =>
        p.id === item.id &&
        (p.variantId ?? "") === (item.variantId ?? "") &&
        (p.type ?? "one-time") === (item.type ?? "one-time")
    );

    if (existing) {
      return prev.map((p) =>
        p.id === item.id &&
        (p.variantId ?? "") === (item.variantId ?? "") &&
        (p.type ?? "one-time") === (item.type ?? "one-time")
          ? { ...p, quantity: p.quantity + item.quantity }
          : p
      );
    }

    // ===================== ADD NEW ITEM =====================
    return [
      ...prev,
      {
        ...item,
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
  setCart((prev) => prev.filter((p) => !(p.id === id && p.type === type)));
};


  // ================== UPDATE QUANTITY ==================
  // ================== UPDATE QUANTITY (FINAL PERFECT VERSION) ==================
// ================== UPDATE QUANTITY (FINAL PERFECT VERSION) ==================
const updateQuantity = (id: string, qty: number) => {
  setCart((prev) =>
    prev.map((p) => {
      if (p.id !== id) return p;

      const product = p.productData;
      const variantStock = p.variantId
        ? product?.variants?.find((v: any) => v.id === p.variantId)?.stockQuantity
        : product?.stockQuantity;

    const maxStock =
  p.maxStock ??
  variantStock ??
  product?.stockQuantity ??
  9999;




      // 🔥 Allow qty === 0 (typing ke time)
      if (qty === 0) {
        return { ...p, quantity: 0 };
      }

      // 🔥 Only fix on exceeding user input
      if (qty > maxStock) {
        return { ...p, quantity: maxStock };
      }

      return { ...p, quantity: qty };
    })
  );
};


  // ================== UPDATE CART (COUPON APPLY) ==================
  const updateCart = (updatedItems: CartItem[]) => {
    setCart(updatedItems);
  };

  // ================== CLEAR CART ==================
  const clearCart = () => setCart([]);

  // ================== CART COUNT ==================
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ================== CART TOTAL (FINAL PRICE AWARE) ==================
  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      (item.finalPrice ?? item.price) * (item.quantity ?? 1),
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
