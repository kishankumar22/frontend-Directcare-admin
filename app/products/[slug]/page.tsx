// app/products/[slug]/page.tsx
import { Suspense } from 'react';
import ProductClient from './ProductDetails';
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const timestamp = Date.now();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/Products?slug=${encodeURIComponent(slug)}&_t=${timestamp}`;
    
    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error('API Error:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    
    if (data.success && data.data?.items?.length > 0) {
      const product = data.data.items.find((item: Product) => item.slug === slug);
      
      if (product) {
        return product;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// ⭐ FIX: params is now Promise
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> // ✅ Changed to Promise
}) {
  const { slug } = await params; // ✅ Already has await (good!)
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Direct Care',
      description: 'The product you are looking for could not be found.',
    };
  }

  const mainImage = product.images[0]?.imageUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`
    : null;

  return {
    title: `${product.name} | Direct Care`,
    description: product.shortDescription?.replace(/<[^>]*>/g, '').substring(0, 160) || product.name,
    openGraph: {
      title: product.name,
      description: product.shortDescription?.replace(/<[^>]*>/g, '') || product.name,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${product.slug}`,
      siteName: 'Direct Care',
      images: mainImage ? [
        {
          url: mainImage,
          width: 1200,
          height: 630,
          alt: product.name,
        }
      ] : [],
      locale: 'en_US',
      type: 'website',
    },
    other: {
      'og:type': 'product.item',
      'product:price:amount': product.price.toString(),
      'product:price:currency': 'GBP',
      'product:availability': product.stockQuantity > 0 ? 'in stock' : 'out of stock',
      'product:condition': 'new',
      'product:brand': product.brandName || '',
      'product:category': product.categoryName || '',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.shortDescription?.replace(/<[^>]*>/g, '') || product.name,
      images: mainImage ? [mainImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${product.slug}`,
    },
  };
}

function ProductLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#445D41] mx-auto mb-4" />
        <p className="text-gray-600">Loading product details...</p>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return [];
}

// ⭐ FIX: params is now Promise
export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> // ✅ Changed to Promise
}) {
  const { slug } = await params; // ✅ Already has await (good!)
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <div key={slug}>
      <Suspense fallback={<ProductLoading />}>
        <ProductClient product={product} key={product.id} />
      </Suspense>
    </div>
  );
}
