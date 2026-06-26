"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Pill,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Tag,
  FilterX
} from "lucide-react";
import Link from "next/link";
import Select from "react-select";
import { useToast } from "@/app/admin/_components/CustomToast";
import { productsService } from "@/lib/services";
import { categoriesService } from "@/lib/services/categories";
import { brandsService } from "@/lib/services/brands";
import { vatratesService } from "@/lib/services/vatrates";
import { formatDate, getProductImage } from "../_utils/formatUtils";
import { useDebounce } from "../_hooks/useDebounce";
import { scrollCls, getSelectStyles } from "../_utils/styles";
import { useTheme } from "@/app/admin/_context/theme-provider";
import { useAuth } from "../_context/auth-context";

type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface SelectOption {
  value: string;
  label: string;
  level?: number;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  subCategories?: CategoryData[];
}

interface BrandData {
  id: string;
  name: string;
  slug: string;
}

interface PharmaProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  isPublished: boolean;
  pharmaApprovalStatus: string;
  pharmaApprovedAt?: string | null;
  pharmaApprovedBy?: string | null;
  pharmaApprovalComment?: string | null;
  categoryName: string;
  brandName: string;
  createdAt: string;
}

export default function PharmaProductPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();
  const selectStyles = useMemo(() => getSelectStyles(theme === 'dark'), [theme]);

  // CATEGORIES & BRANDS CACHED LISTS
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [brands, setBrands] = useState<BrandData[]>([]);

  // SEARCH LOADING & DEBOUNCE
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);

  // SELECT OPTIONS
  const homepageOptions: SelectOption[] = [
    { value: "all", label: "Homepage: All" },
    { value: "yes", label: "Show on Homepage" },
    { value: "no", label: "Not on Homepage" },
  ];

  const typeOptions: SelectOption[] = [
    { value: "all", label: "List Type" },
    { value: "simple", label: "Simple" },
    { value: "grouped", label: "Grouped" },
    { value: "variable", label: "variable" },
  ];

  const statusOptions: SelectOption[] = [
    { value: "all", label: "All Stock Status" },
    { value: "InStock", label: "In Stock" },
    { value: "LowStock", label: "Low Stock" },
    { value: "OutOfStock", label: "Out of Stock" },
  ];

  const pharmaOptions: SelectOption[] = [
    { value: "all", label: "Product Type" },
    { value: "yes", label: "Pharma" },
    { value: "no", label: "Others" },
  ];

  const pharmaApprovalOptions: SelectOption[] = [
    { value: "all", label: "Approval: All" },
    { value: "Pending", label: "Pending Review" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "NotRequired", label: "Not Required" },
  ];

  const visibilityOptions: SelectOption[] = [
    { value: "all", label: "All Visibility" },
    { value: "published", label: "Published" },
    { value: "unpublished", label: "Unpublished / Draft" },
  ];

  const deliveryOptions: SelectOption[] = [
    { value: "all", label: "Shipping Method:All" },
    { value: "nextDay", label: "Next Day Delivery" },
    { value: "standard", label: "Standard Delivery" },
  ];

  const markAsNewOptions: SelectOption[] = [
    { value: "all", label: "Mark as New: All" },
    { value: "yes", label: "Mark as New" },
    { value: "no", label: "Not New" },
  ];

  const returnableOptions: SelectOption[] = [
    { value: "all", label: "Returnable: All" },
    { value: "yes", label: "Not Returnable" },
    { value: "no", label: "Returnable" },
  ];

  const subscriptionOptions: SelectOption[] = [
    { value: "all", label: "Subscription: All" },
    { value: "yes", label: "Subscription" },
    { value: "no", label: "One-time" },
  ];

  const [vatOptions, setVatOptions] = useState<SelectOption[]>([
    { value: "all", label: "VAT: All" }
  ]);

  const deletedOptions = [
    { value: "all", label: "All Records" },
    { value: "active", label: "Active Only" },
    { value: "inactive", label: "Inactive Only" },
    { value: "deleted", label: "Deleted Only" },
  ];

  // ACTIVE FILTER STATES
  const [selectedCategory, setSelectedCategory] = useState<SelectOption>({ value: "all", label: "All Categories" });
  const [selectedBrand, setSelectedBrand] = useState<SelectOption>({ value: "all", label: "All Brands" });
  const [selectedHomepage, setSelectedHomepage] = useState<SelectOption>({ value: "all", label: "Homepage: All" });
  const [selectedType, setSelectedType] = useState<SelectOption>({ value: "all", label: "All Types" });
  const [stockStatusFilter, setStockStatusFilter] = useState<SelectOption>({ value: "all", label: "All Stock Status" });
  const [publishedFilter, setPublishedFilter] = useState<SelectOption>({ value: "all", label: "All Visibility" });
  const [deliveryFilter, setDeliveryFilter] = useState<SelectOption>({ value: "all", label: "All Delivery" });
  const [markAsNewFilter, setMarkAsNewFilter] = useState<SelectOption>({ value: "all", label: "Mark as New: All" });
  const [notReturnableFilter, setNotReturnableFilter] = useState<SelectOption>({ value: "all", label: "Returnable: All" });
  const [recurringFilter, setRecurringFilter] = useState<SelectOption>({ value: "all", label: "Subscription: All" });
  const [vatFilter, setVatFilter] = useState<SelectOption>({ value: "all", label: "VAT: All" });
  const [deletedFilter, setDeletedFilter] = useState<SelectOption>({ value: "all", label: "All Records" });
  const [pharmaFilter, setPharmaFilter] = useState<SelectOption>({ value: "all", label: "Product Type" });
  const [pharmaApprovalFilter, setPharmaApprovalFilter] = useState<SelectOption>({ value: "all", label: "Approval: All" });

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [products, setProducts] = useState<PharmaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // FETCH CATEGORIES
  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoriesService.getAll({
        params: {
          includeInactive: false,
          includeSubCategories: true,
        },
      });
      const categoriesData = Array.isArray(response.data?.data?.items)
        ? response.data.data.items
        : [];
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  // FETCH BRANDS
  const fetchBrands = useCallback(async () => {
    try {
      const response = await brandsService.getAll({
        params: { includeUnpublished: false }
      });
      const brandsData = Array.isArray(response.data?.data?.items)
        ? response.data.data.items
        : [];
      setBrands(brandsData);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  }, []);

  // FETCH VAT RATES
  const fetchVATRates = useCallback(async () => {
    try {
      const response = await vatratesService.getAll();
      if (response?.data?.success) {
        const list = response.data.data || [];
        setVatOptions([
          { value: "all", label: "All VAT Rates" },
          ...list.map((v: any) => ({
            value: v.id,
            label: `${v.name} (${v.rate}%)`,
          })),
        ]);
      }
    } catch (error) {
      console.error("Failed to load VAT rates:", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchVATRates();
  }, [fetchCategories, fetchBrands, fetchVATRates]);

  // FLATTEN CATEGORIES WITH FULL PATH
  const categoryOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: "all", label: "All Categories" }];
    const flatten = (cats: CategoryData[], level = 0, parentPath: string[] = []) => {
      cats.forEach((cat) => {
        const currentPath = [...parentPath, cat.name];
        let fullPath = '';
        if (level === 0) {
          fullPath = cat.name;
        } else {
          fullPath = currentPath.map((name, idx) => {
            if (idx === 0) return name;
            const sep = idx === 1 ? ' > ' : ' >> ';
            return sep + name;
          }).join('');
        }
        options.push({
          value: cat.id,
          label: fullPath,
          level,
        });
        if (cat.subCategories && cat.subCategories.length > 0) {
          flatten(cat.subCategories, level + 1, currentPath);
        }
      });
    };
    flatten(categories);
    return options;
  }, [categories]);

  const formatOptionLabel = (option: SelectOption) => {
    const parts = option.label.split(" > ");
    const depth = parts.length;
    return (
      <span
        title={option.label}
        className={`
          block whitespace-normal break-words leading-tight
          ${depth === 1 ? "text-sm" : ""}
          ${depth === 2 ? "text-xs dark:text-slate-300 text-slate-600" : ""}
          ${depth >= 3 ? "text-[11px] dark:text-slate-400 text-slate-500" : ""}
        `}
      >
        {option.label}
      </span>
    );
  };

  const brandOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "all", label: "All Brands" },
      ...brands.map((b) => ({
        value: b.id,
        label: b.name
      })),
    ];
  }, [brands]);

  // CLEAR FILTERS
  const clearFilters = useCallback(() => {
    setSelectedCategory({ value: "all", label: "All Categories" });
    setSelectedBrand({ value: "all", label: "All Brands" });
    setSelectedHomepage({ value: "all", label: "Homepage: All" });
    setSelectedType({ value: "all", label: "All Types" });
    setStockStatusFilter({ value: "all", label: "All Stock Status" });
    setPublishedFilter({ value: "all", label: "All Visibility" });
    setDeliveryFilter({ value: "all", label: "All Delivery" });
    setMarkAsNewFilter({ value: "all", label: "Mark as New: All" });
    setNotReturnableFilter({ value: "all", label: "Returnable: All" });
    setRecurringFilter({ value: "all", label: "Subscription: All" });
    setVatFilter({ value: "all", label: "VAT: All" });
    setDeletedFilter({ value: "all", label: "All Records" });
    setPharmaFilter({ value: "all", label: "Product Type" });
    setPharmaApprovalFilter({ value: "all", label: "Approval: All" });
    setSearchInput("");
    setCurrentPage(1);
  }, []);

  // CHECK ACTIVE FILTERS
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory.value !== "all" ||
      selectedBrand.value !== "all" ||
      selectedHomepage.value !== "all" ||
      selectedType.value !== "all" ||
      stockStatusFilter.value !== "all" ||
      publishedFilter.value !== "all" ||
      deliveryFilter.value !== "all" ||
      markAsNewFilter.value !== "all" ||
      notReturnableFilter.value !== "all" ||
      recurringFilter.value !== "all" ||
      vatFilter.value !== "all" ||
      deletedFilter.value !== "all" ||
      pharmaFilter.value !== "all" ||
      pharmaApprovalFilter.value !== "all" ||
      searchInput.trim() !== ""
    );
  }, [
    selectedCategory,
    selectedBrand,
    selectedHomepage,
    selectedType,
    stockStatusFilter,
    publishedFilter,
    deliveryFilter,
    markAsNewFilter,
    notReturnableFilter,
    recurringFilter,
    vatFilter,
    deletedFilter,
    pharmaFilter,
    pharmaApprovalFilter,
    searchInput
  ]);

  const [modal, setModal] = useState<{
    mode: "approve" | "reject";
    productId: string;
    productName: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
        isPharmaProduct: true,
        sortBy: "createdAt",
        sortDirection: "desc",
      };

      if (statusFilter !== "all") {
        params.pharmaApprovalStatus = statusFilter;
      } else if (pharmaApprovalFilter.value !== "all") {
        params.pharmaApprovalStatus = pharmaApprovalFilter.value;
      }

      if (deletedFilter.value === "deleted") {
        params.isDeleted = true;
      }
      if (deletedFilter.value === "active") {
        params.isActive = true;
      }
      if (deletedFilter.value === "inactive") {
        params.isActive = false;
      }

      if (debouncedSearchTerm.trim()) {
        params.searchTerm = debouncedSearchTerm.trim();
      }

      if (selectedCategory.value !== "all") {
        params.categoryId = selectedCategory.value;
      }

      if (selectedBrand.value !== "all") {
        params.brandId = selectedBrand.value;
      }

      if (publishedFilter.value !== "all") {
        params.isPublished = publishedFilter.value === "published";
      }

      if (markAsNewFilter.value !== "all") {
        params.markAsNew = markAsNewFilter.value === "yes";
      }

      if (selectedHomepage.value !== "all") {
        params.showOnHomepage = selectedHomepage.value === "yes";
      }

      if (selectedType.value !== "all") {
        params.productType = selectedType.value;
      }

      if (deliveryFilter.value !== "all") {
        if (deliveryFilter.value === "nextDay") params.nextDayDeliveryEnabled = true;
        else if (deliveryFilter.value === "sameDay") params.sameDayDeliveryEnabled = true;
        else if (deliveryFilter.value === "standard") params.standardDeliveryEnabled = true;
      }

      if (notReturnableFilter.value !== "all") {
        params.notReturnable = notReturnableFilter.value === "yes";
      }

      if (recurringFilter.value !== "all") {
        params.isRecurring = recurringFilter.value === "yes";
      }

      if (vatFilter.value !== "all") {
        params.vatRateId = vatFilter.value;
      }

      if (stockStatusFilter.value !== "all") {
        params.stockStatus = stockStatusFilter.value;
      }

      const response = await productsService.getAll(params);
      if (response.data?.success && response.data?.data?.items) {
        const { items, totalCount: tc, totalPages: tp } = response.data.data;
        setTotalCount(tc);
        setTotalPages(tp);
        setProducts(
          items.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug || "",
            sku: p.sku || "",
            image: getProductImage(p.images),
            isPublished: p.isPublished === true,
            pharmaApprovalStatus: p.pharmaApprovalStatus || "NotRequired",
            pharmaApprovedAt: p.pharmaApprovedAt || null,
            pharmaApprovedBy: p.pharmaApprovedBy || null,
            pharmaApprovalComment: p.pharmaApprovalComment || null,
            categoryName: p.categories?.[0]?.categoryName || "Uncategorized",
            brandName: p.brandName || "—",
            createdAt: formatDate(p.createdAt),
          }))
        );
      } else {
        setProducts([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch {
      toast.error("Failed to load pharma products");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    statusFilter,
    debouncedSearchTerm,
    selectedCategory,
    selectedBrand,
    selectedHomepage,
    selectedType,
    stockStatusFilter,
    publishedFilter,
    deliveryFilter,
    markAsNewFilter,
    notReturnableFilter,
    recurringFilter,
    vatFilter,
    deletedFilter,
    pharmaApprovalFilter
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedCategory,
    selectedBrand,
    selectedHomepage,
    selectedType,
    stockStatusFilter,
    publishedFilter,
    deliveryFilter,
    markAsNewFilter,
    notReturnableFilter,
    recurringFilter,
    vatFilter,
    deletedFilter,
    pharmaApprovalFilter,
    statusFilter
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleActionClick = (mode: "approve" | "reject", productId: string, productName: string) => {
    if (user?.role?.toLowerCase() !== "pharmacist") {
      toast.error("Access Denied: Only users with the 'Pharmacist' role can approve or reject pharmacy products.");
      return;
    }
    setComment("");
    setModal({ mode, productId, productName });
  };

  const handleReview = async () => {
    if (!modal) return;
    if (user?.role?.toLowerCase() !== "pharmacist") {
      toast.error("Access Denied: Only users with the 'Pharmacist' role can approve or reject pharmacy products.");
      return;
    }
    setProcessing(true);
    try {
      const response =
        modal.mode === "approve"
          ? await productsService.pharmaApprove(modal.productId, comment)
          : await productsService.pharmaReject(modal.productId, comment);

      if (response.data?.success) {
        const result = response.data.data;
        setProducts((prev) =>
          prev.map((p) =>
            p.id === modal.productId
              ? {
                  ...p,
                  pharmaApprovalStatus: result?.pharmaApprovalStatus ?? p.pharmaApprovalStatus,
                  pharmaApprovedAt: result?.pharmaApprovedAt ?? p.pharmaApprovedAt,
                  pharmaApprovedBy: result?.pharmaApprovedBy ?? p.pharmaApprovedBy,
                  pharmaApprovalComment: result?.pharmaApprovalComment ?? null,
                  isPublished: result?.isPublished ?? p.isPublished,
                }
              : p
          )
        );
        toast.success(
          modal.mode === "approve"
            ? `"${modal.productName}" approved`
            : `"${modal.productName}" rejected and unpublished`
        );
        setModal(null);
        setComment("");
      } else {
        toast.error(response.data?.message || "Action failed");
      }
    } catch {
      toast.error("Failed to process review");
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      Pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
      Approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
      Rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
      NotRequired: { label: "N/A", cls: "bg-slate-600/20 text-slate-500 border border-slate-700" },
    };
    const s = map[status] || map.NotRequired;
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Pharma Product Review</h1>
            <p className="text-slate-400 text-xs">Review and approve pharmacy products before they go live</p>
          </div>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ✅ FILTERS SECTION - ROW 1 */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* SEARCH */}
          <div className="relative flex-[2] min-w-[200px] w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />

            <input
              type="text"
              placeholder="Search products by name or Sku..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-9 py-1.5 bg-slate-800/50 border border-slate-700 rounded-xl placeholder:text-xs text-white text-[13px] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />

            {/* RIGHT ICON */}
            {searchLoading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )
            )}
          </div>

          {/* CATEGORY */}
          <div className="flex-[1.5] min-w-[160px] w-full">
            <Select
              value={selectedCategory}
              onChange={(option) => setSelectedCategory((option as SelectOption) || { value: "all", label: "All Categories" })}
              options={categoryOptions}
              styles={selectStyles}
              placeholder="All Categories"
              isSearchable
              isClearable={selectedCategory.value !== "all"}
              formatOptionLabel={formatOptionLabel}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>

          {/* BRAND */}
          <div className="flex-1 min-w-[120px] max-w-[160px] w-full">
            <Select
              value={selectedBrand}
              onChange={(option) => setSelectedBrand((option as SelectOption) || { value: "all", label: "All Brands" })}
              options={brandOptions}
              styles={selectStyles}
              placeholder="All Brands"
              isSearchable
              isClearable={selectedBrand.value !== "all"}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>
          <div>

{/* <select
  value={pharmaFilter.value}
  onChange={(e) => {
    const option = pharmaOptions.find(opt => opt.value === e.target.value);
    if (option) setPharmaFilter(option);
  }}
  className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
    pharmaFilter.value !== "all"
      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
      : "border-slate-600"
  }`}
>
  {pharmaOptions.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select> */}

          </div>

          {/* TYPE */}
          <div className="flex-1 min-w-[110px] max-w-[130px] w-full">
            <select
              value={selectedType.value}
              onChange={(e) => {
                const option = typeOptions.find(opt => opt.value === e.target.value);
                if (option) setSelectedType(option);
              }}
              className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                selectedType.value !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* DELETED */}
          <div className="flex-1 min-w-[110px] max-w-[130px] w-full">
            <select
              value={deletedFilter.value}
              onChange={(e) => {
                const option = deletedOptions.find(opt => opt.value === e.target.value);
                if (option) setDeletedFilter(option);
              }}
              className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                deletedFilter.value !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              {deletedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* PUBLISHED */}
          <div className="flex-1 min-w-[110px] max-w-[130px] w-full">
            <select
              value={publishedFilter.value}
              onChange={(e) => {
                const option = visibilityOptions.find(opt => opt.value === e.target.value);
                if (option) setPublishedFilter(option);
              }}
              className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                publishedFilter.value !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              {visibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0 w-full sm:w-auto justify-end">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                title="Clear all filters"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </button>
            )}

            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-xl hover:bg-violet-500/20 transition-all text-xs font-medium flex items-center gap-2 whitespace-nowrap"
            >
              {showMoreFilters ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  More
                </>
              )}
            </button>
          </div>
        </div>

        {/* ✅ ROW 2 - COLLAPSIBLE FILTERS */}
        {showMoreFilters && (
          <div className="mt-1 pt-1 border-t border-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              <select
                value={stockStatusFilter.value}
                onChange={(e) => {
                  const option = statusOptions.find(opt => opt.value === e.target.value);
                  if (option) setStockStatusFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  stockStatusFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={deliveryFilter.value}
                onChange={(e) => {
                  const option = deliveryOptions.find(opt => opt.value === e.target.value);
                  if (option) setDeliveryFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  deliveryFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {deliveryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={markAsNewFilter.value}
                onChange={(e) => {
                  const option = markAsNewOptions.find(opt => opt.value === e.target.value);
                  if (option) setMarkAsNewFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  markAsNewFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {markAsNewOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={notReturnableFilter.value}
                onChange={(e) => {
                  const option = returnableOptions.find(opt => opt.value === e.target.value);
                  if (option) setNotReturnableFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  notReturnableFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {returnableOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={recurringFilter.value}
                onChange={(e) => {
                  const option = subscriptionOptions.find(opt => opt.value === e.target.value);
                  if (option) setRecurringFilter(option);
                }}
                className={`w-full px-3 py-2 min-w-[136px] bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  recurringFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {subscriptionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={vatFilter.value}
                onChange={(e) => {
                  const option = vatOptions.find(
                    (opt) => opt.value === e.target.value
                  );

                  if (option) setVatFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs ${
                  vatFilter.value !== "all"
                    ? "border-blue-500"
                    : "border-slate-600"
                }`}
              >
                {vatOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* HOMEPAGE */}
              <div className="flex-1 min-w-[120px] max-w-[150px] w-full">
                <select
                  value={selectedHomepage.value}
                  onChange={(e) => {
                    const option = homepageOptions.find(opt => opt.value === e.target.value);
                    if (option) setSelectedHomepage(option);
                  }}
                  className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    selectedHomepage.value !== "all"
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                      : "border-slate-600"
                  }`}
                >
                  {homepageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>


              {/* <select
                value={pharmaApprovalFilter.value}
                onChange={(e) => {
                  const option = pharmaApprovalOptions.find(opt => opt.value === e.target.value);
                  if (option) setPharmaApprovalFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  pharmaApprovalFilter.value !== "all"
                    ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50"
                    : "border-slate-600"
                }`}
              >
                {pharmaApprovalOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select> */}

            </div>
          </div>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "Pending", "Approved", "Rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === s
                ? s === "Pending"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : s === "Approved"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : s === "Rejected"
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-violet-500/20 text-violet-300 border-violet-500/40"
                : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500"
            }`}
          >
            {s === "all" ? "All Pharma" : s}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{totalCount} product{totalCount !== 1 ? "s" : ""}</span>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className="h-10 w-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No pharma products found</p>
            {statusFilter === "Pending" && (
              <p className="text-slate-500 text-xs">All pending products have been reviewed</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="py-3 px-3 text-left text-xs text-slate-400 font-medium">Product</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Status</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Published</th>
                  <th className="py-3 px-3 text-left text-xs text-slate-400 font-medium">Review Info</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Added</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/20 transition-all">
                    {/* PRODUCT */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-500">
                              <Pill className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate max-w-[200px]" title={product.name}>
                            {product.name}
                          </p>
                          <p className="text-slate-500 text-[10px]">{product.sku} · {product.brandName}</p>
                        </div>
                      </div>
                    </td>

                    {/* APPROVAL STATUS */}
                    <td className="py-2.5 px-3 text-center">
                      {statusBadge(product.pharmaApprovalStatus)}
                    </td>

                    {/* PUBLISHED */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        product.isPublished
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-600/20 text-slate-500"
                      }`}>
                        {product.isPublished ? "Published" : "Unpublished"}
                      </span>
                    </td>

                    {/* REVIEW INFO */}
                    <td className="py-2.5 px-3">
                      {product.pharmaApprovedBy ? (
                        <div className="text-xs text-slate-400">
                          <p className="text-slate-300 truncate max-w-[160px]">{product.pharmaApprovedBy}</p>
                          {product.pharmaApprovedAt && (
                            <p className="text-slate-500 text-[10px]">{formatDate(product.pharmaApprovedAt)}</p>
                          )}
                          {product.pharmaApprovalComment && (
                            <p className="text-slate-500 text-[10px] italic truncate max-w-[160px]" title={product.pharmaApprovalComment}>
                              "{product.pharmaApprovalComment}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">—</span>
                      )}
                    </td>

                    {/* ADDED */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-slate-400 text-xs">{product.createdAt}</span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/product/${product.slug}`} target="_blank">
                          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="View product">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        {(product.pharmaApprovalStatus === "Pending" || (product.isPublished && product.pharmaApprovalStatus === "NotRequired")) && (
                          <>
                            <button
                              onClick={() => handleActionClick("approve", product.id, product.name)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                              title="Approve"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleActionClick("reject", product.id, product.name)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Reject"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        {product.pharmaApprovalStatus === "Rejected" && (
                          <button
                            onClick={() => handleActionClick("approve", product.id, product.name)}
                            className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                            title="Re-approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${modal.mode === "approve" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                {modal.mode === "approve"
                  ? <CheckCircle className="h-5 w-5 text-emerald-400" />
                  : <XCircle className="h-5 w-5 text-red-400" />}
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">
                  {modal.mode === "approve" ? "Approve Product" : "Reject Product"}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[280px]">{modal.productName}</p>
              </div>
            </div>

            {modal.mode === "reject" && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-300 text-xs">This product will be unpublished and hidden from customers.</p>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-slate-300 text-xs font-medium mb-1.5">
                {modal.mode === "approve" ? "Approval comment (required)" : "Rejection reason (required)"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  modal.mode === "approve"
                    ? "e.g. Reviewed — meets all safety standards"
                    : "e.g. Missing active ingredients documentation"
                }
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setComment(""); }}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing || !comment.trim()}
                className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  modal.mode === "approve"
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
                    : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
                }`}
              >
                {processing && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modal.mode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
