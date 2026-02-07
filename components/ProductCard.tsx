//components\ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, BadgePercent, AwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/toast/CustomToast";
import { getDiscountBadge, getDiscountedPrice } from "@/app/lib/discountHelpers";
import { getVatRate } from "@/app/lib/vatHelpers";
import GenderBadge from "./shared/GenderBadge";
const FALLBACK_IMAGE = "/placeholder-product.jpg";
import { useState, useRef } from "react";
import PharmaQuestionsModal from "@/components/pharma/PharmaQuestionsModal";

export default function ProductCard({
  product,
  vatRates,
  variantForCard = null,
  cardSlug,
}: {
  product: any;
  vatRates: any[];
  variantForCard?: any | null;
  cardSlug: string;
})
 {
  const toast = useToast();
  const { addToCart, cart } = useCart();
  const [showPharmaModal, setShowPharmaModal] = useState(false);

// 🔁 resume add after modal
const pharmaApprovedRef = useRef(false);

  // ---------- Variant ----------
const defaultVariant =
  variantForCard ??
  product.variants?.find((v: any) => v.isDefault) ??
  product.variants?.[0] ??
  null;

  // ---------- Image ----------
 const mainImage = (() => {
  // 1️⃣ Default variant image
  if (defaultVariant?.imageUrl) {
    return defaultVariant.imageUrl.startsWith("http")
      ? defaultVariant.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`;
  }

  // 2️⃣ Product main image (isMain === true)
  const mainProductImage = product.images?.find(
    (img: any) => img.isMain && img.imageUrl
  );
  if (mainProductImage?.imageUrl) {
    return mainProductImage.imageUrl.startsWith("http")
      ? mainProductImage.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${mainProductImage.imageUrl}`;
  }

  // 3️⃣ Any product image
  const anyImage = product.images?.find((img: any) => img.imageUrl);
  if (anyImage?.imageUrl) {
    return anyImage.imageUrl.startsWith("http")
      ? anyImage.imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${anyImage.imageUrl}`;
  }

  // 4️⃣ Fallback
  return FALLBACK_IMAGE;
})();

  // ---------- Pricing ----------
  const basePrice =
  typeof defaultVariant?.price === "number" && defaultVariant.price > 0
    ? defaultVariant.price
    : product.price;

  const finalPrice = getDiscountedPrice(product, basePrice);
  const discountBadge = getDiscountBadge(product);
// ---------- Active Coupon (indicator only) ----------
const hasActiveCoupon = product.assignedDiscounts?.some((d: any) => {
  if (!d.isActive) return false;
  if (!d.requiresCouponCode) return false;

  const now = new Date();
  if (d.startDate && now < new Date(d.startDate)) return false;
  if (d.endDate && now > new Date(d.endDate)) return false;

  return true;
});

  // ---------- VAT ----------
  const vatRate = getVatRate(
    vatRates,
    product.vatRateId,
    product.vatExempt
  );

  // ---------- Stock ----------
  const stock =
    defaultVariant?.stockQuantity ??
    product.stockQuantity ??
    0;
// ---------- Loyalty Points (Product + Variant aware) ----------
const loyaltyPoints = (() => {
  if (product.excludeFromLoyaltyPoints) return null;

  if (defaultVariant?.loyaltyPointsEarnable) {
    return defaultVariant.loyaltyPointsEarnable;
  }

  if (product.loyaltyPointsEarnable) {
    return product.loyaltyPointsEarnable;
  }

  return null;
})();
const handlePharmaGuard = (): boolean => {
  if (pharmaApprovedRef.current) return true;

  if (product.isPharmaProduct) {
    setShowPharmaModal(true);
    return false;
  }

  return true;
};

  // ---------- Add to Cart ----------
 const handleAddToCart = () => {
  if (product.disableBuyButton) return;
  // 🔥 PHARMA GUARD
  if (!handlePharmaGuard()) return;
  const variantId = defaultVariant?.id ?? null;

  const minQty = product.orderMinimumQuantity ?? 1;
  const maxQty = product.orderMaximumQuantity ?? Infinity;

  const requestedQty = 1;
  const finalQty = Math.max(requestedQty, minQty);

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

  // ⭐ BLOCK IF EXCEEDS
  if (existingCartQty + finalQty > allowedMaxQty) {
    toast.error(`Maximum allowed quantity is ${allowedMaxQty}`);
    return;
  }

  addToCart({
    id: `${variantId ?? product.id}-one`,
    productId: product.id,
    name: defaultVariant
      ? `${product.name} (${[
          defaultVariant.option1Value,
          defaultVariant.option2Value,
          defaultVariant.option3Value,
        ]
          .filter(Boolean)
          .join(", ")})`
      : product.name,
    price: finalPrice,
    priceBeforeDiscount: basePrice,
    finalPrice,
    discountAmount: basePrice - finalPrice,
    quantity: finalQty,
    image: mainImage,
    sku: defaultVariant?.sku ?? product.sku,
    variantId: variantId,
   slug: cardSlug,
    variantOptions: {
      option1: defaultVariant?.option1Value ?? null,
      option2: defaultVariant?.option2Value ?? null,
      option3: defaultVariant?.option3Value ?? null,
    },
    shipSeparately: product.shipSeparately,
    productData: JSON.parse(JSON.stringify(product)),
  });

  // ⭐ UX TOAST
  if (finalQty !== requestedQty) {
    toast.warning(
      `Minimum order quantity is ${minQty}. Added ${finalQty} items to cart.`
    );
  } else {
    toast.success(`${product.name} added to cart 🛒`);
  }
};


  return (
    <div className="group border border-gray-200 rounded-lg hover:shadow-xl transition-all bg-white">
      {/* IMAGE */}
      <Link href={`/products/${cardSlug}`}>
        <div className="relative h-48 bg-white rounded-t-lg overflow-hidden">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
<GenderBadge gender={product.gender} />
          {/* DISCOUNT BADGE */}
          {discountBadge && (
            <div className="absolute top-3 right-3 z-20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                <div className="flex flex-col items-center leading-none">
                  <span className="text-base font-extrabold">
                    {discountBadge.type === "percent"
                      ? `${discountBadge.value}%`
                      : `£${discountBadge.value}`}
                  </span>
                  <span className="text-[12px] font-semibold">OFF</span>
                </div>
              </div>
            </div>
          )}
          {/* 🔥 COUPON REQUIRED BADGE (SAME CIRCULAR STYLE) */}
{!discountBadge && hasActiveCoupon && (
  <div className="absolute top-3 right-3 z-20">
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
      <div className="flex flex-col items-center leading-none text-center px-1">
        <span className="text-[10px] font-extrabold leading-tight">
          COUPON
        </span>
        <span className="text-[9px] font-semibold leading-tight">
          Available
        </span>
      </div>
    </div>
  </div>
)}
        </div>
      </Link>

      {/* CONTENT */}
      <div className="p-4">
        {/* TITLE */}
        <Link href={`/products/${cardSlug}`}>

          <h3 className="font-semibold text-base mb-0 line-clamp-2 hover:text-[#445D41] transition min-h-[48px]">
            {defaultVariant
              ? `${product.name} (${[
                  defaultVariant.option1Value,
                  defaultVariant.option2Value,
                  defaultVariant.option3Value,
                ]
                  .filter(Boolean)
                  .join(", ")})`
              : product.name}
          </h3>
        </Link>

        {/* RATING */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <div className="flex items-center">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm ml-1 font-medium text-gray-700">
              {(product.averageRating ?? 0).toFixed(1)}
            </span>
          </div>

          <span className="text-xs text-gray-500">
            ({product.reviewCount || 0} reviews)
          </span>

         {loyaltyPoints && (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md w-fit">
    <AwardIcon className="h-4 w-4" />
    Earn {loyaltyPoints} points
  </span>
)}

        </div>

        {/* PRICE */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-2xl font-bold text-[#445D41]">
            £{finalPrice.toFixed(2)}
          </span>

          {finalPrice < basePrice && (
            <span className="text-sm text-gray-400 line-through">
              £{basePrice.toFixed(2)}
            </span>
          )}

         {product.vatExempt ? (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
    <BadgePercent className="h-3 w-3" />
    VAT Relief
  </span>
) : vatRate !== null ? (
  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
    ({vatRate}% VAT)
  </span>
) : null}

        </div>

        {/* ADD TO CART */}
       <Button
  onClick={handleAddToCart}
  disabled={stock === 0 || product.disableBuyButton === true}
  className="mt-1 w-full bg-[#445D41] hover:bg-[#334a2c]
    disabled:opacity-60 disabled:cursor-not-allowed"
>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {stock > 0 ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
      {showPharmaModal && (
  <PharmaQuestionsModal
    open={showPharmaModal}
    productId={product.id}
    onClose={() => {
      setShowPharmaModal(false);
    }}
    onSuccess={(messageFromBackend) => {
      // 🔒 approve once
      pharmaApprovedRef.current = true;

      

      setShowPharmaModal(false);

      // 🔁 resume add-to-cart
      handleAddToCart();

      // reset for next click
      setTimeout(() => {
        pharmaApprovedRef.current = false;
      }, 0);
    }}
  />
)}

    </div>
    
  );
}
