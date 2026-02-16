"use client";
// ✅ CORRECT - App Router import  
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { shippingService } from "@/lib/services/shipping";
import { ShippingZone, CreateZoneDto } from "@/lib/types/shipping";
import { countriesService, Country } from "@/lib/services/countries";
import { useToast } from "@/app/admin/_component/CustomToast";
import { Plus, Edit, Trash2, Search, MapPin, Globe, CheckCircle, XCircle, Loader2, AlertCircle, X, Save, ChevronLeft, ChevronRight, Eye, Flag, Info, Package, DollarSign, RotateCcw, } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "../../_component/ConfirmDialog";


// ==================== CUSTOM HOOKS ====================

// 🎯 FIX #2: Debounce Hook
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

export default function ShippingZonesPage() {
  const toast = useToast();
  const router = useRouter();

  // ==================== STATE ====================
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "country" | "order">("order");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 🎯 FIX #2: Debounced Search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Countries State
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
const [deletedFilter, setDeletedFilter] = useState<"notDeleted" | "deleted">("notDeleted");
const [statusConfirm, setStatusConfirm] = useState<ShippingZone | null>(null);
const [restoreConfirm, setRestoreConfirm] = useState<ShippingZone | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // 🎯 FIX #10: Double Submit Prevention
  const [submitting, setSubmitting] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateZoneDto>({
    name: "",
    description: "",
    country: "",
    isActive: true,
    displayOrder: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Ref for country dropdown click outside detection
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // AbortController for API cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchZones();
    fetchCountries();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 🎯 FIX #2: Use debounced search
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterActive, sortBy, sortOrder]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCountryDropdown]);

  // ==================== API CALLS ====================
const fetchZones = async () => {
  try {
    setLoading(true);

    const params: any = {
      includeInactive: true,
    };

    // ✅ Deleted Filter
    if (deletedFilter === "deleted") {
      params.isDeleted = true;
    } else {
      params.isDeleted = false;

      // ✅ Status filter only when not deleted
      if (statusFilter === "active") {
        params.isActive = true;
      }

      if (statusFilter === "inactive") {
        params.isActive = false;
      }
    }

    console.log("🔥 ZONES API PARAMS:", params);

    const response = await shippingService.getAllZones({ params });

    if (response.data?.success) {
     setZones(Array.isArray(response.data?.data) ? response.data.data : []);

    } else {
      setZones([]);
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to fetch zones");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchZones();
}, [statusFilter, deletedFilter]);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await countriesService.getAllCountries();
      setCountries(data);
    } catch (error) {
      console.error("Error loading countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  // ==================== FORM VALIDATION ====================
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Zone name is required";
    } else if (formData.name.length < 3) {
      errors.name = "Zone name must be at least 3 characters";
    } else if (formData.name.length > 100) {
      errors.name = "Zone name must not exceed 100 characters";
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name)) {
      errors.name = "Zone name can only contain letters, numbers, spaces, hyphens, and underscores";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    } else if (formData.description.length > 500) {
      errors.description = "Description must not exceed 500 characters";
    }

    if (!formData.country.trim()) {
      errors.country = "Country is required";
    } else if (formData.country.length !== 2) {
      errors.country = "Country code must be 2 characters (e.g., GB, US)";
    } else if (!/^[A-Z]{2}$/.test(formData.country)) {
      errors.country = "Country code must be uppercase letters only";
    }

    if (formData.displayOrder < 0) {
      errors.displayOrder = "Display order must be a positive number";
    } else if (formData.displayOrder > 9999) {
      errors.displayOrder = "Display order must not exceed 9999";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
const handleStatusToggle = async () => {
  if (!statusConfirm) return;

  try {
    const zone = zones.find(z => z.id === statusConfirm.id);
    if (!zone) {
      toast.error("Zone not found");
      return;
    }

    // 🔥 Use SAME updateZone API like Edit Form
    const response = await shippingService.updateZone(zone.id, {
      name: zone.name,
      description: zone.description,
      country: zone.country,
      displayOrder: zone.displayOrder,
      isActive: !zone.isActive,
    });

    if (response.data?.success) {
      toast.success("Status updated successfully");
      setStatusConfirm(null);
      fetchZones();
    }

  } catch (error: any) {
    toast.error(error.message || "Failed to update status");
  }
};


  // ==================== HANDLERS ====================
  const handleCreate = () => {
    setModalMode("create");
    setFormData({
      name: "",
      description: "",
      country: "",
      isActive: true,
      displayOrder: zones.length + 1,
    });
    setCountrySearch("");
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (zone: ShippingZone) => {
    setModalMode("edit");
    setSelectedZone(zone);
setFormData({
  name: zone.name || "",
  description: zone.description || "",
  country: zone.country || "",
  isActive: zone.isActive ?? true,
  displayOrder: zone.displayOrder ?? 0,
});

    const selectedCountry = countries.find((c) => c.cca2 === zone.country);
    setCountrySearch(selectedCountry ? selectedCountry.name.common : zone.country);
    setFormErrors({});
    setShowModal(true);
  };

  const handleView = (zone: ShippingZone) => {
    setSelectedZone(zone);
    setShowViewModal(true);
  };

  // 🎯 FIX #10: Prevent Double Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent double submission
    if (submitting) {
      console.log("⚠️ Submit already in progress, ignoring...");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setSubmitting(true);

      // Set timeout to automatically reset after 10 seconds (safety measure)
      submitTimeoutRef.current = setTimeout(() => {
        console.warn("⚠️ Submit timeout reached, resetting...");
        setSubmitting(false);
      }, 10000);

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
      // Clear timeout and reset submitting state
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      setSubmitting(false);
    }
  };
  const handleRestore = async () => {
  if (!restoreConfirm) return;

  try {
    await shippingService.restoreZone(restoreConfirm.id);
    toast.success("Zone restored successfully");
    setRestoreConfirm(null);
    fetchZones();
  } catch (error: any) {
    toast.error(error.message || "Failed to restore zone");
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

  const handleCountrySelect = (country: Country) => {
    setFormData({ ...formData, country: country.cca2 });
    setCountrySearch(country.name.common);
    setShowCountryDropdown(false);
    setFormErrors({ ...formErrors, country: "" });
  };

  // ==================== FILTERING & SORTING ====================
  const filteredAndSortedZones = zones
    .filter((zone) => {
      const matchesSearch =
        zone.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        zone.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        zone.country.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

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
  const totalItems = filteredAndSortedZones?.length || 0;

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

  const filteredCountries = countrySearch
    ? countriesService.searchCountries(countries, countrySearch)
    : countries;

  const getCountryInfo = (countryCode: string) => {
    return countries.find((c) => c.cca2 === countryCode);
  };

  // ==================== STATS ====================
const stats = {
  total: zones?.length || 0,
  active: zones?.filter((z) => z.isActive)?.length || 0,
  inactive: zones?.filter((z) => !z.isActive)?.length || 0,
};


  // ==================== RENDER ====================
  return (
    <div className="space-y-2">
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
        
        {/* Inline Buttons with Different Colors */}
        <div className="flex flex-wrap items-center gap-3">
        <button
            onClick={() => router.push('/admin/shipping/rates')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <DollarSign className="w-4 h-4" />
            Add Rates
          </button>

          <button
            onClick={() => router.push('/admin/shipping/methods')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Package className="w-4 h-4" />
            Add Shipping
          </button>
           {/* ✅ CHANGED: Opens modal instead of routing */}
  <button 
    onClick={handleCreate}
    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
  >
    <Plus className="w-4 h-4" />
    Add Zones
  </button>
        </div>
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
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-600" />
            <input
              type="text"
              placeholder="Search by name, description, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
            {/* 🎯 Debounce Indicator */}
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              </div>
            )}
          </div>

        <div className="flex gap-3">

  {/* Status Filter */}
  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value as any)}
    className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
  >
    <option value="all">All Status</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>

  {/* Deleted Filter */}
  <select
    value={deletedFilter}
    onChange={(e) => setDeletedFilter(e.target.value as any)}
    className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
  >
    <option value="notDeleted">Active Zones</option>
    <option value="deleted">Deleted Zones</option>
  </select>

</div>

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
            className="px-4 py-2.5 bg-slate-800/90 dark:bg-gray-800/90 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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

      {/* Table - REST OF THE CODE REMAINS SAME... */}
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
                  {currentZones.map((zone) => {
                    const countryInfo = getCountryInfo(zone.country);
                    return (
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
                              <p className="text-sm font-semibold text-white" title={zone.id}>
                                {zone.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p
                            className="text-sm text-slate-300 dark:text-gray-400 max-w-xs truncate"
                            title={zone.description}
                          >
                            {zone.description}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {countryInfo && (
                              <span className="text-2xl text-purple-400">{countryInfo.flag}</span>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-300 dark:text-gray-400">
                                {countryInfo ? countryInfo.name.common : zone.country}
                              </p>
                            </div>
                          </div>
                        </td>
<td className="px-6 py-4 text-center">
  {deletedFilter === "notDeleted" && (
    <button
      onClick={() => setStatusConfirm(zone)}
      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
        zone.isActive
          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
      }`}
    >
      {zone.isActive ? "Active" : "Inactive"}
    </button>
  )}
</td>


                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-800/50 dark:bg-gray-800/50 rounded-lg text-sm font-semibold text-slate-300 dark:text-gray-400">
                            {zone.displayOrder}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(zone)}
                              className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(zone)}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit Zone"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {deletedFilter === "deleted" ? (
      // 🔥 RESTORE BUTTON
  <button
  onClick={() => setRestoreConfirm(zone)}
  className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
>
  <RotateCcw className="w-4 h-4" />
</button>

    ) : (
      // 🔥 DELETE BUTTON (Soft Delete)
      <button
        onClick={() => setDeleteConfirmId(zone.id)}
        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
        title="Delete Zone"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 dark:border-gray-800 bg-slate-900/30 dark:bg-gray-900/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-400 dark:text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems}{" "}
                      results
                    </p>

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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

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
<ConfirmDialog
  isOpen={!!statusConfirm}
  onClose={() => setStatusConfirm(null)}
  onConfirm={handleStatusToggle}
  title="Change Status?"
  message={`Are you sure you want to ${
    statusConfirm?.isActive ? "deactivate" : "activate"
  } this zone?`}
  confirmText="Confirm"
  cancelText="Cancel"
  iconColor="text-yellow-400"
  confirmButtonStyle="bg-yellow-500 hover:bg-yellow-600"
/>




      {/* View Modal */}
      {showViewModal && selectedZone && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                Zone Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedZone.name}</h3>
                    <p className="text-sm text-slate-400">ID: {selectedZone.id}</p>
                  </div>
                  {selectedZone.isActive ? (
                    <span className="inline-flex items-center mt-4 gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center mt-4 gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Description
                    </p>
                  </div>
                  <p className="text-sm text-white">{selectedZone.description}</p>
                </div>

                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Country
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCountryInfo(selectedZone.country) && (
                      <span className="text-3xl text-purple-400">
                        {getCountryInfo(selectedZone.country)?.flag}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {getCountryInfo(selectedZone.country)?.name.common || selectedZone.country}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Display Order
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedZone.displayOrder}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-white font-medium">
                    {selectedZone.createdAt
                      ? new Date(selectedZone.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Updated</p>
                  <p className="text-sm text-white font-medium">
                    {selectedZone.updatedAt
                      ? new Date(selectedZone.updatedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-cyan-500/20">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedZone);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Zone
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
<ConfirmDialog
  isOpen={!!restoreConfirm}
  onClose={() => setRestoreConfirm(null)}
  onConfirm={handleRestore}
  title="Restore Zone?"
  message="Are you sure you want to restore this zone?"
  confirmText="Restore"
  cancelText="Cancel"
  iconColor="text-green-400"
  confirmButtonStyle="bg-green-500 hover:bg-green-600"
/>

<ConfirmDialog
  isOpen={!!deleteConfirmId}
  onClose={() => setDeleteConfirmId(null)}
  onConfirm={() => {
    if (deleteConfirmId) handleDelete(deleteConfirmId);
  }}
  title="Delete Zone?"
  message="Are you sure you want to delete this zone? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  iconColor="text-red-400"
  confirmButtonStyle="bg-red-500 hover:bg-red-600"
/>

      {/* Delete Confirmation Modal */}


{/* Create/Edit Modal */}
{showModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2">
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/10">
      {/* Modal Header */}
      <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
          {modalMode === "create" ? "Create New Zone" : "Edit Zone"}
        </h2>
        <button
          onClick={() => setShowModal(false)}
          disabled={submitting}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Zone Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Zone Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setFormErrors({ ...formErrors, name: "" });
            }}
            disabled={submitting}
            className={cn(
              "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all",
              formErrors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-700 focus:ring-cyan-500",
              submitting && "opacity-50 cursor-not-allowed"
            )}
            placeholder="e.g., UK Mainland"
            aria-invalid={!!formErrors.name}
            aria-describedby={formErrors.name ? "name-error" : "name-hint"}
          />
          {formErrors.name && (
            <p id="name-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formErrors.name}
            </p>
          )}
          {/* 🎯 BOLD HELPER TEXT WITH ICON */}
          <p id="name-hint" className="mt-1.5 text-xs text-slate-400 font-semibold flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>3-100 characters. Letters, numbers, spaces, hyphens, and underscores only.</span>
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              setFormErrors({ ...formErrors, description: "" });
            }}
            disabled={submitting}
            rows={3}
            className={cn(
              "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none",
              formErrors.description
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-700 focus:ring-cyan-500",
              submitting && "opacity-50 cursor-not-allowed"
            )}
            placeholder="Enter a detailed description..."
            aria-invalid={!!formErrors.description}
            aria-describedby={formErrors.description ? "description-error" : "description-hint"}
          />
          {formErrors.description && (
            <p id="description-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formErrors.description}
            </p>
          )}
          {/* 🎯 BOLD HELPER TEXT WITH ICON */}
          <div id="description-hint" className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              10-500 characters
            </span>
            <span
              className={cn(
                "font-bold",
                formData.description.length > 500
                  ? "text-red-400"
                  : formData.description.length < 10
                  ? "text-yellow-400"
                  : "text-green-400"
              )}
            >
              {formData.description.length}/500
            </span>
          </div>
        </div>

        {/* Country Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Country <span className="text-red-400">*</span>
          </label>
          <div className="relative" ref={countryDropdownRef}>
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setShowCountryDropdown(true);
                setFormData({ ...formData, country: "" });
              }}
              onFocus={() => setShowCountryDropdown(true)}
              disabled={submitting}
              className={cn(
                "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all",
                formErrors.country
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-700 focus:ring-cyan-500",
                submitting && "opacity-50 cursor-not-allowed"
              )}
              placeholder="Search country..."
              aria-invalid={!!formErrors.country}
              aria-describedby={formErrors.country ? "country-error" : "country-hint"}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />

            {/* Dropdown */}
            {showCountryDropdown && !submitting && (
              <div 
                className="absolute z-10 mt-2 w-full max-h-64 overflow-y-auto bg-slate-800 border border-cyan-500/20 rounded-lg shadow-xl"
                role="listbox"
                aria-label="Country selection"
              >
                {loadingCountries ? (
                  <div className="p-4 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading countries...
                  </div>
                ) : filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No countries found</div>
                ) : (
                  filteredCountries.slice(0, 50).map((country) => (
                    <button
                      key={country.cca2}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left border-b border-slate-700 last:border-b-0"
                      role="option"
                      aria-selected={formData.country === country.cca2}
                    >
                      <span className="text-2xl text-purple-400">{country.flag}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {country.name.common}
                        </p>
                        <p className="text-xs text-slate-400">{country.region}</p>
                      </div>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                        {country.cca2}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {formErrors.country && (
            <p id="country-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formErrors.country}
            </p>
          )}
          {formData.country ? (
            <p className="mt-1.5 text-xs text-green-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Selected: {formData.country}
            </p>
          ) : (
            /* 🎯 BOLD HELPER TEXT WITH ICON */
            <p id="country-hint" className="mt-1.5 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Search and select a country from the list
            </p>
          )}
        </div>

        {/* 🎯 TWO COLUMN LAYOUT - Display Order & Is Active */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Display Order <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="9999"
              value={formData.displayOrder}
              onChange={(e) => {
                setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 });
                setFormErrors({ ...formErrors, displayOrder: "" });
              }}
              disabled={submitting}
              className={cn(
                "w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all",
                formErrors.displayOrder
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-700 focus:ring-cyan-500",
                submitting && "opacity-50 cursor-not-allowed"
              )}
              placeholder="0"
              aria-invalid={!!formErrors.displayOrder}
              aria-describedby={formErrors.displayOrder ? "order-error" : "order-hint"}
            />
            {formErrors.displayOrder && (
              <p id="order-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.displayOrder}
              </p>
            )}
            {/* 🎯 BOLD HELPER TEXT WITH ICON */}
            {!formErrors.displayOrder && (
              <p id="order-hint" className="mt-1.5 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-cyan-400" />
                0-9999
              </p>
            )}
          </div>

          {/* Active Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <div className="flex items-center justify-between h-[44px] px-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    formData.isActive ? "bg-green-400 animate-pulse" : "bg-slate-500"
                  )}
                />
                <p className="text-sm font-medium text-white">
                  {formData.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                disabled={submitting}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formData.isActive ? "bg-cyan-500" : "bg-slate-700",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Toggle status: currently ${formData.isActive ? "active" : "inactive"}`}
                aria-pressed={formData.isActive}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formData.isActive ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            {/* 🎯 BOLD HELPER TEXT WITH ICON */}
            <p className="mt-1.5 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              Toggle to activate/deactivate
            </p>
          </div>
        </div>
      </form>

      {/* Modal Footer */}
      <div className="flex gap-3 p-6 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={() => setShowModal(false)}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cancel and close modal"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white rounded-lg font-medium shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label={submitting ? "Saving..." : modalMode === "create" ? "Create zone" : "Update zone"}
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


    </div>
  );
}
