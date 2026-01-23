"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Eye, 
  Search, 
  X,
  Calendar,
  ShoppingBag,
  DollarSign,
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
  Package
} from "lucide-react";

import { useToast } from "@/components/CustomToast";
import { Customer, CustomerQueryParams, customersService } from "@/lib/services/costomers";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function CustomersPage() {
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const params: CustomerQueryParams = {
        page: currentPage,
        pageSize: pageSize,
        sortDirection: "desc",
      };

      if (debouncedSearchTerm) {
        params.searchTerm = debouncedSearchTerm;
      }

      if (statusFilter !== "all") {
        params.isActive = statusFilter === "active";
      }

      const response = await customersService.getAll(params);

      if (response?.data?.success) {
        setCustomers(response.data.data.items || []);
        setTotalCount(response.data.data.totalCount || 0);
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Statistics
  const stats = {
    total: totalCount,
    active: customers.filter(c => c.isActive).length,
    newThisMonth: customers.filter(c => {
      const joinedDate = new Date(c.createdAt);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      return joinedDate >= monthStart;
    }).length,
    avgLifetimeValue: customers.length > 0 
      ? (customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length).toFixed(2)
      : "0.00"
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(amount);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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

  const clearFilters = () => {
    setStatusFilter("all");
    setDeliveryMethodFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || deliveryMethodFilter !== "all" || searchTerm.trim() !== "";

  // Get filtered orders based on delivery method
  const getFilteredOrders = () => {
    if (!selectedCustomer) return [];
    
    if (deliveryMethodFilter === "all") {
      return selectedCustomer.orders;
    }
    
    return selectedCustomer.orders.filter(order => 
      order.deliveryMethod.toLowerCase() === deliveryMethodFilter.toLowerCase()
    );
  };

  // Get unique delivery methods from selected customer's orders
  const getDeliveryMethods = () => {
    if (!selectedCustomer) return [];
    const methods = new Set(selectedCustomer.orders.map(order => order.deliveryMethod));
    return Array.from(methods);
  };

  // Pagination
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

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Customers Management
          </h1>
          <p className="text-slate-400 mt-1">Manage your customer base</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all">
          <UserPlus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all cursor-pointer" onClick={() => setStatusFilter('all')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Customers</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all cursor-pointer" onClick={() => setStatusFilter('active')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <User className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Active Customers</p>
              <p className="text-white text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">New This Month</p>
              <p className="text-white text-2xl font-bold">{stats.newThisMonth}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Avg. Lifetime Value</p>
              <p className="text-white text-2xl font-bold">£{stats.avgLifetimeValue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
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
            Showing {startIndex + 1} to {endIndex} of {totalCount} entries
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                statusFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
            {totalCount} customer{totalCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No customers found</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Customer</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Orders</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Total Spent</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Joined</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {getInitials(customer.firstName, customer.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{customer.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <p className="text-xs text-slate-400 truncate">{customer.email}</p>
                          </div>
                          {customer.phoneNumber && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-500" />
                              <p className="text-xs text-slate-400">{customer.phoneNumber}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                        {customer.totalOrders}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-semibold text-white">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(customer.isActive, customer.totalOrders)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span className="text-sm text-slate-300">{formatDate(customer.createdAt)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsModalOpen(true);
                            setDeliveryMethodFilter("all");
                            setExpandedOrderId(null);
                          }}
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

      {/* Customer Details Modal */}
{isModalOpen && selectedCustomer && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-[75vw] w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">

      {/* Modal Header - Compact */}
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{selectedCustomer.fullName}</h2>
              <p className="text-slate-400 text-xs">{selectedCustomer.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setSelectedCustomer(null);
              setDeliveryMethodFilter("all");
              setExpandedOrderId(null);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modal Content - Compact */}
      <div className="overflow-y-auto p-4 space-y-4">

        {/* Personal Information - Inline & Compact */}
        <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
          <h3 className="text-base font-semibold text-white mb-2">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {/* Row 1 */}
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-slate-400">Email:</span>
              <span className="text-white font-medium truncate">{selectedCustomer.email}</span>
            </div>
            {selectedCustomer.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-400">DOB:</span>
                <span className="text-white font-medium">{formatDate(selectedCustomer.dateOfBirth)}</span>
              </div>
            )}
            
            {/* Row 2 */}
            {selectedCustomer.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-medium">{selectedCustomer.phoneNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-slate-400">Joined:</span>
              <span className="text-white font-medium">{formatDate(selectedCustomer.createdAt)}</span>
            </div>
            
            {/* Row 3 */}
            {selectedCustomer.gender && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-400">Gender:</span>
                <span className="text-white font-medium capitalize">{selectedCustomer.gender}</span>
              </div>
            )}
            {selectedCustomer.lastLoginAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-400">Last Login:</span>
                <span className="text-white font-medium">{formatDate(selectedCustomer.lastLoginAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics - Compact */}
        <div>
          <h3 className="text-base font-semibold text-white mb-2">Statistics</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Total Orders</p>
                  <p className="text-xl font-bold text-white">{selectedCustomer.totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Total Spent</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Status</p>
                  <p className="text-base font-bold text-white capitalize">
                    {selectedCustomer.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Addresses - Compact */}
        {selectedCustomer.addresses.length > 0 && (
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
            <h3 className="text-base font-semibold text-white mb-2">Saved Addresses ({selectedCustomer.addresses.length})</h3>
            <div className="space-y-2">
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

        {/* Recent Orders - Compact */}
        {selectedCustomer.orders.length > 0 && (
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-white">
                Orders ({getFilteredOrders().length})
              </h3>
              
              {/* Delivery Method Filter - Compact */}
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={deliveryMethodFilter}
                  onChange={(e) => setDeliveryMethodFilter(e.target.value)}
                  className={`px-2 py-1 bg-slate-900/90 border rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    deliveryMethodFilter !== "all" 
                      ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50" 
                      : "border-slate-600"
                  }`}
                >
                  <option value="all">All Delivery Methods</option>
                  {getDeliveryMethods().map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              {getFilteredOrders().map((order) => (
                <div key={order.id} className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  {/* Order Header - Compact */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-base">{order.orderNumber}</p>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <Truck className="h-3 w-3" />
                            {order.deliveryMethod}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(order.orderDate)} • {order.itemsCount} items
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-cyan-400 text-lg">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                            order.status === "Delivered"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : order.status === "Pending"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-slate-700/50 text-slate-400 border border-slate-600/50"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleOrderDetails(order.id)}
                          className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="Toggle Details"
                        >
                          {expandedOrderId === order.id ? (
                            <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 transition-transform" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Order Details - Compact 3 Columns */}
                  {expandedOrderId === order.id && (
                    <div className="border-t border-slate-700/50 p-3 bg-slate-900/80">
                      
                      {/* Single Row with 3 Columns - Compact */}
                      <div className="grid grid-cols-3 gap-3">
                        
                        {/* Column 1: Order Summary - Compact */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-1.5 mb-2">
                            <DollarSign className="h-3.5 w-3.5 text-green-400" />
                            <p className="text-xs text-slate-300 font-semibold">Order Summary</p>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Subtotal:</span>
                              <span className="text-white font-medium">{formatCurrency(order.subtotalAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tax:</span>
                              <span className="text-white font-medium">{formatCurrency(order.taxAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Shipping:</span>
                              <span className="text-white font-medium">{formatCurrency(order.shippingAmount)}</span>
                            </div>
                            {order.discountAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Discount:</span>
                                <span className="text-green-400 font-medium">-{formatCurrency(order.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-slate-700">
                              <span className="text-white font-semibold">Total:</span>
                              <span className="text-cyan-400 font-bold">{formatCurrency(order.totalAmount)}</span>
                            </div>
                            {order.notes && (
                              <div className="mt-2 pt-2 border-t border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">Notes:</p>
                                <p className="text-xs text-slate-300 bg-slate-900/50 p-1.5 rounded leading-tight">
                                  {order.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Billing Address - Compact */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Package className="h-3.5 w-3.5 text-pink-400" />
                            <p className="text-xs text-slate-300 font-semibold">Billing Address</p>
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <p className="font-medium text-white">
                              {order.billingAddress.firstName} {order.billingAddress.lastName}
                            </p>
                            {order.billingAddress.company && (
                              <p className="text-slate-400">{order.billingAddress.company}</p>
                            )}
                            <p className="text-slate-300 mt-1">{order.billingAddress.addressLine1}</p>
                            {order.billingAddress.addressLine2 && (
                              <p className="text-slate-300">{order.billingAddress.addressLine2}</p>
                            )}
                            <p className="text-slate-300">{order.billingAddress.city}</p>
                            <p className="text-slate-300">
                              {order.billingAddress.state} {order.billingAddress.postalCode}
                            </p>
                            <p className="text-slate-300 font-medium">{order.billingAddress.country}</p>
                          </div>
                        </div>

                        {/* Column 3: Shipping Address - Compact */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Truck className="h-3.5 w-3.5 text-cyan-400" />
                            <p className="text-xs text-slate-300 font-semibold">Shipping Address</p>
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <p className="font-medium text-white">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                            </p>
                            {order.shippingAddress.company && (
                              <p className="text-slate-400">{order.shippingAddress.company}</p>
                            )}
                            <p className="text-slate-300 mt-1">{order.shippingAddress.addressLine1}</p>
                            {order.shippingAddress.addressLine2 && (
                              <p className="text-slate-300">{order.shippingAddress.addressLine2}</p>
                            )}
                            <p className="text-slate-300">{order.shippingAddress.city}</p>
                            <p className="text-slate-300">
                              {order.shippingAddress.state} {order.shippingAddress.postalCode}
                            </p>
                            <p className="text-slate-300 font-medium">{order.shippingAddress.country}</p>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer - Compact */}
      <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-700/50 bg-slate-800/30">
        <button
          onClick={() => {
            setIsModalOpen(false);
            setSelectedCustomer(null);
            setDeliveryMethodFilter("all");
            setExpandedOrderId(null);
          }}
          className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition-all font-medium"
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
