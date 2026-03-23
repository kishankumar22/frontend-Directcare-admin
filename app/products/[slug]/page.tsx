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

export const revalidate = 10;

async function getProduct(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products/by-slug/${slug}`,
      {
        next: { revalidate: 10 },
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.success) return null;

    const product = json.data;

    // ✅ IMPORTANT: Variant logic preserve
    let selectedVariantId: string | undefined = undefined;

    if (product?.variants?.length) {
      const matchedVariant = product.variants.find(
        (v: any) => v.slug === slug
      );
      if (matchedVariant) {
        selectedVariantId = matchedVariant.id;
      }
    }

    return {
      product,
      selectedVariantId,
    };
  } catch (err) {
    console.error("getProduct error:", err);
    return null;
  }
}

// ⭐ FIX: params is now Promise
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getProduct(slug);

  if (!data?.product) {
    return {
      title: "Product Not Found",
      description: "Product not found",
    };
  }

  const product = data.product;

  const description = (product.shortDescription ?? "")
    .replace(/<[^>]*>/g, "")
    .slice(0, 160);

  const imageUrl = product.images?.[0]?.imageUrl
    ? product.images[0].imageUrl.startsWith("http")
      ? product.images[0].imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${product.images[0].imageUrl}`
    : undefined;

  return {
    title: `${product.name} | Direct Care`,
    description,

    openGraph: {
      title: product.name,
      description: description || product.name,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
  };
}


// ⭐ FIX: params is now Promise
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const data = await getProduct(slug);

  if (!data) notFound();

  return (
    <ProductClient 
      product={data.product}
      initialVariantId={data.selectedVariantId}
    />
  );
}