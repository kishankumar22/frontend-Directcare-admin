// app/products/[slug]/page.tsx
import { Suspense } from 'react';
import ProductClient from './ProductDetails';
import { notFound } from 'next/navigation';
import { cookies } from "next/headers";


export const dynamic = 'force-dynamic';

async function getProduct(slug: string) {
  try {
    // ✅ GET TOKEN FROM COOKIE
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    // Forward the token so the API can grant staff preview access too — without this,
    // the backend always sees this SSR call as anonymous and applies the customer-safe
    // (unpublished / pharma-pending hidden) filter even to a logged-in staff member.
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products/by-slug/${slug}`,
      {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.success) return null;

    const product = json.data;

    let isStaff = false;

    // Staff who may preview unpublished / pharma-pending products (customers cannot).
    const PREVIEW_ROLES = ["Admin", "SuperAdmin", "Pharmacist", "StoreManager", "ContentManager"];

    // ✅ DECODE JWT
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );

        const roleKey =
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

        const role = payload[roleKey];
        const roles = Array.isArray(role) ? role : role ? [role] : [];

        isStaff = roles.some((r: string) => PREVIEW_ROLES.includes(r));
      } catch { }
    }

    // ✅ NON-STAFF ONLY CHECK — customers/guests can't see unpublished or pharma-pending products.
    if (
      !isStaff &&
      (
        !product ||
        product.isActive !== true ||
        product.isPublished !== true ||
        (product.isPharmaProduct === true && product.pharmaApprovalStatus !== "Approved")
      )
    ) {
      return null;
    }

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

    keywords: product.tags || product.name,

    openGraph: {
      title: product.name,
      description: description || product.name,
      url: `https://test.direct-care.co.uk/product/${product.slug}`,
      siteName: "Direct Care",
      images: imageUrl
        ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
          },
        ]
        : [],
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: description,
      images: imageUrl ? [imageUrl] : [],
    },

    alternates: {
      canonical: `https://test.direct-care.co.uk/product/${product.slug}`,
    },
  };
}

// ⭐ FIX: params is now Promise
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const data = await getProduct(slug);

  if (!data?.product) notFound();

  const offerVariant =
    data.selectedVariantId && Array.isArray(data.product.variants)
      ? data.product.variants.find((v: any) => v.id === data.selectedVariantId)
      : data.product.variants?.find((v: any) => v.isDefault) ??
      data.product.variants?.[0];

  const offerPrice = offerVariant?.price ?? data.product.price;
  const offerSku = offerVariant?.sku ?? data.product.sku;
  const offerStockQuantity = offerVariant?.stockQuantity ?? data.product.stockQuantity ?? 0;

  return (
    <>
      {/* ✅ PRODUCT SCHEMA (SEO BOOST) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: data.product.name,

            image: data.product.images?.map((img: any) =>
              img?.imageUrl?.startsWith("http")
                ? img.imageUrl
                : `${process.env.NEXT_PUBLIC_API_URL}${img?.imageUrl || ""}`
            ),

            description: (data.product.shortDescription || "")
              .replace(/<[^>]*>/g, "")
              .slice(0, 155),

            sku: offerSku,

            brand: {
              "@type": "Brand",
              name: data.product.brandName,
            },

            category: data.product.categoryName, // ✅ ADD

            offers: {
              "@type": "Offer",
              url: `https://test.direct-care.co.uk/product/${data.product.slug}`,
              priceCurrency: "GBP",
              price: offerPrice,
              availability:
                offerStockQuantity > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },

            aggregateRating:
              data.product.averageRating > 0
                ? {
                  "@type": "AggregateRating",
                  ratingValue: data.product.averageRating,
                  reviewCount: data.product.reviewCount || 1,
                }
                : undefined,
          }),
        }}
      />

      {/* 🔥 EXISTING UI */}
      <ProductClient
        product={data.product}
        initialVariantId={data.selectedVariantId}
      />
    </>
  );
}
