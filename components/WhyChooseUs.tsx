"use client";

import React from "react";
import {
  Truck,
  RotateCcw,
  PoundSterling,
  Headset,
} from "lucide-react";

const reasons = [
  {
    icon: Truck,
    title: "Fast & Reliable Delivery",
    desc: "Get your order quickly with standard or next-day delivery options.",
    color: "from-[#445D41] to-[#2A3F28]",
    glow: "group-hover:shadow-[#445D41]/25",
  },
  {
    icon: RotateCcw,
    title: "30-Day Hassle-Free Returns",
    desc: "Shop with confidence and return within 30 days if needed.",
    color: "from-[#445D41] to-black",
    glow: "group-hover:shadow-black/20",
  },
  {
    icon: PoundSterling,
    title: "Best Prices Guaranteed",
    desc: "Competitive pricing on all health & personal care products.",
    color: "from-[#445D41] to-[#2A3F28]",
    glow: "group-hover:shadow-[#445D41]/25",
  },
  {
    icon: Headset,
    title: "Dedicated Customer Support",
    desc: "Our team is available from Mon-Sat, 9 AM - 6 PM.",
    color: "from-[#445D41] to-black",
    glow: "group-hover:shadow-black/20",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-10 md:py-8 bg-[#F3F4F6] border-y border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4">

        {/* Heading */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900">
            Why Choose{" "}
            <span className="text-[#445D41]">
              Direct Care?
            </span>
          </h2>

          <p className="mt-2 text-sm md:text-[15px] text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Trusted healthcare and personal care products with fast delivery,
            secure shopping, and dedicated customer support.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {reasons.map((item, idx) => {
            const Icon = item.icon;

            return (
              <div
                key={idx}
                className="
                  group relative overflow-hidden
                  rounded-2xl border border-gray-100
                  bg-white
                  p-5
                  shadow-[0_4px_18px_rgba(0,0,0,0.05)]
                  hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]
                  hover:-translate-y-1
                  transition-all duration-300
                "
              >
                {/* Accent */}
                <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-[#445D41] via-[#5E7B5A] to-[#445D41] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

                {/* Top Row */}
                <div className="flex items-center gap-3">

                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-2xl shrink-0
                      bg-gradient-to-br ${item.color}
                      flex items-center justify-center
                      shadow-lg
                      ${item.glow}
                      group-hover:scale-105
                      transition-all duration-300
                    `}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Title */}
                  <h4 className="text-[18px] font-bold text-gray-900 leading-snug tracking-tight group-hover:text-[#445D41] transition-colors duration-300">
                    {item.title}
                  </h4>
                </div>

                {/* Description */}
                <p className="mt-4 text-[13.5px] leading-relaxed text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                  {item.desc}
                </p>

                {/* Hover Ring */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-[#445D41]/10 transition-all duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}