"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Eye,
  Search,
  X,
  Calendar,
  ShoppingBag,  
  User,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  AlertCircle,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  FilterX,
  Truck,
  Package,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Crown,
  UserCheck,
  UserX,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Target,
  Award,
  Zap,
  Clock,
  TrendingDown,
  Percent,
  ChevronUp,
  LogIn,
  ShoppingCart,
  UserPlus,
  PoundSterling,
} from "lucide-react";

import { useToast } from "@/app/admin/_components/CustomToast";
import { Customer, CustomerQueryParams, customersService } from "@/lib/services/costomers";

// ✅ Types
type CustomerSegment = "all" | "vip" | "regular" | "new" | "dormant" | "oneTime";
type SortField = "name" | "totalSpent" | "totalOrders" | "joinDate" | "lastLogin";
type SortDirection = "asc" | "desc";
// ✅ STEP 1: Component ke top par ye state add karo (existing states ke saath)


// ✅ Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function CustomersPage() {
  const toast = useToast();

  // ✅ State Management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
// Toggle Analytics State
const [showAnalytics, setShowAnalytics] = useState(false); // Default: collapsed 
  // ✅ Bulk Selection
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
const [customerViewMode, setCustomerViewMode] = useState<"all" | "active" | "inactive">("all");
  // ✅ Advanced Filters
  const [filters, setFilters] = useState({
    status: "all",
    segment: "all" as CustomerSegment,
    minSpent: "",
    maxSpent: "",
    minOrders: "",
    maxOrders: "",
    registrationFrom: "",
    registrationTo: "",
    lastLoginFrom: "",
    lastLoginTo: "",
    gender: "all",
    deliveryMethod: "all",
  });

  // ✅ Sorting
  const [sortField, setSortField] = useState<SortField>("joinDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // ✅ UI States
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const advancedFiltersRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // ✅ Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Customer Segment Logic
  const getCustomerSegment = (customer: Customer): CustomerSegment => {
    const daysSinceLastOrder = customer.orders.length > 0
      ? Math.floor((new Date().getTime() - new Date(customer.orders[0].orderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // VIP: Spent > £5000
    if (customer.totalSpent >= 5000) return "vip";

    // Dormant: No purchase in 90+ days
    if (customer.totalOrders > 0 && daysSinceLastOrder > 90) return "dormant";

    // New: Registered < 30 days
    const daysSinceRegistration = Math.floor((new Date().getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceRegistration < 30) return "new";

    // One-Time: Only 1 order
    if (customer.totalOrders === 1) return "oneTime";

    // Regular: 2+ orders
    if (customer.totalOrders >= 2) return "regular";

    return "regular";
  };

  // ✅ Fetch Customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const params: CustomerQueryParams = {
        page: 1,
        pageSize: 10000, // Get all for client-side filtering
        sortDirection: "desc",
      };

      if (debouncedSearchTerm) {
        params.searchTerm = debouncedSearchTerm;
      }

      const response = await customersService.getAll(params);

      if (response?.data?.success) {
        const fetchedCustomers = response.data.data.items || [];
        setAllCustomers(fetchedCustomers);

        // Apply filters and sorting
        let filteredCustomers = applyFilters(fetchedCustomers);
        filteredCustomers = applySorting(filteredCustomers);

        setTotalCount(filteredCustomers.length);
        
        // Pagination
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);
        setCustomers(paginatedCustomers);
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, filters, sortField, sortDirection]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ✅ Apply Advanced Filters
  const applyFilters = (customersList: Customer[]) => {
    let filtered = [...customersList];

    // Status Filter
    if (filters.status !== "all") {
      const isActive = filters.status === "active";
      filtered = filtered.filter((c) => c.isActive === isActive);
    }

    // Segment Filter
    if (filters.segment !== "all") {
      filtered = filtered.filter((c) => getCustomerSegment(c) === filters.segment);
    }

    // Spending Range
    if (filters.minSpent) {
      filtered = filtered.filter((c) => c.totalSpent >= parseFloat(filters.minSpent));
    }
    if (filters.maxSpent) {
      filtered = filtered.filter((c) => c.totalSpent <= parseFloat(filters.maxSpent));
    }

    // Order Count Range
    if (filters.minOrders) {
      filtered = filtered.filter((c) => c.totalOrders >= parseInt(filters.minOrders));
    }
    if (filters.maxOrders) {
      filtered = filtered.filter((c) => c.totalOrders <= parseInt(filters.maxOrders));
    }

    // Registration Date
    if (filters.registrationFrom) {
      filtered = filtered.filter((c) => new Date(c.createdAt) >= new Date(filters.registrationFrom));
    }
    if (filters.registrationTo) {
      filtered = filtered.filter((c) => new Date(c.createdAt) <= new Date(filters.registrationTo));
    }

    // Last Login Date
    if (filters.lastLoginFrom && filters.lastLoginTo) {
      filtered = filtered.filter((c) => {
        if (!c.lastLoginAt) return false;
        const loginDate = new Date(c.lastLoginAt);
        return loginDate >= new Date(filters.lastLoginFrom) && loginDate <= new Date(filters.lastLoginTo);
      });
    }

    // Gender Filter
    if (filters.gender !== "all") {
      filtered = filtered.filter((c) => c.gender?.toLowerCase() === filters.gender.toLowerCase());
    }

    // Delivery Method Filter
    if (filters.deliveryMethod !== "all") {
      filtered = filtered.filter((c) =>
        c.orders.some((o) => o.deliveryMethod.toLowerCase() === filters.deliveryMethod.toLowerCase())
      );
    }

    return filtered;
  };

  // ✅ Apply Sorting
  const applySorting = (customersList: Customer[]) => {
    const sorted = [...customersList];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "totalSpent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "totalOrders":
          comparison = a.totalOrders - b.totalOrders;
          break;
        case "joinDate":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "lastLogin":
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          comparison = aLogin - bLogin;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  // ✅ Handle Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // ✅ Get Sort Icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-violet-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-violet-400" />
    );
  };

  // ✅ Calculate Advanced Stats
  const calculateStats = () => {
    const total = allCustomers.length;
    const active = allCustomers.filter((c) => c.isActive).length;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonth = allCustomers.filter((c) => new Date(c.createdAt) >= monthStart).length;

    const avgLifetimeValue = total > 0
      ? (allCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / total).toFixed(2)
      : "0.00";

    // Segment counts
    const vip = allCustomers.filter((c) => getCustomerSegment(c) === "vip").length;
    const regular = allCustomers.filter((c) => getCustomerSegment(c) === "regular").length;
    const newCustomers = allCustomers.filter((c) => getCustomerSegment(c) === "new").length;
    const dormant = allCustomers.filter((c) => getCustomerSegment(c) === "dormant").length;
    const oneTime = allCustomers.filter((c) => getCustomerSegment(c) === "oneTime").length;

    // Additional metrics
    const totalRevenue = allCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = allCustomers.reduce((sum, c) => sum + c.totalOrders, 0);
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";

    const repeatCustomers = allCustomers.filter((c) => c.totalOrders > 1).length;
    const repeatRate = total > 0 ? ((repeatCustomers / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      active,
      newThisMonth,
      avgLifetimeValue,
      segments: { vip, regular, new: newCustomers, dormant, oneTime },
      totalRevenue,
      avgOrderValue,
      repeatRate,
    };
  };

  const stats = calculateStats();

  // ✅ Bulk Selection
  const toggleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map((c) => c.id));
    }
  };

  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  // ✅ Export Functions
  const generateCSV = (customersToExport: Customer[]) => {
    const csvHeaders = [
      "Customer Name",
      "Email",
      "Phone",
      "Gender",
      "Total Orders",
      "Total Spent (£)",
      "Avg Order Value (£)",
      "Status",
      "Segment",
      "Registration Date",
      "Last Login",
      "Days Since Last Order",
    ];

    const csvData = customersToExport.map((customer) => {
      const segment = getCustomerSegment(customer);
      const avgOrderValue = customer.totalOrders > 0
        ? (customer.totalSpent / customer.totalOrders).toFixed(2)
        : "0.00";

      const daysSinceLastOrder = customer.orders.length > 0
        ? Math.floor((new Date().getTime() - new Date(customer.orders[0].orderDate).getTime()) / (1000 * 60 * 60 * 24))
        : "N/A";

      return [
        customer.fullName,
        customer.email,
        customer.phoneNumber || "N/A",
        customer.gender || "N/A",
        customer.totalOrders,
        customer.totalSpent.toFixed(2),
        avgOrderValue,
        customer.isActive ? "Active" : "Inactive",
        segment.toUpperCase(),
        formatDate(customer.createdAt),
        customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Never",
        daysSinceLastOrder,
      ];
    });

    const csvContent = [
      csvHeaders.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSelected = () => {
    if (selectedCustomers.length === 0) {
      toast.warning("Please select customers to export");
      return;
    }

    const customersToExport = allCustomers.filter((c) => selectedCustomers.includes(c.id));
    generateCSV(customersToExport);
    toast.success(`${customersToExport.length} customers exported successfully`);
    setSelectedCustomers([]);
    setShowExportMenu(false);
  };

  const handleExportFiltered = () => {
    const filteredCustomers = applyFilters(allCustomers);
    if (filteredCustomers.length === 0) {
      toast.warning("No customers to export");
      return;
    }

    generateCSV(filteredCustomers);
    toast.success(`${filteredCustomers.length} customers exported successfully`);
    setShowExportMenu(false);
  };

  const handleExportAll = () => {
    if (allCustomers.length === 0) {
      toast.warning("No customers to export");
      return;
    }

    generateCSV(allCustomers);
    toast.success(`${allCustomers.length} customers exported successfully`);
    setShowExportMenu(false);
  };

  const handleExportCurrentPage = () => {
    if (customers.length === 0) {
      toast.warning("No customers on current page");
      return;
    }

    generateCSV(customers);
    toast.success(`${customers.length} customers exported successfully`);
    setShowExportMenu(false);
  };

  // ✅ Filter Functions
  const clearFilters = () => {
    setFilters({
      status: "all",
      segment: "all",
      minSpent: "",
      maxSpent: "",
      minOrders: "",
      maxOrders: "",
      registrationFrom: "",
      registrationTo: "",
      lastLoginFrom: "",
      lastLoginTo: "",
      gender: "all",
      deliveryMethod: "all",
    });
    setCustomerViewMode("all"); // ✅ Add this line
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.segment !== "all" ||
    filters.minSpent ||
    filters.maxSpent ||
    filters.minOrders ||
    filters.maxOrders ||
    filters.registrationFrom ||
    filters.registrationTo ||
    filters.lastLoginFrom ||
    filters.lastLoginTo ||
    filters.gender !== "all" ||
    filters.deliveryMethod !== "all" ||
    searchTerm.trim();

  // ✅ Pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

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

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  // ✅ Format Functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRelativeDate = (date?: string) => {
    if (!date) return "Never";

    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  };

  const formatExactDate = (date?: string) => {
    if (!date) return "No login activity";

    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // ✅ Get Segment Badge
  const getSegmentBadge = (segment: CustomerSegment) => {
    const badges = {
      vip: {
        label: "VIP",
        icon: Crown,
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
      },
      regular: {
        label: "Regular",
        icon: UserCheck,
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
      },
      new: {
        label: "New",
        icon: Zap,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
      },
      dormant: {
        label: "Dormant",
        icon: Clock,
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
      },
      oneTime: {
        label: "One-Time",
        icon: Target,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
      },
      all: {
        label: "All",
        icon: Users,
        color: "text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
      },
    };

    const badge = badges[segment];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${badge.bg} ${badge.color} border ${badge.border}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean, totalOrders: number) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          Inactive
        </span>
      );
    }
    if (totalOrders === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          New
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
        Active
      </span>
    );
  };

  // Continue in next file...
  // ✅ Modal Functions
  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getFilteredOrders = () => {
    if (!selectedCustomer) return [];
    
    if (filters.deliveryMethod === "all") {
      return selectedCustomer.orders;
    }
    
    return selectedCustomer.orders.filter(order => 
      order.deliveryMethod.toLowerCase() === filters.deliveryMethod.toLowerCase()
    );
  };

  const getDeliveryMethods = () => {
    if (!selectedCustomer) return [];
    const methods = new Set(selectedCustomer.orders.map(order => order.deliveryMethod));
    return Array.from(methods);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
{/* ✅ Header with Buttons */}
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
      Customer Management
    </h1>
    <p className="text-slate-400 mt-0.5">Manage and analyze your customer base</p>
  </div>

  {/* Button Group: Analytics Toggle + Export */}
  <div className="flex items-center gap-2">
    
    {/* Analytics Toggle Button */}
    <button
      onClick={() => setShowAnalytics(!showAnalytics)}
      title={showAnalytics ? "Hide customer segments" : "Show customer segments"}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold shadow-lg transition-all border-2 ${
        showAnalytics
          ? "bg-violet-500/20 border-violet-500/50 text-violet-300 hover:bg-violet-500/30 hover:border-violet-400"
          : "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-violet-500/50 hover:text-white"
      }`}
    >
      {showAnalytics ? (
        <>
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm">Hide Segments</span>
          <ChevronUp className="h-3.5 w-3.5" />
        </>
      ) : (
        <>
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">Show Segments</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </>
      )}
    </button>

    {/* Export to Excel Button */}
    <div className="relative" ref={exportMenuRef}>
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        title="Export customers to Excel in various formats"
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-green-500/50 transition-all"
      >
        <Download className="h-4 w-4" />
        <span className="text-sm">Export to Excel</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
      </button>

      {/* Export Menu */}
      {showExportMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
            {selectedCustomers.length > 0 && (
              <button
                onClick={handleExportSelected}
                className="w-full px-3 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2.5 border-b border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Export Selected</p>
                  <p className="text-xs text-slate-400">{selectedCustomers.length} customers</p>
                </div>
              </button>
            )}
            
            <button
              onClick={handleExportCurrentPage}
              className="w-full px-3 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2.5 border-b border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-violet-400" />
              <div>
                <p className="text-sm font-medium">Export Current Page</p>
                <p className="text-xs text-slate-400">{customers.length} customers</p>
              </div>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleExportFiltered}
                className="w-full px-3 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2.5 border-b border-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium">Export Filtered Results</p>
                  <p className="text-xs text-slate-400">{totalCount} customers</p>
                </div>
              </button>
            )}

            <button
              onClick={handleExportAll}
              className="w-full px-3 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-sm font-medium">Export All Customers</p>
                <p className="text-xs text-slate-400">{allCustomers.length} customers</p>
              </div>
            </button>
          </div>
        </>
      )}  
    </div>
  </div>
</div>

{/* ✅ ALWAYS VISIBLE: Top 4 Stats Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
  
  {/* 1. Total Revenue */}
  <div 
    className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-3 hover:border-green-500/50 transition-all"
    title="Total revenue generated from all customers"
  >
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
        <TrendingUp className="h-5 w-5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs font-medium">Total Revenue</p>
        <p className="text-white text-xl font-bold truncate">{formatCurrency(stats.totalRevenue)}</p>
      </div>
    </div>
  </div>

  {/* 2. Avg Order Value */}
  <div 
    className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-3 hover:border-blue-500/50 transition-all"
    title="Average value per order across all customers"
  >
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
        <ShoppingBag className="h-5 w-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs font-medium">Avg. Order Value</p>
        <p className="text-white text-xl font-bold truncate">£{stats.avgOrderValue}</p>
      </div>
    </div>
  </div>

{/* 3. Total Customers - DYNAMIC BUTTON */}
<button
  onClick={() => {
    // Cycle through: all → active → inactive → all
    if (customerViewMode === "all") {
      setCustomerViewMode("active");
      setFilters({ ...filters, status: "active" });
      setCurrentPage(1);
      // toast.success(`Showing ${stats.active} active customers`);
    } else if (customerViewMode === "active") {
      setCustomerViewMode("inactive");
      setFilters({ ...filters, status: "inactive" });
      setCurrentPage(1);
      // toast.info(`Showing ${stats.total - stats.active} inactive customers`);
    } else {
      setCustomerViewMode("all");
      setFilters({ ...filters, status: "all" });
      setCurrentPage(1);
      // toast.info("Showing all customers");
    }
  }}
  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 hover:border-violet-500/50 transition-all text-left w-full hover:scale-105 active:scale-95 cursor-pointer group"
  title={
    customerViewMode === "all"
      ? "Click to show active customers only"
      : customerViewMode === "active"
      ? "Click to show inactive customers only"
      : "Click to show all customers"
  }
>
  <div className="flex items-center gap-2.5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all ${
      customerViewMode === "all"
        ? "bg-violet-500/10 group-hover:bg-violet-500/20"
        : customerViewMode === "active"
        ? "bg-green-500/20 group-hover:bg-green-500/30"
        : "bg-red-500/20 group-hover:bg-red-500/30"
    }`}>
      {customerViewMode === "all" ? (
        <Users className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
      ) : customerViewMode === "active" ? (
        <UserCheck className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" />
      ) : (
        <UserX className="h-5 w-5 text-red-400 group-hover:scale-110 transition-transform" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={`text-xs font-medium transition-colors ${
          customerViewMode === "all"
            ? "text-slate-400 group-hover:text-violet-300"
            : customerViewMode === "active"
            ? "text-slate-400 group-hover:text-green-300"
            : "text-slate-400 group-hover:text-red-300"
        }`}>
          {customerViewMode === "all"
            ? "Total Customers"
            : customerViewMode === "active"
            ? "Active Customers"
            : "Inactive Customers"}
        </p>
        {customerViewMode !== "all" && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
            customerViewMode === "active"
              ? "bg-green-500/10 border-green-500/50 text-green-300"
              : "bg-red-500/10 border-red-500/50 text-red-300"
          }`}>
            FILTERED
          </span>
        )}
      </div>
      <p className="text-white text-xl font-bold">
        {customerViewMode === "all"
          ? stats.total
          : customerViewMode === "active"
          ? stats.active
          : stats.total - stats.active}
      </p>
      <p className={`text-[10px] mt-0.5 transition-all opacity-0 group-hover:opacity-100 ${
        customerViewMode === "all"
          ? "text-slate-500 group-hover:text-violet-400"
          : customerViewMode === "active"
          ? "text-slate-500 group-hover:text-green-400"
          : "text-slate-500 group-hover:text-red-400"
      }`}>
        {customerViewMode === "all"
          ? "Click to show Active"
          : customerViewMode === "active"
          ? "Click to show Inactive"
          : "Click to show All"}
      </p>
    </div>
  </div>
</button>


  {/* 4. New This Month */}
 <button
    onClick={() => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setFilters({
        ...filters,
        registrationFrom: formatDateForInput(monthStart),
        registrationTo: formatDateForInput(monthEnd),
      });
      setCurrentPage(1);
    }}
    className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-xl p-3 hover:border-violet-500/50 transition-all text-left w-full  active:scale-95 cursor-pointer group"
    title="Click to filter customers registered this month"
  >
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/30 transition-all">
        <Activity className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs font-medium group-hover:text-violet-300 transition-colors">
          New Customer 
        </p>
        <p className="text-white text-xl font-bold">{stats.newThisMonth}</p>
      
      </div>
    </div>
  </button>
</div>

{/* ✅ TOGGLE SECTION: Customer Segments (5 Cards) */}
{showAnalytics && (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2 animate-in slide-in-from-top-4 duration-300">
    
    {/* Section Header with Close Button */}
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">
        <Award className="h-4 w-4 text-violet-400" />
        Customer Segments
      </h3>
      
      {/* Close Button */}
      <button
        onClick={() => setShowAnalytics(false)}
        title="Hide customer segments"
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all group"
      >
        <ChevronUp className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
      </button>
    </div>

    {/* 5 Segment Cards */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      
      {/* VIP Segment */}
      <button
        onClick={() => setFilters({ ...filters, segment: "vip" })}
        title="Filter VIP customers who spent £5,000 or more"
        className={`p-2.5 rounded-lg border transition-all text-left ${
          filters.segment === "vip"
            ? "bg-yellow-500/10 border-yellow-500/50 ring-2 ring-yellow-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-yellow-500/50"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Crown className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-xs font-semibold">VIP</span>
        </div>
        <p className="text-white text-lg font-bold">{stats.segments.vip}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">Spent £5,000+</p>
      </button>

      {/* Regular Segment */}
      <button
        onClick={() => setFilters({ ...filters, segment: "regular" })}
        title="Filter regular customers with 2 or more orders"
        className={`p-2.5 rounded-lg border transition-all text-left ${
          filters.segment === "regular"
            ? "bg-green-500/10 border-green-500/50 ring-2 ring-green-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-green-500/50"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <UserCheck className="h-3.5 w-3.5 text-green-400" />
          <span className="text-green-400 text-xs font-semibold">Regular</span>
        </div>
        <p className="text-white text-lg font-bold">{stats.segments.regular}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">2+ orders</p>
      </button>

      {/* New Segment */}
      <button
        onClick={() => setFilters({ ...filters, segment: "new" })}
        title="Filter new customers registered in last 30 days"
        className={`p-2.5 rounded-lg border transition-all text-left ${
          filters.segment === "new"
            ? "bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-cyan-500/50"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-cyan-400 text-xs font-semibold">New</span>
        </div>
        <p className="text-white text-lg font-bold">{stats.segments.new}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">Last 30 days</p>
      </button>

      {/* Dormant Segment */}
      <button
        onClick={() => setFilters({ ...filters, segment: "dormant" })}
        title="Filter dormant customers with no orders in 90+ days"
        className={`p-2.5 rounded-lg border transition-all text-left ${
          filters.segment === "dormant"
            ? "bg-orange-500/10 border-orange-500/50 ring-2 ring-orange-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-orange-500/50"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-orange-400 text-xs font-semibold">Dormant</span>
        </div>
        <p className="text-white text-lg font-bold">{stats.segments.dormant}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">90+ days inactive</p>
      </button>

      {/* One-Time Segment */}
      <button
        onClick={() => setFilters({ ...filters, segment: "oneTime" })}
        title="Filter one-time customers with only 1 order"
        className={`p-2.5 rounded-lg border transition-all text-left ${
          filters.segment === "oneTime"
            ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30"
            : "bg-slate-800/50 border-slate-700 hover:border-purple-500/50"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Target className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-purple-400 text-xs font-semibold">One-Time</span>
        </div>
        <p className="text-white text-lg font-bold">{stats.segments.oneTime}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">Only 1 order</p>
      </button>
    </div>
  </div>
)}

{/* ✅ Items Per Page - COMPACT */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2.5">
  <div className="flex flex-wrap items-center justify-between gap-2.5">
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-slate-400">Show</span>
      <select
        value={pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setCurrentPage(1);
        }}
        className="px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={75}>75</option>
        <option value={100}>100</option>
      </select>
      <span className="text-xs text-slate-400">entries per page</span>
    </div>

    <div className="text-xs text-slate-400">
      Showing <span className="text-white font-semibold">{startIndex + 1}</span> to <span className="text-white font-semibold">{endIndex}</span> of <span className="text-white font-semibold">{totalCount}</span> entries
    </div>
  </div>
</div>

{/* ✅ Search and Basic Filters - COMPACT */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2.5">
  <div className="flex flex-wrap items-center gap-2">
    
    {/* Search */}
    <div className="relative flex-1 min-w-[280px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      <input
        type="search"
        placeholder="Search by name, email, or phone..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>

    {/* Status Filter */}
    <select
      value={filters.status}
      onChange={(e) => {
        setFilters({ ...filters, status: e.target.value });
        setCurrentPage(1);
      }}
      className={`px-3 py-2 bg-slate-800/90 border rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
        filters.status !== "all"
          ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
          : "border-slate-600"
      }`}
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>

    {/* Gender Filter */}
    <select
      value={filters.gender}
      onChange={(e) => {
        setFilters({ ...filters, gender: e.target.value });
        setCurrentPage(1);
      }}
      className={`px-3 py-2 bg-slate-800/90 border rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
        filters.gender !== "all"
          ? "border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/50"
          : "border-slate-600"
      }`}
    >
      <option value="all">All Gender</option>
      <option value="male">Male</option>
      <option value="female">Female</option>
      <option value="other">Other</option>
    </select>

    {/* Delivery Method Filter */}
    <select
      value={filters.deliveryMethod}
      onChange={(e) => {
        setFilters({ ...filters, deliveryMethod: e.target.value });
        setCurrentPage(1);
      }}
      className={`px-3 py-2 bg-slate-800/90 border rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
        filters.deliveryMethod !== "all"
          ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50"
          : "border-slate-600"
      }`}
    >
      <option value="all">All Delivery</option>
      <option value="homedelivery">Home Delivery</option>
      <option value="clickandcollect">Click & Collect</option>
    </select>

    {/* Advanced Filters Toggle */}
    <button
      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
      className={`px-3 py-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5 ${
        showAdvancedFilters
          ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
          : "bg-slate-800/50 border-slate-600 text-slate-400 hover:text-white hover:border-violet-500/50"
      }`}
    >
      <Filter className="h-3.5 w-3.5" />
      Advanced
      <ChevronDown className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
    </button>

    {hasActiveFilters && (
      <button
        onClick={clearFilters}
        className="px-3 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs font-semibold flex items-center gap-1.5"
      >
        <FilterX className="h-3.5 w-3.5" />
        Clear All
      </button>
    )}
  </div>

  {/* ✅ Advanced Filters Panel - COMPACT */}
  {showAdvancedFilters && (
    <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      
      {/* Spending Range */}
      <div>
        <label className="block text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Spending Range (£)</label>
        <div className="flex gap-1.5">
          <input
            type="number"
            placeholder="Min"
            value={filters.minSpent}
            onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxSpent}
            onChange={(e) => setFilters({ ...filters, maxSpent: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Order Count Range */}
      <div>
        <label className="block text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Order Count Range</label>
        <div className="flex gap-1.5">
          <input
            type="number"
            placeholder="Min"
            value={filters.minOrders}
            onChange={(e) => setFilters({ ...filters, minOrders: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxOrders}
            onChange={(e) => setFilters({ ...filters, maxOrders: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Registration Date */}
      <div>
        <label className="block text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Registration Date</label>
        <div className="flex gap-1.5">
          <input
            type="date"
            value={filters.registrationFrom}
            onChange={(e) => setFilters({ ...filters, registrationFrom: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="date"
            value={filters.registrationTo}
            onChange={(e) => setFilters({ ...filters, registrationTo: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            min={filters.registrationFrom}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Last Login Date */}
      <div>
        <label className="block text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Last Login Date</label>
        <div className="flex gap-1.5">
          <input
            type="date"
            value={filters.lastLoginFrom}
            onChange={(e) => setFilters({ ...filters, lastLoginFrom: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="date"
            value={filters.lastLoginTo}
            onChange={(e) => setFilters({ ...filters, lastLoginTo: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            min={filters.lastLoginFrom}
            className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
    </div>
  )}

</div>


{/* ✅ Customers Table with Sorting - COMPACT VERSION */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
  {customers.length === 0 ? (
    <div className="text-center py-10">
      <AlertCircle className="h-14 w-14 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400 text-lg">No customers found</p>
      <p className="text-slate-500 text-sm">Try adjusting your filters</p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-800/50 sticky top-0 z-10">
          <tr className="border-b border-slate-700">
            {/* Bulk Select */}
            <th className="py-2 px-3">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={toggleSelectAll}
                className="rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 cursor-pointer"
              />
            </th>

            {/* Customer Name - Sortable */}
            <th className="text-left py-2 px-3 text-slate-400 font-medium text-sm">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                Customer
                {getSortIcon("name")}
              </button>
            </th>

            {/* Orders - Sortable */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              <button
                onClick={() => handleSort("totalOrders")}
                className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto"
              >
                Orders
                {getSortIcon("totalOrders")}
              </button>
            </th>

            {/* Total Spent - Sortable */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              <button
                onClick={() => handleSort("totalSpent")}
                className="flex items-center gap-1.5 hover:text-white transition-colors mx-auto"
              >
                Total Spent
                {getSortIcon("totalSpent")}
              </button>
            </th>

            {/* Avg Order Value */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              Avg Order Value
            </th>

            {/* Segment */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              Segment
            </th>

            {/* Status */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              Status
            </th>

            {/* Last Login - Sortable */}
            <th className="text-left py-2 px-3 text-slate-400 font-medium text-sm">
              <button
                onClick={() => handleSort("lastLogin")}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                Last Login
                {getSortIcon("lastLogin")}
              </button>
            </th>

            {/* Actions */}
            <th className="text-center py-2 px-3 text-slate-400 font-medium text-sm">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => {
            const segment = getCustomerSegment(customer);
            const avgOrderValue = customer.totalOrders > 0
              ? (customer.totalSpent / customer.totalOrders).toFixed(2)
              : "0.00";

            return (
              <tr
                key={customer.id}
                className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group"
              >
                {/* Checkbox */}
                <td className="py-2.5 px-3">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => toggleSelectCustomer(customer.id)}
                    className="rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 cursor-pointer"
                  />
                </td>

                {/* Customer */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {getInitials(customer.firstName, customer.lastName)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium text-white truncate text-sm">
                        {customer.fullName}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <p className="text-xs text-slate-400 truncate">
                          {customer.email}
                        </p>
                      </div>

                      {customer.phoneNumber && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <p className="text-xs text-slate-400">
                            {customer.phoneNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Orders */}
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                    {customer.totalOrders}
                  </span>
                </td>

                {/* Total Spent */}
                <td className="py-2.5 px-3 text-center">
                  <span className="font-semibold text-green-400 text-sm">
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </td>

                {/* Avg Order Value */}
                <td className="py-2.5 px-3 text-center">
                  <span className="text-white font-medium text-sm">
                    £{avgOrderValue}
                  </span>
                </td>

                {/* Segment */}
                <td className="py-2.5 px-3 text-center">
                  {getSegmentBadge(segment)}
                </td>

                {/* Status */}
                <td className="py-2.5 px-3 text-center">
                  {getStatusBadge(customer.isActive, customer.totalOrders)}
                </td>

                {/* Last Login */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-500 group-hover:text-violet-400 transition-colors" />
                    <span
                      className="text-sm text-slate-300 group-hover:text-white transition-colors cursor-help"
                      title={formatExactDate(customer.lastLoginAt)}
                    >
                      {formatRelativeDate(customer.lastLoginAt)}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsModalOpen(true);
                        setExpandedOrderId(null);
                      }}
                      className="p-1.5 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 rounded-lg transition-all"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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


      {/* ✅ Pagination */}
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
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Page"
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
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm text-slate-400">
              Total: {totalCount} items
            </div>
          </div>
        </div>
      )}

{/* ✅ Customer Details Modal */}
{isModalOpen && selectedCustomer && (
  
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-[80vw] w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">
      
      {/* Modal Header */}
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
              {getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{selectedCustomer.fullName}</h2>
                {getSegmentBadge(getCustomerSegment(selectedCustomer))}
              </div>
              <p className="text-slate-400 text-sm mt-0.5">{selectedCustomer.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setSelectedCustomer(null);
              setExpandedOrderId(null);
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal Content */}
      <div className="overflow-y-auto p-4 space-y-4">
        
        {/* ✅ Customer Metrics Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-white">{selectedCustomer.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <PoundSterling className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Total Spent</p>
                <p className="text-xl font-bold text-white">{formatCurrency(selectedCustomer.totalSpent)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Avg Order Value</p>
                <p className="text-xl font-bold text-white">
                  £{selectedCustomer.totalOrders > 0 
                    ? (selectedCustomer.totalSpent / selectedCustomer.totalOrders).toFixed(2)
                    : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Status</p>
                <p className="text-lg font-bold text-white capitalize">
                  {selectedCustomer.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ HORIZONTAL TIMELINE - NEW VERSION */}
        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Customer Timeline
          </h3>
          
          {/* Horizontal Timeline Container */}
          <div className="relative">
            {/* Timeline Line (Connecting Line) */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-green-500 to-yellow-500"></div>
            
            {/* Timeline Nodes */}
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Node 1: Registered */}
              <div className="relative">
                <div className="relative z-10 flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform">
                    <UserPlus className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-500/30 hover:border-cyan-500/60 transition-all">
                  <p className="text-sm text-cyan-400 font-semibold mb-1">Registered</p>
                  <p className="text-xs text-white font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {Math.floor((new Date().getTime() - new Date(selectedCustomer.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                  </p>
                </div>
              </div>

              {/* Node 2: First Order */}
              <div className="relative">
                <div className="relative z-10 flex justify-center mb-3">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform ${
                    selectedCustomer.orders.length > 0
                      ? "bg-green-500/20 border-green-500"
                      : "bg-slate-700/20 border-slate-600"
                  }`}>
                    <ShoppingCart className={`h-5 w-5 ${
                      selectedCustomer.orders.length > 0 ? "text-green-400" : "text-slate-500"
                    }`} />
                  </div>
                </div>
                <div className={`bg-slate-900/50 rounded-lg p-3 border hover:border-green-500/60 transition-all ${
                  selectedCustomer.orders.length > 0
                    ? "border-green-500/30"
                    : "border-slate-700/30"
                }`}>
                  <p className={`text-sm font-semibold mb-1 ${
                    selectedCustomer.orders.length > 0 ? "text-green-400" : "text-slate-500"
                  }`}>
                    First Order
                  </p>
                  {selectedCustomer.orders.length > 0 ? (
                    <>
                      <p className="text-xs text-white font-medium">
                        {formatDate(selectedCustomer.orders[selectedCustomer.orders.length - 1].orderDate)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {selectedCustomer.orders[selectedCustomer.orders.length - 1].orderNumber}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">No orders yet</p>
                  )}
                </div>
              </div>

              {/* Node 3: Latest Order */}
              <div className="relative">
                <div className="relative z-10 flex justify-center mb-3">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform ${
                    selectedCustomer.orders.length > 0
                      ? "bg-violet-500/20 border-violet-500"
                      : "bg-slate-700/20 border-slate-600"
                  }`}>
                    <Package className={`h-5 w-5 ${
                      selectedCustomer.orders.length > 0 ? "text-violet-400" : "text-slate-500"
                    }`} />
                  </div>
                </div>
                <div className={`bg-slate-900/50 rounded-lg p-3 border hover:border-violet-500/60 transition-all ${
                  selectedCustomer.orders.length > 0
                    ? "border-violet-500/30"
                    : "border-slate-700/30"
                }`}>
                  <p className={`text-sm font-semibold mb-1 ${
                    selectedCustomer.orders.length > 0 ? "text-violet-400" : "text-slate-500"
                  }`}>
                    Latest Order
                  </p>
                  {selectedCustomer.orders.length > 0 ? (
                    <>
                      <p className="text-xs text-white font-medium">
                        {formatDate(selectedCustomer.orders[0].orderDate)}
                      </p>
                      <p className="text-xs text-cyan-400 font-semibold mt-1">
                        {formatCurrency(selectedCustomer.orders[0].totalAmount)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">No orders yet</p>
                  )}
                </div>
              </div>

              {/* Node 4: Last Login */}
              <div className="relative">
                <div className="relative z-10 flex justify-center mb-3">
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform ${
                    selectedCustomer.lastLoginAt
                      ? "bg-yellow-500/20 border-yellow-500"
                      : "bg-slate-700/20 border-slate-600"
                  }`}>
                    <LogIn className={`h-5 w-5 ${
                      selectedCustomer.lastLoginAt ? "text-yellow-400" : "text-slate-500"
                    }`} />
                  </div>
                </div>
                <div className={`bg-slate-900/50 rounded-lg p-3 border hover:border-yellow-500/60 transition-all ${
                  selectedCustomer.lastLoginAt
                    ? "border-yellow-500/30"
                    : "border-slate-700/30"
                }`}>
                  <p className={`text-sm font-semibold mb-1 ${
                    selectedCustomer.lastLoginAt ? "text-yellow-400" : "text-slate-500"
                  }`}>
                    Last Login
                  </p>
                  {selectedCustomer.lastLoginAt ? (
                    <>
                      <p className="text-xs text-white font-medium">
                        {formatExactDate(selectedCustomer.lastLoginAt)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatRelativeDate(selectedCustomer.lastLoginAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Never logged in</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner - Dormant Customer */}
          {selectedCustomer.orders.length > 0 && (() => {
            const daysSinceLastOrder = Math.floor(
              (new Date().getTime() - new Date(selectedCustomer.orders[0].orderDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSinceLastOrder > 90 ? (
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-orange-400 font-semibold">⚠️ Dormant Customer Alert</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    No orders in <span className="font-semibold text-white">{daysSinceLastOrder} days</span> • Consider sending a re-engagement campaign
                  </p>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* ✅ Personal Information */}
        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-violet-400" />
            Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-slate-400 min-w-[80px]">Email:</span>
              <span className="text-white font-medium truncate">{selectedCustomer.email}</span>
            </div>

            {selectedCustomer.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-slate-400 min-w-[80px]">Phone:</span>
                <span className="text-white font-medium">{selectedCustomer.phoneNumber}</span>
              </div>
            )}

            {selectedCustomer.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-slate-400 min-w-[80px]">DOB:</span>
                <span className="text-white font-medium">{formatDate(selectedCustomer.dateOfBirth)}</span>
              </div>
            )}

            {selectedCustomer.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-slate-400 min-w-[80px]">Gender:</span>
                <span className="text-white font-medium capitalize">{selectedCustomer.gender}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-slate-400 min-w-[80px]">Joined:</span>
              <span className="text-white font-medium">{formatDate(selectedCustomer.createdAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-400 shrink-0" />
              <span className="text-slate-400 min-w-[80px]">Last Active:</span>
              <span className="text-white font-medium">
                {selectedCustomer.lastLoginAt ? formatRelativeDate(selectedCustomer.lastLoginAt) : "Never"}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ Saved Addresses */}
        {selectedCustomer.addresses.length > 0 && (
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pink-400" />
              Saved Addresses ({selectedCustomer.addresses.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedCustomer.addresses.map((address, index) => (
                <div key={index} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-white">
                        {address.firstName} {address.lastName}
                      </p>
                      {address.company && (
                        <p className="text-xs text-slate-400 mt-0.5">{address.company}</p>
                      )}
                      <p className="text-xs text-slate-300 mt-1">{address.addressLine1}</p>
                      {address.addressLine2 && (
                        <p className="text-xs text-slate-300">{address.addressLine2}</p>
                      )}
                      <p className="text-xs text-slate-300">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-xs text-slate-300">{address.country}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ Order History */}
        {selectedCustomer.orders.length > 0 && (
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-green-400" />
                Order History ({selectedCustomer.orders.length})
              </h3>

              {/* Delivery Method Filter in Modal */}
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <select
                  value={filters.deliveryMethod}
                  onChange={(e) => setFilters({ ...filters, deliveryMethod: e.target.value })}
                  className={`px-3 py-1.5 bg-slate-900/90 border rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    filters.deliveryMethod !== "all"
                      ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50"
                      : "border-slate-600"
                  }`}
                >
                  <option value="all">All Delivery Methods</option>
                  {getDeliveryMethods().map((method) => (
                    <option key={method} value={method.toLowerCase()}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {getFilteredOrders().map((order) => (
                <div key={order.id} className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  {/* Order Header */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{order.orderNumber}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Truck className="h-3 w-3" />
                            {order.deliveryMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(order.orderDate)} • {order.itemsCount} items
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-cyan-400 text-lg">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              order.status === "Delivered"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : order.status === "Pending"
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleOrderDetails(order.id)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="Toggle Details"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedOrderId === order.id ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {expandedOrderId === order.id && (
                    <div className="border-t border-slate-700/50 p-4 bg-slate-900/80">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Order Summary */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <PoundSterling className="h-4 w-4 text-green-400" />
                            <p className="text-xs text-slate-300 font-semibold">Order Summary</p>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Subtotal:</span>
                              <span className="text-white font-medium">
                                {formatCurrency(order.subtotalAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tax:</span>
                              <span className="text-white font-medium">
                                {formatCurrency(order.taxAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Shipping:</span>
                              <span className="text-white font-medium">
                                {formatCurrency(order.shippingAmount)}
                              </span>
                            </div>
                            {order.discountAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Discount:</span>
                                <span className="text-green-400 font-medium">
                                  -{formatCurrency(order.discountAmount)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 mt-2 border-t border-slate-700">
                              <span className="text-white font-semibold">Total:</span>
                              <span className="text-cyan-400 font-bold">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </div>
                            {order.notes && (
                              <div className="mt-3 pt-2 border-t border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Notes:</p>
                                <p className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded">
                                  {order.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Billing Address */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-pink-400" />
                            <p className="text-xs text-slate-300 font-semibold">Billing Address</p>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="font-medium text-white">
                              {order.billingAddress.firstName} {order.billingAddress.lastName}
                            </p>
                            {order.billingAddress.company && (
                              <p className="text-slate-400">{order.billingAddress.company}</p>
                            )}
                            <p className="text-slate-300 mt-2">{order.billingAddress.addressLine1}</p>
                            {order.billingAddress.addressLine2 && (
                              <p className="text-slate-300">{order.billingAddress.addressLine2}</p>
                            )}
                            <p className="text-slate-300">
                              {order.billingAddress.city}, {order.billingAddress.state}
                            </p>
                            <p className="text-slate-300">
                              {order.billingAddress.postalCode}, {order.billingAddress.country}
                            </p>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-cyan-400" />
                            <p className="text-xs text-slate-300 font-semibold">Shipping Address</p>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="font-medium text-white">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                            </p>
                            {order.shippingAddress.company && (
                              <p className="text-slate-400">{order.shippingAddress.company}</p>
                            )}
                            <p className="text-slate-300 mt-2">{order.shippingAddress.addressLine1}</p>
                            {order.shippingAddress.addressLine2 && (
                              <p className="text-slate-300">{order.shippingAddress.addressLine2}</p>
                            )}
                            <p className="text-slate-300">
                              {order.shippingAddress.city}, {order.shippingAddress.state}
                            </p>
                            <p className="text-slate-300">
                              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {getFilteredOrders().length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No orders found for selected delivery method</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
}

