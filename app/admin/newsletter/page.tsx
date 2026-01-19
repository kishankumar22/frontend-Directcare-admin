// app/(dashboard)/newsletter/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Mail, CheckCircle, XCircle, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Loader2, UserPlus, Download, ChevronDown, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { newsletterService, NewsletterSubscription, NewsletterStats } from "@/lib/services/newsletter";
import * as XLSX from 'xlsx';

export default function NewsletterPage() {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [stats, setStats] = useState<NewsletterStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unsubscribeConfirm, setUnsubscribeConfirm] = useState<{ email: string } | null>(null);
  const [subscribeConfirm, setSubscribeConfirm] = useState<{ email: string } | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch ALL subscriptions ONCE on mount (for export functionality)
  const fetchAllSubscriptions = useCallback(async () => {
    try {
      const response = await newsletterService.getSubscriptions({
        page: 1,
        pageSize: 10000, // Large number to get all
      });
      const data = response.data?.data;
      
      if (data) {
        setAllSubscriptions(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching all subscriptions:", error);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await newsletterService.getStats();
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Fetch subscriptions with server-side pagination
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize: itemsPerPage,
      };

      if (activeFilter === "active") params.isActive = true;
      if (activeFilter === "inactive") params.isActive = false;
      if (searchTerm.trim()) params.searchEmail = searchTerm.trim();

      const response = await newsletterService.getSubscriptions(params);
      const data = response.data?.data;
      
      if (data) {
        setSubscriptions(data.items || []);
        setTotalItems(data.totalCount || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
      setSubscriptions([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, activeFilter, searchTerm, toast]);

  // Initial load - fetch all data once
  useEffect(() => {
    fetchStats();
    fetchAllSubscriptions();
  }, [fetchStats, fetchAllSubscriptions]);

  // Fetch subscriptions when dependencies change
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Handle Excel Export
  const handleExport = (exportAll: boolean) => {
    try {
      let dataToExport = exportAll ? allSubscriptions : [];

      // Apply filters if exporting filtered data
      if (!exportAll) {
        dataToExport = allSubscriptions.filter(sub => {
          const matchesSearch = searchTerm.trim() 
            ? sub.email.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
          
          const matchesActive = activeFilter === "all" 
            ? true 
            : activeFilter === "active" 
              ? sub.isActive 
              : !sub.isActive;

          return matchesSearch && matchesActive;
        });
      }

      if (dataToExport.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Format data for Excel
      const excelData = dataToExport.map((sub, index) => ({
        "S.No": index + 1,
        "Email": sub.email,
        "Status": sub.isActive ? "Active" : "Inactive",
        "Source": sub.source,
        "Subscribed At": new Date(sub.subscribedAt).toLocaleString(),
        "Created At": new Date(sub.createdAt).toLocaleString(),
        "ID": sub.id,
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 35 }, // Email
        { wch: 10 }, // Status
        { wch: 12 }, // Source
        { wch: 20 }, // Subscribed At
        { wch: 20 }, // Created At
        { wch: 38 }, // ID
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Newsletter Subscriptions");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Newsletter_Subscriptions_${exportAll ? 'All' : 'Filtered'}_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast.success(`✅ Exported ${dataToExport.length} subscriptions to Excel!`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export data");
    }
  };

  // Handle subscribe/reactivate
  const handleSubscribe = async (email: string) => {
    setIsSubscribing(true);
    try {
      const response = await newsletterService.subscribe(email);
      if (response.data?.success) {
        toast.success("User subscribed successfully! ✅");
        await Promise.all([
          fetchSubscriptions(),
          fetchAllSubscriptions(),
          fetchStats()
        ]);
      } else {
        toast.error(response.data?.message || "Failed to subscribe");
      }
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error(error?.response?.data?.message || "Failed to subscribe user");
    } finally {
      setIsSubscribing(false);
      setSubscribeConfirm(null);
    }
  };

  // Handle unsubscribe
  const handleUnsubscribe = async (email: string) => {
    setIsUnsubscribing(true);
    try {
      const response = await newsletterService.unsubscribe(email);
      if (response.data?.success) {
        toast.success("User unsubscribed successfully! 🗑️");
        await Promise.all([
          fetchSubscriptions(),
          fetchAllSubscriptions(),
          fetchStats()
        ]);
      } else {
        toast.error(response.data?.message || "Failed to unsubscribe");
      }
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      toast.error(error?.response?.data?.message || "Failed to unsubscribe user");
    } finally {
      setIsUnsubscribing(false);
      setUnsubscribeConfirm(null);
    }
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = activeFilter !== "all" || searchTerm.trim() !== "";

  // Calculate filtered count for export menu
  const filteredCount = allSubscriptions.filter(sub => {
    const matchesSearch = searchTerm.trim() 
      ? sub.email.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    const matchesActive = activeFilter === "all" 
      ? true 
      : activeFilter === "active" 
        ? sub.isActive 
        : !sub.isActive;

    return matchesSearch && matchesActive;
  }).length;

  // Pagination functions
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
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

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, activeFilter]); // Removed currentPage from dependencies

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + subscriptions.length;

  if (loading && subscriptions.length === 0) {
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
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Newsletter Management
          </h1>
          <p className="text-slate-400">Manage newsletter subscriptions</p>
        </div>

        {/* ✅ Export Button with Dropdown */}
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
              {/* Backdrop */}
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
                  disabled={filteredCount === 0}
                  className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm font-medium">Export Filtered Data</p>
                    <p className="text-xs text-slate-400">{filteredCount} subscriptions</p>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    handleExport(true);
                    setShowExportMenu(false);
                  }}
                  disabled={allSubscriptions.length === 0}
                  className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-sm font-medium">Export All Data</p>
                    <p className="text-xs text-slate-400">{allSubscriptions.length} subscriptions</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Subscriptions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Subscriptions</p>
              <p className="text-white text-2xl font-bold">{stats.totalSubscriptions}</p>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Active</p>
              <p className="text-white text-2xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </div>
        </div>

        {/* Inactive Subscriptions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Inactive</p>
              <p className="text-white text-2xl font-bold">{stats.inactiveSubscriptions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page Selector */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
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
            Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} entries
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
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
            {/* Active Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                activeFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Clear Filters Button */}
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

          {/* Results Count */}
          <div className="text-sm text-slate-400 whitespace-nowrap ml-auto">
            {totalItems} subscription{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Email</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Source</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Subscribed At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{subscription.email}</p>
                          <p className="text-xs text-slate-500">{subscription.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        subscription.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {subscription.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm capitalize">{subscription.source}</td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {new Date(subscription.subscribedAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {new Date(subscription.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {subscription.isActive ? (
                          <button
                            onClick={() => setUnsubscribeConfirm({ email: subscription.email })}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs font-medium flex items-center gap-1.5"
                            title="Unsubscribe"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Unsubscribe
                          </button>
                        ) : (
                          <button
                            onClick={() => setSubscribeConfirm({ email: subscription.email })}
                            className="px-3 py-1.5 bg-green-500/10 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/20 transition-all text-xs font-medium flex items-center gap-1.5"
                            title="Reactivate Subscription"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Reactivate
                          </button>
                        )}
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
              Total: {totalItems} items
            </div>
          </div>
        </div>
      )}

      {/* Subscribe/Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!subscribeConfirm}
        onClose={() => setSubscribeConfirm(null)}
        onConfirm={() => subscribeConfirm && handleSubscribe(subscribeConfirm.email)}
        title="Reactivate Subscription"
        message={`Are you sure you want to reactivate the subscription for "${subscribeConfirm?.email}"? They will start receiving newsletters again.`}
        confirmText="Reactivate"
        cancelText="Cancel"
        icon={UserPlus}
        iconColor="text-green-400"
        confirmButtonStyle="bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/50"
        isLoading={isSubscribing}
      />

      {/* Unsubscribe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!unsubscribeConfirm}
        onClose={() => setUnsubscribeConfirm(null)}
        onConfirm={() => unsubscribeConfirm && handleUnsubscribe(unsubscribeConfirm.email)}
        title="Unsubscribe User"
        message={`Are you sure you want to unsubscribe "${unsubscribeConfirm?.email}"? This action will mark them as inactive.`}
        confirmText="Unsubscribe"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isUnsubscribing}
      />
    </div>
  );
}
