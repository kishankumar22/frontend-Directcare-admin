"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, CheckCircle, Image as ImageIcon, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, ExternalLink, Tag } from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import { ProductDescriptionEditor } from "../_components/SelfHostedEditor";
import { Banner, bannersService, BannerStats } from "@/lib/services";

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
  const [bannerTypeFilter, setBannerTypeFilter] = useState<string>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
const [deletedFilter, setDeletedFilter] = useState("notDeleted");
const [statusConfirm, setStatusConfirm] = useState<Banner | null>(null);

  const [stats, setStats] = useState<BannerStats>({
    totalBanners: 0,
    activeBanners: 0,
    inactiveBanners: 0,
    upcomingBanners: 0
  });
type BannerStatus =
  | 'LIVE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'SCHEDULED';
const handleRestore = async (id: string) => {
  try {
    await bannersService.restore(id);
    toast.success("Banner restored successfully!");
    fetchBanners();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Restore failed");
  }
};

function getBannerStatus(banner: any): BannerStatus {
  const now = new Date();

  if (!banner.isActive) return 'INACTIVE';

  if (banner.startDate && new Date(banner.startDate) > now)
    return 'SCHEDULED';

  if (banner.endDate && new Date(banner.endDate) < now)
    return 'EXPIRED';

  return 'LIVE';
}

  const calculateStats = (bannersData: Banner[]) => {
    const totalBanners = bannersData.length;
    const activeBanners = bannersData.filter(b => b.isActive).length;
    const inactiveBanners = bannersData.filter(b => !b.isActive).length;
    
    const now = new Date();
    const upcomingBanners = bannersData.filter(b => {
      if (!b.startDate) return false;
      const startDate = new Date(b.startDate);
      return startDate > now;
    }).length;

    setStats({
      totalBanners,
      activeBanners,
      inactiveBanners,
      upcomingBanners
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
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
    bannerType: "Homepage",
    offerCode: "",
    discountPercentage: 0,
    offerText: "",
    buttonText: "",
    isActive: true,
    displayOrder: 1,
    startDate: "",
    endDate: ""
  });

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    
    const cleanUrl = imageUrl.split('?')[0];
    
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const extractFilename = (imageUrl: string) => {
    if (!imageUrl) return "";

    const cleanedUrl = imageUrl.replace(API_BASE_URL, "");

    const parts = cleanedUrl.split("/");

    return parts.pop() || "";
  };

  const handleImageFileChange = (file: File) => {
    setImageFile(file);
    
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    
    toast.success("Image selected! Old image will be replaced on save.");
  };

const fetchBanners = async () => {
  try {
    setLoading(true);

    const params: any = {
      includeInactive: true, // ALWAYS TRUE
    };

    if (statusFilter === "active") {
      params.isActive = true;
    }

    if (statusFilter === "inactive") {
      params.isActive = false;
    }

    if (deletedFilter === "deleted") {
      params.isDeleted = true;
    }

    if (deletedFilter === "notDeleted") {
      params.isDeleted = false;
    }

    const response = await bannersService.getAll({ params });

    const rawData = response.data?.data;

const bannersData: Banner[] = Array.isArray(rawData)
  ? rawData
  : rawData
  ? [rawData]
  : [];


    setBanners(bannersData);
    calculateStats(bannersData);
  } catch (error) {
    toast.error("Failed to fetch banners");
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  fetchBanners();
}, [statusFilter, bannerTypeFilter, deletedFilter]);



const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. BASIC REQUIRED VALIDATIONS
  if (!formData.title.trim()) {
    toast.error("Banner title is required");
    return;
  }

  if (!formData.bannerType) {
    toast.error("Banner type is required");
    return;
  }

  if (!editingBanner && !imageFile) {
    toast.error("Banner image is required");
    return;
  }

  // ✅ NEW: START DATE & END DATE REQUIRED VALIDATION
  if (!formData.startDate || !formData.startDate.trim()) {
    toast.error("Start date & time is required");
    return;
  }

  if (!formData.endDate || !formData.endDate.trim()) {
    toast.error("End date & time is required");
    return;
  }

  // 2. DISPLAY ORDER VALIDATION
  if (Number(formData.displayOrder) < 0) {
    toast.error("Display order cannot be negative.");
    return;
  }

  // 3. LINK URL VALIDATION (Optional)
  if (formData.link && formData.link.trim()) {
    try {
      new URL(formData.link);
    } catch {
      toast.error("Please enter a valid banner link URL.");
      return;
    }
  }

  // 4. DATE VALIDATIONS (Now guaranteed to have values)
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    toast.error("Invalid start date format");
    return;
  }

  if (isNaN(end.getTime())) {
    toast.error("Invalid end date format");
    return;
  }

  // End date must be after start date
  if (end <= start) {
    toast.error(
      `End date must be after start date.\nStart: ${start.toLocaleString()}\nEnd: ${end.toLocaleString()}`
    );
    return;
  }

  // Start date validation for inactive banners
  if (!formData.isActive && start > now) {
    toast.error("Inactive banner cannot have a future start date.");
    return;
  }

  // End date cannot be in the past
  if (end < now) {
    toast.error(
      `End date cannot be in the past.\nCurrent time: ${now.toLocaleString()}\nEnd date: ${end.toLocaleString()}`
    );
    return;
  }

  // Start date should not be too far in the past (optional - adjust as needed)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (start < oneYearAgo) {
    toast.error("Start date cannot be more than 1 year in the past.");
    return;
  }

  // Duration validation (optional - max 1 year campaign)
  const durationInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  
  if (durationInDays > 365) {
    toast.error("Banner campaign cannot exceed 1 year duration.");
    return;
  }

  if (durationInDays < 1) {
    toast.error("Banner campaign must be at least 1 day long.");
    return;
  }

  // 5. DYNAMIC TYPE-BASED VALIDATIONS
  const bannerType = formData.bannerType;

  if (
    bannerType === "Offer" ||
    bannerType === "FlashSale" ||
    bannerType === "Promotional" ||
    bannerType === "Seasonal"
  ) {
    // Discount Percentage Validation
    if (
      formData.discountPercentage !== null &&
      formData.discountPercentage !== undefined &&
      formData.discountPercentage !== 0 &&
      String(formData.discountPercentage).trim() !== ""
    ) {
      const discount = Number(formData.discountPercentage);
      if (isNaN(discount)) {
        toast.error("Discount percentage must be a valid number.");
        return;
      }
      if (discount <= 0 || discount > 100) {
        toast.error("Discount percentage must be between 1 and 100.");
        return;
      }
    }

    // Offer Text & Button Text Consistency
    if (formData.offerText && formData.offerText.trim() && !formData.buttonText?.trim()) {
      toast.error("Button text is required when offer text is provided.");
      return;
    }

    if (formData.buttonText && formData.buttonText.trim() && !formData.offerText?.trim()) {
      toast.error("Offer text is required when button text is provided.");
      return;
    }
  }

  // 6. EMPTY HTML DESCRIPTION VALIDATION
  if (formData.description) {
    const strippedDescription = formData.description.replace(/<[^>]*>/g, "").trim();
    if (!strippedDescription) {
      toast.error("Banner description cannot be empty.");
      return;
    }
  }

  try {
    let finalImageUrl = formData.imageUrl;

    // IMAGE UPLOAD
    if (imageFile) {
      try {
        const uploadResponse = await bannersService.uploadImage(imageFile, {
          title: formData.title,
        });

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(uploadResponse.data?.message || "Image upload failed");
        }

        finalImageUrl = uploadResponse.data.data;
    

        // Delete old image if editing
        if (editingBanner?.imageUrl && editingBanner.imageUrl !== finalImageUrl) {
          const filename = extractFilename(editingBanner.imageUrl);
          if (filename) {
            try {
              await bannersService.deleteImage(filename);
            } catch (err) {
              console.log("Failed to delete old image", err);
            }
          }
        }
      } catch (uploadErr: any) {
        console.error("Error uploading image:", uploadErr);
        toast.error(uploadErr?.response?.data?.message || "Failed to upload image");
        return;
      }
    }

    // FINAL PAYLOAD
    const payload = {
      title: formData.title.trim(),
      imageUrl: finalImageUrl,
      link: formData.link || undefined,
      description: formData.description || undefined,
      bannerType: formData.bannerType,
      offerCode:
        bannerType === "Offer" ||
        bannerType === "FlashSale" ||
        bannerType === "Promotional" ||
        bannerType === "Seasonal"
          ? formData.offerCode || undefined
          : undefined,
      discountPercentage:
        bannerType === "Offer" ||
        bannerType === "FlashSale" ||
        bannerType === "Promotional" ||
        bannerType === "Seasonal"
          ? formData.discountPercentage && Number(formData.discountPercentage) > 0
            ? Number(formData.discountPercentage)
            : undefined
          : undefined,
      offerText:
        bannerType === "Offer" ||
        bannerType === "FlashSale" ||
        bannerType === "Promotional" ||
        bannerType === "Seasonal"
          ? formData.offerText || undefined
          : undefined,
      buttonText:
        bannerType === "Offer" ||
        bannerType === "FlashSale" ||
        bannerType === "Promotional" ||
        bannerType === "Seasonal"
          ? formData.buttonText || undefined
          : undefined,
      isActive: Boolean(formData.isActive),
      displayOrder: Number(formData.displayOrder) || 0,
      startDate: formData.startDate, // Now guaranteed to exist
      endDate: formData.endDate,     // Now guaranteed to exist
      ...(editingBanner && { id: editingBanner.id }),
    };

    // ✅ SINGLE CREATE/UPDATE CALL
    if (editingBanner) {
      await bannersService.update(editingBanner.id, payload);
      toast.success("Banner updated successfully!");
    } else {
      await bannersService.create(payload);
      toast.success("Banner created successfully!");
    }

    // CLEANUP
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);

    await fetchBanners();
    setShowModal(false);
    resetForm();
  } catch (error: any) {
    console.error("Error:", error);
    toast.error(error?.response?.data?.message || "Failed to save banner");
  }
};



  useEffect(() => {
    fetchBanners();
  }, []);

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl || "",
      link: banner.link || "",
      description: banner.description || "",
      bannerType: banner.bannerType || "Homepage",
      offerCode: banner.offerCode || "",
      discountPercentage: banner.discountPercentage || 0,
      offerText: banner.offerText || "",
      buttonText: banner.buttonText || "",
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
      startDate: banner.startDate ? banner.startDate.slice(0, 16) : "",
      endDate: banner.endDate ? banner.endDate.slice(0, 16) : "",
    });
    
    setImageFile(null);
    setImagePreview(null);
    
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await bannersService.delete(id);
      if (!response.error && (response.status === 200 || response.status === 204)) {
        toast.success("Banner deleted successfully! 🗑️");
        await fetchBanners();
      } else {
        toast.error(response.error || "Failed to delete banner");
      }
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      toast.error(error?.response?.data?.message || "Failed to delete banner");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      imageUrl: "",
      link: "",
      description: "",
      bannerType: "Homepage",
      offerCode: "",
      discountPercentage: 0,
      offerText: "",
      buttonText: "",
      isActive: true,
      displayOrder: 0,
      startDate: "",
      endDate: "",
    });
    setEditingBanner(null);
    
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setBannerTypeFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || bannerTypeFilter !== "all" || searchTerm.trim() !== "";

  const filteredBanners = banners.filter(banner => {
    const matchesSearch = banner.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         banner.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && banner.isActive) ||
                         (statusFilter === "inactive" && !banner.isActive);

    const matchesBannerType = bannerTypeFilter === "all" || banner.bannerType === bannerTypeFilter;

    return matchesSearch && matchesStatus && matchesBannerType;
  });

  const totalItems = filteredBanners.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredBanners.slice(startIndex, endIndex);

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
  }, [searchTerm, statusFilter, bannerTypeFilter]);

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
          className="px-4 py-2 dark:text-black bg-gradient-to-r from-violet-500 to-cyan-500 justify-center text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
      </div>
           {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Total Banners</p>
              <p className="text-white text-2xl font-bold">{stats.totalBanners}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Active</p>
              <p className="text-white text-2xl font-bold">{stats.activeBanners}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Inactive</p>
              <p className="text-white text-2xl font-bold">{stats.inactiveBanners}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Upcoming</p>
              <p className="text-white text-2xl font-bold">{stats.upcomingBanners}</p>
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

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-32 ${
                statusFilter !== "all" 
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={bannerTypeFilter}
              onChange={(e) => setBannerTypeFilter(e.target.value)}
              className={`px-3 py-3 bg-slate-800/90 border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all min-w-40 ${
                bannerTypeFilter !== "all" 
                  ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/50" 
                  : "border-slate-600"
              }`}
            >
              <option value="all">All Types</option>
              <option value="Homepage">Homepage</option>
              <option value="Offer">Offer</option>
              <option value="Promotional">Promotional</option>
              <option value="Category">Category</option>
              <option value="Seasonal">Seasonal</option>
              <option value="FlashSale">Flash Sale</option>
            </select>
            <select
  value={deletedFilter}
  onChange={(e) => setDeletedFilter(e.target.value)}
  className="px-3 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white"
>
  <option value="notDeleted">Not Deleted</option>
  <option value="deleted">Deleted</option>
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
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Type</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Start Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">End Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
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
                          <p
                            className="text-xs text-slate-500"
                            dangerouslySetInnerHTML={{
                              __html: banner.description
                                ? banner.description.length > 50
                                  ? banner.description.slice(0, 50) + "..."
                                  : banner.description
                                : "No description",
                            }}
                          />
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
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        banner.bannerType === 'Offer' ? 'bg-green-500/10 text-green-400' :
                        banner.bannerType === 'FlashSale' ? 'bg-red-500/10 text-red-400' :
                        banner.bannerType === 'Seasonal' ? 'bg-orange-500/10 text-orange-400' :
                        banner.bannerType === 'Category' ? 'bg-blue-500/10 text-blue-400' :
                        banner.bannerType === 'Promotional' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-cyan-500/10 text-cyan-400'
                      }`}>
                        {banner.bannerType || 'Homepage'}
                      </span>
                    </td>
<td className="py-4 px-4 text-center">
  <div className="flex flex-col items-center gap-2">

    {/* Active / Inactive Badge (Clickable) */}
    <button
      onClick={() => setStatusConfirm(banner)}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
        banner.isActive
          ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
          : "bg-slate-500/15 text-slate-400 hover:bg-slate-500/25"
      }`}
      title="Click to change status"
    >
      {banner.isActive ? "Active" : "Inactive"}
    </button>

    {/* Live / Expired / Scheduled */}
    {(() => {
      const status = getBannerStatus(banner);

      const map = {
        LIVE: "text-green-400",
        EXPIRED: "text-red-400",
        SCHEDULED: "text-yellow-400",
        INACTIVE: "text-slate-500",
      };

      const labelMap = {
        LIVE: "Live",
        EXPIRED: "Expired",
        SCHEDULED: "Scheduled",
        INACTIVE: "Inactive",
      };

      return (
        <span className={`text-xs font-medium ${map[status]}`}>
          {labelMap[status]}
        </span>
      );
    })()}
  </div>
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
                        {banner.isDeleted ? (
  <button
    onClick={() => handleRestore(banner.id)}
    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
    title="Restore"
  >
   <CheckCircle className="h-4 w-4" />
  </button>
) : (
  <button
    onClick={() =>
      setDeleteConfirm({ id: banner.id, title: banner.title })
    }
    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
    title="Delete"
  >
    <Trash2 className="h-4 w-4" />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingBanner ? `Edit Banner` : 'Create New Banner'}
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
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
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
                  {/* Row 1: Title & Banner Type */}
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Banner Type *</label>
                      <select
                        required
                        value={formData.bannerType}
                        onChange={(e) => setFormData({...formData, bannerType: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      >
                        <option value="Homepage">Homepage</option>
                        <option value="Offer">Offer</option>
                        <option value="Promotional">Promotional</option>
                        <option value="Category">Category</option>
                        <option value="Seasonal">Seasonal</option>
                        <option value="FlashSale">Flash Sale</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Display Order & Link */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                        placeholder="1"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Banner Link URL (Optional)</label>
                      <input
                        type="url"
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                        placeholder="https://example.com/your-link"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Conditional Fields - Offer/Promotional/FlashSale/Seasonal */}
                  {(formData.bannerType === "Offer" || 
                    formData.bannerType === "FlashSale" || 
                    formData.bannerType === "Promotional" || 
                    formData.bannerType === "Category" ||
                    formData.bannerType === "Seasonal") && (
                    <>
                      {/* Row 3: Offer Code & Discount % */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Offer Code {(formData.bannerType === "Offer" || formData.bannerType === "FlashSale") && "*"}
                          </label>
                          <input
                            type="text"
                            value={formData.offerCode}
                            onChange={(e) => setFormData({...formData, offerCode: e.target.value})}
                            placeholder="SUMMER2025"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Discount % {(formData.bannerType === "Offer" || formData.bannerType === "FlashSale") && "*"}
                          </label>
                          <input
                            type="number"
                            value={formData.discountPercentage || ''}
                            onChange={(e) => setFormData({...formData, discountPercentage: Number(e.target.value)})}
                            placeholder="20"
                            min="0"
                            max="100"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Row 4: Offer Text & Button Text */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Offer Text</label>
                          <input
                            type="text"
                            value={formData.offerText}
                            onChange={(e) => setFormData({...formData, offerText: e.target.value})}
                            placeholder="Get 50% Off on Summer Collection!"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Button Text</label>
                          <input
                            type="text"
                            value={formData.buttonText}
                            onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                            placeholder="Shop Now"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Description */}
                  <div>
                    <ProductDescriptionEditor
                      label="Description"
                      value={formData.description}
                      onChange={(content) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: content,
                        }))
                      }
                      placeholder="Enter banner description with rich formatting..."
                      height={300}
                      required={false}
                    />
                  </div>
                </div>
              </div>

              {/* Banner Image Section */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">2</span>
                  <span>Banner Image *</span>
                </h3>

                <div className="space-y-4">
                  {(imagePreview || formData.imageUrl) && (
                    <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-600">
                      <div
                        className="w-20 h-12 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
                        onClick={() => setSelectedImageUrl(imagePreview || getImageUrl(formData.imageUrl))}
                      >
                        <img
                          src={imagePreview || getImageUrl(formData.imageUrl)}
                          alt="Banner preview"
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
                        <label
                          className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                            !formData.title
                              ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                              : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                          }`}
                        >
                          Change Image
                          <input
                            type="file"
                            accept="image/*"
                            disabled={!formData.title}
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
                      </div>
                    </div>
                  )}

                  {!formData.imageUrl && !imagePreview && (
                    <div className="flex items-center justify-center w-full">
                      <label
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                          !formData.title
                            ? "border-slate-700 bg-slate-900/20 cursor-not-allowed opacity-50"
                            : "border-slate-600 bg-slate-900/30 hover:bg-slate-800/50 group"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload
                            className={`w-8 h-8 mb-4 transition-colors ${
                              !formData.title
                                ? "text-slate-600"
                                : "text-slate-500 group-hover:text-violet-400"
                            }`}
                          />
                          <p className={`mb-2 text-sm ${!formData.title ? "text-slate-600" : "text-slate-500"}`}>
                            {!formData.title ? (
                              "Enter title first"
                            ) : (
                              <>
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </>
                            )}
                          </p>
                          {formData.title && (
                            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!formData.title}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFileChange(file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                  
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-blue-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {editingBanner 
                        ? "Uploading new image will automatically delete the old one from server" 
                        : "Banner image is required for creation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">3</span>
                  <span>Schedule</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
{/* Start Date Time */}
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Start Date & Time <span className="text-red-400">*</span>
  </label>
  <input
    type="datetime-local"
    // required 
    value={formData.startDate}
    onChange={(e) =>
      setFormData({ ...formData, startDate: e.target.value })
    }
    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  />
</div>

{/* End Date Time */}
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    End Date & Time <span className="text-red-400">*</span>
  </label>
  <input
    type="datetime-local"
    // required 
    value={formData.endDate}
    onChange={(e) =>
      setFormData({ ...formData, endDate: e.target.value })
    }
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
                  disabled={!formData.title.trim() || (!editingBanner && !imageFile)}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {editingBanner ? "Update Banner" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* View Details Modal - FINAL OPTIMIZED */}
{viewingBanner && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Banner Details
            </h2>
            <p className="text-slate-300 text-xs mt-1 font-medium">ID: {viewingBanner.id}</p>
          </div>
          <button
            onClick={() => setViewingBanner(null)}
            className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Basic Information */}
          <div className="space-y-4">
            {/* Title */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-slate-300 font-semibold whitespace-nowrap pt-1">Title:</span>
                <p className="text-base font-bold text-white text-right flex-1">{viewingBanner.title || 'Untitled'}</p>
              </div>
            </div>

            {/* Banner Type, Status & Display Order */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300 font-semibold">Banner Type:</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${
                  viewingBanner.bannerType === 'Offer' ? 'bg-green-500/10 text-green-400' :
                  viewingBanner.bannerType === 'FlashSale' ? 'bg-red-500/10 text-red-400' :
                  viewingBanner.bannerType === 'Seasonal' ? 'bg-orange-500/10 text-orange-400' :
                  viewingBanner.bannerType === 'Category' ? 'bg-blue-500/10 text-blue-400' :
                  viewingBanner.bannerType === 'Promotional' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-cyan-500/10 text-cyan-400'
                }`}>
                  <Tag className="h-4 w-4 mr-1.5" />
                  {viewingBanner.bannerType || 'Homepage'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300 font-semibold">Status:</span>
                <span className={`inline-flex px-3 py-1.5 rounded text-sm font-bold ${
                  viewingBanner.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {viewingBanner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300 font-semibold">Display Order:</span>
                <span className="text-white font-bold text-lg">{viewingBanner.displayOrder || 0}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-300 font-semibold mb-2">Description:</p>
              <div
                className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: viewingBanner.description || "No description",
                }}
              />
            </div>

            {/* Link URL */}
            {viewingBanner.link && (
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 font-semibold mb-2">Link URL:</p>
                <a
                  href={viewingBanner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1 break-all font-medium"
                >
                  {viewingBanner.link}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {/* Banner Image */}
            {viewingBanner.imageUrl && (
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 font-semibold mb-3">Banner Image:</p>
                <div className="rounded-lg overflow-hidden border-2 border-violet-500/20 cursor-pointer hover:border-violet-500/50 transition-all">
                  <img
                    src={getImageUrl(viewingBanner.imageUrl)}
                    alt={viewingBanner.title}
                    className="w-full h-auto object-cover hover:scale-105 transition-transform"
                    onClick={() => setSelectedImageUrl(getImageUrl(viewingBanner.imageUrl))}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono break-all">
                  {viewingBanner.imageUrl}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Offer Details + Schedule */}
          <div className="space-y-4">
            {/* Offer Details - LARGER */}
            {(viewingBanner.offerCode || viewingBanner.discountPercentage || viewingBanner.offerText || viewingBanner.buttonText) && (
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  Offer Details
                </h3>
                <div className="space-y-4">
                  {viewingBanner.offerCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 font-semibold">Offer Code:</span>
                      <span className="text-white font-mono font-bold text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        {viewingBanner.offerCode}
                      </span>
                    </div>
                  )}

                  {viewingBanner.discountPercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300 font-semibold">Discount:</span>
                      <span className="text-green-400 font-extrabold text-2xl">{viewingBanner.discountPercentage}% OFF</span>
                    </div>
                  )}

                  {viewingBanner.offerText && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <p className="text-sm text-slate-300 font-semibold mb-2">Offer Text:</p>
                      <p className="text-slate-100 text-sm leading-relaxed">{viewingBanner.offerText}</p>
                    </div>
                  )}

                  {viewingBanner.buttonText && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-slate-300 font-semibold">Button Text:</span>
                      <span className="text-white font-bold text-base">{viewingBanner.buttonText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule & Activity - LARGER */}
            <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-400" />
                Schedule & Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300 font-semibold">Start Date:</span>
                  <span className="text-slate-100 text-sm font-medium">
                    {viewingBanner.startDate ? new Date(viewingBanner.startDate).toLocaleString() : 'Not set'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300 font-semibold">End Date:</span>
                  <span className="text-slate-100 text-sm font-medium">
                    {viewingBanner.endDate ? new Date(viewingBanner.endDate).toLocaleString() : 'Not set'}
                  </span>
                </div>

                <div className="border-t border-slate-700/50 my-3"></div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300 font-semibold">Created At:</span>
                  <span className="text-slate-100 text-sm font-medium">
                    {viewingBanner.createdAt ? new Date(viewingBanner.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300 font-semibold">Updated At:</span>
                  <span className="text-slate-100 text-sm font-medium">
                    {viewingBanner.updatedAt ? new Date(viewingBanner.updatedAt).toLocaleString() : 'Never updated'}
                  </span>
                </div>

                <div className="border-t border-slate-700/50 my-3"></div>

                <div className="py-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-slate-300 font-semibold whitespace-nowrap">Created By:</span>
                    <span className="text-slate-100 text-sm font-medium text-right break-all">
                      {viewingBanner.createdBy || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-semibold">Updated By:</span>
                    <span className="text-slate-100 text-sm font-medium">
                      {viewingBanner.updatedBy || 'Never updated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
        <button
          onClick={() => {
            setViewingBanner(null);
            handleEdit(viewingBanner);
          }}
          className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/40"
        >
          <Edit className="h-4 w-4" />
          Edit Banner
        </button>
        <button
          onClick={() => setViewingBanner(null)}
          className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


      {/* Banner Delete Confirmation */}
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

      <ConfirmDialog
  isOpen={!!statusConfirm}
  onClose={() => setStatusConfirm(null)}
  onConfirm={async () => {
    if (!statusConfirm) return;

    await bannersService.update(statusConfirm.id, {
      isActive: !statusConfirm.isActive
    });

    toast.success("Status updated!");
    setStatusConfirm(null);
    fetchBanners();
  }}
  title="Change Status"
  message="Are you sure you want to change banner status?"
  confirmText="Yes, Change"
/>


      {/* Image Preview Modal */}
      {selectedImageUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedImageUrl(null)}>
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
