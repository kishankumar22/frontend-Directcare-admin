// app/products/ProductsClient.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShoppingCart, 
  Star, 
  SlidersHorizontal, 
  X,
  Search,
  Grid3x3,
  LayoutGrid,
  Loader2
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
}

interface ProductsClientProps {
  initialProducts: Product[];
  initialTotalPages: number;
  initialPage: number;
}

export default function ProductsClient({ 
  initialProducts, 
  initialTotalPages,
  initialPage 
}: ProductsClientProps) {
  const toast = useToast();
  
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState(3);

  const categories = Array.from(new Set(products.map(p => p.categoryName).filter(Boolean)));
  const brands = Array.from(new Set(products.map(p => p.brandName).filter(Boolean)));

  // ✅ Filter products client-side
  const filteredProducts = products.filter((product) => {
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
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAddToCart = (product: Product) => {
    toast.success(`${product.name} added to cart! 🛒`);
  };

  const calculateDiscount = (price: number, oldPrice: number) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 1000]);
    setMinRating(0);
    setSearchQuery("");
  };

  const getMainImage = (images: ProductImage[]) => {
    const mainImage = images.find(img => img.isMain) || images[0];
    return mainImage?.imageUrl 
      ? `${process.env.NEXT_PUBLIC_API_URL}${mainImage.imageUrl}`
      : "/placeholder-product.jpg";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[#445D41]">All Products</h1>
          <p className="text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        <div className="flex gap-8">
          {/* ✅ SIDEBAR FILTERS */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-[#445D41]" />
                    <h2 className="font-semibold text-lg">Filters</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm">Category</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#445D41]"
                          checked={selectedCategories.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, cat]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== cat));
                            }
                          }}
                        />
                        <span className="text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm">Brand</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {brands.map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#445D41]"
                          checked={selectedBrands.includes(brand)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrands([...selectedBrands, brand]);
                            } else {
                              setSelectedBrands(selectedBrands.filter(b => b !== brand));
                            }
                          }}
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm">Price Range</h3>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-[#445D41]"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>£0</span>
                    <span>£{priceRange[1]}</span>
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm">Minimum Rating</h3>
                  {[4, 3, 2, 1, 0].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                      />
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{rating > 0 ? `${rating}+ Stars` : 'All'}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* ✅ MAIN CONTENT */}
          <div className="flex-1">
            {/* Search & Sort Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg pl-10"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  <select
                    value={`${sortBy}-${sortDirection}`}
                    onChange={(e) => {
                      const [newSortBy, newDirection] = e.target.value.split('-');
                      setSortBy(newSortBy);
                      setSortDirection(newDirection as "asc" | "desc");
                    }}
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="name-asc">Name: A-Z</option>
                    <option value="name-desc">Name: Z-A</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>

                  <div className="flex gap-2">
                    <Button
                      variant={gridCols === 2 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGridCols(2)}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={gridCols === 3 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGridCols(3)}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Grid */}
            <div className={`grid grid-cols-1 ${gridCols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
              {filteredProducts.map((product) => {
                const discount = calculateDiscount(product.price, product.oldPrice);
                const mainImage = getMainImage(product.images);

                return (
                  <Card key={product.id} className="group hover:shadow-xl transition">
                    <CardContent className="p-0">
                      <Link href={`/products/${product.slug}`}>
                        <div className="relative bg-gray-100 h-64">
                          <Image
                            src={mainImage}
                            alt={product.name}
                            fill
                            className="object-contain p-4 group-hover:scale-110 transition"
                          />
                          {discount > 0 && (
                            <Badge className="absolute top-3 right-3 bg-red-500">
                              -{discount}%
                            </Badge>
                          )}
                        </div>
                      </Link>

                      <div className="p-4">
                        <Badge variant="outline" className="mb-2">{product.categoryName}</Badge>
                        <Link href={`/products/${product.slug}`}>
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-[#445D41]">
                            {product.name}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-2 mb-3">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{product.averageRating || 0}</span>
                          <span className="text-sm text-gray-500">({product.reviewCount || 0})</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl font-bold text-[#445D41]">
                            £{product.price.toFixed(2)}
                          </span>
                          {product.oldPrice > product.price && (
                            <span className="text-sm text-gray-400 line-through">
                              £{product.oldPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <Button
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#445D41]"
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
          </div>
        </div>
      </main>
    </div>
  );
}
