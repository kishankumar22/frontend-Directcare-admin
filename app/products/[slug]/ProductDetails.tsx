// app/products/[slug]/ProductDetails.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RatingReviews from "@/components/product/RatingReviews";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Minus, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  X,
  Truck,
  RotateCcw,
  ShieldCheck,
  Pause,
  Play,
  Package,
  Bike,
  Users,
  BadgePercent
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/CustomToast";
import { useCart } from "@/context/CartContext"; // path tumhare folder structure ke hisab se

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
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  imageUrl?: string | null;
  isDefault?: boolean;
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
  manufacturerName: string;
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
  assignedDiscounts?: AssignedDiscount[]; // <-- added
     taxExempt?: boolean;
gender?: string;
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

// ---------- Discount function (variant-aware) ----------
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "delivery">("description");

  // Variant state
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(product.variants?.find(v => v.isDefault) || product.variants?.[0] || null);

  // Discount & coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AssignedDiscount | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(product.price);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Extract unique variant option groups
  const option1Values = useMemo(() => {
    return [...new Set(product.variants?.map(v => v.option1).filter(Boolean))];
  }, [product]);

  const option2Values = useMemo(() => {
    return [...new Set(product.variants?.map(v => v.option2).filter(Boolean))];
  }, [product]);

  const option3Values = useMemo(() => {
    return [...new Set(product.variants?.map(v => v.option3).filter(Boolean))];
  }, [product]);

  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setShowImageModal(false);
    setIsAutoPlaying(false);
    setActiveTab("description");
    setRelatedProducts([]);
    setIsZooming(false);
    setCouponCode("");
    setAppliedCoupon(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  // When variant or product changes -> recalc discount (and reset coupon to avoid stale coupon)
  useEffect(() => {
    // base price is variant price if variant selected
    const basePrice = selectedVariant ? selectedVariant.price : product.price;
    const d = calculateDiscount(basePrice, product); // auto discounts only (no coupon)
    setFinalPrice(d.final);
    setDiscountAmount(d.discountAmount);
    setAppliedCoupon(d.applied);
    // Reset coupon input when variant changes to prevent mismatch
    setCouponCode("");
    // Note: if you want to persist coupon across variant changes, remove above line
  }, [product, selectedVariant]);

  // Auto-slide images
  useEffect(() => {
    if (!isAutoPlaying || !product) return;

    const interval = setInterval(() => {
      setSelectedImage((prev) => prev < product.images.length - 1 ? prev + 1 : 0);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, product]);

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
          (p: any, index: number, self: any[]) => index === self.findIndex(x => x.id === p.id)
        )
      );

    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  };

  // Memoized calculations
  const discountPercentFromOldPrice = useMemo(() => {
    const base = selectedVariant ? selectedVariant.price : product.price;
    if (!product.oldPrice || product.oldPrice <= base) return 0;
    return Math.round(((product.oldPrice - base) / product.oldPrice) * 100);
  }, [product.oldPrice, product.price, selectedVariant]);

  const specifications = useMemo(() => {
    if (!product?.specificationAttributes) return [];
    try {
      return JSON.parse(product.specificationAttributes);
    } catch {
      return [];
    }
  }, [product.specificationAttributes]);

  // Memoized image URL generator
  const getImageUrl = useCallback((imageUrl: string) => {
    if (!imageUrl) return '/placeholder-product.jpg';
    return imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
  }, []);

  // Handlers
  const handleRelatedProductClick = useCallback((slug: string) => {
    router.push(`/products/${slug}`);
  }, [router]);

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

  // ORIGINAL base price (without discount)
  const basePrice = selected ? selected.price : product.price;

  // FINAL price (after applied coupon OR auto discount)
  const final = finalPrice; 

  addToCart({
    id: selected?.id ?? product.id,
    productId: product.id,

    name: selected
      ? `${product.name} (${selected.option1 || selected.name})`
      : product.name,

    // ⭐ REQUIRED FOR CART DISCOUNT SYSTEM
    price: final,                    // price used in cart if no coupon removed
    priceBeforeDiscount: basePrice,  // original price (for recalc on remove)
    finalPrice: final,               // current price after discount
    discountAmount: discountAmount ?? 0,
    couponCode: appliedCoupon?.couponCode ?? null,
    appliedDiscountId: appliedCoupon?.id ?? null,

    quantity,

    image: selected?.imageUrl
      ? getImageUrl(selected.imageUrl)
      : getImageUrl(product.images[0]?.imageUrl),

    sku: selected?.sku ?? product.sku,
    variantId: selected?.id ?? null,

    variantOptions: {
      option1: selected?.option1 ?? null,
      option2: selected?.option2 ?? null,
      option3: selected?.option3 ?? null,
    },

    // ⭐ MOST IMPORTANT (for coupon validation on cart page)
    productData: JSON.parse(JSON.stringify(product)),

  });

  toast.success(`${quantity} × ${product.name} added to cart! 🛒`);
}, [
  addToCart,
  quantity,
  product,
  selectedVariant,
  finalPrice,
  discountAmount,
  appliedCoupon,
  getImageUrl,
  toast,
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

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    setQuantity(1); // reset quantity
    // coupon reset handled by useEffect watching selectedVariant
  };

  // Coupon apply handler
  const handleApplyCoupon = () => {
    const basePrice = selectedVariant ? selectedVariant.price : product.price;
    const result = calculateDiscount(basePrice, product, couponCode.trim());

    if (!result.applied || !result.applied.requiresCouponCode) {
      toast.error("Invalid or expired coupon.");
      return;
    }

    setFinalPrice(result.final);
    setDiscountAmount(result.discountAmount);
    setAppliedCoupon(result.applied);
    toast.success("Coupon applied successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#445D41]">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#445D41]">Products</Link>
            <span>/</span>
            <span className="text-[#445D41] font-medium">{product.categoryName}</span>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* PRODUCT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT: Image Gallery */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Thumbnails */}
            <div className="flex sm:flex-col flex-row gap-2 sm:w-20 w-full overflow-x-auto sm:overflow-x-visible">
              {product.images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => {
                    setSelectedImage(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition ${selectedImage === idx ? 'border-[#445D41]' : 'border-gray-200 hover:border-[#445D41]'}`}
                >
                  <div className="aspect-square relative bg-gray-100 w-16 sm:w-auto">
                    <Image
                      src={getImageUrl(img.imageUrl)}
                      alt={img.altText || product.name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Main Image */}
            <div className="flex-1">
              <Card className="mb-3 overflow-hidden">
                <CardContent className="p-0 relative">
                  <div 
                    className="aspect-square bg-gray-100 relative group overflow-hidden"
                    onMouseEnter={() => setIsZooming(true)}
                    onMouseLeave={() => setIsZooming(false)}
                    onMouseMove={handleMouseMove}
                  >
                    <Image
                      src={
                        selectedVariant?.imageUrl ? getImageUrl(selectedVariant.imageUrl) : getImageUrl(product.images[selectedImage]?.imageUrl)
                      }
                      alt={product.name}
                      fill
                      className={`object-contain p-6 transition-transform duration-300 ${isZooming ? 'scale-150' : 'scale-100'}`}
                      style={{ transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }}
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* discount badge (from oldPrice percent) */}
                    {discountPercentFromOldPrice > 0 && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1">
                        -{discountPercentFromOldPrice}%
                      </Badge>
                    )}

                    <Badge className={`absolute bottom-3 left-3 ${product.stockQuantity > 0 ? 'bg-green-600' : 'bg-gray-500'}`}>
                      {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of Stock'}
                    </Badge>

                    {product.images.length > 1 && (
                      <>
                        <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full" onClick={handlePrevImage}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full" onClick={handleNextImage}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="secondary" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-xs" onClick={() => setShowImageModal(true)}>
                      Fullscreen
                    </Button>

                    {product.images.length > 1 && (
                      <Button size="icon" variant="secondary" className="absolute bottom-3 right-3" onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
                        {isAutoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="text-center text-sm text-gray-600">
                {selectedImage + 1} / {product.images.length}
              </div>
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div>
             {/* Category */}
  <Badge variant="outline" className="mb-2">{product.categoryName}</Badge>

  {/* TITLE + BADGES (same line on desktop, stacked on mobile) */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">

    {/* PRODUCT NAME */}
    <h1 className="text-2xl font-bold">{product.name}</h1>

    {/* BADGE GROUP */}
    <div className="flex items-center gap-2 mt-2 sm:mt-0">

      {/* VAT Exempt */}
      {product.taxExempt && (
        <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
          <BadgePercent className="h-3 w-3" />
          VAT Exempt
        </div>
      )}

      {/* Unisex */}
      <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
        <Users className="h-3 w-3" />
        Unisex
      </div>

    </div>
  </div>

  {/* Brand */}
  {product.brandName && (
    <p className="text-sm text-gray-600 mb-2">
      by <span className="font-semibold text-[#445D41]">{product.brandName}</span>
    </p>
  )}

            {/* Rating */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= product.averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-1 text-sm font-medium">{product.averageRating || 0}</span>
              </div>
              <span className="text-sm text-gray-600">({product.reviewCount || 0} reviews)</span>
            </div>

            {/* VARIANTS UI */}
            {option1Values.length >= 1 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Choose Option:</p>
                <div className="flex flex-wrap gap-2">
                  {option1Values.map((val: any) => (
                    <button
                      key={val}
                      onClick={() => {
                        const v = product.variants?.find(x => x.option1 === val);
                        setSelectedVariant(v || null);
                      }}
                      className={`px-3 py-1 rounded border text-sm ${selectedVariant?.option1 === val ? "bg-[#445D41] text-white border-[#445D41]" : "border-gray-300"}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {option2Values.length >= 1 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Choose Color:</p>
                <div className="flex flex-wrap gap-2">
                  {option2Values.map((val: any) => (
                    <button
                      key={val}
                      onClick={() => {
                        const v = product.variants?.find(x => x.option1 === selectedVariant?.option1 && x.option2 === val);
                        setSelectedVariant(v || null);
                      }}
                      className={`px-3 py-1 rounded border text-sm ${selectedVariant?.option2 === val ? "bg-[#445D41] text-white border-[#445D41]" : "border-gray-300"}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {option3Values.length >= 1 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Choose Variant:</p>
                <div className="flex flex-wrap gap-2">
                  {option3Values.map((val: any) => (
                    <button
                      key={val}
                      onClick={() => {
                        const v = product.variants?.find(x => x.option1 === selectedVariant?.option1 && x.option2 === selectedVariant?.option2 && x.option3 === val);
                        setSelectedVariant(v || null);
                      }}
                      className={`px-3 py-1 rounded border text-sm ${selectedVariant?.option3 === val ? "bg-[#445D41] text-white border-[#445D41]" : "border-gray-300"}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Card */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-3">
                  <span className="text-3xl font-bold text-[#445D41]">
                 £{(finalPrice * quantity).toFixed(2)}

                  </span>
                  {product.taxExempt && (
  <span className="text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded font-semibold ml-2">
    0% VAT
  </span>
)}


                  {/* Strike-through original (variant price if present) */}
                  {(discountAmount > 0) && (
                    <span className="text-lg text-gray-400 line-through">
                      £{(selectedVariant?.price ?? product.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* "You save" line */}
                {discountAmount > 0 && (
                  <div className="text-sm text-green-600 mb-3">
                    You save <strong>£{discountAmount.toFixed(2)}</strong>
                    {appliedCoupon && appliedCoupon.usePercentage && ` (${appliedCoupon.discountPercentage}% off)`}
                  </div>
                )}

                {/* Short description */}
                {product.shortDescription && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700 line-clamp-3" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
                  </div>
                )}

              

                {/* Quantity */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Quantity:</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center border-2 border-gray-300 rounded-lg">
                      <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-4 py-1 font-semibold min-w-[50px] text-center">{quantity}</span>
                      <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= (selectedVariant?.stockQuantity ?? product.stockQuantity)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-gray-600">
                      {(selectedVariant?.stockQuantity ?? product.stockQuantity)} available
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
{/* Coupon Apply Section */}
{product?.assignedDiscounts?.some(d => d.requiresCouponCode) && (
  <div className="mb-4">
    <label className="block text-sm font-semibold mb-2">Apply Coupon:</label>
    <div className="flex gap-2">
      <input
        type="text"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        placeholder="Enter coupon code"
        className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#445D41]"
      />
      <Button
        onClick={handleApplyCoupon}
        className="bg-[#445D41] text-white hover:bg-[#334a2c]"
      >
        Apply
      </Button>
    </div>

    {appliedCoupon && (
  <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700 flex items-center gap-2">
    <span>✔</span>
    <span>
      <strong>{appliedCoupon.discountPercentage}%</strong> discount applied!
      {appliedCoupon.couponCode && (
        <> (Code: <strong>{appliedCoupon.couponCode}</strong>)</>
      )}
    </span>
  </div>
)}

  </div>
)}


                <div className="space-y-2">
                  <Button onClick={handleAddToCart} disabled={product.stockQuantity === 0} className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white py-5">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                  
                  <Button variant="outline" className="w-full py-5 border-[#445D41] text-[#445D41] hover:bg-[#445D41] hover:text-white">
                    <Heart className="mr-2 h-5 w-5" />
                    Add to Wishlist
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mb-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <Truck className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-semibold">Free Shipping</p>
                  <p className="text-xs text-gray-600">Over £35</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <RotateCcw className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-semibold">Easy Returns</p>
                  <p className="text-xs text-gray-600">30 Days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-1 text-[#445D41]" />
                  <p className="text-xs font-semibold">Secure Payment</p>
                  <p className="text-xs text-gray-600">SSL Encrypted</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* TABS, RELATED PRODUCTS and rest remain unchanged */}
        <Card className="mb-8">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto scrollbar-hide border-b">
              <button onClick={() => setActiveTab("description")} className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold whitespace-nowrap transition ${activeTab === "description" ? "border-b-2 border-[#445D41] text-[#445D41]" : "text-gray-600 hover:text-[#445D41]"}`}>
                Product Description
              </button>

              <button onClick={() => setActiveTab("specifications")} className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold whitespace-nowrap transition ${activeTab === "specifications" ? "border-b-2 border-[#445D41] text-[#445D41]" : "text-gray-600 hover:text-[#445D41]"}`}>
                Specifications
              </button>

              <button onClick={() => setActiveTab("delivery")} className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold whitespace-nowrap transition ${activeTab === "delivery" ? "border-b-2 border-[#445D41] text-[#445D41]" : "text-gray-600 hover:text-[#445D41]"}`}>
                Delivery
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === "description" && (
                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.description }} />
              )}

              {activeTab === "specifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specifications.length > 0 ? (
                    specifications.map((spec: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-gray-700">{spec.name}:</span>
                        <span className="text-gray-600">{spec.value}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-gray-700">Weight:</span>
                        <span className="text-gray-600">{product.weight} {product.weightUnit}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="font-semibold text-gray-700">SKU:</span>
                        <span className="text-gray-600">{product.sku}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="space-y-6">
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-[#445D41]" />
                      <h3 className="font-bold text-lg">Standard Delivery</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">We offer a reliable Standard Delivery service for just <strong>£2.99</strong>. Enjoy free standard delivery on orders over <strong>£35</strong>.</p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Orders processed between 10 AM and 8 PM</li>
                      <li>Estimated delivery: 1-2 working days</li>
                      <li>Excludes weekends and Bank Holidays</li>
                    </ul>
                  </div>
                  {/* other delivery options... */}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Related Products</h2>

            <div className="relative group">
              <Button variant="secondary" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 z-10  opacity-100 lg:opacity-0 lg:group-hover:opacity-100  transition rounded-full shadow-lg" onClick={() => scrollSlider('left')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div ref={sliderRef} className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide">
                {relatedProducts.map((relatedProduct) => (
                  <Link key={relatedProduct.id} href={`/products/${relatedProduct.slug}`} className="flex-shrink-0 w-40 sm:w-52 md:w-56 lg:w-64">
                    <Card className="hover:shadow-lg transition h-full">
                      <CardContent className="p-4">
                        <div className="aspect-square relative mb-3 rounded ">
                          <Image src={getImageUrl(relatedProduct.images[0]?.imageUrl)} alt={relatedProduct.name} fill className="object-contain p-4" sizes="256px" />
                        </div>
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2 h-10">{relatedProduct.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#445D41]">£{relatedProduct.price.toFixed(2)}</span>
                          {relatedProduct.oldPrice > relatedProduct.price && (<span className="text-xs text-gray-400 line-through">£{relatedProduct.oldPrice.toFixed(2)}</span>)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <Button variant="secondary" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 z-10  opacity-100 lg:opacity-0 lg:group-hover:opacity-100  transition rounded-full shadow-lg" onClick={() => scrollSlider('right')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </section>
        )}

        <RatingReviews />
      </main>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
