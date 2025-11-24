"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, FolderTree, TrendingUp, Eye, Clock, Tag, FileText, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { ProductDescriptionEditor } from "../products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { blogCategoriesService, BlogCategory } from "@/lib/services";

// API Response interfaces
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export default function BlogCategoriesPage() {
  const toast = useToast();
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBlogCategory, setEditingBlogCategory] = useState<BlogCategory | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewingBlogCategory, setViewingBlogCategory] = useState<BlogCategory | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // ✅ Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Stats State
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalPosts: 0,
    mostUsedCategory: "N/A",
    latestCategory: "N/A"
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ✅ Image Delete Confirmation
  const [imageDeleteConfirm, setImageDeleteConfirm] = useState<{
    categoryId: string;
    imageUrl: string;
    categoryName: string;
  } | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    imageUrl: "",
    isActive: true,
    displayOrder: 0,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    searchEngineFriendlyPageName: "",
    parentCategoryId: ""
  });

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.replace(API_BASE_URL, "").split('?')[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const extractFilename = (imageUrl: string) => {
    if (!imageUrl) return "";
    const parts = imageUrl.split('/');
    return parts[parts.length - 1];
  };

  // ✅ Calculate Stats
  const calculateStats = (categories: BlogCategory[]) => {
    const totalCategories = categories.length;
    const totalPosts = categories.reduce((sum, cat) => sum + (cat.blogPostCount || 0), 0);
    const mostUsed = categories.reduce((max, cat) => 
      (cat.blogPostCount || 0) > (max.blogPostCount || 0) ? cat : max
    , categories[0] || { name: "N/A", blogPostCount: 0 });
    const latest = categories.reduce((newest, cat) => {
      if (!cat.createdAt) return newest;
      if (!newest.createdAt) return cat;
      return new Date(cat.createdAt) > new Date(newest.createdAt) ? cat : newest;
    }, categories[0] || { name: "N/A" });

    setStats({
      totalCategories,
      totalPosts,
      mostUsedCategory: mostUsed?.name || "N/A",
      latestCategory: latest?.name || "N/A"
    });
  };

  // ✅ Handle Delete Image
  const handleDeleteImage = async (categoryId: string, imageUrl: string) => {
    setIsDeletingImage(true);
    try {
      const filename = extractFilename(imageUrl);
      await blogCategoriesService.deleteImage(filename);
      toast.success("Image deleted successfully! 🗑️");
      
      setBlogCategories(prev =>
        prev.map(cat => cat.id === categoryId ? { ...cat, imageUrl: "" } : cat)
      );
      if (editingBlogCategory?.id === categoryId) {
        setFormData(prev => ({ ...prev, imageUrl: "" }));
      }
      if (viewingBlogCategory?.id === categoryId) {
        setViewingBlogCategory(prev => prev ? { ...prev, imageUrl: "" } : null);
      }
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error(error?.response?.data?.message || "Failed to delete image");
    } finally {
      setIsDeletingImage(false);
      setImageDeleteConfirm(null);
    }
  };

  // ✅ Image File Change Handler
  const handleImageFileChange = (file: File) => {
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    toast.success("Image selected! Old image will be replaced on save.");
  };

  const fetchBlogCategories = async () => {
    try {
      setLoading(true);
      const response = await blogCategoriesService.getAll();
      if (response.data && response.data.success) {
        const categoriesData = response.data.data || [];
        setBlogCategories(categoriesData);
        calculateStats(categoriesData);
      } else {
        setBlogCategories([]);
      }
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      toast.error("Failed to load blog categories");
      setBlogCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Submit with proper validation and image upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Blog category name is required");
      return;
    }

    if (formData.name.trim().length < 2) {
      toast.error("Category name must be at least 2 characters");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (imageFile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 10 * 1024 * 1024;

      if (!allowedTypes.includes(imageFile.type)) {
        toast.error("Only JPG, PNG, and WebP images are allowed");
        return;
      }

      if (imageFile.size > maxSize) {
        toast.error("Image size must be less than 10MB");
        return;
      }
    }

    if (isSubmitting || uploadingImage) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        setUploadingImage(true);
        try {
          const uploadResponse = await blogCategoriesService.uploadImage(imageFile, {
            title: formData.name
          });
          if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
            throw new Error(uploadResponse.data?.message || "Image upload failed");
          }
          finalImageUrl = uploadResponse.data.data;
          toast.success("Image uploaded successfully!");

          if (editingBlogCategory?.imageUrl && editingBlogCategory.imageUrl !== finalImageUrl) {
            const filename = extractFilename(editingBlogCategory.imageUrl);
            if (filename) {
              try {
                await blogCategoriesService.deleteImage(filename);
              } catch (err) {
                console.log("Failed to delete old image:", err);
              }
            }
          }
        } catch (uploadErr: any) {
          console.error("Error uploading image:", uploadErr);
          toast.error(uploadErr?.response?.data?.message || "Failed to upload image");
          setUploadingImage(false);
          setIsSubmitting(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        slug: formData.slug.trim(),
        imageUrl: finalImageUrl,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined,
        metaKeywords: formData.metaKeywords.trim() || undefined,
        searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName.trim() || undefined,
        parentCategoryId: formData.parentCategoryId || null,
        ...(editingBlogCategory && { id: editingBlogCategory.id }),
      };

      if (editingBlogCategory) {
        await blogCategoriesService.update(editingBlogCategory.id, payload);
        toast.success("Blog Category updated successfully! 🎉");
      } else {
        await blogCategoriesService.create(payload);
        toast.success("Blog Category created successfully! 🎉");
      }

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      await fetchBlogCategories();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving blog category:", error);
      toast.error(error?.response?.data?.message || "Failed to save blog category");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchBlogCategories();
  }, []);

useEffect(() => { 
  const handleFocus = () => {
    // Only refresh if modal is NOT open
    if (!showModal) {
      fetchBlogCategories();
    }
  };
  
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [showModal]); // Add showModal as dependency


  const handleEdit = (blogCategory: BlogCategory) => {
    setEditingBlogCategory(blogCategory);
    setFormData({
      name: blogCategory.name,
      description: blogCategory.description,
      slug: blogCategory.slug,
      imageUrl: blogCategory.imageUrl || "",
      isActive: blogCategory.isActive,
      displayOrder: blogCategory.displayOrder,
      metaTitle: blogCategory.metaTitle || "",
      metaDescription: blogCategory.metaDescription || "",
      metaKeywords: blogCategory.metaKeywords || "",
      searchEngineFriendlyPageName: blogCategory.searchEngineFriendlyPageName || "",
      parentCategoryId: blogCategory.parentCategoryId || ""
    });
    
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await blogCategoriesService.delete(id);
      if (!response.error && (response.status === 200 || response.status === 204)) {
        toast.success("Blog Category deleted successfully! 🗑️");
        await fetchBlogCategories();
      } else {
        toast.error(response.error || "Failed to delete blog category");
      }
    } catch (error: any) {
      console.error("Error deleting blog category:", error);
      toast.error(error?.response?.data?.message || "Failed to delete blog category");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      slug: "",
      imageUrl: "",
      isActive: true,
      displayOrder: 0,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      searchEngineFriendlyPageName: "",
      parentCategoryId: ""
    });
    setEditingBlogCategory(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = activeFilter !== "all" || searchTerm.trim() !== "";

  const filteredBlogCategories = Array.isArray(blogCategories) ? blogCategories.filter(cat => {
    const matchesSearch = cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cat.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActive = activeFilter === "all" || 
                         (activeFilter === "active" && cat.isActive) ||
                         (activeFilter === "inactive" && !cat.isActive);

    return matchesSearch && matchesActive;
  }) : [];

  const totalItems = filteredBlogCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBlogCategories.slice(startIndex, endIndex);

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
  }, [searchTerm, activeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading blog categories...</p>
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
            Blog Categories
          </h1>
          <p className="text-slate-400">Manage your blog categories</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 justify-center text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Create Blog Category
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Tag className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Categories</p>
              <p className="text-white text-2xl font-bold">{stats.totalCategories}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Posts</p>
              <p className="text-white text-2xl font-bold">{stats.totalPosts}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Most Used</p>
              <p className="text-white text-lg font-bold truncate" title={stats.mostUsedCategory}>
                {stats.mostUsedCategory}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Latest</p>
              <p className="text-white text-lg font-bold truncate" title={stats.latestCategory}>
                {stats.latestCategory}
              </p>
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
            Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, totalItems)} of {totalItems} entries
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
              placeholder="Search blog categories..."
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
            {totalItems} blog categor{totalItems !== 1 ? 'ies' : 'y'}
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">
              {blogCategories.length === 0 ? "No blog categories yet" : "No blog categories found"}
            </p>
            <p className="text-slate-500 text-sm">
              {blogCategories.length === 0 
                ? "Create your first blog category to get started" 
                : "Try adjusting your search or filters"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Blog Category Name</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Blog Posts</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Parent Blog Category</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((blogCategory) => (
                  <tr key={blogCategory.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {blogCategory.imageUrl ? (
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all flex-shrink-0"
                            onClick={() => setSelectedImageUrl(getImageUrl(blogCategory.imageUrl))}
                          >
                            <img
                              src={getImageUrl(blogCategory.imageUrl)}
                              alt={blogCategory.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <FolderTree className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p
                            className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors"
                            onClick={() => setViewingBlogCategory(blogCategory)}
                          >
                            {blogCategory.name}
                          </p>
                          <p className="text-xs text-slate-500">{blogCategory.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                        {blogCategory.blogPostCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        blogCategory.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {blogCategory.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">{blogCategory.displayOrder}</td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {blogCategory.parentCategoryName || '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm" title={blogCategory.createdBy}>
                      {blogCategory.createdAt ? new Date(blogCategory.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingBlogCategory(blogCategory)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(blogCategory)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: blogCategory.id, name: blogCategory.name })}
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

      {/* Modal continues in next part due to length... */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingBlogCategory ? 'Edit Blog Category' : 'Create New Blog Category'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingBlogCategory ? 'Update blog category information' : 'Add a new blog category'}
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
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Blog Category Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter blog category name"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Slug *</label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        placeholder="blog-category-slug"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={formData.displayOrder ?? 0}
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Parent Blog Category</label>
                      <select
                        value={formData.parentCategoryId}
                        onChange={(e) => setFormData({...formData, parentCategoryId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      >
                        <option value="">None (Root Blog Category)</option>
                        {Array.isArray(blogCategories) && blogCategories
                          .filter(cat => cat.id !== editingBlogCategory?.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <ProductDescriptionEditor
                      label="Description"
                      value={formData.description}
                      onChange={(content) => setFormData(prev => ({ 
                        ...prev, 
                        description: content 
                      }))}
                      placeholder="Enter blog category description..."
                      height={300}
                      required={false}
                    />
                  </div>
                </div>
              </div>

              {/* ✅ COMPLETE Image Section with all Banner features */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">
                    2
                  </span>
                  <span>Blog Category Image</span>
                </h3>

                <div className="space-y-4">
                  {(imagePreview || formData.imageUrl) && (
                    <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-600">
                      <div
                        className="w-20 h-20 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
                        onClick={() => setSelectedImageUrl(imagePreview || getImageUrl(formData.imageUrl))}
                      >
                        <img
                          src={imagePreview || getImageUrl(formData.imageUrl)}
                          alt="Category preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {imagePreview ? "New Image Selected" : "Current Image"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {imagePreview ? "Will replace old image on save" : "Click to view full size"}
                        </p>
                        {!imagePreview && (
                          <p className="text-xs text-slate-500">Path: {formData.imageUrl}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <label className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageFileChange(file);
                            }}
                          />
                        </label>

                        {imagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              if (imagePreview) URL.revokeObjectURL(imagePreview);
                              setImageFile(null);
                              setImagePreview(null);
                              toast.success("New image selection removed");
                            }}
                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}

                        {editingBlogCategory && formData.imageUrl && !imagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              if (editingBlogCategory) {
                                setImageDeleteConfirm({
                                  categoryId: editingBlogCategory.id,
                                  imageUrl: formData.imageUrl!,
                                  categoryName: editingBlogCategory.name,
                                });
                              }
                            }}
                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium flex items-center gap-2"
                            title="Delete Image"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!formData.imageUrl && !imagePreview && (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all border-slate-600 bg-slate-900/30 hover:bg-slate-800/50 cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                          <Upload className="w-8 h-8 mb-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                          <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFileChange(file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                  
                  {!imagePreview && (
                    <>
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
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="Paste image URL"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* SEO Information */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">3</span>
                  <span>SEO Information</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Title</label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                      placeholder="Enter meta title for SEO"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Description</label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                      placeholder="Enter meta description for SEO"
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Keywords</label>
                    <input
                      type="text"
                      value={formData.metaKeywords}
                      onChange={(e) => setFormData({...formData, metaKeywords: e.target.value})}
                      placeholder="Enter keywords separated by commas"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Search Engine Friendly Page Name</label>
                    <input
                      type="text"
                      value={formData.searchEngineFriendlyPageName}
                      onChange={(e) => setFormData({...formData, searchEngineFriendlyPageName: e.target.value})}
                      placeholder="search-engine-friendly-name"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Blog Category visibility</label>
                    <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                      />
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors">Active</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={isSubmitting || uploadingImage}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <svg 
                        className="animate-spin h-5 w-5 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Uploading Image...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <svg 
                        className="animate-spin h-5 w-5 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {editingBlogCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingBlogCategory ? '✓ Update Blog Category' : '+ Create Blog Category'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal - Requires ViewingBlogCategory component */}
      {/* Keeping your existing modals below... */}

      {/* Delete Confirmations */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Blog Category"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete Blog Category"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={!!imageDeleteConfirm}
        onClose={() => setImageDeleteConfirm(null)}
        onConfirm={() => {
          if (imageDeleteConfirm) {
            handleDeleteImage(imageDeleteConfirm.categoryId, imageDeleteConfirm.imageUrl);
          }
        }}
        title="Delete Image"
        message={`Are you sure you want to delete the image for "${imageDeleteConfirm?.categoryName}"? This action cannot be undone.`}
        confirmText="Delete Image"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeletingImage}
      />

      {/* Image Preview Modal */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
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
