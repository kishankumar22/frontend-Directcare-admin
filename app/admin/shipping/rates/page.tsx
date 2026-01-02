"use client";

import { useState, useEffect } from "react";
import { shippingService } from "@/lib/services/shipping";
import {
  ShippingZone,
  ShippingMethod,
  ShippingRate,
  ZoneRates,
  CreateRateDto,
  UpdateRateDto,
} from "@/lib/types/shipping";
import { useToast } from "@/components/CustomToast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Save,
  Weight,
  Tag,
  Layers,
  MapPin,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShippingRatesPage() {
  const toast = useToast();

  // ==================== STATE ====================
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [zoneRates, setZoneRates] = useState<ZoneRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Create
  const [formDataCreate, setFormDataCreate] = useState<CreateRateDto>({
    shippingZoneId: "",
    shippingMethodId: "",
    weightFrom: 0,
    weightTo: 0,
    orderValueFrom: 0,
    orderValueTo: 999999.99,
    baseRate: 0,
    perKgRate: 0,
    perItemRate: 0,
    minimumCharge: 0,
    maximumCharge: null,
    freeShippingThreshold: null,
    isActive: true,
  });

  // Form State for Update
  const [formDataUpdate, setFormDataUpdate] = useState<UpdateRateDto>({
    baseRate: 0,
    perKgRate: 0,
    perItemRate: 0,
    minimumCharge: 0,
    maximumCharge: null,
    freeShippingThreshold: null,
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchZonesAndMethods();
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      fetchRatesForZone(selectedZoneId);
    }
  }, [selectedZoneId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, selectedZoneId]);

  // ==================== API CALLS ====================
  const fetchZonesAndMethods = async () => {
    try {
      setLoadingZones(true);
      const [zonesResponse, methodsResponse] = await Promise.all([
        shippingService.getAllZones({ params: { includeInactive: false } }),
        shippingService.getAllMethods({ params: { includeInactive: false } }),
      ]);

      if (zonesResponse.data && zonesResponse.data.success) {
        setZones(zonesResponse.data.data || []);
        // Auto-select first zone
        if (zonesResponse.data.data && zonesResponse.data.data.length > 0 && !selectedZoneId) {
          setSelectedZoneId(zonesResponse.data.data[0].id);
        }
      }

      if (methodsResponse.data && methodsResponse.data.success) {
        setMethods(methodsResponse.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching zones/methods:", error);
      toast.error(error.message || "Failed to fetch zones and methods");
    } finally {
      setLoadingZones(false);
    }
  };

  const fetchRatesForZone = async (zoneId: string) => {
    try {
      setLoading(true);
      const response = await shippingService.getZoneRates(zoneId, {
        params: { includeInactive: true },
      });

      if (response.data && response.data.success) {
        setZoneRates(response.data.data || null);
      } else {
        toast.error("Failed to fetch rates");
      }
    } catch (error: any) {
      console.error("Error fetching rates:", error);
      toast.error(error.message || "Failed to fetch rates");
      setZoneRates(null);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FORM VALIDATION ====================
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formDataCreate.shippingZoneId) {
      errors.shippingZoneId = "Zone is required";
    }

    if (!formDataCreate.shippingMethodId) {
      errors.shippingMethodId = "Method is required";
    }

    if (formDataCreate.weightFrom < 0) {
      errors.weightFrom = "Weight from must be positive";
    }

    if (formDataCreate.weightTo <= 0) {
      errors.weightTo = "Weight to must be greater than 0";
    }

    if (formDataCreate.weightTo <= formDataCreate.weightFrom) {
      errors.weightTo = "Weight to must be greater than weight from";
    }

    if (formDataCreate.baseRate < 0) {
      errors.baseRate = "Base rate must be positive";
    }

    if (formDataCreate.perKgRate < 0) {
      errors.perKgRate = "Per kg rate must be positive";
    }

    if (formDataCreate.perItemRate < 0) {
      errors.perItemRate = "Per item rate must be positive";
    }

    if (formDataCreate.minimumCharge < 0) {
      errors.minimumCharge = "Minimum charge must be positive";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateUpdateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formDataUpdate.baseRate < 0) {
      errors.baseRate = "Base rate must be positive";
    }

    if (formDataUpdate.perKgRate < 0) {
      errors.perKgRate = "Per kg rate must be positive";
    }

    if (formDataUpdate.perItemRate < 0) {
      errors.perItemRate = "Per item rate must be positive";
    }

    if (formDataUpdate.minimumCharge < 0) {
      errors.minimumCharge = "Minimum charge must be positive";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== HANDLERS ====================
  const handleCreate = () => {
    setModalMode("create");
    setFormDataCreate({
      shippingZoneId: selectedZoneId || "",
      shippingMethodId: "",
      weightFrom: 0,
      weightTo: 2,
      orderValueFrom: 0,
      orderValueTo: 999999.99,
      baseRate: 0,
      perKgRate: 0,
      perItemRate: 0,
      minimumCharge: 0,
      maximumCharge: null,
      freeShippingThreshold: null,
      isActive: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (rate: ShippingRate) => {
    setModalMode("edit");
    setSelectedRate(rate);
    setFormDataUpdate({
      baseRate: rate.baseRate,
      perKgRate: rate.perKgRate,
      perItemRate: rate.perItemRate,
      minimumCharge: rate.minimumCharge,
      maximumCharge: rate.maximumCharge,
      freeShippingThreshold: rate.freeShippingThreshold,
      isActive: rate.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === "create") {
      if (!validateCreateForm()) {
        toast.error("Please fix validation errors");
        return;
      }
    } else {
      if (!validateUpdateForm()) {
        toast.error("Please fix validation errors");
        return;
      }
    }

    try {
      setSubmitting(true);

      if (modalMode === "create") {
        const response = await shippingService.createRate(formDataCreate);
        if (response.data && response.data.success) {
          toast.success("✅ Rate created successfully!");
          setShowModal(false);
          if (selectedZoneId) {
            fetchRatesForZone(selectedZoneId);
          }
        }
      } else if (selectedRate) {
        const response = await shippingService.updateRate(selectedRate.id, formDataUpdate);
        if (response.data && response.data.success) {
          toast.success("✅ Rate updated successfully!");
          setShowModal(false);
          if (selectedZoneId) {
            fetchRatesForZone(selectedZoneId);
          }
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
      const response = await shippingService.deleteRate(id);
      if (response.data && response.data.success) {
        toast.success("🗑️ Rate deleted successfully!");
        setDeleteConfirmId(null);
        if (selectedZoneId) {
          fetchRatesForZone(selectedZoneId);
        }
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete rate");
    }
  };

  // ==================== FILTERING ====================
  const filteredRates =
    zoneRates?.rates.filter((rate) => {
      // Search filter
      const matchesSearch =
        rate.shippingMethodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.baseRate.toString().includes(searchTerm);

      // Active filter
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active" && rate.isActive) ||
        (filterActive === "inactive" && !rate.isActive);

      return matchesSearch && matchesActive;
    }) || [];

  // ==================== PAGINATION ====================
  const totalItems = filteredRates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRates = filteredRates.slice(startIndex, endIndex);

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

  // Group rates by method (for current page only)
  const ratesByMethod = currentRates.reduce((acc, rate) => {
    const methodName = rate.shippingMethodName;
    if (!acc[methodName]) {
      acc[methodName] = [];
    }
    acc[methodName].push(rate);
    return acc;
  }, {} as Record<string, ShippingRate[]>);

  // ==================== STATS ====================
  const stats = {
    totalRates: zoneRates?.rates.length || 0,
    activeRates: zoneRates?.rates.filter((r) => r.isActive).length || 0,
    freeShipping: zoneRates?.rates.filter((r) => r.freeShippingThreshold !== null).length || 0,
    methods: new Set(zoneRates?.rates.map((r) => r.shippingMethodName) || []).size,
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Shipping Rates
            </h1>
            <p className="text-slate-400 dark:text-gray-500 mt-1">
              Manage pricing for zones and methods
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={!selectedZoneId || loadingZones}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Rate
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Total Rates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalRates}</p>
              </div>
              <div className="w-12 h-12 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Active Rates</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.activeRates}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Free Shipping</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.freeShipping}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 dark:text-gray-500 text-sm">Methods</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.methods}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Selection & Filters */}
      <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Zone Selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
              Select Zone
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              disabled={loadingZones}
              className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
            >
              <option value="">Select a zone...</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.country})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
              Search Rates
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-600" />
              <input
                type="text"
                placeholder="Search by method or rate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
              Filter Status
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActive("all")}
                className={cn(
                  "px-4 py-2.5 rounded-lg font-medium transition-all text-sm",
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
                  "px-4 py-2.5 rounded-lg font-medium transition-all text-sm",
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
                  "px-4 py-2.5 rounded-lg font-medium transition-all text-sm",
                  filterActive === "inactive"
                    ? "bg-red-500 text-white"
                    : "bg-slate-800/50 dark:bg-gray-800/50 text-slate-400 hover:text-white"
                )}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rates Display */}
      {loadingZones ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 dark:text-gray-500">Loading zones and methods...</p>
          </div>
        </div>
      ) : !selectedZoneId ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-800/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-600 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Zone Selected</h3>
            <p className="text-slate-400 dark:text-gray-500 max-w-sm">
              Please select a shipping zone to view and manage rates
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 dark:text-gray-500">Loading rates...</p>
          </div>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-800/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-slate-600 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Rates Found</h3>
            <p className="text-slate-400 dark:text-gray-500 max-w-sm mb-4">
              {searchTerm
                ? "Try adjusting your search or filters"
                : `No rates configured for ${zoneRates?.zoneName || "this zone"}`}
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Rate
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zone Info Header */}
          {zoneRates && (
            <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-violet-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white">{zoneRates.zoneName}</h3>
                    <p className="text-sm text-slate-400 dark:text-gray-500">
                      {zoneRates.zoneDescription}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 dark:text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} rates
                </p>
              </div>
            </div>
          )}

          {/* Rates Grouped by Method */}
          {Object.entries(ratesByMethod).map(([methodName, rates]) => (
            <div
              key={methodName}
              className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Method Header */}
              <div className="bg-slate-800/50 dark:bg-gray-800/50 px-6 py-4 border-b border-slate-700 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-lg font-semibold text-white">{methodName}</h4>
                  <span className="ml-auto text-sm text-slate-400 dark:text-gray-500">
                    {rates.length} rate{rates.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Rates Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/30 dark:bg-gray-800/30 border-b border-slate-700 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Weight Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Base Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Per Kg Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Min Charge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Free Shipping
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 dark:divide-gray-800">
                    {rates.map((rate) => (
                      <tr
                        key={rate.id}
                        className="hover:bg-slate-800/30 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-medium text-white">
                              {rate.weightFrom}kg - {rate.weightTo}kg
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">
                              £{rate.baseRate.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-300 dark:text-gray-400">
                            £{rate.perKgRate.toFixed(2)}/kg
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-300 dark:text-gray-400">
                            £{rate.minimumCharge.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rate.freeShippingThreshold ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">
                              <Tag className="w-3 h-3" />
                              £{rate.freeShippingThreshold.toFixed(2)}+
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500 dark:text-gray-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center">
                            {rate.isActive ? (
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(rate)}
                              className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit Rate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(rate.id)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Rate"
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
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-900/50 dark:bg-gray-900/50 backdrop-blur-xl border border-slate-800 dark:border-gray-800 rounded-xl p-4">
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
        </div>
      )}

      {/* CREATE/EDIT MODAL - Character limit reached, toh wo modal code pehle jaisa hi rehega */}
      {/* Pagination complete hai upar! */}
           {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 dark:border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "create" ? "Create New Rate" : "Edit Rate"}
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
              {modalMode === "create" ? (
                <>
                  {/* CREATE MODE FORM */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Zone Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Shipping Zone <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formDataCreate.shippingZoneId}
                        onChange={(e) => {
                          setFormDataCreate({ ...formDataCreate, shippingZoneId: e.target.value });
                          setFormErrors({ ...formErrors, shippingZoneId: "" });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all",
                          formErrors.shippingZoneId
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                        )}
                      >
                        <option value="">Select zone...</option>
                        {zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.shippingZoneId && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.shippingZoneId}
                        </p>
                      )}
                    </div>

                    {/* Method Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Shipping Method <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formDataCreate.shippingMethodId}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            shippingMethodId: e.target.value,
                          });
                          setFormErrors({ ...formErrors, shippingMethodId: "" });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white focus:outline-none focus:ring-2 transition-all",
                          formErrors.shippingMethodId
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                        )}
                      >
                        <option value="">Select method...</option>
                        {methods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.displayName}
                          </option>
                        ))}
                      </select>
                      {formErrors.shippingMethodId && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.shippingMethodId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Weight Range */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                      Weight Range (kg) <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.weightFrom}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              weightFrom: parseFloat(e.target.value) || 0,
                            });
                            setFormErrors({ ...formErrors, weightFrom: "" });
                          }}
                          placeholder="From"
                          className={cn(
                            "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                            formErrors.weightFrom
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                          )}
                        />
                        {formErrors.weightFrom && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.weightFrom}
                          </p>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formDataCreate.weightTo}
                          onChange={(e) => {
                            setFormDataCreate({
                              ...formDataCreate,
                              weightTo: parseFloat(e.target.value) || 0,
                            });
                            setFormErrors({ ...formErrors, weightTo: "" });
                          }}
                          placeholder="To"
                          className={cn(
                            "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                            formErrors.weightTo
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                          )}
                        />
                        {formErrors.weightTo && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.weightTo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Base Rate (£) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.baseRate}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            baseRate: parseFloat(e.target.value) || 0,
                          });
                          setFormErrors({ ...formErrors, baseRate: "" });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                          formErrors.baseRate
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                        )}
                      />
                      {formErrors.baseRate && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.baseRate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Per Kg Rate (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.perKgRate}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            perKgRate: parseFloat(e.target.value) || 0,
                          });
                          setFormErrors({ ...formErrors, perKgRate: "" });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Per Item Rate (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.perItemRate}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            perItemRate: parseFloat(e.target.value) || 0,
                          });
                          setFormErrors({ ...formErrors, perItemRate: "" });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Minimum Charge (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.minimumCharge}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            minimumCharge: parseFloat(e.target.value) || 0,
                          });
                          setFormErrors({ ...formErrors, minimumCharge: "" });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Maximum Charge (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.maximumCharge || ""}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            maximumCharge: e.target.value ? parseFloat(e.target.value) : null,
                          });
                        }}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Free Shipping Threshold (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataCreate.freeShippingThreshold || ""}
                        onChange={(e) => {
                          setFormDataCreate({
                            ...formDataCreate,
                            freeShippingThreshold: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          });
                        }}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Rate Status</p>
                      <p className="text-xs text-slate-500 dark:text-gray-600 mt-0.5">
                        {formDataCreate.isActive ? "Rate is active" : "Rate is inactive"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormDataCreate({ ...formDataCreate, isActive: !formDataCreate.isActive })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        formDataCreate.isActive ? "bg-green-500" : "bg-slate-700 dark:bg-gray-700"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          formDataCreate.isActive ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* EDIT MODE FORM */}
                  {selectedRate && (
                    <div className="mb-5 p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                      <p className="text-sm text-slate-400 dark:text-gray-500 mb-1">Editing Rate For:</p>
                      <p className="text-white font-semibold">
                        {selectedRate.shippingMethodName} • {selectedRate.weightFrom}kg -{" "}
                        {selectedRate.weightTo}kg
                      </p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Base Rate (£) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.baseRate}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            baseRate: parseFloat(e.target.value) || 0,
                          });
                          setFormErrors({ ...formErrors, baseRate: "" });
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 transition-all",
                          formErrors.baseRate
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-700 dark:border-gray-700 focus:ring-violet-500"
                        )}
                      />
                      {formErrors.baseRate && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.baseRate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Per Kg Rate (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.perKgRate}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            perKgRate: parseFloat(e.target.value) || 0,
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Per Item Rate (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.perItemRate}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            perItemRate: parseFloat(e.target.value) || 0,
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Minimum Charge (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.minimumCharge}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            minimumCharge: parseFloat(e.target.value) || 0,
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Maximum Charge (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.maximumCharge || ""}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            maximumCharge: e.target.value ? parseFloat(e.target.value) : null,
                          });
                        }}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 dark:text-gray-400 mb-2">
                        Free Shipping Threshold (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formDataUpdate.freeShippingThreshold || ""}
                        onChange={(e) => {
                          setFormDataUpdate({
                            ...formDataUpdate,
                            freeShippingThreshold: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          });
                        }}
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 bg-slate-800/50 dark:bg-gray-800/50 border border-slate-700 dark:border-gray-700 rounded-lg text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 dark:bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Rate Status</p>
                      <p className="text-xs text-slate-500 dark:text-gray-600 mt-0.5">
                        {formDataUpdate.isActive ? "Rate is active" : "Rate is inactive"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormDataUpdate({ ...formDataUpdate, isActive: !formDataUpdate.isActive })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        formDataUpdate.isActive ? "bg-green-500" : "bg-slate-700 dark:bg-gray-700"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          formDataUpdate.isActive ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </>
              )}
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
                    {modalMode === "create" ? "Create Rate" : "Update Rate"}
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
              <h3 className="text-xl font-bold text-white mb-2">Delete Rate?</h3>
              <p className="text-slate-400 dark:text-gray-500 mb-6">
                Are you sure you want to delete this rate? This action cannot be undone.
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
      {/* Delete Confirmation Modal same as before */}
    </div>
  );
}
