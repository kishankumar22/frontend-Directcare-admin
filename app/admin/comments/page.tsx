"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Clock, CheckCircle, X, Search, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Trash2, AlertCircle, Ban, Filter } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { blogCommentsService } from "@/lib/services/blogComments";

interface BlogComment {
  id: string;
  commentText: string;
  authorName: string;
  authorEmail: string;
  userId?: string;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  parentCommentId?: string | null;
  replies?: string[];
  blogPostId: string;
  blogPostTitle?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  authorIpAddress?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export default function CommentsPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [postFilter, setPostFilter] = useState<string>("all");
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [viewingComment, setViewingComment] = useState<BlogComment | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; author: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    spam: 0
  });

  // ✅ Fetch Blog Posts
const fetchBlogPosts = async () => {
  setLoadingPosts(true);
  try {
    const response = await blogCommentsService.getAllPosts();
    if (response.data?.success && Array.isArray(response.data.data)) {
      setBlogPosts(response.data.data || []);
    } else {
      setBlogPosts([]);
    }
  } catch (error: any) {
    console.error("Error fetching blog posts:", error);
    toast.error("Failed to load blog posts");
    setBlogPosts([]);
  } finally {
    setLoadingPosts(false);
  }
};


  // ✅ Fetch Comments for Specific Post or All Posts
const fetchComments = async (specificPostId?: string) => {
  setLoadingComments(true);
  try {
    if (specificPostId && specificPostId !== "all") {
      // Fetch comments for specific post
      const response = await blogCommentsService.getByPostId(specificPostId, true);
      if (response.data?.success && Array.isArray(response.data.data)) {
        const commentsData = response.data.data.map(comment => {
          const post = blogPosts.find(p => p.id === comment.blogPostId);
          return {
            ...comment,
            blogPostTitle: comment.blogPostTitle || post?.title || "Unknown Post"
          };
        });
        setComments(commentsData);
      } else {
        setComments([]);
      }
    } else {
      // Fetch comments from all posts
      if (blogPosts.length === 0) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      const allCommentsPromises = blogPosts.map(post =>
        blogCommentsService.getByPostId(post.id, true).catch(err => {
          console.error(`Error for post ${post.id}:`, err);
          return { data: { success: false, data: [], message: "", errors: null } };
        })
      );

      const results = await Promise.all(allCommentsPromises);
      const allComments: BlogComment[] = [];
      
      results.forEach((response, index) => {
        if (response.data?.success && Array.isArray(response.data.data)) {
          const postComments = response.data.data.map(comment => ({
            ...comment,
            blogPostTitle: comment.blogPostTitle || blogPosts[index].title
          }));
          allComments.push(...postComments);
        }
      });

      setComments(allComments);
    }
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    toast.error("Failed to load comments");
    setComments([]);
  } finally {
    setLoadingComments(false);
  }
};



  // ✅ Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBlogPosts();
      setLoading(false);
    };
    loadData();
  }, []);

  // ✅ Load comments when blogPosts are loaded or postFilter changes
  useEffect(() => {
    if (blogPosts.length > 0) {
      fetchComments(postFilter);
    }
  }, [blogPosts, postFilter]);

  const calculateStats = (commentsData: BlogComment[]) => {
    const total = commentsData.length;
    const approved = commentsData.filter(c => c.isApproved).length;
    const pending = commentsData.filter(c => !c.isApproved).length;
    const spam = 0;

    setStats({ total, pending, approved, spam });
  };

  // ✅ Calculate stats when comments or filters change
  useEffect(() => {
    if (comments.length > 0) {
      const filtered = comments.filter(comment => {
        const matchesSearch =
          comment.commentText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comment.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comment.authorEmail?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "approved" && comment.isApproved) ||
          (statusFilter === "pending" && !comment.isApproved);

        return matchesSearch && matchesStatus;
      });

      calculateStats(filtered);
    } else {
      setStats({ total: 0, pending: 0, approved: 0, spam: 0 });
    }
  }, [comments, searchTerm, statusFilter]);

const handleApprove = async (id: string) => {
  setActionLoading(id);
  try {
    const response = await blogCommentsService.approve(id);
    if (response.data?.success) {
      toast.success("Comment approved successfully!");
      await fetchComments(postFilter);
    }
  } catch (error: any) {
    console.error("Error approving comment:", error);
    toast.error(error?.response?.data?.message || "Failed to approve comment");
  } finally {
    setActionLoading(null);
  }
};

const handleMarkAsSpam = async (id: string) => {
  setActionLoading(id);
  try {
    const response = await blogCommentsService.markAsSpam(id);
    if (response.data?.success) {
      toast.success("Comment marked as spam!");
      await fetchComments(postFilter);
    }
  } catch (error: any) {
    console.error("Error marking as spam:", error);
    toast.error(error?.response?.data?.message || "Failed to mark as spam");
  } finally {
    setActionLoading(null);
  }
};


const handleDelete = async (id: string) => {
  setIsDeleting(true);
  try {
    const response = await blogCommentsService.delete(id);
    if (response.data?.success) {
      toast.success("Comment deleted successfully!");
      await fetchComments(postFilter);
    }
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    toast.error(error?.response?.data?.message || "Failed to delete comment");
  } finally {
    setIsDeleting(false);
    setDeleteConfirm(null);
  }
};


  const toggleSelectComment = (id: string) => {
    setSelectedComments(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === currentData.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(currentData.map(c => c.id));
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setPostFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || postFilter !== "all" || searchTerm.trim() !== "";

  // Filter data - only by search and status (post filter handled by API)
  const filteredComments = comments.filter(comment => {
    const matchesSearch =
      comment.commentText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.authorEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && comment.isApproved) ||
      (statusFilter === "pending" && !comment.isApproved);

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredComments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredComments.slice(startIndex, endIndex);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
  }, [searchTerm, statusFilter]);

  const getSelectedPostTitle = () => {
    if (postFilter === "all") return "All Posts";
    const post = blogPosts.find(p => p.id === postFilter);
    return post?.title || "Unknown Post";
  };

  const getPostCommentCount = (postId: string) => {
    // Since we're fetching per post, we need to count from current comments
    return comments.filter(c => c.blogPostId === postId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen ">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Comments Management
            </h1>
            <p className="text-slate-400 mt-1">
              Moderate and manage blog comments
              {postFilter !== "all" && (
                <span className="ml-2 text-violet-400">
                  • Filtered by: {getSelectedPostTitle()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                fetchBlogPosts();
                fetchComments(postFilter);
              }}
              disabled={loadingComments}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl transition-all flex items-center gap-2 font-medium border border-slate-700/50 disabled:opacity-50"
            >
              {loadingComments ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Total Comments</p>
                <p className="text-white text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Pending</p>
                <p className="text-white text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Approved</p>
                <p className="text-white text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Spam</p>
                <p className="text-white text-2xl font-bold">{stats.spam}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Per Page */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
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
              {loadingComments ? (
                "Loading..."
              ) : (
                `Showing ${totalItems > 0 ? startIndex + 1 : 0} to ${Math.min(endIndex, totalItems)} of ${totalItems} entries`
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
{/* ✅ IMPROVED FILTER SECTION - Cleaner Layout */}
<div className="space-y-4 mb-6">
  {/* Top Row - Title */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold text-white">All Comments</h2>
      <p className="text-slate-400 text-sm mt-1">
        Manage and moderate user comments
        {blogPosts.length > 0 && (
          <span className="ml-2 text-slate-500">
            • {blogPosts.length} posts available
          </span>
        )}
      </p>
    </div>

    {/* Active Filter Badge */}
    {hasActiveFilters && (
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-400 text-xs font-medium">
          Filters Active
        </span>
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs font-medium flex items-center gap-1.5"
        >
          <FilterX className="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>
    )}
  </div>

  {/* Bottom Row - Filters */}
  <div className="flex flex-col lg:flex-row gap-3">
    {/* Left Side - Dropdowns */}
    <div className="flex flex-wrap items-center gap-3 flex-1">
      {/* Status Filter */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-4 py-2.5 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[160px] appearance-none cursor-pointer ${
            statusFilter !== "all"
              ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
              : "border-slate-600 hover:border-slate-500"
          }`}
        >
          <option value="all">All Status</option>
          <option value="approved">✓ Approved</option>
          <option value="pending">⏱ Pending</option>
        </select>
        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>

      {/* Post Filter */}
      <div className="relative flex-1 lg:flex-initial lg:min-w-[280px]">
        <select
          value={postFilter}
          onChange={(e) => {
            console.log("🔵 Post filter changed to:", e.target.value);
            setPostFilter(e.target.value);
          }}
          disabled={loadingPosts || blogPosts.length === 0 || loadingComments}
          className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all appearance-none cursor-pointer ${
            postFilter !== "all"
              ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
              : "border-slate-600 hover:border-slate-500"
          } ${
            loadingPosts || blogPosts.length === 0 || loadingComments
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          <option value="all">
            {loadingPosts ? "⏳ Loading posts..." : "📝 All Posts"}
          </option>
          {blogPosts.map((post) => (
            <option key={post.id} value={post.id}>
              {post.title.length > 50 ? post.title.substring(0, 50) + "..." : post.title}
            </option>
          ))}
        </select>
        <MessageSquare className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </div>

    {/* Right Side - Search */}
    <div className="relative lg:w-80">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search comments..."
        className="w-full px-4 py-2.5 pl-10 pr-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 hover:border-slate-500 transition-all"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-all"
        >
          <X className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
        </button>
      )}
    </div>
  </div>

  {/* Filter Summary */}
  {hasActiveFilters && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
      
      {statusFilter !== "all" && (
        <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md text-blue-400 text-xs font-medium flex items-center gap-1">
          Status: {statusFilter}
          <button
            onClick={() => setStatusFilter("all")}
            className="hover:text-blue-300"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      
      {postFilter !== "all" && (
        <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-md text-purple-400 text-xs font-medium flex items-center gap-1">
          Post: {blogPosts.find(p => p.id === postFilter)?.title.substring(0, 30) || "Selected"}...
          <button
            onClick={() => setPostFilter("all")}
            className="hover:text-purple-300"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      
      {searchTerm && (
        <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded-md text-violet-400 text-xs font-medium flex items-center gap-1">
          Search: "{searchTerm.substring(0, 20)}{searchTerm.length > 20 ? "..." : ""}"
          <button
            onClick={() => setSearchTerm("")}
            className="hover:text-violet-300"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  )}
</div>


          {/* Loading State */}
          {loadingComments ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading comments...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                {comments.length === 0 ? "No comments yet" : "No comments found"}
              </p>
              <p className="text-slate-500 text-sm">
                {comments.length === 0
                  ? postFilter === "all" 
                    ? "Comments will appear here when users interact with your posts"
                    : "This post has no comments yet"
                  : "Try adjusting your search or filters"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedComments.length === currentData.length && currentData.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-violet-500 focus:ring-2 focus:ring-violet-500 rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">COMMENT</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">POST</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">DATE</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">STATUS</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((comment) => (
                    <tr key={comment.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedComments.includes(comment.id)}
                          onChange={() => toggleSelectComment(comment.id)}
                          className="w-4 h-4 text-violet-500 focus:ring-2 focus:ring-violet-500 rounded"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {comment.authorName?.charAt(0).toUpperCase() || 'G'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">{comment.authorName}</p>
                            <p className="text-xs text-slate-500">{comment.authorEmail}</p>
                            <p className="text-slate-300 text-sm mt-1 line-clamp-2">{comment.commentText}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setPostFilter(comment.blogPostId)}
                          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer text-sm text-left max-w-xs truncate"
                        >
                          {comment.blogPostTitle || "Unknown Post"}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-slate-300 text-sm">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            comment.isApproved
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {comment.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {!comment.isApproved && (
                            <button
                              onClick={() => handleApprove(comment.id)}
                              disabled={actionLoading === comment.id}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkAsSpam(comment.id)}
                            disabled={actionLoading === comment.id}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                            title="Mark as Spam"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewingComment(comment)}
                            className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: comment.id, author: comment.authorName })}
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
        {totalPages > 1 && !loadingComments && (
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
                          ? "bg-violet-500 text-white font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
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

              <div className="text-sm text-slate-400">Total: {totalItems} comments</div>
            </div>
          </div>
        )}

        {/* View Comment Modal */}
        {viewingComment && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
              <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                      Comment Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">View comment information</p>
                  </div>
                  <button
                    onClick={() => setViewingComment(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {viewingComment.authorName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{viewingComment.authorName}</p>
                        <p className="text-slate-400 text-sm">{viewingComment.authorEmail}</p>
                      </div>
                      <span
                        className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${
                          viewingComment.isApproved
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {viewingComment.isApproved ? "Approved" : "Pending"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Comment</p>
                        <p className="text-white">{viewingComment.commentText}</p>
                      </div>

                      <div>
                        <p className="text-slate-400 text-sm mb-1">Post</p>
                        <button
                          onClick={() => {
                            setPostFilter(viewingComment.blogPostId);
                            setViewingComment(null);
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {viewingComment.blogPostTitle || "Unknown Post"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Date</p>
                          <p className="text-white text-sm">
                            {new Date(viewingComment.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {viewingComment.approvedAt && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Approved At</p>
                            <p className="text-white text-sm">
                              {new Date(viewingComment.approvedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                    {!viewingComment.isApproved && (
                      <button
                        onClick={() => {
                          handleApprove(viewingComment.id);
                          setViewingComment(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm"
                      >
                        Approve Comment
                      </button>
                    )}
                    <button
                      onClick={() => setViewingComment(null)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all font-medium text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
          title="Delete Comment"
          message={`Are you sure you want to delete the comment by "${deleteConfirm?.author}"? This action cannot be undone.`}
          confirmText="Delete Comment"
          cancelText="Cancel"
          icon={AlertCircle}
          iconColor="text-red-400"
          confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}
