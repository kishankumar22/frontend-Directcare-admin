"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getImageUrl } from "@/app/lib/getImageUrl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
;

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  parentCategoryId?: string | null;
  subCategories?: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
}

interface MegaMenuProps {
  activeMainCategory: Category;
}

const MegaMenu: React.FC<MegaMenuProps> = ({ activeMainCategory }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeSubCategory, setActiveSubCategory] = useState<Category | null>(null);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Brands?includeUnpublished=false`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setBrands(json.data || []);
      } catch (error) {
        console.error("Failed to load brands:", error);
      }
    };
    loadBrands();
  }, []);
const brandScrollRef = useRef<HTMLDivElement>(null);

const scrollBrands = (direction: "left" | "right") => {
  if (!brandScrollRef.current) return;

  const scrollAmount = 300;

  brandScrollRef.current.scrollBy({
    left: direction === "left" ? -scrollAmount : scrollAmount,
    behavior: "smooth",
  });
};

  // ✅ Set default middle column on hover
  useEffect(() => {
    const subs = activeMainCategory?.subCategories;
    if (Array.isArray(subs) && subs.length > 0) {
      setActiveSubCategory(subs[0]);
    } else {
      setActiveSubCategory(null);
    }
  }, [activeMainCategory]);

  return (
    <div className="absolute left-0 right-0 top-full z-50">
    <div className="max-w-[1200px] bg-white shadow-lg rounded-b-md overflow-hidden ml-[40px]">

        <div className="flex min-h-[300px]">

          {/* ✅ LEFT COLUMN (Subcategories) */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
  {activeMainCategory?.subCategories?.length ? (
    activeMainCategory.subCategories.map((sub) => {
      const hasChildren =
        Array.isArray(sub.subCategories) && sub.subCategories.length > 0;

      return (
        <Link
          key={sub.id}
          href={`/category/${activeMainCategory.slug}/${sub.slug}`}
          onMouseEnter={() => setActiveSubCategory(sub)}
          className={`
            flex items-center justify-between
            p-2
            cursor-pointer
            transition
            hover:bg-white
            hover:font-semibold
            ${
              activeSubCategory?.id === sub.id
                ? "bg-white font-semibold text-[#445D41]"
                : "text-gray-800"
            }
          `}
        >
          <span>{sub.name}</span>

          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                activeSubCategory?.id === sub.id
                  ? "translate-x-1 text-[#445D41]"
                  : "text-gray-400"
              }`}
            />
          )}
        </Link>
      );
    })
  ) : (
    <div className="p-4 text-gray-400 italic">No subcategories</div>
  )}
</div>


          {/* ✅ MIDDLE COLUMN (Child subcategories) */}
         {/* ✅ MIDDLE COLUMN (Child subcategories) */}
<div className="w-1/3 border-r border-gray-200 bg-white p-4">
  {activeSubCategory?.subCategories?.length ? (
    <div
      className=" max-h-[260px] overflow-y-auto pr-2 space-y-2 " >
      {activeSubCategory.subCategories.map((child) => (
        <Link
          key={child.id}
          href={`/category/${activeMainCategory.slug}/${activeSubCategory.slug}/${child.slug}`}
          className=" block text-base text-gray-700 hover:text-[#445D41] hover:font-medium transition " >
          {child.name ?? "Unnamed"}
        </Link>
      ))}
    </div>
  ) : (
    <div className="p-8 text-gray-400 italic">
      Hover a subcategory →
    </div>
  )}
</div>


          {/* ✅ RIGHT COLUMN (Promo Banner Placeholder) */}
         <div className="w-1/3 p-4">
  <div
    className="relative h-full min-h-[260px] rounded-xl overflow-hidden bg-gradient-to-br from-[#2f6b3f] via-[#3f7f55] to-[#1f3d2b] shadow-lg flex flex-col justify-between p-6 text-white" >
    {/* Badge */}
    <span className="inline-block bg-white/20 text-xs font-semibold px-3 py-1 rounded-full w-fit">
      LIMITED OFFER
    </span>

    {/* Content */}
    <div>
      <h3 className="text-xl font-extrabold leading-tight">
        Festive Essentials
      </h3>
      <p className="mt-2 text-sm text-white">
        Save up to 10% on selected categories
      </p>
    </div>

    {/* CTA */}
    <div>
      <span
        className="inline-block bg-white text-[#2f6b3f] text-sm font-semibold px-5 py-2 rounded-md hover:bg-gray-100 transition" >
        Shop Deals
      </span>
    </div>

    {/* Soft overlay */}
    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
  </div>
</div>

        </div>

        {/* ✅ BRAND LOGOS ROW */}
       {/* ✅ BRAND LOGOS ROW WITH SCROLL */}
<div className="relative border-t border-gray-200 bg-white px-8 py-4">

  {/* LEFT BUTTON */}
  <button
    onClick={() => scrollBrands("left")}
    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-gray-100 transition" >
    <ChevronLeft className="h-5 w-5 text-gray-700" />
  </button>

  {/* SCROLL AREA */}
  <div
    ref={brandScrollRef}
    className="flex gap-16 overflow-x-auto scroll-smooth scrollbar-hide px-6" >
    {brands.map((brand) => (
      <Link href={`/brand/${brand.slug}`} key={brand.id}>
        <div className="w-20 h-20 relative flex-shrink-0 hover:scale-105 transition">
          <Image
            src={getImageUrl(brand.logoUrl, "/images/placeholder.jpg")}
            alt={brand.name}
            fill
            className="object-contain"
          />
        </div>
      </Link>
    ))}
  </div>

  {/* RIGHT BUTTON */}
  <button
    onClick={() => scrollBrands("right")}
    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-gray-100 transition" >
    <ChevronRight className="h-5 w-5 text-gray-700" />
  </button>
</div>


      </div>
    </div>
  );
};

export default MegaMenu;
