// app/products/page.tsx (Server Component)
import { Suspense } from 'react';
import ProductsClient from './ProductsClient';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-config';

// ✅ Types
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

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  productCount: number;
  subCategories: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  isPublished: boolean;
  productCount: number;
}

interface SearchParams {
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: string;
  pageSize?: string;
}

// ✅ Fetch Products with timeout
async function getAllProducts(params: SearchParams = {}): Promise<ApiResponse> {
  const {
    searchTerm = '',
    sortBy = 'name',
    sortDirection = 'asc',
    page = '1',
    pageSize = '1000'
  } = params;

  try {
    const queryParams = new URLSearchParams({
      page,
      pageSize,
      sortBy,
      sortDirection,
    });

    if (searchTerm) {
      queryParams.set('searchTerm', searchTerm);
    }

    const res = await fetch(
      `${API_ENDPOINTS.products}?${queryParams.toString()}`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    if (!res.ok) {
      console.error('Products API Error:', res.status, res.statusText);
      return { 
        success: false,
        message: 'Failed to fetch products',
        data: { 
          items: [], 
          totalCount: 0, 
          totalPages: 0,
          page: 1,
          pageSize: parseInt(pageSize),
          hasPrevious: false,
          hasNext: false
        } 
      };
    }

    const data: ApiResponse = await res.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Products API timeout');
    } else {
      console.error('Error fetching products:', error);
    }
    
    return { 
      success: false,
      message: 'Error fetching products',
      data: { 
        items: [], 
        totalCount: 0, 
        totalPages: 0,
        page: 1,
        pageSize: parseInt(pageSize),
        hasPrevious: false,
        hasNext: false
      } 
    };
  }
}

// ✅ Fetch Categories with timeout
async function getCategories(): Promise<{ success: boolean; data: Category[] }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error('Categories API Error:', res.status, res.statusText);
      return { success: false, data: [] };
    }

    const data: { success: boolean; data: Category[] } = await res.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Categories API timeout');
    } else {
      console.error('Error fetching categories:', error);
    }
    return { success: false, data: [] };
  }
}

// ✅ Fetch Brands with timeout
async function getBrands(): Promise<{ success: boolean; data: Brand[] }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Brands?includeUnpublished=false`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.error('Brands API Error:', res.status, res.statusText);
      return { success: false, data: [] };
    }

    const data: { success: boolean; data: Brand[] } = await res.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Brands API timeout');
    } else {
      console.error('Error fetching brands:', error);
    }
    return { success: false, data: [] };
  }
}

// ✅ SEO Metadata
export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<SearchParams> 
}) {
  const params = await searchParams;
  const { searchTerm } = params;

  let title = 'All Products | Direct Care';
  let description = 'Browse our complete collection of health & beauty products';

  if (searchTerm) {
    title = `Search: ${searchTerm} | Direct Care`;
    description = `Search results for "${searchTerm}" in our health & beauty products`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Direct Care',
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/products`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/products`,
    },
  };
}

// ✅ Loading Component
function ProductsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#445D41] mx-auto mb-4" />
        <p className="text-gray-600">Loading products...</p>
      </div>
    </div>
  );
}

// ✅ Main Server Component
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  
  // ✅ Parallel fetch with error handling
  const [productsData, categoriesData, brandsData] = await Promise.all([
    getAllProducts(params),
    getCategories(),
    getBrands()
  ]);

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsClient 
        initialProducts={productsData.data.items} 
        totalCount={productsData.data.totalCount}
        currentPage={productsData.data.page}
        pageSize={productsData.data.pageSize}
        totalPages={productsData.data.totalPages}
        initialSearchTerm={params.searchTerm || ''}
        initialSortBy={params.sortBy || 'name'}
        initialSortDirection={params.sortDirection || 'asc'}
        categories={categoriesData.data}
        brands={brandsData.data}
      />
    </Suspense>
  );
}
