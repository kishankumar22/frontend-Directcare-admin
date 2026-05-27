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
     `${process.env.NEXT_PUBLIC_API_URL}/api/Products?page=1&pageSize=50&searchTerm=${encodeURIComponent(query)}&sortDirection=asc&isPublished=true&isActive=true&isDeleted=false`,
      { cache: "no-store" }
    );

    const json = await res.json();

    if (json.success) {
      products = json.data?.items || [];
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

  const mainImage =
    item.mainImageUrl ||
    item.images?.find((img: any) => img.isMain)?.imageUrl ||
    item.images?.[0]?.imageUrl ||
    "/placeholder.png";

  const imageUrl = mainImage.startsWith("http")
    ? mainImage
    : `${process.env.NEXT_PUBLIC_API_URL}${mainImage}`;

  // DISCOUNT
  const comparePrice =
    item.compareAtPrice ||
    item.oldPrice ||
    0;

  const hasDiscount =
    comparePrice > item.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((comparePrice - item.price) /
          comparePrice) *
          100
      )
    : 0;

  return (
    <Link
      key={item.id}
      href={`/products/${item.slug}`}
      className="group border rounded-2xl p-3 bg-white hover:shadow-lg transition relative overflow-hidden"
    >

      {/* DISCOUNT BADGE */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          {discountPercent}% OFF
        </div>
      )}

      {/* IMAGE */}
      <div className="relative w-full h-52 bg-gray-50 rounded-xl overflow-hidden">
        <Image
          src={imageUrl}
          alt={item.name}
          fill
          className="object-contain group-hover:scale-105 transition duration-300"
        />
      </div>

      {/* TITLE */}
      <h3 className="text-sm font-semibold text-gray-900 mt-3 line-clamp-2 min-h-[40px]">
        {item.name}
      </h3>

      {/* CATEGORY */}
      <p className="text-xs text-gray-500 mt-1">
        {item.categoryName ||
          item.categories?.[0]?.categoryName}
      </p>

      {/* STOCK */}
      <div className="mt-2">
        {item.stockStatus === "InStock" ||
        item.inStock ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
            In Stock
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600 font-semibold">
            Out of Stock
          </span>
        )}
      </div>

      {/* PRICE */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <p className="text-[#445D41] font-bold text-lg">
          £{Number(item.price || 0).toFixed(2)}
        </p>

        {hasDiscount && (
          <p className="text-sm text-gray-400 line-through">
            £{Number(comparePrice).toFixed(2)}
          </p>
        )}
      </div>

    </Link>
  );
})}
      </div>
    </div>
  );
}
