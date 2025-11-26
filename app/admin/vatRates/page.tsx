"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Percent, 
  Globe, 
  TrendingUp, 
  Eye, 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X, 
  FileSpreadsheet, 
  ChevronDown, 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Hash,
  Star,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { VATRate, vatratesService, CreateVATRateDto, DeleteVATRateResponse } from "@/lib/services/vatrates";
import { countriesService, Country } from "@/lib/services/countries";

export default function VATRatesPage() {
  const toast = useToast();

  const [vatRates, setVatRates] = useState<VATRate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [countryFilter, setCountryFilter] = useState("All Countries");
  const [viewingRate, setViewingRate] = useState<VATRate | null>(null);
  const [editingRate, setEditingRate] = useState<VATRate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deletingRate, setDeletingRate] = useState<VATRate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // ✅ Country search state
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateVATRateDto>({
    name: "",
    description: "",
    rate: 0,
    isDefault: false,
    isActive: true,
    country: "",
    region: "",
    displayOrder: 0,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // ✅ Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearchTerm) return countries;
    return countries.filter(country =>
      country.name.common.toLowerCase().includes(countrySearchTerm.toLowerCase())
    );
  }, [countries, countrySearchTerm]);

  // Get selected country name
  const getSelectedCountryName = () => {
    const selected = countries.find(c => c.cca2 === formData.country);
    return selected ? `${selected.flag} ${selected.name.common}` : "";
  };

  // Fetch VAT Rates
  const fetchVATRates = async () => {
    try {
      setLoading(true);
      const response = await vatratesService.getAll({ params: { activeOnly: false } });
      
      if (response?.data?.success && response.data.data) {
        setVatRates(response.data.data);
      } else {
        setVatRates([]);
      }
    } catch (error: any) {
      console.error("Error fetching VAT rates:", error);
      toast.error("Failed to load VAT rates");
      setVatRates([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Countries
  const fetchCountries = async () => {
    try {
      const data = await countriesService.getAllCountries();
      setCountries(data);
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.error("Failed to load countries");
    }
  };

  useEffect(() => {
    fetchVATRates();
    fetchCountries();
  }, []);

  // Filter VAT rates
  const filteredRates = useMemo(() => {
    return vatRates.filter((rate) => {
      const matchesSearch =
        rate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All Status" ||
        (statusFilter === "Active" && rate.isActive) ||
        (statusFilter === "Inactive" && !rate.isActive);

      const matchesCountry =
        countryFilter === "All Countries" || rate.country === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [vatRates, searchTerm, statusFilter, countryFilter]);

  // Calculate stats
  const totalRates = vatRates.length;
  const activeRates = vatRates.filter((r) => r.isActive).length;
  const defaultRate = vatRates.find((r) => r.isDefault)?.rate || 0;
  const countriesCount = new Set(vatRates.map((r) => r.country)).size;

  // Pagination
  const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
  const paginatedRates = filteredRates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    if (formData.rate <= 0) {
      errors.rate = "Rate must be greater than 0";
    } else if (formData.rate > 100) {
      errors.rate = "Rate cannot exceed 100%";
    }

    if (!formData.country) {
      errors.country = "Country is required";
    }

    if (formData.displayOrder < 0) {
      errors.displayOrder = "Display order cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

// Handle Create
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error("Please fix the form errors");
    return;
  }

  setIsSubmitting(true);
  
  try {
    const response = await vatratesService.create(formData);
    
    // ✅ Type assertion for proper response structure
    const apiData = response?.data as any;
    
    if (apiData?.success === true || response?.status === 200) {
      toast.success("✅ VAT Rate created successfully!");
      setShowCreateModal(false);
      resetForm();
      await fetchVATRates();
    } else {
      throw new Error(apiData?.message || "Failed to create VAT rate");
    }
  } catch (error: any) {
    console.error("Error creating VAT rate:", error);
    const errorMsg = error?.response?.data?.message || error?.message || "Failed to create VAT rate";
    toast.error(errorMsg);
  } finally {
    setIsSubmitting(false);
  }
};

// Handle Update
const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingRate) return;
  
  if (!validateForm()) {
    toast.error("Please fix the form errors");
    return;
  }

  setIsSubmitting(true);
  
  try {
    const response = await vatratesService.update(editingRate.id, formData);
    
    // ✅ Type assertion for proper response structure
    const apiData = response?.data as any;
    
    if (apiData?.success === true || response?.status === 200) {
      toast.success("✅ VAT Rate updated successfully!");
      setEditingRate(null);
      resetForm();
      await fetchVATRates();
    } else {
      throw new Error(apiData?.message || "Failed to update VAT rate");
    }
  } catch (error: any) {
    console.error("Error updating VAT rate:", error);
    const errorMsg = error?.response?.data?.message || error?.message || "Failed to update VAT rate";
    toast.error(errorMsg);
  } finally {
    setIsSubmitting(false);
  }
};

  // Handle Delete Confirmation
  const confirmDelete = (rate: VATRate) => {
    if (rate.isDefault) {
      toast.error("❌ Cannot delete default VAT rate. Please set another rate as default first.");
      return;
    }
    setDeletingRate(rate);
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deletingRate) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await vatratesService.delete(deletingRate.id);
      const apiResponse = response?.data as DeleteVATRateResponse;
      
      if (apiResponse?.success === true || response?.status === 200) {
        setVatRates(prevRates => prevRates.filter(rate => rate.id !== deletingRate.id));
        toast.success("🗑️ VAT Rate deleted successfully!");
        setDeletingRate(null);
      } else {
        throw new Error(apiResponse?.message || "Failed to delete VAT rate");
      }
    } catch (error: any) {
      console.error("Error deleting VAT rate:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete VAT rate";
      toast.error(errorMessage);
      await fetchVATRates();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rate: 0,
      isDefault: false,
      isActive: true,
      country: "",
      region: "",
      displayOrder: 0,
    });
    setFormErrors({});
    setCountrySearchTerm("");
  };

  // Open edit modal
  const openEditModal = (rate: VATRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      description: rate.description,
      rate: rate.rate,
      isDefault: rate.isDefault,
      isActive: rate.isActive,
      country: rate.country,
      region: rate.region,
      displayOrder: rate.displayOrder,
    });
    setFormErrors({});
    setCountrySearchTerm("");
  };

  // Export to CSV
  const handleExport = async (exportAll: boolean = false) => {
    try {
      const ratesToExport = exportAll ? vatRates : filteredRates;

      if (ratesToExport.length === 0) {
        toast.warning("⚠️ No VAT rates to export");
        return;
      }

      const csvHeaders = [
        "Name",
        "Description",
        "Rate (%)",
        "Country",
        "Region",
        "Is Active",
        "Is Default",
        "Display Order",
        "Created At"
      ];

      const csvData = ratesToExport.map(rate => [
        rate.name,
        rate.description,
        rate.rate,
        rate.country,
        rate.region,
        rate.isActive ? "Yes" : "No",
        rate.isDefault ? "Yes" : "No",
        rate.displayOrder,
        formatDate(rate.createdAt)
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vatrates_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`📥 ${ratesToExport.length} VAT rate${ratesToExport.length > 1 ? 's' : ''} exported!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export VAT rates");
    }
  };

  // Pagination functions
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const getPageNumbers = useCallback(() => {
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
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading VAT Rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            VAT Rates Management
          </h1>
          <p className="text-slate-400 mt-1">Manage tax rates for different countries</p>
        </div>
        <div className="flex gap-3">
          {/* Export Button */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                  <button
                    onClick={() => { handleExport(false); setShowExportMenu(false); }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 border-b border-slate-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Export Selected</p>
                      <p className="text-xs text-slate-400">{filteredRates.length} rates</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { handleExport(true); setShowExportMenu(false); }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium">Export All</p>
                      <p className="text-xs text-slate-400">{totalRates} rates</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add VAT Rate
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total VAT Rates</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{totalRates}</p>
                <span className="text-xs text-violet-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Active Rates</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{activeRates}</p>
                <span className="text-xs text-cyan-400">Enabled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-xl border border-pink-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-pink-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Default Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{defaultRate}%</p>
                <span className="text-xs text-pink-400">Standard</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Countries</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{countriesCount}</p>
                <span className="text-xs text-green-400">Covered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRates.length)} of {filteredRates.length} entries
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, country, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          >
            <option>All Countries</option>
            {Array.from(new Set(vatRates.map(r => r.country))).sort().map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <div className="text-sm text-slate-400">
            {filteredRates.length} rate{filteredRates.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* VAT Rates Table */}
        {paginatedRates.length === 0 ? (
          <div className="text-center py-12">
            <Percent className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No VAT rates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Name</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Country</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Rate (%)</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Region</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Default</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Display Order</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRates.map((rate) => (
                  <tr key={rate.id} className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${rate.isDefault ? 'bg-yellow-500/5' : ''}`}>
                    <td className="py-4 px-4">
                      <p className="text-white font-semibold flex items-center gap-2">
                        {rate.name}
                        {rate.isDefault && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                      </p>
                      <p className="text-xs text-slate-500">{rate.description}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span className="text-white">{rate.country}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-sm font-bold">
                        {rate.rate}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {rate.region || "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        rate.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {rate.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {rate.isDefault ? (
                        <Star className="w-5 h-5 text-yellow-400 mx-auto fill-yellow-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-slate-500/10 text-slate-400 rounded-lg text-sm">
                        {rate.displayOrder}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingRate(rate)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(rate)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(rate)}
                          disabled={rate.isDefault}
                          className={`p-2 rounded-lg transition-all ${
                            rate.isDefault 
                              ? 'text-slate-600 cursor-not-allowed opacity-50' 
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                          title={rate.isDefault ? "Cannot delete default VAT rate" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
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
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

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

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-400">
              Total: {filteredRates.length} rates
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {deletingRate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-2 border-red-500/30 rounded-3xl max-w-lg w-full shadow-2xl shadow-red-500/20 overflow-hidden">
            <div className="p-5 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Delete VAT Rate</h2>
                  <p className="text-slate-400 text-sm mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-300 text-center">
                Are you sure you want to delete <span className="font-bold text-white">"{deletingRate.name}"</span>?
              </p>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1.5 text-sm text-slate-300">
                    <p className="font-semibold text-red-400">VAT Rate Details:</p>
                    <div className="space-y-0.5">
                      <p>• Rate: <span className="text-white font-semibold">{deletingRate.rate}%</span></p>
                      <p>• Country: <span className="text-white font-semibold">{deletingRate.country}</span></p>
                      <p>• Region: <span className="text-white font-semibold">{deletingRate.region || "N/A"}</span></p>
                      <p>• Status: <span className={`font-semibold ${deletingRate.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {deletingRate.isActive ? "Active" : "Inactive"}
                      </span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-700 bg-slate-900/50 flex gap-3">
              <button
                onClick={() => setDeletingRate(null)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Create/Edit Modal with Searchable Country Dropdown */}
      {(showCreateModal || editingRate) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  {editingRate ? "Edit VAT Rate" : "Create New VAT Rate"}
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setEditingRate(null); resetForm(); }}
                  disabled={isSubmitting}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={editingRate ? handleUpdate : handleCreate} className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setFormErrors({ ...formErrors, name: '' });
                    }}
                    className={`w-full px-4 py-2.5 bg-slate-800/50 border ${
                      formErrors.name ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                    placeholder="e.g., Standard VAT"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      setFormErrors({ ...formErrors, description: '' });
                    }}
                    className={`w-full px-4 py-2.5 bg-slate-800/50 border ${
                      formErrors.description ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none`}
                    rows={3}
                    placeholder="Enter a detailed description..."
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.description}
                    </p>
                  )}
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Rate (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) => {
                      setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, rate: '' });
                    }}
                    className={`w-full px-4 py-2.5 bg-slate-800/50 border ${
                      formErrors.rate ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                    placeholder="20.00"
                  />
                  {formErrors.rate && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.rate}
                    </p>
                  )}
                </div>

                {/* ✅ Country with Search */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required={!formData.country}
                      value={formData.country ? getSelectedCountryName() : countrySearchTerm}
                      onChange={(e) => {
                        setCountrySearchTerm(e.target.value);
                        setShowCountryDropdown(true);
                        setFormData({ ...formData, country: '' });
                        setFormErrors({ ...formErrors, country: '' });
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      className={`w-full px-4 py-2.5 bg-slate-800/50 border ${
                        formErrors.country ? 'border-red-500' : 'border-slate-700'
                      } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                      placeholder="Search country..."
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  
                  {/* Dropdown */}
                  {showCountryDropdown && filteredCountries.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowCountryDropdown(false)} />
                      <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
                        {filteredCountries.slice(0, 50).map((country) => (
                          <button
                            key={country.cca2}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, country: country.cca2 });
                              setCountrySearchTerm("");
                              setShowCountryDropdown(false);
                              setFormErrors({ ...formErrors, country: '' });
                            }}
                            className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-2"
                          >
                            <span className="text-xl">{country.flag}</span>
                            <span>{country.name.common}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {formErrors.country && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.country}
                    </p>
                  )}
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    placeholder="e.g., Europe, Asia"
                  />
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Display Order <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) => {
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, displayOrder: '' });
                    }}
                    className={`w-full px-4 py-2.5 bg-slate-800/50 border ${
                      formErrors.displayOrder ? 'border-red-500' : 'border-slate-700'
                    } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all`}
                    placeholder="0"
                  />
                  {formErrors.displayOrder && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.displayOrder}
                    </p>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="col-span-2 flex gap-6 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                      Is Active
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 text-yellow-500 focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                      Is Default <Star className="w-3 h-3 text-yellow-400" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setEditingRate(null); resetForm(); }}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {editingRate ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingRate ? "Update VAT Rate" : "Create VAT Rate"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingRate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    VAT Rate Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">{viewingRate.name}</p>
                </div>
                <button
                  onClick={() => setViewingRate(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoCard icon={<Percent className="w-5 h-5 text-violet-400" />} label="Rate" value={`${viewingRate.rate}%`} />
                <InfoCard icon={<Globe className="w-5 h-5 text-cyan-400" />} label="Country" value={viewingRate.country} />
                <InfoCard icon={<MapPin className="w-5 h-5 text-green-400" />} label="Region" value={viewingRate.region || "N/A"} />
                <InfoCard icon={<Hash className="w-5 h-5 text-orange-400" />} label="Display Order" value={viewingRate.displayOrder.toString()} />
              </div>

              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <h4 className="text-lg font-bold text-white mb-2">Description</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{viewingRate.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2">
                    {viewingRate.isActive ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="text-white font-semibold">{viewingRate.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Star className={`w-6 h-6 text-yellow-400 ${viewingRate.isDefault ? 'fill-yellow-400' : ''}`} />
                    <div>
                      <p className="text-xs text-slate-400">Default Rate</p>
                      <p className="text-white font-semibold">{viewingRate.isDefault ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {(viewingRate.createdAt || viewingRate.updatedAt) && (
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-lg font-bold text-white mb-2">Timestamps</h4>
                  <div className="space-y-2 text-sm">
                    {viewingRate.createdAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Created At</span>
                        <span className="text-white flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(viewingRate.createdAt)}
                        </span>
                      </div>
                    )}
                    {viewingRate.updatedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Updated At</span>
                        <span className="text-white flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(viewingRate.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component
const InfoCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 hover:border-violet-500/50 transition-all">
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-white font-semibold">{value}</p>
      </div>
    </div>
  </div>
);
