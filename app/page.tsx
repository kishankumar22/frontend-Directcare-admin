//app/page.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HomeBannerSlider from "@/components/HomeBannerSlider";
import FeaturedProductsSlider from "@/components/FeaturedProductsSlider";
import NewArrivalsProductsSlider from "@/components/NewArrivalsProductsSlider";

import TopBrandsSlider from "@/components/TopBrandsSlider";
import CategorySlider from "@/components/CategorySlider";
import NewsletterWrapper from "@/components/NewsletterWrapper";
import CategoryOffersSlider from "@/components/CategoryOffersSlider";
import { getActiveBanners } from "@/lib/bannerUtils";
import { ShoppingCart, Star, TrendingUp, Zap, Gift, Shield, } from "lucide-react";
import WhyChooseUs from "@/components/WhyChooseUs";
export const dynamic = "force-dynamic";

// ✅ Static feature section
const features = [
  { icon: Zap, title: "Fast Delivery", description: "Get your orders in 24-48 hours" },
  { icon: Shield, title: "Secure Payment", description: "100% secure transactions" },
  { icon: Gift, title: "Gift Cards", description: "Perfect for any occasion" },
  { icon: TrendingUp, title: "Best Prices", description: "Competitive pricing guaranteed" },
];
type BannerType = "Homepage" | "Seasonal" | string;

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  bannerType: BannerType;
  offerText?: string;
  buttonText?: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
}
// ✅ Types
interface Product {
  id: string;
  name: string;
  slug: string; // ✅ IMPORTANT: Need slug for routing
  price: number;
   showOnHomepage: boolean; // ✅ ADD THIS
  oldPrice?: number | null;
  averageRating?: number;
  reviewCount?: number;
  images?: { imageUrl: string }[];
}
interface Discount {
  usePercentage: boolean;
  discountPercentage: number;
  requiresCouponCode: boolean;
  couponCode: string;
}
interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  productCount: number;
  showOnHomepage: boolean; // ✅ ADD THIS
  sortOrder: number;
  assignedDiscounts?: Discount[]; // ✅ ADD THIS
  subCategories?: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  showOnHomepage: boolean;
  displayOrder: number;
  productCount: number;
}

interface HomeBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
}

// ✅ Fetch Functions
async function getBanners(baseUrl: string): Promise<Banner[]> {
  try {
    const res = await fetch(`${baseUrl}/api/Banners`, {
      cache: "no-store",
    });
    const result = await res.json();
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

async function getProducts(baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/Products?page=1&pageSize=100&sortDirection=asc&isPublished=true&showOnHomepage=true`,
      {
        cache: "no-store",
      }
    );
    const result = await res.json();
    return result.success ? result.data.items : [];
  } catch {
    return [];
  }
}


async function getCategories(baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/Categories?includeInactive=false&includeSubCategories=true`,
      {
        cache: "no-store",
      }
    );

    const result = await res.json();
    if (!result.success || !Array.isArray(result.data)) return [];

    return result.data.sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  } catch {
    return [];
  }
}

async function getBrands(baseUrl: string) {
  try {
    const res = await fetch(
      `${baseUrl}/api/Brands?includeUnpublished=false`,
      {
        cache: "no-store",
      }
    );

    const result = await res.json();
    return result.success
      ? result.data
          .filter((b: Brand) => b.showOnHomepage)
          .sort((a: Brand, b: Brand) => a.displayOrder - b.displayOrder)
      : [];
  } catch {
    return [];
  }
}


// ✅ MAIN PAGE
export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;

  const [products, categories, brands, banners] = await Promise.all([
  getProducts(baseUrl),
  getCategories(baseUrl),
  getBrands(baseUrl),
  getBanners(baseUrl),
]);
const activeBanners = getActiveBanners(banners);

const homeBanners = activeBanners.filter(
  banner => banner.bannerType === "Homepage"
);

const seasonalBanners = activeBanners.filter(
  banner => banner.bannerType === "Seasonal"
);
const homeCategories = categories
  .filter((c: Category) => c.showOnHomepage)
  .sort((a: Category, b: Category) => a.sortOrder - b.sortOrder);

const homeProducts = [...products].sort(
  (a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
);



 return (
  <>
    {/* 🔥 Newsletter Popup (client side) */}
    <NewsletterWrapper />
  <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-x-hidden">

    {/* ===== HERO SLIDER ===== */}
    <section className="w-full">
      <HomeBannerSlider banners={homeBanners} baseUrl={baseUrl} />

    </section>

  
{/* ===== CATEGORY OFFERS (NEW) ===== */}
<CategoryOffersSlider categories={categories} baseUrl={baseUrl} />
    {/* ===== PROMO BANNER ===== */}
 {seasonalBanners.length > 0 && (
  <section className="w-full py-4 bg-white">
   {seasonalBanners.map((banner) => (
  banner.link ? (
    <Link
      key={banner.id}
      href={banner.link}
      className="block cursor-pointer"
    >
      <img
        src={`${baseUrl}${banner.imageUrl}`}
        alt={banner.title}
        className="w-full h-auto object-cover"
      />
    </Link>
  ) : (
    <div key={banner.id}>
      <img
        src={`${baseUrl}${banner.imageUrl}`}
        alt={banner.title}
        className="w-full h-auto object-cover"
      />
    </div>
  )
))}

    
  </section>
)}


    {/* ===== FEATURED PRODUCTS ===== */}
    <section className="w-full bg-gray-50 py-4">
      <div className="max-w-7xl mx-auto px-4">
       <FeaturedProductsSlider products={homeProducts} baseUrl={baseUrl} />

      </div>
    </section>

    {/* ===== CATEGORIES ===== */}
    <section className="w-full bg-gray-100 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Shop by Category</h2>
          <p className="text-gray-600 text-sm md:text-base">Browse our wide range of products</p>
        </div>
        <CategorySlider categories={homeCategories} baseUrl={baseUrl} />
      </div>
    </section>
{/* ===== NEW ARRIVALS ===== */}
<section className="w-full bg-gray-50 py-4">
  <div className="max-w-7xl mx-auto px-4">
    <NewArrivalsProductsSlider baseUrl={baseUrl} />
  </div>
</section>
   {/* ===== TOP BRANDS ===== */}
<section className="w-full bg-white py-4">
  <div className="max-w-7xl mx-auto px-4">
   <div className="relative mb-8">

  {/* View All Button - Right Side */}
  <Link
    href="/brands"
    className="absolute right-0 top-0 text-sm md:text-base font-medium text-[#445D41] bg-green-50 border border-green-200 px-2 py-1 rounded hover:text-green-700 transition"
  >
    View All Brands →
  </Link>

  {/* Centered Heading */}
  <div className="text-center">
    <h2 className="text-2xl md:text-3xl font-bold mb-1">
      Top Brands
    </h2>
    <p className="text-gray-600 text-sm md:text-base">
      Explore popular brands you can trust
    </p>
  </div>

</div>

    {brands.length === 0 ? (
      <p className="text-center text-gray-500">No brands available.</p>
    ) : (
      <TopBrandsSlider brands={brands} baseUrl={baseUrl} />
    )}
  </div>
</section>
  {/* ===== WHY CHOOSE US ===== */}
    <section className="w-full bg-gray-100 py-0">
      <div className="max-w-7xl mx-auto px-4">
        <WhyChooseUs />
      </div>
    </section>
  </div>
   </>
);

}
