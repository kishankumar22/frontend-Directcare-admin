import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CategoryClient from "./CategoryClient";

interface SearchParams {
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
}

// Get Category by slug (STATIC cache)
async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { next: { revalidate: 600 } } // 10 min cache
  );

  const json = await res.json();
  return json.data.find((c: any) => c.slug === slug) || null;
}

// Products — always dynamic
async function getProducts(params: SearchParams = {}) {
  const {
    page = "1",
    pageSize = "20",
    sortBy = "name",
    sortDirection = "asc",
    searchTerm = "",
  } = params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Products?page=${page}&pageSize=${pageSize}&sortDirection=${sortDirection}&sortBy=${sortBy}&searchTerm=${searchTerm}`,
    { cache: "no-store" }
  );

  return res.json();
}

// ⭐ MUST USE Promise params (your project requires this)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return {
    title: `${slug.replace(/-/g, " ")} | Category`,
    description: "Browse products in this category",
  };
}


function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

// ⭐ MUST USE Promise types for params + searchParams
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  const category = await getCategoryBySlug(slug);
  const productsRes = await getProducts(searchParamsResolved);

  // Brands — static
  const brandsRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Brands?includeUnpublished=false`,
    { next: { revalidate: 600 } }
  ).then((res) => res.json());

  return (
    <Suspense fallback={<Loading />}>
      <CategoryClient
        category={category}
        initialProducts={productsRes.data.items}
        totalCount={productsRes.data.totalCount}
        currentPage={productsRes.data.page}
        pageSize={productsRes.data.pageSize}
        totalPages={productsRes.data.totalPages}
        initialSearchTerm={searchParamsResolved.searchTerm || ""}
        initialSortBy={searchParamsResolved.sortBy || "name"}
        initialSortDirection={searchParamsResolved.sortDirection || "asc"}
        brands={brandsRes.data}
      />
    </Suspense>
  );
}
