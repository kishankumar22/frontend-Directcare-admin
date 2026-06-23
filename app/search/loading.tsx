export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 bg-white">
        {/* HEADER */}
        <div className="h-8 w-72 bg-gray-200 rounded animate-pulse mb-2" />
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-2 pb-6">
        {/* TOP BAR / BREADCRUMBS & SORT SKELETON */}
        <div className="flex justify-between items-center mb-3">
          {/* Breadcrumbs placeholder */}
          <div className="hidden md:block h-4 w-40 bg-gray-200 rounded animate-pulse" />
          {/* Sort select placeholder */}
          <div className="h-9 w-36 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex gap-8">
          {/* SIDEBAR SKELETON */}
          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <div className="border rounded-xl p-4 space-y-4 bg-white shadow-sm">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              <hr />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
              </div>
              <hr />
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </aside>

          {/* PRODUCTS LIST SKELETON */}
          <div className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border rounded-xl p-2 bg-white shadow-sm"
                >
                  {/* IMAGE */}
                  <div className="w-full h-44 md:h-56 bg-gray-200 rounded animate-pulse" />

                  {/* TITLE */}
                  <div className="h-4 bg-gray-200 rounded animate-pulse mt-3" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse mt-2 w-3/4" />

                  {/* RATING */}
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mt-3" />

                  {/* PRICE */}
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mt-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}