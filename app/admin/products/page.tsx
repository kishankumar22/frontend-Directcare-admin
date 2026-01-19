'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Package,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  FilterX,
  TrendingUp,
  AlertCircle,
  X,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Send,
  Play,
  ImageIcon,
  FolderTree,
  Award,
  ShoppingCart,
  Star,
  Tag,
} from 'lucide-react';
import { useToast } from '@/components/CustomToast';
import { API_BASE_URL } from '@/lib/api-config';

import { productLockService, TakeoverRequestData } from '@/lib/services/productLockService';

import ProductViewModal from './ProductViewModal';
import { useRouter } from "next/navigation";

// ==========================================
// 📦 IMPORT FROM SERVICES
// ==========================================
import {
  productsService,
  productHelpers,
  Product,
  RelatedProduct,
  CategoryData,
} from '../../../lib/services/products';
import { categoriesService } from '@/lib/services/categories';
import ConfirmDialog from '@/components/ConfirmDialog';
import MediaViewerModal, { MediaItem } from './MediaViewerModal';


// ==========================================
// 📊 FORMATTED PRODUCT INTERFACE (FOR TABLE)
// ==========================================
interface FormattedProduct {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  stock: number;
  stockQuantity: number;
  status: string;
  image: string;
  sales: number;
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
}

// ==========================================
// 🎯 MAIN COMPONENT
// ==========================================
export default function ProductsPage() {
  const toast = useToast();
  const router = useRouter();


  // ==========================================
  // 📊 STATE MANAGEMENT
  // ==========================================
  const [products, setProducts] = useState<FormattedProduct[]>([]);
  const [allProductsMap, setAllProductsMap] = useState<Map<string, RelatedProduct>>(new Map());
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState('all');

  // Media states
// ✅ ADD THESE NEW STATES:
const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
const [mediaToView, setMediaToView] = useState<MediaItem[]>([]);
const [mediaStartIndex, setMediaStartIndex] = useState(0);


  // Takeover states
  const [myTakeoverRequests, setMyTakeoverRequests] = useState<TakeoverRequestData[]>([]);
  const [showTakeoverPanel, setShowTakeoverPanel] = useState(false);
  const [loadingTakeovers, setLoadingTakeovers] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Export menu
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ==========================================
  // 📅 FORMAT DATE HELPER
  // ==========================================
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==========================================
  // 🖼️ GET PRODUCT IMAGE HELPER
  // ==========================================
  const getProductImage = (images: any): string => {
    if (!images || images.length === 0) return '';
    const mainImage = images.find((img: any) => img.isMain) || images[0];
    return `${API_BASE_URL.replace('/api', '')}/${mainImage.imageUrl.replace('\\', '/')}`;
  };
// ==========================================
// 🔧 HELPER: GET PRIMARY CATEGORY NAME
// ==========================================
const getPrimaryCategoryName = (categories: any[]): string => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return 'Uncategorized';
  }
  
  const primaryCategory = categories.find((cat: any) => cat.isPrimary === true);
  return primaryCategory?.categoryName || categories[0]?.categoryName || 'Uncategorized';
};

// ==========================================
// 📦 FETCH PRODUCTS (SERVICE-BASED) - UPDATED
// ==========================================
const fetchProducts = async () => {
  setLoading(true);

  try {
    const response = await productsService.getAll({
      page: 1,
      pageSize: 1000,
    });

    if (response.data?.success && response.data?.data?.items) {
      const items = response.data.data.items;

      const formattedProducts: FormattedProduct[] = items.map((p: any) => {
        const primaryCategoryName = getPrimaryCategoryName(p.categories);
        
        return {
          id: p.id,
          name: p.name,
          categoryName: primaryCategoryName, // ✅ PRIMARY CATEGORY
          price: p.price || 0,
          stock: p.stockQuantity || 0,
          stockQuantity: p.stockQuantity || 0,
          status: productHelpers.getStockStatus(p.stockQuantity),
          image: getProductImage(p.images),
          sales: 0,
          shortDescription: p.shortDescription || '',
          sku: p.sku || '',
          createdAt: formatDate(p.createdAt),
          updatedAt: p.updatedAt ? formatDate(p.updatedAt) : 'N/A',
          updatedBy: p.updatedBy || 'N/A',
          description: p.description || p.shortDescription || '',
          category: primaryCategoryName, // ✅ PRIMARY CATEGORY
          isPublished: p.isPublished || false,
          productType: p.productType || 'simple',
          brandName: p.brandName || 'No Brand',
        };
      });

      setProducts(formattedProducts);

      // Map for related products
      const productMap = new Map<string, RelatedProduct>();
      items.forEach((p: any) => {
        productMap.set(p.id, {
          id: p.id,
          name: p.name,
          price: p.price || 0,
          sku: p.sku || '',
          image: getProductImage(p.images),
        });
      });

      setAllProductsMap(productMap);
    } else {
      toast.warning('No products found.');
      setProducts([]);
    }
  } catch (err) {
    console.error('Error fetching products:', err);
    toast.error('Failed to load products.');
  } finally {
    setLoading(false);
  }
};

  // ==========================================
  // 📂 FETCH CATEGORIES (SERVICE-BASED)
  // ==========================================
  const fetchCategories = async () => {
    try {
      const response = await categoriesService.getAll({
        includeInactive: true,
        includeSubCategories: true,
      });

      if (response.data?.success && Array.isArray(response.data?.data)) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // ==========================================
  // 🔍 FETCH PRODUCT DETAILS (SERVICE-BASED)
  // ==========================================
  const fetchProductDetails = async (productId: string) => {
    setLoadingDetails(true);

    try {
      const response = await productsService.getById(productId);

      if (response.data?.success && response.data?.data) {
        const p = response.data.data;

        // Related Products
        if (p.relatedProductIds) {
          p.relatedProducts = p.relatedProductIds
            .split(',')
            .map((id) => allProductsMap.get(id.trim()))
            .filter((product): product is RelatedProduct => product !== undefined);
        }

        // Cross Sell Products
        if (p.crossSellProductIds) {
          p.crossSellProducts = p.crossSellProductIds
            .split(',')
            .map((id) => allProductsMap.get(id.trim()))
            .filter((product): product is RelatedProduct => product !== undefined);
        }

        setViewingProduct(p);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      toast.error('Failed to load product details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // ==========================================
  // 🗑️ DELETE PRODUCT (SERVICE-BASED)
  // ==========================================
  const handleDelete = async (id: string) => {
    setIsDeleting(true);

    try {
      await productsService.delete(id);
      toast.success('Product deleted successfully!');
      await fetchProducts();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };
// ==========================================
// 🎬 HELPER: GET YOUTUBE EMBED URL
// ==========================================

  // ✅ KEEP THESE HELPER FUNCTIONS
  const openMediaViewer = (media: MediaItem | MediaItem[], startIndex = 0) => {
    setMediaToView(Array.isArray(media) ? media : [media]);
    setMediaStartIndex(startIndex);
    setMediaViewerOpen(true);
  };

  const viewProductImages = (images: any[], productName: string, startIndex = 0) => {
    if (!images || images.length === 0) return;

    const mediaItems: MediaItem[] = images.map((img) => ({
      type: 'image',
      url: img.imageUrl,
      title: img.altText || productName,
      description: `${productName} - ${img.isMain ? 'Main Image' : 'Product Image'}`,
      isMain: img.isMain,
    }));

    openMediaViewer(mediaItems, startIndex);
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
          // Handle cells with commas, quotes, or newlines
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
};

  // ==========================================
  // 🎯 FETCH TAKEOVER REQUESTS
  // ==========================================
  const fetchMyTakeoverRequests = async () => {
    setLoadingTakeovers(true);
    try {
      const response = await productLockService.getMyTakeoverRequests(true);
      if (response.success && response.data) {
        setMyTakeoverRequests(response.data);
      }
    } catch (error) {
      console.error('Error fetching my takeover requests:', error);
    } finally {
      setLoadingTakeovers(false);
    }
  };

  // ==========================================
  // ❌ CANCEL TAKEOVER REQUEST
  // ==========================================
  const handleCancelTakeoverRequest = async (requestId: string) => {
    try {
      const response = await productLockService.cancelTakeoverRequest(requestId);
      if (response.success) {
        toast.success('Takeover request cancelled');
        fetchMyTakeoverRequests();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel request');
    }
  };

  // ==========================================
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

  // ==========================================
  // 🔄 INITIAL DATA FETCH
  // ==========================================
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchMyTakeoverRequests();

    // Poll for takeover requests every 30 seconds
    const pollInterval = setInterval(() => {
      fetchMyTakeoverRequests();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // ==========================================
  // 🧹 CLEAR FILTERS
  // ==========================================
  const clearFilters = useCallback(() => {
    setSelectedCategory('all');
    setStatusFilter('all');
    setPublishedFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  // ==========================================
  // 🔍 CHECK ACTIVE FILTERS
  // ==========================================
  const hasActiveFilters = useMemo(
    () =>
      selectedCategory !== 'all' ||
      statusFilter !== 'all' ||
      publishedFilter !== 'all' ||
      searchTerm.trim() !== '',
    [selectedCategory, statusFilter, publishedFilter, searchTerm]
  );

  // ==========================================
  // 🔀 SORTING (NEWEST FIRST)
  // ==========================================
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });
  }, [products]);

  // ==========================================
  // 🔍 FILTERED PRODUCTS
  // ==========================================
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brandName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || product.categoryName === selectedCategory;

      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

      const matchesPublished =
        publishedFilter === 'all' ||
        (publishedFilter === 'published' && product.isPublished) ||
        (publishedFilter === 'unpublished' && !product.isPublished);

      return matchesSearch && matchesCategory && matchesStatus && matchesPublished;
    });
  }, [sortedProducts, searchTerm, selectedCategory, statusFilter, publishedFilter]);

  // ==========================================
  // 📊 PAGINATION DATA
  // ==========================================
  const paginationData = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredProducts.slice(startIndex, endIndex);

    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [filteredProducts, currentPage, itemsPerPage]);

  const { totalItems, totalPages, startIndex, endIndex, currentData } = paginationData;

  // ==========================================
  // 📄 PAGINATION FUNCTIONS
  // ==========================================
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setCurrentPage((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage((prev) => Math.min(totalPages, prev + 1)), [totalPages]);

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter, publishedFilter]);

  // ==========================================
  // 📊 DYNAMIC STATS
  // ==========================================
  const stats = useMemo(
    () => ({
      totalCount: products.length,
      lowStockCount: products.filter((p) => p.status === 'Low Stock').length,
      outOfStockCount: products.filter((p) => p.status === 'Out of Stock').length,
      publishedCount: products.filter((p) => p.isPublished).length,
    }),
    [products]
  );

  // ==========================================
  // 📊 TAKEOVER STATS
  // ==========================================
  const statusCounts = useMemo(() => {
    const counts = { Pending: 0, all: myTakeoverRequests.length };
    myTakeoverRequests.forEach((req) => {
      if (req.status === 'Pending') counts.Pending++;
    });
    return counts;
  }, [myTakeoverRequests]);

  // ==========================================
  // 🎬 YOUTUBE EMBED URL
  // ==========================================
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  // ==========================================
  // 🎨 LOADING STATE
  // ==========================================
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

  // ==========================================
  // 🎨 MAIN RENDER
  // ==========================================
  return (
    <div className="space-y-2">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-slate-400">Manage your product inventory</p>
        </div>

<div className="flex flex-wrap items-center gap-1">
  {/* Navigation Button: Categories */}
  <button
    onClick={() => router.push('/admin/categories')}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all"
  >
    <FolderTree className="w-4 h-4" />
    Categories
  </button>

  {/* Navigation Button: Brands */}
  <button
    onClick={() => router.push('/admin/brands')}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all"
  >
    <Award className="w-4 h-4" />
    Brands
  </button>
  {/* Navigation Button: Discounts */}
  <button
    onClick={() => router.push('/admin/discounts')}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-pink-500/50 transition-all"
  >
    <Tag className="w-4 h-4" />
    Discounts
  </button>
  {/* Navigation Button: Orders */}
  <button
    onClick={() => router.push('/admin/orders')}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-emerald-500/50 transition-all"
  >
    <ShoppingCart className="w-4 h-4" />
    Orders
  </button>

  {/* Navigation Button: Reviews */}
  <button
    onClick={() => router.push('/admin/productReview')}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-amber-500/50 transition-all"
  >
    <Star className="w-4 h-4" />
    Reviews
  </button>

  {/* MY REQUESTS BUTTON */}
  <div className="relative">
    <button
      onClick={() => setShowTakeoverPanel(true)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-lg relative overflow-hidden ${
        statusCounts.Pending > 0
          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white animate-pulse shadow-orange-500/50'
          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-blue-500/30'
      }`}
    >
      <Send className="w-4 h-4" />
      My Requests
      {statusCounts.Pending > 0 && (
        <span className="relative flex h-5 w-5 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-white text-orange-600 items-center justify-center text-xs font-bold">
            {statusCounts.Pending}
          </span>
        </span>
      )}
    </button>

    {statusCounts.Pending > 0 && (
      <span className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg blur-lg opacity-30 animate-pulse -z-10"></span>
    )}
  </div>

  {/* EXPORT BUTTON */}
  <div className="relative">
    <button
      onClick={() => setShowExportMenu(!showExportMenu)}
      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-semibold"
    >
      <FileSpreadsheet className="w-5 h-5" />
      Export
    </button>

    {showExportMenu && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 z-20 overflow-hidden">
          <button
            onClick={() => {
              handleExport(false);
              setShowExportMenu(false);
            }}
            disabled={filteredProducts.length === 0}
            className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-700"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-sm font-medium">Export to Excel (filtered)</p>
              <p className="text-xs text-slate-400">{filteredProducts.length} products</p>
            </div>
          </button>

          <button
            onClick={() => {
              handleExport(true);
              setShowExportMenu(false);
            }}
            disabled={products.length === 0}
            className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-sm font-medium">Export to Excel (all found)</p>
              <p className="text-xs text-slate-400">{products.length} products</p>
            </div>
          </button>
        </div>
      </>
    )}
  </div>

  {/* ADD PRODUCT BUTTON */}
  <Link href="/admin/products/add">
    <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold">
      <Plus className="h-4 w-4" />
      Add Product
    </button>
  </Link>
</div>

      </div>

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

      {/* ==================== STATS CARDS ==================== */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total Products</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{stats.totalCount}</p>
                <span className="text-xs text-violet-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  All Categories
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Published</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{stats.publishedCount}</p>
                <span className="text-xs text-green-400">Live Products</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-xl border border-orange-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Low Stock</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{stats.lowStockCount}</p>
                <span className="text-xs text-orange-400">Need Restocking</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-red-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Out of Stock</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{stats.outOfStockCount}</p>
                <span className="text-xs text-red-400">Urgent Attention</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== ITEMS PER PAGE SELECTOR ==================== */}
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

      {/* ==================== SEARCH AND FILTERS ==================== */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search products, SKU, brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-slate-400" />

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[160px] ${
                selectedCategory !== 'all'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                  : 'border-slate-600'
              }`}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[140px] ${
                statusFilter !== 'all' ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' : 'border-slate-600'
              }`}
            >
              <option value="all">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            {/* Published Filter */}
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-[150px] ${
                publishedFilter !== 'all'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                  : 'border-slate-600'
              }`}
            >
              <option value="all">All Visibility</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>

            {/* Clear Filters Button */}
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

          {/* Results Count */}
          <div className="text-sm text-slate-400 whitespace-nowrap ml-auto">
            {totalItems} product{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ==================== PRODUCTS LIST ==================== */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm w-[320px]">Product</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[160px]">SKU</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[100px]">Price</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[90px]">Stock</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[120px]">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[130px]">Visibility</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm w-[140px]">Updated</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((product) => (
                  <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0"> 
  {product.image && product.image.trim() !== '' ? (
    <img
      src={product.image}
      alt={product.name}
      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
      title="Click to view all images"
      onClick={async (e) => {
        e.stopPropagation(); // ✅ Prevent event bubbling
        
        try {
          
          const response = await productsService.getById(product.id);
          
          if (response.data?.success && response.data?.data?.images) {
            const images = response.data.data.images;
            
            if (images && images.length > 0) {
              viewProductImages(images, product.name, 0);
            } else {
              // No images found, fallback to single image
              openMediaViewer({
                type: 'image',
                url: product.image,
                title: product.name,
                description: 'Product Image',
              });
            }
          } else {
            // Fallback to single image
            openMediaViewer({
              type: 'image',
              url: product.image,
              title: product.name,
              description: 'Product Image',
            });
          }
        } catch (error) {
          console.error('Error loading images:', error);
          
          // Fallback to single image if fetch fails
          openMediaViewer({
            type: 'image',
            url: product.image,
            title: product.name,
            description: 'Product Image',
          });
        }
      }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '';
      }}
    />
  ) : (
    <div className="flex flex-col items-center justify-center select-none">
      <span className="text-lg">📦</span>
    </div>
  )}
</div>

                        <div className="min-w-0 flex-1">
                          <p
                            className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors truncate"
                            onClick={() => fetchProductDetails(product.id)}
                            title={product.name}
                          >
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 truncate" title={product.categoryName}>
                              {product.categoryName}
                            </p>
                            <span
                              className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded truncate"
                              title={product.brandName}
                            >
                              {product.brandName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className="text-slate-400 text-sm font-mono bg-slate-800/50 px-2 py-1 rounded truncate block"
                        title={product.sku}
                      >
                        {product.sku}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-green-400">£</span>
                        <span className="text-white font-semibold">{product.price.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-lg text-sm font-medium ${
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
                    <td className="py-4 px-4 text-center">
                      <div className="flex justify-center">
                        {product.status === 'In Stock' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            In Stock
                          </span>
                        ) : product.status === 'Low Stock' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 rounded-lg text-xs font-medium">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        {product.isPublished ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Published
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-slate-500/10 text-slate-400 rounded-lg text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Unpublished
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      <div className="truncate" title={product.createdAt ? new Date(product.createdAt).toLocaleString() : '-'}>
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => fetchProductDetails(product.id)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link href={`/admin/products/edit/${product.id}`}>
                          <button className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all" title="Edit Product">
                            <Edit className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ id: product.id, name: product.name })}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Product"
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


      {/* ==================== PAGINATION ==================== */}
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

            <div className="text-sm text-slate-400">Total {totalItems} items</div>
          </div>
        </div>
      )}

      {/* ==================== PRODUCT VIEW MODAL ==================== */}
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
      baseUrl={API_BASE_URL.replace('/api', '')}
    />


      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />
    </div>
  );
}
