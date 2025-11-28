"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  X, 
  Search, 
  FilterX, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Eye, 
  Trash2, 
  AlertCircle, 
  Ban, 
  Filter,
  Reply,
  Shield,
  ShieldOff,
  AlertTriangle,
  CornerDownRight,
  User,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { blogCommentsService, BlogComment, BlogPost } from "@/lib/services/blogComments";

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
  const [replyingTo, setReplyingTo] = useState<BlogComment | null>(null);
  const [replyText, setReplyText] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; author: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ✅ User Authentication State
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("Admin User");

  //

  
// Add these states in your component
const [showPostDropdown, setShowPostDropdown] = useState(false);
const [postSearchTerm, setPostSearchTerm] = useState("");
const dropdownRef = useRef<HTMLDivElement>(null);

// Close dropdown when clicking outside
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowPostDropdown(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

// Filter posts based on search
const filteredPosts = blogPosts.filter(post =>
  post.title.toLowerCase().includes(postSearchTerm.toLowerCase())
);



  // ✅ Get current user from token
  useEffect(() => {
    const email = localStorage.getItem('userEmail') || 'admin@ecom.com';
    const storedUserData = localStorage.getItem('userData');

    setCurrentUserEmail(email);

    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        let firstName = userData.firstName || '';
        let lastName = userData.lastName || '';
        let userId = userData.id || '';

        if (!firstName || !lastName || !userId) {
          const token = localStorage.getItem('authToken');
          if (token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const tokenData = JSON.parse(jsonPayload);
              firstName = firstName || tokenData.firstName || '';
              lastName = lastName || tokenData.lastName || '';
              userId = userId || tokenData.sub || tokenData.userId || tokenData.id || '';
            } catch (err) {
              console.error('Token decode error:', err);
            }
          }
        }

        const fullName = `${firstName} ${lastName}`.trim() || 'Admin User';
        setUserName(fullName);
        setCurrentUserId(userId);
      } catch (error) {
        setUserName('Admin User');
      }
    }
  }, []);

  // ✅ Helper function to flatten comments (with duplicate prevention)
  const flattenComments = (comments: BlogComment[]): BlogComment[] => {
    const flattened: BlogComment[] = [];
    const processedIds = new Set<string>();
    
    const flatten = (comment: BlogComment) => {
      if (processedIds.has(comment.id)) return;
      
      processedIds.add(comment.id);
      flattened.push(comment);
      
      if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
        comment.replies.forEach(reply => flatten(reply));
      }
    };
    
    comments.forEach(comment => flatten(comment));
    return flattened;
  };

  // ✅ Check if comment is by admin
  const isAdminComment = (comment: BlogComment): boolean => {
    return comment.userId === currentUserId || comment.authorEmail === currentUserEmail;
  };

  // ✅ Get only parent comments (no duplicates)
  const getParentComments = (): BlogComment[] => {
    const parents = comments.filter(comment => !comment.parentCommentId);
    return parents;
  };

  // ✅ Get replies for a specific comment
  const getReplies = (parentId: string): BlogComment[] => {
    return comments.filter(comment => comment.parentCommentId === parentId);
  };

  // ✅ Fetch Blog Posts
  const fetchBlogPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await blogCommentsService.getAllPosts();
      if (response.data?.success && Array.isArray(response.data.data)) {
        // Filter out deleted posts
        const activePosts = response.data.data.filter(post => !post.isDeleted);
        console.log("📚 Active blog posts:", activePosts.length);
        console.log("🗑️ Deleted posts filtered:", response.data.data.length - activePosts.length);
        setBlogPosts(activePosts);
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

  // ✅ Fetch Comments (uses BlogPosts data directly)
  const fetchComments = async (specificPostId?: string) => {
    setLoadingComments(true);
    try {
      console.log("🔄 Fetching comments from BlogPosts API...");
      
      // Extract all comments from blogPosts data
      const allCommentsFromPosts: BlogComment[] = [];
      
      blogPosts
        .filter(post => !post.isDeleted)
        .forEach(post => {
          if (post.comments && Array.isArray(post.comments) && post.comments.length > 0) {
            const postComments = flattenComments(post.comments).map(comment => ({
              ...comment,
              blogPostTitle: comment.blogPostTitle || post.title,
              blogPostId: post.id
            }));
            allCommentsFromPosts.push(...postComments);
          }
        });

      console.log("📊 Total comments extracted:", allCommentsFromPosts.length);
      console.log("📝 Comments breakdown:", {
        total: allCommentsFromPosts.length,
        parents: allCommentsFromPosts.filter(c => !c.parentCommentId).length,
        replies: allCommentsFromPosts.filter(c => c.parentCommentId).length,
        spam: allCommentsFromPosts.filter(c => c.isSpam).length
      });

      // Apply filters
      let filteredComments = allCommentsFromPosts;

      if (statusFilter === "spam") {
        filteredComments = allCommentsFromPosts.filter(c => c.isSpam);
        console.log("🚩 Spam filter applied:", filteredComments.length);
      } else if (specificPostId && specificPostId !== "all") {
        filteredComments = allCommentsFromPosts.filter(c => c.blogPostId === specificPostId);
        console.log(`📝 Post filter applied (${specificPostId}):`, filteredComments.length);
      }

      setComments(filteredComments);
      
    } catch (error: any) {
      console.error("❌ Error fetching comments:", error);
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

  // ✅ Load comments when blogPosts, postFilter, or statusFilter changes
  useEffect(() => {
    if (blogPosts.length > 0) {
      fetchComments(postFilter);
    }
  }, [blogPosts, postFilter, statusFilter]);

  // ✅ Filter parent comments
  const filteredComments = getParentComments().filter(comment => {
    const matchesSearch =
      comment.commentText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.authorEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && comment.isApproved && !comment.isSpam) ||
      (statusFilter === "pending" && !comment.isApproved && !comment.isSpam) ||
      (statusFilter === "spam" && comment.isSpam);

    return matchesSearch && matchesStatus;
  });

  // ✅ Stats (counts all spam including nested)
  const stats = {
    total: getParentComments().length,
    pending: getParentComments().filter(c => !c.isApproved && !c.isSpam).length,
    approved: getParentComments().filter(c => c.isApproved && !c.isSpam).length,
    spam: comments.filter(c => c.isSpam).length, // All spam including replies
  };

  // Pagination
  const totalItems = filteredComments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredComments.slice(startIndex, endIndex);

// ✅ Approve Comment (UPDATED)
const handleApprove = async (id: string) => {
  setActionLoading(id);
  try {
    console.log("✅ Approving comment:", id);
    const response = await blogCommentsService.approve(id);
    
    if (response.data?.success) {
      toast.success("✅ Comment approved successfully!");
      await fetchBlogPosts(); // Refresh data
      console.log("✅ Data refreshed after approve");
    } else {
      toast.error(response.data?.message || "Failed to approve comment");
    }
  } catch (error: any) {
    console.error("❌ Error approving comment:", error);
    toast.error(error?.response?.data?.message || "Failed to approve comment");
  } finally {
    setActionLoading(null);
  }
};
// ✅ Delete Comment (FIXED)
const handleDelete = async (id: string) => {
  setIsDeleting(true);
  try {
    console.log("🗑️ Deleting comment:", id);
    const response = await blogCommentsService.delete(id);
    
    console.log("✅ Delete API Response:", response.data);
    
    if (response.data?.success) {
      toast.success("🗑️ Comment deleted successfully!");
      
      // ✅ Close modal first
      setDeleteConfirm(null);
      
      // ✅ Refresh blog posts data
      await fetchBlogPosts();
      
      // Note: fetchComments will auto-trigger via useEffect when blogPosts updates
      console.log("✅ Data refreshed after delete");
    } else {
      toast.error(response.data?.message || "Failed to delete comment");
    }
  } catch (error: any) {
    console.error("❌ Error deleting comment:", error);
    console.error("Error details:", error.response?.data);
    
    const errorMessage = 
      error?.response?.data?.message || 
      error?.response?.data?.errors?.[0] ||
      error?.message ||
      "Failed to delete comment";
    
    toast.error(errorMessage);
  } finally {
    setIsDeleting(false);
  }
};

// ✅ Flag as Spam (UPDATED)
const handleFlagAsSpam = async (id: string) => {
  setActionLoading(id);
  try {
    console.log("🚩 Flagging as spam:", id);
    const response = await blogCommentsService.flagAsSpam(id, "Flagged by admin", 1);
    
    if (response.data?.success) {
      toast.success("🚩 Comment flagged as spam!");
      await fetchBlogPosts(); // Refresh data
      console.log("✅ Data refreshed after spam flag");
    } else {
      toast.error(response.data?.message || "Failed to flag as spam");
    }
  } catch (error: any) {
    console.error("❌ Error flagging as spam:", error);
    toast.error(error?.response?.data?.message || "Failed to flag as spam");
  } finally {
    setActionLoading(null);
  }
};

// ✅ Unflag Spam (UPDATED)
const handleUnflagSpam = async (id: string) => {
  setActionLoading(id);
  try {
    console.log("🔄 Unflagging spam:", id);
    const response = await blogCommentsService.unflagSpam(id);
    
    if (response.data?.success) {
      toast.success("✅ Comment restored from spam!");
      await fetchBlogPosts(); // Refresh data
      console.log("✅ Data refreshed after unflag");
    } else {
      toast.error(response.data?.message || "Failed to restore comment");
    }
  } catch (error: any) {
    console.error("❌ Error unflagging spam:", error);
    toast.error(error?.response?.data?.message || "Failed to restore comment");
  } finally {
    setActionLoading(null);
  }
};

// ✅ Reply to Comment (UPDATED)
const handleReply = async () => {
  if (!replyingTo || !replyText.trim()) {
    toast.error("Please enter a reply");
    return;
  }

  setActionLoading(replyingTo.id);
  try {
    console.log("💬 Posting reply to:", replyingTo.id);
    const response = await blogCommentsService.replyToComment(replyingTo.id, {
      parentCommentId: replyingTo.id,
      commentText: replyText,
      authorName: userName,
      userId: currentUserId
    });
    
    if (response.data?.success) {
      toast.success("✅ Reply posted successfully!");
      
      // Close modal
      setReplyingTo(null);
      setReplyText("");
      
      // Refresh data
      await fetchBlogPosts();
      console.log("✅ Data refreshed after reply");
    } else {
      toast.error(response.data?.message || "Failed to post reply");
    }
  } catch (error: any) {
    console.error("❌ Error posting reply:", error);
    toast.error(error?.response?.data?.message || "Failed to post reply");
  } finally {
    setActionLoading(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
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
          <button 
            onClick={() => fetchBlogPosts()}
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
          {/* Filter Section */}
          <div className="space-y-4 mb-6">
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

            <div className="flex flex-col lg:flex-row gap-3">
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
                    <option value="spam">🚩 Spam</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Post Filter */}
<div className="relative flex-1 lg:flex-initial lg:min-w-[280px]" ref={dropdownRef}>
  {/* Input Field */}
  <div className="relative">
    <input
      type="text"
      value={showPostDropdown ? postSearchTerm : getSelectedPostTitle()}
      onChange={(e) => {
        setPostSearchTerm(e.target.value);
        if (!showPostDropdown) setShowPostDropdown(true);
      }}
      onFocus={() => {
        setShowPostDropdown(true);
        setPostSearchTerm("");
      }}
      placeholder={loadingPosts ? "⏳ Loading posts..." : "🔍 Search posts..."}
      disabled={loadingPosts || blogPosts.length === 0 || loadingComments}
      className={`w-full px-4 py-2.5 pl-10 pr-10 bg-slate-800/50 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
        postFilter !== "all"
          ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
          : "border-slate-600 hover:border-slate-500"
      } ${
        loadingPosts || blogPosts.length === 0 || loadingComments
          ? "opacity-50 cursor-not-allowed"
          : ""
      }`}
    />
    
    {/* Search Icon */}
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    
    {/* Clear/Dropdown Toggle */}
    {postFilter !== "all" ? (
      <button
        onClick={() => {
          setPostFilter("all");
          setPostSearchTerm("");
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-all"
      >
        <X className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
      </button>
    ) : (
      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform ${
        showPostDropdown ? 'rotate-180' : ''
      }`} />
    )}
  </div>

  {/* Dropdown List */}
  {showPostDropdown && (
    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50">
      {/* All Posts Option */}
      <button
        onClick={() => {
          setPostFilter("all");
          setShowPostDropdown(false);
          setPostSearchTerm("");
        }}
        className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all ${
          postFilter === "all" ? "bg-purple-500/10 text-purple-400" : "text-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">📝 All Posts</span>
        </div>
      </button>

      {/* Filtered Posts */}
      {filteredPosts.length > 0 ? (
        filteredPosts.map((post) => (
          <button
            key={post.id}
            onClick={() => {
              setPostFilter(post.id);
              setShowPostDropdown(false);
              setPostSearchTerm("");
            }}
            className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all border-t border-slate-700 ${
              postFilter === post.id ? "bg-purple-500/10 text-purple-400" : "text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="text-sm truncate">{post.title}</span>
            </div>
          </button>
        ))
      ) : (
        <div className="px-4 py-3 text-center text-slate-500 text-sm">
          No posts found for "{postSearchTerm}"
        </div>
      )}
    </div>
  )}


</div>
              </div>

              {/* Search */}
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
            <div className="space-y-6">
              {currentData.map((parentComment) => {
                const replies = getReplies(parentComment.id);
                
                return (
                  <div
                    key={`parent-${parentComment.id}`}
                    className={`border rounded-xl p-5 transition-all ${
                      parentComment.isSpam
                        ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {/* Parent Comment */}
                    <div className="flex items-start gap-4">
                      {/* Avatar with spam indicator */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        parentComment.isSpam 
                          ? 'bg-gradient-to-br from-red-500 to-rose-500'
                          : 'bg-gradient-to-br from-violet-500 to-pink-500'
                      }`}>
                        <span className="text-white text-sm font-bold">
                          {parentComment.isSpam ? '⚠️' : (parentComment.authorName?.charAt(0).toUpperCase() || 'U')}
                        </span>
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        {/* Author Info */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-white font-semibold text-sm">
                            {parentComment.authorName}
                          </p>
                          {isAdminComment(parentComment) && (
                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-xs font-medium">
                              Admin
                            </span>
                          )}
                          <span className="text-slate-500 text-xs">•</span>
                          <p className="text-slate-400 text-xs">
                            {new Date(parentComment.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {new Date(parentComment.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          
                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              parentComment.isSpam
                                ? 'bg-red-500/10 text-red-400'
                                : parentComment.isApproved
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-yellow-500/10 text-yellow-400'
                            }`}
                          >
                            {parentComment.isSpam ? 'Spam' : parentComment.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </div>

                        {/* Email */}
                        <p className="text-slate-500 text-xs mb-2">
                          {parentComment.authorEmail}
                        </p>

                        {/* ✅ Spam Warning Banner */}
                        {parentComment.isSpam && (
                          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-red-400 text-xs font-semibold">⚠️ Spam Comment</p>
                              {parentComment.spamReason && (
                                <p className="text-slate-400 text-xs">Reason: {parentComment.spamReason}</p>
                              )}
                              {parentComment.flaggedAt && (
                                <p className="text-slate-500 text-xs">
                                  Flagged on {new Date(parentComment.flaggedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Comment Text */}
                        <p className={`text-slate-300 text-sm mb-2 ${
                          parentComment.isSpam ? 'line-through opacity-50' : ''
                        }`}>
                          {parentComment.commentText}
                        </p>

                        {/* Post Title */}
                        <p className="text-slate-500 text-xs mb-3">
                          on <span className="text-blue-400 hover:text-blue-300 cursor-pointer" onClick={() => setPostFilter(parentComment.blogPostId)}>
                            {parentComment.blogPostTitle || 'Unknown Post'}
                          </span>
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!parentComment.isApproved && !parentComment.isSpam && (
                            <button
                              onClick={() => handleApprove(parentComment.id)}
                              disabled={actionLoading === parentComment.id}
                              className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Approve
                            </button>
                          )}

                          {!isAdminComment(parentComment) && !parentComment.isSpam && (
                            <button
                              onClick={() => handleFlagAsSpam(parentComment.id)}
                              disabled={actionLoading === parentComment.id}
                              className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Shield className="h-3 w-3" />
                              Mark Spam
                            </button>
                          )}

                          {parentComment.isSpam && (
                            <button
                              onClick={() => handleUnflagSpam(parentComment.id)}
                              disabled={actionLoading === parentComment.id}
                              className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <ShieldOff className="h-3 w-3" />
                              Restore
                            </button>
                          )}

                          <button
                            onClick={() => setReplyingTo(parentComment)}
                            disabled={parentComment.isSpam}
                            className="px-3 py-1.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            <Reply className="h-3 w-3" />
                            Reply
                          </button>

                          <button
                            onClick={() => setViewingComment(parentComment)}
                            className="px-3 py-1.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>

                          <button
                            onClick={() => setDeleteConfirm({ id: parentComment.id, author: parentComment.authorName })}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ✅ Replies Section */}
                    {replies.length > 0 && (
                      <div className="mt-4 ml-14 space-y-3 border-l-2 border-slate-700 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CornerDownRight className="h-4 w-4 text-slate-500" />
                          <p className="text-slate-400 text-xs font-medium">
                            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                          </p>
                        </div>
                        
                        {replies.map((reply) => (
                          <div
                            key={`reply-${reply.id}-${parentComment.id}`}
                            className={`border rounded-lg p-3 transition-all ${
                              reply.isSpam
                                ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Reply Avatar with spam indicator */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                reply.isSpam
                                  ? 'bg-gradient-to-br from-red-500 to-rose-500'
                                  : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                              }`}>
                                <span className="text-white text-xs font-bold">
                                  {reply.isSpam ? '⚠️' : (reply.authorName?.charAt(0).toUpperCase() || 'U')}
                                </span>
                              </div>

                              {/* Reply Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="text-white font-medium text-sm">
                                    {reply.authorName}
                                  </p>
                                  {isAdminComment(reply) && (
                                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-xs font-medium">
                                      Admin
                                    </span>
                                  )}
                                  <span className="text-slate-500 text-xs">•</span>
                                  <p className="text-slate-400 text-xs">
                                    {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>

                                  {/* Status Badge */}
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      reply.isSpam
                                        ? 'bg-red-500/10 text-red-400'
                                        : reply.isApproved
                                        ? 'bg-green-500/10 text-green-400'
                                        : 'bg-yellow-500/10 text-yellow-400'
                                    }`}
                                  >
                                    {reply.isSpam ? 'Spam' : reply.isApproved ? 'Approved' : 'Pending'}
                                  </span>
                                </div>

                                {/* ✅ Spam badge for reply */}
                                {reply.isSpam && (
                                  <div className="mb-1 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs font-medium inline-flex items-center gap-1">
                                    <Ban className="h-3 w-3" />
                                    Spam Reply
                                  </div>
                                )}

                                <p className={`text-slate-300 text-sm mb-2 ${
                                  reply.isSpam ? 'line-through opacity-50' : ''
                                }`}>
                                  {reply.commentText}
                                </p>

                                {/* Reply Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!reply.isApproved && !reply.isSpam && (
                                    <button
                                      onClick={() => handleApprove(reply.id)}
                                      disabled={actionLoading === reply.id}
                                      className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                      Approve
                                    </button>
                                  )}

                                  {!isAdminComment(reply) && !reply.isSpam && (
                                    <button
                                      onClick={() => handleFlagAsSpam(reply.id)}
                                      disabled={actionLoading === reply.id}
                                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <Shield className="h-3 w-3" />
                                      Spam
                                    </button>
                                  )}

                                  {reply.isSpam && (
                                    <button
                                      onClick={() => handleUnflagSpam(reply.id)}
                                      disabled={actionLoading === reply.id}
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <ShieldOff className="h-3 w-3" />
                                      Restore
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setViewingComment(reply)}
                                    className="text-violet-400 hover:text-violet-300 text-xs flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirm({ id: reply.id, author: reply.authorName })}
                                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                  {getPageNumbers().map(page => (
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
                Total: {totalItems} comments
              </div>
            </div>
          </div>
        )}

        {/* Reply Modal */}
        {replyingTo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-blue-500/20 rounded-3xl max-w-2xl w-full shadow-2xl shadow-blue-500/10">
              <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Reply to Comment</h2>
                    <p className="text-slate-400 text-sm mt-1">Replying to {replyingTo.authorName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm mb-2">Original Comment:</p>
                  <p className="text-white">{replyingTo.commentText}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Your Reply
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || actionLoading === replyingTo.id}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === replyingTo.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Reply className="h-4 w-4" />
                        Post Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
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
                      <div className="flex-1">
                        <p className="text-white font-medium">{viewingComment.authorName}</p>
                        <p className="text-slate-400 text-sm">{viewingComment.authorEmail}</p>
                      </div>
                      <span
                        className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${
                          viewingComment.isSpam
                            ? "bg-red-500/10 text-red-400"
                            : viewingComment.isApproved
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {viewingComment.isSpam ? "Spam" : viewingComment.isApproved ? "Approved" : "Pending"}
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

                      {viewingComment.isSpam && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-red-400 text-sm font-medium mb-1">Spam Information</p>
                          <p className="text-slate-300 text-sm">
                            Reason: {viewingComment.spamReason || "Flagged by admin"}
                          </p>
                          {viewingComment.flaggedAt && (
                            <p className="text-slate-400 text-xs mt-1">
                              Flagged at: {new Date(viewingComment.flaggedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                    {!viewingComment.isApproved && !viewingComment.isSpam && (
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
                    {viewingComment.isSpam && (
                      <button
                        onClick={() => {
                          handleUnflagSpam(viewingComment.id);
                          setViewingComment(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
                      >
                        Restore from Spam
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
