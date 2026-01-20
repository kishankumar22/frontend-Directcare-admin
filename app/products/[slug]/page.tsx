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
   crossSellProductIds: string; // ✅ ADD THIS
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getProduct(slug: string) {
  try {
    // 🔹 STEP 1: LIST API (slug / variant resolve ke liye)
    const listRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products?slug=${slug}&page=1&pageSize=200`,
      { cache: "no-store" }
    );

    if (!listRes.ok) return null;

    const listJson = await listRes.json();
    if (!listJson.success || !listJson.data?.items?.length) return null;

    const items = listJson.data.items;

    let product = items.find((p: any) => p.slug === slug);
    let selectedVariantId: string | null = null;

    if (!product) {
      for (const p of items) {
        const variant = p.variants?.find((v: any) => v.slug === slug);
        if (variant) {
          product = p;
          selectedVariantId = variant.id;
          break;
        }
      }
    }

    if (!product?.id) return null;

    // 🔥 STEP 2: DETAIL API (GROUPED PRODUCTS YAHI AATE HAIN)
    const detailRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products/${product.id}`,
      { cache: "no-store" }
    );

    if (!detailRes.ok) return null;

    const detailJson = await detailRes.json();
    if (!detailJson.success) return null;

    return {
      product: detailJson.data, // ✅ FULL PRODUCT (groupedProducts included)
      selectedVariantId: selectedVariantId ?? undefined,
    };
  } catch (err) {
    console.error("getProduct error:", err);
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
 const data = await getProduct(slug);

if (!data?.product) {
  return {
    title: 'Product Not Found | Direct Care',
    description: 'The product you are looking for could not be found.',
  };
}

const product: Product = data.product;

 const mainImage = product?.images?.[0]?.imageUrl
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
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data) notFound();

  return (
    <div key={slug}>
      <Suspense fallback={<ProductLoading />}>
        <ProductClient 
          product={data.product}
          initialVariantId={data.selectedVariantId}
        />
      </Suspense>
    </div>
  );
}