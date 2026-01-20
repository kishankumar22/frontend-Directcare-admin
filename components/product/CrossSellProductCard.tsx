"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { Star, BadgePercent, AwardIcon } from "lucide-react";
import { useVatRates } from "@/app/hooks/useVatRates";
import { getVatRate } from "@/app/lib/vatHelpers";
import { useToast } from "@/components/CustomToast";

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
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [stockError, setStockError] = useState<string | null>(null);
const toast = useToast();

  const defaultVariant =
    product.variants?.find((v: any) => v.isDefault) ??
    product.variants?.[0] ??
    null;

  const price = defaultVariant?.price ?? product.price;
const basePrice = defaultVariant?.price ?? product.price;
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

  const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

  // VAT Rate / Exempt Logic
  const vatRates = useVatRates();
  const vatRate = getVatRate(vatRates, (product as any).vatRateId, product.vatExempt);

  return (
     <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl 
                             h-[330px] md:h-[370px] flex flex-col justify-between">
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

      {/* RATING */}
      <div className="flex items-center gap-2 min-h-[20px] mb-2">

  {/* ⭐ Flipkart-style rating badge */}
  <div className="flex items-center bg-green-600 text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
    <span>{product.averageRating?.toFixed(1)}</span>
    <Star className="h-3 w-3 ml-1 fill-white text-white" />
  </div>

  {/* Review Count */}
  <span className="text-[11px] text-gray-600">
    ({product.reviewCount?.toLocaleString()})
  </span>
  {/* Discount badge – small, Flipkart style */}
{product.vatExempt && (
  <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 whitespace-nowrap">
    <BadgePercent className="h-3 w-3" />
    VAT Free
  </span>
)}
</div>
      {/* PRICE & VAT */}
      <div className="flex items-center gap-2 mb-0 flex-wrap">
       <span className="text-lg font-bold text-[#445D41]">
  £{finalPrice.toFixed(2)}
</span>
{discountBadge && (
  <span className="line-through text-xs text-gray-400">
    £{basePrice.toFixed(2)}
  </span>
)}
        {product.vatExempt ? (
          <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 rounded whitespace-nowrap">
            (0% VAT)
          </span>
        ) : vatRate !== null ? (
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1 py-0.5 rounded whitespace-nowrap">
            ({vatRate}% VAT)
          </span>
        ) : null}
        {hasActiveCoupon && (
  <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-1 py-0.5 rounded whitespace-nowrap">
    Coupon!
  </span>
)}

      </div>
{/* 🎁 LOYALTY POINTS – CROSS SELL CARD */}
{(product as any).loyaltyPointsEnabled && (
  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-md w-fit">
                                 
    <AwardIcon className="h-4 w-4 text-green-600" />
    Earn {(product as any).loyaltyPointsEarnable} points
  </div>
)}

      {/* QUANTITY + BUTTON */}
       <div className="flex items-center gap-0 mt-1">
        <div className="flex-shrink-0 scale-90 -ml-1">
          <QuantitySelector
            quantity={qty}
            setQuantity={setQty}
            maxStock={stock}
            stockError={stockError}
            setStockError={setStockError}
          />
        </div>

        <Button
          disabled={stock === 0}
         onClick={() => {
  addToCart({
    id: `${defaultVariant?.id ?? product.id}-one`,
    productId: product.id,
    name: defaultVariant
      ? `${product.name} (${[
          defaultVariant.option1Value,
          (defaultVariant as any).option2Value,
          (defaultVariant as any).option3Value,
        ]
          .filter(Boolean)
          .join(", ")})`
      : product.name,

    price: finalPrice,
    quantity: qty,
    image: getCrossSellProductImage(product, defaultVariant),
    sku: defaultVariant?.sku ?? product.sku,
    variantId: defaultVariant?.id ?? null,
    slug: product.slug,
    variantOptions: {
      option1: defaultVariant?.option1Value ?? null,
      option2: (defaultVariant as any)?.option2Value ?? null,
      option3: (defaultVariant as any)?.option3Value ?? null,
    },
    productData: JSON.parse(JSON.stringify(product)),
  });

  // ✅ TOAST HERE
  toast.success(`${qty} × ${product.name} added to cart 🛒`);
}}

          className={`flex-1 h-[32px] text-sm rounded-xl font-semibold mt-[-12px] ${
            stock === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#445D41] hover:bg-black text-white"
          }`}
        >
          Add to Cart
        </Button>
      </div>
      </CardContent>
            </Card>
  );
}
