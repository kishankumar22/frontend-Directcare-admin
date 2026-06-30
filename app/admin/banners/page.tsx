"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, CheckCircle, Image as ImageIcon, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Calendar, ExternalLink, Tag, Monitor, Smartphone } from "lucide-react";
 
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import { ProductDescriptionEditor } from "../_components/SelfHostedEditor";
import { Banner, bannersService, BannerStats } from "@/lib/services";
import { extractFilename, formatDate, getImageUrl } from "../_utils/formatUtils";
import { getBackendMessage } from "@/app/admin/_utils/errorUtils";

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
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);
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
    const res = await bannersService.restore(id);
    if (res.error) {
      toast.error(getBackendMessage(res));
      return;
    }
    toast.success("Banner restored successfully!");
    fetchBanners();
  } catch (error: any) {
    toast.error(getBackendMessage(error));
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
    mobileImageUrl: "",
    link: "",
    description: "",
    bannerType: "Homepage",
    offerCode: "",
    discountPercentage: 0,
    offerText: "",
    buttonText: "",
    isActive: true,
 displayOrder: "" as number | "",
    startDate: "",
    endDate: ""
  });


  const handleImageFileChange = (file: File) => {
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    toast.success("Desktop image selected! Will be replaced on save.");
  };

  const handleMobileImageFileChange = (file: File) => {
    setMobileImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMobileImagePreview(previewUrl);
    toast.success("Mobile image selected! Will be replaced on save.");
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

    if (response.error) {
      toast.error(getBackendMessage(response));
      return;
    }

    const rawData = response.data?.data;

    const bannersData: Banner[] = Array.isArray(rawData)
      ? rawData
      : rawData
      ? [rawData]
      : [];

    setBanners(bannersData);
    calculateStats(bannersData);
  } catch (error) {
    toast.error(getBackendMessage(error));
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
  // if (!formData.startDate || !formData.startDate.trim()) {
  //   toast.error("Start date & time is required");
  //   return;
  // }

  // if (!formData.endDate || !formData.endDate.trim()) {
  //   toast.error("End date & time is required");
  //   return;
  // }

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

  // // Check if dates are valid
  // if (isNaN(start.getTime())) {
  //   toast.error("Invalid start date format");
  //   return;
  // }

  // if (isNaN(end.getTime())) {
  //   toast.error("Invalid end date format");
  //   return;
  // }

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
    let finalMobileImageUrl = formData.mobileImageUrl;

    // DESKTOP IMAGE UPLOAD
    if (imageFile) {
      try {
        const uploadResponse = await bannersService.uploadImage(imageFile, {
          title: formData.title,
        });

        if (uploadResponse.error) {
          throw new Error(uploadResponse.error);
        }

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(uploadResponse.data?.message || "Image upload failed");
        }

        finalImageUrl = uploadResponse.data.data;

        // Delete old desktop image if editing
        if (editingBanner?.imageUrl && editingBanner.imageUrl !== finalImageUrl) {
          const filename = extractFilename(editingBanner.imageUrl);
          if (filename) {
            try {
              await bannersService.deleteImage(filename);
            } catch (err: any) {
              const msg = err?.message || "";
              if (msg.includes("Image file not found")) {
                console.log("⚠️ Image already deleted:", filename);
              } else {
                console.error("❌ Delete image error:", err);
              }
            }
          }
        }
      } catch (uploadErr: any) {
        console.error("Error uploading image:", uploadErr);
        toast.error(getBackendMessage(uploadErr));
        return;
      }
    }

    // MOBILE IMAGE UPLOAD
    if (mobileImageFile) {
      try {
        const uploadResponse = await bannersService.uploadImage(mobileImageFile, {
          title: `${formData.title}-mobile`,
        });

        if (uploadResponse.error) {
          throw new Error(uploadResponse.error);
        }

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(uploadResponse.data?.message || "Mobile image upload failed");
        }

        finalMobileImageUrl = uploadResponse.data.data;

        // Delete old mobile image if editing
        if (editingBanner?.mobileImageUrl && editingBanner.mobileImageUrl !== finalMobileImageUrl) {
          const filename = extractFilename(editingBanner.mobileImageUrl);
          if (filename) {
            try {
              await bannersService.deleteImage(filename);
            } catch (err: any) {
              const msg = err?.message || "";

              if (msg.includes("Image file not found")) {
                console.log("⚠️ Mobile image already deleted:", filename);
              } else {
                console.error("❌ Delete mobile image error:", err);
              }
            }
          }
        }
      } catch (uploadErr: any) {
        console.error("Error uploading mobile image:", uploadErr);
        toast.error(getBackendMessage(uploadErr));
        return;
      }
    }

    // FINAL PAYLOAD
    const payload = {
      title: formData.title.trim(),
      imageUrl: finalImageUrl,
      mobileImageUrl: finalMobileImageUrl || null,
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
     displayOrder:
  formData.displayOrder === "" ? undefined : Number(formData.displayOrder),
      startDate: formData.startDate, // Now guaranteed to exist
      endDate: formData.endDate,     // Now guaranteed to exist
      ...(editingBanner && { id: editingBanner.id }),
    };

    // ✅ SINGLE CREATE/UPDATE CALL
    if (editingBanner) {
      const res = await bannersService.update(editingBanner.id, payload);
      if (res.error) {
        toast.error(getBackendMessage(res));
        return;
      }
      toast.success("Banner updated successfully!");
    } else {
      const res = await bannersService.create(payload);
      if (res.error) {
        toast.error(getBackendMessage(res));
        return;
      }
      toast.success("Banner created successfully!");
    }

    // CLEANUP
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (mobileImagePreview) URL.revokeObjectURL(mobileImagePreview);
    setImageFile(null);
    setImagePreview(null);
    setMobileImageFile(null);
    setMobileImagePreview(null);

    await fetchBanners();
    setShowModal(false);
    resetForm();
  } catch (error: any) {
    console.error("Error:", error);
    toast.error(getBackendMessage(error));
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
      mobileImageUrl: banner.mobileImageUrl || "",
      link: banner.link || "",
      description: banner.description || "",
      bannerType: banner.bannerType || "Homepage",
      offerCode: banner.offerCode || "",
      discountPercentage: banner.discountPercentage || 0,
      offerText: banner.offerText || "",
      buttonText: banner.buttonText || "",
      isActive: banner.isActive,
      displayOrder:
      banner.displayOrder === 0 ? "" : banner.displayOrder,
      startDate: banner.startDate ? banner.startDate.slice(0, 16) : "",
      endDate: banner.endDate ? banner.endDate.slice(0, 16) : "",
    });

    setImageFile(null);
    setImagePreview(null);
    setMobileImageFile(null);
    setMobileImagePreview(null);
    
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await bannersService.delete(id);
      if (response.error) {
        toast.error(getBackendMessage(response));
        return;
      }
      toast.success("Banner deleted successfully! 🗑️");
      await fetchBanners();
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      toast.error(getBackendMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      imageUrl: "",
      mobileImageUrl: "",
      link: "",
      description: "",
      bannerType: "Homepage",
      offerCode: "",
      discountPercentage: 0,
      offerText: "",
      buttonText: "",
      isActive: true,
      displayOrder: "" as number | "",
      startDate: "",
      endDate: "",
    });
    setEditingBanner(null);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setMobileImageFile(null);
    if (mobileImagePreview) URL.revokeObjectURL(mobileImagePreview);
    setMobileImagePreview(null);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setBannerTypeFilter("all");
    setDeletedFilter("notDeleted")
   
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || bannerTypeFilter !== "all" || searchTerm.trim() !== "" || deletedFilter !== "notDeleted";

  const filteredBanners = banners.filter(banner => {
    const matchesSearch = banner.title?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
                         banner.description?.toLowerCase().includes(searchTerm.toLowerCase().trim());
    
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
          <p className="text-slate-500 dark:text-slate-400">Loading banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">

{/* Header */}
<div className="flex flex-wrap items-center justify-between gap-3">

  <div>
    <h1 className="text-xl font-semibold bg-gradient-to-r from-violet-650 via-cyan-650 to-pink-650 dark:from-violet-400 dark:via-cyan-400 dark:to-pink-400 bg-clip-text   ">
      Banner Management
    </h1>
    <p className="text-[12px] text-slate-500 dark:text-slate-400">
    Manage promotional banners for your store. 
    </p>
  </div>

  <button
    onClick={() => {
      resetForm();
      setShowModal(true);
    }}
    className="px-3 py-1.5 text-[11px] bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-md flex items-center gap-1.5 hover:opacity-90"
  >
    <Plus className="h-3 w-3" />
    Add Banner 
  </button>
</div>


{/* Stats Cards (COMPACT) */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">

  {/* Total */}
  <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/10 rounded-md flex items-center justify-center">
        <ImageIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Total</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {stats.totalBanners}
        </p>
      </div>
    </div>
  </div>

  {/* Active */}
  <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-green-50 dark:bg-green-500/10 rounded-md flex items-center justify-center">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Active</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {stats.activeBanners}
        </p>
      </div>
    </div>
  </div>

  {/* Inactive */}
  <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-md flex items-center justify-center">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Inactive</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {stats.inactiveBanners}
        </p>
      </div>
    </div>
  </div>

  {/* Upcoming */}
  <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-sm">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-cyan-50 dark:bg-cyan-500/10 rounded-md flex items-center justify-center">
        <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Upcoming</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          {stats.upcomingBanners}
        </p>
      </div>
    </div>
  </div>

</div>


{/* Items Per Page (SAME SYSTEM EVERYWHERE) */}
<div className="bg-slate-55 dark:bg-slate-900/40 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">

  <div className="flex items-center justify-between gap-2 flex-wrap">

    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">Show</span>

      <select
        value={itemsPerPage}
        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-[11px]"
      >
        <option value={25} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">25</option>
        <option value={50} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">50</option>
        <option value={75} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">75</option>
        <option value={100} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">100</option>
      </select>

      <span className="text-[11px] text-slate-500 dark:text-slate-400">per page</span>
    </div>

    <div className="text-[11px] text-slate-500 dark:text-slate-400">
      <span className="text-slate-900 dark:text-white font-medium">{startIndex + 1}</span>
      {" – "}
      <span className="text-slate-900 dark:text-white font-medium">
        {Math.min(endIndex, totalItems)}
      </span>
      {" of "}
      <span className="text-slate-900 dark:text-white font-medium">{totalItems}</span>
    </div>

  </div>
</div>
 

      {/* Search and Filters */}
<div className="bg-slate-55 dark:bg-slate-900/40 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">

  <div className="flex flex-wrap items-center gap-2">

    {/* Search */}
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
      <input
        type="search"
        placeholder="Search banners..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-[12px] focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
    </div>

    {/* Status */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className={`p-2 text-[11px] rounded-md border bg-white dark:bg-slate-800 ${
        statusFilter !== "all"
          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-white font-medium"
          : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
      }`}
    >
      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Status</option>
      <option value="active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Active</option>
      <option value="inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Inactive</option>
    </select>

    {/* Type */}
    <select
      value={bannerTypeFilter}
      onChange={(e) => setBannerTypeFilter(e.target.value)}
      className={`p-2 text-[11px] rounded-md border bg-white dark:bg-slate-800 ${
        bannerTypeFilter !== "all"
          ? "border-violet-500 bg-violet-55 dark:bg-violet-500/10 bg-violet-55 text-violet-750 dark:text-white font-medium"
          : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
      }`}
    >
      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Type</option>
      <option value="Homepage" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Homepage</option>
      <option value="Offer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Offer</option>
      <option value="Promotional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Promotional</option>
      <option value="Category" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Category</option>
      <option value="Seasonal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Seasonal</option>
      <option value="FlashSale" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Flash</option>
    </select>

    {/* Deleted */}
    <select
      value={deletedFilter}
      onChange={(e) => setDeletedFilter(e.target.value)}
      className={`p-2 text-[11px] rounded-md border bg-white dark:bg-slate-800 ${
        deletedFilter !== "notDeleted"
          ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-white font-medium"
          : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
      }`}
    >
      <option value="notDeleted" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Live</option>
      <option value="deleted" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Deleted</option>
    </select>

    {/* Clear */}
    {hasActiveFilters && (
      <button
        onClick={clearFilters}
        className="p-2 text-[11px] bg-red-55 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center gap-1 transition-all"
      >
        <FilterX className="h-3 w-3" />
        Clear
      </button>
    )}

    {/* Count */}
    <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
      {totalItems} banners
    </div>
  </div>
</div>

      {/* Banners List */}
   {/* Banners List */}
<div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">

  {currentData.length === 0 ? (
    <div className="text-center py-10">
      <ImageIcon className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
      <p className="text-slate-650 dark:text-slate-400 text-sm">
        {banners.length === 0
          ? "No banners found. Create your first banner!"
          : "No banners match your search criteria."}
      </p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">

        {/* HEADER */}
        <thead className="bg-slate-50 dark:bg-slate-800/40">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="text-left py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Banner</th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Banner Type</th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Status</th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Display Order</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Date  Start</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Date End</th>
            <th className="text-left py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Created At   </th>
            <th className="text-center py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {currentData.map((banner) => (
            <tr
              key={banner.id}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >

              {/* Banner Info */}
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">

                  {/* Image */}
                  {banner.imageUrl ? (
                    <div
                      className="w-14 h-9 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:ring-1 hover:ring-violet-500"
                      onClick={() => setSelectedImageUrl(getImageUrl(banner.imageUrl))}
                    >
                      <img
                        src={getImageUrl(banner.imageUrl)}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-9 rounded-md bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                  )}

                  {/* Text */}
                  <div className="min-w-0">
                    <p
                      className="text-slate-900 dark:text-white text-[12px] font-medium truncate cursor-pointer hover:text-violet-650 dark:hover:text-violet-400"
                      onClick={() => setViewingBanner(banner)}
                    >
                      {banner.title || "Untitled Banner"}
                    </p>

                    <p
                      className="text-[10px] text-slate-500 dark:text-slate-400 truncate"
                      dangerouslySetInnerHTML={{
                        __html: banner.description
                          ? banner.description.length > 50
                            ? banner.description.slice(0, 50) + "..."
                            : banner.description
                          : "No description",
                      }}
                    />

                   {banner.link && (
  <a
    href={banner.link}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1 group cursor-pointer"
  >
    <ExternalLink className="h-3 w-3 text-slate-500 dark:text-slate-400 group-hover:text-violet-650 dark:group-hover:text-violet-400 transition-colors" />
    
    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate group-hover:text-violet-650 dark:group-hover:text-violet-400 group-hover:underline transition-all">
      {banner.link}
    </span>
  </a>
)}
                  </div>
                </div>
              </td>

              {/* Type */}
              <td className="py-2 px-3 text-center">
                <span className={`px-2 p-2 rounded-md text-[10px] font-medium ${
                  banner.bannerType === 'Offer' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                  banner.bannerType === 'FlashSale' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                  banner.bannerType === 'Seasonal' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                  banner.bannerType === 'Category' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                  banner.bannerType === 'Promotional' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                  'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
                }`}>
                  {banner.bannerType || "Homepage"}
                </span>
              </td>

              {/* Status */}
              <td className="py-2 px-3 text-center">
                <div className="flex flex-col items-center gap-1">

                  <button
                    onClick={() => setStatusConfirm(banner)}
                    className={`px-2 py-0.5 text-[10px] rounded-md ${
                      banner.isActive
                        ? "bg-green-55 dark:bg-green-500/10 bg-green-50 text-green-750 dark:text-green-400"
                        : "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {banner.isActive ? "Active" : "Inactive"}
                  </button>

                  {(() => {
                    const status = getBannerStatus(banner);
                    const map = {
                      LIVE: "text-green-600 dark:text-green-400 font-medium",
                      EXPIRED: "text-red-600 dark:text-red-400 font-medium",
                      SCHEDULED: "text-yellow-600 dark:text-yellow-400 font-medium",
                      INACTIVE: "text-slate-500 dark:text-slate-400",
                    };
                    return (
                      <span className={`text-[10px] ${(map as any)[status]}`}>
                        {status}
                      </span>
                    );
                  })()}

                </div>
              </td>

              {/* Order */}
              <td className="py-2 px-3 text-center text-[11px] text-slate-755 dark:text-slate-300">
             {banner.displayOrder === 0 ? "-" : banner.displayOrder}
              </td>

              {/* Dates */}
              <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
            {formatDate(banner.startDate)}
              </td>

              <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">    {formatDate(banner.endDate)}
              </td>

              <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                 {formatDate(banner.createdAt)}
              </td>

              {/* Actions */}
              <td className="py-2 px-3 text-center">
                <div className="flex justify-center gap-1.5">

                  <button
                    onClick={() => setViewingBanner(banner)}
                    className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-md transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-md transition"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {banner.isDeleted ? (
                    <button
                      onClick={() => handleRestore(banner.id)}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-md transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setDeleteConfirm({ id: banner.id, title: banner.title })
                      }
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-55 dark:hover:bg-red-500/10 rounded-md transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-550 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-955 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-955 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm text-slate-550 dark:text-slate-400">
              Total: {totalItems} items
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-violet-500/20 rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header: changed from-violet-500/10 to from-indigo-500/10 to avoid wildcard white text rule */}
            <div className="p-4 border-b border-slate-100 dark:border-violet-500/20 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 dark:from-indigo-950/20 dark:to-cyan-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-cyan-600 to-pink-600 dark:from-violet-400 dark:via-cyan-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {editingBanner ? `Edit Banner` : 'Create New Banner'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {editingBanner ? 'Update banner information' : 'Add a new banner to your website'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-red-600 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Basic Information */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-55 dark:bg-slate-800/30 bg-slate-50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm text-white">1</span>
                  <span>Basic Information</span>
                </h3>
                <div className="space-y-4">
                  {/* Row 1: Title & Banner Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Banner Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Enter banner title"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Banner Type *</label>
                      <select
                        required
                        value={formData.bannerType}
                        onChange={(e) => setFormData({...formData, bannerType: e.target.value})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                      >
                        <option value="Homepage" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Homepage</option>
                        <option value="Offer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Offer</option>
                        <option value="Promotional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Promotional</option>
                        <option value="Category" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Category</option>
                        <option value="Seasonal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Seasonal</option>
                        <option value="FlashSale" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Flash Sale</option>
                      </select>
                    </div>
                  </div>


                  {/* Row 2: Display Order & Link */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Display Order</label>
                      <input
  type="number"
  value={formData.displayOrder ?? ""}
  onChange={(e) => {
    const val = e.target.value;

    setFormData({
      ...formData,
      displayOrder: val === "" ? "" : Number(val),
    });
  }}
  placeholder="Enter display order"
  min="1"
  className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
/>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Banner Link URL (Optional)</label>
                      <input
                        type="url"
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                        placeholder="https://example.com/your-link"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Offer Code {(formData.bannerType === "Offer" || formData.bannerType === "FlashSale") && "*"}
                          </label>
                          <input
                            type="text"
                            value={formData.offerCode}
                            onChange={(e) => setFormData({...formData, offerCode: e.target.value})}
                            placeholder="SUMMER2025"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Discount % {(formData.bannerType === "Offer" || formData.bannerType === "FlashSale") && "*"}
                          </label>
                          <input
                            type="number"
                            value={formData.discountPercentage || ''}
                            onChange={(e) => setFormData({...formData, discountPercentage: Number(e.target.value)})}
                            placeholder="20"
                            min="0"
                            max="100"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Row 4: Offer Text & Button Text */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Offer Text</label>
                          <input
                            type="text"
                            value={formData.offerText}
                            onChange={(e) => setFormData({...formData, offerText: e.target.value})}
                            placeholder="Get 50% Off on Summer Collection!"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Button Text</label>
                          <input
                            type="text"
                            value={formData.buttonText}
                            onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                            placeholder="Shop Now"
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-405 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
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
              <div className="bg-slate-55 dark:bg-slate-800/30 bg-slate-50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-white" />
                  </span>
                  <span>Desktop Banner Image *</span>
                </h3>

                <div className="space-y-4">
                  {(imagePreview || formData.imageUrl) && (
                    <div className="flex items-center gap-4 p-3 bg-slate-100 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div
                        className="w-20 h-12 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
                        onClick={() => setSelectedImageUrl(imagePreview || getImageUrl(formData.imageUrl))}
                      >
                        <img
                          src={imagePreview || getImageUrl(formData.imageUrl)}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                           onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-white font-medium">
                          {imagePreview ? "New Image Selected" : "Current Image"}
                        </p>
                        <p className="text-xs text-slate-550 dark:text-slate-400">
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
                              ? "bg-slate-200 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                              : "bg-violet-50 dark:bg-violet-500/20 text-violet-750 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/30"
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
                            className="px-3 py-2 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/30 transition-all text-sm font-medium"
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
                            ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 cursor-not-allowed opacity-50"
                            : "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 group"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload
                            className={`w-8 h-8 mb-4 transition-colors ${
                              !formData.title
                                ? "text-slate-400 dark:text-slate-600"
                                : "text-slate-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                            }`}
                          />
                          <p className={`mb-2 text-sm ${!formData.title ? "text-slate-400 dark:text-slate-600" : "text-slate-500 dark:text-slate-500"}`}>
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
                  
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {editingBanner
                        ? "Uploading new image will automatically delete the old one from server"
                        : "Desktop banner image is required for creation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Banner Image Section */}
              <div className="bg-slate-55 dark:bg-slate-800/30 bg-slate-50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <span>Mobile Banner Image</span>
                  <span className="text-xs text-slate-550 dark:text-slate-400 font-normal ml-1">(optional)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">If set, this image will be shown on mobile devices. Otherwise the desktop image will be used.</p>

                <div className="space-y-4">
                  {(mobileImagePreview || formData.mobileImageUrl) && (
                    <div className="flex items-center gap-4 p-3 bg-slate-105 dark:bg-slate-900/30 bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div
                        className="w-20 h-12 rounded-lg overflow-hidden border-2 border-pink-500/30 cursor-pointer hover:border-pink-500 transition-all"
                        onClick={() => setSelectedImageUrl(mobileImagePreview || getImageUrl(formData.mobileImageUrl))}
                      >
                        <img
                          src={mobileImagePreview || getImageUrl(formData.mobileImageUrl)}
                          alt="Mobile banner preview"
                          className="w-full h-full object-cover"
                           onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-white font-medium">
                          {mobileImagePreview ? "New Mobile Image Selected" : "Current Mobile Image"}
                        </p>
                        <p className="text-xs text-slate-550 dark:text-slate-400">
                          {mobileImagePreview ? "Will replace on save" : "Click to view full size"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <label className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all bg-pink-50 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/30">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMobileImageFileChange(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (mobileImagePreview) URL.revokeObjectURL(mobileImagePreview);
                            setMobileImageFile(null);
                            setMobileImagePreview(null);
                            setFormData(prev => ({ ...prev, mobileImageUrl: "" }));
                          }}
                          className="px-3 py-2 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/30 transition-all text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {!formData.mobileImageUrl && !mobileImagePreview && (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-4 pb-5">
                          <Smartphone className="w-7 h-7 mb-2 text-slate-400 dark:text-slate-500 group-hover:text-pink-600 dark:group-hover:text-pink-450 transition-colors" />
                          <p className="text-sm text-slate-500">
                            <span className="font-semibold">Click to upload</span> mobile image
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Recommended: 768×400px or similar portrait/narrow ratio</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMobileImageFileChange(file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="bg-slate-55 dark:bg-slate-800/30 bg-slate-50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm text-white">3</span>
                  <span>Schedule</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
{/* Start Date Time */}
<div>
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
    Start Date & Time <span className="text-red-400">*</span>
  </label>
  <input
    type="datetime-local"
    // required 
    value={formData.startDate}
    onChange={(e) =>
      setFormData({ ...formData, startDate: e.target.value })
    }
    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  />
</div>

{/* End Date Time */}
<div>
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
    End Date & Time <span className="text-red-400">*</span>
  </label>
  <input
    type="datetime-local"
    // required 
    value={formData.endDate}
    onChange={(e) =>
      setFormData({ ...formData, endDate: e.target.value })
    }
    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  />
</div>

                </div>
              </div>

              {/* Settings */}
              <div className="bg-slate-55 dark:bg-slate-800/30 bg-slate-50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm text-white">4</span>
                  <span>Settings</span>
                </h3>
                <div>
                  <label className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-violet-650 dark:group-hover:text-violet-400 transition-colors">Active</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Banner will be visible on the website</p>
                    </div>
                  </label>
                </div>
              </div>
              </div>

              <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/50 px-4 py-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-all font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.title.trim() || (!editingBanner && !imageFile)}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 text-white rounded-xl hover:shadow-xl hover:shadow-violet-500/50 transition-all font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
    <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
      <div className="p-4 border-b border-slate-200 dark:border-violet-500/20 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 dark:from-indigo-950/20 dark:to-cyan-950/20">
        <div className="flex items-start justify-between gap-4">

  {/* LEFT CONTENT */}
  <div className="flex flex-col gap-1">

    {/* Heading */}
    <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-cyan-600 to-pink-600 dark:from-violet-400 dark:via-cyan-400 dark:to-pink-400 bg-clip-text text-transparent">
      Banner Details
    </h2>

    {/* Title + Link */}
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-base font-semibold text-slate-900 dark:text-white">
        {viewingBanner.title || 'Untitled'}
      </p>

      {viewingBanner.link && (
        <a
          href={viewingBanner.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 text-sm transition-all hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="truncate max-w-[200px]">
            Open Link
          </span>
        </a>
      )}
    </div>

  </div>

  {/* CLOSE BUTTON */}
  <button
    onClick={() => setViewingBanner(null)}
    className="flex items-center justify-center w-9 h-9 rounded-lg 
               bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700
               text-slate-500 dark:text-slate-400 hover:text-red-650 dark:hover:text-white 
               hover:bg-red-50 dark:hover:bg-red-500/20 hover:border-red-200 dark:hover:border-red-500/50
               transition-all"
  >
    ✕
  </button>

</div>
      </div>
      
      <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Left Column - Basic Information */}
          <div className="space-y-2">
      
            {/* Banner Type, Status & Display Order */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Banner Type:</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${
                  viewingBanner.bannerType === 'Offer' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                  viewingBanner.bannerType === 'FlashSale' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                  viewingBanner.bannerType === 'Seasonal' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                  viewingBanner.bannerType === 'Category' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                  viewingBanner.bannerType === 'Promotional' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                  'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
                }`}>
                  <Tag className="h-4 w-4 mr-1.5" />
                  {viewingBanner.bannerType || 'Homepage'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Status:</span>
                <span className={`inline-flex px-3 py-1.5 rounded text-sm font-bold ${
                  viewingBanner.isActive ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                }`}>
                  {viewingBanner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Display Order:</span>
                <span className="text-slate-900 dark:text-white font-bold text-lg">{viewingBanner.displayOrder || 0}</span>
              </div>
            </div>

       

            {/* Banner Image */}
<div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* DESKTOP IMAGE */}
    {viewingBanner.imageUrl && (
      <div>
        <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-2 font-semibold">Desktop Image</p>

        <div
          className="rounded-lg overflow-hidden border-2 border-violet-500/20 cursor-pointer hover:border-violet-500"
          onClick={() => setSelectedImageUrl(getImageUrl(viewingBanner.imageUrl))}
        >
          <img
            src={getImageUrl(viewingBanner.imageUrl)}
            alt="Desktop Banner"
            className="w-full h-48 object-cover"
          />
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 break-all">
          {viewingBanner.imageUrl}
        </p>
      </div>
    )}

    {/* MOBILE IMAGE */}
    {viewingBanner.mobileImageUrl && (
      <div>
        <p className="text-xs text-pink-600 dark:text-pink-400 mb-2 font-semibold">Mobile Image</p>

        <div
          className="rounded-lg overflow-hidden border-2 border-pink-500/20 cursor-pointer hover:border-pink-500"
          onClick={() =>
  setSelectedImageUrl(
    getImageUrl(viewingBanner.mobileImageUrl ?? undefined)
  )
}
        >
          <img
            src={getImageUrl(viewingBanner.mobileImageUrl)}
            alt="Mobile Banner"
            className="w-full h-48 object-contain bg-black"
          />
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 break-all">
          {viewingBanner.mobileImageUrl}
        </p>
      </div>
    )}

  </div>
</div>
          </div>

          {/* Right Column - Offer Details + Schedule */}
          <div className="space-y-2">
            {/* Offer Details - LARGER */}
            {(viewingBanner.offerCode || viewingBanner.discountPercentage || viewingBanner.offerText || viewingBanner.buttonText) && (
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  Offer Details
                </h3>
                <div className="space-y-4">
                  {viewingBanner.offerCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Offer Code:</span>
                      <span className="text-violet-600 dark:text-white font-mono font-bold text-lg bg-gradient-to-r from-violet-650 to-cyan-655 dark:from-violet-400 dark:to-cyan-400 bg-clip-text dark:text-transparent">
                        {viewingBanner.offerCode}
                      </span>
                    </div>
                  )}

                  {viewingBanner.discountPercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Discount:</span>
                      <span className="text-green-600 dark:text-green-400 font-extrabold text-2xl">{viewingBanner.discountPercentage}% OFF</span>
                    </div>
                  )}

                  {viewingBanner.offerText && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                      <p className="text-sm text-slate-650 dark:text-slate-300 font-semibold mb-2">Offer Text:</p>
                      <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed">{viewingBanner.offerText}</p>
                    </div>
                  )}

                  {viewingBanner.buttonText && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Button Text:</span>
                      <span className="text-slate-900 dark:text-white font-bold text-base">{viewingBanner.buttonText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}


     {/* Description */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <p className="text-sm text-slate-650 dark:text-slate-300 font-semibold mb-2">Description:</p>
              <div
                className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: viewingBanner.description || "No description",
                }}
              />
            </div>
            {/* Schedule & Activity - LARGER */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Schedule & Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Start Date:</span>
                  <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                     {formatDate(viewingBanner.startDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">End Date:</span>
                  <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                      {formatDate(viewingBanner.endDate)}
                  </span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/50 my-3"></div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Created At:</span>
                  <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                    {formatDate(viewingBanner.createdAt)}
                  </span>
                </div>
                <div className="py-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold whitespace-nowrap">Created By:</span>
                    <span className="text-slate-800 dark:text-slate-100 text-sm font-medium text-right break-all">
                      {viewingBanner.createdBy || 'Unknown'}
                    </span>
                  </div>

                  
                </div>


                <div className="border-t border-slate-200 dark:border-slate-700/50 my-3"></div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Updated At:</span>
                  <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
         
                      {formatDate(viewingBanner.updatedAt )}
                  </span>
                </div>

                <div className="py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-650 dark:text-slate-300 font-semibold">Updated By:</span>
                    <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                      {(viewingBanner.updatedBy)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
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
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-all font-bold text-sm"
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

          try {
            const payload = {
              ...statusConfirm, // 🔥 FULL OBJECT
              id: statusConfirm.id, // 🔥 MUST
              isActive: !statusConfirm.isActive // 🔥 only change
            };

            const res = await bannersService.update(statusConfirm.id, payload);
            if (res.error) {
              toast.error(getBackendMessage(res));
              return;
            }

            toast.success("Status updated!");
            setStatusConfirm(null);
            await fetchBanners();

          } catch (error: any) {
            toast.error(getBackendMessage(error));
          }
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
               onError={(e) => (e.currentTarget.src = "/placeholder.png")}
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
