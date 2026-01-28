"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Tag, Eye, CheckCircle, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Loader2, X, Package, FolderTree, Copy } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { ProductDescriptionEditor } from "../products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Brand, brandsService, BrandStats } from "@/lib/services/brands";
import { useRouter } from "next/navigation";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<BrandStats>({
    totalBrands: 0,
    publishedBrands: 0,
    homepageBrands: 0,
    totalProducts: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // After imports, before component
const MAX_HOMEPAGE_BRANDS = 50;
// ✅ Homepage brands counter
const [homepageBrandsCounter, setHomepageBrandsCounter] = useState<Brand[]>([]);
  const [imageDeleteConfirm, setImageDeleteConfirm] = useState<{
    brandId: string;
    imageUrl: string;
    brandName: string;
  } | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    isPublished: true,
    showOnHomepage: false,
    displayOrder: 1,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: ""
  });

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.split('?')[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const extractFilename = (imageUrl: string) => {
    if (!imageUrl) return "";
    const parts = imageUrl.split('/');
    return parts[parts.length - 1];
  };

  // ✅ Service-based Image Delete
  const handleDeleteImage = async (brandId: string, imageUrl: string) => {
    setIsDeletingImage(true);
    try {
      const filename = extractFilename(imageUrl);
      await brandsService.deleteLogo(filename);
      toast.success("Image deleted successfully! 🗑️");
      setBrands(prev =>
        prev.map(brand => brand.id === brandId ? { ...brand, logoUrl: "" } : brand)
      );
      if (editingBrand?.id === brandId) {
        setFormData(prev => ({ ...prev, logoUrl: "" }));
      }
      if (viewingBrand?.id === brandId) {
        setViewingBrand(prev => prev ? { ...prev, logoUrl: "" } : null);
      }
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error(error?.response?.data?.message || "Failed to delete image");
    } finally {
      setIsDeletingImage(false);
      setImageDeleteConfirm(null);
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

  // ✅ Service-based Fetch
// ✅ Service-based Fetch with Date Sorting
const fetchBrands = async () => {
  setLoading(true);
  try {
    const response = await brandsService.getAll({
      params: { includeInactive: true }
    });
    
    const brandsData = response.data?.data || [];
    
    // ✅ Sort by active status first, then by creation date (newest first)
    const sortedBrands = brandsData.sort((a: any, b: any) => {
      // Active brands first
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // Then by creation date (newest first)
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

// ✅ Calculate homepage brands count
useEffect(() => {
  const brandsOnHomepage = brands.filter(brand => brand.showOnHomepage);
  setHomepageBrandsCounter(brandsOnHomepage);
}, [brands]);

const homepageCount = homepageBrandsCounter.length;
  const handleLogoFileChange = (file: File) => {
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    toast.success("Logo selected! Click Create/Update to upload.");
  };

  // ✅ Service-based Submit (Upload + Create/Update)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ============================================
  // 1. BRAND NAME VALIDATION (Clean)
  // ============================================
  
  const brandName = formData.name.trim();

  // Empty check
  if (!brandName) {
    toast.error("❌ Brand name is required");
    return;
  }

  // Length validation (consistent)
  if (brandName.length < 2 || brandName.length > 80) {
    toast.error(`❌ Brand name must be between 2 and 80 characters. Current: ${brandName.length}`);
    return;
  }

  // Character validation (single regex)
  const brandRegex = /^[A-Za-z0-9\s&.\-()]+$/;
  if (!brandRegex.test(brandName)) {
    toast.error("❌ Brand name can only contain letters, numbers, spaces, &, ., -, ()");
    return;
  }

  // Duplicate check
  const isDuplicateName = brands.some(
    brand => 
      brand.name.toLowerCase().trim() === brandName.toLowerCase() &&
      brand.id !== editingBrand?.id
  );
  if (isDuplicateName) {
    toast.error("❌ A brand with this name already exists!");
    return;
  }

  // ============================================
  // 2. DESCRIPTION VALIDATION
  // ============================================
  
  const description = formData.description.trim();

  // Min length
  // if (description.length < 10) {
  //   toast.error(`❌ Description must be at least 10 characters. Current: ${description.length}`);
  //   return;
  // }

  // ✅ Max length (Industry Standard)
  if (description.length > 1000) {
    toast.error(`❌ Description cannot exceed 1000 characters. Current: ${description.length}`);
    return;
  }

  // ============================================
  // 3. DISPLAY ORDER VALIDATION
  // ============================================
  
  // Valid number check
  if (isNaN(formData.displayOrder)) {
    toast.error("❌ Display order must be a valid number");
    return;
  }

  // Integer check
  if (!Number.isInteger(formData.displayOrder)) {
    toast.error("❌ Display order must be a whole number (no decimals)");
    return;
  }

  // Range validation
  if (formData.displayOrder < 1 || formData.displayOrder > 1000) {
    toast.error("❌ Display order must be between 1 and 1000");
    return;
  }

  // ============================================
  // 4. META FIELDS VALIDATION
  // ============================================
  
  // Meta Title
  if (formData.metaTitle) {
    const metaTitle = formData.metaTitle.trim();
    
    if (metaTitle.length > 60) {
      toast.error(`❌ Meta title must be less than 60 characters. Current: ${metaTitle.length}`);
      return;
    }

    // Whitespace check
    if (/^\s+$/.test(formData.metaTitle)) {
      toast.error("❌ Meta title cannot contain only spaces");
      return;
    }
  }

  // Meta Description
  if (formData.metaDescription) {
    const metaDesc = formData.metaDescription.trim();
    
    if (metaDesc.length > 160) {
      toast.error(`❌ Meta description must be less than 160 characters. Current: ${metaDesc.length}`);
      return;
    }

    // Whitespace check
    if (/^\s+$/.test(formData.metaDescription)) {
      toast.error("❌ Meta description cannot contain only spaces");
      return;
    }
  }

  // Meta Keywords
  if (formData.metaKeywords) {
    const metaKeywords = formData.metaKeywords.trim();
    
    if (metaKeywords.length > 200) {
      toast.error(`❌ Meta keywords must be less than 200 characters. Current: ${metaKeywords.length}`);
      return;
    }

    // Whitespace check
    if (/^\s+$/.test(formData.metaKeywords)) {
      toast.error("❌ Meta keywords cannot contain only spaces");
      return;
    }

    // Format validation (comma-separated)
    if (metaKeywords.length > 0) {
      const keywords = metaKeywords.split(',');
      for (const keyword of keywords) {
        const trimmed = keyword.trim();
        if (trimmed.length > 0 && (trimmed.length < 2 || trimmed.length > 50)) {
          toast.error("❌ Each keyword must be between 2-50 characters");
          return;
        }
      }
    }
  }

  // ============================================
  // 5. HOMEPAGE LIMIT VALIDATION
  // ============================================
  
  if (formData.showOnHomepage) {
    const currentHomepageCount = brands.filter(
      brand => brand.showOnHomepage && brand.id !== editingBrand?.id
    ).length;
    
    if (currentHomepageCount >= MAX_HOMEPAGE_BRANDS) {
      toast.error(
        `❌ Homepage limit reached! Only ${MAX_HOMEPAGE_BRANDS} brands allowed. Currently: ${currentHomepageCount}/${MAX_HOMEPAGE_BRANDS}`
      );
      return;
    }
  }

  // ============================================
  // 6. LOGO VALIDATION (Industry Standard)
  // ============================================
  
  if (logoFile) {
    const allowedTypes = [ 'image/webp','image/png'];
    const maxSize = 1 * 1024 * 1024; // 1MB

    // Type validation
    if (!allowedTypes.includes(logoFile.type)) {
      toast.error("❌ Only WebP images are allowed");
      return;
    }

    // Size validation
    if (logoFile.size > maxSize) {
      const sizeMB = (logoFile.size / (1024 * 1024)).toFixed(2);
      toast.error(`❌ Logo size must be less than 1MB. Current: ${sizeMB}MB`);
      return;
    }

    // ✅ File name length
    if (logoFile.name.length > 255) {
      toast.error("❌ Logo file name is too long (max 255 characters)");
      return;
    }

    // ✅ Dimension validation
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(logoFile);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          
          const MIN_WIDTH = 200;
          const MAX_WIDTH = 5000;
          const MIN_HEIGHT = 200;
          const MAX_HEIGHT = 5000;
          
          if (img.width < MIN_WIDTH || img.width > MAX_WIDTH) {
            reject(`Logo width must be between ${MIN_WIDTH}px and ${MAX_WIDTH}px. Current: ${img.width}px`);
            return;
          }
          
          if (img.height < MIN_HEIGHT || img.height > MAX_HEIGHT) {
            reject(`Logo height must be between ${MIN_HEIGHT}px and ${MAX_HEIGHT}px. Current: ${img.height}px`);
            return;
          }
          
          resolve();
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject('Invalid or corrupted logo file');
        };
        
        img.src = url;
      });
    } catch (error: any) {
      toast.error(`❌ ${error}`);
      return;
    }
  }

  // ============================================
  // 7. PREVENT DUPLICATE SUBMISSION
  // ============================================
  
  if (isSubmitting) {
    toast.error("⏳ Please wait, processing...");
    return;
  }
  
  setIsSubmitting(true);

  try {
    let finalLogoUrl = formData.logoUrl;

    // ============================================
    // 8. LOGO UPLOAD
    // ============================================
    
    if (logoFile) {
      try {
        const uploadResponse = await brandsService.uploadLogo(logoFile, {
          name: formData.name,
        });

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(
            uploadResponse.data?.message || "Logo upload failed"
          );
        }

        finalLogoUrl = uploadResponse.data.data;
        toast.success("✅ Logo uploaded successfully!");
        
        // Delete old logo if exists
        if (editingBrand?.logoUrl && editingBrand.logoUrl !== finalLogoUrl) {
          const filename = extractFilename(editingBrand.logoUrl);
          if (filename) {
            try {
              await brandsService.deleteLogo(filename);
            } catch (err) {
              // Silently fail - old logo deletion is non-critical
            }
          }
        }
      } catch (uploadErr: any) {
        toast.error(
          uploadErr?.response?.data?.message || "Failed to upload logo"
        );
        setIsSubmitting(false);
        return;
      }
    }

    // ============================================
    // 9. PREPARE PAYLOAD
    // ============================================
    
    const payload = {
      name: brandName, // Already trimmed and validated
      description: description, // Already trimmed and validated
      logoUrl: finalLogoUrl,
      isPublished: formData.isPublished,
      showOnHomepage: formData.showOnHomepage,
      displayOrder: formData.displayOrder,
      metaTitle: formData.metaTitle?.trim() || undefined,
      metaDescription: formData.metaDescription?.trim() || undefined,
      metaKeywords: formData.metaKeywords?.trim() || undefined,
      ...(editingBrand && { id: editingBrand.id }),
    };

    // ============================================
    // 10. API CALL WITH ERROR HANDLING
    // ============================================
    
    if (editingBrand) {
      await brandsService.update(editingBrand.id, payload);
      toast.success("✅ Brand updated successfully! 🎉");
    } else {
      await brandsService.create(payload);
      toast.success("✅ Brand created successfully! 🎉");
    }

    // ============================================
    // 11. CLEANUP
    // ============================================
    
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    await fetchBrands();
    setShowModal(false);
    resetForm();

  } catch (error: any) {
    // ============================================
    // 12. ENHANCED ERROR HANDLING
    // ============================================
    
    let message = "Failed to save brand";
    
    if (error?.response?.status === 400) {
      message = error?.response?.data?.message || "Invalid data provided";
    } else if (error?.response?.status === 401) {
      message = "Session expired. Please login again";
    } else if (error?.response?.status === 403) {
      message = "Access denied. You don't have permission";
    } else if (error?.response?.status === 409) {
      message = "Brand with this name already exists";
    } else if (error?.response?.status === 500) {
      message = "Server error. Please try again later";
    } else if (error?.code === 'ECONNABORTED') {
      message = "Request timeout. Check your internet connection";
    } else if (error?.message) {
      message = error.message;
    }
    
    toast.error(message);
  } finally {
    setIsSubmitting(false);
  }
};


  // ✅ Service-based Delete
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await brandsService.delete(id);
      if (!response.error && (response.status === 200 || response.status === 204)) {
        toast.success("Brand deleted successfully! 🗑️");
        await fetchBrands();
      } else {
        toast.error(response.error || "Failed to delete brand");
      }
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      toast.error(error?.response?.data?.message || "Failed to delete brand");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description,
      logoUrl: brand.logoUrl || "",
      isPublished: brand.isPublished,
      showOnHomepage: brand.showOnHomepage,
      displayOrder: brand.displayOrder,
      metaTitle: brand.metaTitle || "",
      metaDescription: brand.metaDescription || "",
      metaKeywords: brand.metaKeywords || "",
    });
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      logoUrl: "",
      isPublished: true,
      showOnHomepage: false,
      displayOrder: 1,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: ""
    });
    setEditingBrand(null);
  };


  const clearFilters = () => {
    setPublishedFilter("all");
    setHomepageFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = publishedFilter !== "all" || homepageFilter !== "all" || searchTerm.trim() !== "";

  // Filter data
  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPublished = publishedFilter === "all" || 
                            (publishedFilter === "published" && brand.isPublished) ||
                            (publishedFilter === "unpublished" && !brand.isPublished);
    
    const matchesHomepage = homepageFilter === "all" ||
                           (homepageFilter === "yes" && brand.showOnHomepage) ||
                           (homepageFilter === "no" && !brand.showOnHomepage);

    return matchesSearch && matchesPublished && matchesHomepage;
  });

  // Pagination calculations
  const totalItems = filteredBrands.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBrands.slice(startIndex, endIndex);

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
  }, [searchTerm, publishedFilter, homepageFilter]);

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
        
        {/* Navigation & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Button: Categories */}
          <button
            onClick={() => router.push('/admin/categories')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all"
          >
            <FolderTree className="h-4 w-4" />
            View Categories
          </button>

          {/* Navigation Button: Products */}
          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Package className="h-4 w-4" />
            View Products
          </button>

          {/* Action Button: Add Brand */}
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

      
    {/* ✅ Statistics Cards - NEW */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Brands */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Tag className="h-6 w-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">Total Brands</p>
            <p className="text-white text-2xl font-bold">{stats.totalBrands}</p>
          </div>
        </div>
      </div>

      {/* Published Brands */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">Published</p>
            <p className="text-white text-2xl font-bold">{stats.publishedBrands}</p>
          </div>
        </div>
      </div>

      {/* Homepage Brands */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Eye className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">On Homepage</p>
            <p className="text-white text-2xl font-bold">{stats.homepageBrands}</p>
          </div>
        </div>
      </div>

      {/* Total Products */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <svg className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">Total Products</p>
            <p className="text-white text-2xl font-bold">{stats.totalProducts}</p>
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
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
            {/* Published Filter */}
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

            {/* Homepage Filter */}
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
            {totalItems} brand{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Brands List */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No brands found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Brand Name</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Products</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Homepage</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Updated At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Updated By</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((brand) => (
                  <tr key={brand.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
                            onClick={() => setSelectedImageUrl(getImageUrl(brand.logoUrl))}
                          >
                            <img
                              src={getImageUrl(brand.logoUrl)}
                              alt={brand.name}
                              className="w-full h-full object-cover"
                              
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                            <Tag className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p
                            className="text-white font-medium cursor-pointer hover:text-violet-400 transition-colors"
                            onClick={() => setViewingBrand(brand)}
                          >
                            {brand.name}
                          </p>
                          <p className="text-xs text-slate-500">{brand.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                        {brand.productCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        brand.isPublished
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {brand.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        brand.showOnHomepage
                          ? 'bg-violet-500/10 text-violet-400'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {brand.showOnHomepage ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">{brand.displayOrder}</td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {brand.createdAt ? new Date(brand.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 px-4 text-slate-300 text-sm">
                      {brand.updatedAt ? new Date(brand.updatedAt).toLocaleString() : '-'}
                    </td>
                  <td className="py-2.5 px-3">
  {brand.updatedBy ? (
    <div className="flex items-center gap-1.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center
                   text-xs font-bold text-white shrink-0
                   bg-gradient-to-br from-violet-500 to-cyan-500"
      >
        {brand.updatedBy.charAt(0).toUpperCase()}
      </div>

      <span
        className="text-xs truncate max-w-[120px] text-slate-300"
        title={brand.updatedBy}
      >
        {brand.updatedBy}
      </span>
    </div>
  ) : (
    <span className="text-slate-500 text-xs">-</span>
  )}
</td>

                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingBrand(brand)}
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(brand)}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: brand.id, name: brand.name })}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingBrand ? 'Edit Brand' : 'Create New Brand'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingBrand ? 'Update brand information' : 'Add a new brand to your store'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-800 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-2 space-y-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">1</span>
                  <span>Basic Information</span>
                </h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Brand Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter brand name"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                      {!formData.name && (
                        <p className="text-xs text-amber-400 mt-1">⚠️ Brand name is required before uploading logo</p>
                      )}
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
                      placeholder="Enter manufacturer/category/brand description..."
                      height={300}
                      required={false}
                    />
                  </div>
                </div>
              </div>

              {/* ✅ UPDATED: Brand Logo Section with Delete Button */}
       {/* UPDATED Brand Logo Section */}
<div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">
      2
    </span>
    <span>Brand Logo</span>
  </h3>

  <div className="space-y-4">
    {/* Current/Preview Image Display */}
    {(logoPreview || formData.logoUrl) && (
      <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-600">
        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
          onClick={() => setSelectedImageUrl(logoPreview || getImageUrl(formData.logoUrl))}
        >
          <img
            src={logoPreview || getImageUrl(formData.logoUrl)}
            alt="Logo preview"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">
            {logoPreview ? "New Logo Selected" : "Current Logo"}
          </p>
          <p className="text-xs text-slate-400">
            {logoPreview ? "Will be uploaded on save" : "Click to view full size"}
          </p>
        </div>
        
        {/* Change/Remove buttons */}
        <div className="flex gap-2">
          <label className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
            Change
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFileChange(file);
              }}
            />
          </label>
          
          {logoPreview && (
            <button
              type="button"
              onClick={() => {
                if (logoPreview) URL.revokeObjectURL(logoPreview);
                setLogoFile(null);
                setLogoPreview(null);
                toast.success("Logo selection removed");
              }}
              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium"
            >
              Remove
            </button>
          )}
          
          {/* Delete button for existing images (only in edit mode) */}
          {editingBrand && formData.logoUrl && !logoPreview && (
            <button
              type="button"
              onClick={() => {
                if (editingBrand) {
                  setImageDeleteConfirm({
                    brandId: editingBrand.id,
                    imageUrl: formData.logoUrl!,
                    brandName: editingBrand.name,
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

    {/* Upload Area - Show only if no logo */}
    {!formData.logoUrl && !logoPreview && (
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-all border-slate-600 bg-slate-900/30 hover:bg-slate-800/50 cursor-pointer group">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-slate-500 group-hover:text-violet-400 transition-colors" />
            <div>
              <p className="text-sm text-slate-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoFileChange(file);
            }}
          />
        </label>
      </div>
    )}

    {/* URL Input - Optional */}
    {!logoPreview && (
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
          value={formData.logoUrl}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          placeholder="Paste logo URL"
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
      </>
    )}
  </div>
</div>


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
                </div>
              </div>

 {/* ✅ SECTION 4: SETTINGS - Replace Complete Section */}
<div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">4</span>
    <span>Settings</span>
  </h3>
  
  {/* Row 1: Published + Display Order */}
  <div className="grid grid-cols-2 gap-4 mb-4">
    {/* Published Checkbox */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Brand visibility
      </label>
      <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
        <input
          type="checkbox"
          checked={formData.isPublished}
          onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
          className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-slate-900"
        />
        <div>
          <p className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors">
            Published
          </p>
        </div>
      </label>
    </div>

    {/* Display Order */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Display Order
      </label>
      <input
        type="number"
        value={formData.displayOrder}
        onChange={(e) => {
          const val = e.target.value;
          setFormData({
            ...formData,
            displayOrder: !val ? 0 : Number(val),
          });
        }}
        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>
  </div>

  {/* Row 2: Show on Homepage - Full Width with Counter */}
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="block text-sm font-medium text-slate-300">
        Show on homepage
      </label>
      
      {/* Counter Badge */}
      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
        homepageCount >= 50
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : homepageCount >= 40
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      }`}>
        {homepageCount}/50 Featured
      </span>
    </div>
    
    <label className={`flex items-center justify-between gap-3 p-4 border rounded-xl transition-all ${
      formData.showOnHomepage
        ? 'bg-cyan-500/10 border-cyan-500/30'
        : 'bg-slate-900/50 border-slate-600 hover:border-cyan-500 cursor-pointer'
    } ${
      !formData.showOnHomepage && homepageCount >= 50
        ? 'opacity-50 cursor-not-allowed'
        : ''
    }`}>
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={formData.showOnHomepage}
          onChange={(e) => {
            const checked = e.target.checked;
            
            // Prevent checking if limit reached (only for new checks)
            if (checked && homepageCount >= 50 && !editingBrand?.showOnHomepage) {
              toast.error(
                `🚫 Maximum ${MAX_HOMEPAGE_BRANDS} brands allowed on homepage! Currently: ${homepageCount}/50`
              );
              return;
            }
            
            setFormData({...formData, showOnHomepage: checked});
          }}
          disabled={!formData.showOnHomepage && homepageCount >= 15 && !editingBrand?.showOnHomepage}
          className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Featured on Homepage
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {homepageCount >= 50 && !formData.showOnHomepage
              ? '⚠️ Homepage limit reached'
              : 'Display this brand on the store homepage'}
          </p>
        </div>
      </div>
      
      {/* Visual indicator */}
      {formData.showOnHomepage && (
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </label>
    
    {/* Warning message when close to limit */}
    {homepageCount >= 12 && homepageCount < 15 && (
      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-300">
          <strong>Warning:</strong> {50 - homepageCount} {50 - homepageCount === 1 ? 'slot' : 'slots'} remaining for homepage
        </p>
      </div>
    )}
    
    {/* Info message when limit reached */}
    {homepageCount >= 50 && (
      <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="text-xs text-red-300">
            <strong>Homepage Full!</strong> Remove one brand from homepage to add another.
          </p>
          <button
            type="button"
            onClick={() => {
              toast.info(
                `📋 ${homepageCount} brands currently featured on homepage. Edit them to make room.`
              );
            }}
            className="text-xs text-red-400 underline mt-1 hover:text-red-300"
          >
            View featured brands
          </button>
        </div>
      </div>
    )}
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
    disabled={isSubmitting}
    className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={isSubmitting}
    className="px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    {isSubmitting ? (
      <>
        {/* 🔥 Lucide Loader Icon */}
        <Loader2 className="w-5 h-5 animate-spin" />
        {editingBrand ? 'Updating Brand...' : 'Creating Brand...'}
      </>
    ) : (
      <>
        {editingBrand ? '✓ Update Brand' : '+ Create Brand'}
      </>
    )}
  </button>
</div>

            </form>
          </div>
        </div>
      )}

      {/* View Details Modal - UPDATED WITH DELETE BUTTON */}
{viewingBrand && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-violet-500/10">
      
      {/* ========== FIXED HEADER WITH IMAGE ========== */}
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-4">
          {/* Brand Logo */}
          {viewingBrand.logoUrl ? (
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all shrink-0"
              onClick={() => setSelectedImageUrl(getImageUrl(viewingBrand.logoUrl))}
            >
              <img
                src={getImageUrl(viewingBrand.logoUrl)}
                alt={viewingBrand.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent truncate">
              {viewingBrand.name}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">View brand information</p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setViewingBrand(null)}
            className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all shrink-0"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ========== SCROLLABLE CONTENT ========== */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs">ℹ</span>
                Basic Information
              </h3>
              <div className="space-y-3">
              <div className="bg-slate-900/50 p-3 rounded-lg">
  <p className="text-xs text-slate-400 mb-1">Name</p>

  <p className="text-base font-bold text-white">
    {viewingBrand.name}
  </p>

  <div className="flex items-center gap-2">
    <p className="text-sm font-mono text-slate-300 break-all">
      {viewingBrand.id}
    </p>

    <button
      onClick={() => {
        navigator.clipboard.writeText(viewingBrand.id);
      }}
      className="text-slate-400 hover:text-white transition"
      title="Copy ID"
    >
      <Copy size={14} />
    </button>
  </div>
</div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Slug</p>
                    <p className="text-white text-sm font-mono break-all">{viewingBrand.slug}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Display Order</p>
                    <p className="text-white font-semibold">{viewingBrand.displayOrder}</p>
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  {viewingBrand.description ? (
                    <div
                      className="text-white text-sm prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: viewingBrand.description }}
                    />
                  ) : (
                    <p className="text-slate-500 text-sm italic">No description</p>
                  )}
                </div>
              </div>
            </div>

            {/* SEO Info */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-xs">🔍</span>
                SEO Information
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Meta Title</p>
                  <p className="text-white text-sm">{viewingBrand.metaTitle || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Meta Description</p>
                  <p className="text-white text-sm">{viewingBrand.metaDescription || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Meta Keywords</p>
                  <p className="text-white text-sm">{viewingBrand.metaKeywords || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Statistics */}
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-4">
              <h3 className="text-base font-bold text-white mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Products</span>
                  <span className="text-xl font-bold text-white">{viewingBrand.productCount || 0}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Status</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    viewingBrand.isPublished 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingBrand.isPublished ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    {viewingBrand.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Homepage</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    viewingBrand.showOnHomepage 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {viewingBrand.showOnHomepage ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Featured
                      </>
                    ) : (
                      'Not Featured'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-base font-bold text-white mb-3">Activity Timeline</h3>
              <div className="space-y-2">
                <div className="bg-slate-900/50 p-2.5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Created At</p>
                  <p className="text-white text-xs font-medium">
                    {viewingBrand.createdAt ? new Date(viewingBrand.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Created By</p>
                  <p className="text-white text-xs font-medium">{viewingBrand.createdBy || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Updated At</p>
                  <p className="text-white text-xs font-medium">
                    {viewingBrand.updatedAt ? new Date(viewingBrand.updatedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Updated By</p>
                  <p className="text-white text-xs font-medium">{viewingBrand.updatedBy || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FIXED FOOTER ========== */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 rounded-b-2xl shrink-0">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setViewingBrand(null)}
            className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-all font-medium flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </button>
          <button
            onClick={() => {
              setViewingBrand(null);
              handleEdit(viewingBrand);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Brand
          </button>
        </div>
      </div>

    </div>
  </div>
)}

      {/* Brand Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Brand"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete Brand"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />

      {/* NEW - Image Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!imageDeleteConfirm}
        onClose={() => setImageDeleteConfirm(null)}
        onConfirm={() => {
          if (imageDeleteConfirm) {
            handleDeleteImage(imageDeleteConfirm.brandId, imageDeleteConfirm.imageUrl);
          }
        }}
        title="Delete Image"
        message={`Are you sure you want to delete the image for "${imageDeleteConfirm?.brandName}"? This action cannot be undone.`}
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
