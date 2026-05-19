"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
}

export default function BrandsClient({
  brands,
  baseUrl,
}: {
  brands: Brand[];
  baseUrl: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");

  const filteredBrands = useMemo(() => {
    let filtered = brands.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );

 if (sort === "az") {
  filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
} else {
  filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
}

    return filtered;
  }, [brands, search, sort]);
const totalCount = brands.length;
const filteredCount = filteredBrands.length;
  return (
    <>
      {/* SEARCH + SORT BAR */}
     <div className="mb-6 space-y-2">

  {/* 🔹 Row 1 */}
  <div className="flex gap-2 md:justify-between md:items-center">

    {/* SEARCH + COUNT */}
    <div className="flex items-center gap-3 w-full md:w-auto">
      
      {/* SEARCH */}
      <div className="relative w-full md:w-[260px]">
        <input
          type="text"
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41]"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ✅ COUNT (desktop) */}
      <p className="hidden md:block text-sm text-gray-600 whitespace-nowrap">
        {search
          ? `showing ${filteredCount} of ${totalCount} brands`
          : `${totalCount} total brands`}
      </p>

    </div>

    {/* SORT */}
    <select
      value={sort}
      onChange={(e) => setSort(e.target.value)}
      className="w-[120px] md:w-[140px] border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41]"
    >
      <option value="az">A → Z</option>
      <option value="za">Z → A</option>
    </select>

  </div>

  {/* 🔹 Row 2 (mobile count) */}
  <p className="text-xs text-gray-500 md:hidden">
    {search ? (
      <>
        Showing <span className="font-semibold">{filteredCount}</span> of {totalCount} brands
      </>
    ) : (
      <>
        <span className="font-semibold">{totalCount}</span> total brands
      </>
    )}
  </p>

</div>

      {/* BRANDS GRID */}
      {filteredBrands.length === 0 ? (
        <p className="text-center text-gray-500">No brands found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group flex flex-col items-center text-center"
            >
              {/* ===== LOGO WRAPPER ===== */}
              <div
                className="
                  relative
                  w-[130px] h-[130px]
                  sm:w-[145px] sm:h-[125px]
                  md:w-[160px] md:h-[140px]
                  lg:w-[180px] lg:h-[160px]
                  rounded-[24px]
                  overflow-hidden
                  border-2 border-slate-600
                  bg-white
                  shadow-[0_4px_14px_rgba(0,0,0,0.05)]
                  transition-all duration-300
                  group-hover:border-[#445D41]
                  group-hover:shadow-[0_10px_24px_rgba(68,93,65,0.12)]
                  group-hover:-translate-y-1
                  flex items-center justify-center px-4
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
                  src={
                    brand.logoUrl?.startsWith("http")
                      ? brand.logoUrl
                      : `${baseUrl}${brand.logoUrl}`
                  }
                  alt={brand.name}
                  loading="lazy"
                  className="
                    max-h-[70%] max-w-[90%]
                    object-contain
                    transition-transform duration-500
                    group-hover:scale-105
                  "
                   title={brand.name}                />
              </div>

              {/* ===== TITLE ===== */}
              {/* <h3
                className="
                  mt-3
                  text-sm md:text-base
                  font-semibold
                  text-gray-800
                  group-hover:text-[#445D41]
                  transition-colors duration-300
                "
              >
                {brand.name}
              </h3> */}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}