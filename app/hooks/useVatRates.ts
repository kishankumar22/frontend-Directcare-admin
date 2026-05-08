"use client";
import { useEffect, useState } from "react";

// ✅ no null, always array
let cachedVatRates: any[] = [];

export function useVatRates() {
  const [vatRates, setVatRates] = useState<any[]>(cachedVatRates);

  useEffect(() => {
    // ✅ already fetched → skip API
    if (cachedVatRates.length > 0) return;

    const fetchRates = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/VATRates?activeOnly=true`
        );
        const json = await res.json();

        cachedVatRates = json.data || [];
        setVatRates(cachedVatRates);
      } catch (err) {
        console.error("VAT fetch error:", err);
      }
    };

    fetchRates();
  }, []);

  return vatRates;
}