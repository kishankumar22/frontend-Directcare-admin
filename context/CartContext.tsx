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

  variantOptions?: {
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  };

  // ⭐ FULL PRODUCT DATA REQUIRED FOR CART COUPON LOGIC
  productData?: any; // store product JSON here
}

// ================== CONTEXT TYPE ==================
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
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
      const existing = prev.find(
        (p) =>
          p.id === item.id && // same product or variant
          p.variantId === item.variantId
      );

      if (existing) {
        return prev.map((p) =>
          p.id === item.id && p.variantId === item.variantId
            ? { ...p, quantity: p.quantity + item.quantity }
            : p
        );
      }

      return [
        ...prev,
        {
          ...item,
          priceBeforeDiscount: item.priceBeforeDiscount ?? item.price, // essential
          finalPrice: item.finalPrice ?? item.price, // default
          discountAmount: item.discountAmount ?? 0,
        },
      ];
    });
  };

  // ================== REMOVE ITEM ==================
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  // ================== UPDATE QUANTITY ==================
  const updateQuantity = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: qty } : p))
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
