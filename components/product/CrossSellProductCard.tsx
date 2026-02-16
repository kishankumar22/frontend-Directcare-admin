"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { Star, BadgePercent, AwardIcon } from "lucide-react";
import { useVatRates } from "@/app/hooks/useVatRates";
import { getVatRate } from "@/app/lib/vatHelpers";
import { useToast } from "@/components/toast/CustomToast";
import { useRef } from "react";
import PharmaQuestionsModal from "@/components/pharma/PharmaQuestionsModal";

import {
  getDiscountBadge,
  getDiscountedPrice,
} from "@/app/lib/discountHelpers";

import { Card, CardContent } from "../ui/card";
import GenderBadge from "../shared/GenderBadge";
const getCrossSellProductImage = (
  product: any,
  defaultVariant?: any
) => {
  // 1️⃣ Variant image
  if (defaultVariant?.imageUrl) {
    return defaultVariant.imageUrl.startsWith("http")
      ? defaultVariant.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`;
  }

  // 2️⃣ Product main image
  const mainImage = product.images?.find(
    (img: any) => img.isMain === true
  );

  if (mainImage?.imageUrl) {
    return mainImage.imageUrl.startsWith("http")
      ? mainImage.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${mainImage.imageUrl}`;
  }

  // 3️⃣ sortOrder fallback
  const sorted = product.images
    ?.slice()
    ?.sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

  if (sorted?.[0]?.imageUrl) {
    return sorted[0].imageUrl.startsWith("http")
      ? sorted[0].imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${sorted[0].imageUrl}`;
  }

  // 4️⃣ fallback
  return "/placeholder.jpg";
};

export default function CrossSellProductCard({ product, getImageUrl }: any) {
 const { addToCart, cart } = useCart();
 const minQty = product.orderMinimumQuantity ?? 1;
const [qty, setQty] = useState(minQty);
  const [stockError, setStockError] = useState<string | null>(null);
const toast = useToast();

  const defaultVariant =
    product.variants?.find((v: any) => v.isDefault) ??
    product.variants?.[0] ??
    null;
useEffect(() => {
  if (qty < minQty) {
    setQty(minQty);
  }
}, [minQty]);

  const price = defaultVariant?.price ?? product.price;
const basePrice =
  typeof defaultVariant?.price === "number" && defaultVariant.price > 0
    ? defaultVariant.price
    : product.price;

const discountBadge = getDiscountBadge(product);
const finalPrice = getDiscountedPrice(product, basePrice);
// ---------- Active Coupon Indicator ----------
const hasActiveCoupon = (product as any).assignedDiscounts?.some((d: any) => {
  if (!d.isActive) return false;
  if (!d.requiresCouponCode) return false;

  const now = new Date();
  if (d.startDate && now < new Date(d.startDate)) return false;
  if (d.endDate && now > new Date(d.endDate)) return false;

  return true;
});
// 🎁 Loyalty Points Logic (NEW – production safe)
const getLoyaltyPoints = () => {
  // ❌ excluded from loyalty
  if ((product as any).excludeFromLoyaltyPoints) return 0;

  // ✅ variant priority
  if (defaultVariant?.loyaltyPointsEarnable) {
    return defaultVariant.loyaltyPointsEarnable;
  }

  // ✅ product fallback
  if ((product as any).loyaltyPointsEarnable) {
    return (product as any).loyaltyPointsEarnable;
  }

  return 0;
};

  const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

  // VAT Rate / Exempt Logic
  const vatRates = useVatRates();
  const vatRate = getVatRate(vatRates, (product as any).vatRateId, product.vatExempt);
const [showPharmaModal, setShowPharmaModal] = useState(false);
const [pendingAction, setPendingAction] = useState<"cart" | null>(null);

// 🔒 double-submit protection
const pharmaApprovedRef = useRef(false);
const handlePharmaGuard = (action: "cart") => {
  // ✅ already approved in this flow
  if (pharmaApprovedRef.current) return true;

  if (product.isPharmaProduct) {
    setPendingAction(action);
    setShowPharmaModal(true);
    return false;
  }

  return true;
};
const handleAddToCart = () => {
  if (product.disableBuyButton) return;

  // 🔥 PHARMA GUARD
  if (!handlePharmaGuard("cart")) return;

  const variantId = defaultVariant?.id ?? null;
  const maxQty = product.orderMaximumQuantity ?? Infinity;

  const existingCartQty = cart
    .filter(
      (c) =>
        c.productId === product.id &&
        (c.variantId ?? null) === variantId
    )
    .reduce((sum, c) => sum + (c.quantity ?? 0), 0);

  const stockQty =
    defaultVariant?.stockQuantity ??
    product.stockQuantity ??
    0;

  const allowedMaxQty = Math.min(stockQty, maxQty);

  // ⭐ MIN VALIDATION
  if (qty < minQty) {
    toast.error(`Minimum order quantity is ${minQty}`);
    return;
  }

  // ⭐ MAX + STOCK VALIDATION
  if (existingCartQty + qty > allowedMaxQty) {
    toast.error(`Maximum allowed quantity is ${allowedMaxQty}`);
    return;
  }

  addToCart({
    id: `${variantId ?? product.id}-one`,
    productId: product.id,
    name: defaultVariant
      ? `${product.name} (${[
          defaultVariant.option1Value,
          (defaultVariant as any)?.option2Value,
          (defaultVariant as any)?.option3Value,
        ].filter(Boolean).join(", ")})`
      : product.name,

    price: finalPrice,
    priceBeforeDiscount: basePrice,
    finalPrice,
    discountAmount: discountBadge
      ? discountBadge.type === "percent"
        ? +(basePrice * discountBadge.value / 100).toFixed(2)
        : discountBadge.value
      : 0,

    quantity: qty,
      vatRate: vatRate,
  vatIncluded: vatRate !== null,
    image: getCrossSellProductImage(product, defaultVariant),
    sku: defaultVariant?.sku ?? product.sku,
    variantId,
    slug: product.slug,
    variantOptions: {
      option1: defaultVariant?.option1Value ?? null,
      option2: (defaultVariant as any)?.option2Value ?? null,
      option3: (defaultVariant as any)?.option3Value ?? null,
    },
    shipSeparately: product.shipSeparately,
    productData: JSON.parse(JSON.stringify(product)),
  });

  toast.success(`${qty} × ${product.name} added to cart 🛒`);
};

  return (
     <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl 
                             h-[330px] md:h-[355px] flex flex-col justify-between">
             <CardContent className="p-2 mt-3 flex flex-col h-full">

      {/* BADGES */}
   <GenderBadge gender={product.gender} />
{discountBadge && (
  <div className="absolute top-3 right-3 z-20">
    <div
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">

      <div className="flex flex-col items-center leading-none">
        {discountBadge.type === "percent" ? (
          <>
            <span className="text-sm sm:text-base font-extrabold">
              {discountBadge.value}%
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold">
              OFF
            </span>
          </>
        ) : (
          <>
            <span className="text-sm sm:text-base font-extrabold">
              £{discountBadge.value}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold">
              OFF
            </span>
          </>
        )}
      </div>
    </div>
  </div>
)}
{/* 🔥 COUPON REQUIRED BADGE (SAME CIRCULAR STYLE) */}
{!discountBadge && hasActiveCoupon && (
  <div className="absolute top-3 right-3 z-20">
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
      <div className="flex flex-col items-center leading-none text-center px-1">
        <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight">
          COUPON
        </span>
        <span className="text-[8px] sm:text-[9px] font-semibold leading-tight">
          AVAILABLE
        </span>
      </div>
    </div>
  </div>
)}

      {/* IMAGE */}
       <div className="h-[140px] sm:h-[160px] md:h-[180px] flex items-center justify-center overflow-hidden bg-white rounded-t-xl pt-2 relative">

        <Link href={`/products/${product.slug}`}>
         <Image
  src={getCrossSellProductImage(product, defaultVariant)}
  alt={product.name}
  fill
  className="object-contain w-full h-full"
/>

        </Link>
      </div>

      {/* NAME */}
                    <div className="min-h-[38px] max-h-[38px] mb-2">
                    <Link href={`/products/${product.slug}`} className="block">
                      <h3 className="font-semibold text-xs md:text-sm text-gray-800 line-clamp-2">
  {defaultVariant
    ? `${product.name} (${[
        defaultVariant.option1Value,
        (defaultVariant as any).option2Value,
        (defaultVariant as any).option3Value
      ].filter(Boolean).join(", ")})`
    : product.name}
</h3>

                    </Link>
                  </div>

    <div className="flex items-center gap-2 min-h-[20px] mb-2 flex-wrap">

  {/* ⭐ Rating */}
  <div className="flex items-center bg-green-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
    <span>{product.averageRating?.toFixed(1)}</span>
    <Star className="h-3 w-3 ml-1 fill-white text-white" />
  </div>

  {/* Reviews */}
  <span className="text-[11px] text-gray-600">
    ({product.reviewCount?.toLocaleString()})
  </span>

  {/* 🎁 LOYALTY POINTS – INLINE */}
 {getLoyaltyPoints() > 0 && (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
    <AwardIcon className="h-4 w-4 text-green-600" />
    Earn {getLoyaltyPoints()} pts
  </span>
)}


</div>

      {/* PRICE & VAT */}
      <div className="flex items-center gap-1 mb-0 flex-wrap">
       <span className="text-base font-bold text-[#445D41]">
  £{finalPrice.toFixed(2)}
</span>
{discountBadge && (
  <span className="line-through text-xs text-gray-400">
    £{basePrice.toFixed(2)}
  </span>
)}
       {product.vatExempt ? (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
    <BadgePercent className="h-3 w-3" />
    VAT Exempt
  </span>
) : vatRate !== null ? (
  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 rounded whitespace-nowrap">
    ({vatRate}% VAT)
  </span>
) : null}


      </div>



      {/* QUANTITY + BUTTON */}
         <div className="flex items-center gap-1 mt-2">

        <div className="flex-shrink-0 scale-90 -ml-1">
          <QuantitySelector
            quantity={qty}
            setQuantity={setQty}
            maxStock={stock}
            stockError={stockError}
            setStockError={setStockError}
            allowedQuantities={product.allowedQuantities}
          />
        </div>

       <Button
  disabled={stock === 0 || product.disableBuyButton === true}
  onClick={handleAddToCart}
  className={`flex-1 h-[32px] text-sm rounded-xl font-semibold ${
    stock === 0
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-[#445D41] hover:bg-black text-white"
  }`}
>
  Add to Cart
</Button>

        {showPharmaModal && (
  <PharmaQuestionsModal
    open={showPharmaModal}
    productId={product.id}
    onClose={() => {
      setShowPharmaModal(false);
      setPendingAction(null);
    }}
  onSuccess={() => {
  pharmaApprovedRef.current = true;

  setShowPharmaModal(false);

  if (pendingAction === "cart") {
    setPendingAction(null);
    handleAddToCart(); // 🔥 RESUME
  }

  setTimeout(() => {
    pharmaApprovedRef.current = false;
  }, 0);
}}

  />
)}

      </div>
      </CardContent>
            </Card>
  );
}
