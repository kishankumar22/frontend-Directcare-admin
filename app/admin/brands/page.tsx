"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Tag, Eye, CheckCircle, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Package, FolderTree, Copy, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/app/admin/_component/CustomToast";
import ConfirmDialog from "@/app/admin/_component/ConfirmDialog";
import { Brand, brandsService, BrandStats } from "@/lib/services/brands";
import { useRouter } from "next/navigation";
import BrandModals from "./BrandModals";


export default function BrandsPage() {
  const toast = useToast();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewingBrand, setViewingBrand] = useState<Brand | null>(null);
  const [publishedFilter, setPublishedFilter] = useState<string>("all");
  const [homepageFilter, setHomepageFilter] = useState<string>("all");
  const [deletedFilter, setDeletedFilter] = useState<string>("all"); // ✅ NEW FILTER
  const [stats, setStats] = useState<BrandStats>({
    totalBrands: 0,
    publishedBrands: 0,
    homepageBrands: 0,
    totalProducts: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [selectedBrand, setSelectedBrand] = useState<{
    id: string;
    name: string;
    isDeleted: boolean;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const openBrandActionModal = (brand: {
    id: string;
    name: string;
    isDeleted: boolean;
  }) => {
    setSelectedBrand({
      id: brand.id,
      name: brand.name,
      isDeleted: brand.isDeleted,
    });
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.split('?')[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const handleConfirmBrandAction = async () => {
    if (!selectedBrand) return;

    setIsProcessing(true);

    try {
      if (selectedBrand.isDeleted) {
        await brandsService.restore(selectedBrand.id);
        toast.success('Brand restored successfully!');
      } else {
        await brandsService.delete(selectedBrand.id);
        toast.success('Brand deleted successfully!');
      }

      await fetchBrands();
    } catch (error: any) {
      console.error('Brand action error:', error);
      toast.error(
        selectedBrand.isDeleted
          ? 'Failed to restore brand'
          : 'Failed to delete brand'
      );
    } finally {
      setIsProcessing(false);
      setSelectedBrand(null);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const calculateStats = (brandsData: Brand[]) => {
    const totalBrands = brandsData.length;
    const publishedBrands = brandsData.filter(b => b.isPublished).length;
    const homepageBrands = brandsData.filter(b => b.showOnHomepage).length;
    const totalProducts = brandsData.reduce((sum, brand) => sum + (brand.productCount || 0), 0);
    setStats({ totalBrands, publishedBrands, homepageBrands, totalProducts });
  };

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const response = await brandsService.getAll({
        params: { includeInactive: true }
      });

      const brandsData = response.data?.data || [];

      const sortedBrands = brandsData.sort((a: any, b: any) => {
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setBrands(sortedBrands);
      calculateStats(sortedBrands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingBrand(null);
  };

  const clearFilters = () => {
    setPublishedFilter("all");
    setHomepageFilter("all");
    setDeletedFilter("all"); // ✅ RESET NEW FILTER
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = publishedFilter !== "all" || homepageFilter !== "all" || deletedFilter !== "all" || searchTerm.trim() !== "";

  // ✅ UPDATED FILTER LOGIC
  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPublished = publishedFilter === "all" ||
                            (publishedFilter === "published" && brand.isPublished) ||
                            (publishedFilter === "unpublished" && !brand.isPublished);

    const matchesHomepage = homepageFilter === "all" ||
                           (homepageFilter === "yes" && brand.showOnHomepage) ||
                           (homepageFilter === "no" && !brand.showOnHomepage);

    const matchesDeleted = deletedFilter === "all" ||
                          (deletedFilter === "true" && brand.isDeleted) ||
                          (deletedFilter === "false" && !brand.isDeleted);

    return matchesSearch && matchesPublished && matchesHomepage && matchesDeleted;
  });

  const totalItems = filteredBrands.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBrands.slice(startIndex, endIndex);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, publishedFilter, homepageFilter, deletedFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading brands...</p>
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
            Brand Management
          </h1>
          <p className="text-slate-400">Manage your product brands</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push('/admin/categories')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all"
          >
            <FolderTree className="h-4 w-4" />
            View Categories
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Package className="h-4 w-4" />
            View Products
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-pink-500/50 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Brand
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            if (publishedFilter === 'all') setPublishedFilter('published');
            else if (publishedFilter === 'published') setPublishedFilter('unpublished');
            else setPublishedFilter('all');
          }}
          className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 backdrop-blur-sm border border-violet-500/20 rounded-xl p-4 hover:border-violet-500/40 transition-all cursor-pointer group relative text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium">Total Brands</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalBrands}</p>
              <p className="text-xs text-violet-400 mt-1 font-medium">
                {publishedFilter === 'all' ? '● All' : publishedFilter === 'published' ? '● Published' : '● Unpublished'}
              </p>
            </div>
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-violet-500/30 transition-all">
              <Tag className="h-5 w-5 text-violet-400" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (publishedFilter === 'all') setPublishedFilter('published');
            else if (publishedFilter === 'published') setPublishedFilter('unpublished');
            else setPublishedFilter('all');
          }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-all cursor-pointer group relative text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium">Published</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.publishedBrands}</p>
              <p className="text-xs text-green-400 mt-1 font-medium">
                {publishedFilter === 'all' ? '● All' : publishedFilter === 'published' ? '● Published' : '● Unpublished'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-500/30 transition-all">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (homepageFilter === 'all') setHomepageFilter('yes');
            else if (homepageFilter === 'yes') setHomepageFilter('no');
            else setHomepageFilter('all');
          }}
          className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/40 transition-all cursor-pointer group relative text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium">On Homepage</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.homepageBrands}</p>
              <p className="text-xs text-cyan-400 mt-1 font-medium">
                {homepageFilter === 'all' ? '● All' : homepageFilter === 'yes' ? '● Yes' : '● No'}
              </p>
            </div>
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-cyan-500/30 transition-all">
              <Eye className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
        </button>

        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium">Total Products</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-pink-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Items Per Page */}
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
          <div className="relative flex-1 min-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="search"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />

            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                publishedFilter !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>

            <select
              value={homepageFilter}
              onChange={(e) => setHomepageFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-36 ${
                homepageFilter !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Homepage</option>
              <option value="yes">On Homepage</option>
              <option value="no">Not on Homepage</option>
            </select>

            {/* ✅ NEW DELETED FILTER */}
            <select
              value={deletedFilter}
              onChange={(e) => setDeletedFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                deletedFilter !== "all"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Brands</option>
              <option value="false">Active</option>
              <option value="true">Deleted</option>
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
            {totalItems} brand{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No brands found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Brand</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Products</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Status</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Homepage</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Order By</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Updated</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Updated By</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentData.map((brand) => {
                  const isBusy = isProcessing && selectedBrand?.id === brand.id;

                  return (
                    <tr
                      key={brand.id}
                      className={`border-b border-slate-800 transition-colors
                        ${brand.isDeleted ? 'opacity-60 grayscale bg-red-500/5' : 'hover:bg-slate-800/30'}
                        ${isBusy ? 'pointer-events-none' : ''}
                      `}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {brand.logoUrl ? (
                            <img
                              src={getImageUrl(brand.logoUrl)}
                              alt={brand.name}
                              className="w-9 h-9 rounded-md border border-slate-700 object-cover cursor-pointer"
                              onClick={() => setSelectedImageUrl(getImageUrl(brand.logoUrl))}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                              <Tag className="h-4 w-4 text-white" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p
                              className="text-white font-medium truncate cursor-pointer hover:text-violet-400"
                              onClick={() => setViewingBrand(brand)}
                              title={brand.name}
                            >
                              {brand.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {brand.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-md text-xs font-medium">
                          {brand.productCount}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            brand.isPublished
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {brand.isPublished ? 'Published' : 'Unpublished'}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            brand.showOnHomepage
                              ? 'bg-violet-500/10 text-violet-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {brand.showOnHomepage ? 'Yes' : 'No'}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center text-slate-300">
                        {brand.displayOrder}
                      </td>

                      <td className="py-2 px-3 text-slate-300 text-xs">
                        {brand.updatedAt
                          ? new Date(brand.updatedAt).toLocaleDateString()
                          : '-'}
                      </td>

                      <td className="py-2 px-3">
                        {brand.updatedBy ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                              {brand.updatedBy.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className="text-xs truncate max-w-[100px] text-slate-300"
                              title={brand.updatedBy}
                            >
                              {brand.updatedBy}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingBrand(brand)}
                            className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-md"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEdit(brand)}
                            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-md"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              openBrandActionModal({
                                id: brand.id,
                                name: brand.name,
                                isDeleted: brand.isDeleted,
                              })
                            }
                            className={`p-1.5 rounded-md transition-all ${
                              brand.isDeleted
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-red-400 hover:bg-red-500/10'
                            }`}
                            title={
                              brand.isDeleted ? 'Restore Brand' : 'Delete Brand'
                            }
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : brand.isDeleted ? (
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

      {/* Reusable Modals Component */}
      <BrandModals
        showModal={showModal}
        setShowModal={setShowModal}
        editingBrand={editingBrand}
        setEditingBrand={setEditingBrand}
        viewingBrand={viewingBrand}
        setViewingBrand={setViewingBrand}
        selectedImageUrl={selectedImageUrl}
        setSelectedImageUrl={setSelectedImageUrl}
        brands={brands}
        fetchBrands={fetchBrands}
        getImageUrl={getImageUrl}
      />

      {/* Brand Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!selectedBrand}
        onClose={() => setSelectedBrand(null)}
        onConfirm={handleConfirmBrandAction}
        title={selectedBrand?.isDeleted ? 'Restore Brand' : 'Delete Brand'}
        message={
          selectedBrand?.isDeleted
            ? `Do you want to restore "${selectedBrand?.name}"?`
            : `Are you sure you want to delete "${selectedBrand?.name}"?`
        }
        confirmText={selectedBrand?.isDeleted ? 'Restore Brand' : 'Delete Brand'}
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor={
          selectedBrand?.isDeleted ? 'text-emerald-400' : 'text-red-400'
        }
        confirmButtonStyle={
          selectedBrand?.isDeleted
            ? 'bg-gradient-to-r from-emerald-500 to-green-500'
            : 'bg-gradient-to-r from-red-500 to-rose-500'
        }
        isLoading={isProcessing}
      />
    </div>
  );
}
