"use client";
import { useMemo } from "react";
import Link from "next/link";
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
        className="hidden md:block absolute left-[-15px] top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border hover:bg-gray-100"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <button
        id="brandNext"
        className="hidden md:block absolute right-[-15px] top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border hover:bg-gray-100"
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
          1024: { slidesPerView: 6 },
        }}
        autoplay={{ delay: 2200, disableOnInteraction: false, pauseOnMouseEnter: true, }}
        navigation={{ prevEl: "#brandPrev", nextEl: "#brandNext" }}
        pagination={{ clickable: true, dynamicBullets: true }}
        loop={true}
        className="pt-4 pb-12"
      >
        {homepageBrands.map((brand: Brand) => (
          <SwiperSlide key={brand.id}>
            <Link
              href={`/brands/${brand.slug}`}
              className="group flex flex-col items-center text-center"
            >

              {/* ===== LOGO WRAPPER ===== */}
              <div
                className="
                  relative
                  w-[130px] h-[130px]
                  sm:w-[145px] sm:h-[125px]
                  md:w-[160px] md:h-[140px]
                  lg:w-[180px] lg:h-[160px]
                  rounded-[24px]
                  overflow-hidden
                  border-2 border-slate-600
                  bg-white
                  shadow-[0_4px_14px_rgba(0,0,0,0.05)]
                  transition-all duration-300
                  group-hover:border-[#445D41]
                  group-hover:shadow-[0_10px_24px_rgba(68,93,65,0.12)]
                  group-hover:-translate-y-1
                  flex items-center justify-center px-4
                "
              >

                {/* Soft overlay */}
                <div
                  className="
                    absolute inset-0 z-10
                    bg-gradient-to-t
                    from-black/[0.03]
                    to-transparent
                    opacity-0
                    group-hover:opacity-100
                    transition-opacity duration-300
                  "
                />

                <img
                  src={
                    brand.logoUrl
                      ? brand.logoUrl.startsWith("http")
                        ? brand.logoUrl
                        : `${baseUrl}${brand.logoUrl}`
                      : "/placeholder.jpg"
                  }
                  alt={brand.name}
                  loading="lazy"
                  className="
                    max-h-[70%] max-w-[90%]
                    object-contain
                    transition-transform duration-500
                    group-hover:scale-105
                  "
                />
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
