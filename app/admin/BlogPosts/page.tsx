"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Search, FileText, Eye, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, CheckCircle, Edit3, Star, MessageSquare, RotateCcw, Shield, Clock, TrendingUp, FolderTree } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { BlogPost, blogPostsService, BlogCategory } from "@/lib/services/blogPosts";
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";


export default function BlogPostsPage() {
  const router = useRouter();
  const toast = useToast();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deletionStatusFilter, setDeletionStatusFilter] = useState<string>("all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Action confirmation state
  const [actionConfirm, setActionConfirm] = useState<{
    id: string;
    title: string;
    action: 'delete' | 'restore';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    totalPosts: 0,
    published: 0,
    drafts: 0,
    featured: 0,
    totalComments: 0,
    approvedComments: 0,
    pendingComments: 0,
    spamComments: 0,
    deleted: 0,
    totalViews: 0,
    avgViewsPerPost: 0,
    avgCommentsPerPost: 0
  });

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.replace(API_BASE_URL, "").split('?')[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const handleViewBlogPost = (slug: string) => {
    const blogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/blog/${slug}`;
    window.open(blogUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    fetchBlogPosts();
    fetchBlogCategories();
  }, []);

  const fetchBlogCategories = async () => {
    try {
      
      const response = await blogPostsService.getAllCategories();
      if (response.data && response.data.success) {
        const categoriesData = response.data.data || [];
        setBlogCategories(categoriesData);
      }
    } catch (error: any) {
      console.error("❌ Error fetching blog categories:", error);
    }
  };

 // ✅ Stats calculation ko fix karo - Always calculate from ALL posts
const fetchBlogPosts = async () => {
  try {
    const response = await blogPostsService.getAll(true, false, true);
    if (response.data && response.data.success) {
      const postsData = response.data.data || [];
      setBlogPosts(postsData);
      // ✅ Always calculate from complete data
      calculateStats(postsData);
    } else {
      setBlogPosts([]);
    }
  } catch (error: any) {
    console.error("❌ Error fetching blog posts:", error);
    toast.error("Failed to load blog posts");
    setBlogPosts([]);
  } finally {
    setLoading(false);
  }
};



  // ✅ Calculate all stats dynamically
  const calculateStats = (posts: BlogPost[]) => {
    const totalPosts = posts.filter(p => !p.isDeleted).length;
    const published = posts.filter(p => p.isPublished && !p.isDeleted).length;
    const drafts = posts.filter(p => !p.isPublished && !p.isDeleted).length;
    const featured = posts.filter(p => p.showOnHomePage && !p.isDeleted).length;
    const deleted = posts.filter(p => p.isDeleted).length;

    // Calculate comment statistics
    let totalComments = 0;
    let approvedComments = 0;
    let pendingComments = 0;
    let spamComments = 0;

    posts.forEach(post => {
      if (post.comments && Array.isArray(post.comments)) {
        const allComments = getAllComments(post.comments);
        totalComments += allComments.length;
        approvedComments += allComments.filter(c => c.isApproved).length;
        pendingComments += allComments.filter(c => !c.isApproved && !c.isSpam).length;
        spamComments += allComments.filter(c => c.isSpam).length;
      }
    });

    // Calculate views
    const totalViews = posts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
    const avgCommentsPerPost = totalPosts > 0 ? parseFloat((totalComments / totalPosts).toFixed(1)) : 0;

    setStats({
      totalPosts,
      published,
      drafts,
      featured,
      totalComments,
      approvedComments,
      pendingComments,
      spamComments,
      deleted,
      totalViews,
      avgViewsPerPost,
      avgCommentsPerPost
    });
  };

  // Helper function to get all comments including replies
  const getAllComments = (comments: any[]): any[] => {
    let allComments: any[] = [];
    comments.forEach(comment => {
      allComments.push(comment);
      if (comment.replies && Array.isArray(comment.replies)) {
        allComments = allComments.concat(getAllComments(comment.replies));
      }
    });
    return allComments;
  };

  // Get comment count for a post
  const getCommentCount = (post: BlogPost) => {
    if (!post.comments || !Array.isArray(post.comments)) return 0;
    return getAllComments(post.comments).length;
  };

  // Get spam comment count for a post
  const getSpamCount = (post: BlogPost) => {
    if (!post.comments || !Array.isArray(post.comments)) return 0;
    return getAllComments(post.comments).filter(c => c.isSpam).length;
  };

  // Delete (soft delete)
  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      const response = await blogPostsService.delete(id);
      if (response.data && response.data.success) {
        toast.success(response.data.message || "Blog Post deleted successfully! 🗑️");
        await fetchBlogPosts();
      } else {
        throw new Error(response.data?.message || "Delete failed");
      }
    } catch (error: any) {
      console.error("❌ Error deleting blog post:", error);
      const message = error.response?.data?.message || error.message || "Failed to delete blog post";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setActionConfirm(null);
    }
  };

  // Restore
  const handleRestore = async (id: string) => {
    setIsProcessing(true);
    try {
      const response = await blogPostsService.restore(id);
      if (response.data && response.data.success) {
        toast.success(response.data.message || "Blog post restored successfully! ✅");
        await fetchBlogPosts();
      } else {
        throw new Error(response.data?.message || "Restore failed");
      }
    } catch (error: any) {
      console.error("❌ Error restoring blog post:", error);
      const message = error.response?.data?.message || error.message || "Failed to restore blog post";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setActionConfirm(null);
    }
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setCategoryFilter("all");
    setDeletionStatusFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = activeFilter !== "all" || categoryFilter !== "all" || deletionStatusFilter !== "all" || searchTerm.trim() !== "";

  // Filter with deletion status
  const filteredBlogPosts = Array.isArray(blogPosts) ? blogPosts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.bodyOverview?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.body?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActive = activeFilter === "all" || 
                         (activeFilter === "published" && post.isPublished) ||
                         (activeFilter === "draft" && !post.isPublished);

    const matchesCategory = categoryFilter === "all" || post.blogCategoryId === categoryFilter;

    const matchesDeletionStatus = 
      (deletionStatusFilter === "active" && !post.isDeleted) ||
      (deletionStatusFilter === "deleted" && post.isDeleted) ||
      (deletionStatusFilter === "all");

    return matchesSearch && matchesActive && matchesCategory && matchesDeletionStatus;
  }) : [];

  // Pagination calculations
  const totalItems = filteredBlogPosts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBlogPosts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    if (endPage - startPage < maxVisiblePages - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, categoryFilter, deletionStatusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Blog Posts
          </h1>
          <p className="text-slate-400">Manage your blog posts</p>
        </div>
         {/* Navigation Button: Comments */}
<div className="flex flex-wrap gap-3">
  {/* Comments Button - Pink/Rose */}
  <button
    onClick={() => router.push('/admin/comments')}
    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-pink-500/50 transition-all"
  >
    <MessageSquare className="h-4 w-4" />
    Go to Comments
  </button>

  {/* Blog Categories Button - Purple/Violet */}
  <button
    onClick={() => router.push('/admin/BlogCategories')}
    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all"
  >
    <FolderTree className="h-4 w-4" />
    Go to Blog Categories
  </button>

  {/* Add New Post Button - Cyan/Blue */}
  <button
    onClick={() => router.push("/admin/BlogPosts/create")}
    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all"
  >
    <Plus className="h-4 w-4" />
    Add New Post
  </button>
</div>

      </div>

      {/* ✅ Dynamic Stats - All from List Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: Posts Status */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 hover:border-violet-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                <FileText className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Posts Status</p>
                <p className="text-white text-lg font-bold">{stats.totalPosts}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Published</p>
                <p className="text-lg font-bold text-green-400">{stats.published}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Drafts</p>
                <p className="text-lg font-bold text-yellow-400">{stats.drafts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Comments Activity */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Comments</p>
                <p className="text-white text-lg font-bold">{stats.totalComments}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Approved</p>
                <p className="text-lg font-bold text-green-400">{stats.approvedComments}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Pending</p>
                <p className="text-lg font-bold text-yellow-400">{stats.pendingComments}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Spam</p>
                <p className="text-lg font-bold text-red-400">{stats.spamComments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Featured & Deleted */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 hover:border-pink-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                <Star className="h-4 w-4 text-pink-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Special Posts</p>
                <p className="text-white text-lg font-bold">{stats.featured + stats.deleted}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Featured</p>
                <p className="text-lg font-bold text-pink-400">{stats.featured}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Deleted</p>
                <p className="text-lg font-bold text-orange-400">{stats.deleted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Views & Engagement */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <Eye className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Total Views</p>
                <p className="text-white text-lg font-bold">{stats.totalViews}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Avg/Post</p>
                <p className="text-lg font-bold text-emerald-400">{stats.avgViewsPerPost}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-0.5">Comments/Post</p>
                <p className="text-lg font-bold text-blue-400">{stats.avgCommentsPerPost}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page Selector */}
{/* ✅ Items Per Page Selector - Only show when more than 25 items */}
{totalItems > 25 && (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-slate-400">entries per page</span>
      </div>
      
      <div className="text-sm text-slate-400">
        Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, totalItems)} of {totalItems} entries
      </div>
    </div>
  </div>
)}


      {/* Search and Filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                activeFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-48 ${
                categoryFilter !== "all" 
                  ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Categories</option>
              {blogCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={deletionStatusFilter}
              onChange={(e) => setDeletionStatusFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                deletionStatusFilter !== "all" 
                  ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">Show All</option>
              <option value="active">Active Only</option>
              <option value="deleted">Deleted Only</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          <div className="text-sm text-slate-400 whitespace-nowrap ml-auto">
            {totalItems} blog post{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Blog Posts Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">
              {blogPosts.length === 0 ? "No blog posts yet" : "No blog posts found"}
            </p>
            <p className="text-slate-500 text-sm">
              {blogPosts.length === 0 
                ? "Create your first blog post to get started" 
                : "Try adjusting your search or filters"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Blog Post Title</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Category</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Views</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Comments</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Author</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Published At</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((blogPost) => {
                  const commentCount = getCommentCount(blogPost);
                  const spamCount = getSpamCount(blogPost);
                  
                  return (
                    <tr key={blogPost.id} className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${blogPost.isDeleted ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {blogPost.thumbnailImageUrl ? (
                            <div
                              className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all flex-shrink-0"
                              onClick={() => setSelectedImageUrl(getImageUrl(blogPost.thumbnailImageUrl))}
                            >
                              <img
                                src={getImageUrl(blogPost.thumbnailImageUrl)}
                                alt={blogPost.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p
                              className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors"
                              onClick={() => !blogPost.isDeleted && handleViewBlogPost(blogPost.slug)}
                            >
                              {blogPost.title}
                              {blogPost.isDeleted && (
                                <span className="ml-2 text-xs text-orange-400">(Deleted)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{blogPost.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-sm">
                        {blogPost.blogCategoryName || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          blogPost.isPublished
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {blogPost.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                          {blogPost.viewCount || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium">
                            {commentCount}
                          </span>
                          {spamCount > 0 && (
                            <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium" title="Spam comments">
                              {spamCount} spam
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-sm">
                        {blogPost.authorName || 'Unknown'}
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-sm">
                        {blogPost.publishedAt ? new Date(blogPost.publishedAt).toLocaleDateString() : 'Not published'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {!blogPost.isDeleted ? (
                            <>
                              <button
                                onClick={() => handleViewBlogPost(blogPost.slug)}
                                className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                                title="View Blog Post"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/admin/BlogPosts/edit/${blogPost.id}`)}
                                className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionConfirm({ id: blogPost.id, title: blogPost.title, action: 'delete' })}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setActionConfirm({ id: blogPost.id, title: blogPost.title, action: 'restore' })}
                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                                title="Restore"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-all ${
                      currentPage === page
                        ? 'bg-violet-500 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-400">
              Total: {totalItems} items
            </div>
          </div>
        </div>
      )}

      {/* Delete/Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!actionConfirm}
        onClose={() => setActionConfirm(null)}
        onConfirm={() => {
          if (actionConfirm?.action === 'delete') {
            handleDelete(actionConfirm.id);
          } else if (actionConfirm?.action === 'restore') {
            handleRestore(actionConfirm.id);
          }
        }}
        title={actionConfirm?.action === 'delete' ? "Delete Blog Post" : "Restore Blog Post"}
        message={
          actionConfirm?.action === 'delete'
            ? `Are you sure you want to delete "${actionConfirm?.title}"? You can restore it later.`
            : `Are you sure you want to restore "${actionConfirm?.title}"?`
        }
        confirmText={actionConfirm?.action === 'delete' ? "Delete Blog Post" : "Restore Blog Post"}
        cancelText="Cancel"
        icon={actionConfirm?.action === 'delete' ? Trash2 : RotateCcw}
        iconColor={actionConfirm?.action === 'delete' ? "text-red-400" : "text-green-400"}
        confirmButtonStyle={
          actionConfirm?.action === 'delete'
            ? "bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/50"
        }
        isLoading={isProcessing}
      />

      {/* Image Preview Modal */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <img
              src={selectedImageUrl}
              alt="Full size preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
