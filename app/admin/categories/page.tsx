"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, FolderTree, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, CheckCircle, ChevronDown, ChevronRight as ChevronRightIcon, X } from "lucide-react";
import { ProductDescriptionEditor } from "../products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { API_BASE_URL } from "@/lib/api";
import { categoriesService, Category, CategoryStats } from "@/lib/services/categories";

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const MAX_HOMEPAGE_CATEGORIES = 15;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
// Add after other useState declarations
const [homepageCategories, setHomepageCategories] = useState<Category[]>([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [stats, setStats] = useState<CategoryStats>({
    totalCategories: 0,
    totalSubCategories: 0,
    totalProducts: 0,
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
    imageUrl: "",
    isActive: true,
    showOnHomepage: false,  // ✅ ADD THIS LINE
    sortOrder: 0,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
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
const extractFilename = (imageUrl: string) => {
  if (!imageUrl) return "";
  const parts = imageUrl.split('/');
  return parts[parts.length - 1];
};

const getImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  const cleanUrl = imageUrl.split('?')[0];
  return `${API_BASE_URL}${cleanUrl}`;
};

// Add this NEW helper function after getCategoryLevel
const getMaxDepthOfSubtree = (category: Category, allCategories: Category[]): number => {
  if (!category.subCategories || category.subCategories.length === 0) {
    return 0; // No children = depth 0
  }
  
  let maxDepth = 0;
  category.subCategories.forEach(child => {
    const childDepth = getMaxDepthOfSubtree(child, allCategories);
    maxDepth = Math.max(maxDepth, childDepth + 1);
  });
  
  return maxDepth;
};

  useEffect(() => {
    fetchCategories();
  }, []);

const fetchCategories = async () => {
  try {
    const response = await categoriesService.getAll({
      params: { includeInactive: true, includeSubCategories: true }
    });
    
    const categoriesData = response.data?.data || [];
    
    // ✅ Recursive function to sort categories and subcategories
    const sortRecursive = (cats: Category[]): Category[] => {
      return cats
        .map(cat => ({
          ...cat,
          // ✅ Fixed: Check if subCategories exists and has length
          subCategories: cat.subCategories && cat.subCategories.length > 0 
            ? sortRecursive(cat.subCategories) 
            : (cat.subCategories || []) // ✅ Fixed: Default to empty array if undefined
        }))
        .sort((a, b) => {
          // Active categories first
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          // Then by creation date (newest first)
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
    };
    
    const sortedCategories = sortRecursive(categoriesData);
    
    setCategories([...sortedCategories]);
    calculateStats(sortedCategories);
    
  } catch (error) {
    console.error("Error fetching categories:", error);
  } finally {
    setLoading(false);
  }
};


  const calculateStats = (categoriesData: Category[]) => {
    const totalCategories = categoriesData.length;
    const totalSubCategories = categoriesData.reduce((count, cat) => {
      return count + (cat.subCategories?.length || 0);
    }, 0);
    const totalProducts = categoriesData.reduce((count, cat) => {
      return count + (cat.productCount || 0);
    }, 0);
    const activeCategories = categoriesData.filter(cat => cat.isActive).length;

    setStats({
      totalCategories,
      totalSubCategories,
      totalProducts,
      activeCategories
    });
  };

  const findCategoryById = (id: string, categories: Category[]): Category | null => {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.subCategories && cat.subCategories.length > 0) {
        const found = findCategoryById(id, cat.subCategories);
        if (found) return found;
      }
    }
    return null;
  };

  const getCategoryLevel = (category: Category, allCategories: Category[]): number => {
    let level = 0;
    let currentId = category.parentCategoryId;
    
    while (currentId) {
      level++;
      const parent = findCategoryById(currentId, allCategories);
      if (!parent) break;
      currentId = parent.parentCategoryId;
    }
    
    return level;
  };

  const isDescendantOf = (
    category: Category, 
    ancestorId: string, 
    allCategories: Category[]
  ): boolean => {
    let currentId = category.parentCategoryId;
    
    while (currentId) {
      if (currentId === ancestorId) return true;
      const parent = findCategoryById(currentId, allCategories);
      if (!parent) break;
      currentId = parent.parentCategoryId;
    }
    
    return false;
  };

  const getAvailableParents = (
    categories: Category[], 
    currentCategoryId?: string
  ): Category[] => {
    const availableParents: Category[] = [];
    
    const addIfValid = (cat: Category, level: number) => {
      if (currentCategoryId && cat.id === currentCategoryId) return;
      if (currentCategoryId && isDescendantOf(cat, currentCategoryId, categories)) return;
      
      if (level < 2) {
        availableParents.push({ ...cat, level } as any);
      }
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(subCat => addIfValid(subCat, level + 1));
      }
    };
    
    categories.forEach(cat => addIfValid(cat, 0));
    return availableParents;
  };

  useEffect(() => {
    const handleFocus = () => {
      fetchCategories();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

const handleImageFileChange = (file: File) => {
  setImageFile(file);
  const previewUrl = URL.createObjectURL(file);
  setImagePreview(previewUrl);
  toast.success("Image selected! Click Create/Update to upload.");
};

  const handleAddSubcategory = (parentId: string, parentName: string) => {
    const parent = findCategoryById(parentId, categories);
    if (!parent) {
      toast.error('Parent category not found');
      return;
    }
    
    const parentLevel = getCategoryLevel(parent, categories);
    
    if (parentLevel >= 2) {
      toast.error('🚫 Maximum 3 levels allowed! Cannot create subcategory here.');
      return;
    }
    
    setSelectedParentId(parentId);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      isActive: true,
      showOnHomepage: false,  // ✅ ADD THIS LINE
      sortOrder: 1,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      parentCategoryId: parentId
    });
    setShowModal(true);
  };
// Calculate homepage categories count
useEffect(() => {
  const categoriesOnHomepage = categories.filter(cat => cat.showOnHomepage);
  setHomepageCategories(categoriesOnHomepage);
}, [categories]);
const homepageCount = homepageCategories.length;
const handleDeleteImage = async (categoryId: string, imageUrl: string) => {
  setIsDeletingImage(true);
  try {
    const filename = extractFilename(imageUrl);
    await categoriesService.deleteImage(filename);
    toast.success("✅ Image deleted successfully! 🗑️");

    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId ? { ...c, imageUrl: "" } : c
      )
    );
    if (editingCategory?.id === categoryId) {
      setFormData(prev => ({ ...prev, imageUrl: "" }));
    }
    if (viewingCategory?.id === categoryId) {
      setViewingCategory(prev =>
        prev ? { ...prev, imageUrl: "" } : null
      );
    }
  } catch (error: any) {
    console.error("❌ Error deleting image:", error);
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
  // 1. NAME VALIDATION (Industry Standard)
  // ============================================
const name = formData.name?.trim();

if (!name) {
  toast.error("❌ Category name is required");
  return;
}

const CATEGORY_NAME_REGEX = /^[A-Za-z0-9\s,()&'’\-]+$/;

if (!CATEGORY_NAME_REGEX.test(name)) {
  toast.error(
    "❌ Category name may contain letters, numbers, spaces, commas (,), &, -, ' and () only"
  );
  return;
}



  // Length validation
  if (name.length < 3 || name.length > 100) {
    toast.error(`❌ Category name must be between 3 and 100 characters. Current: ${name.length}`);
    return;
  }

  // Duplicate check
  const isDuplicateName = categories.some(
    cat =>
      cat.name.toLowerCase().trim() === name.toLowerCase() &&
      cat.id !== editingCategory?.id
  );
  if (isDuplicateName) {
    toast.error("❌ A category with this name already exists!");
    return;
  }



// ============================================
// 2. DESCRIPTION VALIDATION (Industry Standard)
// ============================================

const description = formData.description.trim();

// Single check handles both empty and min length
// if (description.length < 10) {
//   toast.error(`❌ Description must be at least 10 characters. Current: ${description.length}`);
//   return;
// }

// Max length
if (description.length > 1000) {
  toast.error(`❌ Description cannot exceed 1000 characters. Current: ${description.length}`);
  return;
}


  // ============================================
  // 3. PARENT CATEGORY VALIDATION
  // ============================================
  
  if (formData.parentCategoryId) {
    // Check if parent exists
    const parentExists = findCategoryById(formData.parentCategoryId, categories);
    if (!parentExists) {
      toast.error("❌ Selected parent category does not exist");
      return;
    }

    // Check if parent is active
    if (!parentExists.isActive) {
      toast.error("❌ Cannot add subcategory to an inactive parent category");
      return;
    }

    // Check depth limit (max 3 levels)
    const parentLevel = getCategoryLevel(parentExists, categories);
    if (parentLevel >= 2) {
      toast.error("❌ Maximum 3 levels allowed! Cannot add subcategory here");
      return;
    }

    // ✅ Circular reference check (Industry Standard)
    if (editingCategory) {
      let currentId: string | null | undefined = formData.parentCategoryId;
      const visited = new Set<string>();
      let hasCircular = false;

      while (currentId) {
        if (visited.has(currentId) || currentId === editingCategory.id) {
          hasCircular = true;
          break;
        }
        visited.add(currentId);
        const parent = findCategoryById(currentId, categories);
        currentId = parent?.parentCategoryId;
      }

      if (hasCircular) {
        toast.error("❌ Circular reference detected! Category cannot be its own ancestor");
        return;
      }
    }
  }

  // ============================================
  // 4. SORT ORDER VALIDATION (Industry Standard)
  // ============================================
  
  // Check if it's a valid number
  if (isNaN(formData.sortOrder)) {
    toast.error("❌ Sort order must be a valid number");
    return;
  }

  // Check if integer
  if (!Number.isInteger(formData.sortOrder)) {
    toast.error("❌ Sort order must be a whole number (no decimals)");
    return;
  }

  // Range validation (1-1000)
  if (formData.sortOrder < 1 || formData.sortOrder > 1000) {
    toast.error("❌ Sort order must be between 1 and 1000");
    return;
  }

  // ============================================
  // 5. META FIELDS VALIDATION
  // ============================================
  
  // Meta Title
  if (formData.metaTitle) {
    const metaTitle = formData.metaTitle.trim();
    
    if (metaTitle.length > 60) {
      toast.error(`❌ Meta title should be less than 60 characters. Current: ${metaTitle.length}`);
      return;
    }

    // Check for only spaces
    if (/^\s+$/.test(formData.metaTitle)) {
      toast.error("❌ Meta title cannot contain only spaces");
      return;
    }
  }

  // Meta Description
  if (formData.metaDescription) {
    const metaDesc = formData.metaDescription.trim();
    
    if (metaDesc.length > 160) {
      toast.error(`❌ Meta description should be less than 160 characters. Current: ${metaDesc.length}`);
      return;
    }

    // Check for only spaces
    if (/^\s+$/.test(formData.metaDescription)) {
      toast.error("❌ Meta description cannot contain only spaces");
      return;
    }
  }

  // Meta Keywords (Industry Standard)
  if (formData.metaKeywords) {
    const metaKeywords = formData.metaKeywords.trim();
    
    if (metaKeywords.length > 255) {
      toast.error(`❌ Meta keywords must be less than 255 characters. Current: ${metaKeywords.length}`);
      return;
    }

    // Check for only spaces
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

  // ============================================
  // 6. HOMEPAGE LIMIT VALIDATION
  // ============================================
  
  if (formData.showOnHomepage) {
    const currentHomepageCount = categories.filter(
      cat => cat.showOnHomepage && cat.id !== editingCategory?.id
    ).length;
    
    if (currentHomepageCount >= MAX_HOMEPAGE_CATEGORIES) {
      toast.error(
        `❌ Homepage limit reached! Only ${MAX_HOMEPAGE_CATEGORIES} categories allowed. Currently: ${currentHomepageCount}/${MAX_HOMEPAGE_CATEGORIES}`
      );
      return;
    }
  }

  // ============================================
  // 7. IMAGE VALIDATION (Industry Standard)
  // ============================================
  
  if (imageFile) {
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Type validation
    if (!allowedTypes.includes(imageFile.type)) {
      toast.error("❌ Only WebP, JPEG, and PNG images are allowed");
      return;
    }

    // Size validation
    if (imageFile.size > maxSize) {
      const sizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
      toast.error(`❌ Image size must be less than 10MB. Current: ${sizeMB}MB`);
      return;
    }

    // ✅ File name length validation
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
          reject('Invalid or corrupted image file');
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
        const uploadResponse = await categoriesService.uploadImage(imageFile, {
          name: formData.name,
        });

        if (!uploadResponse.data?.success || !uploadResponse.data?.data) {
          throw new Error(
            uploadResponse.data?.message || "Image upload failed (no imageUrl in response)"
          );
        }

        finalImageUrl = uploadResponse.data.data;
        toast.success("✅ Image uploaded successfully!");
        
        // Delete old image if exists (in edit mode)
        if (
          editingCategory?.imageUrl &&
          editingCategory.imageUrl !== finalImageUrl
        ) {
          const filename = extractFilename(editingCategory.imageUrl);
          if (filename) {
            try {
              await categoriesService.deleteImage(filename);
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
      name: name, // Already trimmed and validated
      description: description, // Already trimmed and validated
      imageUrl: finalImageUrl,
      isActive: formData.isActive,
      showOnHomepage: formData.showOnHomepage,
      sortOrder: formData.sortOrder,
      parentCategoryId: formData.parentCategoryId || null,
      metaTitle: formData.metaTitle?.trim() || undefined,
      metaDescription: formData.metaDescription?.trim() || undefined,
      metaKeywords: formData.metaKeywords?.trim() || undefined,
      ...(editingCategory && { id: editingCategory.id }),
    };

    // ============================================
    // 11. API CALL WITH ERROR HANDLING
    // ============================================
    
    if (editingCategory) {
      await categoriesService.update(editingCategory.id, payload);
      toast.success("✅ Category updated successfully! 🎉");
    } else {
      await categoriesService.create(payload);
      toast.success("✅ Category created successfully! 🎉");
    }

    // ============================================
    // 12. CLEANUP
    // ============================================
    
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    await fetchCategories();
    setShowModal(false);
    resetForm();

  } catch (error: any) {
    // ============================================
    // 13. ENHANCED ERROR HANDLING
    // ============================================
    
    let message = "Failed to save category";
    
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
      const response = await categoriesService.delete(id);

      if (!response.error && (response.status === 200 || response.status === 204)) {
        toast.success("Category deleted successfully! 🗑️");
        await fetchCategories();
      } else {
        toast.error(response.error || "Failed to delete category");
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      if (error?.response?.status === 401) {
        toast.error("Please login again");
      } else {
        toast.error("Failed to delete category");
      }
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

const handleEdit = (category: Category) => {
  setEditingCategory(category);
  
  const currentLevel = getCategoryLevel(category, categories);
  
  setFormData({
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl || "",
    isActive: category.isActive,
    showOnHomepage: category.showOnHomepage || false,  // ✅ CATEGORY KI ACTUAL VALUE USE KARO
    sortOrder: category.sortOrder,
    metaTitle: category.metaTitle || "",
    metaDescription: category.metaDescription || "",
    metaKeywords: category.metaKeywords || "",
    parentCategoryId: category.parentCategoryId || "",
  })
  
  setImageFile(null);
  setImagePreview(null);
  
  // ✅ Show warning if editing Level 3 category
  if (currentLevel === 2) {
    toast.info('ℹ️ Editing Level 3 category - Cannot change parent to create Level 4');
  }
  
  setShowModal(true);
};


  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      isActive: true,
        showOnHomepage: false,  // ✅ ADD THIS LINE
      sortOrder: 1,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      parentCategoryId: "",
    });
    setEditingCategory(null);
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };


// ✅ NEW IMPROVED FUNCTION
const getParentCategoryOptions = () => {
  // Use the sophisticated getAvailableParents function
  const availableParents = getAvailableParents(
    categories,
    editingCategory?.id
  );
  
  return availableParents;
};

  const clearFilters = () => {
    setStatusFilter("all");
    setLevelFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
    setExpandedCategories(new Set());
  };

  // CategoryRow Component
  type CategoryRowProps = {
    category: Category;
    level: number;
    allCategories: Category[];
    expandedCategories: Set<string>;
    onToggleExpand: (id: string) => void;
    onEdit: (cat: Category) => void;
    onDelete: (id: string, name: string) => void;
    onView: (cat: Category) => void;
    onAddSubcategory: (parentId: string, parentName: string) => void;
    getImageUrl: (url?: string) => string;
    setImageDeleteConfirm: (data: any) => void;
  };

const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  level,
  allCategories,
  expandedCategories,
  onToggleExpand,
  onEdit,
  onDelete,
  onView,
  onAddSubcategory,
  getImageUrl,
  setImageDeleteConfirm,
}) => {
  const hasChildren = category.subCategories && category.subCategories.length > 0;
  const isExpanded = expandedCategories.has(category.id);
  const isInactive = !category.isActive;
  const indent = level * 24; // ✅ Reduced from 32 to 24

  const MAX_LEVEL = 2;
  const canAddSubcategory = level < MAX_LEVEL;

  return (
    <tr
      className={`border-b border-slate-800 transition-all ${
        level === 0 ? "bg-slate-800/10" : ""
      } ${
        isInactive
          ? "opacity-50 hover:opacity-60 grayscale-30"
          : "hover:bg-slate-800/30"
      }`}
    >
      {/* ✅ REDUCED PADDING: py-4 → py-2.5, px-4 → px-3 */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(category.id)}
              className={`p-1 rounded-lg transition-all shrink-0 ${
                isInactive
                  ? "hover:bg-slate-700/30 cursor-not-allowed"
                  : "hover:bg-slate-700/50"
              }`}
              disabled={isInactive}
              title={
                isInactive
                  ? "Inactive category"
                  : isExpanded
                  ? "Collapse"
                  : "Expand"
              }
            >
              {isExpanded ? (
                <ChevronDown
                  className={`h-4 w-4 ${
                    isInactive ? "text-slate-600" : "text-violet-400"
                  }`}
                />
              ) : (
                <ChevronRightIcon
                  className={`h-4 w-4 ${
                    isInactive ? "text-slate-600" : "text-slate-400"
                  }`}
                />
              )}
            </button>
          ) : (
            <div className="w-6 shrink-0"></div>
          )}

          {level > 0 && (
            <div className="flex items-center shrink-0 -ml-3 mr-1" style={{ width: "24px", height: "32px" }}>
              <div className="relative w-full h-full">
                <div
                  className={`absolute left-2 top-0 w-px h-1/2 bg-gradient-to-b ${
                    isInactive
                      ? "from-slate-600/30 to-slate-600/40"
                      : "from-cyan-500/40 to-cyan-500/60"
                  }`}
                ></div>
                <div
                  className={`absolute left-2 top-1/2 w-2.5 h-px bg-gradient-to-r ${
                    isInactive
                      ? "from-slate-600/40 to-slate-600/30"
                      : "from-cyan-500/60 to-cyan-500/40"
                  }`}
                ></div>
                <div
                  className={`absolute left-5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                    isInactive ? "bg-slate-600/40" : "bg-cyan-400/60"
                  }`}
                ></div>
              </div>
            </div>
          )}

          {/* ✅ REDUCED IMAGE SIZE: w-10 h-10 → w-8 h-8 */}
          {category.imageUrl ? (
            <div
              className={`w-8 h-8 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 relative ${
                isInactive 
                  ? 'border-slate-700/50 hover:ring-1 hover:ring-slate-600' 
                  : 'border-slate-700 hover:ring-2 hover:ring-violet-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isInactive) {
                  setSelectedImageUrl(getImageUrl(category.imageUrl));
                }
              }}
            >
              <img
                src={getImageUrl(category.imageUrl)}
                alt={category.name}
                className={`w-full h-full object-cover ${isInactive ? 'grayscale' : ''}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {isInactive && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isInactive 
                ? 'bg-slate-700/50' 
                : 'bg-gradient-to-br from-violet-500 to-pink-500'
            }`}>
              <FolderTree className={`h-4 w-4 ${isInactive ? 'text-slate-500' : 'text-white'}`} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className={`font-medium text-sm cursor-pointer transition-colors ${
                  isInactive
                    ? "text-slate-500 hover:text-slate-400"
                    : "text-white hover:text-violet-400"
                }`}
                onClick={() => onView(category)}
              >
                {category.name}
              </p>

              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium border ${
                  isInactive
                    ? "bg-slate-700/50 text-slate-600 border-slate-600/50"
                    : "bg-slate-700/50 text-slate-400 border-slate-600/50"
                }`}
              >
                L{level + 1}
              </span>

              {hasChildren && (
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium border ${
                    isInactive
                      ? "bg-slate-700/50 text-slate-500 border-slate-600/50"
                      : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  }`}
                >
                  {category.subCategories?.length} sub
                </span>
              )}

              {isInactive && (
                <span className="shrink-0 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-xs font-medium border border-amber-500/20 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Archived
                </span>
              )}
            </div>

            {/* ✅ REDUCED GAP & MARGIN: gap-2 → gap-1.5, mt-1 → mt-0.5 */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {category.parentCategoryName ? (
                <div className="flex items-center gap-1">
                  <svg className={`h-3 w-3 ${isInactive ? "text-slate-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className={`text-xs ${isInactive ? "text-slate-600" : "text-slate-400"}`}>
                    in
                  </span>
                  <span className={`text-xs font-medium ${isInactive ? "text-slate-600" : "text-cyan-400"}`}>
                    {category.parentCategoryName}
                  </span>
                  <span className={`text-xs ${isInactive ? "text-slate-700" : "text-slate-600"}`}>•</span>
                  <span className={`text-xs ${isInactive ? "text-slate-600" : "text-slate-500"}`}>
                    {category.slug}
                  </span>
                </div>
              ) : (
                <span className={`text-xs ${isInactive ? "text-slate-600" : "text-slate-500"}`}>
                  {category.slug}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* ✅ ALL CELLS: py-4 px-4 → py-2.5 px-3 */}
      <td className="py-2.5 px-3 text-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
            isInactive
              ? "bg-slate-700/30 text-slate-600"
              : category.productCount > 0
              ? "bg-cyan-500/10 text-cyan-400"
              : "bg-slate-700/30 text-slate-500"
          }`}
        >
          {category.productCount}
        </span>
      </td>

      <td className="py-2.5 px-3 text-center">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
            category.isActive
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              category.isActive ? "bg-green-400" : "bg-red-400"
            }`}
          ></span>
          {category.isActive ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="py-2.5 px-3 text-center">
        <span
          className={`font-mono text-xs ${
            isInactive ? "text-slate-600" : "text-slate-300"
          }`}
        >
          {category.sortOrder}
        </span>
      </td>

      <td className="py-2.5 px-3 text-xs">
        {category.createdAt ? (
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                isInactive ? "text-slate-600" : "text-slate-300"
              }`}
            >
              {new Date(category.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span
              className={`text-xs ${
                isInactive ? "text-slate-700" : "text-slate-500"
              }`}
            >
              {new Date(category.createdAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          "-"
        )}
      </td>

      <td className="py-2.5 px-3 text-xs">
        {category.updatedAt ? (
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                isInactive ? "text-slate-600" : "text-slate-300"
              }`}
            >
              {new Date(category.updatedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span
              className={`text-xs ${
                isInactive ? "text-slate-700" : "text-slate-500"
              }`}
            >
              {new Date(category.updatedAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          "-"
        )}
      </td>

      <td className="py-2.5 px-3">
        {category.updatedBy ? (
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                isInactive
                  ? "bg-slate-600"
                  : "bg-gradient-to-br from-violet-500 to-cyan-500"
              }`}
            >
              {category.updatedBy.charAt(0).toUpperCase()}
            </div>
            <span
              className={`text-xs truncate max-w-[120px] ${
                isInactive ? "text-slate-600" : "text-slate-300"
              }`}
              title={category.updatedBy}
            >
              {category.updatedBy}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        )}
      </td>

      <td className="py-2.5 px-3">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => canAddSubcategory && onAddSubcategory(category.id, category.name)}
            disabled={!canAddSubcategory || isInactive}
            className={`p-1.5 rounded-lg transition-all relative z-10 ${
              canAddSubcategory && !isInactive
                ? "text-green-400 hover:bg-green-500/10"
                : "text-slate-600 cursor-not-allowed opacity-50"
            }`}
            title={
              !canAddSubcategory
                ? "🚫 Maximum 3 levels reached"
                : isInactive
                ? "Cannot add to inactive category"
                : `Add subcategory to ${category.name}`
            }
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            onClick={() => onView(category)}
            className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all relative z-10"
            title={isInactive ? "View archived category" : "View details"}
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onEdit(category)}
            className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all relative z-10"
            title={isInactive ? "Edit archived category" : "Edit category"}
          >
            <Edit className="h-4 w-4" />
          </button>

          <button
            onClick={() => !isInactive && onDelete(category.id, category.name)}
            disabled={isInactive}
            className={`p-1.5 rounded-lg transition-all relative z-10 ${
              isInactive
                ? "text-slate-600 cursor-not-allowed"
                : "text-red-400 hover:bg-red-500/10"
            }`}
            title={
              isInactive
                ? "Delete disabled for archived categories"
                : "Delete category"
            }
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

  // ✅ FIXED - Only ONE filteredCategories definition
  const hasActiveFilters = 
    statusFilter !== "all" || 
    levelFilter !== "all" || 
    searchTerm.trim() !== "";

  // ✅ Smart search in hierarchy
  const searchInHierarchy = (
    category: Category, 
    searchTerm: string,
    statusFilter: string,
    levelFilter: string
  ): boolean => {
    const nameMatch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === "all" || 
                       (statusFilter === "active" && category.isActive) ||
                       (statusFilter === "inactive" && !category.isActive);
    
    const categoryLevel = getCategoryLevel(category, categories);
    const levelMatch = levelFilter === "all" ||
                      levelFilter === `level${categoryLevel + 1}`;
    
    if (nameMatch && statusMatch && levelMatch) {
      return true;
    }
    
    if (category.subCategories && category.subCategories.length > 0) {
      return category.subCategories.some(child => 
        searchInHierarchy(child, searchTerm, statusFilter, levelFilter)
      );
    }
    
    return false;
  };

  // ✅ SINGLE filteredCategories definition
  const filteredCategories = categories.filter(category => 
    searchInHierarchy(category, searchTerm, statusFilter, levelFilter)
  );

  // ✅ Auto-expand parents when children match search
  useEffect(() => {
    if (searchTerm.trim() === "" && levelFilter === "all") {
      return;
    }
    
    const expandedIds = new Set<string>();
    
    const findMatchingPaths = (cat: Category, ancestors: string[] = []) => {
      const nameMatch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryLevel = getCategoryLevel(cat, categories);
      const levelMatch = levelFilter === "all" || levelFilter === `level${categoryLevel + 1}`;
      
      if (nameMatch && levelMatch) {
        ancestors.forEach(id => expandedIds.add(id));
      }
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach(child => 
          findMatchingPaths(child, [...ancestors, cat.id])
        );
      }
    };
    
    categories.forEach(cat => findMatchingPaths(cat));
    setExpandedCategories(expandedIds);
  }, [searchTerm, levelFilter, categories]);

  // ✅ Flatten categories for display
  const getFlattenedCategories = (): (Category & { level: number })[] => {
    const flattened: Array<Category & { level: number }> = [];
    
    const addCategoryAndChildren = (category: Category, level: number) => {
      flattened.push({ ...category, level });
      
      if (
        expandedCategories.has(category.id) && 
        category.subCategories && 
        category.subCategories.length > 0
      ) {
        category.subCategories.forEach((subCat) => {
          addCategoryAndChildren(subCat, level + 1);
        });
      }
    };
    
    filteredCategories.forEach((rootCategory) => {
      addCategoryAndChildren(rootCategory, 0);
    });
    
    return flattened;
  };

  const totalItems = filteredCategories.length;
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
  }, [searchTerm, statusFilter, levelFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading categories...</p>
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
            Categories Management
          </h1>
          <p className="text-slate-400 mt-1">Manage product categories and hierarchies</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Stats Cards */}
{/* Stats Cards - COMPACT & CLEAN */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"> 
  
  {/* Total Categories */}
  <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 backdrop-blur-sm border border-violet-500/20 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium">Total Categories</p>
        <p className="text-2xl font-bold text-white mt-1">{stats.totalCategories}</p>
      </div>
      <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center shrink-0">
        <FolderTree className="h-5 w-5 text-violet-400" />
      </div>
    </div>
  </div>

  {/* Subcategories */}
  <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium">Subcategories</p>
        <p className="text-2xl font-bold text-white mt-1">{stats.totalSubCategories}</p>
      </div>
      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center shrink-0">
        <FolderTree className="h-5 w-5 text-cyan-400" />
      </div>
    </div>
  </div>

  {/* Total Products */}
  <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium">Total Products</p>
        <p className="text-2xl font-bold text-white mt-1">{stats.totalProducts}</p>
      </div>
      <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
        <Search className="h-5 w-5 text-pink-400" />
      </div>
    </div>
  </div>

  {/* Active Categories */}
  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium">Active Categories</p>
        <p className="text-2xl font-bold text-white mt-1">{stats.activeCategories}</p>
      </div>
      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
        <CheckCircle className="h-5 w-5 text-green-400" />
      </div>
    </div>
  </div>

</div>


      {/* Search and Filters */}
{/* Search and Filters - COMPACT */}
<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3">
  <div className="flex flex-col md:flex-row gap-2">
    
    {/* Search Input */}
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-9 pr-4 py-2 bg-slate-900/50 border rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none transition-all ${
            searchTerm 
              ? 'border-violet-500 ring-2 ring-violet-500/30' 
              : 'border-slate-700 focus:ring-2 focus:ring-violet-500/50'
          }`}
        />
      </div>
    </div>

    {/* Level Filter */}
    <div className="w-full md:w-40">
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className={`w-full pl-9 pr-8 py-2 bg-slate-900/50 border rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none transition-all ${
            levelFilter !== 'all' 
              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
              : 'border-slate-700 focus:ring-2 focus:ring-violet-500/50'
          }`}
        >
          <option value="all">All Levels</option>
          <option value="level1">Level 1</option>
          <option value="level2">Level 2</option>
          <option value="level3">Level 3</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </div>

    {/* Status Filter */}
    <div className="w-full md:w-40">
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`w-full pl-9 pr-8 py-2 bg-slate-900/50 border rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none transition-all ${
            statusFilter !== 'all' 
              ? 'border-pink-500 ring-2 ring-pink-500/30' 
              : 'border-slate-700 focus:ring-2 focus:ring-violet-500/50'
          }`}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    </div>

    {/* Clear Filters */}
    {hasActiveFilters && (
      <button
        onClick={clearFilters}
        className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5 shrink-0"
        title="Clear all filters"
      >
        <FilterX className="h-4 w-4" />
        <span className="text-sm">Clear</span>
      </button>
    )}
  </div>
</div>



      {/* Categories Table */}
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-300">Category Name</th>
                <th className="py-4 px-4 text-center text-sm font-semibold text-slate-300">Products</th>
                <th className="py-4 px-4 text-center text-sm font-semibold text-slate-300">Status</th>
                <th className="py-4 px-4 text-center text-sm font-semibold text-slate-300">Order</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-300">Created At</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-300">Updated At</th>
                <th className="py-4 px-4 text-left text-sm font-semibold text-slate-300">Updated By</th>
                <th className="py-4 px-4 text-center text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-12 w-12 text-slate-600" />
                      <p className="text-slate-400 text-lg">No categories found</p>
                      <p className="text-slate-500 text-sm">Try adjusting your filters or create a new category</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    level={category.level}
                    allCategories={categories}
                    expandedCategories={expandedCategories}
                    onToggleExpand={toggleCategoryExpansion}
                    onEdit={handleEdit}
                    onDelete={(id, name) => setDeleteConfirm({ id, name })}
                    onView={setViewingCategory}
                    onAddSubcategory={handleAddSubcategory}
                    getImageUrl={getImageUrl}
                    setImageDeleteConfirm={setImageDeleteConfirm}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-700 bg-slate-800/30 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400 text-sm">
                  of {totalItems} categories
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex gap-1">
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white"
                          : "bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-violet-500"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals remain the same - I can provide them if needed */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingCategory ? 'Update category information' : 'Add a new category to your store'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-slate-400 hover:text-white focus:ring-4 focus:ring-red-300 outline-none border hover:bg-red-700 rounded-lg transition-all"
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter category name"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    {!formData.name && (
                      <p className="text-xs text-amber-400 mt-1">⚠️ Category name is required before uploading image</p>
                    )}
                  </div>
{/* ✅ NEW CODE - VALIDATED PARENT DROPDOWN */}
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Parent Category
    <span className="text-red-400 ml-1">*</span>
  </label>
  
  <select
    value={formData.parentCategoryId}
    onChange={(e) => setFormData({...formData, parentCategoryId: e.target.value})}
    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  >
    <option value="">None (Root Category - Level 1)</option>
    {getParentCategoryOptions().map((cat: any) => {
      const level = cat.level !== undefined ? cat.level : getCategoryLevel(cat, categories);
      const indent = '—'.repeat(level);
      
      // Show only Level 0 (Root) and Level 1 (Sub) as parents
      if (level >= 2) return null;
      
      return (
        <option key={cat.id} value={cat.id}>
          {indent} {cat.name} {level === 0 ? '(Level 1 - Root)' : '(Level 2 - Sub)'}
        </option>
      );
    })}
  </select>
  
  {/* Enhanced Helper Text with Visual Guide */}
  <div className="mt-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-2">
    <p className="text-xs font-semibold text-violet-300 flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      Category Hierarchy Rules (Maximum 3 Levels)
    </p>
    <div className="space-y-1.5 text-xs text-slate-300 pl-6">
      <div className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span><strong className="text-violet-300">Level 1 (Root):</strong> No parent selected - Can have children</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span><strong className="text-cyan-300">Level 2 (Sub):</strong> Parent is Level 1 - Can have children</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span><strong className="text-blue-300">Level 3 (Sub-sub):</strong> Parent is Level 2 - Cannot have children (Maximum depth)</span>
      </div>
      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-violet-500/20">
        <span className="text-red-400">✗</span>
        <span className="text-red-300"><strong>Level 4:</strong> Not allowed - System will prevent creation</span>
      </div>
    </div>
  </div>
  
  {/* Current Selection Display */}
  {formData.parentCategoryId && (
    <div className="mt-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
      <p className="text-xs text-cyan-300">
        <strong>Selected Parent:</strong> {categories.find(c => c.id === formData.parentCategoryId)?.name}
        <br />
        <strong>New Category Level:</strong> {
          (() => {
            const parent = findCategoryById(formData.parentCategoryId, categories);
            if (!parent) return 'Level 2';
            const parentLevel = getCategoryLevel(parent, categories);
            return `Level ${parentLevel + 2}`;
          })()
        }
      </p>
    </div>
  )}
  
  {!formData.parentCategoryId && (
    <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
      <p className="text-xs text-violet-300">
        <strong>Creating Root Category (Level 1)</strong> - This can have subcategories
      </p>
    </div>
  )}
</div>

                  <div>
                    <ProductDescriptionEditor
                      label="Description"
                      value={formData.description}
                      onChange={(content) => setFormData(prev => ({ 
                        ...prev, 
                        description: content 
                      }))}
                      placeholder="Enter category description with rich formatting..."
                      height={300}
                      required={false}
                    />
                  </div>
                </div>
              </div>

{/* Category Image Section */}
<div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-sm">
      2
    </span>
    <span>Category Image</span>
  </h3>

  <div className="space-y-4">
    {/* Current/Preview Image Display */}
    {(imagePreview || formData.imageUrl) && (
      <div className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-xl border border-slate-600">
        <div
          className="w-16 h-16 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all"
          onClick={() => setSelectedImageUrl(imagePreview || getImageUrl(formData.imageUrl))}
        >
          <img
            src={imagePreview || getImageUrl(formData.imageUrl)}
            alt="Category image"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">
            {imagePreview ? "New Image Selected" : "Current Image"}
          </p>
          <p className="text-xs text-slate-400">
            {imagePreview ? "Will be uploaded on save" : "Click to view full size"}
          </p>
        </div>

        {/* Change/Remove buttons */}
        <div className="flex gap-2">
          <label
            className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              !formData.name
                ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
            }`}
          >
            Change
            <input
              type="file"
              accept="image/*"
              disabled={!formData.name}
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
                toast.success("Image selection removed");
              }}
              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-medium"
            >
              Remove
            </button>
          )}

          {/* Delete button for existing images (only in edit mode) */}
          {editingCategory && formData.imageUrl && !imagePreview && (
            <button
              type="button"
              onClick={() => {
                if (editingCategory) {
                  setImageDeleteConfirm({
                    categoryId: editingCategory.id,
                    imageUrl: formData.imageUrl!,
                    categoryName: editingCategory.name,
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

    {/* Upload Area - Show only if no image */}
    {!formData.imageUrl && !imagePreview && (
      <div className="flex items-center justify-center w-full">
        <label
          className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-all ${
            !formData.name
              ? "border-slate-700 bg-slate-900/20 cursor-not-allowed"
              : "border-slate-600 bg-slate-900/30 hover:bg-slate-800/50 cursor-pointer group"
          }`}
        >
          <div className="flex items-center gap-3">
            <Upload
              className={`w-6 h-6 transition-colors ${
                !formData.name
                  ? "text-slate-600"
                  : "text-slate-500 group-hover:text-violet-400"
              }`}
            />
            <div>
              <p
                className={`text-sm ${
                  !formData.name ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {!formData.name ? (
                  "Enter category name first to upload"
                ) : (
                  <>
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              {formData.name && (
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
              )}
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            disabled={!formData.name}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFileChange(file);
            }}
          />
        </label>
      </div>
    )}

    {/* URL Input - Optional */}
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



              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">3</span>
                  <span>SEO Information</span>
                </h3>
                <div className="space-y-2">
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

{/* ✅ SECTION 4: SETTINGS - REPLACE COMPLETE SECTION */}
<div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">4</span>
    <span>Settings</span>
  </h3>
  
  {/* Row 1: Active + Sort Order */}
  <div className="grid grid-cols-2 gap-4 mb-4">
    {/* Active Checkbox */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Make category visible
      </label>
      <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-600 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-slate-900"
        />
        <div>
          <p className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors">
            Active
          </p>
        </div>
      </label>
    </div>

    {/* Sort Order */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Sort Order
      </label>
      <input
        type="number"
        min="0"
        value={formData.sortOrder || 0}
        onChange={(e) => {
          const value = e.target.value;
          setFormData({
            ...formData,
            sortOrder: value === '' ? 0 : parseInt(value, 10)
          });
        }}
        placeholder="0"
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
        homepageCount >= 15
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : homepageCount >= 12
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      }`}>
        {homepageCount}/15 Featured
      </span>
    </div>
    
    <label className={`flex items-center justify-between gap-3 p-4 border rounded-xl transition-all ${
      formData.showOnHomepage
        ? 'bg-cyan-500/10 border-cyan-500/30'
        : 'bg-slate-900/50 border-slate-600 hover:border-cyan-500 cursor-pointer'
    } ${
      !formData.showOnHomepage && homepageCount >= 15
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
            if (checked && homepageCount >= 15 && !editingCategory?.showOnHomepage) {
              toast.error(
                `🚫 Maximum ${MAX_HOMEPAGE_CATEGORIES} categories allowed on homepage! Currently: ${homepageCount}/15`
              );
              return;
            }
            
            setFormData({...formData, showOnHomepage: checked});
          }}
          disabled={!formData.showOnHomepage && homepageCount >= 15 && !editingCategory?.showOnHomepage}
          className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Featured on Homepage
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {homepageCount >= 15 && !formData.showOnHomepage
              ? '⚠️ Homepage limit reached'
              : 'Display this category on the store homepage'}
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
          <strong>Warning:</strong> {15 - homepageCount} {15 - homepageCount === 1 ? 'slot' : 'slots'} remaining for homepage
        </p>
      </div>
    )}
    
    {/* Info message when limit reached */}
    {homepageCount >= 15 && (
      <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="text-xs text-red-300">
            <strong>Homepage Full!</strong> Remove one category from homepage to add another.
          </p>
          <button
            type="button"
            onClick={() => {
              toast.info(
                `📋 ${homepageCount} categories currently featured on homepage. Edit them to make room.`
              );
            }}
            className="text-xs text-red-400 underline mt-1 hover:text-red-300"
          >
            View featured categories
          </button>
        </div>
      </div>
    )}
  </div>
</div>

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
        {/* 🔥 Spinner */}
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
        {editingCategory ? 'Updating Category...' : 'Creating Category...'}
      </>
    ) : (
      <>
        {editingCategory ? '✓ Update Category' : '+ Create Category'}
      </>
    )}
  </button>
</div>

            </form>
          </div>
        </div>
      )}

      {/* View Details Modal - UPDATED WITH DELETE BUTTON */}
{viewingCategory && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-violet-500/10">
      
      {/* ========== FIXED HEADER WITH IMAGE ========== */}
      <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-4">
          {/* Category Image */}
          {viewingCategory.imageUrl ? (
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all shrink-0"
              onClick={() => setSelectedImageUrl(getImageUrl(viewingCategory.imageUrl))}
            >
              <img
                src={getImageUrl(viewingCategory.imageUrl)}
                alt={viewingCategory.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
              <FolderTree className="h-7 w-7 text-white" />
            </div>
          )}

          {/* Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent truncate">
              {viewingCategory.name}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">View category information</p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setViewingCategory(null)}
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
                  <p className="text-base font-bold text-white">{viewingCategory.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Slug</p>
                    <p className="text-white text-sm font-mono break-all">{viewingCategory.slug}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Sort Order</p>
                    <p className="text-white font-semibold">{viewingCategory.sortOrder}</p>
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Description</p>
                  {viewingCategory.description ? (
                    <div
                      className="text-white text-sm prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: viewingCategory.description }}
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
                  <p className="text-white text-sm">{viewingCategory.metaTitle || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Meta Description</p>
                  <p className="text-white text-sm">{viewingCategory.metaDescription || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Meta Keywords</p>
                  <p className="text-white text-sm">{viewingCategory.metaKeywords || <span className="text-slate-500 italic">Not set</span>}</p>
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
                  <span className="text-xl font-bold text-white">{viewingCategory.productCount || 0}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Status</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    viewingCategory.isActive 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingCategory.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    {viewingCategory.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 text-sm">Homepage</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    viewingCategory.showOnHomepage 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {viewingCategory.showOnHomepage ? (
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
                    {viewingCategory.createdAt ? new Date(viewingCategory.createdAt).toLocaleString('en-GB', {
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
                  <p className="text-white text-xs font-medium">{viewingCategory.createdBy || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Updated At</p>
                  <p className="text-white text-xs font-medium">
                    {viewingCategory.updatedAt ? new Date(viewingCategory.updatedAt).toLocaleString('en-GB', {
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
                  <p className="text-white text-xs font-medium">{viewingCategory.updatedBy || 'N/A'}</p>
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
            onClick={() => setViewingCategory(null)}
            className="px-4 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-all font-medium flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </button>
          <button
            onClick={() => {
              setViewingCategory(null);
              handleEdit(viewingCategory);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Category
          </button>
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
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
{/* ==================== IMAGE VIEWER MODAL (MISSING) ==================== */}
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
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
      />
      <button
        onClick={() => setSelectedImageUrl(null)}
        className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-lg hover:bg-slate-800 transition-all"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
)}

      {/* Image Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!imageDeleteConfirm}
        onClose={() => setImageDeleteConfirm(null)}
        onConfirm={() => {
          if (imageDeleteConfirm) {
            handleDeleteImage(imageDeleteConfirm.categoryId, imageDeleteConfirm.imageUrl);
          }
        }}
        title="Delete Image"
        message={`Are you sure you want to delete the image for "${imageDeleteConfirm?.categoryName}"?`}
        confirmText="Delete Image"
        isLoading={isDeletingImage}
      />

    </div>
  );
}
