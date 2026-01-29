// app/category/[slug]/CategoryClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback, useRef, } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getVatRate } from "@/app/lib/vatHelpers";
import PremiumPriceSlider from "@/components/filters/PremiumPriceSlider";
import Link from "next/link";
import { ShoppingCart, Star, SlidersHorizontal, X, Search, Grid3x3, LayoutGrid, ChevronLeft, ChevronRight, ExternalLink, BadgePercent, Grid2x2, AwardIcon, } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/toast/CustomToast";
import { getDiscountBadge, getDiscountedPrice, } from "@/app/lib/discountHelpers";
import GenderBadge from "@/components/shared/GenderBadge";
// ---------- Types ----------
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
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
  tags: string;
  vatExempt?: boolean;
  gender?: string;
    brands?: {
    brandId: string;
    brandName: string;
    isPrimary: boolean;
  }[];
   categories?: {
    categoryId: string;
    categorySlug: string;
    isPrimary: boolean;
  }[];
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
type BreadcrumbItem = {
  label: string;
  href?: string;
};

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
   // 🧭 Breadcrumbs (NEW)
  breadcrumbs: BreadcrumbItem[];
  initialProducts: Product[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  initialSortBy: string;
  initialSortDirection: string;
  brands: Brand[];
  discount?: number | null; // ✅ ADD THIS
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
  breadcrumbs,
  initialProducts,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  initialSortBy,
  initialSortDirection,
  brands,
  vatRates, // ✅ SERVER SE AAYA
  discount, // ✅ ADD THIS
}: CategoryClientProps & { vatRates: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOfferPage = searchParams.get("offer") === "true";

  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<Product[]>(initialProducts);
const [page, setPage] = useState(currentPage ?? 1);
const [hasMore, setHasMore] = useState(
  totalPages ? currentPage < totalPages : true
);

const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    // 🔥 OFFER DISCOUNT FILTER (NON-BREAKING)
// 🔥 OFFER / DISCOUNT FILTER (HYBRID – OPTION 3)

// Case 1: exact discount selected (chip click)
if (typeof discount === "number") {
  const hasExactDiscount = (product as any).assignedDiscounts?.some(
    (d: any) =>
      d.isActive === true &&
      d.usePercentage === true &&
      d.discountPercentage === discount
  );

  if (!hasExactDiscount) return false;
}

// Case 2: offer page → show ALL discounted products
else if (isOfferPage) {
  const hasAnyDiscount = (product as any).assignedDiscounts?.some(
    (d: any) => d.isActive === true
  );

  if (!hasAnyDiscount) return false;
}


  // must match category
// Category + subcategory filtering
// ✅ CATEGORY + SUBCATEGORY FILTER (FIXED)
const productCategoryIds =
  product.categories?.map((c) => c.categoryId) ?? [];

const allowedCategoryIds = [
  category?.id,
  ...allSubCategories.map((s) => s.id),
].filter(Boolean);

// If subcategories selected → strict match
if (selectedSubCategories.length > 0) {
  const match = productCategoryIds.some((id) =>
    selectedSubCategories.includes(id)
  );
  if (!match) return false;
} 
// Else → parent + all children allowed
else {
  const match = productCategoryIds.some((id) =>
    allowedCategoryIds.includes(id)
  );
  if (!match) return false;
}


// ✅ BRAND FILTER (FIXED FOR brands[])
if (selectedBrands.length > 0) {
  const productBrandIds =
    product.brands?.map((b) => b.brandId) ?? [];

  const match = productBrandIds.some((id) =>
    selectedBrands.includes(id)
  );

  if (!match) return false;
}



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

  const fetchMoreProducts = useCallback(async () => {
  if (isLoadingMore || !hasMore) return;

  setIsLoadingMore(true);

  try {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page + 1));

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products?${params.toString()}`
    );

    if (!res.ok) {
      throw new Error(`Failed to load products: ${res.status}`);
    }

    const json = await res.json();

    setProducts((prev) => [...prev, ...json.data.items]);
    setPage(json.data.page);
    setHasMore(json.data.hasNext);
  } catch (e) {
    console.error(e);
  } finally {
    setIsLoadingMore(false);
  }
}, [page, hasMore, isLoadingMore, searchParams]);


const loadMoreRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        fetchMoreProducts();
      }
    },
    { rootMargin: "200px" }
  );

  observer.observe(loadMoreRef.current);

  return () => observer.disconnect();
}, [hasMore, isLoadingMore, fetchMoreProducts]);

useEffect(() => {
  setProducts(initialProducts);
  setPage(currentPage ?? 1);
  setHasMore(totalPages ? currentPage < totalPages : true);
}, [initialProducts, currentPage, totalPages]);



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

  

  const resetFilters = useCallback(() => {
    setSelectedBrands([]);
    setMinRating(0);
    setSortBy("name");
    setSortDirection("asc");
    setPriceRange([minPrice, maxPrice]);
    const params = new URLSearchParams();
if (discount) params.set("discount", String(discount));

router.push(`/category/${category?.slug}?${params.toString()}`);

  }, [router, category?.slug]);



  const { addToCart } = useCart();

const handleAddToCart = useCallback(
  (product: any) => {
    const defaultVariant: any = getDefaultVariant(product);

    const basePrice = defaultVariant?.price ?? product.price;
const finalPrice = getDiscountedPrice(product, basePrice);

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
     price: finalPrice,                 // ✅ cart uses discounted price
  priceBeforeDiscount: basePrice,    // ✅ required for coupon logic
  finalPrice: finalPrice,
  discountAmount: basePrice - finalPrice,
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

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* 🧭 Breadcrumbs */}
<div className="mb-2 flex items-center justify-between">
  {/* 🧭 Breadcrumbs – LEFT */}
  <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-600">
    {breadcrumbs.map((crumb, index) => (
      <div key={index} className="flex items-center gap-1">
        {index > 0 && (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}

        {crumb.href ? (
          <Link
            href={crumb.href}
            className="hover:text-[#445D41] transition-colors"
          >
            {crumb.label}
          </Link>
        ) : (
          <span className="font-semibold text-gray-900">
            {crumb.label}
          </span>
        )}
      </div>
    ))}
  </nav>

  {/* 🔽 Sort – TOP RIGHT (same line) */}
  <select
    value={`${sortBy}-${sortDirection}`}
    onChange={(e) => handleSortChange(e.target.value)}
    className="px-4 py-1 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#445D41]"
  >
    <option value="name-asc">Name: A-Z</option>
    <option value="name-desc">Name: Z-A</option>
    <option value="price-asc">Price: Low to High</option>
    <option value="price-desc">Price: High to Low</option>
  </select>
</div>


        {/* Category header */}
       

        <div className="flex gap-8">
       
          <aside className="hidden lg:block w-64 flex-shrink-0">
  <div className="sticky top-24">

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
                          checked={selectedBrands.includes(brand.id)}
                          onChange={(e) => {
                           if (e.target.checked) {
  setSelectedBrands([...selectedBrands, brand.id]);
} else {
  setSelectedBrands(selectedBrands.filter((b) => b !== brand.id));
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
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1">
            {/* Search & Sort Bar */}
 
           
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
                            checked={selectedBrands.includes(brand.id)}
                            onChange={(e) => {
                             if (e.target.checked) {
  setSelectedBrands([...selectedBrands, brand.id]);
} else {
  setSelectedBrands(selectedBrands.filter((b) => b !== brand.id));
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
             {filteredAndSortedProducts
  .filter(
    (product, index, self) =>
      index === self.findIndex((p) => p.id === product.id)
  )
  .map((product, index) => {

                // VAT rate finder like featured slider
const discountBadge = getDiscountBadge(product);
const vatRate = getVatRate(
  vatRates,
  (product as any).vatRateId,
  product.vatExempt
);
const hasCoupon = (product as any).assignedDiscounts?.some(
  (d: any) => d.isActive === true && d.requiresCouponCode === true
);


              const defaultVariant = getDefaultVariant(product);

  const basePrice = defaultVariant?.price ?? product.price;   // ✅ ADD
  const finalPrice = getDiscountedPrice(product, basePrice);  // ✅ ADD
const stock = defaultVariant?.stockQuantity ?? product.stockQuantity ?? 0;

const mainImage = defaultVariant?.imageUrl
  ? `${process.env.NEXT_PUBLIC_API_URL}${defaultVariant.imageUrl}`
  : getMainImage(product.images);


                return (
                  <Card
                   key={`${product.id}-${index}`}

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
  {discountBadge && (
  <div className="absolute top-3 right-3 z-20">
    <div
      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
        
      <div className="flex flex-col items-center leading-none">
        {discountBadge.type === "percent" ? (
          <>
            <span className="text-sm sm:text-base font-extrabold">
              {discountBadge.value}%
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold">
              OFF
            </span>
          </>
        ) : (
          <>
            <span className="text-sm sm:text-base font-extrabold">
              £{discountBadge.value}
            </span>
            <span className="text-[9px] sm:text-[11px] font-semibold">
              OFF
            </span>
          </>
        )}
      </div>
    </div>
  </div>
)}   
{!discountBadge && hasCoupon && (
  <div className="absolute top-3 right-3 z-20">
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
      <div className="flex flex-col items-center leading-none text-center px-1">
        <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight">
          COUPON
        </span>
        <span className="text-[8px] sm:text-[9px] font-semibold leading-tight">
          AVAILABLE
        </span>
      </div>
    </div>
  </div>
)}                    
                           <GenderBadge gender={product.gender} />
                        </div>
                         </Link>
                     

                      {/* Content */}
                      <div className="p-4">


                         <Link href={`/products/${product.slug}`}>
                          <h3 className="font-semibold text-base mb-0 line-clamp-2 hover:text-[#445D41] transition-colors text-gray-900 min-h-[48px]">
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
                       <div className="flex items-center gap-2 mb-1 flex-wrap">
  {/* ⭐ Rating */}
  <div className="flex items-center">
    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    <span className="text-sm ml-1 font-medium text-gray-700">
      {(product.averageRating ?? 0).toFixed(1)}
    </span>
  </div>

  <span className="text-xs text-gray-500">
    ({product.reviewCount || 0} reviews)
  </span>

 {(product as any).loyaltyPointsEnabled && (
  <span className="mt-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md w-fit leading-none">
    <AwardIcon className="h-4 w-4 text-green-600" />
    {(product as any).loyaltyPointsMessage ??
      `Earn ${(product as any).loyaltyPointsEarnable} points`}
  </span>
)}
</div>


                        {/* Price */}
                       <div className="flex items-center gap-2 mb-1 flex-wrap">
   {/* FINAL PRICE */}
  <span className="text-2xl font-bold text-[#445D41]">
    £{finalPrice.toFixed(2)}
  </span>

  {/* CUT PRICE (ONLY AUTO DISCOUNT) */}
  {finalPrice < basePrice && (
    <span className="text-sm text-gray-400 line-through">
      £{basePrice.toFixed(2)}
    </span>
  )}

{product.vatExempt ? (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
    <BadgePercent className="h-3 w-3" />
    VAT Relief
  </span>
) : vatRate !== null ? (
  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
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
{hasMore && (
  <div ref={loadMoreRef} className="flex justify-center py-6">
    {isLoadingMore && (
      <span className="text-sm text-gray-500">
        Loading more products…
      </span>
    )}
  </div>
)}

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
