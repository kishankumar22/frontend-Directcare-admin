"use client";

import { useState, useMemo, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import { Star, SlidersHorizontal, X, Search, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDiscountedPrice } from "@/app/lib/discountHelpers";
import { flattenProductsForListing } from "@/app/lib/flattenProductsForListing";
import ProductCard from "@/components/ProductCard";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface NewArrivalsClientProps {
  categories: CategoryNode[];
  brands: Brand[];
  initialProducts: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  initialSortBy: string;
  initialSortDirection: string;
  vatRates: any[];
}

export default function NewArrivalsClient({
  categories,
  brands,
  initialProducts,
  currentPage,
  pageSize,
  totalPages,
  initialSortBy,
  initialSortDirection,
  vatRates,
}: NewArrivalsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<any[]>(initialProducts ?? []);
  const [page, setPage] = useState(currentPage ?? 1);
  const [hasMore, setHasMore] = useState(totalPages ? currentPage < totalPages : true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFetchingRef = useRef(false);
  const fetchCbRef = useRef<() => void>(() => {});

  const [sortBy, setSortBy] = useState((initialSortBy ?? "displayorder").toLowerCase());
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | "default">(
    initialSortDirection as "asc" | "desc" | "default"
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const slugsParam = searchParams.get("categorySlug");
    if (!slugsParam) return [];
    const slugs = slugsParam.split(",").filter(Boolean);
    return categories.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const brandsParam = searchParams.get("brands");
    if (!brandsParam) return [];
    const slugs = brandsParam.split(",").filter(Boolean);
    return brands.filter((b) => slugs.includes(b.slug)).map((b) => b.id);
  });

  const [dragRange, setDragRange] = useState<[number, number] | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  useEffect(() => {
    if (!products || products.length === 0) return;
    const flat = flattenProductsForListing(products as any);
    const prices = flat
      .map((item: any) => {
        const v = item.variantForCard;
        return typeof v?.price === "number" && v.price > 0 ? v.price : (item.productData.price ?? 0);
      })
      .filter((p: number) => p > 0);
    if (prices.length === 0) return;
    const newMin = Math.floor(Math.min(...prices));
    const newMax = Math.ceil(Math.max(...prices));
    setMinPrice((prev) => (prev === 0 ? newMin : Math.min(prev, newMin)));
    setMaxPrice((prev) => Math.max(prev, newMax));
  }, [products]);

  const urlPriceParam = searchParams.get("price");
  const committedRange = useMemo<[number, number]>(() => {
    if (urlPriceParam && maxPrice > 0) {
      const parts = urlPriceParam.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], Math.min(parts[1], maxPrice)];
      }
    }
    return [minPrice, maxPrice];
  }, [urlPriceParam, minPrice, maxPrice]);

  const displayRange: [number, number] = dragRange ?? committedRange;

  const flattenedProducts = useMemo(() => {
    const flat = flattenProductsForListing(products);

    let priceMin: number | null = null;
    let priceMax: number | null = null;
    if (urlPriceParam) {
      const parts = urlPriceParam.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        priceMin = parts[0];
        priceMax = parts[1];
      }
    }

    const priceFiltered = (priceMin !== null && priceMax !== null)
      ? flat.filter((item: any) => {
          const rawPrice = typeof item.variantForCard?.price === "number" && item.variantForCard.price > 0
            ? item.variantForCard.price
            : item.productData.price ?? 0;
          return rawPrice >= priceMin! && rawPrice <= priceMax!;
        })
      : flat;

    const seen = new Set<string>();
    const unique = priceFiltered.filter((item: any) => {
      const key = `${item.productData.id}-${item.variantForCard?.id ?? "parent"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const getCardPrice = (item: any) => {
      const basePrice = typeof item.variantForCard?.price === "number" ? item.variantForCard.price : item.productData.price;
      return getDiscountedPrice(item.productData, basePrice);
    };

    const sorted = [...unique].sort((a, b) => {
      const stockA = a.variantForCard?.stockQuantity ?? a.productData.stockQuantity ?? 0;
      const stockB = b.variantForCard?.stockQuantity ?? b.productData.stockQuantity ?? 0;
      const isOutA = stockA <= 0;
      const isOutB = stockB <= 0;
      if (isOutA !== isOutB) return isOutA ? 1 : -1;

      if (sortBy === "name") {
        const nameA = (a.cardSlug ?? a.productData.name).toLowerCase();
        const nameB = (b.cardSlug ?? b.productData.name).toLowerCase();
        const comparison = nameA.localeCompare(nameB);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      if (sortBy === "price") {
        const comparison = getCardPrice(a) - getCardPrice(b);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      if (sortBy === "rating") {
        const ratingA = a.productData.averageRating ?? 0;
        const ratingB = b.productData.averageRating ?? 0;
        return ratingB - ratingA;
      }
      return 0; // displayorder / default — keep server order
    });

    return sorted;
  }, [products, sortBy, sortDirection, urlPriceParam]);

  const fetchMoreProducts = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const query = new URLSearchParams();
      query.set("page", String(page + 1));
      query.set("pageSize", String(pageSize));
      query.set("markAsNew", "true");
      query.set("isPublished", "true");
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDirection && sortDirection !== "default") query.set("sortDirection", sortDirection);

      const categorySlugParam = searchParams.get("categorySlug");
      if (categorySlugParam) query.set("categorySlug", categorySlugParam);

      const priceParam = searchParams.get("price");
      if (priceParam) {
        const [pMin, pMax] = priceParam.split("-");
        if (pMin) query.set("minPrice", pMin);
        if (pMax) query.set("maxPrice", pMax);
      }

      if (selectedBrands.length > 0) query.set("brandIds", selectedBrands.join(","));

      const ratingParam = searchParams.get("minRating");
      if (ratingParam) query.set("minRating", ratingParam);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products?${query.toString()}`);
      if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
      const json = await res.json();

      setProducts((prev) => [...prev, ...json.data.items]);
      setPage(json.data.page);
      setHasMore(json.data.hasNext ?? json.data.page < json.data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [page, hasMore, pageSize, searchParams, sortBy, sortDirection, selectedBrands]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetchCbRef.current = fetchMoreProducts;
  }, [fetchMoreProducts]);

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node && hasMore) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) fetchCbRef.current();
        },
        { rootMargin: "800px" }
      );
      observerRef.current.observe(node);
    }
  }, [hasMore]);

  useEffect(() => {
    setProducts(initialProducts ?? []);
    setPage(currentPage ?? 1);
    setHasMore(totalPages ? currentPage < totalPages : true);
  }, [initialProducts, currentPage, totalPages]);

  const updateServerFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      startTransition(() => {
        router.push(`/new-arrivals?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSortChange = useCallback((value: string) => {
    const [newSortBy, newDirection] = value.split("-");
    setSortBy(newSortBy);
    setSortDirection(newDirection as "asc" | "desc" | "default");
    updateServerFilters({
      sortBy: newSortBy === "displayorder" ? "" : newSortBy,
      sortDirection: newDirection === "asc" && newSortBy === "displayorder" ? "" : newDirection,
    });
  }, [updateServerFilters]);

  const resetFilters = useCallback(() => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setMinRating(0);
    setSortBy("displayorder");
    setSortDirection("asc");
    setDragRange(null);
    router.push(`/new-arrivals`);
  }, [router]);

  const handleCategoryChange = useCallback((cat: CategoryNode, checked: boolean) => {
    const newSelected = checked
      ? [...selectedCategories, cat.id]
      : selectedCategories.filter((s) => s !== cat.id);
    setSelectedCategories(newSelected);
    const slugs = newSelected
      .map((id) => categories.find((c) => c.id === id)?.slug ?? "")
      .filter(Boolean)
      .join(",");
    updateServerFilters({ categorySlug: slugs });
  }, [selectedCategories, categories, updateServerFilters]);

  const handleBrandChange = useCallback((brandId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedBrands, brandId]
      : selectedBrands.filter((b) => b !== brandId);
    setSelectedBrands(newSelected);
    const slugs = newSelected
      .map((id) => brands.find((b) => b.id === id)?.slug ?? "")
      .filter(Boolean);
    updateServerFilters({ brands: slugs.join(",") });
  }, [selectedBrands, brands, updateServerFilters]);

  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePriceChange = useCallback((v: number[]) => {
    setDragRange(v as [number, number]);
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      setDragRange(null);
      updateServerFilters({ price: `${v[0]}-${v[1]}` });
    }, 600);
  }, [updateServerFilters]);

  const handleRatingChange = useCallback((rating: number) => {
    setMinRating(rating);
    updateServerFilters({ minRating: rating > 0 ? String(rating) : "" });
  }, [updateServerFilters]);

  const anyFilterApplied =
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    minRating > 0 ||
    !!urlPriceParam;

  return (
    <div className="min-h-screen bg-gray-50">
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
          <div className="h-full bg-[#445D41] animate-pulse" style={{ width: "70%" }} />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="hidden md:flex items-center justify-between gap-4 mb-2">
          <nav className="flex items-center flex-wrap gap-1 text-xs md:text-sm text-gray-600">
            <Link href="/" className="hover:text-[#445D41] transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Newly Added Products</span>
          </nav>

          <div className="flex items-center gap-3">
            {anyFilterApplied && (
              <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap animate-in fade-in duration-300">
                {flattenedProducts.length} product{flattenedProducts.length !== 1 ? "s" : ""} found
              </span>
            )}
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-xs md:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445D41]"
            >
              <option value="displayorder-asc">Default Sorting</option>
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
              <option value="price-asc">Low-High</option>
              <option value="price-desc">High-Low</option>
              <option value="rating-desc">Popularity</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3 lg:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 active:bg-gray-50 flex-shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {(selectedBrands.length > 0 || selectedCategories.length > 0 || minRating > 0) && (
              <span className="ml-0.5 bg-[#445D41] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {selectedBrands.length + selectedCategories.length + (minRating > 0 ? 1 : 0)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {anyFilterApplied && (
              <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap truncate animate-in fade-in duration-300">
                {flattenedProducts.length} item{flattenedProducts.length !== 1 ? "s" : ""}
              </span>
            )}
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445D41] flex-shrink-0"
            >
              <option value="displayorder-asc">Default</option>
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
              <option value="price-asc">Low-High</option>
              <option value="price-desc">High-Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24 h-[calc(100vh-96px)] overflow-y-auto overscroll-contain pr-2 hide-scrollbar">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between pb-3 border-b mb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#445D41]" />
                    <h2 className="font-semibold text-sm text-gray-900">Filters</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    disabled={isPending}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                  >
                    Reset
                  </Button>
                </div>

                {categories.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Category</h3>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {categories
                        .filter((c) => c.productCount === undefined || c.productCount > 0)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition">
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 text-[#445D41] rounded border-gray-300 flex-shrink-0"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={(e) => handleCategoryChange(cat, e.target.checked)}
                            />
                            <span className="text-xs text-gray-700 truncate">{cat.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                {brands.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Brand</h3>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                      {brands
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((brand) => (
                          <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition group" title={brand.name}>
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-gray-300 text-[#445D41] focus:ring-[#445D41] flex-shrink-0"
                              checked={selectedBrands.includes(brand.id)}
                              onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                            />
                            <span className="text-xs text-gray-700 truncate group-hover:text-[#445D41] transition">{brand.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                {minPrice < maxPrice && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-3">Price Range</h3>
                    <PremiumPriceSlider
                      value={[Math.max(displayRange[0], minPrice), Math.min(displayRange[1], maxPrice)]}
                      min={minPrice}
                      max={maxPrice}
                      onChange={handlePriceChange}
                    />
                  </div>
                )}

                <div className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                  <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Minimum Rating</h3>
                  <div className="space-y-1.5">
                    {[4, 3, 2, 1, 0].map((rating) => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition">
                        <input
                          type="radio"
                          name="rating"
                          className="w-3.5 h-3.5 text-[#445D41] focus:ring-[#445D41] flex-shrink-0"
                          checked={minRating === rating}
                          onChange={() => handleRatingChange(rating)}
                        />
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-700">{rating > 0 ? `${rating}+ Stars` : "All Ratings"}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            {showFilters && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div className="relative bg-white w-[78vw] max-w-xs h-full flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="font-semibold text-base text-gray-900">Filters</h2>
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-[#445D41] font-medium underline" onClick={resetFilters}>Reset All</button>
                      <button onClick={() => setShowFilters(false)} className="p-1 rounded-full hover:bg-gray-100">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
                    {categories.length > 0 && (
                      <div className="pb-4 border-b border-gray-200">
                        <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Category</h3>
                        <div className="space-y-1.5">
                          {categories.filter((c) => c.productCount === undefined || c.productCount > 0).map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 text-[#445D41] rounded border-gray-300 flex-shrink-0"
                                checked={selectedCategories.includes(cat.id)}
                                onChange={(e) => handleCategoryChange(cat, e.target.checked)}
                              />
                              <span className="text-xs text-gray-700">{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {brands.length > 0 && (
                      <div className="pb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider">Brand</h3>
                          <button className="text-[10px] text-[#445D41] font-medium" onClick={() => setSelectedBrands([])}>Clear</button>
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {brands.map((brand) => (
                            <label key={brand.id} className="flex items-center gap-2 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-gray-300 text-[#445D41] focus:ring-[#445D41] flex-shrink-0"
                                checked={selectedBrands.includes(brand.id)}
                                onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                              />
                              <span className="text-xs text-gray-700 truncate">{brand.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {minPrice < maxPrice && (
                      <div className="pb-4 border-b border-gray-200">
                        <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Price</h3>
                        <PremiumPriceSlider
                          value={[Math.max(displayRange[0], minPrice), Math.min(displayRange[1], maxPrice)]}
                          min={minPrice}
                          max={maxPrice}
                          onChange={handlePriceChange}
                        />
                      </div>
                    )}

                    <div className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider mb-2">Rating</h3>
                      <div className="space-y-1.5">
                        {[4, 3, 2, 1, 0].map((rating) => (
                          <label key={rating} className="flex items-center gap-2 cursor-pointer py-1">
                            <input
                              type="radio"
                              name="rating-mobile"
                              className="w-3.5 h-3.5 text-[#445D41] focus:ring-[#445D41] flex-shrink-0"
                              checked={minRating === rating}
                              onChange={() => handleRatingChange(rating)}
                            />
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-700">{rating > 0 ? `${rating}+ Stars` : "All Ratings"}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t px-4 py-3">
                    <Button className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white font-medium py-2.5 text-sm" onClick={() => setShowFilters(false)}>
                      Show Results ({flattenedProducts.length})
                    </Button>
                  </div>
                </div>

                <div className="flex-1 bg-black/50" onClick={() => setShowFilters(false)} />
              </div>
            )}

            <div className="relative">
              {isPending && (
                <div className="absolute inset-0 z-10 bg-white/60 rounded-xl flex items-center justify-center min-h-[200px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-[#445D41]" />
                    <span className="text-sm text-[#445D41] font-medium">Filtering...</span>
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8 ${isPending ? "opacity-40 pointer-events-none" : ""}`}>
                {flattenedProducts.map((item) => (
                  <ProductCard
                    key={`${item.productData.id}-${item.variantForCard?.id ?? "parent"}`}
                    product={item.productData}
                    vatRates={vatRates}
                    variantForCard={item.variantForCard}
                    cardSlug={item.cardSlug}
                  />
                ))}
              </div>
            </div>

            {hasMore && <div ref={loadMoreRef} className="h-10 w-full" />}
            {isLoadingMore && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 mb-8 min-h-[400px]">
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

            {flattenedProducts.length === 0 && !isPending && (
              <Card className="shadow-sm">
                <CardContent className="p-8 md:p-10 text-center">
                  <div className="mb-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold mb-1">No products found</p>
                  </div>
                  <Button onClick={resetFilters} className="bg-[#445D41] hover:bg-[#334a2c] text-white text-sm">
                    Reset All Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
