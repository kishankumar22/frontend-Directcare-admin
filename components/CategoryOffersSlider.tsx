"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

/* ================= TYPES ================= */

interface Discount {
  usePercentage: boolean;
  discountPercentage: number;
  requiresCouponCode: boolean;
  couponCode: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  assignedDiscounts: Discount[];
}

/* ================= COMPONENT ================= */

export default function CategoryOffersSlider({
  categories,
  baseUrl,
}: {
  categories: Category[];
  baseUrl: string;
}) {
  const offerCategories = categories.filter(
    (c) => c.assignedDiscounts && c.assignedDiscounts.length > 0
  );

  if (offerCategories.length === 0) return null;

  /* 🔐 SAFE IMAGE RESOLVER */
  const getImageSrc = (imageUrl?: string | null) => {
    if (!imageUrl) return "/placeholder-category.png";
    return imageUrl.startsWith("http")
      ? imageUrl
      : `${baseUrl}${imageUrl}`;
  };

 return (
  <section className="relative w-full py-14 overflow-hidden
    bg-gradient-to-r from-[#445D41] via-[#2f6b3f] to-black"
  >
    {/* ===== SUBTLE DESIGN TEXTURE (NO PERFORMANCE HIT) ===== */}
   {/* STAR DUST / CONFETTI EFFECT */}
{/* CHRISTMAS STARS – VISIBLE & PREMIUM */}
<div
  className="absolute inset-0 pointer-events-none"
  style={{
    backgroundImage: `
      radial-gradient(circle at 12% 18%, rgba(255,255,255,0.9) 3px, transparent 6px),
      radial-gradient(circle at 68% 22%, rgba(255,255,255,0.8) 2.5px, transparent 6px),
      radial-gradient(circle at 38% 72%, rgba(255,255,255,0.85) 3.5px, transparent 7px),
      radial-gradient(circle at 82% 58%, rgba(255,255,255,0.75) 2.8px, transparent 6px),
      radial-gradient(circle at 50% 40%, rgba(255,255,255,0.8) 2.2px, transparent 5px)
    `,
    backgroundSize: "160px 160px",
    opacity: 0.25,
  }}
/>






    {/* ===== SOFT LIGHT BAND ===== */}
    <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />

    <div className="relative max-w-7xl mx-auto px-4">
      {/* ===== HEADER ===== */}
      <div className="mb-10 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Big Festive Sale
        </h2>
        <p className="mt-2 text-sm md:text-base text-white/90">
          Save big on selected categories – limited time only
        </p>
      </div>

      {/* ===== SLIDER ===== */}
      <Swiper
        modules={[Navigation]}
        navigation
        spaceBetween={20}
        slidesPerView={1.2}
        breakpoints={{
          640: { slidesPerView: 1 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1280: { slidesPerView: 4 },
        }}
      >
        {offerCategories.map((cat) => {
          const discount = cat.assignedDiscounts[0];

          const offerText = discount.usePercentage
            ? `UP TO ${discount.discountPercentage}% OFF`
            : "SPECIAL OFFER";

          return (
  <SwiperSlide key={cat.id}>
  <Link href={`/category/${cat.slug}`} className="block h-full">
    <div
      className="relative h-[260px] bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1  flex flex-col">
 
      {/* ===== OFFER BADGE ===== */}
    <div
  className="absolute top-3 left-3 z-10 flex items-center justify-center text-center w-[70px] h-[70px] bg-gradient-to-br from-[#445D41] to-green-700 text-white text-[11px] font-extrabold leading-tight rounded-full shadow-lg ring-2 ring-white/70">
             
  <span className="px-2">
    {offerText}
  </span>
</div>


      {/* ===== IMAGE (FIXED HEIGHT) ===== */}
      <div className="h-[160px] flex items-center justify-center p-5">
        <img
          src={getImageSrc(cat.imageUrl)}
          alt={cat.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* ===== CONTENT WRAPPER ===== */}
      <div className="flex-1 px-4 pt-[-0.5rem] flex flex-col items-center text-center">
        {/* CATEGORY NAME */}
        <h3 className="text-sm font-semibold text-black leading-tight line-clamp-2">
          {cat.name}
        </h3>

        {/* COUPON (RESERVED SPACE – VERY IMPORTANT) */}
     {/* COUPON (FIXED HEIGHT – CRITICAL FOR ALIGNMENT) */}
<div className="mt-0 h-[32px] flex items-center justify-center">
  {discount.requiresCouponCode ? (
    <p className="text-sm text-green-500 text-center leading-tight">
      Use code{" "}
      <span className="font-semibold">{discount.couponCode}</span>
    </p>
  ) : (
    <span className="text-xs invisible">no coupon</span>
  )}
</div>


        {/* ===== BUTTON LOCKED TO BOTTOM ===== */}
        <div className="mt-auto w-full pb-6 pt-0">
          <span
            className="block w-full text-center
                       bg-[#2f6b3f] text-white
                       text-sm font-semibold py-2.5 rounded-md
                       hover:bg-[#245432] transition"
          >
            Shop now
          </span>
        </div>
      </div>
    </div>
  </Link>
</SwiperSlide>


          );
        })}
      </Swiper>
    </div>
  </section>
  
);


}
