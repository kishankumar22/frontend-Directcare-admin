"use client";

import { useEffect, useState, useMemo, useCallback } from "react"; // ✅ Added useMemo, useCallback
import { 
  Plus, Edit, Trash2, Eye, RefreshCw, 
  Search, FilterX, AlertCircle, Calendar, Tag, 
  Loader2,
  PackageOpen
} from "lucide-react";

import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import {
  DeliveryStrip,
  deliveryStripService,
} from "@/lib/services/DeliveryStrip";
import DeliveryStripFormModal from "./DeliveryStripFormModal";
import { useDebounce } from "../_hooks/useDebounce";

export default function DeliveryStripPage() {
  const toast = useToast();

  const [data, setData] = useState<DeliveryStrip[]>([]);
  const [filteredData, setFilteredData] = useState<DeliveryStrip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Modal states
  const [viewing, setViewing] = useState<DeliveryStrip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DeliveryStrip | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeliveryStrip | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DeliveryStrip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // ================= useMemo FOR STATS =================
  // ✅ Stats calculation - only recalculates when data changes
  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter(s => s.isActive).length,
    inactive: data.filter(s => !s.isActive).length,
  }), [data]);

  // ================= useMemo FOR FILTERED DATA =================
  // ✅ Filter logic - only recalculates when dependencies change
  const filteredDataMemo = useMemo(() => {
    let filtered = [...data];
    
    // Apply search filter (using debounced value)
    if (debouncedSearchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item =>
        statusFilter === "active" ? item.isActive : !item.isActive
      );
    }
    
    return filtered;
  }, [data, debouncedSearchTerm, statusFilter]);

  // Update filteredData state when memoized value changes
  useEffect(() => {
    setFilteredData(filteredDataMemo);
  }, [filteredDataMemo]);

  
  // ================= useCallback FOR HANDLERS =================
  // ✅ Fetch data - stable reference
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryStripService.getAll();
      if (res.data?.success) {
        setData(res.data.data || []);
      } else {
        toast.error(res.data?.message || "Failed to fetch data");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Delete handler - stable reference
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await deliveryStripService.delete(deleteConfirm.id);
      if (res.data?.success) {
        toast.success(res.data.message || "Deleted successfully");
        setDeleteConfirm(null);
        fetchData();
      } else {
        toast.error(res.data?.message || "Delete failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, fetchData]);

  // ✅ Toggle handler - stable reference
  const handleToggle = useCallback(async () => {
    if (!toggleConfirm) return;
    setIsToggling(true);
    try {
      const res = await deliveryStripService.toggle(toggleConfirm.id);
      if (res.data?.success) {
        toast.success(res.data.message || "Status updated successfully");
        setToggleConfirm(null);
        fetchData();
      } else {
        toast.error(res.data?.message || "Toggle failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Toggle failed");
    } finally {
      setIsToggling(false);
    }
  }, [toggleConfirm, fetchData]);

  // ✅ Clear filters - stable reference
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
  }, []);

  // ✅ Open add modal - stable reference
  const handleAddNew = useCallback(() => {
    setEditing(null);
    setShowModal(true);
  }, []);

  // ✅ Open edit modal - stable reference
  const handleEdit = useCallback((item: DeliveryStrip) => {
    setEditing(item);
    setShowModal(true);
  }, []);

  // ✅ Close modal - stable reference
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
  }, []);

  // ✅ Modal success handler - stable reference
  const handleModalSuccess = useCallback(() => {
    fetchData();
    setShowModal(false);
    setEditing(null);
  }, [fetchData]);

  // ================= EFFECTS =================
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search loader effect
  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 500);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm]);

  // Check if any filters are active
  const hasActiveFilters = searchTerm.trim() !== "" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Loading delivery strips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Delivery Strip Management
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage delivery options and their details
          </p>
        </div>
        <button
          onClick={handleAddNew} // ✅ Using useCallback
          className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-md flex items-center gap-1.5 hover:opacity-90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Delivery Strip
        </button>
      </div>

      {/* Stats Cards - Using memoized stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-500/10 rounded-md flex items-center justify-center">
              <Tag className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Total Options</p>
              <p className="text-lg font-semibold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-md flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Active</p>
              <p className="text-lg font-semibold text-green-400">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-500/10 rounded-md flex items-center justify-center">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Inactive</p>
              <p className="text-lg font-semibold text-slate-400">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

{/* Search and Filters */}
<div className="bg-slate-900/40 border border-slate-800 rounded-lg px-3 py-2">
  <div className="flex flex-wrap items-center gap-2">
    
    {/* Search with Loader */}
    <div className="relative flex-1 min-w-[220px]">
      <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${
        isSearching ? "text-violet-400" : "text-slate-500"
      }`} />
      
      <input
        type="search"
        placeholder="Search by title or subtitle..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-8 pr-8 py-1.5 bg-slate-800/60 border border-slate-700 rounded-md text-white text-[12px] focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
      />
      
      {/* Loader Icon */}
      {isSearching && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
        </div>
      )}
    </div>

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className={`p-2 text-[11px] rounded-md border bg-slate-800/60 cursor-pointer transition-all ${
        statusFilter !== "all"
          ? "border-blue-500 ring-1 ring-blue-500/40 text-white"
          : "border-slate-700 text-slate-300 hover:border-slate-600"
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
        className="p-2 text-[11px] bg-red-500/10 border border-red-500/40 text-red-400 rounded-md hover:bg-red-500/20 hover:border-red-500/60 transition-all flex items-center gap-1"
      >
        <FilterX className="h-3 w-3" />
        Clear Filters
      </button>
    )}

    {/* Result Count Badge */}
    <div className="ml-auto">
      <div className="px-2 py-1 bg-slate-800/60 rounded-md border border-slate-700">
        <span className="text-[11px] text-slate-400">
          <span className="text-white font-medium">{filteredData.length}</span>
          {' '}of{' '}
          <span className="text-white font-medium">{data.length}</span>
          {' '}strips
        </span>
      </div>
    </div>

  </div>
</div>

      {/* List View */}
{/* List View - Improved */}
<div className="space-y-3">
  {filteredData.length === 0 ? (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl text-center py-12 px-4">
      {data.length === 0 ? (
        <div className="space-y-3">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
            <PackageOpen className="h-8 w-8 text-slate-500" />
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium">No delivery strips found</p>
            <p className="text-slate-500 text-xs mt-1">Get started by creating your first delivery option</p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs rounded-lg hover:opacity-90 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Delivery Strip
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
            <Search className="h-8 w-8 text-slate-500" />
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium">No matches found</p>
            <p className="text-slate-500 text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition-all"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3">
      {filteredData.map((item, index) => (
        <div
          key={item.id}
          className="group relative bg-slate-900/40 border border-slate-800 rounded-xl hover:bg-slate-800/40 hover:border-slate-700 transition-all duration-200"
          style={{
            animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
            
            {/* Left Section - Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Title */}
                <h3 className="text-white text-sm font-semibold truncate group-hover:text-violet-400 transition-colors"   onClick={() => setViewing(item)}>
                  {item.title}
                </h3>
                
                {/* Display Order Badge */}
                {item.displayOrder !== null && item.displayOrder !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                    <Tag className="h-2.5 w-2.5" />
                    Order #{item.displayOrder}
                  </span>
                )}
                
                {/* Slug Badge */}
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-slate-800/50 rounded-full text-slate-500">
                  <span className="font-mono">/{item.slug}</span>
                </span>
              </div>
              
              {/* Subtitle */}
              {item.subtitle && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {item.subtitle}
                </p>
              )}
              
              {/* Meta Info Row */}
              <div className="flex items-center gap-3 mt-2">
                {item.icon && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="text-cyan-400">Icon:</span> {item.icon}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="text-green-400">Cards:</span> {item.featureCards?.length || 0}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="text-amber-400">Points:</span> {item.infoPoints?.length || 0}
                </span>
              </div>
            </div>

            {/* Right Section - Status & Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              
              {/* Status Badge with Toggle */}
              <button
                onClick={() => setToggleConfirm(item)}
                className={`group/status relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  item.isActive
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <span className={`relative flex h-1.5 w-1.5 rounded-full ${item.isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {item.isActive ? "Active" : "Inactive"}
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* View Button */}
                <button
                  onClick={() => setViewing(item)}
                  className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all duration-200"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {/* Edit Button */}
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-200"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={() => setDeleteConfirm(item)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
          </div>
          
          {/* Hover Border Effect */}
          <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-transparent group-hover:ring-violet-500/20 transition-all duration-200" />
        </div>
      ))}
    </div>
  )}
</div>



      {/* FORM MODAL */}
      {showModal && (
        <DeliveryStripFormModal
          editing={editing}
          onClose={handleCloseModal} // ✅ Using useCallback
          onSuccess={handleModalSuccess} // ✅ Using useCallback
        />
      )}


{/* ================= VIEW MODAL ================= */}
{viewing && (
  <div
    className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={() => setViewing(null)}
  >
    <div
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {viewing.title}
          </h2>
          <button
            onClick={() => setViewing(null)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

      </div>

      <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)] space-y-5">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/30 p-3 rounded-xl">
            <p className="text-[11px] text-slate-500">Subtitle</p>
            <p className="text-sm text-white">{viewing.subtitle || "—"}</p>
          </div>
          <div className="bg-slate-800/30 p-3 rounded-xl">
            <p className="text-[11px] text-slate-500">Slug</p>
            <p className="text-sm text-white">{viewing.slug || "—"}</p>
          </div>
          <div className="bg-slate-800/30 p-3 rounded-xl">
            <p className="text-[11px] text-slate-500">Icon</p>
            <p className="text-sm text-white">{viewing.icon || "—"}</p>
          </div>
          <div className="bg-slate-800/30 p-3 rounded-xl">
            <p className="text-[11px] text-slate-500">Display Order</p>
            <p className="text-sm text-white">
              {viewing.displayOrder !== null && viewing.displayOrder !== undefined 
                ? viewing.displayOrder 
                : "—"}
            </p>
          </div>
        </div>

        {/* Page Information */}
        <div className="bg-slate-800/30 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-white mb-2">Page Information</h3>
          <p className="text-sm text-white font-medium">{viewing.pageTitle || "—"}</p>
          <p className="text-xs text-slate-400 mt-1">{viewing.pageSubtitle || "—"}</p>
        </div>

        {/* Feature Cards */}
        {viewing.featureCards && viewing.featureCards.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Feature Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {viewing.featureCards.map((card, idx) => (
                <div key={idx} className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                  <p className="text-xs font-semibold text-cyan-400">{card.icon || "📦"}</p>
                  <p className="text-sm text-white font-medium mt-1">{card.heading}</p>
                  <p className="text-xs text-slate-400 mt-1">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Points */}
        {viewing.infoPoints && viewing.infoPoints.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              {viewing.infoSectionTitle || "Important Information"}
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {viewing.infoPoints.map((point, idx) => (
                <li key={idx} className="text-xs text-slate-300">{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* JSON Preview */}
        {viewing.pageContentJson && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Content JSON</h3>
            <pre className="bg-slate-900 p-3 rounded-xl text-xs text-slate-400 overflow-auto   max-h-70">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(viewing.pageContentJson), null, 2);
                } catch {
                  return viewing.pageContentJson;
                }
              })()}
            </pre>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          <p>Created: {new Date(viewing.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(viewing.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 p-4 border-t border-slate-800">
        <button
          onClick={() => {
            setEditing(viewing);
            setShowModal(true);
            setViewing(null);
          }}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => setViewing(null)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete} // ✅ Using useCallback
        title="Delete Delivery Strip"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isLoading={isDeleting}
      />
{/* Add this CSS to your global.css or component */}
<style jsx>{`
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
      {/* TOGGLE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        onConfirm={handleToggle} // ✅ Using useCallback
        title="Change Status"
        message={`Are you sure you want to ${toggleConfirm?.isActive ? "deactivate" : "activate"} "${toggleConfirm?.title}"?`}
        confirmText={isToggling ? "Updating..." : "Yes, Change"}
        cancelText="Cancel"
        isLoading={isToggling}
      />
    </div>
  );
}