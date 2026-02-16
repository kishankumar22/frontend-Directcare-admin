"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Select from "react-select";
import {
  Plus, Package, Edit, Trash2, Eye, Search, Filter, FilterX,
  TrendingUp, AlertCircle, X, CheckCircle, XCircle, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, Send, FolderTree,
  Award, ShoppingCart, Star, Tag, ExternalLink, ChevronDown, ChevronUp,
  Percent,
  FileSpreadsheet,
  Upload,
  Download
} from "lucide-react";
import { useToast } from "@/app/admin/_component/CustomToast";
import { API_BASE_URL } from "@/lib/api-config";
import { productLockService, TakeoverRequestData } from "@/lib/services/productLockService";
import ProductViewModal from "./ProductViewModal";
import { useRouter } from "next/navigation";

// SERVICES

import { categoriesService } from "@/lib/services/categories";
import { brandsService } from "@/lib/services/brands";
import ConfirmDialog from "@/app/admin/_component/ConfirmDialog";
import MediaViewerModal, { MediaItem } from "./MediaViewerModal";
import { RelatedProduct, Product, productsService, productHelpers } from "@/lib/services";
import ProductExcelImportModal from "./ProductExcelImportModal";
type ActionType = 'delete' | 'restore';
// ✅ INTERFACES
interface FormattedProduct {
  id: string;
    isDeleted: boolean; // ✅ ADD THIS
  name: string;
  categoryName: string;
  price: number;
  stock: number;
  stockQuantity: number;
  status: string;
  image: string;
  sales: number;
  isActive: boolean;
  shortDescription: string;
  sku: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  description: string;
  category: string;
  isPublished: boolean;
  productType: string;
  brandName: string;
  slug: string;
  showOnHomepage: boolean;
  markAsNew: boolean;
  notReturnable: boolean;
  manageInventoryMethod: string;
  isRecurring: boolean;
  vatExempt: boolean;
  nextDayDeliveryEnabled: boolean;
  standardDeliveryEnabled: boolean;
  sameDayDeliveryEnabled: boolean;
  hasDiscount: boolean;
  discountPercentage: number;
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
 // Export menu state
 const [showExportMenu, setShowExportMenu] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectOption>({ value: "all", label: "All Categories" });
  const [selectedBrand, setSelectedBrand] = useState<SelectOption>({ value: "all", label: "All Brands" });
  const [selectedHomepage, setSelectedHomepage] = useState<SelectOption>({ value: "all", label: "Homepage: All" });
  const [selectedType, setSelectedType] = useState<SelectOption>({ value: "all", label: "All Types" });
  
  // Second row filters
  const [statusFilter, setStatusFilter] = useState<SelectOption>({ value: "all", label: "All Status" });
  const [publishedFilter, setPublishedFilter] = useState<SelectOption>({ value: "all", label: "All Visibility" });
  const [deliveryFilter, setDeliveryFilter] = useState<SelectOption>({ value: "all", label: "All Delivery" });
  const [markAsNewFilter, setMarkAsNewFilter] = useState<SelectOption>({ value: "all", label: "Mark as New: All" });
  const [notReturnableFilter, setNotReturnableFilter] = useState<SelectOption>({ value: "all", label: "Returnable: All" });
  const [inventoryFilter, setInventoryFilter] = useState<SelectOption>({ value: "all", label: "Inventory: All" });
  const [recurringFilter, setRecurringFilter] = useState<SelectOption>({ value: "all", label: "Subscription: All" });
  const [vatFilter, setVatFilter] = useState<SelectOption>({ value: "all", label: "VAT: All" });
  const [discountFilter, setDiscountFilter] = useState<SelectOption>({ value: "all", label: "Discount: All" });

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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
  ];

  const statusOptions: SelectOption[] = [
    { value: "all", label: "All Status" },
    { value: "In Stock", label: "In Stock" },
    { value: "Low Stock", label: "Low Stock" },
    { value: "Out of Stock", label: "Out of Stock" },
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

  // ✅ HELPERS
  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

const [selectedProduct, setSelectedProduct] = useState<{
  id: string;
  name: string;
  isDeleted: boolean;
} | null>(null);

const openProductActionModal = (product: {
  id: string;
  name: string;
  isDeleted: boolean;
}) => {
  setSelectedProduct({
    id: product.id,
    name: product.name,
    isDeleted: product.isDeleted,
  });
};

const deletedOptions = [
  { value: "all", label: "All Records" },
  { value: "false", label: "Active Only" },
  { value: "true", label: "Deleted Only" },
];

const [deletedFilter, setDeletedFilter] = useState(deletedOptions[0]);



const [isProcessing, setIsProcessing] = useState(false);
  const getProductImage = (images: any[]): string => {
    if (!images || images.length === 0) return "";
    const mainImage = images.find((img: any) => img.isMain) || images[0];
    return API_BASE_URL.replace("/api", "") + mainImage.imageUrl.replace("~", "");
  };

  const getPrimaryCategoryName = (categories: any[]): string => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return "Uncategorized";
    }
    const primaryCategory = categories.find((cat: any) => cat.isPrimary === true);
    return primaryCategory?.categoryName || categories[0]?.categoryName || "Uncategorized";
  };
const handleConfirmProductAction = async () => {
  if (!selectedProduct) return;

  setIsProcessing(true);

  try {
    if (selectedProduct.isDeleted) {
      // RESTORE
      await productsService.restore(selectedProduct.id);
      toast.success('Product restored successfully!');
    } else {
      // DELETE
      await productsService.delete(selectedProduct.id);
      toast.success('Product deleted successfully!');
    }

    await fetchProducts();
  } catch (err) {
    console.error('Product action error:', err);
    toast.error('Action failed');
  } finally {
    setIsProcessing(false);
    setSelectedProduct(null);
  }
};
useEffect(() => {
  fetchProducts();
}, [deletedFilter]);

  // ✅ FETCH PRODUCTS
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsService.getAll({
  page: 1,
  pageSize: 1000,
  isDeleted:
    deletedFilter.value === "all"
      ? undefined
      : deletedFilter.value === "true",
});


      if (response.data?.success && response.data?.data?.items) {
        const items = response.data.data.items;

        const formattedProducts: FormattedProduct[] = items.map((p: any) => {
          const primaryCategoryName = getPrimaryCategoryName(p.categories);
          
          // Check if product has discount
          const hasDiscount = p.appliedDiscounts && p.appliedDiscounts.length > 0;
          let discountPercentage = 0;
          
          if (hasDiscount) {
            const maxDiscount = Math.max(
              ...p.appliedDiscounts.map((d: any) => d.discountPercentage || 0)
            );
            discountPercentage = maxDiscount;
          }

          return {
            id: p.id,
            name: p.name,
            categoryName: primaryCategoryName,
            price: p.price || 0,
            stock: p.stockQuantity || 0,
            stockQuantity: p.stockQuantity || 0,
            status: productHelpers.getStockStatus(p.stockQuantity),
            image: getProductImage(p.images),
            sales: 0,
            shortDescription: p.shortDescription || "",
            sku: p.sku || "",
            createdAt: formatDate(p.createdAt),
            updatedAt: p.updatedAt ? formatDate(p.updatedAt) : "N/A",
            updatedBy: p.updatedBy || "N/A",
            description: p.description || p.shortDescription || "",
            category: primaryCategoryName,
            isPublished: p.isPublished === true,
            productType: p.productType || "simple",
            brandName: p.brandName || "No Brand",
            slug: p.slug || "",
            isActive:p.isActive=== true,
            showOnHomepage: p.showOnHomepage === true,
            markAsNew: p.markAsNew === true,
            notReturnable: p.notReturnable === true,
            manageInventoryMethod: p.manageInventoryMethod || "track",
            isRecurring: p.isRecurring === true,
            vatExempt: p.vatExempt === true,
            nextDayDeliveryEnabled: p.nextDayDeliveryEnabled === true,
            standardDeliveryEnabled: p.standardDeliveryEnabled === true,
            sameDayDeliveryEnabled: p.sameDayDeliveryEnabled === true,
            hasDiscount,
            discountPercentage,
            isDeleted: p.isDeleted === true, // ✅ VERY IMPORTANT
          };
        });

        setProducts(formattedProducts);

        const productMap = new Map<string, RelatedProduct>();
        items.forEach((p: any) => {
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
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products.");
    } finally {
      setLoading(false);
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

  // ✅ FETCH PRODUCT DETAILS
  const fetchProductDetails = async (productId: string) => {
    setLoadingDetails(true);
    try {
      const response = await productsService.getById(productId);

      if (response.data?.success && response.data?.data) {
        const p = response.data.data;

        if (p.relatedProductIds) {
          p.relatedProducts = p.relatedProductIds
            .split(",")
            .map((id: string) => allProductsMap.get(id.trim()))
            .filter((product): product is RelatedProduct => product !== undefined);
        }

        if (p.crossSellProductIds) {
          p.crossSellProducts = p.crossSellProductIds
            .split(",")
            .map((id: string) => allProductsMap.get(id.trim()))
            .filter((product): product is RelatedProduct => product !== undefined);
        }

        setViewingProduct(p);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
      toast.error("Failed to load product details");
    } finally {
      setLoadingDetails(false);
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

  const handleExport = async (exportAll: boolean = false) => {
  try {
    let rawProductsData: any[] = [];

    toast.info('Preparing export...');

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
      // Get full data for filtered products
      const filteredIds = filteredProducts.map(p => p.id);
      
      for (const id of filteredIds) {
        try {
          const response = await productsService.getById(id);
          if (response.data?.success && response.data?.data) {
            rawProductsData.push(response.data.data);
          }
        } catch (error) {
          console.error(`Error fetching product ${id}:`, error);
        }
      }
    }

    if (rawProductsData.length === 0) {
      toast.warning('No products to export');
      return;
    }

    // ==========================================
    // 📊 COMPREHENSIVE CSV HEADERS (A-Z Professional)
    // ==========================================
    const csvHeaders = [
      'Product ID',
      'Product Name',
      'Slug',
      'SKU',
      'GTIN',
      'Manufacturer Part Number',
      'Product Type',
      'Brand',
      'Primary Category',
      'All Categories',
      
      // Pricing
      'Price (£)',
      'Old Price (£)',
      'Compare At Price (£)',
      'Cost Price (£)',
      'Call For Price',
      'Customer Enters Price',
      'Min Customer Price (£)',
      'Max Customer Price (£)',
      
      // Inventory
      'Stock Quantity',
      'Stock Status',
      'Track Quantity',
      'Manage Inventory Method',
      'Min Stock Quantity',
      'Notify Admin Below Quantity',
      'Notify Quantity Below',
      'Allow Backorder',
      'Backorder Mode',
      'Product Availability Range',
      
      // Cart/Order Settings
      'Order Min Quantity',
      'Order Max Quantity',
      'Allowed Quantities',
      'Not Returnable',
      'Disable Buy Button',
      'Disable Wishlist Button',
      
      // Shipping
      'Requires Shipping',
      'Free Shipping',
      'Ship Separately',
      'Additional Shipping Charge (£)',
      'Weight',
      'Weight Unit',
      'Length',
      'Width',
      'Height',
      'Dimension Unit',
      
      // Delivery Options
      'Same Day Delivery',
      'Next Day Delivery',
      'Standard Delivery',
      
      // Publishing & Visibility
      'Published',
      'Published Date',
      'Visible Individually',
      'Show On Homepage',
      'Display Order',
      'Mark As New',
      'Mark As New Start Date',
      'Mark As New End Date',
      'Available Start Date',
      'Available End Date',
      
      // Tax
      'Tax Exempt',
      'Tax Category ID',
      
      // Descriptions
      'Short Description',
      'Full Description',
      
      // SEO
      'Meta Title',
      'Meta Description',
      'Meta Keywords',
      'SEO Friendly Page Name',
      
      // Additional
      'Tags',
      'Video URLs',
      'Specification Attributes',
      'Allow Customer Reviews',
      'Average Rating',
      'Review Count',
      'View Count',
      
      // Relations
      'Related Product IDs',
      'Cross Sell Product IDs',
      
      // Images
      'Total Images',
      'Main Image URL',
      
      // Variants
      'Total Variants',
      'Has Variants',
      
      // Attributes
      'Total Attributes',
      
      // Admin
      'Admin Comment',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By',
    ];

    // ==========================================
    // 📋 MAP DATA TO CSV ROWS
    // ==========================================
    const csvData = rawProductsData.map((product: any) => {
      const primaryCategory = getPrimaryCategoryName(product.categories);
      const allCategories = product.categories?.map((c: any) => c.categoryName).join(' | ') || '';
      const stockStatus = productHelpers.getStockStatus(product.stockQuantity);
      
      return [
        product.id || '',
        product.name || '',
        product.slug || '',
        product.sku || '',
        product.gtin || '',
        product.manufacturerPartNumber || '',
        product.productType || 'simple',
        product.brandName || '',
        primaryCategory,
        allCategories,
        
        // Pricing
        product.price || 0,
        product.oldPrice || '',
        product.compareAtPrice || '',
        product.costPrice || '',
        product.callForPrice ? 'Yes' : 'No',
        product.customerEntersPrice ? 'Yes' : 'No',
        product.minimumCustomerEnteredPrice || '',
        product.maximumCustomerEnteredPrice || '',
        
        // Inventory
        product.stockQuantity || 0,
        stockStatus,
        product.trackQuantity ? 'Yes' : 'No',
        product.manageInventoryMethod || '',
        product.minStockQuantity || '',
        product.notifyAdminForQuantityBelow ? 'Yes' : 'No',
        product.notifyQuantityBelow || '',
        product.allowBackorder ? 'Yes' : 'No',
        product.backorderMode || '',
        product.productAvailabilityRange || '',
        
        // Cart/Order Settings
        product.orderMinimumQuantity || 1,
        product.orderMaximumQuantity || 10000,
        product.allowedQuantities || '',
        product.notReturnable ? 'Yes' : 'No',
        product.disableBuyButton ? 'Yes' : 'No',
        product.disableWishlistButton ? 'Yes' : 'No',
        
        // Shipping
        product.requiresShipping ? 'Yes' : 'No',
        product.isFreeShipping ? 'Yes' : 'No',
        product.shipSeparately ? 'Yes' : 'No',
        product.additionalShippingCharge || '',
        product.weight || '',
        product.weightUnit || '',
        product.length || '',
        product.width || '',
        product.height || '',
        product.dimensionUnit || '',
        
        // Delivery Options
        product.sameDayDeliveryEnabled ? 'Yes' : 'No',
        product.nextDayDeliveryEnabled ? 'Yes' : 'No',
        product.standardDeliveryEnabled ? 'Yes' : 'No',
        
        // Publishing & Visibility
        product.isPublished ? 'Yes' : 'No',
        product.publishedAt || '',
        product.visibleIndividually ? 'Yes' : 'No',
        product.showOnHomepage ? 'Yes' : 'No',
        product.displayOrder || '',
        product.markAsNew ? 'Yes' : 'No',
        product.markAsNewStartDate || '',
        product.markAsNewEndDate || '',
        product.availableStartDate || '',
        product.availableEndDate || '',
        
        // Tax
        product.taxExempt ? 'Yes' : 'No',
        product.taxCategoryId || '',
        
        // Descriptions
        (product.shortDescription || '').replace(/"/g, '""').replace(/<[^>]*>/g, ''),
        (product.description || '').replace(/"/g, '""').replace(/<[^>]*>/g, ''),
        
        // SEO
        product.metaTitle || '',
        product.metaDescription || '',
        product.metaKeywords || '',
        product.searchEngineFriendlyPageName || '',
        
        // Additional
        product.tags || '',
        product.videoUrls || '',
        product.specificationAttributes || '',
        product.allowCustomerReviews ? 'Yes' : 'No',
        product.averageRating || 0,
        product.reviewCount || 0,
        product.viewCount || 0,
        
        // Relations
        product.relatedProductIds || '',
        product.crossSellProductIds || '',
        
        // Images
        product.images?.length || 0,
        product.images?.[0]?.imageUrl || '',
        
        // Variants
        product.variants?.length || 0,
        product.variants && product.variants.length > 0 ? 'Yes' : 'No',
        
        // Attributes
        product.attributes?.length || 0,
        
        // Admin
        product.adminComment || '',
        product.createdAt || '',
        product.createdBy || '',
        product.updatedAt || '',
        product.updatedBy || '',
      ];
    });

    // ==========================================
    // 💾 CREATE AND DOWNLOAD CSV FILE
    // ==========================================
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map((row) =>
        row.map((cell) => {
          const cellStr = String(cell ?? '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const exportType = exportAll ? 'all' : 'filtered';
    link.download = `products-${exportType}-${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`✅ ${rawProductsData.length} product(s) exported successfully with complete data!`);
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export products');
    setLoading(false);
  }
};// ==========================================
// ⏱️ FORMAT TIME REMAINING
// ==========================================
const formatTimeRemaining = (expiresAt: string): string => {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff / 1000) % 60);

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

// ==========================================
// 🎨 GET STATUS COLOR
// ==========================================
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'Approved':
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'Rejected':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'Expired':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    case 'Cancelled':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
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

  // ✅ INITIAL FETCH
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
    fetchMyTakeoverRequests();

    const pollInterval = setInterval(() => {
      fetchMyTakeoverRequests();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // ✅ CLEAR FILTERS
const clearFilters = useCallback(() => {
  setSelectedCategory({ value: "all", label: "All Categories" });
  setSelectedBrand({ value: "all", label: "All Brands" });
  setSelectedHomepage({ value: "all", label: "Homepage: All" });
  setSelectedType({ value: "all", label: "All Types" });
  setStatusFilter({ value: "all", label: "All Status" });
  setPublishedFilter({ value: "all", label: "All Visibility" });
  setDeliveryFilter({ value: "all", label: "All Delivery" });
  setMarkAsNewFilter({ value: "all", label: "Mark as New: All" });
  setNotReturnableFilter({ value: "all", label: "Returnable: All" });
  setInventoryFilter({ value: "all", label: "Inventory: All" });
  setRecurringFilter({ value: "all", label: "Subscription: All" });
  setVatFilter({ value: "all", label: "VAT: All" });
  setDiscountFilter({ value: "all", label: "Discount: All" });

  // ✅ ADD THIS
  setDeletedFilter({ value: "all", label: "All Records" });

  setSearchTerm("");
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
    discountFilter.value !== "all" ||

    // ✅ ADD THIS
    deletedFilter.value !== "all" ||

    searchTerm.trim() !== "",
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
    discountFilter,

    // ✅ ADD THIS
    deletedFilter,

    searchTerm,
  ]
);


// ✅ FLATTEN CATEGORIES WITH FULL PATH
const categoryOptions: SelectOption[] = useMemo(() => {
  const options: SelectOption[] = [{ value: "all", label: "All Categories" }];

  const flatten = (cats: CategoryData[], level = 0, parentPath: string[] = []) => {
    cats.forEach((cat) => {
      const currentPath = [...parentPath, cat.name];
      
      // ✅ SEPARATOR: > for level 1, >> for level 2+
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
        value: cat.name,
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


  // ✅ BRAND OPTIONS
  const brandOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "all", label: "All Brands" },
      ...brands.map((b) => ({ value: b.name, label: b.name })),
    ];
  }, [brands]);

  // ✅ SORTED PRODUCTS
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [products]);

  // ✅ FILTERED PRODUCTS
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brandName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory.value === "all" || product.categoryName === selectedCategory.value;

      const matchesBrand =
        selectedBrand.value === "all" || product.brandName === selectedBrand.value;

      const matchesHomepage =
        selectedHomepage.value === "all" ||
        (selectedHomepage.value === "yes" && product.showOnHomepage) ||
        (selectedHomepage.value === "no" && !product.showOnHomepage);

      const matchesType =
        selectedType.value === "all" || product.productType === selectedType.value;

      const matchesStatus =
        statusFilter.value === "all" || product.status === statusFilter.value;

      const matchesPublished =
        publishedFilter.value === "all" ||
        (publishedFilter.value === "published" && product.isPublished) ||
        (publishedFilter.value === "unpublished" && !product.isPublished);

      const matchesDelivery =
        deliveryFilter.value === "all" ||
        (deliveryFilter.value === "nextDay" && product.nextDayDeliveryEnabled) ||
        (deliveryFilter.value === "standard" && product.standardDeliveryEnabled) ||
        (deliveryFilter.value === "sameDay" && product.sameDayDeliveryEnabled);

      const matchesMarkAsNew =
        markAsNewFilter.value === "all" ||
        (markAsNewFilter.value === "yes" && product.markAsNew) ||
        (markAsNewFilter.value === "no" && !product.markAsNew);

      const matchesReturnable =
        notReturnableFilter.value === "all" ||
        (notReturnableFilter.value === "yes" && product.notReturnable) ||
        (notReturnableFilter.value === "no" && !product.notReturnable);

      const matchesInventory =
        inventoryFilter.value === "all" ||
        product.manageInventoryMethod === inventoryFilter.value;

      const matchesRecurring =
        recurringFilter.value === "all" ||
        (recurringFilter.value === "yes" && product.isRecurring) ||
        (recurringFilter.value === "no" && !product.isRecurring);

      const matchesVat =
        vatFilter.value === "all" ||
        (vatFilter.value === "yes" && product.vatExempt) ||
        (vatFilter.value === "no" && !product.vatExempt);

      const matchesDiscount =
        discountFilter.value === "all" ||
        (discountFilter.value === "yes" && product.hasDiscount) ||
        (discountFilter.value === "no" && !product.hasDiscount);
        const matchesDeleted =
  deletedFilter.value === "all" ||
  (deletedFilter.value === "true" && product.isDeleted) ||
  (deletedFilter.value === "false" && !product.isDeleted);


      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesHomepage &&
        matchesType &&
        matchesStatus &&
        matchesPublished &&
        matchesDelivery &&
        matchesMarkAsNew &&
        matchesReturnable &&
        matchesInventory &&
        matchesRecurring &&
        matchesVat &&
        matchesDiscount &&
        matchesDeleted
      );
    });
  }, [
    sortedProducts,
    searchTerm,
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
    discountFilter,
  ]);

  // ✅ PAGINATION
  const paginationData = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredProducts.slice(startIndex, endIndex);

    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [filteredProducts, currentPage, itemsPerPage]);

  const { totalItems, totalPages, startIndex, endIndex, currentData } = paginationData;

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





  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
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
    discountFilter,
  ]);

  // ✅ STATS
  const stats = useMemo(
    () => ({
      totalCount: products.length,
      lowStockCount: products.filter((p) => p.status === "Low Stock").length,
      outOfStockCount: products.filter((p) => p.status === "Out of Stock").length,
      publishedCount: products.filter((p) => p.isPublished).length,
    }),
    [products]
  );

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

  // ✅ LOADING
  if (loading) {
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
      {/* HEADER */}
{/* ================= HEADER ================= */}
{/* ================= HEADER ================= */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  {/* Title */}
  <div>
    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
      Product Management
    </h1>
    <p className="text-sm text-slate-400">Manage your product inventory</p>
  </div>

  {/* Actions */}
  <div className="flex flex-wrap items-center gap-2">
    
    {/* <button
      onClick={() => router.push("/admin/categories")}
      className="flex items-center gap-2 px-3 py-1.5 text-sm
      bg-gradient-to-r from-violet-500 to-purple-500
      hover:from-violet-600 hover:to-purple-600
      text-white rounded-lg font-semibold shadow
      hover:shadow-violet-500/40 transition-all"
    >
      <FolderTree className="w-4 h-4" />
      Categories
    </button> */}

    {/* Brands */}
    {/* <button
      onClick={() => router.push("/admin/brands")}
      className="flex items-center gap-2 px-3 py-1.5 text-sm
      bg-gradient-to-r from-cyan-500 to-blue-500
      hover:from-cyan-600 hover:to-blue-600
      text-white rounded-lg font-semibold shadow
      hover:shadow-cyan-500/40 transition-all"
    >
      <Award className="w-4 h-4" />
      Brands
    </button> */}

    {/* Discounts */}
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

    {/* Orders */}
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

{/* Import Excel */}
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


    {/* Reviews */}
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

    {/* My Requests */}
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

    {/* Export */}
    <div className="relative">
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm
        bg-gradient-to-r from-green-600 to-emerald-600
        text-white rounded-lg font-semibold shadow
        hover:shadow-green-500/40 transition-all"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export
      </button>

      {showExportMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowExportMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20">
            <button
              onClick={() => {
                handleExport(false);
                setShowExportMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700"
            >
              Export Filtered ({filteredProducts.length})
            </button>

            <button
              onClick={() => {
                handleExport(true);
                setShowExportMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700"
            >
              Export All ({products.length})
            </button>
          </div>
        </>
      )}
    </div>

    {/* Add Product */}
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
  {/* Total */}
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

  {/* Published */}
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

  {/* Low Stock */}
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

  {/* Out of Stock */}
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

{/* ================= ITEMS PER PAGE + RESULTS COUNT ================= */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-3 py-2">
  <div className="flex items-center justify-between gap-3">

    {/* LEFT: Items per page */}
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

    {/* RIGHT: Result + Active filters */}
    <div className="text-xs text-slate-400 whitespace-nowrap">
      Showing {totalItems === 0 ? 0 : startIndex + 1} to{" "}
      {Math.min(endIndex, totalItems)} of {totalItems} product
      {totalItems !== 1 ? "s" : ""}
      {hasActiveFilters && (
        <span className="text-violet-400">
          {" "}.{" "}
          {[
            searchTerm !== "",
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
            discountFilter.value !== "all",
          ].filter(Boolean).length} active filter
          {[
            searchTerm !== "",
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
            discountFilter.value !== "all",
          ].filter(Boolean).length !== 1 && "s"}
        </span>
      )}
    </div>

  </div>
</div>



{/* ✅ FILTERS SECTION - ROW 1 */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5">

  <div className="flex items-center gap-3">
    {/* <Filter className="h-5 w-5 text-slate-400 flex-shrink-0" /> */}

    {/* Search Box - Normal Input */}
    <div className="relative flex-1 min-w-[200px] max-w-[280px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
      <input
        type="search"
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
      />
    </div>

    {/* Category - React Select */}
    <div className="flex-1 min-w-[280px]">
      <Select
        value={selectedCategory}
        onChange={(option) => setSelectedCategory(option as SelectOption)}
        options={categoryOptions}
        styles={customSelectStyles}
        placeholder="All Categories"
        isSearchable
        formatOptionLabel={formatOptionLabel} // ✅ ADD THIS
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
      />
    </div>

    {/* Brand - React Select */}
    <div className="flex-1  max-w-[180px]">
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

    {/* Homepage - Normal Select */}
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

    {/* Type - Normal Select */}
<div className="flex gap-3">

  {/* Type Filter */}
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

  {/* Deleted Filter */}
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


    {/* Clear & Hide Buttons */}
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
        {/* All Status */}
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

        {/* All Visibility */}
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

        {/* All Delivery */}
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

        {/* Mark as New */}
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

        {/* Returnable */}
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

        {/* Inventory */}
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

        {/* Subscription */}
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

        {/* VAT */}
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

        {/* Discount */}
        <select
          value={discountFilter.value}
          onChange={(e) => {
            const option = discountOptions.find(opt => opt.value === e.target.value);
            if (option) setDiscountFilter(option);
          }}
          className={`w-full px-3 py-2.5 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
            discountFilter.value !== "all"
              ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
              : "border-slate-600"
          }`}
        >
          {discountOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )}
</div>

    



      {/* ✅ PRODUCTS TABLE WITH DISCOUNT COLUMN */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No products found</p>
          </div>
        ) : (
<div className="overflow-x-auto">
  <table className="w-full table-fixed text-sm">
    <thead>
      <tr className="border-b border-slate-800">
        <th className="text-left py-2 px-3 text-slate-400 w-[260px]">Product</th>
        <th className="text-center py-2 px-3 text-slate-400 w-[110px]">SKU</th>
        <th className="text-center py-2 px-3 text-slate-400 w-[80px]">Price</th>
        {/* <th className="text-center py-2 px-3 text-slate-400 w-[80px]">status</th> */}
        <th className="text-center py-2 px-3 text-slate-400 w-[70px]">Stock</th>
        <th className="text-center py-2 px-3 text-slate-400 w-[140px]">Stock Status</th>
        <th className="text-center py-2 px-3 text-slate-400 w-[100px]">Visibility</th>
        <th className="text-left py-2 px-3 text-slate-400 w-[110px]">Updated</th>
        <th className="text-left py-2 px-3 text-slate-400 w-[110px]">Updated By</th>
        <th className="text-center py-2 px-3 text-slate-400 w-[140px]">Actions</th>
      </tr>
    </thead>

    <tbody>
      {currentData.map((product) => {
        const isBusy =
          isProcessing && selectedProduct?.id === product.id;

        return (
          <tr
            key={product.id}
            className={`border-b border-slate-800 transition-colors
              ${product.isDeleted ? 'opacity-60 grayscale bg-red-500/5' : 'hover:bg-slate-800/30'}
              ${isBusy ? 'pointer-events-none' : ''}
            `}
          >
            {/* PRODUCT */}
            <td className="py-2 px-3">
              <div className="flex items-center gap-2">
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
            {/* <td className="py-2 px-3 text-center font-semibold text-blue-400">
              {product.isActive ? 'Active' : 'Inactive'}
            </td> */}

            {/* STOCK */}
            <td className="py-2 px-3 text-center">
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  product.stockQuantity > 10
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : product.stockQuantity > 0
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {product.stockQuantity}
              </span>
            </td>

            {/* STOCK STATUS */}
            <td className="py-2 px-3 text-center">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                  product.status === 'In Stock'
                    ? 'bg-green-500/10 text-green-400'
                    : product.status === 'Low Stock'
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {product.status}
              </span>
            </td>

            {/* VISIBILITY */}
            <td className="py-2 px-3 text-center">
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  product.isPublished
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                {product.isPublished ? 'Published' : 'Unpublished'}
              </span>
            </td>

            {/* UPDATED */}
            <td className="py-2 px-3 text-xs text-slate-300">
              {product.updatedAt
                ? new Date(product.updatedAt).toLocaleDateString()
                : '-'}
            </td>

            {/* UPDATED BY */}
            <td className="py-2 px-3 text-xs text-slate-300 truncate">
              {product.updatedBy || '-'}
            </td>

            {/* ACTIONS */}
            <td className="py-2 px-3">
              <div className="flex items-center justify-center gap-1">
                <Link href={`/products/${product.slug}`} target="_blank">
                  <button className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md"
                    title="View On Browser">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </Link>

                <button
                  onClick={() => fetchProductDetails(product.id)}
                  className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-md"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>

                <Link href={`/admin/products/edit/${product.id}`}>
                  <button className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-md"
                    title="Edit Product">
                    <Edit className="h-4 w-4" />
                  </button>
                </Link>

                <button
                  onClick={() =>
                    openProductActionModal({
                      id: product.id,
                      name: product.name,
                      isDeleted: product.isDeleted,
                    })
                  }
                  className={`p-1.5 rounded-md ${
                    product.isDeleted
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-red-400 hover:bg-red-500/10'
                  }`}
                  title={
                    product.isDeleted
                      ? 'Restore Product'
                      : 'Delete Product'
                  }
                >
                  {isBusy ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : product.isDeleted ? (
                    <CheckCircle className="h-4 w-4" />
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

            <div className="text-sm text-slate-400">Total {totalItems} items</div>
          </div>
        </div>
      )}
{/* ==================== TAKEOVER REQUESTS PANEL ==================== */}
{showTakeoverPanel && (
  <div
    className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm flex items-start justify-center pt-16"
    onClick={() => setShowTakeoverPanel(false)}
  >
    <div
      className="z-50 bg-slate-900/95 backdrop-blur-xl border border-orange-500/20 rounded-2xl shadow-2xl overflow-hidden max-w-7xl w-[95%]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
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

      {/* Content */}
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
                  {/* Product Name */}
                  <td className="px-4 py-4">
                    <div className="text-white font-medium text-sm max-w-[220px]" title={request.productName}>
                      {request.productName}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </td>

                  {/* Requested To */}
                  <td className="px-4 py-4">
                    <div className="text-slate-300 text-xs max-w-[180px]" title={request.currentEditorEmail}>
                      {request.currentEditorEmail}
                    </div>
                  </td>

                  {/* Message */}
                  <td className="px-4 py-4">
                    {request.requestMessage ? (
                      <div className="text-slate-400 text-xs italic max-w-[200px]" title={request.requestMessage}>
                        {request.requestMessage}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>

                  {/* Time Remaining */}
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

                  {/* Actions */}
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
  isOpen={!!selectedProduct}
  onClose={() => setSelectedProduct(null)}
  onConfirm={handleConfirmProductAction}
  title={selectedProduct?.isDeleted ? 'Restore Product' : 'Delete Product'}
  message={
    selectedProduct?.isDeleted
      ? `Do you want to restore "${selectedProduct?.name}"?`
      : `Are you sure you want to delete "${selectedProduct?.name}"?`
  }
  confirmText={selectedProduct?.isDeleted ? 'Restore Product' : 'Delete Product'}
  cancelText="Cancel"
  icon={AlertCircle}
  iconColor={
    selectedProduct?.isDeleted ? 'text-emerald-400' : 'text-red-400'
  }
  confirmButtonStyle={
    selectedProduct?.isDeleted
      ? 'bg-gradient-to-r from-emerald-500 to-green-500'
      : 'bg-gradient-to-r from-red-500 to-rose-500'
  }
  isLoading={isProcessing}
/>




    </div>
  );
}
