"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit, Tag, Trash2, Upload, CheckCircle, AlertCircle, Loader2, Eye, Copy, HelpCircle } from "lucide-react";

import { ProductDescriptionEditor } from "../_components/SelfHostedEditor";
import { useToast } from "@/app/admin/_components/CustomToast";
import ConfirmDialog from "@/app/admin/_components/ConfirmDialog";
import { Brand, brandsService } from "@/lib/services/brands";

import BrandFaqManager from "./BrandFaqManager";
import { brandFaqsService } from "@/lib/services/brandFaqs";

const MAX_HOMEPAGE_BRANDS = 50;
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
interface BrandModalsProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingBrand: Brand | null;
setEditingBrand: React.Dispatch<React.SetStateAction<Brand | null>>;
  viewingBrand: Brand | null;
  initialTab?: 'basic' | 'image' | 'seo' | 'settings' | 'faqs';
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
  initialTab,
  brands,
  fetchBrands,
  getImageUrl,
}: BrandModalsProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingFaqs, setPendingFaqs] = useState<any[]>([]);
  const [imageDeleteConfirm, setImageDeleteConfirm] = useState<{
    brandId: string;
    imageUrl: string;
    brandName: string;
  } | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
const [activeTab, setActiveTab] = useState<'basic' | 'image' | 'seo' | 'settings' | 'faqs'>('basic');
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

useEffect(() => {
  if (showModal && initialTab) {
    setActiveTab(initialTab);
  }
}, [initialTab, showModal]);

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

  const brandName = formData.name.trim();

  if (!brandName) {
    toast.error("❌ Brand name is required");
    return;
  }

  if (!logoFile && !formData.logoUrl) {
    toast.error("❌ Brand logo is required");
    return;
  }

  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    let finalLogoUrl = formData.logoUrl;

    // =========================
    // ✅ UPLOAD LOGO
    // =========================
    if (logoFile) {
      const uploadRes = await brandsService.uploadLogo(logoFile, {
        name: formData.name,
      });

      if (!uploadRes.data?.success || !uploadRes.data?.data) {
        throw new Error("Logo upload failed");
      }

      finalLogoUrl = uploadRes.data.data;
    }

    // =========================
    // ✅ PAYLOAD
    // =========================
    const payload: any = {
      name: brandName,
      description: formData.description.trim(),
      logoUrl: finalLogoUrl,
      isPublished: formData.isPublished,
      showOnHomepage: formData.showOnHomepage,
      isActive: formData.isActive,
      displayOrder: formData.displayOrder,
      metaTitle: formData.metaTitle?.trim() || undefined,
      metaDescription: formData.metaDescription?.trim() || undefined,
      metaKeywords: formData.metaKeywords?.trim() || undefined,
    };

    // =========================
    // 🔥 CREATE MODE
    // =========================
    if (!editingBrand) {
      const res = await brandsService.create(payload);

      // 🔥 IMPORTANT FIX (correct parsing)
      const brandId = res.data?.data?.id;

      if (!brandId) {
        throw new Error("Brand ID missing");
      }

      // 🔥 CREATE FAQs AFTER BRAND
      if (pendingFaqs?.length) {
        await Promise.all(
          pendingFaqs.map((faq: any) =>
            brandFaqsService.create(brandId, faq)
          )
        );
      }

      toast.success("✅ Brand created successfully! 🎉");
    }

    // =========================
    // 🔥 EDIT MODE
    // =========================
    else {
      await brandsService.update(editingBrand.id, {
        ...payload,
        id: editingBrand.id, // ⚠️ backend needs this
      });

      toast.success("✅ Brand updated successfully! 🎉");
    }

    // =========================
    // 🔥 REFRESH + CLEANUP
    // =========================
    await fetchBrands();

    setShowModal(false);
    setEditingBrand(null);
    setPendingFaqs([]);
    setActiveTab("basic");

  } catch (err: any) {
    toast.error(err?.message || "Failed");
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
    
    {/* Left: Icon + Title */}
    <div className="flex items-center gap-3">
      
      {/* Logo */}
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
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {editingBrand ? "Edit Brand" : "Create New Brand"}

          {formData.name && (
            <span className="text-violet-400 font-semibold truncate max-w-[200px]">
              • {formData.name}
            </span>
          )}
        </h2>

        {/* 👉 Subtitle + Order */}
        <p className="text-slate-400 text-sm flex items-center gap-2">
          {editingBrand 
            ? "✏️ Update brand information" 
            : "➕ Add a new brand"}

          {formData.displayOrder > 0 && (
            <span className="text-cyan-400 font-semibold">
              •  #{formData.displayOrder}
            </span>
          )}
        </p>
      </div>
    </div>

    {/* ❌ Right side REMOVED */}
    
    {/* Close Button only */}
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

            {/* ============================================
                TABS NAVIGATION
                ============================================ */}
            <div className="flex border-b border-slate-700/50 bg-slate-800/30 px-3">
              {[
                { id: 'basic', label: 'Basic Info', icon: Tag },
                { id: 'image', label: 'Logo', icon: Upload },
                { id: 'seo', label: 'SEO', icon: Eye },
                { id: 'settings', label: 'Settings', icon: CheckCircle },
                { id: 'faqs', label: 'FAQs', icon: HelpCircle }
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
                        Brand Logo<span className="text-red-400">*</span>
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
                               onError={(e) => (e.currentTarget.src = "/placeholder.png")}
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
                          required
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
{activeTab === "faqs" && (
 <BrandFaqManager
   
  brandId={editingBrand?.id || ""}
  faqs={editingBrand ? editingBrand.faqs : pendingFaqs}
  onChange={(faqs) => {
    if (editingBrand) {
      setEditingBrand(prev =>
        prev ? { ...prev, faqs } : prev
      );
    } else {
      setPendingFaqs(faqs);
    }
  }}
/>
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
  <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
    
    <div className="
      bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800
      border border-gray-300 dark:border-violet-500/20
      rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col
      shadow-xl dark:shadow-2xl dark:shadow-violet-500/10
    ">
      
      {/* ================= HEADER ================= */}
      <div className="
        p-4 border-b border-gray-300 dark:border-violet-500/20
        bg-gradient-to-r 
        from-violet-100 via-gray-100 to-cyan-100
        dark:from-violet-500/10 dark:to-cyan-500/10
        rounded-t-2xl shrink-0
      ">
        <div className="flex items-center gap-4">

          {/* Logo */}
          {viewingBrand.logoUrl ? (
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-violet-500/30 cursor-pointer hover:border-violet-500 transition-all shrink-0"
              onClick={() => setSelectedImageUrl(getImageUrl(viewingBrand.logoUrl))}
            >
              <img
                src={getImageUrl(viewingBrand.logoUrl)}
                alt={viewingBrand.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                 onError={(e) => (e.currentTarget.src = "/placeholder.png")}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
              <Tag className="h-7 w-7 text-white" />
            </div>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className="
              text-xl font-bold
              text-gray-900
              dark:bg-gradient-to-r dark:from-violet-400 dark:via-cyan-400 dark:to-pink-400
              dark:bg-clip-text dark:text-transparent
              truncate
            ">
              {viewingBrand.name}
            </h2>

            <p className="text-gray-600 dark:text-slate-400 text-xs mt-0.5">
              View brand information
            </p>
          </div>

          {/* Close */}
          <button
            onClick={() => setViewingBrand(null)}
            className="
              p-2 text-gray-500 dark:text-slate-400
              hover:text-red-500 dark:hover:text-white
              hover:bg-red-100 dark:hover:bg-red-500/20
              border border-transparent hover:border-red-500/50
              rounded-lg transition-all shrink-0
            "
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Basic Info */}
            <div className="
              bg-white dark:bg-slate-800/30
              p-4 rounded-xl
              border border-gray-300 dark:border-slate-700/50
            ">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs text-white">ℹ️</span>
                Basic Information
              </h3>

              <div className="space-y-3">

                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Brand Name</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {viewingBrand.name}
                  </p>
                </div>

                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600 dark:text-slate-400">Brand ID</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(viewingBrand.id);
                        toast.success("ID copied!");
                      }}
                      className="text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-mono text-gray-700 dark:text-slate-300 break-all">
                    {viewingBrand.id}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Slug</p>
                    <p className="text-gray-800 dark:text-white text-sm">{viewingBrand.slug}</p>
                  </div>

                  <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Display Order</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      #{viewingBrand.displayOrder}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Description</p>
                  {viewingBrand.description ? (
                    <div
                      className="text-gray-800 dark:text-white text-sm"
                      dangerouslySetInnerHTML={{ __html: viewingBrand.description }}
                    />
                  ) : (
                    <p className="text-gray-500 text-sm italic">No description</p>
                  )}
                </div>

              </div>
            </div>

            {/* SEO Info */}
            <div className="
              bg-white dark:bg-slate-800/30
              p-4 rounded-xl
              border border-gray-300 dark:border-slate-700/50
            ">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-xs text-white">🔍</span>
                SEO Information
              </h3>

              <div className="space-y-3">
                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Meta Title</p>
                  <p className="text-gray-800 dark:text-white text-sm">
                    {viewingBrand.metaTitle || "Not set"}
                  </p>
                </div>

                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Meta Description</p>
                  <p className="text-gray-800 dark:text-white text-sm">
                    {viewingBrand.metaDescription || "Not set"}
                  </p>
                </div>

                <div className="bg-gray-200 dark:bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Meta Keywords</p>
                  <p className="text-gray-800 dark:text-white text-sm">
                    {viewingBrand.metaKeywords || "Not set"}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="
        p-4 border-t border-gray-300 dark:border-slate-700/50
        bg-gray-200 dark:bg-slate-800/30
        rounded-b-2xl shrink-0
      ">
        <div className="flex justify-end">
          <button
            onClick={() => setViewingBrand(null)}
            className="
              px-4 py-2.5
              bg-violet-600 hover:bg-violet-700
              text-white text-sm rounded-lg
              transition-all font-medium
            "
          >
            Close
          </button>
        </div>
      </div>

    </div>
  </div>
)}


{/* ============================================
    IMAGE VIEW MODAL (POLISHED)
============================================ */}
{selectedImageUrl && (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[60] flex items-center justify-center p-4"
    onClick={() => setSelectedImageUrl(null)}
  >
    <div className="relative max-w-6xl max-h-[90vh]">

      {/* Close Button */}
      <button
        onClick={() => setSelectedImageUrl(null)}
        className="
          absolute top-3 right-3
          p-2 rounded-lg
          bg-white/10 hover:bg-red-500
          text-white backdrop-blur-md
          transition-all shadow-md
        "
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image */}
      <img
        src={selectedImageUrl}
        alt="Brand Logo Full View"
        className="
          max-w-full max-h-[90vh]
          rounded-xl
          shadow-2xl
          border border-white/10
        "
        onClick={(e) => e.stopPropagation()}
         onError={(e) => (e.currentTarget.src = "/placeholder.png")}
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
