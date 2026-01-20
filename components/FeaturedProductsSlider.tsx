"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ChevronLeft, ChevronRight,  BadgePercent, Zap,BellRing, Heart, CircleOff, PackageX, Award, Badge, Coins, AwardIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/CustomToast";
import {
  getDiscountBadge,
  getDiscountedPrice,
} from "@/app/lib/discountHelpers";
import GenderBadge from "@/components/shared/GenderBadge";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getBackorderUIState } from "@/app/lib/backorderHelpers";
import BackInStockModal from "@/components/backorder/BackInStockModal";
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
}
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  averageRating?: number;
  reviewCount?: number;
  images?: { imageUrl: string }[];
  vatExempt?: boolean;
  gender?: string;
  variants?: Variant[];  // 🟢 ADD THIS
  stockQuantity?: number; // optional fallback if simple product
  sku?: string;           // for simple product
   allowBackorder?: boolean;
  backorderMode?: string;
}


export default function FeaturedProductsSlider({
  products,
  baseUrl,
}: {
  products: Product[];
  baseUrl: string;
}) {
  const toast = useToast();
  const { addToCart } = useCart();
  const router = useRouter();
const { isAuthenticated } = useAuth();
const [vatRates, setVatRates] = useState<any[]>([]);
const [notifyProduct, setNotifyProduct] = useState<{
  productId: string;
  variantId?: string | null;
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
  discountAmount: number
) => {

  // 🔒 Save buy-now product (cart ko touch nahi karta)
  sessionStorage.setItem(
    "buyNowItem",
    JSON.stringify({
      id: defaultVariant ? `${defaultVariant.id}-one` : product.id,
      type: "one-time",
      productId: product.id,
      name: defaultVariant
        ? `${product.name} (${[
            defaultVariant.option1Value,
            (defaultVariant as any)?.option2Value,
            (defaultVariant as any)?.option3Value,
          ]
            .filter(Boolean)
            .join(", ")})`
        : product.name,
     price: finalPrice,                  // ⭐ important
priceBeforeDiscount: basePrice,
finalPrice: finalPrice,
discountAmount: discountAmount,
      quantity: 1,
      image: defaultVariant?.imageUrl
        ? defaultVariant.imageUrl.startsWith("http")
          ? defaultVariant.imageUrl
          : `${baseUrl}${defaultVariant.imageUrl}`
        : product.images?.[0]?.imageUrl
        ? product.images[0].imageUrl.startsWith("http")
          ? product.images[0].imageUrl
          : `${baseUrl}${product.images[0].imageUrl}`
        : "/placeholder.jpg",
      sku: defaultVariant?.sku ?? product.sku,
      variantId: defaultVariant?.id ?? null,
      slug: product.slug,
      variantOptions: {
        option1: defaultVariant?.option1Value ?? null,
        option2: (defaultVariant as any)?.option2Value ?? null,
        option3: (defaultVariant as any)?.option3Value ?? null,
      },
    })
  );

  // 🔐 Auth-safe redirect
  if (!isAuthenticated) {
    router.push("/account?from=buy-now");
  } else {
    router.push("/checkout");
  }
};


useEffect(() => {
  const fetchVatRates = async () => {
    try {
      const res = await fetch("https://testapi.knowledgemarkg.com/api/VATRates?activeOnly=true");
      const json = await res.json();
      setVatRates(json.data || []);
    } catch (error) {
      console.error("VAT rates error:", error);
    }
  };

  fetchVatRates();
}, []);

  return (
    <div className="relative w-full bg-gray-50">

      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900 text-center">
        Top Selling Products
      </h2>

      <button id="prevBtn" className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0">
        <ChevronLeft className="w-8 h-8 text-gray-700" />
      </button>

      <button id="nextBtn" className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0">
        <ChevronRight className="w-8 h-8 text-gray-700" />
      </button>

      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={16}
        slidesPerView={2}
        className="pb-12"
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 16 },
          768: { slidesPerView: 3, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 22 },
          1280: { slidesPerView: 4, spaceBetween: 24 },
        }}
        autoplay={{ delay: 2400, disableOnInteraction: false,  pauseOnMouseEnter: true,  }}
        navigation={{ prevEl: "#prevBtn", nextEl: "#nextBtn" }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={true}
      >
        {products.map((product) =>  {
          const defaultVariant = (product as any).variants?.find((v: any) => v.isDefault);
          
const basePrice = defaultVariant?.price ?? product.price;
const discountBadge = getDiscountBadge(product);
const finalPrice = getDiscountedPrice(product, basePrice);
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


  const vatRate =
    !product.vatExempt && (product as any).vatRateId
      ? vatRates.find(v => v.id === (product as any).vatRateId)?.rate
      : null;
        
       return (
          <SwiperSlide key={product.id}>
          <Card
  className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl flex flex-col gap-1  h-[420px] sm:h-auto">
            <CardContent className="p-0 flex flex-col h-full">


                {/* Product Image */}
                <Link href={`/products/${product.slug}`}>
                  
                  {/* UNISEX Badge */}
                <GenderBadge gender={product.gender} />


                 <div className="group h-[140px] sm:h-[160px] md:h-[180px] flex items-center justify-center overflow-hidden bg-white rounded-t-xl pt-2 relative">
               

                  <img
  src={getProductDisplayImage(product, defaultVariant)}
  alt={product.name}
  className="object-contain w-full h-full transform transition duration-300 group-hover:scale-110"
  onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.jpg")}
/>


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
                </div>
                </Link>

                {/* CONTENT */}
             <div className="flex flex-col flex-grow px-3 pb-3 pt-2">

                  {/* FIXED TITLE HEIGHT */}
                 <div className="min-h-[42px] max-h-[42px] sm:min-h-[38px] sm:max-h-[38px] mb-2">
                    <Link href={`/products/${product.slug}`} className="block">
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

                  {/* RATING FIXED HEIGHT */}
               <div className="flex items-center gap-2 min-h-[22px] max-h-[22px] mb-2">

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
 <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
    <BadgePercent className="h-3 w-3" />
    VAT Relief
  </span>
)}


</div>



                  {/* PRICE ROW FIXED HEIGHT */}
            {/* PRICE + LOYALTY (SAME RESERVED SPACE) */}
<div className="min-h-[42px] mb-3 flex flex-col justify-center">

  {/* PRICE ROW */}
  <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
    <span className="text-lg font-bold text-blue-600 leading-none">
      £{finalPrice.toFixed(2)}
    </span>

    {discountBadge && (
      <span className="text-xs text-gray-400 line-through leading-none">
        £{basePrice.toFixed(2)}
      </span>
    )}

    {product.vatExempt ? (
      <span className="text-[8px] sm:text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 rounded whitespace-nowrap leading-none">
        (0% VAT)
      </span>
    ) : vatRate !== null ? (
      <span className="text-[8px] sm:text-[10px] font-semibold text-blue-700 bg-blue-100 px-1 py-0.5 rounded whitespace-nowrap leading-none">
        ({vatRate}% VAT)
      </span>
    ) : null}
    {hasActiveCoupon && (
  <span className="text-[8px] sm:text-[10px] font-semibold text-red-700 bg-red-100 px-1 py-0.5 rounded whitespace-nowrap leading-none">
    Coupon!
  </span>
)}

  </div>

{/* LOYALTY INLINE (NO EXTRA MARGIN) */}
{(product as any).loyaltyPointsEnabled && (
  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md w-fit leading-none">
    <AwardIcon className="h-4 w-4 text-green-600" />
    {(product as any).loyaltyPointsMessage ??
      `Earn ${(product as any).loyaltyPointsEarnable} points`}
  </span>
)}

</div>

{/* ACTION BUTTONS */}
<div className="mt-auto flex items-center gap-2 pt-0">

  {/* ⭐ CASE: IN STOCK OR CAN BUY */}
  {backorderState.canBuy && (
    <>
      {/* ADD TO CART */}
      <Button
        onClick={() => {
          addToCart({
            id: defaultVariant ? `${defaultVariant.id}-one` : product.id,
            type: "one-time",
            productId: product.id,
            name: defaultVariant
              ? `${product.name} (${[
                  defaultVariant.option1Value,
                  (defaultVariant as any)?.option2Value,
                  (defaultVariant as any)?.option3Value,
                ]
                  .filter(Boolean)
                  .join(", ")})`
              : product.name,
           price: finalPrice,                 // ⭐ cart calculation ke liye
priceBeforeDiscount: basePrice,    // ⭐ original reference
finalPrice: finalPrice,            // ⭐ discounted price
discountAmount: discountAmount,    // ⭐ actual discount

            quantity: 1,
            image: defaultVariant?.imageUrl
              ? defaultVariant.imageUrl.startsWith("http")
                ? defaultVariant.imageUrl
                : `${baseUrl}${defaultVariant.imageUrl}`
              : product.images?.[0]?.imageUrl
              ? product.images[0].imageUrl.startsWith("http")
                ? product.images[0].imageUrl
                : `${baseUrl}${product.images[0].imageUrl}`
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
          });

          toast.success(`${product.name} added to cart!`);
        }}
        className="flex-1 text-xs md:text-sm rounded-lg py-2 flex items-center justify-center gap-2 bg-[#445D41] hover:bg-black text-white"
      >
        <ShoppingCart className="h-4 w-4" />
        Add
      </Button>

      {/* BUY NOW */}
      <Button
       onClick={() =>
  handleBuyNow(
    product,
    defaultVariant,
    basePrice,
    finalPrice,
    discountAmount
  )
}

        className="flex-1 text-xs md:text-sm rounded-lg py-2 bg-black border border-[#445D41] text-white hover:bg-[#445D41] disabled:bg-gray-300 disabled:text-gray-600 disabled:border-gray-300"
      >
        <Zap className="h-4 w-4" />
        Buy
      </Button>
       {/* ❤️ WISHLIST ICON RIGHT SIDE */}
  <button
    onClick={() => toast.success("Added to wishlist!")}
    className="p-2 rounded-md border border-gray-300 hover:bg-black hover:text-white transition flex-shrink-0"
  >
    <Heart className="h-4 w-4" />
  </button>
  
    </>
  )}

  {/* ⭐ CASE: BACKORDER NOTIFY MODE */}
  {backorderState.showNotify && (
    <>
      {/* ADD TO CART KE JAGAH NOTIFY */}
      <Button
        variant="outline"
        className="w-full text-xs md:text-xs border border-green-500 text-green-700 hover:bg-green-50"
        onClick={() =>
          setNotifyProduct({
            productId: product.id,
            variantId: defaultVariant?.id ?? null,
          })
        }
      >
        <BellRing className="h-3 w-3" />
  Notify me
      </Button>

      {/* BUY NOW DISABLED */}
      <Button
        disabled
        className="w-full text-xs md:text-sm rounded-lg py-2 bg-gray-300 text-gray-600 cursor-not-allowed"
      >
        <PackageX className="h-4 w-4" />
        Stock!
      </Button>
    </>
  )}

  {/* ⭐ CASE: PURE OUT OF STOCK (NO BACKORDER) */}
  {!backorderState.canBuy && !backorderState.showNotify && (
    <>
      {/* ADD TO CART DISABLED WITH TEXT */}
      <Button
        disabled
        className="w-full text-xs md:text-sm rounded-lg py-2 bg-gray-400 cursor-not-allowed text-white"
      >
        <CircleOff className="h-4 w-4" />
        Stock!
      </Button>

      {/* BUY NOW DISABLED */}
      <Button
        disabled
        className="w-full text-xs md:text-sm rounded-lg py-2 bg-gray-300 text-gray-600 cursor-not-allowed"
      >
        <Zap className="h-4 w-4" />
        Buy Now
      </Button>
    </>
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
    </div>
  );
}
