"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Search, Percent, Eye, Filter, History, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, Gift, Target, Clock, TrendingUp, Users, Infinity as InfinityIcon, CalendarRange, ChevronDown, Package, RotateCcw, } from "lucide-react";


import { useToast } from "@/app/admin/_component/CustomToast";

import {
  CreateDiscountDto,
  Discount,
  DiscountLimitationType,
  discountsService,
  DiscountType,
} from "@/lib/services/discounts";
import { categoriesService, Category } from "@/lib/services/categories";
import { Product, productsService } from "@/lib/services";
import { DiscountUsageHistory } from "@/lib/services/discounts";
import DiscountModals from "./DiscountModals";
import ConfirmDialog from "@/app/admin/_component/ConfirmDialog";
import { useDebounce } from "../hooks/useDebounce";


// ========== INTERFACES ==========
interface SelectOption {
  value: string;
  label: string;
}

interface CategoryNode {
  id: string;
  name: string;
  parentId?: string | null;
  children?: CategoryNode[];
  subCategories?: CategoryNode[];
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

// ========== CATEGORY HELPER FUNCTIONS ==========
const formatCategoryLabel = (path: string[]): string => {
  if (path.length <= 2) return path.join(" → ");
  const head = path.slice(0, -1).join(" → ");
  const tail = path[path.length - 1];
  return `${head} → ${tail}`;
};

const buildCategoryTree = (flatCategories: CategoryNode[]): CategoryNode[] => {
  if (!Array.isArray(flatCategories) || flatCategories.length === 0) return [];
  const map: { [key: string]: CategoryNode } = {};
  const roots: CategoryNode[] = [];

  flatCategories.forEach((cat) => {
    map[cat.id] = { ...cat, children: cat.children || cat.subCategories || [] };
  });

  flatCategories.forEach((cat) => {
    if (cat.parentId) {
      if (map[cat.parentId]) {
        map[cat.parentId].children!.push(map[cat.id]);
      }
    } else {
      roots.push(map[cat.id]);
    }
  });

  return roots;
};

const flattenCategoryTree = (nodes: CategoryNode[]): SelectOption[] => {
  const result: SelectOption[] = [];
  const walk = (node: CategoryNode, path: string[]) => {
    const currentPath = [...path, node.name];
    result.push({ value: node.id, label: formatCategoryLabel(currentPath) });
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => walk(child, currentPath));
    }
  };
  nodes.forEach((node) => walk(node, []));
  return result;
};

const normalizeCategory = (cat: any): CategoryNode => ({
  id: cat.id,
  name: cat.name,
  parentId: cat.parentCategoryId ?? null,
  children: (cat.subCategories || cat.children || []).map(normalizeCategory),
});

const processCategoryData = (categories: any[]): SelectOption[] => {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  const hasSubTree = categories.some(
    (cat) =>
      (cat.subCategories && cat.subCategories.length) ||
      (cat.children && cat.children.length)
  );

  if (hasSubTree) {
    const normalizedTree = categories.map(normalizeCategory);
    return flattenCategoryTree(normalizedTree);
  }

  const hasParentId = categories.some(
    (cat) => cat.parentId !== undefined && cat.parentId !== null
  );

  if (hasParentId) {
    const tree = buildCategoryTree(categories as CategoryNode[]);
    return flattenCategoryTree(tree);
  }

  return categories.map((cat) => ({ value: cat.id, label: cat.name }));
};

// ========== REACT-SELECT STYLES ==========
const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    border: state.isFocused
      ? "1px solid rgb(139, 92, 246)"
      : "1px solid rgb(71, 85, 105)",
    borderRadius: "12px",
    minHeight: "48px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(139, 92, 246, 0.2)" : "none",
    "&:hover": { borderColor: "rgb(139, 92, 246)" },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "rgb(15, 23, 42)",
    border: "1px solid rgb(71, 85, 105)",
    borderRadius: "12px",
    zIndex: 9999,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: "200px",
    padding: "4px",
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "rgb(139, 92, 246)"
      : state.isFocused
      ? "rgba(139, 92, 246, 0.1)"
      : "transparent",
    color: "white",
    borderRadius: "8px",
    margin: "2px 0",
    padding: "8px 12px",
    "&:hover": {
      backgroundColor: state.isSelected
        ? "rgb(139, 92, 246)"
        : "rgba(139, 92, 246, 0.2)",
    },
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: "6px",
    border: "1px solid rgba(139, 92, 246, 0.3)",
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: "rgb(196, 181, 253)",
    fontSize: "14px",
    fontWeight: "500",
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: "rgb(196, 181, 253)",
    borderRadius: "0 6px 6px 0",
    "&:hover": { backgroundColor: "rgb(239, 68, 68)", color: "white" },
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: "rgb(148, 163, 184)",
    fontSize: "14px",
  }),
  singleValue: (provided: any) => ({ ...provided, color: "white" }),
  input: (provided: any) => ({ ...provided, color: "white" }),
  indicatorSeparator: (provided: any) => ({
    ...provided,
    backgroundColor: "rgb(71, 85, 105)",
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    color: "rgb(148, 163, 184)",
    "&:hover": { color: "white" },
  }),
  clearIndicator: (provided: any) => ({
    ...provided,
    color: "rgb(148, 163, 184)",
    "&:hover": { color: "rgb(239, 68, 68)" },
  }),
  noOptionsMessage: (provided: any) => ({
    ...provided,
    color: "rgb(148, 163, 184)",
    fontSize: "14px",
  }),
  loadingMessage: (provided: any) => ({
    ...provided,
    color: "rgb(148, 163, 184)",
    fontSize: "14px",
  }),
};

// ========== MAIN COMPONENT ==========
export default function DiscountsPage() {
  const toast = useToast();

  // State
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [viewingDiscount, setViewingDiscount] = useState<Discount | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isProductSelectionModalOpen, setIsProductSelectionModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("");
  const [productBrandFilter, setProductBrandFilter] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [usageHistoryModal, setUsageHistoryModal] = useState(false);
  const [selectedDiscountHistory, setSelectedDiscountHistory] = useState<Discount | null>(null);
  const [usageHistory, setUsageHistory] = useState<DiscountUsageHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [dateRangeFilter, setDateRangeFilter] = useState({ startDate: "", endDate: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
const [deletedFilter, setDeletedFilter] = useState<"notDeleted" | "deleted">("notDeleted");
const [statusConfirm, setStatusConfirm] = useState<Discount | null>(null);
const [restoreConfirm, setRestoreConfirm] = useState<Discount | null>(null);
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
const [isRestoring, setIsRestoring] = useState(false);
const debouncedSearch = useDebounce(searchTerm, 400);

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
    assignedManufacturerIds: [],
  });

  // Fetch data on mount
  useEffect(() => {
    fetchDiscounts();
    fetchDropdownData();
  }, []);

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        categoriesService.getAll(),
        productsService.getAll({ pageSize: 100 }),
      ]);

      if (categoriesRes?.data) {
        const c = categoriesRes.data as any;
        if (c.success && Array.isArray(c.data)) {
          setCategories(c.data);
        }
      }

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

  // Fetch discounts
const fetchDiscounts = async () => {
  setLoading(true);
  try {
    const response = await discountsService.getAll({
      params: {
        includeInactive: true, // always fetch both active/inactive
        isDeleted: deletedFilter === "deleted", // backend control
      },
    });

    setDiscounts(response.data?.data || []);
  } catch (error) {
    console.error("Error fetching discounts:", error);
    setDiscounts([]);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  fetchDiscounts();
}, [deletedFilter]);


useEffect(() => {
  setCurrentPage(1);
}, [debouncedSearch, activeFilter, typeFilter, deletedFilter]);


const handleStatusToggle = async () => {
  if (!statusConfirm) return;

  setIsUpdatingStatus(true);

  try {
    const payload = {
      ...statusConfirm,
      id: statusConfirm.id, // ✅ MUST match URL id
      isActive: !statusConfirm.isActive,

      // null → undefined fix
      couponCode: statusConfirm.couponCode ?? undefined,
      maximumDiscountAmount: statusConfirm.maximumDiscountAmount ?? undefined,
      limitationTimes: statusConfirm.limitationTimes ?? undefined,
      maximumDiscountedQuantity:
        statusConfirm.maximumDiscountedQuantity ?? undefined,
    };

    await discountsService.update(statusConfirm.id, payload);

    toast.success("Status updated successfully!");
    await fetchDiscounts();

  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Failed to update status");
  } finally {
    setIsUpdatingStatus(false);
    setStatusConfirm(null);
  }
};





const handleRestore = async () => {
  if (!restoreConfirm) return;

  setIsRestoring(true);
  try {
    await discountsService.restore(restoreConfirm.id);

    toast.success("Discount restored successfully");
    await fetchDiscounts();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Failed to restore discount");
  } finally {
    setIsRestoring(false);
    setRestoreConfirm(null);
  }
};


  // Handle discount type change
  const handleDiscountTypeChange = (newType: DiscountType) => {
    const hasAssignments =
      formData.assignedProductIds.length > 0 || formData.assignedCategoryIds.length > 0;

    if (hasAssignments && newType !== formData.discountType) {
      const productCount = formData.assignedProductIds.length;
      const categoryCount = formData.assignedCategoryIds.length;
      let warningMessage = "Discount type changed! Cleared: ";
      const cleared: string[] = [];

      if (productCount > 0)
        cleared.push(`${productCount} product${productCount > 1 ? "s" : ""}`);
      if (categoryCount > 0)
        cleared.push(`${categoryCount} ${categoryCount > 1 ? "categories" : "category"}`);

      warningMessage += cleared.join(", ");
      toast.warning(warningMessage);

      setFormData({
        ...formData,
        discountType: newType,
        assignedProductIds: [],
        assignedCategoryIds: [],
      });
    } else {
      setFormData({ ...formData, discountType: newType });
    }

    setProductCategoryFilter("");
    setProductBrandFilter("");
  };

  // Category options
  const categoryOptions: SelectOption[] = useMemo(
    () => processCategoryData(categories as any[]),
    [categories]
  );

  // Brand options
  const brandOptions: SelectOption[] = useMemo(() => {
    const uniqueBrands = new Map<string, string>();
    products.forEach((product) => {
      if ((product as any).brandId && (product as any).brandName) {
        uniqueBrands.set((product as any).brandId, (product as any).brandName);
      }
    });
    return Array.from(uniqueBrands.entries())
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  // Category filtered products
  const categoryFilteredProductOptions: SelectOption[] = useMemo(() => {
    if (formData.assignedCategoryIds.length === 0) return [];

    const filtered = products.filter((product) => {
      const prod = product as any;
      if (!Array.isArray(prod.categories)) return false;
      return prod.categories.some((cat: any) =>
        formData.assignedCategoryIds.includes(cat.categoryId)
      );
    });

    return filtered.map((product) => ({ value: product.id, label: product.name }));
  }, [products, formData.assignedCategoryIds]);

  // Filtered product options
  const filteredProductOptions: SelectOption[] = useMemo(() => {
    let filtered = products;

    if (productCategoryFilter) {
      filtered = filtered.filter((product) =>
        (product as any).categories?.some((cat: any) => cat.categoryId === productCategoryFilter)
      );
    }

    if (productBrandFilter) {
      filtered = filtered.filter((product) => (product as any).brandId === productBrandFilter);
    }

    return filtered.map((product) => ({ value: product.id, label: product.name }));
  }, [products, productCategoryFilter, productBrandFilter]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        assignedProductIds: formData.assignedProductIds.join(","),
        assignedCategoryIds: formData.assignedCategoryIds.join(","),
        assignedManufacturerIds: formData.assignedManufacturerIds.join(","),
        ...(editingDiscount && { id: editingDiscount.id }),
      };

      if (editingDiscount) {
        await discountsService.update(editingDiscount.id, payload);
        toast.success("Discount updated successfully!");
      } else {
        await discountsService.create(payload);
        toast.success("Discount created successfully!");
      }

      await fetchDiscounts();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving discount:", error);
      toast.error(error?.response?.data?.message || "Failed to save discount");
    }
  };

  // Handle edit
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
      startDate: discount.startDate.slice(0, 16),
      endDate: discount.endDate.slice(0, 16),
      requiresCouponCode: discount.requiresCouponCode,
      couponCode: discount.couponCode || "",
      isCumulative: discount.isCumulative,
      discountLimitation: discount.discountLimitation,
      limitationTimes: discount.limitationTimes,
      maximumDiscountedQuantity: discount.maximumDiscountedQuantity,
      appliedToSubOrders: discount.appliedToSubOrders,
      adminComment: discount.adminComment,
      assignedProductIds: discount.assignedProductIds
        ? discount.assignedProductIds.split(",").filter((id) => id.trim())
        : [],
      assignedCategoryIds: discount.assignedCategoryIds
        ? discount.assignedCategoryIds.split(",").filter((id) => id.trim())
        : [],
      assignedManufacturerIds: discount.assignedManufacturerIds
        ? discount.assignedManufacturerIds.split(",").filter((id) => id.trim())
        : [],
    });
    setShowModal(true);
    setProductCategoryFilter("");
    setProductBrandFilter("");
  };

  // Reset form
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
      assignedManufacturerIds: [],
    });
    setEditingDiscount(null);
    setProductCategoryFilter("");
    setProductBrandFilter("");
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await discountsService.delete(id);
      if (!response.error && (response.status === 200 || response.status === 204)) {
        toast.success("Discount deleted successfully!");
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

const clearFilters = () => {
  setActiveFilter("all");
  setTypeFilter("all");
  setDeletedFilter("notDeleted"); // ✅ reset deleted filter
  setSearchTerm("");
  setCurrentPage(1);
};

const hasActiveFilters =
  activeFilter !== "all" ||
  typeFilter !== "all" ||
  deletedFilter !== "notDeleted" ||   // ✅ ADD THIS
  searchTerm.trim() !== "";


  const getDiscountTypeLabel = (type: DiscountType): string => {
    const labels: Record<DiscountType, string> = {
      AssignedToOrderTotal: "Order Total",
      AssignedToProducts: "Products",
      AssignedToCategories: "Categories",
      AssignedToShipping: "Shipping",
      AssignedToManufacturers: "",
      AssignedToOrderSubTotal: "",
    };
    return labels[type];
  };

  const getDiscountTypeIcon = (type: DiscountType): string => {
    const icons: Record<DiscountType, string> = {
      AssignedToOrderTotal: "💰",
      AssignedToProducts: "📦",
      AssignedToCategories: "📁",
      AssignedToShipping: "🚚",
      AssignedToManufacturers: "🏭",
      AssignedToOrderSubTotal: "💵",
    };
    return icons[type];
  };

  const formatDiscountValue = (discount: Discount): string => {
    if (discount.usePercentage) {
      return `${discount.discountPercentage}%`;
    }
    return `£${discount.discountAmount}`;
  };
const getDiscountStatus = (discount: Discount) => {
  const now = new Date();
  const start = new Date(discount.startDate);
  const end = new Date(discount.endDate);

  if (!discount.isActive) {
    return { label: "Inactive", color: "red" };
  }

  if (now > end) {
    return { label: "Expired", color: "gray" };
  }

  if (now < start) {
    return { label: "Scheduled", color: "orange" };
  }

  return { label: "Active", color: "green" };
};

  const isDiscountActive = (discount: Discount): boolean => {
    if (!discount.isActive) return false;
    const now = new Date();
    const start = new Date(discount.startDate);
    const end = new Date(discount.endDate);
    return now >= start && now <= end;
  };

  // Filter data
const filteredDiscounts = discounts.filter((discount) => {
  const search = debouncedSearch.toLowerCase();

  const matchesSearch =
    (discount.name ?? "").toLowerCase().includes(search) ||
    (discount.adminComment ?? "").toLowerCase().includes(search) ||
    (discount.couponCode ?? "").toLowerCase().includes(search);

  const matchesActive =
    activeFilter === "all" ||
    (activeFilter === "active" && discount.isActive) ||
    (activeFilter === "inactive" && !discount.isActive);

  const matchesType =
    typeFilter === "all" || discount.discountType === typeFilter;

  return matchesSearch && matchesActive && matchesType;
});


  // Pagination
  const totalItems = filteredDiscounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredDiscounts.slice(startIndex, endIndex);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
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
      {/* Header */}
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
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl justify-center hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Discount
        </button>
      </div>

      {/* Stats Cards */}
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
              <p className="text-2xl font-bold text-white">
                {discounts.filter((d) => d.isActive).length}
              </p>
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
              <p className="text-2xl font-bold text-white">
                {discounts.filter((d) => d.discountType === "AssignedToProducts").length}
              </p>
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
              <p className="text-2xl font-bold text-white">
                {
                  discounts.filter((d) => {
                    const end = new Date(d.endDate);
                    const now = new Date();
                    const diffTime = end.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 7 && diffDays > 0;
                  }).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items per page selector */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-slate-400">entries per page</span>
          </div>
          <div className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-80">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

  <input
    type="search"
    placeholder="Search discounts, comments, coupon codes..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-11 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  />

  {/* 🔥 Typing Loader */}
  {searchTerm !== debouncedSearch && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )}
</div>


          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
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

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-40 ${
                typeFilter !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Types</option>
              <option value="AssignedToOrderTotal">Order Total</option>
              <option value="AssignedToProducts">Products</option>
              <option value="AssignedToCategories">Categories</option>
              <option value="AssignedToShipping">Shipping</option>
            </select>
            <select
  value={deletedFilter}
  onChange={(e) => setDeletedFilter(e.target.value as any)}
  className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white"
>
  <option value="notDeleted">Active Discounts</option>
  <option value="deleted">Deleted Discounts</option>
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
            {totalItems} discount{totalItems !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Discounts list */}
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
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                    Discount  Name
                  </th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Discount Type</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                    Discount value
                  </th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                    Period
                  </th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                    Usage
                  </th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((discount) => (
                  <tr
                    key={discount.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
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
                        <p className="text-xs text-slate-400">max £{discount.maximumDiscountAmount}</p>
                      )}
                    </td>
<td className="py-4 px-4 text-center">
  <div className="flex flex-col items-center gap-1">

    {(() => {
      const status = getDiscountStatus(discount);

      const colorClasses =
        status.color === "green"
          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
          : status.color === "orange"
          ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
          : status.color === "red"
          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "bg-gray-500/10 text-gray-400 cursor-not-allowed";

      const dotColor =
        status.color === "green"
          ? "bg-green-400"
          : status.color === "orange"
          ? "bg-orange-400"
          : status.color === "red"
          ? "bg-red-400"
          : "bg-gray-400";

      return (
        <>
          <button
            onClick={() => {
              if (status.label !== "Expired") {
                setStatusConfirm(discount);
              }
            }}
            title={
              status.label === "Active"
                ? "Click to deactivate discount"
                : status.label === "Inactive"
                ? "Click to activate discount"
                : status.label === "Scheduled"
                ? "Click to deactivate before start date"
                : "Expired discount cannot be modified"
            }
            className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200 ${colorClasses}`}
          >
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            {status.label}
          </button>

          {/* Extra info for Scheduled */}
          {status.label === "Scheduled" && (
            <span className="text-[10px] text-slate-400">
              Starts on {new Date(discount.startDate).toLocaleDateString()}
            </span>
          )}

          {/* Extra info for Expired */}
          {status.label === "Expired" && (
            <span className="text-[10px] text-slate-500">
              Expired on {new Date(discount.endDate).toLocaleDateString()}
            </span>
          )}
        </>
      );
    })()}

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
                          <p className="text-slate-400 mt-1">{discount.limitationTimes} times</p>
                        )}
                      </div>
                    </td>

{/* Actions column mein History button add karo */}
<td className="py-4 px-4">
  <div className="flex items-center justify-center gap-2">

    <button
      onClick={() => setViewingDiscount(discount)}
      className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg"
    >
      <Eye className="h-4 w-4" />
    </button>

    {deletedFilter === "notDeleted" && (
      <>
        <button
          onClick={() => handleEdit(discount)}
          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
        >
          <Edit className="h-4 w-4" />
        </button>


        <button
          onClick={() => setDeleteConfirm({ id: discount.id, name: discount.name })}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </>
    )}

    {deletedFilter === "deleted" && (
    <button
  onClick={() => setRestoreConfirm(discount)}
  title="Restore Discount"
  className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all flex items-center justify-center"
>
  <RotateCcw className="h-4 w-4" />
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
                        ? "bg-violet-500 text-white font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
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

            <div className="text-sm text-slate-400">Total {totalItems} items</div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Discount"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      {/* All Modals Component */}
      <DiscountModals
        showModal={showModal}
        setShowModal={setShowModal}
        viewingDiscount={viewingDiscount}
        setViewingDiscount={setViewingDiscount}
        usageHistoryModal={usageHistoryModal}
        setUsageHistoryModal={setUsageHistoryModal}
        isProductSelectionModalOpen={isProductSelectionModalOpen}
        setIsProductSelectionModalOpen={setIsProductSelectionModalOpen}
        formData={formData}
        setFormData={setFormData}
        editingDiscount={editingDiscount}
        products={products}
        categories={categories}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        filteredProductOptions={filteredProductOptions}
        categoryFilteredProductOptions={categoryFilteredProductOptions}
        productCategoryFilter={productCategoryFilter}
        setProductCategoryFilter={setProductCategoryFilter}
        productBrandFilter={productBrandFilter}
        setProductBrandFilter={setProductBrandFilter}
        productSearchTerm={productSearchTerm}
        setProductSearchTerm={setProductSearchTerm}
        customSelectStyles={customSelectStyles}
        handleSubmit={handleSubmit}
        handleDiscountTypeChange={handleDiscountTypeChange}
        resetForm={resetForm}
        handleEdit={handleEdit}
        getDiscountTypeIcon={getDiscountTypeIcon}
        getDiscountTypeLabel={getDiscountTypeLabel}
        isDiscountActive={isDiscountActive}
        selectedDiscountHistory={selectedDiscountHistory}
        usageHistory={usageHistory}
        loadingHistory={loadingHistory}
        dateRangeFilter={dateRangeFilter}
        setDateRangeFilter={setDateRangeFilter}
      />
      <ConfirmDialog
  isOpen={!!statusConfirm}
  onClose={() => setStatusConfirm(null)}
  onConfirm={handleStatusToggle}
  title="Change Status"
  message={`Are you sure you want to ${
    statusConfirm?.isActive ? "deactivate" : "activate"
  } "${statusConfirm?.name}"?`}
  confirmText="Confirm"
  cancelText="Cancel"
  isLoading={isUpdatingStatus}
/>
<ConfirmDialog
  isOpen={!!restoreConfirm}
  onClose={() => setRestoreConfirm(null)}
  onConfirm={handleRestore}
  title="Restore Discount"
  message={`Are you sure you want to restore "${restoreConfirm?.name}"?`}
  confirmText="Restore"
  cancelText="Cancel"
  isLoading={isRestoring}
/>

    </div>
  );
}
