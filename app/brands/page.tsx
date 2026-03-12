// app/brands/page.tsx

import BrandsClient from "@/components/BrandsClient";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  showOnHomepage?: boolean;
}

async function getAllBrands(baseUrl: string): Promise<Brand[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/Brands?includeUnpublished=false&isActive=true&isDeleted=false`,
      { cache: "no-store" }
    );

    const result = await res.json();
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export default async function BrandsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const brands = await getAllBrands(baseUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">

      {/* ===== HERO HEADER ===== */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-2 text-center">

          <h1 className="text-3xl md:text-4xl font-semibold mb-0 tracking-tight">
            Explore Our Brands
          </h1>

          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Discover premium and trusted brands curated specially for you.
          </p>

        </div>
      </div>

      {/* ===== BRANDS SECTION ===== */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {brands.length === 0 ? (
          <p className="text-center text-gray-500">
            No brands available.
          </p>
        ) : (
          <BrandsClient brands={brands} baseUrl={baseUrl} />
        )}

      </div>

    </div>
  );
}