import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HomeBannerSlider from "@/components/HomeBannerSlider";
import FeaturedProductsSlider from "@/components/FeaturedProductsSlider";
import TopBrandsSlider from "@/components/TopBrandsSlider";
import CategorySlider from "@/components/CategorySlider";
import NewsletterWrapper from "@/components/NewsletterWrapper";
import CategoryOffersSlider from "@/components/CategoryOffersSlider";
import { getActiveBanners } from "@/lib/bannerUtils";
import {
  ShoppingCart,
  Star,
  TrendingUp,
  Zap,
  Gift,
  Shield,
} from "lucide-react";
import WhyChooseUs from "@/components/WhyChooseUs";

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
      next: { revalidate: 60 },
    });
    const result = await res.json();
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}


async function getProducts(baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/Products?page=1&pageSize=10&sortDirection=asc`, {
      next: { revalidate: 60 },
    });
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
      { next: { revalidate: 300 } }
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
    const res = await fetch(`${baseUrl}/api/Brands?includeUnpublished=false`, {
      next: { revalidate: 300 },
    });
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

 return (
  <>
    {/* 🔥 Newsletter Popup (client side) */}
    <NewsletterWrapper />
  <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-x-hidden">

    {/* ===== HERO SLIDER ===== */}
    <section className="w-full">
      <HomeBannerSlider banners={homeBanners} baseUrl={baseUrl} />

    </section>

    {/* ===== FEATURES ===== */}
    <section className="w-full bg-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-start gap-3 md:gap-4 p-4 md:p-6">
                <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                  <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-base md:text-lg">{feature.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
{/* ===== CATEGORY OFFERS (NEW) ===== */}
<CategoryOffersSlider categories={categories} baseUrl={baseUrl} />
    {/* ===== PROMO BANNER ===== */}
 {seasonalBanners.length > 0 && (
  <section className="w-full py-6 bg-white">
    
      {seasonalBanners.map(banner => {
        const Wrapper = banner.link ? Link : "div";

        return (
          <Wrapper
            key={banner.id}
            href={banner.link || ""}
            className={banner.link ? "block cursor-pointer" : ""}
          >
            <img
              src={`${baseUrl}${banner.imageUrl}`}
              alt={banner.title}
              className="w-full h-auto object-cover block cursor-pointer"
            />
          </Wrapper>
        );
      })}
    
  </section>
)}


    {/* ===== FEATURED PRODUCTS ===== */}
    <section className="w-full bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <FeaturedProductsSlider products={products} baseUrl={baseUrl} />
      </div>
    </section>

    {/* ===== CATEGORIES ===== */}
    <section className="w-full bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Shop by Category</h2>
          <p className="text-gray-600 text-sm md:text-base">Browse our wide range of products</p>
        </div>
        <CategorySlider categories={categories} baseUrl={baseUrl} />
      </div>
    </section>

  
   {/* ===== TOP BRANDS ===== */}
<section className="w-full bg-white py-8">
  <div className="max-w-7xl mx-auto px-4">
    <div className="text-center mb-8">
      <h2 className="text-2xl md:text-3xl font-bold mb-1">Top Brands</h2>
      <p className="text-gray-600 text-sm md:text-base">
        Explore popular brands you can trust
      </p>
    </div>

    {brands.length === 0 ? (
      <p className="text-center text-gray-500">No brands available.</p>
    ) : (
      <TopBrandsSlider brands={brands} baseUrl={baseUrl} />
    )}
  </div>
</section>
  {/* ===== WHY CHOOSE US ===== */}
    <section className="w-full bg-gray-100 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <WhyChooseUs />
      </div>
    </section>
  </div>
   </>
);

}
