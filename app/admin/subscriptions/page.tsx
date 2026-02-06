"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
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
  Pause,
  Play,
  Ban,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  MapPin,
  ShoppingBag,
  SkipForward,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/app/admin/_component/CustomToast";
import ConfirmDialog from "@/app/admin/_component/ConfirmDialog";
import { subscriptionsService, Subscription } from "@/lib/services/subscriptions";

// ✅ Product interface
interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const toast = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all"); // ✅ NEW

  // ✅ Product dropdown states
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const productDropdownRef = useRef<HTMLDivElement>(null);


  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null);
  
  // ✅ Confirmation modal states
  const [pausingSubscription, setPausingSubscription] = useState<Subscription | null>(null);
  const [resumingSubscription, setResumingSubscription] = useState<Subscription | null>(null);
  const [skippingSubscription, setSkippingSubscription] = useState<Subscription | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState<Subscription | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    cancelled: 0,
    totalRevenue: 0,
  });

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // ✅ Get selected product title
  const getSelectedProductTitle = () => {
    if (productFilter === "all") return "All Products";
    const product = products.find(p => p.id === productFilter);
    return product?.name || "Unknown Product";
  };

  // Fetch Subscriptions
  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const response = await subscriptionsService.getAll();
      if (response.data?.success && Array.isArray(response.data.data)) {
        setSubscriptions(response.data.data);
        
        // ✅ Extract unique products from subscriptions
        const uniqueProducts = new Map<string, Product>();
        response.data.data.forEach((sub: Subscription) => {
          if (sub.productId && sub.productName) {
            uniqueProducts.set(sub.productId, {
              id: sub.productId,
              name: sub.productName,
              sku: sub.productSku || ''
            });
          }
        });
        setProducts(Array.from(uniqueProducts.values()));
        
        console.log("✅ Subscriptions loaded:", response.data.data.length);
      } else {
        setSubscriptions([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchSubscriptions();
      setLoading(false);
    };
    loadData();
  }, []);

  // Calculate stats
  const calculateStats = (subscriptionsData: Subscription[]) => {
    const total = subscriptionsData.length;
    const active = subscriptionsData.filter((s) => s.status === 1).length;
    const paused = subscriptionsData.filter((s) => s.status === 2).length;
    const cancelled = subscriptionsData.filter((s) => s.status === 3).length;
    const totalRevenue = subscriptionsData
      .filter((s) => s.status === 1)
      .reduce((sum, s) => sum + s.discountedPrice * s.quantity, 0);

    setStats({ total, active, paused, cancelled, totalRevenue });
  };

  useEffect(() => {
    if (subscriptions.length > 0) {
      const filtered = subscriptions.filter((subscription) => {
        const matchesSearch =
          subscription.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subscription.shippingFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subscription.productSku?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && subscription.status === 1) ||
          (statusFilter === "paused" && subscription.status === 2) ||
          (statusFilter === "cancelled" && subscription.status === 3);

        const matchesFrequency =
          frequencyFilter === "all" || subscription.frequency === parseInt(frequencyFilter);

        // ✅ NEW: Product filter
        const matchesProduct =
          productFilter === "all" || subscription.productId === productFilter;

        return matchesSearch && matchesStatus && matchesFrequency && matchesProduct;
      });

      calculateStats(filtered);
    } else {
      setStats({ total: 0, active: 0, paused: 0, cancelled: 0, totalRevenue: 0 });
    }
  }, [subscriptions, searchTerm, statusFilter, frequencyFilter, productFilter]);

  // ✅ Action Handlers with Confirmation
  const handlePauseConfirm = async () => {
    if (!pausingSubscription) return;
    
    setActionLoading(pausingSubscription.id);
    try {
      const response = await subscriptionsService.pause(pausingSubscription.id);
      if (response.data?.success) {
        toast.success("Subscription paused successfully! ⏸️");
        setPausingSubscription(null);
        await fetchSubscriptions();
      }
    } catch (error: any) {
      console.error("Error pausing subscription:", error);
      toast.error(error?.response?.data?.message || "Failed to pause subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeConfirm = async () => {
    if (!resumingSubscription) return;
    
    setActionLoading(resumingSubscription.id);
    try {
      const response = await subscriptionsService.resume(resumingSubscription.id);
      if (response.data?.success) {
        toast.success("Subscription resumed successfully! ▶️");
        setResumingSubscription(null);
        await fetchSubscriptions();
      }
    } catch (error: any) {
      console.error("Error resuming subscription:", error);
      toast.error(error?.response?.data?.message || "Failed to resume subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkipConfirm = async () => {
    if (!skippingSubscription) return;
    
    setActionLoading(skippingSubscription.id);
    try {
      const response = await subscriptionsService.skip(skippingSubscription.id);
      if (response.data?.success) {
        toast.success("Next delivery skipped! ⏩");
        setSkippingSubscription(null);
        await fetchSubscriptions();
      }
    } catch (error: any) {
      console.error("Error skipping delivery:", error);
      toast.error(error?.response?.data?.message || "Failed to skip delivery");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancellingSubscription || !cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setActionLoading(cancellingSubscription.id);
    try {
      const response = await subscriptionsService.cancel(cancellingSubscription.id, {
        cancellationReason: cancelReason,
      });
      
      if (response.data?.success) {
        toast.success("Subscription cancelled! 🚫");
        setCancellingSubscription(null);
        setCancelReason("");
        await fetchSubscriptions();
      }
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error(error?.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("all");
    setFrequencyFilter("all");
    setProductFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    statusFilter !== "all" || 
    frequencyFilter !== "all" || 
    productFilter !== "all" ||
    searchTerm.trim() !== "";

  // Filter data
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      subscription.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.shippingFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.productSku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && subscription.status === 1) ||
      (statusFilter === "paused" && subscription.status === 2) ||
      (statusFilter === "cancelled" && subscription.status === 3);

    const matchesFrequency =
      frequencyFilter === "all" || subscription.frequency === parseInt(frequencyFilter);

    const matchesProduct =
      productFilter === "all" || subscription.productId === productFilter;

    return matchesSearch && matchesStatus && matchesFrequency && matchesProduct;
  });

  // Pagination
  const totalItems = filteredSubscriptions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredSubscriptions.slice(startIndex, endIndex);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

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
  }, [searchTerm, statusFilter, frequencyFilter, productFilter]);

  // Get Status Badge
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400">Active</span>;
      case 2:
        return <span className="px-3 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400">Paused</span>;
      case 3:
        return <span className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400">Cancelled</span>;
      case 4:
        return <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-400">Expired</span>;
      default:
        return <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-400">Unknown</span>;
    }
  };

  // Get Frequency Badge
  const getFrequencyBadge = (frequency: number) => {
    const badges: Record<number, string> = {
      1: "Weekly",
      2: "Bi-Weekly",
      3: "Monthly",
      4: "Bi-Monthly",
      5: "Quarterly",
    };
    return badges[frequency] || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
 <div className="">
      <div className="mx-auto space-y-4 p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Subscriptions Management
            </h1>
            <p className="text-slate-400 mt-1">Manage and monitor customer subscriptions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubscriptions}
              disabled={loadingSubscriptions}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-xl transition-all flex items-center gap-2 font-medium border border-slate-700/50 disabled:opacity-50"
            >
              {loadingSubscriptions ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Package className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Total Subscriptions</p>
                <p className="text-white text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Active</p>
                <p className="text-white text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Pause className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Paused</p>
                <p className="text-white text-2xl font-bold">{stats.paused}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Cancelled</p>
                <p className="text-white text-2xl font-bold">{stats.cancelled}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm font-medium mb-1">Monthly Revenue</p>
                <p className="text-white text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
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
              {loadingSubscriptions
                ? "Loading..."
                : `Showing ${totalItems > 0 ? startIndex + 1 : 0} to ${Math.min(endIndex, totalItems)} of ${totalItems} entries`}
            </div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-3">
          {/* Filter Section */}
          <div className="space-y-4 mb-2">
      

            {/* ✅ FILTERS ROW */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-4 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[160px] appearance-none cursor-pointer ${
                      statusFilter !== "all"
                        ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="active">✓ Active</option>
                    <option value="paused">⏸ Paused</option>
                    <option value="cancelled">🚫 Cancelled</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Frequency Filter */}
                <div className="relative">
                  <select
                    value={frequencyFilter}
                    onChange={(e) => setFrequencyFilter(e.target.value)}
                    className={`px-4 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[160px] appearance-none cursor-pointer ${
                      frequencyFilter !== "all"
                        ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <option value="all">All Frequencies</option>
                    <option value="1">📅 Weekly</option>
                    <option value="2">📅 Bi-Weekly</option>
                    <option value="3">📅 Monthly</option>
                    <option value="4">📅 Bi-Monthly</option>
                    <option value="5">📅 Quarterly</option>
                  </select>
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* ✅ PRODUCT FILTER - Searchable Dropdown */}
                <div className="relative flex-1 lg:flex-initial lg:min-w-[280px]" ref={productDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={showProductDropdown ? productSearchTerm : getSelectedProductTitle()}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        if (!showProductDropdown) setShowProductDropdown(true);
                      }}
                      onFocus={() => {
                        setShowProductDropdown(true);
                        setProductSearchTerm("");
                      }}
                      placeholder={loadingProducts ? "Loading products..." : "Search products..."}
                      disabled={loadingProducts || products.length === 0 || loadingSubscriptions}
                      className={`w-full px-4 py-2.5 pl-10 pr-10 bg-slate-800/50 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                        productFilter !== "all"
                          ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50"
                          : "border-slate-600 hover:border-slate-500"
                      } ${
                        loadingProducts || products.length === 0 || loadingSubscriptions
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    
                    {productFilter !== "all" ? (
                      <button
                        onClick={() => {
                          setProductFilter("all");
                          setProductSearchTerm("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-all"
                      >
                        <X className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                      </button>
                    ) : (
                      <ChevronDown
                        className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform ${
                          showProductDropdown ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 custom-scrollbar">
                      {/* All Products Option */}
                      <button
                        onClick={() => {
                          setProductFilter("all");
                          setShowProductDropdown(false);
                          setProductSearchTerm("");
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all ${
                          productFilter === "all" ? "bg-cyan-500/10 text-cyan-400" : "text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">All Products</span>
                          {productFilter === "all" && (
                            <span className="ml-auto text-cyan-400">✓</span>
                          )}
                        </div>
                      </button>

                      {/* Product List */}
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              setProductFilter(product.id);
                              setShowProductDropdown(false);
                              setProductSearchTerm("");
                            }}
                            className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all border-t border-slate-700 ${
                              productFilter === product.id ? "bg-cyan-500/10 text-cyan-400" : "text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                {product.sku && (
                                  <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku}</p>
                                )}
                              </div>
                              {productFilter === product.id && (
                                <span className="text-cyan-400 flex-shrink-0">✓</span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">
                            No products found for "{productSearchTerm}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative lg:w-80">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search subscriptions..."
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
            
          </div>

          {/* ✅ REST OF THE TABLE CODE - Keep existing table structure */}
          {/* Just update action buttons to open confirmation modals */}
          
          {/* Loading State */}
          {loadingSubscriptions ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading subscriptions...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                {subscriptions.length === 0 ? "No subscriptions yet" : "No subscriptions found"}
              </p>
              <p className="text-slate-500 text-sm">
                {subscriptions.length === 0
                  ? "Subscriptions will appear here when customers subscribe"
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
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">PRODUCT</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">CUSTOMER</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">FREQUENCY</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">PRICE</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">NEXT DELIVERY</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">STATUS</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Product */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {subscription.productImageUrl ? (
                              <img
                                src={subscription.productImageUrl}
                                alt={subscription.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="h-6 w-6 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{subscription.productName}</p>
                            <p className="text-xs text-slate-500">SKU: {subscription.productSku}</p>
                            {subscription.variantName && (
                              <p className="text-xs text-violet-400">{subscription.variantName}</p>
                            )}
                            <p className="text-xs text-slate-500">Qty: {subscription.quantity}</p>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{subscription.shippingFullName}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {subscription.shippingCity}, {subscription.shippingState}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Frequency */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs font-medium">
                          {subscription.frequencyDisplay || getFrequencyBadge(subscription.frequency)}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 text-center">
                        <div>
                          <p className="text-white text-sm font-bold">${subscription.discountedPrice.toFixed(2)}</p>
                          {subscription.discountPercentage > 0 && (
                            <>
                              <p className="text-xs text-slate-500 line-through">${subscription.price.toFixed(2)}</p>
                              <p className="text-xs text-green-400">-{subscription.discountPercentage}% off</p>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Next Delivery */}
                      <td className="py-4 px-4">
                        {subscription.nextDeliveryDate ? (
                          <div>
                            <p className="text-slate-300 text-sm">
                              {new Date(subscription.nextDeliveryDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-500">{subscription.totalDeliveries} deliveries</p>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">-</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">{getStatusBadge(subscription.status)}</td>

                      {/* ✅ ACTIONS - Updated to open confirmation modals */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {subscription.status === 1 && (
                            <>
                              <button
                                onClick={() => setPausingSubscription(subscription)}
                                disabled={actionLoading === subscription.id}
                                className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all disabled:opacity-50"
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSkippingSubscription(subscription)}
                                disabled={actionLoading === subscription.id}
                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50"
                                title="Skip Next"
                              >
                                <SkipForward className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {subscription.status === 2 && (
                            <button
                              onClick={() => setResumingSubscription(subscription)}
                              disabled={actionLoading === subscription.id}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50"
                              title="Resume"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}

                          {(subscription.status === 1 || subscription.status === 2) && (
                            <button
                              onClick={() => setCancellingSubscription(subscription)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Cancel"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setViewingSubscription(subscription)}
                            className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Pagination - Keep existing code */}
        {/* ... */}
      </div>

      {/* ✅ CONFIRMATION MODALS */}
      
      {/* Pause Confirmation Modal */}
      {pausingSubscription && (
        <ConfirmDialog
          isOpen={!!pausingSubscription}
          onClose={() => setPausingSubscription(null)}
          onConfirm={handlePauseConfirm}
          title="Pause Subscription"
          message={`Are you sure you want to pause the subscription for ${pausingSubscription.productName}?`}
          confirmText="Pause"
          confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
          isLoading={actionLoading === pausingSubscription.id}
        />
      )}

      {/* Resume Confirmation Modal */}
      {resumingSubscription && (
        <ConfirmDialog
          isOpen={!!resumingSubscription}
          onClose={() => setResumingSubscription(null)}
          onConfirm={handleResumeConfirm}
          title="Resume Subscription"
          message={`Are you sure you want to resume the subscription for ${resumingSubscription.productName}?`}
          confirmText="Resume"
          confirmButtonClass="bg-green-600 hover:bg-green-700"
          isLoading={actionLoading === resumingSubscription.id}
        />
      )}

      {/* Skip Confirmation Modal */}
      {skippingSubscription && (
        <ConfirmDialog
          isOpen={!!skippingSubscription}
          onClose={() => setSkippingSubscription(null)}
          onConfirm={handleSkipConfirm}
          title="Skip Next Delivery"
          message={`Are you sure you want to skip the next delivery for ${skippingSubscription.productName}?`}
          confirmText="Skip"
          confirmButtonClass="bg-blue-600 hover:bg-blue-700"
          isLoading={actionLoading === skippingSubscription.id}
        />
      )}

      {/* Cancel Subscription Modal - Custom */}
      {cancellingSubscription && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-red-500/20 rounded-3xl max-w-2xl w-full shadow-2xl shadow-red-500/10">
            <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-rose-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Cancel Subscription</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Cancelling {cancellingSubscription.productName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCancellingSubscription(null);
                    setCancelReason("");
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-white font-medium">Are you sure?</p>
                </div>
                <p className="text-slate-300 text-sm">
                  This will cancel the subscription for{" "}
                  <span className="font-medium text-white">{cancellingSubscription.shippingFullName}</span>.
                  This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cancellation Reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setCancellingSubscription(null);
                  setCancelReason("");
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all font-medium text-sm"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={!cancelReason.trim() || actionLoading === cancellingSubscription.id}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all font-medium text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === cancellingSubscription.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Cancel Subscription
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        {/* View Subscription Modal */}
        {viewingSubscription && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
              <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                      Subscription Details
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      View subscription information
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingSubscription(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {/* Product Info */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-violet-400" />
                      Product Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Product</p>
                        <p className="text-white font-medium">
                          {viewingSubscription.productName}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">SKU</p>
                        <p className="text-white">{viewingSubscription.productSku}</p>
                      </div>
                      {viewingSubscription.variantName && (
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Variant</p>
                          <p className="text-white">
                            {viewingSubscription.variantName}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Quantity</p>
                        <p className="text-white">{viewingSubscription.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-cyan-400" />
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Name</p>
                        <p className="text-white">
                          {viewingSubscription.shippingFullName}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">
                          Shipping Address
                        </p>
                        <p className="text-white">
                          {viewingSubscription.shippingFullAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Details */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-400" />
                      Subscription Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Status</p>
                        {getStatusBadge(viewingSubscription.status)}
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Frequency</p>
                        <p className="text-white">
                          {viewingSubscription.frequencyDisplay ||
                            getFrequencyBadge(viewingSubscription.frequency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Start Date</p>
                        <p className="text-white">
                          {new Date(
                            viewingSubscription.startDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      {viewingSubscription.nextDeliveryDate && (
                        <div>
                          <p className="text-slate-400 text-sm mb-1">
                            Next Delivery
                          </p>
                          <p className="text-white">
                            {new Date(
                              viewingSubscription.nextDeliveryDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 text-sm mb-1">
                          Total Deliveries
                        </p>
                        <p className="text-white">
                          {viewingSubscription.totalDeliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">
                          Skipped Deliveries
                        </p>
                        <p className="text-white">
                          {viewingSubscription.skippedDeliveries}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                      Pricing
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">
                          Original Price
                        </p>
                        <p className="text-white">
                          ${viewingSubscription.price.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">
                          Discounted Price
                        </p>
                        <p className="text-green-400 font-bold">
                          ${viewingSubscription.discountedPrice.toFixed(2)}
                        </p>
                      </div>
                      {viewingSubscription.discountPercentage > 0 && (
                        <>
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Discount</p>
                            <p className="text-white">
                              {viewingSubscription.discountPercentage}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-sm mb-1">
                              Total Savings
                            </p>
                            <p className="text-green-400">
                              ${viewingSubscription.totalSavings.toFixed(2)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cancellation Info */}
                  {viewingSubscription.status === 3 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                        <Ban className="h-4 w-4" />
                        Cancellation Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-slate-400 text-sm mb-1">
                            Cancelled At
                          </p>
                          <p className="text-white text-sm">
                            {viewingSubscription.cancelledAt &&
                              new Date(
                                viewingSubscription.cancelledAt
                              ).toLocaleString()}
                          </p>
                        </div>
                        {viewingSubscription.cancellationReason && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Reason</p>
                            <p className="text-white text-sm">
                              {viewingSubscription.cancellationReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Paused Info */}
                  {viewingSubscription.status === 2 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <h3 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        Paused Information
                      </h3>
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Paused At</p>
                        <p className="text-white text-sm">
                          {viewingSubscription.pausedAt &&
                            new Date(
                              viewingSubscription.pausedAt
                            ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-700/50">
                <button
                  onClick={() => setViewingSubscription(null)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  
  );
}
	