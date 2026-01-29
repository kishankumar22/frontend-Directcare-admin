"use client";

import { useState, useMemo, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { useVatRates } from "@/app/hooks/useVatRates";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import { Star, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OffersClientProps {
  initialItems: any[];
  initialHasMore: boolean;
}

export default function OffersClient({
  initialItems,
  initialHasMore,
}: OffersClientProps) {
  const vatRates = useVatRates();

  const [products, setProducts] = useState<any[]>(initialItems);
  const [filteredProducts, setFilteredProducts] =
    useState<any[]>(initialItems);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);

  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortChange = (value: string) => {
    const [by, dir] = value.split("-");
    setSortBy(by as "name" | "price");
    setSortDirection(dir as "asc" | "desc");
  };

  // Categories
  const categories = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p) => {
      p.categories?.forEach((c: any) => {
        if (!map.has(c.categoryId)) {
          map.set(c.categoryId, {
            id: c.categoryId,
            name: c.categoryName,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [products]);

  // Brands
  const brands = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p) => {
      p.brands?.forEach((b: any) => {
        if (!map.has(b.brandId)) {
          map.set(b.brandId, {
            id: b.brandId,
            name: b.brandName,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [products]);

  // Price range derive
  useEffect(() => {
    if (!products.length) return;
    const prices = products.map((p) => p.price ?? 0);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    setMinPrice(min);
    setMaxPrice(max);
    setPriceRange([min, max]);
  }, [products]);

  // Filtering + sorting
  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const hasActiveDiscount =
        Array.isArray(product.assignedDiscounts) &&
        product.assignedDiscounts.some(
          (d: any) =>
            d.isActive &&
            new Date(d.startDate) <= new Date() &&
            new Date(d.endDate) >= new Date() &&
            ((d.usePercentage && d.discountPercentage > 0) ||
              (!d.usePercentage && d.discountAmount > 0))
        );

      if (!hasActiveDiscount) return false;

      if (
        selectedCategories.length &&
        !product.categories?.some((c: any) =>
          selectedCategories.includes(c.categoryId)
        )
      )
        return false;

      if (
        selectedBrands.length &&
        !product.brands?.some((b: any) =>
          selectedBrands.includes(b.brandId)
        )
      )
        return false;

      if (product.price < priceRange[0] || product.price > priceRange[1])
        return false;

      if ((product.averageRating ?? 0) < minRating) return false;

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const cmp = a.price - b.price;
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    products,
    selectedCategories,
    selectedBrands,
    priceRange,
    minRating,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    setFilteredProducts(filtered);
  }, [filtered]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinRating(0);
    setPriceRange([minPrice, maxPrice]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 py-4">
        {/* PAGE HEADER */}
      <div className="mb-2 flex items-center justify-between">
  {/* 🧭 Breadcrumbs */}
  <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-600">
    <a href="/" className="hover:text-[#445D41] transition-colors">
      Home
    </a>
    <span className="mx-2 text-gray-400">/</span>
    <span className="font-semibold text-gray-900">Offers</span>
  </nav>

  {/* 🔽 SORT */}
  <select
    value={`${sortBy}-${sortDirection}`}
    onChange={(e) => handleSortChange(e.target.value)}
    className="px-4 py-1 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445D41]"
  >
    <option value="name-asc">Name: A–Z</option>
    <option value="name-desc">Name: Z–A</option>
    <option value="price-asc">Price: Low to High</option>
    <option value="price-desc">Price: High to Low</option>
  </select>
</div>

        <div className="flex gap-8">
          {/* LEFT FILTERS – CATEGORY PAGE UI */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b mb-6">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-[#445D41]" />
                      <h2 className="font-bold text-base text-gray-900">
                        Filters
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Reset
                    </Button>
                  </div>
{/* CATEGORY FILTER */}
{categories.length > 0 && (
  <div className="mb-6">
    <h3 className="font-bold text-sm text-gray-900 mb-3">
      Category
    </h3>

    <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-2">
      {categories.map((cat) => (
        <label
          key={cat.id}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
        >
          <input
            type="checkbox"
            className="w-4 h-4 text-[#445D41]"
            checked={selectedCategories.includes(cat.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedCategories([...selectedCategories, cat.id]);
              } else {
                setSelectedCategories(
                  selectedCategories.filter((c) => c !== cat.id)
                );
              }
            }}
          />
          <span className="text-sm text-gray-700 truncate">
            {cat.name}
          </span>
        </label>
      ))}
    </div>
  </div>
)}

                  {/* Brand */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-gray-900 mb-3">
                      Brand
                    </h3>
                    <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {brands.map((brand) => (
                        <label
                          key={brand.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-[#445D41]"
                            checked={selectedBrands.includes(brand.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrands([
                                  ...selectedBrands,
                                  brand.id,
                                ]);
                              } else {
                                setSelectedBrands(
                                  selectedBrands.filter(
                                    (b) => b !== brand.id
                                  )
                                );
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700">
                            {brand.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-gray-900 mb-4">
                      Price Range
                    </h3>

                    {minPrice < maxPrice && (
                      <PremiumPriceSlider
                        value={priceRange}
                        min={minPrice}
                        max={maxPrice}
                        onChange={(v) => setPriceRange(v)}
                      />
                    )}
                  </div>

                  {/* Rating */}
                  <div className="mb-6">
                    <h3 className="font-bold text-sm text-gray-900 mb-3">
                      Minimum Rating
                    </h3>

                    {[4, 3, 2, 1, 0].map((rating) => (
                      <label
                        key={rating}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
                      >
                        <input
                          type="radio"
                          className="w-4 h-4 text-[#445D41]"
                          checked={minRating === rating}
                          onChange={() => setMinRating(rating)}
                        />
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-700">
                          {rating > 0
                            ? `${rating}+ Stars`
                            : "All Ratings"}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-3 mb-8">
              {filteredProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  vatRates={vatRates}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                No offers found
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
