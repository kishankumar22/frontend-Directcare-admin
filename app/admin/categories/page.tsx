"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, FolderTree, Eye, Upload, Filter, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, CheckCircle, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
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
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedParentId, setSelectedParentId] = useState<string>("");
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
    sortOrder: 1,
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesService.getAll({
        params: { includeInactive: true, includeSubCategories: true }
      });
      const categoriesData = response.data?.data || [];
      setCategories([...categoriesData]);
      calculateStats(categoriesData);
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
      sortOrder: 1,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      parentCategoryId: parentId
    });
    setShowModal(true);
  };

  const handleDeleteImage = async (categoryId: string, imageUrl: string) => {
    setIsDeletingImage(true);
    try {
      const filename = extractFilename(imageUrl);
      await categoriesService.deleteImage(filename);
      toast.success("Image deleted successfully! 🗑️");

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

    if (formData.parentCategoryId) {
      const parent = findCategoryById(formData.parentCategoryId, categories);
      if (parent) {
        const parentLevel = getCategoryLevel(parent, categories);
        
        if (parentLevel >= 2) {
          toast.error('🚫 Cannot create category: Maximum 3 levels allowed!');
          return;
        }
      }
    }

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (formData.name.trim().length < 2) {
      toast.error("Category name must be at least 2 characters");
      return;
    }
    if (formData.name.trim().length > 100) {
      toast.error("Category name must be less than 100 characters");
      return;
    }

    const isDuplicateName = categories.some(
      cat =>
        cat.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
        cat.id !== editingCategory?.id
    );
    if (isDuplicateName) {
      toast.error("A category with this name already exists!");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (formData.description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }
    if (formData.sortOrder < 0) {
      toast.error("Sort order cannot be negative");
      return;
    }
    if (formData.metaTitle && formData.metaTitle.length > 60) {
      toast.error("Meta title should be less than 60 characters");
      return;
    }
    if (formData.metaDescription && formData.metaDescription.length > 160) {
      toast.error("Meta description should be less than 160 characters");
      return;
    }
    if (formData.metaKeywords && formData.metaKeywords.length > 255) {
      toast.error("Meta keywords must be less than 255 characters");
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

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

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
          toast.success("Image uploaded successfully!");
          fetchCategories();
          
          if (
            editingCategory?.imageUrl &&
            editingCategory.imageUrl !== finalImageUrl
          ) {
            const filename = extractFilename(editingCategory.imageUrl);
            if (filename) {
              try {
                await categoriesService.deleteImage(filename);
              } catch (err) {
                console.log("Failed to delete old image:", err);
              }
            }
          }
        } catch (uploadErr: any) {
          console.error("Error uploading image:", uploadErr);
          toast.error(
            uploadErr?.response?.data?.message || "Failed to upload image"
          );
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageUrl: finalImageUrl,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        parentCategoryId: formData.parentCategoryId || null,
        metaTitle: formData.metaTitle.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined,
        metaKeywords: formData.metaKeywords.trim() || undefined,
        ...(editingCategory && { id: editingCategory.id }),
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, payload);
        toast.success("Category updated successfully! 🎉");
      } else {
        await categoriesService.create(payload);
        toast.success("Category created successfully! 🎉");
      }

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      await fetchCategories();
      setShowModal(false);
      resetForm();

    } catch (error: any) {
      console.error("Error saving category:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        "Failed to save category";
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
    setFormData({
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl || "",
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      metaTitle: category.metaTitle || "",
      metaDescription: category.metaDescription || "",
      metaKeywords: category.metaKeywords || "",
      parentCategoryId: category.parentCategoryId || "",
    });
    
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      isActive: true,
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

  const getParentCategoryOptions = () => {
    return categories.filter(cat => {
      if (editingCategory && cat.id === editingCategory.id) return false;
      return true;
    });
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
    const indent = level * 32;

    const MAX_LEVEL = 2;
    const canAddSubcategory = level < MAX_LEVEL;

    const levelColors = [
      "from-violet-500 to-cyan-500",
      "from-cyan-500 to-blue-500",
      "from-blue-500 to-indigo-500",
    ];
    const colorClass = levelColors[Math.min(level, 2)] || "from-gray-500 to-gray-600";

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
        <td className="py-4 px-4">
          <div className="flex items-center gap-3" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(category.id)}
                className={`p-1.5 rounded-lg transition-all shrink-0 ${
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
              <div className="w-7 shrink-0"></div>
            )}

            {level > 0 && (
              <div className="flex items-center shrink-0 -ml-4 mr-1" style={{ width: "28px", height: "40px" }}>
                <div className="relative w-full h-full">
                  <div
                    className={`absolute left-3 top-0 w-px h-1/2 bg-gradient-to-b ${
                      isInactive
                        ? "from-slate-600/30 to-slate-600/40"
                        : "from-cyan-500/40 to-cyan-500/60"
                    }`}
                  ></div>
                  <div
                    className={`absolute left-3 top-1/2 w-3 h-px bg-gradient-to-r ${
                      isInactive
                        ? "from-slate-600/40 to-slate-600/30"
                        : "from-cyan-500/60 to-cyan-500/40"
                    }`}
                  ></div>
                  <div
                    className={`absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                      isInactive ? "bg-slate-600/40" : "bg-cyan-400/60"
                    }`}
                  ></div>
                </div>
              </div>
            )}

            {category.imageUrl ? (
              <div
                className={`w-10 h-10 rounded-lg overflow-hidden border cursor-pointer transition-all shrink-0 relative ${
                  isInactive
                    ? "border-slate-700/50 hover:ring-1 hover:ring-slate-600"
                    : "border-slate-700 hover:ring-2 hover:ring-violet-500"
                }`}
                onClick={() => !isInactive && onView(category)}
              >
                <img
                  src={getImageUrl(category.imageUrl)}
                  alt={category.name}
                  className={`w-full h-full object-cover ${isInactive ? "grayscale" : ""}`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {isInactive && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isInactive
                    ? "bg-slate-700/50"
                    : `bg-gradient-to-br ${colorClass}`
                }`}
              >
                <FolderTree
                  className={`h-5 w-5 ${
                    isInactive ? "text-slate-500" : "text-white"
                  }`}
                />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className={`font-medium cursor-pointer transition-colors ${
                    isInactive
                      ? "text-slate-500 hover:text-slate-400"
                      : "text-white hover:text-violet-400"
                  }`}
                  onClick={() => onView(category)}
                >
                  {category.name}
                </p>

                <span
                  className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border ${
                    isInactive
                      ? "bg-slate-700/50 text-slate-600 border-slate-600/50"
                      : "bg-slate-700/50 text-slate-400 border-slate-600/50"
                  }`}
                >
                  L{level + 1}
                </span>

                {hasChildren && (
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      isInactive
                        ? "bg-slate-700/50 text-slate-500 border-slate-600/50"
                        : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                    }`}
                  >
                    {category.subCategories?.length} sub
                  </span>
                )}

                {isInactive && (
                  <span className="shrink-0 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-xs font-medium border border-amber-500/20 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Archived
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                {category.parentCategoryName ? (
                  <div className="flex items-center gap-1.5">
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

        <td className="py-4 px-4 text-center">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
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

        <td className="py-4 px-4 text-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
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

        <td className="py-4 px-4 text-center">
          <span
            className={`font-mono text-sm ${
              isInactive ? "text-slate-600" : "text-slate-300"
            }`}
          >
            {category.sortOrder}
          </span>
        </td>

        <td className="py-4 px-4 text-sm">
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

        <td className="py-4 px-4 text-sm">
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

        <td className="py-4 px-4">
          {category.updatedBy ? (
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                  isInactive
                    ? "bg-slate-600"
                    : "bg-gradient-to-br from-violet-500 to-cyan-500"
                }`}
              >
                {category.updatedBy.charAt(0).toUpperCase()}
              </div>
              <span
                className={`text-sm truncate max-w-[150px] ${
                  isInactive ? "text-slate-600" : "text-slate-300"
                }`}
                title={category.updatedBy}
              >
                {category.updatedBy}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">-</span>
          )}
        </td>

        <td className="py-4 px-4">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => canAddSubcategory && onAddSubcategory(category.id, category.name)}
              disabled={!canAddSubcategory || isInactive}
              className={`p-2 rounded-lg transition-all relative z-10 ${
                canAddSubcategory && !isInactive
                  ? "text-green-400 hover:bg-green-500/10"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
              style={{ opacity: 1 }}
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
              className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all relative z-10"
              style={{ opacity: 1 }}
              title={isInactive ? "View archived category" : "View details"}
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              onClick={() => onEdit(category)}
              className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all relative z-10"
              style={{ opacity: 1 }}
              title={isInactive ? "Edit archived category" : "Edit category"}
            >
              <Edit className="h-4 w-4" />
            </button>

            <button
              onClick={() => !isInactive && onDelete(category.id, category.name)}
              disabled={isInactive}
              className={`p-2 rounded-lg transition-all relative z-10 ${
                isInactive
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-red-400 hover:bg-red-500/10"
              }`}
              style={{ opacity: 1 }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Categories</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalCategories}</p>
            </div>
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <FolderTree className="h-6 w-6 text-violet-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Subcategories</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalSubCategories}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <FolderTree className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
              <Search className="h-6 w-6 text-pink-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Active Categories</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.activeCategories}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories (all levels)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Level Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              >
                <option value="all">All Levels</option>
                <option value="level1">Level 1 (Root)</option>
                <option value="level2">Level 2 (Sub)</option>
                <option value="level3">Level 3 (Sub-sub)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-violet-500 transition-all flex items-center gap-2"
              title="Clear all filters"
            >
              <FilterX className="h-5 w-5" />
              Clear
            </button>
          )}
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {searchTerm && (
              <span className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-violet-400 text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                "{searchTerm}"
                <button onClick={() => setSearchTerm("")} className="hover:text-violet-300">×</button>
              </span>
            )}
            {levelFilter !== "all" && (
              <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {levelFilter === "level1" ? "Level 1" : levelFilter === "level2" ? "Level 2" : "Level 3"}
                <button onClick={() => setLevelFilter("all")} className="hover:text-cyan-300">×</button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-lg text-pink-400 text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {statusFilter === "active" ? "Active" : "Inactive"}
                <button onClick={() => setStatusFilter("all")} className="hover:text-pink-300">×</button>
              </span>
            )}
          </div>
        )}
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

      {/* Modals remain the same - I can provide them if needed */}{showModal && (
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Parent Category</label>
                    <select
                      value={formData.parentCategoryId}
                      onChange={(e) => setFormData({...formData, parentCategoryId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    >
                      <option value="">None (Root Category)</option>
                      {getParentCategoryOptions().map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Select a parent category to create a sub-category</p>
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

              {/* UPDATED: Category Image Section with Brand-Style Upload */}
{/* UPDATED Category Image Section */}
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

              <div className="bg-slate-800/30 p-2 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">4</span>
                  <span>Settings</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Make category visible</label>
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Sort Order</label>
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
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-violet-500/10">
            <div className="p-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                    Category Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">View category information</p>
                </div>
                <button
                  onClick={() => setViewingCategory(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-2">
                {/* Image Section - UPDATED WITH DELETE BUTTON */}
                {viewingCategory.imageUrl && (
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-violet-500/20 cursor-pointer hover:border-violet-500/50 transition-all">
                        <img
                          src={getImageUrl(viewingCategory.imageUrl)}
                          alt={viewingCategory.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onClick={() => setSelectedImageUrl(getImageUrl(viewingCategory.imageUrl))}
                        />
                      </div>
                  </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">ℹ</span>
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Name</p>
                        <p className="text-lg font-bold text-white">{viewingCategory.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/50 p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Slug</p>
                          <p className="text-white text-sm font-mono">{viewingCategory.slug}</p>
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
      className="text-white text-sm prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: viewingCategory.description }}
    />
  ) : (
    <p className="text-white text-sm">No description</p>
  )}
</div>

                    </div>
                  </div>

                  {/* SEO Info */}
                  <div className="bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-sm">🔍</span>
                      SEO Information
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Meta Title</p>
                        <p className="text-white text-sm">{viewingCategory.metaTitle || 'Not set'}</p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Meta Description</p>
                        <p className="text-white text-sm">{viewingCategory.metaDescription || 'Not set'}</p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Meta Keywords</p>
                        <p className="text-white text-sm">{viewingCategory.metaKeywords || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Statistics */}
                  <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-2">
                    <h3 className="text-lg font-bold text-white mb-3">Statistics</h3>
                    <div className="space-y-2">
                      <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-slate-300 text-sm">Products</span>
                        <span className="text-xl font-bold text-white">{viewingCategory.productCount}</span>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-slate-300 text-sm">Status</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          viewingCategory.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {viewingCategory.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity */}
                  <div className="bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                    <h3 className="text-lg font-bold text-white mb-3">Activity</h3>
                    <div className="space-y-2">
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Created At</p>
                        <p className="text-white text-xs">{viewingCategory.createdAt ? new Date(viewingCategory.createdAt).toLocaleString() : 'N/A'}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Created By</p>
                        <p className="text-white text-xs">{viewingCategory.createdBy || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Updated At</p>
                        <p className="text-white text-xs">{viewingCategory.updatedAt ? new Date(viewingCategory.updatedAt).toLocaleString() : 'N/A'}</p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Updated By</p>
                        <p className="text-white text-xs">{viewingCategory.updatedBy || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setViewingCategory(null);
                      handleEdit(viewingCategory);
                    }}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all font-medium text-sm"
                  >
                    Edit Category
                  </button>
                  <button
                    onClick={() => setViewingCategory(null)}
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
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
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
        title="Delete Image"
        message={`Are you sure you want to delete the image for "${imageDeleteConfirm?.categoryName}"?`}
        confirmText="Delete Image"
        isLoading={isDeletingImage}
      />

    </div>
  );
}
