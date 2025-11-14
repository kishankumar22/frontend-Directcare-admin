"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, TrendingUp, Eye, Download, Search, User, Mail,  Calendar, MapPin, Phone, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, FileText, Truck, CreditCard, Tag, FileSpreadsheet, ChevronDown, PoundSterling } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/CustomToast";

// Types
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

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variantName: string | null;
  productId: string;
  productVariantId: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: number;
  orderDate: string;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes: string;
  couponCode: string;
  isGuestOrder: boolean;
  customerEmail: string;
  customerPhone: string;
  billingAddress: Address;
  shippingAddress: Address;
  userId: string | null;
  customerName: string;
  orderItems: OrderItem[];
  payments: any[];
  shipments: any[];
  createdAt: string;
  updatedAt: string | null;
}

interface OrderApiResponse {
  success: boolean;
  message: string;
  data: {
    items: Order[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  errors: null | string[];
}

export default function OrdersPage() {
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch Orders with Pagination
  const fetchOrders = async (page: number = 1, pageSize: number = 25) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await apiClient.get<OrderApiResponse>(
        `${API_ENDPOINTS.orders}?page=${page}&pageSize=${pageSize}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

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

  // Status mapping
  const getStatusLabel = (status: number): string => {
    const statusMap: { [key: number]: string } = {
      1: "Pending",
      2: "Processing",
      3: "Shipped",
      4: "Delivered",
      5: "Cancelled",
    };
    return statusMap[status] || "Unknown";
  };

  const getStatusColor = (status: number): string => {
    const statusColors: { [key: number]: string } = {
      1: "bg-yellow-500/10 text-yellow-400",
      2: "bg-cyan-500/10 text-cyan-400",
      3: "bg-blue-500/10 text-blue-400",
      4: "bg-green-500/10 text-green-400",
      5: "bg-red-500/10 text-red-400",
    };
    return statusColors[status] || "bg-slate-500/10 text-slate-400";
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All Status" || getStatusLabel(order.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Calculate stats
  const pendingCount = orders.filter((o) => o.status === 1).length;
  const processingCount = orders.filter((o) => o.status === 2).length;
  const completedCount = orders.filter((o) => o.status === 4).length;

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return `${currency === "USD" ? "£" : "£"}${amount.toFixed(2)}`;
  };

  // Export orders to CSV
const handleExport = async (exportAll: boolean = false) => {
  try {
    let ordersToExport: Order[] = [];

    if (exportAll) {
      // Fetch all orders from API
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const response = await apiClient.get<OrderApiResponse>(
        `${API_ENDPOINTS.orders}?page=1&pageSize=10000`, // Get all orders
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      ordersToExport = response.data?.data?.items || [];
      setLoading(false);
    } else {
      // Use filtered orders
      ordersToExport = filteredOrders;
    }

    // Check if there are any orders
    if (ordersToExport.length === 0) {
      toast.warning("⚠️ No orders to export");
      return;
    }

    const csvHeaders = [
      "Order Number",
      "Customer Name",
      "Email",
      "Phone",
      "Items",
      "Subtotal",
      "Tax",
      "Shipping",
      "Discount",
      "Total",
      "Status",
      "Order Date"
    ];

    const csvData = ordersToExport.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      // ✅ Fix phone number formatting - add single quote prefix
      `'${order.customerPhone}`,
      order.orderItems.length,
      order.subtotalAmount,
      order.taxAmount,
      order.shippingAmount,
      order.discountAmount,
      order.totalAmount,
      getStatusLabel(order.status),
      formatDate(order.orderDate)
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Dynamic filename
    const exportType = exportAll ? "all" : "filtered";
    const filterInfo = !exportAll && statusFilter !== "All Status" ? `_${statusFilter}` : "";
    const searchInfo = !exportAll && searchTerm ? `_search` : "";
    link.download = `orders_${exportType}${filterInfo}${searchInfo}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`📥 ${ordersToExport.length} order${ordersToExport.length > 1 ? 's' : ''} exported successfully!`);
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export orders");
    setLoading(false);
  }
};


  // Pagination functions
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // Generate page numbers
  const getPageNumbers = useCallback(() => {
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
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-slate-400 mt-1">Manage and track customer orders</p>
        </div>
        {/* Export Button with Dropdown */}
<div className="relative">
  <button 
    onClick={() => setShowExportMenu(!showExportMenu)}
    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-semibold"
  >
    <Download className="w-5 h-5" />
    Export
    <ChevronDown className="w-4 h-4" />
  </button>
  
  {/* Dropdown Menu */}
  {showExportMenu && (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-10" 
        onClick={() => setShowExportMenu(false)}
      />
      
      {/* Menu Items */}
      <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 z-20 overflow-hidden">
        <button
          onClick={() => {
            handleExport(false);
            setShowExportMenu(false);
          }}
          disabled={filteredOrders.length === 0}
          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-sm font-medium">Export to Excel (Selected)</p>
            <p className="text-xs text-slate-400">{filteredOrders.length} orders</p>
          </div>
        </button>
        
        <button
          onClick={() => {
            handleExport(true);
            setShowExportMenu(false);
          }}
          disabled={totalCount === 0}
          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-sm font-medium">Export to Excel (all found)</p>
            <p className="text-xs text-slate-400">{totalCount} orders</p>
          </div>
        </button>
      </div>
    </>
  )}
</div>

      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total Orders</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{totalCount}</p>
                <span className="text-xs text-violet-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Pending</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <span className="text-xs text-cyan-400">Awaiting</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-xl border border-pink-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-pink-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Processing</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{processingCount}</p>
                <span className="text-xs text-pink-400">Preparing</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Completed</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <span className="text-xs text-green-400">Delivered</span>
              </div>
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by order ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </select>
          <div className="text-sm text-slate-400">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Order ID</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Customer</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Items</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Total</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Payment</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <p className="text-white font-semibold">{order.orderNumber}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{order.customerName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {order.customerEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                        {order.orderItems.length}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                      <PoundSterling className="w-5 h-5 text-green-400" />
                        <span className="text-white font-semibold">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(order.orderDate)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        order.payments.length > 0 ? "bg-violet-500/10 text-violet-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {order.payments.length > 0 ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                          onClick={() => setViewingOrder(order)}
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

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            
            {/* Header */}
            <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Order Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">{viewingOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
              
              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard icon={<User className="w-5 h-5 text-violet-400" />} label="Customer" value={viewingOrder.customerName} />
                <InfoCard icon={<Mail className="w-5 h-5 text-cyan-400" />} label="Email" value={viewingOrder.customerEmail} />
                <InfoCard icon={<Phone className="w-5 h-5 text-green-400" />} label="Phone" value={viewingOrder.customerPhone} />
                <InfoCard icon={<Calendar className="w-5 h-5 text-orange-400" />} label="Order Date" value={formatDate(viewingOrder.orderDate)} />
              </div>

              {/* Order Summary */}
              <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <PoundSterling  className="w-5 h-5 text-green-400" />
                  Order Summary
                </h4>
                <div className="space-y-2">
                  <SummaryRow label="Subtotal" value={formatCurrency(viewingOrder.subtotalAmount, viewingOrder.currency)} />
                  <SummaryRow label="Tax" value={formatCurrency(viewingOrder.taxAmount, viewingOrder.currency)} />
                  <SummaryRow label="Shipping" value={formatCurrency(viewingOrder.shippingAmount, viewingOrder.currency)} />
                  {viewingOrder.discountAmount > 0 && (
                    <SummaryRow label="Discount" value={`-${formatCurrency(viewingOrder.discountAmount, viewingOrder.currency)}`} highlight />
                  )}
                  <div className="border-t border-slate-700 pt-2">
                    <SummaryRow label="Total" value={formatCurrency(viewingOrder.totalAmount, viewingOrder.currency)} bold />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {viewingOrder.orderItems.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-cyan-400" />
                    Order Items ({viewingOrder.orderItems.length})
                  </h4>
                  <div className="space-y-3">
                    {viewingOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-violet-500/50 transition-all">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.productName}</p>
                          <p className="text-sm text-slate-400">SKU: {item.productSku}</p>
                          {item.variantName && (
                            <p className="text-xs text-cyan-400">{item.variantName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {item.quantity} × {formatCurrency(item.unitPrice, viewingOrder.currency)}
                          </p>
                          <p className="text-sm text-green-400 font-bold">
                            {formatCurrency(item.totalPrice, viewingOrder.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AddressCard title="Billing Address" address={viewingOrder.billingAddress} />
                <AddressCard title="Shipping Address" address={viewingOrder.shippingAddress} />
              </div>

              {/* Additional Info */}
              {(viewingOrder.notes || viewingOrder.couponCode) && (
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                  <h4 className="text-lg font-bold text-white mb-4">Additional Information</h4>
                  {viewingOrder.couponCode && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-400">Coupon Code</p>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Tag className="w-4 h-4 text-pink-400" />
                        {viewingOrder.couponCode}
                      </p>
                    </div>
                  )}
                  {viewingOrder.notes && (
                    <div>
                      <p className="text-sm text-slate-400">Notes</p>
                      <p className="text-white">{viewingOrder.notes}</p>
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

// Helper Components
const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 hover:border-violet-500/50 transition-all">
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  </div>
);

const SummaryRow = ({ label, value, bold = false, highlight = false }: { label: string; value: string; bold?: boolean; highlight?: boolean }) => (
  <div className={`flex justify-between ${bold ? 'text-lg' : 'text-sm'}`}>
    <span className={`${bold ? 'font-bold text-white' : 'text-slate-400'}`}>{label}</span>
    <span className={`${bold ? 'font-bold text-white' : highlight ? 'text-pink-400' : 'text-white'}`}>{value}</span>
  </div>
);

const AddressCard = ({ title, address }: { title: string; address: Address }) => (
  <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <MapPin className="w-5 h-5 text-blue-400" />
      {title}
    </h4>
    <div className="space-y-2 text-sm">
      <p className="text-white font-medium">{`${address.firstName} ${address.lastName}`}</p>
      {address.company && <p className="text-slate-400">{address.company}</p>}
      <p className="text-slate-400">{address.addressLine1}</p>
      {address.addressLine2 && <p className="text-slate-400">{address.addressLine2}</p>}
      <p className="text-slate-400">{`${address.city}, ${address.state} ${address.postalCode}`}</p>
      <p className="text-slate-400">{address.country}</p>
      {address.phoneNumber && (
        <p className="text-slate-400 flex items-center gap-2">
          <Phone className="w-3 h-3" />
          {address.phoneNumber}
        </p>
      )}
    </div>
  </div>
);
