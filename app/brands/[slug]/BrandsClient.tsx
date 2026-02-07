"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useVatRates } from "@/app/hooks/useVatRates";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import { SlidersHorizontal, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { flattenProductsForListing } from "@/app/lib/flattenProductsForListing";

const PAGE_SIZE = 20;

interface BrandsClientProps {
  brandSlug: string;
  initialItems: any[];
  totalPages: number;
}

export default function BrandsClient({
  brandSlug,
  initialItems,
  totalPages,
}: BrandsClientProps) {
  const vatRates = useVatRates();

  const [products, setProducts] = useState<any[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(page < totalPages);
  const [loading, setLoading] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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

  useEffect(() => {
    if (!products.length) return;
    const prices = products.map((p) => p.price ?? 0);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    setMinPrice(min);
    setMaxPrice(max);
    setPriceRange([min, max]);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      if (selectedCategories.length > 0) {
        const ids = product.categories?.map((c: any) => c.categoryId) ?? [];
        if (!ids.some((id: string) => selectedCategories.includes(id)))
          return false;
      }

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
    priceRange,
    minRating,
    sortBy,
    sortDirection,
  ]);
const flattenedProducts = useMemo(() => {
  return flattenProductsForListing(filteredProducts);
}, [filteredProducts]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const nextPage = page + 1;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products/by-brand/${brandSlug}?page=${nextPage}&pageSize=${PAGE_SIZE}&sortDirection=asc&isPublished=true`
    );

    const data = await res.json();

    setProducts((prev) => [...prev, ...(data.data.items ?? [])]);
    setPage(nextPage);
    setHasMore(nextPage < data.data.totalPages);
    setLoading(false);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setMinRating(0);
    setPriceRange([minPrice, maxPrice]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 py-4">
        {/* TOP BAR – Breadcrumb + Sort (Offers page style) */}
<div className="mb-3 flex items-center justify-between">
  {/* 🧭 Breadcrumb */}
<nav className="flex items-center flex-wrap gap-1 text-sm text-gray-600">
  <a href="/" className="hover:text-[#445D41] transition-colors">
    Home
  </a>
  <span className="mx-1 text-gray-400">/</span>
  <a href="/brands" className="hover:text-[#445D41] transition-colors">
    Brands
  </a>
  <span className="mx-1 text-gray-400">/</span>
  <span className="font-semibold text-gray-900 capitalize">
    {brandSlug.replace(/-/g, " ")}
  </span>
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
          {/* FILTERS */}
          <aside className="hidden lg:block w-64">
            <div className="sticky top-24">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-[#445D41]" />
                      <h2 className="font-bold">Filters</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="text-xs text-blue-600"
                    >
                      Reset
                    </Button>
                  </div>

                  {/* Category */}
                  {categories.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-sm mb-3">Category</h3>
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={(e) =>
                              setSelectedCategories(
                                e.target.checked
                                  ? [...selectedCategories, cat.id]
                                  : selectedCategories.filter(
                                      (c) => c !== cat.id
                                    )
                              )
                            }
                          />
                          <span className="text-sm">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Price */}
                  {minPrice < maxPrice && (
                    <div className="mb-6">
                      <h3 className="font-bold text-sm mb-3">Price Range</h3>
                      <PremiumPriceSlider
                        value={priceRange}
                        min={minPrice}
                        max={maxPrice}
                        onChange={setPriceRange}
                      />
                    </div>
                  )}

                  {/* Rating */}
                  <div>
                    <h3 className="font-bold text-sm mb-3">
                      Minimum Rating
                    </h3>
                    {[4, 3, 2, 1, 0].map((r) => (
                      <label
                        key={r}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <input
                          type="radio"
                          checked={minRating === r}
                          onChange={() => setMinRating(r)}
                        />
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">
                          {r === 0 ? "All Ratings" : `${r}+ Stars`}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* PRODUCTS */}
          <div className="flex-1">
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
  {flattenedProducts.map((item) => (
    <ProductCard
      key={item.variantForCard?.id ?? item.productData.id}
      product={item.productData}
      vatRates={vatRates}
      variantForCard={item.variantForCard}
      cardSlug={item.cardSlug}
    />
  ))}
</div>


            {filteredProducts.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                No products found
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-[#445D41]"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
