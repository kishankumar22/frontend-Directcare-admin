"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Image as ImageIcon, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, ExternalLink } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
}

// Fixed interfaces - removed nested ApiResponse issue
interface BannerApiResponse {
  success?: boolean;
  data?: Banner[] | Banner;
  message?: string;
  errors?: string[] | null;
}

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: string[] | null;
  error?: string;
}

export default function ManageBanners() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewingBanner, setViewingBanner] = useState<Banner | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    link: "",
    description: "",
    isActive: true,
    displayOrder: 1,
    startDate: "",
    endDate: ""
  });

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching banners from:', `${API_ENDPOINTS.banners}?includeInactive=true`);
      
      const response = await apiClient.get<BannerApiResponse>(`${API_ENDPOINTS.banners}?includeInactive=true`);
      console.log('📦 Raw API Response:', response);
      
      let bannersData: Banner[] = [];
      
      // Handle the actual API response structure based on your example
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          bannersData = response.data.data;
        } else if (Array.isArray(response.data)) {
          bannersData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          bannersData = response.data.data;
        }
      }
      
      console.log('✅ Processed banners data:', bannersData);
      setBanners(bannersData);
      
    } catch (error: any) {
      console.error("❌ Error fetching banners:", error);
      toast.error("Failed to fetch banners. Please check your connection.");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log('🚀 Submitting banner data:', formData);
      
      const payload = {
        title: formData.title,
        imageUrl: formData.imageUrl,
        link: formData.link,
        description: formData.description,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
        startDate: formData.startDate || new Date().toISOString(),
        endDate: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log('📤 Final payload:', payload);

      let response: any;
      
      if (editingBanner) {
        console.log('✏️ Updating banner with ID:', editingBanner.id);
        response = await apiClient.put<BannerApiResponse>(`${API_ENDPOINTS.banners}/${editingBanner.id}`, payload);
      } else {
        console.log('🆕 Creating new banner');
        response = await apiClient.post<BannerApiResponse>(API_ENDPOINTS.banners, payload);
      }

      console.log('📦 Submit Response:', response);

      // Enhanced response handling for the actual API structure
      let success = false;
      
      if (response.data) {
        // Check for success in nested data structure
        if (response.data.success === true) {
          success = true;
        }
        // Check for data presence (indicates success)
        else if (response.data.data) {
          success = true;
        }
      }
      
      if (success) {
        const successMessage = editingBanner 
          ? "Banner updated successfully! ✅" 
          : "Banner created successfully! 🎉";
        
        toast.success(successMessage, { autoClose: 4000 });
        await fetchBanners();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error(response.error || response.data?.message || "Failed to save banner");
      }
      
    } catch (error: any) {
      console.error("❌ Error saving banner:", error);
      console.error("Error response:", error.response?.data);
      
      const errorMessage = editingBanner 
        ? `Failed to update banner: ${error.response?.data?.message || error.message || 'Unknown error'}`
        : `Failed to create banner: ${error.response?.data?.message || error.message || 'Unknown error'}`;
      
      toast.error(errorMessage);
    }
  };

  // Fixed edit function to properly handle banner ID
  const handleEdit = (banner: Banner) => {
    console.log('🔧 Setting edit banner:', banner);
    setEditingBanner(banner); // Fixed: Set the complete banner object
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link,
      description: banner.description,
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
      startDate: banner.startDate ? banner.startDate.slice(0, 16) : "",
      endDate: banner.endDate ? banner.endDate.slice(0, 16) : ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    
    try {
      console.log('🗑️ Deleting banner with ID:', id);
      const response = await apiClient.delete<ApiResponse>(`${API_ENDPOINTS.banners}/${id}`);
      console.log('📦 Delete Response:', response);
      
      // Enhanced success checking for delete
      let success = false;
      
      if (response.data?.success === true) {
        success = true;
      } else if (!response.error) {
        success = true;
      }
      
      if (success) {
        toast.success("Banner deleted successfully! 🗑️");
        await fetchBanners();
      } else {
        throw new Error(response.error || "Failed to delete banner");
      }
      
    } catch (error: any) {
      console.error("❌ Error deleting banner:", error);
      toast.error(`Failed to delete banner: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Fixed image upload function to use current form title
  const handleImageUpload = async (file: File) => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title first before uploading image");
      return;
    }

    setUploadingImage(true);
    try {
      console.log('📤 Uploading image:', file.name, file.size, 'bytes');
      console.log('📝 Using current form title:', formData.title);
      
      // Create FormData with current form title (not the original banner title)
      const formDataUpload = new FormData();
      formDataUpload.append('title', formData.title); // Use current form title, not original banner title
      formDataUpload.append('image', file);
      
      console.log('🔄 Uploading to:', API_ENDPOINTS.uploadImage);
      
      // Use direct fetch for multipart/form-data upload
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.uploadImage}`, {
        method: 'POST',
        headers: {
          'Authorization': localStorage.getItem('authToken') || '',
        },
        body: formDataUpload,
      });

      console.log('📦 Upload Response status:', response.status);
      const responseData = await response.json();
      console.log('📦 Upload Response data:', responseData);
      
      let imageUrl = '';
      
      // Handle different upload response structures
      if (responseData && response.ok) {
        if (responseData.success && responseData.data) {
          if (typeof responseData.data === 'string') {
            imageUrl = responseData.data;
          } else if (responseData.data.imageUrl) {
            imageUrl = responseData.data.imageUrl;
          } else if (responseData.data.url) {
            imageUrl = responseData.data.url;
          }
        } else if (responseData.imageUrl) {
          imageUrl = responseData.imageUrl;
        } else if (responseData.url) {
          imageUrl = responseData.url;
        } else if (typeof responseData === 'string') {
          imageUrl = responseData;
        }
      }
      
      if (imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl }));
        toast.success("Image uploaded successfully with current title! 📸");
        console.log('✅ Image uploaded, URL:', imageUrl);
      } else {
        throw new Error(responseData?.message || "No image URL returned from server");
      }
      
    } catch (error: any) {
      console.error("❌ Error uploading image:", error);
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      imageUrl: "",
      link: "",
      description: "",
      isActive: true,
      displayOrder: 1,
      startDate: "",
      endDate: ""
    });
    setEditingBanner(null);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || searchTerm.trim() !== "";

  // Filter data
  const filteredBanners = banners.filter(banner => {
    const matchesSearch = banner.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         banner.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && banner.isActive) ||
                         (statusFilter === "inactive" && !banner.isActive);

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredBanners.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBanners.slice(startIndex, endIndex);

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
  }, [searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading banners...</p>
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
            Banner Management
          </h1>
          <p className="text-slate-400">Manage your website banners ({banners.length} total)</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
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
              placeholder="Search banners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
            {totalItems} banner{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Banners List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {banners.length === 0 ? "No banners found. Create your first banner!" : "No banners match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Banner</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Start Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">End Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Updated By</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((banner) => (
                  <tr key={banner.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {banner.imageUrl ? (
                          <div
                            className="w-16 h-10 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
                            onClick={() => setSelectedImageUrl(getImageUrl(banner.imageUrl))}
                          >
                            <img
                              src={getImageUrl(banner.imageUrl)}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center"><svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p
                            className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors"
                            onClick={() => setViewingBanner(banner)}
                          >
                            {banner.title || 'Untitled Banner'}
                          </p>
                          <p className="text-xs text-slate-500">{banner.description?.slice(0, 50) || 'No description'}...</p>
                          {banner.link && (
                            <div className="flex items-center gap-1 mt-1">
                              <ExternalLink className="h-3 w-3 text-slate-500" />
                              <p className="text-xs text-slate-500">{banner.link?.slice(0, 30)}...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        banner.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">{banner.displayOrder || 0}</td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {banner.startDate ? new Date(banner.startDate).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {banner.endDate ? new Date(banner.endDate).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {banner.createdAt ? new Date(banner.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {banner.updatedBy || banner.createdBy || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingBanner(banner)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: banner.id, title: banner.title || 'Untitled Banner' })}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
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
              {/* First Page */}
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
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

              {/* Next Page */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last Page */}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingBanner ? `Edit Banner (ID: ${editingBanner.id.slice(0, 8)}...)` : 'Create New Banner'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingBanner ? 'Update banner information' : 'Add a new banner to your website'}
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
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">1</span>
                  <span>Basic Information</span>
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Banner Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Enter banner title"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1">⚠️ This title will be used for image upload</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 1})}
                        placeholder="1"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Link URL</label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter banner description"
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Image */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">2</span>
                  <span>Banner Image</span>
                </h3>
                
                {/* Title usage info */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <p className="text-blue-400 text-sm">
                      Image will be uploaded with title: <strong>"{formData.title || 'Enter title above'}"</strong>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Current Image Display */}
                  {formData.imageUrl && (
                    <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-600">
                      <div 
                        className="w-20 h-12 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
                        onClick={() => setSelectedImageUrl(getImageUrl(formData.imageUrl))}
                      >
                        <img
                          src={getImageUrl(formData.imageUrl)}
                          alt="Current banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Current Image</p>
                        <p className="text-xs text-slate-400">Click to view full size</p>
                        <p className="text-xs text-slate-500">{formData.imageUrl}</p>
                      </div>
                      <label className="px-3 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-all text-sm font-medium cursor-pointer">
                        {uploadingImage ? 'Uploading...' : 'Update Image'}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage || !formData.title.trim()}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {/* Upload Area */}
                  {!formData.imageUrl && (
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-900/30 hover:bg-slate-800/50 transition-all group ${
                        !formData.title.trim() ? 'opacity-50 cursor-not-allowed' : ''
                      }`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {uploadingImage ? (
                            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                          ) : (
                            <Upload className="w-8 h-8 mb-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                          )}
                          <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">
                              {uploadingImage ? 'Uploading...' : 
                               !formData.title.trim() ? 'Enter title first' : 'Click to upload'}
                            </span> 
                            {!uploadingImage && formData.title.trim() && ' or drag and drop'}
                          </p>
                          <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage || !formData.title.trim()}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {/* URL Input */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-800 text-slate-400">OR</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="Paste image URL"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">3</span>
                  <span>Schedule</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">4</span>
                  <span>Settings</span>
                </h3>
                <div>
                  <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                    />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors">Active</p>
                      <p className="text-xs text-slate-500">Banner will be visible on the website</p>
                    </div>
                  </label>
                </div>
              </div>

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
                  disabled={!formData.title.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {editingBanner ? '✓ Update Banner' : '+ Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingBanner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Banner Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">ID: {viewingBanner.id}</p>
                </div>
                <button
                  onClick={() => setViewingBanner(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Image Section */}
              {viewingBanner.imageUrl && (
                <div className="flex justify-center mb-6">
                  <div className="max-w-md w-full rounded-xl overflow-hidden border-2 border-violet-500/20 cursor-pointer hover:border-violet-500/50 transition-all">
                    <img
                      src={getImageUrl(viewingBanner.imageUrl)}
                      alt={viewingBanner.title}
                      className="w-full h-auto object-cover hover:scale-105 transition-transform"
                      onClick={() => setSelectedImageUrl(getImageUrl(viewingBanner.imageUrl))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">ℹ</span>
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Title</p>
                      <p className="text-lg font-bold text-white">{viewingBanner.title || 'Untitled'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Description</p>
                      <p className="text-white text-sm">{viewingBanner.description || 'No description'}</p>
                    </div>
                    {viewingBanner.link && (
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Link</p>
                        <a
                          href={viewingBanner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 break-all"
                        >
                          {viewingBanner.link}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          viewingBanner.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {viewingBanner.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Display Order</p>
                        <p className="text-white font-semibold">{viewingBanner.displayOrder || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule & Activity */}
                <div className="bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-violet-400" />
                    Schedule & Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Start Date</p>
                      <p className="text-white text-sm">{viewingBanner.startDate ? new Date(viewingBanner.startDate).toLocaleString() : 'Not set'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">End Date</p>
                      <p className="text-white text-sm">{viewingBanner.endDate ? new Date(viewingBanner.endDate).toLocaleString() : 'Not set'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Created At</p>
                      <p className="text-white text-sm">{viewingBanner.createdAt ? new Date(viewingBanner.createdAt).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Updated At</p>
                      <p className="text-white text-sm">{viewingBanner.updatedAt ? new Date(viewingBanner.updatedAt).toLocaleString() : 'Never updated'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Created By</p>
                      <p className="text-white text-sm">{viewingBanner.createdBy || 'Unknown'}</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Updated By</p>
                      <p className="text-white text-sm">{viewingBanner.updatedBy || 'Never updated'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-6">
                <button
                  onClick={() => {
                    setViewingBanner(null);
                    handleEdit(viewingBanner);
                  }}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-medium text-sm"
                >
                  Edit Banner
                </button>
                <button
                  onClick={() => setViewingBanner(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Banner"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete Banner"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />

      {/* Image Preview Modal */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <img
              src={selectedImageUrl}
              alt="Full size preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
