export default function ProductsSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="animate-pulse">
      <div className="aspect-square bg-gray-200 rounded mb-2" />
      <div className="h-3 bg-gray-200 rounded mb-1" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  ));
}
