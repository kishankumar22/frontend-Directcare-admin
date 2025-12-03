// app/products/[slug]/ProductDetails.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RatingReviews from "@/components/product/RatingReviews";
import { 
  ShoppingCart, Heart, Star, Minus, Plus, ChevronLeft, ChevronRight,
  X, Truck, RotateCcw, ShieldCheck, Pause, Play, Package, Bike,
  Users, BadgePercent, Check, AlertCircle, Tag, Info, Share2, Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/CustomToast";
import { useCart } from "@/context/CartContext";

// ---------- Types ----------
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  option1Name?: string | null;
  option1Value?: string | null;
  option2Name?: string | null;
  option2Value?: string | null;
  option3Name?: string | null;
  option3Value?: string | null;
  imageUrl?: string | null;
  isDefault?: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
}

interface AssignedDiscount {
  id: string;
  name: string;
  isActive: boolean;
  usePercentage: boolean;
  discountAmount: number;
  discountPercentage: number;
  maximumDiscountAmount?: number;
  startDate: string;
  endDate: string;
  requiresCouponCode: boolean;
  couponCode?: string;
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
  weight: number;
  weightUnit: string;
  videoUrls?: string;
  specificationAttributes: string;
  relatedProductIds: string;
  variants?: Variant[];
  attributes?: ProductAttribute[];
  assignedDiscounts?: AssignedDiscount[];
  taxExempt?: boolean;
  gender?: string;
  isPack?: boolean;
  packSize?: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  images: ProductImage[];
}

interface ProductDetailsProps {
  product: Product;
}

// ---------- Discount Calculator ----------
function calculateDiscount(basePrice: number, product: Product, couponInput?: string) {
  if (!product.assignedDiscounts || product.assignedDiscounts.length === 0) {
    return { final: basePrice, discountAmount: 0, applied: null as AssignedDiscount | null };
  }

  const now = new Date();

  for (const d of product.assignedDiscounts) {
    if (!d.isActive) continue;
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (now < start || now > end) continue;
    if (d.requiresCouponCode && (!couponInput || d.couponCode !== couponInput)) continue;

    let discount = 0;
    if (d.usePercentage) {
      discount = (basePrice * d.discountPercentage) / 100;
      if (d.maximumDiscountAmount && discount > d.maximumDiscountAmount) {
        discount = d.maximumDiscountAmount;
      }
    } else {
      discount = d.discountAmount;
    }

    const finalPrice = +(basePrice - discount).toFixed(2);
    return { final: finalPrice, discountAmount: +discount.toFixed(2), applied: d as AssignedDiscount };
  }

  return { final: basePrice, discountAmount: 0, applied: null as AssignedDiscount | null };
}

// ---------- Component ----------
export default function ProductDetails({ product }: ProductDetailsProps) {
  const toast = useToast();
  const { addToCart } = useCart();
  const router = useRouter();
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "attributes" | "delivery">("description");

  // ✅ Variant state
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.find(v => v.isDefault) || product.variants?.[0] || null
  );

  // ✅ Selected options (for multi-step selection)
  const [selectedOption1, setSelectedOption1] = useState<string | null>(
    selectedVariant?.option1Value || null
  );
  const [selectedOption2, setSelectedOption2] = useState<string | null>(
    selectedVariant?.option2Value || null
  );

  // Discount & coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AssignedDiscount | null>(null);
  
  // ✅ CRITICAL: Dynamic price, SKU, stock based on variant
  const currentPrice = useMemo(() => {
    return selectedVariant ? selectedVariant.price : product.price;
  }, [selectedVariant, product.price]);

  const currentSKU = useMemo(() => {
    return selectedVariant ? selectedVariant.sku : product.sku;
  }, [selectedVariant, product.sku]);

  const currentStock = useMemo(() => {
    return selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  }, [selectedVariant, product.stockQuantity]);

  const [finalPrice, setFinalPrice] = useState<number>(currentPrice);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Extract unique variant option values
  const option1Values = useMemo(() => {
    if (!product.variants) return [];
    return [...new Set(product.variants.map(v => v.option1Value).filter(Boolean))];
  }, [product.variants]);

  const option2Values = useMemo(() => {
    if (!product.variants) return [];
    const filtered = product.variants.filter(v => 
      !selectedOption1 || v.option1Value === selectedOption1
    );
    return [...new Set(filtered.map(v => v.option2Value).filter(Boolean))];
  }, [product.variants, selectedOption1]);

  // Get option names
  const option1Name = useMemo(() => {
    return product.variants?.find(v => v.option1Name)?.option1Name || "Storage";
  }, [product.variants]);

  const option2Name = useMemo(() => {
    return product.variants?.find(v => v.option2Name)?.option2Name || "Color";
  }, [product.variants]);

  // ✅ Update selected variant when options change
  useEffect(() => {
    if (!product.variants) return;
    
    const matchedVariant = product.variants.find(v => 
      v.option1Value === selectedOption1 &&
      v.option2Value === selectedOption2
    );

    if (matchedVariant) {
      setSelectedVariant(matchedVariant);
    }
  }, [selectedOption1, selectedOption2, product.variants]);

  // ✅ Recalculate discount when variant OR price changes
  useEffect(() => {
    const d = calculateDiscount(currentPrice, product);
    setFinalPrice(d.final);
    setDiscountAmount(d.discountAmount);
    setAppliedCoupon(d.applied);
    setCouponCode("");
  }, [currentPrice, product]);

  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setIsAutoPlaying(false);
    setActiveTab("description");
    setRelatedProducts([]);
    setIsZooming(false);
    setCouponCode("");
    setAppliedCoupon(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  // Fetch related products
  useEffect(() => {
    if (product.relatedProductIds) {
      fetchRelatedProducts(product.relatedProductIds);
    }
  }, [product.relatedProductIds]);

  const fetchRelatedProducts = async (relatedIds: string) => {
    try {
      const ids = relatedIds.split(',').map(id => id.trim());
      const promises = ids.slice(0, 8).map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/${id}`, {
          cache: 'no-store'
        }).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const validProducts = results
        .filter((r: any) => r.success)
        .map((r: any) => r.data);
      
      setRelatedProducts(
        validProducts.filter(
          (p: any, index: number, self: any[]) => 
            index === self.findIndex(x => x.id === p.id)
        )
      );
    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  };

  // Memoized calculations
  const discountPercentFromOldPrice = useMemo(() => {
    if (!product.oldPrice || product.oldPrice <= currentPrice) return 0;
    return Math.round(((product.oldPrice - currentPrice) / product.oldPrice) * 100);
  }, [product.oldPrice, currentPrice]);

  const specifications = useMemo(() => {
    if (!product?.specificationAttributes) return [];
    try {
      return JSON.parse(product.specificationAttributes);
    } catch {
      return [];
    }
  }, [product.specificationAttributes]);

  const attributes = useMemo(() => {
    return product.attributes || [];
  }, [product.attributes]);

  const getImageUrl = useCallback((imageUrl: string) => {
    if (!imageUrl) return '/placeholder-product.jpg';
    return imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
  }, []);

  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 300;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    const selected = selectedVariant ?? null;

    addToCart({
      id: selected?.id ?? product.id,
      productId: product.id,
      name: selected
        ? `${product.name} - ${selected.option1Value || selected.name}`
        : product.name,
      price: finalPrice,
      priceBeforeDiscount: currentPrice,
      finalPrice: finalPrice,
      discountAmount: discountAmount ?? 0,
      couponCode: appliedCoupon?.couponCode ?? null,
      appliedDiscountId: appliedCoupon?.id ?? null,
      quantity,
      image: selected?.imageUrl
        ? getImageUrl(selected.imageUrl)
        : getImageUrl(product.images[0]?.imageUrl),
      sku: currentSKU,
      variantId: selected?.id ?? null,
      variantOptions: {
        option1: selected?.option1Value ?? null,
        option2: selected?.option2Value ?? null,
        option3: selected?.option3Value ?? null,
      },
      productData: JSON.parse(JSON.stringify(product)),
    });

    toast.success(`${quantity} × ${product.name} added to cart! 🛒`);
  }, [
    addToCart, quantity, product, selectedVariant, finalPrice,
    discountAmount, appliedCoupon, getImageUrl, toast, currentPrice, currentSKU
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;  
    setZoomPosition({ x, y });
  }, []);

  const handlePrevImage = useCallback(() => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
  }, [product.images.length]);

  const handleNextImage = useCallback(() => {
    setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
  }, [product.images.length]);

  const handleApplyCoupon = () => {
    const result = calculateDiscount(currentPrice, product, couponCode.trim());

    if (!result.applied || !result.applied.requiresCouponCode) {
      toast.error("Invalid or expired coupon.");
      return;
    }

    setFinalPrice(result.final);
    setDiscountAmount(result.discountAmount);
    setAppliedCoupon(result.applied);
    toast.success("✅ Coupon applied successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#445D41] transition">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#445D41] transition">Products</Link>
            <span>/</span>
            <span className="text-[#445D41] font-medium">{product.categoryName}</span>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT: Image Gallery - COMPACT */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Thumbnails */}
            <div className="flex sm:flex-col flex-row gap-2 sm:w-20 w-full overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => {
                    setSelectedImage(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                    selectedImage === idx 
                      ? 'border-[#445D41] ring-2 ring-[#445D41]' 
                      : 'border-gray-200 hover:border-[#445D41]'
                  }`}
                >
                  <div className="aspect-square relative bg-white w-16 sm:w-20">
                    <Image
                      src={getImageUrl(img.imageUrl)}
                      alt={img.altText || product.name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Main Image - COMPACT */}
            <div className="flex-1">
              <Card className="overflow-hidden">
                <CardContent className="p-0 relative">
                  <div 
                    className="aspect-square bg-white relative group overflow-hidden"
                    onMouseEnter={() => setIsZooming(true)}
                    onMouseLeave={() => setIsZooming(false)}
                    onMouseMove={handleMouseMove}
                  >
                    <Image
                      src={
                        selectedVariant?.imageUrl 
                          ? getImageUrl(selectedVariant.imageUrl) 
                          : getImageUrl(product.images[selectedImage]?.imageUrl)
                      }
                      alt={product.name}
                      fill
                      className={`object-contain p-6 transition-transform duration-300 ${
                        isZooming ? 'scale-150' : 'scale-100'
                      }`}
                      style={{ transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }}
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {discountPercentFromOldPrice > 0 && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 text-xs font-bold">
                        -{discountPercentFromOldPrice}%
                      </Badge>
                    )}

                    <Badge className={`absolute bottom-3 left-3 px-2 py-1 text-xs font-semibold ${
                      currentStock > 0 ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {currentStock} in stock
                    </Badge>

                    {product.images.length > 1 && (
                      <>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full h-8 w-8" 
                          onClick={handlePrevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full h-8 w-8" 
                          onClick={handleNextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT: Product Info - OPTIMIZED */}
          <div className="space-y-4">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[#445D41] border-[#445D41] text-xs">
                {product.categoryName}
              </Badge>
              {product.taxExempt && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <BadgePercent className="h-3 w-3 mr-1" />0% VAT
                </Badge>
              )}
              {product.gender && (
                <Badge className="bg-gray-100 text-gray-700 text-xs">
                  <Users className="h-3 w-3 mr-1" />{product.gender}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Brand */}
            {product.brandName && (
              <p className="text-sm text-gray-600">
                by <span className="font-semibold text-[#445D41]">{product.brandName}</span>
              </p>
            )}

            {/* Rating - COMPACT */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= product.averageRating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-1 text-sm font-semibold">{product.averageRating?.toFixed(1) || '0.0'}</span>
              </div>
              <span className="text-xs text-gray-600">({product.reviewCount || 0} reviews)</span>
            </div>

            {/* ✅ SELECTED VARIANT INFO BOX - Like Screenshot */}
            {selectedVariant && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900">
                      Selected: {selectedOption1}{selectedOption2 ? ` - ${selectedOption2}` : ''}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">SKU: {currentSKU}</p>
                    <p className="text-xs text-blue-700">Stock: {currentStock} units</p>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ VARIANT SELECTION - COMPACT */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3">
                {/* Option 1 */}
                {option1Values.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      {option1Name}:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option1Values.map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            setSelectedOption1(val as string);
                            setSelectedOption2(null);
                          }}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedOption1 === val
                              ? 'bg-[#445D41] text-white border-[#445D41]'
                              : 'border-gray-300 hover:border-[#445D41]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 2 */}
                {option2Values.length > 0 && selectedOption1 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      {option2Name}:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option2Values.map((val) => (
                        <button
                          key={val}
                          onClick={() => setSelectedOption2(val as string)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedOption2 === val
                              ? 'bg-[#445D41] text-white border-[#445D41]'
                              : 'border-gray-300 hover:border-[#445D41]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ PRICE CARD - DYNAMIC */}
            <Card>
              <CardContent className="p-4">
                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-[#445D41]">
                    £{(finalPrice * quantity).toFixed(2)}
                  </span>

                  {discountAmount > 0 && (
                    <span className="text-lg text-gray-400 line-through">
                      £{(currentPrice * quantity).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Short desc */}
                {product.shortDescription && (
                  <div 
                    className="text-sm text-gray-700 mb-3 line-clamp-2" 
                    dangerouslySetInnerHTML={{ __html: product.shortDescription }} 
                  />
                )}

                {/* Quantity - COMPACT */}
                <div className="mb-3">
                  <label className="block text-sm font-bold mb-2">Quantity:</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border-2 rounded-lg">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-4 py-1 font-bold min-w-[50px] text-center">
                        {quantity}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setQuantity(quantity + 1)} 
                        disabled={quantity >= currentStock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-gray-600">{currentStock} available</span>
                  </div>
                </div>

                {/* Action Buttons - COMPACT */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleAddToCart} 
                    disabled={currentStock === 0} 
                    className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white py-5 font-semibold"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full py-4 border-2 border-[#445D41] text-[#445D41] hover:bg-[#445D41] hover:text-white"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    Add to Wishlist
                  </Button>

                  <button className="w-full py-3 text-sm text-gray-600 hover:text-[#445D41] flex items-center justify-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share this product
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges - COMPACT */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <Truck className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-bold">Free Shipping</p>
                  <p className="text-xs text-gray-600">Over £35</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <RotateCcw className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-bold">Easy Returns</p>
                  <p className="text-xs text-gray-600">30 Days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-bold">Secure</p>
                  <p className="text-xs text-gray-600">SSL</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* TABS - Rest remains same */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto border-b">
              <button 
                onClick={() => setActiveTab("description")} 
                className={`px-6 py-3 text-sm font-bold transition ${
                  activeTab === "description" 
                    ? "border-b-2 border-[#445D41] text-[#445D41]" 
                    : "text-gray-600"
                }`}
              >
                Description
              </button>

              {attributes.length > 0 && (
                <button 
                  onClick={() => setActiveTab("attributes")} 
                  className={`px-6 py-3 text-sm font-bold transition ${
                    activeTab === "attributes" 
                      ? "border-b-2 border-[#445D41] text-[#445D41]" 
                      : "text-gray-600"
                  }`}
                >
                  Attributes
                </button>
              )}

              <button 
                onClick={() => setActiveTab("specifications")} 
                className={`px-6 py-3 text-sm font-bold transition ${
                  activeTab === "specifications" 
                    ? "border-b-2 border-[#445D41] text-[#445D41]" 
                    : "text-gray-600"
                }`}
              >
                Specifications
              </button>

              <button 
                onClick={() => setActiveTab("delivery")} 
                className={`px-6 py-3 text-sm font-bold transition ${
                  activeTab === "delivery" 
                    ? "border-b-2 border-[#445D41] text-[#445D41]" 
                    : "text-gray-600"
                }`}
              >
                Delivery
              </button>
            </div>

            <div className="p-6">
              {activeTab === "description" && (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
              )}

              {activeTab === "attributes" && attributes.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {attributes
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((attr) => (
                      <div key={attr.id} className="bg-gray-50 p-3 rounded">
                        <p className="font-bold text-sm">{attr.name}</p>
                        <p className="text-sm text-gray-700">{attr.value}</p>
                      </div>
                    ))}
                </div>
              )}

              {activeTab === "specifications" && (
                <div className="grid grid-cols-2 gap-3">
                  {specifications.length > 0 ? (
                    specifications.map((spec: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-sm">{spec.name}:</span>
                        <span className="text-sm">{spec.value}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-sm">Weight:</span>
                        <span className="text-sm">{product.weight} {product.weightUnit}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-sm">SKU:</span>
                        <span className="text-sm">{currentSKU}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-4">
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Truck className="h-5 w-5" />Standard Delivery
                    </h3>
                    <p className="text-sm text-gray-700">£2.99 or FREE over £35</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <RatingReviews productId={product.id} />
      </main>
    </div>
  );
}
