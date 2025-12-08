'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Truck,
  MapPin,
  X,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  FilterX,
  PoundSterling,
  ChevronsLeft,
  ChevronsRight,
  User,
  Mail,
  Phone,
  ShoppingCart,
  Clock,
  CheckCircle,
  Edit,
} from 'lucide-react';
import {
  orderService,
  Order,
  getOrderStatusInfo,
  formatCurrency,
  formatDate,
} from '../../../lib/services/orders';
import { useToast } from '@/components/CustomToast';
import React from 'react';

interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export default function OrdersListPage() {
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    fromDate: '',
    toDate: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getAllOrders({
        page: currentPage,
        pageSize: itemsPerPage,
        status: filters.status ? Number(filters.status) : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        searchTerm: filters.searchTerm || undefined,
      });

      if (response?.data) {
        setOrders(response.data.items || []);
        setTotalCount(response.data.totalCount || 0);
        setTotalPages(response.data.totalPages || 0);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Export functionality
  const handleExport = async (exportAll: boolean = false) => {
    try {
      let ordersToExport: Order[] = [];
      
      if (exportAll) {
        setLoading(true);
        const response = await orderService.getAllOrders({ page: 1, pageSize: 10000 });
        ordersToExport = response?.data?.items || [];
        setLoading(false);
      } else {
        ordersToExport = orders;
      }

      if (ordersToExport.length === 0) {
        toast.warning('⚠️ No orders to export');
        return;
      }

      const csvHeaders = [
        'Order Number',
        'Customer Name',
        'Email',
        'Phone',
        'Items',
        'Subtotal',
        'Tax',
        'Shipping',
        'Discount',
        'Total',
        'Status',
        'Order Date',
      ];

      const csvData = ordersToExport.map((order) => [
        order.orderNumber,
        order.customerName,
        order.customerEmail,
        `'${order.customerPhone}`,
        order.orderItems.length,
        order.subtotalAmount,
        order.taxAmount,
        order.shippingAmount,
        order.discountAmount,
        order.totalAmount,
        getOrderStatusInfo(order.status).label,
        formatDate(order.orderDate),
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exportType = exportAll ? 'all' : 'filtered';
      link.download = `orders_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `📥 ${ordersToExport.length} order${ordersToExport.length > 1 ? 's' : ''} exported successfully!`
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
      if (startPage === 1) endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      else startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      status: '',
      fromDate: '',
      toDate: '',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.searchTerm || filters.status || filters.fromDate || filters.toDate;

  const getDateRangeLabel = () => {
    if (!filters.fromDate && !filters.toDate) return 'Select Date Range';
    const formatDateLabel = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };
    if (filters.fromDate && filters.toDate)
      return `${formatDateLabel(filters.fromDate)} - ${formatDateLabel(filters.toDate)}`;
    else if (filters.fromDate) return `From ${formatDateLabel(filters.fromDate)}`;
    else if (filters.toDate) return `Until ${formatDateLabel(filters.toDate)}`;
    return 'Select Date Range';
  };

  const getDeliveryMethodBadge = (method: string) => {
    if (method === 'ClickAndCollect') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20">
          <MapPin className="h-3 w-3" />
          Click & Collect
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
        <Truck className="h-3 w-3" />
        Home Delivery
      </span>
    );
  };

  // Calculate stats
  const pendingCount = orders.filter((o) => o.status === 1).length;
  const processingCount = orders.filter((o) => o.status === 2).length;
  const completedCount = orders.filter((o) => o.status === 4).length;

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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and track customer orders</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    handleExport(false);
                    setShowExportMenu(false);
                  }}
                  disabled={orders.length === 0}
                  className="w-full px-4 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Export Current Page</p>
                    <p className="text-xs text-slate-400">{orders.length} orders</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleExport(true);
                    setShowExportMenu(false);
                  }}
                  disabled={totalCount === 0}
                  className="w-full px-4 py-2.5 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400 text-xs">entries</span>
          </div>
          <div className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Inline Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 z-50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`pl-9 pr-8 py-2 rounded-lg bg-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer min-w-[140px] ${
                filters.status
                  ? 'bg-blue-500/20 border-2 border-blue-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <option value="">All Status</option>
              <option value="1">Pending</option>
              <option value="2">Processing</option>
              <option value="3">Shipped</option>
              <option value="4">Delivered</option>
              <option value="5">Cancelled</option>
              <option value="6">Refunded</option>
              <option value="7">Ready for Collection</option>
              <option value="8">Collected</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-left min-w-[100px] flex items-center justify-between ${
                filters.fromDate || filters.toDate
                  ? 'bg-violet-500/20 border-2 border-violet-500/50 text-white'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400'
              }`}
            >
              <span className="truncate ml-5">{getDateRangeLabel()}</span>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {filters.fromDate || filters.toDate ? (
                <X
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters({ ...filters, fromDate: '', toDate: '' });
                  }}
                  className="h-3.5 w-3.5 text-slate-400 hover:text-white"
                />
              ) : (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    showDatePicker ? 'rotate-180' : ''
                  }`}
                />
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
                      value={filters.fromDate}
                      onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                      max={filters.toDate || new Date().toISOString().split('T')[0]}
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
                      value={filters.toDate}
                      onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                      min={filters.fromDate}
                      max={new Date().toISOString().split('T')[0]}
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
                        setFilters({
                          ...filters,
                          fromDate: weekAgo.toISOString().split('T')[0],
                          toDate: today.toISOString().split('T')[0],
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
                        setFilters({
                          ...filters,
                          fromDate: monthAgo.toISOString().split('T')[0],
                          toDate: today.toISOString().split('T')[0],
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
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-2 text-xs font-medium"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Showing <span className="text-white font-semibold">{orders.length}</span> of{' '}
            <span className="text-white font-semibold">{totalCount}</span> orders
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
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">
                    Customer
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                    Items
                  </th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">
                    Total
                  </th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">
                    Date
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                    Status
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                    Delivery
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = getOrderStatusInfo(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <p className="text-white font-semibold text-xs">{order.orderNumber}</p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate text-xs">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{order.customerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-medium border border-cyan-500/20">
                          {order.orderItems.length}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <PoundSterling className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-white font-semibold text-xs">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(order.orderDate)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getDeliveryMethodBadge(order.deliveryMethod)}
                      </td>
<td className="py-3 px-3">
  <div className="flex items-center justify-center gap-1.5">
    {/* Quick Preview */}
    <button
      onClick={() => setViewingOrder(order)}
      className="p-1.5 text-violet-400 hover:bg-violet-500/10 border border-violet-500/20 rounded-lg transition-all"
      aria-label="Quick View"
    >
      <Eye className="h-4 w-4" />
    </button>

    {/* Manage/Edit Order */}
    <button
      onClick={() => router.push(`/admin/orders/${order.id}`)}
      className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-lg transition-all"
      aria-label="Manage Order"
    >
      <Edit className="h-4 w-4" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                    currentPage === page
                      ? 'bg-violet-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              >
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
                  <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Order Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">{viewingOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="p-2 text-slate-400 hover:text-white  hover:bg-red-600 rounded-lg transition-all"
                  title='close modal'
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-100px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoCard
                  icon={<User className="w-4 h-4 text-violet-400" />}
                  label="Customer"
                  value={viewingOrder.customerName}
                />
                <InfoCard
                  icon={<Mail className="w-4 h-4 text-cyan-400" />}
                  label="Email"
                  value={viewingOrder.customerEmail}
                />
                <InfoCard
                  icon={<Phone className="w-4 h-4 text-green-400" />}
                  label="Phone"
                  value={viewingOrder.customerPhone || 'N/A'}
                />
                <InfoCard
                  icon={<Calendar className="w-4 h-4 text-orange-400" />}
                  label="Order Date"
                  value={formatDate(viewingOrder.orderDate)}
                />
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <PoundSterling className="w-4 h-4 text-green-400" />
                  Order Summary
                </h4>
                <div className="space-y-1.5 text-sm">
                  <SummaryRow
                    label="Subtotal"
                    value={formatCurrency(viewingOrder.subtotalAmount, viewingOrder.currency)}
                  />
                  <SummaryRow
                    label="Tax"
                    value={formatCurrency(viewingOrder.taxAmount, viewingOrder.currency)}
                  />
                  <SummaryRow
                    label="Shipping"
                    value={formatCurrency(viewingOrder.shippingAmount, viewingOrder.currency)}
                  />
                  {viewingOrder.discountAmount > 0 && (
                    <SummaryRow
                      label="Discount"
                      value={`-${formatCurrency(viewingOrder.discountAmount, viewingOrder.currency)}`}
                      highlight
                    />
                  )}
                  <div className="border-t border-slate-700 pt-1.5">
                    <SummaryRow
                      label="Total"
                      value={formatCurrency(viewingOrder.totalAmount, viewingOrder.currency)}
                      bold
                    />
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
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-slate-400">SKU: {item.productSku}</p>
                          {item.variantName && (
                            <p className="text-xs text-cyan-400">{item.variantName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold text-sm">
                            {item.quantity} × {formatCurrency(item.unitPrice, viewingOrder.currency)}
                          </p>
                          <p className="text-xs text-green-400 font-bold">
                            {formatCurrency(item.totalPrice, viewingOrder.currency)}
                          </p>
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

const SummaryRow = ({
  label,
  value,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) => (
  <div className={`flex justify-between ${bold ? 'text-base' : 'text-sm'}`}>
    <span className={`${bold ? 'font-bold text-white' : 'text-slate-400'}`}>{label}</span>
    <span className={`${bold ? 'font-bold text-white' : highlight ? 'text-pink-400' : 'text-white'}`}>
      {value}
    </span>
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
