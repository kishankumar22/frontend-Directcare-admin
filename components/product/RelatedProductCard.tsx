"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { Star, BadgePercent } from "lucide-react";
import { useVatRates } from "@/app/hooks/useVatRates";
import { getVatRate } from "@/app/lib/vatHelpers";
import { getProductDiscountPercent } from "@/app/lib/discountHelpers";


export default function RelatedProductCard({ product, getImageUrl }: any) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [stockError, setStockError] = useState<string | null>(null);

  const defaultVariant =
    product.variants?.find((v: any) => v.isDefault) ??
    product.variants?.[0] ??
    null;

  const price = defaultVariant?.price ?? product.price;
  const oldPrice =
    defaultVariant?.compareAtPrice ?? product.oldPrice ?? null;
  const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

  const hasDiscount = oldPrice && oldPrice > price;
const discountPercent = getProductDiscountPercent(product, price);


  // VAT Rate / Exempt Logic
  const vatRates = useVatRates(); // 👈 yaha dalna
const vatRate = getVatRate(vatRates, (product as any).vatRateId, product.vatExempt);


  return (
    <div className="flex-shrink-0 w-56 sm:w-60 md:w-64 border rounded-2xl shadow-sm hover:shadow-lg transition bg-white p-4 flex flex-col mt-8 pb-0">

      {/* BADGES */}
      <div className="flex items-center gap-1 flex-wrap mb-1">

        {/* UNISEX */}
        <span className="flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
          <img src="/icons/unisex.svg" className="h-3 w-3" />
          Unisex
        </span>

        {/* VAT FREE BADGE */}
        {product.vatExempt && (
          <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            <BadgePercent className="h-3 w-3" />
            VAT Free
          </span>
        )}
      </div>

      {/* IMAGE */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-white">
        {discountPercent > 0 && (
  <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold z-10">
    -{discountPercent}% OFF
  </span>
)}

        <Link href={`/products/${product.slug}`}>
          <Image
            src={
              defaultVariant?.imageUrl
                ? getImageUrl(defaultVariant.imageUrl)
                : getImageUrl(product.images?.[0]?.imageUrl)
            }
            alt={product.name}
            fill
            className="object-contain p-4 cursor-pointer transition hover:scale-105"
          />
        </Link>
      </div>

      {/* NAME */}
      <Link href={`/products/${product.slug}`}>
        <h3 className="font-semibold text-sm mt-2 line-clamp-2 text-gray-900 hover:text-[#445D41] cursor-pointer">
          {defaultVariant
            ? `${product.name} (${defaultVariant.option1Value})`
            : product.name}
        </h3>
      </Link>

      {/* RATING */}
      <div className="flex items-center gap-1 text-xs mt-1 mb-1">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className={`h-3 w-3 ${
              idx < product.averageRating
                ? "fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="font-medium text-gray-700">
          {product.averageRating?.toFixed(1)}
        </span>
        <span className="text-gray-500">({product.reviewCount})</span>
      </div>
      {/* PRICE & VAT */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-lg font-bold text-[#445D41]">
          £{price.toFixed(2)}
        </span>

        {hasDiscount && (
          <>
            <span className="line-through text-xs text-gray-400">
              £{oldPrice.toFixed(2)}
            </span>   
          </>
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

      </div>

      {/* QUANTITY + BUTTON */}
      <div className="flex items-center gap-2 mt-auto">
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
          onClick={() =>
            addToCart({
              id: `${defaultVariant?.id ?? product.id}-one`,
              productId: product.id,
              name: defaultVariant
      ? `${product.name} (${[
          defaultVariant.option1Value,
          (defaultVariant as any).option2Value,
          (defaultVariant as any).option3Value
        ].filter(Boolean).join(", ")})`
      : product.name,
              price,
              finalPrice: price,
              quantity: qty,
             image:
  defaultVariant?.imageUrl
    ? (defaultVariant.imageUrl.startsWith("http")
        ? defaultVariant.imageUrl
        : `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`)
    : product.images?.[0]?.imageUrl
      ? (product.images[0].imageUrl.startsWith("http")
          ? product.images[0].imageUrl
          : `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`)
      : "/placeholder.jpg",
             sku: defaultVariant?.sku ?? product.sku,
      variantId: defaultVariant?.id ?? null,
      slug: product.slug,
     variantOptions: {
      option1: defaultVariant?.option1Value ?? null,
      option2: (defaultVariant as any)?.option2Value ?? null,
      option3: (defaultVariant as any)?.option3Value ?? null,
    },
              productData: JSON.parse(JSON.stringify(product)),
            })
          }
          className={`flex-1 h-[32px] text-sm rounded-xl font-semibold mt-[-12px] ${
            stock === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#445D41] hover:bg-black text-white"
          }`}
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
