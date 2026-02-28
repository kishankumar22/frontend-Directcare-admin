'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
  History,
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
  MoreVertical,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  PackageX,
  AlertCircle,
  RotateCcw,
  XCircle,
  Upload,
} from 'lucide-react';
import {
  orderService,
  Order,
  OrderStatus,
  getOrderStatusInfo,
  getPaymentStatusInfo,
  getPaymentMethodInfo,
  formatCurrency,
  formatDate,
  PharmacyVerificationStatus,
} from '../../../lib/services/orders';
import { useToast } from '@/app/admin/_components/CustomToast';
import React from 'react';
import OrderActionsModal from './OrderActionsModal';
import BulkStatusModal from './BulkStatusModal';
import ConfirmDialog from '../_components/ConfirmDialog';
import BulkShipmentUploadModal from './BulkShipmentUploadModal';

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

// ✅ Get Available Actions based on Order Status (matching backend rules)
const getAvailableActions = (order: Order) => {
  const actions: string[] = [];
// Always available extra actions


  switch (order.status) {
    case 'Pending':
      actions.push('update-status', 'cancel-order');
      break;
    case 'Confirmed':
    case 'Processing':
      if (order.deliveryMethod === 'ClickAndCollect') {
        actions.push('mark-ready', 'update-status', 'cancel-order');
      } else {
        actions.push('create-shipment', 'update-status', 'cancel-order');
      }
      break;
    case 'Shipped':
      actions.push('mark-delivered', 'update-status', 'cancel-order');
      break;
    case 'PartiallyShipped':
      actions.push('create-shipment', 'mark-delivered', 'update-status', 'cancel-order');
      break;
    case 'Delivered':
      actions.push('update-status');
      break;
    case 'Cancelled':
    case 'Returned':
      actions.push('update-status');
      break;
    case 'Refunded':
      break;
    default:
      actions.push('update-status');
  }

  if (order.deliveryMethod === 'ClickAndCollect' && order.collectionStatus === 'Ready') {
    actions.push('mark-collected');
  }

  return actions;
};


export default function OrdersListPage() {
  const router = useRouter();
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ✅ Bulk Selection
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

const [isSearching, setIsSearching] = useState(false);

const [filters, setFilters] = useState({
  searchTerm: '',
  status: '',
  fromDate: '',
  toDate: '',
  deliveryMethod: '',
  paymentMethod: '',
  paymentStatus: '',
pharmacyVerificationStatus: '' as PharmacyVerificationStatus | '',
 isGuestOrder: "", // ✅ NEW

});
const selectedOrderObjects = orders.filter(o =>
  selectedOrders.includes(o.id)
);

const selectedOrderPreview = selectedOrderObjects.map(o => ({
  id: o.id,
  orderNumber: o.orderNumber,
}));

const allSameStatus =
  selectedOrderObjects.length > 0 &&
  selectedOrderObjects.every(
    o => o.status === selectedOrderObjects[0].status
  );

const selectedStatus = selectedOrderObjects[0]?.status;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false); 
  const [actionMenuOrder, setActionMenuOrder] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

const [bulkLoading, setBulkLoading] = useState(false);
const [debouncedSearch, setDebouncedSearch] = useState(filters.searchTerm);

const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  // ✅ Order Actions Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    action: string;
  }>({
    isOpen: false,
    order: null,
    action: '',
  });

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
useEffect(() => {
  if (!filters.searchTerm) {
    setDebouncedSearch("");
    return;
  }

  setIsSearching(true); // 👈 start loader while typing

  const handler = setTimeout(() => {
    setDebouncedSearch(filters.searchTerm);
  }, 500);

  return () => clearTimeout(handler);
}, [filters.searchTerm]);;

  // Fetch orders
const fetchOrders = useCallback(async () => {
  try {
    setLoading(true);

const response = await orderService.getAllOrders({
  page: currentPage,
  pageSize: itemsPerPage,
  status: filters.status || undefined,
  fromDate: filters.fromDate || undefined,
  toDate: filters.toDate || undefined,
  searchTerm: debouncedSearch || undefined,
  pharmacyVerificationStatus:
    filters.pharmacyVerificationStatus || undefined,

  // ✅ CORRECT PARAM NAME
  includeGuestOrders:
    filters.isGuestOrder !== ""
      ? filters.isGuestOrder === "true"
      : undefined,
});

    if (response?.data) {
      let filteredOrders = response.data.items || [];

      if (filters.deliveryMethod) {
        filteredOrders = filteredOrders.filter(
          (o) => o.deliveryMethod === filters.deliveryMethod
        );
      }

      if (filters.paymentMethod) {
        filteredOrders = filteredOrders.filter((o) => {
          const method =
            o.paymentMethod || o.payments?.[0]?.paymentMethod || "";
          return (
            method.toLowerCase() ===
            filters.paymentMethod.toLowerCase()
          );
        });
      }

      if (filters.paymentStatus) {
        filteredOrders = filteredOrders.filter((o) => {
          const status =
            o.paymentStatus ||
            (o.payments && o.payments.length > 0
              ? o.payments[0]?.status
              : null);
          return status === filters.paymentStatus;
        });
      }

      setOrders(filteredOrders);
      setTotalCount(response.data.totalCount || 0);
      setTotalPages(response.data.totalPages || 0);
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to load orders");
  } finally {
    setLoading(false);
    setIsSearching(false); // 👈 stop loader after API
  }
}, [
  currentPage,
  itemsPerPage,
  filters.status,
  filters.fromDate,
  filters.toDate,
  filters.deliveryMethod,
  filters.paymentMethod,
  filters.paymentStatus,
  filters.pharmacyVerificationStatus, // ✅ ADD THIS
  debouncedSearch,
    filters.isGuestOrder, // ✅ NEW
]);


  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ✅ Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };



const handleBulkStatusUpdate = async (data: {
  newStatus: OrderStatus;
  adminNotes: string;
}) => {
  if (!selectedOrders.length) {
    toast.warning("No orders selected");
    return;
  }

  try {
    setBulkLoading(true);

    await orderService.bulkUpdateStatus({
      orderIds: selectedOrders,
      newStatus: data.newStatus,
      adminNotes: data.adminNotes,
      currentUser: "Admin",
    });

    toast.success("Bulk status updated successfully");

    setSelectedOrders([]);
    setBulkModalOpen(false);
    fetchOrders();

  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Bulk update failed";

    toast.error(message);
  } finally {
    setBulkLoading(false);
  }
};
  // ✅ Bulk Export Selected
  const handleBulkExport = () => {
    const ordersToExport = orders.filter((o) => selectedOrders.includes(o.id));
    
    if (ordersToExport.length === 0) {
      toast.warning('Please select orders to export');
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
      'Total Amount',
      'Status',
      'Delivery Method',
      'Payment Method',
      'Payment Status',
      'Order Date',
    ];

    const csvData = ordersToExport.map((order) => {
      const paymentMethodLabel = getPaymentMethodInfo(order.paymentMethod).label;
      const paymentStatusLabel = order.paymentStatus
        ? getPaymentStatusInfo(order.paymentStatus as any).label
        : (order.payments && order.payments.length > 0
          ? getPaymentStatusInfo(order.payments[0].status).label
          : 'N/A');

      return [
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
        order.deliveryMethod === 'ClickAndCollect' ? 'Click & Collect' : 'Home Delivery',
        paymentMethodLabel,
        paymentStatusLabel,
        formatDate(order.orderDate),
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected_orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${ordersToExport.length} orders exported successfully`);
    setSelectedOrders([]);
  };

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
        toast.warning('No orders to export');
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
        'Total Amount',
        'Status',
        'Delivery Method',
        'Payment Method',
        'Payment Status',
        'Order Date',
      ];

      const csvData = ordersToExport.map((order) => {
        const paymentMethodLabel = getPaymentMethodInfo(order.paymentMethod).label;
        const paymentStatusLabel = order.paymentStatus
          ? getPaymentStatusInfo(order.paymentStatus as any).label
          : (order.payments && order.payments.length > 0
            ? getPaymentStatusInfo(order.payments[0].status).label
            : 'N/A');

        return [
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
          order.deliveryMethod === 'ClickAndCollect' ? 'Click & Collect' : 'Home Delivery',
          paymentMethodLabel,
          paymentStatusLabel,
          formatDate(order.orderDate),
        ];
      });

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
    searchTerm: "",
    status: "",
    fromDate: "",
    toDate: "",
    deliveryMethod: "",
    paymentMethod: "",
    paymentStatus: "",
    pharmacyVerificationStatus: "",
    isGuestOrder: "", // ✅ NEW FILTER RESET
  });
  setCurrentPage(1); // ✅ Optional but recommended
};



const hasActiveFilters = useMemo(() => {
  return Object.values(filters).some((value) => {
    if (typeof value === "string") {
      return value.trim() !== "";
    }
    return Boolean(value);
  });
}, [filters]);


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

  // ✅ Handle Action Modal
  const openActionModal = (order: Order, action: string) => {
    setModalState({ isOpen: true, order, action });
    setActionMenuOrder(null);
  };

  const closeActionModal = () => {
    setModalState({ isOpen: false, order: null, action: '' });
  };

  const handleActionSuccess = () => {
    closeActionModal();
    fetchOrders();
  };


  // ✅ Calculate stats with proper typing
  const allOrders = orders; // For stats calculation
  const pendingCount = allOrders.filter((o: Order) => o.status === 'Pending').length;
  const processingCount = allOrders.filter((o: Order) => o.status === 'Processing' || o.status === 'Confirmed').length;
  const completedCount = allOrders.filter((o: Order) => o.status === 'Delivered').length;

  // ✅ Quick filter handlers
  const handleQuickFilter = (status: OrderStatus | '') => {
    setFilters({ ...filters, status: status });
    setCurrentPage(1);
  };

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
    <div className="space-y-2">
      {/* Header */}
<div className="relative flex items-start justify-between">

  {/* 🔹 LEFT SIDE — TITLE */}
  <div>
    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
      Order Management
    </h1>
    <p className="text-slate-400 text-sm mt-1">
      Manage and track customer orders efficiently
    </p>
  </div>

  {/* 🔹 RIGHT SIDE — ACTION BUTTONS */}
  <div className="flex items-center gap-3">

    {/* Upload Shipments */}
    <button
      onClick={() => setShipmentModalOpen(true)}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 
      text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/30 
      transition-all flex items-center gap-2 text-sm font-medium"
    >
      <Upload className="w-4 h-4" />
      Upload Shipments
    </button>

    {/* Export Dropdown */}
    <div className="relative">
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 
        text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 
        transition-all flex items-center gap-2 text-sm font-medium"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export Data
        <ChevronDown className="w-3 h-3" />
      </button>

      {showExportMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowExportMenu(false)}
          />

          <div className="absolute right-0 mt-2 w-60 bg-slate-800 
          border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">

            <button
              onClick={() => {
                handleExport(false);
                setShowExportMenu(false);
              }}
              disabled={orders.length === 0}
              className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 
              transition-all flex items-center gap-3 disabled:opacity-50 
              border-b border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-sm font-medium">Export Current Page</p>
                <p className="text-xs text-slate-400">
                  {orders.length} orders
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                handleExport(true);
                setShowExportMenu(false);
              }}
              disabled={totalCount === 0}
              className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 
              transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-sm font-medium">Export All Orders</p>
                <p className="text-xs text-slate-400">
                  {totalCount} total orders
                </p>
              </div>
            </button>

          </div>
        </>
      )}
    </div>
  </div>

  {/* 🔥 BULK BAR — PERFECTLY CENTERED */}
  {selectedOrders.length > 0 && (
    <div className="absolute left-1/2 top-0 -m-3 -translate-x-1/2 z-[50] 
      w-auto max-w-[780px]">

      <div className="grid grid-flow-col auto-cols-max items-center gap-4
        bg-slate-900/95 backdrop-blur-md 
        border border-slate-700 rounded-xl 
        px-6 py-3 shadow-xl">

        {/* Selected Info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
          <span className="text-white font-semibold">
            {selectedOrders.length}
          </span>
          <span className="text-slate-400">selected</span>

          {allSameStatus && selectedStatus && (
            <span className="ml-2 px-2 py-0.5 text-[11px] 
              bg-slate-800 border border-slate-600 
              text-slate-300 rounded-md">
              {selectedStatus}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-700" />

        {/* Update */}
        {allSameStatus && (
          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-4 py-2 text-sm font-medium 
            bg-violet-600 hover:bg-violet-700 
            text-white rounded-lg transition-all"
          >
            Update Bulk Status
          </button>
        )}

        {/* Export */}
        <button
          onClick={handleBulkExport}
          className="px-4 py-2 text-sm font-medium 
          bg-blue-600 hover:bg-blue-700 
          text-white rounded-lg flex items-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          Export ({selectedOrders.length})
        </button>

        {/* Clear */}
        <button
          onClick={() => setSelectedOrders([])}
          className="px-4 py-2 text-sm font-medium 
          bg-slate-700 hover:bg-slate-600 
          text-white rounded-lg transition-all"
        >
          Clear
        </button>

      </div>
    </div>
  )}

</div>

      {/* ✅ Clickable Stats Cards with Quick Filters */}
      <div className="grid gap-3 md:grid-cols-4">
        <button
          onClick={() => handleQuickFilter('')}
          className={`bg-gradient-to-br from-violet-500/10 to-purple-500/10 border rounded-lg p-3 hover:shadow-lg transition-all text-left ${
            filters.status === '' ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-violet-500/20'
          }`}
          title="View all orders"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Orders</p>
              <p className="text-xl font-bold text-white">{totalCount}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('Pending')}
          className={`bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border rounded-lg p-3 hover:shadow-lg transition-all text-left ${
            filters.status === 'Pending' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-cyan-500/20'
          }`}
          title="View pending orders"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-xl font-bold text-white">{pendingCount}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('Processing')}
          className={`bg-gradient-to-br from-pink-500/10 to-rose-500/10 border rounded-lg p-3 hover:shadow-lg transition-all text-left ${
            filters.status === 'Processing' ? 'border-pink-500 shadow-lg shadow-pink-500/20' : 'border-pink-500/20'
          }`}
          title="View processing orders"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Processing</p>
              <p className="text-xl font-bold text-white">{processingCount}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleQuickFilter('Delivered')}
          className={`bg-gradient-to-br from-green-500/10 to-emerald-500/10 border rounded-lg p-3 hover:shadow-lg transition-all text-left ${
            filters.status === 'Delivered' ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-green-500/20'
          }`}
          title="View completed orders"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Completed</p>
              <p className="text-xl font-bold text-white">{completedCount}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Items Per Page */}
   <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
    
    {/* LEFT SIDE */}
    <div className="flex flex-wrap items-center gap-4">
      
      {/* Show Entries */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) =>
            handleItemsPerPageChange(Number(e.target.value))
          }
          className="px-2 py-1 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
          <option value={100}>100</option>
        </select>
        <span className="text-slate-400">entries</span>
      </div>

      {/* Showing Info */}
      <div className="text-slate-400">
        Showing{" "}
        <span className="text-white font-semibold">
          {orders.length}
        </span>{" "}
        of{" "}
        <span className="text-white font-semibold">
          {totalCount}
        </span>
      </div>

      {/* Selected Count */}
      {selectedOrders.length > 0 && (
        <span className="text-blue-400 font-medium">
          ({selectedOrders.length} selected)
        </span>
      )}
    </div>

    {/* RIGHT SIDE */}
    <div className="flex items-center gap-4 text-slate-400">
      
      {/* Page Info */}
      <span>
        Page{" "}
        <span className="text-white font-semibold">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="text-white font-semibold">
          {totalPages}
        </span>
      </span>

      {/* Filter Indicator */}
      {hasActiveFilters && (
        <span className="text-violet-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
          Filters active
        </span>
      )}
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
  </div>
</div>


      {/* Inline Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 z-50">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
   <div className="relative flex-1 w-[160px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

  <input
    type="text"
    placeholder="Search orders..."
    value={filters.searchTerm}
    onChange={(e) =>
      setFilters({ ...filters, searchTerm: e.target.value })
    }
    className="w-full pl-9 pr-9 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
  />

  {/* 🔥 Loader */}
  {isSearching && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <div className="h-4 w-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )}
</div>

<div className="flex flex-col gap-1 w-[140px]">

  <select
    value={filters.isGuestOrder}
    onChange={(e) =>
      setFilters((prev) => ({
        ...prev,
        isGuestOrder: e.target.value,
      }))
    }
    className="px-3 py-2 text-sm bg-slate-800 border border-slate-700
      rounded-lg text-white focus:outline-none
      focus:ring-2 focus:ring-violet-500 transition-all"
  >
    <option value="">User type</option>
    <option value="false">Registered Users</option>
    <option value="true">Guest Orders</option>
  </select>
</div>
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`pl-9 pr-8 py-2 rounded-lg bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer w-[140px] ${
                filters.status
                  ? 'bg-blue-500/20 border-2 border-blue-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <option value="">Order Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="PartiallyShipped">Partially Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Returned">Returned</option>
              <option value="Refunded">Refunded</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* ✅ Delivery Method Filter */}
          <div className="relative">
            <select
              value={filters.deliveryMethod}
              onChange={(e) => setFilters({ ...filters, deliveryMethod: e.target.value })}
              className={`pl-8 pr-2 py-2  bg-slate-800/90 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer w-[140px] ${
                filters.deliveryMethod
                  ? 'bg-cyan-500/20 border-2 border-cyan-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <option value="">All Delivery</option>
              <option value="HomeDelivery">Home Delivery</option>
              <option value="ClickAndCollect">Click & Collect</option>
            </select>
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* ✅ Payment Method Filter */}
          <div className="relative">
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className={`pl-9 pr-5 py-2 rounded-lg bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer w-[140px] ${
                filters.paymentMethod
                  ? 'bg-amber-500/20 border-2 border-amber-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <option value="">All Methods</option>
              <option value="CashOnDelivery">Cash on Delivery</option>
              <option value="Stripe">Stripe</option>
            </select>
            <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* ✅ Payment Status Filter */}
          <div className="relative">
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className={`pl-9 pr-7 py-2 rounded-lg bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer min-w-[140px] ${
                filters.paymentStatus
                  ? 'bg-green-500/20 border-2 border-green-500/50'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <option value="">payment Status</option>
              <option value="Successful">Successful</option>
              <option value="Completed">Completed</option>
              <option value="Captured">Captured</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
          {/* ✅ Pharmacy Verification Filter */}
<div className="relative">
  <select
    value={filters.pharmacyVerificationStatus}
   onChange={(e) =>
  setFilters({
    ...filters,
    pharmacyVerificationStatus:
      e.target.value as PharmacyVerificationStatus | '',
  })
}

    className={`pl-9 pr-8 py-2 rounded-lg bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer min-w-[160px] ${
      filters.pharmacyVerificationStatus
        ? 'bg-gray-500/20 border-2 border-gray-500/50'
        : 'bg-slate-800/50 border border-slate-700'
    }`}
  >
    <option value="">Pharmacy Status</option>
    <option value="Pending">Pending Review</option>
    <option value="Approved">Approved</option>
    <option value="Rejected">Rejected</option>
  </select>

  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
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
                  {/* ✅ Bulk Select Checkbox */}
                  <th className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 cursor-pointer"
                    />
                  </th>
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
                    Total Amount
                  </th>
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold text-xs">
                   Order Date
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                   Order Status
                  </th>
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
  Pharmacy
</th>

                  {/* ✅ Payment Method Column */}
                  <th className="text-center py-3 px-3 text-slate-300 font-semibold text-xs">
                    Payment
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

                  // ✅ Get payment info from top-level fields (fallback to payments array)
                  const paymentMethodStr = order.paymentMethod || (order.payments?.[0]?.paymentMethod);
                  const paymentStatusStr = order.paymentStatus || (order.payments?.[0]?.status);
                  const methodInfo = getPaymentMethodInfo(paymentMethodStr);
                  const paymentInfo = paymentStatusStr
                    ? getPaymentStatusInfo(paymentStatusStr as any)
                    : null;

                  const availableActions = getAvailableActions(order);

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      {/* ✅ Checkbox */}
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500 cursor-pointer"
                        />
                      </td>
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
  {order.pharmacyVerificationStatus ? (
    <span
      className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
        order.pharmacyVerificationStatus === 'Pending'
          ? 'bg-yellow-500/10 text-yellow-400'
          : order.pharmacyVerificationStatus === 'Approved'
          ? 'bg-green-500/10 text-green-400'
          : 'bg-red-500/10 text-red-400'
      }`}
    >
      {order.pharmacyVerificationStatus}
    </span>
  ) : (
    <span className="text-slate-500 text-xs">—</span>
  )}
</td>

                      {/* ✅ Payment Method + Status */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${methodInfo.bgColor} ${methodInfo.color} border ${methodInfo.bgColor.replace('/10', '/20')}`}
                          >
                            {methodInfo.icon === 'card' ? (
                              <CreditCard className="h-3 w-3" />
                            ) : (
                              <PoundSterling className="h-3 w-3" />
                            )}
                            {methodInfo.label}
                          </span>
                          {paymentInfo && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentInfo.bgColor} ${paymentInfo.color}`}
                            >
                              {paymentInfo.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getDeliveryMethodBadge(order.deliveryMethod)}
                      </td>
                      {/* ✅ Dynamic Actions */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">          
                        

                          {/* Manage/Edit Order */}
                          <button
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-lg transition-all"
                            title="Manage Order"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* ✅ Quick Actions Menu */}
                          {availableActions.length > 0 && (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActionMenuOrder(
                                    actionMenuOrder === order.id ? null : order.id
                                  )
                                }
                                className="p-1.5 text-slate-400 hover:bg-slate-700/50 border border-slate-600 rounded-lg transition-all"
                                title="Quick Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {actionMenuOrder === order.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setActionMenuOrder(null)}
                                  />
                                  <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-30 overflow-hidden">
                                    {availableActions.includes('mark-ready') && (
                                      <button
                                        onClick={() => openActionModal(order, 'mark-ready')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs border-b border-slate-700"
                                      >
                                        <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
                                        Mark Ready
                                      </button>
                                    )}
                                    {availableActions.includes('mark-collected') && (
                                      <button
                                        onClick={() => openActionModal(order, 'mark-collected')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs border-b border-slate-700"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        Mark Collected
                                      </button>
                                    )}
                                    {availableActions.includes('create-shipment') && (
                                      <button
                                        onClick={() => openActionModal(order, 'create-shipment')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs border-b border-slate-700"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-purple-400" />
                                        Create Shipment
                                      </button>
                                    )}
                                    {availableActions.includes('mark-delivered') && (
                                      <button
                                        onClick={() => openActionModal(order, 'mark-delivered')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs border-b border-slate-700"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                        Mark Delivered
                                      </button>
                                    )}
                                    {availableActions.includes('update-status') && (
                                      <button
                                        onClick={() => openActionModal(order, 'update-status')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs border-b border-slate-700"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                                        Update Status
                                      </button>
                                    )}
                                    {availableActions.includes('cancel-order') && (
                                      <button
                                        onClick={() => openActionModal(order, 'cancel-order')}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2 text-xs"
                                      >
                                        <PackageX className="w-3.5 h-3.5 text-red-400" />
                                        Cancel Order
                                      </button>
                                    )}


                                  </div>
                                </>
                              )}
                            </div>
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

{shipmentModalOpen && (
  <BulkShipmentUploadModal
    isOpen={true}
    onClose={() => setShipmentModalOpen(false)}
    onSuccess={() => {
      fetchOrders();
      setShipmentModalOpen(false);
    }}
  />
)}

{/* ✅ Order Actions Modal */}
{modalState.isOpen && modalState.order && (
  <OrderActionsModal
    isOpen={modalState.isOpen}
    onClose={closeActionModal}
    order={modalState.order}
    action={modalState.action}
    onSuccess={handleActionSuccess}
  />
)}

{/* ✅ Bulk Status Modal */}
<BulkStatusModal
  isOpen={bulkModalOpen}
  onClose={() => setBulkModalOpen(false)}
  onConfirm={handleBulkStatusUpdate}
  currentStatus={selectedStatus as OrderStatus}
  selectedOrders={selectedOrderPreview}
  loading={bulkLoading}
/>
    </div>
  );
}

