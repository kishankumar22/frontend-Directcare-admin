"use client";

import { useState } from "react";
import { X, Tag, Sparkles } from "lucide-react";

interface Props {
  item: any;
  onClose: () => void;
  onApply: (couponCode: string) => void;
  isDiscountActive: (d: any) => boolean;
}

export default function ProductOffersModal({
  item,
  onClose,
  onApply,
  isDiscountActive,
}: Props) {
  const [couponInput, setCouponInput] = useState("");

  if (!item) return null;

  const discounts =
    item?.productData?.assignedDiscounts?.filter(
      (d: any) => d.requiresCouponCode && isDiscountActive(d)
    ) ?? [];

  return (
  <div className="fixed inset-0 mt-8 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">

        {/* HEADER */}
<div className="px-6 py-5 border-b bg-green-50">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#445D41]" />
        Offers & Coupons
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Choose the best offer and save instantly
      </p>
    </div>

          <button
  onClick={onClose}
  className="p-1.5 rounded-full hover:bg-white/70 transition"
>
  <X className="h-5 w-5 text-gray-600" />
</button>
</div>
        </div>

        {/* PRODUCT NAME */}
        <p className="px-6 pt-4 text-sm text-gray-600 line-clamp-2">
  {item.name}
</p>


        {/* MANUAL COUPON INPUT */}
        <div className="px-6 py-4 border-b">
  <div className="flex items-center gap-3">

         <input
  value={couponInput}
  onChange={(e) => setCouponInput(e.target.value)}
  placeholder="Enter coupon code"
  className="flex-1 h-11 rounded-xl border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41]"/>
             


          <button
            onClick={() => {
              if (!couponInput.trim()) return;
              onApply(couponInput.trim());
              onClose();
            }}
            className="h-11 px-6 rounded-xl bg-[#445D41] hover:bg-black  text-white font-semibold transition">
            
          
            Apply
          </button>
        </div>
</div>
        {/* AVAILABLE COUPONS */}
        {/* AVAILABLE COUPONS */}
<div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto bg-[#fafafa]">
  <h3 className="text-sm font-semibold text-gray-900">
    Available Coupons
  </h3>

  {discounts.length === 0 ? (
    <p className="text-sm text-gray-500">
      No offers available for this product.
    </p>
  ) : (
    discounts.map((d: any) => (
      <div
        key={d.id}
        className="rounded-2xl border border-gray-200 bg-white p-4
                   hover:border-[#445D41] hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between gap-4">

          {/* LEFT SIDE */}
          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-[#445D41] mt-0.5" />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">
                  {d.name}
                </p>

                {d.usePercentage && (
                  <span className="text-xs font-semibold text-green-700 bg-green-50
                                   px-2 py-0.5 rounded-md">
                    {d.discountPercentage}% OFF
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs font-medium text-[#445D41] tracking-wide">
                CODE {d.couponCode}
              </p>

              {!d.usePercentage && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Save £{d.discountAmount}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT CTA */}
          <button
            onClick={() => {
              onApply(d.couponCode);
              onClose();
            }}
            className="rounded-lg bg-[#445D41] hover:bg-black
                       text-white text-xs font-semibold px-4 py-1.5 transition"
          >
            Apply
          </button>
        </div>
      </div>
    ))
  )}
</div>


      </div>
    </div>
  );
}
