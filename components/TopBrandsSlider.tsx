"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
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
}

export default function TopBrandsSlider({
  brands,
  baseUrl,
}: {
  brands: Brand[];
  baseUrl: string;
}) {
  return (
    <div className="md:hidden relative">

      {/* ✅ Mobile Arrows */}
      <button
        id="brandPrev"
        className="absolute left-0 top-[40%] -translate-y-1/2 z-30 bg-white p-2 shadow-md rounded-full border"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        id="brandNext"
        className="absolute right-0 top-[40%] -translate-y-1/2 z-30 bg-white p-2 shadow-md rounded-full border"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={14}
        slidesPerView={2}    // ✅ Mobile = exactly 2 cards per row
        autoplay={{ delay: 2200 }}
        navigation={{
          prevEl: "#brandPrev",
          nextEl: "#brandNext",
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        loop={true}
        className="pb-10"
      >
        {brands.map((brand: Brand) => (
          <SwiperSlide key={brand.id}>
            <Link href={`/brand/${brand.slug}`}>
              <Card className="p-5 text-center shadow-md hover:shadow-xl transition rounded-xl bg-white">
                <img
                  src={
                    brand.logoUrl.startsWith("http")
                      ? brand.logoUrl
                      : `${baseUrl}${brand.logoUrl}`
                  }
                  alt={brand.name}
                  className="w-20 h-20 mx-auto object-contain mb-3"
                />
                <h3 className="font-semibold text-sm">{brand.name}</h3>
              </Card>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
