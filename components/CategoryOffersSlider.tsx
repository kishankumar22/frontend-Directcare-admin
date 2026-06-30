// components/CategoryOffersSlider.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Gift, ShoppingBag, Sparkles, Tag } from "lucide-react";

import "swiper/css";
import "swiper/css/pagination";

interface Discount {
  id: string;
  name: string;
  slug?: string;
  discountType: string;
  usePercentage: boolean;
  discountAmount?: number;
  discountPercentage?: number;
  requiresCouponCode?: boolean;
  desktopBannerImageUrl?: string;
  mobileBannerImageUrl?: string;
  productCount?: number;
  assignedProductIds?: string;
  adminComment?: string;
}

const stripHtml = (html?: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
};

const formatDiscount = (discount: Discount) => {
  if (discount.usePercentage && discount.discountPercentage) {
    return `${discount.discountPercentage}% OFF`;
  }

  if ((discount.discountAmount ?? 0) > 0) {
    return `£${Number(discount.discountAmount).toFixed(2)} OFF`;
  }

  return "Special Offer";
};

const getImageSrc = (baseUrl: string, imageUrl?: string) => {
  if (!imageUrl) return "/placeholder-category.png";
  return imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`;
};

const getOwnProductCount = (discount: Discount) => {
  if (typeof discount.productCount === "number" && discount.productCount > 0) {
    return discount.productCount;
  }

  if (discount.assignedProductIds) {
    return discount.assignedProductIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean).length;
  }

  return 0;
};

const getDisplayProductCount = (discount: Discount, allDiscounts: Discount[]) => {
  if (discount.discountType !== "UpToPercentage") {
    return getOwnProductCount(discount);
  }

  const ceiling = discount.discountPercentage ?? 0;
  if (ceiling <= 0) return 0;

  return allDiscounts
    .filter((child) => {
      if (child.id === discount.id) return false;
      if (child.discountType === "UpToPercentage") return false;
      if (!child.usePercentage || !child.discountPercentage) return false;
      if (child.requiresCouponCode) return false;
      return child.discountPercentage > 0 && child.discountPercentage <= ceiling;
    })
    .reduce((total, child) => total + getOwnProductCount(child), 0);
};

const OfferImage = ({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 86vw, (max-width: 1280px) 33vw, 25vw"
      className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
      onError={() => setImgSrc("/placeholder-category.png")}
    />
  );
};

export default function CategoryOffersSlider({
  discounts,
  baseUrl,
}: {
  discounts: Discount[];
  baseUrl: string;
}) {
  const visibleDiscounts = discounts.filter(
    (discount) =>
      discount.discountType === "AssignedToProducts" ||
      discount.discountType === "AssignedToCategories" ||
      discount.discountType === "UpToPercentage"
  );

  if (visibleDiscounts.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-gray-50 py-4">
      <div className="relative mx-auto max-w-7xl px-3">
        <div className="mb-3 text-center">
          <h2 className="text-xl font-extrabold tracking-tight md:text-3xl">
            <span className="text-[#445D41]">Exclusive</span>{" "}
            <span className="text-[#2C332B]">Category Offers</span>
          </h2>
          <p className="mt-1 text-xs text-gray-700 md:text-base">
            Save big on selected categories - limited time only
          </p>
        </div>
      </div>

      <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#445D41] via-[#2f6b3f] to-black py-4">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white/5 via-transparent to-white/5" />

        <ShoppingBag className="absolute bottom-4 left-8 h-20 w-20 rotate-6 text-white/5" />
        <Sparkles className="absolute right-8 top-4 h-20 w-20 text-white/5" />
        <Gift className="absolute bottom-2 right-20 h-24 w-24 rotate-12 text-white/5" />

        <div className="relative mx-auto max-w-7xl px-4">
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={{ clickable: true }}
            loop={visibleDiscounts.length > 3}
            spaceBetween={14}
            slidesPerView={1}
            breakpoints={{
              520: { slidesPerView: 2, spaceBetween: 14 },
              768: { slidesPerView: 2, spaceBetween: 16 },
              1024: { slidesPerView: 3, spaceBetween: 18 },
              1280: { slidesPerView: 3, spaceBetween: 20 },
            }}
            className="!pb-7"
          >
            {visibleDiscounts.map((discount) => {
              const imageUrl =
                discount.desktopBannerImageUrl || discount.mobileBannerImageUrl;
              const href = discount.slug ? `/offers/${discount.slug}` : "/offers";
              const comment = stripHtml(discount.adminComment);
              const productCount = getDisplayProductCount(
                discount,
                visibleDiscounts
              );

              return (
                <SwiperSlide key={discount.id}>
                  <Link href={href} className="block h-full">
                    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="relative h-[230px] w-full overflow-hidden bg-gray-100 md:h-[245px]">
                        <OfferImage
                          src={getImageSrc(baseUrl, imageUrl)}
                          alt={discount.name}
                        />
                        <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent" />
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
                          <Tag className="h-3 w-3" />
                          {formatDiscount(discount)}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
                        <h3 className="line-clamp-1 text-sm font-bold leading-tight text-[#2C332B] group-hover:text-[#445D41]">
                          {discount.name}
                        </h3>

                        {comment && (
                          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-gray-600">
                            {comment}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          {productCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-600">
                              <ShoppingBag className="h-3 w-3" />
                              {productCount} products
                            </span>
                          )}

                          <span className="ml-auto inline-flex items-center justify-center rounded bg-[#445D41] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors group-hover:bg-[#33492f]">
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
      </div>
    </section>
  );
}
