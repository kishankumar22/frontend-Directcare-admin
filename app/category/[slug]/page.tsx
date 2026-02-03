import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CategoryClient from "./CategoryClient";

interface SearchParams {
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
  discount?: string; // ✅ ADD THIS
}

async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { next: { revalidate: 600 } }
  );

  const json = await res.json();
  return json.data.find((c: any) => c.slug === slug) || null;
}



// server-side products fetch
async function getProducts(
  params: SearchParams = {},
  categorySlug?: string
) {
  const {
    page = "1",
    pageSize = "20",
    sortBy = "name",
    sortDirection = "asc",
    
  } = params;

  const query = new URLSearchParams({
    page,
    pageSize,
    sortBy,
    sortDirection,
  });

  
  if (categorySlug) query.set("categorySlug", categorySlug);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Products?${query.toString()}`,
    { cache: "no-store" }
  );

  return res.json();
}


export async function generateMetadata({ params, searchParams }: any) {
  const { slug } = await params;
  const discount = searchParams?.discount;
  const category = await getCategoryBySlug(slug);

  return {
    title: discount
      ? `${category?.name} – ${discount}% OFF`
      : category?.metaTitle || category?.name || "Category",
    description:
      category?.metaDescription || category?.description || "",
  };
}


function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
const discount = searchParamsResolved.discount
  ? Number(searchParamsResolved.discount)
  : null;

  const category = await getCategoryBySlug(slug);

  if (!category) {
    throw new Error("Category not found");
  }
// 🔥 fetch full category tree ONCE (for breadcrumb path)
const allCategoriesRes = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
  { next: { revalidate: 600 } }
).then((res) => res.json());
// 🧭 Build breadcrumb path from category tree
const categoryPath =
  findCategoryPath(allCategoriesRes.data, slug) || [];

// Final breadcrumb items
const breadcrumbs = [
  { label: "Home", href: "/" },
  ...categoryPath.slice(0, -1).map((c: any) => ({
    label: c.name,
    href: `/category/${c.slug}`,
  })),
  { label: categoryPath.at(-1)?.name || category.name },
];

  // 🧭 find full category path from tree
function findCategoryPath(
  categories: any[],
  slug: string,
  path: any[] = []
): any[] | null {
  for (const cat of categories) {
    const newPath = [...path, cat];

    if (cat.slug === slug) {
      return newPath;
    }

    if (Array.isArray(cat.subCategories) && cat.subCategories.length > 0) {
      const result = findCategoryPath(cat.subCategories, slug, newPath);
      if (result) return result;
    }
  }
  return null;
}

  // ⭐ ALL category ids for filter (main + subchildren)
 const productsRes = await getProducts(searchParamsResolved, slug);

  const vatRatesRes = await fetch(
  "https://testapi.knowledgemarkg.com/api/VATRates?activeOnly=true",
  { next: { revalidate: 600 } }
).then((res) => res.json());

const vatRates = vatRatesRes.data || [];

 

  return (
    <Suspense fallback={<Loading />}>
      <CategoryClient
        category={category}
         breadcrumbs={breadcrumbs}   // ✅ NEW PROP
        initialProducts={productsRes.data.items}
        totalCount={productsRes.data.totalCount}
        currentPage={productsRes.data.page}
        pageSize={productsRes.data.pageSize}
        totalPages={productsRes.data.totalPages}
        initialSortBy={searchParamsResolved.sortBy || "name"}
        initialSortDirection={searchParamsResolved.sortDirection || "asc"}
        brands={category.brands ?? []}   // ✅ ONLY THIS
         vatRates={vatRates}   // ✅ YE ADD KARNA HAI
         discount={discount} // ✅ ADD THIS
      />
    </Suspense>
  );
}
