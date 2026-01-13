"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/CustomToast";
import { useCart } from "@/context/CartContext";
import QuantitySelector from "@/components/shared/QuantitySelector";

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
  // ⭐ ADD THIS
  backorderState: {
    canBuy: boolean;
    showNotify: boolean;
    label: string;
  };
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
   backorderState,

}: Props) {

  const { addToCart } = useCart();
  const toast = useToast();

const basePrice = selectedVariant?.price ?? product.price;

const subscriptionPrice = basePrice - (basePrice * product.subscriptionDiscountPercentage) / 100;


  // ----------------- NEW STATE FOR DROPDOWN -----------------
  const [selectedFrequency, setSelectedFrequency] = useState<string>(
    `${product.recurringCycleLength} ${product.recurringCyclePeriod}`
  );

  const handleAddSubscriptionToCart = () => {
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
      slug: product.slug,
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
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity
    });
    toast.success("Subscription added to cart 🛒");
  };

  return (
    <Card className="shadow-sm bg-transparent border-none">
      <CardContent className="px-3 pt-3 pb-2">
        {/* Radio */}
        <label className="flex items-center gap-2 cursor-pointer mb-2">
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
<p className="flex items-center gap-0 mb-2 text-3xl font-extrabold text-[#445D41] whitespace-nowrap">

  £{(subscriptionPrice * quantity).toFixed(2)}

  
    <span className="text-xl font-bold text-gray-400 line-through ml-2">
       £{(selectedVariant?.price ?? product.price).toFixed(2)}
    </span>
  

  {product.vatExempt ? (
    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded ml-1">
      0% VAT
    </span>
  ) : vatRate !== null ? (
    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded ml-2">
      {vatRate}% VAT
    </span>
  ) : null}

</p>   

          {/* Benefits Block */}
    <ul className="bg-[#f8faf9] border border-green-200 rounded-xl p-2 mb-2 text-[11px] text-gray-700 space-y-0.5">

      <li className="flex items-center gap-2">
        <span className="text-green-700 font-bold">✓</span> Pause or cancel anytime
      </li>
      <li className="flex items-center gap-2">
        <span className="text-green-700 font-bold">✓</span> Priority fast delivery
      </li>
      <li className="flex items-center gap-2">
        <span className="text-green-700 font-bold">✓</span> Guaranteed stock availability
      </li>
    </ul>
             {/* Dropdown appears ONLY if subscription selected */}
        {selectedPurchaseType === "subscription" && (
         <div className="mb-2">
  {/* <label className="text-sm font-semibold text-gray-700 mb-1 block">
    Delivery Frequency
  </label> */}

  <div className="relative">
    <select
      className="w-full appearance-none bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-700
      shadow-sm focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-[#445D41] transition-all cursor-pointer"
      value={selectedFrequency}
      onChange={(e) => setSelectedFrequency(e.target.value)}
    >
      <option value={`${product.recurringCycleLength} ${product.recurringCyclePeriod}`}>
        Every {product.recurringCycleLength} {product.recurringCyclePeriod}
      </option>

      {product?.allowedSubscriptionFrequencies?.split(",").map((option: string) => (
        <option key={option} value={option}>
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>

    {/* Custom Down Arrow */}
    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
      ▼
    </span>
  </div>
</div>
        )}
<div className="flex items-center gap-[-0.5rem] mt-2 mb-2">

  <div className="flex-shrink-0 w-[8rem]">
   <QuantitySelector
  quantity={quantity}
  setQuantity={setQuantity}
  maxStock={backorderState.canBuy ? (selectedVariant?.stockQuantity ?? product.stockQuantity) : 0}
  stockError={stockError}
  setStockError={setStockError}
/>

  </div>

  <div
    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm mb-[15px] ${
      (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
        ? "bg-red-100 text-red-700"
        : "bg-green-100 text-green-700"
    }`}
  >
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
          ? "bg-red-600"
          : "bg-green-600"
      }`}
    ></span>

    {(selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
      ? "Out of Stock"
      : `${selectedVariant?.stockQuantity ?? product.stockQuantity} Available`}
  </div>

</div>

   

       {selectedPurchaseType === "subscription" && backorderState.canBuy && (
  <Button
    onClick={handleAddSubscriptionToCart}
    className="w-full py-3 rounded-xl text-sm font-semibold mt-[-0.75rem]
      bg-black hover:bg-[#445D41] text-white"
  >
    Add Subscription to Cart
  </Button>
)}

{selectedPurchaseType === "subscription" && !backorderState.canBuy && (
  <Button
    disabled
    className="w-full py-3 rounded-xl text-sm font-semibold mt-[-0.75rem]
      bg-gray-400 cursor-not-allowed opacity-70"
  >
    Subscription unavailable
  </Button>
)}

      </CardContent>
    </Card>
  );
}
