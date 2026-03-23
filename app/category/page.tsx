import CategoriesClient from "@/components/CategoriesClient";

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  showOnHomepage?: boolean;
}

async function getAllCategories(baseUrl: string): Promise<Category[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/Categories?includeInactive=false&includeSubCategories=false&isActive=true&isDeleted=false`,
      { cache: "no-store" }
    );

    const result = await res.json();
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const categories = await getAllCategories(baseUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">

      {/* HERO HEADER */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-2 text-center">

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Explore Our Categories
          </h1>

          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Browse through all product categories and find what suits you best.
          </p>

        </div>
      </div>

      {/* CATEGORY SECTION */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {categories.length === 0 ? (
          <p className="text-center text-gray-500">
            No categories available.
          </p>
        ) : (
          <CategoriesClient
            categories={categories}
            baseUrl={baseUrl}
          />
        )}

      </div>

    </div>
  );
}