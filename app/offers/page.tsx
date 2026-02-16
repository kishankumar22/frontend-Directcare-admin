// app/offers/page.tsx
import OffersClient from "./OffersClient";

const PAGE_SIZE = 12;

interface OffersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  // ✅ NEXT 15 REQUIRED
  const sp = await searchParams;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  const params = new URLSearchParams({
    page: "1",
    pageSize: String(PAGE_SIZE),
    sortDirection: (sp.sortDirection as string) ?? "asc",
  });

  if (sp.categoryId) {
    params.append("categoryId", sp.categoryId as string);
  }

  if (sp.searchTerm) {
    params.append("searchTerm", sp.searchTerm as string);
  }

  if (sp.sortBy) {
    params.append("sortBy", sp.sortBy as string);
  }

  const res = await fetch(
    `${baseUrl}/api/Products/discounted?${params.toString()}&isPublished=true`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Offers API error:", err);
    throw new Error("Failed to load offers");
  }

  const json = await res.json();
  const items = json?.data?.items ?? [];

  return (
    <OffersClient
      initialItems={items}
      initialHasMore={items.length === PAGE_SIZE}
    />
  );
}
