"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import BlogPostForm from "@/app/admin/BlogPosts/BlogPostForm";
import { blogPostsService, BlogPost } from "@/lib/services/blogPosts";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId) return;
    blogPostsService
      .getById(postId)
      .then((r) => {
        const data = r?.data?.data ?? null;
        if (data) setPost(data);
        else setError("Blog post not found.");
      })
      .catch(() => setError("Failed to load blog post."))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-300 text-sm">{error || "Post not found."}</p>
        <button
          onClick={() => router.push("/admin/BlogPosts")}
          className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-400 text-sm rounded-lg hover:bg-slate-700/50 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog Posts
        </button>
      </div>
    );
  }

  return <BlogPostForm mode="edit" initialData={post} />;
}
