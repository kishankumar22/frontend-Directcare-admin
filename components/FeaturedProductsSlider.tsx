"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Users, BadgePercent} from "lucide-react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/CustomToast";


import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  averageRating?: number;
  reviewCount?: number;
  images?: { imageUrl: string }[];
    taxExempt?: boolean;
gender?: string; // optional if you want "Unisex" logic later
}

export default function FeaturedProductsSlider({
  products,
  baseUrl,
}: {
  products: Product[];
  baseUrl: string;
}) {
   // ✅ Step 2 — yahan likh
 const toast = useToast();
  const { addToCart } = useCart();
  return (
    <div className="relative w-full bg-gray-50">

      {/* ✅ Heading Center */}
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900 text-center">
        Top Selling Products
      </h2>

      {/* ✅ Arrows (Show on mobile + desktop) */}
      <button
  id="prevBtn"
  className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0"
>
  <ChevronLeft className="w-8 h-8 text-gray-700" />
</button>

<button
  id="nextBtn"
  className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0"
>
  <ChevronRight className="w-8 h-8 text-gray-700" />
</button>


      {/* ✅ Swiper */}
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={16}
        slidesPerView={2}
         className="pb-12"  // ✅ dots ko neeche la diya
        breakpoints={{
          640: { slidesPerView: 2, spaceBetween: 16 },
          768: { slidesPerView: 3, spaceBetween: 20 },
          1024: { slidesPerView: 4, spaceBetween: 22 },
          1280: { slidesPerView: 5, spaceBetween: 24 }, // ✅ Desktop → 5 Cards
        }}
        

        autoplay={{ delay: 2400, disableOnInteraction: false }}
        navigation={{
          prevEl: "#prevBtn",
          nextEl: "#nextBtn",
        }}
         pagination={{
    clickable: true,
    dynamicBullets: true, // ✅ professional moving bullets
  }}
        loop={true}
      >
        {products.map((product) => (
      <SwiperSlide key={product.id}>
  <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl 
                   h-[330px] md:h-[370px] flex flex-col justify-between">
    <CardContent className="p-0 flex flex-col h-full">

      {/* ✅ FIXED IMAGE HEIGHT */}
      <Link href={`/products/${product.slug}`}>
      {/* UNISEX Badge */}
<div className="absolute top-2 left-2 z-20 bg-white/90 px-2 py-1 rounded-full shadow flex items-center gap-1">
  <Users className="h-3 w-3 text-gray-700" />
  <span className="text-[10px] font-semibold text-gray-700">Unisex</span>
</div>

        <div className="h-[120px] md:h-[150px] flex items-center justify-center overflow-hidden bg-white rounded-t-xl">
          <img
  src={
    product.images?.[0]?.imageUrl
      ? (
          product.images[0].imageUrl.startsWith("http")
            ? product.images[0].imageUrl
            : `${baseUrl}${product.images[0].imageUrl}`
        )
      : "/placeholder.jpg"   // ← default placeholder
  }
  alt={product.name}
  className="object-contain w-full h-full"
  onError={(e) => {
    (e.target as HTMLImageElement).src = "/placeholder.jpg"; // ← fallback on broken link
  }}
/>

          {product.taxExempt && (
  <div className="absolute top-2 right-2 z-20 bg-green-600 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 text-[10px] font-semibold">
    <BadgePercent className="h-3 w-3" />
    VAT Relief
  </div>
)}

        </div>
      </Link>

      {/* ✅ CONTENT WITH FIXED HEIGHT */}
      <div className="flex flex-col flex-grow p-3 md:p-4">

        {/* ✅ FIXED TITLE HEIGHT (50px) */}
      <Link  href={`/products/${product.slug}`} className="block">
   <h3
   className="font-semibold text-xs md:text-sm text-gray-800
               line-clamp-2 break-words"
    style={{
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 2,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
     {product.name}
   </h3>
</Link>



        {/* ✅ FIXED RATING HEIGHT (24px) */}
        <div className="flex items-center gap-2 mb-2 min-h-[24px]">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-xs">{product.averageRating?.toFixed(1) || "0.0"}</span>
          <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
        </div>

        {/* ✅ PRICE ROW (ALWAYS SAME POSITION) */}
       <div className="flex items-center gap-2 mb-3">
  <span className="text-lg font-bold text-blue-600">£{product.price}</span>

  {product.oldPrice && (
    <span className="text-xs text-gray-400 line-through">£{product.oldPrice}</span>
  )}

  {product.taxExempt && (
    <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
      (0% VAT)
    </span>
  )}
</div>


        {/* ✅ BUTTON ALWAYS AT BOTTOM — NO MOVEMENT */}
      
      <Button
  onClick={() => {
    const basePrice = product.price;
    const final = basePrice; // homepage me auto-discount nahi, simple price
    const discountAmount = 0;

    addToCart({
      id: product.id,
      productId: product.id,

      name: product.name,

      // ⭐ REQUIRED FOR CART COUPON + DISCOUNT SYSTEM
      price: final,
      priceBeforeDiscount: basePrice,
      finalPrice: final,
      discountAmount: discountAmount,
      couponCode: null,
      appliedDiscountId: null,

      quantity: 1,

      image: product.images?.[0]?.imageUrl
        ? (product.images[0].imageUrl.startsWith("http")
            ? product.images[0].imageUrl
            : `${baseUrl}${product.images[0].imageUrl}`)
        : "/placeholder.png",

     
      variantId: null,

      variantOptions: {
        option1: null,
        option2: null,
        option3: null,
      },

      // ⭐⭐ MOST IMPORTANT for Cart Coupon Validation ⭐⭐
      productData: JSON.parse(JSON.stringify(product)),
    });

    toast.success(`${product.name} added to cart!`);
  }}
  className="mt-auto w-full bg-[#445D41] hover:bg-black text-xs md:text-sm"
>
  <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
</Button>


      </div>

    </CardContent>
  </Card>
</SwiperSlide>


        ))}
      </Swiper>
    </div>
  );
}
