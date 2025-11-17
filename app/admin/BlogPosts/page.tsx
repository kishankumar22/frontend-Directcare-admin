"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Search, FileText, Eye, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, User, Tag, CheckCircle, Edit3, Star } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  thumbnailImageUrl?: string;
  isPublished: boolean;
  publishedAt?: string;
  viewCount: number;
  blogCategoryId?: string;
  blogCategoryName?: string;
  authorId?: string;
  authorName?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  showOnHomePage?: boolean;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export default function BlogPostsPage() {
  const router = useRouter();
  const toast = useToast();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewingBlogPost, setViewingBlogPost] = useState<BlogPost | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    totalPosts: 0,
    published: 0,
    drafts: 0,
    featured: 0
  });

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.replace(API_BASE_URL, "").split('?')[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  useEffect(() => {
    fetchBlogPosts();
    fetchBlogCategories();
  }, []);

  const fetchBlogCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.get<ApiResponse<BlogCategory[]>>(
        "/api/BlogCategories",
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data && response.data.success) {
        const categoriesData = response.data.data || [];
        setBlogCategories(categoriesData);
      }
    } catch (error: any) {
      console.error("❌ Error fetching blog categories:", error);
    }
  };

  const fetchBlogPosts = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.get<ApiResponse<BlogPost[]>>(
        "/api/BlogPosts",
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data && response.data.success) {
        const postsData = response.data.data || [];
        setBlogPosts(postsData);
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

  const calculateStats = (posts: BlogPost[]) => {
    const totalPosts = posts.length;
    const published = posts.filter(p => p.isPublished).length;
    const drafts = posts.filter(p => !p.isPublished).length;
    const featured = posts.filter(p => p.showOnHomePage).length;

    setStats({
      totalPosts,
      published,
      drafts,
      featured
    });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.delete<ApiResponse<null>>(
        `/api/BlogPosts/${id}`, 
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      
      if (response.data && response.data.success) {
        toast.success("Blog Post deleted successfully! 🗑️");
        await fetchBlogPosts();
      } else {
        throw new Error(response.data?.message || "Delete failed");
      }
    } catch (error: any) {
      console.error("❌ Error deleting blog post:", error);
      const message = error.response?.data?.message || error.message || "Failed to delete blog post";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setCategoryFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = activeFilter !== "all" || categoryFilter !== "all" || searchTerm.trim() !== "";

  // Filter data
  const filteredBlogPosts = Array.isArray(blogPosts) ? blogPosts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActive = activeFilter === "all" || 
                         (activeFilter === "published" && post.isPublished) ||
                         (activeFilter === "draft" && !post.isPublished);

    const matchesCategory = categoryFilter === "all" || post.blogCategoryId === categoryFilter;

    return matchesSearch && matchesActive && matchesCategory;
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
  }, [searchTerm, activeFilter, categoryFilter]);

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
        <button
          onClick={() => router.push("/admin/BlogPosts/create")}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add New Post
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Posts */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Posts</p>
              <p className="text-white text-2xl font-bold">{stats.totalPosts}</p>
            </div>
          </div>
        </div>

        {/* Published */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Published</p>
              <p className="text-white text-2xl font-bold">{stats.published}</p>
            </div>
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Edit3 className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Drafts</p>
              <p className="text-white text-2xl font-bold">{stats.drafts}</p>
            </div>
          </div>
        </div>

        {/* Featured */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Featured</p>
              <p className="text-white text-2xl font-bold">{stats.featured}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page Selector */}
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
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
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
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-48 ${
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

      {/* Blog Posts List */}
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
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Author</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Published At</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((blogPost) => (
                  <tr key={blogPost.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
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
                            onClick={() => setViewingBlogPost(blogPost)}
                          >
                            {blogPost.title}
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
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {blogPost.authorName || 'Unknown'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {blogPost.publishedAt ? new Date(blogPost.publishedAt).toLocaleDateString() : 'Not published'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingBlogPost(blogPost)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
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
                          onClick={() => setDeleteConfirm({ id: blogPost.id, title: blogPost.title })}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* View Details Modal - Same styling as BlogCategories */}
      {viewingBlogPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Blog Post Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">View blog post information</p>
                </div>
                <button
                  onClick={() => setViewingBlogPost(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {viewingBlogPost.thumbnailImageUrl && (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-violet-500/20">
                    <img
                      src={getImageUrl(viewingBlogPost.thumbnailImageUrl)}
                      alt={viewingBlogPost.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => setSelectedImageUrl(getImageUrl(viewingBlogPost.thumbnailImageUrl))}
                    />
                  </div>
                )}

                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <h1 className="text-3xl font-bold text-white mb-2">{viewingBlogPost.title}</h1>
                  <p className="text-slate-400 text-sm mb-4">{viewingBlogPost.slug}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      viewingBlogPost.isPublished
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {viewingBlogPost.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {viewingBlogPost.tags && viewingBlogPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {viewingBlogPost.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-xs font-medium flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                    <p className="text-slate-300 mb-4">{viewingBlogPost.summary}</p>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">Content</h3>
                    <div
                      className="text-slate-300"
                      dangerouslySetInnerHTML={{ __html: viewingBlogPost.content }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setViewingBlogPost(null);
                      router.push(`/admin/BlogPosts/edit/${viewingBlogPost.id}`);
                    }}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-medium text-sm"
                  >
                    Edit Blog Post
                  </button>
                  <button
                    onClick={() => setViewingBlogPost(null)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Blog Post"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete Blog Post"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
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
