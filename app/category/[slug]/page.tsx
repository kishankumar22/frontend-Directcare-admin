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

// Get Category by slug
async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const category = json.data.find((c: any) => c.slug === slug);
  return category || null;
}

// Get products by category slug (simple /products fetch for now)
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

  const data = await res.json();
  return data;
}

// ⭐ FIX: params is now Promise
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> // ✅ Changed to Promise
}) {
  const { slug } = await params; // ✅ Added await
  const category = await getCategoryBySlug(slug);

  return {
    title: category?.metaTitle || category?.name || "Category",
    description: category?.metaDescription || category?.description || "",
  };
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

// ⭐ FIX: Both params and searchParams are Promise
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>; // ✅ Changed to Promise
  searchParams: Promise<SearchParams>; // ✅ Changed to Promise
}) {
  const { slug } = await params; // ✅ Added await
  const searchParamsResolved = await searchParams; // ✅ Added await

  const category = await getCategoryBySlug(slug);
  const productsRes = await getProducts(searchParamsResolved);

  const brandsRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Brands?includeUnpublished=false`,
    { cache: "no-store" }
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
