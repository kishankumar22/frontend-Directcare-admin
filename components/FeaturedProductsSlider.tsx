//components\FeaturedProductsSlider.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, StarHalf, ShoppingCart, ChevronLeft, ChevronRight, BadgePercent, Zap, BellRing, Heart, CircleOff, PackageX, Award, Badge, Coins, AwardIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/toast/CustomToast";
import { useWishlist } from "@/context/WishlistContext";
import PharmaQuestionsModal from "@/components/pharma/PharmaQuestionsModal";
import {
  getDiscountBadge,
  getDiscountedPrice,
} from "@/app/lib/discountHelpers";
import GenderBadge from "@/components/shared/GenderBadge";
import { getOldPriceDiscount } from "@/utils/pricing";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getBackorderUIState } from "@/app/lib/backorderHelpers";
import BackInStockModal from "@/components/backorder/BackInStockModal";
import { flattenProductsForListing } from "@/app/lib/flattenProductsForListing";
import { trackAddToCart } from "@/lib/analytics";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";

interface Variant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  option1Name: string;
  option1Value: string;
  displayOrder?: number;
  isDefault?: boolean;
  imageUrl?: string;
  loyaltyPointsEarnable?: number;
  loyaltyPointsMessage?: string;
}
interface Product {
  orderMinimumQuantity?: number;
  orderMaximumQuantity?: number;
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  displayDiscountType?: "None" | "OldPrice" | "System";

  hasSystemDiscount?: boolean;

  systemDiscountAmount?: number;
  averageRating?: number;
  reviewCount?: number;
  images?: { imageUrl: string }[];
  vatExempt?: boolean;
  vatRate?: number;
  gender?: string;
  variants?: Variant[];  // 🟢 ADD THIS
  stockQuantity?: number; // optional fallback if simple product
  sku?: string;           // for simple product
  allowBackorder?: boolean;
  backorderMode?: string;
  disableBuyButton?: boolean;
  disableWishlistButton?: boolean;
  excludeFromLoyaltyPoints?: boolean;
  loyaltyPointsEarnable?: number;
  loyaltyPointsMessage?: string;
  shipSeparately?: boolean;
  nextDayDeliveryEnabled?: boolean;
  nextDayDeliveryFree?: boolean;
  sameDayDeliveryEnabled?: boolean;
  isPharmaProduct?: boolean;
  productType?: string;
}


const ProductCardImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <div className="relative w-full h-full transform transition duration-300 md:group-hover:scale-110">
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 250px"
        className="object-contain"
        onError={() => setImgSrc("/placeholder.jpg")}
        loading="lazy"
      />
    </div>
  );
};

export default function FeaturedProductsSlider({
  products,
  baseUrl,
  title = "Top Selling Products",
  viewAllHref,
}: {
  products: Product[];
  baseUrl: string;
  title?: string;
  viewAllHref?: string;
}) {

  const toast = useToast();
  const { addToCart, cart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const flattenedProducts = useMemo(() => {
    return flattenProductsForListing(products);
  }, [products]);
  const shouldShowNav = flattenedProducts.length > 4;
  const [notifyProduct, setNotifyProduct] = useState<{
    productId: string;
    variantId?: string | null;
  } | null>(null);

  const [pharmaModal, setPharmaModal] = useState<{
    product: Product;
    variant?: Variant;
    action: "ADD_TO_CART" | "BUY_NOW";
    basePrice: number;
    finalPrice: number;
    discountAmount: number;
    cardSlug: string;
  } | null>(null);

  const getProductDisplayImage = (
    product: Product,
    defaultVariant?: Variant
  ) => {
    // 1️⃣ Variant image (highest priority)
    if (defaultVariant?.imageUrl) {
      return defaultVariant.imageUrl.startsWith("http")
        ? defaultVariant.imageUrl
        : `${baseUrl}${defaultVariant.imageUrl}`;
    }

    // 2️⃣ Product main image
    const mainImage = (product as any)?.images?.find(
      (img: any) => img.isMain === true
    );

    if (mainImage?.imageUrl) {
      return mainImage.imageUrl.startsWith("http")
        ? mainImage.imageUrl
        : `${baseUrl}${mainImage.imageUrl}`;
    }

    // 3️⃣ SortOrder based fallback
    const sorted = (product as any)?.images
      ?.slice()
      ?.sort(
        (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );

    if (sorted?.[0]?.imageUrl) {
      return sorted[0].imageUrl.startsWith("http")
        ? sorted[0].imageUrl
        : `${baseUrl}${sorted[0].imageUrl}`;
    }

    // 4️⃣ Absolute fallback
    return "/placeholder.jpg";
  };

  const handleBuyNow = (
    product: Product,
    defaultVariant: Variant | undefined,
    basePrice: number,
    finalPrice: number,
    discountAmount: number,
    cardSlug: string
  ) => {
    const finalQty = getInitialQty(product, defaultVariant);

    // Use vatRate directly from API response
    const vatRate: number | null = (product as any).vatRate ?? null;
    const selected = defaultVariant ?? null;
    const oldPriceValue =
      (defaultVariant as any)?.compareAtPrice ?? (defaultVariant as any)?.oldPrice ??
      (product as any).compareAtPrice ?? product.oldPrice;
    const validationError = getQuantityValidationError(product, selected, finalQty);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    sessionStorage.setItem(
      "buyNowItem",
      JSON.stringify({
        id: defaultVariant ? `${defaultVariant.id}-one` : product.id,
        type: "one-time",
        productId: product.id,
        name: product.productType === "variable" && defaultVariant
          ? `${product.name} (${[
            defaultVariant.option1Value,
            (defaultVariant as any)?.option2Value,
            (defaultVariant as any)?.option3Value,
          ]
            .filter(Boolean)
            .join(", ")})`
          : product.name,
        price: finalPrice,
        priceBeforeDiscount: basePrice,
        finalPrice: finalPrice,
        discountAmount:
          product.displayDiscountType === "System"
            ? discountAmount
            : 0,
        oldPrice: oldPriceValue ?? null,

        displayDiscountType:
          product.displayDiscountType ?? "None",

        hasSystemDiscount:
          product.hasSystemDiscount ?? false,

        systemDiscountAmount:
          product.systemDiscountAmount ?? 0,
        quantity: finalQty,
        vatRate: vatRate,
        vatIncluded: vatRate !== null,
        image: getProductDisplayImage(product, defaultVariant),
        sku: defaultVariant?.sku ?? product.sku,
        variantId: defaultVariant?.id ?? null,
        nextDayDeliveryEnabled: defaultVariant?.nextDayDeliveryEnabled ?? product.nextDayDeliveryEnabled ?? false,
        nextDayDeliveryFree: defaultVariant?.nextDayDeliveryFree ?? (product as any).nextDayDeliveryFree ?? false,

        slug: cardSlug,
        variantOptions: {
          option1: defaultVariant?.option1Value ?? null,
          option2: (defaultVariant as any)?.option2Value ?? null,
          option3: (defaultVariant as any)?.option3Value ?? null,
        },
        productData: JSON.parse(JSON.stringify(product)),
      })
    );

    if (shouldShowMinWarning(product, defaultVariant)) {
      toast.warning(
        `Minimum order quantity is ${finalQty}. Proceeding with ${finalQty}.`
      );
    }


    if (!isAuthenticated) {
      router.push("/account?from=buy-now");
    } else {
      router.push("/checkout");
    }
  };



  const getInitialQty = (product: any, variant?: any) => {
    return variant?.orderMinimumQuantity ?? product.orderMinimumQuantity ?? 1;
  };

  const shouldShowMinWarning = (product: any, variant?: any) => {
    const minQty = variant?.orderMinimumQuantity ?? product.orderMinimumQuantity;
    return minQty && minQty > 1;
  };

  // Shared quantity/stock validation used by every Add to Cart / Buy Now path in this
  // slider (plain card, pharma-modal confirm) — one place to fix instead of four.
  // `existingQty` is the quantity already in the real cart for this exact
  // product+variant — 0 for Buy Now, since it doesn't touch the cart at all.
  const getQuantityValidationError = (
    product: any,
    variant: any,
    qty: number,
    existingQty: number = 0
  ): string | null => {
    const stockQty = variant?.stockQuantity ?? product.stockQuantity ?? 0;
    const minQty = variant?.orderMinimumQuantity ?? product.orderMinimumQuantity ?? 1;
    const maxQty = variant?.orderMaximumQuantity ?? product.orderMaximumQuantity ?? Infinity;

    if (qty < minQty) return `Minimum order quantity is ${minQty}`;
    if (existingQty + qty > maxQty) return `Maximum order quantity is ${maxQty}`;
    if (existingQty + qty > stockQty) {
      return existingQty > 0
        ? `Only ${stockQty - existingQty} items left in stock`
        : `Only ${stockQty} items available`;
    }
    return null;
  };


  return (
    <div className="relative w-full bg-gray-50">

      <div className="relative mb-4 md:mb-8">
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="absolute right-0 top-1 text-xs md:text-base font-medium text-[#445D41] bg-green-50 border border-green-200 px-1 md:px-2 py-1 rounded hover:text-green-700 transition"
          >
            View All →
          </Link>
        )}
        <h2 className="text-xl md:text-3xl font-bold text-gray-900 text-center">
          {title}
        </h2>
      </div>
      {shouldShowNav && (
        <button
          id="prevBtn"
          className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 z-20"
        >
          <ChevronLeft className="w-8 h-8 text-gray-700" />
        </button>
      )}

      {shouldShowNav && (
        <button
          id="nextBtn"
          className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-20"
        >
          <ChevronRight className="w-8 h-8 text-gray-700" />
        </button>
      )}

      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={16}
        slidesPerView={2}
        className="pb-12 featured-products-slider"
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 16 },
          768: { slidesPerView: 3, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 22 },
          1280: { slidesPerView: 4, spaceBetween: 24 },
        }}

        autoplay={{
          delay: 3000,
          disableOnInteraction: true, // 🔥 fix lag
          pauseOnMouseEnter: true,
        }}

        navigation={
          shouldShowNav
            ? { prevEl: "#prevBtn", nextEl: "#nextBtn" }
            : false
        }

        pagination={{ clickable: true, dynamicBullets: true }}

        loop={true} // 🔥 MOST IMPORTANT FIX

        watchSlidesProgress={true}
        resistanceRatio={0.85}
        touchRatio={1}
        simulateTouch={true}

      >
        {flattenedProducts.slice(0, 50).map((item) => {

          const product = item.productData;
          const variantForCard = item.variantForCard;
          const cardSlug = item.cardSlug;

          const defaultVariant =
            variantForCard ??
            (product as any).variants?.find((v: any) => v.isDefault);

          // 🎁 LOYALTY POINTS (PRODUCT + VARIANT AWARE)
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

          const basePrice =
            typeof defaultVariant?.price === "number" && defaultVariant.price > 0
              ? defaultVariant.price
              : product.price;

          const discountBadge = getDiscountBadge(product);
          const finalPrice = getDiscountedPrice(product, basePrice);
          // 🔥 NEW: oldPrice fallback logic
          const oldPriceValue =
            (defaultVariant as any)?.compareAtPrice ?? (defaultVariant as any)?.oldPrice ??
            (product as any).compareAtPrice ?? product.oldPrice;

          const oldPriceData =
            product.displayDiscountType === "OldPrice"
              ? getOldPriceDiscount(
                basePrice,
                oldPriceValue,
                false
              )
              : null;
          // ---------- Active Coupon (indicator only) ----------
          const hasActiveCoupon = (product as any).assignedDiscounts?.some((d: any) => {
            if (!d.isActive) return false;
            if (!d.requiresCouponCode) return false;

            const now = new Date();
            if (d.startDate && now < new Date(d.startDate)) return false;
            if (d.endDate && now > new Date(d.endDate)) return false;

            return true;
          });

          const discountAmount =
            basePrice > finalPrice
              ? +(basePrice - finalPrice).toFixed(2)
              : 0;

          const stock = defaultVariant?.stockQuantity ?? (product as any).stockQuantity ?? 0;
          const backorderState = getBackorderUIState({
            stock,
            allowBackorder: product.allowBackorder,
            backorderMode: product.backorderMode,
          });


          // Use vatRate directly from API response
          const vatRate: number | null = (product as any).vatRate ?? null;

          const hasGenderBadge = !!(
            product.gender &&
            ["male", "female", "unisex"].includes(product.gender.toLowerCase())
          );

          const hasTopRightBadge =
            (product.displayDiscountType === "System" && discountBadge) ||
            (!discountBadge && !hasActiveCoupon && oldPriceData) ||
            (!discountBadge && hasActiveCoupon);

          return (
            <SwiperSlide key={variantForCard?.id ?? product.id}>

              <Card
                className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl flex flex-col flex-1 overflow-hidden">
                <CardContent className="p-0 flex flex-col h-full">


                  {/* Product Image */}
                  <Link href={`/product/${cardSlug}`}>

                    {/* UNISEX Badge */}


                    {/* TOP LEFT BADGES (Pharma + Gender) */}
                    <div className="absolute top-2 left-2 z-20 flex flex-col items-center gap-2">
                      {product.isPharmaProduct && (
                        <div
                          className="bg-white/90 p-1 rounded-md shadow-sm border border-gray-100 inline-flex items-center justify-center shrink-0"
                          title="Pharma Product"
                        >
                          <img
                            src="/pharmacy-logo-v2.png"
                            alt="Pharma Product"
                            className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <GenderBadge gender={product.gender} absolute={false} />
                    </div>
                    <div className="group h-[176px] sm:h-[200px] md:h-[224px] flex items-center justify-center overflow-hidden bg-white rounded-t-xl pt-2 relative">


                      <ProductCardImage
                        src={getProductDisplayImage(product, defaultVariant)}
                        alt={product.name}
                      />


                      {/* Offer badge — top right, smaller */}
                      {product.displayDiscountType === "System" &&
                        discountBadge && (
                          <div className="absolute z-20 right-2 top-2">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-md ring-2 ring-white">
                              <div className="flex flex-col items-center leading-none">
                                {discountBadge.type === "percent" ? (
                                  <>
                                    <span className="text-[10px] sm:text-xs font-extrabold">{discountBadge.value}%</span>
                                    <span className="text-[7px] sm:text-[8px] font-semibold">OFF</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] sm:text-xs font-extrabold">£{discountBadge.value}</span>
                                    <span className="text-[7px] sm:text-[8px] font-semibold">OFF</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      {!discountBadge && !hasActiveCoupon && oldPriceData && (
                        <div className="absolute z-20 right-2 top-2">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-md ring-2 ring-white">
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-[10px] sm:text-xs font-extrabold">
                                {oldPriceData.discount}%
                              </span>
                              <span className="text-[7px] sm:text-[8px] font-semibold">
                                OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Coupon badge — top right, smaller */}
                      {!discountBadge && hasActiveCoupon && (
                        <div className="absolute z-20 right-2 top-2">
                          <div className="relative bg-gradient-to-br from-red-50 to-red-100 text-red-800 text-[9px] md:text-[10px] font-semibold px-2 py-1 rounded-md shadow-lg rotate-[-6deg] border border-red-200 leading-tight max-w-[96px] md:max-w-[96px]">

                            <div className="flex flex-col items-center text-center">
                              <span className="text-[9px] md:text-[10px] font-semibold">🎟 COUPON</span>
                              <span className="text-[8px] md:text-[9px] opacity-90">Available</span>
                            </div>

                            {/* hole */}
                            <span className="absolute -top-1 left-3 w-2 h-2 bg-white border border-red-200 rounded-full shadow-inner"></span>

                            {/* string effect */}
                            <span className="absolute -top-3 left-[14px] w-[1px] h-3 bg-gray-300"></span>

                          </div>
                        </div>
                      )}
                      {/* Wishlist — top right below badge */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const wishlistId = defaultVariant?.id ?? product.id;
                          const inWishlist = isInWishlist(wishlistId);
                          toggleWishlist({
                            id: wishlistId,
                            productId: product.id,
                            variantId: defaultVariant?.id ?? null,

                            name: product.productType === "variable" && defaultVariant
                              ? `${product.name} (${[
                                defaultVariant.option1Value,
                                (defaultVariant as any)?.option2Value,
                                (defaultVariant as any)?.option3Value,
                              ]
                                .filter(Boolean)
                                .join(", ")})`
                              : product.name,

                            slug: cardSlug,
                            price: finalPrice,

                            priceBeforeDiscount: basePrice,
                            finalPrice: finalPrice,
                            discountAmount:
                              product.displayDiscountType === "System"
                                ? discountAmount
                                : 0,
                            oldPrice: oldPriceValue ?? null,

                            displayDiscountType:
                              product.displayDiscountType ?? "None",

                            hasSystemDiscount:
                              product.hasSystemDiscount ?? false,

                            systemDiscountAmount:
                              product.systemDiscountAmount ?? 0,
                            appliedDiscountId: null, // slider me coupon nahi hai
                            couponCode: null,
                            image: getProductDisplayImage(product, defaultVariant),

                            vatRate: vatRate ?? null,
                            vatExempt: product.vatExempt,

                            sku: defaultVariant?.sku ?? (product as any).sku,

                            stockQuantity:
                              defaultVariant?.stockQuantity ??
                              (product as any).stockQuantity ??
                              null,
                            // 🔥🔥🔥 MAIN FIX
                            productData: JSON.parse(JSON.stringify(product)),

                            // 🔥 optional but useful — variant-level limits override product-level when set.
                            orderMaximumQuantity:
                              (defaultVariant as any)?.orderMaximumQuantity ?? (product as any).orderMaximumQuantity ?? null,
                            orderMinimumQuantity:
                              (defaultVariant as any)?.orderMinimumQuantity ?? (product as any).orderMinimumQuantity ?? null,
                          });
                          if (inWishlist) {
                            toast.error("Product removed from wishlist");
                          } else {
                            toast.success("Product added to wishlist!");
                          }
                        }}
                className={`absolute z-20 right-2 p-1.5 rounded-full transition-all
  ${hasTopRightBadge ? "top-14" : "top-2"}

  md:shadow-sm
  md:border

  ${
    isInWishlist(defaultVariant?.id ?? product.id)
      ? "text-red-500 md:bg-red-50 md:border-red-200"
      : "text-gray-600 hover:text-red-500 md:bg-white md:border-gray-200 md:hover:bg-red-50 md:hover:border-red-200"
  }
`}
                      >
                        <Heart
                          className={`h-5 w-5 transition-colors ${isInWishlist(defaultVariant?.id ?? product.id) ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
                            }`}
                        />
                      </button>
                    </div>
                  </Link>

                  {/* CONTENT */}
                  <div className="flex flex-col flex-grow px-1.5 md:px-3 pb-3 pt-2">

                    {/* FIXED TITLE HEIGHT */}
                    <div className="min-h-[42px] max-h-[42px] sm:min-h-[38px] sm:max-h-[38px] mb-0.5">
                      <Link href={`/product/${cardSlug}`} className="block">
                        <h3
                          className="
    font-semibold text-xs md:text-sm text-gray-800 line-clamp-2
    transition-all duration-300 group-hover:text-[#445D41] 
  "
                        >

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

                    {/* RATING + REVIEW + LOYALTY — single compact row */}
                    <div className="flex items-center gap-1 min-h-[20px] mb-0 flex-nowrap overflow-hidden">

                      {/* ⭐ Rating badge */}
                      <div className="flex items-center flex-shrink-0">
                        {(() => {
                          const rating = product.averageRating ?? 0;
                          return Array.from({ length: 5 }, (_, i) => {
                            const starIndex = i + 1;
                            if (rating >= starIndex) {
                              return <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />;
                            } else if (rating >= starIndex - 0.75) {
                              return <StarHalf key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />;
                            } else {
                              return <Star key={i} className="h-2.5 w-2.5 text-gray-300" />;
                            }
                          });
                        })()}
                        <span className="text-[10px] ml-0.5 font-semibold text-gray-700">
                          {(product.averageRating ?? 0).toFixed(1)}
                        </span>
                      </div>

                      {/* Review Count */}
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        ({product.reviewCount ?? 0})
                      </span>

                      {!backorderState.canBuy && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                          <PackageX className="h-2.5 w-2.5" />
                          Out of Stock
                        </span>
                      )}

                      {/* Loyalty */}
                      {/* {loyaltyPoints && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-green-700 bg-green-50 border border-green-200 px-0.5 py-0.5 rounded whitespace-nowrap leading-none flex-shrink-0">
                          <AwardIcon className="h-2.5 w-2.5 text-green-600 flex-shrink-0" />
                          Earn {loyaltyPoints} pts
                        </span>
                      )} */}

                    </div>



                    {/* PRICE ROW FIXED HEIGHT */}
                    {/* PRICE + LOYALTY (SAME RESERVED SPACE) */}
                    <div className="min-h-[30px] mt-1 mb-0 flex flex-col justify-center">

                      {/* PRICE ROW */}
                      <div className="flex items-center gap-0.5 sm:gap-2">
                        <span className="text-lg font-bold text-[#445D41] leading-none">
                          £{
                            (
                              product.displayDiscountType === "System"
                                ? finalPrice
                                : basePrice
                            ).toFixed(2)
                          }
                        </span>

                        {/* 🔥 CASE 1: REAL DISCOUNT */}
                        {product.displayDiscountType === "System" &&
                          discountBadge && (
                            <span className="text-xs text-gray-400 line-through leading-none">
                              £{basePrice.toFixed(2)}
                            </span>
                          )}

                        {/* 🔥 CASE 2: OLD PRICE (NO DISCOUNT) */}
                        {!discountBadge && !hasActiveCoupon && oldPriceData && (
                          <span className="text-xs text-gray-400 line-through leading-none">
                            £{oldPriceData.oldPrice.toFixed(2)}
                          </span>
                        )}
                        {product.vatExempt && vatRate === 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] font-bold text-white bg-black/80 border border-black/20 px-1 py-0.5 rounded whitespace-nowrap leading-none">
                            <BadgePercent className="h-2.5 w-2.5" />
                            VAT Relief
                          </span>
                        ) : vatRate !== null && vatRate > 0 ? (
                          <span className="text-[8px] sm:text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 rounded whitespace-nowrap leading-none">
                            {vatRate}% VAT
                          </span>
                        ) : null}
                      </div>



                    </div>

                    {/* ACTION BUTTONS */}
          {/* ACTION BUTTONS */}
<div className="mt-auto flex items-center gap-1 md:gap-2 pt-1.5">

  {/* ⭐ CASE: IN STOCK OR CAN BUY */}
  {backorderState.canBuy && (
    <>
      {/* ADD TO CART */}
      <Button
        disabled={product.disableBuyButton === true}
        onClick={() => {
          if (product.disableBuyButton) return;
          // 🔥 PHARMA PRODUCT GUARD
          if (product.isPharmaProduct) {
            setPharmaModal({
              product,
              variant: defaultVariant,
              action: "ADD_TO_CART",
              basePrice,
              finalPrice,
              discountAmount,
              cardSlug,
            });
            return;
          }


          const defaultVarId = defaultVariant?.id ?? null;

          const existingCartQty = cart
            .filter(
              (c) =>
                c.productId === product.id &&
                (c.variantId ?? null) === defaultVarId
            )
            .reduce((sum, c) => sum + (c.quantity ?? 0), 0);

          const finalQty = getInitialQty(product, defaultVariant);

          const validationError = getQuantityValidationError(product, defaultVariant, finalQty, existingCartQty);
          if (validationError) {
            toast.error(validationError);
            return;
          }

          addToCart({
            id: defaultVariant ? `${defaultVariant.id}-one` : product.id,
            type: "one-time",
            productId: product.id,
            name: product.productType === "variable" && defaultVariant
              ? `${product.name} (${[
                defaultVariant.option1Value,
                (defaultVariant as any)?.option2Value,
                (defaultVariant as any)?.option3Value,
              ]
                .filter(Boolean)
                .join(", ")})`
              : product.name,
            price: finalPrice,
            priceBeforeDiscount: basePrice,
            finalPrice: finalPrice,
            oldPrice:
              (defaultVariant as any)?.compareAtPrice ?? defaultVariant?.oldPrice ??
              oldPriceValue ??
              (product as any).compareAtPrice ?? product.oldPrice ??
              undefined,
            displayDiscountType:
              defaultVariant?.displayDiscountType ??
              product.displayDiscountType ??
              "None",

            hasSystemDiscount:
              defaultVariant?.hasSystemDiscount ??
              product.hasSystemDiscount ??
              false,

            systemDiscountAmount:
              defaultVariant?.systemDiscountAmount ??
              product.systemDiscountAmount ??
              0,
            discountAmount:
              (
                defaultVariant?.displayDiscountType ??
                product.displayDiscountType
              ) === "System"
                ? discountAmount
                : 0,
            quantity: finalQty,
            // ✅ ADD THESE 👇
            vatRate: vatRate,
            vatIncluded: vatRate !== null,
            image: getProductDisplayImage(product, defaultVariant),
            sku: defaultVariant?.sku ?? product.sku,
            shipSeparately: product.shipSeparately,
            nextDayDeliveryEnabled: defaultVariant?.nextDayDeliveryEnabled ?? product.nextDayDeliveryEnabled ?? false,
            // 🔥🔥🔥 MAIN FIX
            nextDayDeliveryFree:
              defaultVariant?.nextDayDeliveryFree ?? (product as any).nextDayDeliveryFree ?? false,
            sameDayDeliveryEnabled: product.sameDayDeliveryEnabled ?? false,
            variantId: defaultVariant?.id ?? null,
            slug: cardSlug,
            variantOptions: {
              option1: defaultVariant?.option1Value ?? null,
              option2: (defaultVariant as any)?.option2Value ?? null,
              option3: (defaultVariant as any)?.option3Value ?? null,
            },
            productData: JSON.parse(JSON.stringify(product)),
          });

          trackAddToCart({
            productId: product.id,
            name: product.name,
            sku: defaultVariant?.sku ?? product.sku,
            finalPrice,
            price: finalPrice,
            quantity: finalQty,
            categories: (product as any).categories,
            variantId: defaultVariant?.id ?? null,
            variantOptions: {
              option1: defaultVariant?.option1Value ?? null,
              option2: (defaultVariant as any)?.option2Value ?? null,
              option3: (defaultVariant as any)?.option3Value ?? null,
            },
          });

          // The header's mini-cart dropdown opens automatically (see CartContext.addToCart)
          // showing exactly what was just added — no separate toast needed for the success case.
          if (shouldShowMinWarning(product, defaultVariant)) {
            toast.warning(
              `Minimum order quantity is ${finalQty}. Added ${finalQty} items to cart.`
            );
          }

        }}

        className="flex-[0.47] md:flex-1 text-[9px] md:text-sm py-1.5 md:py-2 whitespace-nowrap flex items-center justify-center gap-1 md:gap-2
bg-[#445D41] hover:bg-black text-white
disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
        Add
      </Button>

      {/* BUY NOW */}
      <Button
        disabled={product.disableBuyButton === true}
        onClick={() => {
          if (product.disableBuyButton) return;

          // 🔥 PHARMA PRODUCT GUARD
          if (product.isPharmaProduct) {
            setPharmaModal({
              product,
              variant: defaultVariant,
              action: "BUY_NOW",
              basePrice,
              finalPrice,
              discountAmount,
              cardSlug,
            });
            return;
          }
          handleBuyNow(
            product,
            defaultVariant,
            basePrice,
            finalPrice,
            discountAmount,
            cardSlug
          );
        }}
        className="flex-[0.47] md:flex-1 text-[9px] md:text-sm py-1.5 md:py-2 whitespace-nowrap flex items-center justify-center gap-1 md:gap-2
bg-black border border-[#445D41] text-white hover:bg-[#445D41]
disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Zap className="h-3 w-3 md:h-4 md:w-4" />
        Buy
      </Button>
    </>
  )}

  {/* ⭐ CASE: OUT OF STOCK - Only Notify Me (Full Width) */}
  {!backorderState.canBuy && (
    <Button
      onClick={() => {
        // 🔥 PHARMA PRODUCT GUARD - Pharma products can also be out of stock
        if (product.isPharmaProduct) {
          setPharmaModal({
            product,
            variant: defaultVariant,
            action: "ADD_TO_CART",
            basePrice,
            finalPrice,
            discountAmount,
            cardSlug,
          });
          return;
        }
        setNotifyProduct({
          productId: product.id,
          variantId: defaultVariant?.id ?? null,
        });
      }}
      className="w-full text-xs md:text-sm py-1.5 md:py-2 rounded-lg bg-[#445D41] hover:bg-black text-white font-semibold flex items-center justify-center gap-2"
    >
      <BellRing className="h-3 w-3 md:h-4 md:w-4" />
      Notify Me
    </Button>
  )}
</div>


                  </div>
                </CardContent>
              </Card>
            </SwiperSlide>
          );
        })}
      </Swiper>
      {/* 🔔 BACK IN STOCK MODAL (GLOBAL) */}
      {notifyProduct && (
        <BackInStockModal
          open={true}
          productId={notifyProduct.productId}
          variantId={notifyProduct.variantId}
          onClose={() => setNotifyProduct(null)}
        />
      )}
      {pharmaModal && (
        <PharmaQuestionsModal
          open={true}
          productId={pharmaModal.product.id}
          mode="add"
          onClose={() => setPharmaModal(null)}
          onSuccess={() => {
            const {
              product,
              variant,
              action,
              basePrice,
              finalPrice,
              discountAmount,
              cardSlug,
            } = pharmaModal;

            if (action === "ADD_TO_CART") {
              const finalQty = getInitialQty(product, variant);


              const defaultVarId = variant?.id ?? null;

              const existingCartQty = cart
                .filter(
                  (c) =>
                    c.productId === product.id &&
                    (c.variantId ?? null) === defaultVarId
                )
                .reduce((sum, c) => sum + (c.quantity ?? 0), 0);

              const validationError = getQuantityValidationError(product, variant, finalQty, existingCartQty);
              if (validationError) {
                toast.error(validationError);
                return;
              }
              // Use vatRate directly from API response
              const modalVatRate: number | null =
                !product.vatExempt ? ((product as any).vatRate ?? null) : null;

              addToCart({
                id: variant ? `${variant.id}-one` : product.id,
                type: "one-time",
                productId: product.id,
                name: product.productType === "variable" && variant
                  ? `${product.name} (${[
                    variant.option1Value,
                    (variant as any)?.option2Value,
                    (variant as any)?.option3Value,
                  ]
                    .filter(Boolean)
                    .join(", ")})`
                  : product.name,
                price: finalPrice,
                priceBeforeDiscount: basePrice,
                finalPrice,
                discountAmount,
                quantity: finalQty,
                // ✅ ADD THESE 👇
                vatRate: modalVatRate,
                vatIncluded: modalVatRate !== null,
                image: getProductDisplayImage(product, variant),
                sku: variant?.sku ?? product.sku,
                shipSeparately: product.shipSeparately,
                nextDayDeliveryEnabled: variant?.nextDayDeliveryEnabled ?? product.nextDayDeliveryEnabled ?? false,
                // 🔥🔥🔥 MAIN FIX
                nextDayDeliveryFree:
                  variant?.nextDayDeliveryFree ?? (product as any).nextDayDeliveryFree ?? false,
                sameDayDeliveryEnabled: product.sameDayDeliveryEnabled ?? false,
                variantId: variant?.id ?? null,
                slug: cardSlug,
                variantOptions: {
                  option1: variant?.option1Value ?? null,
                  option2: (variant as any)?.option2Value ?? null,
                  option3: (variant as any)?.option3Value ?? null,
                },
                productData: JSON.parse(JSON.stringify(product)),
              });

              // The header's mini-cart dropdown opens automatically (see CartContext.addToCart)
              // showing exactly what was just added — no separate toast needed here.
            }

            if (action === "BUY_NOW") {
              // handleBuyNow runs the same shared quantity/stock validation itself
              // (getQuantityValidationError) before proceeding — no need to duplicate it here.
              handleBuyNow(
                product,
                variant,
                basePrice,
                finalPrice,
                discountAmount,
                cardSlug
              );
            }

            setPharmaModal(null);
          }}
        />
      )}

    </div>
  );
}
