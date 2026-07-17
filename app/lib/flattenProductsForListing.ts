//app\lib\flattenProductsForListing.ts
export interface FlattenedProduct {
  productData: any;
  variantForCard?: any | null;
  cardSlug: string;
}

export function flattenProductsForListing(products: any[]) {
  const result: any[] = [];

  products.forEach((product) => {
    // ✅ Add mainImageUrl to productData
    const productData = {
      ...product,
      // 🔥 Convert mainImageUrl to images array if not present
      images: product.images || (product.mainImageUrl ? [{ imageUrl: product.mainImageUrl, isMain: true }] : []),
      mainImageUrl: product.mainImageUrl, // ✅ Keep for fallback
    };

    // If product has variants, flatten them
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant: any) => {
        result.push({
          productData,
          variantForCard: variant,
          cardSlug: variant.slug || product.slug,
        });
      });
    } else {
      // Single product (no variants)
      result.push({
        productData,
        variantForCard: null,
        cardSlug: product.slug,
      });
    }
  });

  return result;
}