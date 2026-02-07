// Edit Product  work Fine
"use client";
import { useState, use, useEffect, useRef, JSX, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save,Plus , Upload, X, Info, Search, Image, Package, Tag,BarChart3, Globe, Settings, Truck, Users, PoundSterling, Link as LinkIcon, ShoppingCart, Video, Play, ChevronDown, Clock, Send, Bell } from "lucide-react";

import Link from "next/link";
import { ProductDescriptionEditor } from "@/app/admin/_component/SelfHostedEditor";
import  {useToast } from "@/app/admin/_component/CustomToast";
import { API_BASE_URL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { ProductAttribute, ProductVariant, ProductOption, ProductOptionCreate, DropdownsData, SimpleProduct, ProductImage, CategoryData, BrandApiResponse, CategoryApiResponse,  productsService, brandsService, categoriesService } from '@/lib/services';
import { GroupedProductModal } from '../../GroupedProductModal';
import { MultiBrandSelector } from "../../MultiBrandSelector";
import React from "react";
import { BackInStockSubscribers, LowStockAlert } from "../../productModals";
import { VATRateApiResponse, vatratesService } from "@/lib/services/vatrates";
import productLockService from "@/lib/services/productLockService";
import { signalRService } from "@/lib/services/signalRService";
import TakeoverRequestModal from "../../TakeoverRequestModal";
import { MultiCategorySelector } from "../../MultiCategorySelector";
import RequestTakeoverModal from "../../RequestTakeoverModal";
import ScrollToTopButton from "../../../_component/ScrollToTopButton";
import { apiClient } from "@/lib/api";
import RelatedProductsSelector from "../../RelatedProductsSelector";
import ProductVariantsManager from "../../ProductVariantsManager";
import ProductOptionsManager from "../../ProductOptionsManager";

// ✅ ADD THIS INTERFACE (at the top with other interfaces)
interface AdminCommentHistory {
  id: string;
  productId: string;
  oldComment: string | null;
  newComment: string | null;
  changedBy: string;
  changedAt: string;
}



export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const toast = useToast();
  let seoTimer: any = null;

  const { id: productId } = use(params);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');
  const [pendingTakeoverRequests, setPendingTakeoverRequests] = useState<any[]>([]);
  const [takeoverTimeLeft, setTakeoverTimeLeft] = useState<number>(0);
const [homepageCount, setHomepageCount] = useState<number | null>(null);
const MAX_HOMEPAGE = 50;
const [showTaxPreview, setShowTaxPreview] = useState(false);

// Unsaved Changes Modal
const [showUnsavedModal, setShowUnsavedModal] = useState(false);
const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
const [initialFormData, setInitialFormData] = useState<any>(null);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [lastSavedData, setLastSavedData] = useState<any>(null);
// ✅ CORRECT - Array type with brackets []
const [commentHistory, setCommentHistory] = useState<AdminCommentHistory[]>([]);
const [isCommentHistoryOpen, setIsCommentHistoryOpen] = useState(false);

const [loadingHistory, setLoadingHistory] = useState(false);

// ================================
// ✅ LOADING STATE (Add after other useState)
// ================================
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitProgress, setSubmitProgress] = useState<{
  step: string;
  percentage: number;
} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Helper function to format datetime for React inputs
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
// ✅ Add these new states
const [isDeletingImage, setIsDeletingImage] = useState(false);
const [uploadingImages, setUploadingImages] = useState(false);
const [vatSearch, setVatSearch] = useState('');
const [loading, setLoading] = useState(true);
// Add states (after existing useState declarations)
const [takeoverRequest, setTakeoverRequest] = useState<any>(null);
const [hasPendingTakeover, setHasPendingTakeover] = useState(false);
// ✅ NEW (add these for RequestTakeoverModal)
const [pendingRequestTimeLeft, setPendingRequestTimeLeft] = useState(0);
const [takeoverRequestStatus, setTakeoverRequestStatus] = useState<'pending' | 'approved' | 'rejected' | 'expired' | null>(null);
const [takeoverResponseMessage, setTakeoverResponseMessage] = useState('');
  // Dynamic dropdown data from API
  const [showVatDropdown, setShowVatDropdown] = useState(false);
  const [dropdownsData, setDropdownsData] = useState<DropdownsData>({
    brands: [],
    categories: [],
    vatRates: []  // ✅ Add this line
  });
// Add this state with your other useState declarations
const [isGroupedModalOpen, setIsGroupedModalOpen] = useState(false);
// Add after existing useState declarations (around line 50-100)
const [variantSkuErrors, setVariantSkuErrors] = useState<Record<string, string>>({});
const [checkingVariantSku, setCheckingVariantSku] = useState<Record<string, boolean>>({});

// ============================================================
// VALIDATION FUNCTIONS - Add after useState
// ============================================================

// Check Draft Requirements (Minimal)
const checkDraftRequirements = (): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  if (!formData.name?.trim()) missing.push('Product Name');
  if (!formData.sku?.trim()) missing.push('SKU');
  if (!formData.categoryIds || formData.categoryIds.length === 0) missing.push('Category');
  
  const hasBrand = (formData.brandIds && formData.brandIds.length > 0) || formData.brand?.trim();
  if (!hasBrand) missing.push('Brand');
  
  return { isValid: missing.length === 0, missing };
};

// Check Publish Requirements (Complete)
const checkPublishRequirements = (): { isValid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  // 1. Basic Info
  if (!formData.name?.trim()) missing.push('Product Name');
  if (!formData.sku?.trim()) missing.push('SKU');
  if (!formData.shortDescription?.trim()) missing.push('Short Description');
  
  // 2. Price
  const price = Number(formData.price);
  if (isNaN(price) || price <= 0) missing.push('Price');
  
  // 3. Categories
  if (!formData.categoryIds || formData.categoryIds.length === 0) {
    missing.push('Category (at least 1)');
  }
  
  // 4. Brands
  const hasBrand = (formData.brandIds && formData.brandIds.length > 0) || formData.brand?.trim();
  if (!hasBrand) missing.push('Brand (at least 1)');
  
  // 5. Images (minimum 3)
  if (!formData.productImages || formData.productImages.length < 3) {
    missing.push(`Product Images (minimum 3, current: ${formData.productImages?.length || 0})`);
  }
  
  // 6. Stock (if tracking)
  if (formData.manageInventory === 'track') {
    const stock = parseInt(formData.stockQuantity?.toString() || '0');
    if (isNaN(stock) || stock < 0) {
      missing.push('Stock Quantity (valid number)');
    }
  }
  
  // 7. Weight (if shipping enabled)
  if (formData.isShipEnabled) {
    if (!formData.weight || parseFloat(formData.weight.toString()) <= 0) {
      missing.push('Weight (required for shipping)');
    }
  }
  
  // 8. Grouped Products
  if (formData.productType === 'grouped' && formData.requireOtherProducts) {
    if (!formData.requiredProductIds?.trim()) {
      missing.push('Grouped Products (at least 1)');
    }
  }
  
  // 9. VAT Rate (if not exempt)
  if (formData.vatExempt === false) {
    if (!formData.vatRateId || !formData.vatRateId.trim()) {
      missing.push('VAT Rate (required when product is taxable)');
    }
  }
  
  return { isValid: missing.length === 0, missing };
};

// Show Missing Fields Toast
const showMissingFieldsToast = (missing: string[], isDraft: boolean) => {
  const title = isDraft ? 'Draft Requirements' : 'Required Fields Missing';
  const message = missing.length === 1 
    ? `Missing: ${missing[0]}` 
    : `Missing ${missing.length} fields:\n${missing.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  
  toast.warning(message, {
    autoClose: 8000,
    position: 'top-center'
  });
};

  // Add these states after existing states
const [simpleProducts, setSimpleProducts] = useState<SimpleProduct[]>([]);
const [selectedGroupedProducts, setSelectedGroupedProducts] = useState<string[]>([]);
// ✅ ADD THESE FUNCTIONS (around line 300-400, after other helper functions)

const fetchCommentHistory = async () => {
  if (!productId) return;
  
  setLoadingHistory(true);
  try {
    const response = await apiClient.get<any>(`/api/Products/${productId}/admin-comment-history`);
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      const sortedHistory = [...response.data.data].sort((a, b) => 
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );
      setCommentHistory(sortedHistory);
    } else if (Array.isArray(response.data)) {
      const sortedHistory = [...response.data].sort((a, b) => 
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );
      setCommentHistory(sortedHistory);
    } else {
      setCommentHistory([]);
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      setCommentHistory([]);
    }
  } finally {
    setLoadingHistory(false);
  }
};

const formatDateOnly = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
};
const handleVariantImageUpload = async (variantId: string, file: File) => {
  /* =======================
     BASIC VALIDATIONS
  ======================= */

  if (!productId) {
    toast.error('❌ Product ID not found');
    return;
  }

  if (!variantId) {
    toast.error('❌ Invalid variant');
    return;
  }

  if (!file) {
    toast.warning('⚠️ No image selected');
    return;
  }

  // ✅ GUID validation (variant must be saved)
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!guidRegex.test(variantId)) {
    toast.error('⚠️ Please save the product first, then upload variant images');
    return;
  }

  // ✅ File validations
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.warning('⚠️ Unsupported image format (JPG, PNG, WebP only)');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.warning('⚠️ Image size must be under 5MB');
    return;
  }

  try {
    /* =======================
       PREVIEW (OPTIMISTIC UI)
    ======================= */

    console.log('🖼️ Creating preview for variant:', variantId);
    const previewUrl = URL.createObjectURL(file);

    setProductVariants(prev =>
      prev.map(variant =>
        variant.id === variantId
          ? { ...variant, imageUrl: previewUrl, imageFile: file }
          : variant
      )
    );

    /* =======================
       UPLOAD USING SERVICE
    ======================= */

    console.log('📤 Uploading variant image using service...');
    const formData = new FormData();
    formData.append('image', file);

    // ✅ USE SERVICE
    const response = await productsService.addVariantImage(variantId, formData);

    console.log('✅ Upload response:', response);

    // ✅ CORRECT: Check response structure
    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error('No response data received');
    }

    // ✅ FIXED: Extract image URL correctly from nested structure
    let uploadedImageUrl: string | null = null;

    // Try different response structures
    if (response.data.success !== false) {
      // Structure 1: response.data.data.imageUrl
      if (response.data.data && typeof response.data.data === 'object' && 'imageUrl' in response.data.data) {
        uploadedImageUrl = (response.data.data as any).imageUrl;
      }
      // Structure 2: response.data.imageUrl (direct)
      else if ('imageUrl' in response.data) {
        uploadedImageUrl = (response.data as any).imageUrl;
      }
      // Structure 3: response.data.data is string (direct URL)
      else if (response.data.data && typeof response.data.data === 'string') {
        uploadedImageUrl = response.data.data;
      }
    } else {
      throw new Error(response.data.message || 'Upload failed');
    }

    if (!uploadedImageUrl) {
      console.error('❌ Could not extract image URL from response:', response);
      throw new Error('Invalid server response - no image URL returned');
    }

    /* =======================
       FINAL STATE UPDATE
    ======================= */

    console.log('✅ Updating variant with uploaded image URL:', uploadedImageUrl);
    
    setProductVariants(prev =>
      prev.map(variant => {
        if (variant.id === variantId) {
          // Revoke old blob URL to prevent memory leak
          if (variant.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(variant.imageUrl);
          }

          return {
            ...variant,
            imageUrl: uploadedImageUrl!,
            imageFile: undefined,
          };
        }
        return variant;
      })
    );

    toast.success('✅ Variant image uploaded successfully');

  } catch (error: any) {
    console.error('❌ Error uploading variant image:', error);

    // 🔄 Revert preview on failure
    setProductVariants(prev =>
      prev.map(variant => {
        if (variant.id === variantId && variant.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(variant.imageUrl);
          return { ...variant, imageUrl: null, imageFile: undefined };
        }
        return variant;
      })
    );

    const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
    toast.error(`Failed to upload variant image: ${errorMessage}`);
  }
};


// ✅ Extract YouTube Video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];


  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};
// ✅ ADD THIS FUNCTION AFTER useState DECLARATIONS (around line 250-300)

/**
 * ✅ CLEAN VARIANT OPTIONS - Save only if BOTH name AND value exist
 */
const cleanVariantOptions = (variant: any, firstVariant: any) => {
  const cleaned = { ...variant };

  // ✅ Non-first variants: Inherit names from first variant
  const option1Name = variant.option1Name || firstVariant.option1Name;
  const option2Name = variant.option2Name || firstVariant.option2Name;
  const option3Name = variant.option3Name || firstVariant.option3Name;

  // ✅ Option 1: Name aur Value DONO chahiye
  if (option1Name && variant.option1Value) {
    cleaned.option1Name = option1Name;
    cleaned.option1Value = variant.option1Value;
  } else {
    cleaned.option1Name = null;
    cleaned.option1Value = null;
  }

  // ✅ Option 2: Name aur Value DONO chahiye
  if (option2Name && variant.option2Value) {
    cleaned.option2Name = option2Name;
    cleaned.option2Value = variant.option2Value;
  } else {
    cleaned.option2Name = null;
    cleaned.option2Value = null;
  }

  // ✅ Option 3: Name aur Value DONO chahiye
  if (option3Name && variant.option3Value) {
    cleaned.option3Name = option3Name;
    cleaned.option3Value = variant.option3Value;
  } else {
    cleaned.option3Name = null;
    cleaned.option3Value = null;
  }

  return cleaned;
};


// ✅ Add this useEffect for real-time countdown timer
useEffect(() => {
  if (!takeoverRequest || takeoverRequest.isExpired) {
    setTakeoverTimeLeft(0);
    return;
  }

  // Set initial time
  setTakeoverTimeLeft(takeoverRequest.timeLeftSeconds || 0);

  // Start countdown
  const timer = setInterval(() => {
    setTakeoverTimeLeft((prev) => {
      if (prev <= 1) {
        // Timer expired
        clearInterval(timer);
        setHasPendingTakeover(false);
        setTakeoverRequest(null);
        toast.info('Takeover request expired', { autoClose: 3000 });
        return 0;
      }
      return prev - 1;
    });
  }, 1000); // Update every second

  // Cleanup
  return () => clearInterval(timer);
}, [takeoverRequest?.id]); // Re-run when request changes
// Filter VAT rates based on search
const filteredVATRates = dropdownsData.vatRates.filter(vat =>
  vat.name.toLowerCase().includes(vatSearch.toLowerCase()) ||
  vat.rate.toString().includes(vatSearch)
)

  // Available products for related/cross-sell (from API)
  const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, sku: string, price: string}>>([]);
const [formData, setFormData] = useState({ 
  // ===== BASIC INFO =====
  name: '',
  shortDescription: '',
  fullDescription: '',
  sku: '',
  categoryIds: [] as string[], // NEW - multiple categories array
  brand: '', // For backward compatibility (primary brand)
  brandIds: [] as string[], // ✅ Multiple brands array
  
  published: true,
  productType: 'simple',
  visibleIndividually: true,
  gender: '',
  customerRoles: 'all',
  limitedToStores: false,
  vendorId: '',
  requireOtherProducts: false,
  requiredProductIds: '',
  automaticallyAddProducts: false,
  showOnHomepage: false,
  displayOrder: '1',
  productTags: '',
  gtin: '',
  manufacturerPartNumber: '',
  adminComment: '',
  categoryName: '', // For clean category name display

  // ===== RELATED PRODUCTS =====
  relatedProducts: [] as string[],
  crossSellProducts: [] as string[],
  
  // ✅ BUNDLE DISCOUNT FIELDS
  groupBundleDiscountType: 'None' as 'None' | 'Percentage' | 'FixedAmount' | 'SpecialPrice',
  groupBundleDiscountPercentage: 0,
  groupBundleDiscountAmount: 0,
  groupBundleSpecialPrice: 0,
  groupBundleSavingsMessage: '',
  showIndividualPrices: true,
  applyDiscountToAllItems: false,

  // ===== MEDIA =====
  productImages: [] as ProductImage[],
  videoUrls: [] as string[],
  specifications: [] as Array<{id: string, name: string, value: string, displayOrder: number}>,

  // ===== PRICING =====
  price: '',
  oldPrice: '',
  cost: '',
  disableBuyButton: false,
  disableWishlistButton: false,
  availableForPreOrder: false,
  preOrderAvailabilityStartDate: '',
  
  // Base Price
  basepriceEnabled: false,
  basepriceAmount: '',
  basepriceUnit: '',
  basepriceBaseAmount: '',
  basepriceBaseUnit: '',
  
  // Mark as New
  markAsNew: false,
  markAsNewStartDate: '',
  markAsNewEndDate: '',

  // ===== DISCOUNTS / AVAILABILITY =====
  hasDiscountsApplied: false,
  availableStartDate: '',
  availableEndDate: '',

  // ===== TAX =====
  vatExempt: false,
  vatRateId: '',

  // ===== RECURRING / SUBSCRIPTION =====
  isRecurring: false,
  recurringCycleLength: '',
  recurringCyclePeriod: 'days',
  recurringTotalCycles: '',
  subscriptionDiscountPercentage: '',
  allowedSubscriptionFrequencies: '',
  subscriptionDescription: '',

  // ===== PACK PRODUCT =====
  isPack: false,
  packSize: '',

  // ===== INVENTORY ===== ✅ UPDATED
  manageInventory: 'track',
  stockQuantity: '',
  displayStockAvailability: true,
  displayStockQuantity: false,
  minStockQuantity: '',
  lowStockActivity: 'nothing',
  
  // ✅ NOTIFICATION FIELDS
  notifyAdminForQuantityBelow: true,
  notifyQuantityBelow: '1',
  
  // ✅ BACKORDER FIELDS
  allowBackorder: false,
  backorderMode: 'no-backorders',
  backorders: 'no-backorders',
  
  allowBackInStockSubscriptions: false,
  productAvailabilityRange: '',
  
  // Cart Limits
  orderMinimumQuantity: '1',      // ✅ Changed from minCartQuantity
  orderMaximumQuantity: '10',     // ✅ Changed from maxCartQuantity
  allowedQuantities: '',
  allowAddingOnlyExistingAttributeCombinations: false,
  notReturnable: false,

  // ===== SHIPPING =====
  isShipEnabled: true,
  shipSeparately: false,
  deliveryDateId: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  
  // ✅ NEW DELIVERY FIELDS (ADDED)
  sameDayDeliveryEnabled: false,
  nextDayDeliveryEnabled: false,
  standardDeliveryEnabled: true,
  sameDayDeliveryCutoffTime: '',
  nextDayDeliveryCutoffTime: '',
  standardDeliveryDays: '5',
  sameDayDeliveryCharge: '',
  nextDayDeliveryCharge: '',
  standardDeliveryCharge: '',

  // ===== GIFT CARDS =====
  isGiftCard: false,
  giftCardType: 'virtual',
  overriddenGiftCardAmount: '',

  // ===== DOWNLOADABLE PRODUCT =====
  isDownload: false,
  downloadId: '',
  unlimitedDownloads: true,
  maxNumberOfDownloads: '',
  downloadExpirationDays: '',
  downloadActivationType: 'when-order-is-paid',
  hasUserAgreement: false,
  userAgreementText: '',
  hasSampleDownload: false,
  sampleDownloadId: '',

  // ===== RENTAL PRODUCT =====
  isRental: false,
  rentalPriceLength: '',
  rentalPricePeriod: 'days',

  // ===== REVIEWS =====
  allowCustomerReviews: true,
  
  // ===== SEO =====
  metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  searchEngineFriendlyPageName: '',
});


const [missingFields, setMissingFields] = useState<string[]>([]);

// Update missing fields on form change
useEffect(() => {
  const { missing } = checkPublishRequirements();
  setMissingFields(missing);
}, [
  formData.name,
  formData.sku,
  formData.shortDescription,
  formData.price,
  formData.categoryIds,
  formData.brandIds,
  formData.brand,
  formData.productImages,
  formData.stockQuantity,
  formData.manageInventory,
  formData.isShipEnabled,
  formData.weight,
  formData.productType,
  formData.requireOtherProducts,
  formData.requiredProductIds,
  formData.vatExempt,
  formData.vatRateId
]);

const [productLock, setProductLock] = useState<{
  isLocked: boolean;
  lockedBy: string | null;
  expiresAt?: string | null;
} | null>(null);

const [isLockModalOpen, setIsLockModalOpen] = useState(false);
const [lockModalMessage, setLockModalMessage] = useState("");
const [isAcquiringLock, setIsAcquiringLock] = useState(true); // ⚡ ADD THIS
const lockAcquiredRef = useRef(false);
const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
// ✅ ADD THESE 2 NEW LINES BELOW:
const initRef = useRef(false);  // ✅ NEW: Prevent duplicate initialization
const isAcquiringLockRef = useRef(false);  // ✅ NEW: Prevent duplicate acquire calls
// ==================== TAKEOVER REQUEST STATE (ADD THIS) ====================
const [isTakeoverModalOpen, setIsTakeoverModalOpen] = useState(false);
const [takeoverRequestMessage, setTakeoverRequestMessage] = useState('');
const [takeoverExpiryMinutes, setTakeoverExpiryMinutes] = useState(10);
const [isSubmittingTakeover, setIsSubmittingTakeover] = useState(false);
const [lockedByEmail, setLockedByEmail] = useState('');

useEffect(() => {
  const fetchAllData = async () => {
    if (!productId) {
      toast.error('❌ Product ID not found');
      router.push('/admin/products');
      return;
    }

    try {
      console.log('🔍 Fetching product data...');
      setLoading(true);

      // ✅ Fetch product data first (SERVICE-BASED)
      const productResponse = await productsService.getById(productId);

      // ✅ Fetch all other data in parallel (ALL SERVICE-BASED)
      const [
        brandsResponse, 
        categoriesResponse, 
        vatRatesResponse, 
        allProductsResponse,
        simpleProductsResponse
      ] = await Promise.allSettled([
        brandsService.getAll({ includeInactive: true }),
        categoriesService.getAll({ includeInactive: true, includeSubCategories: true }),
        vatratesService.getAll(),
        productsService.getAll({ pageSize: 100 }),
        productsService.getAll({ productType: 'simple', pageSize: 100 })
      ]);

      // ✅ Extract data safely with proper type handling
      const brandsData = brandsResponse.status === 'fulfilled' 
        ? ((brandsResponse.value.data as BrandApiResponse)?.data || [])
        : [];
      
      const categoriesData = categoriesResponse.status === 'fulfilled'
        ? ((categoriesResponse.value.data as CategoryApiResponse)?.data || [])
        : [];
      
      const vatRatesData = vatRatesResponse.status === 'fulfilled'
        ? ((vatRatesResponse.value.data as VATRateApiResponse)?.data || [])
        : [];

      setDropdownsData({
        brands: Array.isArray(brandsData) ? brandsData : [],
        categories: Array.isArray(categoriesData) ? categoriesData : [],
        vatRates: Array.isArray(vatRatesData) ? vatRatesData : []
      });

      console.log('✅ Dropdowns loaded:', {
        brands: brandsData.length,
        categories: categoriesData.length,
        vatRates: vatRatesData.length
      });

      // ✅ Helper function to extract products from service response
      const extractProducts = (response: any): any[] => {
        const data = response?.data?.data || response?.data || {};
        return data.items || (Array.isArray(data) ? data : []);
      };

// Process ALL products for related/cross-sell
if (allProductsResponse.status === 'fulfilled') {
  const allItems = extractProducts(allProductsResponse.value);
  
  if (allItems.length > 0) {
    const transformedProducts = allItems.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: typeof product.price === 'number' ? product.price.toFixed(2) : '0.00',
      
      // ✅ ADD THESE 3 LINES FOR FILTERING
      brandId: product.brandId || product.brands?.[0]?.brandId || null,
      brandName: product.brandName || product.brands?.[0]?.brandName || 'Unknown Brand',
      categories: product.categories || []
    }));
    
    setAvailableProducts(transformedProducts);
    console.log('✅ Available products loaded:', transformedProducts.length);
  } else {
    setAvailableProducts([]);
  }
} else {
  console.warn('❌ Failed to fetch all products');
  setAvailableProducts([]);
}


      // ✅ Process SIMPLE products from service
      if (simpleProductsResponse.status === 'fulfilled') {
        const simpleItems = extractProducts(simpleProductsResponse.value);
        
        if (simpleItems.length > 0) {
          // Filter out current product
          const simpleProductsList = simpleItems
            .filter((p: any) => p.id !== productId)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: typeof p.price === 'number' ? p.price.toFixed(2) : '0.00',
              stockQuantity: p.stockQuantity || 0
            }));

          setSimpleProducts(simpleProductsList);
          console.log('✅ Simple products loaded:', simpleProductsList.length);
        } else {
          console.warn('⚠️ Simple products endpoint returned no data');
          setSimpleProducts([]);
        }
      } else {
        console.warn('⚠️ Failed to fetch simple products, falling back to filtering');
        
        // ✅ FALLBACK: Filter from all products if separate endpoint fails
        if (allProductsResponse.status === 'fulfilled') {
          const allItems = extractProducts(allProductsResponse.value);
          
          const simpleProductsList = allItems
            .filter((product: any) => 
              product.productType === 'simple' && 
              product.isPublished === true &&
              product.id !== productId
            )
            .map((product: any) => ({
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: typeof product.price === 'number' ? product.price.toFixed(2) : '0.00',
              stockQuantity: product.stockQuantity || 0
            }));

          setSimpleProducts(simpleProductsList);
          console.log('✅ Simple products loaded (fallback):', simpleProductsList.length);
        } else {
          setSimpleProducts([]);
        }
      }

      // ✅ Extract product data from service response
      const productData = (productResponse.data as any)?.data || productResponse.data;
      
      if (!productData) {
        throw new Error('Product data is empty');
      }
      
      console.log('📥 Product loaded:', productData.name || productData.id);

      // ✅ Parse BRANDS
      let brandIdsArray: string[] = [];
      if (productData.brands && Array.isArray(productData.brands) && productData.brands.length > 0) {
        brandIdsArray = productData.brands
          .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((b: any) => b.brandId)
          .filter(Boolean);
      } else if (productData.brandId) {
        brandIdsArray = [productData.brandId];
      }

      // ✅ Parse RELATED PRODUCTS
      let relatedProductsArray: string[] = [];
      if (productData.relatedProductIds) {
        if (typeof productData.relatedProductIds === 'string') {
          relatedProductsArray = productData.relatedProductIds
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);
        } else if (Array.isArray(productData.relatedProductIds)) {
          relatedProductsArray = productData.relatedProductIds;
        }
      }

      // ✅ Parse CROSS-SELL PRODUCTS
      let crossSellProductsArray: string[] = [];
      if (productData.crossSellProductIds) {
        if (typeof productData.crossSellProductIds === 'string') {
          crossSellProductsArray = productData.crossSellProductIds
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);
        } else if (Array.isArray(productData.crossSellProductIds)) {
          crossSellProductsArray = productData.crossSellProductIds;
        }
      }

      // ✅ Parse VIDEO URLs
      let videoUrlsArray: string[] = [];
      if (productData.videoUrls) {
        if (typeof productData.videoUrls === 'string') {
          videoUrlsArray = productData.videoUrls
            .split(',')
            .map((url: string) => url.trim())
            .filter(Boolean);
        } else if (Array.isArray(productData.videoUrls)) {
          videoUrlsArray = productData.videoUrls;
        }
      }

      // ✅ Parse GROUPED PRODUCT IDs
      if (productData.requiredProductIds) {
        let groupedProductIds: string[] = [];
        
        if (typeof productData.requiredProductIds === 'string') {
          groupedProductIds = productData.requiredProductIds
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);
        } else if (Array.isArray(productData.requiredProductIds)) {
          groupedProductIds = productData.requiredProductIds;
        }
        
        setSelectedGroupedProducts(groupedProductIds);
        console.log('✅ Grouped product IDs loaded:', groupedProductIds.length, groupedProductIds);
      }

      // ✅ Date parser
      const parseDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      // ✅ SET FORM DATA (WITH BUNDLE DISCOUNT FIELDS)
      setFormData({
        // ===== BASIC INFO =====
        name: productData.name || '',
        sku: productData.sku || '',
        shortDescription: productData.shortDescription || '',
        fullDescription: productData.description || '',
        gtin: productData.gtin || '',
        manufacturerPartNumber: productData.manufacturerPartNumber || '',
        adminComment: productData.adminComment || '',
        gender: productData.gender || '',
// Inside fetchAllData(), around line 520-550, REPLACE:

// ❌ OLD CODE:
// categories: productData.categoryId || '',

// ✅ NEW CODE:
categoryIds: (() => {
  console.log('📦 Loading categories from API...');
  
  // Option 1: Backend sends categories array (NEW API)
  if (productData.categories && Array.isArray(productData.categories)) {
    const categoryIds = productData.categories
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((cat: any) => cat.categoryId)
      .filter(Boolean);
    
    console.log('✅ Categories loaded (array):', categoryIds);
    return categoryIds;
  }
  
  // Option 2: Backend sends categoryIds array directly
  if (productData.categoryIds && Array.isArray(productData.categoryIds)) {
    console.log('✅ Categories loaded (categoryIds):', productData.categoryIds);
    return productData.categoryIds;
  }
  
  // Option 3: Backend sends single categoryId (OLD API - backward compatible)
  if (productData.categoryId) {
    console.log('✅ Categories loaded (single):', [productData.categoryId]);
    return [productData.categoryId];
  }
  
  console.log('⚠️ No categories found');
  return [];
})(),

        categoryName: productData.categoryName || '',
        brand: brandIdsArray[0] || '',
        brandIds: brandIdsArray,
        published: productData.isPublished ?? true,
        productType: productData.productType || 'simple',
        visibleIndividually: productData.visibleIndividually ?? true,
        showOnHomepage: productData.showOnHomepage ?? false,
        displayOrder: productData.displayOrder?.toString() || '1',
        customerRoles: productData.customerRoles || 'all',
        limitedToStores: productData.limitedToStores ?? false,
        vendorId: '',
        
        // ===== GROUPED PRODUCT FIELDS =====
        requireOtherProducts: productData.requireOtherProducts ?? false,
        requiredProductIds: productData.requiredProductIds || '',
        automaticallyAddProducts: productData.automaticallyAddProducts ?? false,
        
        // ✅ NEW: BUNDLE DISCOUNT FIELDS
        groupBundleDiscountType: productData.groupBundleDiscountType || 'None',
        groupBundleDiscountPercentage: productData.groupBundleDiscountPercentage || 0,
        groupBundleDiscountAmount: productData.groupBundleDiscountAmount || 0,
        groupBundleSpecialPrice: productData.groupBundleSpecialPrice || 0,
        groupBundleSavingsMessage: productData.groupBundleSavingsMessage || '',
        showIndividualPrices: productData.showIndividualPrices ?? true,
        applyDiscountToAllItems: productData.applyDiscountToAllItems ?? false,
        
        // ===== PRICING =====
        price: productData.price?.toString() || '',
        oldPrice: productData.oldPrice?.toString() || productData.compareAtPrice?.toString() || '',
        cost: productData.costPrice?.toString() || '',
        disableBuyButton: productData.disableBuyButton ?? false,
        disableWishlistButton: productData.disableWishlistButton ?? false,

        // ===== BASE PRICE =====
        basepriceEnabled: productData.basepriceEnabled ?? false,
        basepriceAmount: productData.basepriceAmount?.toString() || '',
        basepriceUnit: productData.basepriceUnit || '',
        basepriceBaseAmount: productData.basepriceBaseAmount?.toString() || '',
        basepriceBaseUnit: productData.basepriceBaseUnit || '',
        
        // ===== MARK AS NEW =====
        markAsNew: productData.markAsNew ?? false,
        markAsNewStartDate: parseDate(productData.markAsNewStartDate),
        markAsNewEndDate: parseDate(productData.markAsNewEndDate),
        
        // ===== PRE-ORDER =====
        availableForPreOrder: productData.availableForPreOrder ?? false,
        preOrderAvailabilityStartDate: parseDate(productData.preOrderAvailabilityStartDate),
        
        // ===== AVAILABILITY =====
        availableStartDate: parseDate(productData.availableStartDate),
        availableEndDate: parseDate(productData.availableEndDate),
        hasDiscountsApplied: false,
        
        // ===== TAX =====
        vatExempt: productData.vatExempt ?? false,
        vatRateId: productData.vatRateId || '',
        
        // ===== INVENTORY =====
        stockQuantity: productData.stockQuantity?.toString() || '0',
        manageInventory: productData.manageInventoryMethod || 'track',
        displayStockAvailability: productData.displayStockAvailability ?? true,
        displayStockQuantity: productData.displayStockQuantity ?? false,
        minStockQuantity: productData.minStockQuantity?.toString() || '0',
        lowStockActivity: productData.lowStockActivity || 'nothing',
        
        // ===== NOTIFICATIONS =====
        notifyAdminForQuantityBelow: productData.notifyAdminForQuantityBelow ?? true,
        notifyQuantityBelow: productData.notifyQuantityBelow?.toString() || '1',
        
        // ===== BACKORDER =====
        allowBackorder: productData.allowBackorder ?? false,
        backorderMode: productData.backorderMode || 'no-backorders',
        backorders: productData.backorderMode || 'no-backorders',
        allowBackInStockSubscriptions: productData.allowBackInStockSubscriptions ?? false,
        productAvailabilityRange: productData.productAvailabilityRange || '',
        
        // ===== CART LIMITS =====
      // ===== CART LIMITS ===== (Around line where you set formData)
orderMinimumQuantity: productData.orderMinimumQuantity?.toString() || '1',  // ✅ Fixed
orderMaximumQuantity: productData.orderMaximumQuantity?.toString() || '10', // ✅ Fixed
allowedQuantities: productData.allowedQuantities || '',
notReturnable: productData.notReturnable ?? false,

        allowAddingOnlyExistingAttributeCombinations: false,

        // ===== SHIPPING =====
        isShipEnabled: productData.requiresShipping ?? true,
        shipSeparately: productData.shipSeparately ?? false,
        deliveryDateId: productData.deliveryDateId || '',
        weight: productData.weight?.toString() || '',
        length: productData.length?.toString() || '',
        width: productData.width?.toString() || '',
        height: productData.height?.toString() || '',
        
        // ===== PACK PRODUCT =====
        isPack: productData.isPack ?? false,
        packSize: productData.packSize?.toString() || '',
        
        // ===== RECURRING/SUBSCRIPTION =====
        isRecurring: productData.isRecurring ?? false,
        recurringCycleLength: productData.recurringCycleLength?.toString() || '',
        recurringCyclePeriod: productData.recurringCyclePeriod || 'days',
        recurringTotalCycles: productData.recurringTotalCycles?.toString() || '',
        subscriptionDiscountPercentage: productData.subscriptionDiscountPercentage?.toString() || '',
        allowedSubscriptionFrequencies: productData.allowedSubscriptionFrequencies || '',
        subscriptionDescription: productData.subscriptionDescription || '',
        
        // ===== RENTAL =====
        isRental: productData.isRental ?? false,
        rentalPriceLength: productData.rentalPriceLength?.toString() || '',
        rentalPricePeriod: productData.rentalPricePeriod || 'days',
        
        // ===== GIFT CARD =====
        isGiftCard: productData.isGiftCard ?? false,
        giftCardType: productData.giftCardType || 'virtual',
        overriddenGiftCardAmount: productData.overriddenGiftCardAmount?.toString() || '',
        
        // ===== DOWNLOADABLE =====
        isDownload: productData.isDownload ?? false,
        downloadId: productData.downloadId || '',
        unlimitedDownloads: productData.unlimitedDownloads ?? true,
        maxNumberOfDownloads: productData.maxNumberOfDownloads?.toString() || '',
        downloadExpirationDays: productData.downloadExpirationDays?.toString() || '',
        downloadActivationType: productData.downloadActivationType || 'when-order-is-paid',
        hasUserAgreement: productData.hasUserAgreement ?? false,
        userAgreementText: productData.userAgreementText || '',
        hasSampleDownload: productData.hasSampleDownload ?? false,
        sampleDownloadId: productData.sampleDownloadId || '',
        
        // ===== SEO =====
        metaTitle: productData.metaTitle || '',
        metaDescription: productData.metaDescription || '',
        metaKeywords: productData.metaKeywords || '',
        searchEngineFriendlyPageName: productData.searchEngineFriendlyPageName || productData.slug || '',
        
        // ===== REVIEWS =====
        allowCustomerReviews: productData.allowCustomerReviews ?? true,
        // ✅ SHIPPING & DELIVERY (Add this section)

  
  // ✅ DELIVERY OPTIONS (NEW)
  sameDayDeliveryEnabled: productData.sameDayDeliveryEnabled ?? false,
  nextDayDeliveryEnabled: productData.nextDayDeliveryEnabled ?? false,
  standardDeliveryEnabled: productData.standardDeliveryEnabled ?? true,
  sameDayDeliveryCutoffTime: productData.sameDayDeliveryCutoffTime || '',
  nextDayDeliveryCutoffTime: productData.nextDayDeliveryCutoffTime || '',
  standardDeliveryDays: productData.standardDeliveryDays?.toString() || '5',
  sameDayDeliveryCharge: productData.sameDayDeliveryCharge?.toString() || '',
  nextDayDeliveryCharge: productData.nextDayDeliveryCharge?.toString() || '',
  standardDeliveryCharge: productData.standardDeliveryCharge?.toString() || '',
        
        // ===== TAGS & RELATED =====
        productTags: productData.tags || '',
        relatedProducts: relatedProductsArray,
        crossSellProducts: crossSellProductsArray,
        
        // ===== MEDIA =====
        productImages: [],
        videoUrls: videoUrlsArray,
        specifications: []
      });

      console.log('✅ Form data populated');
      console.log('🎁 Bundle discount loaded:', {
        type: productData.groupBundleDiscountType || 'None',
        percentage: productData.groupBundleDiscountPercentage || 0,
        amount: productData.groupBundleDiscountAmount || 0,
        specialPrice: productData.groupBundleSpecialPrice || 0
      });

      // ✅ Load attributes
      if (productData.attributes && Array.isArray(productData.attributes)) {
        const attrs = productData.attributes.map((attr: any) => ({
          id: attr.id || `attr-${Date.now()}-${Math.random()}`,
          name: attr.name || '',
          value: attr.value || '',
          displayOrder: attr.displayOrder || attr.sortOrder || 0
        }));
        setProductAttributes(attrs);
        console.log('✅ Attributes loaded:', attrs.length);
      }

      // ✅ Load product options (NEW - for selectable variants like Color, Size)
      console.log('🔍 RAW OPTIONS FROM API:', productData.options);
      if (productData.options && Array.isArray(productData.options)) {
        const opts = productData.options.map((opt: any) => ({
          id: opt.id || `opt-${Date.now()}-${Math.random()}`,
          name: opt.name || '',
          values: Array.isArray(opt.values) ? opt.values : (opt.values || '').split(',').map((v: string) => v.trim()).filter(Boolean),
          displayType: opt.displayType || 'dropdown',
          position: opt.position || 0,
          isActive: opt.isActive ?? true
        }));
        setProductOptions(opts);
        console.log('✅ Product Options loaded:', opts.length, opts);
      } else {
        console.warn('⚠️ No options found in API response. productData.options =', productData.options);
      }

// Load variants with optionValues
if (productData.variants && Array.isArray(productData.variants)) {
  console.log('🔍 RAW VARIANT DATA FROM API:', productData.variants);

  const vars = productData.variants.map((variant: any) => {
    // Parse optionValues - can be array or comma-separated string
    let optionValues: string[] = [];
    if (Array.isArray(variant.optionValues)) {
      optionValues = variant.optionValues;
    } else if (typeof variant.optionValues === 'string' && variant.optionValues) {
      optionValues = variant.optionValues.split(',').map((v: string) => v.trim());
    }

    return {
      id: variant.id || `var-${Date.now()}-${Math.random()}`,
      name: variant.name || '',
      sku: variant.sku || '',
      price: variant.price || 0,
      compareAtPrice: variant.compareAtPrice || variant.oldPrice || null,
      weight: variant.weight || null,
      stockQuantity: variant.stockQuantity || 0,
      trackInventory: variant.trackInventory ?? true,
      optionValues: optionValues,  // NEW: Option values as list
      option1Name: variant.option1Name || null,
      option1Value: variant.option1Value || null,
      option2Name: variant.option2Name || null,
      option2Value: variant.option2Value || null,
      option3Name: variant.option3Name || null,
      option3Value: variant.option3Value || null,
      imageUrl: variant.imageUrl || null,
      imageFile: null,
      isDefault: variant.isDefault ?? false,
      displayOrder: variant.displayOrder || 0,
      isActive: variant.isActive ?? true,
      gtin: variant.gtin || null,
      barcode: variant.barcode || null,
    };
  });

  setProductVariants(vars);
  console.log('✅ Variants loaded:', vars);
}

      // ✅ Load images
      if (productData.images && Array.isArray(productData.images)) {
        const imgs = productData.images
          .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((img: any) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            altText: img.altText || '',
            sortOrder: img.sortOrder || 0,
            isMain: img.isMain || false,
            fileName: img.fileName || '',
            fileSize: img.fileSize || 0
          }));
        setFormData(prev => ({ ...prev, productImages: imgs }));
        console.log('✅ Images loaded:', imgs.length);
      }

      setLoading(false);
      console.log('✅ ==================== PRODUCT DATA LOADED SUCCESSFULLY ====================');


    } catch (error: any) {
      console.error('❌ ==================== ERROR FETCHING PRODUCT ====================');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      
      if (error.response) {
        console.error('❌ Status:', error.response.status);
        console.error('❌ Data:', error.response.data);
      }
      
      let errorMessage = 'Failed to load product';
      
      if (error.response?.status === 404) {
        errorMessage = '⚠️ Product Not Found (404)';
      } else if (error.response?.status === 500) {
        errorMessage = '⚠️ Server Error (500)';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { autoClose: 8000 });
      setLoading(false);
      
      setTimeout(() => {
        router.push('/admin/products');
      }, 2000);
    }
  };

  fetchAllData();
}, [productId]);

// ============================================
// ✅ SIGNALR - COMPLETE WITH ALL 5 EVENT HANDLERS
// ============================================
useEffect(() => {
  console.log('🔍 SignalR Init');
  
  let userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');
  
  if (!userId) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id;
        if (userId) localStorage.setItem('userId', userId);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }

  if (!userId) {
    console.error('❌ Cannot start SignalR - no userId');
    return;
  }

  let mounted = true;
  let handlerRegistered = false;
  let connectionRetryTimer: NodeJS.Timeout | null = null;
  
// Around line 830-860 in page.tsx
const handleTakeover = (data: any) => {
  if (!mounted || data.productId !== productId || data.currentEditorEmail !== userEmail) return;
  
  console.log('');
  console.log('🔔 ==================== TAKEOVER REQUEST RECEIVED ====================');
  console.log('📦 Full data:', JSON.stringify(data, null, 2));
  console.log('👤 From:', data.requestedByEmail);
  console.log('⏰ Expires:', data.expiresAt || data.expires);
  console.log('⏱️ Time Left:', data.timeLeftSeconds, 'seconds');
  console.log('===================================================================');
  
  // ✅ COMPLETE field mapping
  const requestObject = {
    id: data.requestId || data.id,
    requestId: data.requestId || data.id,
    productId: data.productId,
    productName: data.productName,
    requestedByUserId: data.requestedByUserId || data.requestedBy || '',
    requestedByEmail: data.requestedByEmail,
    requestMessage: data.requestMessage || data.message || '',
    timeLeftSeconds: data.timeLeftSeconds || 300, // Default 5 minutes
    expiresAt: data.expiresAt || data.expires || new Date(Date.now() + 300000).toISOString()
  };
  
  console.log('✅ Setting request object:', requestObject);
  setTakeoverRequest(requestObject);
  setIsTakeoverModalOpen(true);
  setHasPendingTakeover(true);
};

// ✅ EVENT 2: Takeover Approved (editor approved YOUR request)
const handleTakeoverApproved = async (data: any) => {
  console.log('🎯 handleTakeoverApproved CALLED - USER 2 (REQUESTER)');
  console.log('📦 Data received:', JSON.stringify(data, null, 2));  // ← Important log
  console.log('📦 Data type:', typeof data);
  
  // Extract productId
  const approvedProductId = data?.productId || data;
  
  console.log('🔍 Extracted productId:', approvedProductId);
  console.log('🔍 Current productId:', productId);
  
  if (approvedProductId !== productId) {
    console.log('⚠️ Different product, ignoring');
    return;
  }
  
  console.log('✅ Takeover approved! Processing...');
  
  // Close modals
  setIsLockModalOpen(false);
  setIsTakeoverModalOpen(false);
  setHasPendingTakeover(false);
  setTakeoverRequest(null);
  
  toast.success('✅ Takeover approved! Loading latest changes...', {
    autoClose: 2000,
    position: 'top-center'
  });
  
  try {
    console.log('🔐 Acquiring lock...');
    const lockAcquired = await acquireProductLock(productId, false);
    
    if (lockAcquired) {
      setProductLock({
        isLocked: true,
        lockedBy: userId,
        expiresAt: null
      });
      lockAcquiredRef.current = true;
      
      console.log('🔄 Reloading page...');
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 500);
    }
  } catch (error: any) {
    console.error('❌ Error:', error);
    toast.error('Error. Reloading...');
    setTimeout(() => window.location.reload(), 1000);
  }
};



// ✅ EVENT 3: Takeover Rejected (editor rejected YOUR request)
const handleTakeoverRejected = (data: any) => {
  console.log('');
  console.log('❌ ==================== TAKEOVER REJECTED EVENT ====================');
  
  // ✅ FIX: Backend sometimes sends just requestId string instead of object
  if (typeof data === 'string') {
    console.log('📦 Request ID:', data);
    console.log('⚠️ Backend sent only ID, not full object - showing generic message');
    
    toast.error('❌ Takeover request rejected by editor', {
      autoClose: 5000,
      position: 'top-center',
      
    });
    
    // ✅ Close modal and reset state
    setIsTakeoverModalOpen(false);
    setHasPendingTakeover(false);
    setTakeoverRequest(null);
    
    console.log('✅ Modal closed after rejection (string data)');
    console.log('=================================================================');
    return;
  }
  
  // ✅ Normal object handling
  console.log('📦 Product ID:', data.productId || 'Not provided');
  console.log('👤 Rejected By:', data.rejectedByEmail || data.rejectedBy || 'Unknown');
  console.log('💬 Reason:', data.rejectionReason || data.reason || data.message || 'No reason provided');
  console.log('📊 Full data:', JSON.stringify(data, null, 2));
  console.log('=================================================================');
  
  // ✅ Only check productId if provided (for backward compatibility)
  if (data.productId && data.productId !== productId) {
    console.log('⏭️ Different product - ignoring');
    return;
  }
  
  // ✅ Extract reason from multiple possible fields
  const reason = data.rejectionReason || data.reason || data.message || '';
  const reasonText = reason ? `\n\nReason: ${reason}` : '';
  
  toast.error(`❌ Takeover request rejected${reasonText}`, {
    autoClose: 6000,
    position: 'top-center',
    
  });
  
  // ✅ Close modal and reset state
  setIsTakeoverModalOpen(false);
  setHasPendingTakeover(false);
  setTakeoverRequest(null);
  
  console.log('✅ Modal closed after rejection (object data)');
};

// ✅ EVENT 4: Takeover Expired (YOUR request expired) - FIXED
const handleTakeoverExpired = (data: any) => {
  console.log('');
  console.log('⏰ ==================== TAKEOVER EXPIRED EVENT ====================');
  
  // ✅ FIX: Backend might send just requestId string
  if (typeof data === 'string') {
    console.log('📦 Request ID:', data);
    console.log('⚠️ Backend sent only ID, not full object');
    
    toast.info('⏰ Your takeover request expired. You can send a new request.', {
      autoClose: 5000,
      position: 'top-center',
     
    });
    
    // ✅ Close modal and reset state
    setIsTakeoverModalOpen(false);
    setHasPendingTakeover(false);
    setTakeoverRequest(null);
    
    console.log('✅ Modal closed after expiry (string data)');
    console.log('=================================================================');
    return;
  }
  
  // ✅ Normal object handling
  console.log('📦 Product ID:', data.productId || 'Not provided');
  console.log('📦 Request ID:', data.requestId || data.id || 'Unknown');
  console.log('⏰ Expired At:', data.expiredAt || 'Unknown');
  console.log('📊 Full data:', JSON.stringify(data, null, 2));
  console.log('=================================================================');
  
  // ✅ Only check productId if provided (for backward compatibility)
  if (data.productId && data.productId !== productId) {
    console.log('⏭️ Different product - ignoring');
    return;
  }
  
  toast.info('⏰ Your takeover request expired. You can send a new request.', {
    autoClose: 5000,
    position: 'top-center',
 
  });
  
  // ✅ Close modal and reset state
  setIsTakeoverModalOpen(false);
  setHasPendingTakeover(false);
  setTakeoverRequest(null);
  
  console.log('✅ Modal closed after expiry (object data)');
};


  // ✅ EVENT 5: Lock Released (editor released lock manually)
const handleLockReleased = (data: any) => {
  if (data.productId !== productId) return;
  
  console.log('🔓 Lock released by:', data.releasedByEmail);
  
  // ✅ Check if this is from YOUR takeover approval
  const isFromTakeoverApproval = data.reason === 'takeover-approved' || data.fromTakeover;
  
  if (isFromTakeoverApproval) {
    console.log('✅ Lock released due to takeover approval - reloading page...');
    toast.success('✅ Takeover approved! Loading latest data...', { autoClose: 2000 });
    
    // ✅ Close modals
    setIsTakeoverModalOpen(false);
    setIsLockModalOpen(false);
    setHasPendingTakeover(false);
    setTakeoverRequest(null);
    
    // ✅ Update lock
    setProductLock({
      isLocked: true,
      lockedBy: userId,
      expiresAt: null
    });
    lockAcquiredRef.current = true;
    
    // ✅ Acquire lock then reload
    console.log('🔐 Acquiring lock...');
    acquireProductLock(productId, false).then(() => {
      console.log('🔄 Reloading page to fetch latest changes...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });
  } else {
    // Normal lock release (not from takeover)
    console.log('🔓 Normal lock release - acquiring lock...');
    toast.info('🔓 Product lock released. Acquiring lock...', { autoClose: 3000 });
    
    setIsTakeoverModalOpen(false);
    setIsLockModalOpen(false);
    setProductLock({ isLocked: false, lockedBy: null, expiresAt: null });
    
    setTimeout(() => acquireProductLock(productId, false), 500);
  }
};

  
  // ✅ Connection init
  const init = async (retryCount = 0) => {
    if (!mounted) return;
    
    const connected = await signalRService.startConnection(userId!);
    
    if (connected) {
      console.log('✅ SignalR connected');
      
      // Register all handlers
      signalRService.on('takeoverRequest', handleTakeover);
      signalRService.on('takeoverApproved', handleTakeoverApproved);
      signalRService.on('takeoverRejected', handleTakeoverRejected);
      signalRService.on('takeoverExpired', handleTakeoverExpired);
      signalRService.on('lockReleased', handleLockReleased);
      
      handlerRegistered = true;
    } else if (retryCount < 3) {
      setTimeout(() => init(retryCount + 1), 5000);
    }
  };

  init();

  // Cleanup
  return () => {
    mounted = false;
    if (connectionRetryTimer) clearTimeout(connectionRetryTimer);
    
    if (handlerRegistered) {
      signalRService.off('takeoverRequest', handleTakeover);
      signalRService.off('takeoverApproved', handleTakeoverApproved);
      signalRService.off('takeoverRejected', handleTakeoverRejected);
      signalRService.off('takeoverExpired', handleTakeoverExpired);
      signalRService.off('lockReleased', handleLockReleased);
    }
  };
}, [productId]);

const getHomepageCount = async () => {
  try {
    const res = await productsService.getAll({ pageSize: 100 });
    const products = res.data?.data?.items || [];
    const count = products.filter((p: any) => 
      p.showOnHomepage && p.id !== productId
    ).length;
    setHomepageCount(count);
  } catch (e) {
    setHomepageCount(null);
  }
};
useEffect(() => {
  if (formData.showOnHomepage) getHomepageCount();
}, [formData.showOnHomepage]);

// ==================== 🔒 LOCK INITIALIZATION WITH STATUS CHECK ====================
useEffect(() => {
  if (!productId) return;

  // ✅ PREVENT DUPLICATE INITIALIZATION
  if (initRef.current) {
    console.log('⚠️ Lock initialization already running, skipping...');
    return;
  }

  initRef.current = true;

  let lockRefreshTimer: NodeJS.Timeout | null = null;

  const initializeLock = async () => {
    if (lockAcquiredRef.current) {
      console.log('⚠️ Lock already acquired, skipping...');
      return;
    }

    try {
      // ✅ STEP 1: Check lock status FIRST (docs ke according)
      console.log('🔍 Checking lock status...');
      const statusResponse = await productLockService.getLockStatus(productId);
      
      if (!statusResponse.success || !statusResponse.data) {
        throw new Error('Failed to get lock status');
      }

      const status = statusResponse.data;
      const currentUserId = localStorage.getItem('userId');
      const currentUserEmail = localStorage.getItem('userEmail');

      console.log('📊 Lock Status:', {
        isLocked: status.isLocked,
        lockedBy: status.lockedBy,
        lockedByEmail: status.lockedByEmail,
        canRequestTakeover: status.canRequestTakeover
      });

      // ✅ CASE 1: Product locked by SOMEONE ELSE
      if (status.isLocked && status.lockedBy && status.lockedBy !== currentUserId) {
        console.log('🔒 Product is locked by another user');
        
        const expiryIST = status.expiresAt 
          ? new Date(status.expiresAt).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short'
            })
          : 'Unknown';

        const displayMessage = `Product is currently being edited by ${status.lockedByEmail || 'another user'}.\nLock expires at ${expiryIST} IST.${
          status.canRequestTakeover 
            ? '\nYou can request takeover from the current editor.' 
            : status.cannotRequestReason ? `\n${status.cannotRequestReason}` : ''
        }`;

        // Store lock info for "Request Takeover" modal
        setLockedByEmail(status.lockedByEmail || 'Unknown User');
        setProductLock({
          isLocked: true,
          lockedBy: status.lockedBy,
          expiresAt: status.expiresAt || null
        });
        setLockModalMessage(displayMessage);
        setIsLockModalOpen(true);
        setIsAcquiringLock(false);
        lockAcquiredRef.current = false;
        return;
      }

      // ✅ CASE 2: Product locked by ME (same user, different tab)
      if (status.isLocked && status.lockedBy === currentUserId) {
        console.log('✅ Product already locked by you (same user)');
        setProductLock({
          isLocked: true,
          lockedBy: status.lockedBy,
          expiresAt: status.expiresAt || null
        });
        lockAcquiredRef.current = true;
        setIsAcquiringLock(false);
        toast.info('Already editing in another tab - you can continue here');
        return;
      }

      // ✅ CASE 3: Product NOT locked - Acquire lock now
      if (!status.isLocked) {
        console.log('🆓 Product is free - acquiring lock...');
        await acquireProductLock(productId, false);
      }

    } catch (error: any) {
      console.error('❌ Lock initialization error:', error);
      toast.error('Failed to initialize product lock');
      setTimeout(() => router.push('/admin/products'), 2000);
    }
  };

  // Start initialization
  initializeLock();

  // ✅ Refresh lock every 10 minutes
  lockRefreshTimer = setInterval(() => {
    if (lockAcquiredRef.current) {
      console.log('🔄 Refreshing lock...');
      acquireProductLock(productId, true);
    }
  }, 10 * 60 * 1000);

  // ✅ Cleanup on unmount
  return () => {
    console.log('🧹 Cleanup: Releasing lock...');
    initRef.current = false; // ✅ Reset flag
    if (lockRefreshTimer) clearInterval(lockRefreshTimer);
    releaseProductLock(productId);
  };
}, [productId]); // ✅ ONLY productId dependency

// // ==================== GENERATE VARIANTS (Cartesian Product) ====================
// const generateAllVariants = async () => {
//   if (productOptions.length === 0) {
//     toast.error('Please add at least one option first (e.g., Color, Size)');
//     return;
//   }

//   // Validate all options have values
//   const invalidOptions = productOptions.filter(opt => !opt.values || opt.values.length === 0);
//   if (invalidOptions.length > 0) {
//     toast.error(`Please add values for: ${invalidOptions.map(o => o.name || 'Unnamed option').join(', ')}`);
//     return;
//   }

//   setIsGeneratingVariants(true);

//   try {
//     // Generate Cartesian product of all option values
//     const generateCombinations = (arrays: string[][]): string[][] => {
//       if (arrays.length === 0) return [[]];
//       const result: string[][] = [];
//       const rest = generateCombinations(arrays.slice(1));
//       for (const item of arrays[0]) {
//         for (const combo of rest) {
//           result.push([item, ...combo]);
//         }
//       }
//       return result;
//     };

//     const optionValues = productOptions.map(opt => opt.values);
//     const combinations = generateCombinations(optionValues);

//     // Filter out existing combinations
//     const existingCombos = new Set(
//       productVariants.map(v => v.optionValues?.join(',').toLowerCase() || '')
//     );

//     const newVariants: ProductVariant[] = [];
//     let skippedCount = 0;

//     for (const combo of combinations) {
//       const comboKey = combo.join(',').toLowerCase();
//       if (existingCombos.has(comboKey)) {
//         skippedCount++;
//         continue;
//       }

//       // Generate SKU from combination
//       const skuSuffix = combo.map(v => v.replace(/\s/g, '').toUpperCase()).join('-');
//       const baseSku = formData.sku || 'PROD';

//       const newVariant: ProductVariant = {
//         id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
//         // ✅ UPDATED: Better format with parentheses and comma separation
//         name: `${formData.name || 'Product'} (${combo.join(', ')})`,
//         sku: `${baseSku}-${skuSuffix}`,
//         price: null,
//         compareAtPrice: null,
//         weight: null,
//         stockQuantity: 0,
//         trackInventory: true,
//         optionValues: combo,
//         // Legacy fields for backward compatibility
//         option1Name: productOptions[0]?.name || null,
//         option1Value: combo[0] || null,
//         option2Name: productOptions[1]?.name || null,
//         option2Value: combo[1] || null,
//         option3Name: productOptions[2]?.name || null,
//         option3Value: combo[2] || null,
//         imageUrl: null,
//         imageFile: undefined,
//         isDefault: productVariants.length === 0 && newVariants.length === 0,
//         displayOrder: productVariants.length + newVariants.length,
//         isActive: true,
//         gtin: null,
//         barcode: null
//       };

//       newVariants.push(newVariant);
//     }

//     if (newVariants.length === 0) {
//       toast.info(skippedCount > 0
//         ? `All ${skippedCount} combinations already exist`
//         : 'No new variants to generate');
//       return;
//     }

//     setProductVariants([...productVariants, ...newVariants]);
//     toast.success(`Generated ${newVariants.length} new variants${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`);

//   } catch (error) {
//     console.error('Error generating variants:', error);
//     toast.error('Failed to generate variants');
//   } finally {
//     setIsGeneratingVariants(false);
//   }
// };


// ============================================================
// ADD THIS useEffect - Track unsaved changes
// ============================================================

useEffect(() => {
  if (!initialFormData) return;
  
  // Compare with last saved data (after update) or initial data
  const compareWith = lastSavedData || initialFormData;
  
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(compareWith);
  setHasUnsavedChanges(hasChanges);
  
  console.log('📊 Edit Mode - Change Detection:', {
    hasChanges,
    productName: formData.name,
    compareWithName: compareWith?.name
  });
}, [formData, lastSavedData, initialFormData]);
// ============================================================
// BROWSER CLOSE WARNING
// ============================================================
// Fix #2: Move initialFormData to useEffect (Add after line 850)
useEffect(() => {
  if (!loading && formData.name && !initialFormData) {
    setInitialFormData(JSON.parse(JSON.stringify(formData)));
    console.log('✅ Initial form state captured:', formData.name);
  }
}, [loading, formData.name, initialFormData]);
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes.';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
// ============================================================
// NAVIGATION GUARD HANDLER
// ============================================================

const handleNavigateAway = useCallback((targetPath?: string) => {
  if (hasUnsavedChanges) {
    setPendingNavigation(targetPath || '/admin/products');
    setShowUnsavedModal(true);
  } else {
    router.push(targetPath || '/admin/products');
  }
}, [hasUnsavedChanges, router]);
// ============================================================
// MODAL ACTION HANDLERS
// ============================================================

const handleModalSaveDraft = async () => {
  setShowUnsavedModal(false);
  
  // Trigger draft update
  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
  await handleSubmit(fakeEvent, true, false); // isDraft=true, shouldRedirect=false
  
  // After save, navigate
  if (pendingNavigation) {
    setTimeout(() => {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }, 500);
  }
};

const handleModalUpdateProduct = async () => {
  setShowUnsavedModal(false);
  
  // Trigger publish
  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
  await handleSubmit(fakeEvent, false, false); // isDraft=false, shouldRedirect=false
  
  if (pendingNavigation) {
    setTimeout(() => {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }, 500);
  }
};

const handleModalDiscard = () => {
  setShowUnsavedModal(false);
  setHasUnsavedChanges(false);
  
  if (pendingNavigation) {
    router.push(pendingNavigation);
    setPendingNavigation(null);
  }
};

const handleModalCancel = () => {
  setShowUnsavedModal(false);
  setPendingNavigation(null);
};
// ============================================================
// ESC KEY HANDLER
// ============================================================

useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showUnsavedModal) {
      handleModalCancel();
    }
  };
  
  if (showUnsavedModal) {
    window.addEventListener('keydown', handleEscape);
  }
  
  return () => {
    window.removeEventListener('keydown', handleEscape);
  };
}, [showUnsavedModal]);
// ============================================================
// SIDEBAR CLICK PROTECTION
// ============================================================

useEffect(() => {
  const handleLinkClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && hasUnsavedChanges) {
      const href = link.getAttribute('href');
      
      if (href && href !== window.location.pathname && !href.startsWith('http')) {
        e.preventDefault();
        e.stopPropagation();
        
        setPendingNavigation(href);
        setShowUnsavedModal(true);
      }
    }
  };
  
  document.addEventListener('click', handleLinkClick, true);
  return () => document.removeEventListener('click', handleLinkClick, true);
}, [hasUnsavedChanges]);

// ============================================
// ✅ CONNECTION STATUS DISPLAY (Optional)
// ============================================
const [signalRStatus, setSignalRStatus] = useState({
  isConnected: false,
  connectionId: null as string | null
});

useEffect(() => {
  const checkStatus = () => {
    const status = signalRService.getStatus();
    setSignalRStatus({
      isConnected: status.isConnected,
      connectionId: status.connectionId
    });
  };
  
  // Check every 5 seconds
  const statusInterval = setInterval(checkStatus, 5000);
  checkStatus(); // Initial check
  
  return () => clearInterval(statusInterval);
}, []);


// ✅ Modal Handlers (unchanged)
const handleTakeoverModalClose = () => {
  setIsTakeoverModalOpen(false);
};

const handleTakeoverActionComplete = () => {
  setHasPendingTakeover(false);
  setTakeoverRequest(null);
  setPendingTakeoverRequests([]);
};

const handleReopenTakeoverModal = () => {
  if (takeoverRequest) {
    setIsTakeoverModalOpen(true);
  }
};

// ✅ States
const [skuError, setSkuError] = useState('');
const [checkingSku, setCheckingSku] = useState(false);

// ✅ FLEXIBLE SKU VALIDATION - Allows: Pure Numbers, Pure Letters, OR Alphanumeric
const validateSkuFormat = (sku: string): { isValid: boolean; error: string } => {
  const trimmedSku = sku.trim();
  
  // Check if empty
  if (!trimmedSku) {
    return { isValid: false, error: 'SKU is required' };
  }
  
  // Check minimum length
  if (trimmedSku.length < 3) {
    return { isValid: false, error: 'SKU must be at least 3 characters' };
  }
  
  // Check maximum length
  if (trimmedSku.length > 30) {
    return { isValid: false, error: 'SKU must not exceed 30 characters' };
  }
  
  // ✅ Only alphanumeric + hyphens allowed (no spaces, special chars)
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(trimmedSku)) {
    return { isValid: false, error: 'SKU format invalid. Use only LETTERS, NUMBERS, and HYPHENS (e.g., PROD-001, 641256412, MOBILE)' };
  }
  
  // Check for consecutive hyphens
  if (trimmedSku.includes('--')) {
    return { isValid: false, error: 'SKU cannot contain consecutive hyphens' };
  }
  
  // Check if starts or ends with hyphen
  if (trimmedSku.startsWith('-') || trimmedSku.endsWith('-')) {
    return { isValid: false, error: 'SKU cannot start or end with a hyphen' };
  }
  
  // ✅ ALL ALLOWED NOW:
  // - Pure numbers: 641256412 ✅
  // - Pure letters: MOBILE ✅
  // - Alphanumeric: PROD-001, LAP-HP-I5 ✅
  
  return { isValid: true, error: '' };
};

// ✅ UPDATED SKU CHECK WITH VALIDATION
const checkSkuExists = async (sku: string): Promise<boolean> => {
  // Clear previous errors
  setSkuError('');
  
  // Validation
  if (!sku || sku.length < 3) {
    return false;
  }
  
  // ✅ VALIDATE FORMAT FIRST (before API call)
  const validation = validateSkuFormat(sku);
  if (!validation.isValid) {
    setSkuError(validation.error);
    return true; // Return true to indicate "not available"
  }
  
  setCheckingSku(true);
  
  try {
    console.log('🔍 Checking SKU availability:', sku);
    
    const response = await productsService.getAll({ 
      search: sku, 
      pageSize: 100 
    });
    
    // Safe data extraction
    let products: any[] = [];
    
    try {
      if (response.data) {
        if (typeof response.data === 'object' && 'data' in response.data) {
          const nestedData = (response.data as any).data;
          
          if (nestedData && typeof nestedData === 'object') {
            if ('items' in nestedData && Array.isArray(nestedData.items)) {
              products = nestedData.items;
            } else if (Array.isArray(nestedData)) {
              products = nestedData;
            }
          }
        } else if (Array.isArray(response.data)) {
          products = response.data;
        }
      }
    } catch (parseError) {
      console.error('Error parsing products:', parseError);
      products = [];
    }
    
    // Check for duplicate SKU (exclude current product in edit mode)
    const exists = products.some((p: any) => {
      if (!p || typeof p !== 'object' || !p.sku) return false;
      if (p.id === productId) return false; // Exclude current product
      return p.sku.toUpperCase() === sku.toUpperCase();
    });
    
    if (exists) {
      setSkuError('SKU already exists. Please choose a unique SKU.');
      return true;
    }
    
    return false;
    
  } catch (error: any) {
    console.error('SKU check error:', error);
    setSkuError(''); // On error, don't block user
    return false;
  } finally {
    setCheckingSku(false);
  }
};


// ✅ State to track if component is mounted
const [isInitialLoad, setIsInitialLoad] = useState(true);

// ✅ Set initial load false after component mounts
useEffect(() => {
  const timer = setTimeout(() => {
    setIsInitialLoad(false);
  }, 1000); // Wait 1 second after page load
  
  return () => clearTimeout(timer);
}, []);

// ✅ FIXED - Don't validate on page load
const checkVariantSkuExists = async (
  sku: string, 
  currentVariantId: string,
  skipToast: boolean = false // ✅ Add this parameter
): Promise<boolean> => {
  if (!sku || sku.length < 2) return false;

  try {
    // ✅ Check within current product's variants
    const duplicateInProduct = productVariants.find(
      (v) => v.id !== currentVariantId && v.sku.toUpperCase() === sku.toUpperCase()
    );

    if (duplicateInProduct) {
      if (!skipToast && !isInitialLoad) {
        toast.warning(`SKU already used by variant "${duplicateInProduct.name}"`, {
          autoClose: 5000,
        });
      }
      return true;
    }

    // ✅ Check against main product SKU
    if (formData.sku && formData.sku.toUpperCase() === sku.toUpperCase()) {
      if (!skipToast && !isInitialLoad) {
        toast.warning("SKU matches main product SKU", { autoClose: 5000 });
      }
      return true;
    }

    // ✅ Check against database (all products and variants)
    const response = await productsService.getAll({ search: sku, pageSize: 100 });
    const products = response.data?.data?.items || [];

    for (const product of products) {
      // Skip current product in edit mode
      if (productId && product.id === productId) {
        continue; // ✅ Skip current product
      }

      // Check product SKU
      if (product.sku?.toUpperCase() === sku.toUpperCase()) {
        if (!skipToast && !isInitialLoad) {
          toast.warning(`SKU used by product "${product.name}"`, { autoClose: 5000 });
        }
        return true;
      }

      // Check variant SKUs
      if (product.variants && Array.isArray(product.variants)) {
        const variantMatch = product.variants.find(
          (v: any) => v.sku?.toUpperCase() === sku.toUpperCase()
        );
        if (variantMatch) {
          if (!skipToast && !isInitialLoad) {
            toast.warning(`SKU used by "${product.name}" - Variant "${variantMatch.name}"`, {
              autoClose: 5000,
            });
          }
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Variant SKU check error:", error);
    return false;
  }
};




// ✅ Real-time check
useEffect(() => {
  const timer = setTimeout(() => {
    if (formData.sku) {
      checkSkuExists(formData.sku);
    }
  }, 800);
  
  return () => clearTimeout(timer);
}, [formData.sku]);

// ==========================================
// 🔒 LOCK INITIALIZATION & REFRESH
// ==========================================

useEffect(() => {
  if (!productId) return;


  // 2️⃣ Setup refresh interval (10 minutes)
  refreshIntervalRef.current = setInterval(() => {
    if (!lockAcquiredRef.current) {
      console.log('⏭️ Skipping refresh - no active lock');
      return;
    }
    
    // Refresh lock silently
    acquireProductLock(productId, true); // isRefresh = true
  }, 10 * 60 * 1000); // 10 minutes

  // 3️⃣ Cleanup on unmount
  return () => {
    console.log('🧹 Cleanup: Releasing lock and clearing interval');
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    releaseProductLock(productId);
  };
}, [productId]);

// Around line 125 (after existing states)
const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(30 * 60);
const [showExpiryWarning, setShowExpiryWarning] = useState(false);
const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
// ==================== LOCK TIMER - WARNINGS + AUTO-SAVE ====================
useEffect(() => {
  if (!lockAcquiredRef.current || !productLock?.expiresAt) {
    return;
  }

  console.log('⏰ Starting lock timer...');

  // Clear any existing timer
  if (lockTimerRef.current) {
    clearInterval(lockTimerRef.current);
    lockTimerRef.current = null;
  }

  // Calculate initial remaining time
  const calculateRemainingTime = () => {
    const expiryTime = new Date(productLock.expiresAt!).getTime();
    const currentTime = Date.now();
    return Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
  };

  const initialTime = calculateRemainingTime();
  setLockTimeRemaining(initialTime);
  
  const minutes = Math.floor(initialTime / 60);
  console.log(`⏰ Lock expires in ${minutes} minutes`);

  // Start countdown timer
  lockTimerRef.current = setInterval(() => {
    setLockTimeRemaining(prev => {
      const newTime = prev - 1;

      // ✅ 5 MINUTES WARNING
      if (newTime === 300) {
        toast.warning('⏰ Lock expires in 5 minutes!', {
          autoClose: 8000,
          position: 'top-center'
        });
        console.log('⚠️ 5 minutes warning');
      }

      // ✅ 2 MINUTES WARNING
      if (newTime === 120) {
        toast.warning('⏰ Lock expires in 2 minutes! Please save your changes.', {
          autoClose: 10000,
          position: 'top-center'
        });
        console.log('⚠️ 2 minutes warning');
      }

      // ✅ 1 MINUTE WARNING
      if (newTime === 60 && !showExpiryWarning) {
        setShowExpiryWarning(true);
        toast.error('🚨 Lock expires in 1 minute! Save your work now!', {
          autoClose: 12000,
          position: 'top-center'
        });
        console.log('⚠️ 1 minute warning');
      }

      // ✅ 30 SECONDS - FINAL WARNING
      if (newTime === 30) {
        toast.error('🚨 30 seconds remaining! Auto-save will trigger soon...', {
          autoClose: 10000,
          position: 'top-center'
        });
        console.log('🚨 30 seconds warning');
      }

      // ✅ 0 SECONDS - AUTO-SAVE
      if (newTime <= 0) {
        console.log('💾 Lock expired - auto-saving changes...');
        
        // Clear timer
        if (lockTimerRef.current) {
          clearInterval(lockTimerRef.current);
          lockTimerRef.current = null;
        }

     toast.warning('Lock expired! Your changes will be discarded. Please save before editing again.', {
  autoClose: 5000,
  position: 'top-center'
});
        return 0;
      }

      return newTime;
    });
  }, 1000);

  // Cleanup
  return () => {
    if (lockTimerRef.current) {
      clearInterval(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  };
}, [lockAcquiredRef.current, productLock?.expiresAt]);



// ==================== 🔒 ACQUIRE LOCK (WITH DUPLICATE PREVENTION) ====================
const acquireProductLock = async (productId: string, isRefresh: boolean = false): Promise<boolean> => {
  // ✅ PREVENT DUPLICATE CALLS
  if (!isRefresh && isAcquiringLockRef.current) {
    console.log('⚠️ Already acquiring lock, skipping duplicate call');
    return false;
  }

  try {
    if (!isRefresh) {
      console.log('🔐 Acquiring lock...');
      setIsAcquiringLock(true);
      isAcquiringLockRef.current = true; // ✅ Set flag
    } else {
      console.log('🔄 Refreshing lock...');
    }

    const response = await productLockService.acquireLock(productId, 30);
    console.log('🔒 LOCK: Response received:', response);

    if (response.success && response.data) {
      const lockData = response.data;
      
      setProductLock({
        isLocked: lockData.isLocked,
        lockedBy: lockData.lockedBy,
        expiresAt: lockData.expiresAt || null
      });
      
      lockAcquiredRef.current = true;
      
      if (!isRefresh) {
        const expiryTime = new Date(lockData.expiresAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        toast.success(`✅ Lock acquired! Expires at ${expiryTime} IST`);
      }
      
      setIsAcquiringLock(false);
      isAcquiringLockRef.current = false; // ✅ Clear flag
      return true;
    }

    throw new Error(response.message || 'Failed to acquire lock');

  } catch (error: any) {
    setIsAcquiringLock(false);
    isAcquiringLockRef.current = false; // ✅ Clear flag on error
    lockAcquiredRef.current = false;

    // ✅ Handle 409 Conflict
    if (error.status === 409) {
      const lockedByEmail = error.lockedByEmail || 'Unknown User';
      const expiresAt = error.expiresAt;
      console.warn('⚠️ Lock conflict (409):', error.message);
      
      const currentUserEmail = localStorage.getItem('userEmail');
      const isLockedByMe = lockedByEmail === currentUserEmail;

      if (isLockedByMe) {
        console.log('✅ Already locked by you');
        lockAcquiredRef.current = true;
        if (!isRefresh) {
          toast.info('Already editing - lock active');
        }
        return true;
      }

      // ❌ Locked by someone else during refresh
      if (isRefresh) {
        console.warn('⚠️ Lock lost during refresh');
        toast.error('Lock was taken by another user');
        setTimeout(() => router.push('/admin/products'), 2000);
        return false;
      }

      // ❌ This should NOT happen if getLockStatus was called first
      console.error('❌ Unexpected: 409 error on initial acquire');
      return false;
    }

    // ❌ Other errors
    const errorMessage = error.message || 'Failed to acquire lock';
    console.error('❌ LOCK ERROR DETAILS:', {
      message: error.message,
      status: error.status,
      error: error
    });
    
    if (!isRefresh) {
      toast.error(errorMessage);
      setTimeout(() => router.push('/admin/products'), 3000);
    } else {
      console.warn('⚠️ Lock refresh failed:', errorMessage);
    }
    
    return false;
  }
};



// ==================== HANDLE TAKEOVER REQUEST ====================
// ✅ FIXED: Handle takeover request with proper type handling
const handleTakeoverRequest = async (message: string, expiryMinutes: number) => {
  console.log('📤 Sending takeover request...');
  console.log('💬 Message:', message);
  console.log('⏰ Expiry:', expiryMinutes, 'minutes');
  
  setIsSubmittingTakeover(true);
  
  try {
    // ✅ FIX: Wrap parameters into DTO object
    const response = await productLockService.requestTakeover(
      productId,
      {
        requestMessage: message.trim(),
        expiryMinutes: expiryMinutes
      }
    ) as any; // ✅ Type assertion to handle unknown type
    
    console.log('🔍 Service response:', response);
    
    // ✅ Check if response exists and has success property
    if (response && response.success) {
      console.log('✅ Takeover request sent successfully');
      
      // ✅ Update state
      setHasPendingTakeover(true);
      setTakeoverRequestStatus('pending');
      setPendingRequestTimeLeft(expiryMinutes * 60);
      
      // ✅ Start timer countdown
      const timer = setInterval(() => {
        setPendingRequestTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTakeoverRequestStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);     
    } else {
      // ✅ Handle unsuccessful response
      throw new Error(response?.message || 'Failed to send request');
    }
  } catch (error: any) {
    console.error('❌ Takeover request error:', error);
    
    // ✅ Better error handling
    const errorMessage = error?.response?.data?.message 
      || error?.message 
      || '❌ Failed to send request';
    
    toast.error(errorMessage);
    throw error;
  } finally {
    setIsSubmittingTakeover(false);
  }
};

// ==================== TAKEOVER MODAL HANDLERS ====================
const openTakeoverModal = () => {
  setIsTakeoverModalOpen(true);
};

const closeTakeoverModal = () => {
  setIsTakeoverModalOpen(false);
  setTakeoverRequestMessage('');
  setTakeoverExpiryMinutes(10);
};

// ==================== RELEASE PRODUCT LOCK (USING SERVICE) ====================
const releaseProductLock = async (productId: string): Promise<boolean> => {
  if (!lockAcquiredRef.current) {
    console.log('🔓 No lock to release');
    return true;
  }

  try {
    console.log('🔓 Releasing product lock...');
    
    // ✅ USE LOCK SERVICE (not productsService)
    const response = await productLockService.releaseLock(productId);

    console.log('🔓 LOCK: Release response:', response);

    if (response.success) {
      setProductLock(null);
      lockAcquiredRef.current = false;
      console.log('✅ Product lock released successfully');
      // Don't show toast on unmount (cleanup)
      // toast.success('Product lock released');
      return true;
    }

    console.warn('⚠️ Lock release warning:', response.message);
    return false;

  } catch (error: any) {
    console.error('❌ Failed to release lock:', error);

    const errorMessage = error.message || 'Failed to release lock';

    // Only show toast if not during unmount/cleanup
    if (!document.hidden) {
      toast.error(errorMessage);
    }

    lockAcquiredRef.current = false;
    return false;
  }
};

// ==================== HANDLERS ====================
const handleCancel = async () => {
  await releaseProductLock(productId);
  router.push("/admin/products");
};

const handleModalClose = () => {
  setIsLockModalOpen(false);
  router.push("/admin/products");
};


// ✂️ Utility: HTML → plain text length safe
const getPlainText = (html: string) =>
  html.replace(/<[^>]*>/g, '').trim();

// ✂️ Utility: truncate HTML by plain text length
const truncateHtmlByTextLength = (html: string, maxLength: number) => {
  const div = document.createElement('div');
  div.innerHTML = html;

  let count = 0;
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const remaining = maxLength - count;

    if (remaining <= 0) {
      node.textContent = '';
    } else if (node.textContent!.length > remaining) {
      node.textContent = node.textContent!.slice(0, remaining);
      count = maxLength;
    } else {
      count += node.textContent!.length;
    }
  }

  return div.innerHTML;
};
// ==================== FORM SUBMISSION HANDLER ====================
const handleSubmit = async (e?: React.FormEvent, isDraft: boolean = false, releaseLockAfter: boolean = true) => {
  if (e) {
    e.preventDefault();
  }

  const target = (e?.target as HTMLElement) || document.body;

  // ================================
  // SECTION 1: DUPLICATE SUBMISSION PREVENTION
  // ================================
  if (target.hasAttribute('data-submitting')) {
    toast.info('⏳ Already submitting... Please wait!');
    return;
  }

  if (isAcquiringLock) {
    toast.warning('⏳ Acquiring edit lock... Please wait a moment.');
    return;
  }

  if (!productLock || !productLock.isLocked) {
    toast.error('❌ Cannot save: Product edit lock not acquired.');
    return;
  }

  // Check lock expiry
  if (productLock.expiresAt) {
    const expiryTime = new Date(productLock.expiresAt).getTime();
    const currentTime = new Date().getTime();

    if (currentTime >= expiryTime) {
      toast.error('⏰ Your edit lock has expired. Refreshing...');
      await acquireProductLock(productId);
      return;
    }
  }

  target.setAttribute('data-submitting', 'true');
  setIsSubmitting(true); // ✅ START LOADER

  try {
    // ✅ PROGRESS: 10% - Start Validation
    setSubmitProgress({
      step: isDraft ? 'Validating draft data...' : 'Validating product data...',
      percentage: 10,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: BASIC REQUIRED FIELDS
    // ═══════════════════════════════════════════════════════════════════════

    if (!formData.name || formData.name.trim().length === 0) {
      toast.error('❌ Product Name is required');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (!formData.sku || formData.sku.trim().length === 0) {
      toast.error('❌ SKU is required');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

//   if (!formData.price) {
//   toast.error('❌ Price is required');
//   target.removeAttribute('data-submitting');
//   setIsSubmitting(false);
//   setSubmitProgress(null);
//   return;
// }

    // If product is NOT VAT exempt, VAT rate is required
if (!formData.vatExempt && (!formData.vatRateId || !formData.vatRateId.trim())) {
  toast.error('❌ VAT rate is required when product is taxable');
  target.removeAttribute('data-submitting');
  setIsSubmitting(false);
  setSubmitProgress(null);
  return;
}

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: STRING FORMAT VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.name.length < 3) {
      toast.error('⚠️ Product name must be at least 3 characters');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (formData.name.length > 150) {
      toast.error('⚠️ Product name cannot exceed 150 characters');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    const PRODUCT_NAME_REGEX = /^[A-Za-z0-9\u00C0-\u024F\s.,()'"'\-\/&+%]+$/;
    if (!PRODUCT_NAME_REGEX.test(formData.name)) {
      toast.error('⚠️ Product name contains unsupported characters.');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    const skuRegex = /^[A-Za-z0-9_-]+$/;
    if (!skuRegex.test(formData.sku)) {
      toast.error('⚠️ SKU can only contain letters, numbers, dashes, and underscores');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (formData.sku.length < 2) {
      toast.error('⚠️ SKU must be at least 2 characters');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (formData.sku.length > 50) {
      toast.error('⚠️ SKU cannot exceed 50 characters');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    // ✅ PROGRESS: 20% - SKU Check
    setSubmitProgress({
      step: 'Checking SKU availability...',
      percentage: 20,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: SKU UNIQUENESS CHECK
    // ═══════════════════════════════════════════════════════════════════════

    try {
      const allProducts = await productsService.getAll();
      const items = allProducts.data?.data?.items ?? [];
      const skuExists = items.some((p: any) =>
        p.sku?.toLowerCase() === formData.sku.toLowerCase() && p.id !== productId
      );

      if (skuExists) {
        toast.error('❌ SKU already exists. Please use a unique SKU.');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Could not verify SKU uniqueness:', error);
    }

      const skuValidation = validateSkuFormat(formData.sku);
  if (!skuValidation.isValid) {
    toast.error(skuValidation.error, { autoClose: 5000 });
    return;
  }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: DESCRIPTION LENGTH VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.shortDescription) {
      const length = getPlainText(formData.shortDescription).length;
      if (length > 350) {
        formData.shortDescription = truncateHtmlByTextLength(formData.shortDescription, 350);
        toast.info('ℹ️ Short description trimmed to 350 characters');
      }
    }

    if (!formData.fullDescription || !getPlainText(formData.fullDescription).trim()) {
  toast.error('❌ Full description is required');
  target.removeAttribute('data-submitting');
  setIsSubmitting(false);
  setSubmitProgress(null);
  return;
}

const length = getPlainText(formData.fullDescription).length;

if (length > 2000) {
  formData.fullDescription = truncateHtmlByTextLength(
    formData.fullDescription,
    2000
  );
  toast.info('ℹ️ Full description trimmed to 2000 characters');
}

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: NUMBER PARSING HELPER
    // ═══════════════════════════════════════════════════════════════════════

    const parseNumber = (value: any, fieldName: string): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const cleaned = String(value).trim().replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) {
        console.warn(`⚠️ Invalid number for ${fieldName}:`, value);
        return null;
      }
      return parsed;
    };

    // ✅ PROGRESS: 30% - Price Validation
    setSubmitProgress({
      step: 'Validating pricing...',
      percentage: 30,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: PRICE VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    const parsedPrice = parseNumber(formData.price, 'price');
    if (parsedPrice === null) {
      toast.error('⚠️ Please enter a valid price');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (parsedPrice < 0) {
      toast.error('❌ Price cannot be negative');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }
// if (!formData.stockQuantity ) {
//   toast.error('❌ Stock quantity is required');
//   target.removeAttribute('data-submitting');
//   setIsSubmitting(false);
//   setSubmitProgress(null);
//   return;
// }

    if (parsedPrice > 10000000) {
      toast.error('⚠️ Price seems unusually high. Please verify.');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    const parsedOldPrice = parseNumber(formData.oldPrice, 'oldPrice');
    const parsedCost = parseNumber(formData.cost, 'cost');

    if (parsedOldPrice !== null && parsedOldPrice < 0) {
      toast.error('❌ Old price cannot be negative');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (parsedOldPrice !== null && parsedOldPrice < parsedPrice) {
      toast.warning('⚠️ Old price is less than current price. Strikethrough won\'t show.');
    }

    if (parsedCost !== null && parsedCost < 0) {
      toast.error('❌ Cost price cannot be negative');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (parsedCost !== null && parsedCost > parsedPrice) {
      toast.warning('⚠️ Cost is higher than selling price. Profit will be negative.');
    }

    // ✅ PROGRESS: 35% - Category/Brand Validation
    setSubmitProgress({
      step: 'Validating categories and brands...',
      percentage: 35,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: CATEGORY VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let categoryIdsArray: string[] = [];
    if (formData.categoryIds && Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0) {
      categoryIdsArray = formData.categoryIds.filter(id => {
        if (!id || typeof id !== 'string') return false;
        return guidRegex.test(id.trim());
      });
    }

    if (categoryIdsArray.length === 0) {
      toast.error('❌ Please select at least one category');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (categoryIdsArray.length > 5) {
      toast.error('⚠️ Maximum 5 categories allowed');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8A: HOMEPAGE DISPLAY ORDER VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.displayOrder !== undefined && formData.displayOrder !== null) {
      const displayOrderNum = parseInt(formData.displayOrder as any) || 0;

      if (displayOrderNum < 0) {
        toast.error('❌ Display order cannot be negative.', { autoClose: 5000 });
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (displayOrderNum === 0 && !formData.showOnHomepage) {
        toast.warning('⚠️ Display order will be ignored: product not on homepage.', { autoClose: 5000 });
      }
    }

    if (formData.showOnHomepage) {
      try {
        const response = await productsService.getAll({ pageSize: 100 });
        let allProducts: any[] = [];

        if (response.data?.data?.items) {
          allProducts = response.data.data.items;
        } else if (Array.isArray(response.data?.data)) {
          allProducts = response.data.data;
        } else if (Array.isArray(response.data)) {
          allProducts = response.data;
        }

        const homepageProducts = allProducts.filter((p: any) => {
          if (p.id === productId) return false;
          return p.showOnHomepage === true;
        });

        const MAX_HOMEPAGE_PRODUCTS = 50;

        if (homepageProducts.length >= MAX_HOMEPAGE_PRODUCTS) {
          toast.error(
            `❌ Homepage product limit reached (${MAX_HOMEPAGE_PRODUCTS} maximum). Please remove other products first.`,
            { autoClose: 8000, position: 'top-center' }
          );
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }

        if (homepageProducts.length >= MAX_HOMEPAGE_PRODUCTS - 10) {
          const currentCount = homepageProducts.length + 1;
          toast.warning(
            `⚠️ Homepage products: ${currentCount}/${MAX_HOMEPAGE_PRODUCTS}. Approaching limit!`,
            { autoClose: 5000, position: 'top-right' }
          );
        }
      } catch (error) {
        console.warn('⚠️ Could not verify homepage product limit:', error);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 9: BRAND VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    let brandIdsArray: string[] = [];
    if (formData.brandIds && Array.isArray(formData.brandIds) && formData.brandIds.length > 0) {
      brandIdsArray = formData.brandIds.filter(id => {
        if (!id || typeof id !== 'string') return false;
        return guidRegex.test(id.trim());
      });
    } else if (formData.brand && formData.brand.trim()) {
      const trimmedBrand = formData.brand.trim();
      if (guidRegex.test(trimmedBrand)) {
        brandIdsArray = [trimmedBrand];
      }
    }

    if (brandIdsArray.length === 0) {
      toast.error('❌ Please select at least one brand');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    const brandsArray = brandIdsArray.map((brandId, index) => ({
      brandId: brandId,
      isPrimary: index === 0,
      displayOrder: index + 1
    }));

    // ✅ PROGRESS: 40% - Inventory Validation
    setSubmitProgress({
      step: 'Validating inventory settings...',
      percentage: 40,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 10: INVENTORY VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.manageInventory === 'track') {
      const stockQty = parseInt(formData.stockQuantity) || 0;
      const minStockQty = parseInt(formData.minStockQuantity) || 0;
      const notifyQty = parseInt(formData.notifyQuantityBelow) || 0;

      if (stockQty < 0) {
        toast.error('❌ Stock quantity cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (minStockQty < 0) {
        toast.error('❌ Minimum stock quantity cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (formData.notifyAdminForQuantityBelow && notifyQty < 0) {
        toast.error('❌ Notification quantity cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (minStockQty > stockQty) {
        toast.warning('⚠️ Minimum stock is higher than current stock');
      }

      if (formData.notifyAdminForQuantityBelow && notifyQty > stockQty) {
        toast.info('ℹ️ You will receive low stock notification immediately');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 11: CART QUANTITY VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    const minCartQty = parseInt(formData.orderMinimumQuantity) || 1;
    const maxCartQty = parseInt(formData.orderMaximumQuantity) || 10;

    if (minCartQty < 1) {
      toast.error('❌ Minimum cart quantity must be at least 1');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (maxCartQty < minCartQty) {
      toast.error('❌ Maximum cart quantity cannot be less than minimum');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    if (maxCartQty > 9999) {
      toast.error('❌ Maximum cart quantity is too high');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    // ✅ PROGRESS: 45% - Dimensions Validation
    setSubmitProgress({
      step: 'Validating shipping dimensions...',
      percentage: 45,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 12: DIMENSIONS VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.isShipEnabled) {
      const weight = parseNumber(formData.weight, 'weight');
      const length = parseNumber(formData.length, 'length');
      const width = parseNumber(formData.width, 'width');
      const height = parseNumber(formData.height, 'height');

      if (weight !== null && weight < 0) {
        toast.error('❌ Weight cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (weight !== null && weight > 1000) {
        toast.warning('⚠️ Weight seems very high (>1000 kg). Please verify.');
      }

      if (length !== null && length < 0) {
        toast.error('❌ Length cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (width !== null && width < 0) {
        toast.error('❌ Width cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (height !== null && height < 0) {
        toast.error('❌ Height cannot be negative');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 13: DATE VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.markAsNew) {
      if (!formData.markAsNewStartDate) {
        toast.error('❌ Please set "Mark as New" start date');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (!formData.markAsNewEndDate) {
        toast.error('❌ Please set "Mark as New" end date');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      const startDate = new Date(formData.markAsNewStartDate);
      const endDate = new Date(formData.markAsNewEndDate);

      if (endDate <= startDate) {
        toast.error('❌ "Mark as New" end date must be after start date');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    if (formData.availableStartDate && formData.availableEndDate) {
      const availStart = new Date(formData.availableStartDate);
      const availEnd = new Date(formData.availableEndDate);

      if (availEnd <= availStart) {
        toast.error('❌ Availability end date must be after start date');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    if (formData.availableForPreOrder && !formData.preOrderAvailabilityStartDate) {
      toast.error('❌ Please set pre-order availability date');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    // ✅ PROGRESS: 50% - Grouped Product Validation
    setSubmitProgress({
      step: 'Validating grouped product settings...',
      percentage: 50,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 14: GROUPED PRODUCT VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.productType === 'grouped' && formData.requireOtherProducts) {
      if (!formData.requiredProductIds || !formData.requiredProductIds.trim()) {
        toast.error('❌ Please select products for grouped product');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      const groupedProductIds = formData.requiredProductIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      if (groupedProductIds.length === 0) {
        toast.error('❌ Please select at least one product for grouped product');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (groupedProductIds.length > 20) {
        toast.error('❌ Maximum 20 products allowed in grouped product');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (formData.groupBundleDiscountType === 'Percentage') {
        const discountPercent = parseNumber(formData.groupBundleDiscountPercentage, 'discount');
        if (discountPercent !== null && (discountPercent < 0 || discountPercent > 100)) {
          toast.error('❌ Discount percentage must be between 0 and 100');
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }
      }

      if (formData.groupBundleDiscountType === 'FixedAmount') {
        const discountAmount = parseNumber(formData.groupBundleDiscountAmount, 'discount amount');
        if (discountAmount !== null && discountAmount < 0) {
          toast.error('❌ Discount amount cannot be negative');
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }
      }

      if (formData.groupBundleDiscountType === 'SpecialPrice') {
        const specialPrice = parseNumber(formData.groupBundleSpecialPrice, 'special price');
        if (specialPrice !== null && specialPrice < 0) {
          toast.error('❌ Special price cannot be negative');
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 14A: GROUPED + SUBSCRIPTION CONFLICT VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.productType === 'grouped' && formData.isRecurring) {
      toast.error('❌ Grouped products cannot have subscription/recurring enabled. Please disable subscription first.', {
        autoClose: 8000,
        position: 'top-center'
      });
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 15: RECURRING/SUBSCRIPTION VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.isRecurring) {
      const cycleLength = parseInt(formData.recurringCycleLength) || 0;

      if (cycleLength <= 0) {
        toast.error('❌ Recurring cycle length must be greater than 0');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (cycleLength > 365) {
        toast.error('⚠️ Recurring cycle length seems too long (>365)');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (formData.recurringTotalCycles) {
        const totalCycles = parseInt(formData.recurringTotalCycles) || 0;
        if (totalCycles < 0) {
          toast.error('❌ Total cycles cannot be negative');
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }
      }

      if (formData.subscriptionDiscountPercentage) {
        const subDiscount = parseNumber(formData.subscriptionDiscountPercentage, 'subscription discount');
        if (subDiscount !== null && (subDiscount < 0 || subDiscount > 100)) {
          toast.error('❌ Subscription discount must be between 0 and 100');
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          return;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 16: RENTAL VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.isRental) {
      const rentalLength = parseInt(formData.rentalPriceLength) || 0;
      if (rentalLength <= 0) {
        toast.error('❌ Rental period must be greater than 0');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 17: BASE PRICE VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.basepriceEnabled) {
      const baseAmount = parseNumber(formData.basepriceAmount, 'base price amount');
      const baseBaseAmount = parseNumber(formData.basepriceBaseAmount, 'base price base amount');

      if (baseAmount === null || baseAmount <= 0) {
        toast.error('❌ Base price amount must be greater than 0');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (baseBaseAmount === null || baseBaseAmount <= 0) {
        toast.error('❌ Base price base amount must be greater than 0');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }

      if (!formData.basepriceUnit || !formData.basepriceBaseUnit) {
        toast.error('❌ Please select base price units');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    // ✅ PROGRESS: 55% - SEO Validation
    setSubmitProgress({
      step: 'Validating SEO settings...',
      percentage: 55,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 18: SEO VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.metaTitle && formData.metaTitle.length > 60) {
      toast.warning('⚠️ Meta title is longer than recommended (60 characters)');
    }

    if (formData.metaDescription && formData.metaDescription.length > 160) {
      toast.warning('⚠️ Meta description is longer than recommended (160 characters)');
    }

    if (formData.searchEngineFriendlyPageName) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.searchEngineFriendlyPageName)) {
        toast.error('❌ SEO slug can only contain lowercase letters, numbers, and hyphens');
        target.removeAttribute('data-submitting');
        setIsSubmitting(false);
        setSubmitProgress(null);
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 18A: PRODUCT OPTIONS VALIDATION (NEW)
    // ═══════════════════════════════════════════════════════════════════════

    console.log('🔧 Building options array from productOptions:', productOptions);
    const optionsArray = productOptions
      ?.filter(opt => opt.name && opt.values && opt.values.length > 0)
      .map((opt, index) => {
        const isExistingOpt = opt.id && guidRegex.test(opt.id);
        const optData: any = {
          name: opt.name.trim(),
          values: opt.values.join(','), // Convert array to comma-separated string for API
          displayType: opt.displayType || 'dropdown',
          position: opt.position || index + 1,
          isActive: opt.isActive ?? true
        };
        console.log('📦 Option data prepared:', optData);

        if (optData.name.length > 50) {
          toast.error(`❌ Option name "${optData.name}" is too long (max 50 chars)`);
          throw new Error('Invalid option name');
        }

        if (isExistingOpt) {
          optData.id = opt.id;
        }

        return optData;
      });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 19: ATTRIBUTES VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    const attributesArray = productAttributes
      ?.filter(attr => attr.name && attr.value)
      .map(attr => {
        const isExistingAttr = attr.id && guidRegex.test(attr.id);
        const attrData: any = {
          name: attr.name.trim(),
          value: attr.value.trim(),
          displayOrder: attr.displayOrder || 0
        };

        if (attrData.name.length > 100) {
          toast.error(`❌ Attribute name "${attrData.name}" is too long (max 100 chars)`);
          throw new Error('Invalid attribute name');
        }

        if (attrData.value.length > 500) {
          toast.error(`❌ Attribute value for "${attrData.name}" is too long (max 500 chars)`);
          throw new Error('Invalid attribute value');
        }

        if (isExistingAttr) {
          attrData.id = attr.id;
        }

        return attrData;
      });

    // ✅ PROGRESS: 60% - Variant Validation
    setSubmitProgress({
      step: 'Validating product variants...',
      percentage: 60,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 20: VARIANTS VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

// ============================================
// 🔥 COMPLETE VARIANT PAYLOAD CREATION
// ============================================

// ✅ SECTION 20: VARIANTS VALIDATION - WITH CLEANING

const firstVariant = productVariants[0]; // Get master variant

const variantsArray = productVariants?.map(variant => {
  // ========== VALIDATION (SAME AS BEFORE) ==========
  if (!variant.name || variant.name.trim().length === 0) {
    toast.error('All variants must have a name');
    throw new Error('Invalid variant name');
  }
  
  if (!variant.sku || variant.sku.trim().length === 0) {
    toast.error(`Variant "${variant.name}" must have a SKU`);
    throw new Error('Invalid variant SKU');
  }

  // Check duplicate variant SKU
  const duplicateVariant = productVariants.find(
    v => v.id !== variant.id && v.sku.trim().toUpperCase() === variant.sku.trim().toUpperCase()
  );
  if (duplicateVariant) {
    toast.error(`Duplicate variant SKU "${variant.sku}" is already used by variant "${duplicateVariant.name}"`, {
      autoClose: 8000
    });
    throw new Error('Duplicate variant SKU');
  }

  // Check if variant SKU matches product SKU
  if (variant.sku.trim().toUpperCase() === formData.sku.trim().toUpperCase()) {
    toast.error(`Variant SKU "${variant.sku}" cannot be the same as main product SKU`, {
      autoClose: 8000
    });
    throw new Error('Variant SKU matches product SKU');
  }

  // Price validation
  const variantPrice = typeof variant.price === 'number' ? variant.price : parseNumber(variant.price, 'variant.price') ?? 0;
  if (variantPrice < 0) {
    toast.error(`Variant "${variant.name}" price cannot be negative`);
    throw new Error('Invalid variant price');
  }

  // ========== ✅ CLEAN VARIANT OPTIONS BEFORE BUILDING ==========
  const cleanedVariant = cleanVariantOptions(variant, firstVariant);

  // ========== DATA PREPARATION ==========
  const imageUrl = variant.imageUrl?.startsWith('blob') ? null : variant.imageUrl;
  const isExistingVariant = variant.id && guidRegex.test(variant.id);

  // ========== BUILD VARIANT OBJECT WITH CLEANED OPTIONS ==========
  const variantData: any = {
    name: cleanedVariant.name.trim(),
    sku: cleanedVariant.sku.trim().toUpperCase(),
    price: variantPrice,
    compareAtPrice: typeof cleanedVariant.compareAtPrice === 'number'
      ? cleanedVariant.compareAtPrice
      : parseNumber(cleanedVariant.compareAtPrice, 'cleanedVariant.compareAtPrice'),
    weight: typeof cleanedVariant.weight === 'number'
      ? cleanedVariant.weight
      : parseNumber(cleanedVariant.weight, 'cleanedVariant.weight'),
    stockQuantity: typeof cleanedVariant.stockQuantity === 'number'
      ? cleanedVariant.stockQuantity
      : parseInt(String(cleanedVariant.stockQuantity)) || 0,
    trackInventory: cleanedVariant.trackInventory ?? true,

    // NEW: Option values as comma-separated string for API
    optionValues: variant.optionValues && variant.optionValues.length > 0
      ? variant.optionValues.filter(v => v).join(',')
      : null,

    // Legacy option fields (kept for backward compatibility)
    option1Name: cleanedVariant.option1Name,
    option1Value: cleanedVariant.option1Value,
    option2Name: cleanedVariant.option2Name,
    option2Value: cleanedVariant.option2Value,
    option3Name: cleanedVariant.option3Name,
    option3Value: cleanedVariant.option3Value,

    // Media
    imageUrl: imageUrl,

    // Settings
    isDefault: cleanedVariant.isDefault ?? false,
    displayOrder: cleanedVariant.displayOrder ?? 0,
    isActive: cleanedVariant.isActive ?? true,

    // IDENTIFIERS
    gtin: cleanedVariant.gtin && cleanedVariant.gtin.trim()
      ? cleanedVariant.gtin.trim()
      : null,
    barcode: cleanedVariant.barcode && cleanedVariant.barcode.trim()
      ? cleanedVariant.barcode.trim().toUpperCase()
      : cleanedVariant.sku, // Use SKU as fallback
  };

  // Add ID for existing variants
  if (isExistingVariant) {
    variantData.id = cleanedVariant.id;
  }

  return variantData;
});



    if (variantsArray && variantsArray.length > 0) {
      try {
        const allProductsResponse = await productsService.getAll({ pageSize: 1000 });
        const allProducts = allProductsResponse.data?.data?.items || [];

        for (const variant of variantsArray) {
          const productSkuConflict = allProducts.find((p: any) =>
            p.id !== productId && p.sku?.toUpperCase() === variant.sku.toUpperCase()
          );

          if (productSkuConflict) {
            toast.error(
              `❌ Variant SKU "${variant.sku}" conflicts with product "${productSkuConflict.name}" SKU "${productSkuConflict.sku}"`,
              { autoClose: 10000 }
            );
            throw new Error('Variant SKU conflicts with product SKU');
          }

          for (const product of allProducts) {
            if (product.id === productId) continue;

            if (product.variants && Array.isArray(product.variants)) {
              const variantSkuConflict = product.variants.find((v: any) =>
                v.sku?.toUpperCase() === variant.sku.toUpperCase()
              );

              if (variantSkuConflict) {
                toast.error(
                  `❌ Variant SKU "${variant.sku}" conflicts with "${product.name}" - Variant "${variantSkuConflict.name}"`,
                  { autoClose: 10000 }
                );
                throw new Error('Variant SKU conflicts with another product\'s variant');
              }
            }
          }
        }

        console.log('✅ All variant SKUs are unique');
      } catch (error: any) {
        if (error.message?.includes('Variant SKU conflicts') || error.message?.includes('Duplicate variant SKU')) {
          target.removeAttribute('data-submitting');
          setIsSubmitting(false);
          setSubmitProgress(null);
          throw error;
        }
        console.warn('⚠️ Could not verify variant SKU uniqueness:', error);
      }
    }

    // ✅ PROGRESS: 70% - Image Validation
    setSubmitProgress({
      step: 'Validating product images...',
      percentage: 70,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 21: IMAGE VALIDATIONS
    // ═══════════════════════════════════════════════════════════════════════

    // if (formData.productImages.length < 5) {
    //   toast.error('❌ Please upload at least 5 product images before saving');
    //   target.removeAttribute('data-submitting');
    //   setIsSubmitting(false);
    //   setSubmitProgress(null);
    //   return;
    // }

    if (formData.productImages.length > 10) {
      toast.error('❌ Maximum 10 images allowed');
      target.removeAttribute('data-submitting');
      setIsSubmitting(false);
      setSubmitProgress(null);
      return;
    }
const cleanedCartData = {
  orderMinimumQuantity: formData.allowedQuantities ? null : (parseInt(formData.orderMinimumQuantity) || 1),
  orderMaximumQuantity: formData.allowedQuantities ? null : (parseInt(formData.orderMaximumQuantity) || 10),
  allowedQuantities: formData.allowedQuantities || null
};
    // ✅ PROGRESS: 80% - Preparing Data
    setSubmitProgress({
      step: 'Preparing product data...',
      percentage: 80,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 22: BUILD PRODUCT DATA OBJECT
    // ═══════════════════════════════════════════════════════════════════════

    const productData: any = {
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || `${formData.name} - Product description`,
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      gtin: formData.gtin?.trim() || null,
      manufacturerPartNumber: formData.manufacturerPartNumber?.trim() || null,
      status: isDraft ? 'Draft' : 'Active',
      isPublished: isDraft ? false : (formData.published ?? true),
      productType: formData.productType || 'simple',
      visibleIndividually: formData.visibleIndividually ?? true,
      customerRoles: formData.customerRoles || 'all',
      limitedToStores: formData.limitedToStores ?? false,
      vendorId: null,
      requireOtherProducts: formData.productType === 'grouped' ? formData.requireOtherProducts : false,
      requiredProductIds: formData.productType === 'grouped' && formData.requireOtherProducts && formData.requiredProductIds?.trim()
        ? formData.requiredProductIds.trim()
        : null,
      automaticallyAddProducts: formData.productType === 'grouped' && formData.requireOtherProducts
        ? formData.automaticallyAddProducts
        : false,
      groupBundleDiscountType: formData.productType === 'grouped' ? formData.groupBundleDiscountType || 'None' : 'None',
      groupBundleDiscountPercentage: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'Percentage'
        ? parseNumber(formData.groupBundleDiscountPercentage, 'groupBundleDiscountPercentage') ?? 0
        : null,
      groupBundleDiscountAmount: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'FixedAmount'
        ? parseNumber(formData.groupBundleDiscountAmount, 'groupBundleDiscountAmount') ?? 0
        : null,
      groupBundleSpecialPrice: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'SpecialPrice'
        ? parseNumber(formData.groupBundleSpecialPrice, 'groupBundleSpecialPrice') ?? 0
        : null,
      groupBundleSavingsMessage: formData.productType === 'grouped' && formData.groupBundleDiscountType !== 'None'
        ? formData.groupBundleSavingsMessage?.trim() || null
        : null,
      showIndividualPrices: formData.productType === 'grouped' ? formData.showIndividualPrices ?? true : true,
      applyDiscountToAllItems: formData.productType === 'grouped' && formData.groupBundleDiscountType !== 'None'
        ? formData.applyDiscountToAllItems ?? false
        : false,
      showOnHomepage: formData.showOnHomepage ?? false,
      displayOrder: parseInt(formData.displayOrder as any) || 0,
      adminComment: formData.adminComment?.trim() || null,
      isPack: formData.isPack ?? false,
      gender: formData.gender?.trim() || null,
      brandId: brandIdsArray[0],
      brandIds: brandIdsArray,
      brands: brandsArray,
      categoryId: categoryIdsArray[0],
      categoryIds: categoryIdsArray,
      tags: formData.productTags?.trim() || null,
      price: parsedPrice,
      oldPrice: parsedOldPrice,
      compareAtPrice: parsedOldPrice,
      costPrice: parsedCost,
      disableBuyButton: formData.disableBuyButton ?? false,
      disableWishlistButton: formData.disableWishlistButton ?? false,
      availableForPreOrder: formData.availableForPreOrder ?? false,
      preOrderAvailabilityStartDate: formData.availableForPreOrder && formData.preOrderAvailabilityStartDate
        ? new Date(formData.preOrderAvailabilityStartDate).toISOString()
        : null,
      basepriceEnabled: formData.basepriceEnabled ?? false,
      basepriceAmount: parseNumber(formData.basepriceAmount, 'basepriceAmount'),
      basepriceUnit: formData.basepriceEnabled ? formData.basepriceUnit || null : null,
      basepriceBaseAmount: parseNumber(formData.basepriceBaseAmount, 'basepriceBaseAmount'),
      basepriceBaseUnit: formData.basepriceEnabled ? formData.basepriceBaseUnit || null : null,
      markAsNew: formData.markAsNew ?? false,
      markAsNewStartDate: formData.markAsNew && formData.markAsNewStartDate
        ? new Date(formData.markAsNewStartDate).toISOString()
        : null,
      markAsNewEndDate: formData.markAsNew && formData.markAsNewEndDate
        ? new Date(formData.markAsNewEndDate).toISOString()
        : null,
      availableStartDate: formData.availableStartDate && formData.availableStartDate.trim()
        ? new Date(formData.availableStartDate).toISOString()
        : null,
      availableEndDate: formData.availableEndDate && formData.availableEndDate.trim()
        ? new Date(formData.availableEndDate).toISOString()
        : null,
      vatExempt: formData.vatExempt ?? false,
      vatRateId: formData.vatRateId || null,
      trackQuantity: formData.manageInventory === 'track',
      manageInventoryMethod: formData.manageInventory || 'track',
      stockQuantity: parseInt(formData.stockQuantity as any) || 0,
      displayStockAvailability: formData.displayStockAvailability ?? true,
      displayStockQuantity: formData.displayStockQuantity ?? false,
      minStockQuantity: parseInt(formData.minStockQuantity as any) || 0,
      lowStockThreshold: parseInt(formData.minStockQuantity as any) || 0,
      notifyAdminForQuantityBelow: formData.notifyAdminForQuantityBelow ?? false,
      notifyQuantityBelow: formData.notifyAdminForQuantityBelow
        ? parseInt(formData.notifyQuantityBelow as any) || 0
        : null,
      allowBackorder: formData.allowBackorder ?? false,
      backorderMode: formData.backorderMode || 'no-backorders',
      // ✅ NEW CODE
orderMinimumQuantity: cleanedCartData.orderMinimumQuantity,  // null when allowedQuantities active
orderMaximumQuantity: cleanedCartData.orderMaximumQuantity,  // null when allowedQuantities active
allowedQuantities: cleanedCartData.allowedQuantities,        // null when min/max active

      notReturnable: formData.notReturnable ?? false,
      requiresShipping: formData.isShipEnabled ?? true,
      shipSeparately: formData.shipSeparately ?? false,
      deliveryDateId: formData.deliveryDateId || null,
      estimatedDispatchDays: 0,
      dispatchTimeNote: null,
      weight: parseNumber(formData.weight, 'weight') || 0,
      length: parseNumber(formData.length, 'length'),
      width: parseNumber(formData.width, 'width'),
      height: parseNumber(formData.height, 'height'),
      weightUnit: 'kg',
      dimensionUnit: 'cm',
      sameDayDeliveryEnabled: formData.sameDayDeliveryEnabled ?? false,
      nextDayDeliveryEnabled: formData.nextDayDeliveryEnabled ?? false,
      standardDeliveryEnabled: formData.standardDeliveryEnabled ?? true,
      sameDayDeliveryCutoffTime: formData.sameDayDeliveryCutoffTime?.trim() || null,
      nextDayDeliveryCutoffTime: formData.nextDayDeliveryCutoffTime?.trim() || null,
      standardDeliveryDays: parseNumber(formData.standardDeliveryDays, 'standardDeliveryDays') ?? 5,
      sameDayDeliveryCharge: parseNumber(formData.sameDayDeliveryCharge, 'sameDayDeliveryCharge') ?? 0,
      nextDayDeliveryCharge: parseNumber(formData.nextDayDeliveryCharge, 'nextDayDeliveryCharge') ?? 0,
      standardDeliveryCharge: parseNumber(formData.standardDeliveryCharge, 'standardDeliveryCharge') ?? 0,
      isRecurring: formData.productType !== 'grouped' && formData.isRecurring ? true : false,
      recurringCycleLength: formData.productType !== 'grouped' && formData.isRecurring
        ? parseInt(formData.recurringCycleLength as any) || 0
        : null,
      recurringCyclePeriod: formData.productType !== 'grouped' && formData.isRecurring
        ? formData.recurringCyclePeriod || 'days'
        : null,
      recurringTotalCycles: formData.productType !== 'grouped' && formData.isRecurring && formData.recurringTotalCycles
        ? parseInt(formData.recurringTotalCycles as any)
        : null,
      subscriptionDiscountPercentage: formData.productType !== 'grouped'
        ? parseNumber(formData.subscriptionDiscountPercentage, 'subscriptionDiscountPercentage')
        : null,
      allowedSubscriptionFrequencies: formData.productType !== 'grouped'
        ? formData.allowedSubscriptionFrequencies?.trim() || null
        : null,
      subscriptionDescription: formData.productType !== 'grouped'
        ? formData.subscriptionDescription?.trim() || null
        : null,
      metaTitle: formData.metaTitle?.trim() || null,
      metaDescription: formData.metaDescription?.trim() || null,
      metaKeywords: formData.metaKeywords?.trim() || null,
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName?.trim() || null,
      allowCustomerReviews: formData.allowCustomerReviews ?? false,
      videoUrls: formData.videoUrls && formData.videoUrls.length > 0
        ? formData.videoUrls.join(',')
        : null,
      options: optionsArray && optionsArray.length > 0 ? optionsArray : [],
      attributes: attributesArray && attributesArray.length > 0 ? attributesArray : [],
      variants: variantsArray && variantsArray.length > 0 ? variantsArray : [],
      relatedProductIds: Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0
        ? formData.relatedProducts.join(',')
        : null,
      crossSellProductIds: Array.isArray(formData.crossSellProducts) && formData.crossSellProducts.length > 0
        ? formData.crossSellProducts.join(',')
        : null,
    };

    // console.log('📤 PAYLOAD OPTIONS being sent:', payload.options);
    // console.log('📤 PAYLOAD ATTRIBUTES being sent:', payload.attributes);
    // console.log('📤 PAYLOAD VARIANTS being sent:', payload.variants);

// ============================================
// SECTION 22A - UPDATE EXISTING PRODUCT IMAGES (UPDATED)
// ============================================
setSubmitProgress({
  step: 'Updating product images...',
  percentage: 85,
});

try {
  // ✅ VALIDATION: Ensure at least one image has isMain: true
  const hasMainImage = formData.productImages.some((img) => img.isMain === true);
  
  if (!hasMainImage && formData.productImages.length > 0) {
    // ✅ Automatically set first image as main if none selected
    formData.productImages[0].isMain = true;
    toast.info('ℹ️ First image set as main image automatically');
  }

  // Filter images that need to be updated (existing images with IDs)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  const imagesToUpdate = formData.productImages.filter((img) => {
    // Only update images that have been saved (have valid GUID IDs)
    return guidRegex.test(img.id);
  });

  if (imagesToUpdate.length > 0) {
    console.log(`🖼️ Updating ${imagesToUpdate.length} product images...`);
    
    let updateSuccessCount = 0;
    let updateFailCount = 0;

    // ✅ Update each image using productsService
    for (const image of imagesToUpdate) {
      try {
        const updatePayload = {
          altText: image.altText?.trim() || '',
          sortOrder: image.sortOrder || 0,
          isMain: image.isMain || false,
        };

        console.log(`Updating image ${image.id}:`, updatePayload);

        const response = await productsService.updateProductImage(
          productId,
          image.id,
          updatePayload
        );

        if (response?.data?.success) {
          updateSuccessCount++;
          console.log(`✅ Image ${image.id} updated successfully`);
        } else {
          updateFailCount++;
          console.warn(`⚠️ Failed to update image ${image.id}:`, response?.data?.message);
        }
      } catch (imageError: any) {
        updateFailCount++;
        console.error(`❌ Error updating image ${image.id}:`, imageError);
        // Don't throw - continue updating other images
      }
    }

    // ✅ Show summary toast
    // if (updateSuccessCount > 0) {
    //   toast.success(`✅ ${updateSuccessCount} image(s) updated successfully!`, { 
    //     autoClose: 2000 
    //   });
    // }
    
    if (updateFailCount > 0) {
      toast.warning(`⚠️ ${updateFailCount} image(s) failed to update`, { 
        autoClose: 3000 
      });
    }
  } else {
    console.log('ℹ️ No existing images to update');
  }
} catch (error: any) {
  console.error('❌ Image update error:', error);
  toast.warning('⚠️ Some images may not have been updated');
  // Don't throw - continue with product update
}
    // ✅ PROGRESS: 90% - Updating Product
    setSubmitProgress({
      step: isDraft ? 'Saving draft...' : 'Updating product...',
      percentage: 90,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 23: FINAL SUBMISSION
    // ═══════════════════════════════════════════════════════════════════════

    console.log('🚀 API: Updating product...');
    const response = await productsService.update(productId, productData);

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.data) {
      const apiResponse = response.data;

      if (apiResponse.success === true || apiResponse.success === undefined) {
        // ✅ PROGRESS: 100% - Success
        setSubmitProgress({
          step: isDraft ? 'Draft saved successfully!' : 'Product updated successfully!',
          percentage: 100,
        });

        toast.success(
          isDraft ? '💾 Product saved as draft!' : '✅ Product updated successfully!',
          { autoClose: 3000 }
        );

        if (releaseLockAfter) {
          try {
            await productLockService.releaseLock(productId);
          } catch (lockError) {
            console.warn('⚠️ Failed to release lock:', lockError);
          }
        }

        setTimeout(() => {
          router.push('/admin/products');
        }, 1500);
      } else if (apiResponse.success === false) {
        throw new Error(apiResponse.message || 'Update failed');
      }
    } else {
      throw new Error('No response received from server');
    }

  } catch (error: any) {
    console.error('❌ Submission failed:', error);

    let errorMessage = 'Failed to update product';
    if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage, { autoClose: 10000 });
  } finally {
    target.removeAttribute('data-submitting');
    setIsSubmitting(false);
    setSubmitProgress(null);
  }
};



// ✅ PRODUCTION-LEVEL handleChange with ALL edge cases
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;

  // ================================
  // ✅ SECTION 1: PRICE FIELDS
  // ================================
  if (name === 'price' || name === 'oldPrice' || name === 'cost') {
    let cleanedValue = value.replace(/[^\d.]/g, '');
    
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (cleanedValue.startsWith('.')) {
      cleanedValue = '0' + cleanedValue;
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      cleanedValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    const numValue = parseFloat(cleanedValue);
    if (!isNaN(numValue) && numValue > 10000000) {
      toast.warning('⚠️ Price seems too high. Please verify.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanedValue
    }));
    return;
  }

  // ================================
  // ✅ SECTION 2: INTEGER FIELDS
  // ================================
  if (
    name === 'stockQuantity' ||
    name === 'minStockQuantity' ||
    name === 'notifyQuantityBelow' ||
    name === 'minCartQuantity' ||
    name === 'maxCartQuantity' ||
    name === 'displayOrder' ||
    name === 'recurringCycleLength' ||
    name === 'recurringTotalCycles' ||
    name === 'maxNumberOfDownloads' ||
    name === 'downloadExpirationDays' ||
    name === 'rentalPriceLength' ||
    name === 'packSize' ||
    name === 'standardDeliveryDays'
  ) {
    const cleanedValue = value.replace(/[^\d]/g, '');
    
    const finalValue = cleanedValue.length > 1 && cleanedValue.startsWith('0')
      ? cleanedValue.replace(/^0+/, '')
      : cleanedValue;
    
    const numValue = parseInt(finalValue);
    if (!isNaN(numValue) && numValue > 999999) {
      toast.warning('⚠️ Value seems too high. Please verify.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    return;
  }

  // ================================
  // ✅ SECTION 3: DECIMAL FIELDS
  // ================================
  if (
    name === 'weight' || 
    name === 'length' || 
    name === 'width' || 
    name === 'height' ||
    name === 'basepriceAmount' ||
    name === 'basepriceBaseAmount' ||
    name === 'subscriptionDiscountPercentage' ||
    name === 'groupBundleDiscountPercentage' ||
    name === 'groupBundleDiscountAmount' ||
    name === 'groupBundleSpecialPrice' ||
    name === 'sameDayDeliveryCharge' ||
    name === 'nextDayDeliveryCharge' ||
    name === 'standardDeliveryCharge'
  ) {
    let cleanedValue = value.replace(/[^\d.]/g, '');
    
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (cleanedValue.startsWith('.')) {
      cleanedValue = '0' + cleanedValue;
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      cleanedValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    if (name === 'subscriptionDiscountPercentage' || name === 'groupBundleDiscountPercentage') {
      const numValue = parseFloat(cleanedValue);
      if (!isNaN(numValue) && numValue > 100) {
        toast.warning('⚠️ Percentage cannot exceed 100%');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanedValue
    }));
    return;
  }

  // ================================
  // ✅ SECTION 4: SKU FIELD
  // ================================
  if (name === 'sku') {
    const cleanedValue = value
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '');
    
    const finalValue = cleanedValue.substring(0, 50);
    
    setFormData(prev => ({
      ...prev,
      sku: finalValue
    }));
    
    if (finalValue.length >= 2) {
      clearTimeout(seoTimer);
      seoTimer = setTimeout(() => {
        checkSkuExists(finalValue);
      }, 800);
    } else {
      setSkuError('');
    }
    return;
  }

  // ================================
  // ✅ SECTION 5: PRODUCT NAME
  // ================================
  if (name === "name") {
    const trimmedValue = value.substring(0, 150);
    
    setFormData(prev => ({ ...prev, name: trimmedValue }));

    clearTimeout(seoTimer);
    seoTimer = setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(trimmedValue)
      }));
    }, 1000);
    return;
  }

  // ================================
  // ✅ SECTION 6: SEO SLUG
  // ================================
  if (name === "searchEngineFriendlyPageName") {
    const formattedValue = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    setFormData(prev => ({ 
      ...prev, 
      searchEngineFriendlyPageName: formattedValue 
    }));
    return;
  }

  // ================================
  // ✅ SECTION 7: META TITLE
  // ================================
  if (name === "metaTitle") {
    const trimmedValue = value.substring(0, 100);
    
    setFormData(prev => ({ ...prev, metaTitle: trimmedValue }));
    
    if (trimmedValue.length > 60) {
      toast.info('ℹ️ Meta title is longer than recommended (60 chars)');
    }
    return;
  }

  // ================================
  // ✅ SECTION 8: META DESCRIPTION
  // ================================
  if (name === "metaDescription") {
    const trimmedValue = value.substring(0, 200);
    
    setFormData(prev => ({ ...prev, metaDescription: trimmedValue }));
    
    if (trimmedValue.length > 160) {
      toast.info('ℹ️ Meta description is longer than recommended (160 chars)');
    }
    return;
  }

  // ================================
  // ✅ SECTION 9: SHORT DESCRIPTION
  // ================================
  if (name === "shortDescription") {
    const plainText = value.replace(/<[^>]*>/g, '');
    
    if (plainText.length > 350) {
      toast.warning('⚠️ Short description cannot exceed 350 characters');
      return;
    }
    
    setFormData(prev => ({ ...prev, shortDescription: value }));
    return;
  }

  // ================================
  // ✅ SECTION 10: FULL DESCRIPTION
  // ================================
  if (name === "fullDescription") {
    const plainText = value.replace(/<[^>]*>/g, '');
    
    if (plainText.length > 2000) {
      toast.warning('⚠️ Full description cannot exceed 2000 characters');
      return;
    }
    
    setFormData(prev => ({ ...prev, fullDescription: value }));
    return;
  }


// ================================
// ✅ SECTION 11: PRODUCT TYPE (WITH SUBSCRIPTION CLEARING)
// ================================
if (name === "productType") {
  if (value === 'grouped') {
    setIsGroupedModalOpen(true);
  }
  
  setFormData(prev => ({
    ...prev,
    productType: value,
    
    // ✅ CLEAR GROUPED FIELDS when switching to simple
    ...(value === 'simple' && {
      requireOtherProducts: false,
      requiredProductIds: '',
      automaticallyAddProducts: false,
      groupBundleDiscountType: 'None',
      groupBundleDiscountPercentage: 0,
      groupBundleDiscountAmount: 0,
      groupBundleSpecialPrice: 0,
      groupBundleSavingsMessage: ''
    }),
    
    // ✅ NEW: CLEAR SUBSCRIPTION FIELDS when switching to grouped
    ...(value === 'grouped' && {
      requireOtherProducts: true,
      
      // ❌ Clear all subscription/recurring fields
      isRecurring: false,
      recurringCycleLength: "",
      recurringCyclePeriod: "days",
      recurringTotalCycles: "",
      subscriptionDiscountPercentage: "",
      allowedSubscriptionFrequencies: "",
      subscriptionDescription: ""
    })
  }));
  
  if (value === 'simple') {
    setSelectedGroupedProducts([]);
  }
  
  // ✅ Show warning when switching to grouped with existing subscription
  if (value === 'grouped' && formData.isRecurring) {
    toast.warning('⚠️ Subscription settings cleared for grouped product', {
      autoClose: 4000
    });
  }
  
  return;
}


  // ================================
  // ✅ SECTION 12: REQUIRE OTHER PRODUCTS (FIXED)
  // ================================
  if (name === "requireOtherProducts") {
    setFormData(prev => ({
      ...prev,
      requireOtherProducts: checked,
      ...(!checked && {
        requiredProductIds: '',
        automaticallyAddProducts: false,
        groupBundleDiscountType: 'None',
        groupBundleDiscountPercentage: 0,
        groupBundleDiscountAmount: 0,
        groupBundleSpecialPrice: 0,
        groupBundleSavingsMessage: ''
      })
    }));
    
    if (!checked) {
      setSelectedGroupedProducts([]);
    }
    return;
  }

  // ================================
  // ✅ SECTION 13: SHIPPING ENABLED
  // ================================
  if (name === "isShipEnabled") {
    setFormData(prev => ({
      ...prev,
      isShipEnabled: checked,  
      shipSeparately: checked ? prev.shipSeparately : false,
      weight: checked ? prev.weight : "",
      length: checked ? prev.length : "",
      width: checked ? prev.width : "",
      height: checked ? prev.height : "",
      deliveryDateId: checked ? prev.deliveryDateId : "",
      sameDayDeliveryEnabled: checked ? prev.sameDayDeliveryEnabled : false,
      nextDayDeliveryEnabled: checked ? prev.nextDayDeliveryEnabled : false,
      standardDeliveryEnabled: checked ? prev.standardDeliveryEnabled : true
    }));
    return;
  }

  // ================================
  // ✅ SECTION 14: MANAGE INVENTORY
  // ================================
  if (name === "manageInventory") {
    setFormData(prev => ({
      ...prev,
      manageInventory: value,
      ...(value === 'dont-track' && {
        stockQuantity: '0',
        minStockQuantity: '0',
        notifyAdminForQuantityBelow: false,
        notifyQuantityBelow: '1',
        allowBackorder: false,
        backorderMode: 'no-backorders'
      })
    }));
    return;
  }


// ================================
// ✅ SECTION 15: IS RECURRING (WITH GROUPED VALIDATION)
// ================================
if (name === "isRecurring") {
  // ❌ BLOCK: Cannot enable subscription for grouped products
  if (checked && formData.productType === 'grouped') {
    toast.error('❌ Subscription is not available for grouped products', {
      autoClose: 5000,
      position: 'top-center'
    });
    return; // Prevent enabling
  }

  setFormData(prev => ({
    ...prev,
    isRecurring: checked,
    ...(!checked && {
      recurringCycleLength: "",
      recurringCyclePeriod: "days",
      recurringTotalCycles: "",
      subscriptionDiscountPercentage: "",
      allowedSubscriptionFrequencies: "",
      subscriptionDescription: ""
    })
  }));
  return;
}


  // ================================
  // ✅ SECTION 16: IS PACK
  // ================================
  if (name === "isPack") {
    setFormData(prev => ({
      ...prev,
      isPack: checked,
      packSize: checked ? prev.packSize : ""
    }));
    return;
  }

  // ================================
  // ✅ SECTION 17: MARK AS NEW
  // ================================
  if (name === "markAsNew") {
    setFormData(prev => ({
      ...prev,
      markAsNew: checked,
      markAsNewStartDate: checked ? prev.markAsNewStartDate : "",
      markAsNewEndDate: checked ? prev.markAsNewEndDate : ""
    }));
    return;
  }

  // ================================
  // ✅ SECTION 18: BASE PRICE ENABLED
  // ================================
  if (name === "basepriceEnabled") {
    setFormData(prev => ({
      ...prev,
      basepriceEnabled: checked,
      ...(!checked && {
        basepriceAmount: "",
        basepriceUnit: "",
        basepriceBaseAmount: "",
        basepriceBaseUnit: ""
      })
    }));
    return;
  }

  // ================================
  // ✅ SECTION 19: NOTIFY ADMIN
  // ================================
  if (name === "notifyAdminForQuantityBelow") {
    setFormData(prev => ({
      ...prev,
      notifyAdminForQuantityBelow: checked,
      notifyQuantityBelow: checked ? prev.notifyQuantityBelow : "1"
    }));
    return;
  }

  // ================================
  // ✅ SECTION 20: ALLOW BACKORDER
  // ================================
  if (name === "allowBackorder") {
    setFormData(prev => ({
      ...prev,
      allowBackorder: checked,
      backorderMode: checked ? "allow-qty-below-zero" : "no-backorders"
    }));
    return;
  }

  // ================================
  // ✅ SECTION 21: AVAILABLE FOR PRE-ORDER
  // ================================
  if (name === "availableForPreOrder") {
    setFormData(prev => ({
      ...prev,
      availableForPreOrder: checked,
      preOrderAvailabilityStartDate: checked ? prev.preOrderAvailabilityStartDate : ""
    }));
    return;
  }

  // ================================
  // ✅ SECTION 22: IS GIFT CARD
  // ================================
  if (name === "isGiftCard") {
    setFormData(prev => ({
      ...prev,
      isGiftCard: checked,
      ...(!checked && {
        giftCardType: "virtual",
        overriddenGiftCardAmount: ""
      })
    }));
    return;
  }

  // ================================
  // ✅ SECTION 23: IS DOWNLOAD
  // ================================
  if (name === "isDownload") {
    setFormData(prev => ({
      ...prev,
      isDownload: checked,
      ...(!checked && {
        downloadId: "",
        unlimitedDownloads: true,
        maxNumberOfDownloads: "",
        downloadExpirationDays: "",
        downloadActivationType: "when-order-is-paid",
        hasUserAgreement: false,
        userAgreementText: "",
        hasSampleDownload: false,
        sampleDownloadId: ""
      })
    }));
    return;
  }

  // ================================
  // ✅ SECTION 24: IS RENTAL
  // ================================
  if (name === "isRental") {
    setFormData(prev => ({
      ...prev,
      isRental: checked,
      ...(!checked && {
        rentalPriceLength: "",
        rentalPricePeriod: "days"
      })
    }));
    return;
  }

  // ================================
  // ✅ SECTION 25: HAS USER AGREEMENT
  // ================================
  if (name === "hasUserAgreement") {
    setFormData(prev => ({
      ...prev,
      hasUserAgreement: checked,
      userAgreementText: checked ? prev.userAgreementText : ""
    }));
    return;
  }

  // ================================
  // ✅ SECTION 26: HAS SAMPLE DOWNLOAD
  // ================================
  if (name === "hasSampleDownload") {
    setFormData(prev => ({
      ...prev,
      hasSampleDownload: checked,
      sampleDownloadId: checked ? prev.sampleDownloadId : ""
    }));
    return;
  }

  // ================================
  // ✅ SECTION 27: UNLIMITED DOWNLOADS
  // ================================
  if (name === "unlimitedDownloads") {
    setFormData(prev => ({
      ...prev,
      unlimitedDownloads: checked,
      maxNumberOfDownloads: checked ? "" : prev.maxNumberOfDownloads
    }));
    return;
  }

// ================================
// ✅ SECTION 28A: SHOW ON HOMEPAGE (Keep as string in state, convert in payload)
// ================================
if (name === 'showOnHomepage') {
  // Keep current value before update
  const currentDisplayOrder = parseInt(formData.displayOrder as any) || 0;
  
  // Update state (keep as string for consistency with input)
  setFormData(prev => ({
    ...prev,
    showOnHomepage: checked,
    displayOrder: checked ? prev.displayOrder : "0"  // Keep as string
  }));
  
  // User feedback
  if (checked) {
    toast.success("✅ Product added to homepage!");
  } else {
    if (currentDisplayOrder > 0) {
      toast.info("📌 Product removed from homepage. Display order reset to 0.");
    } else {
      toast.info("📌 Product removed from homepage.");
    }
  }
  
  return;
}



  // ================================
  // ✅ SECTION 28: GENERIC CHECKBOXES
  // ================================
  if (type === "checkbox") {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
    return;
  }

  // ================================
  // ✅ SECTION 29: DEFAULT
  // ================================
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};




// ============================================
// 🔥 FULL IMPLEMENTATION
// ============================================

// ============================================
// 🚀 FINAL WORKING CODE (TypeScript Fixed)
// ============================================

// DELETE VARIANT - PRODUCTION READY
const deleteProductVariant = async (productId: string, variantId: string) => {
  const previousVariants = [...productVariants];
  const variantName = productVariants.find(v => v.id === variantId)?.name || 'Variant';
  
  try {
    console.log("🗑️ Deleting variant:", variantId);
    
    // Optimistic delete - Remove from UI immediately
    setProductVariants(prev => prev.filter(v => v.id !== variantId));
    toast.info(`Deleting ${variantName}...`, { autoClose: 1000 });
    
    // API call
    const response = await productsService.deleteVariant(productId, variantId);
    
    // ✅ Success with 200/204
    if (response?.data?.success === true || 
        response?.status === 200 || 
        response?.status === 204) {
      toast.success(`${variantName} deleted successfully!`);
      return;
    }
    
    // ✅ 404 with success: false is STILL success for delete
    if (response?.status === 404) {
      console.log("✅ Item already deleted (404)");
      toast.success(`${variantName} removed successfully!`);
      return;
    }
    
  } catch (error: any) {
    const statusCode = error?.response?.status;
    const errorMsg = error?.response?.data?.message;
    
    console.error("❌ Delete variant error:", { statusCode, errorMsg });
    
    // ✅ 404 = Success (item not found = deletion goal achieved)
    if (statusCode === 404) {
      console.log("✅ Variant not found (404) - treating as success");
      toast.success(`${variantName} removed successfully!`);
      return; // Don't rollback
    }
    
    // ❌ Real errors - rollback
    console.error("❌ Rolling back variant deletion");
    setProductVariants(previousVariants);
    
    // User-friendly error messages
    if (statusCode === 403) {
      toast.error("❌ Permission denied. Cannot delete variant.");
    } else if (statusCode === 500) {
      toast.error("❌ Server error. Please try again.");
    } else if (statusCode === 409) {
      toast.error("❌ Variant is in use. Cannot delete.");
    } else {
      toast.error(errorMsg || `Failed to delete ${variantName}`);
    }
  }
};

// DELETE ATTRIBUTE - PRODUCTION READY
const deleteProductAttribute = async (productId: string, attributeId: string) => {
  const previousAttributes = [...productAttributes];
  const attribute = productAttributes.find(a => a.id === attributeId);
  const attrName = attribute?.name || 'Attribute';
  
  try {
    console.log("🗑️ Deleting attribute:", attributeId);
    
    // Optimistic delete - Remove from UI immediately
    setProductAttributes(prev => prev.filter(attr => attr.id !== attributeId));
    toast.info(`Deleting ${attrName}...`, { autoClose: 1000 });
    
    // API call
    const response = await productsService.deleteAttribute(productId, attributeId);
    
    // ✅ Success with 200/204
    if (response?.data?.success === true || 
        response?.status === 200 || 
        response?.status === 204) {
      toast.success(`${attrName} deleted successfully!`);
      return;
    }
    
    // ✅ 404 with success: false is STILL success for delete
    if (response?.status === 404) {
      console.log("✅ Item already deleted (404)");
      toast.success(`${attrName} removed successfully!`);
      return;
    }
    
  } catch (error: any) {
    const statusCode = error?.response?.status;
    const errorMsg = error?.response?.data?.message;
    
    console.error("❌ Delete attribute error:", { statusCode, errorMsg });
    
    // ✅ 404 = Success (item not found = deletion goal achieved)
    if (statusCode === 404) {
      console.log("✅ Attribute not found (404) - treating as success");
      toast.success(`${attrName} removed successfully!`);
      return; // Don't rollback
    }
    
    // ❌ Real errors - rollback
    console.error("❌ Rolling back attribute deletion");
    setProductAttributes(previousAttributes);
    
    // User-friendly error messages
    if (statusCode === 403) {
      toast.error("❌ Permission denied. Cannot delete attribute.");
    } else if (statusCode === 500) {
      toast.error("❌ Server error. Please try again.");
    } else if (statusCode === 409) {
      toast.error("❌ Attribute is in use. Cannot delete.");
    } else {
      toast.error(errorMsg || `Failed to delete ${attrName}`);
    }
  }
};

// Updated Remove Handlers
const removeProductAttribute = (id: string) => {
  if (confirm("Are you sure you want to delete this attribute?")) {
    deleteProductAttribute(productId, id);
  }
};










// Slug generator for SEO-friendly names
const generateSeoName = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/[^a-z0-9\-]/g, "") // remove special characters
    .replace(/--+/g, "-")        // remove multiple hyphens
    .replace(/^-+|-+$/g, "");    // trim hyphens
};





// ✅ ADD: New handler function
const handleGroupedProductsChange = (selectedOptions: any) => {
  const selectedIds = selectedOptions.map((option: any) => option.value);
  setSelectedGroupedProducts(selectedIds);
  
  // Update formData with comma-separated IDs
  setFormData(prev => ({
    ...prev,
    requiredProductIds: selectedIds.join(',')
  }));
};

  // All existing methods remain same...
  const addRelatedProduct = (productId: string) => {
    if (!formData.relatedProducts.includes(productId)) {
      setFormData({
        ...formData,
        relatedProducts: [...formData.relatedProducts, productId]
      });
    }
    setSearchTerm('');
  };

  const removeRelatedProduct = (productId: string) => {
    setFormData({
      ...formData,
      relatedProducts: formData.relatedProducts.filter(id => id !== productId)
    });
  };

  const addCrossSellProduct = (productId: string) => {
    if (!formData.crossSellProducts.includes(productId)) {
      setFormData({
        ...formData,
        crossSellProducts: [...formData.crossSellProducts, productId]
      });
    }
    setSearchTermCross('');
  };

  const removeCrossSellProduct = (productId: string) => {
    setFormData({
      ...formData,
      crossSellProducts: formData.crossSellProducts.filter(id => id !== productId)
    });
  };

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProductsCross = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTermCross.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTermCross.toLowerCase())
  );

// Product Attribute handlers (matching backend ProductAttributeCreateDto)
const addProductAttribute = () => {
  const newAttr: ProductAttribute = {
    id: Date.now().toString(),
    name: '',
    value: '',
    displayOrder: productAttributes.length + 1
  };
  setProductAttributes([...productAttributes, newAttr]);
};

const updateProductAttribute = (id: string, field: keyof ProductAttribute, value: any) => {
  setProductAttributes(productAttributes.map(attr =>
    attr.id === id ? { ...attr, [field]: value } : attr
  ));
};
























// ✅ REPLACE existing handleImageUpload function:
const ALLOWED_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/jpg"
];

// ✅ REPLACE existing handleImageUpload function:



const MAX_SIZE = 500 * 1024;     // 500 KB hard limit
const WARN_SIZE = 300 * 1024;    // 300 KB recommended
const MIN_IMAGES = 5;
const MAX_IMAGES = 10;

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // ✅ Product name required
  if (!formData.name.trim()) {
    toast.error("Please enter product name before uploading images");
    return;
  }
// ============================================
// SECTION 21B - IMAGE MAIN VALIDATION
// ============================================

// ✅ Ensure at least one image is marked as main
if (formData.productImages && formData.productImages.length > 0) {
  const hasMainImage = formData.productImages.some((img) => img.isMain === true);
  
  if (!hasMainImage) {
    // Automatically set first image as main
    formData.productImages[0].isMain = true;
    toast.info('ℹ️ First image automatically set as main image', { autoClose: 3000 });
  }

  // ✅ Ensure only ONE image is marked as main
  let mainImageCount = 0;
  let lastMainIndex = -1;

  formData.productImages.forEach((img, index) => {
    if (img.isMain) {
      mainImageCount++;
      lastMainIndex = index;
    }
  });

  if (mainImageCount > 1) {
    // Reset all and set only the last selected one as main
    formData.productImages.forEach((img, index) => {
      img.isMain = index === lastMainIndex;
    });
    toast.warning('⚠️ Only one image can be main. Last selected image set as main.', { 
      autoClose: 4000 
    });
  }
}

  // ✅ Max images validation
  if (formData.productImages.length + files.length > MAX_IMAGES) {
    toast.error(
      `Maximum ${MAX_IMAGES} images allowed. You can add ${
        MAX_IMAGES - formData.productImages.length
      } more.`
    );
    return;
  }

  // ✅ MIN 5 images validation (CORRECT PLACE)
  const totalAfterUpload =
    formData.productImages.length + files.length;

  // if (totalAfterUpload < MIN_IMAGES) {
  //   toast.error(`❌ Minimum ${MIN_IMAGES} images are required for a product`);
  //   return;
  // }

  const validatedFiles: File[] = [];

  for (const file of Array.from(files)) {
    /* ================= FORMAT & MIME ================= */
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`❌ ${file.name}: Only WebP or JPG images allowed`);
      continue;
    }

    /* ================= FILE SIZE ================= */
    if (file.size > MAX_SIZE) {
      toast.error(`❌ ${file.name}: Image size must be under 500 KB`);
      continue;
    }

    if (file.size > WARN_SIZE) {
      toast.warning(`⚠️ ${file.name}: Image is large, may affect page speed`);
    }

    /* ================= DIMENSION & RATIO ================= */
    const isValidImage = await new Promise<boolean>((resolve) => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(img.src);

        const ratio = img.width / img.height;
        if (Math.abs(ratio - 1) > 0.1) {
          toast.warning(
            `⚠️ ${file.name}: Square (1:1) images are recommended`
          );
        }

        resolve(true);
      };

      img.onerror = () => {
        toast.error(`❌ ${file.name}: Invalid image file`);
        resolve(false);
      };
    });

    if (!isValidImage) continue;

    /* ================= DUPLICATE CHECK ================= */
    const alreadyExists = formData.productImages.some(
      (img) => img.fileName === file.name
    );

    if (alreadyExists) {
      toast.warning(`⚠️ ${file.name}: Image already added`);
      continue;
    }

    validatedFiles.push(file);
  }

  if (validatedFiles.length === 0) return;

  setUploadingImages(true);

  try {
    const uploadedImages = await uploadImagesToProductDirect(
      productId,
      validatedFiles
    );

    const newImages = uploadedImages.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
      sortOrder: img.sortOrder,
      isMain: img.isMain,
      fileName: img.imageUrl.split("/").pop() || "",
      fileSize: 0,
      file: undefined,
    }));

    setFormData((prev) => ({
      ...prev,
      productImages: [...prev.productImages, ...newImages],
    }));

    toast.success(
      `✅ ${uploadedImages.length} image(s) uploaded successfully`
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  } catch (error) {
    console.error("Image upload failed", error);
    toast.error("Failed to upload images. Please try again.");
  } finally {
    setUploadingImages(false);
  }
};




// ✅ REPLACE existing removeImage function with this:
const removeImage = async (imageId: string) => {
  const imageToRemove = formData.productImages.find(img => img.id === imageId);
  if (!imageToRemove) return;

  // If it's a blob URL (newly uploaded), just remove from state
  if (imageToRemove.imageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageToRemove.imageUrl);
    setFormData({
      ...formData,
      productImages: formData.productImages.filter(img => img.id !== imageId)
    });
    return;
  }

  // If it's an existing image from database, call delete API
  setIsDeletingImage(true);
  
  try {
    const token = localStorage.getItem('authToken');
    
    const deleteResponse = await fetch(
      `${API_BASE_URL}/api/Products/images/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      }
    );

    if (deleteResponse.ok) {
      toast.success('Image deleted successfully! 🗑️');
      setFormData({
        ...formData,
        productImages: formData.productImages.filter(img => img.id !== imageId)
      });
    } else {
      const errorData = await deleteResponse.json().catch(() => ({ message: 'Failed to delete image' }));
      throw new Error(errorData.message || 'Failed to delete image');
    }

  } catch (error: any) {
    console.error('Error deleting image:', error);
    toast.error(`Failed to delete image: ${error.message}`);
  } finally {
    setIsDeletingImage(false);
  }
};
// ✅ ADD this new function:
const uploadImagesToProductDirect = async (
  productId: string,
  files: File[]
): Promise<ProductImage[]> => {

  /* =======================
     BASIC VALIDATIONS
  ======================= */

  if (!productId) {
    toast.error('❌ Invalid product ID');
    return [];
  }

  if (!Array.isArray(files) || files.length === 0) {
    toast.warning('⚠️ No files selected');
    return [];
  }

  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('❌ Authentication required');
    return [];
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_IMAGES = 10;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const uploadPromises = files.map(async (file, index) => {
    try {
      /* =======================
         FILE VALIDATIONS
      ======================= */

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.warning(`⚠️ ${file.name} format not supported`);
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.warning(`⚠️ ${file.name} exceeds 5MB`);
        return null;
      }

      if (formData.productImages.length + index >= MAX_IMAGES) {
        toast.warning(`⚠️ Maximum ${MAX_IMAGES} images allowed`);
        return null;
      }

      /* =======================
         FORM DATA
      ======================= */

      const uploadFormData = new FormData();
      uploadFormData.append('images', file);
      uploadFormData.append(
        'altText',
        file.name.replace(/\.[^/.]+$/, '')
      );
      uploadFormData.append(
        'sortOrder',
        (formData.productImages.length + index + 1).toString()
      );
      uploadFormData.append(
        'isMain',
        (formData.productImages.length === 0 && index === 0).toString()
      );

      /* =======================
         API REQUEST
      ======================= */

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/Products/${productId}/images?name=${encodeURIComponent(
          formData.name
        )}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // ❌ Do not set Content-Type
          },
          body: uploadFormData,
        }
      );

      if (!uploadResponse.ok) {
        let errorMessage = `Upload failed (HTTP ${uploadResponse.status})`;

        try {
          const errorJson = await uploadResponse.json();
          errorMessage = errorJson.message || errorMessage;
        } catch {
          const errorText = await uploadResponse.text();
          if (errorText) errorMessage = errorText.substring(0, 200);
        }

        throw new Error(errorMessage);
      }

      const result = await uploadResponse.json();

      if (!result?.success || !result.data) {
        throw new Error('Invalid server response');
      }

      return Array.isArray(result.data)
        ? result.data[0]
        : result.data;

    } catch (error: any) {
      console.error(`❌ Error uploading ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  });

  /* =======================
     FINAL RESULT
  ======================= */

  const results = await Promise.all(uploadPromises);
  return results.filter(Boolean) as ProductImage[];
};


// Add this before your main JSX return
// if (loading) {
//   return (
//     <div className="flex items-center justify-center min-h-screen bg-slate-950">
//       <div className="text-center">
//         <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
//         <p className="text-slate-400 text-lg">Loading product data...</p>
//       </div>
//     </div>
//   );
// }

  return (
    <div className="space-y-2">
{/* ✅ HEADER SECTION - Updated */}
<div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    
    {/* ========== LEFT SIDE - Title + Product Name ========== */}
    <div className="flex items-center gap-4">
      {/* ========== BACK BUTTON ========== */}
<Link 
  href="/admin/products"
  onClick={(e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      handleNavigateAway('/admin/products');
    }
  }}
>
  <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
    <ArrowLeft className="h-5 w-5" />
  </button>
</Link>
      
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Edit Product
          </h1>
          
          {/* ✅ PRODUCT NAME - Inline Display */}
          {formData.name && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600">•</span>
              <span className="text-lg font-semibold text-white truncate max-w-xs" title={formData.name}>
                {formData.name}
              </span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-slate-400 mt-1">
          {isSubmitting 
            ? submitProgress?.step || 'Processing...' 
            : 'Update your product details'
          }
        </p>
      </div>
    </div>

    {/* ========== RIGHT SIDE - Action Buttons ========== */}
    <div className="flex items-center gap-3">
      
      {/* ✅ SAVE AS DRAFT BUTTON */}
      <button
        type="button"
        onClick={(e) => handleSubmit(e, true)}
        disabled={isSubmitting}
        className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-2 h-2 border border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            <span>Save as Draft</span>
          </>
        )}
      </button>

{/* ✅ ULTRA COMPACT - Minimal */}
{takeoverRequest && takeoverTimeLeft > 0 && (
  <button
    type="button"
    onClick={() => setIsTakeoverModalOpen(true)}
    className="relative px-2.5 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all group"
    title={`Request from ${takeoverRequest.requestedByEmail}`}
  >
    <div className="flex items-center gap-1.5">
      <Bell className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
      <span className="text-xs font-mono font-bold text-blue-400">
        {Math.floor(takeoverTimeLeft / 60)}:{String(takeoverTimeLeft % 60).padStart(2, '0')}
      </span>
    </div>
    
    {/* Pulse Indicator */}
    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>
    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
  </button>
)}




   
{/* ========== CANCEL BUTTON ========== */}
<button
  type="button"
  onClick={() => handleNavigateAway('/admin/products')}
  disabled={isSubmitting}
  className="px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800"
>
  Cancel
</button>

      {/* ✅ UPDATE BUTTON */}
      <button
        type="button"
        onClick={(e) => handleSubmit(e, false)}
        disabled={isSubmitting}
        className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all text-sm flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Updating...</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>Update Product</span>
          </>
        )}

        {/* Progress Bar Overlay */}
        {isSubmitting && submitProgress && (
          <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-500"
            style={{ width: `${submitProgress.percentage}%` }}
          ></div>
        )}
      </button>
    </div>
  </div>

  {/* ✅ PROGRESS BAR BELOW HEADER */}
  {isSubmitting && submitProgress && (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">
          {submitProgress.step}
        </span>
        <span className="text-xs font-mono text-violet-400">
          {submitProgress.percentage}%
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-violet-500 via-cyan-500 to-pink-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${submitProgress.percentage}%` }}
        ></div>
      </div>
    </div>
  )}
</div>




      {/* Main Content */}
      <div className="w-full">
        {/* Missing Fields Badge (in header) */}
{missingFields.length > 0 && (
  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
    <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    <span className="text-xs font-medium text-orange-400">
      {missingFields.length} field{missingFields.length !== 1 ? 's' : ''} required
    </span>
  </div>
)}

        {/* Main Form */}
        <div className="w-full">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
            <Tabs defaultValue="product-info" className="w-full">
              <div className="border-b border-slate-800 mb-3">
                <TabsList className="flex gap-1 overflow-x-auto pb-px scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent bg-transparent h-auto p-0">
                  <TabsTrigger value="product-info" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Info className="h-4 w-4" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="prices" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <PoundSterling className="h-4 w-4" />
                    Prices
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Package className="h-4 w-4" />
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Truck className="h-4 w-4" />
                    Shipping
                  </TabsTrigger>
                  <TabsTrigger value="related-products" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <LinkIcon className="h-4 w-4" />
                    Related
                  </TabsTrigger>
                   <TabsTrigger value="product-attributes" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Tag className="h-4 w-4" />
                    Attributes
                  </TabsTrigger>
                  <TabsTrigger value="variants" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Package className="h-4 w-4" />
                    Variants
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Globe className="h-4 w-4" />
                    SEO
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
  <Image className="h-4 w-4" />
  Media
</TabsTrigger>
                
                </TabsList>
              </div>

{/* Product Info Tab */}
<TabsContent value="product-info" className="space-y-2 mt-2">
  {/* Basic Info Section */}
  
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Basic Info</h3>

    <div className="grid gap-4">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
  type="text"
  name="name"
  value={formData.name}
  onChange={handleChange}
  placeholder="Enter product name"
  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
  required
  minLength={3}
  maxLength={150}
  pattern="^[A-Za-z0-9\s\-.,()'/]+$"
  title="Product name must be 3–150 characters and cannot contain emojis or special characters like @, #, $, %."
/>

      </div>

<div className="space-y-4">

  {/* ================= SHORT DESCRIPTION ================= */}
  <div>
    <ProductDescriptionEditor
      label="Short Description"
      value={formData.shortDescription}
      onChange={(content) => {
        setFormData((prev) => ({
          ...prev,
          shortDescription: content,
        }));
      }}
      placeholder="Enter product short description..."
      height={250}
      minLength={10}           // ✅ Minimum 10 characters
      maxLength={350}          // ✅ Maximum 350 characters
      showCharCount={true}     // ✅ Show built-in character counter
      showHelpText="Brief description visible in product listings (10-350 characters)"
    />
  </div>

  {/* ================= FULL DESCRIPTION ================= */}
  <div>
    <ProductDescriptionEditor
      label="Full Description"
      value={formData.fullDescription}
      onChange={(content) => {
        setFormData((prev) => ({
          ...prev,
          fullDescription: content,
        }));
      }}
      placeholder="Enter detailed product description..."
      height={400}
      required={true}          // ✅ Shows red asterisk
      minLength={50}           // ✅ Minimum 50 characters
      maxLength={2000}         // ✅ Maximum 2000 characters
      showCharCount={true}     // ✅ Show built-in character counter
      showHelpText="Detailed product information with formatting (50-2000 characters)"
    />
  </div>

</div>


 

      {/* ✅ Row 1: SKU, Brand, Categories (3 Columns) */}
      <div className="grid md:grid-cols-3 gap-4">
<div>
<label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
  {/* LEFT: Label + Required */}
  <div className="flex items-center gap-1">
    <span>SKU (Stock Keeping Unit)</span>
    <span className="text-red-500">*</span>
  </div>

  {/* RIGHT: Character Count */}
  {!skuError && (
    <span className="text-xs text-slate-500">
      ({formData.sku.length}/30)
    </span>
  )}
</label>

  
  <div className="relative">
    <input
      type="text"
      name="sku"
      value={formData.sku}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // ✅ Auto-uppercase and remove invalid characters (spaces, special chars)
        const sanitized = input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
        setFormData({ ...formData, sku: sanitized });
        
        // Clear error on typing
        if (skuError) setSkuError('');
      }}
      onBlur={() => {
        // ✅ Validate on blur
        if (formData.sku && formData.sku.length >= 3) {
          checkSkuExists(formData.sku);
        } else if (formData.sku && formData.sku.length > 0 && formData.sku.length < 3) {
          setSkuError('SKU must be at least 3 characters');
        }
      }}
      placeholder="641256412 or PROD-001"
      maxLength={30}
      className={`w-full px-3 py-2.5 pr-10 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 focus:ring-2 transition-all uppercase font-mono ${
        skuError 
          ? 'border-red-500 focus:ring-red-500' 
          : formData.sku && !checkingSku && formData.sku.length >= 3
            ? 'border-green-500 focus:ring-green-500' 
            : 'border-slate-700 focus:ring-violet-500'
      }`}
      required
    />
    
    {/* Status Icons - Same as before */}
    {checkingSku && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="animate-spin h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )}
    
    {!checkingSku && skuError && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
    )}
    
    {!checkingSku && !skuError && formData.sku && formData.sku.length >= 3 && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    )}
  </div>
  
  {/* Error Message */}
  {skuError && (
    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
      <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p className="text-xs text-red-400">{skuError}</p>
    </div>
  )}
  
  {/* ✅ Updated Examples - Shows all formats */}
 
</div>





{/* ✅ Multiple Brands Selector - EDIT PAGE */}

<div>
<label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
  {/* LEFT: Label + Required */}
  <div className="flex items-center gap-1">
    <span>Brands</span>
    <span className="text-red-500">*</span>
  </div>

  {/* RIGHT: Available count */}
  <span className="text-xs text-emerald-400 font-normal">
    {dropdownsData.brands.length} available
  </span>
</label>

<MultiBrandSelector 
  selectedBrands={formData.brandIds}
  availableBrands={dropdownsData.brands}
  onChange={(brandIds: string[]) => {
    setFormData(prev => ({ 
      ...prev, 
      brandIds: brandIds,
      brand: brandIds[0] || ''
    }));
  }}
  placeholder="Select one brand..."
  maxSelection={1} // ✅ Only 1 brand allowed
/>

  {/* <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
    <span>★</span>
    <span>First selected brand will be the primary brand</span>
  </p> */}
</div>


{/* ==================== CATEGORIES ==================== */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span className="flex items-center gap-2">
      Categories  <span className="text-red-500">*</span>
      
    </span>
    <span className="text-xs text-emerald-400 font-normal">
      {formData.categoryIds.length} selected
    </span>
  </label>
  
  <MultiCategorySelector
    selectedCategories={formData.categoryIds}
    availableCategories={dropdownsData.categories}
    onChange={(categoryIds: any) => {
      console.log('📝 Categories changed:', categoryIds);
      setFormData(prev => ({
        ...prev,
        categoryIds
      }));
    }}
    maxSelection={10}
    placeholder="Click to select categories..."
  />
  
  {/* Validation Message */}
  {formData.categoryIds.length === 0 && (
    <p className="mt-2 text-xs text-red-400">
      * Please select at least one category
    </p>
  )}
  
 
 
</div>


      </div>

      {/* ✅ Row 2: Product Type & Product Tags (2 Columns) */}
<div className="grid md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">Product Type</label>
    
    <div className="flex items-center gap-2">
      {/* Select Dropdown */}
      <select
        name="productType"
        value={formData.productType}
        onChange={handleChange}
        className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      >
        <option value="simple">Simple Product</option>
        <option value="grouped">Grouped Product</option>
      </select>

{/* ✅ Merged Linked Count + Settings Button (Edit Page Style) */}
{formData.productType === "grouped" && (
  <button
    type="button"
    onClick={() => setIsGroupedModalOpen(true)}
    title="Edit grouped product configuration"
    className="flex items-center gap-2 px-3 py-2.5
               bg-violet-500/10 hover:bg-violet-500/20
               border border-violet-500/30 hover:border-violet-500/50
               text-violet-400 rounded-xl transition-all"
  >
    {/* Linked Count */}
    {selectedGroupedProducts.length > 0 && (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
        <span className="text-xs font-medium text-violet-300">
          {selectedGroupedProducts.length} linked
        </span>
      </div>
    )}

    {/* Divider */}
    <span className="h-4 w-px bg-violet-500/30" />

    {/* Settings Icon */}
    <Settings className="w-5 h-5" />
  </button>
)}

    </div>
  </div>

  {/* Product Tags */}
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Product Tags <span className="text-xs text-slate-500 font-normal">(Comma-separated)</span>
    </label>
    <input
      type="text"
      name="productTags"
      value={formData.productTags}
      onChange={handleChange}
      placeholder="tag1, tag2, tag3"
      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
    />
  </div>
</div>



      {/* ✅ Row 3: GTIN & Manufacturer Part Number (2 Columns) */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">GTIN</label>
          <input
            type="text"
            name="gtin"
            value={formData.gtin}
            onChange={handleChange}
            placeholder="Global Trade Item Number"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Manufacturer Part Number</label>
          <input
            type="text"
            name="manufacturerPartNumber"
            value={formData.manufacturerPartNumber}
            onChange={handleChange}
            placeholder="MPN"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  </div>

  {/* ✅ Publishing Section - SAME AS ADD PAGE */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Publishing</h3>

    <div className="space-y-3">
      {/* ✅ 3 Checkboxes in 3 Columns - Styled Boxes */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Column 1 - Published */}
        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="published"
            checked={formData.published}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Published</span>
        </label>

        {/* Column 2 - Visible individually */}
        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="visibleIndividually"
            checked={formData.visibleIndividually}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 flex-shrink-0"
          />
          <span className="text-sm text-slate-300">
            Visible individually <span className="text-xs text-slate-500">(catalog)</span>
          </span>
        </label>

        {/* Column 3 - Allow customer reviews */}
        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="allowCustomerReviews"
            checked={formData.allowCustomerReviews}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Allow customer reviews</span>
        </label>
      </div>

{/* ========================================
    ✅ SHOW ON HOMEPAGE + DISPLAY ORDER
    ======================================== */}
<div className="space-y-2">
  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide mb-3">
    Homepage Settings
  </h3>
  
  <div className="grid md:grid-cols-2 gap-4">
    {/* Column 1 - Show on Homepage checkbox */}
    <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all group">
      <input
        type="checkbox"
        name="showOnHomepage"
        checked={formData.showOnHomepage}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 cursor-pointer"
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
          Show on home page
        </span>
        <p className="text-xs text-slate-500 mt-0.5">
          Display this product on homepage
        </p>
      </div>
      {formData.showOnHomepage && (
        <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-md font-semibold">
          ✓ Active
        </span>
      )}
    </label>

    {/* Column 2 - Display Order (conditional) */}
    <div 
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all",
        formData.showOnHomepage
          ? "bg-slate-800/50 border border-slate-700"
          : "bg-slate-800/30 border border-slate-700/50"
      )}
    >
      {formData.showOnHomepage ? (
        <>
          {/* Left: Label */}
          <label 
            htmlFor="displayOrder" 
            className="text-sm font-medium text-slate-300 whitespace-nowrap"
          >
            Display Order
          </label>
          
          {/* Right: Input */}
          <input
            id="displayOrder"
            type="number"
            name="displayOrder"
            value={formData.displayOrder}
            onChange={handleChange}
            placeholder="1"
            min="0"
            className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </>
      ) : (
        /* Placeholder when unchecked */
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm italic">Enable "Show on home page" to set display order</span>
        </div>
      )}
    </div>
  </div>
  
  {/* Helper Text */}
{formData.showOnHomepage && (
  <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-blue-300 font-medium">Homepage Product Active</p>
        {homepageCount !== null && (
          <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
            {homepageCount}/{MAX_HOMEPAGE}
          </span>
        )}
      </div>
      <p className="text-xs text-blue-400/80 mt-1">
        Maximum 50 products allowed. Lower order numbers appear first.
      </p>
    </div>
  </div>
)}


</div>

  {/* PRE-ORDER SECTION */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Pre-Order</h3>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name="availableForPreOrder"
        checked={formData.availableForPreOrder}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <div>
        <span className="text-sm font-medium text-slate-300">Available for pre-order</span>
        <p className="text-xs text-slate-400 mt-0.5">
          {formData.availableForPreOrder 
            ? "Customers can pre-order this product before release" 
            : "Product must be in stock to purchase"}
        </p>
      </div>
    </label>

    {formData.availableForPreOrder && (
      <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Pre-Order Availability Start Date
        </label>
        <input
          type="datetime-local"
          name="preOrderAvailabilityStartDate"
          value={formData.preOrderAvailabilityStartDate}
          onChange={handleChange}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-1">
          When the product will be available for purchase
        </p>
      </div>
    )}
  </div>

  {/* Mark as New Section */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Mark as New</h3>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name="markAsNew"
        checked={formData.markAsNew}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm text-slate-300">Mark as new product</span>
    </label>

    {formData.markAsNew && (
      <div className="grid md:grid-cols-2 gap-4 bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
          <input
            type="datetime-local"
            name="markAsNewStartDate"
            value={formData.markAsNewStartDate}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
          <input
            type="datetime-local"
            name="markAsNewEndDate"
            value={formData.markAsNewEndDate}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    )}
  </div>


    </div>
  {/* ===== SUBSCRIPTION / RECURRING SECTION (WITH GROUPED VALIDATION) ===== */}
  <div className="space-y-4 mt-6">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
      Subscription / Recurring
    </h3>

    {/* ✅ DISABLED FOR GROUPED PRODUCTS */}
    <label className={`flex items-center gap-3 ${
      formData.productType === 'grouped' 
        ? 'cursor-not-allowed opacity-50' 
        : 'cursor-pointer'
    }`}>
      <input
        type="checkbox"
        name="isRecurring"
        checked={formData.isRecurring}
        onChange={handleChange}
        disabled={formData.productType === 'grouped'}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className="text-sm font-medium text-slate-300">
        This is a Recurring Product (Subscription)
        {formData.productType === 'grouped' && (
          <span className="ml-2 text-xs text-red-400 font-normal">
            (Not available for grouped products)
          </span>
        )}
      </span>
    </label>

    {/* ⚠️ WARNING BANNER FOR GROUPED PRODUCTS */}
    {formData.productType === 'grouped' && (
      <div className="flex items-center gap-3 text-xs text-amber-400 bg-amber-900/20 px-4 py-3 rounded border border-amber-800/50">
        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.742-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>
          Subscription/recurring is not supported for grouped products. Individual products in the bundle can have their own subscriptions.
        </span>
      </div>
    )}

    {/* ✅ ONLY SHOW IF ENABLED AND NOT GROUPED */}
    {formData.isRecurring && formData.productType !== 'grouped' && (
      <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg space-y-4 transition-all duration-300">
        {/* Billing Cycle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Charge every</label>
            <input
              type="number"
              name="recurringCycleLength"
              value={formData.recurringCycleLength}
              onChange={handleChange}
              min="1"
              placeholder="30"
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Period</label>
            <select
              name="recurringCyclePeriod"
              value={formData.recurringCyclePeriod}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Total Billing Cycles</label>
            <input
              type="number"
              name="recurringTotalCycles"
              value={formData.recurringTotalCycles}
              onChange={handleChange}
              min="0"
              placeholder="0 = Unlimited"
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Subscription Discount & Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Subscription Discount (%)</label>
            <input
              type="number"
              name="subscriptionDiscountPercentage"
              value={formData.subscriptionDiscountPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              placeholder="15"
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-slate-500 mt-1">e.g., 15 for 15% off</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Allowed Frequencies</label>
            <input
              type="text"
              name="allowedSubscriptionFrequencies"
              value={formData.allowedSubscriptionFrequencies}
              onChange={handleChange}
              placeholder="weekly,monthly,yearly"
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Subscription Description</label>
            <input
              type="text"
              name="subscriptionDescription"
              value={formData.subscriptionDescription}
              onChange={handleChange}
              placeholder="Save 15% with monthly billing"
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex items-center gap-3 text-xs text-amber-400 bg-amber-900/20 px-4 py-3 rounded border border-amber-800/50">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.742-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex w-full justify-between">
            <span>
              Customer will be charged every {formData.recurringCycleLength || "?"} {formData.recurringCyclePeriod || "days"}
              {formData.recurringTotalCycles && parseInt(formData.recurringTotalCycles) > 0
                ? ` for ${formData.recurringTotalCycles} times`
                : " indefinitely"}
              {formData.subscriptionDiscountPercentage && ` with ${formData.subscriptionDiscountPercentage}% discount`}
            </span>
            <span className="text-slate-400 whitespace-nowrap">
              Leave 0 for unlimited recurring payments
            </span>
          </div>
        </div>
      </div>
    )}
  </div>


    {/* Available Dates */}
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Available Start Date/Time</label>
        <input
          type="datetime-local"
          name="availableStartDate"
          value={formData.availableStartDate || ''}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Available End Date/Time</label>
        <input
          type="datetime-local"
          name="availableEndDate"
          value={formData.availableEndDate || ''}
          onChange={handleChange}
          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
      </div>
    </div>
  </div>


{/* Admin Comment */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
    Admin Comment
  </h3>
  
  <div>
    <label className="block text-sm text-slate-400 mb-2">
      Internal Notes (Not visible to customers)
    </label>
    <textarea
      name="adminComment"
      value={formData.adminComment}
      onChange={handleChange}
      placeholder="Add internal notes about this product..."
      rows={4}
      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
    />
  </div>
{/* ✅ REPLACE <AdminCommentHistoryModal productId={productId} /> WITH THIS */}
<button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCommentHistoryOpen(true);
    fetchCommentHistory();
  }}
  className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:text-violet-300 transition-all"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span>View Comment History</span>
  {commentHistory.length > 0 && (
    <span className="px-2 py-0.5 bg-violet-500/20 rounded-full text-xs font-semibold">
      {commentHistory.length}
    </span>
  )}
</button>

</div>


</TabsContent>

<TabsContent value="prices" className="space-y-2 mt-2">
  {/* Price Section */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Price</h3>

    <div className="grid md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Price (£)<span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Old Price (£)</label>
        <input
          type="number"
          name="oldPrice"
          value={formData.oldPrice}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-1">Shows as strikethrough</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Product Cost (£)</label>
        <input
          type="number"
          name="cost"
          value={formData.cost}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-1">For profit calculation</p>
      </div>
    </div>

{(() => { 
  const parsePrice = (value: any): number => {
    if (!value) return 0;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  };

  const mainPrice = parsePrice(formData.price);
  const oldPrice = parsePrice(formData.oldPrice);
  const costPrice = parsePrice(formData.cost);

  const isGrouped = formData.productType === 'grouped';
  let bundleItemsTotal = 0;
  let bundleDiscount = 0;
  let bundleBeforeDiscount = 0;
  let finalBundlePrice = mainPrice;

  // ✅ EARLY RETURN - Only show for GROUPED products
  if (!isGrouped || mainPrice <= 0) return null;

  if (selectedGroupedProducts.length > 0) {
    bundleItemsTotal = selectedGroupedProducts.reduce((total, productId) => {
      const product = simpleProducts.find(p => p.id === productId);
      return total + parsePrice(product?.price || 0);
    }, 0);

    bundleBeforeDiscount = mainPrice + bundleItemsTotal;

    // ✅ DISCOUNT ONLY ON BUNDLE ITEMS (NOT MAIN PRODUCT)
    if (formData.groupBundleDiscountType === 'Percentage') {
      const discountPercent = parsePrice(formData.groupBundleDiscountPercentage);
      bundleDiscount = (bundleItemsTotal * discountPercent) / 100;
    } else if (formData.groupBundleDiscountType === 'FixedAmount') {
      bundleDiscount = parsePrice(formData.groupBundleDiscountAmount);
    } else if (formData.groupBundleDiscountType === 'SpecialPrice') {
      const specialPrice = parsePrice(formData.groupBundleSpecialPrice);
      bundleDiscount = bundleItemsTotal - specialPrice;
    }

    // Final = (Bundle Items - Discount) + Main Product
    finalBundlePrice = (bundleItemsTotal - bundleDiscount) + mainPrice;
  }

  const priceForVat = isGrouped ? finalBundlePrice : mainPrice;

  return (
<div className="mt-2 border border-slate-700 rounded-xl bg-slate-900 p-2 space-y-2">

  {/* Header */}
  <div className="flex justify-between items-center">
    <h4 className="text-sm font-semibold text-white">
      💰 Pricing Breakdown
    </h4>
    <button
      type="button"
      onClick={() => setIsGroupedModalOpen(true)}
      className="relative px-2.5 py-1 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 hover:border-violet-500/50 rounded-lg text-xs font-medium text-violet-300 transition-all group cursor-pointer"
    >
      <span className="flex items-center gap-1">
        📦 Bundle
        <svg 
          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </span>
      
      <div className="absolute -bottom-10 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-slate-900 border border-violet-500/50 rounded-lg px-3 py-1.5 text-xs text-violet-300 whitespace-nowrap shadow-xl">
          Click to edit bundle or add more products
        </div>
      </div>
    </button>
  </div>

  {/* ✅ 1. MAIN PRODUCT - FIRST (TOP) */}
  <div className="space-y-1 text-sm pb-2 border-b border-dashed border-slate-700">
    <div className="flex justify-between text-slate-300">
      <span className="text-emerald-400 font-medium">
        {formData.name || 'Main Product'}
        <span className="ml-1 text-xs font-bold text-purple-500">
          (Main Product)
        </span>
      </span>
      <span className="text-white flex items-center gap-1">
        <span className="text-green-400 font-bold text-sm">+</span>
        £{mainPrice.toFixed(2)}
      </span>
    </div>
  </div>

  {/* ✅ 2. BUNDLE ITEMS SECTION - BELOW MAIN PRODUCT */}
  {selectedGroupedProducts.length > 0 ? (
    <>
      {/* Bundle Items List */}
      <div className="space-y-1 text-sm">
        <div className="text-cyan-400 font-medium">Bundle Items</div>

        {selectedGroupedProducts.map((id, i) => {
          const p = simpleProducts.find(x => x.id === id);
          if (!p) return null;
          return (
            <div key={id} className="flex justify-between text-slate-300">
              <span className="truncate">{i + 1}. {p.name}</span>
              <span className="text-white shrink-0 ml-2">£{parsePrice(p.price).toFixed(2)}</span>
            </div>
          );
        })}

        {/* Bundle Items Subtotal */}
        <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-slate-700">
          <span className="text-slate-400 font-medium">Bundle Items Subtotal</span>
          <span className="text-cyan-400 font-medium">
            £{bundleItemsTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Discount (Applied on Bundle Items Only) */}
      {bundleDiscount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">
            Discount ({formData.groupBundleDiscountType})
          </span>
          <span className="text-red-400 font-medium">
            −£{bundleDiscount.toFixed(2)}
          </span>
        </div>
      )}
    </>
  ) : (
    <div className="text-center py-4 text-slate-400 text-sm border border-dashed border-slate-700 rounded-lg">
      <p className="mb-1">No bundle items selected</p>
      <p className="text-xs text-slate-500">Click the "📦 Bundle" button above to add products</p>
    </div>
  )}

  {/* ✅ 3. FINAL BUNDLE PRICE */}
  <div className="flex justify-between items-center pt-3 border-t border-slate-700">
    <span className="text-base font-semibold text-white">
      Final Bundle Price
    </span>
    <span className="text-xl font-bold text-green-400">
      £{finalBundlePrice.toFixed(2)}
    </span>
  </div>

  {/* ✅ 4. SAVINGS MESSAGE */}
  {bundleDiscount > 0 && (
    <div className="text-center text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md py-1.5">
      🎉 You Save £{bundleDiscount.toFixed(2)} (
      {((bundleDiscount / bundleItemsTotal) * 100).toFixed(1)}% off)
    </div>
  )}

</div>

  );
})()}




    {/* Buttons */}
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-4">
        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="disableBuyButton"
            checked={formData.disableBuyButton}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Disable buy now button</span>
        </label>

        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="disableWishlistButton"
            checked={formData.disableWishlistButton}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Disable wishlist button</span>
        </label>
      </div>
    </div>
  </div>




{/* ====================================================================== */}
{/* ✅ VAT / TAX SETTINGS - WITH PROPER SEARCH */}
{/* ====================================================================== */}

{/* ====================================================================== */}
{/* ✅ VAT / TAX SETTINGS - SAME BOX MEIN SEARCH + SELECTION */}
{/* ====================================================================== */}

<div className="space-y-4">
  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
    VAT / Tax Settings
  </h3>

  {/* ✅ VAT Rate Selector */}
  <div className="relative">
    {/* Label & Preview Button */}
    <div className="flex items-center justify-between gap-3 mb-2">
      <label className="block text-sm font-medium text-slate-300">
        VAT Rate (Please select an applicable rate)
        <span className="text-red-400">*</span>
      </label>

      {/* Preview Button */}
      {formData.vatRateId && parseFloat(formData.price || '0') > 0 && (
        <button
          type="button"
          onClick={() => setShowTaxPreview(!showTaxPreview)}
          className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            showTaxPreview
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          {showTaxPreview ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </>
          )}
        </button>
      )}
    </div>

    {/* ✅ SINGLE INPUT BOX - Selection + Search */}
    <div className="relative">
      <input
        type="text"
        placeholder="Search by name or rate..."
        value={
          showVatDropdown 
            ? vatSearch  // ✅ Search mode - show search text
            : (formData.vatRateId === '' && formData.vatExempt)
              ? 'No Tax (0%)'  // ✅ Display mode - show "No Tax"
              : formData.vatRateId
                ? (() => {
                    const selected = dropdownsData.vatRates.find((v: any) => v.id === formData.vatRateId);
                    return selected ? `${selected.name} (${selected.rate}%)` : '';
                  })()
                : ''  // ✅ Empty state
        }
        onChange={(e) => {
          setVatSearch(e.target.value);
          if (!showVatDropdown) {
            setShowVatDropdown(true);
          }
        }}
        onFocus={() => {
          setShowVatDropdown(true);
          // ✅ Clear search when opening dropdown
          setVatSearch('');
        }}
        className="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
      />
      
      {/* ✅ Clear Button */}
      {(formData.vatRateId || formData.vatExempt) && !showVatDropdown && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFormData({ 
              ...formData, 
              vatRateId: '',
              vatExempt: true
            });
            setVatSearch('');
            setShowTaxPreview(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* ✅ Dropdown Icon (when closed) */}
      {!showVatDropdown && (
        <svg 
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>

    {/* ✅ DROPDOWN - Same as Before */}
    {showVatDropdown && (
      <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-auto">
        {(() => {
          const searchLower = vatSearch.toLowerCase().trim();
          
          // ✅ HARDCODED 0% OPTION
          const hardcodedOption = {
            id: '',
            name: 'No Tax',
            rate: 0,
            description: 'Zero VAT rate - No tax applied',
            isDefault: false
          };

          // ✅ FILTER API RESULTS
          const filtered = dropdownsData.vatRates.filter((vat: any) => {
            if (!searchLower) return true;
            
            return vat.name.toLowerCase().includes(searchLower) ||
                   vat.rate.toString().includes(searchLower) ||
                   vat.description?.toLowerCase().includes(searchLower) ||
                   vat.country?.toLowerCase().includes(searchLower) ||
                   vat.region?.toLowerCase().includes(searchLower);
          });

          // ✅ COMBINE OPTIONS
          const allOptions = [hardcodedOption, ...filtered].filter((vat: any) => {
            if (!searchLower) return true;
            
            if (vat.id === '') {
              return vat.name.toLowerCase().includes(searchLower) ||
                     vat.rate.toString().includes(searchLower) ||
                     '0'.includes(searchLower) ||
                     'no tax'.includes(searchLower);
            }
            
            return true;
          });

          // ✅ HIGHLIGHT FUNCTION
          const highlightText = (text: string, search: string) => {
            if (!search) return text;
            const regex = new RegExp(`(${search})`, 'gi');
            const parts = text.split(regex);
            return parts.map((part, i) => 
              part.toLowerCase() === search.toLowerCase() 
                ? `<mark class="bg-violet-500/30 text-violet-300 px-0.5 rounded">${part}</mark>`
                : part
            ).join('');
          };

          // ✅ NO RESULTS
          if (allOptions.length === 0) {
            return (
              <div className="px-4 py-4 text-center text-slate-500 text-sm">
                <p>No results found</p>
                <p className="text-xs mt-1">Try "20", "Standard", or "0"</p>
              </div>
            );
          }

          // ✅ RENDER OPTIONS
          return allOptions.map((vat: any) => {
            const isSelected = vat.rate === 0 
              ? (formData.vatRateId === '' && formData.vatExempt)
              : formData.vatRateId === vat.id;
            
            return (
              <button
                key={vat.id || 'no-tax'}
                type="button"
                onClick={() => {
                  // ✅ SET SELECTION
                  if (vat.rate === 0) {
                    setFormData({ 
                      ...formData, 
                      vatRateId: '',
                      vatExempt: true
                    });
                  } else {
                    setFormData({ 
                      ...formData, 
                      vatRateId: vat.id,
                      vatExempt: false
                    });
                  }
                  
                  // ✅ CLOSE DROPDOWN & CLEAR SEARCH
                  setVatSearch('');
                  setShowVatDropdown(false);
                }}
                className={`w-full text-left px-3 py-2.5 border-b border-slate-800/50 hover:bg-violet-500/10 transition-all group ${
                  isSelected ? 'bg-violet-500/20 border-l-4 border-l-violet-500' : ''
                }`}
              >
                {/* NAME + RATE IN SAME LINE */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* VAT Name */}
                  <span 
                    className={`font-medium text-sm ${isSelected ? 'text-violet-300' : 'text-white'}`}
                    dangerouslySetInnerHTML={{ __html: highlightText(vat.name, searchLower) }}
                  />
                  
                  {/* RATE BADGE */}
                  <span 
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      vat.rate === 0 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : vat.rate < 10 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    } ${
                      searchLower && vat.rate.toString().includes(searchLower) 
                        ? 'ring-2 ring-violet-400' 
                        : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: highlightText(`${vat.rate}%`, searchLower) }}
                  />
                  
                  {/* Default Badge */}
                  {vat.isDefault && (
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-md text-xs border border-violet-500/30">
                      Default
                    </span>
                  )}
                  
                  {/* Selected Checkmark */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-violet-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                
                {/* Description */}
                {vat.description && (
                  <p 
                    className="text-xs text-slate-400 mt-1"
                    dangerouslySetInnerHTML={{ __html: highlightText(vat.description, searchLower) }}
                  />
                )}
              </button>
            );
          });
        })()}
      </div>
    )}

    {/* ✅ CLOSE DROPDOWN ON OUTSIDE CLICK */}
    {showVatDropdown && (
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => {
          setShowVatDropdown(false);
          setVatSearch(''); // Clear search on close
        }} 
      />
    )}
  </div>

  {/* ✅ VAT Status Indicator */}
  {(formData.vatRateId || formData.vatExempt) && (
    <div className={`p-3 rounded-lg border ${
      formData.vatExempt 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-blue-500/10 border-blue-500/30'
    }`}>
      <div className="flex items-center gap-2">
        {formData.vatExempt ? (
          <>
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-400">VAT Exempt</p>
              <p className="text-xs text-green-400/70">No tax will be applied (0% rate)</p>
            </div>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-400">VAT Applied</p>
              <p className="text-xs text-blue-400/70">Tax will be calculated</p>
            </div>
          </>
        )}
      </div>
    </div>
  )}

   {/* ✅ Tax Preview - Same as Before */}
  {!formData.vatExempt && showTaxPreview && formData.vatRateId && (() => {
    const parsePrice = (value: any): number => {
      if (!value) return 0;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : parsed;
    };

    const mainPrice = parsePrice(formData.price);
    const oldPrice = parsePrice(formData.oldPrice);
    
    const selectedVat = dropdownsData.vatRates.find((v: any) => v.id === formData.vatRateId);
    const vatRate = selectedVat?.rate || 0;

    const isGrouped = formData.productType === 'grouped';
    let bundleItemsTotal = 0;
    let bundleDiscount = 0;
    let finalBundlePrice = mainPrice;

    if (isGrouped && selectedGroupedProducts.length > 0) {
      bundleItemsTotal = selectedGroupedProducts.reduce((total, productId) => {
        const product = simpleProducts.find((p: any) => p.id === productId);
        return total + parsePrice(product?.price || 0);
      }, 0);

      const bundleBeforeDiscount = mainPrice + bundleItemsTotal;

      if (formData.groupBundleDiscountType === 'Percentage') {
        const discountPercent = parsePrice(formData.groupBundleDiscountPercentage);
        bundleDiscount = (bundleBeforeDiscount * discountPercent) / 100;
      } else if (formData.groupBundleDiscountType === 'FixedAmount') {
        bundleDiscount = parsePrice(formData.groupBundleDiscountAmount);
      } else if (formData.groupBundleDiscountType === 'SpecialPrice') {
        const specialPrice = parsePrice(formData.groupBundleSpecialPrice);
        bundleDiscount = bundleBeforeDiscount - specialPrice;
      }

      finalBundlePrice = bundleBeforeDiscount - bundleDiscount;
    }

    const priceForVat = isGrouped ? finalBundlePrice : mainPrice;
    const vatAmount = (priceForVat * vatRate) / 100;
    const finalCustomerPrice = priceForVat + vatAmount;
    
    const oldPriceWithVat = oldPrice + (oldPrice * vatRate) / 100;
    const savingsAmount = oldPriceWithVat - finalCustomerPrice;
    const savingsPercent = oldPriceWithVat > 0 ? (savingsAmount / oldPriceWithVat) * 100 : 0;

    if (mainPrice <= 0) return null;

    return (
      <div className="mt-3 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-4 animate-fadeIn">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          📊 Tax Calculation Preview
        </h4>
        
        <div className="space-y-2">
          {/* Selected VAT Rate */}
          {selectedVat && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">VAT Rate</span>
              <span className="text-white font-medium">{selectedVat.name} ({vatRate}%)</span>
            </div>
          )}

          {/* Price excluding VAT */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Price (excl. VAT)</span>
            <span className="font-semibold text-white">£{priceForVat.toFixed(2)}</span>
          </div>

          {/* VAT Amount */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-amber-400">+ VAT ({vatRate}%)</span>
            <span className="font-semibold text-amber-400">£{vatAmount.toFixed(2)}</span>
          </div>

          {/* Final Price */}
          <div className="border-t border-amber-500/30 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">Customer Pays</span>
              <span className="text-xl font-bold text-amber-400">£{finalCustomerPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Savings */}
          {oldPrice > 0 && savingsAmount > 0 && (
            <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-400">💰 Customer Saves</span>
                <span className="text-sm font-bold text-emerald-400">
                  £{savingsAmount.toFixed(2)} ({savingsPercent.toFixed(1)}% off)
                </span>
              </div>
            </div>
          )}

          {/* Grouped Product Info */}
          {isGrouped && selectedGroupedProducts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <p className="text-xs text-slate-400">
                📦 Bundle includes {selectedGroupedProducts.length + 1} product{selectedGroupedProducts.length === 0 ? '' : 's'}
                {bundleDiscount > 0 && ` with £${bundleDiscount.toFixed(2)} discount`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  })()}
</div>



</TabsContent>
{/* Inventory Tab */}
<TabsContent value="inventory" className="space-y-2 mt-2">
  {/* Inventory Method Section */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Inventory Method</h3>

    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">Inventory Method</label>
      <select
        name="manageInventory"
        value={formData.manageInventory}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      >
        <option value="dont-track">Don't track inventory</option>
        <option value="track">Track inventory</option>
        <option value="track-by-attributes">Track inventory by product attributes</option>
      </select>
      <p className="text-xs text-slate-400 mt-1">
        Choose how you want to manage inventory for this product
      </p>
    </div>
  </div>

  {/* Inventory Settings - Only show when tracking */}
  {formData.manageInventory === 'track' && (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Stock Quantity</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
            <LowStockAlert
      stockQuantity={parseInt(formData.stockQuantity) || 0}
      notifyQuantityBelow={parseInt(formData.notifyQuantityBelow) || 0}
      enabled={formData.notifyAdminForQuantityBelow}
    />
        
    <BackInStockSubscribers productId={productId} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Stock Quantity</label>
            <input
              type="number"
              name="minStockQuantity"
              value={formData.minStockQuantity}
              onChange={handleChange}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Low Stock Activity</label>
            <select
              name="lowStockActivity"
              value={formData.lowStockActivity}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            >
              <option value="nothing">Nothing</option>
              <option value="disable-buy">Disable buy now button</option>
              <option value="unpublish">Unpublish product</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Action to take when stock falls below minimum
            </p>
          </div>

          {/* ✅ PLACEHOLDER - Keep grid balanced */}
          <div></div>
        </div>

        {/* ✅ ADMIN NOTIFICATION SECTION - CONDITIONAL */}
        <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="notifyAdminForQuantityBelow"
              checked={formData.notifyAdminForQuantityBelow}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <div>
              <span className="text-sm font-medium text-slate-300">Enable Low Stock Notifications</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {formData.notifyAdminForQuantityBelow 
                  ? "Admin will receive email alerts for low stock" 
                  : "No email notifications will be sent"}
              </p>
            </div>
          </label>

          {/* Conditional Threshold Input */}
          {formData.notifyAdminForQuantityBelow && (
            <div className="ml-6 pt-2 border-t border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notify When Quantity Below
              </label>
              <input
                type="number"
                name="notifyQuantityBelow"
                value={formData.notifyQuantityBelow}
                onChange={handleChange}
                placeholder="1"
                min="0"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">
                Email will be sent when stock reaches this quantity
              </p>
            </div>
          )}
        </div>

        {/* ✅ BACKORDER SECTION - CONDITIONAL */}
        <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowBackorder"
              checked={formData.allowBackorder}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <div>
              <span className="text-sm font-medium text-slate-300">Allow Backorders</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {formData.allowBackorder 
                  ? "Customers can order when out of stock" 
                  : "Orders blocked when stock is 0"}
              </p>
            </div>
          </label>

          {/* Conditional Dropdown */}
          {formData.allowBackorder && (
            <div className="ml-6 pt-2 border-t border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Backorder Mode
              </label>
              <select
                name="backorderMode"
                value={formData.backorderMode}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="allow-qty-below-zero">Allow quantity below 0 (silent)</option>
                <option value="allow-qty-below-zero-and-notify">Allow quantity below 0 & notify customer</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {formData.backorderMode === "allow-qty-below-zero-and-notify" 
                  ? "Customer will see 'Backordered' message" 
                  : "No special message shown to customer"}
              </p>
            </div>
          )}
        </div>

{/* Ultra Minimal Version - Preview Only on Selected */}
<div className="space-y-3">
  <label className="block text-sm font-medium text-slate-300 mb-3">
    Stock Display Options
  </label>

  <div className="space-y-1.5">
    {/* Option 1 */}
    <div className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded transition-all">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="stockDisplayOption"
          checked={!formData.displayStockAvailability && !formData.displayStockQuantity}
          onChange={() => {
            setFormData(prev => ({
              ...prev,
              displayStockAvailability: false,
              displayStockQuantity: false
            }));
          }}
          className="text-violet-500 bg-slate-800/50 border-slate-700 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-300">Don't display stock information</span>
      </label>
      {!formData.displayStockAvailability && !formData.displayStockQuantity && (
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-slate-400">Customer View:</span>
          <span className="text-xs text-slate-500 italic">No preview</span>
        </div>
      )}
    </div>

    {/* Option 2 */}
    <div className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded transition-all">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="stockDisplayOption"
          checked={formData.displayStockAvailability && !formData.displayStockQuantity}
          onChange={() => {
            setFormData(prev => ({
              ...prev,
              displayStockAvailability: true,
              displayStockQuantity: false
            }));
          }}
          className="text-violet-500 bg-slate-800/50 border-slate-700 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-300">Display stock availability</span>
      </label>
      {formData.displayStockAvailability && !formData.displayStockQuantity && (
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-slate-400">Customer View:</span>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
            In Stock
          </span>
        </div>
      )}
    </div>

    {/* Option 3 */}
    <div className="flex items-center justify-between p-2 hover:bg-slate-800/30 rounded transition-all">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="stockDisplayOption"
          checked={formData.displayStockQuantity && !formData.displayStockAvailability}
          onChange={() => {
            setFormData(prev => ({
              ...prev,
              displayStockAvailability: false,
              displayStockQuantity: true
            }));
          }}
          className="text-violet-500 bg-slate-800/50 border-slate-700 focus:ring-violet-500"
        />
        <span className="text-sm text-slate-300">Display exact stock quantity</span>
      </label>
      {formData.displayStockQuantity && !formData.displayStockAvailability && (
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-slate-400">Customer View:</span>
          <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
            {formData.stockQuantity || '0'} items available
          </span>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
            In Stock
          </span>
        </div>
      )}
    </div>
  </div>

  {/* Notify Me */}
  <div className="pt-3 border-t border-slate-700 mt-3">
    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-all">
      <input
        type="checkbox"
        name="allowBackInStockSubscriptions"
        checked={formData.allowBackInStockSubscriptions}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500"
      />
      <span className="text-sm text-slate-300">Allow "Notify me when available"</span>
    </label>
  </div>
</div>


      </div>
  
    </>
  )}

{/* Cart Settings */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
    Cart Settings
  </h3>

  {/* SIMPLE INLINE RADIO SELECTOR */}
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Quantity Control
    </label>
    
    <div className="flex gap-4 mb-3">
      {/* Range Mode Radio */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="quantityMode"
          checked={!(!formData.orderMinimumQuantity && !formData.orderMaximumQuantity)}
          onChange={() => {
            setFormData(prev => ({
              ...prev,
              allowedQuantities: '',
              orderMinimumQuantity: prev.orderMinimumQuantity || '1',
              orderMaximumQuantity: prev.orderMaximumQuantity || '10'
            }));
          }}
          className="w-4 h-4 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">Min - Max Range</span>
      </label>

      {/* Fixed Quantities Radio */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="quantityMode"
          checked={!formData.orderMinimumQuantity && !formData.orderMaximumQuantity}
          onChange={() => {
            setFormData(prev => ({
              ...prev,
              orderMinimumQuantity: '',
              orderMaximumQuantity: '',
              allowedQuantities: prev.allowedQuantities || ''
            }));
          }}
          className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">Fixed Quantities</span>
      </label>
    </div>

    {/* MIN-MAX RANGE FIELDS */}
    {!(!formData.orderMinimumQuantity && !formData.orderMaximumQuantity) && (
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Minimum Cart Quantity
          </label>
          <input
            type="number"
            name="orderMinimumQuantity"
            value={formData.orderMinimumQuantity}
            onChange={handleChange}
            min="1"
            placeholder="1"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Maximum Cart Quantity
          </label>
          <input
            type="number"
            name="orderMaximumQuantity"
            value={formData.orderMaximumQuantity}
            onChange={handleChange}
            min={formData.orderMinimumQuantity || '1'}
            placeholder="100"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    )}

    {/* FIXED QUANTITIES FIELD */}
    {!formData.orderMinimumQuantity && !formData.orderMaximumQuantity && (
      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Allowed Cart Quantities
        </label>
        <input
          type="text"
          name="allowedQuantities"
          value={formData.allowedQuantities}
          onChange={handleChange}
          placeholder="1, 5, 10, 20, 50"
          className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-2">Enter comma-separated values</p>
        
        {formData.allowedQuantities && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {formData.allowedQuantities.split(',').map((qty, i) => {
              const val = qty.trim();
              return val ? (
                <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded border border-emerald-500/30">
                  {val}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    )}
  </div>

  {/* NOT RETURNABLE */}
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      name="notReturnable"
      checked={formData.notReturnable}
      onChange={handleChange}
      className="w-4 h-4 rounded bg-slate-800/50 border-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900"
    />
    <span className="text-sm text-slate-300">Not Returnable</span>
  </label>
</div>





</TabsContent>






{/* Related Products Tab */}
<TabsContent value="related-products" className="space-y-6 mt-2">
  {/* Related Products */}
  <RelatedProductsSelector
    type="related"
    selectedProductIds={formData.relatedProducts}
    availableProducts={availableProducts}
    brands={dropdownsData.brands}
    categories={dropdownsData.categories}
    onProductsChange={(productIds) => {
      setFormData(prev => ({
        ...prev,
        relatedProducts: productIds
      }));
    }}
  />

  {/* Cross-sell Products */}
  <RelatedProductsSelector
    type="cross-sell"
    selectedProductIds={formData.crossSellProducts}
    availableProducts={availableProducts}
    brands={dropdownsData.brands}
    categories={dropdownsData.categories}
    onProductsChange={(productIds) => {
      setFormData(prev => ({
        ...prev,
        crossSellProducts: productIds
      }));
    }}
  />


</TabsContent>
{/* ========== SHIPPING TAB ========== */}
<TabsContent value="shipping" className="space-y-2 mt-2">
  {/* ===== SHIPPING SETTINGS ===== */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Shipping Settings</h3>

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name="isShipEnabled"
        checked={formData.isShipEnabled}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm text-slate-300">Shipping enabled</span>
    </label>

    {formData.isShipEnabled && (
      <div className="space-y-4 bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
        {/* Ship Separately */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="shipSeparately"
              checked={formData.shipSeparately}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Ship separately (not with other products)</span>
          </label>
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Delivery Date</label>
          <select
            name="deliveryDateId"
            value={formData.deliveryDateId}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="">None</option>
            <option value="1">1-2 days</option>
            <option value="2">3-5 days</option>
            <option value="3">1 week</option>
            <option value="4">2 weeks</option>
          </select>
        </div>

        {/* ✅ DELIVERY OPTIONS SECTION */}
        <div className="space-y-4 bg-slate-900/30 border border-slate-600 rounded-xl p-4 mt-4">
          <h4 className="text-sm font-semibold text-white border-b border-slate-700 pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-violet-400" />
            Delivery Options
          </h4>
          
          {/* Same Day Delivery */}
          {/* <div className="space-y-3 hidden">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="sameDayDeliveryEnabled"
                checked={formData.sameDayDeliveryEnabled}
                onChange={handleChange}
                className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                ⚡ Enable Same-Day Delivery
              </span>
            </label>
            
            {formData.sameDayDeliveryEnabled && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Cutoff Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    name="sameDayDeliveryCutoffTime"
                    value={formData.sameDayDeliveryCutoffTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Order before this time</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Delivery Charge (£)
                  </label>
                  <input
                    type="number"
                    name="sameDayDeliveryCharge"
                    value={formData.sameDayDeliveryCharge}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Extra charge for same-day</p>
                </div>
              </div>
            )}
          </div> */}
          
          {/* Next Day Delivery */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="nextDayDeliveryEnabled"
                checked={formData.nextDayDeliveryEnabled}
                onChange={handleChange}
                className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                🚀 Enable Next-Day Delivery
              </span>
            </label>
            
            {formData.nextDayDeliveryEnabled && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Cutoff Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    name="nextDayDeliveryCutoffTime"
                    value={formData.nextDayDeliveryCutoffTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Order before this time</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Delivery Charge (£)
                  </label>
                  <input
                    type="number"
                    name="nextDayDeliveryCharge"
                    value={formData.nextDayDeliveryCharge}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Extra charge for next-day</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Standard Delivery */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="standardDeliveryEnabled"
                checked={formData.standardDeliveryEnabled}
                onChange={handleChange}
                className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                📦 Enable Standard Delivery
              </span>
            </label>
            
            {formData.standardDeliveryEnabled && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Delivery Days <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="standardDeliveryDays"
                    value={formData.standardDeliveryDays}
                    onChange={handleChange}
                    placeholder="5"
                    min="1"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Estimated delivery time</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Delivery Charge (£)
                  </label>
                  <input
                    type="number"
                    name="standardDeliveryCharge"
                    value={formData.standardDeliveryCharge}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Standard delivery charge</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Summary */}
          {(formData.sameDayDeliveryEnabled || formData.nextDayDeliveryEnabled || formData.standardDeliveryEnabled) && (
            <div className="flex items-start gap-2 text-xs text-blue-400 bg-blue-900/20 px-3 py-2 rounded border border-blue-800/50 mt-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Active Delivery Options:</p>
                <ul className="space-y-1 text-slate-300">
                  {formData.sameDayDeliveryEnabled && (
                    <li>• Same-Day: £{formData.sameDayDeliveryCharge || '0'} (Before {formData.sameDayDeliveryCutoffTime || '--:--'})</li>
                  )}
                  {formData.nextDayDeliveryEnabled && (
                    <li>• Next-Day: £{formData.nextDayDeliveryCharge || '0'} (Before {formData.nextDayDeliveryCutoffTime || '--:--'})</li>
                  )}
                  {formData.standardDeliveryEnabled && (
                    <li>• Standard: £{formData.standardDeliveryCharge || '0'} ({formData.standardDeliveryDays || '5'} days)</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>


  {/* ===== DIMENSIONS ===== */}
  {formData.isShipEnabled && (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Dimensions</h3>
      <div className="grid md:grid-cols-4 gap-4">
        {['weight', 'length', 'width', 'height'].map((field) => {
          const rawValue = formData[field as keyof typeof formData];
          const displayValue = 
            rawValue === null || rawValue === undefined || rawValue === ''
              ? ''
              : Number(rawValue);

          return (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {field === 'weight' ? 'Weight (kg)' : `${field.charAt(0).toUpperCase() + field.slice(1)} (cm)`}
              </label>
              <input
                type="number"
                name={field}
                value={displayValue}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          );
        })}
      </div>
    </div>
  )}
</TabsContent>

              {/* Product Attributes Tab */}
              <TabsContent value="product-attributes" className="space-y-2 mt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Product Attributes</h3>
                      <p className="text-sm text-slate-400">
                        Add custom attributes like warranty, brand info, material details etc.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addProductAttribute}
                      className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Tag className="h-4 w-4" />
                      Add Attribute
                    </button>
                  </div>

                  {productAttributes.length === 0 ? (
                   <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 text-center">
  <Tag className="h-8 w-8 text-slate-600 mx-auto mb-2" />

  <h3 className="text-sm font-medium text-white mb-1">
    No Product Attributes Yet
  </h3>

  <p className="text-xs text-slate-400">
    Click “Add Attribute” to add product information
  </p>
</div>

                  ) : (
                    <div className="space-y-3">
                      {productAttributes.map((attr, index) => (
                        <div key={attr.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                {index + 1} .  Attribute Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={attr.name}
                                  onChange={(e) => updateProductAttribute(attr.id, 'name', e.target.value)}
                                  placeholder="e.g., Warranty, Material, Brand"
                                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                  Value <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={attr.value}
                                  onChange={(e) => updateProductAttribute(attr.id, 'value', e.target.value)}
                                  placeholder="e.g., 1 Year, Cotton, Nike"
                                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                  Display Order
                                </label>
                                <input
                                  type="number"
                                  value={attr.displayOrder}
                                  onChange={(e) => updateProductAttribute(attr.id, 'displayOrder', parseInt(e.target.value) || 0)}
                                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                              </div>
                            </div>
                            {/* Attribute Delete Button */}
<button
  type="button"
  onClick={() => removeProductAttribute(attr.id)}
  className="mt-8 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
>
  <X className="h-5 w-5" />
</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
<div className="space-y-3">
  <label className="block text-sm font-medium text-slate-300 mb-3">
    Gender <span className="text-slate-500">(Optional)</span>
  </label>
  <div className="flex flex-wrap gap-6">
    {['Not specified', 'Male', 'Female', 'Unisex', 'Kids', 'Boys', 'Girls'].map((option) => {
      const value = option === 'Not specified' ? '' : option;
      const isChecked = formData.gender === value;

      return (
        <label
          key={option}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <input
            type="radio"
            name="gender"
            value={value}
            checked={isChecked}
            onChange={handleChange}
            className="w-5 h-5 rounded-full bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 transition-all"
          />
          <span
            className={`text-sm transition-colors ${
              isChecked
                ? 'text-white font-medium'
                : 'text-slate-300 group-hover:text-white'
            }`}
          >
            {option}
          </span>
        </label>
      );
    })}
  </div>
</div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-blue-400 mb-2">💡 Attribute Examples</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• Warranty: 1 Year Manufacturer Warranty</li>
                      <li>• Material: 100% Cotton</li>
                      <li>• Brand: Nike</li>
                      <li>• Country of Origin: Made in India</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

 
{/* ========================================== */}
{/* EDIT PAGE - PRODUCT VARIANTS TAB */}
{/* ========================================== */}
<TabsContent value="variants" className="space-y-4">
 {/* Product Options Manager */}
  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <ProductOptionsManager
      options={productOptions}
      onOptionsChange={setProductOptions}
      maxOptions={3}
      disabled={isSubmitting}
    />
  </div>

  {/* Product Variants Manager (now includes Generate button internally) */}
  <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <ProductVariantsManager
      variants={productVariants}
      options={productOptions}
      productSku={formData.sku}
      productName={formData.name}
      productId={productId || undefined}
      onVariantsChange={setProductVariants}
      disabled={isSubmitting}
      variantSkuErrors={variantSkuErrors}
      onVariantImageUpload={handleVariantImageUpload}
    />
  </div>
  {/* Help Section */}
  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-semibold text-sm text-blue-400 mb-2">How Options & Variants Work</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <strong className="text-white">Options:</strong> Define types (Color: Red Blue Green)</li>
          <li>• <strong className="text-white">Generate:</strong> Auto-creates all combinations</li>
          <li>• Each variant has unique SKU, price, and stock</li>
        </ul>
      </div>
    </div>
  </div>
</TabsContent>



{/* SEO Tab - Synced with Variants */}
<TabsContent value="seo" className="space-y-2 mt-2">
  <div className="space-y-4 bg-slate-800/30 border border-slate-700 rounded-xl p-4">

    {/* ===== Header ===== */}
    <div>
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400"></span>
        Search Engine Optimization
      </h3>
      <p className="text-sm text-slate-400 mt-0.5">
        Optimize your product for search engines to improve visibility
      </p>
    </div>

    {/* ===== Meta Title ===== */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">
          Meta Title
        </label>
        <span
          className={`text-xs font-medium ${
            formData.metaTitle.length > 60
              ? "text-red-400"
              : formData.metaTitle.length > 50
              ? "text-yellow-400"
              : "text-slate-500"
          }`}
        >
          {formData.metaTitle.length}/60
        </span>
      </div>

      <input
        type="text"
        name="metaTitle"
        value={formData.metaTitle}
        onChange={handleChange}
        maxLength={60}
        placeholder="SEO-optimized title for search engines"
        className={`w-full px-4 py-2.5 bg-slate-900/70 border rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
          formData.metaTitle.length > 60
            ? "border-red-500/50"
            : formData.metaTitle.length > 50
            ? "border-yellow-500/50"
            : "border-slate-700"
        }`}
      />

      <p className="mt-1 text-xs text-slate-300 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          Recommended
        </span>
        50–60 characters for best SEO
      </p>
    </div>

    {/* ===== Meta Description ===== */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">
          Meta Description
        </label>
        <span
          className={`text-xs font-medium ${
            formData.metaDescription.length > 160
              ? "text-red-400"
              : formData.metaDescription.length > 150
              ? "text-yellow-400"
              : "text-slate-500"
          }`}
        >
          {formData.metaDescription.length}/160
        </span>
      </div>

      <textarea
        name="metaDescription"
        value={formData.metaDescription}
        onChange={handleChange}
        maxLength={160}
        rows={3}
        placeholder="Brief description for search engine results"
        className={`w-full px-4 py-2.5 bg-slate-900/70 border rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none ${
          formData.metaDescription.length > 160
            ? "border-red-500/50"
            : formData.metaDescription.length > 150
            ? "border-yellow-500/50"
            : "border-slate-700"
        }`}
      />

      <p className="mt-1 text-xs text-slate-300 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          Recommended
        </span>
        150–160 characters for Google snippets
      </p>
    </div>

    {/* ===== Meta Keywords ===== */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">
          Meta Keywords
        </label>
        <span className="text-xs text-slate-500">
          {formData.metaKeywords
            .split(",")
            .filter((k) => k.trim()).length}{" "}
          keywords
        </span>
      </div>

      <input
        type="text"
        name="metaKeywords"
        value={formData.metaKeywords}
        onChange={handleChange}
        placeholder="keyword1, keyword2, keyword3"
        className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />

      <p className="mt-1 text-xs text-slate-400 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        Comma-separated keywords (optional)
      </p>
    </div>

    {/* ===== URL Slug ===== */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">
          URL Slug
        </label>
        <span className="text-xs text-slate-500">
          {formData.searchEngineFriendlyPageName.length} chars
        </span>
      </div>

      <input
        type="text"
        name="searchEngineFriendlyPageName"
        value={formData.searchEngineFriendlyPageName}
        onChange={handleChange}
        placeholder="product-url-slug"
        className="w-full px-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />

      <p className="mt-1 text-xs text-slate-300 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
          Tip
        </span>
        Leave empty to auto-generate from product name
      </p>
    </div>

    {/* ===== SEO Tips ===== */}
    <div className="bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/30 rounded-lg p-4">
      <h4 className="font-semibold text-sm text-violet-400 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400"></span>
        SEO Tips
      </h4>

      <ul className="text-xs text-slate-300 space-y-1.5">
        <li>• Use descriptive, keyword-rich titles and descriptions</li>
        <li>• Keep meta titles under 60 characters</li>
        <li>• Keep meta descriptions under 160 characters</li>
        <li>• Use hyphens in URL slugs (e.g., wireless-headphones)</li>
      </ul>
    </div>

  </div>
</TabsContent>

{/* Media Tab - Synced with Variants */}
<TabsContent value="media" className="space-y-3 mt-2">
  {/* ========== PICTURES SECTION ========== */}
  <div className="space-y-3 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <div>
      <h3 className="text-lg font-semibold text-white">Product Images</h3>
    <p className="text-sm text-red-400">
  Upload product images (WebP or JPG). Recommended size under 300 KB, maximum 500 KB per image. 
  Minimum resolution 800×800 (square preferred). You can upload up to 10 images.
</p>

    </div>

    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleImageUpload}
      disabled={!formData.name.trim() || uploadingImages}
      className="hidden"
    />

    {uploadingImages ? (
      <div className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-violet-500/50 rounded-lg bg-violet-500/5">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-white">Uploading images...</p>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => {
          if (!formData.name.trim()) {
            toast.warning('Please enter product name first');
            return;
          }
          fileInputRef.current?.click();
        }}
        disabled={uploadingImages}
        className={`w-full py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
          !formData.name.trim() || uploadingImages
            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border-2 border-dashed border-slate-600'
            : 'bg-slate-900/70 border-2 border-dashed border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-violet-500/50'
        }`}
      >
        <Upload className="h-4 w-4" />
        Add More Images
      </button>
    )}

    {formData.productImages.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-400">
          {formData.productImages.length}{' '}
          {formData.productImages.length === 1 ? 'Image' : 'Images'}
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {formData.productImages.map((image) => (
            <div
              key={image.id}
              className="bg-slate-800/30 border border-slate-700 rounded p-2 space-y-1 relative group"
            >
              {image.isMain && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-500 text-white text-[10px] font-medium rounded z-10">
                  Main
                </div>
              )}

              <div className="aspect-square bg-slate-700/50 rounded overflow-hidden relative">
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl.startsWith('http') ? image.imageUrl : `${API_BASE_URL}${image.imageUrl}`}
                    alt={image.altText || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-5 w-5 text-slate-500" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={isDeletingImage}
                  className={`absolute top-0 right-0 p-1 rounded-bl transition-all opacity-0 group-hover:opacity-100 ${
                    isDeletingImage
                      ? 'bg-slate-500/90 cursor-not-allowed'
                      : 'bg-red-500/90 hover:bg-red-600'
                  }`}
                  title="Delete"
                >
                  {isDeletingImage ? (
                    <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <X className="h-3 w-3 text-white" />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Alt"
                  value={image.altText}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      productImages: formData.productImages.map((img) =>
                        img.id === image.id ? { ...img, altText: e.target.value } : img,
                      ),
                    });
                  }}
                  className="w-full px-2 py-1 text-[11px] bg-slate-800/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="#"
                    value={image.sortOrder}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        productImages: formData.productImages.map((img) =>
                          img.id === image.id
                            ? { ...img, sortOrder: parseInt(e.target.value) || 1 }
                            : img,
                        ),
                      });
                    }}
                    className="w-12 px-2 py-1 text-[11px] bg-slate-800/50 border border-slate-700 rounded text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                  />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={image.isMain}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          productImages: formData.productImages.map((img) =>
                            img.id === image.id
                              ? { ...img, isMain: e.target.checked }
                              : e.target.checked
                              ? { ...img, isMain: false }
                              : img,
                          ),
                        });
                      }}
                      className="w-3 h-3 text-violet-500 rounded border-slate-700 bg-slate-900 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="text-[10px] text-slate-400">Main</span>
                  </label>
                </div>
                {/* {!image.file && image.imageUrl && (
                  <div className="text-[10px] text-green-400">✓</div>
                )} */}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  <div className="border-t border-slate-800" />

  {/* ========== VIDEOS SECTION ========== */}
  <div className="space-y-3 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <div>
      <h3 className="text-lg font-semibold text-white">Product Videos</h3>
      <p className="text-sm text-slate-400">
        Add video URLs (YouTube, Vimeo, etc.) to showcase your product
      </p>
    </div>

    {formData.videoUrls.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {formData.videoUrls.map((url, index) => (
          <div
            key={index}
            className="group bg-slate-800/30 rounded border border-slate-700 overflow-hidden hover:border-violet-500/50 transition-all"
          >
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
              {url && url.includes('youtube.com') ? (
                <>
                  <img
                    src={`https://img.youtube.com/vi/${getYouTubeVideoId(url)}/hqdefault.jpg`}
                    alt={`Video ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(
                        url,
                      )}/default.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-all">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <Video className="w-6 h-6 text-slate-600" />
              )}
            </div>

            <div className="p-2 bg-slate-900/50 space-y-1">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  const newUrls = [...formData.videoUrls];
                  newUrls[index] = e.target.value;
                  setFormData({ ...formData, videoUrls: newUrls });
                }}
                placeholder="https://youtube.com/..."
                className="w-full px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-transparent"
              />

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    videoUrls: formData.videoUrls.filter((_, i) => i !== index),
                  });
                }}
                className="w-full px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded transition-all text-xs font-medium flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    <button
      type="button"
      onClick={() => {
        setFormData({
          ...formData,
          videoUrls: [...formData.videoUrls, ''],
        });
      }}
      className="w-full py-2.5 bg-slate-900/70 border-2 border-dashed border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 hover:border-violet-500/50 transition-all text-xs font-medium flex items-center justify-center gap-2"
    >
      <Video className="h-4 w-4" />
      Add Video URL
    </button>
  </div>
</TabsContent>



            </Tabs>
          </div>
        </div>
      </div>
{/* Add this before the final closing </div> of your return statement */}
<GroupedProductModal
  isOpen={isGroupedModalOpen}
  onClose={() => setIsGroupedModalOpen(false)}
  simpleProducts={simpleProducts}
  selectedGroupedProducts={selectedGroupedProducts}
  automaticallyAddProducts={formData.automaticallyAddProducts}
   // ⭐ PASS MAIN PRODUCT DATA
  mainProductPrice={parseFloat(formData.price) || 0}
  mainProductName={formData.name || 'Main Product'}
  // ✅ NEW: Bundle Discount Props
  bundleDiscountType={formData.groupBundleDiscountType}
  bundleDiscountPercentage={formData.groupBundleDiscountPercentage}
  bundleDiscountAmount={formData.groupBundleDiscountAmount}
  bundleSpecialPrice={formData.groupBundleSpecialPrice}
  bundleSavingsMessage={formData.groupBundleSavingsMessage}
  showIndividualPrices={formData.showIndividualPrices}
  applyDiscountToAllItems={formData.applyDiscountToAllItems}
  
  // Existing handlers
  onProductsChange={handleGroupedProductsChange}
  onAutoAddChange={(checked) => {
    setFormData(prev => ({
      ...prev,
      automaticallyAddProducts: checked
    }));
  }}
  
  // ✅ NEW: Bundle Discount Handler
  onBundleDiscountChange={(discount) => {
    setFormData(prev => ({
      ...prev,
      groupBundleDiscountType: discount.type,
      groupBundleDiscountPercentage: discount.percentage || 0,
      groupBundleDiscountAmount: discount.amount || 0,
      groupBundleSpecialPrice: discount.specialPrice || 0,
      groupBundleSavingsMessage: discount.savingsMessage || ''
    }));
  }}
  
  // ✅ NEW: Display Settings Handler
  onDisplaySettingsChange={(settings) => {
    setFormData(prev => ({
      ...prev,
      showIndividualPrices: settings.showIndividualPrices,
      applyDiscountToAllItems: settings.applyDiscountToAllItems
    }));
  }}
/>

{/* ==================== PRODUCT LOCK MODAL (FIXED SYNTAX) ==================== */}
{isLockModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div 
      className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
      onClick={handleModalClose}
    />
    
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/20 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
      
      {/* ✅ SYNCED HEADER - Single line with lock icon, title, and close button */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        {/* Left side: Lock icon + Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-white">
            Product Locked
          </h2>
        </div>
        
        {/* Right side: Close button with rotate effect */}
        <button
          onClick={handleModalClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all hover:rotate-90 duration-300"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* ✅ MINIMIZED Body - Reduced padding and spacing */}
      <div className="px-5 py-4 space-y-3">
        
        {/* Editor info card - Minimal padding */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Currently Editing</p>
              <p className="text-white text-sm font-medium truncate">
                {lockedByEmail || 'admin@ecommerce.com'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Lock expiry info - Minimal padding */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Lock Expires At</p>
              <p className="text-white text-sm font-medium">
                {productLock?.expiresAt 
                  ? new Date(productLock.expiresAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : '6 Jan 2026, 7:24 am IST'
                }
              </p>
            </div>
          </div>
        </div>
        
        {/* Info alert - Minimal padding */}
        <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 text-sm font-medium">
              What can you do?
            </p>
            <p className="text-amber-100/70 text-xs leading-relaxed mt-0.5">
              Wait for the lock to expire automatically, or request takeover from the current editor to gain immediate access.
            </p>
          </div>
        </div>
      </div>
      
      {/* ✅ MINIMIZED Footer - Reduced padding */}
      <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700 flex gap-2.5">
        <button
          onClick={handleModalClose}
          className="flex-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-xl font-medium transition-all flex items-center justify-center gap-2 group border border-slate-600"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Go Back
        </button>
        
        <button
          onClick={openTakeoverModal}
          className="flex-1 px-3 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white text-sm rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
        >
          <Send className="w-4 h-4" />
          Request Takeover
        </button>
      </div>
    </div>
  </div>
)}



{/* ==================== IMPROVED TAKEOVER MODAL (BETTER COLORS) ==================== */}
{/* ✅ Takeover Request Modal */}
<RequestTakeoverModal
  isOpen={isTakeoverModalOpen}
  onClose={closeTakeoverModal}
  onSubmit={handleTakeoverRequest}
  productName={formData.name || 'Product'}
  lockedByEmail={lockedByEmail || 'Unknown'}
  timeLeft={pendingRequestTimeLeft}
  isPending={hasPendingTakeover}
  requestStatus={takeoverRequestStatus}
  responseMessage={takeoverResponseMessage}
/>
  
{/* Takeover Request Modal */}
<TakeoverRequestModal
  productId={productId}
  isOpen={isTakeoverModalOpen}
  onClose={handleTakeoverModalClose}
  request={takeoverRequest}
  onActionComplete={handleTakeoverActionComplete}
  onSaveBeforeApprove={async () => {
    console.log('🔄 Auto-saving all changes before approval...');
    await handleSubmit(undefined, false, false);
  }}
/>
{/* ✅ ADD THIS MODAL AT THE END (before last </div> of return) */}
{isCommentHistoryOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div 
      className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-violet-500/30 rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden"
      style={{ maxHeight: '90vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Admin Comment History</h2>
        </div>
        <button
          onClick={() => setIsCommentHistoryOpen(false)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-violet-500 mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm">Loading history...</p>
            </div>
          </div>
        ) : commentHistory.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-200 font-semibold text-lg mb-2">No comment history available</p>
              <p className="text-slate-500 text-sm">Changes will appear here after admin comment updates</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-xs font-bold text-violet-300 uppercase">#</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-violet-300 uppercase min-w-[150px]">Changed By</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-violet-300 uppercase min-w-[120px]">Date & Time</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-violet-300 uppercase min-w-[200px]">Old Comment</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-violet-300 uppercase min-w-[200px]">New Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {commentHistory.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-violet-300">
                            {entry.changedBy.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">
                            {entry.changedBy.split('@')[0]}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{entry.changedBy}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-sm text-slate-200">{formatDateOnly(entry.changedAt)}</p>
                      <p className="text-xs text-slate-500">{formatTime(entry.changedAt)}</p>
                    </td>
                    <td className="py-3 px-3">
                      {entry.oldComment ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                          <p className="text-xs text-slate-200 line-clamp-2">{entry.oldComment}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No previous comment</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {entry.newComment ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                          <p className="text-xs text-slate-200 line-clamp-2">{entry.newComment}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Comment removed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {commentHistory.length > 0 && (
        <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-300">
            Total Changes: <span className="font-bold text-violet-400">{commentHistory.length}</span>
          </p>
          <p className="text-xs text-slate-500">Latest changes shown first</p>
        </div>
      )}
    </div>
  </div>
)}
{/* ============================================================ */}
{/* UNSAVED CHANGES MODAL - FIXED & COMPLETE */}
{/* ============================================================ */}
{showUnsavedModal && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl max-w-2xl w-full animate-slideUp">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Unsaved Changes Detected</h3>
            <p className="text-sm text-slate-400 mt-0.5">You have made changes that haven't been saved yet</p>
          </div>

          <button onClick={handleModalCancel} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-slate-300 text-sm mb-4">
          Choose how you want to proceed with your changes:
        </p>
        
        {/* Changed Fields Summary - COMPLETE VERSION */}
        {(() => {
          const changes: string[] = [];
          
          if (initialFormData) {
            // ========== BASIC INFO ==========
            if (formData.name !== initialFormData.name) changes.push('Product Name');
            if (formData.sku !== initialFormData.sku) changes.push('SKU');
            if (formData.shortDescription !== initialFormData.shortDescription) changes.push('Short Description');
            if (formData.fullDescription !== initialFormData.fullDescription) changes.push('Full Description');
            if (formData.productType !== initialFormData.productType) changes.push('Product Type');
            if (formData.gender !== initialFormData.gender) changes.push('Gender');
            if (formData.gtin !== initialFormData.gtin) changes.push('GTIN');
            if (formData.manufacturerPartNumber !== initialFormData.manufacturerPartNumber) changes.push('MPN');
            
            // ========== PRICING ==========
            if (formData.price !== initialFormData.price) changes.push('Price');
            if (formData.oldPrice !== initialFormData.oldPrice) changes.push('Old Price');
            if (formData.cost !== initialFormData.cost) changes.push('Cost');
            
            // ========== CATEGORIES & BRANDS ==========
            if (JSON.stringify(formData.categoryIds) !== JSON.stringify(initialFormData.categoryIds)) 
              changes.push('Categories');
            if (JSON.stringify(formData.brandIds) !== JSON.stringify(initialFormData.brandIds)) 
              changes.push('Brands');
            
            // ========== INVENTORY ==========
            if (formData.stockQuantity !== initialFormData.stockQuantity) changes.push('Stock');
            if (formData.manageInventory !== initialFormData.manageInventory) changes.push('Inventory Management');
            if (formData.minStockQuantity !== initialFormData.minStockQuantity) changes.push('Min Stock');
            if (formData.allowBackorder !== initialFormData.allowBackorder) changes.push('Backorder');
            if (formData.displayStockAvailability !== initialFormData.displayStockAvailability) 
              changes.push('Stock Display');
            
            // ========== IMAGES & MEDIA ==========
            if (formData.productImages.length !== initialFormData.productImages.length) 
              changes.push('Product Images');
            if (JSON.stringify(formData.videoUrls) !== JSON.stringify(initialFormData.videoUrls)) 
              changes.push('Video URLs');
            
            // ========== SHIPPING ==========
            if (formData.isShipEnabled !== initialFormData.isShipEnabled) changes.push('Shipping Enabled');
            if (formData.weight !== initialFormData.weight) changes.push('Weight');
            if (formData.length !== initialFormData.length) changes.push('Length');
            if (formData.width !== initialFormData.width) changes.push('Width');
            if (formData.height !== initialFormData.height) changes.push('Height');
            if (formData.sameDayDeliveryEnabled !== initialFormData.sameDayDeliveryEnabled) 
              changes.push('Same Day Delivery');
            if (formData.nextDayDeliveryEnabled !== initialFormData.nextDayDeliveryEnabled) 
              changes.push('Next Day Delivery');
            
            // ========== TAX (VAT) ==========
            if (formData.vatExempt !== initialFormData.vatExempt) changes.push('VAT Exempt');
            if (formData.vatRateId !== initialFormData.vatRateId) changes.push('VAT Rate');
            
            // ========== ATTRIBUTES & VARIANTS ==========
            if (JSON.stringify(productAttributes) !== JSON.stringify(initialFormData.attributes || [])) 
              changes.push('Attributes');
            if (JSON.stringify(productVariants) !== JSON.stringify(initialFormData.variants || [])) 
              changes.push('Variants');
            
            // ========== SUBSCRIPTION ==========
            if (formData.isRecurring !== initialFormData.isRecurring) changes.push('Subscription');
            if (formData.recurringCycleLength !== initialFormData.recurringCycleLength) 
              changes.push('Subscription Cycle');
            
            // ========== GROUPED PRODUCTS ==========
            if (formData.requireOtherProducts !== initialFormData.requireOtherProducts) 
              changes.push('Grouped Product');
            if (formData.requiredProductIds !== initialFormData.requiredProductIds) 
              changes.push('Required Products');
            if (formData.groupBundleDiscountType !== initialFormData.groupBundleDiscountType) 
              changes.push('Bundle Discount');
            
            // ========== SEO ==========
            if (formData.metaTitle !== initialFormData.metaTitle) changes.push('Meta Title');
            if (formData.metaDescription !== initialFormData.metaDescription) changes.push('Meta Description');
            if (formData.metaKeywords !== initialFormData.metaKeywords) changes.push('Meta Keywords');
            if (formData.searchEngineFriendlyPageName !== initialFormData.searchEngineFriendlyPageName) 
              changes.push('SEO Slug');
            
            // ========== DISPLAY ==========
            if (formData.showOnHomepage !== initialFormData.showOnHomepage) changes.push('Show on Homepage');
            if (formData.visibleIndividually !== initialFormData.visibleIndividually) changes.push('Visibility');
            if (formData.displayOrder !== initialFormData.displayOrder) changes.push('Display Order');
            
            // ========== CART SETTINGS ==========
            if (formData.orderMinimumQuantity !== initialFormData.orderMinimumQuantity) changes.push('Min Cart Qty');
            if (formData.orderMaximumQuantity !== initialFormData.orderMaximumQuantity) changes.push('Max Cart Qty');
            if (formData.disableBuyButton !== initialFormData.disableBuyButton) changes.push('Buy Button');
            
            // ========== MARK AS NEW ==========
            if (formData.markAsNew !== initialFormData.markAsNew) changes.push('Mark as New');
            
            // ========== RELATED PRODUCTS ==========
            if (JSON.stringify(formData.relatedProducts) !== JSON.stringify(initialFormData.relatedProducts)) 
              changes.push('Related Products');
            if (JSON.stringify(formData.crossSellProducts) !== JSON.stringify(initialFormData.crossSellProducts)) 
              changes.push('Cross-Sell Products');
            
            // ========== ADMIN COMMENT ==========
            if (formData.adminComment !== initialFormData.adminComment) changes.push('Admin Comment');
          }
          
          return changes.length > 0 ? (
            <div className="mb-5 p-4 bg-slate-800/50 border border-slate-700 rounded-xl max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-cyan-400 mb-1.5">
                    Modified Fields ({changes.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {changes.slice(0, 15).map((field, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-md"
                      >
                        {field}
                      </span>
                    ))}
                    {changes.length > 15 && (
                      <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-md font-semibold">
                        +{changes.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Missing Fields Warning */}
        {missingFields.length > 0 && (
          <div className="mb-5 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-300">
                  ⚠️ {missingFields.length} required field{missingFields.length !== 1 ? 's' : ''} missing for publishing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Grid - 2x2 CONSISTENT LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Update Draft Button */}
          <button
            onClick={handleModalSaveDraft}
            disabled={!checkDraftRequirements().isValid || isSubmitting}
            className="group p-4 bg-slate-700 hover:bg-slate-600 border-2 border-transparent hover:border-slate-500 text-left rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-600 group-hover:bg-slate-500 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <Save className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm mb-1">Update Draft</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Save changes and leave. Publish later.
                </p>
              </div>
            </div>
          </button>

          {/* Update Product Button */}
          <button
            onClick={handleModalUpdateProduct}
            disabled={missingFields.length > 0 || isSubmitting}
            className="group p-4 bg-gradient-to-br from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 border-2 border-transparent hover:border-violet-400 text-left rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 group-hover:bg-white/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm mb-1">Update Product</h4>
                <p className="text-xs text-white/80 leading-relaxed">
                  {missingFields.length > 0 
                    ? `${missingFields.length} field${missingFields.length !== 1 ? 's' : ''} required`
                    : 'Publish changes and leave'
                  }
                </p>
              </div>
            </div>
          </button>

          {/* Discard Changes Button */}
          <button
            onClick={handleModalDiscard}
            disabled={isSubmitting}
            className="group p-4 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 text-left rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500/20 group-hover:bg-red-500/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-red-400 text-sm mb-1">Discard Changes</h4>
                <p className="text-xs text-red-300/70 leading-relaxed">
                  Leave without saving. All changes lost.
                </p>
              </div>
            </div>
          </button>

          {/* Stay on Page Button */}
          <button
            onClick={handleModalCancel}
            disabled={isSubmitting}
            className="group p-4 bg-slate-800/50 hover:bg-slate-700/50 border-2 border-slate-700 hover:border-slate-600 text-left rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-700 group-hover:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-300 text-sm mb-1">Stay on Page</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Continue editing. Don't leave yet.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="px-6 py-3 bg-slate-800/30 rounded-b-2xl border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">
          💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to stay on page
        </p>
      </div>
    </div>
  </div>
)}


    </div>
  );
}
