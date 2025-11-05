import Header from "./Header";

export default async function HeaderServer() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { cache: "no-store" }
  );

  const json = await res.json();

  const categories = json.success
    ? json.data.filter((cat: any) => !cat.parentCategoryId)
    : [];

  return <Header ssrCategories={categories} />;
}
