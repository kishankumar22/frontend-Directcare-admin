"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  Trash2,
  ImagePlus,
  Loader2
} from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";


import { useToast } from "@/components/CustomToast";
import { apiClient } from "@/lib/api";
import { ProductDescriptionEditor } from "../../products/SelfHostedEditor";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface Label {
  name: string;
  color: string;
  icon: string;
  priority: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

interface SEOAnalysis {
  score: number;
  issues: {
    type: "error" | "warning" | "success";
    title: string;
    description: string;
    points: number;
  }[];
}

export default function CreateBlogPostPage() {
  const router = useRouter();
  const  toast  = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // ✅ Form states - ALL FIELDS
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    bodyOverview: "",
    slug: "",
    isPublished: false,
    publishedAt: "",
    startDate: "",
    endDate: "",
    allowComments: true,
    displayOrder: 0,
    showOnHomePage: false,
    includeInSitemap: true,
    featuredImageUrl: "",
    thumbnailImageUrl: "",
    imageUrls: [] as string[],
    videoUrl: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    searchEngineFriendlyPageName: "",
    authorName: "",
    authorId: "",
    tags: [] as string[],
    labels: [] as Label[], // ✅ Added
    limitedToStores: false,
    storeIds: [] as string[],
    customerRoles: "",
    languageId: "",
    relatedBlogPostIds: [] as string[],
    blogCategoryId: "",
  });

  // ✅ Image upload states
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState("");
  const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
  const [thumbnailImagePreview, setThumbnailImagePreview] = useState("");
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);

  // ✅ Label states
  const [labelInput, setLabelInput] = useState({
    name: "",
    color: "#4CAF50",
    icon: "star",
    priority: 1,
  });

  // Tag input
  const [tagInput, setTagInput] = useState("");

  // SEO Analysis
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis>({
    score: 0,
    issues: [],
  });

  // Word count
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    fetchBlogCategories();
    fetchPopularTags();
  }, []);

  // Real-time SEO analysis
  useEffect(() => {
    analyzeSEO();
  }, [
    formData.title,
    formData.body,
    formData.metaTitle,
    formData.metaDescription,
    formData.metaKeywords,
  ]);

  const fetchBlogCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.get<ApiResponse<BlogCategory[]>>(
        "/api/BlogCategories",
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success) {
        setBlogCategories(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchPopularTags = async () => {
    setPopularTags([
      "productivity",
      "technology",
      "business",
      "marketing",
      "design",
      "development",
      "lifestyle",
      "tutorial",
      "news",
      "opinion",
    ]);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter category name");
      return;
    }

    setCreatingCategory(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await apiClient.post<ApiResponse<BlogCategory>>(
        "/api/BlogCategories",
        {
          name: newCategoryName,
          slug: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
          description: "",
          isActive: true,
          displayOrder: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        toast.success("Category created successfully!");
        setNewCategoryName("");
        setShowNewCategoryInput(false);
        await fetchBlogCategories();
      }
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.response?.data?.message || "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  // ✅ Image upload handler
  const handleImageUpload = async (file: File, title: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const formDataToUpload = new FormData();
      formDataToUpload.append("image", file);

      console.log("📤 Uploading image to /api/BlogPosts/upload-image");

      const uploadResponse = await apiClient.post<ApiResponse<string>>(
        `/api/BlogPosts/upload-image?title=${encodeURIComponent(title)}`,
        formDataToUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Image uploaded:", uploadResponse.data);

      if (uploadResponse.data?.success && uploadResponse.data?.data) {
        return uploadResponse.data.data;
      }
      return null;
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    }
  };

  // ✅ Featured image change
  const handleFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setFeaturedImagePreview(previewUrl);
      toast.success("Featured image selected. Will upload on save.");
    }
  };

  // ✅ Thumbnail image change
  const handleThumbnailImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailImage(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailImagePreview(previewUrl);
      toast.success("Thumbnail image selected. Will upload on save.");
    }
  };

  // ✅ Gallery images change
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryImages((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setGalleryImagePreviews((prev) => [...prev, ...previews]);
      toast.success(`${files.length} image(s) selected for gallery`);
    }
  };

  // ✅ Remove gallery image
  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Label management
  const handleAddLabel = () => {
    if (!labelInput.name.trim()) {
      toast.error("Please enter label name");
      return;
    }

    const newLabel: Label = {
      name: labelInput.name,
      color: labelInput.color,
      icon: labelInput.icon,
      priority: labelInput.priority,
    };

    setFormData((prev) => ({
      ...prev,
      labels: [...prev.labels, newLabel],
    }));

    // Reset label input
    setLabelInput({
      name: "",
      color: "#4CAF50",
      icon: "star",
      priority: 1,
    });

    toast.success("Label added!");
  };

  const handleRemoveLabel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((_, i) => i !== index),
    }));
  };

  const analyzeSEO = () => {
    const issues: SEOAnalysis["issues"] = [];
    let score = 100;

    // Title Analysis
    const titleLength = formData.title.length;
    if (titleLength === 0) {
      issues.push({
        type: "error",
        title: "Title Missing",
        description: "Add a title to your post",
        points: 0,
      });
      score -= 20;
    } else if (titleLength < 30 || titleLength > 60) {
      issues.push({
        type: "warning",
        title: titleLength < 30 ? "Title Too Short" : "Title Too Long",
        description: `Title is ${titleLength} characters. Recommended: 30-60 characters`,
        points: 5,
      });
      score -= 5;
    } else {
      issues.push({
        type: "success",
        title: "Title Length",
        description: `Good title length (${titleLength} characters)`,
        points: 10,
      });
    }

    // Meta Description
    const metaDescLength = formData.metaDescription.length;
    if (metaDescLength === 0) {
      issues.push({
        type: "warning",
        title: "Meta Description Missing",
        description: "Add a meta description to improve search results",
        points: 0,
      });
      score -= 10;
    } else if (metaDescLength < 120 || metaDescLength > 160) {
      issues.push({
        type: "warning",
        title:
          metaDescLength < 120 ? "Meta Description Too Short" : "Meta Description Too Long",
        description: `Meta description is ${metaDescLength} characters. Recommended: 120-160 characters`,
        points: 5,
      });
      score -= 5;
    } else {
      issues.push({
        type: "success",
        title: "Meta Description",
        description: `Good meta description length (${metaDescLength} characters)`,
        points: 10,
      });
    }

    // Content Analysis
    const textContent = formData.body.replace(/<[^>]*>/g, "");
    const words = textContent.trim().split(/\s+/).filter((w) => w.length > 0);
    const contentWordCount = words.length;
    setWordCount(contentWordCount);

    if (contentWordCount === 0) {
      issues.push({
        type: "error",
        title: "Content Missing",
        description: "Add content to your post",
        points: 0,
      });
      score -= 30;
    } else if (contentWordCount < 300) {
      issues.push({
        type: "warning",
        title: "Content Too Short",
        description: `Content is ${contentWordCount} words. Recommended: 300+ words`,
        points: 3,
      });
      score -= 15;
    } else {
      issues.push({
        type: "success",
        title: "Content Length",
        description: `Good content length (${contentWordCount} words)`,
        points: 10,
      });
    }

    // Featured Image
    if (!formData.featuredImageUrl && !featuredImagePreview) {
      issues.push({
        type: "warning",
        title: "Featured Image Missing",
        description: "Add a featured image to improve social sharing",
        points: 0,
      });
      score -= 5;
    } else {
      issues.push({
        type: "success",
        title: "Featured Image Set",
        description: "Featured image is added",
        points: 5,
      });
    }

    setSeoAnalysis({
      score: Math.max(0, Math.min(100, score)),
      issues: issues.sort((a, b) => {
        const order = { error: 0, warning: 1, success: 2 };
        return order[a.type] - order[b.type];
      }),
    });
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };
const handleSubmit = async (isDraft: boolean = false) => {
  setSaving(true);
  
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Please login first");
      setSaving(false);
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error("Title is required");
      setSaving(false);
      return;
    }

    if (!formData.body.trim()) {
      toast.error("Content is required");
      setSaving(false);
      return;
    }

    setUploadingImage(true);

    // Upload images
    let finalFeaturedImageUrl = formData.featuredImageUrl;
    if (featuredImage) {
      try {
        const uploadedUrl = await handleImageUpload(
          featuredImage,
          formData.title || "featured-image"
        );
        if (uploadedUrl) {
          finalFeaturedImageUrl = uploadedUrl;
          toast.success("Featured image uploaded!");
        }
      } catch (err) {
        console.error("Featured image upload failed:", err);
        toast.error("Featured image upload failed");
      }
    }

    let finalThumbnailImageUrl = formData.thumbnailImageUrl;
    if (thumbnailImage) {
      try {
        const uploadedUrl = await handleImageUpload(
          thumbnailImage,
          formData.title || "thumbnail"
        );
        if (uploadedUrl) {
          finalThumbnailImageUrl = uploadedUrl;
          toast.success("Thumbnail uploaded!");
        }
      } catch (err) {
        console.error("Thumbnail upload failed:", err);
        toast.error("Thumbnail upload failed");
      }
    }

    const finalImageUrls = [...formData.imageUrls];
    if (galleryImages.length > 0) {
      let successCount = 0;
      for (let i = 0; i < galleryImages.length; i++) {
        try {
          const uploadedUrl = await handleImageUpload(
            galleryImages[i],
            `${formData.title || "gallery"}-${i + 1}`
          );
          if (uploadedUrl) {
            finalImageUrls.push(uploadedUrl);
            successCount++;
          }
        } catch (err) {
          console.error(`Gallery image ${i + 1} upload failed:`, err);
        }
      }
      if (successCount > 0) {
        toast.success(`${successCount} gallery image(s) uploaded!`);
      }
    }

    setUploadingImage(false);

    // Clean HTML entities
    const cleanBody = formData.body
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<span class="token[^>]*>/g, '') // Remove token spans
      .replace(/<\/span>/g, '');

    const payload = {
      title: formData.title.trim(),
      body: cleanBody,
      bodyOverview: formData.bodyOverview.trim(),
      slug: formData.slug.trim() || formData.title.toLowerCase().replace(/\s+/g, '-'),
      isPublished: !isDraft,
      publishedAt: formData.publishedAt || new Date().toISOString(),
      startDate: formData.startDate || new Date().toISOString(),
      endDate: formData.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      allowComments: formData.allowComments,
      displayOrder: formData.displayOrder || 0,
      showOnHomePage: formData.showOnHomePage,
      includeInSitemap: formData.includeInSitemap,
      featuredImageUrl: finalFeaturedImageUrl,
      thumbnailImageUrl: finalThumbnailImageUrl,
      imageUrls: finalImageUrls,
      videoUrl: formData.videoUrl || '',
      metaTitle: formData.metaTitle || formData.title,
      metaDescription: formData.metaDescription || '',
      metaKeywords: formData.metaKeywords || '',
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName || formData.slug,
      authorName: formData.authorName || "Admin",
      authorId: formData.authorId || '',
      tags: formData.tags || [],
      labels: formData.labels || [],
      limitedToStores: formData.limitedToStores || false,
      storeIds: formData.storeIds || [],
      customerRoles: formData.customerRoles || '',
      languageId: formData.languageId || "en-US",
      relatedBlogPostIds: formData.relatedBlogPostIds || [],
      blogCategoryId: formData.blogCategoryId || null,
    };

    console.log("📤 Creating post with payload:", payload);

    // ✅ Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await apiClient.post<ApiResponse<any>>(
        "/api/BlogPosts",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log("✅ Post response:", response.data);

      if (response.data?.success) {
        toast.success(isDraft ? "Draft saved successfully!" : "Post created successfully!");
        
        // Clear preview URLs
        if (featuredImagePreview) URL.revokeObjectURL(featuredImagePreview);
        if (thumbnailImagePreview) URL.revokeObjectURL(thumbnailImagePreview);
        galleryImagePreviews.forEach(url => URL.revokeObjectURL(url));
        
        setTimeout(() => {
          router.push("/admin/BlogPosts");
        }, 1000);
      } else {
        throw new Error(response.data?.message || "Create failed");
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Server took too long to respond');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("❌ Error creating post:", error);
    
    let errorMessage = "Failed to create post";
    
    if (error.code === 'ERR_NETWORK') {
      errorMessage = "Network error - Please check your internet connection or contact admin about CORS configuration";
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors?.[0]) {
      errorMessage = error.response.data.errors[0];
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setSaving(false);
    setUploadingImage(false);
  }
};

// ✅ Slug validation and generation function
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()                          // Convert to lowercase
    .trim()                                 // Remove whitespace from both ends
    .replace(/[^\w\s-]/g, '')              // Remove special characters
    .replace(/\s+/g, '-')                   // Replace spaces with hyphens
    .replace(/--+/g, '-')                   // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');              // Remove leading/trailing hyphens
};

// ✅ Auto-generate slug from title
const handleTitleChange = (newTitle: string) => {
  setFormData((prev) => ({
    ...prev,
    title: newTitle,
    // Auto-generate slug if user hasn't manually edited it
    slug: prev.slug === '' || prev.slug === generateSlug(prev.title)
      ? generateSlug(newTitle)
      : prev.slug,
  }));
};

// ✅ Validate and sanitize slug on manual edit
const handleSlugChange = (newSlug: string) => {
  const sanitizedSlug = generateSlug(newSlug);
  setFormData((prev) => ({
    ...prev,
    slug: sanitizedSlug,
  }));
};

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return { bg: "bg-green-500", text: "text-green-500", label: "Good" };
    if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-500", label: "OK" };
    return { bg: "bg-red-500", text: "text-red-500", label: "Poor" };
  };

  const seoColors = getSEOScoreColor(seoAnalysis.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/20 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  Create New Post
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formData.title || "Untitled Post"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-4">
            {/* Title */}
{/* Title with auto-slug generation */}
<div>
  <input
    type="text"
    value={formData.title}
    onChange={(e) => handleTitleChange(e.target.value)}
    placeholder="Add title"
    className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-slate-700/50 text-3xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all"
  />
</div>

{/* Permalink with manual slug edit */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
  <div className="flex items-center gap-2 text-sm">
    <span className="text-slate-400">Permalink:</span>
    <span className="text-slate-500">/blog/</span>
    <input
      type="text"
      value={formData.slug}
      onChange={(e) => handleSlugChange(e.target.value)}
      placeholder="post-slug"
      className="flex-1 px-2 py-1 bg-slate-800/50 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    />
    {formData.slug && (
      <button
        onClick={() => handleSlugChange(formData.title)}
        className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded transition-all"
        title="Regenerate from title"
      >
        Auto-generate
      </button>
    )}
  </div>
  {formData.slug && (
    <div className="mt-2 text-xs">
      <span className="text-slate-500">Full URL: </span>
      <span className="text-violet-400">{`/blog/${formData.slug}`}</span>
    </div>
  )}
</div>


            {/* Content Editor */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">Content</label>
              <ProductDescriptionEditor
                value={formData.body}
                onChange={(content: any) => setFormData({ ...formData, body: content })}
                placeholder="Write your content here..."
              
                required={false}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{wordCount} words</span>
                <span>Press Alt+0 for help</span>
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Excerpt{" "}
                <span className="text-slate-500 font-normal ml-2">
                  (Excerpts are optional hand-crafted summaries of your content)
                </span>
              </label>
              <textarea
                value={formData.bodyOverview}
                onChange={(e) => setFormData({ ...formData, bodyOverview: e.target.value })}
                placeholder="Write a brief excerpt..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* ✅ Image Upload Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <ImagePlus className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Images</h3>
              </div>

              <div className="space-y-6">
                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Featured Image
                  </label>
                  {featuredImagePreview ? (
                    <div className="relative">
                      <img
                        src={featuredImagePreview}
                        alt="Featured"
                        className="w-full h-48 object-cover rounded-lg border-2 border-dashed border-slate-600"
                      />
                      <button
                        onClick={() => {
                          setFeaturedImage(null);
                          setFeaturedImagePreview("");
                          setFormData({ ...formData, featuredImageUrl: "" });
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <label className="mt-3 block w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg cursor-pointer transition-all text-sm">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFeaturedImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 transition-all group">
                      <div className="flex flex-col items-center">
                        <Upload className="h-12 w-12 text-slate-500 group-hover:text-violet-400 transition-colors mb-2" />
                        <p className="text-sm text-slate-400 text-center">
                          <span className="font-semibold text-white">Click to upload</span> or
                          drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFeaturedImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Thumbnail Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Thumbnail Image
                  </label>
                  {thumbnailImagePreview ? (
                    <div className="relative">
                      <img
                        src={thumbnailImagePreview}
                        alt="Thumbnail"
                        className="w-full h-32 object-cover rounded-lg border-2 border-dashed border-slate-600"
                      />
                      <button
                        onClick={() => {
                          setThumbnailImage(null);
                          setThumbnailImagePreview("");
                          setFormData({ ...formData, thumbnailImageUrl: "" });
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <label className="mt-3 block w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-center rounded-lg cursor-pointer transition-all text-sm">
                        Change Thumbnail
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 transition-all group">
                      <Upload className="h-8 w-8 text-slate-500 group-hover:text-violet-400 transition-colors" />
                      <p className="text-xs text-slate-400 mt-2">Upload Thumbnail</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Gallery Images
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {galleryImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-600"
                        />
                        <button
                          onClick={() => handleRemoveGalleryImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 transition-all">
                    <Plus className="h-6 w-6 text-slate-500" />
                    <p className="text-xs text-slate-400 mt-1">Add Gallery Images</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryImagesChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ✅ Labels Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Labels</h3>

              {/* Existing Labels */}
              {formData.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.labels.map((label, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                      style={{ backgroundColor: `${label.color}20`, color: label.color }}
                    >
                      <span className="text-sm font-medium">{label.name}</span>
                      <span className="text-xs opacity-70">Priority: {label.priority}</span>
                      <button
                        onClick={() => handleRemoveLabel(index)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Label Form */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={labelInput.name}
                  onChange={(e) => setLabelInput({ ...labelInput, name: e.target.value })}
                  placeholder="Label name (e.g., Featured)"
                  className="px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
                <input
                  type="color"
                  value={labelInput.color}
                  onChange={(e) => setLabelInput({ ...labelInput, color: e.target.value })}
                  className="px-2 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={labelInput.icon}
                  onChange={(e) => setLabelInput({ ...labelInput, icon: e.target.value })}
                  placeholder="Icon (e.g., star)"
                  className="px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
                <input
                  type="number"
                  value={labelInput.priority}
                  onChange={(e) =>
                    setLabelInput({ ...labelInput, priority: parseInt(e.target.value) || 1 })
                  }
                  placeholder="Priority"
                  min="1"
                  className="px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                onClick={handleAddLabel}
                className="mt-3 w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all text-sm font-medium"
              >
                Add Label
              </button>
            </div>

            {/* SEO Settings */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Info className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">SEO Settings</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="SEO optimized title"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Recommended: 50-60 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, metaDescription: e.target.value })
                    }
                    placeholder="Brief description for search engines"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">Recommended: 150-160 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Focus Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.metaKeywords}
                    onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Separate keywords with commas</p>
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Settings</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Author Name
                    </label>
                    <input
                      type="text"
                      value={formData.authorName}
                      onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Language ID
                    </label>
                    <input
                      type="text"
                      value={formData.languageId}
                      onChange={(e) => setFormData({ ...formData, languageId: e.target.value })}
                      placeholder="en-US"
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* SEO Analysis */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">SEO Analysis</h3>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-full ${seoColors.bg} flex items-center justify-center`}
                  >
                    <span className="text-white text-xl font-bold">{seoAnalysis.score}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${seoColors.text}`}>
                      {seoColors.label}
                    </p>
                    <p className="text-xs text-slate-500">SEO Score</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {seoAnalysis.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      issue.type === "error"
                        ? "bg-red-500/5 border-red-500/20"
                        : issue.type === "warning"
                        ? "bg-yellow-500/5 border-yellow-500/20"
                        : "bg-green-500/5 border-green-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {issue.type === "error" ? (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        ) : issue.type === "warning" ? (
                          <Info className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4
                          className={`font-semibold text-sm mb-1 ${
                            issue.type === "error"
                              ? "text-red-400"
                              : issue.type === "warning"
                              ? "text-yellow-400"
                              : "text-green-400"
                          }`}
                        >
                          {issue.title}
                        </h4>
                        <p className="text-xs text-slate-400">{issue.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{issue.points} points</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={analyzeSEO}
                className="mt-4 w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all text-sm font-medium"
              >
                Refresh Analysis
              </button>
            </div>

            {/* Save Buttons */}
            <div className="mt-6 space-y-3 pt-6 border-t border-slate-700">
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving || uploadingImage}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={saving || uploadingImage}
                className="w-full px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving || uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadingImage ? "Uploading Images..." : "Publishing..."}
                  </>
                ) : (
                  "Publish Post"
                )}
              </button>
            </div>

            {/* Categories */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {blogCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-800/30 rounded-lg cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={formData.blogCategoryId === category.id}
                      onChange={() =>
                        setFormData({ ...formData, blogCategoryId: category.id })
                      }
                      className="w-4 h-4 text-violet-500 focus:ring-2 focus:ring-violet-500 rounded"
                    />
                    <span className="text-sm text-slate-300">{category.name}</span>
                  </label>
                ))}
              </div>

              {showNewCategoryInput ? (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                    >
                      {creatingCategory ? "Creating..." : "Add"}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCategoryInput(true)}
                  className="mt-4 w-full px-4 py-2 text-violet-400 hover:text-violet-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add New Category
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Type and press Enter to add tags"
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm mb-3"
              />

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-violet-500/10 text-violet-400 rounded-lg text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Popular Tags</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={formData.tags.includes(tag)}
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Publish Settings */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Publish</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Published</p>
                    <p className="text-xs text-slate-500">Post is visible to readers</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.showOnHomePage}
                    onChange={(e) =>
                      setFormData({ ...formData, showOnHomePage: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-300">Featured post</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.allowComments}
                    onChange={(e) =>
                      setFormData({ ...formData, allowComments: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-300">Allow comments</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.includeInSitemap}
                    onChange={(e) =>
                      setFormData({ ...formData, includeInSitemap: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-300">Include in sitemap</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Publish Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
}
