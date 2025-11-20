"use client";

import { useEffect, useState } from "react";

export interface HomeBanner {
  id: string;
  imageUrl: string;
  link?: string;
}

interface Props {
  banners: HomeBanner[];
  baseUrl: string;
}

export default function HomeBannerSlider({ banners, baseUrl }: Props) {
  if (!banners || banners.length === 0) return null;

  // ✅ Infinite loop clone logic
  const extended = [
    banners[banners.length - 1],
    ...banners,
    banners[0],
  ];

  const [index, setIndex] = useState(1);
  const [animate, setAnimate] = useState(true);

  // ✅ Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Loop logic
  useEffect(() => {
    if (index === extended.length - 1) {
      setTimeout(() => setAnimate(false), 690);
      setTimeout(() => setIndex(1), 700);
      setTimeout(() => setAnimate(true), 710);
    }
    if (index === 0) {
      setTimeout(() => setAnimate(false), 690);
      setTimeout(() => setIndex(banners.length), 700);
      setTimeout(() => setAnimate(true), 710);
    }
  }, [index]);

  return (
    <div
      className="
        relative 
        w-full 
        h-[138px]        /* ✅ Mobile height EXACT DirectCare style */
        md:h-[500px]     /* ✅ Desktop untouched */
        overflow-hidden 
        group
      "
    >
      {/* ✅ Slider */}
      <div
        className={`flex h-full ${animate ? "transition-transform duration-700" : ""}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {extended.map((banner, i) => (
          <a
            key={i}
            href={banner.link || "#"}
            target="_blank"
            className="min-w-full h-full flex-shrink-0 block"
          >
            <img
              src={`${baseUrl}${banner.imageUrl}`}
              alt=""
              className="w-full h-full object-cover object-center"
            />
          </a>
        ))}
      </div>

      {/* ✅ Prev Button */}
      <button
        onClick={() => setIndex((prev) => prev - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
      >
        ❮
      </button>

      {/* ✅ Next Button */}
      <button
        onClick={() => setIndex((prev) => prev + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
      >
        ❯
      </button>

      {/* ✅ Dots */}
      <div className="absolute bottom-2 w-full flex justify-center gap-2">
        {banners.map((_, idx) => {
          const realIndex = idx + 1;
          return (
            <button
              key={idx}
              onClick={() => setIndex(realIndex)}
              className={`w-3 h-3 rounded-full transition ${
                index === realIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
