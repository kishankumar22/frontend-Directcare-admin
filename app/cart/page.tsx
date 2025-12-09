"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";


export default function CartPage() {
  const toast = useToast();

  const { cart, updateQuantity, removeFromCart, updateCart } = useCart();

  const router = useRouter();
const { isAuthenticated } = useAuth();

const handleCheckout = () => {
  if (isAuthenticated) {
    router.push("/checkout");
  } else {
    router.push("/account?from=checkout");
  }
};


  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [stockError, setStockError] = useState<{ [key: string]: string | null }>({});


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
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-gray-600">

      {/* Large cart icon background style */}
      <div className="relative">
      <svg
  width="240"
  height="240"
  viewBox="0 0 24 24"
  stroke="#9aa1ab"
  fill="none"
  strokeWidth="1.4"
  className="opacity-80 drop-shadow"
>
  <circle cx="12" cy="12" r="11" fill="#f5f6f7"/>
  <path strokeLinecap="round" strokeLinejoin="round"
    d="M3.5 6h2l1.5 9h10l2-6H6M8 17.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
  />
</svg>

      </div>

      {/* Text */}
      <p className="text-xl font-semibold text-gray-700 mt-6">
        Your cart is empty
      </p>

      {/* Button to continue shopping */}
      <Link
        href="/products"
        className="mt-4 bg-[#445D41] text-white px-6 py-2 rounded-lg hover:bg-black transition-all"
      >
        Continue Shopping
      </Link>
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
           key={item.id + (item.variantId || "") + item.type}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border p-4 rounded-lg"

          >
            <Link
  href={`/products/${item.productData?.slug}`}
  className="flex items-start gap-4 flex-1"
>
            <div className="flex items-start gap-4 flex-1">
              <img
                src={item.image}
                alt={"no image avaialable"}
                className="w-20 h-20 object-cover rounded-md"
              />

              <div>
                <h2 className="font-medium">{item.name}</h2>
   {item.type === "subscription" && (
  <p className="text-xs font-semibold text-indigo-600 mt-1">
    Subscription • Every{" "}
    {item.frequency && !isNaN(Number(item.frequency))
      ? `${item.frequency} `
      : ""}
    {item.frequencyPeriod} • {item.subscriptionTotalCycles} cycles
  </p>
)}

               <p className="text-sm text-gray-600 mt-1">
  £{(item.finalPrice ?? item.price).toFixed(2)}
  {item.type === "subscription" && (
    <span className="text-xs text-indigo-600 ml-1">(per cycle)</span>
  )}

                  

                  {(item.discountAmount ?? 0) > 0 && (
                    <span className="ml-2 text-green-600 text-xs">
                      (Saved £{(item.discountAmount ?? 0).toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            </div>
            </Link>

  <div className="flex sm:flex-col flex-row items-start sm:items-center gap-2 sm:gap-1">
  

  <div className="flex items-center gap-2 border rounded px-2 py-1">
     <button onClick={() => removeFromCart(item.id, item.type)}
  className="text-red-600 hover:text-red-800 p-2"
  title="Remove item"
>
  <Trash2 size={18} />
</button>

    {/* - Button */}
    <button
      onClick={() => updateQuantity(item.id, item.quantity - 1)}
      disabled={item.quantity <= 1}
      className="px-2 py-1 border rounded"
    >
      -
    </button>

    {/* Input */}
   <input
  type="number"
  className="w-12 text-center outline-none"
  value={item.quantity === 0 ? "" : item.quantity}
  onChange={(e) => {
    let val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    if (val === "") {
      updateQuantity(item.id, 0);
      return;
    }

    const product = item.productData;
    const variantStock = item.variantId
      ? product?.variants?.find((v: any) => v.id === item.variantId)?.stockQuantity
      : product?.stockQuantity;

    const maxStock =
  item.maxStock ??
  variantStock ??
  item.productData?.stockQuantity ??
  9999;


    

    let num = parseInt(val, 10);

    if (num > maxStock) {
      num = maxStock;
      setStockError((prev) => ({
        ...prev,
        [item.id]: `Only ${maxStock} items available`,
      }));
    } else {
      setStockError((prev) => ({
        ...prev,
        [item.id]: null,
      }));
    }

    updateQuantity(item.id, num);
  }}
  onBlur={() => {
    const product = item.productData;
    const variantStock = item.variantId
      ? product?.variants?.find((v: any) => v.id === item.variantId)?.stockQuantity
      : product?.stockQuantity;

   const maxStock =
  item.maxStock ??
  variantStock ??
  item.productData?.stockQuantity ??
  9999;

    let val = item.quantity;

    if (!val || val < 1) val = 1;
    if (val > maxStock) val = maxStock;

    updateQuantity(item.id, val);
  }}
  inputMode="numeric"
  min={1}
/>


    {/* + Button */}
    <button
      onClick={() => updateQuantity(item.id, item.quantity + 1)}
      disabled={
        item.quantity >=
        (item.variantId
          ? item.productData?.variants?.find((v: any) => v.id === item.variantId)?.stockQuantity
          : item.productData?.stockQuantity)
      }
      className="px-2 py-1 border rounded"
    >
      +
    </button>
  </div>

  {/* Red error message */}
  {stockError[item.id] && (
    <p className="text-red-600 text-xs font-semibold mt-1">
      {stockError[item.id]}
    </p>
  )}
  



</div>




          </div>
        ))}
      </div>

      {/* ⭐ TOTAL + CHECKOUT */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-8 gap-4">
        <h2 className="text-lg font-semibold">
          Total: £{cartTotal.toFixed(2)}
        </h2>

       <button
  onClick={handleCheckout}
  className="bg-[#445D41] text-white hover:bg-black px-6 py-3 rounded-lg w-full sm:w-auto"
>
  Proceed to Checkout
</button>

      </div>
    </div>
  );
}
