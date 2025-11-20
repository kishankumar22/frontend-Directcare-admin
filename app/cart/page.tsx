"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/CustomToast";

export default function CartPage() {
  const toast = useToast();

  const { cart, updateQuantity, removeFromCart, updateCart } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");

    // ⭐ AUTO-DETECT APPLIED COUPON (from ProductDetails page)
  useEffect(() => {
    const item = cart.find((c) => c.couponCode);

    if (item?.couponCode) {
      setCouponCode(item.couponCode);         // input pre-fill
      setAppliedCouponCode(item.couponCode);  // show applied message
    }
  }, [cart]);


  if (cart.length === 0) {
    return (
      <div className="p-10 text-center text-gray-600">
        Your cart is empty.
      </div>
    );
  }


  // ⭐ Apply coupon to eligible items
  const applyCouponToCart = () => {
    let applied = false;

    const updated = cart.map((item) => {
      const product = item.productData;

     const discount = product?.assignedDiscounts?.find((d: any) => {
  if (!d.isActive) return false;

  const now = new Date();
  const start = new Date(d.startDate);
  const end = new Date(d.endDate);

  if (now < start || now > end) return false;

  if (!d.requiresCouponCode) return false;

  return d.couponCode?.toLowerCase() === couponCode.trim().toLowerCase();
});


      if (!discount) return item;

      applied = true;

      const basePrice = item.priceBeforeDiscount ?? item.price;

      const discountValue = discount.usePercentage
        ? (basePrice * discount.discountPercentage) / 100
        : discount.discountAmount;

      const finalPrice = +(basePrice - discountValue).toFixed(2);

      return {
        ...item,
        appliedDiscountId: discount.id,
        discountAmount: discountValue,
        finalPrice,
        couponCode: couponCode,
      };
    });

    if (!applied) {
      toast.error("This coupon is not valid for any product in your cart.");
      return;
    }

    updateCart(updated);
    setAppliedCouponCode(couponCode);
    toast.success("Coupon applied!");
  };

  // ⭐ Remove coupon
  const removeCouponFromCart = () => {
    const updated = cart.map((item) => ({
      ...item,
      appliedDiscountId: null,
      discountAmount: 0,
      finalPrice: item.priceBeforeDiscount ?? item.price,
      couponCode: null,
    }));

    updateCart(updated);
    setCouponCode("");
    setAppliedCouponCode("");

    toast.success("Coupon removed!");
  };

  // ⭐ Total
  const cartTotal = cart.reduce(
    (total, item) =>
      total + (item.finalPrice ?? item.price) * (item.quantity || 1),
    0
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Shopping Cart</h1>

      {/* ⭐ COUPON BOX */}
      <div className="border p-4 rounded-lg mb-6">

        {!appliedCouponCode ? (
          <>
            <label className="block text-sm font-semibold mb-2">
              Apply Coupon Code
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
                className="border px-3 py-2 rounded w-full"
              />
              <button
                onClick={applyCouponToCart}
                className="bg-[#445D41] text-white px-4 py-2 rounded"
              >
                Apply
              </button>
            </div>
          </>
        ) : (
          <div className="bg-green-50 border border-green-300 text-green-700 p-2 rounded flex justify-between items-center">
            <span>
              Coupon <strong>{appliedCouponCode}</strong> applied!
            </span>
            <button
              onClick={removeCouponFromCart}
              className="text-red-600 underline text-sm"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* ⭐ CART ITEMS */}
      <div className="space-y-4">
        {cart.map((item) => (
          <div
            key={item.id + (item.variantId || "")}
            className="flex items-center justify-between border p-4 rounded-lg"
          >
            <div className="flex items-center gap-4 flex-1">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-md"
              />

              <div>
                <h2 className="font-medium">{item.name}</h2>

                {item.variantOptions && (
                  <div className="text-xs text-gray-500 mt-1">
                    {item.variantOptions.option1 && (
                      <p>Option1: {item.variantOptions.option1}</p>
                    )}
                    {item.variantOptions.option2 && (
                      <p>Option2: {item.variantOptions.option2}</p>
                    )}
                    {item.variantOptions.option3 && (
                      <p>Option3: {item.variantOptions.option3}</p>
                    )}
                  </div>
                )}

                <p className="text-sm text-gray-600 mt-1">
                  £{(item.finalPrice ?? item.price).toFixed(2)}

                  {(item.discountAmount ?? 0) > 0 && (
                    <span className="ml-2 text-green-600 text-xs">
                      (Saved £{(item.discountAmount ?? 0).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 border rounded px-2 py-1">
                <button
                  onClick={() =>
                    updateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  className="px-2 py-1 border rounded"
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 border rounded"
                >
                  +
                </button>
              </div>

              <div className="flex flex-col items-end">
                <p>
                  £
                  {(
                    (item.finalPrice ?? item.price) * item.quantity
                  ).toFixed(2)}
                </p>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 mt-2 hover:text-red-700 transition"
                  title="Remove item"
                >
                  <Trash2 size={20} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ⭐ TOTAL + CHECKOUT */}
      <div className="flex justify-between items-center mt-8">
        <h2 className="text-lg font-semibold">
          Total: £{cartTotal.toFixed(2)}
        </h2>

        <Link href="/account">
          <button className="bg-[#445D41] text-white px-6 py-2 rounded hover:bg-[#2f4230]">
            Proceed to Checkout
          </button>
        </Link>
      </div>
    </div>
  );
}
