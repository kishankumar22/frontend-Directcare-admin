// app/(dashboard)/newsletter/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Mail, CheckCircle, XCircle, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Loader2, UserPlus, Download, ChevronDown, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
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
<div className="flex flex-wrap items-center justify-between gap-3">

  <div>
    <h1 className="text-xl font-semibold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
      Newsletter Management
    </h1>
    <p className="text-[11px] text-slate-500">
      Manage subscriptions
    </p>
  </div>

  {/* Export */}
  <div className="relative">
    <button 
      onClick={() => setShowExportMenu(!showExportMenu)}
      className="px-3 py-1.5 text-[11px] bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md flex items-center gap-1.5 hover:opacity-90"
    >
      <Download className="w-3.5 h-3.5" />
      Export
      <ChevronDown className="w-3.5 h-3.5" />
    </button>

    {showExportMenu && (
      <>
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowExportMenu(false)}
        />

        <div className="absolute right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">

          <button
            onClick={() => {
              handleExport(false);
              setShowExportMenu(false);
            }}
            disabled={filteredCount === 0}
            className="w-full px-3 py-2 text-left text-[12px] text-white hover:bg-slate-700 flex items-center gap-2 border-b border-slate-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
            Filtered ({filteredCount})
          </button>

          <button
            onClick={() => {
              handleExport(true);
              setShowExportMenu(false);
            }}
            disabled={allSubscriptions.length === 0}
            className="w-full px-3 py-2 text-left text-[12px] text-white hover:bg-slate-700 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            All ({allSubscriptions.length})
          </button>

        </div>
      </>
    )}
  </div>
</div>


{/* Stats (COMPACT) */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

  {/* Total */}
  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-violet-500/10 rounded-md flex items-center justify-center">
        <Mail className="h-4 w-4 text-violet-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500">Total</p>
        <p className="text-lg font-semibold text-white">
          {stats.totalSubscriptions}
        </p>
      </div>
    </div>
  </div>

  {/* Active */}
  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-green-500/10 rounded-md flex items-center justify-center">
        <CheckCircle className="h-4 w-4 text-green-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500">Active</p>
        <p className="text-lg font-semibold text-white">
          {stats.activeSubscriptions}
        </p>
      </div>
    </div>
  </div>

  {/* Inactive */}
  <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-red-500/10 rounded-md flex items-center justify-center">
        <XCircle className="h-4 w-4 text-red-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500">Inactive</p>
        <p className="text-lg font-semibold text-white">
          {stats.inactiveSubscriptions}
        </p>
      </div>
    </div>
  </div>

</div>


{/* Items Per Page (COMPACT SAME AS ALL PAGES) */}
<div className="bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2">

  <div className="flex items-center justify-between gap-2 flex-wrap">

    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500">Show</span>

      <select
        value={itemsPerPage}
        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
        className="px-2 py-1 bg-slate-800/60 border border-slate-700 rounded-md text-white text-[11px]"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={75}>75</option>
        <option value={100}>100</option>
      </select>

      <span className="text-[11px] text-slate-500">per page</span>
    </div>

    <div className="text-[11px] text-slate-500">
      <span className="text-white font-medium">
        {totalItems > 0 ? startIndex + 1 : 0}
      </span>
      {" – "}
      <span className="text-white font-medium">
        {endIndex}
      </span>
      {" of "}
      <span className="text-white font-medium">
        {totalItems}
      </span>
    </div>

  </div>
</div>

 
{/* Search + Filters (COMPACT) */}
<div className="bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2">

  <div className="flex flex-wrap items-center gap-2">

    {/* Search */}
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
      <input
        type="search"
        placeholder="Search email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-md text-white text-[12px] focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
    </div>

    {/* Status Filter */}
    <select
      value={activeFilter}
      onChange={(e) => setActiveFilter(e.target.value)}
      className={`p-2 text-[11px] rounded-md border bg-slate-800/60 ${
        activeFilter !== "all"
          ? "border-blue-500 ring-1 ring-blue-500/40 text-white"
          : "border-slate-700 text-slate-300"
      }`}
    >
      <option value="all">Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>

    {/* Clear */}
    {hasActiveFilters && (
      <button
        onClick={clearFilters}
        className="p-2 text-[11px] bg-red-500/10 border border-red-500/40 text-red-400 rounded-md hover:bg-red-500/20 flex items-center gap-1"
      >
        <FilterX className="h-3 w-3" />
        Clear
      </button>
    )}

    {/* Count */}
    <div className="ml-auto text-[11px] text-slate-500">
      {totalItems} subscriptions
    </div>
  </div>
</div>


{/* Table */}
<div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">

  {loading ? (
    <div className="text-center py-10">
      <Loader2 className="h-8 w-8 text-violet-500 animate-spin mx-auto mb-2" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  ) : subscriptions.length === 0 ? (
    <div className="text-center py-10">
      <Mail className="h-10 w-10 text-slate-600 mx-auto mb-2" />
      <p className="text-slate-400 text-sm">No subscriptions</p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">

        {/* HEADER */}
        <thead className="bg-slate-800/40">
          <tr className="border-b border-slate-800">
            <th className="text-left py-2 px-3 text-[11px] text-slate-400">Email</th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-400">Status</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-400">Source</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-400">Subscribed At</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-400">Created On</th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-400">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {subscriptions.map((subscription) => (
            <tr
              key={subscription.id}
              className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
            >

              {/* EMAIL */}
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Mail className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-white text-[12px] truncate">
                    {subscription.email}
                  </p>
                </div>
              </td>

              {/* STATUS */}
              <td className="py-2 px-3 text-center">
                <span className={`p-2 rounded-md text-[10px] ${
                  subscription.isActive
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {subscription.isActive ? "Active" : "Inactive"}
                </span>
              </td>

              {/* SOURCE */}
              <td className="py-2 px-3 text-[11px] text-slate-300 capitalize">
                {subscription.source}
              </td>

              {/* SUBSCRIBED */}
              <td className="py-2 px-3 text-[11px] text-slate-400">
                {new Date(subscription.subscribedAt).toLocaleDateString()}
              </td>

              {/* CREATED */}
              <td className="py-2 px-3 text-[11px] text-slate-400">
                {new Date(subscription.createdAt).toLocaleDateString()}
              </td>

              {/* ACTIONS */}
              <td className="py-2 px-3 text-center">
                {subscription.isActive ? (
                  <button
                    onClick={() => setUnsubscribeConfirm({ email: subscription.email })}
                    className="px-2 py-1 text-[10px] bg-red-500/10 border border-red-500/40 text-red-400 rounded-md hover:bg-red-500/20"
                  >
                    Unsubscribe
                  </button>
                ) : (
                  <button
                    onClick={() => setSubscribeConfirm({ email: subscription.email })}
                    className="px-2 py-1 text-[10px] bg-green-500/10 border border-green-500/40 text-green-400 rounded-md hover:bg-green-500/20"
                  >
                    Reactivate
                  </button>
                )}
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
  <div className="bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2">

    <div className="flex items-center justify-between text-[11px] text-slate-400">

      <span>
        Page {currentPage} / {totalPages}
      </span>

      <div className="flex items-center gap-1">

        <button onClick={goToPreviousPage}>
          <ChevronLeft className="h-3 w-3" />
        </button>

        <button onClick={goToNextPage}>
          <ChevronRight className="h-3 w-3" />
        </button>

      </div>

      <span>{totalItems} items</span>

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
