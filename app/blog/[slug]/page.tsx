import React from "react";
import Link from "next/link";
import CommentForm from "./CommentForm";
import CommentsList from "./CommentsList";
import * as LucideIcons from "lucide-react";


const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://testapi.knowledgemarkg.com";

  // ⭐ Insert SEO Function Here ⭐
export async function generateMetadata(props: any) {
  const { slug } = await props.params; // ⬅️ THIS FIX

  const apiURL = `${API_BASE}/api/BlogPosts/slug/${encodeURIComponent(slug)}?includeComments=false`;

  const res = await fetch(apiURL, { cache: "no-store" });
  const resp = await res.json();
  const post = resp?.data;

  if (!post) {
    return {
      title: "Blog not found",
      description: "This article may be removed or unpublished.",
    };
  }

  const title = post.metaTitle || post.title;
  const description =
    post.metaDescription ||
    post.bodyOverview ||
    "Read the full article for more details.";
  const ogImage =
    post.featuredImageUrl ||
    post.thumbnailImageUrl ||
    "/default-og-image.png";

  return {
    title,
    description,
    keywords: post.metaKeywords,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://yourdomain.com/blog/${post.slug}`,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://yourdomain.com/blog/${post.slug}`,
    },
  };
}


function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchJSON(url: string): Promise<any> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
 const { slug } = await params;


  const apiURL = `${API_BASE}/api/BlogPosts/slug/${encodeURIComponent(
    slug
  )}?includeComments=true`;

  const resp = await fetchJSON(apiURL);
  const post = resp?.data ?? null;

  // RECENT POSTS
  const recentResp = await fetchJSON(
    `${API_BASE}/api/BlogPosts?includeUnpublished=false&onlyHomePage=false`
  );
  const allPosts = recentResp?.data ?? [];
  const now = new Date();

 const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const recentPosts = allPosts
  .filter((p: any) => {
    if (!p.isPublished) return false;
    if (p.slug === slug) return false;

    const postDate = new Date(p.publishedAt || p.startDate);

    // ❌ Future scheduled posts skip
    if (postDate > now) return false;

    // ❌ Only show posts from last 7 days
    if (postDate < sevenDaysAgo) return false;

    return true;
  })
  .sort(
    (a: any, b: any) =>
      new Date(b.startDate || b.publishedAt).getTime() -
      new Date(a.startDate || a.publishedAt).getTime()
  )
  .slice(0, 5);


// --- FETCH RELATED BLOGS ---
let relatedBlogs: any[] = [];

if (Array.isArray(post?.relatedBlogPostIds) && post.relatedBlogPostIds.length > 0) {
  const relatedPromises = post.relatedBlogPostIds.map((id: string) =>
    fetchJSON(`${API_BASE}/api/BlogPosts/${id}`)
  );

  const relatedResults = await Promise.all(relatedPromises);

  relatedBlogs = relatedResults
    .map((r) => r?.data)
    .filter((x) => x && x.isPublished);
}

    

  if (!post) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold">Article not found</h1>
          <p className="text-gray-600 mt-2">This article may be removed or unpublished.</p>
        </div>
      </main>
    );
  }

  const gallery: string[] = [];
  if (post.featuredImageUrl) gallery.push(absoluteUrl(post.featuredImageUrl)!);
  if (Array.isArray(post.imageUrls))
    post.imageUrls.forEach((img: string) => gallery.push(absoluteUrl(img)!));

  return (
    <main className="min-h-screen bg-gray-100 py-6">
     <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 px-4 md:px-6">


        {/* LEFT ARTICLE CARD */}
       <div className="lg:col-span-2 ml-0 mr-0 md:ml-[-20px] md:mr-[-40px] lg:ml-[-55px] lg:mr-[-119px]">

          <div className="bg-white shadow-lg rounded-2xl p-8 border">

            {/* Breadcrumb */}
           {/* Breadcrumb */}
<nav className="text-sm text-gray-500 mb-4 flex items-center gap-1">
  <Link href="/" className="hover:underline text-blue-600">Home</Link>
  <span>/</span>

  <Link href="/blog" className="hover:underline text-blue-600">Blog</Link>
  <span>/</span>

  {post.blogCategoryName ? (
    <>
      <Link 
        href={`/blog/category/${post.blogCategorySlug ?? ""}`}
        className="hover:underline text-blue-600"
      >
        {post.blogCategoryName}
      </Link>
      <span>/</span>
    </>
  ) : null}

  <span className="text-gray-700 font-medium line-clamp-1 text-ellipsis overflow-hidden whitespace-nowrap">
  {post.title}
</span>

</nav>


            {/* Title */}
            <h1 className="text-4xl font-bold leading-tight text-gray-900">
              {post.title}
            </h1>

            {/* Meta */}
           <div className="mt-3 flex items-center gap-2 sm:gap-4 text-gray-600 text-sm flex-nowrap whitespace-nowrap overflow-hidden">

              <span>✍️ {post.authorName}</span>
              <span>•</span>
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{post.viewCount ?? 0} Views</span>
            </div>

            {/* Labels */}
           {/* LABELS with dynamic icons + priority */}
{post.labels?.length > 0 && (
  <div className="mt-5 flex gap-2 flex-wrap">

    {[...post.labels]
      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
      .map((l: any) => {

        // Auto-load lucide icon
        const IconComponent =
          (LucideIcons as any)[l.icon] ?? LucideIcons.Sparkles;

        return (
          <span
            key={l.name}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
            style={{
              background: l.color || "#ccc",
              color: "#fff",
            }}
          >
            <IconComponent className="h-4 w-4" />
            {l.name}
          </span>
        );
      })}
  </div>
)}


            {/* Featured Image */}
            {/* Featured Image */}
{post.featuredImageUrl && (
  <div className="mt-8 w-full rounded-xl overflow-hidden">
    <img
      src={absoluteUrl(post.featuredImageUrl)!}
      alt={post.title}
      className="w-full h-full object-contain"
    />
  </div>
)}





            {/* Body */}
            <article
              dangerouslySetInnerHTML={{ __html: post.body }}
              className="prose prose-lg mt-10 max-w-none"
            />

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gallery.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    className="rounded-lg w-full aspect-[16/9] object-cover shadow-md"
                    alt=""
                  />
                ))}
              </div>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="mt-10 flex gap-2 flex-wrap">
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments */}
            <section className="mt-16">
              <h2 className="text-2xl font-semibold mb-6">
                Comments ({post.commentCount ?? post.comments?.length ?? 0})
              </h2>

              {post.allowComments && (
                <>
                  <CommentForm blogPostId={post.id} />
                  <CommentsList blogPostId={post.id} />
                </>
              )}
            </section>

          </div>
        </div>

        {/* RIGHT SIDEBAR */}
      {/* RIGHT SIDEBAR */}
<aside className="lg:col-span-1 flex justify-end ml-0 mr-0 md:ml-[10px] md:mr-[10px] lg:ml-[118px] lg:mr-[-55px] mt-10 lg:mt-0">

  <div className="sticky top-24 w-full">

    {/* RECENT ARTICLES CARD */}
    <div className="bg-white shadow-xl rounded-2xl p-6 border mb-8">
      <h3 className="text-xl font-semibold mb-5">🕗 Recent Articles</h3>

      <div className="space-y-5">
        {recentPosts.map((blog: any) => (
          <Link key={blog.id} href={`/blog/${blog.slug}`} className="flex gap-4 group">
            <img
              src={
                absoluteUrl(blog.thumbnailImageUrl) ??
                absoluteUrl(blog.featuredImageUrl) ??
                "/placeholder-blog.png"
              }
              className="w-24 h-16 rounded-lg object-cover shadow-sm group-hover:opacity-90"
              alt={blog.title}
            />

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">

                <h4 className="text-sm font-semibold text-gray-900 leading-tight group-hover:underline">
                  {blog.title}
                </h4>

                {blog.labels?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {[...blog.labels]
                      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
                      .map((l: any) => {
                        const IconComponent =
                          (LucideIcons as any)[l.icon] ?? LucideIcons.Sparkles;

                        return (
                          <span
                            key={l.name}
                            className="flex items-center gap-1 px-1.5 py-[2px] rounded-full 
                                       text-[9px] font-medium shadow-sm whitespace-nowrap"
                            style={{
                              background: l.color || "#ccc",
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

              </div>

              <p className="text-xs text-gray-500 mt-1">
                {new Date(blog.publishedAt).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>

    {/* RELATED ARTICLES CARD (NEW) */}
    {relatedBlogs.length > 0 && (
      <div className="bg-white shadow-xl rounded-2xl p-6 border mt-[-25px]">
        <h3 className="text-xl font-semibold mb-5">🔗 Related Articles</h3>

        <div className="space-y-5">
          {relatedBlogs.map((blog: any) => (
            <Link key={blog.id} href={`/blog/${blog.slug}`} className="flex gap-4 group">
              <img
                src={
                  absoluteUrl(blog.thumbnailImageUrl) ??
                  absoluteUrl(blog.featuredImageUrl) ??
                  "/placeholder-blog.png"
                }
                className="w-24 h-16 rounded-lg object-cover shadow-sm group-hover:opacity-90"
                alt={blog.title}
              />

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">

                  <h4 className="text-sm font-semibold text-gray-900 leading-tight group-hover:underline">
                    {blog.title}
                  </h4>

                  {blog.labels?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {[...blog.labels]
                        .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
                        .map((l: any) => {
                          const IconComponent =
                            (LucideIcons as any)[l.icon] ?? LucideIcons.Sparkles;

                          return (
                            <span
                              key={l.name}
                              className="flex items-center gap-1 px-1.5 py-[2px] rounded-full 
                                         text-[9px] font-medium shadow-sm whitespace-nowrap"
                              style={{
                                background: l.color || "#ccc",
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

                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {new Date(blog.publishedAt).toLocaleDateString()}
                </p>

              </div>
            </Link>
          ))}
        </div>
      </div>
    )}

  </div>
</aside>

      </div>
    </main>
  );
}
