//components/HeaderServer.tsx
import Header from "./Header";

export default async function HeaderServer() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { cache: "no-store" }
  );

  const json = await res.json();

  const categories = json.success
    ? json.data
        // ✅ Sirf root categories
        .filter((cat: any) => !cat.parentCategoryId)
        // ✅ Sirf homepage wali categories
        .filter((cat: any) => cat.showOnHomepage === true)
        // ✅ Optional but recommended: sort order
        .sort(
          (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        )
    : [];

  return <Header ssrCategories={categories} />;
}
