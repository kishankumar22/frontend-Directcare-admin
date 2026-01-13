"use client";

import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RelatedProductCard from "@/components/product/RelatedProductCard";
import { getRecentlyViewed } from "@/app/hooks/useRecentlyViewed";

export default function RecentlyViewedSlider({
  getImageUrl,
  currentProductId,
}: {
  getImageUrl: any;
  currentProductId: string;
}) {

  const [products, setProducts] = useState<any[]>([]);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
  if (!currentProductId) return;

  const ids = getRecentlyViewed().filter(
    (id) => id !== currentProductId
  );

  if (!ids.length) return;

  Promise.all(
    ids.map((id) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/${id}`, {
        cache: "no-store",
      }).then((res) => res.json())
    )
  ).then((res) => {
    const valid = res
      .filter((r) => r.success)
      .map((r) => r.data);

    setProducts(valid);
  });
}, [currentProductId]);

  if (!products.length) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
          Recently Viewed Products
        </h2>
      </div>
    
   
      <div className="relative">
        {/* LEFT CHEVRON */}
        <button
          ref={prevRef}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0"
        >
          <ChevronLeft className="w-8 h-8 text-gray-700" />
        </button>
    
        {/* RIGHT CHEVRON */}
        <button
          ref={nextRef}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-0 m-0"
        >
          <ChevronRight className="w-8 h-8 text-gray-700" />
        </button>
    
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          onBeforeInit={(swiper) => {
            if (
              typeof swiper.params.navigation !== "boolean" &&
              swiper.params.navigation
            ) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }
          }}
          navigation
          pagination={{ clickable: true, dynamicBullets: true }}
          autoplay={{ delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true, }}
          loop
          spaceBetween={16}
          slidesPerView={2}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 22 },
              1280: { slidesPerView: 5, spaceBetween: 24 },
          }}
          className="pb-10 "
        >
        {products.map((p) => (
          <SwiperSlide key={p.id}>
            <RelatedProductCard product={p} getImageUrl={getImageUrl} />
          </SwiperSlide>
        ))}
        </Swiper>
      </div>

    
    </section>
  );
}
