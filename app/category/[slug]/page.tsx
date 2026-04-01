import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";

/* =====================
   Types
===================== */

interface SearchParams {
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
  discount?: string;
}

type BreadcrumbItem = {
  label: string;
  href: string;
};

/* =====================
   Helpers
===================== */

function findCategoryBySlug(categories: any[], slug: string): any | null {
  if (!Array.isArray(categories)) return null;

  for (const cat of categories) {
    if (cat.slug === slug) return cat;

    if (cat.subCategories?.length) {
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
  if (!Array.isArray(categories)) return null;

  for (const cat of categories) {
    const newPath = [...path, cat];

    if (cat.slug === slug) return newPath;

    if (cat.subCategories?.length) {
      const result = findCategoryPath(cat.subCategories, slug, newPath);
      if (result) return result;
    }
  }
  return null;
}

/* =====================
   SHARED FETCH (FIXED)
===================== */

async function getCategoriesTree() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { next: { revalidate: 600 } }
  );

  const json = await res.json();

  return Array.isArray(json.data)
    ? json.data
    : json.data?.items || [];
}

/* =====================
   Products Fetch (FIXED)
===================== */

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
    { next: { revalidate: 60 } } // ✅ removed no-store
  );

  return res.json();
}

/* =====================
   Metadata (FIXED)
===================== */

export async function generateMetadata({ params, searchParams }: any) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const categories = await getCategoriesTree();
  const category = findCategoryBySlug(categories, slug);

  const discount = resolvedSearchParams?.discount;

  if (!category) {
    return {
      title: "Category not found",
      description: "",
    };
  }

  return {
    title: discount
      ? `${category.name} – ${discount}% OFF`
      : category.metaTitle || category.name,
    description:
      category.metaDescription || category.description || "",
  };
}

/* =====================
   Loading
===================== */

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

/* =====================
   Page (FINAL FIX)
===================== */

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  const discount = searchParamsResolved?.discount
    ? Number(searchParamsResolved.discount)
    : null;

  const [categories, productsRes, vatRatesRes] = await Promise.all([
    getCategoriesTree(),
    getProducts(searchParamsResolved, slug),
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/VATRates?activeOnly=true`,
      { next: { revalidate: 600 } }
    ).then((r) => r.json()),
  ]);

  const category = findCategoryBySlug(categories, slug);
  if (!category) return notFound();

  const categoryPath = findCategoryPath(categories, slug) || [];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...categoryPath.slice(0, -1).map((c: any) => ({
      label: c.name,
      href: `/category/${c.slug}`,
    })),
    {
      label: categoryPath.at(-1)?.name || category.name,
      href: `/category/${slug}`,
    },
  ];

  return (
    <Suspense fallback={<Loading />}>
      <CategoryClient
        category={category}
        breadcrumbs={breadcrumbs}
        initialProducts={productsRes.data?.items ?? []}
        totalCount={productsRes.data?.totalCount ?? 0}
        currentPage={productsRes.data?.page ?? 1}
        pageSize={productsRes.data?.pageSize ?? 20}
        totalPages={productsRes.data?.totalPages ?? 1}
        initialSortBy={searchParamsResolved.sortBy || "name"}
        initialSortDirection={searchParamsResolved.sortDirection || "asc"}
        brands={category.brands ?? []}
        vatRates={vatRatesRes.data || []}
        discount={discount}
      />
    </Suspense>
  );
}