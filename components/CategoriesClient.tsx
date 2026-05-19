"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
}

export default function CategoriesClient({
  categories,
  baseUrl,
}: {
  categories: Category[];
  baseUrl: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");

  // Create a map to quickly look up categories by ID for building parent names
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Helper to construct the breadcrumb path of parent categories
  const getCategoryPath = (cat: Category): string => {
    const path: string[] = [];
    let current: Category | undefined = cat;
    const visited = new Set<string>();

    if (current.parentCategoryId) {
      let parentId = current.parentCategoryId;
      while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        const parent = categoryMap.get(parentId);
        if (parent) {
          path.unshift(parent.name);
          parentId = parent.parentCategoryId || "";
        } else {
          break;
        }
      }
    }

    return path.join(" > ");
  };

  const filteredCategories = useMemo(() => {
    let filtered = categories.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(search.toLowerCase());
      const pathMatch = getCategoryPath(c).toLowerCase().includes(search.toLowerCase());
      return nameMatch || pathMatch;
    });

    if (sort === "az") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
    }

    return filtered;
  }, [categories, search, sort, categoryMap]);
const totalCount = categories.length;
const filteredCount = filteredCategories.length;
  return (
    <>
      {/* SEARCH + SORT BAR */}
  <div className="mb-6 space-y-2">

  {/* 🔹 Row 1: Search + Sort */}
<div className="flex gap-2 md:justify-between md:items-center">

    {/* SEARCH */}
<div className="flex items-center gap-3 w-full md:w-auto">
  
  {/* SEARCH */}
  <div className="relative w-full md:w-[260px]">
    <input
      type="text"
      placeholder="Search categories..."
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

  {/* ✅ COUNT (desktop me right me) */}
  <p className="hidden md:block text-sm text-gray-600 whitespace-nowrap">
    {search
      ? `showing ${filteredCount} of ${totalCount} categories`
      : `${totalCount} total categories`}
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

  {/* 🔹 Row 2: COUNT */}
<p className="text-xs text-gray-500 md:hidden">
  {search ? (
    <>
      Showing <span className="font-semibold">{filteredCount}</span> of {totalCount} categories
    </>
  ) : (
    <>
      <span className="font-semibold">{totalCount}</span> total categories
    </>
  )}
</p>

</div>

      {/* CATEGORY GRID */}
      {filteredCategories.length === 0 ? (
        <p className="text-center text-gray-500">
          No categories found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">

          {filteredCategories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex flex-col items-center text-center"
            >
              {/* ===== IMAGE WRAPPER ===== */}
              <div
                className="
                  relative
                  w-[130px] h-[130px]
                  sm:w-[145px] sm:h-[145px]
                  md:w-[160px] md:h-[160px]
                  lg:w-[180px] lg:h-[180px]
                  rounded-[24px]
                  overflow-hidden
                  border-2 border-slate-600
                  bg-white
                  shadow-[0_4px_14px_rgba(0,0,0,0.05)]
                  transition-all duration-300
                  group-hover:border-[#445D41]
                  group-hover:shadow-[0_10px_24px_rgba(68,93,65,0.12)]
                  group-hover:-translate-y-1
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
                    !category.imageUrl
                      ? "/placeholder.png"
                      : category.imageUrl.startsWith("http")
                      ? category.imageUrl
                      : `${baseUrl}${category.imageUrl}`
                  }
                  alt={category.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.png";
                  }}
                  className="
                    h-full w-full
                    object-cover
                    transition-transform duration-500
                    group-hover:scale-105
                  "
                  title={category.name}
                />
              </div>

              {/* ===== TITLE ===== */}
              <h3
                className="
                  mt-3
                  text-sm md:text-base
                  font-semibold
                  text-gray-800
                  group-hover:text-[#445D41]
                  transition-colors duration-300
                "
              >
                {category.name}
              </h3>
            </Link>
          ))}

        </div>
      )}
    </>
  );
}