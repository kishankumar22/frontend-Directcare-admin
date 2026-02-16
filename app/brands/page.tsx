import Link from "next/link";

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
      `${baseUrl}/api/Brands?includeUnpublished=false`,
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

      {/* ===== BRANDS GRID ===== */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {brands.length === 0 ? (
          <p className="text-center text-gray-500">
            No brands available.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="group relative bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col items-center justify-center" >
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />

                {/* Logo */}
                <div className="relative w-[120px] h-[120px] md:w-[140px] md:h-[140px] flex items-center justify-center mb-5">
                  <img
                    src={
                      brand.logoUrl?.startsWith("http")
                        ? brand.logoUrl
                        : `${baseUrl}${brand.logoUrl}`
                    }
                    alt={brand.name}
                    className="w-auto h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Brand Name */}
                <h3 className="relative text-sm md:text-base font-semibold text-gray-900 text-center group-hover:text-blue-600 transition">
                  {brand.name}
                </h3>

              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
