"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { shippingService, shippingHelpers } from "@/lib/services/shipping";
import { ShippingMethod, CreateMethodDto } from "@/lib/types/shipping";
import { useToast } from "@/app/admin/_component/CustomToast";
import { useRouter } from "next/navigation"; // ✅ App Router import
import { Plus, Edit, Trash2, Search, Truck, CheckCircle, XCircle, Loader2, AlertCircle, X, Save, Clock, FileSignature, Navigation, ChevronLeft, ChevronRight, Eye, ChevronDown, FilterX, Package, MapPin, Calendar, Hash, PoundSterling, RotateCcw,} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "../../_component/ConfirmDialog";

// ==================== UTILITY FUNCTIONS ====================

// Input Sanitization
const sanitizeInput = (value: string): string => {
  return value.trim().replace(/<script.*?>.*?<\/script>/gi, ""); // XSS Protection
};

// Retry Logic
const fetchWithRetry = async <T,>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === retries - 1) throw error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
};

// ==================== CUSTOM HOOKS ====================

// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ==================== MAIN COMPONENT ====================

export default function ShippingMethodsPage() {
  const toast = useToast();
   const router = useRouter();

  // ==================== STATE ====================
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter Dropdown States
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterTracking, setFilterTracking] = useState<"all" | "tracked" | "untracked">("all");
  const [sortBy, setSortBy] = useState<"name" | "carrier" | "deliveryTime" | "order">("order");

  // Dropdown References
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTrackingDropdown, setShowTrackingDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const trackingDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
const [deletedFilter, setDeletedFilter] = useState<"notDeleted" | "deleted">("notDeleted");
const [statusConfirm, setStatusConfirm] = useState<ShippingMethod | null>(null);
const [restoreConfirm, setRestoreConfirm] = useState<ShippingMethod | null>(null);

  // Debounced Search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Double Submit Prevention
  const [submitting, setSubmitting] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateMethodDto>({
    name: "",
    displayName: "",
    description: "",
    carrierCode: "",
    serviceCode: "",
    deliveryTimeMinDays: 0,
    deliveryTimeMaxDays: 0,
    trackingSupported: false,
    signatureRequired: false,
    isActive: true,
    displayOrder: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchMethods();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, filterTracking, sortBy]);

  // Click Outside - Status Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showStatusDropdown]);

  // Click Outside - Tracking Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trackingDropdownRef.current && !trackingDropdownRef.current.contains(event.target as Node)) {
        setShowTrackingDropdown(false);
      }
    };

    if (showTrackingDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTrackingDropdown]);

  // Click Outside - Sort Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSortDropdown]);

  // ==================== API CALLS WITH RETRY ====================

const fetchMethods = async () => {
  try {
    setLoading(true);

    const params: any = {
      includeInactive: true,
    };

    if (deletedFilter === "deleted") {
      params.isDeleted = true;
    } else {
      params.isDeleted = false;

      if (filterStatus === "active") {
        params.isActive = true;
      }

      if (filterStatus === "inactive") {
        params.isActive = false;
      }
    }

    console.log("🔥 METHODS API PARAMS:", params);

    const response = await shippingService.getAllMethods({ params });

    if (response.data?.success) {
      setMethods(response.data.data || []);
    } else {
      setMethods([]);
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to fetch methods");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchMethods();
}, [filterStatus, deletedFilter]);

const handleStatusToggle = async () => {
  if (!statusConfirm) return;

  try {
    const method = methods.find(m => m.id === statusConfirm.id);
    if (!method) {
      toast.error("Method not found");
      return;
    }

    await shippingService.updateMethod(method.id, {
      name: method.name,
      displayName: method.displayName,
      description: method.description,
      carrierCode: method.carrierCode,
      serviceCode: method.serviceCode,
      deliveryTimeMinDays: method.deliveryTimeMinDays,
      deliveryTimeMaxDays: method.deliveryTimeMaxDays,
      trackingSupported: method.trackingSupported,
      signatureRequired: method.signatureRequired,
      isActive: !method.isActive,
      displayOrder: method.displayOrder,
    });

    toast.success("Status updated successfully");
    setStatusConfirm(null);
    fetchMethods();

  } catch (error: any) {
    toast.error(error.message || "Failed to update status");
  }
};

const handleRestore = async () => {
  if (!restoreConfirm) return;

  try {
    await shippingService.restoreMethod(restoreConfirm.id);
    toast.success("Method restored successfully");
    setRestoreConfirm(null);
    fetchMethods();
  } catch (error: any) {
    toast.error(error.message || "Failed to restore method");
  }
};

  // ==================== ENHANCED FORM VALIDATION ====================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Method Name (Internal)
    if (!formData.name.trim()) {
      errors.name = "Method name is required";
    } else if (formData.name.length < 3) {
      errors.name = "Method name must be at least 3 characters";
    } else if (formData.name.length > 100) {
      errors.name = "Method name cannot exceed 100 characters";
    } else if (!/^[a-z0-9-_]+$/i.test(formData.name)) {
      errors.name = "Method name can only contain letters, numbers, hyphens, and underscores";
    }

    // Display Name
    if (!formData.displayName.trim()) {
      errors.displayName = "Display name is required";
    } else if (formData.displayName.length < 3) {
      errors.displayName = "Display name must be at least 3 characters";
    } else if (formData.displayName.length > 100) {
      errors.displayName = "Display name cannot exceed 100 characters";
    }

    // Description
    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    } else if (formData.description.length > 500) {
      errors.description = "Description cannot exceed 500 characters";
    }

    // Carrier Code
    if (!formData.carrierCode.trim()) {
      errors.carrierCode = "Carrier code is required";
    } else if (formData.carrierCode.length < 2) {
      errors.carrierCode = "Carrier code must be at least 2 characters";
    } else if (formData.carrierCode.length > 50) {
      errors.carrierCode = "Carrier code cannot exceed 50 characters";
    }

    // Service Code
    if (!formData.serviceCode.trim()) {
      errors.serviceCode = "Service code is required";
    } else if (formData.serviceCode.length < 2) {
      errors.serviceCode = "Service code must be at least 2 characters";
    } else if (formData.serviceCode.length > 50) {
      errors.serviceCode = "Service code cannot exceed 50 characters";
    }

    // Delivery Time Validation
    if (formData.deliveryTimeMinDays < 0) {
      errors.deliveryTimeMinDays = "Minimum delivery days must be positive";
    } else if (formData.deliveryTimeMinDays > 365) {
      errors.deliveryTimeMinDays = "Minimum delivery days cannot exceed 365";
    }

    if (formData.deliveryTimeMaxDays < 0) {
      errors.deliveryTimeMaxDays = "Maximum delivery days must be positive";
    } else if (formData.deliveryTimeMaxDays > 365) {
      errors.deliveryTimeMaxDays = "Maximum delivery days cannot exceed 365";
    }

    if (formData.deliveryTimeMaxDays < formData.deliveryTimeMinDays) {
      errors.deliveryTimeMaxDays = "Maximum days must be greater than or equal to minimum days";
    }

    // Display Order
    if (formData.displayOrder < 0) {
      errors.displayOrder = "Display order must be positive";
    } else if (formData.displayOrder > 9999) {
      errors.displayOrder = "Display order cannot exceed 9999";
    }

    // Check for duplicate method name (only in create mode)
    if (modalMode === "create") {
      const duplicate = methods.find(
        (m) => m.name.toLowerCase() === formData.name.toLowerCase()
      );
      if (duplicate) {
        errors.name = "A method with this name already exists";
      }
    } else if (selectedMethod) {
      // In edit mode, check if name conflicts with other methods
      const duplicate = methods.find(
        (m) => m.id !== selectedMethod.id && m.name.toLowerCase() === formData.name.toLowerCase()
      );
      if (duplicate) {
        errors.name = "A method with this name already exists";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLERS WITH useCallback ====================

  const handleCreate = useCallback(() => {
    setModalMode("create");
    setFormData({
      name: "",
      displayName: "",
      description: "",
      carrierCode: "",
      serviceCode: "",
      deliveryTimeMinDays: 0,
      deliveryTimeMaxDays: 0,
      trackingSupported: false,
      signatureRequired: false,
      isActive: true,
      displayOrder: methods.length + 1,
    });
    setFormErrors({});
    setShowModal(true);
  }, [methods.length]);

  const handleEdit = useCallback((method: ShippingMethod) => {
    setModalMode("edit");
    setSelectedMethod(method);
    setFormData({
      name: method.name,
      displayName: method.displayName,
      description: method.description,
      carrierCode: method.carrierCode,
      serviceCode: method.serviceCode,
      deliveryTimeMinDays: method.deliveryTimeMinDays,
      deliveryTimeMaxDays: method.deliveryTimeMaxDays,
      trackingSupported: method.trackingSupported,
      signatureRequired: method.signatureRequired,
      isActive: method.isActive,
      displayOrder: method.displayOrder,
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleView = useCallback((method: ShippingMethod) => {
    setSelectedMethod(method);
    setShowViewModal(true);
  }, []);

  // Submit with Enhanced Error Handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) {
      console.log("Submit already in progress, ignoring...");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setSubmitting(true);

      // Timeout protection
      submitTimeoutRef.current = setTimeout(() => {
        console.warn("Submit timeout reached, resetting...");
        setSubmitting(false);
      }, 10000);

      if (modalMode === "create") {
        const response = await fetchWithRetry(() =>
          shippingService.createMethod(formData)
        );

        if (response.data && response.data.success) {
          toast.success("✅ Method created successfully!");
          setShowModal(false);
          fetchMethods();
        }
      } else if (selectedMethod) {
        const response = await fetchWithRetry(() =>
          shippingService.updateMethod(selectedMethod.id, formData)
        );

        if (response.data && response.data.success) {
          toast.success("✅ Method updated successfully!");
          setShowModal(false);
          fetchMethods();
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);

      // Enhanced Error Handling
      if (error.response?.status === 409) {
        toast.error("Method with this name already exists");
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || "Invalid data provided");
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Insufficient permissions");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please try again later");
      } else {
        toast.error(error.message || "Operation failed");
      }
    } finally {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetchWithRetry(() =>
        shippingService.deleteMethod(id)
      );

      if (response.data && response.data.success) {
        toast.success("🗑️ Method deleted successfully!");
        setDeleteConfirmId(null);
        fetchMethods();
      }
    } catch (error: any) {
      console.error("Delete error:", error);

      // Enhanced Error Handling
      if (error.response?.status === 404) {
        toast.error("Method not found");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Cannot delete this method");
      } else if (error.response?.status === 409) {
        toast.error("Cannot delete method. Please remove associated rates first");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please try again later");
      } else {
        toast.error(error.message || "Failed to delete method");
      }
    }
  };

  // Clear All Filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterTracking("all");
    setSortBy("order");
  }, []);

  // Check if filters are active
 const hasActiveFilters =
  searchTerm !== "" ||
  filterStatus !== "all" ||
  filterTracking !== "all" ||
  deletedFilter !== "notDeleted" ||
  sortBy !== "order";
 

  // ==================== FILTERING & SORTING WITH MEMOIZATION ====================

  const filteredAndSortedMethods = useMemo(() => {
    return methods
      .filter((method) => {
        // Search filter
        const matchesSearch =
          method.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          method.displayName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          method.carrierCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          method.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

        // Status filter
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" && method.isActive) ||
          (filterStatus === "inactive" && !method.isActive);

        // Tracking filter
        const matchesTracking =
          filterTracking === "all" ||
          (filterTracking === "tracked" && method.trackingSupported) ||
          (filterTracking === "untracked" && !method.trackingSupported);

        return matchesSearch && matchesStatus && matchesTracking;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortBy === "name") {
          comparison = a.displayName.localeCompare(b.displayName);
        } else if (sortBy === "carrier") {
          comparison = a.carrierCode.localeCompare(b.carrierCode);
        } else if (sortBy === "deliveryTime") {
          comparison = a.deliveryTimeMinDays - b.deliveryTimeMinDays;
        } else if (sortBy === "order") {
          comparison = a.displayOrder - b.displayOrder;
        }

        return comparison;
      });
  }, [methods, debouncedSearchTerm, filterStatus, filterTracking, sortBy]);

  // ==================== PAGINATION ====================

  const totalItems = filteredAndSortedMethods.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMethods = filteredAndSortedMethods.slice(startIndex, endIndex);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const getPageNumbers = useMemo(() => {
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
  }, [currentPage, totalPages]);

  // ==================== STATS WITH MEMOIZATION ====================

  const stats = useMemo(
    () => ({
      total: methods.length,
      active: methods.filter((m) => m.isActive).length,
      tracked: methods.filter((m) => m.trackingSupported).length,
      signature: methods.filter((m) => m.signatureRequired).length,
    }),
    [methods]
  );

  // ==================== RENDER ====================

  return (
    <div className="space-y-2">
      {/* Header */}
<div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Shipping Methods
            </h1>
            <p className="text-slate-400 dark:text-gray-500 mt-1">
              Manage carriers and delivery services
            </p>
          </div>
          
          {/* Navigation & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Navigation Button: Zones */}
            <button
              onClick={() => router.push('/admin/shipping/zones')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              title="go to zones page"
            >
              <MapPin className="w-4 h-4" />
              Zones
            </button>

            {/* Navigation Button: Rates */}
            <button
              onClick={() => router.push('/admin/shipping/rates')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            title="go to rates page"
            >
              <PoundSterling className="w-4 h-4" />
              Rates
            </button>

            {/* Action Button: Add Method */}
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            title="Add a new shipping method"
            >
              <Plus className="w-4 h-4" />
              Add Method
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Methods */}
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Total Methods</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          </div>

          {/* Active Methods */}
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Active Methods</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          

          {/* With Tracking */}
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">With Tracking</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.tracked}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Navigation className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Signature Required */}
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Signature Required</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.signature}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <FileSignature className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* FILTERS SECTION - ALL IN ONE ROW */}
   <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-3 py-2 relative z-20">
  <div className="flex flex-wrap items-center gap-4">

    {/* ================= SEARCH ================= */}
    <div className="flex-1 min-w-[280px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, carrier, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(sanitizeInput(e.target.value))}
          className="w-full pl-10 pr-4 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {searchTerm !== "" && debouncedSearchTerm !== searchTerm && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
        )}
      </div>
    </div>

    {/* ================= RESULTS COUNT ================= */}
    <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg whitespace-nowrap">
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-sm">
        <span className="font-bold text-cyan-400">
          {filteredAndSortedMethods.length}
        </span>
        <span className="text-slate-400 ml-1">
          {filteredAndSortedMethods.length === 1 ? "result" : "results"}
        </span>
      </span>
    </div>

    {/* ================= STATUS FILTER ================= */}
    <select
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value as any)}
      className={cn(
        "px-4 py-2.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2",
        filterStatus === "all"
          ? "bg-violet-500/10 text-violet-400 border-violet-500/30 focus:ring-violet-500/50"
          : filterStatus === "active"
          ? "bg-green-500/10 text-green-400 border-green-500/30 focus:ring-green-500/50"
          : "bg-red-500/10 text-red-400 border-red-500/30 focus:ring-red-500/50"
      )}
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>

    {/* ================= DELETED FILTER ================= */}
    <select
      value={deletedFilter}
      onChange={(e) => setDeletedFilter(e.target.value as any)}
      className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      <option value="notDeleted">Active Methods</option>
      <option value="deleted">Deleted Methods</option>
    </select>

    {/* ================= TRACKING FILTER ================= */}
    <select
      value={filterTracking}
      onChange={(e) => setFilterTracking(e.target.value as any)}
      className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      <option value="all">All Tracking</option>
      <option value="tracked">With Tracking</option>
      <option value="untracked">No Tracking</option>
    </select>

    {/* ================= SORT ================= */}
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as any)}
      className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    >
      <option value="order">Display Order</option>
      <option value="name">Name</option>
      <option value="carrier">Carrier</option>
      <option value="deliveryTime">Delivery Time</option>
    </select>

    {/* ================= CLEAR FILTERS ================= */}
    {hasActiveFilters && (
      <button
        onClick={handleClearFilters}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-sm font-medium whitespace-nowrap"
      >
        <FilterX className="w-4 h-4" />
        Clear
      </button>
    )}

  </div>
</div>


      {/* Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400">Loading methods...</p>
          </div>
        ) : currentMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No methods found</h3>
            <p className="text-slate-400 max-w-sm mb-4">
              {searchTerm
                ? "Try adjusting your search or filters"
                : "Get started by creating your first shipping method"}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Method
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Carrier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Delivery Time
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Features
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentMethods.map((method) => (
                    <tr key={method.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{method.displayName}</p>
                            <p className="text-xs text-slate-500">{method.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-300">{method.carrierCode}</p>
                          <p className="text-xs text-slate-500">{method.serviceCode}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm text-slate-300">
                            {shippingHelpers.formatDeliveryTime(method)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {method.trackingSupported && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">
                              <Navigation className="w-3 h-3" />
                              Tracking
                            </span>
                          )}
                          {method.signatureRequired && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs font-medium">
                              <FileSignature className="w-3 h-3" />
                              Signature
                            </span>
                          )}
                        </div>
                      </td>
<td className="px-6 py-4 text-center">
  {deletedFilter === "notDeleted" && (
    <button
      onClick={() => setStatusConfirm(method)}
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        method.isActive
          ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {method.isActive ? "Active" : "Inactive"}
    </button>
  )}
</td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(method)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(method)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit Method"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                         {deletedFilter === "deleted" ? (
  <button
    onClick={() => setRestoreConfirm(method)}
    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
  >
    <RotateCcw className="w-4 h-4" />
  </button>
) : (
  <button
    onClick={() => setDeleteConfirmId(method.id)}
    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
  >
    <Trash2 className="w-4 h-4" />
  </button>
)}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-slate-800 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Results Info */}
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                    </p>

                    {/* Items Per Page */}
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                      className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers.map((page, index) => (
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
                              : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700"
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
                      className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* VIEW MODAL - FULL DETAILS */}
      {showViewModal && selectedMethod && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Method Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Truck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{selectedMethod.displayName}</h3>
                      <p className="text-sm text-slate-400">{selectedMethod.description}</p>
                    </div>
                  </div>
                  <div>
                    {selectedMethod.isActive ? (
                      <span className="inline-flex items-center mt-4  gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center mt-4  gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Carrier & Service Information */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  Carrier & Service
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Carrier Code</p>
                    <p className="text-lg font-bold text-white">{selectedMethod.carrierCode}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Service Code</p>
                    <p className="text-lg font-bold text-white">{selectedMethod.serviceCode}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Method Name</p>
                    <p className="text-lg font-bold text-white font-mono ">{selectedMethod.name}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Delivery Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Minimum Days</p>
                    <p className="text-2xl font-bold text-cyan-400">{selectedMethod.deliveryTimeMinDays}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Maximum Days</p>
                    <p className="text-2xl font-bold text-violet-400">{selectedMethod.deliveryTimeMaxDays}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Delivery Window</p>
                    <p className="text-lg font-bold text-white">
                      {shippingHelpers.formatDeliveryTime(selectedMethod)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-cyan-400" />
                  Features & Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-300">Tracking Supported</p>
                      {selectedMethod.trackingSupported ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedMethod.trackingSupported
                        ? "Package tracking is available"
                        : "No tracking available"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-300">Signature Required</p>
                      {selectedMethod.signatureRequired ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedMethod.signatureRequired
                        ? "Signature required on delivery"
                        : "No signature required"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Display Order */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  Display Settings
                </h4>
                <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Display Order</p>
                  <p className="text-lg font-bold text-white">{selectedMethod.displayOrder}</p>
                </div>
              </div>

              {/* Timestamps */}
              {(selectedMethod.createdAt || selectedMethod.updatedAt) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Timestamps
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedMethod.createdAt && (
                      <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Created</p>
                        <p className="text-sm text-white font-medium">
                          {new Date(selectedMethod.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                    {selectedMethod.updatedAt && (
                      <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Updated</p>
                        <p className="text-sm text-white font-medium">
                          {new Date(selectedMethod.updatedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-cyan-500/20 bg-slate-900/50">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedMethod);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-lg font-medium shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "create" ? "Create New Method" : "Edit Method"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Method Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Method Name (Internal) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: sanitizeInput(e.target.value) });
                      setFormErrors({ ...formErrors, name: "" });
                    }}
                    disabled={submitting}
                    placeholder="e.g., royal-mail-24"
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                      formErrors.name
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.name && (
                    <p id="name-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.name}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500">
                    Use lowercase letters, numbers, hyphens, and underscores only
                  </p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => {
                      setFormData({ ...formData, displayName: sanitizeInput(e.target.value) });
                      setFormErrors({ ...formErrors, displayName: "" });
                    }}
                    disabled={submitting}
                    placeholder="e.g., Royal Mail 24"
                    aria-invalid={!!formErrors.displayName}
                    aria-describedby={formErrors.displayName ? "displayName-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                      formErrors.displayName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.displayName && (
                    <p id="displayName-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.displayName}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: sanitizeInput(e.target.value) });
                    setFormErrors({ ...formErrors, description: "" });
                  }}
                  disabled={submitting}
                  rows={2}
                  placeholder="e.g., 1-2 business days delivery"
                  aria-invalid={!!formErrors.description}
                  aria-describedby={formErrors.description ? "description-error" : undefined}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none disabled:opacity-50",
                    formErrors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-700 focus:ring-violet-500"
                  )}
                />
                {formErrors.description && (
                  <p id="description-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Carrier Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Carrier Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.carrierCode}
                    onChange={(e) => {
                      setFormData({ ...formData, carrierCode: sanitizeInput(e.target.value.toUpperCase()) });
                      setFormErrors({ ...formErrors, carrierCode: "" });
                    }}
                    disabled={submitting}
                    placeholder="ROYAL_MAIL"
                    aria-invalid={!!formErrors.carrierCode}
                    aria-describedby={formErrors.carrierCode ? "carrierCode-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all uppercase disabled:opacity-50",
                      formErrors.carrierCode
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.carrierCode && (
                    <p id="carrierCode-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.carrierCode}
                    </p>
                  )}
                </div>

                {/* Service Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Service Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serviceCode}
                    onChange={(e) => {
                      setFormData({ ...formData, serviceCode: sanitizeInput(e.target.value.toUpperCase()) });
                      setFormErrors({ ...formErrors, serviceCode: "" });
                    }}
                    disabled={submitting}
                    placeholder="TPN"
                    aria-invalid={!!formErrors.serviceCode}
                    aria-describedby={formErrors.serviceCode ? "serviceCode-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all uppercase disabled:opacity-50",
                      formErrors.serviceCode
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.serviceCode && (
                    <p id="serviceCode-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.serviceCode}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Min Delivery Days */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Days <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.deliveryTimeMinDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        deliveryTimeMinDays: Math.max(0, Math.min(365, value)),
                      });
                      setFormErrors({ ...formErrors, deliveryTimeMinDays: "" });
                    }}
                    disabled={submitting}
                    aria-invalid={!!formErrors.deliveryTimeMinDays}
                    aria-describedby={formErrors.deliveryTimeMinDays ? "deliveryTimeMinDays-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                      formErrors.deliveryTimeMinDays
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.deliveryTimeMinDays && (
                    <p id="deliveryTimeMinDays-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.deliveryTimeMinDays}
                    </p>
                  )}
                </div>

                {/* Max Delivery Days */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Days <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.deliveryTimeMaxDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        deliveryTimeMaxDays: Math.max(0, Math.min(365, value)),
                      });
                      setFormErrors({ ...formErrors, deliveryTimeMaxDays: "" });
                    }}
                    disabled={submitting}
                    aria-invalid={!!formErrors.deliveryTimeMaxDays}
                    aria-describedby={formErrors.deliveryTimeMaxDays ? "deliveryTimeMaxDays-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                      formErrors.deliveryTimeMaxDays
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.deliveryTimeMaxDays && (
                    <p id="deliveryTimeMaxDays-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.deliveryTimeMaxDays}
                    </p>
                  )}
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Order <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={formData.displayOrder}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        displayOrder: Math.max(0, Math.min(9999, value)),
                      });
                      setFormErrors({ ...formErrors, displayOrder: "" });
                    }}
                    disabled={submitting}
                    aria-invalid={!!formErrors.displayOrder}
                    aria-describedby={formErrors.displayOrder ? "displayOrder-error" : undefined}
                    className={cn(
                      "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50",
                      formErrors.displayOrder
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-violet-500"
                    )}
                  />
                  {formErrors.displayOrder && (
                    <p id="displayOrder-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.displayOrder}
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Tracking Supported</p>
                    <p className="text-xs text-slate-500 mt-0.5">Enable package tracking for this method</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, trackingSupported: !formData.trackingSupported })}
                    disabled={submitting}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                      formData.trackingSupported ? "bg-cyan-500" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        formData.trackingSupported ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Signature Required</p>
                    <p className="text-xs text-slate-500 mt-0.5">Require signature on delivery</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, signatureRequired: !formData.signatureRequired })}
                    disabled={submitting}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                      formData.signatureRequired ? "bg-orange-500" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        formData.signatureRequired ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Method Status</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formData.isActive ? "Method is active" : "Method is inactive"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    disabled={submitting}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
                      formData.isActive ? "bg-green-500" : "bg-slate-700"
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
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-800 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
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
                    {modalMode === "create" ? "Create Method" : "Update Method"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
<ConfirmDialog
  isOpen={!!deleteConfirmId}
  onClose={() => setDeleteConfirmId(null)}
  onConfirm={() => handleDelete(deleteConfirmId!)}
  title="Delete Method?"
  message="This action cannot be undone."
  confirmText="Delete"
  iconColor="text-red-400"
  confirmButtonStyle="bg-red-500 hover:bg-red-600"
/>

<ConfirmDialog
  isOpen={!!statusConfirm}
  onClose={() => setStatusConfirm(null)}
  onConfirm={handleStatusToggle}
  title="Change Status?"
  message={`Are you sure you want to ${
    statusConfirm?.isActive ? "deactivate" : "activate"
  } this method?`}
  confirmText="Confirm"
  iconColor="text-yellow-400"
  confirmButtonStyle="bg-yellow-500 hover:bg-yellow-600"
/>

<ConfirmDialog
  isOpen={!!restoreConfirm}
  onClose={() => setRestoreConfirm(null)}
  onConfirm={handleRestore}
  title="Restore Method?"
  message="Are you sure you want to restore this method?"
  confirmText="Restore"
  iconColor="text-green-400"
  confirmButtonStyle="bg-green-500 hover:bg-green-600"
/>


    </div>
  );
}
