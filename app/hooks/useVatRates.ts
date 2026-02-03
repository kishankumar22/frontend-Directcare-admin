"use client";
import { useEffect, useState } from "react";

export function useVatRates() {
  const [vatRates, setVatRates] = useState<any[]>([]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://testapi.knowledgemarkg.com/api/VATRates?activeOnly=true");
        const json = await res.json();
        setVatRates(json.data || []);
      } catch (err) {
        console.error("VAT fetch error:", err);
      }
    };

    fetchRates();
  }, []);

  return vatRates;
}
