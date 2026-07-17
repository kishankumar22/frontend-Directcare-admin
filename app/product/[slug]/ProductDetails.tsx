// app/products/[slug]/ProductDetails.tsx
"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import RatingReviews from "@/components/product/RatingReviews";
import { Review, getRecentApprovedReviews } from "@/components/product/RatingReviews";
import RelatedProductCard from "@/components/product/RelatedProductCard";
import CrossSellProductCard from "@/components/product/CrossSellProductCard";
import SubscriptionPurchaseCard from "@/components/product/SubscriptionPurchaseCard";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import RecentlyViewedSlider from "@/components/recently-viewed/RecentlyViewedSlider";
import { getBackorderUIState } from "@/app/lib/backorderHelpers";
import BackInStockModal from "@/components/backorder/BackInStockModal";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ShoppingCart, Heart, Star, Minus, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Truck, RotateCcw, ShieldCheck, Pause, Play, Package, Bike, Users, BadgePercent, Zap, BellRing, Share2, Gift, AwardIcon, MapPin, Clock, TruckElectric, TruckElectricIcon, Pill, Share, Share2Icon, LucideShare2, ShareIcon, PlusCircle, Info } from "lucide-react";
import ShareMenu from "@/components/share/ShareMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/CustomToast";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { addRecentlyViewed } from "@/app/hooks/useRecentlyViewed";
import { normalizePrice } from "@/lib/price";
import CouponModal from "@/components/product/CouponModal";
import ProductImageModal from "@/components/product/ProductImageModal";
import { getDiscountBadge, getDiscountedPrice, } from "@/app/lib/discountHelpers";
import { usePathname } from "next/navigation";
import { detectUKRegion } from "@/app/lib/region";
import GenderBadge from "@/components/shared/GenderBadge";
import { getOldPriceDiscount } from "@/utils/pricing";
import PharmaQuestionsModal from "@/components/pharma/PharmaQuestionsModal";
import { useCartActivity } from "@/context/CartContext";
import { trackViewItem, trackAddToCart } from "@/lib/analytics";

// Natural / numeric-aware sort so "1 Pack" < "3 Pack" < "6 Pack"
const naturalSort = (a: string | undefined, b: string | undefined): number =>
  (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });

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
  option1Name: string;
  option1Value: string;
  option2Name: string;
  option2Value: string;
  option3Name: string;
  option3Value: string;
  imageUrl?: string | null;
  isDefault?: boolean;
  displayOrder: number;
  slug: string;
  loyaltyPointsEarnable?: number;
  loyaltyPointsMessage?: string;
  oldPrice?: number;
  displayDiscountType?: "None" | "OldPrice" | "System";
  freeShippingThreshold?: number;
  hasSystemDiscount?: boolean;
  systemDiscountAmount?: number;
  nextDayDeliveryEnabled?: boolean;
  nextDayDeliveryFree?: boolean;
  nextDayDeliveryCutoffTime?: string;
  fakeSaleCount?: number;
  saleCount?: number;
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
  isCumulative?: boolean;
  couponCode?: string;
}
interface GroupedProduct {
  slug: string | undefined;
  mainImageUrl?: string;
  individualSavings: any;
  hasBundleDiscount: any;
  productId: string;
  name: string;
  shortDescription?: string;
  sku: string;
  price: number;
  stockQuantity: number;
  displayOrder?: number;
  isPublished?: boolean;
  inStock: boolean;
  bundlePrice?: number;
}
interface Product {
  orderMaximumQuantity?: number;
  orderMinimumQuantity?: number;
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  publishedAt:string;
  slug: string;
  sku: string;
  price: number;
  oldPrice: number;
  incompatibleProducts?: {
    incompatibleProductId: string;
    incompatibleProductName?: string;
    reason?: string;
  }[];
  incompatibilities?: {
    incompatibleProductId: string;
    incompatibleProductName?: string;
    reason?: string;
  }[];
  displayDiscountType?: "None" | "OldPrice" | "System";
  weeklySaleCount?: number;
  hasSystemDiscount?: boolean;
  freeShippingThreshold?: number;
  freeShippingThresholds?: {
    deliveryOptionId: string;
    name: string;
    displayName: string;
    threshold: number;
    displayOrder: number;
  }[];
  systemDiscountAmount?: number;
  compareAtPrice?: number | null;
  notReturnable?: boolean;
  stockQuantity: number;
  categories: {
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    parentCategoryId?: string | null;
    isPrimary?: boolean;
    displayOrder?: number;
  }[];
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
  crossSellProductIds: string;
  variants?: Variant[];
  assignedDiscounts?: AssignedDiscount[];
  vatExempt?: boolean;
  vatRate?: number;
  gender?: string;
  isRecurring?: boolean;
  recurringCycleLength?: number;
  recurringCyclePeriod?: string;
  recurringTotalCycles?: number;
  subscriptionDiscountPercentage?: number;
  allowCustomerReviews?: boolean;
  allowBackorder?: boolean;
  backorderMode?: string;
  attributes?: {
    id: string;
    name: string;
    value: string;
    displayName?: string;
    sortOrder?: number;
  }[];
  productType: "simple" | "grouped" | "variable";
  requireOtherProducts: boolean;
  requiredProductIds: string;
  automaticallyAddProducts: boolean;
  groupedProducts?: GroupedProduct[];
  // 🔹 optional (backend pricing helpers)
  showIndividualPrices?: boolean;
  totalIndividualPrice?: number;
  bundlePrice?: number;
  // 🔥 GROUP / BUNDLE PRICING (BACKEND DRIVEN)
  groupBundleDiscountType?: string;
  groupBundleDiscountPercentage?: number;
  groupBundleSavingsMessage?: string;
  totalSavings?: number;
  savingsPercentage?: number;
  applyDiscountToAllItems?: boolean;
  nextDayDeliveryEnabled?: boolean;
  nextDayDeliveryFree?: boolean;
  sameDayDeliveryEnabled?: boolean;
  nextDayDeliveryCutoffTime?: string;
  nextDayDeliveryCharge?: number;
  disableBuyButton?: boolean;
  disableWishlistButton?: boolean;
  excludeFromLoyaltyPoints?: boolean;
  loyaltyPointsEarnable?: number;
  loyaltyPointsMessage?: string;
  shipSeparately?: boolean;
  displayStockAvailability?: boolean;
  displayStockQuantity?: boolean;
  isPharmaProduct?: boolean;
  pharmaApprovedAt?: string;
  fakeSaleCount?: number;
  saleCount?: number;
}
interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  images: ProductImage[];
  isPublished?: boolean;
}
interface CrossSellProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number;
  images: ProductImage[];
  isPublished?: boolean;
}
interface ProductDetailsProps {
  product: Product | null;
  initialVariantId?: string | null;
}
type BreadcrumbCategory = {
  name: string;
  slug: string;
};
function buildCategoryBreadcrumb(
  categories?: Product["categories"]
): BreadcrumbCategory[] {
  if (!categories || categories.length === 0) return [];
  const map = new Map(
    categories.map(c => [c.categoryId, c])
  );
  const primary =
    categories.find(c => c.isPrimary === true) ??
    categories.sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
    )[0];
  if (!primary) return [];
  const chain: BreadcrumbCategory[] = [];
  let current: typeof primary | undefined = primary;
  while (current) {
    chain.unshift({
      name: current.categoryName,
      slug: current.categorySlug,
    });

    if (!current.parentCategoryId) break;

    current = map.get(current.parentCategoryId);
  }
  return chain;
}
const resolveBasePrice = (
  product: Product,
  variant?: Variant | null
) => {
  if (
    variant &&
    typeof variant.price === "number" &&
    variant.price > 0
  ) {
    return variant.price;
  }
  return product.price;
};

// ---------- Component ----------
const LiveCartActivityBanner = ({ activity }: { activity: { message: string, timestamp: number } | null }) => {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (activity) {
      setMsg(activity.message.replace(/^🔥\s*/, '')); // Strip generic emoji
      setShow(true);
    } else {
      setShow(false);
    }
  }, [activity]);

  return (
    <>
      <style>{`
        @keyframes heightExpand {
          0% { max-height: 0; margin-top: 0; opacity: 0; }
          100% { max-height: 60px; margin-top: 12px; opacity: 1; }
        }
        @keyframes heightCollapse {
          0% { max-height: 60px; margin-top: 12px; opacity: 1; }
          100% { max-height: 0; margin-top: 0; opacity: 0; }
        }
        @keyframes powerPop {
          0% { transform: scale(0.95) translateY(-10px); opacity: 0; filter: blur(2px); }
          50% { transform: scale(1.02) translateY(2px); opacity: 1; filter: blur(0); }
          75% { transform: scale(0.99) translateY(-1px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes powerZip {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          30% { transform: scale(1.02) translateY(2px); opacity: 1; }
          100% { transform: scale(0.95) translateY(-15px); opacity: 0; filter: blur(2px); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.15); filter: brightness(1.2); }
        }
        .outer-enter {
          animation: heightExpand 0.3s ease-out forwards;
        }
        .outer-exit {
          animation: heightCollapse 0.3s ease-in forwards;
          animation-delay: 0.2s; /* wait for inner zip out */
        }
        .inner-enter {
          animation: powerPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          animation-delay: 0.1s; /* wait slightly for container to open */
          opacity: 0; /* hidden before animation starts */
        }
        .inner-exit {
          animation: powerZip 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards;
        }
      `}</style>

      <div className={`overflow-hidden w-full ${show ? 'outer-enter' : (msg ? 'outer-exit' : 'hidden')}`}>
        <div className={`flex w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-gray-900 via-[#1f2e1d] to-[#2A3F28] px-3.5 py-2.5 shadow-[0_6px_20px_rgba(42,63,40,0.3)] border border-white/10 ${show ? 'inner-enter' : 'inner-exit'}`}>

          {/* Left Side: Icon & Message */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex h-8 w-8 items-center justify-center shrink-0" style={{ animation: 'iconPulse 1.2s infinite ease-in-out' }}>
              <div className="absolute inset-0 rounded-full bg-yellow-500 blur-[3px] opacity-40"></div>
              {/* Dark Background for Fire Icon */}
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gray-900 border border-yellow-500/40 shadow-[0_0_8px_rgba(250,204,21,0.5)] text-[14px]">
                🔥
              </div>
            </div>

            <p className="text-[13px] md:text-[14px] font-bold text-white tracking-wide drop-shadow-sm truncate">
              {msg}
            </p>
          </div>

          {/* Right Side: Professional FOMO Indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 shrink-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-red-400">
              High Demand
            </span>
          </div>

        </div>
      </div>
    </>
  );
};

// Split product description by <h2> headings into sections.
// Walks nodes ONCE (each element added as outerHTML a single time) to avoid the
// double-counting that caused massive content duplication with nested lists.
const parseByH2 = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const sections: { title: string; html: string }[] = [];
  let currentTitle = "";
  let currentHtml = "";

  const flush = () => {
    const content = currentHtml.trim();
    if (content) {
      sections.push({ title: currentTitle || "Description", html: content });
    }
    currentHtml = "";
  };

  const walk = (parent: Node) => {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();

        if (tag === "h2") {
          const heading = el.textContent?.trim() || "";
          // Ignore empty <h2> tags (e.g. <h2 id="..."></h2> junk from pasted rich text)
          // so they don't reset the current section title and split content wrongly.
          if (!heading) return;
          flush();
          currentTitle = heading;
          return;
        }

        // A wrapper that contains a NON-EMPTY <h2> descendant → descend into it so
        // nested headings still split the content (without adding the wrapper whole).
        const hasRealH2 = Array.from(el.querySelectorAll("h2")).some(
          (h) => (h.textContent?.trim() || "") !== ""
        );
        if (hasRealH2) {
          walk(el);
          return;
        }

        // Normal element with no <h2> inside → add once.
        currentHtml += el.outerHTML;
      } else if (node.nodeType === Node.TEXT_NODE) {
        currentHtml += node.textContent || "";
      }
    });
  };

  walk(doc.body);
  flush();

  return sections;
};

// Fallback: split by well-known heading phrases when the description has no <h2>.
// Handles headings written as their own bold line, <p><strong>…</strong></p>, or <h3>/<h4> etc.
const normalizeHeading = (s: string) =>
  (s || "").toLowerCase().replace(/&amp;/g, "&").replace(/[:：]\s*$/, "").replace(/\s+/g, " ").trim();

// Known section headings to split on (with common aliases)
const KNOWN_HEADINGS = new Set(
  [
    "Warnings & Side Effects", "Warnings and Side Effects", "Side Effects", "Safety Warnings", "Warnings",
    "Usage Instructions", "Directions", "Directions for use", "How to use",
    "Ingredients",
    "Delivery & Returns Policy", "Delivery and Returns Policy", "Delivery & Returns", "Delivery and Returns",
    "Product Description",
  ].map(normalizeHeading)
);

const parseByKnownHeadings = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const sections: { title: string; html: string }[] = [];
  let currentTitle = "";
  let currentHtml = "";

  const flush = () => {
    const content = currentHtml.trim();
    if (content) {
      sections.push({ title: currentTitle || "Description", html: content });
    }
    currentHtml = "";
  };

  // Returns the heading title if this element is a stand-alone known heading, else null
  const headingTitleOf = (el: Element): string | null => {
    const tag = el.tagName.toLowerCase();
    if (!["h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "p"].includes(tag)) return null;
    const norm = normalizeHeading(el.textContent || "");
    if (norm && KNOWN_HEADINGS.has(norm)) {
      return (el.textContent || "").trim().replace(/[:：]\s*$/, "");
    }
    return null;
  };

  // Does this subtree contain a known heading element? (used to descend into wrappers)
  const containsHeading = (el: Element): boolean => {
    for (const child of Array.from(el.children)) {
      if (headingTitleOf(child)) return true;
      if (containsHeading(child)) return true;
    }
    return false;
  };

  const walk = (parent: Node) => {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const title = headingTitleOf(el);
        if (title) {
          flush();
          currentTitle = title;
          return;
        }
        // Wrapper that contains headings → descend (don't add wrapper whole).
        if (el.children.length > 0 && containsHeading(el)) {
          walk(el);
          return;
        }
        currentHtml += el.outerHTML;
      } else if (node.nodeType === Node.TEXT_NODE) {
        currentHtml += node.textContent || "";
      }
    });
  };

  walk(doc.body);
  flush();

  return sections;
};

const parseDescriptionSections = (html: string) => {
  if (!html) return [];
  if (typeof window === "undefined") {
    return [{ title: "Description", html }];
  }

  // 1) Prefer splitting by <h2> headings
  if (/<h2[\s>]/i.test(html)) {
    return parseByH2(html);
  }

  // 2) No <h2> → fall back to known heading phrases
  const byHeadings = parseByKnownHeadings(html);
  if (byHeadings.length > 1) {
    return byHeadings;
  }

  // 3) Nothing to split on → single block
  return [{ title: "Description", html }];
};

export default function ProductDetails({ product, initialVariantId }: ProductDetailsProps & { initialVariantId?: string }) {
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Product unavailable</p>
      </div>
    );
  }

  const toast = useToast();
  const { addToCart, cart } = useCart();

  const router = useRouter();
  useCartActivity(product.id);
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const sliderRef = useRef<HTMLDivElement>(null);
  // Normal purchase quantity state
  const [normalQty, setNormalQty] = useState(
    product.orderMinimumQuantity ?? 1
  );
  const [normalStockError, setNormalStockError] = useState<string | null>(null);
  // Subscription purchase quantity state
  const [subscriptionQty, setSubscriptionQty] = useState(1);
  const [subscriptionStockError, setSubscriptionStockError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [thumbStart, setThumbStart] = useState(0);
  const [thumbVisible, setThumbVisible] = useState(5);
  useEffect(() => {
    const update = () => setThumbVisible(window.innerWidth < 768 ? 4 : 6);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<CrossSellProduct[]>([]);
  const shouldShowRelatedNav = relatedProducts.length > 4;
  const shouldShowCrossNav = crossSellProducts.length > 4;
  const [activeTab, setActiveTab] = useState<"description" | "delivery">("description");
  const [purchaseType, setPurchaseType] = useState<"one" | "subscription">("one");
  // Use vatRate directly from API response
  const vatRate: number | null = (product as any).vatRate ?? null;
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const descriptionSections = useMemo(() => parseDescriptionSections(product.description), [product.description]);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const toggleAccordion = useCallback((title: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const [hasPharmacyQuestions, setHasPharmacyQuestions] = useState<boolean | null>(null);

  // /app/lib/discountHelpers.ts

/**
 * Get the slug for the discount offer page
 * Returns the slug from the first active discount, or null if no discount
 */
 function getDiscountSlug(product: any): string | null {
  if (!product?.assignedDiscounts || product.assignedDiscounts.length === 0) {
    return null;
  }

  const now = new Date();

  // Find the first active discount
  const activeDiscount = product.assignedDiscounts.find((d: any) => {
    if (!d.isActive) return false;
    
    // Check if discount is active based on dates
    if (d.startDate && now < new Date(d.startDate)) return false;
    if (d.endDate && now > new Date(d.endDate)) return false;
    
    return true;
  });

  if (!activeDiscount) return null;

  // Generate slug from discount name
  // e.g., "Mega Monthly Sale" → "mega-monthly-sale"
  const slug = activeDiscount.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .trim();

  return slug || null;
}


  useEffect(() => {
    if (product.isPharmaProduct && product.id) {
      setHasPharmacyQuestions(null); // Reset before fetching
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/${product.id}/pharmacy-form`)
        .then(async res => {
          if (res.status === 404) return { success: true, data: { questions: [] } };
          if (!res.ok) throw new Error("API failed");
          const text = await res.text();
          if (!text) return { success: true, data: { questions: [] } };
          return JSON.parse(text);
        })
        .then(json => {
          if (json.success && json.data && Array.isArray(json.data.questions) && json.data.questions.length > 0) {
            setHasPharmacyQuestions(true);
          } else {
            setHasPharmacyQuestions(false);
          }
        })
        .catch(err => {
          console.error("Error fetching pharmacy form:", err);
          setHasPharmacyQuestions(false);
        });
    }
  }, [product.id, product.isPharmaProduct]);
  // 🔥 Coupon Available (but not applied)
  const hasCouponAvailable = useMemo(() => {
    if (!product.assignedDiscounts) return false;
    const now = new Date();
    return product.assignedDiscounts.some(d =>
      d.isActive &&
      d.requiresCouponCode === true &&
      new Date(d.startDate) <= now &&
      new Date(d.endDate) >= now
    );
  }, [product.assignedDiscounts]);
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : "";
  const shareTitle = product.name;
  const handleShareClick = async () => {
    const url = window.location.href;

    // ✅ Mobile → only native share
    if (window.innerWidth < 768 && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          url,
        });
      } catch {
        // user cancelled → do nothing
      }
      return;
    }

    // ✅ Desktop → custom share menu
    setShowShare((v) => !v);
  };
  const [isUKUser, setIsUKUser] = useState(false);
  useEffect(() => {
    let cancelled = false;
    detectUKRegion().then((uk) => {
      if (!cancelled) setIsUKUser(uk);
    });
    return () => { cancelled = true; };
  }, []);
  const formatUKDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [shipDate, setShipDate] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [shipPrefix, setShipPrefix] = useState<string>("Today");
  const [deliveryPrefix, setDeliveryPrefix] = useState<string>("Tomorrow");
  const [nextDayTimeLeft, setNextDayTimeLeft] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const activeNextDayDeliveryEnabled = product.productType === "variable" && selectedVariant
    ? selectedVariant.nextDayDeliveryEnabled
    : product.nextDayDeliveryEnabled;

  const activeNextDayDeliveryCutoffTime = product.productType === "variable" && selectedVariant
    ? selectedVariant.nextDayDeliveryCutoffTime
    : product.nextDayDeliveryCutoffTime;

  const activeNextDayDeliveryFree = product.productType === "variable" && selectedVariant
    ? selectedVariant.nextDayDeliveryFree
    : product.nextDayDeliveryFree;

  const activeSaleCount = product.productType === "variable" && selectedVariant
    ? selectedVariant.saleCount
    : product.saleCount;

  useEffect(() => {
    if (
      !isUKUser ||
      !activeNextDayDeliveryEnabled ||
      !activeNextDayDeliveryCutoffTime
    ) {
      setNextDayTimeLeft(null);
      setShipDate(null);
      setDeliveryDate(null);
      return;
    }
    const calculateTimeLeft = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
      const [h, m] = activeNextDayDeliveryCutoffTime!.split(":").map(Number);
      
      let targetCutoff = new Date(now);
      targetCutoff.setHours(h, m, 0, 0);
      
      let ship = new Date(now);
      let deliver = new Date(now);
      
      let shipPrefixStr = "Today";
      let deliveryPrefixStr = "Tomorrow";
      let showBanner = true;

      if (day === 5) { // Friday
        if (now < targetCutoff) {
          // Friday before 2 PM: standard today/tomorrow
          shipPrefixStr = "Today";
          deliveryPrefixStr = "Tomorrow";
          ship = new Date(now);
          deliver = new Date(now);
          deliver.setDate(deliver.getDate() + 1); // Saturday
        } else {
          // Friday after 2 PM: Target is Saturday 2 PM
          targetCutoff.setDate(targetCutoff.getDate() + 1);
          shipPrefixStr = "Sunday";
          deliveryPrefixStr = "Monday";
          ship.setDate(ship.getDate() + 2); // Sunday
          deliver.setDate(deliver.getDate() + 3); // Monday
        }
      } else if (day === 6) { // Saturday
        if (now < targetCutoff) {
          // Saturday before 2 PM: Target is Saturday 2 PM (today)
          shipPrefixStr = "Sunday";
          deliveryPrefixStr = "Monday";
          ship.setDate(ship.getDate() + 1); // Sunday
          deliver.setDate(deliver.getDate() + 2); // Monday
        } else {
          // Saturday after 2 PM: Target is Monday 2 PM
          targetCutoff.setDate(targetCutoff.getDate() + 2); // Monday
          shipPrefixStr = "Monday";
          deliveryPrefixStr = "Tuesday";
          ship.setDate(ship.getDate() + 2); // Monday
          deliver.setDate(deliver.getDate() + 3); // Tuesday
        }
      } else if (day === 0) { // Sunday
        // Sunday: Target is Monday 2 PM
        targetCutoff.setDate(targetCutoff.getDate() + 1); // Monday
        shipPrefixStr = "Monday";
        deliveryPrefixStr = "Tuesday";
        ship.setDate(ship.getDate() + 1); // Monday
        deliver.setDate(deliver.getDate() + 2); // Tuesday
      } else {
        // Monday to Thursday
        if (now >= targetCutoff) {
          // After cutoff: roll forward to tomorrow's cutoff (ship tomorrow, deliver day after)
          targetCutoff.setDate(targetCutoff.getDate() + 1);
          shipPrefixStr = "Tomorrow";
          deliveryPrefixStr = "Day After";
          ship.setDate(ship.getDate() + 1);
          deliver.setDate(deliver.getDate() + 2);
          if (deliver.getDay() === 0) deliver.setDate(deliver.getDate() + 1); // Skip Sunday
        } else {
          shipPrefixStr = "Today";
          deliveryPrefixStr = "Tomorrow";
          ship = new Date(now);
          deliver = new Date(now);
          deliver.setDate(deliver.getDate() + 1);
          if (deliver.getDay() === 0) deliver.setDate(deliver.getDate() + 1); // Skip Sunday
        }
      }

      if (!showBanner) {
        setNextDayTimeLeft(null);
        setShipDate(null);
        setDeliveryDate(null);
        return;
      }

      const diffMs = targetCutoff.getTime() - now.getTime();
      if (diffMs <= 0) {
        setNextDayTimeLeft(null);
        setShipDate(null);
        setDeliveryDate(null);
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      setNextDayTimeLeft(
        `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`
      );
      setShipPrefix(shipPrefixStr);
      setDeliveryPrefix(deliveryPrefixStr);
      setShipDate(formatUKDate(ship));
      setDeliveryDate(formatUKDate(deliver));
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60_000);
    return () => clearInterval(interval);
  }, [
    isUKUser,
    activeNextDayDeliveryEnabled,
    activeNextDayDeliveryCutoffTime,
  ]);
  // 🔥 PHARMA MODAL STATE
  const [showPharmaModal, setShowPharmaModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const pharmaApprovedRef = useRef(false);
  const [hasPharmaQuestions, setHasPharmaQuestions] = useState<boolean | null>(null);

  useEffect(() => {
    if (!product || !product.isPharmaProduct) {
      setHasPharmaQuestions(false);
      return;
    }

    const checkPharmaQuestions = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products/${product.id}/pharmacy-form`
        );
        if (res.ok) {
          const json = await res.json();
          const qs = json?.data?.questions || [];
          setHasPharmaQuestions(qs.length > 0);
        } else {
          setHasPharmaQuestions(true); // default to true on error to be safe
        }
      } catch (error) {
        console.error("Error fetching pharmacy questions check:", error);
        setHasPharmaQuestions(true); // default to true on error to be safe
      }
    };

    checkPharmaQuestions();
  }, [product.id, product.isPharmaProduct]);

  const handlePharmaGuard = (action: "cart" | "buy") => {
    // ✅ already approved → skip guard
    if (pharmaApprovedRef.current) {
      return true;
    }
    if (product.isPharmaProduct && hasPharmaQuestions !== false) {
      setPendingAction(action);
      setShowPharmaModal(true);
      return false;
    }
    return true;
  };
  // 🔹 GROUPED PRODUCT FLAGS
  const isGroupedProduct =
    product.productType === "grouped" &&
    product.requireOtherProducts === true;
  // 🔹 REQUIRED PRODUCT IDS (backend string → array)
  const requiredProductIds = useMemo(() => {
    if (!product.requiredProductIds) return [];
    return product.requiredProductIds.split(",").map(id => id.trim());
  }, [product.requiredProductIds]);
  // 🔥 BUNDLE TOTALS (QUANTITY AWARE)
  const bundleIndividualTotal = useMemo(() => {
    if (!product.groupedProducts) return 0;
    return product.groupedProducts.reduce(
      (sum, gp) => sum + gp.price * normalQty,
      0
    );
  }, [product.groupedProducts, normalQty]);

  const bundleTotalPrice = useMemo(() => {
    if (!product.groupedProducts) return 0;
    return product.groupedProducts.reduce(
      (sum, gp) => sum + (gp.bundlePrice ?? gp.price) * normalQty,
      0
    );
  }, [product.groupedProducts, normalQty]);
  const bundleTotalSavings = bundleIndividualTotal - bundleTotalPrice;
  // Discount & coupon states
  const [highlightReviewId, setHighlightReviewId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AssignedDiscount | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(() => product?.price ?? 0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const viewItemTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${product.id}:${selectedVariant?.id ?? "base"}`;
    if (viewItemTrackedRef.current === signature) return;

    viewItemTrackedRef.current = signature;
    trackViewItem(product, selectedVariant);
  }, [product, product.id, selectedVariant]);
  // 🔥 GROUP LEVEL TOGGLE (single source of truth)
  const [groupEnabled, setGroupEnabled] = useState<boolean>(() => {
    return product.automaticallyAddProducts ? true : true;
  });
  const [groupedSelections, setGroupedSelections] = useState<{
    [productId: string]: {
      selected: boolean;
      quantity: number;
    };
  }>({});
  // 🔥 GROUPED STOCK AWARE MAX QTY
  const groupedMaxQty = useMemo(() => {
    if (
      !isGroupedProduct ||
      !groupEnabled ||
      !product.groupedProducts
    ) {
      return (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
    }
    const selectedGrouped = product.groupedProducts.filter(
      gp => groupedSelections[gp.productId]?.selected
    );
    if (selectedGrouped.length === 0) {
      return (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
    }
    const minGroupedStock = Math.min(
      ...selectedGrouped.map(gp => gp.stockQuantity ?? Infinity)
    );
    const mainStock =
      (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
    return Math.min(mainStock, minGroupedStock);
  }, [
    isGroupedProduct,
    groupEnabled,
    product.groupedProducts,
    groupedSelections,
    selectedVariant,
    product.stockQuantity,
  ]);

  useEffect(() => {
    if (!isGroupedProduct || !groupEnabled) return;
    setGroupedSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(pid => {
        updated[pid] = {
          ...updated[pid],
          quantity: Math.min(normalQty, groupedMaxQty),
        };
      });
      return updated;
    });
  }, [normalQty, groupedMaxQty, isGroupedProduct, groupEnabled]);
  const pathname = usePathname();
  useEffect(() => {
    if (!product?.variants || product.variants.length === 0) return;

    // current slug from URL
    const currentSlug = pathname.split("/product/")[1];

    if (!currentSlug) return;

    // find matching variant
    const matchedVariant = product.variants.find(
      (v) => v.slug === currentSlug
    );

    if (!matchedVariant) return;

    // 🔥 prevent unnecessary re-renders
    if (selectedVariant?.id === matchedVariant.id) return;

    // ✅ update state from URL
    setSelectedVariant(matchedVariant);
    setSelectedOptions({
      option1: matchedVariant.option1Value,
      option2: matchedVariant.option2Value,
      option3: matchedVariant.option3Value,
    });

  }, [pathname, product.variants]);
  // GENERIC dynamic selected options
  const [selectedOptions, setSelectedOptions] = useState<{
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  }>({});
  // Currently selected variant
  useEffect(() => {
    if (!initialVariantId) return;
    if (product.variants && product.variants.length > 0) {
      const v = product.variants.find(x => x.id === initialVariantId);

      if (v) {
        setSelectedVariant(v);
        setSelectedOptions({
          option1: v.option1Value,
          option2: v.option2Value,
          option3: v.option3Value,
        });
      }
    }
  }, [initialVariantId, product]);
  // 🎁 LOYALTY POINTS (PRODUCT + VARIANT AWARE)
  const loyaltyPoints = useMemo(() => {
    // ❌ Globally disabled
    if (product.excludeFromLoyaltyPoints) return null;
    // ✅ Variant priority
    if (selectedVariant?.loyaltyPointsEarnable) {
      return selectedVariant.loyaltyPointsEarnable;
    }
    // ✅ Product fallback
    if (product.loyaltyPointsEarnable) {
      return product.loyaltyPointsEarnable;
    }
    return null;
  }, [product.excludeFromLoyaltyPoints, product.loyaltyPointsEarnable, selectedVariant]);

  useEffect(() => {
    if (!isGroupedProduct || !product.groupedProducts) return;

    const initialState: {
      [productId: string]: { selected: boolean; quantity: number };
    } = {};

    product.groupedProducts.forEach(gp => {
      initialState[gp.productId] = {
        selected: product.automaticallyAddProducts ? true : groupEnabled,
        quantity: 1,
      };
    });
    setGroupedSelections(initialState);
  }, [isGroupedProduct, product, groupEnabled]);

  useEffect(() => {
    if (product.automaticallyAddProducts) {
      setGroupEnabled(true);
    }
  }, [product.automaticallyAddProducts]);
  const relatedSwiperRef = useRef<any>(null);
  const crossSwiperRef = useRef<any>(null);
  // Update URL WITHOUT re-triggering auto-select
  const updateVariantInUrl = useCallback(
    (variant: Variant) => {
      const newPath = `/product/${variant.slug}`;
      if (pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    },
    [pathname]
  );
  // 🔹 Reviews for PDP hover tooltip
  const [reviews, setReviews] = useState<Review[]>([]);
  // SKU used to filter reviews to the current scent/variant (backend does base-family matching).
  const reviewSku = (selectedVariant?.sku && selectedVariant.sku.trim()) || (product.sku && product.sku.trim()) || "";
  useEffect(() => {
    if (!product?.id) return;
    const skuParam = reviewSku ? `?sku=${encodeURIComponent(reviewSku)}` : "";
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ProductReviews/product/${product.id}${skuParam}`)
      .then(res => res.json())
      .then(json => {
        setReviews(json?.data ?? []);
      })
      .catch(() => { });
  }, [product.id, reviewSku]);
  const recentReviews = useMemo(
    () => getRecentApprovedReviews(reviews),
    [reviews]
  );
  // Variant/scent-specific rating + count, computed from the filtered reviews.
  const approvedReviews = useMemo(
    () => reviews.filter((r) => r.isApproved),
    [reviews]
  );
  const variantReviewCount = approvedReviews.length;
  const variantAverageRating = useMemo(
    () => (approvedReviews.length > 0
      ? approvedReviews.reduce((s, r) => s + (r.rating || 0), 0) / approvedReviews.length
      : 0),
    [approvedReviews]
  );
  //Recently viewed
  useEffect(() => {
    addRecentlyViewed(product.id);
  }, [product.id]);
  // ---- DEFAULT VARIANT AUTO SELECT ----
  useEffect(() => {
    // ⛔ If URL provided variant ID → do NOT auto load default
    if (initialVariantId && product.variants && product.variants.length > 0) {
      return;
    }
    // ⛔ If selectedVariant already set → do NOT override
    if (selectedVariant) return;
    // ⛔ No variants → do nothing
    if (!product.variants || product.variants.length === 0) return;
    // ✅ Safe load default on first page only
    let def = product.variants.find(v => v.isDefault);
    if (!def) {
      const inStockVariants = product.variants.filter(v => v.stockQuantity > 0);
      if (inStockVariants.length > 0) {
        def = [...inStockVariants].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
      } else {
        def = [...product.variants].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
      }
    }
    setSelectedVariant(def);
    setSelectedOptions({
      option1: def.option1Value ?? null,
      option2: def.option2Value ?? null,
      option3: def.option3Value ?? null,
    });

  }, [product.variants, selectedVariant, initialVariantId]);

  useEffect(() => {
    // if URL already has initialVariant → do NOT update URL
    if (initialVariantId) return;
    // if variant not loaded yet → wait
    if (!selectedVariant) return;
    // push slug to URL (first load only)
    if (selectedVariant.slug) {
      window.history.replaceState(null, '', `/product/${selectedVariant.slug}`);
    }
  }, [selectedVariant, initialVariantId]);
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
    // 🔥 OPTION-C (FINAL): auto pick closest valid FULL variant (works for 1/2/3 options)
    const autoMatch = product.variants
      ?.filter(v =>
        (!updated.option1 || v.option1Value === updated.option1) &&
        (!updated.option2 || v.option2Value === updated.option2) &&
        (!updated.option3 || v.option3Value === updated.option3)
      )
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0];

    if (autoMatch) {
      setSelectedOptions({
        option1: autoMatch.option1Value ?? null,
        option2: autoMatch.option2Value ?? null,
        option3: autoMatch.option3Value ?? null,
      });

      setSelectedVariant(autoMatch);
      setNormalQty(product.orderMinimumQuantity ?? 1);
      updateVariantInUrl(autoMatch);
    }
  };
  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0);
    setNormalQty(product.orderMinimumQuantity ?? 1);
    setShowImageModal(false);
    setActiveTab("description");
    setRelatedProducts([]);
    setOpenAccordions({});
    setCouponCode("");
    setAppliedCoupon(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);
  // ✅ HANDLE URL HASH (#reviews) → EMAIL / DIRECT LINK SUPPORT
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.location.hash === "#reviews") {
      const scrollToReviews = () => {
        const el = document.getElementById("reviews-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      };

      // 🔥 double attempt (important for SSR + hydration timing)
      setTimeout(scrollToReviews, 300);
      setTimeout(scrollToReviews, 800);
    }
  }, [product.id]);
  const basePrice = useMemo(() => {
    if (product.productType === "variable" && selectedVariant && typeof selectedVariant.price === "number" && selectedVariant.price > 0) {
      return selectedVariant.price;
    }
    return product?.price ?? 0;
  }, [selectedVariant, product]);
  const activeAutoDiscount = useMemo(() => {
    if (!product.assignedDiscounts) return null;

    const now = new Date();

    return product.assignedDiscounts.find(
      d =>
        d.isActive &&
        d.requiresCouponCode === false &&
        new Date(d.startDate) <= now &&
        new Date(d.endDate) >= now
    ) ?? null;
  }, [product.assignedDiscounts]);
  const isStackedDiscount = useMemo(() => {
    if (!appliedCoupon) return false;
    if (!activeAutoDiscount) return false;
    return appliedCoupon.isCumulative === true;
  }, [appliedCoupon, activeAutoDiscount]);
  const autoDiscountedPrice = useMemo(() => {
    return getDiscountedPrice(product, basePrice);
  }, [product, basePrice]);

  // 🔥 OLD PRICE/CUT PRICE LOGIC (Requirement Based)
  let oldPriceValue: number | undefined = undefined;
  if (product.productType === "variable" && selectedVariant) {
    // Variant product: show compareAtPrice only
    oldPriceValue = selectedVariant.compareAtPrice ?? undefined;
  } else {
    // Simple product: show oldPrice only
    oldPriceValue = product.oldPrice ?? undefined;
  }

  const currentDisplayType =
    (product.productType === "variable" && selectedVariant?.compareAtPrice ? "OldPrice" : undefined) ??
    (product.productType === "variable" ? selectedVariant?.displayDiscountType : undefined) ??
    product.displayDiscountType ??
    "None";

  const currentSystemDiscountAmount =
    (product.productType === "variable" ? selectedVariant?.systemDiscountAmount : undefined) ??
    product.systemDiscountAmount ??
    0;

  const oldPriceData =
    currentDisplayType === "OldPrice"
      ? getOldPriceDiscount(
        basePrice,
        oldPriceValue,
        false
      )
      : null;
  // ✅ STOCK (variant aware)
  const stock = useMemo(() => {
    return (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity ?? 0;
  }, [selectedVariant, product.stockQuantity, product.productType]);
  // ✅ STOCK DISPLAY LOGIC (backend driven)
  const stockDisplay = useMemo(() => {
    // ❌ Always dominant
    if (stock === 0) {
      return {
        show: false, // 🔥 HIDE BADGE
        text: "",
        type: "out",
      };
    }
    // ✅ Exact quantity has highest priority
    if (product.displayStockQuantity === true) {
      if (stock <= 5) {
        return {
          show: true,
          text: `Only ${stock} left`,
          type: "low",
        };
      }
      return {
        show: true,
        text: `${stock} available`,
        type: "in",
      };
    }
    // ✅ Generic availability
    if (product.displayStockAvailability === true) {
      return {
        show: true,
        text: "In Stock",
        type: "in",
      };
    }
    // ❌ Nothing to show
    return {
      show: false,
      text: "",
      type: "none",
    };
  }, [
    stock,
    product.displayStockAvailability,
    product.displayStockQuantity,
  ]);
  // ✅ BACKORDER UI STATE (single source of truth)
  const backorderState = useMemo(() => {
    return getBackorderUIState({
      stock,
      allowBackorder: product.allowBackorder,
      backorderMode: product.backorderMode,
    });
  }, [stock, product.allowBackorder, product.backorderMode]);

  // 🔥 FINAL PRICE CALCULATION (Single Source of Truth)
  // 🔥 FINAL PRICE CALCULATION (Single Source of Truth)
  useEffect(() => {

    // 🥇 COUPON APPLIED
    if (appliedCoupon) {

      let autoAmount = 0;

      // check auto discount
      if (activeAutoDiscount) {
        if (activeAutoDiscount.usePercentage) {
          autoAmount = (basePrice * activeAutoDiscount.discountPercentage) / 100;
        } else {
          autoAmount = activeAutoDiscount.discountAmount;
        }
      }

      // coupon discount from backend
      const couponAmount = appliedCoupon.discountAmount;

      let totalDiscount = couponAmount;

      // 🔥 CUMULATIVE LOGIC
      if (appliedCoupon.isCumulative && activeAutoDiscount) {
        totalDiscount = couponAmount + autoAmount;
      }

      const final = +(basePrice - totalDiscount).toFixed(2);

      setFinalPrice(final);
      setDiscountAmount(+totalDiscount.toFixed(2));
      return;
    }

    // 🥈 AUTO DISCOUNT ONLY
    if (activeAutoDiscount) {
      let autoAmount = 0;

      if (activeAutoDiscount.usePercentage) {
        autoAmount = (basePrice * activeAutoDiscount.discountPercentage) / 100;
      } else {
        autoAmount = activeAutoDiscount.discountAmount;
      }

      const autoFinal = +(basePrice - autoAmount).toFixed(2);

      setFinalPrice(autoFinal);
      setDiscountAmount(+autoAmount.toFixed(2));
      return;
    }

    // 🥉 NO DISCOUNT
    setFinalPrice(basePrice);
    setDiscountAmount(0);

  }, [basePrice, appliedCoupon, activeAutoDiscount]);

  const allRequiredSelected = useMemo(() => {
    if (!isGroupedProduct) return true;
    return requiredProductIds.every(
      id => groupedSelections[id]?.selected === true
    );
  }, [isGroupedProduct, requiredProductIds, groupedSelections]);
  // Fetch related products
  useEffect(() => {
    const primaryCategoryId = product.categories?.find(c => c.isPrimary)?.categoryId ?? product.categories?.[0]?.categoryId;
    if (primaryCategoryId) {
      fetchRelatedProducts(primaryCategoryId);
    }
  }, [product.id]);
  // Fetch cross-sell products
  useEffect(() => {
    if (product.crossSellProductIds) {
      fetchCrossSellProducts(product.crossSellProductIds);
    }
  }, [product.crossSellProductIds]);

  const fetchRelatedProducts = async (categoryId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Products?categoryId=${categoryId}&stockStatus=InStock&isPublished=true&pageSize=22`,
        {
          next: { revalidate: 60 }
        }
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch related products: ${res.status}`);
      }
      const result = await res.json();
      if (result.success && result.data && Array.isArray(result.data.items)) {
        const filtered = result.data.items
          .filter((p: any) => p.id !== product.id && p.isPublished === true)
          .slice(0, 20);
        setRelatedProducts(filtered);
      } else if (result.success && Array.isArray(result.data)) {
        const filtered = result.data
          .filter((p: any) => p.id !== product.id && p.isPublished === true)
          .slice(0, 20);
        setRelatedProducts(filtered);
      }
    } catch (error) {
      console.error("Error fetching related products:", error);
    }
  };
  // Fetch cross-sell products
  const fetchCrossSellProducts = async (crossIds: string) => {
    try {
      const ids = crossIds.split(',').map(id => id.trim());
      const promises = ids.slice(0, 8).map(id =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Products/${id}`, {
          next: { revalidate: 60 }
        }).then(res => res.json())
      );
      const results = await Promise.all(promises);
      const validProducts = results
        .filter((r: any) => r.success && r.data?.isPublished === true)
        .map((r: any) => r.data);
      setCrossSellProducts(
        validProducts.filter(
          (p: any, index: number, self: any[]) => index === self.findIndex(x => x.id === p.id)
        )
      );
    } catch (error) {
      console.error("Error fetching cross-sell products:", error);
    }
  };
  const hasOutOfStockGroupedProduct = useMemo(() => {
    if (!isGroupedProduct || !product.groupedProducts) return false;
    return product.groupedProducts.some(
      gp => gp.stockQuantity !== undefined && gp.stockQuantity <= 0
    );
  }, [isGroupedProduct, product.groupedProducts]);
  useEffect(() => {
    if (hasOutOfStockGroupedProduct) {
      setGroupEnabled(false);
    }
  }, [hasOutOfStockGroupedProduct]);

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
  const sortedImages = useMemo(() => {
    const baseImages = [...(product.images ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    // 🔥 If variant selected & has image → inject as first thumbnail
    if (selectedVariant?.imageUrl) {
      return [
        {
          id: `variant-${selectedVariant.id}`,
          imageUrl: selectedVariant.imageUrl,
          altText: product.name,
          sortOrder: -1,
          isMain: true,
        },
        ...baseImages.filter(
          img => img.imageUrl !== selectedVariant.imageUrl
        ),
      ];
    }
    // Default product images
    const mainIndex = baseImages.findIndex(img => img.isMain);
    if (mainIndex > 0) {
      const [mainImg] = baseImages.splice(mainIndex, 1);
      baseImages.unshift(mainImg);
    }
    return baseImages;
  }, [product.images, selectedVariant, product.name]);

  const activeMainImage = useMemo(() => {
    return getImageUrl(sortedImages[selectedImage]?.imageUrl);
  }, [sortedImages, selectedImage, getImageUrl]);

  const videoList = useMemo(() => {
    if (!product.videoUrls) return [];
    const urls = typeof product.videoUrls === "string"
      ? product.videoUrls.split(",").map(u => u.trim()).filter(Boolean)
      : Array.isArray(product.videoUrls)
      ? (product.videoUrls as string[]).filter(Boolean)
      : [];
    return urls.map(url => {
      let videoId = "";
      try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be")) {
          videoId = u.pathname.slice(1).split("?")[0];
        } else if (u.hostname.includes("youtube.com")) {
          videoId = u.searchParams.get("v") || u.pathname.split("/").pop() || "";
        }
      } catch {}
      return { url, videoId, embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1` : "" };
    }).filter(v => v.videoId);
  }, [product.videoUrls]);

  useEffect(() => {
    if (selectedVariant?.imageUrl) {
      setSelectedImage(0);
      setThumbStart(0);
    }
  }, [selectedVariant]);

  useEffect(() => {
    setThumbStart(0);
  }, [sortedImages]);
  const handleThumbPrev = () => {
    setThumbStart(prev => Math.max(prev - 1, 0));
  };
  const handleThumbNext = () => {
    setThumbStart(prev =>
      Math.min(prev + 1, sortedImages.length - thumbVisible)
    );
  };


  // Handlers
  const handleRelatedProductClick = useCallback((slug: string) => {
    router.push(`/product/${slug}`);
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
    // 🔥 PHARMA GUARD
    if (product.isPharmaProduct && !pharmaApprovedRef.current && hasPharmaQuestions !== false) {
      setPendingAction("cart");
      setShowPharmaModal(true);
      return;
    }
    const selected = selectedVariant ?? null;
    // ============================
    // ⭐ EXISTING CART QTY CHECK
    // ============================
    const existingCartQty = cart
      .filter(
        (c) =>
          c.productId === product.id &&
          (c.variantId ?? null) === (selected?.id ?? null)
      )
      .reduce((sum, c) => sum + (c.quantity ?? 0), 0);

    const stockQty =
      selected?.stockQuantity ?? product.stockQuantity ?? 0;

    if (existingCartQty + normalQty > stockQty) {
      toast.error(
        `You can add only  ${stockQty - existingCartQty} item in your cart`
      );
      return;
    }

    const mainMin = product.orderMinimumQuantity ?? 1;

    // 🔥 MAX ORDER CHECK (IMPORTANT FIX)
    const mainMax = product.orderMaximumQuantity ?? Infinity;

    if (existingCartQty + normalQty > mainMax) {
      toast.error(`Maximum order quantity is ${mainMax}`);
      return;
    }

    if (normalQty < mainMin) {
      toast.error(`Minimum order quantity is ${mainMin}`);
      return;
    }
    if (normalQty > mainMax) {
      toast.error(`Maximum order quantity is ${mainMax}`);
      return;
    }
    // ⭐ GROUPED PRODUCTS STOCK VALIDATION
    if (isGroupedProduct && groupEnabled && product.groupedProducts) {
      const selectedGrouped = product.groupedProducts.filter(
        gp => groupedSelections[gp.productId]?.selected
      );

      const insufficient = selectedGrouped.find(
        gp => (gp.stockQuantity ?? 0) < normalQty
      );
      if (insufficient) {
        toast.error(
          `${insufficient.name} has only ${insufficient.stockQuantity} items available`
        );
        return;
      }
    }
    // BASE + FINAL PRICE
    const basePrice = resolveBasePrice(product, selected);
    const final = finalPrice;
    const variantText = product.productType === "variable" ? [
      selected?.option1Value,
      selected?.option2Value,
      selected?.option3Value,
    ]
      .filter(Boolean)
      .join(", ") : "";

    const variantTitle = variantText
      ? `(${variantText})`
      : "";
    const allowNextDay =
      isUKUser && product.nextDayDeliveryEnabled === true;
    // 🔥 SPLIT QTY BETWEEN BUNDLE & STANDALONE
    const bundleQty =
      isGroupedProduct && groupEnabled
        ? normalQty
        : 0;

    const standaloneQty =
      isGroupedProduct && groupEnabled
        ? normalQty - bundleQty
        : normalQty;
    // 🧩 1️⃣ ADD BUNDLE (PARENT + CHILDREN)
    if (bundleQty > 0) {
      // 🔥 UNIQUE INSTANCE ID (per add-to-cart click)
      const bundleInstanceId = crypto.randomUUID();
      const bundleId = `bundle:${product.id}:${selected?.id ?? "base"}`;
      // 🔹 BUNDLE PARENT (MAIN PRODUCT)
      addToCart({
        id: bundleId,
        type: "one-time",
        purchaseContext: "bundle",
        productId: product.id,
        variantId: selected?.id ?? null,
        name: `${product.name} ${variantTitle} (Bundle)`,
        // keep `price` as base/original to avoid double-discounting after refresh
        price: basePrice,
        priceBeforeDiscount: basePrice,
        finalPrice: final,
        discountAmount:
          currentDisplayType === "System" || appliedCoupon
            ? discountAmount ?? 0
            : 0,
        oldPrice: oldPriceValue ?? undefined,

        displayDiscountType: currentDisplayType,

        hasSystemDiscount:
          selectedVariant?.hasSystemDiscount ??
          product.hasSystemDiscount ??
          false,

        systemDiscountAmount:
          currentSystemDiscountAmount,
        couponCode: appliedCoupon?.couponCode ?? null,
        appliedDiscountId: appliedCoupon?.id ?? null,
        quantity: bundleQty,
        sku: selected?.sku ?? product.sku,
        slug: product.slug,
        vatRate: vatRate,
        vatIncluded: vatRate !== null,
        image: selected?.imageUrl
          ? getImageUrl(selected.imageUrl)
          : getImageUrl(
            product.images.find(img => img.isMain)?.imageUrl ||
            product.images[0]?.imageUrl
          ),
        variantOptions: {
          ...(selected?.option1Name && {
            [selected.option1Name]: selected.option1Value,
          }),
          ...(selected?.option2Name && {
            [selected.option2Name]: selected.option2Value,
          }),
          ...(selected?.option3Name && {
            [selected.option3Name]: selected.option3Value,
          }),
        },
        nextDayDeliveryEnabled: product.nextDayDeliveryEnabled ?? false,
        sameDayDeliveryEnabled: product.sameDayDeliveryEnabled ?? false,
        isBundleParent: true,
        bundleId,
        bundleInstanceId,
        productData: JSON.parse(JSON.stringify(product)),
      });
      // 🔹 BUNDLE CHILD PRODUCTS
      product.groupedProducts?.forEach(gp => {
        const state = groupedSelections[gp.productId];
        if (!state?.selected) return;
        addToCart({
          id: `bundle-child:${bundleId}:${gp.productId}`,
          type: "one-time",
          purchaseContext: "bundle",
          productId: gp.productId,
          parentProductId: product.id,
          bundleId,
          bundleParentId: bundleId,
          bundleParentInstanceId: bundleInstanceId, // 🔥 NEW       
          name: gp.name,
          price: gp.bundlePrice ?? gp.price,
          finalPrice: gp.bundlePrice ?? gp.price,
          quantity: bundleQty,
          sku: gp.sku,
          slug: gp.slug || "",
          image: gp.mainImageUrl
            ? gp.mainImageUrl.startsWith("http")
              ? gp.mainImageUrl
              : `${process.env.NEXT_PUBLIC_API_URL}${gp.mainImageUrl}`
            : "/placeholder-product.png",
          hasBundleDiscount: gp.hasBundleDiscount,
          individualSavings: gp.individualSavings,
          shipSeparately: product.shipSeparately,
          productData: JSON.parse(JSON.stringify(gp)),
        });
      });
    }
    // 🧍 2️⃣ ADD STANDALONE PRODUCT
    if (standaloneQty > 0) {
      addToCart({
        id: `standalone:${product.id}:${selected?.id ?? "base"}`,
        type: "one-time",
        purchaseContext: "standalone",
        productId: product.id,
        variantId: selected?.id ?? null,
        name: `${product.name} ${variantTitle}`,
        // keep `price` as base/original to avoid double-discounting after refresh
        price: basePrice,
        priceBeforeDiscount: basePrice,
        finalPrice: final,
        discountAmount:
          currentDisplayType === "System" || appliedCoupon
            ? discountAmount ?? 0
            : 0,
        oldPrice: oldPriceValue ?? undefined,

        displayDiscountType: currentDisplayType,

        hasSystemDiscount:
          selectedVariant?.hasSystemDiscount ??
          product.hasSystemDiscount ??
          false,

        systemDiscountAmount:
          currentSystemDiscountAmount,
        couponCode: appliedCoupon?.couponCode ?? null,
        appliedDiscountId: appliedCoupon?.id ?? null,
        quantity: standaloneQty,
        vatRate: vatRate,
        vatIncluded: vatRate !== null,
        sku: selected?.sku ?? product.sku,
        slug: product.slug || "",
        image: selected?.imageUrl
          ? getImageUrl(selected.imageUrl)
          : getImageUrl(
            product.images.find(img => img.isMain)?.imageUrl ||
            product.images[0]?.imageUrl
          ),
        variantOptions: {
          ...(selected?.option1Name && {
            [selected.option1Name]: selected.option1Value,
          }),
          ...(selected?.option2Name && {
            [selected.option2Name]: selected.option2Value,
          }),
          ...(selected?.option3Name && {
            [selected.option3Name]: selected.option3Value,
          }),
        },
        shipSeparately: product.shipSeparately,
        nextDayDeliveryEnabled: (product.productType === "variable" && selected ? selected.nextDayDeliveryEnabled : product.nextDayDeliveryEnabled) ?? false,
        nextDayDeliveryFree: (product.productType === "variable" && selected ? selected.nextDayDeliveryFree : product.nextDayDeliveryFree) ?? false,
        sameDayDeliveryEnabled: product.sameDayDeliveryEnabled ?? false,

        productData: JSON.parse(JSON.stringify(product)),
      });
    }
    trackAddToCart({
      productId: product.id,
      name: `${product.name}${variantTitle}`,
      sku: selected?.sku ?? product.sku,
      finalPrice: final,
      price: final,
      quantity: normalQty,
      categories: product.categories,
      variantId: selected?.id ?? null,
      variantOptions: {
        option1: selected?.option1Value ?? null,
        option2: selected?.option2Value ?? null,
        option3: selected?.option3Value ?? null,
      },
    });

    toast.success(
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {normalQty} × {product.name} added to cart!
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.clearAll();
            router.push("/cart");
          }}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white text-[#445D41] hover:bg-black hover:text-white transition shadow-sm"
        >
          Cart→
        </button>
      </div>
    );
  }, [
    addToCart,
    normalQty,
    groupedMaxQty,
    product,
    selectedVariant,
    finalPrice,
    discountAmount,
    appliedCoupon,
    getImageUrl,
    toast,
    groupedSelections,
    isGroupedProduct,
    groupEnabled,
    isUKUser,
    vatRate,
  ]);
  const handleBuyNow = () => {
    // 🔥 PHARMA GUARD
    if (product.isPharmaProduct && !pharmaApprovedRef.current && hasPharmaQuestions !== false) {
      setPendingAction("buy");
      setShowPharmaModal(true);
      return;
    }
    const selected = selectedVariant ?? null;
    const stockQty = selected?.stockQuantity ?? product.stockQuantity ?? 0;
    const mainMin = product.orderMinimumQuantity ?? 1;
    const mainMax = product.orderMaximumQuantity ?? Infinity;
    if (normalQty < mainMin) {
      toast.error(`Minimum order quantity is ${mainMin}`);
      return;
    }

    if (normalQty > mainMax) {
      toast.error(`Maximum order quantity is ${mainMax}`);
      return;
    }
    if (normalQty > stockQty) {
      toast.error(`Only ${stockQty} items available`);
      return;
    }
    if (isGroupedProduct && groupEnabled && product.groupedProducts) {
      const selectedGrouped = product.groupedProducts.filter(
        gp => groupedSelections[gp.productId]?.selected
      );
      const insufficient = selectedGrouped.find(
        gp => (gp.stockQuantity ?? 0) < normalQty
      );
      if (insufficient) {
        toast.error(
          `${insufficient.name} has only ${insufficient.stockQuantity} items available`
        );
        return;
      }
    }
    const basePrice = resolveBasePrice(product, selected);
    const final = finalPrice;
    const allowNextDay =
      isUKUser && (product.productType === "variable" && selected ? selected.nextDayDeliveryEnabled : product.nextDayDeliveryEnabled) === true;
    const buyNowItem = {
      id: `${product.id}-${selected?.id ?? "base"}-one`,
      type: "one-time",
      productId: product.id,
      name: `${product.name}${selected &&
        [
          selected.option1Value,
          selected.option2Value,
          selected.option3Value,
        ]
          .filter(Boolean)
          .join(", ")
        ? ` (${[
          selected.option1Value,
          selected.option2Value,
          selected.option3Value,
        ]
          .filter(Boolean)
          .join(", ")})`
        : ""
        }`,
      // keep `price` as base/original to avoid double-discounting after refresh
      price: basePrice,
      priceBeforeDiscount: basePrice,
      finalPrice: final,
      discountAmount:
        currentDisplayType === "System" || appliedCoupon
          ? discountAmount ?? 0
          : 0,
      oldPrice: oldPriceValue ?? undefined,

      displayDiscountType: currentDisplayType,

      hasSystemDiscount:
        selectedVariant?.hasSystemDiscount ??
        product.hasSystemDiscount ??
        false,

      systemDiscountAmount:
        currentSystemDiscountAmount,
      quantity: normalQty,
      vatRate: vatRate,
      vatIncluded: vatRate !== null,
      image: selected?.imageUrl
        ? getImageUrl(selected.imageUrl)
        : getImageUrl(product.images[0]?.imageUrl),
      sku: selected?.sku ?? product.sku,
      variantId: selected?.id ?? null,
      slug: product.slug,
      variantOptions: {
        ...(selected?.option1Name && {
          [selected.option1Name]: selected.option1Value,
        }),
        ...(selected?.option2Name && {
          [selected.option2Name]: selected.option2Value,
        }),
        ...(selected?.option3Name && {
          [selected.option3Name]: selected.option3Value,
        }),
      },
      nextDayDeliveryEnabled: (product.productType === "variable" && selected ? selected.nextDayDeliveryEnabled : product.nextDayDeliveryEnabled) ?? false,
      // 🔥🔥🔥 MOST IMPORTANT FIX
      // 🔥 FINAL CORRECT
      nextDayDeliveryFree:
        (product.productType === "variable" && selected ? selected.nextDayDeliveryFree : product.nextDayDeliveryFree) ?? false,
      sameDayDeliveryEnabled: product.sameDayDeliveryEnabled ?? false,
      productData: JSON.parse(JSON.stringify(product)),
    };
    sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
    if (!isAuthenticated) {
      router.push("/account?from=buy-now");
    } else {
      router.push("/checkout");
    }
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };
  const handlePrevImage = useCallback(() => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
  }, [product.images.length]);

  const handleNextImage = useCallback(() => {
    setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
  }, [product.images.length]);
  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    setNormalQty(product.orderMinimumQuantity ?? 1);
    if (variant.slug) updateVariantInUrl(variant);
    // <-- ONLY HERE URL UPDATES
    setSelectedOptions({
      option1: variant.option1Value,
      option2: variant.option2Value,
      option3: variant.option3Value,
    });
  };
  // Coupon apply handler
  const handleApplyCoupon = (couponData: any) => {
    if (!couponData) return;

    setAppliedCoupon({
      id: couponData.discountId,
      name: couponData.discountName,
      isActive: true,
      usePercentage: couponData.usePercentage,
      discountAmount: couponData.discountAmount,
      discountPercentage: couponData.discountPercentage,
      startDate: "",
      endDate: couponData.expiresAt,
      requiresCouponCode: true,
      isCumulative: couponData.isCumulative,
      couponCode: couponData.couponCode,
    });

    setCouponCode(couponData.couponCode);
    setShowCouponModal(false);
  };
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");

    // 🔥 Recalculate auto discount properly
    const autoPrice = getDiscountedPrice(product, basePrice);

    setFinalPrice(autoPrice);

    setDiscountAmount(
      basePrice > autoPrice
        ? +(basePrice - autoPrice).toFixed(2)
        : 0
    );
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="hidden md:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-nowrap items-center gap-1 text-xs text-gray-600 overflow-hidden" >
            {/* Home */}
            <Link href="/" className="hover:text-[#445D41] whitespace-nowrap flex-shrink-0">
              Home
            </Link>
            {/* Categories */}
            {buildCategoryBreadcrumb(product.categories).map(cat => (
              <span key={cat.slug} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-400">/</span>
                <Link
                  href={`/category/${cat.slug}`}
                  className="hover:text-[#445D41] whitespace-nowrap" >
                  {cat.name}
                </Link>
              </span>
            ))}
            {/* Product */}
            <span className="text-gray-400 flex-shrink-0">/</span>
            <span
              className="text-gray-800 font-medium truncate min-w-0"
              aria-current="page"
            >
              {product.name}
            </span>
          </nav>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* PRODUCT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
          {/* LEFT: Image Gallery */}
          <div className="flex flex-col gap-3 w-full lg:sticky lg:top-24 lg:self-start">
            {/* Inner row: vertical thumbnails LEFT + main image RIGHT */}
            <div className="flex gap-2 items-start">

              {/* Vertical Thumbnail Strip */}
              <div className="flex flex-col items-center gap-1.5 w-[54px] md:w-[70px] flex-shrink-0">
                {/* UP arrow */}
                {thumbStart > 0 && (
                  <button
                    onClick={handleThumbPrev}
                    className="w-full flex justify-center py-0.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition"
                  >
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                {/* Thumbnails vertical */}
                <div className="flex flex-col gap-1.5">
                  {sortedImages
                    .slice(thumbStart, thumbStart + thumbVisible)
                    .map((img, idx) => {
                      const realIndex = thumbStart + idx;
                      return (
                        <div
                          key={img.id}
                          onClick={() => { setSelectedImage(realIndex); setSelectedVideoIndex(null); }}
                          className={`cursor-pointer rounded-xl overflow-hidden w-[50px] h-[50px] md:w-[66px] md:h-[66px] flex-shrink-0 transition-all duration-200 border-2 bg-white
                          ${selectedImage === realIndex && selectedVideoIndex === null
                              ? "border-[#445D41] shadow-lg"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                            }`}
                        >
                          <div className="relative w-full h-full bg-white p-1">
                            <Image
                              src={getImageUrl(img.imageUrl)}
                              alt={img.altText || product.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
                {/* DOWN arrow */}
                {thumbStart + thumbVisible < sortedImages.length && (
                  <button
                    onClick={handleThumbNext}
                    className="w-full flex justify-center py-0.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                {/* Video Thumbnails */}
                {videoList.map((video, vIdx) => (
                  <div
                    key={video.videoId}
                    onClick={() => setSelectedVideoIndex(vIdx)}
                    className={`cursor-pointer rounded-xl overflow-hidden w-[50px] h-[50px] md:w-[66px] md:h-[66px] flex-shrink-0 transition-all duration-200 border-2 relative
                    ${selectedVideoIndex === vIdx
                        ? "border-red-500 shadow-lg"
                        : "border-gray-200 hover:border-red-400 hover:shadow-md"
                      }`}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white ml-0.5"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Image */}
              <div className="flex-1 relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="relative bg-white overflow-hidden h-[250px] md:h-[390px] lg:h-[460px] flex items-center justify-center">

                  {selectedVideoIndex !== null && videoList[selectedVideoIndex] ? (
                    <iframe
                      key={videoList[selectedVideoIndex].videoId}
                      src={videoList[selectedVideoIndex].embedUrl}
                      title="Product video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                  /* ✅ ONLY IMAGE AREA HAS ZOOM */
                  <div
                    className="relative w-full h-full"
                    onMouseEnter={() => setShowZoom(true)}
                    onMouseLeave={() => setShowZoom(false)}
                    onMouseMove={handleMouseMove}
                  >
                    <button
                      type="button"
                      aria-label="View product image"
                      onClick={() => setShowImageModal(true)}
                      className="absolute inset-0 z-10 cursor-zoom-in"
                    />

                    <Image
                      src={activeMainImage}
                      alt={product.name}
                      fill
                      className="object-contain p-1 pointer-events-none"
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* 🔥 ZOOM OVERLAY */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-150 hidden lg:block"
                      style={{
                        opacity: showZoom ? 1 : 0,
                        backgroundImage: `url(${activeMainImage})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "170%",
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      }}
                    />
                  </div>
                  )}

                  <div className="absolute top-1 md:top-3 right-1 md:right-3 flex flex-col gap-2 z-30">
                    {/* Wishlist */}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={product.disableWishlistButton === true}
                      onClick={() => {
                        if (product.disableWishlistButton) return;
                        const wishlistId = selectedVariant ? selectedVariant.id : product.id;

                        toggleWishlist({
                          id: wishlistId,
                          productId: product.id,
                          variantId: selectedVariant?.id,

                          // ✅ EXACT SAME AS CART
                          name: product.productType === "variable" && selectedVariant
                            ? `${product.name} (${[
                              selectedVariant.option1Value,
                              selectedVariant.option2Value,
                              selectedVariant.option3Value,
                            ]
                              .filter(Boolean)
                              .join(", ")})`
                            : product.name,

                          slug: selectedVariant?.slug ?? product.slug, // 🔥 IMPORTANT
                          price: finalPrice,
                          priceBeforeDiscount: basePrice,
                          finalPrice: finalPrice,
                          discountAmount:
                            currentDisplayType === "System" || appliedCoupon
                              ? discountAmount ?? 0
                              : 0,
                          oldPrice: oldPriceValue ?? null,

                          displayDiscountType: currentDisplayType,

                          hasSystemDiscount:
                            selectedVariant?.hasSystemDiscount ??
                            product.hasSystemDiscount ??
                            false,

                          systemDiscountAmount:
                            currentSystemDiscountAmount,
                          appliedDiscountId: appliedCoupon?.id ?? null,
                          couponCode: appliedCoupon?.couponCode ?? null,

                          image: activeMainImage,

                          vatRate: vatRate ?? null,
                          vatExempt: product.vatExempt,

                          sku: (product.productType === "variable" ? selectedVariant?.sku : undefined) ?? product.sku,

                          stockQuantity:
                            (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ??
                            product.stockQuantity ??
                            null,
                          productData: JSON.parse(JSON.stringify(product)),

                          // 🔥 OPTIONAL BUT IMPORTANT
                          orderMaximumQuantity: product.orderMaximumQuantity ?? null,
                          orderMinimumQuantity: product.orderMinimumQuantity ?? null,
                        });
                        toast.success(isInWishlist(wishlistId) ? "Removed from wishlist" : "Added to wishlist!");
                      }}
                      className={`absolute top-3 right-3 z-20
    bg-white border border-gray-200 shadow-md
    hover:bg-white
    ${product.disableWishlistButton
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                        }`}
                    >
                      <Heart className={`h-5 w-5 transition-colors ${isInWishlist(selectedVariant ? selectedVariant.id : product.id) ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                    </Button>
                    {/* Share */}
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleShareClick}
                        className="absolute top-14 right-3 z-20 
             bg-white hover:bg-white 
             border border-gray-200 
             shadow-md"
                      >
                        <ShareIcon className="h-5 w-5 text-gray-700" />
                      </Button>
                      {showShare && !isMobile && (
                        <ShareMenu
                          url={shareUrl}
                          title={shareTitle}
                          onClose={() => setShowShare(false)}
                        />
                      )}
                    </div>
                  </div>
                  {/* discount badge (from oldPrice percent) */}
                  {(() => {
                    // 🥇 PRIORITY 1: COUPON APPLIED → % OFF
                    // 🥇 PRIORITY 1: COUPON APPLIED → TOTAL % OFF (STACK SAFE)
                    if (appliedCoupon) {
                      const totalPercent =
                        basePrice > 0
                          ? Math.round((discountAmount / basePrice) * 100)
                          : 0;

                      return (
                        <div className="absolute top-3 left-4 z-20">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-lg md:text-xl font-extrabold">
                                {totalPercent}%
                              </span>
                              <span className="text-[10px] md:text-sm font-semibold">
                                OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (currentDisplayType === "System") {
                      const percent =
                        basePrice > 0
                          ? Math.round(
                            (currentSystemDiscountAmount / basePrice) * 100
                          )
                          : 0;

                      return (
                        <div className="absolute top-3 left-4 z-20">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-lg md:text-xl font-extrabold">
                                {percent}%
                              </span>
                              <span className="text-[10px] md:text-sm font-semibold">
                                OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (activeAutoDiscount) {
                      const percent = activeAutoDiscount.usePercentage
                        ? activeAutoDiscount.discountPercentage
                        : Math.round(
                          (activeAutoDiscount.discountAmount /
                            (selectedVariant?.price ?? product.price)) * 100
                        );
                      return (
                        <div className="absolute top-3 left-4 z-20">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-lg md:text-xl font-extrabold">
                                {percent}%
                              </span>
                              <span className="text-[10px] md:text-sm font-semibold">
                                OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // 🥉 PRIORITY 3: COUPON AVAILABLE (NOT APPLIED)
                    if (hasCouponAvailable) {
                      return (
                        <div className="absolute top-2 md:top-3 left-2 md:left-4 z-20">
                          <div className="relative bg-gradient-to-br from-red-50 to-red-100 text-red-800 text-[11px] md:text-sm font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-md shadow-lg rotate-[-6deg] border border-red-200 leading-tight max-w-[120px] md:max-w-none">

                            <div className="flex flex-col items-center text-center">
                              <span className="text-[10px] md:text-sm font-semibold">
                                🎟 Coupon
                              </span>
                              <span className="text-[9px] md:text-xs opacity-90">
                                Available
                              </span>
                            </div>

                            {/* hole */}
                            <span className="absolute -top-1 left-3 w-2 h-2 bg-white border border-red-200 rounded-full shadow-inner"></span>

                            {/* string */}
                            <span className="absolute -top-3 left-[14px] w-[1px] h-3 bg-gray-300"></span>

                          </div>
                        </div>
                      );
                    }
                    // 🟠 PRIORITY 4: OLD PRICE (NO DISCOUNT, NO COUPON)
                    if (
                      currentDisplayType === "OldPrice" &&
                      !appliedCoupon &&
                      !hasCouponAvailable &&
                      oldPriceData
                    ) {
                      return (
                        <div className="absolute top-3 left-4 z-20">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
                            <div className="flex flex-col items-center leading-none">
                              <span className="text-lg md:text-xl font-extrabold">
                                {oldPriceData.discount}%
                              </span>
                              <span className="text-[10px] md:text-sm font-semibold">
                                OFF
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                </div>
              </div>
              {/* end main image */}

            </div>
 

          </div>

          {/* RIGHT: Product Info */}
          <div>
            {/* TITLE + BADGES (same line on desktop, stacked on mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-0">
              {/* PRODUCT NAME */}
              <h1 className="text-base md:text-xl font-semibold">
                {(() => {
                  const variantText = [
                    selectedOptions.option1,
                    selectedOptions.option2,
                    selectedOptions.option3,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return product.productType === "variable" && selectedVariant && variantText
                    ? `${product.name} (${variantText})`
                    : product.name;
                })()}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-2">
              {/* Brand */}
              {product.brandName && (
                <p className="text-sm text-gray-600">
                  by <Link href={`/brands/${product.brandName.toLowerCase().replace(/\s+/g, '-')}`} className="font-semibold text-[#445D41] hover:underline cursor-pointer">{product.brandName}</Link>
                </p>
              )}
              {/* Rating + Reviews */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(variantAverageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {variantAverageRating.toFixed(1)}
                </span>
                <div
                  className="relative group inline-block"
                  onClick={() => {
                    const el = document.getElementById("reviews-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="text-sm text-[#445D41] cursor-pointer">
                    ({variantReviewCount} reviews)
                  </span>
                  {/* ✅ HOVER TOOLTIP */}
                  <div
                    className="absolute left-0 top-full z-50 hidden lg:group-hover:block w-80 bg-white border rounded-xl shadow-lg p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 🔥 HEADING */}
                    <div className="mb-2 pb-2 border-b">
                      <p className="text-sm font-semibold text-gray-800">
                        Recent Reviews
                      </p>
                    </div>
                    {recentReviews.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No reviews yet
                      </p>
                    ) : (
                      <>
                        {recentReviews.map((r) => (
                          <div
                            key={r.id}
                            className="border-b last:border-b-0 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition"
                            onClick={() => {
                              setHighlightReviewId(null);
                              setTimeout(() => setHighlightReviewId(r.id), 10);
                            }}
                          >
                            <div className="flex items-center gap-1 text-yellow-500 text-sm">
                              {"★".repeat(r.rating)}
                              <span className="text-gray-300">
                                {"☆".repeat(5 - r.rating)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-800">
                              {r.customerName}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {r.comment}
                            </p>
                          </div>
                        ))}

                        {/* 🔥 VIEW ALL REVIEWS CTA */}
                        {variantReviewCount > recentReviews.length && (
                          <button
                            className="mt-2 w-full text-sm font-semibold text-[#445D41] hover:text-black"
                            onClick={() => {
                              const el = document.getElementById("reviews-list");
                              el?.scrollIntoView({ behavior: "instant" });
                            }}
                          >
                            View all reviews
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* BADGES WRAP SAFELY BELOW ON MOBILE */}
              <div className="flex flex-wrap items-center gap-2 sm:ml-3">
                {/* VAT Exempt / Relief */}
                {(product.vatExempt || (product as any).vatRate === 0) && (
                  <div className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded text-xs font-semibold">
                    <BadgePercent className="h-3 w-3" />
                    VAT Relief
                  </div>
                )}

{/* 🔥 QUALIFY ITEMS BUTTON - Updated Colors */}
{(() => {
  const discountSlug = getDiscountSlug(product);
  if (!discountSlug) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/offers/${discountSlug}`}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#445D41] hover:bg-black text-white text-xs font-medium transition-all duration-200 group shadow-sm hover:shadow-md"
      >
        <BadgePercent className="h-3.5 w-3.5 text-white/90 group-hover:scale-110 transition-transform" />
        <span>Qualify Items</span>
        <ChevronRight className="h-3.5 w-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
})()}
                {/* Unisex */}
                <GenderBadge
                  gender={product.gender}
                  absolute={false}
                  className="bg-gray-100 border border-purple-200 rounded shadow-none"
                />
                {/* SOLD THIS WEEK — last badge (DirectCare theme, compact + responsive) */}
                {(activeSaleCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#445D41] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white whitespace-nowrap shadow-sm">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/90"></span>
                    {(activeSaleCount ?? 0) >= 1000
                      ? ((activeSaleCount ?? 0) / 1000).toFixed((activeSaleCount ?? 0) >= 10000 ? 0 : 1) + "K"
                      : activeSaleCount} sold this week
                  </span>
                )}
              </div>
            </div>



            {/* 🔥 LIVE CART ACTIVITY BANNER */}
            <LiveCartActivityBanner activity={null} />
            {isUKUser && activeNextDayDeliveryEnabled && nextDayTimeLeft && (
              <div className="mt-2 mb-3 rounded-xl border border-white bg-gradient-to-r from-green-50 via-white to-green-50 px-4 py-1 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* ORDER WITHIN */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#445D41] shadow-sm">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-[#445D41]">
                      Order within
                    </p>
                    <p className="text-xs font-semibold text-emerald-900">
                      {nextDayTimeLeft}
                    </p>
                  </div>
                  {/* LINE */}
                  <div className="mx-2 h-px flex-1 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
                  {/* SHIPS */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#445D41] shadow-sm">
                      <Truck className="h-6 w-6 text-white" />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-[#445D41]">
                      Ships
                    </p>
                    <p className="text-xs font-semibold text-[#445D41]">
                      {shipPrefix} • {shipDate}
                    </p>
                  </div>
                  {/* LINE */}
                  <div className="mx-2 h-px flex-1 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />

                  {/* DELIVERS */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#445D41] shadow-sm">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-[#445D41]">
                      Delivers
                    </p>
                    <p className="text-xs font-semibold text-[#445D41]">
                      {deliveryPrefix} • {deliveryDate}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {product.disableBuyButton && (
              <div className="mb-3 flex">
                <div className="inline-flex items-center rounded-lg border border-red-300 bg-yellow-50 px-4 py-2">
                  <p className="text-sm font-medium text-red-800 whitespace-nowrap">
                    This product is currently not available for purchase.
                  </p>
                </div>
              </div>
            )}
            {/* VARIANTS UI */}
            {product.productType === "variable" && product.variants && product.variants?.length > 0 && (
              <>
                {/* OPTION 1 */}
                {product.variants?.[0]?.option1Name && (
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <p className="text-sm font-semibold">
                      {product.variants?.[0]?.option1Name} :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...new Set(
                          (product.variants ?? []).map(v => v.option1Value)
                        ),
                      ].sort((a, b) => naturalSort(a, b)).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateSelection(1, opt)}
                          className={`px-3 py-1 rounded border text-sm ${selectedOptions.option1 === opt
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
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <p className="text-sm font-semibold">
                      {product.variants?.[0]?.option2Name} :
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {[...new Set(
                        product.variants
                          ?.filter(v => v.option1Value === selectedOptions.option1)
                          .map(v => v.option2Value)
                      )].sort((a, b) => naturalSort(a, b)).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateSelection(2, opt)}
                          className={`px-3 py-1 rounded border text-sm ${selectedOptions.option2 === opt
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
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <p className="text-sm font-semibold">
                      {product.variants?.[0]?.option3Name} :
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {[...new Set(
                        product.variants
                          ?.filter(v =>
                            v.option1Value === selectedOptions.option1 &&
                            v.option2Value === selectedOptions.option2
                          )
                          .map(v => v.option3Value)
                      )].sort((a, b) => naturalSort(a, b)).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateSelection(3, opt)}
                          className={`px-3 py-1 rounded border text-sm ${selectedOptions.option3 === opt
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
                {/* PURCHASE MODE CARDS STACKED (one-time on top, subscribe below) */}
                {product.isRecurring ? (
                  <div className="flex flex-col gap-3 mt-0">
                    {/* LEFT NORMAL PURCHASE CARD */}
                    <div
                      id="normal-purchase-card"
                      onClick={() => setPurchaseType("one")}
                      className={`w-full transition-all duration-300 rounded-2xl  ${purchaseType === "one"
                        ? "border-2 border-[#445D41] bg-[#f8faf9] shadow-md"
                        : "border border-gray-200 bg-white"
                        }`}
                    >
                      {/* <<< Your current full card starts here >>> */}
                      <Card className="shadow-sm bg-transparent border-none">
                        <CardContent className="px-3 py-2">
                          <label className="flex items-center gap-2 cursor-pointer mb-1.5">
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
                          {/* Price + VAT + Loyalty — all compact inline */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="text-lg font-bold text-[#445D41]">
                              £{(finalPrice * normalQty).toFixed(2)}
                            </span>
                            {/* 🔥 CASE 1: DISCOUNT */}
                            {(appliedCoupon || activeAutoDiscount) && (
                              <span className="text-xs text-gray-400 line-through">
                                £{(basePrice * normalQty).toFixed(2)}
                              </span>
                            )}

                            {/* 🔥 CASE 2: OLD PRICE */}
                            {!appliedCoupon && !activeAutoDiscount && oldPriceData && (
                              <span className="text-xs text-gray-400 line-through">
                                £{(oldPriceData.oldPrice * normalQty).toFixed(2)}
                              </span>
                            )}

                            {vatRate !== null && vatRate > 0 && !product.vatExempt && (
                              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md font-semibold">
                                {vatRate}% VAT
                              </span>
                            )}
                            {loyaltyPoints && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
                                <AwardIcon className="h-3 w-3 text-green-600" />
                                Earn {loyaltyPoints} pts
                              </span>
                            )}

                          </div>

                          {/* Qty + Stock — same row */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {/* Quantity + In Stock — only when One-Time is selected */}
                            {purchaseType === "one" && (
                              <>
                                <QuantitySelector
                                  quantity={normalQty}
                                  setQuantity={setNormalQty}
                                  maxStock={groupedMaxQty}
                                  stockError={normalStockError}
                                  setStockError={setNormalStockError}
                                  minQty={product.orderMinimumQuantity ?? 1}
                                  maxQty={product.orderMaximumQuantity}
                                />
                                {stockDisplay.show && (
                                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${stockDisplay.type === "out" ? "bg-red-100 text-red-700"
                                    : stockDisplay.type === "low" ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-700"
                                    }`}>
                                    <span className={`inline-block w-2 h-2 rounded-full ${stockDisplay.type === "out" ? "bg-red-600"
                                      : stockDisplay.type === "low" ? "bg-yellow-600"
                                        : "bg-green-600"
                                      }`}></span>
                                    {stockDisplay.text}
                                  </div>
                                )}
                              </>
                            )}
                            {product.assignedDiscounts?.some(d => d.requiresCouponCode) && (
                              <button
                                type="button"
                                onClick={() => { if (appliedCoupon) { handleRemoveCoupon(); } else { setShowCouponModal(true); } }}
                                className={`text-xs font-semibold flex items-center gap-1 ${appliedCoupon ? "text-red-600" : "text-[#445D41]"}`}
                              >
                                <BadgePercent className="h-3.5 w-3.5" />
                                {appliedCoupon ? "Remove coupon" : "Apply coupon"}
                              </button>
                            )}
                            {/* ADD TO CART — same row as qty + stock */}
                            {purchaseType === "one" && backorderState.canBuy && (
                              <Button
                                onClick={handleAddToCart}
                                disabled={product.disableBuyButton || (isGroupedProduct && !allRequiredSelected)}
                                className="py-2 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 bg-[#445D41] hover:bg-black text-white disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Add to Cart
                              </Button>
                            )}
                            {/* BUY NOW */}
                            {purchaseType === "one" && backorderState.canBuy && (
                              <Button
                                onClick={handleBuyNow}
                                disabled={product.disableBuyButton}
                                className="py-2 px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 bg-[#445D41] hover:bg-black text-white disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <Zap className="h-4 w-4" />
                                Buy Now
                              </Button>
                            )}
                         {purchaseType === "one" && !backorderState.canBuy && (
  <Button
    onClick={() => setShowNotifyModal(true)}
    className="flex-1 py-2 px-3 rounded-xl bg-[#445D41] hover:bg-black text-white text-sm font-semibold"
  >
    Notify Me
  </Button>
)}
                          </div>

                        </CardContent>
                      </Card>
                    </div>
                    {/* RIGHT SUBSCRIPTION CARD */}
                    <div
                      id="subscription-card"
                      onClick={() => setPurchaseType("subscription")}
                      className={`w-full transition-all duration-300 rounded-2xl ${purchaseType === "subscription"
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
                        backorderState={backorderState}   // ⭐ REQUIRED
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Card className="mb-2 border border-gray-200 rounded-2xl shadow-sm">
                      <CardContent className="p-3">
                        {/* Price + VAT + Loyalty — all compact inline */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-lg md:text-2xl font-bold text-[#445D41]">
                            £{(finalPrice * normalQty).toFixed(2)}
                          </span>

                          {(appliedCoupon || activeAutoDiscount) && (
                            <span className="text-xs text-gray-400 line-through">
                              £{(basePrice * normalQty).toFixed(2)}
                            </span>
                          )}

                          {!appliedCoupon && !activeAutoDiscount && oldPriceData && (
                            <span className="text-xs text-gray-400 line-through">
                              £{(oldPriceData.oldPrice * normalQty).toFixed(2)}
                            </span>
                          )}

                          {activeNextDayDeliveryFree && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 whitespace-nowrap"
                              style={{
                                animation: 'deliveryHighlight 2s ease-in-out infinite',
                              }}
                            >
                              <Truck className="h-3 w-3 text-blue-700" />
                              <span className="text-[11px] font-bold text-blue-700">
                                Next Day Delivery Free
                              </span>
                            </span>
                          )}

                          {vatRate !== null && vatRate > 0 && !product.vatExempt && (
                            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-semibold">
                              {vatRate}% VAT
                            </span>
                          )}

                          {loyaltyPoints && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
                              <AwardIcon className="h-3 w-3 text-[#445D41]" />
                              Earn {loyaltyPoints} pts
                            </span>
                          )}
                        </div>
                        {/* Quantity + Stock — same row, no label */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            {/* - Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              onClick={() => {
                                const minQty = product.orderMinimumQuantity ?? 1;
                                if (normalQty <= minQty) {
                                  toast.error(`Minimum order quantity is ${minQty}`);
                                  return;
                                }
                                setNormalQty(normalQty - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            {/* Quantity Input */}
                            <input
                              type="number"
                              className="w-8 text-center font-semibold outline-none border-l border-r border-gray-300 text-sm"
                              value={normalQty === 0 ? "" : normalQty}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (!/^\d*$/.test(val)) return;
                                if (val === "") {
                                  setNormalQty(0);
                                  return;
                                }
                                let num = parseInt(val, 10);
                                const minQty = product.orderMinimumQuantity ?? 1;
                                const maxStock =
                                  (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
                                const maxQty =
                                  product.orderMaximumQuantity ?? maxStock;
                                const limit = Math.min(maxQty, maxStock);
                                if (num < minQty) {
                                  toast.error(`Minimum order quantity is ${minQty}`);
                                  setNormalQty(minQty);
                                  return;
                                }
                                if (num > limit) {
                                  toast.error(`you can add only  ${limit} item in your cart `);
                                  setNormalQty(limit);
                                  return;
                                }
                                setNormalQty(num);
                              }}
                              onBlur={() => {
                                const minQty = product.orderMinimumQuantity ?? 1;
                                const maxStock =
                                  (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
                                const maxQty =
                                  product.orderMaximumQuantity ?? maxStock;
                                const limit = Math.min(maxQty, maxStock);
                                let val = normalQty;
                                if (!val || val < minQty) val = minQty;
                                if (val > limit) val = limit;
                                setNormalQty(val);
                              }}
                              inputMode="numeric"
                              min={1}
                              max={(product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity}
                            />
                            {/* + Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              onClick={() => {
                                const maxStock =
                                  (product.productType === "variable" ? selectedVariant?.stockQuantity : undefined) ?? product.stockQuantity;
                                const maxQty =
                                  product.orderMaximumQuantity ?? maxStock;
                                const limit = Math.min(maxQty, maxStock);
                                if (normalQty >= limit) {
                                  toast.error(`You can add only ${limit} Quantity in your cart.`);
                                  return;
                                }
                                setNormalQty(normalQty + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>


                          {normalStockError && (
                            <p className="text-red-600 text-xs mt-1">{normalStockError}</p>
                          )}
                          {/* ⭐ PREMIUM Stock Badge */}
                          {stockDisplay.show && (
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm ${stockDisplay.type === "out"
                                ? "bg-red-100 text-red-700"
                                : stockDisplay.type === "low"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-50 border border-green-200 text-green-700"
                                }`}
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${stockDisplay.type === "out"
                                  ? "bg-red-600"
                                  : stockDisplay.type === "low"
                                    ? "bg-yellow-600"
                                    : "bg-green-600"
                                  }`}
                              ></span>
                              {stockDisplay.text}
                            </div>
                          )}
                          {product.assignedDiscounts?.some(d => d.requiresCouponCode) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (appliedCoupon) {
                                  handleRemoveCoupon();
                                } else {
                                  setShowCouponModal(true);
                                }
                              }}
                              className={`mt-0 text-sm font-semibold flex items-center gap-1 leading-none
      ${appliedCoupon ? "text-red-600 hover:text-red-800" : "text-[#445D41] hover:text-black"}
    `}
                            >
                              <BadgePercent className="h-4 w-4" />
                              {appliedCoupon ? "Click to remove coupon" : "Click to apply coupon"}
                            </button>
                          )}
                          {/* Buttons — same row as qty+stock on desktop, wrap on mobile */}
                          <div className="flex items-center gap-2 w-full md:w-auto md:flex-1">
                            {/* ADD TO CART */}
                            {purchaseType === "one" && backorderState.canBuy && (
                              <Button
                                onClick={handleAddToCart}
                                disabled={product.disableBuyButton}
                                className="flex-1 py-2 rounded-xl font-semibold flex items-center justify-center gap-2
          bg-[#445D41] hover:bg-black text-white
          disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Add to Cart
                              </Button>
                            )}
                            {/* BUY NOW */}
                            {purchaseType === "one" && backorderState.canBuy && (
                              <Button
                                onClick={handleBuyNow}
                                disabled={product.disableBuyButton}
                                className="flex-1 py-2 rounded-xl font-semibold
          bg-[#445D41] hover:bg-black text-white
          flex items-center justify-center gap-2
          disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <Zap className="h-4 w-4" />
                                Buy Now
                              </Button>
                            )}
                            {/* OUT OF STOCK (NO BACKORDER, NO NOTIFY) */}
                            {purchaseType === "one" && !backorderState.canBuy && !backorderState.showNotify && (
                              <Button
                                disabled
                                className="flex-1 py-2 rounded-xl bg-red-400 cursor-not-allowed opacity-70 text-white"
                              >
                                Out of Stock
                              </Button>
                            )}
                            {/* NOTIFY MODE */}
                            {purchaseType === "one" && backorderState.showNotify && (
                              <Button
                                variant="outline"
                                className="flex-1 px-3 py-2 rounded-lg border-green-600 text-green-700 hover:bg-green-50 text-sm flex items-center justify-center gap-2"
                                onClick={() => setShowNotifyModal(true)}
                              >
                                <BellRing className="h-4 w-4" />
                                Notify me when available
                              </Button>
                            )}
                            {purchaseType === "one" && !backorderState.canBuy && (
  <Button
    onClick={() => setShowNotifyModal(true)}
    className="flex-1 py-2 px-3 rounded-xl bg-[#445D41] hover:bg-black text-white text-sm font-semibold"
  >
    Notify Me
  </Button>
)}
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                       {product.isPharmaProduct && (
              <div className="flex items-center gap-1.5 md:gap-2 mb-2.5 md:mb-3 flex-wrap">
                  <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-2.5 md:px-3 py-1 rounded-full mt-2 shrink-0 shadow-sm hover:bg-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200">
                  <PlusCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                  <span className="text-[9px] md:text-[11px] lg:text-xs font-semibold text-black whitespace-nowrap leading-tight">
                  P Medicines are sold under pharmacist supervision
                  </span>
                  </div>
              </div>
              )}

                {/* Trust Badges — below buy buttons, inside right column card */}
                <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-col items-center text-center gap-0.5">
                    <Truck className="h-6 w-6 text-[#445D41]" />
                    <p className="text-[12px] font-semibold">Free Shipping</p>

                    <p className="text-[12px] text-gray-500">
                      Over £
                      {product.freeShippingThresholds?.find((t: any) => t.name === "standard")?.threshold ?? 35}
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-0.5">
                    <RotateCcw className={`h-6 w-6 ${product.notReturnable ? "text-red-700" : "text-[#445D41]"}`} />
                    <p className={`text-[12px] font-semibold ${product.notReturnable ? "text-red-700" : ""}`}>
                      {product.notReturnable ? "Non-Returnable" : "Easy Returns"}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {product.notReturnable ? "Cannot return" : "30 Days"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-0.5">
                    <ShieldCheck className="h-6 w-6 text-[#445D41]" />
                    <p className="text-[12px] font-semibold">Secure Payment</p>
                    <p className="text-[12px] text-gray-500">SSL Encrypted</p>
                  </div>
                </div>
                {/* 🔥 GROUPED PRODUCTS + BUNDLE OFFER (SINGLE BOX) */}
                {purchaseType === "one" && isGroupedProduct && product.groupedProducts && (
                  <div className="mb-1 mt-3 border border-green-2 bg-white rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-black cursor-pointer"
                        checked={groupEnabled}
                        disabled={
                          product.automaticallyAddProducts || hasOutOfStockGroupedProduct
                        }
                        onChange={(e) => setGroupEnabled(e.target.checked)}
                      />
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        Include required products
                        {product.automaticallyAddProducts && (
                          <span className="text-xs text-gray-500">(required)</span>
                        )}
                      </span>
                    </div>
                    {hasOutOfStockGroupedProduct && (
                      <p className="text-xs text-red-600 mb-1">
                        One or more required products are currently out of stock.
                      </p>
                    )}
                    {/* 🔥 BUNDLE OFFER MESSAGE */}
                    {product.groupBundleDiscountType &&
                      product.groupBundleDiscountType !== "None" && (
                        <div className="mb-3 bg-green-50 border rounded-lg p-3">
                          <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
                            <Gift className="w-8 h-8 text-green-700" />
                            <span>
                              Bundle Offer: Save {product.savingsPercentage}% when purchased together
                            </span>
                          </p>
                          {product.groupBundleSavingsMessage && (
                            <p className="text-xs text-green-700 mt-1">
                              {product.groupBundleSavingsMessage}
                            </p>
                          )}
                          {product.totalSavings && (
                            <p className="text-xs text-green-700 mt-1">
                              You save £{product.totalSavings.toFixed(2)} on this bundle
                            </p>
                          )}
                        </div>
                      )}
                    {/* TITLE */}
                    <p className="text-sm font-semibold text-yellow-800 mb-3">
                      This product must be purchased with:
                    </p>
                    {/* GROUPED ITEMS */}
                    <div className="space-y-3">
                      {product.groupedProducts.map(gp => {
                        const state = groupedSelections[gp.productId];
                        if (!state) return null;
                        return (
                          <div
                            key={gp.productId}
                            className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border"
                          >
                            <div className="flex items-center gap-2">

                              {/* PRODUCT IMAGE */}
                              <div className="w-14 h-16 flex-shrink-0 rounded-lg border bg-white overflow-hidden">
                                <Link href={`/product/${gp.slug}`}>
                                  <img
                                    src={
                                      gp.mainImageUrl
                                        ? gp.mainImageUrl.startsWith("http")
                                          ? gp.mainImageUrl
                                          : `${process.env.NEXT_PUBLIC_API_URL}${gp.mainImageUrl}`
                                        : "/placeholder-product.png"
                                    }
                                    alt={"no img"}
                                    className="w-full h-full object-contain p-1 mt-2"
                                    loading="lazy"
                                  />
                                </Link>
                              </div>
                              <div>
                                <Link href={`/product/${gp.slug}`}>
                                  <p className="text-sm font-semibold">{gp.name}</p>
                                </Link>
                                <p className="text-sm font-semibold text-gray-900">
                                  £{((gp.bundlePrice ?? gp.price) * normalQty).toFixed(2)}
                                </p>
                                {gp.hasBundleDiscount && (
                                  <>
                                    <p className="text-xs text-gray-400 line-through">
                                      £{(gp.price * normalQty).toFixed(2)}
                                    </p>
                                    {typeof gp.individualSavings === "number" && (
                                      <p className="text-xs text-green-700">
                                        You save £{(gp.individualSavings * normalQty).toFixed(2)}
                                      </p>

                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {/* QUANTITY */}
                            <div className="flex items-center justify-center border rounded-lg px-3 py-1.5 bg-gray-50 min-w-[110px]">
                              <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                Quantity: {normalQty}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* 🔥 BUNDLE TOTAL SUMMARY */}
                    <div className="mt-4 pt-3 border-t space-y-1">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Individual total</span>
                        <span>£{bundleIndividualTotal.toFixed(2)}</span>
                      </div>
                      {bundleTotalSavings > 0 && (
                        <div className="flex justify-between text-sm text-green-800 font-medium">
                          <span>You save</span>
                          <span>£{bundleTotalSavings.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold text-green-700">
                        <span>Bundle price</span>
                        <span>£{bundleTotalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Short description */}
                {product.shortDescription && (
                  <div className="mb-1 mt-2 p-1 bg-white rounded-lg">
                    <div
                      className=" prose prose-sm max-w-none text-gray-700 prose-ul:list-disc prose-ul:pl-6 prose-li:my-1 prose-h3:mt-0 prose-h3:mb-2 " dangerouslySetInnerHTML={{ __html: product.shortDescription }} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PHARMACY ACCURACY CHECK */}
        {product.isPharmaProduct && (
          <div className="mt-2 mb-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-5xl mx-auto">
            {/* LEFT COLUMN: Pharmacist Check */}
            <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm w-full h-full">
              {/* VERIFIED BADGE */}
              <div className="absolute top-2 right-2 text-green-600 flex flex-col items-center">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-0.5">VERIFIED</span>
              </div>
              
              <div className="w-16 h-16 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                <svg className="w-full h-full text-gray-100 mt-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-[13px] text-gray-800 font-medium space-y-1">
                <p>Checked for accuracy by: <span className="text-[#445D41] font-bold">Surabhi Kumari</span></p>
                <p>Role: <span className="text-[#445D41] font-bold">Pharmacist</span></p>
                {(product.pharmaApprovedAt || product.publishedAt) && (
                  <p>Date checked: <span className="text-[#445D41] font-bold">
                    {new Date(product.pharmaApprovedAt || product.publishedAt).toLocaleDateString("en-GB")}
                  </span></p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Pharmacy Info OR Packaging Note depending on questions */}
            {hasPharmacyQuestions !== false ? (
              <div className="flex items-start gap-2 border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm w-full h-full">
                <img src="/pharmacy-logo-v2.png" alt="Pharmacy Logo" className="w-12 h-12 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-0.5">Pharmacy Medicine</h3>
                  <p className="text-[13px] text-gray-700 font-medium leading-snug">
                    This is a Pharmacy Medicine, therefore you'll need to answer a few short questions so our pharmacy team can ensure this product is right for you.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-100/60 p-4 shadow-sm w-full h-full">
                <Info className="mt-0.5 h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-md text-slate-600 leading-6">
                  <span className="font-bold text-slate-900">Please note :</span>{" "}
                  Product packaging may vary from the image shown.
                </p>
              </div>
            )}

            {/* Pharma packaging note — Spans full width below ONLY if questions exist */}
            {hasPharmacyQuestions !== false && (
              <div className="md:col-span-2">
                <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-100/60 px-4 py-2">
                  <Info className="mt-0.5 h-5 w-5 text-amber-500 flex-shrink-0" />
                  <p className="text-md text-slate-600 leading-6">
                    <span className="font-bold text-slate-900">Please note :</span>{" "}
                    Product packaging may vary from the image shown.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Related Products
              </h2>
            </div>
            <div className="relative">
              {/* Desktop-only prev/next chevrons */}
              {shouldShowRelatedNav && (
                <>
                  <button
                    id="related-prev"
                    className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 z-20"
                  >
                    <ChevronLeft className="w-7 h-7 text-gray-700" />
                  </button>

                  <button
                    id="related-next"
                    className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-20"
                  >
                    <ChevronRight className="w-7 h-7 text-gray-700" />
                  </button>
                </>
              )}
              <Swiper
                modules={[Autoplay, Pagination]}
                onSwiper={(swiper) => { relatedSwiperRef.current = swiper; }}
                pagination={{ clickable: true, dynamicBullets: true }}
                autoplay={{ delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true, }}
                loop
                spaceBetween={16}
                slidesPerView={2}
                breakpoints={{
                  640: { slidesPerView: 2, spaceBetween: 16 },
                  768: { slidesPerView: 3, spaceBetween: 20 },
                  1024: { slidesPerView: 4, spaceBetween: 22 },
                  1280: { slidesPerView: 5, spaceBetween: 24 },
                }}
                className="pb-10"
              >
                {relatedProducts.map((p) => (
                  <SwiperSlide key={p.id}>
                    <RelatedProductCard product={p} getImageUrl={getImageUrl} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </section>
        )}
        {/* CROSS-SELL PRODUCTS */}
        {crossSellProducts.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                Frequently Bought Together
              </h2>
            </div>
            <div className="relative">
              {/* Desktop-only prev/next chevrons */}
              {shouldShowCrossNav && (
                <>
                  <button
                    id="cross-prev"
                    className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 z-20"
                  >
                    <ChevronLeft className="w-7 h-7 text-gray-700" />
                  </button>

                  <button
                    id="cross-next"
                    className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-20"
                  >
                    <ChevronRight className="w-7 h-7 text-gray-700" />
                  </button>
                </>
              )}
              <Swiper
                modules={[Autoplay, Pagination]}
                onSwiper={(swiper) => { crossSwiperRef.current = swiper; }}
                pagination={{ clickable: true, dynamicBullets: true }}
                autoplay={{ delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true, }}
                loop
                spaceBetween={16}
                slidesPerView={2}
                breakpoints={{
                  640: { slidesPerView: 2, spaceBetween: 16 },
                  768: { slidesPerView: 3, spaceBetween: 20 },
                  1024: { slidesPerView: 4, spaceBetween: 22 },
                  1280: { slidesPerView: 5, spaceBetween: 24 },
                }}
                className="pb-10" >
                {crossSellProducts.map((crossProduct) => (
                  <SwiperSlide key={crossProduct.id}>
                    <CrossSellProductCard
                      product={crossProduct}
                      getImageUrl={getImageUrl}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </section>
        )}
        {/* recently viewed product section */}
        <RecentlyViewedSlider
          getImageUrl={getImageUrl}
          currentProductId={product.id}
        />
        {/* TABS, RELATED PRODUCTS and rest remain unchanged */}
        <Card className="mb-0 mt-5">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto scrollbar-hide border-b">
              <button onClick={() => setActiveTab("description")} className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold whitespace-nowrap transition ${activeTab === "description" ? "border-b-2 border-[#445D41] text-[#445D41]" : "text-gray-600 hover:text-[#445D41]"}`}>
                Product Description
              </button>
              <button onClick={() => setActiveTab("delivery")} className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold whitespace-nowrap transition ${activeTab === "delivery" ? "border-b-2 border-[#445D41] text-[#445D41]" : "text-gray-600 hover:text-[#445D41]"}`}>
                Delivery
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {activeTab === "description" && (
                <div className="space-y-2">
                  {descriptionSections.map((section, idx) => {
                    if (idx === 0) {
                      return (
                        <div key={idx} className="mb-4">
                          {section.title !== "Description" && section.title !== "Product Description" && section.title && (
                            <h2 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h2>
                          )}
                          <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: section.html }} />
                        </div>
                      );
                    }

                    const isOpen = !!openAccordions[section.title];
                    return (
                      <div key={idx} className="border-t border-gray-200 py-2">
                        <button
                          type="button"
                          onClick={() => toggleAccordion(section.title)}
                          className="flex w-full items-center justify-between py-2 text-left font-bold text-gray-900 hover:text-[#445D41] transition-colors"
                        >
                          <span className="text-base sm:text-lg">{section.title}</span>
                          <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="mt-3 pl-1">
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: section.html }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {activeTab === "delivery" && (
                <div className="space-y-6">
                  {/* Standard Delivery */}
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-[#445D41]" />
                      <h3 className="font-bold text-lg">Standard Delivery</h3>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li><strong>£2.99</strong> standard delivery applies to orders under <strong>£35</strong>.</li>
                      <li>Free standard delivery applies to orders over <strong>£35</strong>.</li>
                      <li>Orders are processed and dispatched from the Direct Care warehouse.</li>
                      <li>Standard delivery applies to eligible UK orders.</li>
                      <li>Delivery takes place from Monday to Friday, excluding bank holidays.</li>
                      <li>Delivery estimates start once your order has been placed and processed.</li>
                      <li>Some parcels may require a customer signature.</li>
                      <li>Remote, offshore and extended delivery areas may take longer.</li>
                      <li>Delivery times can vary during bank holidays, busy trading periods, severe weather or courier network delays.</li>
                    </ul>
                  </div>

                  {/* Next Day Delivery */}
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bike className="h-5 w-5 text-[#445D41]" />
                      <h3 className="font-bold text-lg">Next Day Delivery</h3>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li><strong>£3.75</strong> next day delivery applies to eligible orders and eligible postcodes.</li>
                      <li>Orders placed before <strong>3 pm</strong>, Monday to Friday, will be dispatched the same day and delivered the following working day.</li>
                      <li>Orders placed after 3 pm will be processed on the next working day.</li>
                      <li>Orders placed after 3 pm on Friday, or during the weekend, will be processed on the next working day.</li>
                      <li>Next day delivery does not include Saturdays, Sundays or bank holidays.</li>
                      <li>Some postcodes do not qualify for next day delivery.</li>
                      <li>A signature may be required when your parcel arrives.</li>
                    </ul>
                  </div>

                  {/* Click & Collect */}
                  <div className="border-l-4 border-[#445D41] pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-[#445D41]" />
                      <h3 className="font-bold text-lg">Click &amp; Collect</h3>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li><strong>Free Click &amp; Collect:</strong> Available on all orders over <strong>£30</strong>.</li>
                      <li><strong>Collection Fee:</strong> A <strong>£1</strong> charge applies to orders under £30.</li>
                      <li>Please wait for confirmation before travelling to collect your order.</li>
                      <li>Bring your order confirmation when collecting.</li>
                      <li>Some healthcare or pharmacy-related products may require checks before collection.</li>
                      <li>If we need more information before releasing your order, our team will contact you.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {product.allowCustomerReviews && (
          <RatingReviews
            productId={product.id}
            allowCustomerReviews={product.allowCustomerReviews}
            highlightReviewId={highlightReviewId}
            variantSku={selectedVariant?.sku ?? null}
            productSku={product.sku}
          />
        )}
        {showPharmaModal && (
          <PharmaQuestionsModal
            open={showPharmaModal}
            productId={product.id} // ✅ MAIN PRODUCT ID
            mode="add"
            onClose={() => {
              setShowPharmaModal(false);
              setPendingAction(null);
            }}
            onSuccess={() => {
              pharmaApprovedRef.current = true; // 🔥 VERY IMPORTANT
              setShowPharmaModal(false);
              if (pendingAction === "cart") {
                handleAddToCart();
              }
              if (pendingAction === "buy") {
                handleBuyNow();
              }
              setPendingAction(null);
              // 🔄 reset for next product / next flow
              setTimeout(() => {
                pharmaApprovedRef.current = false;
              }, 0);
            }}
          />
        )}
        {showNotifyModal && (
          <BackInStockModal
            open={showNotifyModal}
            productId={product.id}
            variantId={selectedVariant?.id ?? null}
            onClose={() => setShowNotifyModal(false)}
          />
        )}
        {showCouponModal && (
          <CouponModal
            open={showCouponModal}
            onClose={() => setShowCouponModal(false)}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            appliedCoupon={appliedCoupon}
            offers={product.assignedDiscounts?.filter(d => d.requiresCouponCode) || []}
            onApply={handleApplyCoupon}
            onRemove={handleRemoveCoupon}
            orderSubtotal={basePrice}
            productIds={[product.id]}
            categoryIds={product.categories?.map(c => c.categoryId)}
          />
        )}
        {showImageModal && (
          <ProductImageModal
            images={sortedImages}
            activeIndex={selectedImage}
            onClose={() => setShowImageModal(false)}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            getImageUrl={getImageUrl}
          />
        )}
      </main>
      <style jsx>{` 
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
