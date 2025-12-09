"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ChevronLeft, ChevronRight,  BadgePercent } from "lucide-react";
import { useState, useEffect } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/CustomToast";
import { getProductDiscountPercent } from "@/app/lib/discountHelpers";

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
const [vatRates, setVatRates] = useState<any[]>([]);

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
          1280: { slidesPerView: 5, spaceBetween: 24 },
        }}
        autoplay={{ delay: 2400, disableOnInteraction: false }}
        navigation={{ prevEl: "#prevBtn", nextEl: "#nextBtn" }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={true}
      >
        {products.map((product) =>  {
          const defaultVariant = (product as any).variants?.find((v: any) => v.isDefault);
          
const basePrice = defaultVariant?.price ?? product.price;
const comparePrice = defaultVariant?.compareAtPrice ?? product.oldPrice ?? null;
const stock = defaultVariant?.stockQuantity ?? (product as any).stockQuantity ?? 0;
const discountPercent = getProductDiscountPercent(product, basePrice);
  const vatRate =
    !product.vatExempt && (product as any).vatRateId
      ? vatRates.find(v => v.id === (product as any).vatRateId)?.rate
      : null;
        
       return (
          <SwiperSlide key={product.id}>
            <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl 
                             h-[330px] md:h-[370px] flex flex-col justify-between">
              <CardContent className="p-0 flex flex-col h-full">

                {/* Product Image */}
                <Link href={`/products/${product.slug}`}>
                  
                  {/* UNISEX Badge */}
                 <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20 bg-white/90 px-1 py-0.5 sm:px-2 sm:py-1 rounded-md shadow flex items-center gap-1">


                    <img 
  src="/icons/unisex.svg" 
  alt="Unisex"
  className="h-3 w-3 sm:h-4 sm:w-4"
  loading="lazy"
/>
                    <span className="text-[8px] sm:text-[10px] font-semibold text-gray-700">Unisex</span>
                  </div>

                 <div className="h-[140px] sm:h-[160px] md:h-[180px] flex items-center justify-center overflow-hidden bg-white rounded-t-xl pt-2 relative">
                  {discountPercent > 0 && (
  <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold z-20 shadow">
    -{discountPercent}% OFF
  </div>
)}
                    <img
                      src={
                        product.images?.[0]?.imageUrl
                          ? (product.images[0].imageUrl.startsWith("http")
                              ? product.images[0].imageUrl
                              : `${baseUrl}${product.images[0].imageUrl}`)
                          : "/placeholder.jpg"
                      }
                      alt={product.name}
                      className="object-contain w-full h-full"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.jpg")}
                    />

                    {product.vatExempt && (
                     <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 bg-green-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow flex items-center gap-1 text-[8px] sm:text-[10px] font-semibold">

                        <BadgePercent className="h-3 w-3" />
                        VAT Relief
                      </div>
                    )}
                  </div>
                </Link>

                {/* CONTENT */}
              <div className="flex flex-col flex-grow px-3 pb-3 md:px-4 md:pb-4 pt-2">


                  {/* FIXED TITLE HEIGHT */}
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

                  {/* RATING FIXED HEIGHT */}
                  <div className="flex items-center gap-2 min-h-[20px] mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{product.averageRating?.toFixed(1) || "0.0"}</span>
                    <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
                  </div>

                  {/* PRICE ROW FIXED HEIGHT */}
              <div className="flex items-center gap-1 sm:gap-2 min-h-[26px] mb-3 flex-wrap sm:flex-nowrap">

                    <span className="text-lg font-bold text-blue-600">
  £{basePrice.toFixed(2)}
</span>

{comparePrice && (
  <span className="text-xs text-gray-400 line-through">
    £{comparePrice.toFixed(2)}
  </span>
)}

                   {product.vatExempt ? (
  <span className="text-[8px] sm:text-[10px] font-semibold text-green-700 bg-green-100 px-1 py-0.5 rounded whitespace-nowrap">
    (0% VAT)
  </span>
) : vatRate !== null ? (
  <span className="text-[8px] sm:text-[10px] font-semibold text-blue-700 bg-blue-100 px-1 py-0.5 rounded whitespace-nowrap">
    ({vatRate}% VAT)
  </span>
) : null}
                  </div>

                  {/* ADD TO CART BUTTON */}
                 <Button
  disabled={stock === 0}
  onClick={() => {
    if (stock === 0) return; // Prevent triggering
    addToCart({
      id: defaultVariant ? `${defaultVariant.id}-one` : product.id,
      type: "one-time",
      productId: product.id,
      name: defaultVariant
      ? `${product.name} (${[
          defaultVariant.option1Value,
          (defaultVariant as any).option2Value,
          (defaultVariant as any).option3Value
        ].filter(Boolean).join(", ")})`
      : product.name,
      price: basePrice,
      priceBeforeDiscount: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      couponCode: null,
      appliedDiscountId: null,
      quantity: 1,
     image: defaultVariant?.imageUrl
  ? (defaultVariant.imageUrl.startsWith("http")
      ? defaultVariant.imageUrl
      : `${baseUrl}${defaultVariant.imageUrl}`)
  : (product.images?.[0]?.imageUrl
      ? (product.images[0].imageUrl.startsWith("http")
          ? product.images[0].imageUrl
          : `${baseUrl}${product.images[0].imageUrl}`)
      : "/placeholder.jpg"),
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
  className={`mt-auto w-full text-xs md:text-sm rounded-lg py-2 flex items-center justify-center gap-2
    ${stock === 0
      ? "bg-gray-400 cursor-not-allowed opacity-60 text-white"
      : "bg-[#445D41] hover:bg-black text-white"
    }`}
>
  {stock === 0 ? (
    "Out of Stock"
  ) : (
    <>
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Cart
    </>
  )}
</Button>
                </div>
              </CardContent>
            </Card>
          </SwiperSlide>
       );
})}
      </Swiper>
    </div>
  );
}
