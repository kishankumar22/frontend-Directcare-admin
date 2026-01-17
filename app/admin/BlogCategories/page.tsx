"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, FolderTree, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, CheckCircle, Tag, FileText, TrendingUp, Clock, ChevronDown } from "lucide-react";
import { ProductDescriptionEditor } from "../products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { API_BASE_URL } from "@/lib/api";
import { blogCategoriesService, BlogCategory } from "@/lib/services/blogCategories";

interface BlogCategoryStats {
  totalCategories: number;
  totalSubCategories: number;
  totalPosts: number;
  activeCategories: number;
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [stats, setStats] = useState<BlogCategoryStats>({
    totalCategories: 0,
    totalSubCategories: 0,
    totalPosts: 0,
    activeCategories: 0
  });

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

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

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

  useEffect(() => {
    fetchBlogCategories();
  }, []);

const fetchBlogCategories = async () => {
  try {
    const response = await blogCategoriesService.getAll();
    const allCategoriesData = response.data?.data || [];
    
    // ✅ Type-safe filtering
    const rootCategories = allCategoriesData.filter(
      (category): category is BlogCategory => !category.parentCategoryId
    );
    
    // ✅ Type-safe hierarchy building
    const categoriesWithHierarchy: BlogCategory[] = rootCategories.map(rootCategory => {
      // Find direct children
      const directChildren = allCategoriesData.filter(
        cat => cat.parentCategoryId === rootCategory.id
      );
      
      // Ensure subCategories is BlogCategory[], not string[]
      const existingSubCategories = Array.isArray(rootCategory.subCategories) 
        ? rootCategory.subCategories.filter((sub): sub is BlogCategory => 
            typeof sub === 'object' && sub !== null && 'id' in sub
          )
        : [];
      
      // Merge unique subcategories
      const allSubCategories: BlogCategory[] = [
        ...existingSubCategories,
        ...directChildren.filter(child => 
          !existingSubCategories.some(sub => sub.id === child.id)
        )
      ];
      
      return {
        ...rootCategory,
        subCategories: allSubCategories
      } as BlogCategory;
    });
    
    setBlogCategories(categoriesWithHierarchy);
    calculateStats(allCategoriesData);
    
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    toast.error("Failed to load blog categories");
  } finally {
    setLoading(false);
  }
};


const calculateStats = (allCategoriesData: BlogCategory[]) => {
  // Count root categories only
  const rootCategoriesCount = allCategoriesData.filter(
    cat => !cat.parentCategoryId
  ).length;
  
  // Count subcategories
  const subCategoriesCount = allCategoriesData.filter(
    cat => cat.parentCategoryId
  ).length;
  
  // Sum all blog posts (from both root and subcategories)
  const totalPosts = allCategoriesData.reduce((sum, cat) => 
    sum + (cat.blogPostCount || 0), 0
  );
  
  // Count active categories (both root and sub)
  const activeCategories = allCategoriesData.filter(
    cat => cat.isActive
  ).length;

  setStats({
    totalCategories: rootCategoriesCount,
    totalSubCategories: subCategoriesCount,
    totalPosts,
    activeCategories
  });
};


  useEffect(() => {
    const handleFocus = () => {
      if (!showModal) {
        fetchBlogCategories();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [showModal]);

  const handleImageFileChange = (file: File) => {
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    toast.success("Image selected! Click Create/Update to upload.");
  };

  const handleDeleteImage = async (categoryId: string, imageUrl: string) => {
    setIsDeletingImage(true);
    try {
      const filename = extractFilename(imageUrl);
      await blogCategoriesService.deleteImage(filename);
      toast.success("Image deleted successfully! 🗑️");

      setBlogCategories(prev =>
        prev.map(c =>
          c.id === categoryId ? { ...c, imageUrl: "" } : c
        )
      );
      if (editingBlogCategory?.id === categoryId) {
        setFormData(prev => ({ ...prev, imageUrl: "" }));
      }
      if (viewingBlogCategory?.id === categoryId) {
        setViewingBlogCategory(prev =>
          prev ? { ...prev, imageUrl: "" } : null
        );
      }
    } catch (error: any) {
      console.error("Error deleting image:", error);
      if (error.response?.status === 401) {
        toast.error("Please login again");
      } else {
        toast.error(error.response?.data?.message || "Failed to delete image");
      }
    } finally {
      setIsDeletingImage(false);
      setImageDeleteConfirm(null);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ============================================
  // 1. BLOG CATEGORY NAME VALIDATION
  // ============================================
  
  const categoryName = formData.name.trim();

  // Empty check
  if (!categoryName) {
    toast.error("❌ Blog category name is required");
    return;
  }

  // Length validation
  if (categoryName.length < 2 || categoryName.length > 100) {
    toast.error(`❌ Category name must be between 2 and 100 characters. Current: ${categoryName.length}`);
    return;
  }

  // ✅ Character validation (alphanumeric + safe special chars)
  const nameRegex = /^[A-Za-z0-9\s\-&/()]+$/;
  if (!nameRegex.test(categoryName)) {
    toast.error("❌ Category name can only contain letters, numbers, spaces, -, &, /, ()");
    return;
  }

  // Duplicate check
  const isDuplicateName = blogCategories.some(
    cat =>
      cat.name.toLowerCase().trim() === categoryName.toLowerCase() &&
      cat.id !== editingBlogCategory?.id
  );
  if (isDuplicateName) {
    toast.error("❌ A category with this name already exists!");
    return;
  }

  // ============================================
  // 2. DESCRIPTION VALIDATION
  // ============================================
  
  const description = formData.description.trim();

  // Min length
  if (description.length < 10) {
    toast.error(`❌ Description must be at least 10 characters. Current: ${description.length}`);
    return;
  }

  // ✅ Max length (Industry Standard)
  if (description.length > 1000) {
    toast.error(`❌ Description cannot exceed 1000 characters. Current: ${description.length}`);
    return;
  }

  // ============================================
  // 3. SLUG VALIDATION
  // ============================================
  
  const slug = generateSlug(formData.slug || formData.name);
  
  // ✅ Slug format validation (URL-safe)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    toast.error("❌ Slug must be lowercase alphanumeric with hyphens only");
    return;
  }

  // ✅ Slug length check
  if (slug.length < 2 || slug.length > 100) {
    toast.error(`❌ Slug must be between 2 and 100 characters. Current: ${slug.length}`);
    return;
  }

  // ✅ Slug duplicate check
  const isDuplicateSlug = blogCategories.some(
    cat =>
      cat.slug === slug &&
      cat.id !== editingBlogCategory?.id
  );
  if (isDuplicateSlug) {
    toast.error("❌ A category with this slug already exists!");
    return;
  }

  // ============================================
  // 4. PARENT CATEGORY VALIDATION
  // ============================================
  
  if (formData.parentCategoryId) {
    // Check if parent exists
    const parentExists = blogCategories.find(
      cat => cat.id === formData.parentCategoryId
    );
    
    if (!parentExists) {
      toast.error("❌ Selected parent category does not exist");
      return;
    }

    // ✅ Check if parent is active
    if (!parentExists.isActive) {
      toast.error("❌ Cannot add subcategory to an inactive parent category");
      return;
    }

    // ✅ Prevent circular reference
    if (editingBlogCategory && formData.parentCategoryId === editingBlogCategory.id) {
      toast.error("❌ Category cannot be its own parent");
      return;
    }
  }

  // ============================================
  // 5. DISPLAY ORDER VALIDATION
  // ============================================
  
  // Valid number check
  if (isNaN(formData.displayOrder)) {
    toast.error("❌ Display order must be a valid number");
    return;
  }

  // ✅ Integer check
  if (!Number.isInteger(formData.displayOrder)) {
    toast.error("❌ Display order must be a whole number (no decimals)");
    return;
  }

  // ✅ Range validation
  if (formData.displayOrder < 1 || formData.displayOrder > 1000) {
    toast.error("❌ Display order must be between 1 and 1000");
    return;
  }

  // ============================================
  // 6. META FIELDS VALIDATION
  // ============================================
  
  // Meta Title
  if (formData.metaTitle) {
    const metaTitle = formData.metaTitle.trim();
    
    if (metaTitle.length > 60) {
      toast.error(`❌ Meta title must be less than 60 characters. Current: ${metaTitle.length}`);
      return;
    }

    // ✅ Whitespace check
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

    // ✅ Whitespace check
    if (/^\s+$/.test(formData.metaDescription)) {
      toast.error("❌ Meta description cannot contain only spaces");
      return;
    }
  }

  // Meta Keywords
  if (formData.metaKeywords) {
    const metaKeywords = formData.metaKeywords.trim();
    
    if (metaKeywords.length > 255) {
      toast.error(`❌ Meta keywords must be less than 255 characters. Current: ${metaKeywords.length}`);
      return;
    }

    // ✅ Whitespace check
    if (/^\s+$/.test(formData.metaKeywords)) {
      toast.error("❌ Meta keywords cannot contain only spaces");
      return;
    }

    // ✅ Format validation (comma-separated)
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

  // ✅ SEO Page Name validation
  if (formData.searchEngineFriendlyPageName) {
    const seoName = formData.searchEngineFriendlyPageName.trim();
    
    if (seoName.length > 200) {
      toast.error(`❌ SEO page name must be less than 200 characters. Current: ${seoName.length}`);
      return;
    }

    // URL-safe check
    const seoRegex = /^[a-z0-9\-]+$/;
    if (!seoRegex.test(seoName)) {
      toast.error("❌ SEO page name must be lowercase alphanumeric with hyphens only");
      return;
    }
  }

  // ============================================
  // 7. IMAGE VALIDATION - WebP ONLY (User Request)
  // ============================================
  
  if (imageFile) {
    // ✅ ONLY WebP allowed
    const allowedTypes = ['image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Type validation (WebP ONLY)
    if (!allowedTypes.includes(imageFile.type)) {
      toast.error("❌ Only WebP images are allowed for blog categories");
      return;
    }

    // Size validation
    if (imageFile.size > maxSize) {
      const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
      toast.error(`❌ Image size must be less than 10MB. Current: ${sizeMB}MB`);
      return;
    }

    // ✅ File name length
    if (imageFile.name.length > 255) {
      toast.error("❌ Image file name is too long (max 255 characters)");
      return;
    }

    // ✅ Dimension validation (Industry Standard)
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          
          const MIN_WIDTH = 200;
          const MAX_WIDTH = 5000;
          const MIN_HEIGHT = 200;
          const MAX_HEIGHT = 5000;
          
          if (img.width < MIN_WIDTH || img.width > MAX_WIDTH) {
            reject(`Image width must be between ${MIN_WIDTH}px and ${MAX_WIDTH}px. Current: ${img.width}px`);
            return;
          }
          
          if (img.height < MIN_HEIGHT || img.height > MAX_HEIGHT) {
            reject(`Image height must be between ${MIN_HEIGHT}px and ${MAX_HEIGHT}px. Current: ${img.height}px`);
            return;
          }
          
          resolve();
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject('Invalid or corrupted WebP image file');
        };
        
        img.src = url;
      });
    } catch (error: any) {
      toast.error(`❌ ${error}`);
      return;
    }
  }

  // ============================================
  // 8. PREVENT DUPLICATE SUBMISSION
  // ============================================
  
  if (isSubmitting) {
    toast.error("⏳ Please wait, processing...");
    return;
  }
  
  setIsSubmitting(true);

  try {
    let finalImageUrl = formData.imageUrl;

    // ============================================
    // 9. IMAGE UPLOAD
    // ============================================
    
    if (imageFile) {
      try {
        const uploadResponse = await blogCategoriesService.uploadImage(imageFile, {
          title: formData.name,
        });

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(
            uploadResponse.data?.message || "Image upload failed"
          );
        }

        finalImageUrl = uploadResponse.data.data;
        toast.success("✅ WebP image uploaded successfully!");
        
        // Delete old image if exists
        if (
          editingBlogCategory?.imageUrl &&
          editingBlogCategory.imageUrl !== finalImageUrl
        ) {
          const filename = extractFilename(editingBlogCategory.imageUrl);
          if (filename) {
            try {
              await blogCategoriesService.deleteImage(filename);
            } catch (err) {
              // Silently fail - old image deletion is non-critical
            }
          }
        }
      } catch (uploadErr: any) {
        toast.error(
          uploadErr?.response?.data?.message || "Failed to upload image"
        );
        setIsSubmitting(false);
        return;
      }
    }

    // ============================================
    // 10. PREPARE PAYLOAD
    // ============================================
    
    const payload = {
      name: categoryName, // Already trimmed and validated
      description: description, // Already trimmed and validated
      slug: slug, // Already validated
      imageUrl: finalImageUrl,
      isActive: formData.isActive,
      displayOrder: formData.displayOrder,
      parentCategoryId: formData.parentCategoryId || null,
      metaTitle: formData.metaTitle?.trim() || undefined,
      metaDescription: formData.metaDescription?.trim() || undefined,
      metaKeywords: formData.metaKeywords?.trim() || undefined,
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName?.trim() || undefined,
      ...(editingBlogCategory && { id: editingBlogCategory.id }),
    };

    // ============================================
    // 11. API CALL WITH ERROR HANDLING
    // ============================================
    
    if (editingBlogCategory) {
      await blogCategoriesService.update(editingBlogCategory.id, payload);
      toast.success("✅ Blog Category updated successfully! 🎉");
    } else {
      await blogCategoriesService.create(payload);
      toast.success("✅ Blog Category created successfully! 🎉");
    }

    // ============================================
    // 12. CLEANUP
    // ============================================
    
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    await fetchBlogCategories();
    setShowModal(false);
    resetForm();

  } catch (error: any) {
    // ============================================
    // 13. ENHANCED ERROR HANDLING
    // ============================================
    
    let message = "Failed to save blog category";
    
    if (error?.response?.status === 400) {
      message = error?.response?.data?.message || "Invalid data provided";
    } else if (error?.response?.status === 401) {
      message = "Session expired. Please login again";
    } else if (error?.response?.status === 403) {
      message = "Access denied. You don't have permission";
    } else if (error?.response?.status === 409) {
      message = "Category with this name or slug already exists";
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
      if (error?.response?.status === 401) {
        toast.error("Please login again");
      } else {
        toast.error("Failed to delete blog category");
      }
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

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
      parentCategoryId: blogCategory.parentCategoryId || "",
    });
    
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
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
      parentCategoryId: "",
    });
    setEditingBlogCategory(null);
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const getParentCategoryOptions = () => {
    return blogCategories.filter(cat => {
      if (editingBlogCategory && cat.id === editingBlogCategory.id) return false;
      return true;
    });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "all" || searchTerm.trim() !== "";

  const filteredBlogCategories = blogCategories.filter(blogCategory => {
    const matchesSearch = blogCategory.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && blogCategory.isActive) ||
                         (statusFilter === "inactive" && !blogCategory.isActive);
    return matchesSearch && matchesStatus;
  });

// ✅ FIXED - getFlattenedCategories function
const getFlattenedCategories = () => {
  const flattened: Array<BlogCategory & { level: number; parentId?: string }> = [];
  
  filteredBlogCategories.forEach(blogCategory => {
    // Add parent category
    flattened.push({ ...blogCategory, level: 0 });
    
    // Add subcategories if parent is expanded
    if (expandedCategories.has(blogCategory.id) && blogCategory.subCategories && blogCategory.subCategories.length > 0) {
      blogCategory.subCategories.forEach((subCat) => {
        // ✅ FIX: Check if subCat is an object (BlogCategory type)
        if (typeof subCat === 'object' && subCat !== null) {
          flattened.push({ 
            ...subCat as BlogCategory, // Type assertion
            level: 1, 
            parentId: blogCategory.id 
          });
        }
      });
    }
  });
  
  return flattened;
};


  const totalItems = filteredBlogCategories.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  const currentData = getFlattenedCategories().slice(startIndex, endIndex);

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
  }, [searchTerm, statusFilter]);

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
            Blog Categories Management
          </h1>
          <p className="text-slate-400 mt-1">Manage blog categories and hierarchies</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Blog Category
        </button>
      </div>

      {/* Stats Cards */}
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
              <FolderTree className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Subcategories</p>
              <p className="text-white text-2xl font-bold">{stats.totalSubCategories}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-pink-400" />
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
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium mb-1">Active Categories</p>
              <p className="text-white text-2xl font-bold">{stats.activeCategories}</p>
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
            {totalItems} categor{totalItems !== 1 ? 'ies' : 'y'}
          </div>
        </div>
      </div>

      {/* Blog Categories Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No blog categories found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Category Name</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Posts</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Created At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Updated At</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Updated By</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((blogCategory) => {
                  const hasSubcategories = blogCategory.level === 0 && blogCategory.subCategories && blogCategory.subCategories.length > 0;
                  const isExpanded = expandedCategories.has(blogCategory.id);
                  const isSubcategory = blogCategory.level === 1;
                  const isInactive = !blogCategory.isActive;
                  const parentCategory = isSubcategory 
                    ? blogCategories.find(c => c.id === (blogCategory.parentCategoryId || blogCategory.parentId))
                    : null;
                  
                  return (
                 // ✅ FIXED - Unique key generation
<tr 
  key={`${blogCategory.id}-level-${blogCategory.level || 0}-${blogCategory.parentId || 'root'}`}
  className={`border-b border-slate-800 transition-all ${
    isSubcategory ? 'bg-slate-800/10' : ''
  } ${
    isInactive 
      ? 'opacity-50 hover:opacity-60 grayscale-[30%]' 
      : 'hover:bg-slate-800/30'
  }`}
>

                      {/* Category Name Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {hasSubcategories && (
                            <button
                              onClick={() => toggleCategoryExpansion(blogCategory.id)}
                              className={`p-1.5 rounded-lg transition-all shrink-0 ${
                                isInactive 
                                  ? 'hover:bg-slate-700/30 cursor-not-allowed' 
                                  : 'hover:bg-slate-700/50'
                              }`}
                              disabled={isInactive}
                              title={isInactive ? "Inactive category" : (isExpanded ? "Collapse" : "Expand")}
                            >
                              {isExpanded ? (
                                <ChevronDown className={`h-4 w-4 ${isInactive ? 'text-slate-600' : 'text-violet-400'}`} />
                              ) : (
                                <ChevronRight className={`h-4 w-4 ${isInactive ? 'text-slate-600' : 'text-slate-400'}`} />
                              )}
                            </button>
                          )}
                          
                          {!hasSubcategories && !isSubcategory && (
                            <div className="w-7 shrink-0"></div>
                          )}
                          
                          {isSubcategory && (
                            <div className="flex items-center shrink-0" style={{ width: '28px', height: '40px' }}>
                              <div className="relative w-full h-full">
                                <div className={`absolute left-3 top-0 w-px h-1/2 bg-gradient-to-b ${
                                  isInactive 
                                    ? 'from-slate-600/30 to-slate-600/40' 
                                    : 'from-cyan-500/40 to-cyan-500/60'
                                }`}></div>
                                <div className={`absolute left-3 top-1/2 w-3 h-px bg-gradient-to-r ${
                                  isInactive 
                                    ? 'from-slate-600/40 to-slate-600/30' 
                                    : 'from-cyan-500/60 to-cyan-500/40'
                                }`}></div>
                                <div className={`absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                                  isInactive ? 'bg-slate-600/40' : 'bg-cyan-400/60'
                                }`}></div>
                              </div>
                            </div>
                          )}
                          
                          {blogCategory.imageUrl ? (
                            <div
                              className={`w-10 h-10 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 relative ${
                                isInactive 
                                  ? 'border-slate-700/50 hover:ring-1 hover:ring-slate-600' 
                                  : 'border-slate-700 hover:ring-2 hover:ring-violet-500'
                              }`}
                              onClick={() => !isInactive && setSelectedImageUrl(getImageUrl(blogCategory.imageUrl))}
                            >
                              <img
                                src={getImageUrl(blogCategory.imageUrl)}
                                alt={blogCategory.name}
                                className={`w-full h-full object-cover ${
                                  isInactive ? 'grayscale' : ''
                                }`}
                              />
                              {isInactive && (
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isInactive 
                                ? 'bg-slate-700/50' 
                                : (isSubcategory 
                                    ? 'bg-gradient-to-br from-cyan-500/70 to-blue-500/70' 
                                    : 'bg-gradient-to-br from-violet-500 to-pink-500')
                            }`}>
                              <FolderTree className={`h-5 w-5 ${isInactive ? 'text-slate-500' : 'text-white'}`} />
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`font-medium cursor-pointer transition-colors ${
                                  isInactive 
                                    ? 'text-slate-500 hover:text-slate-400' 
                                    : (isSubcategory 
                                        ? 'text-cyan-300 hover:text-cyan-200' 
                                        : 'text-white hover:text-violet-400')
                                }`}
                                onClick={() => setViewingBlogCategory(blogCategory)}
                              >
                                {blogCategory.name}
                              </p>

                              {hasSubcategories && (
                                <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border ${
                                  isInactive 
                                    ? 'bg-slate-700/50 text-slate-500 border-slate-600/50' 
                                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                }`}>
                                  {blogCategory.subCategories?.length} sub
                                </span>
                              )}
                              
                              {isInactive && (
                                <span className="shrink-0 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-xs font-medium border border-amber-500/20 flex items-center gap-1">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 15.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  Archived
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              {isSubcategory && parentCategory ? (
                                <div className="flex items-center gap-1.5">
                                  <svg className={`h-3 w-3 ${isInactive ? 'text-slate-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <span className={`text-xs ${isInactive ? 'text-slate-600' : 'text-slate-400'}`}>in</span>
                                  <span className={`text-xs font-medium ${isInactive ? 'text-slate-600' : 'text-cyan-400'}`}>{parentCategory.name}</span>
                                  <span className={`text-xs ${isInactive ? 'text-slate-700' : 'text-slate-600'}`}>•</span>
                                  <span className={`text-xs ${isInactive ? 'text-slate-600' : 'text-slate-500'}`}>{blogCategory.slug}</span>
                                </div>
                              ) : (
                                <span className={`text-xs ${isInactive ? 'text-slate-600' : 'text-slate-500'}`}>{blogCategory.slug}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Posts Count */}
                     <td className="py-4 px-4 text-center">
  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
    isInactive 
      ? 'bg-slate-700/30 text-slate-600' 
      : (blogCategory.blogPostCount && blogCategory.blogPostCount > 0 
          ? 'bg-cyan-500/10 text-cyan-400' 
          : 'bg-slate-700/30 text-slate-500')
  }`}>
    {blogCategory.blogPostCount || 0}
  </span>
</td>

                      
                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                          blogCategory.isActive
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            blogCategory.isActive ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          {blogCategory.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      
                      {/* Display Order */}
                      <td className="py-4 px-4 text-center">
                        <span className={`font-mono text-sm ${isInactive ? 'text-slate-600' : 'text-slate-300'}`}>
                          {blogCategory.displayOrder}
                        </span>
                      </td>
                      
                      {/* Created At */}
                      <td className="py-4 px-4 text-sm">
                        {blogCategory.createdAt ? (
                          <div className="flex flex-col">
                            <span className={`font-medium ${isInactive ? 'text-slate-600' : 'text-slate-300'}`}>
                              {new Date(blogCategory.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className={`text-xs ${isInactive ? 'text-slate-700' : 'text-slate-500'}`}>
                              {new Date(blogCategory.createdAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      
                      {/* Updated At */}
                      <td className="py-4 px-4 text-sm">
                        {blogCategory.updatedAt ? (
                          <div className="flex flex-col">
                            <span className={`font-medium ${isInactive ? 'text-slate-600' : 'text-slate-300'}`}>
                              {new Date(blogCategory.updatedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className={`text-xs ${isInactive ? 'text-slate-700' : 'text-slate-500'}`}>
                              {new Date(blogCategory.updatedAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      
                      {/* Updated By */}
                      <td className="py-4 px-4">
                        {blogCategory.updatedBy ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              isInactive 
                                ? 'bg-slate-600' 
                                : 'bg-gradient-to-br from-violet-500 to-cyan-500'
                            }`}>
                              {blogCategory.updatedBy.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-sm truncate max-w-[150px] ${isInactive ? 'text-slate-600' : 'text-slate-300'}`} title={blogCategory.updatedBy}>
                              {blogCategory.updatedBy}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingBlogCategory(blogCategory)}
                            className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all relative z-10"
                            style={{ opacity: 1 }} 
                            title={isInactive ? "View archived category" : "View details"}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEdit(blogCategory)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all relative z-10"
                            style={{ opacity: 1 }}  
                            title={isInactive ? "Edit archived category" : "Edit category"}
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => !isInactive && setDeleteConfirm({ 
                              id: blogCategory.id, 
                              name: blogCategory.name 
                            })}
                            disabled={isInactive}
                            className={`p-2 rounded-lg transition-all relative z-10 ${
                              isInactive 
                                ? 'text-slate-600 cursor-not-allowed' 
                                : 'text-red-400 hover:bg-red-500/10'
                            }`}
                            style={{ opacity: 1 }}  
                            title={isInactive ? "Delete disabled for archived categories" : "Delete category"}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* CREATE/EDIT MODAL - I'll send in next message due to length */}
      {viewingBlogCategory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            {/* Modal Header */}
            <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {viewingBlogCategory.imageUrl ? (
                    <div 
                      className="w-20 h-20 rounded-xl overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all flex-shrink-0"
                      onClick={() => setSelectedImageUrl(getImageUrl(viewingBlogCategory.imageUrl))}
                    >
                      <img
                        src={getImageUrl(viewingBlogCategory.imageUrl)}
                        alt={viewingBlogCategory.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <FolderTree className="h-10 w-10 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {viewingBlogCategory.name}
                    </h2>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {viewingBlogCategory.slug}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        viewingBlogCategory.isActive
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {viewingBlogCategory.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {viewingBlogCategory.blogPostCount || 0} Posts
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingBlogCategory(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all flex-shrink-0"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Description */}
              {viewingBlogCategory.description && (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </h3>
                  <div 
                    className="text-slate-300 prose prose-sm max-w-none prose-invert"
                    dangerouslySetInnerHTML={{ __html: viewingBlogCategory.description }}
                  />
                </div>
              )}

              {/* Category Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Display Order
                  </h3>
                  <p className="text-white text-xl font-bold">{viewingBlogCategory.displayOrder}</p>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    Parent Category
                  </h3>
                  <p className="text-white font-medium">
                    {viewingBlogCategory.parentCategoryName || 'Root Category'}
                  </p>
                </div>
              </div>

              {/* SEO Information */}
              {(viewingBlogCategory.metaTitle || viewingBlogCategory.metaDescription || viewingBlogCategory.metaKeywords || viewingBlogCategory.searchEngineFriendlyPageName) && (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    SEO Information
                  </h3>
                  <div className="space-y-3">
                    {viewingBlogCategory.metaTitle && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Meta Title</p>
                        <p className="text-slate-300">{viewingBlogCategory.metaTitle}</p>
                      </div>
                    )}
                    {viewingBlogCategory.metaDescription && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Meta Description</p>
                        <p className="text-slate-300 text-sm">{viewingBlogCategory.metaDescription}</p>
                      </div>
                    )}
                    {viewingBlogCategory.metaKeywords && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Meta Keywords</p>
                        <p className="text-slate-300 text-sm">{viewingBlogCategory.metaKeywords}</p>
                      </div>
                    )}
                    {viewingBlogCategory.searchEngineFriendlyPageName && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">SEO Friendly Name</p>
                        <p className="text-slate-300 text-sm">{viewingBlogCategory.searchEngineFriendlyPageName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingBlogCategory.createdAt && (
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Created At
                    </h3>
                    <p className="text-white text-sm">{new Date(viewingBlogCategory.createdAt).toLocaleString()}</p>
                    {viewingBlogCategory.createdBy && (
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {viewingBlogCategory.createdBy}
                      </p>
                    )}
                  </div>
                )}

                {viewingBlogCategory.updatedAt && (
                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Updated At
                    </h3>
                    <p className="text-white text-sm">{new Date(viewingBlogCategory.updatedAt).toLocaleString()}</p>
                    {viewingBlogCategory.updatedBy && (
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {viewingBlogCategory.updatedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setViewingBlogCategory(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingBlogCategory);
                    setViewingBlogCategory(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-6 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
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
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Basic Information */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">1</span>
                  <span>Basic Information</span>
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Blog Category Name <span className="text-red-400">*</span>
                      </label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        placeholder="blog-category-slug (auto-generated)"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        min="0"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Parent Category</label>
                      <select
                        value={formData.parentCategoryId}
                        onChange={(e) => setFormData({...formData, parentCategoryId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      >
                        <option value="">None (Root Category)</option>
                        {getParentCategoryOptions().map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <ProductDescriptionEditor
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

              {/* Image Section */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">2</span>
                  <span>Category Image</span>
                </h3>

                <div className="space-y-4">
                  {/* Current/Preview Image */}
                  {(imagePreview || formData.imageUrl) && (
                    <div className="flex items-center gap-4 p-4 bg-slate-900/30 rounded-xl border border-slate-600">
                      <div
                        className="w-24 h-24 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all flex-shrink-0"
                        onClick={() => setSelectedImageUrl(imagePreview || getImageUrl(formData.imageUrl))}
                      >
                        <img
                          src={imagePreview || getImageUrl(formData.imageUrl)}
                          alt="Category preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">
                          {imagePreview ? "New Image Selected" : "Current Image"}
                        </p>
                        <p className="text-xs text-slate-400 mb-2">
                          {imagePreview ? "Will replace old image on save" : "Click to view full size"}
                        </p>
                        {!imagePreview && formData.imageUrl && (
                          <p className="text-xs text-slate-500 break-all">Path: {formData.imageUrl}</p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <label className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30">
                          Change
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

                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                              setImagePreview(null);
                              setImageFile(null);
                            } else if (formData.imageUrl) {
                              setImageDeleteConfirm({
                                categoryId: editingBlogCategory?.id || '',
                                imageUrl: formData.imageUrl,
                                categoryName: formData.name
                              });
                            }
                          }}
                          className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload New Image */}
                  {!imagePreview && !formData.imageUrl && (
                    <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-violet-500/50 transition-all">
                      <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-300 font-medium mb-2">Upload Category Image</p>
                      <p className="text-slate-500 text-sm mb-4">PNG, JPG, WebP up to 10MB</p>
                      <label className="px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all inline-flex items-center gap-2 cursor-pointer font-medium">
                        <Upload className="h-4 w-4" />
                        Choose Image
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
                </div>
              </div>

              {/* SEO Section */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">3</span>
                  <span>SEO Settings</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Title</label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                      placeholder="SEO meta title (recommended: 50-60 characters)"
                      maxLength={60}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">{formData.metaTitle.length}/60 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Description</label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                      placeholder="SEO meta description (recommended: 150-160 characters)"
                      rows={3}
                      maxLength={160}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">{formData.metaDescription.length}/160 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Keywords</label>
                    <input
                      type="text"
                      value={formData.metaKeywords}
                      onChange={(e) => setFormData({...formData, metaKeywords: e.target.value})}
                      placeholder="keyword1, keyword2, keyword3"
                      maxLength={255}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">SEO Friendly Page Name</label>
                    <input
                      type="text"
                      value={formData.searchEngineFriendlyPageName}
                      onChange={(e) => setFormData({...formData, searchEngineFriendlyPageName: e.target.value})}
                      placeholder="seo-friendly-page-name"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Settings Section */}
              <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">4</span>
                  <span>Status Settings</span>
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 bg-slate-900/50 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-slate-300 font-medium cursor-pointer select-none">
                    Active (Category will be visible)
                  </label>
                </div>
              </div>

              {/* Form Actions */}
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
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {editingBlogCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingBlogCategory ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Update Category
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create Category
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        title="Delete Blog Category"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon={AlertCircle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/50"
        isLoading={isDeleting}
      />

      {/* Image Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!imageDeleteConfirm}
        onClose={() => setImageDeleteConfirm(null)}
        onConfirm={() => {
          if (imageDeleteConfirm) {
            handleDeleteImage(imageDeleteConfirm.categoryId, imageDeleteConfirm.imageUrl);
          }
        }}
        title="Delete Category Image"
        message={`Are you sure you want to delete the image for "${imageDeleteConfirm?.categoryName}"?`}
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
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <img
              src={selectedImageUrl}
              alt="Full size preview"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute top-4 right-4 p-3 bg-slate-900/90 text-white rounded-xl hover:bg-slate-800 transition-all backdrop-blur-sm border border-slate-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
