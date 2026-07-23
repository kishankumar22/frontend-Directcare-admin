"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/toast/CustomToast";
import { useCart } from "@/context/CartContext";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { AwardIcon, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
interface Props {
  product: any;
  selectedVariant: any | null;
  selectedPurchaseType: "one" | "subscription";
  setSelectedPurchaseType: (val: "one" | "subscription") => void;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  stockError: string | null;
  setStockError: React.Dispatch<React.SetStateAction<string | null>>;
  vatRate: number | null;   // 🟢 Add this
  nextDayDeliveryFree?: boolean;
  // ⭐ ADD THIS
  backorderState: {
    canBuy: boolean;
    showNotify: boolean;
    label: string;
  };
  onNotifyMe?: () => void;
}

export default function SubscriptionPurchaseCard({
  product,
  selectedVariant,
  selectedPurchaseType,
  setSelectedPurchaseType,
  quantity,
  setQuantity,
  stockError,
  setStockError,
   vatRate,
   nextDayDeliveryFree,
   backorderState,
   onNotifyMe,

}: Props) {

  const { addToCart } = useCart();
  const toast = useToast();
const router = useRouter();
const basePrice = selectedVariant?.price ?? product.price;
// ✅ STOCK (variant aware)
const stock =
  selectedVariant?.stockQuantity ?? product.stockQuantity ?? 0;

// ✅ STOCK DISPLAY LOGIC (same as PDP)
const stockDisplay = (() => {
  // ❌ Always dominant
  if (stock === 0) {
    return {
      show: true,
      text: "Out of Stock",
      type: "out",
    };
  }

  // ✅ Exact quantity priority
  if (product.displayStockQuantity === true) {
    if (stock <= 5) {
      return {
        show: true,
        text: `Only ${stock} left`,
        type: "low",
      };
    }

    return {
      show: true,
      text: `${stock} available`,
      type: "in",
    };
  }

  // ✅ Generic availability
  if (product.displayStockAvailability === true) {
    return {
      show: true,
      text: "In Stock",
      type: "in",
    };
  }

  return {
    show: false,
    text: "",
    type: "none",
  };
})();

const subscriptionPrice = basePrice - (basePrice * product.subscriptionDiscountPercentage) / 100;
  // ----------------- NEW STATE FOR DROPDOWN -----------------
  // No frequency pre-selected — user must choose (placeholder shown by default)
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");

  const handleAddSubscriptionToCart = () => {
    // User must pick a delivery frequency first
    if (!selectedFrequency) {
      toast.error("Please select a delivery frequency");
      return;
    }
    let cycleLength: string | number = product.recurringCycleLength;
let cyclePeriod: string = product.recurringCyclePeriod;

if (selectedFrequency.includes(" ")) {
  const parts = selectedFrequency.split(" "); // "30 days"
  cycleLength = Number(parts[0]);
  cyclePeriod = parts[1];
} else {
  cycleLength = selectedFrequency; // weekly, monthly, yearly
  cyclePeriod = selectedFrequency;
}
const stockQty =
  selectedVariant?.stockQuantity ??
  product.stockQuantity ??
  0;

// Variant-level max order quantity overrides the product-level default when set.
const maxQty = selectedVariant?.orderMaximumQuantity ?? product.orderMaximumQuantity ?? Infinity;

// 🔥 STOCK CHECK
if (quantity > stockQty) {
  toast.error(`Only ${stockQty} items available`);
  return;
}

// 🔥 MAX ORDER CHECK
if (quantity > maxQty) {
  toast.error(`Maximum order quantity is ${maxQty}`);
  return;
}


    addToCart({
      id: `${selectedVariant?.id ?? product.id}-subscription`,
      type: "subscription",
      productId: product.id,
      name: selectedVariant
      ? `${product.name} (${[
          selectedVariant.option1Value,
          selectedVariant.option2Value,
          selectedVariant.option3Value,
        ]
          .filter(Boolean)
          .join(", ")})`
      : product.name,
      price: subscriptionPrice,
      quantity,
      variantId: selectedVariant?.id ?? null,
      slug: product.slug ?? "",
  vatRate: vatRate,
  vatIncluded: vatRate !== null,
      frequency: (cycleLength),
      frequencyPeriod: cyclePeriod,
      subscriptionTotalCycles: product.recurringTotalCycles,
     sku: selectedVariant?.sku ?? product.sku,
image: selectedVariant?.imageUrl
  ? (selectedVariant.imageUrl.startsWith("http")
      ? selectedVariant.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${selectedVariant.imageUrl}`)
  : (product.images?.[0]?.imageUrl
      ? (product.images[0].imageUrl.startsWith("http")
          ? product.images[0].imageUrl
          : `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`)
      : "/placeholder.jpg"),
 variantOptions: {
      ...(selectedVariant?.option1Name && { [selectedVariant.option1Name]: selectedVariant.option1Value }),
      ...(selectedVariant?.option2Name && { [selectedVariant.option2Name]: selectedVariant.option2Value }),
      ...(selectedVariant?.option3Name && { [selectedVariant.option3Name]: selectedVariant.option3Value }),
    },
      nextDayDeliveryEnabled: selectedVariant?.nextDayDeliveryEnabled ?? product.nextDayDeliveryEnabled ?? false,
      nextDayDeliveryFree: selectedVariant?.nextDayDeliveryFree ?? product.nextDayDeliveryFree ?? false,
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity
    });
  // The header's mini-cart dropdown opens automatically (see CartContext.addToCart)
  // showing exactly what was just added — no separate toast needed here.
  };

  return (
    <Card className="shadow-sm bg-transparent border-none">
      <CardContent className="px-3 py-2">
        {/* Radio */}
        <label className="flex items-center gap-2 cursor-pointer mb-1.5">
          <input
            type="radio"
            name="purchaseType"
            value="subscription"
            checked={selectedPurchaseType === "subscription"}
            onChange={() => setSelectedPurchaseType("subscription")}
            className="h-4 w-4"
          />

          <span className="font-semibold text-sm">
            Subscribe & Save {product.subscriptionDiscountPercentage}%
          </span>
        
        </label>
          {/* 2-column: price + benefits (left), controls (right) — "Deliver every" aligns to the top */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">

      {/* LEFT COLUMN — Price + Benefits */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-lg font-extrabold text-[#445D41]">
            £{(subscriptionPrice * quantity).toFixed(2)}
          </span>
          <span className="text-xs font-bold text-gray-400 line-through">
            £{(selectedVariant?.price ?? product.price).toFixed(2)}
          </span>

          {vatRate !== null && vatRate > 0 && !product.vatExempt && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md font-semibold">
              {vatRate}% VAT
            </span>
          )}

          {selectedPurchaseType === "subscription" && nextDayDeliveryFree && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 whitespace-nowrap"
              style={{
                animation: 'deliveryHighlight 2s ease-in-out infinite',
              }}
            >
              <Truck className="h-3 w-3 text-blue-700" />
              <span className="text-[11px] font-bold text-blue-700">
                Next Day Delivery Free
              </span>
            </span>
          )}
          {(product as any).loyaltyPointsEnabled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
              <AwardIcon className="h-3 w-3 text-green-600" />
              Earn {(product as any).loyaltyPointsEarnable} pts
            </span>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-[#f8faf9] border border-green-200 rounded-xl p-2 text-[11px] text-gray-700 flex-1">
        <p className="font-semibold text-gray-800 mb-0.5 leading-snug">Get these benefits from your first order onwards:</p>
        <ul className="space-y-0.5">
          <li className="flex items-start gap-1.5">
            <span className="text-green-700 font-bold">✓</span> Get up to {product.subscriptionDiscountPercentage}% off
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-green-700 font-bold">✓</span> Lowest price guaranteed
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-green-700 font-bold">✓</span> Cancel anytime
          </li>
        </ul>
        </div>
      </div>

      {/* RIGHT COLUMN — Frequency + Qty + Stock + Button */}
      <div className="flex flex-col gap-1.5">

        {/* Delivery frequency (only when subscription selected) */}
        {selectedPurchaseType === "subscription" && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 mb-0.5 block">
              Deliver every
            </label>
            <div className="relative">
              <select
                className={`w-full appearance-none bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium
                shadow-sm focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-[#445D41] transition-all cursor-pointer
                ${selectedFrequency ? "text-gray-800" : "text-gray-400"}`}
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
              >
                <option value="" disabled className="text-gray-400">
                  Choose delivery frequency
                </option>

                {product?.allowedSubscriptionFrequencies?.split(",").map((option: string) => (
                  <option key={option} value={option} className="text-gray-900">
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
                ▼
              </span>
            </div>
          </div>
        )}

        {/* Qty + In Stock — only when subscription is selected */}
        {selectedPurchaseType === "subscription" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-shrink-0 w-[7rem]">
            <QuantitySelector
              quantity={quantity}
              setQuantity={setQuantity}
              maxStock={backorderState.canBuy ? (selectedVariant?.stockQuantity ?? product.stockQuantity) : 0}
              stockError={stockError}
              setStockError={setStockError}
              allowedQuantities={product.allowedQuantities}
            />
          </div>

          {stockDisplay.show && (
            <div
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${
                stockDisplay.type === "out"
                  ? "bg-red-100 text-red-700"
                  : stockDisplay.type === "low"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-700"
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  stockDisplay.type === "out"
                    ? "bg-red-600"
                    : stockDisplay.type === "low"
                    ? "bg-yellow-600"
                    : "bg-green-600"
                }`}
              ></span>
              {stockDisplay.text}
            </div>
          )}
        </div>
        )}

        {/* Add Subscription button */}
        {selectedPurchaseType === "subscription" && backorderState.canBuy && (
          <Button
            onClick={handleAddSubscriptionToCart}
            className="w-full py-2 rounded-xl text-sm font-semibold bg-black hover:bg-[#445D41] text-white"
          >
            Add Subscription to Cart
          </Button>
        )}

        {selectedPurchaseType === "subscription" && !backorderState.canBuy && (
          <Button
            onClick={onNotifyMe}
            className="w-full py-2 rounded-xl text-sm font-semibold bg-black hover:bg-[#445D41] text-white"
          >
            Notify Me
          </Button>
        )}
      </div>
    </div>

      </CardContent>
    </Card>
  );
}
