"use client";

import { useState, useEffect } from "react";
import { shippingService, shippingHelpers } from "@/lib/services/shipping";
import { ShippingZone, CreateZoneDto } from "@/lib/types/shipping";
import { useToast } from "@/components/CustomToast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShippingZonesPage() {
  const toast = useToast();

  // ==================== STATE ====================
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "country" | "order">("order");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateZoneDto>({
    name: "",
    description: "",
    country: "GB",
    isActive: true,
    displayOrder: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchZones();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, sortBy, sortOrder]);

  // ==================== API CALLS ====================
  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await shippingService.getAllZones({
        params: { includeInactive: true },
      });

      if (response.data && response.data.success) {
        setZones(response.data.data || []);
      } else {
        toast.error("Failed to fetch zones");
      }
    } catch (error: any) {
      console.error("Error fetching zones:", error);
      toast.error(error.message || "Failed to fetch zones");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FORM VALIDATION ====================
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Zone name is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.country.trim()) {
      errors.country = "Country code is required";
    } else if (formData.country.length !== 2) {
      errors.country = "Country code must be 2 characters (e.g., GB, US)";
    }

    if (formData.displayOrder < 0) {
      errors.displayOrder = "Display order must be a positive number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleCreate = () => {
    setModalMode("create");
    setFormData({
      name: "",
      description: "",
      country: "GB",
      isActive: true,
      displayOrder: zones.length + 1,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (zone: ShippingZone) => {
    setModalMode("edit");
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description,
      country: zone.country,
      isActive: zone.isActive,
      displayOrder: zone.displayOrder,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setSubmitting(true);

      if (modalMode === "create") {
        const response = await shippingService.createZone(formData);
        if (response.data && response.data.success) {
          toast.success("✅ Zone created successfully!");
          setShowModal(false);
          fetchZones();
        }
      } else if (selectedZone) {
        const response = await shippingService.updateZone(selectedZone.id, formData);
        if (response.data && response.data.success) {
          toast.success("✅ Zone updated successfully!");
          setShowModal(false);
          fetchZones();
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await shippingService.deleteZone(id);
      if (response.data && response.data.success) {
        toast.success("🗑️ Zone deleted successfully!");
        setDeleteConfirmId(null);
        fetchZones();
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete zone. It may have associated rates.");
    }
  };

  // ==================== FILTERING & SORTING ====================
  const filteredAndSortedZones = zones
    .filter((zone) => {
      // Search filter
      const matchesSearch =
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.country.toLowerCase().includes(searchTerm.toLowerCase());

      // Active filter
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active" && zone.isActive) ||
        (filterActive === "inactive" && !zone.isActive);

      return matchesSearch && matchesActive;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "country") {
        comparison = a.country.localeCompare(b.country);
      } else if (sortBy === "order") {
        comparison = a.displayOrder - b.displayOrder;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // ==================== PAGINATION ====================
  const totalItems = filteredAndSortedZones.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentZones = filteredAndSortedZones.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // ==================== STATS ====================
  const stats = {
    total: zones.length,
    active: zones.filter((z) => z.isActive).length,
    inactive: zones.filter((z) => !z.isActive).length,
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Shipping Zones
            </h1>
            <p className="text-slate-400 dark:text-gray-500 mt-1">
              Manage delivery zones and regional settings
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Zone
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Total Zones</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Active Zones</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Inactive Zones</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-600" />
            <input
              type="text"
              placeholder="Search by name, description, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterActive("all")}
              className={cn(
                "px-4 py-2.5 rounded-lg font-medium transition-all",
                filterActive === "all"
                  ? "bg-violet-500 text-white"
                  : "bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterActive("active")}
              className={cn(
                "px-4 py-2.5 rounded-lg font-medium transition-all",
                filterActive === "active"
                  ? "bg-green-500 text-white"
                  : "bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setFilterActive("inactive")}
              className={cn(
                "px-4 py-2.5 rounded-lg font-medium transition-all",
                filterActive === "inactive"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white"
              )}
            >
              Inactive
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split("-") as [
                typeof sortBy,
                typeof sortOrder
              ];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="order-asc">Order: Low to High</option>
            <option value="order-desc">Order: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="country-asc">Country: A to Z</option>
            <option value="country-desc">Country: Z to A</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 dark:text-gray-500">Loading zones...</p>
          </div>
        ) : filteredAndSortedZones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-slate-800/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-600 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No zones found</h3>
            <p className="text-slate-400 dark:text-gray-500 max-w-sm">
              {searchTerm
                ? "Try adjusting your search or filters"
                : "Get started by creating your first shipping zone"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 dark:bg-gray-800/50 border-b border-slate-700 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Zone Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 dark:divide-gray-800">
                  {currentZones.map((zone) => (
                    <tr
                      key={zone.id}
                      className="hover:bg-slate-800/30 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{zone.name}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-600">
                              ID: {zone.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-300 dark:text-gray-400 max-w-xs truncate">
                          {zone.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm font-medium text-slate-300 dark:text-gray-400">
                            {zone.country}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          {zone.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-800/50 dark:bg-gray-800/50 rounded-lg text-sm font-semibold text-slate-300 dark:text-gray-400">
                          {zone.displayOrder}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(zone)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit Zone"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(zone.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 dark:border-gray-800 bg-slate-900/30 dark:bg-gray-900/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Results Info */}
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-400 dark:text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems}{" "}
                      results
                    </p>

                    {/* Items Per Page */}
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>

                  {/* Page Navigation */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => typeof page === "number" && goToPage(page)}
                          disabled={page === "..."}
                          className={cn(
                            "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                            page === currentPage
                              ? "bg-violet-500 text-white"
                              : page === "..."
                              ? "text-slate-500 cursor-default"
                              : "bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-gray-700"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 dark:border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "create" ? "Create New Zone" : "Edit Zone"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Zone Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                  Zone Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors({ ...formErrors, name: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                    formErrors.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                  )}
                  placeholder="e.g., UK Mainland"
                />
                {formErrors.name && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setFormErrors({ ...formErrors, description: "" });
                  }}
                  rows={3}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all resize-none",
                    formErrors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                  )}
                  placeholder="e.g., England, Wales, Southern Scotland"
                />
                {formErrors.description && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.description}
                  </p>
                )}
              </div>

              {/* Country Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                  Country Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.country}
                  onChange={(e) => {
                    setFormData({ ...formData, country: e.target.value.toUpperCase() });
                    setFormErrors({ ...formErrors, country: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all uppercase",
                    formErrors.country
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                  )}
                  placeholder="GB"
                />
                {formErrors.country && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.country}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500 dark:text-gray-600">
                  Use ISO 3166-1 alpha-2 code (e.g., GB, US, FR, DE)
                </p>
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                  Display Order <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => {
                    setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 });
                    setFormErrors({ ...formErrors, displayOrder: "" });
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                    formErrors.displayOrder
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                  )}
                />
                {formErrors.displayOrder && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.displayOrder}
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Zone Status</p>
                  <p className="text-xs text-slate-500 dark:text-gray-600 mt-0.5">
                    {formData.isActive ? "Zone is active and visible" : "Zone is inactive"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    formData.isActive ? "bg-green-500" : "bg-slate-700 dark:bg-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formData.isActive ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-800 dark:border-gray-800 bg-slate-900/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-slate-800 dark:bg-gray-800 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {modalMode === "create" ? "Create Zone" : "Update Zone"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Zone?</h3>
              <p className="text-slate-400 dark:text-gray-500 mb-6">
                Are you sure you want to delete this zone? This action cannot be undone. Make sure
                to delete all associated rates first.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 dark:bg-gray-800 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
