"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getImageUrl } from "@/app/lib/getImageUrl";

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
              activeMainCategory.subCategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/category/${activeMainCategory.slug}/${sub.slug}`}
                  onMouseEnter={() => setActiveSubCategory(sub)}
                  className={`block p-3 cursor-pointer hover:bg-white hover:font-semibold ${
                    activeSubCategory?.id === sub.id ? "bg-white font-semibold" : ""
                  }`}
                >
                  {sub.name}
                </Link>
              ))
            ) : (
              <div className="p-4 text-gray-400 italic">No subcategories</div>
            )}
          </div>

          {/* ✅ MIDDLE COLUMN (Child subcategories) */}
          <div className="w-1/3 border-r border-gray-200 bg-white p-4 overflow-y-auto">
            {activeSubCategory?.subCategories?.length ? (
              <div className="grid grid-cols-2 gap-3">
                {activeSubCategory.subCategories.map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${activeMainCategory.slug}/${activeSubCategory.slug}/${child.slug}`}
                    className="text-gray-700 hover:text-green-700"
                  >
                    {child.name ?? "Unnamed"}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-gray-400 italic">Hover a subcategory →</div>
            )}
          </div>

          {/* ✅ RIGHT COLUMN (Promo Banner Placeholder) */}
         <div className="w-1/3 p-4">
  <div
    className="relative h-full min-h-[260px] rounded-xl overflow-hidden
               bg-gradient-to-br from-[#2f6b3f] via-[#3f7f55] to-[#1f3d2b]
               shadow-lg flex flex-col justify-between p-6 text-white"
  >
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
        className="inline-block bg-white text-[#2f6b3f]
                   text-sm font-semibold px-5 py-2 rounded-md
                   hover:bg-gray-100 transition"
      >
        Shop Deals
      </span>
    </div>

    {/* Soft overlay */}
    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
  </div>
</div>

        </div>

        {/* ✅ BRAND LOGOS ROW */}
        <div className="border-t border-gray-200 p-4 bg-white flex flex-wrap justify-center gap-16">
          {brands.map((brand) => (
            <Link href={`/brand/${brand.slug}`} key={brand.id}>
              <div className="w-20 h-20 relative">
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

      </div>
    </div>
  );
};

export default MegaMenu;
