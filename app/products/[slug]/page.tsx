// app/products/[slug]/page.tsx
import { Suspense } from 'react';
import ProductClient from './ProductClient';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
  manufacturerName: string;
  images: ProductImage[];
  averageRating: number;
  reviewCount: number;
  tags: string;
  weight: number;
  weightUnit: string;
  specificationAttributes: string;
  relatedProductIds: string;
}

// ✅ CRITICAL FIX: Disable caching and add dynamic rendering
export const dynamic = 'force-dynamic'; // Force dynamic rendering
export const revalidate = 0; // Disable caching

// ✅ Server-side product fetch with NO CACHE
async function getProduct(slug: string): Promise<Product | null> {
  try {
    console.log('🔍 Fetching product for slug:', slug); // Debug log
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products?slug=${slug}`,
      {
        cache: 'no-store', // ✅ CRITICAL: Disable cache
        next: { revalidate: 0 }, // ✅ No caching
      }
    );

    if (!res.ok) {
      console.error('❌ API response not OK:', res.status);
      return null;
    }

    const data = await res.json();
    console.log('✅ Product fetched:', data.data?.items[0]?.name); // Debug log
    
    return data.success && data.data.items.length > 0 ? data.data.items[0] : null;
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return null;
  }
}

// ✅ SEO Metadata
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} | Direct Care`,
    description: product.shortDescription?.replace(/<[^>]*>/g, '').substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: [product.images[0]?.imageUrl],
    },
  };
}

// ✅ Loading Component
function ProductLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-[#445D41]" />
    </div>
  );
}

// ✅ Main Server Component with key prop
export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  
  console.log('📄 Rendering product page for slug:', slug); // Debug log
  
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // ✅ CRITICAL: Add key prop to force re-render on slug change
  return (
    <Suspense fallback={<ProductLoading />} key={slug}>
      <ProductClient product={product} key={product.id} />
    </Suspense>
  );
}
