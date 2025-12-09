// app/offers/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Copy, Check, ChevronDown, ChevronUp, Star, X, ShoppingCart, Gift, TruckIcon } from "lucide-react";
import { categoriesService } from "@/lib/services/categories";
import { brandsService } from "@/lib/services/brands";
import { productsService, Product as ServiceProduct } from "@/lib/services/products";
import { discountsService, Discount as ServiceDiscount } from "@/lib/services/discounts"; // ⭐ Import from service
import Link from "next/link";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/CustomToast";
import { useCart } from "../../context/CartContext";

// ⭐ REMOVED Local Discount Interface - Using ServiceDiscount instead

// Extended Product interface
interface Product extends ServiceProduct {
  assignedDiscounts?: Array<{
    id: string;
    name: string;
    discountPercentage: number;
    discountAmount: number;
    usePercentage: boolean;
    couponCode: string;
    requiresCouponCode: boolean;
  }>;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

interface Brand {
  id: string;
  name: string;
  slug?: string;
}

export default function OffersPage() {
  const toast = useToast();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allDiscounts, setAllDiscounts] = useState<ServiceDiscount[]>([]); // ⭐ Using ServiceDiscount
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("default");
  const [copiedCode, setCopiedCode] = useState<string>("");

  // ⭐ DYNAMIC PRICE RANGE - Calculated from actual products
  const { minPrice, maxPrice } = useMemo(() => {
    if (products.length === 0) {
      return { minPrice: 0, maxPrice: 10000 };
    }
    
    const prices = products.map(p => p.price);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    
    return { 
      minPrice: min, 
      maxPrice: max 
    };
  }, [products]);

  // Price range state - initialized with dynamic values
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  // Update price range when products load
  useEffect(() => {
    if (products.length > 0) {
      setPriceRange({ min: minPrice, max: maxPrice });
    }
  }, [products, minPrice, maxPrice]);

  // Sidebar collapse states
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [brandsOpen, setBrandsOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle Add to Cart
  const handleAddToCart = useCallback((product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product || product.stockQuantity === 0) {
      toast.error("Product is out of stock");
      return;
    }

    const mainImage = product.images?.find(img => img.isMain) || product.images?.[0];
    
    let finalPrice = product.price;
    let discountAmount = 0;
    let appliedDiscountId = null;
    
    if (product.assignedDiscounts && product.assignedDiscounts.length > 0) {
      const discount = product.assignedDiscounts[0];
      if (discount.usePercentage) {
        discountAmount = (product.price * discount.discountPercentage) / 100;
      } else {
        discountAmount = discount.discountAmount;
      }
      finalPrice = product.price - discountAmount;
      appliedDiscountId = discount.id;
    }

    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      priceBeforeDiscount: product.price,
      finalPrice: finalPrice,
      discountAmount: discountAmount,
      appliedDiscountId: appliedDiscountId,
      image: mainImage ? `${API_BASE_URL}${mainImage.imageUrl}` : "/placeholder.png",
      quantity: 1,
      sku: product.sku || "",
      slug: product.slug,
      variantId: null,
      type: "one-time",
      productData: product,
      maxStock: product.stockQuantity,
    });

    toast.success(`${product.name} added to cart! 🛒`);
  }, [addToCart, toast]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, brandsRes, discountsRes] = await Promise.all([
        productsService.getAll({ 
          isPublished: true,
          pageSize: 100 
        }),
        categoriesService.getAll(),
        brandsService.getAll(),
        discountsService.getAll({ includeInactive: false })
      ]);

      // Filter products that have active discounts
      const productsWithOffers = (productsRes.data?.data?.items || []).filter((product: any) => {
        return product.assignedDiscounts && product.assignedDiscounts.length > 0;
      }) as Product[];

      setProducts(productsWithOffers);
      
      if (categoriesRes?.data?.success && Array.isArray(categoriesRes.data.data)) {
        setCategories(categoriesRes.data.data);
      }
      
      if (brandsRes?.data?.success && Array.isArray(brandsRes.data.data)) {
        setBrands(brandsRes.data.data);
      }

      // ⭐ FIXED: Get all active discounts with proper type handling
      if (discountsRes.data?.data) {
        const activeDiscounts = discountsRes.data.data.filter((discount: ServiceDiscount) => {
          const now = new Date();
          const start = new Date(discount.startDate);
          const end = new Date(discount.endDate);
          return discount.isActive && now >= start && now <= end;
        });
        
        setAllDiscounts(activeDiscounts);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Separate offers by type
  const orderTotalOffers = allDiscounts.filter(d => d.discountType === "AssignedToOrderTotal");
  const shippingOffers = allDiscounts.filter(d => d.discountType === "AssignedToShipping");

  // Get category count
  const getCategoryCount = (categoryId: string) => {
    return products.filter(product => product.categoryId === categoryId).length;
  };

  // Get brand count
  const getBrandCount = (brandId: string) => {
    return products.filter(product => product.brandId === brandId).length;
  };

  // Toggle category filter
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Toggle brand filter
  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange({ min: minPrice, max: maxPrice });
    setSelectedRating(0);
    setSearchTerm("");
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || 
                          selectedBrands.length > 0 || 
                          priceRange.max < maxPrice || 
                          priceRange.min > minPrice ||
                          selectedRating > 0 ||
                          searchTerm.length > 0;

  // Get highest discount percentage
  const getHighestDiscount = (product: Product) => {
    if (!product.assignedDiscounts || product.assignedDiscounts.length === 0) return 0;
    
    return Math.max(...product.assignedDiscounts.map(d => 
      d.usePercentage ? d.discountPercentage : ((d.discountAmount / product.price) * 100)
    ));
  };

  // Copy coupon code
  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // Filter and sort products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || 
      (product.categoryId && selectedCategories.includes(product.categoryId));
    
    const matchesBrand = selectedBrands.length === 0 ||
      (product.brandId && selectedBrands.includes(product.brandId));
    
    const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;
    
    const matchesRating = selectedRating === 0 || 
      (product.averageRating && product.averageRating >= selectedRating);
    
    return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case "popularity":
        return (b.averageRating || 0) - (a.averageRating || 0);
      case "latest":
        return 0;
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      default:
        return 0;
    }
  });

  // Render star rating
  const renderStars = (count: number, filled: boolean = false) => {
    return Array.from({ length: count }).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${filled ? 'fill-purple-500 text-purple-500' : 'text-gray-300'}`} 
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span>/</span>
            <span className="text-gray-900">Offers</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-4">
              {/* Categories Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">Categories</h3>
                  {categoriesOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                
                {categoriesOpen && (
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {categories.map((category) => {
                      const count = getCategoryCount(category.id);
                      if (count === 0) return null;
                      
                      return (
                        <label
                          key={category.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {category.name}
                            </span>
                          </div>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Brands Section */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setBrandsOpen(!brandsOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">Brands</h3>
                  {brandsOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                
                {brandsOpen && (
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {brands.map((brand) => {
                      const count = getBrandCount(brand.id);
                      if (count === 0) return null;
                      
                      return (
                        <label
                          key={brand.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(brand.id)}
                              onChange={() => toggleBrand(brand.id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                              {brand.name}
                            </span>
                          </div>
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ⭐ DYNAMIC Price Filter */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setPriceOpen(!priceOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">Price</h3>
                  {priceOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                
                {priceOpen && (
                  <div className="p-4">
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      step="10"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                      className="w-full accent-green-600"
                    />
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                      <span>£{minPrice}</span>
                      <span>£{priceRange.max}</span>
                    </div>
                    {maxPrice > 1000 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Range: £{minPrice} - £{maxPrice}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Rating Filter */}
              <div>
                <button
                  onClick={() => setRatingOpen(!ratingOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">Filter by rating</h3>
                  {ratingOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </button>
                
                {ratingOpen && (
                  <div className="p-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
                        className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors ${
                          selectedRating === rating ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {renderStars(rating, true)}
                          {renderStars(5 - rating, false)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Order Total & Shipping Offers Banner */}
            {(orderTotalOffers.length > 0 || shippingOffers.length > 0) && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-5 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-600" />
                  Special Checkout Offers
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Order Total Offers */}
                  {orderTotalOffers.map(offer => (
                    <div key={offer.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">💰</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{offer.name}</p>
                          {offer.adminComment && (
                            <div 
                              className="text-sm text-gray-600 prose-sm"
                              dangerouslySetInnerHTML={{ __html: offer.adminComment }}
                            />
                          )}
                          {offer.requiresCouponCode && offer.couponCode && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Code:</span>
                              <code className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">
                                {offer.couponCode}
                              </code>
                             <button
  disabled={!offer.couponCode}
  onClick={() => copyCouponCode(offer.couponCode!)}
>
                                {copiedCode === offer.couponCode ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Shipping Offers */}
                  {shippingOffers.map(offer => (
                    <div key={offer.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <TruckIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{offer.name}</p>
                          {offer.adminComment && (
                            <div 
                              className="text-sm text-gray-600 prose-sm"
                              dangerouslySetInnerHTML={{ __html: offer.adminComment }}
                            />
                          )}
                          {offer.requiresCouponCode && offer.couponCode && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Code:</span>
                              <code className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                {offer.couponCode}
                              </code>
                            <button
  disabled={!offer.couponCode}
  onClick={() => copyCouponCode(offer.couponCode!)}
>
                                {copiedCode === offer.couponCode ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Info Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6 max-h-80 overflow-y-auto">
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                Shop Direct Care Offers on Everyday Health & Personal Care
              </h1>
              
              <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                Save on health care, wellness, incontinence, personal hygiene, skincare, baby essentials, and everyday medical items without compromising on quality.
              </p>

              <h2 className="text-base font-semibold text-gray-900 mb-2">
                What the Offers category covers
              </h2>
              
              <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-700 text-sm">
                <li>Everyday health and wellness products</li>
                <li>Personal care and hygiene items</li>
                <li>Incontinence and continence‑care products</li>
                <li>Skincare, haircare, and body‑care products</li>
                <li>Selected baby and child‑care products</li>
              </ul>

              <h2 className="text-base font-semibold text-gray-900 mb-2">Safety and Suitability</h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Read labels fully including warnings</li>
                <li>Check age limits and medical advice</li>
                <li>Do not exceed recommended dose</li>
                <li>Seek professional advice if unsure</li>
              </ul>
            </div>

            {/* Search, Sort, and Clear Filters Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search by product"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="default">Default sorting</option>
                    <option value="popularity">Sort by popularity</option>
                    <option value="latest">Sort by latest</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </select>

                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCategories.map(catId => {
                    const category = categories.find(c => c.id === catId);
                    return category ? (
                      <span key={catId} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {category.name}
                        <button onClick={() => toggleCategory(catId)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  {selectedBrands.map(brandId => {
                    const brand = brands.find(b => b.id === brandId);
                    return brand ? (
                      <span key={brandId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {brand.name}
                        <button onClick={() => toggleBrand(brandId)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  {selectedRating > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {selectedRating}+ Stars
                      <button onClick={() => setSelectedRating(0)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Results Count */}
            <p className="text-gray-600 mb-4">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
            </p>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600">No offers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const mainImage = product.images?.find(img => img.isMain) || product.images?.[0];
                  const discount = getHighestDiscount(product);
                  const activeDiscount = product.assignedDiscounts?.[0];
                  
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group relative"
                    >
                      {/* Discount Badge */}
                      {discount > 0 && (
                        <div className="absolute top-4 right-4 z-10">
                          <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                            <div className="text-center">
                              <div className="text-sm font-bold leading-tight">
                                {Math.round(discount)}%
                              </div>
                              <div className="text-xs leading-tight">OFF</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Product Image */}
                      <Link href={`/products/${product.slug}`}>
                        <div className="aspect-square bg-gray-100 relative overflow-hidden cursor-pointer">
                          {mainImage ? (
                            <Image
                              src={`${API_BASE_URL}${mainImage.imageUrl}`}
                              alt={mainImage.altText || product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              No Image
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="p-4">
                        <Link href={`/products/${product.slug}`}>
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem] hover:text-green-700 transition-colors cursor-pointer">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Price */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              £{product.price.toFixed(2)}
                            </span>
                            {product.oldPrice && product.oldPrice > product.price && (
                              <span className="text-sm text-gray-500 line-through">
                                £{product.oldPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Coupon Code */}
                        {activeDiscount?.requiresCouponCode && activeDiscount.couponCode && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Use Code:</p>
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                              <span className="flex-1 font-mono font-bold text-green-700 text-sm">
                                {activeDiscount.couponCode}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  copyCouponCode(activeDiscount.couponCode);
                                }}
                                className="text-green-700 hover:text-green-800"
                              >
                                {copiedCode === activeDiscount.couponCode ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Rating */}
                        {product.averageRating && product.averageRating > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            {renderStars(Math.round(product.averageRating), true)}
                            {renderStars(5 - Math.round(product.averageRating), false)}
                            <span className="text-xs text-gray-500 ml-1">
                              ({product.averageRating.toFixed(1)})
                            </span>
                          </div>
                        )}

                        {/* Add to Cart Button */}
                        <Button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-full bg-green-700 hover:bg-green-800 text-white transition-colors"
                          disabled={product.stockQuantity === 0}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {product.stockQuantity > 0 ? "Add to Cart" : "Out of Stock"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
