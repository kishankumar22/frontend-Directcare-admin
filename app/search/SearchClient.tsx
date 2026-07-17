"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import { useVatRates } from "@/app/hooks/useVatRates";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { flattenProductsForListing } from "@/app/lib/flattenProductsForListing";

const PAGE_SIZE = 20;

interface SearchClientProps {
  query: string;
  initialItems: any[];
  totalPages: number;
}

export default function SearchClient({
  query,
  initialItems,
  totalPages,
}: SearchClientProps) {
  const vatRates = useVatRates();

  const [products, setProducts] = useState<any[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(totalPages > 1);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFetchingRef = useRef(false);
  const fetchCbRef = useRef<() => void>(() => {});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProducts(initialItems ?? []);
    setPage(1);
    setHasMore(totalPages > 1);
    setHasInitializedPrice(false);
  }, [initialItems, totalPages]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [hasInitializedPrice, setHasInitializedPrice] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    selectedCategories.length + selectedBrands.length + (minRating > 0 ? 1 : 0);

  const [sortBy, setSortBy] = useState<string>("default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortChange = (value: string) => {
    if (value === "default") {
      setSortBy("default");
      setSortDirection("asc");
      return;
    }

    const [by, dir] = value.split("-");
    setSortBy(by);

    if (by === "rating") {
      setSortDirection("desc");
    } else {
      setSortDirection(dir as "asc" | "desc");
    }
  };

  // ✅ DYNAMIC CATEGORIES FROM SEARCH RESULTS
  const categories = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p) => {
      // Handle both product and variant results
      const cats = p.categories || p.productData?.categories || [];
      cats.forEach((c: any) => {
        if (!map.has(c.categoryId)) {
          map.set(c.categoryId, {
            id: c.categoryId,
            name: c.categoryName,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products]);

  // ✅ DYNAMIC BRANDS FROM SEARCH RESULTS
  const brands = useMemo(() => {
    const map = new Map();

    const filteredProducts =
      selectedCategories.length === 0
        ? products
        : products.filter((p) => {
            const cats = p.categories || p.productData?.categories || [];
            const ids = cats.map((c: any) => c.categoryId);
            return ids.some((id: string) => selectedCategories.includes(id));
          });

    filteredProducts.forEach((p) => {
      const brandsList = p.brands || p.productData?.brands || [];
      brandsList.forEach((b: any) => {
        if (!map.has(b.brandId)) {
          map.set(b.brandId, {
            id: b.brandId,
            name: b.brandName,
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products, selectedCategories]);

  // ✅ PRICE RANGE INIT
  useEffect(() => {
    if (!products || products.length === 0) return;

    const flat = flattenProductsForListing(products);

    const prices = flat.map((item: any) => {
      const variantPrice =
        typeof item.variantForCard?.price === "number" &&
        item.variantForCard.price > 0
          ? item.variantForCard.price
          : item.productData.price ?? 0;

      return variantPrice;
    });

    if (prices.length === 0) return;

    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));

    setMinPrice((prev) => (hasInitializedPrice ? Math.min(prev, min) : min));
    setMaxPrice((prev) => (hasInitializedPrice ? Math.max(prev, max) : max));

    if (!hasInitializedPrice) {
      setPriceRange([min, max]);
      setHasInitializedPrice(true);
    }
  }, [products, hasInitializedPrice]);

  // ✅ FLATTEN + FILTER + SORT
  const flattenedProducts = useMemo(() => {
    const allCards = flattenProductsForListing(products);

    const filtered = allCards.filter((item) => {
      const product = item.productData;
      const variant = item.variantForCard;

      const cardPrice =
        typeof variant?.price === "number" && variant.price > 0
          ? variant.price
          : product.price ?? 0;

      // Category filter
      if (selectedCategories.length > 0) {
        const cats = product.categories || [];
        const ids = cats.map((c: any) => c.categoryId);
        if (!ids.some((id: string) => selectedCategories.includes(id)))
          return false;
      }

      // Brand filter
      if (selectedBrands.length > 0) {
        const brandsList = product.brands || [];
        const ids = brandsList.map((b: any) => b.brandId);
        if (!ids.some((id: string) => selectedBrands.includes(id)))
          return false;
      }

      // Price filter
      if (cardPrice < priceRange[0] || cardPrice > priceRange[1])
        return false;

      // Rating filter
      if ((product.averageRating ?? 0) < minRating) return false;

      return true;
    });

    // De-duplicate
    const seen = new Set<string>();
    const unique = filtered.filter((item: any) => {
      const key = `${item.productData.id}-${item.variantForCard?.id ?? "parent"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort
    const sorted = [...unique].sort((a, b) => {
      const stockA = a.variantForCard?.stockQuantity ?? a.productData?.stockQuantity ?? 0;
      const stockB = b.variantForCard?.stockQuantity ?? b.productData?.stockQuantity ?? 0;
      const isOutA = stockA <= 0;
      const isOutB = stockB <= 0;

      if (isOutA !== isOutB) return isOutA ? 1 : -1;

      if (sortBy === "rating") {
        const ratingA = a.productData.averageRating ?? 0;
        const ratingB = b.productData.averageRating ?? 0;
        return ratingB - ratingA;
      }

      if (sortBy === "price") {
        const priceA =
          typeof a.variantForCard?.price === "number" && a.variantForCard.price > 0
            ? a.variantForCard.price
            : a.productData.price;
        const priceB =
          typeof b.variantForCard?.price === "number" && b.variantForCard.price > 0
            ? b.variantForCard.price
            : b.productData.price;
        const comparison = priceA - priceB;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return sorted;
  }, [products, selectedCategories, selectedBrands, priceRange, minRating, sortBy, sortDirection]);

  // ✅ FETCH MORE - USING QUICK SEARCH API
  const fetchMoreProducts = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;

    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;

      // 🔥 USE QUICK SEARCH API
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Products/quick-search?query=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&page=${nextPage}`
      );

      const data = await res.json();

      if (data?.success && Array.isArray(data.data)) {
        setProducts((prev) => [...prev, ...data.data]);
        setPage(nextPage);
        setHasMore(data.data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [page, hasMore, query]);

  useEffect(() => {
    fetchCbRef.current = fetchMoreProducts;
  }, [fetchMoreProducts]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isFetchingRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchCbRef.current();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinRating(0);
    setPriceRange([minPrice, maxPrice]);
  };

  const anyFilterApplied =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    minRating > 0 ||
    priceRange[0] > minPrice ||
    priceRange[1] < maxPrice;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 pt-2 pb-6">
        {/* Mobile Filter Drawer */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="relative bg-white w-[78vw] max-w-xs h-full flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-bold">Filters</h2>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs text-[#445D41] font-semibold underline"
                    onClick={resetFilters}
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
                {categories.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-sm mb-3">Category</h3>
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 p-2">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) =>
                            setSelectedCategories(
                              e.target.checked
                                ? [...selectedCategories, cat.id]
                                : selectedCategories.filter((c) => c !== cat.id)
                            )
                          }
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {brands.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-sm mb-3">Brand</h3>
                    {brands.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 p-2">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(b.id)}
                          onChange={(e) =>
                            setSelectedBrands(
                              e.target.checked
                                ? [...selectedBrands, b.id]
                                : selectedBrands.filter((x) => x !== b.id)
                            )
                          }
                        />
                        <span className="text-sm">{b.name}</span>
                      </label>
                    ))}
                  </div>
                )}

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
              </div>

              <div className="border-t px-5 py-4">
                <Button
                  className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white font-semibold py-3"
                  onClick={() => setShowFilters(false)}
                >
                  Show Results ({flattenedProducts.length})
                </Button>
              </div>
            </div>

            <div
              className="flex-1 bg-black/50"
              onClick={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-2 mb-2 lg:mb-3">
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 active:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-[#445D41] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <nav className="hidden md:flex items-center flex-wrap gap-1 text-sm text-gray-600">
            <a href="/" className="hover:text-[#445D41] transition-colors">
              Home
            </a>
            <span className="mx-1 text-gray-400">/</span>
            <span className="font-semibold text-gray-900 capitalize">
              Search Results
            </span>
          </nav>

          <div className="flex items-center gap-2 min-w-0">
            {anyFilterApplied && (
              <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 whitespace-nowrap truncate animate-in fade-in duration-300">
                {flattenedProducts.length} <span className="hidden sm:inline">products</span><span className="sm:hidden">items</span>
              </span>
            )}
            <select
              value={sortBy === "default" ? "default" : `${sortBy}-${sortDirection}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-auto max-w-[160px] px-2 py-2 border border-gray-300 rounded-lg bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445D41] flex-shrink-0"
            >
              <option value="default">Default Sorting</option>
              <option value="price-asc">Price: Low-High</option>
              <option value="price-desc">Price: High-Low</option>
              <option value="rating-desc">Sort by: Popularity⭐</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* FILTERS SIDEBAR */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 h-[calc(100vh-96px)] overflow-y-auto overscroll-contain pr-2 hide-scrollbar">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between pb-3 border-b mb-3 sticky top-0 bg-white z-20">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#445D41]" />
                    <h2 className="font-semibold text-sm text-gray-900">Filters</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                  >
                    Reset
                  </Button>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">
                      Category
                    </h3>
                    <div className="max-h-52 overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition"
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-[#445D41] rounded border-gray-300 flex-shrink-0"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={(e) =>
                              setSelectedCategories(
                                e.target.checked
                                  ? [...selectedCategories, cat.id]
                                  : selectedCategories.filter((c) => c !== cat.id)
                              )
                            }
                          />
                          <span className="text-xs text-gray-700 truncate">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand Filter */}
                {brands.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">
                      Brand
                    </h3>
                    <div className="max-h-52 overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
                      {brands.map((b) => (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition"
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-[#445D41] rounded border-gray-300 flex-shrink-0"
                            checked={selectedBrands.includes(b.id)}
                            onChange={(e) =>
                              setSelectedBrands(
                                e.target.checked
                                  ? [...selectedBrands, b.id]
                                  : selectedBrands.filter((x) => x !== b.id)
                              )
                            }
                          />
                          <span className="text-xs text-gray-700 truncate">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                {minPrice < maxPrice && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-3">
                      Price Range
                    </h3>
                    <PremiumPriceSlider
                      value={priceRange}
                      min={minPrice}
                      max={maxPrice}
                      onChange={setPriceRange}
                    />
                  </div>
                )}

                {/* Rating Filter */}
                <div className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                  <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">
                    Minimum Rating
                  </h3>
                  <div className="space-y-1.5">
                    {[4, 3, 2, 1, 0].map((r) => (
                      <label
                        key={r}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition"
                      >
                        <input
                          type="radio"
                          name="rating"
                          className="w-3.5 h-3.5 text-[#445D41] focus:ring-[#445D41] flex-shrink-0"
                          checked={minRating === r}
                          onChange={() => setMinRating(r)}
                        />
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-700">
                          {r === 0 ? "All Ratings" : `${r}+ Stars`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* PRODUCTS LIST */}
          <div className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
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

            {flattenedProducts.length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-8 md:p-10 text-center">
                  <div className="mb-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold mb-1">No products found</p>
                  </div>
                  <Button
                    onClick={resetFilters}
                    className="bg-[#445D41] hover:bg-[#334a2c] text-white text-sm"
                  >
                    Reset All Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasMore && <div ref={loadMoreRef} className="h-10 w-full" />}

            {isLoadingMore && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 overflow-hidden bg-white animate-pulse">
                    <div className="bg-gray-200 h-44 md:h-56 w-full" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                      <div className="h-3 bg-gray-200 rounded w-3/5" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-2/5 mt-1" />
                      <div className="h-8 bg-gray-200 rounded-lg w-full mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}