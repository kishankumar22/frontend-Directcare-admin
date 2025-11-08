// app/products/[slug]/ProductClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
  MapPin
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/CustomToast";

// ✅ TypeScript Interfaces
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
  manufacturerName: string;
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
  tags: string;
  weight: number;
  weightUnit: string;
  videoUrls: string;
  specificationAttributes: string;
  relatedProductIds: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  images: ProductImage[];
}

interface ProductClientProps {
  product: Product;
}

export default function ProductClient({ product }: ProductClientProps) {
  const toast = useToast();
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "delivery">("description");

  // ✅ Auto-slide images
  useEffect(() => {
    if (!isAutoPlaying || !product) return;

    const interval = setInterval(() => {
      setSelectedImage((prev) => 
        prev < product.images.length - 1 ? prev + 1 : 0
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, product]);

  // ✅ Fetch Related Products
  useEffect(() => {
    if (product.relatedProductIds) {
      fetchRelatedProducts(product.relatedProductIds);
    }
  }, [product.relatedProductIds]);
  // ✅ CRITICAL FIX: Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setShowImageModal(false);
    setIsAutoPlaying(false);
    setActiveTab("description");
    setRelatedProducts([]);
  }, [product.id]); // Reset when product ID changes
  const fetchRelatedProducts = async (relatedIds: string) => {
    try {
      const ids = relatedIds.split(',').map(id => id.trim());
      const promises = ids.slice(0, 8).map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/${id}`)
          .then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const validProducts = results
        .filter(r => r.success)
        .map(r => r.data);
      
      setRelatedProducts(validProducts);
    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  };

  // ✅ Slider Navigation
  const scrollSlider = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 300;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleAddToCart = () => {
    toast.success(`${quantity} × ${product.name} added to cart! 🛒`);
  };

  const calculateDiscount = (price: number, oldPrice: number) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  };

  const getImageUrl = (imageUrl: string) => {
    return imageUrl.startsWith('http') 
      ? imageUrl 
      : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
  };

  const getSpecifications = () => {
    if (!product?.specificationAttributes) return [];
    try {
      return JSON.parse(product.specificationAttributes);
    } catch {
      return [];
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
  };

  const discount = calculateDiscount(product.price, product.oldPrice);
  const specifications = getSpecifications();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#445D41]">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#445D41]">Products</Link>
            <span>/</span>
            <Link href={`/category/${product.categoryName}`} className="hover:text-[#445D41]">
              {product.categoryName}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ✅ OPTIMIZED LAYOUT - Reduced spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ✅ LEFT: Image Gallery */}
          <div className="flex gap-3">
            {/* Thumbnail Column */}
            <div className="flex flex-col gap-2 w-20">
              {product.images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => {
                    setSelectedImage(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`
                    cursor-pointer border-2 rounded-lg overflow-hidden transition
                    ${selectedImage === idx ? 'border-[#445D41]' : 'border-gray-200 hover:border-[#445D41]'}
                  `}
                >
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={getImageUrl(img.imageUrl)}
                      alt={img.altText}
                      fill
                      className="object-contain p-1"
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
                      src={getImageUrl(product.images[selectedImage]?.imageUrl)}
                      alt={product.name}
                      fill
                      className={`object-contain p-6 transition-transform duration-300 ${
                        isZooming ? 'scale-150' : 'scale-100'
                      }`}
                      style={{
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                      }}
                    />

                    {discount > 0 && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1">
                        -{discount}%
                      </Badge>
                    )}

                    <Badge className={`absolute bottom-3 left-3 ${
                      product.stockQuantity > 0 ? 'bg-green-600' : 'bg-gray-500'
                    }`}>
                      {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of Stock'}
                    </Badge>

                    {product.images.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full"
                          onClick={handlePrevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition rounded-full"
                          onClick={handleNextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-xs"
                      onClick={() => setShowImageModal(true)}
                    >
                      Fullscreen
                    </Button>

                    {product.images.length > 1 && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-3 right-3"
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      >
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

          {/* ✅ RIGHT: Product Info - COMPACT */}
          <div>
            <Badge variant="outline" className="mb-2">{product.categoryName}</Badge>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            
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
                    className={`h-4 w-4 ${
                      star <= product.averageRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-1 text-sm font-medium">{product.averageRating || 0}</span>
              </div>
              <span className="text-sm text-gray-600">({product.reviewCount || 0} reviews)</span>
            </div>

            {/* Price */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-[#445D41]">
                    £{product.price.toFixed(2)}
                  </span>
                  {product.oldPrice > product.price && (
                    <span className="text-lg text-gray-400 line-through">
                      £{product.oldPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {product.shortDescription && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div 
                      className="text-sm text-gray-700 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Quantity:</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border-2 border-gray-300 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-4 py-1 font-semibold min-w-[50px] text-center">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={quantity >= product.stockQuantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-gray-600">
                      ({product.stockQuantity} available)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stockQuantity === 0}
                    className="w-full bg-[#445D41] hover:bg-[#334a2c] text-white py-5"
                  >
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

            {/* Trust Badges - COMPACT */}
            <div className="grid grid-cols-3 gap-2 mb-4">
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

            {/* Product Meta - COMPACT */}
            {/* <Card>
              <CardContent className="p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-semibold">{product.sku}</span>
                </div>
                {product.brandName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-semibold">{product.brandName}</span>
                  </div>
                )}
                {product.manufacturerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manufacturer:</span>
                    <span className="font-semibold">{product.manufacturerName}</span>
                  </div>
                )}
                {product.tags && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Tags:</span>
                    <div className="flex gap-1 flex-wrap max-w-[60%] justify-end">
                      {product.tags.split(',').map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs py-0">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card> */}
          </div>
        </div>

        {/* ✅ TABS SECTION - Description, Specifications, Delivery */}
        <Card className="mb-8">
          <CardContent className="p-0">
            {/* Tab Headers */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("description")}
                className={`px-6 py-3 font-semibold transition ${
                  activeTab === "description"
                    ? "border-b-2 border-[#445D41] text-[#445D41]"
                    : "text-gray-600 hover:text-[#445D41]"
                }`}
              >
                Product Description
              </button>
              <button
                onClick={() => setActiveTab("specifications")}
                className={`px-6 py-3 font-semibold transition ${
                  activeTab === "specifications"
                    ? "border-b-2 border-[#445D41] text-[#445D41]"
                    : "text-gray-600 hover:text-[#445D41]"
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab("delivery")}
                className={`px-6 py-3 font-semibold transition ${
                  activeTab === "delivery"
                    ? "border-b-2 border-[#445D41] text-[#445D41]"
                    : "text-gray-600 hover:text-[#445D41]"
                }`}
              >
                Delivery
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "description" && (
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
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
                  {/* Standard Delivery */}
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-[#445D41]" />
                      <h3 className="font-bold text-lg">Standard Delivery</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      We offer a reliable Standard Delivery service for just <strong>£2.99</strong>. 
                      Enjoy free standard delivery on orders over <strong>£35</strong>.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Orders processed between 10 AM and 8 PM</li>
                      <li>Estimated delivery: 1-2 working days</li>
                      <li>Excludes weekends and Bank Holidays</li>
                    </ul>
                  </div>

                  {/* Next Day Delivery */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <h3 className="font-bold text-lg">Next Day Delivery</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      For urgent orders, choose our Next Day Delivery service for <strong>£4.49</strong>.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Orders before 2 PM (Mon-Fri) dispatched same day</li>
                      <li>Delivered next working day</li>
                      <li>Weekend orders processed on next working day</li>
                    </ul>
                  </div>

                  {/* Royal Mail Special Delivery */}
                  <div className="border-l-4 border-red-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-5 w-5 text-red-500" />
                      <h3 className="font-bold text-lg">Royal Mail Special Delivery Guaranteed 1PM</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      For urgent orders, choose our Royal Mail Special Delivery for <strong>£10.99</strong>.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Orders before 2 PM dispatched same day</li>
                      <li>Guaranteed delivery by 1 PM next working day</li>
                      <li>Tracked and insured service</li>
                    </ul>
                  </div>

                  {/* Click & Collect */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-green-500" />
                      <h3 className="font-bold text-lg">Click & Collect</h3>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      Enjoy the flexibility of Click & Collect for just <strong>£1</strong> or 
                      free on orders over <strong>£30</strong>.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Order Cut-off: Before 8 PM</li>
                      <li>Pickup Location: Unit 38 A, Plume Street, Birmingham, B6 7RT, UK</li>
                      <li>Pickup Hours: Monday to Friday, 10 AM – 5 PM</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ✅ RELATED PRODUCTS SLIDER */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Related Products</h2>
            <div className="relative group">
              {/* Left Arrow */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition rounded-full shadow-lg"
                onClick={() => scrollSlider('left')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Slider */}
              <div 
                ref={sliderRef}
                className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {relatedProducts.map((relatedProduct) => (
                  <Link 
                    key={relatedProduct.id} 
                    href={`/products/${relatedProduct.slug}`}
                    className="flex-shrink-0 w-64"
                  >
                    <Card className="hover:shadow-lg transition">
                      <CardContent className="p-4">
                        <div className="aspect-square relative mb-3 rounded">
                          <Image
                            src={getImageUrl(relatedProduct.images[0]?.imageUrl)}
                            alt={relatedProduct.name}
                            fill
                            className="object-contain p-4"
                          />
                        </div>
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2 h-10">
                          {relatedProduct.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#445D41]">
                            £{relatedProduct.price.toFixed(2)}
                          </span>
                          {relatedProduct.oldPrice > relatedProduct.price && (
                            <span className="text-xs text-gray-400 line-through">
                              £{relatedProduct.oldPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Right Arrow */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition rounded-full shadow-lg"
                onClick={() => scrollSlider('right')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* ✅ Image Modal (Same as before) */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/95">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex items-center justify-between p-4 bg-black/50">
              <span className="text-white font-semibold">
                {selectedImage + 1} / {product.images.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                >
                  {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    setShowImageModal(false);
                    setIsAutoPlaying(false);
                  }}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 relative">
              <Image
                src={getImageUrl(product.images[selectedImage]?.imageUrl)}
                alt={product.name}
                fill
                className="object-contain"
              />

              {product.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 text-white hover:bg-white/20 w-12 h-12 rounded-full"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 text-white hover:bg-white/20 w-12 h-12 rounded-full"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}
            </div>

            <div className="p-4 bg-black/50">
              <div className="flex gap-2 justify-center overflow-x-auto">
                {product.images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedImage(idx);
                      setIsAutoPlaying(false);
                    }}
                    className={`
                      cursor-pointer border-2 rounded overflow-hidden flex-shrink-0
                      ${selectedImage === idx ? 'border-[#445D41]' : 'border-transparent hover:border-white/50'}
                    `}
                  >
                    <div className="w-16 h-16 relative bg-gray-800">
                      <Image
                        src={getImageUrl(img.imageUrl)}
                        alt={img.altText}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CSS for Slider - Add to globals.css */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
