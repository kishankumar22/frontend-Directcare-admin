"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
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
  Filter,
  Reply,
  ShoppingBag,
  TrendingUp,
  Award,
  MessageSquare,
  Plus,
  Package,
} from "lucide-react";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  productReviewsService,
  ProductReview,
  CreateReviewDto,
} from "@/lib/services/productReviews";
interface Product {
  [x: string]: any;
  id: string;
  name: string;
  slug?: string;
    price?: number; // ✅ Add this
}
export default function ProductReviewsPage() {
  const router = useRouter();
  const toast = useToast();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [verifiedOnlyFilter, setVerifiedOnlyFilter] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [viewingReview, setViewingReview] = useState<ProductReview | null>(
    null
  );
  const [replyingTo, setReplyingTo] = useState<ProductReview | null>(null);
  const [replyText, setReplyText] = useState("");
// Add these states at the top with other useState
const [productSearch, setProductSearch] = useState('');
const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    customer: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    averageRating: 0,
  });

  // ✅ Fetch Products
const fetchProducts = async () => {
  setLoadingProducts(true);
  try {
    const response = await productReviewsService.getAllProducts();
    
    // ✅ CORRECT: Access nested items array
    if (response.data?.success && response.data?.data?.items && Array.isArray(response.data.data.items)) {
      const productsData = response.data.data.items.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug
      }));
      
      setProducts(productsData);
      console.log("✅ Products loaded:", productsData.length);
      console.log("📦 Products:", productsData);
    } else {
      console.warn("⚠️ No products found in response");
      setProducts([]);
    }
  } catch (error: any) {
    console.error("❌ Error fetching products:", error);
    toast.error("Failed to load products");
    setProducts([]);
  } finally {
    setLoadingProducts(false);
  }
};

// Add this before return statement (with other computed values)
const filteredProducts = products.filter(product =>
  product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
  product.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
  product.price?.toString().includes(productSearch)
);

  // ✅ Fetch Reviews
  const fetchReviews = async (specificProductId?: string) => {
    setLoadingReviews(true);
    try {
      if (statusFilter === "pending") {
        // Fetch pending reviews
        const response = await productReviewsService.getPendingReviews(1, 1000);
        if (response.data?.success && Array.isArray(response.data.data)) {
          setReviews(response.data.data);
        } else {
          setReviews([]);
        }
      } else if (specificProductId && specificProductId !== "all") {
        // Fetch reviews for specific product
        const minRating = ratingFilter !== "all" ? parseInt(ratingFilter) : undefined;
        const maxRating = ratingFilter !== "all" ? parseInt(ratingFilter) : undefined;

        const response = await productReviewsService.getByProductId(
          specificProductId,
          true,
          minRating,
          maxRating,
          verifiedOnlyFilter
        );

        if (response.data?.success && Array.isArray(response.data.data)) {
          setReviews(response.data.data);
        } else {
          setReviews([]);
        }
      } else {
        // Fetch reviews from all products
        if (products.length === 0) {
          setReviews([]);
          setLoadingReviews(false);
          return;
        }

        const allReviewsPromises = products.map((product) =>
          productReviewsService
            .getByProductId(product.id, true)
            .catch((err) => {
              console.error(`Error for product ${product.id}:`, err);
              return {
                data: { success: false, data: [], message: "", errors: null },
              };
            })
        );

        const results = await Promise.all(allReviewsPromises);
        const allReviews: ProductReview[] = [];

        results.forEach((response) => {
          if (response.data?.success && Array.isArray(response.data.data)) {
            allReviews.push(...response.data.data);
          }
        });

        setReviews(allReviews);
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // ✅ Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    };
    loadData();
  }, []);

  // ✅ Load reviews when filters change
  useEffect(() => {
    if (products.length > 0 || statusFilter === "pending") {
      fetchReviews(productFilter);
    }
  }, [products, productFilter, statusFilter, ratingFilter, verifiedOnlyFilter]);

  const calculateStats = (reviewsData: ProductReview[]) => {
    const total = reviewsData.length;
    const approved = reviewsData.filter((r) => r.isApproved).length;
    const pending = reviewsData.filter((r) => !r.isApproved).length;
    const averageRating =
      reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

    setStats({ total, pending, approved, averageRating });
  };

  // ✅ Calculate stats
  useEffect(() => {
    if (reviews.length > 0) {
      const filtered = reviews.filter((review) => {
        const matchesSearch =
          review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.title?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "approved" && review.isApproved) ||
          (statusFilter === "pending" && !review.isApproved);

        const matchesRating =
          ratingFilter === "all" ||
          review.rating === parseInt(ratingFilter);

        const matchesVerified =
          !verifiedOnlyFilter || review.isVerifiedPurchase;

        return matchesSearch && matchesStatus && matchesRating && matchesVerified;
      });

      calculateStats(filtered);
    } else {
      setStats({ total: 0, pending: 0, approved: 0, averageRating: 0 });
    }
  }, [reviews, searchTerm, statusFilter, ratingFilter, verifiedOnlyFilter]);

  // ✅ Approve Review
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await productReviewsService.approve(id);
      if (response.data?.success) {
        toast.success("✅ Review approved successfully!");
        await fetchReviews(productFilter);
      }
    } catch (error: any) {
      console.error("Error approving review:", error);
      toast.error(
        error?.response?.data?.message || "Failed to approve review"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ Reply to Review
  const handleReply = async () => {
    if (!replyingTo || !replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setActionLoading(replyingTo.id);
    try {
      const response = await productReviewsService.reply(replyingTo.id, {
        reviewId: replyingTo.id,
        comment: replyText,
        isAdminReply: true,
      });

      if (response.data?.success) {
        toast.success("✅ Reply posted successfully!");
        setReplyingTo(null);
        setReplyText("");
        await fetchReviews(productFilter);
      }
    } catch (error: any) {
      console.error("Error posting reply:", error);
      toast.error(error?.response?.data?.message || "Failed to post reply");
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ Delete Review
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await productReviewsService.delete(id);
      if (response.data?.success) {
        toast.success("🗑️ Review deleted successfully!");
        await fetchReviews(productFilter);
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error(error?.response?.data?.message || "Failed to delete review");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const toggleSelectReview = (id: string) => {
    setSelectedReviews((prev) =>
      prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedReviews.length === currentData.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(currentData.map((r) => r.id));
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setRatingFilter("all");
    setProductFilter("all");
    setVerifiedOnlyFilter(false);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    ratingFilter !== "all" ||
    productFilter !== "all" ||
    verifiedOnlyFilter ||
    searchTerm.trim() !== "";

  // Filter data
  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && review.isApproved) ||
      (statusFilter === "pending" && !review.isApproved);

    const matchesRating =
      ratingFilter === "all" || review.rating === parseInt(ratingFilter);

    const matchesVerified =
      !verifiedOnlyFilter || review.isVerifiedPurchase;

    return matchesSearch && matchesStatus && matchesRating && matchesVerified;
  });

  // Pagination
  const totalItems = filteredReviews.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredReviews.slice(startIndex, endIndex);

  const goToPage = (page: number) =>
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };
    // ✅ Create Review Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateReviewDto>({
    productId: "",
    title: "",
    comment: "",
    rating: 5
  });
  const [hoverRating, setHoverRating] = useState(0);

  // ✅ Fetch Products for Dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productReviewsService.getAllProducts(1, 1000);
        if (response.data?.success) {
          setProducts(response.data.data.items || []);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  // ✅ Handle Create Review
  const handleCreateReview = async () => {
    // Validation
    if (!formData.productId) {
      toast.error("Please select a product");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Please enter a review title");
      return;
    }
    if (!formData.comment.trim()) {
      toast.error("Please enter a review comment");
      return;
    }
    if (formData.rating < 1 || formData.rating > 5) {
      toast.error("Please select a rating between 1 and 5");
      return;
    }

    setCreating(true);
    try {
      console.log("📝 Creating review:", formData);
      const response = await productReviewsService.create(formData);
      
      if (response.data?.success) {
        toast.success("✅ Review created successfully!");
        
        // Reset form
        setFormData({
          productId: "",
          title: "",
          comment: "",
          rating: 5
        });
        
        // Close modal
        setShowCreateModal(false);
        
        // Refresh reviews list (add your fetch function here)
        // await fetchReviews();
      } else {
        toast.error(response.data?.message || "Failed to create review");
      }
    } catch (error: any) {
      console.error("❌ Error creating review:", error);
      toast.error(error?.response?.data?.message || "Failed to create review");
    } finally {
      setCreating(false);
    }
  };

  // ✅ Star Rating Component
  const StarRating = ({ value, onChange, size = "h-6 w-6" }: { 
    value: number; 
    onChange: (rating: number) => void;
    size?: string;
  }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`${size} transition-colors ${
                star <= (hoverRating || value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-600"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-400">
          {value} / 5
        </span>
      </div>
    );
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
  }, [searchTerm, statusFilter, ratingFilter, verifiedOnlyFilter]);

  const getSelectedProductName = () => {
    if (productFilter === "all") return "All Products";
    const product = products.find((p) => p.id === productFilter);
    return product?.name || "Unknown Product";
  };

  // Render Stars
  const renderStars = (rating: number, size: string = "h-4 w-4") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-slate-600"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading reviews...</p>
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
              Product Reviews Management
            </h1>
            <p className="text-slate-400 mt-1">
              Manage and moderate customer product reviews
              {productFilter !== "all" && (
                <span className="ml-2 text-violet-400">
                  • Filtered by: {getSelectedProductName()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchProducts();
                fetchReviews(productFilter);
              }}
              disabled={loadingReviews}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl transition-all flex items-center gap-2 font-medium border border-slate-700/50 disabled:opacity-50"
            >
              {loadingReviews ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              Refresh
            </button>
            <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Review
          </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">
                  Total Reviews
                </p>
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

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">
                  Avg Rating
                </p>
                <p className="text-white text-2xl font-bold">
                  {stats.averageRating.toFixed(1)}
                </p>
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
                onChange={(e) =>
                  handleItemsPerPageChange(Number(e.target.value))
                }
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
              {loadingReviews
                ? "Loading..."
                : `Showing ${totalItems > 0 ? startIndex + 1 : 0} to ${Math.min(
                    endIndex,
                    totalItems
                  )} of ${totalItems} entries`}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          {/* Filter Section */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">All Reviews</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Manage and moderate customer reviews
                  {products.length > 0 && (
                    <span className="ml-2 text-slate-500">
                      • {products.length} products available
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
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Rating Filter */}
                <div className="relative">
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className={`px-4 py-2.5 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[140px] appearance-none cursor-pointer ${
                      ratingFilter !== "all"
                        ? "border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/50"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                  </select>
                  <Star className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Product Filter */}
                <div className="relative flex-1 lg:flex-initial lg:min-w-[280px]">
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    disabled={loadingProducts || products.length === 0 || loadingReviews}
                    className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all appearance-none cursor-pointer ${
                      productFilter !== "all"
                        ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
                        : "border-slate-600 hover:border-slate-500"
                    } ${
                      loadingProducts || products.length === 0 || loadingReviews
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value="all">
                      {loadingProducts ? "⏳ Loading products..." : "🛍️ All Products"}
                    </option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name.length > 50
                          ? product.name.substring(0, 50) + "..."
                          : product.name}
                      </option>
                    ))}
                  </select>
                  <ShoppingBag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Verified Purchase Filter */}
                <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-xl hover:border-slate-500 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={verifiedOnlyFilter}
                    onChange={(e) => setVerifiedOnlyFilter(e.target.checked)}
                    className="w-4 h-4 text-green-500 focus:ring-2 focus:ring-green-500 rounded"
                  />
                  <span className="text-sm text-slate-300">Verified Only</span>
                </label>
              </div>

              {/* Search */}
              <div className="relative lg:w-80">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reviews..."
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
                <span className="text-xs text-slate-500 font-medium">
                  Active Filters:
                </span>

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

                {ratingFilter !== "all" && (
                  <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-400 text-xs font-medium flex items-center gap-1">
                    Rating: {ratingFilter} ⭐
                    <button
                      onClick={() => setRatingFilter("all")}
                      className="hover:text-yellow-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {productFilter !== "all" && (
                  <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-md text-purple-400 text-xs font-medium flex items-center gap-1">
                    Product:{" "}
                    {products.find((p) => p.id === productFilter)?.name.substring(0, 30) ||
                      "Selected"}
                    ...
                    <button
                      onClick={() => setProductFilter("all")}
                      className="hover:text-purple-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {verifiedOnlyFilter && (
                  <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-md text-green-400 text-xs font-medium flex items-center gap-1">
                    Verified Purchases Only
                    <button
                      onClick={() => setVerifiedOnlyFilter(false)}
                      className="hover:text-green-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {searchTerm && (
                  <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded-md text-violet-400 text-xs font-medium flex items-center gap-1">
                    Search: "{searchTerm.substring(0, 20)}
                    {searchTerm.length > 20 ? "..." : ""}"
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
          {loadingReviews ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading reviews...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                {reviews.length === 0 ? "No reviews yet" : "No reviews found"}
              </p>
              <p className="text-slate-500 text-sm">
                {reviews.length === 0
                  ? productFilter === "all"
                    ? "Reviews will appear here when customers submit them"
                    : "This product has no reviews yet"
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
                        checked={
                          selectedReviews.length === currentData.length &&
                          currentData.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-violet-500 focus:ring-2 focus:ring-violet-500 rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      REVIEW
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      PRODUCT
                    </th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                      RATING
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      DATE
                    </th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                      STATUS
                    </th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((review) => (
                    <tr
                      key={review.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedReviews.includes(review.id)}
                          onChange={() => toggleSelectReview(review.id)}
                          className="w-4 h-4 text-violet-500 focus:ring-2 focus:ring-violet-500 rounded"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {review.customerName?.charAt(0).toUpperCase() ||
                                "C"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">
                              {review.customerName}
                            </p>
                            <p className="text-violet-400 text-xs font-medium">
                              {review.title}
                            </p>
                            <p className="text-slate-300 text-sm mt-1 line-clamp-2">
                              {review.comment}
                            </p>
                            {review.isVerifiedPurchase && (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setProductFilter(review.productId)}
                          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer text-sm text-left max-w-xs truncate"
                        >
                          {products.find((p) => p.id === review.productId)
                            ?.name || "Unknown Product"}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderStars(review.rating)}
                        <p className="text-xs text-slate-500 mt-1">
                          {review.rating}/5
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-slate-300 text-sm">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            review.isApproved
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {review.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {!review.isApproved && (
                            <button
                              onClick={() => handleApprove(review.id)}
                              disabled={actionLoading === review.id}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setReplyingTo(review)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Reply"
                          >
                            <Reply className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setViewingReview(review)}
                            className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                id: review.id,
                                customer: review.customerName,
                              })
                            }
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
        {totalPages > 1 && !loadingReviews && (
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

              <div className="text-sm text-slate-400">
                Total: {totalItems} reviews
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
                    <h2 className="text-2xl font-bold text-white">
                      Reply to Review
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Replying to {replyingTo.customerName}
                    </p>
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
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(replyingTo.rating, "h-4 w-4")}
                  </div>
                  <p className="text-violet-400 text-sm font-medium mb-1">
                    {replyingTo.title}
                  </p>
                  <p className="text-white">{replyingTo.comment}</p>
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
                    disabled={
                      !replyText.trim() || actionLoading === replyingTo.id
                    }
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

        {/* View Review Modal */}
        {viewingReview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
              <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                      Review Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      View review information
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingReview(null)}
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
                          {viewingReview.customerName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {viewingReview.customerName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(viewingReview.rating, "h-4 w-4")}
                          <span className="text-slate-400 text-sm">
                            {viewingReview.rating}/5
                          </span>
                        </div>
                      </div>
                      <span
                        className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${
                          viewingReview.isApproved
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {viewingReview.isApproved ? "Approved" : "Pending"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Title</p>
                        <p className="text-violet-400 font-medium">
                          {viewingReview.title}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400 text-sm mb-1">Review</p>
                        <p className="text-white">{viewingReview.comment}</p>
                      </div>

                      <div>
                        <p className="text-slate-400 text-sm mb-1">Product</p>
                        <button
                          onClick={() => {
                            setProductFilter(viewingReview.productId);
                            setViewingReview(null);
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {products.find((p) => p.id === viewingReview.productId)
                            ?.name || "Unknown Product"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Date</p>
                          <p className="text-white text-sm">
                            {new Date(
                              viewingReview.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        {viewingReview.isVerifiedPurchase && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">
                              Purchase
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          </div>
                        )}
                      </div>

                      {viewingReview.approvedAt && (
                        <div>
                          <p className="text-slate-400 text-sm mb-1">
                            Approved At
                          </p>
                          <p className="text-white text-sm">
                            {new Date(
                              viewingReview.approvedAt
                            ).toLocaleString()}
                          </p>
                          {viewingReview.approvedBy && (
                            <p className="text-slate-500 text-xs mt-1">
                              By: {viewingReview.approvedBy}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">Helpful</p>
                          <p className="text-green-400 text-xl font-bold">
                            {viewingReview.helpfulCount}
                          </p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">
                            Not Helpful
                          </p>
                          <p className="text-red-400 text-xl font-bold">
                            {viewingReview.notHelpfulCount}
                          </p>
                        </div>
                      </div>

                      {viewingReview.replies && viewingReview.replies.length > 0 && (
                        <div>
                          <p className="text-slate-400 text-sm mb-2">
                            Replies ({viewingReview.replies.length})
                          </p>
                          <div className="space-y-2">
                            {viewingReview.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="bg-slate-900/50 p-3 rounded-lg border border-slate-700"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-white">
                                    {reply.createdByName}
                                  </span>
                                  {reply.isAdminReply && (
                                    <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded text-violet-400 text-xs font-medium">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-300 text-sm">
                                  {reply.comment}
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                    {!viewingReview.isApproved && (
                      <button
                        onClick={() => {
                          handleApprove(viewingReview.id);
                          setViewingReview(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm"
                      >
                        Approve Review
                      </button>
                    )}
                    <button
                      onClick={() => setViewingReview(null)}
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

{showCreateModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-2xl w-full shadow-2xl shadow-violet-500/10 flex flex-col max-h-[90vh]">
      
      {/* ✅ Fixed Modal Header */}
      <div className="flex-shrink-0 p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Create Product Review
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Add a new review for a product
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setFormData({
                productId: "",
                title: "",
                comment: "",
                rating: 5
              });
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ✅ Scrollable Modal Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Product Dropdown */}
  <div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Select Product <span className="text-red-400">*</span>
  </label>
  
  <div className="relative">
    {/* Search Input */}
    <input
      type="text"
      placeholder="Search or select product..."
      value={
        formData.productId 
          ? `${products.find(p => p.id === formData.productId)?.name || ''} ${products.find(p => p.id === formData.productId)?.price ? `- ₹${products.find(p => p.id === formData.productId)?.price}` : ''}`
          : productSearch
      }
      onChange={(e) => {
        setProductSearch(e.target.value);
        setShowProductDropdown(true);
        if (!e.target.value) {
          setFormData({ ...formData, productId: '' });
        }
      }}
      onFocus={() => setShowProductDropdown(true)}
      className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
    />
    
    {/* Icon */}
    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />

    {/* Dropdown List */}
    {showProductDropdown && (
      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg max-h-80 overflow-auto">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product: any) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                setFormData({ ...formData, productId: product.id });
                setProductSearch('');
                setShowProductDropdown(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-violet-500/20 transition-colors border-b border-slate-800 last:border-b-0 ${
                formData.productId === product.id 
                  ? 'bg-violet-500/30 text-violet-300' 
                  : 'text-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{product.name}</div>
                  {product.sku && (
                    <div className="text-xs text-slate-400 mt-0.5">SKU: {product.sku}</div>
                  )}
                </div>
                {product.price && (
                  <div className="text-emerald-400 font-semibold">₹{product.price}</div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-3 text-slate-400 text-sm text-center">
            No products found
          </div>
        )}
      </div>
    )}

    {/* Close dropdown overlay */}
    {showProductDropdown && (
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowProductDropdown(false)}
      />
    )}
  </div>

  {/* Helper text */}
  {formData.productId && (
    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Selected: {products.find(p => p.id === formData.productId)?.name}
    </p>
  )}

  <p className="text-xs text-slate-500 mt-1">
    {productSearch 
      ? `Showing ${filteredProducts.length} of ${products.length} products` 
      : `${products.length} products available`
    }
  </p>
</div>

        {/* Review Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Review Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Excellent product, highly recommended!"
            maxLength={100}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
          <p className="text-xs text-slate-500 mt-1">
            {formData.title.length} / 100 characters
          </p>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Rating <span className="text-red-400">*</span>
          </label>
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
            <StarRating
              value={formData.rating}
              onChange={(rating) => setFormData({ ...formData, rating })}
              size="h-8 w-8"
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Review Comment <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            placeholder="Share your experience with this product..."
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">
            {formData.comment.length} / 1000 characters
          </p>
        </div>

        {/* Preview Card */}
        {formData.title && formData.comment && (
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
            <p className="text-xs text-slate-500 mb-2">Preview:</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm">Admin</p>
                  <div className="flex items-center">
                    {[...Array(formData.rating)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-white font-medium text-sm mb-1">{formData.title}</p>
                <p className="text-slate-400 text-xs line-clamp-2">{formData.comment}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Fixed Modal Footer */}
      <div className="flex-shrink-0 p-6 border-t border-slate-700/50 bg-slate-900/50 flex justify-end gap-3 rounded-b-3xl">
        <button
          onClick={() => {
            setShowCreateModal(false);
            setFormData({
              productId: "",
              title: "",
              comment: "",
              rating: 5
            });
          }}
          className="px-5 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-medium text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateReview}
          disabled={creating || !formData.productId || !formData.title.trim() || !formData.comment.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {creating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              Create Review
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
          title="Delete Review"
          message={`Are you sure you want to delete the review by "${deleteConfirm?.customer}"? This action cannot be undone.`}
          confirmText="Delete Review"
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
