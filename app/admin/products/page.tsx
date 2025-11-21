"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, Package, Edit, Trash2, Eye, Search, Filter, FilterX, TrendingUp, AlertCircle, X, Tag, PoundSterling, Calendar, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Star, Video, ShoppingCart, Truck, Scale, Ruler, Box, FileText, Globe, Clock, Activity, ExternalLink, Play, ImageIcon, Download, ChevronDown, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiClient } from "@/lib/api";

interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}
interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  displayName: string;
  sortOrder: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  weight?: number;
  stockQuantity: number;
  option1?: string;
  option2?: string;
  option3?: string;
  imageUrl?: string;
  isDefault: boolean;
}

interface SpecificationAttribute {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  sku: string;
}

interface Product {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  stock?: number;
  status?: string;
  image?: string;
  sales?: number;
  shortDescription: string;
  sku: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  description: string;
  category: string;
  isPublished: boolean;
  productType: string;
  stockQuantity: number;
  brandName: string;
  
  // Additional fields
  slug?: string;
  gtin?: string;
  manufacturerPartNumber?: string;
  publishedAt?: string;
  visibleIndividually?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
  oldPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  disableBuyButton?: boolean;
  disableWishlistButton?: boolean;
  callForPrice?: boolean;
  customerEntersPrice?: boolean;
  minimumCustomerEnteredPrice?: number;
  maximumCustomerEnteredPrice?: number;
  markAsNew?: boolean;
  markAsNewStartDate?: string;
  markAsNewEndDate?: string;
  availableStartDate?: string;
  availableEndDate?: string;
  adminComment?: string;
  trackQuantity?: boolean;
  manageInventoryMethod?: string;
  minStockQuantity?: number;
  notifyAdminForQuantityBelow?: boolean;
  notifyQuantityBelow?: number;
  allowBackorder?: boolean;
  backorderMode?: string;
  orderMinimumQuantity?: number;
  orderMaximumQuantity?: number;
  allowedQuantities?: string;
  notReturnable?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit?: string;
  dimensionUnit?: string;
  requiresShipping?: boolean;
  isFreeShipping?: boolean;
  shipSeparately?: boolean;
  additionalShippingCharge?: number;
  taxExempt?: boolean;
  taxCategoryId?: string;
  tags?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  searchEngineFriendlyPageName?: string;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  allowCustomerReviews?: boolean;
  videoUrls?: string;
  specificationAttributes?: string;
  relatedProductIds?: string;
  crossSellProductIds?: string;
  createdBy?: string;
  images?: ProductImage[];
    attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  // Populated related products
  relatedProducts?: RelatedProduct[];
  crossSellProducts?: RelatedProduct[];
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductsMap, setAllProductsMap] = useState<Map<string, RelatedProduct>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

// =============================
// ⭐ FETCH PRODUCTS (apiClient)
// =============================
const fetchProducts = async () => {
  setLoading(true);

  try {
    const token = localStorage.getItem("authToken");

    const res = await apiClient.get(
      `${API_ENDPOINTS.products}?page=1&pageSize=1000`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    const data = res.data as any;

    if (data?.success && data?.data?.items) {
      const items = data.data.items;

      const formattedProducts = items.map((p: any) => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName || "Uncategorized",
        price: p.price || 0,
        stock: p.stockQuantity || 0,
        stockQuantity: p.stockQuantity || 0,
        status: getStockStatus(p.stockQuantity),
        image: getProductImage(p.images),
        sales: 0,
        shortDescription: p.shortDescription || "",
        sku: p.sku || "",
        createdAt: formatDate(p.createdAt),
        updatedAt: p.updatedAt ? formatDate(p.updatedAt) : "N/A",
        updatedBy: p.updatedBy || "N/A",
        description: p.description || p.shortDescription || "",
        category: p.categoryName || "Uncategorized",
        isPublished: p.isPublished || false,
        productType: p.productType || "simple",
        brandName: p.brandName || "No Brand",
      }));

      setProducts(formattedProducts);

      // Map for related products
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


// ================================
// ⭐ FETCH CATEGORIES (apiClient)
// ================================
const fetchCategories = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const res = await apiClient.get(API_ENDPOINTS.categories, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const data = res.data as any;

    if (data?.success && Array.isArray(data?.data)) {
      setCategories(data.data);
    }
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
};


// ===================================================
// ⭐ FETCH PRODUCT DETAILS + RELATED PRODUCTS
// ===================================================
const fetchProductDetails = async (productId: string) => {
  setLoadingDetails(true);

  try {
    const token = localStorage.getItem("authToken");

    const res = await apiClient.get(`${API_ENDPOINTS.products}/${productId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const result = res.data as any;

    if (result?.success && result?.data) {
      const p = result.data;

      const fullProduct: Product = {
        ...p,
        status: getStockStatus(p.stockQuantity),
        image: getProductImage(p.images),
        createdAt: formatDate(p.createdAt),
        updatedAt: p.updatedAt ? formatDate(p.updatedAt) : "N/A",
        category: p.categoryName || "Uncategorized",
        stock: p.stockQuantity || 0,
      };

      // Related Products
      if (fullProduct.relatedProductIds) {
        fullProduct.relatedProducts = fullProduct.relatedProductIds
          .split(",")
          .map((id) => allProductsMap.get(id.trim()))
          .filter((p): p is RelatedProduct => p !== undefined);
      }

      // Cross Sell Products
      if (fullProduct.crossSellProductIds) {
        fullProduct.crossSellProducts = fullProduct.crossSellProductIds
          .split(",")
          .map((id) => allProductsMap.get(id.trim()))
          .filter((p): p is RelatedProduct => p !== undefined);
      }

      setViewingProduct(fullProduct);
    }
  } catch (err) {
    console.error("Error fetching product details:", err);
    toast.error("Failed to load product details");
  } finally {
    setLoadingDetails(false);
  }
};


// =============================
// ⭐ DELETE PRODUCT (apiClient)
// =============================
const handleDelete = async (id: string) => {
  setIsDeleting(true);

  try {
    const token = localStorage.getItem("authToken");

    const res = await apiClient.delete(`${API_ENDPOINTS.products}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res?.status === 200) {
      toast.success("Product deleted successfully! 🗑️");
      await fetchProducts();
    } else {
      const err = (res.data as any)?.message || "Failed to delete product";
      toast.error(err);
    }
  } catch (err) {
    console.error("Delete error:", err);
    toast.error("Failed to delete product");
  } finally {
    setIsDeleting(false);
    setDeleteConfirm(null);
  }
};

 const handleExport = async (exportAll: boolean = false) => {
    try {
      let productsToExport: Product[] = [];

      if (exportAll) {
        // Fetch all products from API
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const response = await apiClient.get(
          `${API_ENDPOINTS.products}?page=1&pageSize=10000`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        
        const data = response.data as any;
        if (data?.success && data?.data?.items) {
          const items = data.data.items;
          productsToExport = items.map((p: any) => ({
            id: p.id,
            name: p.name,
            categoryName: p.categoryName || "Uncategorized",
            price: p.price || 0,
            stock: p.stockQuantity || 0,
            stockQuantity: p.stockQuantity || 0,
            status: getStockStatus(p.stockQuantity),
            image: getProductImage(p.images),
            sales: 0,
            shortDescription: p.shortDescription || "",
            sku: p.sku || "",
            createdAt: formatDate(p.createdAt),
            updatedAt: p.updatedAt ? formatDate(p.updatedAt) : "N/A",
            updatedBy: p.updatedBy || "N/A",
            description: p.description || p.shortDescription || "",
            category: p.categoryName || "Uncategorized",
            isPublished: p.isPublished || false,
            productType: p.productType || "simple",
            brandName: p.brandName || "No Brand",
            gtin: p.gtin,
            weight: p.weight,
            length: p.length,
            width: p.width,
            height: p.height,
            weightUnit: p.weightUnit,
            dimensionUnit: p.dimensionUnit,
            tags: p.tags,
            oldPrice: p.oldPrice,
          }));
        }
        setLoading(false);
      } else {
        // Use filtered products
        productsToExport = filteredProducts;
      }

      // Check if there are any products
      if (productsToExport.length === 0) {
        toast.warning("⚠️ No products to export");
        return;
      }

      const csvHeaders = [
        "Product Name",
        "SKU",
        "Category",
        "Brand",
        "Price",
        "Old Price",
        "Stock",
        "Status",
        "Published",
        "Created Date",
        "GTIN",
        "Weight",
        "Dimensions (L×W×H)",
        "Tags"
      ];

      const csvData = productsToExport.map(product => [
        product.name,
        product.sku,
        product.categoryName || 'N/A',
        product.brandName || 'N/A',
        product.price,
        product.oldPrice || 'N/A',
        product.stockQuantity,
        product.status || getStockStatus(product.stockQuantity),
        product.isPublished ? 'Yes' : 'No',
        product.createdAt,
        product.gtin || 'N/A',
        product.weight ? `${product.weight} ${product.weightUnit || 'kg'}` : 'N/A',
        product.length && product.width && product.height 
          ? `${product.length}×${product.width}×${product.height} ${product.dimensionUnit || 'cm'}` 
          : 'N/A',
        product.tags || 'N/A'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Dynamic filename
      const exportType = exportAll ? "all" : "filtered";
      const filterInfo = !exportAll && statusFilter !== "all" ? `_${statusFilter}` : "";
      const searchInfo = !exportAll && searchTerm ? `_search` : "";
      link.download = `products_${exportType}${filterInfo}${searchInfo}_${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`📥 ${productsToExport.length} product${productsToExport.length > 1 ? 's' : ''} exported successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export products");
      setLoading(false);
    }
  };
  const getStockStatus = (stockQuantity: number): string => {
    if (stockQuantity > 10) return 'In Stock';
    if (stockQuantity > 0) return 'Low Stock';
    return 'Out of Stock';
  };

  const getProductImage = (images: any[]): string => {
    if (!images || images.length === 0) return '📦';
    const mainImage = images.find(img => img.isMain) || images[0];
    return `${API_BASE_URL.replace(/\/$/, '')}/${mainImage.imageUrl.replace(/^\//, '')}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setStatusFilter("all");
    setPublishedFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = useMemo(
    () => selectedCategory !== "all" || statusFilter !== "all" || publishedFilter !== "all" || searchTerm.trim() !== "",
    [selectedCategory, statusFilter, publishedFilter, searchTerm]
  );

  // Optimized filter with useMemo
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.brandName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.categoryName === selectedCategory;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesPublished = publishedFilter === 'all' ||
                             (publishedFilter === 'published' && product.isPublished) ||
                             (publishedFilter === 'unpublished' && !product.isPublished);

      return matchesSearch && matchesCategory && matchesStatus && matchesPublished;
    });
  }, [products, searchTerm, selectedCategory, statusFilter, publishedFilter]);

  // Pagination calculations with useMemo
  const paginationData = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredProducts.slice(startIndex, endIndex);

    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [filteredProducts, currentPage, itemsPerPage]);

  const { totalItems, totalPages, startIndex, endIndex, currentData } = paginationData;

  // Pagination functions
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToPreviousPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // Generate page numbers for pagination
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter, publishedFilter]);

  // Stats calculations with useMemo
  const stats = useMemo(() => ({
    lowStockCount: products.filter(p => p.status === 'Low Stock').length,
    outOfStockCount: products.filter(p => p.status === 'Out of Stock').length,
    publishedCount: products.filter(p => p.isPublished).length,
  }), [products]);


// ✅ SUPER ROBUST: Parse specification attributes with case-insensitive handling
const parseSpecifications = (specString: string | undefined): SpecificationAttribute[] => {
  if (!specString || specString.trim() === '' || specString === '[]') {
    return [];
  }
  
  try {
    // Parse the JSON string
    const parsed = JSON.parse(specString);
    
    // Handle if it's not an array
    if (!Array.isArray(parsed)) {
      console.warn('Specifications is not an array:', parsed);
      return [];
    }
    
    // Map with case-insensitive property access
    return parsed
      .filter((spec: any) => spec && typeof spec === 'object') // Filter out invalid entries
      .map((spec: any) => ({
        id: spec.Id || spec.id || spec.ID || '',
        name: spec.Name || spec.name || spec.NAME || '',
        value: spec.Value || spec.value || spec.VALUE || '',
        displayOrder: spec.DisplayOrder || spec.displayOrder || spec.display_order || 0
      }))
      .filter((spec) => spec.name && spec.value); // Only include valid specs with name and value
    
  } catch (error) {
    console.error('Error parsing specifications:', error, 'Input:', specString);
    return [];
  }
};



  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

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

  return (
    <div className="space-y-2">
      {/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-slate-400">Manage your product inventory</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ✅ Export Button with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            {showExportMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)}
                />
                
                {/* Menu Items */}
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

          <Link href="/admin/products/add">
            <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold">
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </Link>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total Products</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{products.length}</p>
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

      {/* Items Per Page Selector */}
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

      {/* Search and Filters */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-80">
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
          <div className="flex items-center gap-3  flex-wrap">
            <Filter className="h-4 w-4 text-slate-400" />
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-40 ${
                selectedCategory !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                statusFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
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
              className={`px-3 py-3 bg-slate-800/50 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-36 ${
                publishedFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
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

      {/* Products List */}
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
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm w-80">Product</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-40">SKU</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-24">Price</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-20">Stock</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-28">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-32">Visibility</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm w-36">Updated</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((product) => (
                  <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image && product.image !== "📦" && product.image.trim() !== "" ? (
                            <img
                              src={product.image}
                              alt={product.name || "Product Image"}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              title="Click to view image"
                              onClick={() => setViewingImage(product.image ?? null)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "";
                                product.image = "📦";
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
                            <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded truncate" title={product.brandName}>
                              {product.brandName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-slate-400 text-sm font-mono bg-slate-800/50 px-2 py-1 rounded truncate block" title={product.sku}>
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
                      <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                        product.stockQuantity > 10 ? 'bg-cyan-500/10 text-cyan-400' :
                        product.stockQuantity > 0 ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
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
                          <button
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="Edit Product"
                          >
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

      {/* Image View Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md  z-[70]  flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all backdrop-blur-sm z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {viewingImage && viewingImage !== "📦" && viewingImage.trim() !== "" ? (
              <img
                src={viewingImage}
                alt="Product Image"
                className="w-full h-full object-contain"
                style={{ maxHeight: "calc(90vh - 2rem)" }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "";
                  setViewingImage("📦");
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white text-6xl p-12 select-none">
                📦
                <p className="text-sm mt-2 opacity-70">No image available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md  z-[70]  flex items-center justify-center p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all backdrop-blur-sm z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <iframe
              src={playingVideo}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Product Video"
            />
          </div>
        </div>
      )}

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

      {/* FULL DETAILS VIEW MODAL - ALL FIELDS WITH OPTIMIZATIONS */}
 {/* FULL DETAILS VIEW MODAL - ALL FIELDS WITH OPTIMIZATIONS */}
{viewingProduct && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
      
      {/* Header */}
      <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Complete Product Details
            </h2>
          </div>
          <button
            onClick={() => setViewingProduct(null)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loadingDetails ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading product details...</p>
          </div>
        </div>
      ) : (
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          
          {/* Product Header with Images */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="w-full h-64 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden border border-slate-700/50 hover:border-violet-500/50 transition-all group">
                {viewingProduct.images && viewingProduct.images.length > 0 ? (
                  <img
                    src={`${API_BASE_URL.replace(/\/$/, '')}/${viewingProduct.images.find(img => img.isMain)?.imageUrl.replace(/^\//, '') || viewingProduct.images[0]?.imageUrl.replace(/^\//, '')}`}
                    alt={viewingProduct.name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setViewingImage(`${API_BASE_URL.replace(/\/$/, '')}/${viewingProduct.images?.find(img => img.isMain)?.imageUrl.replace(/^\//, '') || viewingProduct.images?.[0]?.imageUrl.replace(/^\//, '') || ''}`)}
                  />
                ) : (
                  <span className="text-6xl">📦</span>
                )}
              </div>
              
              {/* Additional Images */}
              {viewingProduct.images && viewingProduct.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {viewingProduct.images.map((img, idx) => (
                    <div 
                      key={img.id || `img-${idx}`}
                      className="aspect-square rounded-lg overflow-hidden bg-slate-800/50 cursor-pointer hover:ring-2 hover:ring-violet-400 hover:scale-105 transition-all border border-slate-700/50"
                      onClick={() => setViewingImage(`${API_BASE_URL.replace(/\/$/, '')}/${img.imageUrl.replace(/^\//, '')}`)}
                    >
                      <img
                        src={`${API_BASE_URL.replace(/\/$/, '')}/${img.imageUrl.replace(/^\//, '')}`}
                        alt={img.altText || `Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">{viewingProduct.name}</h3>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-sm font-medium hover:bg-violet-500/20 transition-all">
                    {viewingProduct.category}
                  </span>
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition-all">
                    {viewingProduct.brandName}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium hover:scale-105 transition-all ${
                    viewingProduct.status === 'In Stock' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' :
                    viewingProduct.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' :
                    'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  }`}>
                    {viewingProduct.status}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium hover:scale-105 transition-all ${
                    viewingProduct.isPublished ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                  }`}>
                    {viewingProduct.isPublished ? '✓ Published' : '✗ Unpublished'}
                  </span>
                  {viewingProduct.markAsNew && (
                    <span className="px-3 py-1 bg-pink-500/10 text-pink-400 rounded-lg text-sm font-medium animate-pulse hover:bg-pink-500/20 transition-all">
                      🆕 New
                    </span>
                  )}
                </div>
              </div>

              {/* Short Description */}
              {viewingProduct.shortDescription && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-violet-500/30 hover:bg-slate-800/70 transition-all">
                  <div 
                    className="prose prose-invert prose-sm max-w-none text-slate-300"
                    dangerouslySetInnerHTML={{ __html: viewingProduct.shortDescription }}
                  />
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-xl text-center border border-slate-700/50 hover:border-green-500/50 hover:bg-slate-800/70 hover:scale-105 transition-all group">
                  <PoundSterling className="w-5 h-5 text-green-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="text-lg font-bold text-white">£{viewingProduct.price?.toFixed(2)}</p>
                  {viewingProduct.oldPrice && viewingProduct.oldPrice > viewingProduct.price && (
                    <p className="text-xs text-red-400 line-through">£{viewingProduct.oldPrice.toFixed(2)}</p>
                  )}
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800/70 hover:scale-105 transition-all group">
                  <Package className="w-5 h-5 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-400">Stock</p>
                  <p className="text-lg font-bold text-white">{viewingProduct.stockQuantity}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center border border-slate-700/50 hover:border-yellow-500/50 hover:bg-slate-800/70 hover:scale-105 transition-all group">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-400">Rating</p>
                  <p className="text-lg font-bold text-white">{viewingProduct.averageRating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-slate-400">({viewingProduct.reviewCount || 0} reviews)</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center border border-slate-700/50 hover:border-violet-500/50 hover:bg-slate-800/70 hover:scale-105 transition-all group">
                  <Eye className="w-5 h-5 text-violet-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-400">Views</p>
                  <p className="text-lg font-bold text-white">{viewingProduct.viewCount || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Description */}
          {viewingProduct.description && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                Full Description
              </h4>
              <div 
                className="prose prose-invert max-w-none text-slate-300"
                dangerouslySetInnerHTML={{ __html: viewingProduct.description }}
              />
            </div>
          )}

          {/* Product Identification */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              Product Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField label="SKU" value={viewingProduct.sku} />
              <InfoField label="Slug" value={viewingProduct.slug} />
              <InfoField label="GTIN" value={viewingProduct.gtin} />
              <InfoField label="Manufacturer Part #" value={viewingProduct.manufacturerPartNumber} />
              <InfoField label="Product Type" value={viewingProduct.productType} />
              <InfoField label="Display Order" value={viewingProduct.displayOrder?.toString()} />
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-green-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PoundSterling className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
              Pricing Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoField label="Current Price" value={`£${viewingProduct.price?.toFixed(2)}`} highlight />
              <InfoField label="Old Price" value={viewingProduct.oldPrice ? `£${viewingProduct.oldPrice.toFixed(2)}` : 'N/A'} />
              <InfoField label="Compare At Price" value={viewingProduct.compareAtPrice ? `£${viewingProduct.compareAtPrice.toFixed(2)}` : 'N/A'} />
              <InfoField label="Cost Price" value={viewingProduct.costPrice ? `£${viewingProduct.costPrice.toFixed(2)}` : 'N/A'} />
              <InfoField label="Call For Price" value={viewingProduct.callForPrice ? 'Yes' : 'No'} />
              <InfoField label="Customer Enters Price" value={viewingProduct.customerEntersPrice ? 'Yes' : 'No'} />
              {viewingProduct.customerEntersPrice && (
                <>
                  <InfoField label="Min Customer Price" value={`£${viewingProduct.minimumCustomerEnteredPrice?.toFixed(2)}`} />
                  <InfoField label="Max Customer Price" value={`£${viewingProduct.maximumCustomerEnteredPrice?.toFixed(2)}`} />
                </>
              )}
            </div>
          </div>

          {/* Inventory Management */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
              Inventory Management
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoField label="Stock Quantity" value={viewingProduct.stockQuantity?.toString()} highlight />
              <InfoField label="Track Quantity" value={viewingProduct.trackQuantity ? 'Yes' : 'No'} />
              <InfoField label="Manage Inventory" value={viewingProduct.manageInventoryMethod || 'N/A'} />
              <InfoField label="Min Stock Quantity" value={viewingProduct.minStockQuantity?.toString()} />
              <InfoField label="Notify Below Quantity" value={viewingProduct.notifyQuantityBelow?.toString()} />
              <InfoField label="Allow Backorder" value={viewingProduct.allowBackorder ? 'Yes' : 'No'} />
              <InfoField label="Backorder Mode" value={viewingProduct.backorderMode || 'N/A'} />
              <InfoField label="Min Order Quantity" value={viewingProduct.orderMinimumQuantity?.toString()} />
              <InfoField label="Max Order Quantity" value={viewingProduct.orderMaximumQuantity?.toString()} />
              {viewingProduct.allowedQuantities && (
                <InfoField label="Allowed Quantities" value={viewingProduct.allowedQuantities} className="col-span-full" />
              )}
            </div>
          </div>

          {/* Shipping & Dimensions */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              Shipping & Dimensions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoField label="Requires Shipping" value={viewingProduct.requiresShipping ? 'Yes' : 'No'} />
              <InfoField label="Free Shipping" value={viewingProduct.isFreeShipping ? 'Yes' : 'No'} />
              <InfoField label="Ship Separately" value={viewingProduct.shipSeparately ? 'Yes' : 'No'} />
              <InfoField label="Additional Shipping" value={viewingProduct.additionalShippingCharge ? `£${viewingProduct.additionalShippingCharge}` : 'N/A'} />
              <InfoField 
                label="Weight" 
                value={viewingProduct.weight ? `${viewingProduct.weight} ${viewingProduct.weightUnit || 'kg'}` : 'N/A'} 
                icon={<Scale className="w-4 h-4" />}
              />
              <InfoField 
                label="Length" 
                value={viewingProduct.length ? `${viewingProduct.length} ${viewingProduct.dimensionUnit || 'cm'}` : 'N/A'}
                icon={<Ruler className="w-4 h-4" />}
              />
              <InfoField 
                label="Width" 
                value={viewingProduct.width ? `${viewingProduct.width} ${viewingProduct.dimensionUnit || 'cm'}` : 'N/A'}
                icon={<Ruler className="w-4 h-4" />}
              />
              <InfoField 
                label="Height" 
                value={viewingProduct.height ? `${viewingProduct.height} ${viewingProduct.dimensionUnit || 'cm'}` : 'N/A'}
                icon={<Box className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Availability & Dates - ✅ ENHANCED WITH HOVER & DEFAULT TEXT */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
              Availability & Important Dates
            </h4>
            {!viewingProduct.publishedAt && !viewingProduct.availableStartDate && !viewingProduct.availableEndDate && !viewingProduct.markAsNewStartDate ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No availability dates configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoField label="Published At" value={viewingProduct.publishedAt ? formatDate(viewingProduct.publishedAt) : 'Not published yet'} />
                <InfoField label="Available From" value={viewingProduct.availableStartDate ? formatDate(viewingProduct.availableStartDate) : 'Always available'} />
                <InfoField label="Available Until" value={viewingProduct.availableEndDate ? formatDate(viewingProduct.availableEndDate) : 'No end date'} />
                {viewingProduct.markAsNew && (
                  <>
                    <InfoField label="Mark New From" value={viewingProduct.markAsNewStartDate ? formatDate(viewingProduct.markAsNewStartDate) : 'Not set'} />
                    <InfoField label="Mark New Until" value={viewingProduct.markAsNewEndDate ? formatDate(viewingProduct.markAsNewEndDate) : 'Not set'} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Visibility & Settings - ✅ ENHANCED WITH HOVER & BETTER LAYOUT */}
{/* Visibility & Settings - ✅ FIXED TypeScript Errors */}
<div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/40 transition-all group">
  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
    <Eye className="w-5 h-5 text-purple-400 group-hover:scale-110 group-hover:rotate-12 transition-all" />
    Visibility & Settings
  </h4>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    <ToggleField label="Published" value={viewingProduct.isPublished ?? false} />
    <ToggleField label="Visible Individually" value={viewingProduct.visibleIndividually ?? false} />
    <ToggleField label="Show on Homepage" value={viewingProduct.showOnHomepage ?? false} />
    <ToggleField label="Buy Button" value={!(viewingProduct.disableBuyButton ?? false)} />
    <ToggleField label="Wishlist Button" value={!(viewingProduct.disableWishlistButton ?? false)} />
    <ToggleField label="Returnable" value={!(viewingProduct.notReturnable ?? false)} />
    <ToggleField label="Customer Reviews" value={viewingProduct.allowCustomerReviews ?? false} />
    <ToggleField label="Tax Exempt" value={viewingProduct.taxExempt ?? false} />
  </div>
  {viewingProduct.taxCategoryId && (
    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-purple-500/30 hover:bg-slate-800/70 transition-all group/tax cursor-pointer">
      <p className="text-xs text-slate-400 mb-1 group-hover/tax:text-slate-300 transition-colors">Tax Category ID</p>
      <p className="text-sm text-white font-mono group-hover/tax:text-purple-400 transition-colors">{viewingProduct.taxCategoryId}</p>
    </div>
  )}
</div>


          {/* SEO Information */}
{/* SEO Information - ✅ ENHANCED WITH HOVER */}
<div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all group">
  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
    <Globe className="w-5 h-5 text-indigo-400 group-hover:scale-110 group-hover:rotate-12 transition-all" />
    SEO Information
  </h4>
  {!viewingProduct.metaTitle && !viewingProduct.metaDescription && !viewingProduct.metaKeywords ? (
    <div className="text-center py-8">
      <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">No SEO data configured</p>
    </div>
  ) : (
    <div className="space-y-3">
      <InfoField label="Meta Title" value={viewingProduct.metaTitle || 'Not set'} fullWidth />
      <InfoField label="Meta Description" value={viewingProduct.metaDescription || 'Not set'} fullWidth />
      <InfoField label="Meta Keywords" value={viewingProduct.metaKeywords || 'Not set'} fullWidth />
      <InfoField label="SEO Friendly URL" value={viewingProduct.searchEngineFriendlyPageName || 'Not set'} fullWidth />
    </div>
  )}
</div>


          {/* Tags */}
          {viewingProduct.tags && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-pink-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {viewingProduct.tags.split(',').map((tag, idx) => (
                  <span key={`tag-${idx}-${tag.trim()}`} className="px-3 py-1 bg-pink-500/10 text-pink-400 rounded-lg text-sm border border-pink-500/20 hover:bg-pink-500/20 hover:scale-105 transition-all cursor-pointer">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Product Videos */}
          {viewingProduct.videoUrls && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-red-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                Product Videos ({viewingProduct.videoUrls.split(',').length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewingProduct.videoUrls.split(',').map((url, idx) => {
                  const embedUrl = getYouTubeEmbedUrl(url.trim());
                  return (
                    <div key={`video-${idx}-${url.trim()}`} className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50 hover:border-red-500/50 hover:scale-105 transition-all">
                      {embedUrl ? (
                        <div 
                          className="relative aspect-video bg-slate-900 flex items-center justify-center cursor-pointer group/video"
                          onClick={() => setPlayingVideo(embedUrl)}
                        >
                          <iframe
                            src={`${embedUrl}?controls=0`}
                            className="w-full h-full pointer-events-none"
                            title={`Product Video ${idx + 1}`}
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover/video:bg-black/60 transition-all flex items-center justify-center">
                            <div className="bg-red-500 rounded-full p-4 group-hover/video:scale-110 transition-transform">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <a
                          href={url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-all group/link"
                        >
                          <div className="p-2 bg-red-500/10 rounded-lg group-hover/link:bg-red-500/20 transition-all">
                            <ExternalLink className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 text-sm truncate group-hover/link:text-white transition-colors">
                              Video {idx + 1}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{url.trim()}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Specification Attributes */}
{/* Specification Attributes - ✅ ENHANCED WITH DEFAULT MESSAGE */}
{/* Specification Attributes - ✅ FIXED WITH CASE HANDLING */}
<div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-teal-500/50 hover:bg-slate-800/40 transition-all group">
  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
    <Info className="w-5 h-5 text-teal-400 group-hover:scale-110 group-hover:rotate-12 transition-all" />
    Specifications
    {viewingProduct.specificationAttributes && parseSpecifications(viewingProduct.specificationAttributes).length > 0 && (
      <span className="text-xs text-slate-500 ml-1">
        ({parseSpecifications(viewingProduct.specificationAttributes).length})
      </span>
    )}
  </h4>
  
  {/* Check if specifications exist */}
  {(() => {
    const specs = parseSpecifications(viewingProduct.specificationAttributes);
    
    if (!specs || specs.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-teal-400/50" />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">No specifications available</p>
          <p className="text-slate-600 text-xs">Product specifications have not been configured yet</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {specs
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((spec, idx) => (
            <div 
              key={spec.id || `spec-${idx}-${spec.name}`} 
              className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-800/70 hover:scale-[1.02] transition-all group/spec cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 bg-teal-500/20 rounded flex items-center justify-center flex-shrink-0 group-hover/spec:bg-teal-500/30 transition-all">
                  <span className="text-xs text-teal-400 font-bold">{spec.displayOrder || '0'}</span>
                </div>
                <span className="text-slate-400 text-sm group-hover/spec:text-slate-300 transition-colors font-medium truncate">
                  {spec.name}
                </span>
              </div>
              <span className="text-white font-semibold text-sm group-hover/spec:text-teal-400 transition-colors ml-3">
                {spec.value}
              </span>
            </div>
          ))}
      </div>
    );
  })()}
</div>


          {/* Product Attributes */}
          {viewingProduct.attributes && viewingProduct.attributes.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                Product Attributes ({viewingProduct.attributes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {viewingProduct.attributes
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((attr) => (
                    <div 
                      key={attr.id || `attr-${attr.name}-${attr.value}`} 
                      className="flex flex-col p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800/70 hover:scale-105 transition-all group/attr cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center flex-shrink-0 group-hover/attr:bg-purple-500/30 transition-all">
                          <span className="text-xs text-purple-400 font-bold">{attr.sortOrder || '0'}</span>
                        </div>
                        <span className="text-slate-400 text-sm font-medium group-hover/attr:text-slate-300 transition-colors">{attr.displayName || attr.name}</span>
                      </div>
                      <span className="text-white font-semibold text-base pl-8 group-hover/attr:text-purple-400 transition-colors">
                        {attr.value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Product Variants */}
          {viewingProduct.variants && viewingProduct.variants.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                Product Variants ({viewingProduct.variants.length})
              </h4>
              <div className="space-y-3">
                {viewingProduct.variants.map((variant, idx) => (
                  <div 
                    key={variant.id || `variant-${variant.sku}-${idx}`}
                    className={`bg-slate-900/50 rounded-lg p-4 border transition-all hover:shadow-lg hover:scale-[1.02] ${
                      variant.isDefault 
                        ? 'border-indigo-500/50 bg-indigo-500/5 hover:border-indigo-500/70' 
                        : 'border-slate-700/50 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Variant Image */}
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0 hover:scale-110 transition-transform">
                        {variant.imageUrl ? (
                          <img
                            src={`${API_BASE_URL.replace(/\/$/, '')}/${variant.imageUrl.replace(/^\//, '')}`}
                            alt={variant.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>

                      {/* Variant Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h5 className="text-white font-semibold text-base">{variant.name}</h5>
                          {variant.isDefault && (
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full border border-indigo-500/30 font-medium animate-pulse">
                              Default
                            </span>
                          )}
                        </div>
                        
                        {/* Variant Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30 hover:border-indigo-500/50 hover:scale-105 transition-all">
                            <p className="text-xs text-slate-400 mb-0.5">SKU</p>
                            <p className="text-sm text-white font-mono truncate" title={variant.sku}>
                              {variant.sku}
                            </p>
                          </div>
                          
                          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30 hover:border-green-500/50 hover:scale-105 transition-all">
                            <p className="text-xs text-slate-400 mb-0.5">Price</p>
                            <p className="text-sm text-green-400 font-bold">
                              £{variant.price.toFixed(2)}
                            </p>
                            {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                              <p className="text-xs text-red-400 line-through">
                                £{variant.compareAtPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                          
                          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30 hover:border-cyan-500/50 hover:scale-105 transition-all">
                            <p className="text-xs text-slate-400 mb-0.5">Stock</p>
                            <p className={`text-sm font-bold ${
                              variant.stockQuantity > 10 ? 'text-green-400' :
                              variant.stockQuantity > 0 ? 'text-orange-400' :
                              'text-red-400'
                            }`}>
                              {variant.stockQuantity}
                            </p>
                          </div>
                          
                          {variant.weight && (
                            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30 hover:border-blue-500/50 hover:scale-105 transition-all">
                              <p className="text-xs text-slate-400 mb-0.5">Weight</p>
                              <p className="text-sm text-white">{variant.weight} kg</p>
                            </div>
                          )}
                          
                          {(variant.option1 || variant.option2 || variant.option3) && (
                            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30 col-span-2 sm:col-span-1 hover:border-purple-500/50 hover:scale-105 transition-all">
                              <p className="text-xs text-slate-400 mb-0.5">Options</p>
                              <div className="flex flex-wrap gap-1">
                                {variant.option1 && (
                                  <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                                    {variant.option1}
                                  </span>
                                )}
                                {variant.option2 && (
                                  <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                                    {variant.option2}
                                  </span>
                                )}
                                {variant.option3 && (
                                  <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20 hover:bg-pink-500/20 transition-all">
                                    {variant.option3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Products */}
          {viewingProduct.relatedProducts && viewingProduct.relatedProducts.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-green-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                Related Products ({viewingProduct.relatedProducts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewingProduct.relatedProducts.map((product) => (
                  <div key={product.id || `related-${product.sku}`} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 hover:border-violet-500/50 hover:scale-105 hover:shadow-lg transition-all group/prod cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/prod:scale-110 transition-transform">
                        {product.image && product.image !== "📦" ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover/prod:text-violet-400 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
                        <p className="text-xs text-green-400 font-semibold">£{product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Sell Products */}
          {viewingProduct.crossSellProducts && viewingProduct.crossSellProducts.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                Cross-Sell Products ({viewingProduct.crossSellProducts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewingProduct.crossSellProducts.map((product) => (
                  <div key={product.id || `cross-${product.sku}`} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 hover:border-cyan-500/50 hover:scale-105 hover:shadow-lg transition-all group/prod cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover/prod:scale-110 transition-transform">
                        {product.image && product.image !== "📦" ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover/prod:text-cyan-400 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
                        <p className="text-xs text-green-400 font-semibold">£{product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Comment */}
          {viewingProduct.adminComment && (
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/40 transition-all group">
              <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                Admin Comment
              </h4>
              <p className="text-slate-300 text-sm">{viewingProduct.adminComment}</p>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              Activity Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoField label="Created At" value={viewingProduct.createdAt} icon={<Clock className="w-4 h-4" />} />
              <InfoField label="Created By" value={viewingProduct.createdBy || 'N/A'} icon={<User className="w-4 h-4" />} />
              <InfoField label="Updated At" value={viewingProduct.updatedAt} icon={<Clock className="w-4 h-4" />} />
              <InfoField label="Updated By" value={viewingProduct.updatedBy || 'N/A'} icon={<User className="w-4 h-4" />} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <Link href={`/admin/products/edit/${viewingProduct.id}`}>
              <button className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all font-medium text-sm flex items-center gap-2">
                <Edit className="w-4" />
                Edit Product
              </button>
            </Link>
            <button
              onClick={() => setViewingProduct(null)}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:scale-105 transition-all font-medium text-sm"
            >
              Close
            </button>
          </div>

        </div>
      )}
    </div>
  </div>
)}



      {/* Delete Confirmation Dialog */}
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


// Toggle Field Component with Hover Effect
// ✅ FIXED: Toggle Field Component with proper typing
const ToggleField = ({ label, value }: { label: string; value: boolean | undefined }) => {
  const isEnabled = value ?? false; // Handle undefined values
  
  return (
    <div className={`p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
      isEnabled 
        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50' 
        : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        {isEnabled ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
      </div>
      <p className={`text-sm font-semibold mt-1 ${isEnabled ? 'text-green-400' : 'text-red-400'}`}>
        {isEnabled ? 'Enabled' : 'Disabled'}
      </p>
    </div>
  );
};


// Helper Component for Info Fields
interface InfoFieldProps {
  label: string;
  value?: string | number | null;
  highlight?: boolean;
  fullWidth?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

// ✅ ENHANCED: InfoField Component with full hover effects
const InfoField = ({ 
  label, 
  value, 
  icon, 
  fullWidth = false, 
  highlight = false,
  className = '' 
}: { 
  label: string; 
  value?: string | null; 
  icon?: React.ReactNode;
  fullWidth?: boolean;
  highlight?: boolean;
  className?: string;
}) => (
  <div className={`
    p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 
    hover:bg-slate-800/70 hover:border-violet-500/50 hover:scale-[1.02]
    transition-all group cursor-pointer
    ${fullWidth ? 'col-span-full' : ''} 
    ${highlight ? 'ring-1 ring-violet-500/30' : ''} 
    ${className}
  `}>
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-slate-400 group-hover:text-violet-400 transition-colors">{icon}</span>}
      <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{label}</p>
    </div>
    <p className={`text-sm font-medium truncate group-hover:text-white transition-colors ${
      value && value !== 'N/A' && value !== 'Not set' ? 'text-white' : 'text-slate-500'
    }`}>
      {value || 'Not available'}
    </p>
  </div>
);
