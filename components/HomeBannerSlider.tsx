"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

interface HomeBanner {
  id: string;
  imageUrl: string;
  link?: string;
  title?: string;
}

interface HomeBannerSliderProps {
  banners: HomeBanner[];
  baseUrl: string;
}

export default function HomeBannerSlider({
  banners,
  baseUrl,
}: HomeBannerSliderProps) {
  if (!banners || banners.length === 0) return null;

  const enableLoop = banners.length > 2;
  const enableAutoplay = banners.length > 1;

  return (
    <div className="relative w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop={enableLoop}
        autoplay={
          enableAutoplay
            ? {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        pagination={enableAutoplay ? { clickable: true } : false}
        className="w-full"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            {banner.link ? (
              <Link
                href={banner.link}
                className="block w-full cursor-pointer"
              >
                <img
                  src={`${baseUrl}${banner.imageUrl}`}
                  alt={banner.title || "Banner"}
                  className="w-full h-auto object-contain"
                />
              </Link>
            ) : (
              <div className="block w-full">
                <img
                  src={`${baseUrl}${banner.imageUrl}`}
                  alt={banner.title || "Banner"}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
