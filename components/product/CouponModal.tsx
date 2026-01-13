"use client";

import { X, BadgePercent, Check, RemoveFormattingIcon, Trash, Tag, Sparkles, CheckCircle, Trash2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CouponModal({
  open,
  onClose,
  couponCode,
  setCouponCode,
  appliedCoupon,
  offers,
  onApply,
  onRemove,
}: any) {
  if (!open) return null;

return (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
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

      {/* COUPON INPUT */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 h-11 rounded-xl border border-gray-300 px-4 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#445D41]"
          />

          <Button
            onClick={() => onApply()}
            className="h-11 px-6 rounded-xl bg-[#445D41] hover:bg-black text-white font-semibold"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* OFFERS LIST */}
      <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto bg-[#fafafa]">
        {offers.map((offer: any) => {
          const applied = appliedCoupon?.id === offer.id;

          return (
            <div
              key={offer.id}
              className={`rounded-2xl border p-4 transition-all
                ${
                  applied
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-[#445D41] hover:shadow-sm"
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">

                {/* LEFT */}
                <div>
                  <div className="flex items-start gap-2">
  <Tag className="h-6 w-6 text-[#445D41] mt-0.5" />

  <div>
  <div className="flex items-center gap-2 flex-wrap">
  <p className="text-sm font-semibold text-gray-900 leading-tight">
    {offer.name}
  </p>

  {offer.usePercentage && typeof offer.discountPercentage === "number" && (
    <span className="text-xs font-semibold text-green-700 bg-green-50
                     px-2 py-0.5 rounded-md">
      {offer.discountPercentage}% OFF
    </span>
  )}
</div>


    <p className="mt-1 text-xs font-medium text-[#445D41] tracking-wide">
      Use Code: {offer.couponCode}
    </p>
  </div>
</div>

                </div>

                {/* RIGHT CTA */}
                {applied ? (
                  <Button
                    size="sm"
                    onClick={onRemove}
                    className="rounded-lg bg-red-900 hover:bg-black text-white
                               flex items-center gap-1.5"
                  >
                    <Trash className="h-4 w-4" />
                    Remove
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onApply(offer.couponCode)}
                    className="rounded-lg bg-[#445D41] hover:bg-black text-white"
                  >
                    <Ticket className="h-4 w-4"/>
                    Apply
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
        <BadgePercent className="h-4 w-4" />
        Coupons are applied instantly. One coupon per order.
      </div>
    </div>
  </div>
);


}
