// app/products/page.tsx (Server Component - NO "use client")
import { Suspense } from 'react';
import ProductsClient from './ProductsClient';
import { Loader2 } from 'lucide-react';

// ✅ Server-side types
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  slug: string;
  sku: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  categoryName: string;
  brandName: string;
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
  tags: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    items: Product[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

// ✅ Server-side data fetching
async function getProducts(page = 1, pageSize = 12) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products?page=${page}&pageSize=${pageSize}&sortBy=name&sortDirection=asc`,
      {
        next: { revalidate: 60 }, // ✅ Cache for 60 seconds
      }
    );

    if (!res.ok) {
      return { success: false, data: { items: [], totalCount: 0, totalPages: 0 } };
    }

    const data: ApiResponse = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, data: { items: [], totalCount: 0, totalPages: 0 } };
  }
}

// ✅ Generate Metadata for SEO
export async function generateMetadata() {
  return {
    title: 'All Products | Direct Care',
    description: 'Browse our complete collection of health & beauty products',
    openGraph: {
      title: 'All Products | Direct Care',
      description: 'Browse our complete collection of health & beauty products',
    },
  };
}

// ✅ Loading Component
function ProductsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

// ✅ Main Server Component
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  
  // ✅ Server-side fetch (No loading state needed)
  const productsData = await getProducts(page, 12);

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsClient 
        initialProducts={productsData.data.items} 
        initialTotalPages={productsData.data.totalPages}
        initialPage={page}
      />
    </Suspense>
  );
}
