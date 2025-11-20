// app/blog/page.tsx… working code hai search bar implement kr rha isliye isko alag save rkhta hu
import React from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";




const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://testapi.knowledgemarkg.com";

async function fetchJSON(url: string) {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function absoluteUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // ensure no double slash
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function BlogPage() {
  const postsUrl = `${API_BASE}/api/BlogPosts?includeUnpublished=false&onlyHomePage=false`;
  const categoriesUrl = `${API_BASE}/api/BlogCategories?includeInactive=false&includeSubCategories=true`;

  const [postsResp, categoriesResp] = await Promise.all([
    fetchJSON(postsUrl),
    fetchJSON(categoriesUrl),
  ]);

  const posts = postsResp?.data ?? [];
  const categories = categoriesResp?.data ?? [];

  // server-side filtering using API fields
  const now = new Date();
  const visiblePosts = posts.filter((p: any) => {
    if (!p) return false;
    if (!p.isPublished) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;
    return true;
  });

  // Sort: displayOrder asc -> publishedAt desc
  visiblePosts.sort((a: any, b: any) => {
    const oa = typeof a.displayOrder === "number" ? a.displayOrder : 9999;
    const ob = typeof b.displayOrder === "number" ? b.displayOrder : 9999;
    if (oa !== ob) return oa - ob;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

 return (
  <main className="min-h-screen bg-gray-100 pt-[0.5rem] pb-[2.5rem]">
    <div className="max-w-7xl mx-auto px-1 space-y-4">

      {/* ===================== CATEGORIES CARD ===================== */}
      <section className="bg-white rounded-2xl shadow-xl p-8 border ">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">Explore Our Blogs </h2>

        <div
          className="
            grid 
            grid-cols-2 
            sm:grid-cols-3 
            md:grid-cols-4 
            lg:grid-cols-6 
            xl:grid-cols-8 
            gap-4
          "
        >
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/blog/category/${cat.slug}`}
              className="
                group bg-gray-50 border 
                p-3 rounded-xl 
                hover:bg-white 
                hover:shadow-md 
                transition 
                flex items-center gap-3
              "
            >
              {/* ICON */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                <img
                  src={absoluteUrl(cat.imageUrl) ?? '/placeholder-category.png'}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>

              {/* TEXT */}
              <div className="flex flex-col overflow-hidden">
                <h3 className="text-xs font-semibold text-gray-900 leading-tight truncate group-hover:text-blue-600">
                  {cat.name}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {cat.blogPostCount ?? 0} posts
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===================== LATEST ARTICLES CARD ===================== */}
      <section className="bg-white rounded-2xl shadow-xl p-8 border">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">
          Latest Articles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {visiblePosts.map((post: any) => (
            <article
              key={post.id}
              className="bg-gray-50 border rounded-xl shadow-sm hover:shadow-lg transition p-4 flex flex-col hover:-translate-y-1"
            >
              {/* IMAGE */}
              <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
                <img
                  src={
                    absoluteUrl(post.thumbnailImageUrl) ??
                    absoluteUrl(post.featuredImageUrl) ??
                    '/placeholder-article.png'
                  }
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* CATEGORY LABEL */}
              <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded w-fit mb-3">
                {post.blogCategoryName}
              </span>

              {/* TITLE */}
              <h3 className="text-md font-semibold text-gray-900 mb-2 line-clamp-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                  {post.title}
                </Link>
              </h3>

              {/* OVERVIEW */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                {post.bodyOverview}
              </p>

              {/* FOOTER META */}
              <div className="mt-auto flex justify-between text-sm text-gray-500">
                <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                <span className="text-xs">Views: {post.viewCount ?? 0}</span>
              </div>

              {/* LABELS */}
             {/* LABELS (with icons + priority) */}
{post.labels?.length > 0 && (
  <div className="mt-3 flex gap-2 flex-wrap">

    {[...post.labels]
      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
      .map((l: any) => {

        // Auto icon loader from lucide-react
        const IconComponent =
          (LucideIcons as any)[l.icon] ?? LucideIcons.Sparkles;

        return (
          <span
            key={l.name}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shadow-sm"
            style={{
              background: l.color || "#ddd",
              color: "#fff",
            }}
          >
            <IconComponent className="h-3 w-3" />
            {l.name}
          </span>
        );
      })}
  </div>
)}

            </article>
          ))}

        </div>
      </section>
    </div>
  </main>
);


}
