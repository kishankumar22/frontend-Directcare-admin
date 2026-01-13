// app/products/ProductsClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShoppingCart, 
  Star, 
  SlidersHorizontal, 
  X,
  Search,
  Grid3x3,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  VenusAndMars,
  BadgePercent,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/CustomToast";

// ✅ Types
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  slug: string;
  sku: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  categoryName: string;
  brandName: string;
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
  tags: string;
  vatExempt?: boolean;
gender?: string; // optional if you want "Unisex" logic later

}

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  productCount: number;
  subCategories: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  isPublished: boolean;
  productCount: number;
}

interface ProductsClientProps {
  initialProducts: Product[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  initialSearchTerm: string;
  initialSortBy: string;
  initialSortDirection: string;
  categories: Category[];
  brands: Brand[];
}

// ✅ Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function ProductsClient({ 
  initialProducts,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  initialSearchTerm,
  initialSortBy,
  initialSortDirection,
  categories,
  brands
}: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [products] = useState<Product[]>(initialProducts);
  const [instantSearch, setInstantSearch] = useState(initialSearchTerm);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection as "asc" | "desc");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState(3);

  // ✅ Debounced search (300ms delay)
  const debouncedSearch = useDebounce(instantSearch, 300);

  // ✅ Flatten categories once
  const allCategories = useMemo(() => {
    const flattenCategories = (cats: Category[]): Category[] => {
      return cats.reduce((acc, cat) => {
        acc.push(cat);
        if (cat.subCategories?.length > 0) {
          acc.push(...flattenCategories(cat.subCategories));
        }
        return acc;
      }, [] as Category[]);
    };
    return flattenCategories(categories);
  }, [categories]);

  // ✅ Optimized filtering + sorting with debounced search
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.categoryName?.toLowerCase().includes(searchLower) ||
          product.brandName?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(product.categoryName)) {
        return false;
      }
      
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brandName)) {
        return false;
      }
      
      if (product.price < priceRange[0] || product.price > priceRange[1]) {
        return false;
      }
      
      if (product.averageRating < minRating) {
        return false;
      }
      
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      if (sortBy === 'price') {
        const comparison = a.price - b.price;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });

    return sorted;
  }, [products, debouncedSearch, selectedCategories, selectedBrands, priceRange, minRating, sortBy, sortDirection]);

  // ✅ Memoized image URL generator
  const getMainImage = useCallback((images: ProductImage[]) => {
    const mainImage = images.find(img => img.isMain) || images[0];
    return mainImage?.imageUrl 
      ? `${process.env.NEXT_PUBLIC_API_URL}${mainImage.imageUrl}`
      : "/placeholder-product.jpg";
  }, []);

  // ✅ Memoized discount calculator
  const calculateDiscount = useCallback((price: number, oldPrice: number) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  }, []);

  // ✅ Handlers
  const updateServerFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`/products?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams]);

  const handleSortChange = useCallback((value: string) => {
    const [newSortBy, newDirection] = value.split('-');
    setSortBy(newSortBy);
    setSortDirection(newDirection as "asc" | "desc");
  }, []);

  const handlePageChange = useCallback((page: number) => {
    updateServerFilters({ page: page.toString() });
  }, [updateServerFilters]);

  const resetFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 1000]);
    setMinRating(0);
    setInstantSearch("");
    setSortBy("name");
    setSortDirection("asc");
    router.push('/products');
  }, [router]);

  const handleAddToCart = useCallback((product: Product) => {
    toast.success(`${product.name} added to cart! 🛒`);
  }, [toast]);

  const openProductInNewTab = useCallback((slug: string) => {
    window.open(`/products/${slug}`, '_blank');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
          <div className="h-full bg-[#445D41] animate-pulse" style={{ width: '70%' }} />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[#445D41]">All Products</h1>
          <p className="text-gray-600">
            Showing {filteredAndSortedProducts.length} of {totalCount} products
          </p>
        </div>

     <div className="flex gap-8">
  {/* ✅ SIDEBAR FILTERS - FIXED UI */}
  <aside className="hidden lg:block w-64 flex-shrink-0">
    <Card className="sticky top-24 shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#445D41]" />
            <h2 className="font-bold text-base text-gray-900">Filters</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            disabled={isPending}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Reset
          </Button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Category</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {allCategories.map((cat) => (
              <label 
                key={cat.id} 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition group"
                title={cat.name}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[#445D41] focus:ring-[#445D41] focus:ring-2 flex-shrink-0"
                  checked={selectedCategories.includes(cat.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories([...selectedCategories, cat.name]);
                    } else {
                      setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                    }
                  }}
                />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate group-hover:text-[#445D41] transition">
                    {cat.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    ({cat.productCount})
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Brand Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Brand</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {brands.map((brand) => (
              <label 
                key={brand.id} 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition group"
                title={brand.name}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[#445D41] focus:ring-[#445D41] focus:ring-2 flex-shrink-0"
                  checked={selectedBrands.includes(brand.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBrands([...selectedBrands, brand.name]);
                    } else {
                      setSelectedBrands(selectedBrands.filter(b => b !== brand.name));
                    }
                  }}
                />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate group-hover:text-[#445D41] transition">
                    {brand.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    ({brand.productCount})
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
{/* ✅ DUAL HANDLE PRICE RANGE SLIDER */}
<div className="mb-6">
  <h3 className="font-bold text-sm text-gray-900 mb-4">Price Range</h3>
  
  <div className="px-2">
    {/* Dual Range Slider Container */}
    <div className="relative pt-1 pb-6">
      {/* Background Track */}
      <div className="h-1.5 bg-gray-200 rounded-full absolute w-full top-0" />
      
      {/* Active Track */}
      <div 
        className="h-1.5 bg-[#445D41] rounded-full absolute top-0"
        style={{
          left: `${(priceRange[0] / 1000) * 100}%`,
          right: `${100 - (priceRange[1] / 1000) * 100}%`
        }}
      />

      {/* Min Range Slider */}
      <input
        type="range"
        min="0"
        max="1000"
        step="10"
        value={priceRange[0]}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (value < priceRange[1] - 50) {
            setPriceRange([value, priceRange[1]]);
          }
        }}
        className="dual-range-slider"
      />

      {/* Max Range Slider */}
      <input
        type="range"
        min="0"
        max="1000"
        step="10"
        value={priceRange[1]}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (value > priceRange[0] + 50) {
            setPriceRange([priceRange[0], value]);
          }
        }}
        className="dual-range-slider"
      />
    </div>

    {/* Price Display */}
    <div className="flex items-center justify-between mt-2">
      <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-900">
          £{priceRange[0]}
        </span>
      </div>
      <div className="flex-1 mx-3 border-t border-dashed border-gray-300" />
      <div className="px-3 py-1.5 bg-[#445D41]/10 rounded-lg border border-[#445D41]/20">
        <span className="text-xs font-semibold text-[#445D41]">
          £{priceRange[1]}
        </span>
      </div>
    </div>
  </div>
</div>


        {/* Rating Filter */}
        <div className="mb-6">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Minimum Rating</h3>
          <div className="space-y-2">
            {[4, 3, 2, 1, 0].map((rating) => (
              <label 
                key={rating} 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
              >
                <input
                  type="radio"
                  name="rating"
                  className="w-4 h-4 text-[#445D41] focus:ring-[#445D41] focus:ring-2"
                  checked={minRating === rating}
                  onChange={() => setMinRating(rating)}
                />
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-700">
                    {rating > 0 ? `${rating}+ Stars` : 'All Ratings'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </aside>

  {/* MAIN CONTENT */}
  <div className="flex-1">
    {/* Search & Sort Bar */}
    <Card className="mb-6 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search products..."
              value={instantSearch}
              onChange={(e) => setInstantSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-transparent transition"
            />
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            {instantSearch && (
              <button
                onClick={() => setInstantSearch("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-transparent bg-white text-sm font-medium text-gray-700 transition"
          >
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>

          {/* Grid Toggle */}
          <div className="flex gap-2">
            <Button
              variant={gridCols === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridCols(2)}
              className={`${gridCols === 2 ? "bg-[#445D41] hover:bg-[#334a2c]" : "hover:bg-gray-100"} transition`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={gridCols === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridCols(3)}
              className={`${gridCols === 3 ? "bg-[#445D41] hover:bg-[#334a2c]" : "hover:bg-gray-100"} transition`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden hover:bg-gray-100 transition"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* PRODUCT GRID */}
    <div className={`grid grid-cols-1 ${gridCols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>
      {filteredAndSortedProducts.map((product) => {
        const discount = calculateDiscount(product.price, product.oldPrice);
        const mainImage = getMainImage(product.images);

        return (
          <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border border-gray-200">
            <CardContent className="p-0">
              {/* Image */}
              <div 
                onClick={() => openProductInNewTab(product.slug)}
                className="cursor-pointer"
              >
                <div className="relative bg-gray-50 h-64 overflow-hidden rounded-t-lg">
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    quality={75}
                  />
                  {discount > 0 && (
                    <Badge className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white">
                      -{discount}%
                    </Badge>
                  )}
                  {/* VAT Relief */}
{product.vatExempt && (
  <div className="absolute top-3 right-3 bg-green-600 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 text-[10px] font-semibold">
    <BadgePercent className="h-3 w-3" />
    VAT Relief
  </div>
)}
                  {product.stockQuantity === 0 && (
                    <Badge className="absolute top-3 left-3 bg-gray-500 text-white">
                      Out of Stock
                    </Badge>
                  )}
                 {/* Unisex Icon */}
<div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded-full shadow flex items-center gap-1">
  <img 
  src="/icons/unisex.svg" 
  alt="Unisex"
  className="h-4 w-4 object-contain"
  loading="lazy"
/>Unisex
</div>


{/* External Link Icon */}
<div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition">
  <ExternalLink className="h-5 w-5 text-white drop-shadow-lg" />
</div>

                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <Badge variant="outline" className="mb-2 text-xs border-[#445D41] text-[#445D41]">
                  {product.categoryName}
                </Badge>
                
                <div 
                  onClick={() => openProductInNewTab(product.slug)}
                  className="cursor-pointer"
                >
                  <h3 className="font-semibold text-base mb-2 line-clamp-2 hover:text-[#445D41] transition-colors text-gray-900 min-h-[48px]">
                    {product.name}
                  </h3>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm ml-1 font-medium text-gray-700">
                      {product.averageRating || 0}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({product.reviewCount || 0} reviews)
                  </span>
                </div>

                {/* Price */}
              <div className="flex items-center gap-2 mb-4">
  <span className="text-2xl font-bold text-[#445D41]">
    £{product.price.toFixed(2)}
  </span>

  {product.oldPrice > product.price && (
    <span className="text-sm text-gray-400 line-through">
      £{product.oldPrice.toFixed(2)}
    </span>
  )}

  {product.vatExempt && (
    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
      (0% VAT)
    </span>
  )}
</div>


                {/* Add to Cart Button */}
                <Button
                  onClick={() => handleAddToCart(product)}
                  className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white transition-colors"
                  disabled={product.stockQuantity === 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.stockQuantity > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* No Results */}
    {filteredAndSortedProducts.length === 0 && (
      <Card className="shadow-sm">
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-700 text-lg font-semibold mb-2">No products found</p>
            <p className="text-gray-500 text-sm mb-6">
              {instantSearch ? `No results for "${instantSearch}"` : "Try adjusting your filters"}
            </p>
          </div>
          <Button 
            onClick={resetFilters} 
            className="bg-[#445D41] hover:bg-[#334a2c] text-white"
          >
            Reset All Filters
          </Button>
        </CardContent>
      </Card>
    )}

    {/* Pagination */}
    {totalPages > 1 && filteredAndSortedProducts.length > 0 && (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isPending}
              className="hover:bg-gray-100 transition"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isPending}
              className="hover:bg-gray-100 transition"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
</div>

{/* ✅ Add Custom Scrollbar CSS */}
<style jsx>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`}</style>
{/* ✅ DUAL SLIDER CSS */}
<style jsx>{`
  .dual-range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 0;
    background: transparent;
    pointer-events: none;
    position: absolute;
    top: 2;
    outline: none;
  }

  .dual-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #445D41;
    border: 3px solid white;
    border-radius: 50%;
    cursor: pointer;
    pointer-events: all;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    position: relative;
    z-index: 3;
  }

  .dual-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .dual-range-slider::-webkit-slider-thumb:active {
    transform: scale(1.1);
    background: #334a2c;
  }

  .dual-range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: #445D41;
    border: 3px solid white;
    border-radius: 50%;
    cursor: pointer;
    pointer-events: all;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    position: relative;
    z-index: 3;
  }

  .dual-range-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .dual-range-slider::-moz-range-thumb:active {
    transform: scale(1.1);
    background: #334a2c;
  }

  .dual-range-slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px rgba(68, 93, 65, 0.15);
  }

  .dual-range-slider:focus::-moz-range-thumb {
    box-shadow: 0 0 0 4px rgba(68, 93, 65, 0.15);
  }
`}</style>
      </main>
    </div>
  );
}
