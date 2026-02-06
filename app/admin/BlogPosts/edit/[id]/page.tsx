"use client";
// ✅ ADD these imports at top of file
import React, { useState } from "react";
import * as Icons from "lucide-react";
import { BlogCategory, blogPostsService } from "@/lib/services/blogPosts";
import { blogCategoriesService } from "@/lib/services/blogCategories";
import {  useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Tag,
  ArrowLeft,
  Save,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Plus,
  ImagePlus,
  Trash2
} from "lucide-react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/app/admin/_component/CustomToast";
import { apiClient } from "@/lib/api";
import { ProductDescriptionEditor } from "@/app/admin/_component/SelfHostedEditor";


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

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;
  const toast = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  let slugTimer: any;
// ✅ REPLACE POPULAR_ICONS with this
const POPULAR_ICONS = [
  // Featured & Status
  "Star", "Fire", "Zap", "TrendingUp", "Award", "Trophy", "Medal", "Crown",
  
  // Engagement
  "Heart", "ThumbsUp", "ThumbsDown", "MessageSquare", "Eye", "Share2",
  
  // E-commerce
  "ShoppingCart", "ShoppingBag", "CreditCard", "DollarSign", "Tag", "Package",
  "Gift", "Truck", "PercentSquare", "Receipt",
  
  // Blog Categories
  "BookOpen", "Newspaper", "FileText", "Edit", "Pen", "Bookmark",
  
  // Time & Schedule
  "Clock", "Calendar", "Timer", "AlarmClock",
  
  // Social & Media
  "Image", "Video", "Music", "Camera", "Youtube", "Instagram",
  
  // Alerts & Info
  "Bell", "AlertCircle", "Info", "CheckCircle", "XCircle",
  
  // Business
  "Briefcase", "Building", "Users", "User", "Target",
  
  // Tech & Digital
  "Smartphone", "Laptop", "Wifi", "Globe",
];

// ✅ ADD: Extract filename from URL
const extractFilename = (imageUrl: string) => {
  if (!imageUrl) return "";

  // Remove full domain if present
  const cleanedUrl = imageUrl.replace(API_BASE_URL, "");

  // Split by "/" to extract last segment
  const parts = cleanedUrl.split("/");

  // Return only filename
  return parts.pop() || "";
};



  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Blog categories
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // ✅ Related Posts States
  const [allBlogPosts, setAllBlogPosts] = useState<{ id: string; title: string }[]>([]);
  const [relatedPostSearch, setRelatedPostSearch] = useState("");
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false);
// ✅ ADD these states
const [slugExists, setSlugExists] = useState(false);
const [checkingSlug, setCheckingSlug] = useState(false);
// ✅ ADD this state for icon dropdown


// ✅ ADD these states
const [showIconSuggestions, setShowIconSuggestions] = useState(false);

const renderIcon = (iconName: string, className: string = "h-4 w-4", color?: string) => {
  if (!iconName || iconName.trim() === "") {
    const TagIcon = Icons.Tag;
    return <TagIcon className={className} style={{ color }} />;
  }
  
  try {
    // Get icon from Icons object
    const IconComponent = (Icons as any)[iconName];
    
    // Check if it exists and is a React component
    if (
      IconComponent && 
      typeof IconComponent === 'object' && 
      '$$typeof' in IconComponent
    ) {
      return <IconComponent className={className} style={{ color }} />;
    }
  } catch (error) {
    // Silent error
  }
  
  // Fallback to Tag icon
  const TagIcon = Icons.Tag;
  return <TagIcon className={className} style={{ color }} />;
};


  // Form states - ALL FIELDS
  const [formData, setFormData] = useState({
    id: "", // ✅ Added
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
    relatedBlogPostIds: [] as string[], // ✅ Added
    blogCategoryId: "",
    manualSlugEdited: false
  });

  // Image upload states
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState("");
  const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
  const [thumbnailImagePreview, setThumbnailImagePreview] = useState("");
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
// ✅ ADD: Close icon suggestions when clicking outside
useEffect(() => {
  const handleClickOutside = () => setShowIconSuggestions(false);
  
  if (showIconSuggestions) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
}, [showIconSuggestions]);

  // Label states
  const [labelInput, setLabelInput] = useState({
    name: "",
    color: "#050505",
    icon: "Tag",
    priority: 1,
  });
// Filter icons
const filteredIcons = POPULAR_ICONS.filter(icon =>
  icon.toLowerCase().includes(labelInput.icon.toLowerCase())
);
  // Tag input
  const [tagInput, setTagInput] = useState("")

  // SEO Analysis
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis>({
    score: 0,
    issues: [],
  });

  // Word count
  const [wordCount, setWordCount] = useState(0);

  // ✅ Fetch All Blog Posts for Related Selection
const fetchAllBlogPosts = async () => {
  try {
    const response = await blogPostsService.getAll(true, false);
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      const posts = response.data.data
        .filter((post: any) => post.id !== postId) // ✅ Exclude current post
        .map((post: any) => ({
          id: post.id,
          title: post.title,
        }));
      console.log("✅ Loaded blog posts for related selection:", posts.length);
      setAllBlogPosts(posts);
    }
  } catch (error) {
    console.error("❌ Error fetching blog posts:", error);
  }
};

  // ✅ ADD: Delete image from server
const deleteImageFromServer = async (imageUrl: string) => {
  if (!imageUrl) return;

  try {
    const filename = extractFilename(imageUrl);
    
    if (!filename) {
      console.log("No filename extracted from:", imageUrl);
      return;
    }

    console.log("🗑️ Deleting image:", filename);
    
    const response = await blogPostsService.deleteImage(filename);

    if (response.data?.success) {
      console.log("✅ Image deleted from server:", filename);
      toast.success("Image deleted successfully");
      return true;
    } else {
      console.log("❌ Failed to delete image:", response.data?.message);
      return false;
    }
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return false;
  }
};


// ✅ ADD this function - Important: Excludes current post
const checkSlugExists = async (slug: string) => {
  if (!slug || slug.length < 3) {
    setSlugExists(false);
    return;
  }

  setCheckingSlug(true);
  try {
    const response = await blogPostsService.getAll(true, false);

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const exists = response.data.data.some(
        (post: any) => 
          post.slug.toLowerCase() === slug.toLowerCase() && 
          post.id !== postId // ✅ Exclude current post
      );
      setSlugExists(exists);
    }
  } catch (error) {
    console.error("Error checking slug:", error);
    setSlugExists(false);
  } finally {
    setCheckingSlug(false);
  }
};


  // ✅ Click Outside Handler for Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        showRelatedDropdown
      ) {
        console.log("🔵 Clicked outside - closing dropdown");
        setShowRelatedDropdown(false);
        setRelatedPostSearch("");
      }
    };

    if (showRelatedDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRelatedDropdown]);

  // ✅ Monitor Related Posts State Changes
  useEffect(() => {
    console.log("📊 Related Posts State Updated:");
    console.log("  Total:", formData.relatedBlogPostIds.length);
    console.log("  IDs:", formData.relatedBlogPostIds);
  }, [formData.relatedBlogPostIds]);

  // ✅ useEffect - Load Data on Mount
  useEffect(() => {
    fetchBlogCategories();
    fetchPopularTags();
    fetchAllBlogPosts();
    
    if (postId) {
      fetchBlogPost(postId);
    }
  }, [postId]);

  // Real-time SEO analysis
  useEffect(() => {
    analyzeSEO();
  }, [formData.title, formData.body, formData.metaTitle, formData.metaDescription, formData.metaKeywords]);

const fetchBlogCategories = async () => {
  try {
    const response = await blogPostsService.getAllCategories();
    if (response.data?.success) {
      setBlogCategories(response.data.data);
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

  // ✅ Fetch Blog Post Details
const fetchBlogPost = async (id: string) => {
  setLoading(true);
  try {
    console.log("📥 Fetching blog post:", id);
    
    const response = await blogPostsService.getById(id);
    console.log("✅ Blog post loaded:", response.data);

    if (response.data?.success && response.data.data) {
      const post = response.data.data;

      // ✅ SET ALL FIELDS (complete object)
      setFormData({
        id: post.id,
        title: post.title || "",
        body: post.body || "",
        bodyOverview: post.bodyOverview || "",
        slug: post.slug || "",
        isPublished: post.isPublished !== undefined ? post.isPublished : false,
        
        // ✅ DateTime fields
        publishedAt: post.publishedAt
          ? new Date(post.publishedAt).toISOString().slice(0, 16)
          : "",
        startDate: post.startDate
          ? new Date(post.startDate).toISOString().slice(0, 16)
          : "",
        endDate: post.endDate
          ? new Date(post.endDate).toISOString().slice(0, 16)
          : "",
        
        // ✅ Boolean fields
        allowComments: post.allowComments !== undefined ? post.allowComments : true,
        showOnHomePage: post.showOnHomePage || false,
        includeInSitemap: post.includeInSitemap !== undefined ? post.includeInSitemap : true,
        limitedToStores: post.limitedToStores || false,
        
        // ✅ Number field
        displayOrder: post.displayOrder || 0,
        
        // ✅ Image URLs
        featuredImageUrl: post.featuredImageUrl || "",
        thumbnailImageUrl: post.thumbnailImageUrl || "",
        imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : [],
        
        // ✅ Optional string fields
        videoUrl: post.videoUrl || "",
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        metaKeywords: post.metaKeywords || "",
        searchEngineFriendlyPageName: post.searchEngineFriendlyPageName || "",
        
        // ✅ Author fields
        authorName: post.authorName || "",
        authorId: post.authorId || "",
        
        // ✅ Array fields
        tags: Array.isArray(post.tags) ? post.tags : [],
        labels: Array.isArray(post.labels) ? post.labels : [],
        storeIds: Array.isArray(post.storeIds) ? post.storeIds : [],
        relatedBlogPostIds: Array.isArray(post.relatedBlogPostIds) ? post.relatedBlogPostIds : [],
        
        // ✅ Other optional fields
        customerRoles: post.customerRoles || "",
        languageId: post.languageId || "",
        blogCategoryId: post.blogCategoryId || "",
        
        // ✅ Internal field
        manualSlugEdited: false,
      });

      // Set image previews
      if (post.featuredImageUrl) {
        setFeaturedImagePreview(getImageUrl(post.featuredImageUrl));
      }
      if (post.thumbnailImageUrl) {
        setThumbnailImagePreview(getImageUrl(post.thumbnailImageUrl));
      }
      if (post.imageUrls && post.imageUrls.length > 0) {
        setGalleryImagePreviews(
          post.imageUrls.map((url: string) => getImageUrl(url))
        );
      }

      console.log("✅ Related posts prefilled:", post.relatedBlogPostIds?.length || 0);
    } else {
      toast.error("Failed to load post");
      router.push("/admin/BlogPosts");
    }
  } catch (error: any) {
    console.error("❌ Error fetching blog post:", error);
    toast.error(error.response?.data?.message || "Failed to load blog post");
    router.push("/admin/BlogPosts");
  } finally {
    setLoading(false);
  }
};




  // ✅ Add Related Post Handler - OPTIMIZED
  const handleAddRelatedPost = (postId: string) => {
    console.log("🖱️ Button clicked - Adding post:", postId);
    console.log("🔵 Current IDs before update:", formData.relatedBlogPostIds);

    if (!postId?.trim()) {
      toast.error("Invalid post ID");
      return;
    }

    setFormData((prev) => {
      console.log("🟢 Inside updater - Current IDs:", prev.relatedBlogPostIds);
      
      if (prev.relatedBlogPostIds.includes(postId)) {
        console.log("⚠️ Post already exists");
        toast.warning("This post is already added!");
        return prev;
      }

      const newIds = [...prev.relatedBlogPostIds, postId];
      console.log("✅ New IDs after add:", newIds);

    

      return {
        ...prev,
        relatedBlogPostIds: newIds,
      };
    });

    setTimeout(() => {
      setRelatedPostSearch("");
      setShowRelatedDropdown(false);
    }, 200);
  };

  // ✅ Remove Related Post Handler - OPTIMIZED
  const handleRemoveRelatedPost = (postId: string) => {
    console.log("🗑️ Removing post:", postId);

    setFormData((prev) => {
      const newIds = prev.relatedBlogPostIds.filter((id) => id !== postId);
      console.log("✅ Remaining IDs:", newIds);

      return {
        ...prev,
        relatedBlogPostIds: newIds,
      };
    });
  };

  // ✅ Filter Posts for Dropdown - OPTIMIZED
  const filteredBlogPosts = allBlogPosts.filter((post) => {
    const searchLower = relatedPostSearch.toLowerCase().trim();
    
    if (formData.relatedBlogPostIds.includes(post.id)) {
      return false;
    }
    
    if (!searchLower) {
      return true;
    }
    
    return post.title.toLowerCase().includes(searchLower);
  });

  // ✅ Get Post Title by ID - OPTIMIZED
  const getSelectedPostTitle = (postId: string) => {
    const post = allBlogPosts.find((p) => p.id === postId);
    return post?.title || "Unknown Post";
  };

  const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const cleanUrl = imageUrl.replace(API_BASE_URL, "").split("?")[0];
    return `${API_BASE_URL}${cleanUrl}`;
  };

  // ✅ Create New Category Handler
const handleCreateCategory = async () => {
  if (!newCategoryName.trim()) {
    toast.error("Please enter category name");
    return;
  }

  setCreatingCategory(true);
  try {
    const response = await blogCategoriesService.create({
      name: newCategoryName,
      slug: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
      description: "",
      isActive: true,
      displayOrder: 0,
    });

    // ✅ CORRECT: response.data is ApiResponse<BlogCategory>
    if (response.data?.success) {
      toast.success("Category created successfully!");
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      await fetchBlogCategories();
      
      // ✅ Auto-select the new category
      const categoryId = response.data.data.id;
      if (categoryId) {
        setFormData((prev) => ({
          ...prev,
          blogCategoryId: categoryId,
        }));
      }
    }
  } catch (error: any) {
    console.error("Error creating category:", error);
    toast.error(error.response?.data?.message || "Failed to create category");
  } finally {
    setCreatingCategory(false);
  }
};



  // Image upload handler
const handleImageUpload = async (file: File, title: string) => {
  try {
    console.log(`Uploading image with title: ${title}`);
    
    const uploadResponse = await blogPostsService.uploadImage(file, { title });

    console.log("Image uploaded:", uploadResponse.data);

    if (uploadResponse.data?.success && uploadResponse.data?.data) {
      return uploadResponse.data.data;
    }
    return null;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image");
    return null;
  }
};

// ✅ REPLACE: Delete featured image with API call
const handleDeleteFeaturedImage = async () => {
  // Delete from server if URL exists
  if (formData.featuredImageUrl) {
    await deleteImageFromServer(formData.featuredImageUrl);
  }

  // Clear local state
  setFeaturedImage(null);
  setFeaturedImagePreview("");
  
  // Clear from formData
  setFormData({
    ...formData,
    featuredImageUrl: "",
  });

  toast.success("Featured image removed");
};
// ✅ REPLACE: Delete thumbnail image with API call
const handleDeleteThumbnailImage = async () => {
  // Delete from server if URL exists
  if (formData.thumbnailImageUrl) {
    await deleteImageFromServer(formData.thumbnailImageUrl);
  }

  // Clear local state
  setThumbnailImage(null);
  setThumbnailImagePreview("");
  
  // Clear from formData
  setFormData({
    ...formData,
    thumbnailImageUrl: "",
  });

  toast.success("Thumbnail image removed");
};

  // Featured image change
  const handleFeaturedImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setFeaturedImagePreview(previewUrl);
      toast.success("Featured image selected. Will upload on save.");
    }
  };

  // Thumbnail image change
  const handleThumbnailImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailImage(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailImagePreview(previewUrl);
      toast.success("Thumbnail image selected. Will upload on save.");
    }
  };

  // Gallery images change
  const handleGalleryImagesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryImages((prev) => [...prev, ...files]);
      const previews = files.map((file) => URL.createObjectURL(file));
      setGalleryImagePreviews((prev) => [...prev, ...previews]);
      toast.success(`${files.length} images selected for gallery`);
    }
  };

  // Remove gallery image
 // ✅ REPLACE: Delete gallery image with API call
const handleRemoveGalleryImage = async (index: number) => { 
  // Check if it's an existing server image
  if (index < formData.imageUrls.length) {
    const imageUrl = formData.imageUrls[index];
    await deleteImageFromServer(imageUrl);
    
    // Remove from formData
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  }

  // Remove from preview arrays
  setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  setGalleryImagePreviews((prev) => prev.filter((_, i) => i !== index));

  toast.success("Gallery image removed");
};

  // Label management
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

    setLabelInput({
      name: "",
      color: "#050505",
      icon: "",
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

// ✅ COMPLETE analyzeSEO with Headings Check
const analyzeSEO = () => {
  const issues: SEOAnalysis["issues"] = [];
  let score = 100;

  // Get keywords array
  const keywords = formData.metaKeywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);

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
      description: `Title is ${titleLength} characters. Recommended: 30-60`,
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

  // Keywords in Title
  if (keywords.length > 0) {
    const titleLower = formData.title.toLowerCase();
    const keywordsInTitle = keywords.filter((keyword) =>
      titleLower.includes(keyword)
    );

    if (keywordsInTitle.length === 0) {
      issues.push({
        type: "warning",
        title: "Keywords Not in Title",
        description: "Consider including focus keywords in your title",
        points: 0,
      });
      score -= 10;
    } else {
      issues.push({
        type: "success",
        title: "Keywords in Title",
        description: `Found ${keywordsInTitle.length} keyword(s): ${keywordsInTitle.join(", ")}`,
        points: 10,
      });
    }
  }

  // Meta Description
  const metaDescLength = formData.metaDescription.length;
  if (metaDescLength === 0) {
    issues.push({
      type: "warning",
      title: "Meta Description Missing",
      description: "Add a meta description",
      points: 0,
    });
    score -= 10;
  } else if (metaDescLength < 120 || metaDescLength > 160) {
    issues.push({
      type: "warning",
      title: metaDescLength < 120 ? "Meta Description Too Short" : "Meta Description Too Long",
      description: `${metaDescLength} characters. Recommended: 120-160`,
      points: 5,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      title: "Meta Description",
      description: `Perfect length (${metaDescLength} characters)`,
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
      description: `${contentWordCount} words. Recommended: 300+`,
      points: 3,
    });
    score -= 15;
  } else {
    issues.push({
      type: "success",
      title: "Content Length",
      description: `Good content (${contentWordCount} words)`,
      points: 10,
    });
  }

  // ✅ NEW: Headings Check (H1, H2, H3)
  const h1Count = (formData.body.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (formData.body.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (formData.body.match(/<h3[^>]*>/gi) || []).length;
  const totalHeadings = h1Count + h2Count + h3Count;

  if (totalHeadings === 0) {
    issues.push({
      type: "warning",
      title: "No Headings",
      description: "Add headings (H1, H2, H3) to structure your content",
      points: 0,
    });
    score -= 10;
  } else {
    const headingDetails = [];
    if (h1Count > 0) headingDetails.push(`${h1Count} H1`);
    if (h2Count > 0) headingDetails.push(`${h2Count} H2`);
    if (h3Count > 0) headingDetails.push(`${h3Count} H3`);

    issues.push({
      type: "success",
      title: "Content Structure",
      description: `Good use of headings: ${headingDetails.join(", ")}`,
      points: 10,
    });

    // Warning if too many H1s
    if (h1Count > 1) {
      issues.push({
        type: "warning",
        title: "Multiple H1 Tags",
        description: `Found ${h1Count} H1 tags. Use only one H1 per page for better SEO`,
        points: 0,
      });
      score -= 5;
    }
  }

  // Keywords in Content
  if (keywords.length > 0 && contentWordCount > 0) {
    const contentLower = textContent.toLowerCase();
    const keywordsInContent = keywords.filter((keyword) =>
      contentLower.includes(keyword)
    );

    if (keywordsInContent.length === 0) {
      issues.push({
        type: "warning",
        title: "Keywords Not in Content",
        description: "Include focus keywords naturally in your content",
        points: 0,
      });
      score -= 10;
    } else {
      const keywordOccurrences = keywordsInContent.reduce((count, keyword) => {
        const regex = new RegExp(keyword, "gi");
        return count + (contentLower.match(regex) || []).length;
      }, 0);

      const density = ((keywordOccurrences / contentWordCount) * 100).toFixed(2);

      if (parseFloat(density) < 0.5) {
        issues.push({
          type: "warning",
          title: "Low Keyword Density",
          description: `Keywords appear ${keywordOccurrences} time(s) (${density}%). Use more naturally`,
          points: 5,
        });
        score -= 5;
      } else if (parseFloat(density) > 3) {
        issues.push({
          type: "warning",
          title: "High Keyword Density",
          description: `Keywords appear too frequently (${density}%). Avoid keyword stuffing`,
          points: 5,
        });
        score -= 5;
      } else {
        issues.push({
          type: "success",
          title: "Keywords in Content",
          description: `Good keyword density (${density}%)`,
          points: 10,
        });
      }
    }
  }

  // Focus Keywords Check
  if (keywords.length === 0) {
    issues.push({
      type: "warning",
      title: "No Focus Keywords",
      description: "Add focus keywords to improve SEO",
      points: 0,
    });
    score -= 5;
  } else if (keywords.length > 5) {
    issues.push({
      type: "warning",
      title: "Too Many Keywords",
      description: `${keywords.length} keywords. Recommended: 3-5`,
      points: 5,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      title: "Focus Keywords Set",
      description: `${keywords.length} keyword(s): ${keywords.join(", ")}`,
      points: 5,
    });
  }

  // Featured Image
  if (!formData.featuredImageUrl && !featuredImagePreview) {
    issues.push({
      type: "warning",
      title: "Featured Image Missing",
      description: "Add a featured image",
      points: 0,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      title: "Featured Image Set",
      description: "Featured image added",
      points: 5,
    });
  }

  // Slug Check
  if (formData.slug.length === 0) {
    issues.push({
      type: "error",
      title: "URL Slug Missing",
      description: "Add a URL slug",
      points: 0,
    });
    score -= 10;
  } else if (formData.slug.length > 60) {
    issues.push({
      type: "warning",
      title: "URL Slug Too Long",
      description: "Keep URL under 60 characters",
      points: 5,
    });
    score -= 5;
  } else {
    issues.push({
      type: "success",
      title: "URL Slug",
      description: `Good URL (${formData.slug.length} chars)`,
      points: 5,
    });
  }

  // Keywords in URL
  if (keywords.length > 0) {
    const slugLower = formData.slug.toLowerCase();
    const keywordsInSlug = keywords.filter((keyword) =>
      slugLower.includes(keyword)
    );

    if (keywordsInSlug.length > 0) {
      issues.push({
        type: "success",
        title: "Keywords in URL",
        description: `URL contains: ${keywordsInSlug.join(", ")}`,
        points: 5,
      });
    } else {
      issues.push({
        type: "warning",
        title: "Keywords Not in URL",
        description: "Include a keyword in URL",
        points: 0,
      });
      score -= 5;
    }
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

// ✅ FIXED: handleSubmit function
const handleSubmit = async (isDraft: boolean = false) => {
  setSaving(true);
  try {
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

    // ✅ CRITICAL: Verify we have the post ID
    if (!postId) {
      toast.error("Post ID is missing");
      setSaving(false);
      return;
    }

    // ✅ Slug validation
    if (slugExists) {
      toast.error("Slug already exists in another post!");
      setSaving(false);
      return;
    }
    if(formData.metaTitle.trim().length > 60){
      toast.error("Meta Title cannot exceed 60 characters.");
      setSaving(false);
      return;
     }
     if(formData.metaDescription.trim().length > 160){
      toast.error("Meta Description cannot exceed 160 characters.");
      setSaving(false);
      return;
     }
     if(formData.metaKeywords.trim().length > 60){
      toast.error("Meta Keywords cannot exceed 60 characters.");
      setSaving(false);
      return;
     }
     if(formData.searchEngineFriendlyPageName.trim().length > 60){
      toast.error("Search Engine Friendly Page Name cannot exceed 60 characters.");
      setSaving(false);
      return;
     }
    setUploadingImage(true);

    // Upload images (same logic as before)
    let finalFeaturedImageUrl = formData.featuredImageUrl;
    if (featuredImage) {
      try {
        const uploadedUrl = await handleImageUpload(
          featuredImage,
          `${formData.title}-featured-image`
        );
        if (uploadedUrl) {
          finalFeaturedImageUrl = uploadedUrl;
          toast.success("Featured image uploaded!");
        }
      } catch (err) {
        console.error("Featured image upload failed:", err);
      }
    }

    let finalThumbnailImageUrl = formData.thumbnailImageUrl;
    if (thumbnailImage) {
      try {
        const uploadedUrl = await handleImageUpload(
          thumbnailImage,
          `${formData.title}-thumbnail`
        );
        if (uploadedUrl) {
          finalThumbnailImageUrl = uploadedUrl;
          toast.success("Thumbnail uploaded!");
        }
      } catch (err) {
        console.error("Thumbnail upload failed:", err);
      }
    }

    const finalImageUrls = [...formData.imageUrls];
    if (galleryImages.length > 0) {
      let successCount = 0;
      for (let i = 0; i < galleryImages.length; i++) {
        try {
          const uploadedUrl = await handleImageUpload(
            galleryImages[i],
            `${formData.title}-gallery-${i + 1}`
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
        toast.success(`${successCount} gallery images uploaded!`);
      }
    }

    setUploadingImage(false);

    // Clean HTML entities
    const cleanBody = formData.body
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<span class="token">/g, "")
      .replace(/<\/span>/g, "");

    const payload = {
      id: postId, // ✅ Must match URL parameter
      title: formData.title.trim(),
      body: cleanBody,
      bodyOverview: formData.bodyOverview.trim() || "",
      slug:
        formData.slug.trim() ||
        formData.title.toLowerCase().replace(/\s+/g, "-"),
      isPublished: !isDraft,

      publishedAt: formData.publishedAt
        ? new Date(formData.publishedAt).toISOString()
        : new Date().toISOString(),
      startDate: formData.startDate
        ? new Date(formData.startDate).toISOString()
        : new Date().toISOString(),
      endDate: formData.endDate
        ? new Date(formData.endDate).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),

      allowComments: formData.allowComments,
      displayOrder: formData.displayOrder || 0,
      showOnHomePage: formData.showOnHomePage,
      includeInSitemap: formData.includeInSitemap,
      limitedToStores: formData.limitedToStores || false,

      featuredImageUrl: finalFeaturedImageUrl || "",
      thumbnailImageUrl: finalThumbnailImageUrl || "",
      imageUrls: finalImageUrls,

      videoUrl: formData.videoUrl.trim() || null,
      metaTitle: formData.metaTitle.trim() || formData.title.trim(),
      metaDescription: formData.metaDescription.trim() || "",
      metaKeywords: formData.metaKeywords.trim() || "",
      searchEngineFriendlyPageName:
        formData.searchEngineFriendlyPageName.trim() || formData.slug.trim(),

      authorName: formData.authorName.trim() || "Admin",
      authorId: formData.authorId.trim() || null,

      tags: formData.tags || [],
      labels: formData.labels || [],
      storeIds: formData.storeIds || [],
      relatedBlogPostIds: formData.relatedBlogPostIds || [],

      customerRoles: formData.customerRoles.trim() || null,
      languageId: formData.languageId.trim() || "en-US",

      blogCategoryId: formData.blogCategoryId || null,
    };

    console.log("📤 Updating post ID:", postId);
    console.log("📤 Payload:", JSON.stringify(payload, null, 2));

    // ✅ SERVICE-BASED UPDATE (replaces apiClient.put)
    const response = await blogPostsService.update(postId, payload);

    console.log("✅ Post updated:", response.data);

    if (response.data?.success) {
      toast.success(
        isDraft ? "Draft saved successfully!" : "Post updated successfully!"
      );

      // Cleanup blob URLs
      if (featuredImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(featuredImagePreview);
      }
      if (thumbnailImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailImagePreview);
      }
      galleryImagePreviews
        .filter((url) => url.startsWith("blob:"))
        .forEach((url) => URL.revokeObjectURL(url));

      setTimeout(() => {
        router.push("/admin/BlogPosts");
      }, 1000);
    } else {
      throw new Error(response.data?.message || "Update failed");
    }
  } catch (error: any) {
    console.error("❌ Error updating post:", error);

    let errorMessage = "Failed to update post";
    if (error.code === "ERR_NETWORK") {
      errorMessage = "Network error - Please check your internet connection";
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



  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

// ✅ REPLACE existing handleTitleChange
const handleTitleChange = (newTitle: string) => {
  const newSlug = generateSlug(newTitle);
  
  setFormData((prev) => ({
    ...prev,
    title: newTitle,
    slug: newSlug,
  }));

  clearTimeout(slugTimer);
  slugTimer = setTimeout(() => {
    if (newSlug.length > 2) {
      checkSlugExists(newSlug);
    }
  }, 800);
};


// ✅ REPLACE existing handleSlugChange
const handleSlugChange = (value: string) => {
  setFormData((prev) => ({ ...prev, slug: value }));

  clearTimeout(slugTimer);
  slugTimer = setTimeout(() => {
    const clean = generateSlug(value);
    setFormData((prev) => ({ ...prev, slug: clean }));
    if (clean.length > 2) {
      checkSlugExists(clean);
    }
  }, 800);
};


  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return { bg: "bg-green-500", text: "text-green-500", label: "Good" };
    if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-500", label: "OK" };
    return { bg: "bg-red-500", text: "text-red-500", label: "Poor" };
  };

  const seoColors = getSEOScoreColor(seoAnalysis.score);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen ">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" ">
      {/* Header */}
      <div className="z-10">
        <div className="max-w-[1920px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  Edit Post
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formData.title || "Untitled Post"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mt-2">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Main Content - Same as Create Page */}
          <div className="xl:col-span-2 space-y-2">
            {/* Title */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Add title"
                className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-slate-700/50 text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>

            {/* Permalink */}
{/* ✅ REPLACE Permalink section in Edit page */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
  <div className="flex items-center gap-2 text-sm">
    <span className="text-slate-400">Permalink:</span>
    <span className="text-slate-500">/blog/</span>
    <div className="flex-1 relative">
      <input
        type="text"
        value={formData.slug}
        onChange={(e) => handleSlugChange(e.target.value)}
        placeholder="post-slug"
        className={`w-full px-3 py-2 pr-10 bg-slate-800/50 border rounded text-white text-sm focus:outline-none focus:ring-2 transition-all ${
          checkingSlug
            ? "border-blue-500 ring-blue-500/50"
            : slugExists
            ? "border-red-500 ring-red-500/50"
            : formData.slug
            ? "border-green-500 ring-green-500/50"
            : "border-slate-600"
        }`}
      />
      
      {/* Status Icon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {checkingSlug && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
        {!checkingSlug && slugExists && (
          <AlertTriangle className="h-4 w-4 text-red-400" />
        )}
        {!checkingSlug && !slugExists && formData.slug && (
          <CheckCircle className="h-4 w-4 text-green-400" />
        )}
      </div>
    </div>
  </div>

  {/* ✅ CHANGED: Left-Right Split */}
  <div className="mt-2 flex items-center justify-between gap-4 text-xs">
    {/* Left Side - URL */}
    <div className="flex-shrink-0">
      {formData.slug && (
        <>
          <span className="text-slate-500">URL: </span>
          <span className="text-violet-400">/blog/{formData.slug}</span>
        </>
      )}
    </div>

    {/* Right Side - Status Messages */}
    <div className="flex-shrink-0">
      {checkingSlug && (
        <span className="text-blue-400">Checking availability...</span>
      )}
      
      {slugExists && (
        <span className="text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Slug already exists in another post!
        </span>
      )}

      {!checkingSlug && !slugExists && formData.slug && (
        <span className="text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Slug is available!
        </span>
      )}
    </div>
  </div>
</div>



            {/* Content Editor */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Content
              </label>
              <ProductDescriptionEditor
                value={formData.body}
                onChange={(content: any) =>
                  setFormData({ ...formData, body: content })
                }
                placeholder="Write your content here..."
                required={false}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{wordCount} words</span>
                <span>Press Alt+0 for help</span>
              </div>
            </div>

            {/* bodyOverview */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                BodyOverview{" "}
                <span className="text-slate-500 font-normal ml-2">
                  (BodyOverview are optional hand-crafted summaries of your content)
                </span>
              </label>
              <textarea
                value={formData.bodyOverview}
                onChange={(e) =>
                  setFormData({ ...formData, bodyOverview: e.target.value })
                }
                placeholder="Write a brief excerpt..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Image Upload Section - Same as Create Page */}
{/* ✅ COMPLETE IMAGES SECTION WITH API DELETE */}
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
            onClick={handleDeleteFeaturedImage}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
            title="Delete featured image"
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
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 transition-all group">
          <div className="flex flex-col items-center">
            <Upload className="h-8 w-8 text-slate-500 group-hover:text-violet-400 transition-colors mb-2" />
            <p className="text-sm text-slate-400 text-center">
              <span className="font-semibold text-white">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
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
            onClick={handleDeleteThumbnailImage}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
            title="Delete thumbnail image"
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
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              title="Delete gallery image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-violet-500 transition-all group">
        <Plus className="h-6 w-6 text-slate-500 group-hover:text-violet-400 transition-colors" />
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


            {/* Labels Section */}
{/* ✅ COMPLETE FIXED LABELS SECTION */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-white mb-4">Labels</h3>

  {/* Existing Labels */}
  {formData.labels.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-4">
      {formData.labels.map((label, index) => (
        <div
          key={index}
          className="px-3 py-1.5 rounded-lg flex items-center gap-2 border"
          style={{
            backgroundColor: `${label.color}20`,
            borderColor: `${label.color}40`,
            color: label.color,
          }}
        >
          {/* Icon */}
          {renderIcon(label.icon, "h-3.5 w-3.5", label.color)}
          
          {/* ❌ REMOVED: Color Dot */}
          
          <span className="text-sm font-medium">{label.name}</span>
          <span className="text-xs opacity-70">P:{label.priority}</span>
          
          <button
            onClick={() => handleRemoveLabel(index)}
            className="hover:opacity-70 transition-opacity ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )}

  {/* Quick Icon Buttons */}
  <div className="flex flex-wrap gap-2 mb-3">
    {["Star", "Fire", "Zap", "Heart", "Trophy", "Crown", "ThumbsUp", "Share2", "Eye", "Image",
      "Video", "Music", "ShoppingCart", "Gift", "Package", "Sun", "Moon", "Cloud", "CloudRain", 
      "Leaf", "Flower", "Building", "DollarSign", "CreditCard", "Clock", "Calendar"].map((icon) => (
      <button
        key={icon}
        onClick={() => setLabelInput({ ...labelInput, icon })}
        className="px-2 py-1 text-xs bg-slate-800 hover:bg-violet-600 border border-slate-600 rounded flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
      >
        {renderIcon(icon, "h-3 w-3")}
        {icon}
      </button>
    ))}
  </div>

  {/* Add Label Form */}
  <div className="space-y-3">
    {/* Name Input */}
    <input
      type="text"
      value={labelInput.name}
      onChange={(e) => setLabelInput({ ...labelInput, name: e.target.value })}
      placeholder="Label name (e.g., Featured)"
      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
    />

    {/* Color & Icon Row */}
    <div className="grid grid-cols-2 gap-3">
      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={labelInput.color}
          onChange={(e) => setLabelInput({ ...labelInput, color: e.target.value })}
          className="w-14 h-11 rounded-lg cursor-pointer border-2 border-slate-600"
        />
        <div
          className="w-11 h-11 rounded-lg border-2 border-slate-600 flex items-center justify-center"
          style={{ backgroundColor: labelInput.color }}
        >
          {renderIcon(labelInput.icon, "h-5 w-5", "#ffffff")}
        </div>
      </div>

      {/* Icon Input with Autocomplete */}
      <div className="relative">
        <input
          type="text"
          value={labelInput.icon}
          onChange={(e) => {
            setLabelInput({ ...labelInput, icon: e.target.value });
            setShowIconSuggestions(true);
          }}
          onFocus={() => setShowIconSuggestions(true)}
          placeholder="Icon name (e.g., Star)"
          className="w-full px-4 py-2.5 pr-10 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
        />
        
        {/* Clear Button */}
        {labelInput.icon && (
          <button
            onClick={() => {
              setLabelInput({ ...labelInput, icon: "" });
              setShowIconSuggestions(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Icon Suggestions Dropdown */}
        {showIconSuggestions && filteredIcons.length > 0 && (
          <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {filteredIcons.map((icon) => (
              <button
                key={icon}
                onClick={() => {
                  setLabelInput({ ...labelInput, icon });
                  setShowIconSuggestions(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-700 text-white text-sm flex items-center gap-2 transition-colors"
              >
                {renderIcon(icon, "h-4 w-4")}
                <span>{icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Priority */}
    <input
      type="number"
      value={labelInput.priority}
      onChange={(e) => setLabelInput({ ...labelInput, priority: parseInt(e.target.value) || 1 })}
      placeholder="Priority (1-10)"
      min={1}
      max={10}
      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
    />

    {/* Add Button */}
    <button
      onClick={handleAddLabel}
      disabled={!labelInput.name.trim()}
      className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
    >
      <Plus className="h-4 w-4" />
      Add Label
    </button>
  </div>
</div>




            {/* SEO Settings - Same as Create Page */}
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
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder="SEO optimized title"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Recommended: 50-60 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metaDescription: e.target.value,
                      })
                    }
                    placeholder="Brief description for search engines"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Recommended: 150-160 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Focus Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.metaKeywords}
                    onChange={(e) =>
                      setFormData({ ...formData, metaKeywords: e.target.value })
                    }
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Separate keywords with commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search Engine Friendly Page Name
                  </label>
                  <input
                    type="text"
                    value={formData.searchEngineFriendlyPageName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        searchEngineFriendlyPageName: e.target.value
                          .toLowerCase()
        .replace(/\s+/g, "-") // space → hyphen
        .replace(/[^a-z0-9-]/g, "") // only a-z 0-9 and hyphens
        .replace(/--+/g, "-"), // prevent multiple hyphens
                      })
                    }
                    placeholder="your-page-name"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Auto-formatted into SEO friendly page name
                  </p>
                </div>
              </div>
            </div>
            {/* ✅ Additional Settings Section - ADD THIS */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-white mb-4">
    Additional Settings
  </h3>

  <div className="space-y-4">
    {/* Start Date & End Date */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Start Date
        </label>
        <input
          type="datetime-local"
          value={formData.startDate}
          onChange={(e) =>
            setFormData({ ...formData, startDate: e.target.value })
          }
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
          onChange={(e) =>
            setFormData({ ...formData, endDate: e.target.value })
          }
          className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
        />
      </div>
    </div>

    {/* Display Order & Video URL */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Display Order
        </label>
        <input
          type="number"
          value={formData.displayOrder}
          onChange={(e) =>
            setFormData({
              ...formData,
              displayOrder: parseInt(e.target.value) || 0,
            })
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
          onChange={(e) =>
            setFormData({ ...formData, videoUrl: e.target.value })
          }
          placeholder="https://youtube.com/..."
          className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>
    </div>

    {/* Author Name & Language ID */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Author Name
        </label>
        <input
          type="text"
          value={formData.authorName}
          onChange={(e) =>
            setFormData({ ...formData, authorName: e.target.value })
          }
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
          onChange={(e) =>
            setFormData({ ...formData, languageId: e.target.value })
          }
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
            {/* SEO Analysis - Same as Create Page */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">SEO Analysis</h3>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-full ${seoColors.bg} flex items-center justify-center`}
                  >
                    <span className="text-white text-xl font-bold">
                      {seoAnalysis.score}
                    </span>
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
                        <p className="text-xs text-slate-500 mt-1">
                          {issue.points} points
                        </p>
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {uploadingImage ? "Uploading Images..." : saving ? "Updating..." : "Update Post"}
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

              {/* ✅ Add New Category Section */}
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

            {/* ✅ Related Blog Posts - COMPLETE OPTIMIZED SECTION */}
            <div
              ref={dropdownRef}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Info className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Related Posts</h3>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={relatedPostSearch}
                  onChange={(e) => {
                    setRelatedPostSearch(e.target.value);
                    setShowRelatedDropdown(true);
                  }}
                  onFocus={() => setShowRelatedDropdown(true)}
                  placeholder="Search and select related posts..."
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />

                {/* Dropdown Results */}
                {showRelatedDropdown && filteredBlogPosts.length > 0 && (
                  <div className="absolute z-[60] w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredBlogPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          console.log("🖱️ Dropdown button clicked:", post.title);
                          handleAddRelatedPost(post.id);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm border-b border-slate-700 last:border-0"
                      >
                        <p className="font-medium truncate">{post.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Click to add as related post
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {showRelatedDropdown &&
                  relatedPostSearch &&
                  filteredBlogPosts.length === 0 && (
                    <div className="absolute z-[60] w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-4">
                      <p className="text-sm text-slate-400 text-center">
                        No posts found matching "{relatedPostSearch}"
                      </p>
                    </div>
                  )}
              </div>

              {/* Selected Related Posts */}
              {formData.relatedBlogPostIds.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Selected ({formData.relatedBlogPostIds.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {formData.relatedBlogPostIds.map((postId, index) => (
                      <div
                        key={postId}
                        className="flex items-center justify-between gap-2 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 truncate">
                            {index + 1}. {getSelectedPostTitle(postId)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            ID: {postId.substring(0, 8)}...
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelatedPost(postId)}
                          className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-slate-800/20 rounded-lg border border-dashed border-slate-700">
                  <Info className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No related posts selected</p>
                  <p className="text-xs text-slate-600 mt-1">Search and click to add</p>
                </div>
              )}

              <p className="text-xs text-slate-500 mt-3 flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Related posts will be shown at the end of this blog
              </p>
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
                      setFormData({
                        ...formData,
                        showOnHomePage: e.target.checked,
                      })
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
                      setFormData({
                        ...formData,
                        allowComments: e.target.checked,
                      })
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
                      setFormData({
                        ...formData,
                        includeInSitemap: e.target.checked,
                      })
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
                    onChange={(e) =>
                      setFormData({ ...formData, publishedAt: e.target.value })
                    }
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
