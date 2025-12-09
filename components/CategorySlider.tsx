"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
}

export default function CategorySlider({
  categories,
  baseUrl,
}: {
  categories: Category[];
  baseUrl: string;
}) {
  return (
    <div className="relative ">

      {/* ✅ Arrows */}
      <button
        id="catPrev"
        className="absolute left-0 top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <button
        id="catNext"
        className="absolute right-0 top-[40%] -translate-y-1/2 z-30 bg-white p-2 md:p-3 shadow-md rounded-full border"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={16}
        slidesPerView={2}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1280: { slidesPerView: 5 },
        }}

        autoplay={{ delay: 2500, disableOnInteraction: false }}

        navigation={{
          prevEl: "#catPrev",
          nextEl: "#catNext",
        }}

        pagination={{
          clickable: true,
          dynamicBullets: true,  // ✅ Professional motion bullets
        }}

        loop={true}
        className="pb-12"
      >
        {categories.map((category: Category) => (
          <SwiperSlide key={category.id}>
            <Link href={`/category/${category.slug}`}>
              <Card className="shadow-md hover:shadow-xl transition rounded-xl p-4 md:p-6 text-center bg-white">
                <CardContent className="p-0">
                  <img
  src={
    category.imageUrl
      ? category.imageUrl.startsWith("http")
        ? category.imageUrl
        : `${baseUrl}${category.imageUrl}`
      : "/placeholder-image.png" // fallback if no image
  }
  alt={category.name}
  className="w-16 h-16 md:w-20 md:h-20 mx-auto object-contain mb-3"
/>

                 <h3 className="font-semibold text-sm md:text-base line-clamp-2 min-h-[40px] md:min-h-[48px]">
  {category.name}
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
