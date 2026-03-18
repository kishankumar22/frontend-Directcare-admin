//app\admin\products\page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Select from "react-select";
import {
  Plus, Package, Edit, Trash2, Eye, Search, Filter, FilterX,
  TrendingUp, AlertCircle, X, CheckCircle, XCircle, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, Send, FolderTree,
  Award, ShoppingCart, Star, Tag, ExternalLink, ChevronDown, ChevronUp,
  Percent,
  FileSpreadsheet,
  Upload,
  Download,
  Boxes,
  Database
} from "lucide-react";

type ToggleProduct = {
  id: string;
  name: string;
  isActive: boolean;
  isDeleted?: boolean;
};

import { useToast } from "@/app/admin/_components/CustomToast";
import { API_BASE_URL } from "@/lib/api-config";
import { productLockService, TakeoverRequestData } from "@/lib/services/productLockService";
import ProductViewModal from "./ProductViewModal";
import { useRouter } from "next/navigation";

// SERVICES
import { categoriesService } from "@/lib/services/categories";
import { brandsService } from "@/lib/services/brands";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import MediaViewerModal, { MediaItem } from "./MediaViewerModal";
import { RelatedProduct, Product, productsService, productHelpers } from "@/lib/services";
import ProductExcelImportModal from "./ProductExcelImportModal";
import { useDebounce } from "../_hooks/useDebounce";

// ✅ INTERFACES
interface FormattedProduct {
  id: string;
  isDeleted: boolean;
  name: string;
  slug: string;
  sku: string;
  categoryName: string;
  brandName: string;
  brandId: string; // Add this
  price: number;
  stockQuantity: number;
  isActive: boolean;
  isPublished: boolean;
  showOnHomepage: boolean;
  status: string;
  productType: string;
  shortDescription: string;
  description: string;
  image: string;
  sales: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  
  // Inventory System
  trackQuantity: boolean;
  manageInventoryMethod: string;
  lowStockThreshold: number;
  notifyAdminForQuantityBelow: boolean;
  notifyQuantityBelow: number;
  allowBackorder: boolean;
  
  // Other flags
  markAsNew: boolean;
  notReturnable: boolean;
  isRecurring: boolean;
  vatExempt: boolean;
  nextDayDeliveryEnabled: boolean;
  standardDeliveryEnabled: boolean;
  sameDayDeliveryEnabled: boolean;
  
  // Discounts
  hasDiscount: boolean;
  discountLabel: string;
  discountTitle: string;
  assignedDiscounts?: any[]; // Add this for discount filtering
  
  // Raw date for sorting
  rawCreatedAt: string;
  rawUpdatedAt: string;
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

interface SelectOption {
  value: string;
  label: string;
  level?: number;
}

// ✅ API Response Interface
interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    items: any[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

// ✅ REACT-SELECT CUSTOM STYLES
const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: state.selectProps.value && state.selectProps.value.value !== 'all' 
      ? '#3b82f6' 
      : '#475569',
    borderWidth: state.selectProps.value && state.selectProps.value.value !== 'all' ? '2px' : '1px',
    borderRadius: '0.75rem',
    padding: '0.15rem',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(139, 92, 246, 0.5)' : 'none',
    '&:hover': {
      borderColor: '#8b5cf6',
    },
    minHeight: '42px',
    cursor: 'pointer',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '0.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuList: (base: any) => ({
    ...base,
    padding: 0,
    maxHeight: '300px',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgba(139, 92, 246, 0.2)'
      : state.isFocused
      ? '#334155'
      : 'transparent',
    color: state.isSelected ? '#a78bfa' : '#ffffff',
    padding: '0.625rem 1rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    '&:active': {
      backgroundColor: 'rgba(139, 92, 246, 0.3)',
    },
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#ffffff',
    fontSize: '0.875rem',
  }),
  input: (base: any) => ({
    ...base,
    color: '#ffffff',
    fontSize: '0.875rem',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.875rem',
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: '#94a3b8',
    '&:hover': {
      color: '#a78bfa',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
};

// ✅ MAIN COMPONENT
export default function ProductsPage() {
  const toast = useToast();
  const router = useRouter();

  // STATE MANAGEMENT
  const [products, setProducts] = useState<FormattedProduct[]>([]);
  const [allProductsMap, setAllProductsMap] = useState<Map<string, RelatedProduct>>(new Map());
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // API Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  // Add these near your other state declarations (around line where you have searchTerm)
const [searchInput, setSearchInput] = useState("");
const debouncedSearchTerm = useDebounce(searchInput, 500); // 500ms delay
  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProductForDiscount, setSelectedProductForDiscount] = useState<any>(null);
const [bulkAction, setBulkAction] = useState<null | {
  type: "activate" | "deactivate" | "publish" | "unpublish" | "delete" | "restore";
  items: FormattedProduct[];
}>(null);

  const [selectedCategory, setSelectedCategory] = useState<SelectOption>({ value: "all", label: "All Categories" });
  const [selectedBrand, setSelectedBrand] = useState<SelectOption>({ value: "all", label: "All Brands" });
  const [selectedHomepage, setSelectedHomepage] = useState<SelectOption>({ value: "all", label: "Homepage: All" });
  const [selectedType, setSelectedType] = useState<SelectOption>({ value: "all", label: "All Types" });
  
  // Second row filters
  const [statusFilter, setStatusFilter] = useState<SelectOption>({ value: "all", label: "All Stock Status" });
  const [publishedFilter, setPublishedFilter] = useState<SelectOption>({ value: "all", label: "All Visibility" });
  const [deliveryFilter, setDeliveryFilter] = useState<SelectOption>({ value: "all", label: "All Delivery" });
  const [markAsNewFilter, setMarkAsNewFilter] = useState<SelectOption>({ value: "all", label: "Mark as New: All" });
  const [notReturnableFilter, setNotReturnableFilter] = useState<SelectOption>({ value: "all", label: "Returnable: All" });
  const [inventoryFilter, setInventoryFilter] = useState<SelectOption>({ value: "all", label: "Inventory: All" });
  const [recurringFilter, setRecurringFilter] = useState<SelectOption>({ value: "all", label: "Subscription: All" });
  const [vatFilter, setVatFilter] = useState<SelectOption>({ value: "all", label: "VAT: All" });
  

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Media states
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaToView, setMediaToView] = useState<MediaItem[]>([]);
  const [mediaStartIndex, setMediaStartIndex] = useState(0);

  // Takeover states
  const [myTakeoverRequests, setMyTakeoverRequests] = useState<TakeoverRequestData[]>([]);
  const [showTakeoverPanel, setShowTakeoverPanel] = useState(false);
  const [loadingTakeovers, setLoadingTakeovers] = useState(true);

  // ✅ SELECT OPTIONS
  const homepageOptions: SelectOption[] = [
    { value: "all", label: "Homepage: All" },
    { value: "yes", label: "Show on Homepage" },
    { value: "no", label: "Not on Homepage" },
  ];

  const typeOptions: SelectOption[] = [
    { value: "all", label: "All Types" },
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
  { value: "all", label: "All Products" },
  { value: "yes", label: "Pharma Only" },
  { value: "no", label: "Non-Pharma Only" },
];
  const visibilityOptions: SelectOption[] = [
    { value: "all", label: "All Visibility" },
    { value: "published", label: "Published" },
    { value: "unpublished", label: "Unpublished" },
  ];

  const deliveryOptions: SelectOption[] = [
    { value: "all", label: "All Delivery" },
    { value: "nextDay", label: "Next Day" },
    { value: "standard", label: "Standard" },
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

  const inventoryOptions: SelectOption[] = [
    { value: "all", label: "Inventory: All" },
    { value: "track", label: "Track Inventory" },
    { value: "dont-track", label: "Don't Track" },
  ];

  const subscriptionOptions: SelectOption[] = [
    { value: "all", label: "Subscription: All" },
    { value: "yes", label: "Subscription" },
    { value: "no", label: "One-time" },
  ];

  const vatOptions: SelectOption[] = [
    { value: "all", label: "VAT: All" },
    { value: "yes", label: "VAT Exempt" },
    { value: "no", label: "VAT Applicable" },
  ];

  const discountOptions: SelectOption[] = [
    { value: "all", label: "Discount: All" },
    { value: "yes", label: "Has Discount" },
    { value: "no", label: "No Discount" },
  ];

const deletedOptions = [
  { value: "all", label: "All Records" },
  { value: "active", label: "Active Only" },
  { value: "inactive", label: "Inactive Only" },
  { value: "deleted", label: "Deleted Only" },
];

 const [deletedFilter, setDeletedFilter] = useState({
  value: "active",
  label: "Active Only",
});
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedDeleteProduct, setSelectedDeleteProduct] = useState<ToggleProduct | null>(null);
  const [selectedToggleProduct, setSelectedToggleProduct] = useState<ToggleProduct | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
// BULK SELECTION
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  // ✅ HELPERS
  // BULK SELECT HANDLERS
const handleSelectProduct = (productId: string) => {
  setSelectedProducts((prev) =>
    prev.includes(productId)
      ? prev.filter((id) => id !== productId)
      : [...prev, productId]
  );
};
useEffect(() => {
  if (searchInput.trim() !== "") {
    setSearchLoading(true);
  }
}, [searchInput]);
const handleSelectAll = () => {
  if (selectedProducts.length === products.length) {
    setSelectedProducts([]);
  } else {
    const selectableIds = products
      .filter((p) => !p.isDeleted)
      .map((p) => p.id);
    setSelectedProducts(selectableIds);
  }
};
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openProductActionModal = (product: {
    id: string;
    name: string;
    isDeleted: boolean;
  }) => {
    setSelectedDeleteProduct({
      id: product.id,
      name: product.name,
      isDeleted: product.isDeleted,
      isActive: true,
    });
    setShowDeleteConfirm(true);
  };

  const openToggleConfirm = (product: any) => {
    if (product.isDeleted) {
      toast.error("Deleted products cannot be activated or deactivated.");
      return;
    }
    setSelectedToggleProduct({
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      isDeleted: product.isDeleted ?? false,
    });
    setShowToggleConfirm(true);
  };

const getProductImage = (images: any[]): string => {
  if (!images || images.length === 0) return "";

  const mainImage = images.find((img: any) => img.isMain) || images[0];
  let imageUrl = mainImage.imageUrl || "";

  // 🔥 If already full URL → return directly
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  // 🔥 Otherwise attach base URL (for local uploads)
  return API_BASE_URL.replace("/api", "") + imageUrl.replace("~", "");
};

  const getPrimaryCategoryName = (categories: any[]): string => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return "Uncategorized";
    }
    const primaryCategory = categories.find((cat: any) => cat.isPrimary === true);
    return primaryCategory?.categoryName || categories[0]?.categoryName || "Uncategorized";
  };

  const handleConfirmProductAction = async () => {
    if (!selectedDeleteProduct) return;
    setIsProcessing(true);
    try {
      if (selectedDeleteProduct.isDeleted) {
        await productsService.restore(selectedDeleteProduct.id);
        toast.success("Product restored successfully!");
      } else {
        await productsService.delete(selectedDeleteProduct.id);
        toast.success("Product deleted successfully!");
      }
      await fetchProducts();
    } catch (err) {
      console.error("Product action error:", err);
      toast.error("Action failed");
    } finally {
      setIsProcessing(false);
      setSelectedDeleteProduct(null);
      setShowDeleteConfirm(false);
    }
  };
// ✅ INITIAL FETCH - runs when page, itemsPerPage, or BACKEND filters change

const [pharmaFilter, setPharmaFilter] = useState<SelectOption>({
  value: "all",
  label: "All Products",
});


// ✅ FETCH PRODUCTS WITH PAGINATION AND FILTERS
const fetchProducts = async () => {
  setLoading(true);
   setFilterLoading(true); // ✅ start loader

  try {
    // Build backend params
    const params: any = {
      page: currentPage,
      pageSize: itemsPerPage,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

   if (deletedFilter.value === "deleted") {
  params.isDeleted = true;
}
if (statusFilter.value !== "all") {
  params.stockStatus = statusFilter.value;
}

if (deletedFilter.value === "active") {
  params.isDeleted = false;
  params.isActive = true;
}

if (deletedFilter.value === "inactive") {
  params.isDeleted = false;
  params.isActive = false;
}

    if (debouncedSearchTerm.trim() !== "") {
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
    if (pharmaFilter.value !== "all") {
  params.isPharmaProduct = pharmaFilter.value === "yes";
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

    if (inventoryFilter.value !== "all") {
      if (inventoryFilter.value === "track") params.manageInventoryMethod = "track";
      else if (inventoryFilter.value === "dont-track") params.manageInventoryMethod = "donttrack";
    }

    if (recurringFilter.value !== "all") {
      params.isRecurring = recurringFilter.value === "yes";
    }

    if (vatFilter.value !== "all") {
      params.vatExempt = vatFilter.value === "yes";
    }

    const response = await productsService.getAll(params);

    if (response.data?.success && response.data?.data?.items) {
      const apiData = response.data.data;
      let items = [...apiData.items];
// Client-side Active / Inactive filter
if (deletedFilter.value === "active") {
  items = items.filter((p: any) => p.isDeleted !== true && p.isActive === true);
}

if (deletedFilter.value === "inactive") {
  items = items.filter((p: any) => p.isDeleted !== true && p.isActive === false);
}

if (deletedFilter.value === "deleted") {
  items = items.filter((p: any) => p.isDeleted === true);
}




      // Calculate pagination info from API
      const hasPrevious = apiData.page > 1;
      const hasNext = apiData.page < apiData.totalPages;
      
      setTotalCount(apiData.totalCount);
      setTotalPages(apiData.totalPages);
      setCurrentPage(apiData.page);
      setHasPrevious(hasPrevious);
      setHasNext(hasNext);

      const formattedProducts: FormattedProduct[] = items.map((p: any) => {
        const primaryCategoryName = getPrimaryCategoryName(p.categories);

        // Discount Logic
        const now = new Date();
        const discountsArray = Array.isArray(p.assignedDiscounts) ? p.assignedDiscounts : [];
        const activeDiscounts = discountsArray.filter((d: any) => {
          if (!d?.isActive) return false;
          const start = d.startDate ? new Date(d.startDate) : null;
          const end = d.endDate ? new Date(d.endDate) : null;
          if (start && now < start) return false;
          if (end && now > end) return false;
          return true;
        });

        const hasDiscount = activeDiscounts.length > 0;
        let discountLabel = "";
        let discountTitle = "";

        if (hasDiscount) {
          const bestDiscount = activeDiscounts.reduce((prev: any, current: any) => {
            const prevValue = prev.usePercentage ? prev.discountPercentage : prev.discountAmount;
            const currValue = current.usePercentage ? current.discountPercentage : current.discountAmount;
            return currValue > prevValue ? current : prev;
          });

          discountLabel = bestDiscount.usePercentage
            ? `${bestDiscount.discountPercentage}%`
            : `£${bestDiscount.discountAmount}`;
          discountTitle = `${bestDiscount.name} (${bestDiscount.discountType})`;
        }

        return {
          id: p.id,
          name: p.name,
          categoryName: primaryCategoryName,
          price: p.price || 0,
          stock: p.stockQuantity || 0,
          stockQuantity: p.stockQuantity || 0,
          status: productHelpers.getStockStatus({
            stockQuantity: p.stockQuantity,
            trackQuantity: p.trackQuantity,
            lowStockThreshold: p.lowStockThreshold,
            allowBackorder: p.allowBackorder,
          }),
          image: getProductImage(p.images),
          sales: 0,
          shortDescription: p.shortDescription || "",
          sku: p.sku || "",
          createdAt: formatDate(p.createdAt),
          updatedAt: p.updatedAt ? formatDate(p.updatedAt) : "N/A",
          updatedBy: p.updatedBy || "N/A",
          createdBy: p.createdBy || "N/A",
          description: p.description || p.shortDescription || "",
          category: primaryCategoryName,
          isPublished: p.isPublished === true,
          productType: p.productType || "simple",
          brandName: p.brandName || "No Brand",
          brandId: p.brandId,
          slug: p.slug || "",
          isActive: p.isActive === true,
          showOnHomepage: p.showOnHomepage === true,
          markAsNew: p.markAsNew === true,
          notReturnable: p.notReturnable === true,
          manageInventoryMethod: p.manageInventoryMethod || "track",
          isRecurring: p.isRecurring === true,
          vatExempt: p.vatExempt === true,
          nextDayDeliveryEnabled: p.nextDayDeliveryEnabled === true,
          standardDeliveryEnabled: p.standardDeliveryEnabled === true,
          sameDayDeliveryEnabled: p.sameDayDeliveryEnabled === true,
          trackQuantity: p.trackQuantity ?? false,
          lowStockThreshold: p.lowStockThreshold ?? 0,
          notifyAdminForQuantityBelow: p.notifyAdminForQuantityBelow ?? false,
          notifyQuantityBelow: p.notifyQuantityBelow ?? 0,
          allowBackorder: p.allowBackorder ?? false,
          hasDiscount,
          discountLabel,
          discountTitle,
          isDeleted: p.isDeleted === true,
          rawCreatedAt: p.createdAt,
          rawUpdatedAt: p.updatedAt,
          assignedDiscounts: p.assignedDiscounts || [],
        };
      });

      setProducts(formattedProducts);
setSelectedProducts([]);
      // Related Products Map
      const productMap = new Map<string, RelatedProduct>();
      apiData.items.forEach((p: any) => {
        productMap.set(p.id, {
          id: p.id,
          name: p.name,
          price: p.price || 0,
          sku: p.sku || "",
          image: getProductImage(p.images),
        });
      });
      setAllProductsMap(productMap);
    } else {
      toast.warning("No products found.");
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
      setHasPrevious(false);
      setHasNext(false);
    }
  } catch (err) {
    console.error("Error fetching products:", err);
    toast.error("Failed to load products.");
  } finally {
    setLoading(false);
     setSearchLoading(false); // ✅ search complete 
         setFilterLoading(false); // ✅ stop loader
  }
};
  // ✅ FETCH CATEGORIES
  const fetchCategories = async () => {
    try {
      const response = await categoriesService.getAll({
        includeInactive: false,
        includeSubCategories: true,
      });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  // ✅ FETCH BRANDS
  const fetchBrands = async () => {
    try {
      const response = await brandsService.getAll({ includeUnpublished: false });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        setBrands(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };
const FilterLoader = () => {
  return (
    <div className="flex items-center gap-2 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/30 px-2 py-1 rounded-md">
      <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
      Loading...
    </div>
  );
};
  // ✅ FETCH PRODUCT DETAILS
const fetchProductDetails = async (productId: string) => {
  setLoadingDetails(true);

  try {
    // 🔍 First: find product from current list
    const currentProduct = products.find(p => p.id === productId);

    if (!currentProduct) {
      toast.error("Product not found in list");
      return;
    }

    let p: any = null;

    // ✅ CASE 1: NORMAL PRODUCT → use getById
    if (!currentProduct.isDeleted) {
      const response = await productsService.getById(productId);

      if (response.data?.success && response.data?.data) {
        p = response.data.data;
      }
    }

    // ✅ CASE 2: DELETED PRODUCT → use search API
    else {
      const response = await productsService.getAll({
        page: 1,
        pageSize: 1,
        isDeleted: true,
        searchTerm: currentProduct.name, // 🔥 NAME SEARCH
      });

      if (response.data?.success && response.data?.data?.items?.length > 0) {
        p = response.data.data.items[0]; // ✅ first match
      }
    }

    if (!p) {
      toast.error("Product details not found");
      return;
    }

 // ✅ Related Products Mapping
if (p.relatedProductIds) {
  p.relatedProducts = p.relatedProductIds
    .split(",")
    .map((id: string) => allProductsMap.get(id.trim()))
    .filter(
      (product: RelatedProduct | undefined): product is RelatedProduct =>
        product !== undefined
    );
}

if (p.crossSellProductIds) {
  p.crossSellProducts = p.crossSellProductIds
    .split(",")
    .map((id: string) => allProductsMap.get(id.trim()))
    .filter(
      (product: RelatedProduct | undefined): product is RelatedProduct =>
        product !== undefined
    );
}

    // ✅ OPEN MODAL
    setViewingProduct(p);

  } catch (err) {
    console.error("Error fetching product details:", err);
    toast.error("Failed to load product details");
  } finally {
    setLoadingDetails(false);
  }
};

  const handleToggleStatus = async (product: Product) => {
    try {
      const response = await productsService.toggleActive(product.id);
      if (!response?.data?.success) {
        toast.error(response?.data?.message || "Failed to update status");
        return;
      }
      toast.success(response.data.message);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  // ✅ MEDIA VIEWER
  const openMediaViewer = (media: MediaItem | MediaItem[], startIndex = 0) => {
    setMediaToView(Array.isArray(media) ? media : [media]);
    setMediaStartIndex(startIndex);
    setMediaViewerOpen(true);
  };

  const viewProductImages = (images: any[], productName: string, startIndex = 0) => {
    if (!images || images.length === 0) return;
    const mediaItems: MediaItem[] = images.map((img) => ({
      type: "image",
      url: img.imageUrl,
      title: img.altText || productName,
      description: `${productName} - ${img.isMain ? "Main Image" : "Product Image"}`,
      isMain: img.isMain,
    }));
    openMediaViewer(mediaItems, startIndex);
  };

  // ✅ TAKEOVER REQUESTS
  const fetchMyTakeoverRequests = async () => {
    setLoadingTakeovers(true);
    try {
      const response = await productLockService.getMyTakeoverRequests(true);
      if (response.success && response.data) {
        setMyTakeoverRequests(response.data);
      }
    } catch (error) {
      console.error("Error fetching my takeover requests:", error);
    } finally {
      setLoadingTakeovers(false);
    }
  };

// ✅ INITIAL DATA FETCH (runs once on component mount)
useEffect(() => {
  fetchCategories();
  fetchBrands();
  fetchMyTakeoverRequests();

  const pollInterval = setInterval(() => {
    fetchMyTakeoverRequests();
  }, 30000);

  return () => clearInterval(pollInterval);
}, []);

// ✅ EFFECT 1: Fetch products when BACKEND filters change
useEffect(() => {
  fetchProducts();
}, [
  currentPage,
  itemsPerPage,
  deletedFilter,
  debouncedSearchTerm,
  selectedCategory,
  selectedBrand,
  selectedType,
  publishedFilter,
  markAsNewFilter,
  selectedHomepage,
  deliveryFilter,
  notReturnableFilter,
  inventoryFilter,
  recurringFilter,
  vatFilter,
  statusFilter ,// ✅ ADD THIS
  pharmaFilter 
]);

// ✅ EFFECT 3: Handle client-side filters - JUST reset page, NO API call
useEffect(() => {
  setCurrentPage(1);
}, [
  selectedBrand,
  selectedType,
  statusFilter,
  deliveryFilter,
  notReturnableFilter,
  inventoryFilter,
  recurringFilter,
  vatFilter,
 
]);




// ✅ CLEAR FILTERS
const clearFilters = useCallback(() => {
  setSelectedCategory({ value: "all", label: "All Categories" });
  setSelectedBrand({ value: "all", label: "All Brands" });
  setSelectedHomepage({ value: "all", label: "Homepage: All" });
  setSelectedType({ value: "all", label: "All Types" });
  setStatusFilter({ value: "all", label: "All Stock Status" });
  setPublishedFilter({ value: "all", label: "All Visibility" });
  setDeliveryFilter({ value: "all", label: "All Delivery" });
  setMarkAsNewFilter({ value: "all", label: "Mark as New: All" });
  setNotReturnableFilter({ value: "all", label: "Returnable: All" });
  setInventoryFilter({ value: "all", label: "Inventory: All" });
  setRecurringFilter({ value: "all", label: "Subscription: All" });
  setVatFilter({ value: "all", label: "VAT: All" });
  setDeletedFilter({ value: "all", label: "All Records" });
  setPharmaFilter({ value: "all", label: "All Products" });
  setSearchInput(""); // Clear search input
  setCurrentPage(1);
}, []);

// ✅ CHECK ACTIVE FILTERS
const hasActiveFilters = useMemo(
  () =>
    selectedCategory.value !== "all" ||
    selectedBrand.value !== "all" ||
    selectedHomepage.value !== "all" ||
    selectedType.value !== "all" ||
    statusFilter.value !== "all" ||
    publishedFilter.value !== "all" ||
    deliveryFilter.value !== "all" ||
    markAsNewFilter.value !== "all" ||
    notReturnableFilter.value !== "all" ||
    inventoryFilter.value !== "all" ||
    recurringFilter.value !== "all" ||
    vatFilter.value !== "all" ||
    deletedFilter.value !== "all" ||
    pharmaFilter.value !== "all"||
    searchInput.trim() !== "", // Use searchInput instead of searchTerm
  [
    selectedCategory,
    selectedBrand,
    selectedHomepage,
    selectedType,
    statusFilter,
    publishedFilter,
    deliveryFilter,
    markAsNewFilter,
    notReturnableFilter,
    inventoryFilter,
    recurringFilter,
    vatFilter,
    deletedFilter,
    searchInput, // Use searchInput
  ]
);

  // ✅ FLATTEN CATEGORIES WITH FULL PATH
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

  // ✅ FORMAT WITH TITLE
  const formatOptionLabel = (option: SelectOption) => {
    return (
      <span 
        title={option.label} 
        className="block truncate cursor-pointer"
      >
        {option.label}
      </span>
    );
  };

const brandOptions: SelectOption[] = useMemo(() => {
  return [
    { value: "all", label: "All Brands" },
    ...brands.map((b) => ({
      value: b.id,     // ✅ backend id
      label: b.name    // ✅ frontend name
    })),
  ];
}, [brands]);
const allDeletedSelected = useMemo(() => {
  const selected = products.filter((p) =>
    selectedProducts.includes(p.id)
  );

  if (selected.length === 0) return false;

  return selected.every((p) => p.isDeleted === true);
}, [selectedProducts, products]);

  // CHECK IF SELECTED PRODUCTS HAVE SAME STATUS
const selectionState = useMemo(() => {
  const selected = products.filter((p) =>
    selectedProducts.includes(p.id)
  );

  if (selected.length === 0) {
    return { mixed: false, status: null, publishStatus: null };
  }

  const allActive = selected.every((p) => p.isActive);
  const allInactive = selected.every((p) => !p.isActive);

  const allPublished = selected.every((p) => p.isPublished);
  const allUnpublished = selected.every((p) => !p.isPublished);

  let status: "active" | "inactive" | null = null;
  if (allActive) status = "active";
  else if (allInactive) status = "inactive";

  let publishStatus: "published" | "unpublished" | null = null;
  if (allPublished) publishStatus = "published";
  else if (allUnpublished) publishStatus = "unpublished";

  const mixed =
    !(allActive || allInactive) ||
    !(allPublished || allUnpublished);

  return { mixed, status, publishStatus };
}, [selectedProducts, products]);
  // ✅ STATS (using totalCount from API)
  const stats = useMemo(() => {
    const lowStockCount = products.filter((p) => p.status === "Low Stock").length;
    const outOfStockCount = products.filter((p) => p.status === "Out of Stock").length;
    const publishedCount = products.filter((p) => p.isPublished).length;
    
    return {
      totalCount: totalCount, // This is the real total from API (3671)
      lowStockCount,
      outOfStockCount,
      publishedCount,
    };
  }, [products, totalCount]);

  const handleStatClick = useCallback(
    (filterType: string) => {
      clearFilters();
      switch (filterType) {
        case "total":
          break;
        case "published":
          setPublishedFilter({ value: "published", label: "Published" });
          break;
        case "lowStock":
          setStatusFilter({ value: "Low Stock", label: "Low Stock" });
          break;
        case "outOfStock":
          setStatusFilter({ value: "Out of Stock", label: "Out of Stock" });
          break;
      }
    },
    [clearFilters]
  );

  const statusCounts = useMemo(() => {
    const counts = { Pending: 0, all: myTakeoverRequests.length };
    myTakeoverRequests.forEach((req) => {
      if (req.status === "Pending") counts.Pending++;
    });
    return counts;
  }, [myTakeoverRequests]);

  // ✅ PAGINATION HANDLERS
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setCurrentPage((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(
    () => setCurrentPage((prev) => Math.min(totalPages, prev + 1)),
    [totalPages]
  );

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const getPageNumbers = useCallback(() => {
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
  }, [currentPage, totalPages]);

  // ✅ EXPORT FUNCTION
const handleExport = async (exportAll: boolean = false) => {
  try {
    let rawProductsData: any[] = [];
    toast.info("Preparing Excel export...");

    if (exportAll) {
      setLoading(true);

      const response = await productsService.getAll({
        page: 1,
        pageSize: 10000,
      });

      const data = response.data as any;

      if (data?.success && data?.data?.items) {
        rawProductsData = data.data.items;
      }

      setLoading(false);
    } else {
      // fetch full details for current page products
      for (const product of products) {
        try {
          const response = await productsService.getById(product.id);

          if (response.data?.success && response.data?.data) {
            rawProductsData.push(response.data.data);
          }
        } catch (error) {
          console.error(`Error fetching product ${product.id}:`, error);
        }
      }
    }

    if (rawProductsData.length === 0) {
      toast.warning("No products to export");
      return;
    }

    const excelData = rawProductsData.map((product: any) => {
      const primaryCategory = getPrimaryCategoryName(product.categories);

      const stockStatus = productHelpers.getStockStatus({
        stockQuantity: product.stockQuantity,
        trackQuantity: product.trackQuantity,
        lowStockThreshold: product.lowStockThreshold,
        allowBackorder: product.allowBackorder,
      });

      return {
        "Product ID": product.id || "",
        "Product Name": product.name || "",
        "Slug": product.slug || "",
        "SKU": product.sku || "",
        "GTIN": product.gtin || "",
        "Product Type": product.productType || "simple",
        "Brand": product.brandName || "",
        "Primary Category": primaryCategory,
        "Price (£)": product.price || 0,
        "Stock Quantity": product.stockQuantity || 0,
        "Stock Status": stockStatus,
        "Published": product.isPublished ? "Yes" : "No",
        "Show On Homepage": product.showOnHomepage ? "Yes" : "No",
        "Mark As New": product.markAsNew ? "Yes" : "No",
        "Created Date": product.createdAt || "",
        "Updated Date": product.updatedAt || "",
      };
    });

    // create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // auto column width
    const columnWidths = Object.keys(excelData[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...excelData.map((row: any) => String(row[key]).length)
      ),
    }));

    worksheet["!cols"] = columnWidths;

    // create workbook
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const timestamp = new Date().toISOString().split("T")[0];
    const exportType = exportAll ? "all" : "current-page";

    // download excel
    XLSX.writeFile(
      workbook,
      `products-${exportType}-${timestamp}.xlsx`
    );

    toast.success(`✅ ${excelData.length} product(s) exported successfully!`);
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export products");
    setLoading(false);
  }
};

  // Format time remaining
  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff / 1000) % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Approved': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Expired': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      case 'Cancelled': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const handleCancelTakeoverRequest = async (requestId: string) => {
    try {
      const response = await productLockService.cancelTakeoverRequest(requestId);
      if (response.success) {
        toast.success("Takeover request cancelled");
        fetchMyTakeoverRequests();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request");
    }
  };

  // ✅ LOADING
  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading products...</p>
        </div>
      </div>
    );
  }

  // ✅ MAIN RENDER
  return (
    <div className="space-y-2">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-sm text-slate-400">Manage your product inventory</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push("/admin/discounts")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
            bg-gradient-to-r from-pink-500 to-rose-500
            hover:from-pink-600 hover:to-rose-600
            text-white rounded-lg font-semibold shadow
            hover:shadow-pink-500/40 transition-all"
          >
            <Tag className="w-4 h-4" />
            Discounts
          </button>
          {/* Inventory Button */}
  <button
    onClick={() => router.push("/admin/inventory")}
    className="flex items-center gap-2 px-4 py-2 text-sm
    bg-gradient-to-r from-pink-500 to-rose-500
    hover:from-pink-600 hover:to-rose-600
    text-white rounded-xl font-semibold shadow-md
    hover:shadow-pink-500/40
    transition-all duration-200"
  >
    <Boxes className="w-4 h-4 stroke-[2.2]" />
    <span>Inventory</span>
  </button>

          <button
            onClick={() => router.push("/admin/orders")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
            bg-gradient-to-r from-emerald-500 to-teal-500
            hover:from-emerald-600 hover:to-teal-600
            text-white rounded-lg font-semibold shadow
            hover:shadow-emerald-500/40 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Orders
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
            bg-gradient-to-r from-emerald-600 to-green-600
            text-white rounded-lg font-semibold shadow
            hover:shadow-emerald-500/40 transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>

          <button
            onClick={() => router.push("/admin/productReview")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
            bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600
            text-white rounded-lg font-semibold shadow
            hover:shadow-amber-500/40 transition-all"
          >
            <Star className="w-4 h-4" />
            Reviews
          </button>

          {statusCounts.Pending > 0 && (
            <button
              onClick={() => setShowTakeoverPanel(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-semibold
              shadow transition-all relative ${
                statusCounts.Pending > 0
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse shadow-orange-500/40"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-blue-500/40"
              }`}
            >
              <Send className="w-4 h-4" />
              Requests
              {statusCounts.Pending > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-orange-600 text-[10px] font-bold">
                  {statusCounts.Pending}
                </span>
              )}
            </button>
          )}

<div className="relative">
  <button
    onClick={() => setShowExportMenu(!showExportMenu)}
    className="flex items-center gap-2 px-3 py-1.5 text-sm
      bg-gradient-to-r from-green-600 to-emerald-600
      text-white rounded-lg font-semibold shadow
      hover:shadow-emerald-500/40 transition-all"
  >
    <FileSpreadsheet className="w-4 h-4" />
    Export
    <ChevronDown className="w-4 h-4 opacity-80" />
  </button>

  {showExportMenu && (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-10"
        onClick={() => setShowExportMenu(false)}
      />

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-52
        bg-slate-800/95 backdrop-blur-xl
        border border-slate-700
        rounded-xl shadow-xl
        overflow-hidden z-20"
      >

    

        {/* Current Page */}
        <button
          onClick={() => {
            handleExport(false);
            setShowExportMenu(false);
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-slate-700/60 transition-all"
          title="Export current page products"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white">
                Current Page
              </p>
              <p className="text-xs text-slate-400">
                {products.length} products
              </p>
            </div>
          </div>
        </button>

        {/* Divider */}
        <div className="border-t border-slate-700/60" />

        {/* Export All */}
        <button
          onClick={() => {
            handleExport(true);
            setShowExportMenu(false);
          }}
          className="w-full px-4 py-2.5 text-left hover:bg-slate-700/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-white"
          title="Export All products"
              >
                All Products
              </p>
              <p className="text-xs text-slate-400">
                {totalCount} total
              </p>
            </div>
          </div>
        </button>

      </div>
    </>
  )}
</div>
          <Link href="/admin/products/add">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm
            bg-gradient-to-r from-violet-500 to-cyan-500
            text-white rounded-lg font-semibold shadow
            hover:shadow-violet-500/40 transition-all">
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </Link>
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid gap-3 md:grid-cols-4">
        <div
          onClick={() => handleStatClick("total")}
          className="bg-gradient-to-br from-violet-500/10 to-purple-500/10
          border border-violet-500/20 rounded-xl p-3
          hover:shadow-lg hover:shadow-violet-500/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Products</p>
              <p className="text-xl font-bold text-white">{stats.totalCount}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatClick("published")}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10
          border border-green-500/20 rounded-xl p-3
          hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Published</p>
              <p className="text-xl font-bold text-white">{stats.publishedCount}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatClick("lowStock")}
          className="bg-gradient-to-br from-orange-500/10 to-amber-500/10
          border border-orange-500/20 rounded-xl p-3
          hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Low Stock</p>
              <p className="text-xl font-bold text-white">{stats.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => handleStatClick("outOfStock")}
          className="bg-gradient-to-br from-red-500/10 to-rose-500/10
          border border-red-500/20 rounded-xl p-3
          hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Out of Stock</p>
              <p className="text-xl font-bold text-white">{stats.outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

{/* BULK ACTION BAR */}
{selectedProducts.length > 1 && (() => {

  const selectedItems = selectedProducts
    .map(id => products.find(p => p.id === id))
    .filter((p): p is FormattedProduct => Boolean(p));

  if (selectedItems.length === 0) return null;

  const hasActive = selectedItems.some(p => p.isActive);
  const hasInactive = selectedItems.some(p => !p.isActive);

  const hasPublished = selectedItems.some(p => p.isPublished);
  const hasUnpublished = selectedItems.some(p => !p.isPublished);

  const hasDeleted = selectedItems.some(p => p.isDeleted);
  const hasNotDeleted = selectedItems.some(p => !p.isDeleted);

  return (
    <div className="bg-slate-900/80 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">

      {/* LEFT */}
      <div className="text-sm text-white">
        {selectedItems.length} product(s) selected
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* ACTIVATE */}
        {hasInactive && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => !p.isActive);
              setBulkAction({ type: "activate", items });
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-md disabled:opacity-50"
          >
            Activate
          </button>
        )}

        {/* DEACTIVATE */}
        {hasActive && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => p.isActive);
              setBulkAction({ type: "deactivate", items });
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md disabled:opacity-50"
          >
            Deactivate
          </button>
        )}

        {/* PUBLISH */}
        {hasUnpublished && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => !p.isPublished);
              setBulkAction({ type: "publish", items });
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md disabled:opacity-50"
          >
            Publish
          </button>
        )}

        {/* UNPUBLISH */}
        {hasPublished && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => p.isPublished);
              setBulkAction({ type: "unpublish", items });
            }}
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md disabled:opacity-50"
          >
            Unpublish
          </button>
        )}

        {/* RESTORE */}
        {hasDeleted && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => p.isDeleted);
              setBulkAction({ type: "restore", items });
            }}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-md disabled:opacity-50"
          >
            Restore
          </button>
        )}

        {/* DELETE */}
        {hasNotDeleted && (
          <button
            disabled={isProcessing}
            onClick={() => {
              const items = selectedItems.filter(p => !p.isDeleted);
              setBulkAction({ type: "delete", items });
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-md disabled:opacity-50"
          >
            Delete
          </button>
        )}

        {/* CLEAR */}
        <button
          onClick={() => setSelectedProducts([])}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-md"
        >
          Clear
        </button>

      </div>
    </div>
  );
})()}
      {/* ================= ITEMS PER PAGE + RESULTS COUNT ================= */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-3 py-2">
  <div className="flex items-center justify-between gap-3 relative">

    {/* LEFT SIDE */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Show</span>

      <select
        value={itemsPerPage}
        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
        className="px-2 py-1 bg-slate-800/60 border border-slate-600
        rounded-md text-white text-xs
        focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={75}>75</option>
        <option value={100}>100</option>
      </select>

      <span className="text-xs text-slate-400">entries</span>
    </div>


    {/* RIGHT SIDE */}
    <div className="flex items-center gap-3">

      {/* 🔄 FILTER LOADER */}
  {filterLoading && <FilterLoader />}

      {/* RESULT TEXT */}
      <div className="text-xs text-slate-400 whitespace-nowrap">
        Showing {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
        {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} product
        {totalCount !== 1 ? "s" : ""}

        {hasActiveFilters && (
          <span className="text-violet-400">
            {" "}.{" "}
            {[
              selectedCategory.value !== "all",
              selectedBrand.value !== "all",
              selectedHomepage.value !== "all",
              selectedType.value !== "all",
              statusFilter.value !== "all",
              publishedFilter.value !== "all",
              deliveryFilter.value !== "all",
              markAsNewFilter.value !== "all",
              notReturnableFilter.value !== "all",
              inventoryFilter.value !== "all",
              recurringFilter.value !== "all",
              vatFilter.value !== "all",
            ].filter(Boolean).length} active filter
            {[
              selectedCategory.value !== "all",
              selectedBrand.value !== "all",
              selectedHomepage.value !== "all",
              selectedType.value !== "all",
              statusFilter.value !== "all",
              publishedFilter.value !== "all",
              deliveryFilter.value !== "all",
              markAsNewFilter.value !== "all",
              notReturnableFilter.value !== "all",
              inventoryFilter.value !== "all",
              recurringFilter.value !== "all",
              vatFilter.value !== "all",
            ].filter(Boolean).length !== 1 && "s"}
          </span>
        )}
      </div>

    </div>

  </div>
</div>

      {/* ✅ FILTERS SECTION - ROW 1 */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5">
        <div className="flex items-center gap-3">
<div className="relative flex-1 min-w-[180px] max-w-[280px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />

  <input
    type="text"
    placeholder="Search products by name or Sku..."
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
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

          <div className="flex-1 min-w-[120px]">
            <Select
              value={selectedCategory}
              onChange={(option) => setSelectedCategory(option as SelectOption)}
              options={categoryOptions}
              styles={customSelectStyles}
              placeholder="All Categories"
              isSearchable
              formatOptionLabel={formatOptionLabel}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>

          <div className="flex-1 max-w-[180px]">
            <Select
              value={selectedBrand}
              onChange={(option) => setSelectedBrand(option as SelectOption)}
              options={brandOptions}
              styles={customSelectStyles}
              placeholder="All Brands"
              isSearchable
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>

          <div className="flex-1 max-w-[150px]">
            <select
              value={selectedHomepage.value}
              onChange={(e) => {
                const option = homepageOptions.find(opt => opt.value === e.target.value);
                if (option) setSelectedHomepage(option);
              }}
              className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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

          <div className="flex gap-3">
            <div className="max-w-[140px] w-full">
              <select
                value={selectedType.value}
                onChange={(e) => {
                  const option = typeOptions.find(opt => opt.value === e.target.value);
                  if (option) setSelectedType(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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

            <div className="max-w-[150px] w-full">
              <select
                value={deletedFilter.value}
                onChange={(e) => {
                  const option = deletedOptions.find(opt => opt.value === e.target.value);
                  if (option) setDeletedFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                title="Clear all filters"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </button>
            )}

            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="px-4 py-2.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 rounded-xl hover:bg-violet-500/20 transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3">
              <select
                value={statusFilter.value}
                onChange={(e) => {
                  const option = statusOptions.find(opt => opt.value === e.target.value);
                  if (option) setStatusFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  statusFilter.value !== "all"
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
                value={publishedFilter.value}
                onChange={(e) => {
                  const option = visibilityOptions.find(opt => opt.value === e.target.value);
                  if (option) setPublishedFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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

              <select
                value={deliveryFilter.value}
                onChange={(e) => {
                  const option = deliveryOptions.find(opt => opt.value === e.target.value);
                  if (option) setDeliveryFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
                value={inventoryFilter.value}
                onChange={(e) => {
                  const option = inventoryOptions.find(opt => opt.value === e.target.value);
                  if (option) setInventoryFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  inventoryFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {inventoryOptions.map((opt) => (
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
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
                  const option = vatOptions.find(opt => opt.value === e.target.value);
                  if (option) setVatFilter(option);
                }}
                className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  vatFilter.value !== "all"
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                    : "border-slate-600"
                }`}
              >
                {vatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
<select
  value={pharmaFilter.value}
  onChange={(e) => {
    const option = pharmaOptions.find(opt => opt.value === e.target.value);
    if (option) setPharmaFilter(option);
  }}
  className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
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
</select>
            
            </div>
          </div>
        )}
      </div>

      {/* ✅ PRODUCTS TABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-slate-800">
               <th className="text-left py-2 px-3 text-slate-400 w-[260px]">
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={selectedProducts.length === products.length && products.length > 0}
      onChange={handleSelectAll}
      className="accent-violet-500"
    />
    Product
  </div>
</th>
                  <th className="text-center py-2 px-3 text-slate-400 w-[110px]">SKU</th>
                  <th className="text-center py-2 px-3 text-slate-400 w-[80px]">Price</th>
                  <th className="text-center py-2 px-3 text-slate-400 w-[70px]">Status</th>
                  <th className="text-center py-2 px-3 text-slate-400 w-[170px]">Stock Status</th>              
                  <th className="text-center py-2 px-3 text-slate-400 w-[150px]">Visibility</th>
                  <th className="text-left py-2 px-3 text-slate-400 w-[150px]">Updated At</th>
                  <th className="text-left py-2 px-3 text-slate-400 w-[110px]">Updated By</th>
                  <th className="text-center py-2 px-3 text-slate-400 w-[140px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const isBusy =
                    isProcessing &&
                    (
                      selectedDeleteProduct?.id === product.id ||
                      selectedToggleProduct?.id === product.id
                    );
                    const isDeleted = product.isDeleted;

                  return (
                    <tr
                      key={product.id}
className={`border-b border-slate-800 transition-colors
  ${
    product.isDeleted
      ? 'bg-red-500/5'
      : ''
  }
  ${
    selectedProducts.includes(product.id)
      ? 'bg-violet-500/10 ring-1 ring-violet-500/40'
      : 'hover:bg-slate-800/30'
  }
  ${isBusy ? 'pointer-events-none' : ''}
`}
                    >
                      {/* PRODUCT */}
                      <td className="py-2 px-3">
                       <div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={selectedProducts.includes(product.id)}
    onChange={() => handleSelectProduct(product.id)}
    className="accent-violet-500"
  />
                          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-pink-500 overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await productsService.getById(product.id);
                                    if (res.data?.success && res.data?.data?.images) {
                                      viewProductImages(res.data.data.images, product.name, 0);
                                    }
                                  } catch {}
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white">
                                📦
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="text-white font-medium truncate cursor-pointer hover:text-violet-400"
                              onClick={() => fetchProductDetails(product.id)}
                              title={product.name}
                            >
                              {product.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-slate-500 truncate">
                                {product.categoryName}
                              </span>
                              <span className="text-xs text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                                {product.brandName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-2 px-3 text-center">
                        <span className="text-xs font-mono text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded">
                          {product.sku}
                        </span>
                      </td>

                      {/* PRICE */}
                      <td className="py-2 px-3 text-center font-semibold text-white">
                        £{product.price.toFixed(2)}
                      </td>

                      {/* Clickable Status Cell */}
                      <td
                        className={`py-2 px-3 text-center ${
                          product.isDeleted ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                        onClick={() => openToggleConfirm(product)}
                        title={
                          product.isDeleted
                            ? "Deleted product cannot be modified"
                            : product.isActive
                            ? "Click to deactivate"
                            : "Click to activate"
                        }
                      >
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            product.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              product.isActive ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* STOCK */}
                      <td className="py-2 px-3 text-center">
                        {(() => {
                          const qty = product.stockQuantity ?? 0;
                          const track = product.trackQuantity ?? true;
                          const lowThreshold = product.lowStockThreshold ?? 0;
                          const notifyBelow = product.notifyQuantityBelow ?? 0;
                          const notifyEnabled = product.notifyAdminForQuantityBelow ?? false;
                          const allowBackorder = product.allowBackorder ?? false;

                          let label = "";
                          let style = "";

                          if (!track) {
                            label = "Not Tracked";
                            style = "bg-slate-500/15 text-slate-400 border border-slate-500/30";
                          } 
                          else if (qty === 0 && allowBackorder) {
                            label = "Backorder Allowed";
                            style = "bg-purple-500/15 text-purple-400 border border-purple-500/30";
                          } 
                          else if (qty === 0) {
                            label = "Out of Stock";
                            style = "bg-red-500/15 text-red-400 border border-red-500/30";
                          } 
                          else if (lowThreshold > 0 && qty <= lowThreshold) {
                            label = "Low Stock";
                            style = "bg-amber-500/15 text-amber-400 border border-amber-500/30";
                          } 
                          else {
                            label = "In Stock";
                            style = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
                          }

                          const showAdminAlert =
                            notifyEnabled && notifyBelow > 0 && qty <= notifyBelow;

                          const tooltip = `
Tracking: ${track ? "Enabled" : "Disabled"}
Low Threshold: ${lowThreshold || "-"}
Notify Below: ${notifyBelow || "-"}
Admin Alert: ${notifyEnabled ? "Enabled" : "Disabled"}
Backorder: ${allowBackorder ? "Allowed" : "No"}
                          `.trim();

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <div
                                title={tooltip}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all ${style}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {label}
                                {track && (
                                  <span className="opacity-70 text-[11px]">({qty})</span>
                                )}
                              </div>

                              {showAdminAlert && (
                                <span
                                  title="Admin notification threshold reached"
                                  className="text-[10px] text-red-400 flex items-center gap-1"
                                >
                                  <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                                  Admin Alert
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                    
                      {/* VISIBILITY */}
                      <td className="py-1 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <span
                            title={
                              product.isPublished
                                ? "Product visible to customers"
                                : "Product hidden from customers"
                            }
                            className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${
                              product.isPublished
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-slate-600/20 text-slate-400"
                            }`}
                          >
                            {product.isPublished ? "Published" : "Unpublished"}
                          </span>

                          <span
                            title={
                              product.showOnHomepage
                                ? "Featured on homepage"
                                : "Not featured on homepage"
                            }
                            className={`px-2 py-0.5 rounded-md text-[12px] font-medium ${
                              product.showOnHomepage
                                ? "bg-violet-500/15 text-violet-400"
                                : "bg-slate-600/20 text-slate-400"
                            }`}
                          >
                            {product.showOnHomepage ? "★ Featured" : "Standard"}
                          </span>
                        </div>
                      </td>

                      <td
                        className="py-2 px-3 text-xs text-slate-300 cursor-help"
                        title={`
Created At: ${product.createdAt || "N/A"}
Last Updated At: ${product.updatedAt || "N/A"}
                        `.trim()}
                      >
                        {formatDate(product.updatedAt)}
                      </td>

                      <td
                        className="py-2 px-3 text-xs text-slate-300 truncate cursor-help"
                        title={`
Created By: ${product.createdBy || "N/A"}
Last Updated By: ${product.updatedBy || "N/A"}
                        `.trim()}
                      >
                        {product.updatedBy || "-"}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2 px-3">
                    <div className="flex items-center justify-center gap-1">

  {/* VIEW */}
  {!isDeleted && (
    <Link href={`/products/${product.slug}`} target="_blank">
      <button className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md">
        <ExternalLink className="h-4 w-4" />
      </button>
    </Link>
  )}

  {/* VIEW DETAILS */}
  {!isDeleted && (
    <button
      onClick={() => fetchProductDetails(product.id)}
      className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-md"
    >
      <Eye className="h-4 w-4" />
    </button>
  )}

  {/* EDIT */}
  {!isDeleted && (
    <Link href={`/admin/products/edit/${product.id}`}>
      <button className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-md">
        <Edit className="h-4 w-4" />
      </button>
    </Link>
  )}

  {/* DELETE / RESTORE */}
<button
  onClick={() =>
    openProductActionModal({
      id: product.id,
      name: product.name,
      isDeleted: product.isDeleted,
    })
  }
  className={`p-1.5 rounded-md transition-all ${
    product.isDeleted
      ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30' // ✅ FIXED
      : 'text-red-400 hover:bg-red-500/10'
  }`}
>
  {isBusy ? (
    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  ) : product.isDeleted ? (
    <CheckCircle className="h-4 w-4 shadow shadow-emerald-500/20" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</button>

</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
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
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm text-slate-400">Total {totalCount} items</div>
          </div>
        </div>
      )}

      {/* TAKEOVER REQUESTS PANEL */}
      {showTakeoverPanel && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm flex items-start justify-center pt-16"
          onClick={() => setShowTakeoverPanel(false)}
        >
          <div
            className="z-50 bg-slate-900/95 backdrop-blur-xl border border-orange-500/20 rounded-2xl shadow-2xl overflow-hidden max-w-7xl w-[95%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-red-500/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-400" />
                My Takeover Requests
                <span className="text-sm font-normal text-slate-400">({myTakeoverRequests.length})</span>
              </h3>
              <button
                onClick={() => setShowTakeoverPanel(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {loadingTakeovers ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              ) : myTakeoverRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Send className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-400">No takeover requests found</p>
                  <p className="text-slate-500 text-sm mt-1">Your requests will appear here</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="bg-slate-800/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Product
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Requested To
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Message
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Time
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTakeoverRequests.map((request, index) => (
                      <tr
                        key={request.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          index !== myTakeoverRequests.length - 1 ? 'border-b border-slate-700/30' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="text-white font-medium text-sm max-w-[220px]" title={request.productName}>
                            {request.productName}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-slate-300 text-xs max-w-[180px]" title={request.currentEditorEmail}>
                            {request.currentEditorEmail}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {request.requestMessage ? (
                            <div className="text-slate-400 text-xs italic max-w-[200px]" title={request.requestMessage}>
                              {request.requestMessage}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          {request.status === 'Pending' && !request.isExpired ? (
                            <div className="flex items-center justify-center gap-1.5 text-orange-400 text-xs font-medium whitespace-nowrap">
                              {formatTimeRemaining(request.expiresAt)}
                            </div>
                          ) : request.isExpired ? (
                            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs whitespace-nowrap">
                              <AlertCircle className="w-3 h-3" />
                              Expired
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {request.status === 'Pending' && !request.isExpired ? (
                              <button
                                onClick={() => handleCancelTakeoverRequest(request.id)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                                title="Cancel request"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            ) : request.status === 'Approved' ? (
                              <Link href={`/admin/products/edit/${request.productId}`}>
                                <button className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                                  <Edit className="w-3 h-3" />
                                  Edit Now
                                </button>
                              </Link>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ProductExcelImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchProducts(); // refresh list after import
            setShowImportModal(false);
          }}
        />
      )}

      {/* MODALS */}
      <ProductViewModal
        product={viewingProduct}
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        loading={loadingDetails}
      />

      <MediaViewerModal
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
        media={mediaToView}
        initialIndex={mediaStartIndex}
        baseUrl={API_BASE_URL.replace("/api", "")}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedDeleteProduct(null);
        }}
        onConfirm={handleConfirmProductAction}
        title={
          selectedDeleteProduct?.isDeleted
            ? "Restore Product"
            : "Delete Product"
        }
        message={
          selectedDeleteProduct?.isDeleted
            ? `Do you want to restore "${selectedDeleteProduct?.name}"?`
            : `Are you sure you want to delete "${selectedDeleteProduct?.name}"?`
        }
        confirmText={
          selectedDeleteProduct?.isDeleted
            ? "Restore Product"
            : "Delete Product"
        }
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor={
          selectedDeleteProduct?.isDeleted
            ? "text-emerald-400"
            : "text-red-400"
        }
        confirmButtonStyle={
          selectedDeleteProduct?.isDeleted
            ? "bg-gradient-to-r from-emerald-500 to-green-500"
            : "bg-gradient-to-r from-red-500 to-rose-500"
        }
        isLoading={isProcessing}
      />
<ConfirmDialog
  isOpen={!!bulkAction}
  onClose={() => setBulkAction(null)}
  onConfirm={async () => {
    if (!bulkAction) return;

    try {
      setIsProcessing(true);

      const { type, items } = bulkAction;

      if (items.length === 0) {
        toast.warning("No valid products selected");
        return;
      }

      if (type === "activate" || type === "deactivate") {
        await Promise.all(items.map(p => productsService.toggleActive(p.id)));
      }

      if (type === "publish" || type === "unpublish") {
        await Promise.all(items.map(p => productsService.togglePublish(p.id)));
      }

      if (type === "delete") {
        await Promise.all(items.map(p => productsService.delete(p.id)));
      }

      if (type === "restore") {
        await Promise.all(items.map(p => productsService.restore(p.id)));
      }

      toast.success(`${items.length} product(s) ${type}d successfully`);
      setSelectedProducts([]);
      fetchProducts();

    } catch (err) {
      toast.error("Bulk action failed");
    } finally {
      setIsProcessing(false);
      setBulkAction(null);
    }
  }}
  title={
    bulkAction?.type === "activate"
      ? "Activate Products?"
      : bulkAction?.type === "deactivate"
      ? "Deactivate Products?"
      : bulkAction?.type === "publish"
      ? "Publish Products?"
      : bulkAction?.type === "unpublish"
      ? "Unpublish Products?"
      : bulkAction?.type === "delete"
      ? "Delete Products?"
      : "Restore Products?"
  }
  message={`This will affect ${bulkAction?.items.length || 0} product(s).`}
  confirmText="Yes, Continue"
  cancelText="Cancel"
  iconColor={
    bulkAction?.type === "delete"
      ? "text-red-400"
      : "text-emerald-400"
  }
  confirmButtonStyle={
    bulkAction?.type === "delete"
      ? "bg-gradient-to-r from-red-600 to-rose-600"
      : "bg-gradient-to-r from-emerald-600 to-green-600"
  }
/>
      <ConfirmDialog
        isOpen={showToggleConfirm}
        onClose={() => {
          setShowToggleConfirm(false);
          setSelectedToggleProduct(null);
        }}
        onConfirm={async () => {
          if (!selectedToggleProduct) return;
          try {
            const response = await productsService.toggleActive(
              selectedToggleProduct.id
            );
            if (!response?.data?.success) {
              toast.error(response?.data?.message || "Failed to update status");
              return;
            }
            toast.success(response.data.message);
            fetchProducts();
          } catch (error: any) {
            toast.error(
              error.response?.data?.message || "Failed to toggle product"
            );
          } finally {
            setShowToggleConfirm(false);
            setSelectedToggleProduct(null);
          }
        }}
        title={
          selectedToggleProduct?.isActive
            ? "Deactivate Product?"
            : "Activate Product?"
        }
        message={
          selectedToggleProduct?.isActive
            ? "This product will no longer be visible to customers."
            : "This product will become visible to customers."
        }
        confirmText={
          selectedToggleProduct?.isActive
            ? "Yes, Deactivate"
            : "Yes, Activate"
        }
        cancelText="Cancel"
        iconColor={
          selectedToggleProduct?.isActive
            ? "text-red-400"
            : "text-emerald-400"
        }
        confirmButtonStyle={
          selectedToggleProduct?.isActive
            ? "bg-gradient-to-r from-red-600 to-rose-600"
            : "bg-gradient-to-r from-emerald-600 to-green-600"
        }
      />
    </div>
  );
}