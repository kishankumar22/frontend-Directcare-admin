"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

interface HomeBanner {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
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
        {banners.map((banner) => {
          const desktopSrc = banner.imageUrl?.startsWith("http") ? banner.imageUrl : `${baseUrl}${banner.imageUrl}`;
          const mobileSrc = banner.mobileImageUrl
            ? (banner.mobileImageUrl.startsWith("http") ? banner.mobileImageUrl : `${baseUrl}${banner.mobileImageUrl}`)
            : null;

          const pictureEl = (
            <picture className="block w-full">
              {mobileSrc && <source media="(max-width: 767px)" srcSet={mobileSrc} />}
              <img
                src={desktopSrc}
                alt={banner.title || "Banner"}
                className="w-full h-auto object-contain"
              />
            </picture>
          );

          return (
            <SwiperSlide key={banner.id}>
              {banner.link ? (
                <Link href={banner.link} className="block w-full cursor-pointer">
                  {pictureEl}
                </Link>
              ) : (
                <div className="block w-full">{pictureEl}</div>
              )}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
