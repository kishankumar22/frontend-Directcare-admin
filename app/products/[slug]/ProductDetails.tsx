// app/products/[slug]/ProductDetails.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RatingReviews from "@/components/product/RatingReviews";
import RelatedProductCard from "@/components/product/RelatedProductCard";
import SubscriptionPurchaseCard from "@/components/product/SubscriptionPurchaseCard";
import QuantitySelector from "@/components/shared/QuantitySelector";
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
  option1Name: string;     // <-- ADD
  option1Value: string;
   option2Name: string;     // <-- ADD
  option2Value: string;
   option3Name: string;     // <-- ADD
  option3Value: string;    // <-- ADD
  imageUrl?: string | null;
  isDefault?: boolean;
    displayOrder: number;   // <-- ADD THIS
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
  compareAtPrice?: number | null;
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
     vatExempt?: boolean;
     vatRateId?: string | null;
gender?: string;
 isRecurring?: boolean;
  recurringCycleLength?: number;
  recurringCyclePeriod?: string;
  recurringTotalCycles?: number;
  subscriptionDiscountPercentage?: number;
  disableWishlistButton?: boolean;
  allowCustomerReviews?: boolean;
  attributes?: {
  id: string;
  name: string;
  value: string;
  displayName?: string;
  sortOrder?: number;
}[];

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
  // Normal purchase quantity state
const [normalQty, setNormalQty] = useState(1);
const [normalStockError, setNormalStockError] = useState<string | null>(null);
// Subscription purchase quantity state
const [subscriptionQty, setSubscriptionQty] = useState(1);
const [subscriptionStockError, setSubscriptionStockError] = useState<string | null>(null);


  
  const [selectedImage, setSelectedImage] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "delivery">("description");

const [purchaseType, setPurchaseType] = useState<"one" | "subscription">("one");
const [vatRates, setVatRates] = useState<any[]>([]);
const [vatRate, setVatRate] = useState<number | null>(null);

  // Discount & coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AssignedDiscount | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(product.price);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // ---- GENERIC OPTION SELECTION STATE ----
// GENERIC dynamic selected options
const [selectedOptions, setSelectedOptions] = useState<{
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}>({});
// Currently selected variant
const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);


// ---- DEFAULT VARIANT AUTO SELECT ----
useEffect(() => {
  if (product.variants && product.variants.length > 0) {
    const def = product.variants.find(v => v.isDefault) ?? product.variants[0];

    setSelectedVariant(def);

    setSelectedOptions({
      option1: def.option1Value ?? null,
      option2: def.option2Value ?? null,
      option3: def.option3Value ?? null,
    });
  }
}, [product.variants]);

// ---- UNIVERSAL HANDLER ----
const updateSelection = (level: 1 | 2 | 3, value: string) => {
  const updated = {
    ...selectedOptions,
    [`option${level}`]: value,
  };

  // Reset lower-level options when changing higher level ones
  if (level === 1) {
    updated.option2 = null;
    updated.option3 = null;
  }
  if (level === 2) {
    updated.option3 = null;
  }

  // AUTO CALCULATE VALID NEXT OPTIONS
  const validNext = product.variants?.filter(v =>
    v.option1Value === updated.option1 &&
    (!updated.option2 || v.option2Value === updated.option2)
  );

  // AUTO SELECT option2 if only one available
  if (level === 1 && validNext) {
    const colors = [...new Set(validNext.map(v => v.option2Value))];
    if (colors.length === 1) updated.option2 = colors[0];
  }

  // AUTO SELECT option3 if only one available
  const validThird = product.variants?.filter(v =>
    v.option1Value === updated.option1 &&
    v.option2Value === updated.option2
  );

  if (validThird) {
    const rams = [...new Set(validThird.map(v => v.option3Value))];
    if (rams.length === 1) updated.option3 = rams[0];
  }

  setSelectedOptions(updated);

  // Update selectedVariant based on updated options
  const match = product.variants?.find(v =>
    v.option1Value === updated.option1 &&
    v.option2Value === updated.option2 &&
    v.option3Value === updated.option3
  );

  if (match) setSelectedVariant(match);
};


//vat dikhane ke liye
useEffect(() => {
  const fetchVatRates = async () => {
    try {
      const res = await fetch("https://testapi.knowledgemarkg.com/api/VATRates?activeOnly=true");
      const json = await res.json();
      setVatRates(json.data || []);
    } catch (err) {
      console.error("VAT fetch error:", err);
    }
  };

  fetchVatRates();
}, []);
//vat dikhane ke liye
useEffect(() => {
  if (!product || !product.vatRateId || product.vatExempt) return;

  const rateValue = vatRates.find(r => r.id === product.vatRateId)?.rate;
  setVatRate(rateValue ?? null);
}, [vatRates, product]);



  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setNormalQty(1);
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
  const variantTitle = selected
    ? `(${[
        selected.option1Value,
        selected.option2Value,
        selected.option3Value
      ].filter(Boolean).join(", ")})`
    : "";

  addToCart({
    id: `${selected?.id ?? product.id}-one`,
type: "one-time",
    productId: product.id,
    // ⭐ PRODUCT NAME + ALL VARIANT VALUES
    name: `${product.name} ${variantTitle}`,
    // ⭐ REQUIRED FOR CART DISCOUNT SYSTEM
    price: final,                    // price used in cart if no coupon removed
    priceBeforeDiscount: basePrice,  // original price (for recalc on remove)
    finalPrice: final,               // current price after discount
    discountAmount: discountAmount ?? 0,
    couponCode: appliedCoupon?.couponCode ?? null,
    appliedDiscountId: appliedCoupon?.id ?? null,
    quantity: normalQty,
image: selected?.imageUrl
      ? getImageUrl(selected.imageUrl)
      : getImageUrl(product.images[0]?.imageUrl),

    sku: selected?.sku ?? product.sku,
    variantId: selected?.id ?? null,
 slug: product.slug,  // ⭐ ADD THIS LINE
  variantOptions: {
      ...(selected?.option1Name && { [selected.option1Name]: selected.option1Value }),
      ...(selected?.option2Name && { [selected.option2Name]: selected.option2Value }),
      ...(selected?.option3Name && { [selected.option3Name]: selected.option3Value }),
    },
    // ⭐ MOST IMPORTANT (for coupon validation on cart page)
    productData: JSON.parse(JSON.stringify(product)),

  });

  toast.success(`${normalQty} × ${product.name} added to cart! 🛒`);
}, [
  addToCart,
  normalQty,
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
   setNormalQty(1); // reset quantity
    // coupon reset handled by useEffect watching selectedVariant
     // Now auto update image if variant has one
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

  const isOutOfStock =
  selectedVariant
    ? selectedVariant.stockQuantity === 0
    : product.stockQuantity === 0;


  return (
    <div className="min-h-screen bg-white">
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
        <div className="flex flex-col gap-3 w-full lg:sticky lg:top-24 lg:self-start">


            {/* Thumbnails */}
           
            {/* Main Image */}
            <div className="flex-1">
              <div className="relative mb-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div 
                    className="relative bg-white group overflow-hidden h-[380px] md:h-[420px] lg:h-[460px] flex items-center justify-center"
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
                    {product.assignedDiscounts && product.assignedDiscounts.length > 0 && (() => {
  const active = product.assignedDiscounts.find(
    d =>
      d.isActive &&
      !d.requiresCouponCode &&
      new Date() >= new Date(d.startDate) &&
      new Date() <= new Date(d.endDate)
  );

  if (!active) return null;

  const percent = active.usePercentage
    ? active.discountPercentage
    : Math.round((active.discountAmount / (selectedVariant?.price ?? product.price)) * 100);

  return (
    <Badge className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 font-semibold">
      -{percent}% OFF
    </Badge>
  );
})()}

                    <Badge className={`absolute bottom-3 left-3 ${
  isOutOfStock ? "bg-gray-500" : "bg-green-600"
}`}>
  {isOutOfStock ? "Out of Stock" : `${selectedVariant?.stockQuantity ?? product.stockQuantity} in stock`}
</Badge>


                    {product.images.length > 1 && (
                      <>
                        <Button size="icon" variant="secondary" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
bg-white/80 hover:bg-white shadow-md rounded-full p-2 backdrop-blur-sm transition" onClick={handlePrevImage}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
bg-white/80 hover:bg-white shadow-md rounded-full p-2 backdrop-blur-sm transition" onClick={handleNextImage}>
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
               </div>
              {/* Thumbnails Below */}
<div className="flex flex-row gap-7 overflow-x-auto w-full mt-4 justify-start pb-1">
  {product.images.map((img, idx) => (
    <div
      key={img.id}
      onClick={() => {
        setSelectedImage(idx);
        setIsAutoPlaying(false);
      }}
     className={`cursor-pointer rounded-2xl overflow-hidden transition-all w-28 h-24 ml-[10px] mt-[10px] mb-[5px]
${selectedImage === idx 
  ? "ring-2 ring-gray-200 shadow-lg scale-110" 
  : "ring-1 ring-gray-200 hover:ring-[#445D41] hover:shadow-md hover:scale-105"
}`}
    >
      <div className="relative w-full h-full bg-white">
        <Image
          src={getImageUrl(img.imageUrl)}
          alt={img.altText || product.name}
          fill
          className="object-contain p-1.5 transition-transform"
        />
      </div>
    </div>
  ))}
</div>

              <div className="text-center text-sm text-gray-600">
                {selectedImage + 1} / {product.images.length}
              </div>
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div>
 {/* Category + Badges Row */}
{/* CATEGORY LEFT + BADGES RIGHT */}
<div className="flex items-center justify-between w-full mb-2">

  {/* LEFT - CATEGORY BADGE */}
  <Badge variant="outline" className="bg-gray-100 text-gray-700">
    {product.categoryName}
  </Badge>

  {/* RIGHT - BADGES GROUP */}
  <div className="flex items-center gap-2">

    {/* VAT Exempt */}
    {product.vatExempt && (
      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
        <BadgePercent className="h-3 w-3" />
        VAT Exempt
      </div>
    )}

    {/* Unisex */}
    <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
      <img 
        src="/icons/unisex.svg"
        alt="Unisex"
        className="h-4 w-4 object-contain"
        loading="lazy"
      />
      Unisex
    </div>
  </div>
</div>

  {/* TITLE + BADGES (same line on desktop, stacked on mobile) */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">

    {/* PRODUCT NAME */}
 <h1 className="text-2xl font-bold">
  {selectedVariant
    ? `${product.name} (${[
        selectedOptions.option1,
        selectedOptions.option2,
        selectedOptions.option3
      ].filter(Boolean).join(", ")})`
    : product.name}
</h1>
     </div>

 <div className="flex items-center gap-4 mb-3 flex-wrap">
  {/* Brand */}
  {product.brandName && (
    <p className="text-sm text-gray-600">
      by <span className="font-semibold text-[#445D41]">{product.brandName}</span>
    </p>
  )}

  {/* Rating + Reviews */}
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= product.averageRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>

  <span className="text-sm font-medium">
  {(product.averageRating ?? 0).toFixed(1)}
</span>
    <span className="text-sm text-gray-600">({product.reviewCount || 0} reviews)</span>
  </div>

</div>
{/* VARIANTS UI */}
{product.variants && product.variants.length > 0 && (
  <>
    {/* OPTION 1 */}
    {product.variants?.[0]?.option1Name && (
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">
          {product.variants?.[0]?.option1Name}
        </p>
        <div className="flex flex-wrap gap-2">
          {[...new Set(product.variants?.map(v => v.option1Value))].map((opt) => (
            <button
              key={opt}
              onClick={() => updateSelection(1, opt)}
              className={`px-3 py-1 rounded border text-sm ${
                selectedOptions.option1 === opt
                  ? "bg-[#445D41] text-white border-[#445D41]"
                  : "border-gray-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* OPTION 2 */}
    {product.variants?.[0]?.option2Name && (
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">
          {product.variants?.[0]?.option2Name}
        </p>

        <div className="flex flex-wrap gap-2">
          {[...new Set(
            product.variants
              ?.filter(v => v.option1Value === selectedOptions.option1)
              .map(v => v.option2Value)
          )].map((opt) => (
            <button
              key={opt}
              onClick={() => updateSelection(2, opt)}
              className={`px-3 py-1 rounded border text-sm ${
                selectedOptions.option2 === opt
                  ? "bg-[#445D41] text-white border-[#445D41]"
                  : "border-gray-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* OPTION 3 */}
    {product.variants?.some(v => v.option3Name && v.option3Value) && (
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">
          {product.variants?.[0]?.option3Name}
        </p>

        <div className="flex flex-wrap gap-2">
          {[...new Set(
            product.variants
              ?.filter(v =>
                v.option1Value === selectedOptions.option1 &&
                v.option2Value === selectedOptions.option2
              )
                .filter(v =>
      v.option1Value === selectedOptions.option1 &&
      v.option2Value === selectedOptions.option2
  )
  .map(v => v.option3Value)

          )].map((opt) => (
            <button
              key={opt}
              onClick={() => updateSelection(3, opt)}
              className={`px-3 py-1 rounded border text-sm ${
                selectedOptions.option3 === opt
                  ? "bg-[#445D41] text-white border-[#445D41]"
                  : "border-gray-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )}
  </>
)}

            {/* Price Card */}
            <Card className="mb-4">
              <CardContent className="p-4">

                    {/* Short description */}
                {product.shortDescription && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700 line-clamp-3" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
                  </div>
                )}
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

                {/* PURCHASE MODE CARDS SIDE BY SIDE */}
{product.isRecurring ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

    {/* LEFT NORMAL PURCHASE CARD */}
    <div
  id="normal-purchase-card"
   onClick={() => setPurchaseType("one")}
  className={`w-full transition-all duration-300 rounded-2xl ${
    purchaseType === "one"
      ? "border-2 border-[#445D41] bg-[#f8faf9] shadow-md"
      : "border border-gray-200 bg-white"
  }`}
>
      {/* <<< Your current full card starts here >>> */}
              <Card className="shadow-sm bg-transparent border-none">
  <CardContent className="px-3 pt-3 pb-2">
    <label className="flex items-center gap-2 cursor-pointer mb-2">
  <input
    type="radio"
    name="purchaseType"
    value="one"
    checked={purchaseType === "one"}
    onChange={() => setPurchaseType("one")}
    className="h-4 w-4"
  />
  <span className="font-semibold text-sm">One-Time Purchase</span>
</label>
<div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-3">
  <span className="text-3xl font-bold text-[#445D41]">
    £{(finalPrice * normalQty).toFixed(2)}
  </span>

  {product.vatExempt ? (
    <span className="text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded font-semibold ml-0 sm:ml-2">
      0% VAT
    </span>
  ) : vatRate !== null ? (
    <span className="text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold ml-0 sm:ml-2">
      {vatRate}% VAT
    </span>
  ) : null}

              


                  {/* Strike-through original (variant price if present) */}
                  {(discountAmount > 0) && (
                    <span className="text-lg text-gray-400 line-through">
                     £{(
  selectedVariant?.compareAtPrice ??
  product.oldPrice ??
  product.compareAtPrice
).toFixed(2)}

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

            {/* Quantity */}
                <div className="mb-4">
                  
<QuantitySelector
  quantity={normalQty}
  setQuantity={setNormalQty}
  maxStock={selectedVariant?.stockQuantity ?? product.stockQuantity}
  stockError={normalStockError}
  setStockError={setNormalStockError}
/>


  

                    {/* ⭐ PREMIUM Stock Badge */}
    <div
  className={`w-fit flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 ${
    (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-700"
  }`}
>
  <span
    className={`inline-block w-2 h-2 rounded-full ${
      (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
        ? "bg-red-600"
        : "bg-green-600"
    }`}
  ></span>

  {(selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
    ? "Out of Stock"
    : `${selectedVariant?.stockQuantity ?? product.stockQuantity} Available`}
</div>
</div>
               
  <div className="flex items-center justify-center mt-2 space-x-3">
  <div className="flex-1">
   {purchaseType === "one" && (
  <Button
    onClick={handleAddToCart}
    disabled={isOutOfStock}
    className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
      isOutOfStock
        ? "bg-gray-400 cursor-not-allowed opacity-70"
        : "bg-[#445D41] hover:bg-black text-white"
    }`}
  >
    <ShoppingCart className="h-5 w-5" />
    Add to Cart
  </Button>
)}

  </div>

  <div className="flex-1">
      {purchaseType === "one" && (
    <Button
  variant="outline"
  disabled={product.disableWishlistButton}
  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 ${
    product.disableWishlistButton
      ? "bg-gray-300 cursor-not-allowed opacity-60 text-gray-600"
      : "bg-[#445D41] hover:bg-black text-white hover:text-white"
  }`}
>
  <Heart className="h-5 w-5" />
  Wishlist
</Button>
      )}
  </div>
      
</div>

  
              </CardContent>
            </Card>

          </div>

    {/* RIGHT SUBSCRIPTION CARD */}
  

    <div
  id="subscription-card"
   onClick={() => setPurchaseType("subscription")}
  className={`w-full transition-all duration-300 rounded-2xl ${
    purchaseType === "subscription"
      ? "border-2 border-[#445D41] bg-[#f8faf9] shadow-md"
      : "border border-gray-200 bg-white"
  }`}
>
 <SubscriptionPurchaseCard
 product={product}
 selectedVariant={selectedVariant}
 selectedPurchaseType={purchaseType}
 setSelectedPurchaseType={setPurchaseType}
 quantity={subscriptionQty}
 setQuantity={setSubscriptionQty}
 stockError={subscriptionStockError}
 setStockError={setSubscriptionStockError}
  vatRate={vatRate}   // 🟢 Add this
/>

    </div>

  </div>
) : (
  <>
    {/* If no subscription then just show normal card */}
    <Card className="mb-4 border border-gray-200 rounded-2xl shadow-sm">
      <CardContent className="p-5">
         <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-3">
                  <span className="text-3xl font-bold text-[#445D41]">
                 £{(finalPrice * normalQty).toFixed(2)}

                  </span>
   {product.vatExempt ? (
    <span className="text-sm text-green-700 bg-green-100 px-2 py-0.5 rounded font-semibold ml-0 sm:ml-2">
      0% VAT
    </span>
  ) : vatRate !== null ? (
    <span className="text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold ml-0 sm:ml-2">
      {vatRate}% VAT
    </span>
  ) : null}

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

            {/* Quantity */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Quantity:</label>
                  <div className="flex flex-wrap items-center gap-3">
                   <div className="flex items-center border-2 border-gray-300 rounded-lg">
  
  {/* - Button */}
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setNormalQty(Math.max(1, normalQty - 1))}
    disabled={normalQty <= 1}
  >
    <Minus className="h-4 w-4" />
  </Button>

  {/* Quantity Input */}
 <input
  type="number"
  className="w-14 text-center font-semibold outline-none border-l border-r border-gray-300"
  value={normalQty === 0 ? "" : normalQty}
  onChange={(e) => {
    let val = e.target.value;

    // Allow only digits
    if (!/^\d*$/.test(val)) return;

    if (val === "") {
      setNormalQty(0);
      return;
    }

    let num = parseInt(val, 10);
    const maxStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
// Prevent exceeding stock while typing
if (num > maxStock) {
  num = maxStock;
  setNormalStockError(`Only ${maxStock} items available`);
} else {
  setNormalStockError(null);
}

    // Prevent exceeding stock while typing
  
    setNormalQty(num);
  }}
  onBlur={() => {
    const maxStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
    let val = normalQty;

    if (!val || val < 1) val = 1;
    if (val > maxStock) val = maxStock;

    setNormalQty(val);
  }}
  inputMode="numeric"
  min={1}
  max={selectedVariant?.stockQuantity ?? product.stockQuantity}
/>



  {/* + Button */}
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      const maxStock =
        selectedVariant?.stockQuantity ?? product.stockQuantity;
      setNormalQty(Math.min(normalQty + 1, maxStock));
    }}
    disabled={normalQty >= (selectedVariant?.stockQuantity ?? product.stockQuantity)}
  >
    <Plus className="h-4 w-4" />
  </Button>
 

</div>
 {normalStockError && (
  <p className="text-red-600 text-xs mt-1">{normalStockError}</p>
)}

                    {/* ⭐ PREMIUM Stock Badge */}
    <div
  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
    (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
      ? "bg-red-100 text-red-700"
      : "bg-green-100 text-green-700"
  }`}
>
  <span
    className={`inline-block w-2 h-2 rounded-full ${
      (selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
        ? "bg-red-600"
        : "bg-green-600"
    }`}
  ></span>

  {(selectedVariant?.stockQuantity ?? product.stockQuantity) === 0
    ? "Out of Stock"
    : `${selectedVariant?.stockQuantity ?? product.stockQuantity} Available`}
</div>
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
               
  <div className="flex items-center justify-between mt-4 space-x-3">
  <div className="flex-1">
   {purchaseType === "one" && (
  <Button
    onClick={handleAddToCart}
    disabled={isOutOfStock}
    className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
      isOutOfStock
        ? "bg-gray-400 cursor-not-allowed opacity-70"
        : "bg-[#445D41] hover:bg-black text-white"
    }`}
  >
    <ShoppingCart className="h-5 w-5" />
    Add to Cart
  </Button>
)}

  </div>

  <div className="flex-1">
    <Button
      variant="outline"
      className="w-full py-4 rounded-xl bg-[#445D41] hover:bg-black text-white hover:text-white flex items-center justify-center gap-2"
    >
      <Heart className="h-5 w-5" />
      Wishlist
    </Button>
  </div>
  
</div>
      </CardContent>
    </Card>
  </>
)}

                  
                
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
        <Card className="mb-0">
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

    {product.attributes && product.attributes.length > 0 ? (
      product.attributes
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((attr) => (
          <div
  key={attr.id}
  className="flex flex-col sm:flex-row sm:justify-between border-b pb-2 gap-1 break-words"
>
  <span className="font-semibold text-gray-700 break-words">
    {attr.displayName || attr.name}:
  </span>
  <span className="text-gray-600 sm:text-right break-words">
    {attr.value}
  </span>
</div>

        ))
    ) : (
      <>
        {/* FALLBACK only if no attributes exist */}
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
       {relatedProducts.map((relatedProduct) => (
  <RelatedProductCard
    key={relatedProduct.id}
    product={relatedProduct}
    getImageUrl={getImageUrl}
  />
))}


       {product.allowCustomerReviews && (
  <RatingReviews productId={product.id} allowCustomerReviews={product.allowCustomerReviews} />
)}

      </main>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
