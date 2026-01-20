"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  showOnHomepage?: boolean;
}

interface TopBrandsSliderProps {
  brands: Brand[];
  baseUrl: string;
}

export default function TopBrandsSlider({
  brands,
  baseUrl,
}: TopBrandsSliderProps) {
  /**
   * 🔥 PERFORMANCE CRITICAL
   * - Filter once
   * - Prevent unnecessary Swiper re-renders
   */
  const homepageBrands = useMemo(
    () => brands.filter((b) => b.showOnHomepage === true),
    [brands]
  );

  /**
   * 🛡️ SAFETY GUARD
   * - If no brands to show → don't mount Swiper
   */
  if (homepageBrands.length === 0) {
    return null;
  }
  return (
    <div className="relative">

      {/* Arrows */}
      <button
        id="brandPrev"
        className="absolute left-[-15px] top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border hover:bg-gray-100"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <button
        id="brandNext"
        className="absolute right-[-15px] top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border hover:bg-gray-100"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Swiper */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={2}
        breakpoints={{
          640: { slidesPerView: 3 },
          768: { slidesPerView: 4 },
          1024: { slidesPerView: 5 },
        }}
        autoplay={{ delay: 2200, disableOnInteraction: false, pauseOnMouseEnter: true, }}
        navigation={{ prevEl: "#brandPrev", nextEl: "#brandNext" }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={true}
        className="pb-12"
      >
        {brands.map((brand: Brand) => (
          <SwiperSlide key={brand.id}>
            <Link href={`/brand/${brand.slug}`}>
<Card
  className="w-full h-[200px] md:h-[230px] bg-white rounded-2xl 
             shadow-[0_4px_20px_rgba(0,0,0,0.08)] 
             hover:shadow-[0_6px_25px_rgba(0,0,0,0.12)]
             transition-all duration-300 flex flex-col items-center justify-between py-6"
>
  <CardContent className="p-0 w-full flex flex-col items-center justify-between h-full">

    {/* BIG LOGO LIKE DIRECT CARE */}
 {/* FIXED IMAGE WRAPPER */}
<div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] flex items-center justify-center overflow-hidden">
  <img
    src={
      brand.logoUrl.startsWith("http")
        ? brand.logoUrl
        : `${baseUrl}${brand.logoUrl}`
    }
    alt={brand.name}
    className="w-auto h-full object-contain"
  style={{ objectPosition: "center" }}
  />
</div>

    {/* BRAND NAME EXACT STYLE */}
    <h3 className="font-semibold text-gray-900 text-sm md:text-base text-center pb-2">
      {brand.name}
    </h3>

  </CardContent>
</Card>


            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
