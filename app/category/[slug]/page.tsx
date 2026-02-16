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

/* =====================
   Helpers (CATEGORY TREE)
===================== */

function findCategoryBySlug(categories: any[], slug: string): any | null {
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
    `${process.env.NEXT_PUBLIC_API_URL}/api/Products?${query.toString()}&isPublished=true`,
    { cache: "no-store" }
  );

  return res.json();
}

/* =====================
   Metadata
===================== */

export async function generateMetadata({ params, searchParams }: any) {
  const { slug } = await params;
  const discount = searchParams?.discount;

  const categoriesRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { next: { revalidate: 600 } }
  ).then((r) => r.json());

  const category = findCategoryBySlug(categoriesRes.data, slug);

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
    description: category.metaDescription || category.description || "",
  };
}

/* =====================
   Loading UI
===================== */

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

/* =====================
   Page
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

  const discount = searchParamsResolved.discount
    ? Number(searchParamsResolved.discount)
    : null;

  // ✅ Fetch category tree ONCE
  const categoriesRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { next: { revalidate: 600 } }
  ).then((r) => r.json());

  const category = findCategoryBySlug(categoriesRes.data, slug);
  if (!category) return notFound();

  const categoryPath =
    findCategoryPath(categoriesRes.data, slug) || [];

  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...categoryPath.slice(0, -1).map((c: any) => ({
      label: c.name,
      href: `/category/${c.slug}`,
    })),
    { label: categoryPath.at(-1)?.name || category.name },
  ];

  const productsRes = await getProducts(searchParamsResolved, slug);

  const vatRatesRes = await fetch(
    "https://testapi.knowledgemarkg.com/api/VATRates?activeOnly=true",
    { next: { revalidate: 600 } }
  ).then((r) => r.json());

  return (
    <Suspense fallback={<Loading />}>
      <CategoryClient
        category={category}
        breadcrumbs={breadcrumbs}
        initialProducts={productsRes.data.items}
        totalCount={productsRes.data.totalCount}
        currentPage={productsRes.data.page}
        pageSize={productsRes.data.pageSize}
        totalPages={productsRes.data.totalPages}
        initialSortBy={searchParamsResolved.sortBy || "name"}
        initialSortDirection={searchParamsResolved.sortDirection || "asc"}
        brands={category.brands ?? []}
        vatRates={vatRatesRes.data || []}
        discount={discount}
      />
    </Suspense>
  );
}
