export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import NewArrivalsClient from "./NewArrivalsClient";

interface SearchParams {
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
  categorySlug?: string;
  brands?: string; // brand slugs, comma-separated
  price?: string;  // "min-max"
  minRating?: string;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  subCategories?: CategoryNode[];
}

function flattenCategories(categories: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function recurse(cats: CategoryNode[]) {
    for (const cat of cats) {
      if (!result.some((r) => r.id === cat.id)) {
        result.push(cat);
      }
      if (cat.subCategories && cat.subCategories.length > 0) {
        recurse(cat.subCategories);
      }
    }
  }
  recurse(categories);
  return result;
}

async function getCategories(baseUrl: string): Promise<CategoryNode[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/Categories?includeInactive=false&includeSubCategories=true&isActive=true&isDeleted=false`,
      { next: { revalidate: 60 } }
    );
    const text = await res.text();
    if (!text) return [];
    const json = JSON.parse(text);
    const items = Array.isArray(json.data) ? json.data : json.data?.items || [];
    return flattenCategories(items);
  } catch {
    return [];
  }
}

async function getBrands(baseUrl: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/Brands?includeUnpublished=false&isActive=true&isDeleted=false`,
      { next: { revalidate: 60 } }
    );
    const text = await res.text();
    if (!text) return [];
    const json = JSON.parse(text);
    return Array.isArray(json.data) ? json.data : json.data?.items || [];
  } catch {
    return [];
  }
}

async function getProducts(baseUrl: string, params: SearchParams, brandIds?: string) {
  const {
    page = "1",
    pageSize = "20",
    sortBy = "displayorder",
    sortDirection = "asc",
    price,
    minRating,
    categorySlug,
  } = params;

  const query = new URLSearchParams({
    page,
    pageSize,
    markAsNew: "true",
    isPublished: "true",
  });

  if (sortBy) query.set("sortBy", sortBy);
  if (sortDirection) query.set("sortDirection", sortDirection);
  if (categorySlug) query.set("categorySlug", categorySlug);
  if (brandIds) query.set("brandIds", brandIds);

  if (price) {
    const [min, max] = price.split("-");
    if (min) query.set("minPrice", min);
    if (max) query.set("maxPrice", max);
  }

  if (minRating) query.set("minRating", minRating);

  const empty = { success: false, data: { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 1 } };
  try {
    const res = await fetch(`${baseUrl}/api/Products?${query.toString()}`, { cache: "no-store" });
    const text = await res.text();
    if (!text) return empty;
    try {
      return JSON.parse(text);
    } catch {
      return empty;
    }
  } catch {
    return empty;
  }
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: "Newly Added Products",
    description: "Browse all newly added products.",
  };
}

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const searchParamsResolved = await searchParams;

  const categories = await getCategories(baseUrl);
  const brands = await getBrands(baseUrl);

  const brandSlugs = searchParamsResolved.brands?.split(",").filter(Boolean) ?? [];
  const resolvedBrandIds = brandSlugs.length > 0
    ? brands.filter((b: any) => brandSlugs.includes(b.slug)).map((b: any) => b.id).join(",")
    : undefined;

  const productsRes = await getProducts(baseUrl, searchParamsResolved, resolvedBrandIds);

  const vatRatesRes = await fetch(
    `${baseUrl}/api/VATRates?activeOnly=true`,
    { next: { revalidate: 60 } }
  ).then((r) => r.json());

  return (
    <Suspense fallback={<Loading />}>
      <NewArrivalsClient
        categories={categories}
        brands={brands}
        initialProducts={productsRes.data?.items ?? []}
        totalCount={productsRes.data?.totalCount ?? 0}
        currentPage={productsRes.data?.page ?? 1}
        pageSize={productsRes.data?.pageSize ?? 20}
        totalPages={productsRes.data?.totalPages ?? 1}
        initialSortBy={searchParamsResolved.sortBy || "displayorder"}
        initialSortDirection={searchParamsResolved.sortDirection || "asc"}
        vatRates={vatRatesRes.data || []}
      />
    </Suspense>
  );
}
