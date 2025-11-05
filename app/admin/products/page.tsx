"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Package, Edit, Trash2, Eye, Search, Filter, FilterX, TrendingUp, AlertCircle, X, Tag, DollarSign, Calendar, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useToast } from "@/components/CustomToast";
import { API_BASE_URL } from "@/lib/api-config";
import ConfirmDialog from "@/components/ConfirmDialog";

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
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/Products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.items) {
          const formattedProducts = data.data.items.map((p: any) => ({
            id: p.id,
            name: p.name,
            categoryName: p.categoryName || 'Uncategorized',
            price: p.price || 0,
            stock: p.stockQuantity || 0,
            stockQuantity: p.stockQuantity || 0,
            status: getStockStatus(p.stockQuantity),
            image: getProductImage(p.images),
            sales: 0,
            shortDescription: p.shortDescription || '',
            sku: p.sku || '',
            createdAt: formatDate(p.createdAt),
            updatedAt: p.updatedAt ? formatDate(p.updatedAt) : 'N/A',
            updatedBy: p.updatedBy || 'N/A',
            description: p.description || p.shortDescription || '',
            category: p.categoryName || 'Uncategorized',
            isPublished: p.isPublished || false,
            productType: p.productType || 'simple',
            brandName: p.brandName || 'No Brand'
          }));
          
          setProducts(formattedProducts);
        } else {
          toast.warning('No products found in your inventory.');
          setProducts([]);
        }
      } else {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          toast.error(`Failed to load products (Error ${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCategories(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/Products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      if (response.ok) {
        toast.success("Product deleted successfully! 🗑️");
        await fetchProducts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete product");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
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
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setStatusFilter("all");
    setPublishedFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory !== "all" || statusFilter !== "all" || publishedFilter !== "all" || searchTerm.trim() !== "";

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brandName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           product.categoryName === selectedCategory;
    
    const matchesStatus = statusFilter === 'all' || 
                         product.status === statusFilter;
    
    const matchesPublished = publishedFilter === 'all' ||
                           (publishedFilter === 'published' && product.isPublished) ||
                           (publishedFilter === 'unpublished' && !product.isPublished);

    return matchesSearch && matchesCategory && matchesStatus && matchesPublished;
  });

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredProducts.slice(startIndex, endIndex);

  // Pagination functions
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

  // Generate page numbers for pagination
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
  }, [searchTerm, selectedCategory, statusFilter, publishedFilter]);

  const lowStockCount = products.filter(p => p.status === 'Low Stock').length;
  const outOfStockCount = products.filter(p => p.status === 'Out of Stock').length;
  const publishedCount = products.filter(p => p.isPublished).length;

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
        <Link href="/admin/products/add">
          <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </Link>
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
                <p className="text-2xl font-bold text-white">{publishedCount}</p>
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
                <p className="text-2xl font-bold text-white">{lowStockCount}</p>
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
                <p className="text-2xl font-bold text-white">{outOfStockCount}</p>
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
          <div className="flex items-center gap-3">
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
                  {/* ✅ Fixed image container - consistent size */}
{/* ✅ BETTER FIX: Complete image handling */}
<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
  {product.image === '📦' || !product.image ? (
    <span className="text-lg">📦</span>
  ) : (
    <img
      src={product.image}
      alt={product.name}
      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => {
        if (product.image && product.image !== '📦') {
          setViewingImage(product.image);
        }
      }}
      title="Click to view image"
    />
  )}
</div>

                  {/* ✅ Fixed text container - prevents layout shift */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors truncate"
                      onClick={() => setViewingProduct(product)}
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
                  <span className="text-green-400">₹</span>
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
                {/* ✅ Improved Status Design */}
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
                    onClick={() => setViewingProduct(product)}
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
{/* ✅ Image View Modal - Add this after the main table */}
{viewingImage && viewingImage !== '📦' && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setViewingImage(null)}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-all backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <img
        src={viewingImage}
        alt="Product Image"
        className="w-full h-full object-contain"
        style={{ maxHeight: 'calc(90vh - 2rem)' }}
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

      {/* View Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Product Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">View product information</p>
                </div>
                <button
                  onClick={() => setViewingProduct(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Product Image and Basic Info */}
                <div className="flex items-start gap-6">
                  <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {viewingProduct?.image && viewingProduct.image !== '📦' ? (
                      <img
                        src={viewingProduct.image}
                        alt={viewingProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{viewingProduct.name}</h3>
                    <div
                      className="prose prose-invert max-w-none text-slate-200 mb-4"
                      dangerouslySetInnerHTML={{
                        __html: viewingProduct.description || "No description available",
                      }}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-sm font-medium">
                        {viewingProduct.category}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        viewingProduct.status === 'In Stock' ? 'bg-green-500/10 text-green-400' :
                        viewingProduct.status === 'Low Stock' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {viewingProduct.status}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        viewingProduct.isPublished ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {viewingProduct.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Tag className="w-4 h-4" />
                      <span>SKU</span>
                    </div>
                    <p className="text-white font-semibold font-mono">{viewingProduct.sku}</p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Price</span>
                    </div>
                    <p className="text-white font-semibold text-xl">₹{viewingProduct.price.toFixed(2)}</p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <Package className="w-4 h-4" />
                      <span>Stock</span>
                    </div>
                    <p className="text-white font-semibold text-xl">{viewingProduct.stockQuantity} units</p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>Total Sales</span>
                    </div>
                    <p className="text-white font-semibold text-xl">{viewingProduct.sales}</p>
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-3">Activity</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created At</span>
                      </div>
                      <p className="text-white text-sm">{viewingProduct.createdAt}</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>Updated At</span>
                      </div>
                      <p className="text-white text-sm">{viewingProduct.updatedAt}</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                        <User className="w-4 h-4" />
                        <span>Updated By</span>
                      </div>
                      <p className="text-white text-sm">{viewingProduct.updatedBy}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
                  <Link href={`/admin/products/edit/${viewingProduct.id}`}>
                    <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-medium text-sm">
                      Edit Product
                    </button>
                  </Link>
                  <button
                    onClick={() => setViewingProduct(null)}
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
