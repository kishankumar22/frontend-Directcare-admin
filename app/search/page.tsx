import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic"; 

export default async function SearchPage({ searchParams }: any) {
  const query = searchParams.q ?? "";

  let products: any[] = [];
  let errorMessage = "";

  if (query.length > 1) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Products/quick-search?query=${query}&limit=50`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (json.success) {
        products = json.data;
      } else {
        errorMessage = json.message;
      }
    } catch (err) {
      errorMessage = "Something went wrong. Please try again.";
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* HEADER */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
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

      {/* RESULTS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
        {products.map((item) => {
          const imageUrl = item.mainImageUrl?.startsWith("http")
            ? item.mainImageUrl
            : `${process.env.NEXT_PUBLIC_API_URL}${item.mainImageUrl}`;

          return (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              className="border rounded-xl p-3 shadow-sm hover:shadow-md transition"
            >
              <Image
                src={imageUrl}
                alt={item.name}
                width={200}
                height={200}
                className="object-contain w-full h-40"
              />

              <h3 className="text-sm font-medium text-gray-900 mt-2 line-clamp-2">
                {item.name}
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                {item.categoryName}
              </p>

              {/* STOCK */}
              <div className="mt-2">
                {item.inStock ? (
                  <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">
                    In Stock
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-600 font-semibold">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* PRICE */}
              <p className="text-[#445D41] font-bold text-sm mt-2">
                £{item.price.toFixed(2)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
