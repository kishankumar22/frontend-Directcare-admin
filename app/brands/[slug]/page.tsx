// app/brands/[slug]/page.tsx

import BrandsClient from "./BrandsClient";

interface BrandPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getBrandProductsBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Products/by-brand/${slug}?page=1&pageSize=50&sortDirection=asc&isPublished=true`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Brand products fetch failed");
  }

  return res.json();
}

export default async function BrandPage({ params }: BrandPageProps) {
  // ✅ NEXT 15 FIX
  const { slug } = await params;

  const productsRes = await getBrandProductsBySlug(slug);

  return (
    <BrandsClient
      brandSlug={slug}
      initialItems={productsRes?.data?.items ?? []}
      totalPages={productsRes?.data?.totalPages ?? 1}
    />
  );
}
