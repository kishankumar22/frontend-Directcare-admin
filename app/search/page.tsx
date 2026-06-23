export const dynamic = "force-dynamic";

import SearchClient from "./SearchClient";
import SearchTracker from "./SearchTracker";

export default async function SearchPage({ searchParams }: any) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q ?? "";

  let products: any[] = [];
  let totalPages = 1;
  let errorMessage = "";

  if (query.length > 1) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Products?page=1&pageSize=20&searchTerm=${encodeURIComponent(query)}&sortDirection=asc&isPublished=true&isActive=true&isDeleted=false`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (json.success) {
        products = json.data?.items || [];
        totalPages = json.data?.totalPages || 1;
      } else {
        errorMessage = json.message;
      }
    } catch (err) {
      errorMessage = "Something went wrong. Please try again.";
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      {/* HEADER */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Search results for: 
        <span className="text-[#445D41]"> "{query}"</span>
      </h1>

      {/* NO QUERY */}
      {query.length < 2 && (
        <p className="text-gray-600 text-sm">
          Please enter at least 2 characters to search.
        </p>
      )}

      {/* ERROR */}
      {errorMessage && (
        <p className="text-red-600 font-medium mt-4">{errorMessage}</p>
      )}

      {/* NO RESULTS */}
      {query.length > 1 && products.length === 0 && !errorMessage && (
        <p className="text-gray-500 text-sm mt-4">
          No products found. Try another search.
        </p>
      )}

      {/* RESULTS DISPLAY */}
      {query.length > 1 && products.length > 0 && (
        <>
          <SearchTracker products={products} query={query} />
          <SearchClient
            query={query}
            initialItems={products}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
