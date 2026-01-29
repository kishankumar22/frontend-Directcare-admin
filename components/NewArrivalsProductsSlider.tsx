"use client";

import { useEffect, useState } from "react";
import FeaturedProductsSlider from "@/components/FeaturedProductsSlider";

interface Props {
  baseUrl: string;
}

export default function NewArrivalsProductsSlider({ baseUrl }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewProducts = async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/Products?markAsNew=true&isPublished=true`,
          { cache: "no-store" }
        );

        const json = await res.json();

        // backend kabhi items me deta hai, kabhi direct
        const list = json.data?.items ?? json.data ?? [];
        setProducts(list);
      } catch (err) {
        console.error("New Arrivals fetch failed", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewProducts();
  }, [baseUrl]);

  // ❌ agar product nahi hai to section hi mat dikhao
  if (loading || products.length === 0) return null;

  return (
    <FeaturedProductsSlider
      products={products}
      baseUrl={baseUrl}
      title="Newly Added Products"
    />
  );
}
