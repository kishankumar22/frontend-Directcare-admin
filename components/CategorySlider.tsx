"use client";

import Link from "next/link";
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
  imageUrl?: string | null;
}

export default function CategorySlider({
  categories,
  baseUrl,
}: {
  categories: Category[];
  baseUrl: string;
}) {

  // ✅ SAFE IMAGE URL
  const getImageSrc = (imageUrl?: string | null) => {
    if (!imageUrl) return "/placeholder-category.png";

    return imageUrl.startsWith("http")
      ? imageUrl
      : `${baseUrl}${imageUrl}`;
  };

  return (
    <div className="relative w-full">

      {/* ===== LEFT ARROW ===== */}
      <button
        id="catPrev"
        className="
          hidden xl:flex
          absolute left-[-24px] top-[38%]
          -translate-y-1/2 z-30
          w-11 h-11
          items-center justify-center
          rounded-full
          border border-gray-200/80
          bg-white/95
          shadow-[0_4px_14px_rgba(0,0,0,0.08)]
          hover:shadow-lg
          hover:scale-105
          transition-all duration-300
        "
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* ===== RIGHT ARROW ===== */}
      <button
        id="catNext"
        className="
          hidden xl:flex
          absolute right-[-24px] top-[38%]
          -translate-y-1/2 z-30
          w-11 h-11
          items-center justify-center
          rounded-full
          border border-gray-200/80
          bg-white/95
          shadow-[0_4px_14px_rgba(0,0,0,0.08)]
          hover:shadow-lg
          hover:scale-105
          transition-all duration-300
        "
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* ===== SLIDER ===== */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
spaceBetween={20}
slidesPerView={2.2}

breakpoints={{
  480: {
    slidesPerView: 2,
    spaceBetween: 20,
  },

  640: {
    slidesPerView:3,
    spaceBetween: 22,
  },

  768: {
    slidesPerView: 4,
    spaceBetween: 24,
  },

  1024: {
    slidesPerView: 5,
    spaceBetween: 26,
  },

  1280: {
    slidesPerView: 6,
    spaceBetween: 28,
  },
}}
        autoplay={{
          delay: 2600,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        navigation={{
          prevEl: "#catPrev",
          nextEl: "#catNext",
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        loop={categories.length > 5}
        className="pt-4 pb-12"
      >
        {categories.map((category) => (
          <SwiperSlide key={category.id}>
            <Link
              href={`/category/${category.slug}`}
              className="group flex flex-col items-center text-center"
            >

              {/* ===== IMAGE WRAPPER ===== */}
              <div
                className="
                  relative
                  w-[130px] h-[130px]
                  sm:w-[145px] sm:h-[145px]
                  md:w-[160px] md:h-[160px]
                  lg:w-[180px] lg:h-[180px]
                  rounded-[24px]
                  overflow-hidden
                  border-2 border-slate-600
                  bg-white
                  shadow-[0_4px_14px_rgba(0,0,0,0.05)]
                  transition-all duration-300
                  group-hover:border-[#445D41]
                  group-hover:shadow-[0_10px_24px_rgba(68,93,65,0.12)]
                  group-hover:-translate-y-1
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
                  src={getImageSrc(category.imageUrl)}
                  alt={category.name}
                  loading="lazy"
                  className="
                    h-full w-full
                    object-cover
                    transition-transform duration-500
                    group-hover:scale-105
                  "
                  title={category.name}
                />
              </div>

              {/* ===== TITLE ===== */}
              <h3
                className="
                  mt-3
                  text-[13px] md:text-[15px]
                  font-semibold
                  leading-snug
                  text-gray-900
                  line-clamp-2
                  transition-colors duration-300
                  group-hover:text-[#445D41]
                "
              >
                {category.name}
              </h3>

            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}