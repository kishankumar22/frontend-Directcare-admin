import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HomeBannerSlider from "@/components/HomeBannerSlider";
import {
  ShoppingCart,
  Star,
  TrendingUp,
  Zap,
  Gift,
  Shield,
} from "lucide-react";

// ✅ Static feature section
const features = [
  { icon: Zap, title: "Fast Delivery", description: "Get your orders in 24-48 hours" },
  { icon: Shield, title: "Secure Payment", description: "100% secure transactions" },
  { icon: Gift, title: "Gift Cards", description: "Perfect for any occasion" },
  { icon: TrendingUp, title: "Best Prices", description: "Competitive pricing guaranteed" },
];

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

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  productCount: number;
  sortOrder: number;
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
async function getHomeBanners(baseUrl: string): Promise<HomeBanner[]> {
  try {
    const res = await fetch(`${baseUrl}/api/Banners?includeInactive=true`, {
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
    getHomeBanners(baseUrl),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* ✅ HERO SLIDER */}
      <HomeBannerSlider banners={banners} baseUrl={baseUrl} />

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* ✅ FEATURES SECTION */}
        <section className="mb-12 md:mb-16">
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
        </section>

        {/* ✅ FEATURED PRODUCTS */}
        <section className="mb-12 md:mb-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
            <div className="mb-3 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-1">Featured Products</h2>
              <p className="text-gray-600 text-sm md:text-base">Our best-selling items this month</p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="text-sm md:text-base py-2">View All</Button>
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product: Product) => (
                <Card key={product.id} className="group border-0 shadow-md hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* ✅ CLICKABLE IMAGE - Navigate to product detail */}
                    <Link href={`/products/${product.slug}`} className="block">
                      <div className="relative flex items-center justify-center h-32 sm:h-40 md:h-48 overflow-hidden">
                        <img
                          src={
                            product.images?.[0]?.imageUrl?.startsWith("http")
                              ? product.images[0].imageUrl
                              : `${baseUrl}${product.images?.[0]?.imageUrl || ""}`
                          }
                          alt={product.name}
                          className="object-contain w-full h-full group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </Link>

                    {/* CONTENT */}
                    <div className="p-3 md:p-4 flex flex-col flex-grow">
                      {/* ✅ CLICKABLE TITLE - Navigate to product detail */}
                      <Link href={`/products/${product.slug}`}>
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 line-clamp-2 hover:text-[#445D41] transition">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-3">
                        <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs md:text-sm">
                          {product.averageRating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({product.reviewCount || 0})
                        </span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2 mb-3 md:mb-4 mt-auto">
                        <span className="text-lg md:text-2xl font-bold text-blue-600">
                          £{product.price}
                        </span>
                        {product.oldPrice && (
                          <span className="text-xs md:text-sm text-gray-400 line-through">
                            £{product.oldPrice}
                          </span>
                        )}
                      </div>

                      {/* ✅ Add to Cart Button - Stays as button (can add onClick later) */}
                      <Button className="w-full mt-auto text-xs md:text-sm bg-[#445D41] hover:bg-green-700">
                        <ShoppingCart className="mr-1 md:mr-2 h-4 w-4" /> Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ✅ TOP BRANDS */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Top Brands</h2>
            <p className="text-gray-600 text-sm md:text-base">Explore popular brands you can trust</p>
          </div>

          {brands.length === 0 ? (
            <p className="text-center text-gray-500">No brands available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {brands.map((brand: Brand) => (
                <Link key={brand.id} href={`/brand/${brand.slug}`}>
                  <Card className="group p-4 md:p-6 text-center shadow-md hover:shadow-lg transition rounded-xl">
                    <img
                      src={
                        brand.logoUrl.startsWith("http")
                          ? brand.logoUrl
                          : `${baseUrl}${brand.logoUrl}`
                      }
                      alt={brand.name}
                      className="w-16 h-16 md:w-24 md:h-24 mx-auto object-contain mb-3 md:mb-4 transition-transform group-hover:scale-110"
                    />
                    <h3 className="font-semibold text-sm md:text-lg">{brand.name}</h3>
                    <p className="text-xs md:text-sm text-gray-500">{brand.productCount} products</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ✅ CATEGORIES */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Shop by Category</h2>
            <p className="text-gray-600 text-sm md:text-base">Browse our wide range of products</p>
          </div>

          {categories.length === 0 ? (
            <p className="text-center text-gray-500">No categories found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {categories.map((category: Category) => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <Card className="shadow-md hover:shadow-lg transition rounded-lg">
                    <CardContent className="p-4 md:p-6 text-center">
                      <img
                        src={
                          category.imageUrl.startsWith("http")
                            ? category.imageUrl
                            : `${baseUrl}${category.imageUrl}`
                        }
                        alt={category.name}
                        className="w-12 h-12 md:w-16 md:h-16 object-contain mx-auto mb-2 md:mb-3"
                      />
                      <h3 className="font-semibold text-sm md:text-base">{category.name}</h3>
                      <p className="text-xs md:text-sm text-gray-500">{category.productCount} items</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ✅ NEWSLETTER CTA */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            Join Our Newsletter
          </h2>
          <p className="text-sm md:text-xl mb-6 md:mb-8 text-purple-100">
            Get exclusive deals and updates delivered to your inbox
          </p>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm md:text-base"
            />
            <Button className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 text-sm md:text-lg">
              Subscribe
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
