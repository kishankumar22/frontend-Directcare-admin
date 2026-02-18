"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit, Tag, Trash2, Upload, CheckCircle, AlertCircle, Loader2, Eye, Copy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { ProductDescriptionEditor } from "../_components/SelfHostedEditor";
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import { Brand, brandsService } from "@/lib/services/brands";

const MAX_HOMEPAGE_BRANDS = 50;

interface BrandModalsProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingBrand: Brand | null;
  setEditingBrand: (brand: Brand | null) => void;
  viewingBrand: Brand | null;
  setViewingBrand: (brand: Brand | null) => void;
  selectedImageUrl: string | null;
  setSelectedImageUrl: (url: string | null) => void;
  brands: Brand[];
  fetchBrands: () => Promise<void>;
  getImageUrl: (imageUrl?: string) => string;
}


export default function BrandModals({
  showModal,
  setShowModal,
  editingBrand,
  setEditingBrand,
  viewingBrand,
  setViewingBrand,
  selectedImageUrl,
  setSelectedImageUrl,
  brands,
  fetchBrands,
  getImageUrl,
}: BrandModalsProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [imageDeleteConfirm, setImageDeleteConfirm] = useState<{
    brandId: string;
    imageUrl: string;
    brandName: string;
  } | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
const [activeTab, setActiveTab] = useState<'basic' | 'image' | 'seo' | 'settings'>('basic');
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    isPublished: true,
     isActive: true,  
    showOnHomepage: false,
    displayOrder: 1,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: ""
  });

  const homepageBrandsCounter = brands.filter(brand => brand.showOnHomepage);
  const homepageCount = homepageBrandsCounter.length;

  const extractFilename = (imageUrl: string) => {
    if (!imageUrl) return "";
    const parts = imageUrl.split('/');
    return parts[parts.length - 1];
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (showModal && editingBrand) {
      setFormData({
        name: editingBrand.name,
        description: editingBrand.description,
        logoUrl: editingBrand.logoUrl || "",
        isPublished: editingBrand.isPublished,
        showOnHomepage: editingBrand.showOnHomepage,
         isActive: true,  
        displayOrder: editingBrand.displayOrder,
        metaTitle: editingBrand.metaTitle || "",
        metaDescription: editingBrand.metaDescription || "",
        metaKeywords: editingBrand.metaKeywords || "",
      });
      setLogoFile(null);
      setLogoPreview(null);
    } else if (showModal && !editingBrand) {
      setFormData({
        name: "",
        description: "",
        logoUrl: "",
         isActive: true,  
        isPublished: true,
        showOnHomepage: false,
        displayOrder: 1,
        
        metaTitle: "",
        metaDescription: "",
        metaKeywords: ""
      });
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [showModal, editingBrand]);

  const handleLogoFileChange = (file: File) => {
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

const handleDeleteImage = async (brandId: string, imageUrl: string) => {
  setIsDeletingImage(true);
  try {
    const filename = extractFilename(imageUrl);
    await brandsService.deleteLogo(filename);
    toast.success("Image deleted successfully! 🗑️");
    
    // ✅ Update editing brand
    if (editingBrand?.id === brandId) {
      setFormData(prev => ({ ...prev, logoUrl: "" }));
    }
    
    // ✅ Update viewing brand - FIXED
    if (viewingBrand?.id === brandId) {
      setViewingBrand({ ...viewingBrand, logoUrl: "" });
    }
    
    await fetchBrands();
  } catch (error: any) {
    console.error("Error deleting image:", error);
    toast.error(error?.response?.data?.message || "Failed to delete image");
  } finally {
    setIsDeletingImage(false);
    setImageDeleteConfirm(null);
  }
};




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ============================================
    // 1. BRAND NAME VALIDATION
    // ============================================
    
    const brandName = formData.name.trim();

    if (!brandName) {
      toast.error("❌ Brand name is required");
      return;
    }

    if (brandName.length < 2 || brandName.length > 80) {
      toast.error(`❌ Brand name must be between 2 and 80 characters. Current: ${brandName.length}`);
      return;
    }

    const brandRegex = /^[A-Za-z0-9\s&.\-()]+$/;
    if (!brandRegex.test(brandName)) {
      toast.error("❌ Brand name can only contain letters, numbers, spaces, &, ., -, ()");
      return;
    }

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

    if (description.length > 1000) {
      toast.error(`❌ Description cannot exceed 1000 characters. Current: ${description.length}`);
      return;
    }

    // ============================================
    // 3. DISPLAY ORDER VALIDATION
    // ============================================
    
    if (isNaN(formData.displayOrder)) {
      toast.error("❌ Display order must be a valid number");
      return;
    }

    if (!Number.isInteger(formData.displayOrder)) {
      toast.error("❌ Display order must be a whole number (no decimals)");
      return;
    }

    if (formData.displayOrder < 1 || formData.displayOrder > 1000) {
      toast.error("❌ Display order must be between 1 and 1000");
      return;
    }

    // ============================================
    // 4. META FIELDS VALIDATION
    // ============================================
    
    if (formData.metaTitle) {
      const metaTitle = formData.metaTitle.trim();
      
      if (metaTitle.length > 60) {
        toast.error(`❌ Meta title must be less than 60 characters. Current: ${metaTitle.length}`);
        return;
      }

      if (/^\s+$/.test(formData.metaTitle)) {
        toast.error("❌ Meta title cannot contain only spaces");
        return;
      }
    }

    if (formData.metaDescription) {
      const metaDesc = formData.metaDescription.trim();
      
      if (metaDesc.length > 160) {
        toast.error(`❌ Meta description must be less than 160 characters. Current: ${metaDesc.length}`);
        return;
      }

      if (/^\s+$/.test(formData.metaDescription)) {
        toast.error("❌ Meta description cannot contain only spaces");
        return;
      }
    }

    if (formData.metaKeywords) {
      const metaKeywords = formData.metaKeywords.trim();
      
      if (metaKeywords.length > 200) {
        toast.error(`❌ Meta keywords must be less than 200 characters. Current: ${metaKeywords.length}`);
        return;
      }

      if (/^\s+$/.test(formData.metaKeywords)) {
        toast.error("❌ Meta keywords cannot contain only spaces");
        return;
      }

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
    // 6. LOGO VALIDATION
    // ============================================
    
    if (logoFile) {
      const allowedTypes = ['image/webp', 'image/png'];
      const maxSize = 1 * 1024 * 1024; // 1MB

      if (!allowedTypes.includes(logoFile.type)) {
        toast.error("❌ Only WebP and PNG images are allowed");
        return;
      }

      if (logoFile.size > maxSize) {
        const sizeMB = (logoFile.size / (1024 * 1024)).toFixed(2);
        toast.error(`❌ Logo size must be less than 1MB. Current: ${sizeMB}MB`);
        return;
      }

      if (logoFile.name.length > 255) {
        toast.error("❌ Logo file name is too long (max 255 characters)");
        return;
      }

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
        name: brandName,
        description: description,
        logoUrl: finalLogoUrl,
        isPublished: formData.isPublished,
        showOnHomepage: formData.showOnHomepage,
        isActive: formData.isActive,  // ✅ ADD THIS
        displayOrder: formData.displayOrder,
        metaTitle: formData.metaTitle?.trim() || undefined,
        metaDescription: formData.metaDescription?.trim() || undefined,
        metaKeywords: formData.metaKeywords?.trim() || undefined,
        ...(editingBrand && { id: editingBrand.id }),
      };

      // ============================================
      // 10. API CALL
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
      setEditingBrand(null);
      setActiveTab('basic'); // ✅ Reset tab to basic

    } catch (error: any) {
      // ============================================
      // 12. ERROR HANDLING
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

  return (
    <>
{/* ============================================
          CREATE/EDIT MODAL WITH TABS - FIXED
          ============================================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">
            
            {/* ============================================
                HEADER - SIMPLE WITH LOGO & INFO
                ============================================ */}
            <div className="p-3 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Icon/Photo + Title */}
                <div className="flex items-center gap-3">
                  {/* Brand Logo/Icon - Clickable */}
                  <div 
                    onClick={() => {
                      if (formData.logoUrl || logoPreview) {
                        setSelectedImageUrl(logoPreview || getImageUrl(formData.logoUrl));
                      }
                    }}
                    className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
                      (formData.logoUrl || logoPreview)
                        ? 'cursor-pointer hover:scale-105 transition-transform border-2 border-violet-500/20'
                        : 'bg-gradient-to-r from-violet-500 to-cyan-500'
                    }`}
                  >
                    {(formData.logoUrl || logoPreview) ? (
                      <img
                        src={logoPreview || getImageUrl(formData.logoUrl)}
                        alt="Brand"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : editingBrand ? (
                      <Edit className="h-6 w-6 text-white" />
                    ) : (
                      <Plus className="h-6 w-6 text-white" />
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {editingBrand ? "Edit Brand" : "Create New Brand"}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {editingBrand ? "Update brand information" : "Add a new brand"}
                    </p>
                  </div>
                </div>

                {/* Right: Brand Name + Display Order */}
                <div className="flex items-center gap-4">
                  {formData.name && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Brand Name</p>
                      <p className="text-base font-bold text-white" title={formData.name}>
                        {formData.name}
                      </p>
                    </div>
                  )}
                  {formData.displayOrder > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Order</p>
                      <p className="text-xl font-bold text-cyan-400">
                        #{formData.displayOrder}
                      </p>
                    </div>
                  )}
                  
                  {/* Close Button */}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingBrand(null);
                      setActiveTab('basic');
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all"
                    disabled={isSubmitting}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================
                TABS NAVIGATION
                ============================================ */}
            <div className="flex border-b border-slate-700/50 bg-slate-800/30 px-3">
              {[
                { id: 'basic', label: 'Basic Info', icon: Tag },
                { id: 'image', label: 'Logo', icon: Upload },
                { id: 'seo', label: 'SEO', icon: Eye },
                { id: 'settings', label: 'Settings', icon: CheckCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'text-violet-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  disabled={isSubmitting}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-500"></div>
                  )}
                </button>
              ))}
            </div>

            {/* ============================================
                MODAL BODY
                ============================================ */}
            <div className="overflow-y-auto flex-1 p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* TAB 1: Basic Information */}
                {activeTab === 'basic' && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Brand Name & Display Order - 2 Columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Brand Name */}
                      <div>
                        <label className="block text-sm text-slate-300 font-semibold mb-2">
                          Brand Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Apple, Samsung"
                          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Display Order */}
                      <div>
                        <label className="block text-sm text-slate-300 font-semibold mb-2">
                          Display Order <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <ProductDescriptionEditor
                        value={formData.description}
                        onChange={(value) => setFormData({ ...formData, description: value })}
                        placeholder="Enter brand description..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.description.length}/1000 characters
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: Brand Logo - FIXED LAYOUT */}
                {activeTab === 'image' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-3">
                        Brand Logo
                      </label>
                      
                      {/* Current Logo Preview - Centered */}
                      {(formData.logoUrl || logoPreview) && (
                        <div className="mb-4 flex justify-center">
                          <div className="relative inline-block">
                            <img
                              src={logoPreview || getImageUrl(formData.logoUrl)}
                              alt="Logo preview"
                              className="w-44 h-44 rounded-lg border-2 border-slate-700 object-contain bg-slate-800/50 cursor-pointer hover:border-violet-500/50 transition-all"
                              onClick={() => setSelectedImageUrl(logoPreview || getImageUrl(formData.logoUrl))}
                            />
                            {formData.logoUrl && !logoPreview && (
                              <button
                                type="button"
                                onClick={() =>
                                  setImageDeleteConfirm({
                                    brandId: editingBrand?.id || "",
                                    imageUrl: formData.logoUrl,
                                    brandName: formData.name,
                                  })
                                }
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all flex items-center justify-center"
                                title="Delete Logo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Upload Area - Dashed Border */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/webp,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoFileChange(file);
                          }}
                          className="hidden"
                          id="logo-upload"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex flex-col items-center justify-center gap-3 px-6 py-10 bg-slate-800/30 border-2 border-dashed border-slate-600 hover:border-violet-500 rounded-lg cursor-pointer transition-all group"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-700 group-hover:bg-violet-500/20 flex items-center justify-center transition-all">
                            <Upload className="h-6 w-6 text-slate-400 group-hover:text-violet-400 transition-colors" />
                          </div>
                          <div className="text-center">
                            <span className="block text-white font-semibold mb-1">
                              {logoFile ? logoFile.name : "Click to upload"}
                            </span>
                            <span className="text-sm text-slate-400">
                              WebP or PNG (Max 1MB)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Guidelines Box */}
                      <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="text-cyan-400 mt-0.5">📸</div>
                          <div>
                            <p className="text-sm text-cyan-400 font-semibold mb-2">Guidelines:</p>
                            <ul className="text-xs text-slate-300 space-y-1">
                              <li>• Size: 200×200px to 5000×5000px</li>
                              <li>• Format: WebP or PNG</li>
                              <li>• Max: 1MB</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SEO Information */}
                {activeTab === 'seo' && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Meta Title */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        value={formData.metaTitle}
                        onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                        placeholder="SEO title for search engines"
                        maxLength={60}
                        className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.metaTitle.length}/60 characters
                      </p>
                    </div>

                    {/* Meta Description */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Meta Description
                      </label>
                      <textarea
                        value={formData.metaDescription}
                        onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                        placeholder="Brief description for search engines"
                        maxLength={160}
                        rows={3}
                        className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.metaDescription.length}/160 characters
                      </p>
                    </div>

                    {/* Meta Keywords */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Meta Keywords
                      </label>
                      <input
                        type="text"
                        value={formData.metaKeywords}
                        onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                        placeholder="keyword1, keyword2, keyword3"
                        maxLength={200}
                        className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.metaKeywords.length}/200 characters
                      </p>
                    </div>

                    {/* SEO Tips */}
                    <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="text-violet-400 mt-0.5">💡</div>
                        <div>
                          <p className="text-sm text-violet-400 font-semibold mb-2">SEO Tips:</p>
                          <ul className="text-xs text-slate-300 space-y-1">
                            <li>• Meta title under 60 characters</li>
                            <li>• Description 120-160 characters</li>
                            <li>• Use relevant keywords</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Settings */}
                {activeTab === 'settings' && (
                  <div className="space-y-3 animate-fadeIn">

                    {/* Active Status */}
<div>
  <label className="block text-sm text-slate-300 font-semibold mb-2">
    Active Status
  </label>
  <button
    type="button"
    onClick={() =>
      setFormData({ ...formData, isActive: !formData.isActive })
    }
    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-between ${
      formData.isActive
        ? "bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-400"
        : "bg-slate-500/10 border-2 border-slate-500/50 text-slate-400"
    }`}
    disabled={isSubmitting}
  >
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5" />
      <div className="text-left">
        <p className="font-bold text-sm">
          {formData.isActive ? "Active" : "Inactive"}
        </p>
        <p className="text-xs opacity-75">
          {formData.isActive
            ? "Brand is operational"
            : "Brand is temporarily disabled"}
        </p>
      </div>
    </div>
    <div
      className={`w-11 h-6 rounded-full transition-all ${
        formData.isActive ? "bg-emerald-500" : "bg-slate-600"
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full transition-all shadow-lg ${
          formData.isActive
            ? "translate-x-5 mt-0.5"
            : "translate-x-0.5 mt-0.5"
        }`}
      ></div>
    </div>
  </button>
</div>

                    {/* Published Status */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Published Status
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-between ${
                          formData.isPublished
                            ? "bg-green-500/10 border-2 border-green-500/50 text-green-400"
                            : "bg-red-500/10 border-2 border-red-500/50 text-red-400"
                        }`}
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          <div className="text-left">
                            <p className="font-bold text-sm">{formData.isPublished ? "Published" : "Unpublished"}</p>
                            <p className="text-xs opacity-75">
                              {formData.isPublished ? "Visible to customers" : "Hidden from customers"}
                            </p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-all ${
                          formData.isPublished ? 'bg-green-500' : 'bg-slate-600'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-lg ${
                            formData.isPublished ? 'translate-x-5 mt-0.5' : 'translate-x-0.5 mt-0.5'
                          }`}></div>
                        </div>
                      </button>
                    </div>

                    {/* Show on Homepage */}
                    <div>
                      <label className="block text-sm text-slate-300 font-semibold mb-2">
                        Show on Homepage
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.showOnHomepage) {
                            const currentCount = brands.filter(
                              b => b.showOnHomepage && b.id !== editingBrand?.id
                            ).length;
                            if (currentCount >= MAX_HOMEPAGE_BRANDS) {
                              toast.error(`Maximum ${MAX_HOMEPAGE_BRANDS} brands on homepage!`);
                              return;
                            }
                          }
                          setFormData({ ...formData, showOnHomepage: !formData.showOnHomepage });
                        }}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-between ${
                          formData.showOnHomepage
                            ? "bg-violet-500/10 border-2 border-violet-500/50 text-violet-400"
                            : "bg-slate-500/10 border-2 border-slate-500/50 text-slate-400"
                        }`}
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          <div className="text-left">
                            <p className="font-bold text-sm">
                              {formData.showOnHomepage ? "On Homepage" : "Not on Homepage"}
                            </p>
                            <p className="text-xs opacity-75">
                              {formData.showOnHomepage 
                                ? `Featured (${homepageCount}/${MAX_HOMEPAGE_BRANDS})` 
                                : "Not featured"}
                            </p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-all ${
                          formData.showOnHomepage ? 'bg-violet-500' : 'bg-slate-600'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-lg ${
                            formData.showOnHomepage ? 'translate-x-5 mt-0.5' : 'translate-x-0.5 mt-0.5'
                          }`}></div>
                        </div>
                      </button>
                    </div>

                    {/* Homepage Limit Warning */}
                    {homepageCount >= MAX_HOMEPAGE_BRANDS - 5 && (
                      <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-orange-400 font-medium">Limit Warning</p>
                            <p className="text-xs text-slate-300 mt-0.5">
                              {homepageCount}/{MAX_HOMEPAGE_BRANDS} brands. 
                              {MAX_HOMEPAGE_BRANDS - homepageCount} slots left.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* ============================================
                FOOTER - ALWAYS VISIBLE
                ============================================ */}
            <div className="p-3 border-t border-slate-700 bg-slate-800/50">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBrand(null);
                    setActiveTab('basic');
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-semibold"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{editingBrand ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <span>{editingBrand ? "Update Brand" : "Create Brand"}</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


{/* ============================================
          VIEW BRAND MODAL - UPDATED
          ============================================ */}
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
                    <Tag className="h-7 w-7 text-white" />
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
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs">ℹ️</span>
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Brand Name</p>
                        <p className="text-base font-bold text-white">
                          {viewingBrand.name}
                        </p>
                      </div>

                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-400">Brand ID</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(viewingBrand.id);
                              toast.success("ID copied to clipboard!");
                            }}
                            className="text-slate-400 hover:text-white transition-all"
                            title="Copy ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-mono text-slate-300 break-all">
                          {viewingBrand.id}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/50 p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Slug</p>
                          <p className="text-white text-sm font-mono break-all">{viewingBrand.slug}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-lg">
                          <p className="text-xs text-slate-400 mb-1">Display Order</p>
                          <p className="text-white font-semibold">#{viewingBrand.displayOrder}</p>
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
                        <p className="text-white text-sm">
                          {viewingBrand.metaTitle || <span className="text-slate-500 italic">Not set</span>}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Meta Description</p>
                        <p className="text-white text-sm">
                          {viewingBrand.metaDescription || <span className="text-slate-500 italic">Not set</span>}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Meta Keywords</p>
                        <p className="text-white text-sm">
                          {viewingBrand.metaKeywords || <span className="text-slate-500 italic">Not set</span>}
                        </p>
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
                      {/* Active Status */}
<div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
  <span className="text-slate-300 text-sm">Active Status</span>
  <span
    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
      viewingBrand.isActive
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        viewingBrand.isActive ? "bg-emerald-400" : "bg-slate-400"
      }`}
    ></span>
    {viewingBrand.isActive ? "Active" : "Inactive"}
  </span>
</div>
{/* Record State (Soft Delete Status) */}
<div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
  <span className="text-slate-300 text-sm">Record State</span>
  <span
    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
      viewingBrand.isDeleted
        ? "bg-red-500/10 text-red-400 border border-red-500/20"
        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        viewingBrand.isDeleted ? "bg-red-400" : "bg-emerald-400"
      }`}
    ></span>
    {viewingBrand.isDeleted ? "Deleted" : "Live"}
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
               
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ============================================
          IMAGE VIEW MODAL
          ============================================ */}
      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute -top-12 right-0 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImageUrl}
              alt="Brand Logo Full View"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ============================================
          IMAGE DELETE CONFIRMATION
          ============================================ */}
      <ConfirmDialog
        isOpen={!!imageDeleteConfirm}
        onClose={() => setImageDeleteConfirm(null)}
        onConfirm={() => {
          if (imageDeleteConfirm) {
            handleDeleteImage(imageDeleteConfirm.brandId, imageDeleteConfirm.imageUrl);
          }
        }}
        title="Delete Brand Logo"
        message={`Are you sure you want to delete the logo for "${imageDeleteConfirm?.brandName}"? This action cannot be undone.`}
        confirmText="Delete Logo"
        cancelText="Cancel"
        icon={Trash2}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-500"
        isLoading={isDeletingImage}
      />
    </>
  );
}
