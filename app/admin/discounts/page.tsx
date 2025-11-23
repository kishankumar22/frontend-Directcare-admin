"use client";

import { useState, useEffect } from "react";
import Select from 'react-select';
import { Plus, Edit, Trash2, Search, Percent, Eye, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, Gift, Target } from "lucide-react";
import {  API_ENDPOINTS } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { ProductDescriptionEditor } from "../products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Discount, DiscountLimitationType, discountsService ,DiscountType} from "@/lib/services/discounts";
import { Category } from "@/lib/services/categories";
import { Product } from "@/lib/services";


 interface SelectOption {
  value: string;
 }
interface FormData {
  name: string;
  isActive: boolean;
  discountType: DiscountType;
  usePercentage: boolean;
  discountAmount: number;
  discountPercentage: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  requiresCouponCode: boolean;
  couponCode: string;
  isCumulative: boolean;
  discountLimitation: DiscountLimitationType;
  limitationTimes: number | null;
  maximumDiscountedQuantity: number | null;
  appliedToSubOrders: boolean;
  adminComment: string;
  assignedProductIds: string[];
  assignedCategoryIds: string[];
  assignedManufacturerIds: string[];
  
}

// ✅ COMPLETE REACT-SELECT STYLES
const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    border: state.isFocused 
      ? '1px solid rgb(139, 92, 246)'
      : '1px solid rgb(71, 85, 105)',
    borderRadius: '12px',
    minHeight: '48px',
    boxShadow: state.isFocused 
      ? '0 0 0 2px rgba(139, 92, 246, 0.2)' 
      : 'none',
    '&:hover': {
      borderColor: 'rgb(139, 92, 246)',
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: 'rgb(15, 23, 42)',
    border: '1px solid rgb(71, 85, 105)',
    borderRadius: '12px',
    zIndex: 9999,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: '200px',
    padding: '4px',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgb(139, 92, 246)' 
      : state.isFocused 
      ? 'rgba(139, 92, 246, 0.1)' 
      : 'transparent',
    color: 'white',
    borderRadius: '8px',
    margin: '2px 0',
    padding: '8px 12px',
    '&:hover': {
      backgroundColor: state.isSelected 
        ? 'rgb(139, 92, 246)' 
        : 'rgba(139, 92, 246, 0.2)',
    },
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: '6px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: 'rgb(196, 181, 253)',
    fontSize: '14px',
    fontWeight: '500',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: 'rgb(196, 181, 253)',
    borderRadius: '0 6px 6px 0',
    '&:hover': {
      backgroundColor: 'rgb(239, 68, 68)',
      color: 'white',
    },
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: 'rgb(148, 163, 184)',
    fontSize: '14px',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: 'white',
  }),
  input: (provided: any) => ({
    ...provided,
    color: 'white',
  }),
  indicatorSeparator: (provided: any) => ({
    ...provided,
    backgroundColor: 'rgb(71, 85, 105)',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    color: 'rgb(148, 163, 184)',
    '&:hover': {
      color: 'white',
    },
  }),
  clearIndicator: (provided: any) => ({
    ...provided,
    color: 'rgb(148, 163, 184)',
    '&:hover': {
      color: 'rgb(239, 68, 68)',
    },
  }),
  noOptionsMessage: (provided: any) => ({
    ...provided,
    color: 'rgb(148, 163, 184)',
    fontSize: '14px',
  }),
  loadingMessage: (provided: any) => ({
    ...provided,
    color: 'rgb(148, 163, 184)',
    fontSize: '14px',
  }),
};

export default function DiscountsPage() {
  const toast = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [viewingDiscount, setViewingDiscount] = useState<Discount | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // ✅ DROPDOWN DATA STATES
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isUnlimited = (limitation: DiscountLimitationType): limitation is "Unlimited" => {
  return limitation === "Unlimited";
};
  // ✅ COMPLETE FORM DATA STATE
  const [formData, setFormData] = useState<FormData>({
    name: "",
    isActive: true,
    discountType: "AssignedToOrderTotal",
    usePercentage: true,
    discountAmount: 0,
    discountPercentage: 0,
    maximumDiscountAmount: null,
    startDate: "",
    endDate: "",
    requiresCouponCode: false,
    couponCode: "",
    isCumulative: false,
    discountLimitation: "Unlimited",
    limitationTimes: null,
    maximumDiscountedQuantity: null,
    appliedToSubOrders: false,
    adminComment: "",
    assignedProductIds: [],
    assignedCategoryIds: [],
    assignedManufacturerIds: []
  });

  useEffect(() => {
    fetchDiscounts();
    fetchDropdownData();
  }, []);

const fetchDropdownData = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 👉 API Calls using apiClient
    const [categoriesRes, productsRes] = await Promise.all([
      apiClient.get(`${API_ENDPOINTS.categories}?includeInactive=false`, { headers }),
      apiClient.get(API_ENDPOINTS.products, { headers })
    ]);

    // 👉 Categories Response Handling
    if (categoriesRes?.data) {
      const c = categoriesRes.data as any;
      if (c.success && Array.isArray(c.data)) {
        setCategories(c.data);
      }
    }

    // 👉 Products Response Handling
    if (productsRes?.data) {
      const p = productsRes.data as any;
      if (p.success && p.data?.items) {
        setProducts(p.data.items);
      }
    }

  } catch (error) {
    console.error("Error fetching dropdown data:", error);
    toast.error("Failed to load dropdown data");
  }
};



  // ✅ CONVERT DATA TO SELECT OPTIONS
  const categoryOptions: SelectOption[] = categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }));

  const productOptions: SelectOption[] = products.map(product => ({
    value: product.id,
    label: product.name
  }));



// ✅ FETCH DISCOUNTS (apiClient version)
const fetchDiscounts = async () => {
  setLoading(true);
  try {
    const response = await discountsService.getAll({
      params: { includeInactive: true }
    });
    const discountsData = response.data?.data || [];
    setDiscounts(discountsData);
  } catch (error) {
    console.error("Error fetching discounts:", error);
    setDiscounts([]);
  } finally {
    setLoading(false);
  }
};




const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const payload = {
      ...formData,
      assignedProductIds: formData.assignedProductIds.join(','),
      assignedCategoryIds: formData.assignedCategoryIds.join(','),
      assignedManufacturerIds: formData.assignedManufacturerIds.join(','),
      ...(editingDiscount && { id: editingDiscount.id }),
    };

    if (editingDiscount) {
      await discountsService.update(editingDiscount.id, payload);
      toast.success("Discount updated successfully! ✅");
    } else {
      await discountsService.create(payload);
      toast.success("Discount created successfully! 🎉");
    }
    await fetchDiscounts();
    setShowModal(false);
    resetForm();
  } catch (error: any) {
    console.error("Error saving discount:", error);
    toast.error(error?.response?.data?.message || "Failed to save discount");
  }
};



  // ✅ COMPLETE HANDLE EDIT FUNCTION
  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      isActive: discount.isActive,
      discountType: discount.discountType,
      usePercentage: discount.usePercentage,
      discountAmount: discount.discountAmount,
      discountPercentage: discount.discountPercentage,
      maximumDiscountAmount: discount.maximumDiscountAmount,
    startDate: discount.startDate.slice(0, 16),  // "2025-11-07T14:30:00" → "2025-11-07T14:30"
     endDate: discount.endDate.slice(0, 16),
      requiresCouponCode: discount.requiresCouponCode,
      couponCode: discount.couponCode || "",
      isCumulative: discount.isCumulative,
      discountLimitation: discount.discountLimitation,
      limitationTimes: discount.limitationTimes,
      maximumDiscountedQuantity: discount.maximumDiscountedQuantity,
      appliedToSubOrders: discount.appliedToSubOrders,
      adminComment: discount.adminComment,
      assignedProductIds: discount.assignedProductIds ? discount.assignedProductIds.split(',').filter(id => id.trim() !== '') : [],
      assignedCategoryIds: discount.assignedCategoryIds ? discount.assignedCategoryIds.split(',').filter(id => id.trim() !== '') : [],
      assignedManufacturerIds: discount.assignedManufacturerIds ? discount.assignedManufacturerIds.split(',').filter(id => id.trim() !== '') : []
    });
    setShowModal(true);
  };

  // ✅ COMPLETE RESET FORM FUNCTION
  const resetForm = () => {
    setFormData({
      name: "",
      isActive: true,
      discountType: "AssignedToOrderTotal",
      usePercentage: true,
      discountAmount: 0,
      discountPercentage: 0,
      maximumDiscountAmount: null,
      startDate: "",
      endDate: "",
      requiresCouponCode: false,
      couponCode: "",
      isCumulative: false,
      discountLimitation: "Unlimited",
      limitationTimes: null,
      maximumDiscountedQuantity: null,
      appliedToSubOrders: false,
      adminComment: "",
      assignedProductIds: [],
      assignedCategoryIds: [],
      assignedManufacturerIds: []
    });
    setEditingDiscount(null);
  };

  // ✅ HANDLE DELETE FUNCTION
const handleDelete = async (id: string) => {
  setIsDeleting(true);
  try {
    const response = await discountsService.delete(id); // ✅ No extra params
    if (!response.error && (response.status === 200 || response.status === 204)) {
      toast.success("Discount deleted successfully! 🗑️");
      await fetchDiscounts();
    } else {
      toast.error(response.error || "Failed to delete discount");
    }
  } catch (error: any) {
    console.error("Error deleting discount:", error);
    toast.error(error?.response?.data?.message || "Failed to delete discount");
  } finally {
    setIsDeleting(false);
    setDeleteConfirm(null);
  }
};


  // ✅ UTILITY FUNCTIONS
  const clearFilters = () => {
    setActiveFilter("all");
    setTypeFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = activeFilter !== "all" || typeFilter !== "all" || searchTerm.trim() !== "";

  const getDiscountTypeLabel = (type: DiscountType) => {
    const labels: Record<DiscountType, string> = {
      "AssignedToOrderTotal": "Order Total",
      "AssignedToProducts": "Products",
      "AssignedToCategories": "Categories", 
      "AssignedToManufacturers": "Manufacturers",
      "AssignedToShipping": "Shipping"
    };
    return labels[type];
  };

  const getDiscountTypeIcon = (type: DiscountType) => {
    const icons: Record<DiscountType, string> = {
      "AssignedToOrderTotal": "💰",
      "AssignedToProducts": "📦",
      "AssignedToCategories": "📂",
      "AssignedToManufacturers": "🏭",
      "AssignedToShipping": "🚚"
    };
    return icons[type];
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.usePercentage) {
      return `${discount.discountPercentage}%`;
    }
    return `£${discount.discountAmount}`;
  };

  const isDiscountActive = (discount: Discount) => {
    if (!discount.isActive) return false;
    const now = new Date();
    const start = new Date(discount.startDate);
    const end = new Date(discount.endDate);
    return now >= start && now <= end;
  };

  // ✅ FILTER DATA
  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.adminComment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (discount.couponCode && discount.couponCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActive = activeFilter === "all" || 
                         (activeFilter === "active" && discount.isActive) ||
                         (activeFilter === "inactive" && !discount.isActive);
    
    const matchesType = typeFilter === "all" || discount.discountType === typeFilter;

    return matchesSearch && matchesActive && matchesType;
  });

  // ✅ PAGINATION CALCULATIONS
  const totalItems = filteredDiscounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredDiscounts.slice(startIndex, endIndex);

  // ✅ PAGINATION FUNCTIONS
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
    setCurrentPage(1);
  }, [searchTerm, activeFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading discounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* ✅ COMPLETE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Discount Management
          </h1>
          <p className="text-slate-400">Manage your store discounts and offers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl  justify-center hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Discount
        </button>
      </div>

      {/* ✅ COMPLETE STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Total Discounts</p>
              <p className="text-2xl font-bold text-white">{discounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Active Discounts</p>
              <p className="text-2xl font-bold text-white">{discounts.filter(d => d.isActive).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Product Discounts</p>
              <p className="text-2xl font-bold text-white">{discounts.filter(d => d.discountType === "AssignedToProducts").length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-xl border border-orange-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Expiring Soon</p>
              <p className="text-2xl font-bold text-white">{discounts.filter(d => {
                const end = new Date(d.endDate);
                const now = new Date();
                const diffTime = end.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7 && diffDays > 0;
              }).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ITEMS PER PAGE SELECTOR */}
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
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
          </div>
        </div>
      </div>

      {/* ✅ COMPLETE SEARCH AND FILTERS */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search discounts, comments, coupon codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                activeFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-40 ${
                typeFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Types</option>
              <option value="AssignedToOrderTotal">Order Total</option>
              <option value="AssignedToProducts">Products</option>
              <option value="AssignedToCategories">Categories</option>
              <option value="AssignedToManufacturers">Manufacturers</option>
              <option value="AssignedToShipping">Shipping</option>
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
            {totalItems} discount{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ✅ COMPLETE DISCOUNTS LIST */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <Percent className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No discounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Discount</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Type</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Value</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Period</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Usage</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((discount) => (
                  <tr key={discount.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg">
                          {getDiscountTypeIcon(discount.discountType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors"
                            onClick={() => setViewingDiscount(discount)}
                          >
                            {discount.name}
                          </p>
                          {discount.couponCode && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">
                                {discount.couponCode}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">
                        {getDiscountTypeLabel(discount.discountType)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-white font-semibold text-lg">
                        {formatDiscountValue(discount)}
                      </span>
                      {discount.maximumDiscountAmount && (
                        <p className="text-xs text-slate-400">
                          max ₹{discount.maximumDiscountAmount}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {isDiscountActive(discount) ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            Active
                          </span>
                        ) : discount.isActive ? (
                          <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-xs font-medium flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            Scheduled
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-xs text-slate-300">
                        <p>{new Date(discount.startDate).toLocaleDateString()}</p>
                        <p className="text-slate-500">to</p>
                        <p>{new Date(discount.endDate).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-xs">
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
                          {discount.discountLimitation}
                        </span>
                        {discount.limitationTimes && (
                          <p className="text-slate-400 mt-1">
                            {discount.limitationTimes} times
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingDiscount(discount)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(discount)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit Discount"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: discount.id, name: discount.name })}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Discount"
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

      {/* ✅ COMPLETE PAGINATION */}
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

      {/* ✅ COMPLETE CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingDiscount ? 'Update discount information' : 'Add a new discount to your store'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-2 space-y-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Basic Information */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-sm">1</span>
                  <span>Basic Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Discount Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter discount name"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Discount Type *</label>
                    <select
                      required
                      value={formData.discountType}
                      onChange={(e) => setFormData({...formData, discountType: e.target.value as DiscountType})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    >
                      <option value="AssignedToOrderTotal">	Assigned to order total</option>
                      <option value="AssignedToProducts">Assigned to products</option>
                      <option value="AssignedToCategories">Assigned to categories</option>              
                      <option value="AssignedToShipping">Assigned to shipping</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Admin Comment</label>
                  <ProductDescriptionEditor
                    value={formData.adminComment}
                    onChange={(content) => setFormData({...formData, adminComment: content})}
                    placeholder="Add internal notes about this discount..."
                    height={250}
                    required={false}
                  />
                </div>
              </div>

              {/* Discount Value */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">2</span>
                  <span>Discount Value</span>
                </h3>
                
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                    <input
                      type="radio"
                      name="discountType"
                      checked={formData.usePercentage}
                      onChange={() => setFormData({...formData, usePercentage: true})}
                      className="w-5 h-5 text-violet-500 focus:ring-2 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-white font-medium">Percentage</p>
                      <p className="text-slate-400 text-xs">Discount by percentage</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                    <input
                      type="radio"
                      name="discountType"
                      checked={!formData.usePercentage}
                      onChange={() => setFormData({...formData, usePercentage: false})}
                      className="w-5 h-5 text-violet-500 focus:ring-2 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-white font-medium">Fixed Amount</p>
                      <p className="text-slate-400 text-xs">Discount by fixed amount</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.usePercentage ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Discount Percentage *</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.discountPercentage}
                          onChange={(e) => setFormData({...formData, discountPercentage: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all pr-12"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Discount Amount *</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.discountAmount}
                          onChange={(e) => setFormData({...formData, discountAmount: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all pl-12"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"> £</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Maximum Discount Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maximumDiscountAmount || ''}
                        onChange={(e) => setFormData({...formData, maximumDiscountAmount: e.target.value ? parseFloat(e.target.value) : null})}
                        placeholder="No limit"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all pl-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">£</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Maximum Discounted Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maximumDiscountedQuantity || ''}
                      onChange={(e) => setFormData({...formData, maximumDiscountedQuantity: e.target.value ? parseInt(e.target.value) : null})}
                      placeholder="No limit"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Date Range */}
<div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm">3</span>
    <span>Valid Period</span>
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
    {/* START DATE & TIME */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">Start Date & Time *</label>
      <input
        type="datetime-local"
        required
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>

    {/* END DATE & TIME */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">End Date & Time *</label>
      <input
        type="datetime-local"
        required
        value={formData.endDate}
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>
  </div>
</div>
              {/* Coupon Code */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-sm">4</span>
                  <span>Coupon Settings</span>
                </h3>
                
                <div className="mb-4">
                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                    <input
                      type="checkbox"
                      checked={formData.requiresCouponCode}
                      onChange={(e) => setFormData({...formData, requiresCouponCode: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-white font-medium">Requires Coupon Code</p>
                      <p className="text-slate-400 text-xs">Customers must enter a coupon code to get this discount</p>
                    </div>
                  </label>
                </div>

                {formData.requiresCouponCode && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Coupon Code *</label>
                    <input
                      type="text"
                      required={formData.requiresCouponCode}
                      value={formData.couponCode}
                      onChange={(e) => setFormData({...formData, couponCode: e.target.value.toUpperCase()})}
                      placeholder="Enter coupon code"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Usage Limitations */}
{/* ✅ FIXED Usage Limitations Section */}
<div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-sm">5</span>
    <span>Usage Limitations</span>
  </h3>
  
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-300 mb-2">Limitation Type</label>
    <select
      value={formData.discountLimitation}
      onChange={(e) => setFormData({...formData, discountLimitation: e.target.value as DiscountLimitationType})}
      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
    >
      <option value="Unlimited">Unlimited</option>
      <option value="NTimesOnly">Limited number of uses total</option>
      <option value="NTimesPerCustomer">Limited number of uses per customer</option>
    </select>
  </div>

  {/* ✅ FIXED: Now properly checks against "Unlimited" */}
  {formData.discountLimitation !== "Unlimited" && (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Number of Uses *
        <span className="text-xs text-slate-400 ml-2">
          {formData.discountLimitation === "NTimesOnly" 
            ? "(Total uses across all customers)"
            : "(Uses per individual customer)"
          }
        </span>
      </label>
      <input
        type="number"
     // ✅ SIMPLE FIX - Line 1778
     required={formData.discountLimitation !== "Unlimited" as DiscountLimitationType}

        min="1"


        value={formData.limitationTimes || ''}
        onChange={(e) => setFormData({...formData, limitationTimes: e.target.value ? parseInt(e.target.value) : null})}
        placeholder="Enter number of uses"
        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>
  )}
</div>

              {/* ✅ COMPLETE ASSIGNMENT SECTION WITH REACT-SELECT */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-sm">6</span>
                  <span>Assignment & Settings</span>
                </h3>
                <div className="space-y-4">
                  
                  {/* ✅ PRODUCTS MULTI-SELECT */}
                  {formData.discountType === "AssignedToProducts" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select Products *
                        <span className="text-xs text-slate-400 ml-2">(Choose which products this discount applies to)</span>
                      </label>
                      <Select
                        isMulti
                        options={productOptions}
                        value={productOptions.filter(opt => formData.assignedProductIds.includes(opt.value))}
                        onChange={(selectedOptions) => {
                          const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                          setFormData({...formData, assignedProductIds: ids});
                        }}
                        placeholder="Search and select products..."
                        isSearchable
                        closeMenuOnSelect={false}
                        styles={customSelectStyles}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => "No products found"}
                        loadingMessage={() => "Loading products..."}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {formData.assignedProductIds.length} product{formData.assignedProductIds.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                  
                  {/* ✅ CATEGORIES MULTI-SELECT */}
                  {formData.discountType === "AssignedToCategories" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select Categories *
                        <span className="text-xs text-slate-400 ml-2">(Choose which categories this discount applies to)</span>
                      </label>
                      <Select
                        isMulti
                        options={categoryOptions}
                        value={categoryOptions.filter(opt => formData.assignedCategoryIds.includes(opt.value))}
                        onChange={(selectedOptions) => {
                          const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                          setFormData({...formData, assignedCategoryIds: ids});
                        }}
                        placeholder="Search and select categories..."
                        isSearchable
                        closeMenuOnSelect={false}
                        styles={customSelectStyles}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => "No categories found"}
                        loadingMessage={() => "Loading categories..."}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {formData.assignedCategoryIds.length} categor{formData.assignedCategoryIds.length !== 1 ? 'ies' : 'y'} selected
                      </p>
                    </div>
                  )}
                  

                  {/* Settings Checkboxes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                          className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                        />
                        <div>
                          <p className="text-white font-medium">Active</p>
                          <p className="text-slate-400 text-xs">Enable this discount</p>
                        </div>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                        <input
                          type="checkbox"
                          checked={formData.isCumulative}
                          onChange={(e) => setFormData({...formData, isCumulative: e.target.checked})}
                          className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                        />
                        <div>
                          <p className="text-white font-medium">Cumulative</p>
                          <p className="text-slate-400 text-xs">Can combine with others</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.appliedToSubOrders}
                        onChange={(e) => setFormData({...formData, appliedToSubOrders: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                      />
                      <div>
                        <p className="text-white font-medium">Apply to Sub Orders</p>
                        <p className="text-slate-400 text-xs">Apply discount to sub orders as well</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105"
                >
                  {editingDiscount ? '✓ Update Discount' : '+ Create Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ VIEW DETAILS MODAL */}
      {viewingDiscount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Discount Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">View discount information</p>
                </div>
                <button
                  onClick={() => setViewingDiscount(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Gift className="w-4 h-4" />
                      <span>Discount Name</span>
                    </div>
                    <p className="text-white font-semibold text-lg">{viewingDiscount.name}</p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Target className="w-4 h-4" />
                      <span>Type</span>
                    </div>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <span className="text-lg">{getDiscountTypeIcon(viewingDiscount.discountType)}</span>
                      {getDiscountTypeLabel(viewingDiscount.discountType)}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Percent className="w-4 h-4" />
                      <span>Discount Value</span>
                    </div>
                    <p className="text-white font-semibold text-xl">{formatDiscountValue(viewingDiscount)}</p>
                    {viewingDiscount.maximumDiscountAmount && (
                      <p className="text-xs text-slate-400">Max: ₹{viewingDiscount.maximumDiscountAmount}</p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDiscountActive(viewingDiscount) ? (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm font-medium flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Active Now
                        </span>
                      ) : viewingDiscount.isActive ? (
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-sm font-medium flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          Scheduled
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Period & Usage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Valid Period</span>
                    </div>
                    <p className="text-white font-medium">
                      {new Date(viewingDiscount.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-slate-400 text-sm">to</p>
                    <p className="text-white font-medium">
                      {new Date(viewingDiscount.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <span>Usage Limitation</span>
                    </div>
                    <p className="text-white font-medium">{viewingDiscount.discountLimitation}</p>
                    {viewingDiscount.limitationTimes && (
                      <p className="text-slate-400 text-sm">{viewingDiscount.limitationTimes} times</p>
                    )}
                  </div>
                </div>

                {/* Coupon Code */}
                {viewingDiscount.requiresCouponCode && viewingDiscount.couponCode && (
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <span>Coupon Code</span>
                    </div>
                    <p className="text-green-400 font-mono text-lg bg-green-400/10 px-3 py-2 rounded-lg inline-block">
                      {viewingDiscount.couponCode}
                    </p>
                  </div>
                )}

                {/* Assignment Info */}
                {(viewingDiscount.assignedProductIds || viewingDiscount.assignedCategoryIds || viewingDiscount.assignedManufacturerIds) && (
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                      <span>Assignment Details</span>
                    </div>
                    
                    {viewingDiscount.assignedProductIds && (
                      <div className="mb-3">
                        <p className="text-white font-medium mb-1">Assigned Products:</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingDiscount.assignedProductIds.split(',').map(productId => {
                            const product = products.find(p => p.id === productId.trim());
                            return (
                              <span key={productId} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm">
                                {product ? product.name : productId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {viewingDiscount.assignedCategoryIds && (
                      <div className="mb-3">
                        <p className="text-white font-medium mb-1">Assigned Categories:</p>
                        <div className="flex flex-wrap gap-2">
                          {viewingDiscount.assignedCategoryIds.split(',').map(categoryId => {
                            const category = categories.find(c => c.id === categoryId.trim());
                            return (
                              <span key={categoryId} className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-sm">
                                {category ? category.name : categoryId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Admin Comment */}
                {viewingDiscount.adminComment && (
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <span>Admin Comment</span>
                    </div>
                    <div
                      className="prose prose-invert max-w-none text-slate-200"
                      dangerouslySetInnerHTML={{
                        __html: viewingDiscount.adminComment || "No comment available",
                      }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => handleEdit(viewingDiscount)}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-medium text-sm"
                  >
                    Edit Discount
                  </button>
                  <button
                    onClick={() => setViewingDiscount(null)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Discount"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete Discount"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />
    </div>
  );
}
