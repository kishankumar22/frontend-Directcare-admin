"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ShoppingCart, Package, Clock, CheckCircle, TrendingUp, Eye, Download, Search, User, Mail, Calendar, MapPin, Phone, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Tag, FileSpreadsheet, ChevronDown, PoundSterling, Filter, FilterX } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { Order, ordersService } from "@/lib/services/orders";

interface Address {
  firstName: string;
  lastName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string | null;
}

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({ startDate: "", endDate: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrders = async (page: number = 1, pageSize: number = 25) => {
    try {
      setLoading(true);
      const response = await ordersService.getAll(page, pageSize);
      const result = response.data ?? { data: { items: [], totalCount: 0, totalPages: 0 } };
      setOrders(result.data?.items || []);
      setTotalCount(result.data?.totalCount || 0);
      setTotalPages(result.data?.totalPages || 0);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  const getStatusLabel = (status: number): string => {
    const statusMap: { [key: number]: string } = { 1: "Pending", 2: "Processing", 3: "Shipped", 4: "Delivered", 5: "Cancelled" };
    return statusMap[status] || "Unknown";
  };

  const getStatusColor = (status: number): string => {
    const statusColors: { [key: number]: string } = {
      1: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      2: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      3: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      4: "bg-green-500/10 text-green-400 border border-green-500/20",
      5: "bg-red-500/10 text-red-400 border border-red-500/20",
    };
    return statusColors[status] || "bg-slate-500/10 text-slate-400 border border-slate-500/20";
  };

  const getDateRangeLabel = () => {
    if (!dateRange.startDate && !dateRange.endDate) return "Select Date Range";
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };
    if (dateRange.startDate && dateRange.endDate) return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    else if (dateRange.startDate) return `From ${formatDate(dateRange.startDate)}`;
    else if (dateRange.endDate) return `Until ${formatDate(dateRange.endDate)}`;
    return "Select Date Range";
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status.toString() === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === "all" || (paymentStatusFilter === "paid" && order.payments.length > 0) || (paymentStatusFilter === "unpaid" && order.payments.length === 0);
      
      let matchesDateRange = true;
      if (dateRange.startDate || dateRange.endDate) {
        const orderDate = new Date(order.orderDate);
        const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        if (start && end) matchesDateRange = orderDate >= start && orderDate <= end;
        else if (start) matchesDateRange = orderDate >= start;
        else if (end) matchesDateRange = orderDate <= end;
      }
      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDateRange;
    });
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, dateRange]);

  const pendingCount = orders.filter((o) => o.status === 1).length;
  const processingCount = orders.filter((o) => o.status === 2).length;
  const completedCount = orders.filter((o) => o.status === 4).length;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return `£${amount.toFixed(2)}`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateRange({ startDate: "", endDate: "" });
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all" || dateRange.startDate || dateRange.endDate;

  const handleExport = async (exportAll: boolean = false) => {
    try {
      let ordersToExport: Order[] = [];
      if (exportAll) {
        setLoading(true);
        const response = await ordersService.getAll(1, 10000);
        ordersToExport = response.data?.data?.items || [];
        setLoading(false);
      } else {
        ordersToExport = filteredOrders;
      }
      if (ordersToExport.length === 0) {
        toast.warning("⚠️ No orders to export");
        return;
      }
      const csvHeaders = ["Order Number", "Customer Name", "Email", "Phone", "Items", "Subtotal", "Tax", "Shipping", "Discount", "Total", "Status", "Order Date"];
      const csvData = ordersToExport.map((order) => [order.orderNumber, order.customerName, order.customerEmail, `'${order.customerPhone}`, order.orderItems.length, order.subtotalAmount, order.taxAmount, order.shippingAmount, order.discountAmount, order.totalAmount, getStatusLabel(order.status), formatDate(order.orderDate)]);
      const csvContent = [csvHeaders.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const exportType = exportAll ? "all" : "filtered";
      link.download = `orders_${exportType}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`📥 ${ordersToExport.length} order${ordersToExport.length > 1 ? "s" : ""} exported successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export orders");
      setLoading(false);
    }
  };

  const goToPage = useCallback((page: number) => { setCurrentPage(Math.max(1, Math.min(page, totalPages))); }, [totalPages]);
  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setCurrentPage((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage((prev) => Math.min(totalPages, prev + 1)), [totalPages]);
  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => { setItemsPerPage(newItemsPerPage); setCurrentPage(1); }, []);

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    if (endPage - startPage < maxVisiblePages - 1) {
      if (startPage === 1) endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      else startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Order Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and track customer orders</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-medium text-sm">
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-20 overflow-hidden">
                <button onClick={() => { handleExport(false); setShowExportMenu(false); }} disabled={filteredOrders.length === 0} className="w-full px-4 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Export Filtered</p>
                    <p className="text-xs text-slate-400">{filteredOrders.length} orders</p>
                  </div>
                </button>
                <button onClick={() => { handleExport(true); setShowExportMenu(false); }} disabled={totalCount === 0} className="w-full px-4 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-sm font-medium">Export All</p>
                    <p className="text-xs text-slate-400">{totalCount} orders</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Orders</p>
              <p className="text-xl font-bold text-white">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-xl font-bold text-white">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Processing</p>
              <p className="text-xl font-bold text-white">{processingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Completed</p>
              <p className="text-xl font-bold text-white">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>
      {/* Items Per Page */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Show</span>
            <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(Number(e.target.value))} className="px-2 py-1 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400 text-xs">entries</span>
          </div>
          <div className="text-xs text-slate-400">Page {currentPage} of {totalPages}</div>
        </div>
      </div>
      {/* Inline Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 z-50">
        <div className="flex flex-wrap items-center gap-2">

             {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
          </div>
          {/* Status Filter */}
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`pl-9 pr-8 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer min-w-[140px] ${statusFilter !== "all" ? "bg-blue-500/20 border-2 border-blue-500/50" : "bg-slate-800/50 border border-slate-700"}`}>
              <option value="all">All Status</option>
              <option value="1">Pending</option>
              <option value="2">Processing</option>
              <option value="3">Shipped</option>
              <option value="4">Delivered</option>
              <option value="5">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Payment Filter */}
          <div className="relative">
            <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className={`pl-9 pr-8 py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer min-w-[140px] ${paymentStatusFilter !== "all" ? "bg-yellow-500/20 border-2 border-yellow-500/50" : "bg-slate-800/50 border border-slate-700"}`}>
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range */}
<div className="relative" ref={datePickerRef}>
  <button 
    onClick={() => setShowDatePicker(!showDatePicker)} 
    className={`pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-left min-w-[100px] flex items-center justify-between ${
      dateRange.startDate || dateRange.endDate 
        ? "bg-violet-500/20 border-2 border-violet-500/50 text-white" 
        : "bg-slate-800/50 border border-slate-700 text-slate-400"
    }`}
  >
    <span className="truncate ml-5">{getDateRangeLabel()}</span>
    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    {dateRange.startDate || dateRange.endDate ? (
      <X 
        onClick={(e) => { 
          e.stopPropagation(); 
          setDateRange({ startDate: "", endDate: "" }); 
        }} 
        className="h-3.5 w-3.5 text-slate-400 hover:text-white" 
      />
    ) : (
      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showDatePicker ? "rotate-180" : ""}`} />
    )}
  </button>
  
  {showDatePicker && (
    <>
      <div className="fixed inset-0 z-[100]" onClick={() => setShowDatePicker(false)} />
      <div className="absolute top-full left-0 mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-2 z-[110] min-w-[220px]">
        
        {/* From Date */}
        <div className="mb-3">
          <label className="block text-blue-400 text-xs font-semibold mb-2">
            From Date
          </label>
          <input 
            type="date" 
            value={dateRange.startDate} 
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))} 
            max={dateRange.endDate || new Date().toISOString().split("T")[0]} 
            className="w-full px-3 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
          />
        </div>

        {/* To Date */}
        <div className="mb-3">
          <label className="block text-blue-400 text-xs font-semibold mb-2">
            To Date
          </label>
          <input 
            type="date" 
            value={dateRange.endDate} 
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))} 
            min={dateRange.startDate} 
            max={new Date().toISOString().split("T")[0]} 
            className="w-full px-3 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <button 
            onClick={() => { 
              const today = new Date(); 
              const weekAgo = new Date(today); 
              weekAgo.setDate(today.getDate() - 7); 
              setDateRange({ 
                startDate: weekAgo.toISOString().split("T")[0], 
                endDate: today.toISOString().split("T")[0] 
              }); 
              setShowDatePicker(false); 
            }} 
            className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-violet-400 rounded-lg text-xs font-medium transition-all border border-slate-600 hover:border-violet-500/50"
          >
            Last 7 Days
          </button>
          <button 
            onClick={() => { 
              const today = new Date(); 
              const monthAgo = new Date(today); 
              monthAgo.setMonth(today.getMonth() - 1); 
              setDateRange({ 
                startDate: monthAgo.toISOString().split("T")[0], 
                endDate: today.toISOString().split("T")[0] 
              }); 
              setShowDatePicker(false); 
            }} 
            className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-medium transition-all border border-slate-600 hover:border-cyan-500/50"
          >
            Last 30 Days
          </button>
        </div>
      </div>
    </>
  )}
</div>


       

          {/* Clear Button */}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-2 text-xs font-medium">
              <FilterX className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Showing <span className="text-white font-semibold">{filteredOrders.length}</span> of <span className="text-white font-semibold">{totalCount}</span> orders
          </span>
          {hasActiveFilters && (
            <span className="text-violet-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></div>
              Filters active
            </span>
          )}
        </div>
      </div>



      {/* Orders Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden relative z-10">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">Order ID</th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">Customer</th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">Items</th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">Total</th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">Date</th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">Status</th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">Payment</th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <p className="text-white font-semibold text-xs">{order.orderNumber}</p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate text-xs">{order.customerName}</p>
                          <p className="text-xs text-slate-500 truncate">{order.customerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-medium border border-cyan-500/20">{order.orderItems.length}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <PoundSterling className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-white font-semibold text-xs">{formatCurrency(order.totalAmount, order.currency)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(order.orderDate)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${order.payments.length > 0 ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>{order.payments.length > 0 ? "Paid" : "Unpaid"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center">
                        <button className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all" onClick={() => setViewingOrder(order)}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center gap-1">
              <button onClick={goToFirstPage} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button onClick={goToPreviousPage} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((page) => (
                <button key={page} onClick={() => goToPage(page)} className={`px-2.5 py-1.5 text-xs rounded-lg transition-all ${currentPage === page ? "bg-violet-500 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>{page}</button>
              ))}
              <button onClick={goToNextPage} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={goToLastPage} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-slate-400">Total: {totalCount} orders</div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">Order Details</h2>
                  <p className="text-slate-400 text-sm mt-1">{viewingOrder.orderNumber}</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-100px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoCard icon={<User className="w-4 h-4 text-violet-400" />} label="Customer" value={viewingOrder.customerName} />
                <InfoCard icon={<Mail className="w-4 h-4 text-cyan-400" />} label="Email" value={viewingOrder.customerEmail} />
                <InfoCard icon={<Phone className="w-4 h-4 text-green-400" />} label="Phone" value={viewingOrder.customerPhone} />
                <InfoCard icon={<Calendar className="w-4 h-4 text-orange-400" />} label="Order Date" value={formatDate(viewingOrder.orderDate)} />
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <PoundSterling className="w-4 h-4 text-green-400" />
                  Order Summary
                </h4>
                <div className="space-y-1.5 text-sm">
                  <SummaryRow label="Subtotal" value={formatCurrency(viewingOrder.subtotalAmount, viewingOrder.currency)} />
                  <SummaryRow label="Tax" value={formatCurrency(viewingOrder.taxAmount, viewingOrder.currency)} />
                  <SummaryRow label="Shipping" value={formatCurrency(viewingOrder.shippingAmount, viewingOrder.currency)} />
                  {viewingOrder.discountAmount > 0 && <SummaryRow label="Discount" value={`-${formatCurrency(viewingOrder.discountAmount, viewingOrder.currency)}`} highlight />}
                  <div className="border-t border-slate-700 pt-1.5">
                    <SummaryRow label="Total" value={formatCurrency(viewingOrder.totalAmount, viewingOrder.currency)} bold />
                  </div>
                </div>
              </div>
              {viewingOrder.orderItems.length > 0 && (
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-cyan-400" />
                    Order Items ({viewingOrder.orderItems.length})
                  </h4>
                  <div className="space-y-2">
                    {viewingOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-slate-400">SKU: {item.productSku}</p>
                          {item.variantName && <p className="text-xs text-cyan-400">{item.variantName}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold text-sm">{item.quantity} × {formatCurrency(item.unitPrice, viewingOrder.currency)}</p>
                          <p className="text-xs text-green-400 font-bold">{formatCurrency(item.totalPrice, viewingOrder.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AddressCard title="Billing Address" address={viewingOrder.billingAddress} />
                <AddressCard title="Shipping Address" address={viewingOrder.shippingAddress} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-white font-medium text-sm">{value}</p>
      </div>
    </div>
  </div>
);

const SummaryRow = ({ label, value, bold = false, highlight = false }: { label: string; value: string; bold?: boolean; highlight?: boolean }) => (
  <div className={`flex justify-between ${bold ? "text-base" : "text-sm"}`}>
    <span className={`${bold ? "font-bold text-white" : "text-slate-400"}`}>{label}</span>
    <span className={`${bold ? "font-bold text-white" : highlight ? "text-pink-400" : "text-white"}`}>{value}</span>
  </div>
);

const AddressCard = ({ title, address }: { title: string; address: Address }) => (
  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
    <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
      <MapPin className="w-4 h-4 text-blue-400" />
      {title}
    </h4>
    <div className="space-y-1.5 text-sm">
      <p className="text-white font-medium">{`${address.firstName} ${address.lastName}`}</p>
      {address.company && <p className="text-slate-400">{address.company}</p>}
      <p className="text-slate-400">{address.addressLine1}</p>
      {address.addressLine2 && <p className="text-slate-400">{address.addressLine2}</p>}
      <p className="text-slate-400">{`${address.city}, ${address.state} ${address.postalCode}`}</p>
      <p className="text-slate-400">{address.country}</p>
      {address.phoneNumber && (
        <p className="text-slate-400 flex items-center gap-1.5">
          <Phone className="w-3 h-3" />
          {address.phoneNumber}
        </p>
      )}
    </div>
  </div>
);
