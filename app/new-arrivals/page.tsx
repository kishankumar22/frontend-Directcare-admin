export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import NewArrivalsClient from "./NewArrivalsClient";

/* =====================
   Types
===================== */

interface SearchParams {
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
  discount?: string;
  discountIds?: string;
  subCategorySlug?: string;
  brands?: string;    // brand slugs, comma-separated  e.g. "acme,bandaid"
  price?: string;     // price range e.g. "10-100"
  minRating?: string;
}
type BreadcrumbItem = {
  label: string;
  href: string;
};
/* =====================
   Helpers (CATEGORY TREE)
===================== */

function findCategoryBySlug(categories: any[], slug: string): any | null {
  if (!Array.isArray(categories)) return null; // 🔥 FIX
  for (const cat of categories) {
    if (cat.slug === slug) return cat;

    if (Array.isArray(cat.subCategories) && cat.subCategories.length > 0) {
      const found = findCategoryBySlug(cat.subCategories, slug);
      if (found) return found;
    }
  }
  return null;
}

function findCategoryPath(
  categories: any[],
  slug: string,
  path: any[] = []
): any[] | null {
  if (!Array.isArray(categories)) return null; // 🔥 FIX

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

/* =====================
   Products Fetch
===================== */

async function getProducts(
  params: SearchParams = {},
  categorySlug?: string,
  brandIds?: string   // pre-resolved brand IDs (mapped from slugs)
) {
  const {
    page = "1",
    pageSize = "20",
    sortBy = "default",
    sortDirection = "default",
    price,
    minRating,
    discountIds,
  } = params;

  const query = new URLSearchParams({
    page,
    pageSize,
    markAsNew: "true",
    isPublished: "true",
  });

  if (sortBy && sortBy !== "default") query.set("sortBy", sortBy);
  if (sortDirection && sortDirection !== "default") query.set("sortDirection", sortDirection);

  if (categorySlug) query.set("categorySlug", categorySlug);
  if (brandIds)     query.set("brandIds", brandIds);
  if (discountIds)  query.set("discountIds", discountIds);

  if (price) {
    const [min, max] = price.split("-");
    if (min) query.set("minPrice", min);
    if (max) query.set("maxPrice", max);
  }

  if (minRating) query.set("minRating", minRating);

  // Safe fetch: never throw on an empty/non-JSON/error response (would crash the page).
  const empty = { success: false, data: { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 1 } };
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products?${query.toString()}`,
      { cache: "no-store" }
    );
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

/* =====================
   Metadata
===================== */

export async function generateMetadata() {
  return {
    title: "New Arrivals | Direct Care",
    description: "Shop the latest newly added products at Direct Care.",
  };
}

export default async function NewArrivalsPage({ params, searchParams }: any) {
  const resolvedSearchParams = await searchParams;

  // We don't need a specific category for New Arrivals
  const category = {
    id: "new-arrivals-dummy-id",
    name: "New Arrivals",
    description: "Explore our recently added products.",
    slug: "new-arrivals",
    imageUrl: "",
    isActive: true,
    sortOrder: 0,
    productCount: 0,
    subCategories: []
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "New Arrivals", href: "/new-arrivals" },
  ];

  const discount = resolvedSearchParams.discount
    ? Number(resolvedSearchParams.discount)
    : null;

  // Fetch brands
  const brandsRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Brands?page=1&pageSize=100`,
    { next: { revalidate: 3600 } }
  ).then((r) => r.json());
  const brands = brandsRes.data?.items || [];

  // Match brand slugs from URL to IDs
  const brandSlugs = resolvedSearchParams?.brands
    ? resolvedSearchParams.brands.split(",").map((s: string) => s.trim())
    : [];
  let brandIdsStr = "";
  if (brandSlugs.length > 0) {
    const brandIds = brandSlugs
      .map((slug: string) => brands.find((b: any) => b.slug === slug)?.id)
      .filter(Boolean);
    if (brandIds.length > 0) {
      brandIdsStr = brandIds.join(",");
    }
  }

  // Fetch New Arrivals (with filters applied)
  const productsRes = await getProducts(
    resolvedSearchParams,
    undefined,
    brandIdsStr
  );
  
  const vatRatesRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/VATRates?activeOnly=true`,
    { next: { revalidate: 60 } }
  ).then((r) => r.json());
  const vatRates = vatRatesRes.data || [];

  const loadingFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      <NewArrivalsClient
        category={category}
        breadcrumbs={breadcrumbs}
        initialProducts={productsRes.data?.items || []}
        totalCount={productsRes.data?.totalCount || 0}
        currentPage={productsRes.data?.page || 1}
        pageSize={productsRes.data?.pageSize || 20}
        totalPages={productsRes.data?.totalPages || 1}
        initialSortBy={resolvedSearchParams?.sortBy || "createdAt"}
        initialSortDirection={resolvedSearchParams?.sortDirection || "desc"}
        brands={brands}
        vatRates={vatRates}
        discount={discount}
      />
    </Suspense>
  );
}
