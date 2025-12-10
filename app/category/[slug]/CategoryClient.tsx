// app/category/[slug]/CategoryClient.tsx
"use client";

import {
  useState,
  useMemo,
  useTransition,
  useEffect,
  useCallback,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useVatRates } from "@/app/hooks/useVatRates";
import { getVatRate } from "@/app/lib/vatHelpers";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import Link from "next/link";


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
  BadgePercent,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/CustomToast";
import { getProductDiscountPercent } from "@/app/lib/discountHelpers";


// ---------- Types ----------

interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

interface Product {
  categoryId: string | undefined;
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
  gender?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
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

interface CategoryClientProps {
  category: Category | null;
  initialProducts: Product[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  initialSearchTerm: string;
  initialSortBy: string;
  initialSortDirection: string;
  brands: Brand[];
}

// ---------- Debounce hook ----------

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

// ---------- Component ----------

export default function CategoryClient({
  category,
  initialProducts,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  initialSearchTerm,
  initialSortBy,
  initialSortDirection,
  brands,
}: CategoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const vatRates = useVatRates();

  const [products] = useState<Product[]>(initialProducts);
  const [instantSearch, setInstantSearch] = useState(initialSearchTerm);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSortDirection as "asc" | "desc"
  );

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState(3);
  const debouncedSearch = useDebounce(instantSearch, 300);

  const [minPrice, setMinPrice] = useState(0);
const [maxPrice, setMaxPrice] = useState(0);


  const flattenSubCategories = (cat: Category | null): Category[] => {
  if (!cat) return [];
  const result: Category[] = [];
  const stack = [...(cat.subCategories || [])];

  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    if (current.subCategories && current.subCategories.length > 0) {
      stack.push(...current.subCategories);
    }
  }

  return result;
};

const allSubCategories = flattenSubCategories(category);

  // ---------- Derived initial price range ----------
useEffect(() => {
  if (!initialProducts || initialProducts.length === 0) return;

  const prices = initialProducts.map((p) => p.price ?? 0);
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));

  setMinPrice(min);
  setMaxPrice(max);
  setPriceRange([min, max]);
}, [initialProducts]);
  // ---------- Filtering + sorting ----------
  const filteredAndSortedProducts = useMemo(() => {
   const filtered = products.filter((product) => {
  // must match category
// Category + subcategory filtering
if (selectedSubCategories.length > 0) {
  if (!selectedSubCategories.includes(product.categoryId ?? "")) return false;
} else {
  const allowedIds = [category?.id, ...allSubCategories.map(s => s.id)];
  if (!allowedIds.includes(product.categoryId)) return false;
}

  if (debouncedSearch) {
    const searchLower = debouncedSearch.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.brandName?.toLowerCase().includes(searchLower) ||
      product.tags?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;
  }

  if (selectedBrands.length > 0 && !selectedBrands.includes(product.brandName))
    return false;

  if (product.price < priceRange[0] || product.price > priceRange[1])
    return false;

  if (product.averageRating < minRating) return false;

  return true;
});
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (sortBy === "price") {
        const comparison = a.price - b.price;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return sorted;
  }, [
    products,
    debouncedSearch,
    selectedBrands,
    priceRange,
    minRating,
    sortBy,
    sortDirection,
    selectedSubCategories,
allSubCategories,

  ]);

  // ---------- Helpers ----------

  const getMainImage = useCallback((images: ProductImage[]) => {
    const mainImage = images.find((img) => img.isMain) || images[0];
    return mainImage?.imageUrl
      ? `${process.env.NEXT_PUBLIC_API_URL}${mainImage.imageUrl}`
      : "/placeholder-product.jpg";
  }, []);

  const calculateDiscount = useCallback((price: number, oldPrice: number) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  }, []);

  const getDefaultVariant = (product: any) => {
  if (product.variants?.length > 0) {
    return product.variants.find((v: any) => v.isDefault) ?? product.variants[0];
  }
  return null;
};


  const updateServerFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        // same pattern as /products page
        router.push(`/category/${category?.slug}?${params.toString()}`, {
          scroll: false,
        });
      });
    },
    [router, searchParams, category?.slug]
  );

  const handleSortChange = useCallback((value: string) => {
    const [newSortBy, newDirection] = value.split("-");
    setSortBy(newSortBy);
    setSortDirection(newDirection as "asc" | "desc");
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      updateServerFilters({ page: page.toString() });
    },
    [updateServerFilters]
  );

  const resetFilters = useCallback(() => {
    setSelectedBrands([]);
    setMinRating(0);
    setInstantSearch("");
    setSortBy("name");
    setSortDirection("asc");
    setPriceRange([0, 1000]);
    router.push(`/category/${category?.slug}`);
  }, [router, category?.slug]);

  const { addToCart } = useCart();

const handleAddToCart = useCallback(
  (product: any) => {
    const defaultVariant: any = getDefaultVariant(product);

    const price = defaultVariant?.price ?? product.price;
    const imageUrl = defaultVariant?.imageUrl
      ? (defaultVariant.imageUrl.startsWith("http")
          ? defaultVariant.imageUrl
          : `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`)
      : product.images?.[0]?.imageUrl
      ? (product.images[0].imageUrl.startsWith("http")
          ? product.images[0].imageUrl
          : `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`)
      : "/placeholder-product.jpg";

    const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

    addToCart({
      id: `${defaultVariant?.id ?? product.id}-one`,
      productId: product.id,
      name: defaultVariant
        ? `${product.name} (${[
            defaultVariant.option1Value,
            defaultVariant.option2Value,
            defaultVariant.option3Value,
          ].filter(Boolean).join(", ")})`
        : product.name,
      price,
      finalPrice: price,
      quantity: 1,
      image: imageUrl,
      sku: defaultVariant?.sku ?? product.sku,
      variantId: defaultVariant?.id ?? null,
      slug: product.slug,
      variantOptions: {
        option1: defaultVariant?.option1Value ?? null,
        option2: defaultVariant?.option2Value ?? null,
        option3: defaultVariant?.option3Value ?? null,
      },
      productData: JSON.parse(JSON.stringify(product)),
    });

    toast.success(`${product.name} added to cart! 🛒`);
  },
  [toast, addToCart]
);


  // ---------- JSX ----------

  return (
    <div className="min-h-screen bg-gray-50">
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
          <div
            className="h-full bg-[#445D41] animate-pulse"
            style={{ width: "70%" }}
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Category header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#445D41]">
              {category?.name || "Category"}
            </h1>
            <p className="text-gray-600 max-w-xl">
              {category?.description ||
                "Browse products in this category with advanced filters."}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Showing {filteredAndSortedProducts.length} of {totalCount}{" "}
              products
            </p>
          </div>

          {category?.imageUrl && (
            <div className="relative h-24 w-40 md:h-28 md:w-48 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
              <Image
                src={`${process.env.NEXT_PUBLIC_API_URL}${category.imageUrl}`}
                alt={category.name}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* SIDEBAR FILTERS (no category filter here, only brand/price/rating) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="sticky top-24 shadow-sm">
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
                    disabled={isPending}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Reset
                  </Button>
                </div>

              {/* Subcategory Filter */}
{allSubCategories.length > 0 && (
  <div className="mb-6">
    <h3 className="font-bold text-sm text-gray-900 mb-3">Subcategories</h3>

    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
      {allSubCategories.map((sub) => (
        <label
          key={sub.id}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
        >
          <input
            type="checkbox"
            className="w-4 h-4 text-[#445D41]"
            checked={selectedSubCategories.includes(sub.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedSubCategories([...selectedSubCategories, sub.id]);
              } else {
                setSelectedSubCategories(
                  selectedSubCategories.filter((s) => s !== sub.id)
                );
              }
            }}
          />
          <span className="text-sm text-gray-700 truncate">{sub.name}</span>
        </label>
      ))}
    </div>
  </div>
)}
                {/* Brand Filter */}
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">
                    Brand
                  </h3>
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
                              setSelectedBrands([
                                ...selectedBrands,
                                brand.name,
                              ]);
                            } else {
                              setSelectedBrands(
                                selectedBrands.filter(
                                  (b) => b !== brand.name
                                )
                              );
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
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-gray-900 mb-4">
                    Price Range
                  </h3>
{minPrice < maxPrice && priceRange && (
  <PremiumPriceSlider
    value={priceRange}
    min={minPrice}
    max={maxPrice}
    onChange={(v) => setPriceRange(v)}
  />
)}

</div>

                {/* Rating Filter */}
                <div className="mb-6">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">
                    Minimum Rating
                  </h3>
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
                            {rating > 0
                              ? `${rating}+ Stars`
                              : "All Ratings"}
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
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={`Search in ${
                        category?.name || "this category"
                      }...`}
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

                  {/* Sort */}
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

                  {/* Grid toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={gridCols === 2 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGridCols(2)}
                      className={`${
                        gridCols === 2
                          ? "bg-[#445D41] hover:bg-[#334a2c]"
                          : "hover:bg-gray-100"
                      } transition`}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={gridCols === 3 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGridCols(3)}
                      className={`${
                        gridCols === 3
                          ? "bg-[#445D41] hover:bg-[#334a2c]"
                          : "hover:bg-gray-100"
                      } transition`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Mobile filters toggle */}
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

            {/* Mobile filters panel (reuse same as sidebar, simplified) */}
            {showFilters && (
              <Card className="mb-6 shadow-sm lg:hidden">
                <CardContent className="p-4 space-y-6">
                  {/* Brand */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-gray-900">
                        Brand
                      </h3>
                      <button
                        className="text-xs text-blue-600"
                        onClick={() => setSelectedBrands([])}
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {brands.map((brand) => (
                        <label
                          key={brand.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition group"
                          title={brand.name}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-[#445D41] focus:ring-[#445D41]"
                            checked={selectedBrands.includes(brand.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrands([
                                  ...selectedBrands,
                                  brand.name,
                                ]);
                              } else {
                                setSelectedBrands(
                                  selectedBrands.filter(
                                    (b) => b !== brand.name
                                  )
                                );
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700 truncate group-hover:text-[#445D41]">
                            {brand.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 mb-3">
                      Minimum Rating
                    </h3>
                    <div className="space-y-1">
                      {[4, 3, 2, 1, 0].map((rating) => (
                        <label
                          key={rating}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition"
                        >
                          <input
                            type="radio"
                            name="rating-mobile"
                            className="w-4 h-4 text-[#445D41] focus:ring-[#445D41]"
                            checked={minRating === rating}
                            onChange={() => setMinRating(rating)}
                          />
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-700">
                              {rating > 0
                                ? `${rating}+ Stars`
                                : "All Ratings"}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PRODUCT GRID */}
            <div
              className={`grid grid-cols-1 ${
                gridCols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
              } gap-6 mb-8`}
            >
              {filteredAndSortedProducts.map((product) => {
                // VAT rate finder like featured slider
const discountPercent = getProductDiscountPercent(product, product.price);
const vatRate = getVatRate(vatRates, (product as any).vatRateId, product.vatExempt);

              const defaultVariant = getDefaultVariant(product);

const price = defaultVariant?.price ?? product.price;
const oldPrice = defaultVariant?.compareAtPrice ?? product.oldPrice;
const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

const mainImage = defaultVariant?.imageUrl
  ? `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`
  : getMainImage(product.images);


                return (
                  <Card
                    key={product.id}
                    className="group hover:shadow-xl transition-all duration-300 border border-gray-200"
                  >
                    <CardContent className="p-0">
                      {/* Image */}
                     <Link href={`/products/${product.slug}`}>
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
                          {discountPercent && (
  <span className="absolute top-3 right-3 bg-green-600 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 text-[10px] font-semibold">
    -{discountPercent}% OFF
  </span>
)}
                          {product.vatExempt && (
                            <div className="absolute top-3 right-3 bg-green-600 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 text-[10px] font-semibold">
                              <BadgePercent className="h-3 w-3" />
                              VAT Relief
                            </div>
                          )}

                           <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20 bg-white/90 px-1 py-0.5 sm:px-2 sm:py-1 rounded-md shadow flex items-center gap-1">
                    <img 
  src="/icons/unisex.svg" 
  alt="Unisex"
  className="h-3 w-3 sm:h-4 sm:w-4"
  loading="lazy"
/>
                    <span className="text-[8px] sm:text-[10px] font-semibold text-gray-700">Unisex</span>
                  </div>
                        </div>
                         </Link>
                     

                      {/* Content */}
                      <div className="p-4">
                        <Badge
                          variant="outline"
                          className="mb-2 text-xs border-[#445D41] text-[#445D41]"
                        >
                          {product.categoryName}
                        </Badge>

                         <Link href={`/products/${product.slug}`}>
                          <h3 className="font-semibold text-base mb-2 line-clamp-2 hover:text-[#445D41] transition-colors text-gray-900 min-h-[48px]">
  {defaultVariant
    ? `${product.name} (${[
        defaultVariant?.option1Value,
        defaultVariant?.option2Value,
        defaultVariant?.option3Value,
      ].filter(Boolean).join(", ")})`
    : product.name}
</h3>
                        </Link>
                        

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm ml-1 font-medium text-gray-700">
                              {(product.averageRating ?? 0).toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ({product.reviewCount || 0} reviews)
                          </span>
                        </div>

                        {/* Price */}
                       <div className="flex items-center gap-2 mb-4 flex-wrap">
  <span className="text-2xl font-bold text-[#445D41]">
    £{price.toFixed(2)}
  </span>

 {oldPrice > price && (
  <span className="text-sm text-gray-400 line-through">
    £{oldPrice.toFixed(2)}
  </span>
)}

{product.vatExempt ? (
  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded whitespace-nowrap">
    (0% VAT)
  </span>
) : vatRate !== null ? (
  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded whitespace-nowrap">
    ({vatRate}% VAT)
  </span>
) : null}

</div>
                        {/* Add to Cart */}
                        <Button
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white transition-colors"
                          disabled={stock === 0}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {stock > 0
                            ? "Add to Cart"
                            : "Out of Stock"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* No results */}
            {filteredAndSortedProducts.length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-700 text-lg font-semibold mb-2">
                      No products found
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      {instantSearch
                        ? `No results for "${instantSearch}" in this category`
                        : "Try adjusting your filters"}
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

            {/* Pagination (server-driven like /products) */}
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

        {/* Custom scrollbar + dual slider CSS */}
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

         .dual-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 0;
  background: transparent;
  position: absolute;
  top: 2px;
  outline: none;
  z-index: 10;
}


          .dual-range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: #445d41;
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            pointer-events: all;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
            position: relative;
            z-index: 3;
          }
            .dual-range-slider:last-of-type::-webkit-slider-thumb {
  z-index: 20;
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
            background: #445d41;
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
