"use client";

import { useMemo } from "react";

type Filters = {
  categoryId?: string;
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
};

export default function FiltersSidebar({
  products,
  filters,
  setFilters,
}: {
  products: any[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  /* ----------------------------------
     CATEGORY (unique from products)
  ---------------------------------- */
  const categories = useMemo(() => {
    const map = new Map<string, any>();

    products.forEach(p => {
      (p.categories ?? []).forEach((c: any) => {
        if (!map.has(c.categoryId)) {
          map.set(c.categoryId, c);
        }
      });
    });

    return Array.from(map.values());
  }, [products]);

  /* ----------------------------------
     BRAND (unique from products)
  ---------------------------------- */
  const brands = useMemo(() => {
    const map = new Map<string, any>();

    products.forEach(p => {
      (p.brands ?? []).forEach((b: any) => {
        if (!map.has(b.brandId)) {
          map.set(b.brandId, b);
        }
      });
    });

    return Array.from(map.values());
  }, [products]);

  /* ----------------------------------
     PRICE (dynamic max)
  ---------------------------------- */
  const maxProductPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.max(...products.map(p => p.price ?? 0));
  }, [products]);

  /* ----------------------------------
     HANDLERS
  ---------------------------------- */
  const toggleBrand = (brandId: string) => {
    setFilters(prev => {
      const set = new Set(prev.brandIds ?? []);
      set.has(brandId) ? set.delete(brandId) : set.add(brandId);
      return { ...prev, brandIds: Array.from(set) };
    });
  };

  return (
    <aside className="w-64 shrink-0 border-r pr-4 space-y-6">
      {/* ================= CATEGORY ================= */}
      <div>
        <h4 className="font-semibold mb-2">Category</h4>

        {categories.map(cat => (
          <label
            key={cat.categoryId}
            className="flex items-center gap-2 text-sm mb-1"
          >
            <input
              type="radio"
              checked={filters.categoryId === cat.categoryId}
              onChange={() =>
                setFilters(f => ({
                  ...f,
                  categoryId: cat.categoryId,
                }))
              }
            />
            {cat.categoryName}
          </label>
        ))}
      </div>

      {/* ================= BRAND ================= */}
      <div>
        <h4 className="font-semibold mb-2">Brand</h4>

        {brands.map(brand => (
          <label
            key={brand.brandId}
            className="flex items-center gap-2 text-sm mb-1"
          >
            <input
              type="checkbox"
              checked={filters.brandIds?.includes(brand.brandId) ?? false}
              onChange={() => toggleBrand(brand.brandId)}
            />
            {brand.brandName}
          </label>
        ))}
      </div>

      {/* ================= PRICE ================= */}
      <div>
        <h4 className="font-semibold mb-2">Price</h4>

        <div className="text-xs mb-1">
          ₹{filters.minPrice ?? 0} – ₹{filters.maxPrice ?? maxProductPrice}
        </div>

        <input
          type="range"
          min={0}
          max={maxProductPrice}
          value={filters.maxPrice ?? maxProductPrice}
          onChange={e =>
            setFilters(f => ({
              ...f,
              minPrice: 0,
              maxPrice: Number(e.target.value),
            }))
          }
          className="w-full"
        />
      </div>

      {/* ================= RATING ================= */}
      <div>
        <h4 className="font-semibold mb-2">Rating</h4>

        {[4, 3, 2, 1].map(r => (
          <label
            key={r}
            className="flex items-center gap-2 text-sm mb-1"
          >
            <input
              type="radio"
              checked={filters.rating === r}
              onChange={() =>
                setFilters(f => ({
                  ...f,
                  rating: r,
                }))
              }
            />
            {r}★ & above
          </label>
        ))}
      </div>
    </aside>
  );
}
