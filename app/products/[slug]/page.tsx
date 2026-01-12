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
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/Products?slug=${encodeURIComponent(slug)}`;

    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('❌ Product API error:', res.status);
      return null;
    }

    const data = await res.json();

    if (data?.success && Array.isArray(data.data?.items)) {
      return data.data.items.find((p: Product) => p.slug === slug) ?? null;
    }

    return null;
  } catch (err) {
    console.error('❌ Product fetch failed:', err);
    return null;
  }
}


// ⭐ FIX: params is now Promise
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found | Direct Care',
      description: 'The product you are looking for could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const mainImage = product.images?.[0]?.imageUrl
    ? `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`
    : undefined;

  return {
    title: `${product.name} | Direct Care`,
    description:
      product.shortDescription?.replace(/<[^>]*>/g, '').slice(0, 160) ||
      product.name,
    openGraph: {
      title: product.name,
      description:
        product.shortDescription?.replace(/<[^>]*>/g, '') || product.name,
      images: mainImage ? [{ url: mainImage }] : [],
      type: 'website',
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
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  return <ProductClient product={product} />;
}

