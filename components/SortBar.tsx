"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortBar() {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newParams = new URLSearchParams(params.toString());

    if (!value) {
      newParams.delete("sortBy");
      newParams.delete("sortDirection");
    } else {
      const [sortBy, sortDirection] = value.split(":");
      newParams.set("sortBy", sortBy);
      newParams.set("sortDirection", sortDirection);
    }

    router.push(`/products?${newParams.toString()}`);
  };

  return (
    <div className="flex justify-end mb-4">
      <select
        onChange={onChange}
        className="border px-3 py-2 rounded text-sm"
      >
        <option value="">Sort</option>
        <option value="price:asc">Price: Low to High</option>
        <option value="price:desc">Price: High to Low</option>
      </select>
    </div>
  );
}
