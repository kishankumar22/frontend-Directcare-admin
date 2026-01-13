"use client";
import { useState, useRef, useEffect, JSX, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, X, Info, Search, Image, Package,
  Tag,  Globe,  Truck,
 PoundSterling, Link as LinkIcon, ShoppingCart, Video,
  Play,
  Plus,
  Settings,
  ChevronDown
} from "lucide-react";
import Link from "next/link"
import { ProductDescriptionEditor } from "@/app/admin/products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";

import {  BrandApiResponse, brandsService, categoriesService, CategoryApiResponse, CategoryData, DropdownsData, ProductAttribute, ProductImage, ProductItem, ProductsApiResponse, productsService, ProductVariant, SimpleProduct,  VATRateData } from '@/lib/services';
import { GroupedProductModal } from '../GroupedProductModal';
import { MultiBrandSelector } from "../MultiBrandSelector";
import { VATRateApiResponse, vatratesService } from "@/lib/services/vatrates";
import { MultiCategorySelector } from "../MultiCategorySelector";
import { API_BASE_URL } from "@/lib/api-config";



export default function AddProductPage() {
  const router = useRouter();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
// ✅ Variant SKU Validation States
const [checkingVariantSku, setCheckingVariantSku] = useState<Record<string, boolean>>({});
const [variantSkuErrors, setVariantSkuErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
  // ✅ Check for variant SKU errors before submitting
const hasVariantSkuErrors = Object.keys(variantSkuErrors).length > 0;
const hasCheckingVariantSku = Object.values(checkingVariantSku).some(checking => checking);

if (hasVariantSkuErrors) {
  toast.error("Please fix variant SKU errors before saving");
  return;
}

if (hasCheckingVariantSku) {
  toast.error("Please wait while we validate variant SKUs");
  return;
}

// Add this to your component state
const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, sku: string, price: string}>>([]);
const [uploadingImages, setUploadingImages] = useState(false);
const [vatSearch, setVatSearch] = useState('');
const [showVatDropdown, setShowVatDropdown] = useState(false);
const [dropdownsData, setDropdownsData] = useState<DropdownsData>({
  brands: [],
  categories: [],
  vatRates: []  // ✅ Add this
});
 // ✅ ADD THIS STATE FOR MODAL
  const [isGroupedModalOpen, setIsGroupedModalOpen] = useState(false);
// ✅ ADD THESE TWO STATES
const [simpleProducts, setSimpleProducts] = useState<SimpleProduct[]>([]);
const [selectedGroupedProducts, setSelectedGroupedProducts] = useState<string[]>([]);
// ✅ ADD THESE STATES AFTER YOUR OTHER useState DECLARATIONS

// Homepage Count State
const [homepageCount, setHomepageCount] = useState<number | null>(null);
const MAX_HOMEPAGE = 20;
// ✅ DEBOUNCE UTILITY FUNCTION - Add at TOP of file (after imports)
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// Updated combined useEffect with manufacturers API
useEffect(() => {
  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all data (dropdowns + products)...');
      
      const [
        brandsResponse, 
        categoriesResponse, 
        vatRatesResponse,
        allProductsResponse,
        simpleProductsResponse
      ] = await Promise.all([
        // Direct API calls (unchanged)
        brandsService.getAll({ includeInactive: true }),
        categoriesService.getAll({ includeInactive: true, includeSubCategories: true }),
        vatratesService.getAll(),
        
        // ✅ SERVICE-BASED (changed)
        productsService.getAll({ pageSize: 100 }),
        productsService.getAll({ productType: 'simple', pageSize: 100 })
      ]);

      console.log('✅ All data fetched');

      // ==================== DROPDOWNS (unchanged) ====================
      const brandsData = (brandsResponse.data as BrandApiResponse)?.data || [];
      const categoriesData = (categoriesResponse.data as CategoryApiResponse)?.data || [];
      const vatRatesData = (vatRatesResponse.data as VATRateApiResponse)?.data || [];

      setDropdownsData({
        brands: brandsData,
        categories: categoriesData,
        vatRates: vatRatesData
      });

      console.log('📊 Dropdowns:', {
        brands: brandsData.length,
        categories: categoriesData.length,
        vat: vatRatesData.length
      });

      // ==================== SIMPLE PRODUCTS (service-based) ====================
      const extractProducts = (response: any): any[] => {
        const data = response?.data?.data || response?.data || {};
        return data.items || (Array.isArray(data) ? data : []);
      };

      const simpleItems = extractProducts(simpleProductsResponse);
      if (simpleItems.length > 0) {
        setSimpleProducts(simpleItems.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price || 0,
          stockQuantity: p.stockQuantity || 0
        })));
        console.log('✅ Simple products:', simpleItems.length);
      }

      // ==================== ALL PRODUCTS (service-based) ====================
      const allItems = extractProducts(allProductsResponse);
      if (allItems.length > 0) {
        setAvailableProducts(allItems.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: `₹${(p.price || 0).toFixed(2)}`
        })));
        console.log('✅ Available products:', allItems.length);
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast.error('Failed to load data');
      setAvailableProducts([]);
    }
  };

  fetchAllData();
}, []);

 const [formData, setFormData] = useState({
  // ===== BASIC INFO =====
  name: '',
  shortDescription: '',
  fullDescription: '',
  sku: '',
  // ✅ NEW - Add this:
  categoryIds: [] as string[], // Multiple categories array
  brand: '', // For backward compatibility (primary brand)
  brandIds: [] as string[], // ✅ NEW - Multiple brands array
  
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
  // ✅ ADD THESE NEW DELIVERY FIELDS
  sameDayDeliveryEnabled: false,
  nextDayDeliveryEnabled: false,
  standardDeliveryEnabled: true,
  sameDayDeliveryCutoffTime: '',
  nextDayDeliveryCutoffTime: '',
  standardDeliveryDays: '5',
  sameDayDeliveryCharge: '',
  nextDayDeliveryCharge: '',
  standardDeliveryCharge: '',

  // ===== RELATED PRODUCTS =====
  relatedProducts: [] as string[],
  crossSellProducts: [] as string[],
    // ✅ ADD THESE NEW BUNDLE DISCOUNT FIELDS
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
  
  // ✅ NOTIFICATION FIELDS - UPDATED
  notifyAdminForQuantityBelow: true,  // ✅ Backend boolean (always true)
notifyQuantityBelow: "",          // ✅ User input threshold
  
  // ✅ BACKORDER FIELDS - UPDATED
  allowBackorder: false,              // ✅ Checkbox
  backorderMode: 'no-backorders',     // ✅ Dropdown (conditional)
  backorders: 'no-backorders',        // ✅ Keep for backward compatibility
  
  allowBackInStockSubscriptions: false,
  productAvailabilityRange: '',
  
  // Cart Limits
  minCartQuantity: '1',
  maxCartQuantity: '10',
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
   metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  searchEngineFriendlyPageName: '',
});




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

// Filter VAT rates based on search
const filteredVATRates = dropdownsData.vatRates.filter(vat =>
  vat.name.toLowerCase().includes(vatSearch.toLowerCase()) ||
  vat.rate.toString().includes(vatSearch)
);

  const removeRelatedProduct = (productId: string) => {
    setFormData({
      ...formData,
      relatedProducts: formData.relatedProducts.filter(id => id !== productId)
    });
  };


// ==================== SKU VALIDATION (COMPLETE - SERVICE-BASED) ====================
const [skuError, setSkuError] = useState<string>('');
const [checkingSku, setCheckingSku] = useState<boolean>(false);

const checkSkuExists = async (sku: string): Promise<boolean> => {
  // Validation
  if (!sku || sku.length < 2) {
    setSkuError('');
    return false;
  }

  setCheckingSku(true);

  try {
    console.log('🔍 Checking SKU:', sku);

    // ✅ USE SERVICE with search filter
    const response = await productsService.getAll({ 
      search: sku,
      pageSize: 100 // Get enough results
    });

    console.log('📥 Response:', response);

    // ✅ SAFE DATA EXTRACTION
    let products: any[] = [];

    try {
      // Try different response structures
      if (response.data) {
        // Structure 1: response.data.data.items (most common)
        if (typeof response.data === 'object' && 'data' in response.data) {
          const nestedData = (response.data as any).data;
          if (nestedData && typeof nestedData === 'object') {
            if ('items' in nestedData && Array.isArray(nestedData.items)) {
              products = nestedData.items;
            } else if (Array.isArray(nestedData)) {
              products = nestedData;
            }
          }
        }
        // Structure 2: response.data (direct array)
        else if (Array.isArray(response.data)) {
          products = response.data;
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing products:', parseError);
      products = [];
    }

    console.log('📦 Found products:', products.length);

    // ✅ SAFE SKU CHECK
    const exists = products.some((p: any) => {
      if (!p || typeof p !== 'object' || !p.sku) return false;
      return p.sku.toLowerCase() === sku.toLowerCase();
    });

    if (exists) {
      setSkuError('⚠️ SKU already exists');
      console.warn('❌ SKU conflict:', sku);
      return true;
    } else {
      setSkuError('');
      console.log('✅ SKU available:', sku);
      return false;
    }
  } catch (error: any) {
    console.error('❌ SKU check error:', error);
    
    // Don't show error to user, just log it
    setSkuError('');
    
    // On error, allow submission (don't block user)
    return false;
  } finally {
    setCheckingSku(false);
  }
};
// ✅ ADD THIS FUNCTION AFTER checkSkuExists FUNCTION

const getHomepageCount = async () => {
  try {
    const res = await productsService.getAll({ pageSize: 100 });
    const products = res.data?.data?.items || [];
    const count = products.filter((p: any) => p.showOnHomepage).length;
    setHomepageCount(count);
    console.log(`📊 Homepage products count: ${count}/${MAX_HOMEPAGE}`);
  } catch (e) {
    console.error('❌ Error fetching homepage count:', e);
    setHomepageCount(null);
  }
};

// ==================== DEBOUNCED SKU CHECK ====================
useEffect(() => {
  const timer = setTimeout(() => {
    if (formData.sku && formData.sku.length >= 2) {
      checkSkuExists(formData.sku);
    } else {
      setSkuError('');
      setCheckingSku(false);
    }
  }, 800); // Check after 800ms of typing

  return () => {
    clearTimeout(timer);
  };
}, [formData.sku]);


const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
  e.preventDefault();

  const target = e.target as HTMLElement;
  if (target.hasAttribute('data-submitting')) {
    toast.info('⏳ Already submitting... Please wait!');
    return;
  }
  target.setAttribute('data-submitting', 'true');

  try {
    console.log('🚀 ==================== PRODUCT SUBMISSION START ====================');
    console.log('📋 Form Mode:', isDraft ? 'DRAFT' : 'PUBLISH');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: BASIC VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    // ✅ 1.1 Required Fields
    if (!formData.name || !formData.sku) {
      toast.warning('⚠️ Please fill in required fields: Product Name and SKU');
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ 1.2 NAME VALIDATION
    const nameRegex = /^[A-Za-z0-9\s\-.,()'/]+$/;
    if (!nameRegex.test(formData.name)) {
      toast.error("⚠️ Invalid product name. Special characters like @, #, $, % are not allowed.");
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ 1.3 SKU VALIDATION (Length)
    if (formData.sku.length < 2) {
      toast.error('⚠️ SKU must be at least 2 characters long.');
      target.removeAttribute('data-submitting');
      return;
    }
    
    // ✅ 1.4 SKU VALIDATION (Uniqueness)
    const skuExists = await checkSkuExists(formData.sku);
    if (skuExists) {
      toast.error('❌ SKU already exists. Please use a unique SKU.');
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ 1.5 PRICE VALIDATION
    if (formData.price && parseFloat(formData.price.toString()) < 0) {
      toast.error('⚠️ Price cannot be negative.');
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ 1.6 STOCK VALIDATION
    if (formData.manageInventory === 'track') {
      const stock = parseInt(formData.stockQuantity.toString());
      if (isNaN(stock) || stock < 0) {
        toast.error('⚠️ Stock quantity must be a valid non-negative number.');
        target.removeAttribute('data-submitting');
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: HOMEPAGE VALIDATION (NEW)
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.showOnHomepage) {
      if (homepageCount !== null && homepageCount >= MAX_HOMEPAGE) {
        toast.error(
          `❌ Maximum ${MAX_HOMEPAGE} products can be shown on homepage. Current: ${homepageCount}`,
          { autoClose: 8000 }
        );
        target.removeAttribute('data-submitting');
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: GROUPED PRODUCT VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.productType === 'grouped' && formData.requireOtherProducts) {
      if (!formData.requiredProductIds || formData.requiredProductIds.trim() === '') {
        toast.error('⚠️ Please select at least one product for grouped product.');
        target.removeAttribute('data-submitting');
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: BUNDLE DISCOUNT VALIDATION
    // ═══════════════════════════════════════════════════════════════════════

    if (formData.productType === 'grouped' && formData.groupBundleDiscountType !== 'None') {
      if (formData.groupBundleDiscountType === 'Percentage') {
        const percentage = formData.groupBundleDiscountPercentage;
        if (percentage < 0 || percentage > 100) {
          toast.error('❌ Discount percentage must be between 0 and 100');
          target.removeAttribute('data-submitting');
          return;
        }
      }
      
      if (formData.groupBundleDiscountType === 'FixedAmount') {
        const amount = formData.groupBundleDiscountAmount;
        if (amount < 0) {
          toast.error('❌ Discount amount cannot be negative');
          target.removeAttribute('data-submitting');
          return;
        }
      }
      
      if (formData.groupBundleDiscountType === 'SpecialPrice') {
        const specialPrice = formData.groupBundleSpecialPrice;
        if (specialPrice < 0) {
          toast.error('❌ Special price cannot be negative');
          target.removeAttribute('data-submitting');
          return;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: COMPLETE VARIANT VALIDATION (PRODUCTION-READY)
    // ═══════════════════════════════════════════════════════════════════════

    if (productVariants.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 SECTION 20: VARIANT VALIDATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // ✅ 5.1 Check Empty Name/SKU/Price
      for (const variant of productVariants) {
        if (!variant.name || !variant.name.trim()) {
          toast.error(`❌ All variants must have a name`);
          target.removeAttribute('data-submitting');
          return;
        }

        if (!variant.sku || !variant.sku.trim()) {
          toast.error(`❌ Variant "${variant.name}" must have a SKU`);
          target.removeAttribute('data-submitting');
          return;
        }

        const variantPrice = parseFloat(variant.price?.toString() || '0');
        if (variantPrice < 0) {
          toast.error(`❌ Variant "${variant.name}" has invalid price`);
          target.removeAttribute('data-submitting');
          return;
        }
      }

      // ✅ 5.2 Check Duplicate SKUs Within Product
      const variantSkus = productVariants.map(v => v.sku.toUpperCase());
      const duplicateVariant = variantSkus.find((sku, index) => variantSkus.indexOf(sku) !== index);
      
      if (duplicateVariant) {
        const duplicateVariantName = productVariants.find(
          v => v.sku.toUpperCase() === duplicateVariant
        )?.name;
        toast.error(
          `❌ Duplicate SKU "${duplicateVariant}" found in variant "${duplicateVariantName}"`,
          { autoClose: 8000 }
        );
        target.removeAttribute('data-submitting');
        return;
      }

      // ✅ 5.3 Check Variant SKU Matches Product SKU
      for (const variant of productVariants) {
        if (variant.sku.toUpperCase() === formData.sku.toUpperCase()) {
          toast.error(
            `❌ Variant "${variant.name}" SKU cannot be same as main product SKU`,
            { autoClose: 8000 }
          );
          target.removeAttribute('data-submitting');
          return;
        }
      }

      // ✅ 5.4 Check Against Database (Products + Variants)
      try {
        console.log('🔍 Validating variant SKUs against database...');
        const allProductsResponse = await productsService.getAll({ pageSize: 100 });
        const allProducts = allProductsResponse.data?.data?.items || [];

        for (const variant of productVariants) {
          const variantSkuUpper = variant.sku.toUpperCase();

          // Check against product SKUs
          const productSkuConflict = allProducts.find(
            (p: any) => p.sku?.toUpperCase() === variantSkuUpper
          );
          
          if (productSkuConflict) {
            toast.error(
              `❌ Variant "${variant.name}" SKU conflicts with product "${productSkuConflict.name}"`,
              { autoClose: 8000 }
            );
            target.removeAttribute('data-submitting');
            return;
          }

          // Check against variant SKUs
          for (const product of allProducts) {
            if (product.variants && Array.isArray(product.variants)) {
              const variantSkuConflict = product.variants.find(
                (v: any) => v.sku?.toUpperCase() === variantSkuUpper
              );
              
              if (variantSkuConflict) {
                toast.error(
                  `❌ Variant "${variant.name}" SKU conflicts with "${product.name}" - Variant "${variantSkuConflict.name}"`,
                  { autoClose: 8000 }
                );
                target.removeAttribute('data-submitting');
                return;
              }
            }
          }
        }

        console.log('✅ All variant SKUs are unique!');
      } catch (error) {
        console.warn('⚠️ Failed to validate variant SKUs against database:', error);
        toast.warning('⚠️ Could not verify variant SKUs. Proceeding...', { autoClose: 3000 });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: SHOW LOADING TOAST
    // ═══════════════════════════════════════════════════════════════════════

    const loadingId = toast.info(
      isDraft ? '💾 Saving as draft...' : '🔄 Creating product...'
    );

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: CATEGORY VALIDATION & PROCESSING
    // ═══════════════════════════════════════════════════════════════════════

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let categoryIdsArray: string[] = [];

    if (formData.categoryIds && Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0) {
      categoryIdsArray = formData.categoryIds.filter(id => {
        if (!id || typeof id !== 'string') return false;
        return guidRegex.test(id.trim());
      });
    }

    // Validation
    if (categoryIdsArray.length === 0) {
      console.error('❌ [VALIDATION] No valid categories selected');
      toast.error('❌ Please select at least one category');
      target.removeAttribute('data-submitting');
      toast.dismiss(loadingId);
      return;
    }

    console.log('✅ [VALIDATION] Categories validated:', categoryIdsArray);

    // Create categories array with displayOrder
    const categoriesArray = categoryIdsArray.map((categoryId, index) => ({
      categoryId: categoryId,
      isPrimary: index === 0,
      displayOrder: index + 1
    }));

    console.log('📁 Categories:', {
      primary: categoryIdsArray[0],
      all: categoryIdsArray,
      array: categoriesArray
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: BRAND VALIDATION & PROCESSING
    // ═══════════════════════════════════════════════════════════════════════

    let brandIdsArray: string[] = [];

    // Check if brandIds array exists (new multi-brand format)
    if (formData.brandIds && Array.isArray(formData.brandIds) && formData.brandIds.length > 0) {
      brandIdsArray = formData.brandIds.filter(id => {
        if (!id || typeof id !== 'string') return false;
        return guidRegex.test(id.trim());
      });
      console.log('✅ Using brandIds array (new format):', brandIdsArray);
    } 
    // Fallback to single brand (legacy format)
    else if (formData.brand && formData.brand.trim()) {
      const trimmedBrand = formData.brand.trim();
      if (guidRegex.test(trimmedBrand)) {
        brandIdsArray = [trimmedBrand];
        console.log('✅ Using single brand (legacy):', brandIdsArray);
      }
    }

    // Validate: At least one brand required
    if (brandIdsArray.length === 0) {
      toast.error('❌ Please select at least one brand');
      target.removeAttribute('data-submitting');
      toast.dismiss(loadingId);
      return;
    }

    // BUILD BRANDS ARRAY - Required by backend
    const brandsArray = brandIdsArray.map((brandId, index) => ({
      brandId: brandId,
      isPrimary: index === 0,      // First brand is primary
      displayOrder: index + 1      // 1-based ordering
    }));

    console.log('🏷️ Final brands array:', brandsArray);
    console.log('🏷️ Primary brand:', brandIdsArray[0]);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 9: ATTRIBUTES & VARIANTS PROCESSING
    // ═══════════════════════════════════════════════════════════════════════

    const attributesArray = productAttributes
      .filter(attr => attr.name && attr.value)
      .map(attr => ({
        id: attr.id,
        name: attr.name,
        value: attr.value,
        displayName: attr.name,
        sortOrder: attr.displayOrder || 1
      }));
    
    console.log('📝 Attributes count:', attributesArray.length);

    const variantsArray = productVariants.map(variant => ({
      name: variant.name,
      sku: variant.sku,
      price: parseFloat(variant.price?.toString() ?? "0") || 0,
      compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice.toString()) : null,
      weight: variant.weight ? parseFloat(variant.weight.toString()) : null,
      stockQuantity: parseInt(variant.stockQuantity.toString()) || 0,
      trackInventory: variant.trackInventory ?? true,
      option1Name: variant.option1Name || null,
      option1Value: variant.option1Value || null,
      option2Name: variant.option2Name || null,
      option2Value: variant.option2Value || null,
      option3Name: variant.option3Name || null,
      option3Value: variant.option3Value || null,
      imageUrl: null,
      isDefault: variant.isDefault || false,
      displayOrder: variant.displayOrder || 0,
      isActive: variant.isActive ?? true
    }));

    console.log('🎨 Variants count:', variantsArray.length);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 10: BUILD COMPLETE PRODUCT DATA
    // ═══════════════════════════════════════════════════════════════════════

    const productData: any = {
      // Basic Info
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || `${formData.name} - Product description`,
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      displayOrder: parseInt(formData.displayOrder.toString()) || 1,

      // Status & Visibility
      isPublished: isDraft ? false : (formData.published ?? true),
      status: isDraft ? 1 : (formData.published ? 2 : 1),
      visibleIndividually: formData.visibleIndividually ?? true,
      showOnHomepage: formData.showOnHomepage ?? false,

      // Product Type & Grouped Product Configuration
      productType: formData.productType || 'simple',
      requireOtherProducts: formData.productType === 'grouped' ? formData.requireOtherProducts : false,
      requiredProductIds: formData.productType === 'grouped' && formData.requireOtherProducts && formData.requiredProductIds?.trim()
        ? formData.requiredProductIds.trim()
        : null,
      automaticallyAddProducts: formData.productType === 'grouped' && formData.requireOtherProducts 
        ? formData.automaticallyAddProducts 
        : false,

      // BUNDLE DISCOUNT FIELDS
      groupBundleDiscountType: formData.productType === 'grouped' 
        ? formData.groupBundleDiscountType 
        : 'None',
      groupBundleDiscountPercentage: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'Percentage'
        ? formData.groupBundleDiscountPercentage
        : null,
      groupBundleDiscountAmount: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'FixedAmount'
        ? formData.groupBundleDiscountAmount
        : null,
      groupBundleSpecialPrice: formData.productType === 'grouped' && formData.groupBundleDiscountType === 'SpecialPrice'
        ? formData.groupBundleSpecialPrice
        : null,
      groupBundleSavingsMessage: formData.productType === 'grouped' && formData.groupBundleDiscountType !== 'None'
        ? formData.groupBundleSavingsMessage?.trim() || null
        : null,
      showIndividualPrices: formData.productType === 'grouped' 
        ? formData.showIndividualPrices 
        : true,
      applyDiscountToAllItems: formData.productType === 'grouped' && formData.groupBundleDiscountType !== 'None'
        ? formData.applyDiscountToAllItems 
        : false,

      // Pricing
      price: parseFloat(formData.price.toString()) || 0,

      // BRANDS - Complete format
      brandId: brandIdsArray[0],     // Primary brand (legacy)
      brandIds: brandIdsArray,       // Array of GUIDs (new)
      brands: brandsArray,           // Objects array (REQUIRED)

      // CATEGORIES - Complete format
      categoryId: categoryIdsArray[0], // Primary category (legacy)
      categoryIds: categoryIdsArray,   // All category IDs
      categories: categoriesArray,     // Full category objects

      // INVENTORY
      stockQuantity: parseInt(formData.stockQuantity.toString()) || 0,
      trackQuantity: formData.manageInventory === 'track',
      manageInventoryMethod: formData.manageInventory,
      minStockQuantity: parseInt(formData.minStockQuantity.toString()) || 0,
      
      // NOTIFICATION
      notifyAdminForQuantityBelow: formData.notifyAdminForQuantityBelow ?? false,
      notifyQuantityBelow: formData.notifyAdminForQuantityBelow 
      ? (parseInt(formData.notifyQuantityBelow.toString()) || 10)  // Better fallback
      : null,
      
      // Display Settings
      displayStockAvailability: formData.displayStockAvailability,
      displayStockQuantity: formData.displayStockQuantity,
      
      // BACKORDER
      allowBackorder: formData.allowBackorder ?? false,
      backorderMode: formData.backorderMode || 'no-backorders',
      allowBackInStockSubscriptions: formData.allowBackInStockSubscriptions,
      
      // Cart Quantities
      orderMinimumQuantity: parseInt(formData.minCartQuantity.toString()) || 1,
      orderMaximumQuantity: parseInt(formData.maxCartQuantity.toString()) || 10000,
      allowedQuantities: formData.allowedQuantities?.trim() || null,
      
      // Other Inventory
      lowStockActivity: formData.lowStockActivity || null,
      productAvailabilityRange: formData.productAvailabilityRange || null,
      notReturnable: formData.notReturnable ?? false,

      // Attributes & Variants
      attributes: attributesArray.length > 0 ? attributesArray : [],
      variants: variantsArray.length > 0 ? variantsArray : [],
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 11: OPTIONAL FIELDS
    // ═══════════════════════════════════════════════════════════════════════

    // Optional Basic Fields
    if (formData.gtin?.trim()) productData.gtin = formData.gtin.trim();
    if (formData.manufacturerPartNumber?.trim()) productData.manufacturerPartNumber = formData.manufacturerPartNumber.trim();
    if (formData.adminComment?.trim()) productData.adminComment = formData.adminComment.trim();
   // TO THIS:
if (formData.gender?.trim()) {
  productData.gender = formData.gender.trim();
} else {
  // Explicitly send empty to prevent backend default
  productData.gender = "";
}

    // Pricing - Optional
    if (formData.oldPrice) productData.oldPrice = parseFloat(formData.oldPrice.toString());
    if (formData.oldPrice) productData.compareAtPrice = parseFloat(formData.oldPrice.toString());
    if (formData.cost) productData.costPrice = parseFloat(formData.cost.toString());

    // Buttons
    if (formData.disableBuyButton) productData.disableBuyButton = true;
    if (formData.disableWishlistButton) productData.disableWishlistButton = true;

    // Base Price
    if (formData.basepriceEnabled) {
      productData.basepriceEnabled = true;
      if (formData.basepriceAmount) productData.basepriceAmount = parseFloat(formData.basepriceAmount.toString());
      if (formData.basepriceUnit) productData.basepriceUnit = formData.basepriceUnit;
      if (formData.basepriceBaseAmount) productData.basepriceBaseAmount = parseFloat(formData.basepriceBaseAmount.toString());
      if (formData.basepriceBaseUnit) productData.basepriceBaseUnit = formData.basepriceBaseUnit;
    }

    // Mark as New
    if (formData.markAsNew) {
      productData.markAsNew = true;
      if (formData.markAsNewStartDate) productData.markAsNewStartDate = formData.markAsNewStartDate;
      if (formData.markAsNewEndDate) productData.markAsNewEndDate = formData.markAsNewEndDate;
    }

    // Pre-order
    if (formData.availableForPreOrder) {
      productData.availableForPreOrder = true;
      if (formData.preOrderAvailabilityStartDate) {
        productData.preOrderAvailabilityStartDate = formData.preOrderAvailabilityStartDate;
      }
    }

    // Availability Dates
    if (formData.availableStartDate) productData.availableStartDate = formData.availableStartDate;
    if (formData.availableEndDate) productData.availableEndDate = formData.availableEndDate;

    // VAT
// Always send VAT settings to prevent backend defaults
if (formData.vatExempt === true) {
  productData.vatExempt = true;
  // Don't send vatRateId if exempt
} else {
  productData.vatExempt = false;  // Explicitly false
  if (formData.vatRateId && formData.vatRateId.trim()) {
    productData.vatRateId = formData.vatRateId;
  }
}

    // Shipping & Delivery
    if (formData.isShipEnabled) {
      productData.requiresShipping = true;
    }
    if (formData.shipSeparately) {
      productData.shipSeparately = true;
    }
    if (formData.weight) {
      productData.weight = parseFloat(formData.weight.toString());
    }
    if (formData.length) {
      productData.length = parseFloat(formData.length.toString());
    }
    if (formData.width) {
      productData.width = parseFloat(formData.width.toString());
    }
    if (formData.height) {
      productData.height = parseFloat(formData.height.toString());
    }

    // Delivery Options
    if (formData.sameDayDeliveryEnabled !== undefined) {
      productData.sameDayDeliveryEnabled = formData.sameDayDeliveryEnabled;
    }
    if (formData.nextDayDeliveryEnabled !== undefined) {
      productData.nextDayDeliveryEnabled = formData.nextDayDeliveryEnabled;
    }
    if (formData.standardDeliveryEnabled !== undefined) {
      productData.standardDeliveryEnabled = formData.standardDeliveryEnabled;
    }
    if (formData.sameDayDeliveryCutoffTime?.trim()) {
      productData.sameDayDeliveryCutoffTime = formData.sameDayDeliveryCutoffTime.trim();
    }
    if (formData.nextDayDeliveryCutoffTime?.trim()) {
      productData.nextDayDeliveryCutoffTime = formData.nextDayDeliveryCutoffTime.trim();
    }
    if (formData.standardDeliveryDays) {
      productData.standardDeliveryDays = parseInt(formData.standardDeliveryDays) || 5;
    }
    if (formData.sameDayDeliveryCharge) {
      productData.sameDayDeliveryCharge = parseFloat(formData.sameDayDeliveryCharge.toString()) || 0;
    }
    if (formData.nextDayDeliveryCharge) {
      productData.nextDayDeliveryCharge = parseFloat(formData.nextDayDeliveryCharge.toString()) || 0;
    }
    if (formData.standardDeliveryCharge) {
      productData.standardDeliveryCharge = parseFloat(formData.standardDeliveryCharge.toString()) || 0;
    }

    // Pack Product
    if (formData.isPack) {
      productData.isPack = true;
      if (formData.packSize) productData.packSize = parseInt(formData.packSize.toString());
    }

    // Recurring/Subscription
    if (formData.isRecurring) {
      productData.isRecurring = true;
      if (formData.recurringCycleLength) productData.recurringCycleLength = parseInt(formData.recurringCycleLength.toString());
      if (formData.recurringCyclePeriod) productData.recurringCyclePeriod = formData.recurringCyclePeriod;
      if (formData.recurringTotalCycles) productData.recurringTotalCycles = parseInt(formData.recurringTotalCycles.toString());
      if (formData.subscriptionDiscountPercentage) productData.subscriptionDiscountPercentage = parseFloat(formData.subscriptionDiscountPercentage.toString());
      if (formData.allowedSubscriptionFrequencies) productData.allowedSubscriptionFrequencies = formData.allowedSubscriptionFrequencies;
      if (formData.subscriptionDescription) productData.subscriptionDescription = formData.subscriptionDescription;
    }

    // Rental
    if (formData.isRental) {
      productData.isRental = true;
      if (formData.rentalPriceLength) productData.rentalPriceLength = parseInt(formData.rentalPriceLength.toString());
      if (formData.rentalPricePeriod) productData.rentalPricePeriod = formData.rentalPricePeriod;
    }

    // Gift Card
    if (formData.isGiftCard) {
      productData.isGiftCard = true;
      if (formData.giftCardType) productData.giftCardType = formData.giftCardType;
      if (formData.overriddenGiftCardAmount) productData.overriddenGiftCardAmount = parseFloat(formData.overriddenGiftCardAmount.toString());
    }

    // Downloadable
    if (formData.isDownload) {
      productData.isDownload = true;
      if (formData.downloadId) productData.downloadId = formData.downloadId;
      productData.unlimitedDownloads = formData.unlimitedDownloads;
      if (!formData.unlimitedDownloads && formData.maxNumberOfDownloads) {
        productData.maxNumberOfDownloads = parseInt(formData.maxNumberOfDownloads.toString());
      }
      if (formData.downloadExpirationDays) productData.downloadExpirationDays = parseInt(formData.downloadExpirationDays.toString());
      if (formData.downloadActivationType) productData.downloadActivationType = formData.downloadActivationType;
      if (formData.hasUserAgreement) {
        productData.hasUserAgreement = true;
        if (formData.userAgreementText) productData.userAgreementText = formData.userAgreementText;
      }
      if (formData.hasSampleDownload && formData.sampleDownloadId) {
        productData.hasSampleDownload = true;
        productData.sampleDownloadId = formData.sampleDownloadId;
      }
    }

    // SEO
    if (formData.metaTitle?.trim()) productData.metaTitle = formData.metaTitle.trim();
    if (formData.metaDescription?.trim()) productData.metaDescription = formData.metaDescription.trim();
    if (formData.metaKeywords?.trim()) productData.metaKeywords = formData.metaKeywords.trim();
    if (formData.searchEngineFriendlyPageName?.trim()) {
      productData.searchEngineFriendlyPageName = formData.searchEngineFriendlyPageName.trim();
    }

    // Related Products
    if (Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0) {
      productData.relatedProductIds = formData.relatedProducts.join(',');
    }
    if (Array.isArray(formData.crossSellProducts) && formData.crossSellProducts.length > 0) {
      productData.crossSellProductIds = formData.crossSellProducts.join(',');
    }

    // Tags
    if (formData.productTags?.trim()) productData.tags = formData.productTags.trim();

    // Videos
    if (Array.isArray(formData.videoUrls) && formData.videoUrls.length > 0) {
      productData.videoUrls = formData.videoUrls.join(',');
    }

    // Reviews
    if (formData.allowCustomerReviews) productData.allowCustomerReviews = true;

    console.log('📦 ==================== FINAL PAYLOAD ====================');
    console.log(JSON.stringify(productData, null, 2));
    console.log('🏷️ brandId (primary):', productData.brandId);
    console.log('🏷️ brandIds (array):', productData.brandIds);
    console.log('🏷️ brands (objects):', productData.brands);
    console.log('🎁 Bundle Discount:', {
      type: productData.groupBundleDiscountType,
      percentage: productData.groupBundleDiscountPercentage,
      amount: productData.groupBundleDiscountAmount,
      specialPrice: productData.groupBundleSpecialPrice
    });
    console.log('📦 ==================== END PAYLOAD ====================');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 12: CREATE PRODUCT
    // ═══════════════════════════════════════════════════════════════════════

    console.log('🚀 Creating product using service...');
    const response = await productsService.create(productData);

    console.log('✅ Product created successfully');
    console.log('📥 Response:', response);

    toast.dismiss(loadingId);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 13: EXTRACT PRODUCT ID
    // ═══════════════════════════════════════════════════════════════════════

    const productId: string | null = 
      (response.data as any)?.data?.id ||
      (response.data as any)?.id ||
      (response as any)?.id ||
      null;

    console.log('🆔 Extracted Product ID:', productId);

    if (!productId) {
      console.error('❌ Failed to extract product ID from response');
      toast.error('❌ Product created but ID not found. Cannot upload images.');
      router.push('/admin/products');
      return;
    }

    console.log('✅ Product ID confirmed:', productId);

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 14: UPLOAD PRODUCT IMAGES
    // ═══════════════════════════════════════════════════════════════════════


// if (!formData.productImages || formData.productImages.length < 5) {
//   toast.error("❌ Please upload at least 5 product images before saving");
//   return;
// }

const imagesToUpload = formData.productImages.filter(img => img.file);

if (imagesToUpload.length > 0) {
  console.log(`📤 Uploading ${imagesToUpload.length} product images...`);

  try {
    const uploadedImages = await uploadImagesToProduct(productId, imagesToUpload);

    if (uploadedImages && uploadedImages.length > 0) {
      console.log('✅ Product images uploaded:', uploadedImages.length);
    }
  } catch (imageError) {
    console.error('❌ Error uploading product images:', imageError);
    toast.warning('⚠️ Product created but some images failed to upload.');
  }
}


    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 15: UPLOAD VARIANT IMAGES
    // ═══════════════════════════════════════════════════════════════════════

    if (productVariants.length > 0) {
      const variantsWithImages = productVariants.filter(v => v.imageFile);
      
      if (variantsWithImages.length > 0) {
        console.log(`🖼️ Uploading ${variantsWithImages.length} variant images...`);
        
        try {
          const createdVariants = (response.data as any)?.data?.variants || 
                                 (response.data as any)?.variants ||
                                 [];
          
          if (createdVariants.length > 0) {
            await uploadVariantImages({ variants: createdVariants });
          } else {
            console.warn('⚠️ No variants found in response');
          }
        } catch (variantError) {
          console.error('❌ Error uploading variant images:', variantError);
          toast.warning('⚠️ Some variant images failed to upload.');
        }
      }
    }

    console.log('✅ ==================== PRODUCT SUBMISSION SUCCESS ====================');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 16: SUCCESS & NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════

    toast.success(
      isDraft 
        ? '💾 Product saved as draft!' 
        : '✅ Product created successfully!',
      { autoClose: 3000 }
    );

    setTimeout(() => {
      router.push('/admin/products');
    }, 1000);

  } catch (error: any) {
    console.error('❌ ==================== ERROR SUBMITTING FORM ====================');
    console.error('Error object:', error);
    
    if (error.response) {
      const errorData = error.response.data;
      const status = error.response.status;
      
      console.error('📋 Error details:', {
        status,
        statusText: error.response.statusText,
        data: errorData
      });
      
      if (status === 400 && errorData?.errors) {
        let errorMessage = '⚠️ Validation Errors:\n';
        for (const [field, messages] of Object.entries(errorData.errors)) {
          const fieldName = field.replace('$', '').replace('.', ' ').trim();
          const msg = Array.isArray(messages) ? messages.join(', ') : messages;
          errorMessage += `\n• ${fieldName}: ${msg}`;
          console.error(`❌ ${fieldName}:`, msg);
        }
        toast.warning(errorMessage, { autoClose: 10000 });
      } else if (status === 400) {
        const msg = errorData?.message || errorData?.title || 'Bad request. Please check your data.';
        console.error('❌ 400 Error:', msg);
        toast.error(msg);
      } else if (status === 401) {
        console.error('❌ 401: Unauthorized');
        toast.error('🔒 Session expired. Please login again.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else if (status === 404) {
        console.error('❌ 404: Endpoint not found');
        toast.error('❌ API endpoint not found. Please check the server configuration.');
      } else {
        console.error(`❌ ${status}:`, errorData?.message || error.response.statusText);
        toast.error(`Error ${status}: ${errorData?.message || error.response.statusText}`);
      }
    } else if (error.request) {
      console.error('❌ Network error - No response from server');
      console.error('Request:', error.request);
      toast.error('🌐 Network error: No response from server.');
    } else {
      console.error('❌ Error:', error.message);
      toast.error(`❌ Error: ${error.message}`);
    }

    console.error('❌ ==================== END ERROR LOG ====================');
  } finally {
    target.removeAttribute('data-submitting');
  }
};

// ✅ ADD THIS useEffect AFTER OTHER useEffect HOOKS

useEffect(() => {
  if (formData.showOnHomepage) {
    getHomepageCount();
  }
}, [formData.showOnHomepage]);



// Global timer for delayed slug generation
let slugTimer: NodeJS.Timeout;

// Slug generator
const generateSeoName = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// ⭐ FINAL handleChange for ADD PAGE (WITH BRANDS SUPPORT)
// ═══════════════════════════════════════════════════════════════════════════
// 🎯 HANDLECHANGE - COMPLETE PRODUCTION-READY CODE
// ═══════════════════════════════════════════════════════════════════════════

// ✅ STEP 3: COMPLETE HANDLECHANGE FUNCTION
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;

  console.log(`📝 Field changed: ${name} = ${type === 'checkbox' ? checked : value}`);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. SEO SLUG - Manual override stops auto-generation
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "searchEngineFriendlyPageName") {
    setFormData((prev) => ({
      ...prev,
      searchEngineFriendlyPageName: value,
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. PRODUCT NAME - Auto-generate slug with debounce
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "name") {
    setFormData((prev) => ({
      ...prev,
      name: value,
    }));

    // Auto-generate slug after 1 second of typing
    clearTimeout(slugTimer);
    slugTimer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(value),
      }));
    }, 1000);
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. PRODUCT TYPE - Handle grouped/simple switching
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "productType") {
    if (value === 'grouped') {
      setIsGroupedModalOpen(true);
    }
    
    setFormData((prev) => ({
      ...prev,
      productType: value,
      ...(value === 'simple' && {
        requireOtherProducts: false,
        requiredProductIds: '',
        automaticallyAddProducts: false,
        // Reset bundle discount fields
        groupBundleDiscountType: 'None',
        groupBundleDiscountPercentage: 0,
        groupBundleDiscountAmount: 0,
        groupBundleSpecialPrice: 0,
        groupBundleSavingsMessage: '',
        showIndividualPrices: true,
        applyDiscountToAllItems: false,
      }),
      ...(value === 'grouped' && {
        requireOtherProducts: true
      })
    }));
    
    if (value === 'simple') {
      setSelectedGroupedProducts([]);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. REQUIRE OTHER PRODUCTS - Handle grouped product checkbox
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "requireOtherProducts") {
    setFormData((prev) => ({
      ...prev,
      requireOtherProducts: checked,
      ...(!checked && {
        requiredProductIds: '',
        automaticallyAddProducts: false
      })
    }));

    if (!checked) {
      setSelectedGroupedProducts([]);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. SHIPPING ENABLED - Master switch
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isShipEnabled") {
    setFormData((prev) => ({
      ...prev,
      isShipEnabled: checked,
      shipSeparately: checked ? prev.shipSeparately : false,
      weight: checked ? prev.weight : '',
      length: checked ? prev.length : '',
      width: checked ? prev.width : '',
      height: checked ? prev.height : '',
      deliveryDateId: checked ? prev.deliveryDateId : '',
      // Reset delivery options if shipping disabled
      sameDayDeliveryEnabled: checked ? prev.sameDayDeliveryEnabled : false,
      nextDayDeliveryEnabled: checked ? prev.nextDayDeliveryEnabled : false,
      standardDeliveryEnabled: checked ? prev.standardDeliveryEnabled : true,
      sameDayDeliveryCutoffTime: checked ? prev.sameDayDeliveryCutoffTime : '',
      nextDayDeliveryCutoffTime: checked ? prev.nextDayDeliveryCutoffTime : '',
      standardDeliveryDays: checked ? prev.standardDeliveryDays : '5',
      sameDayDeliveryCharge: checked ? prev.sameDayDeliveryCharge : '',
      nextDayDeliveryCharge: checked ? prev.nextDayDeliveryCharge : '',
      standardDeliveryCharge: checked ? prev.standardDeliveryCharge : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. RECURRING PRODUCT - Reset fields when disabled
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isRecurring") {
    setFormData((prev) => ({
      ...prev,
      isRecurring: checked,
      ...(!checked && {
        recurringCycleLength: '',
        recurringCyclePeriod: 'days',
        recurringTotalCycles: '',
        subscriptionDiscountPercentage: '',
        allowedSubscriptionFrequencies: '',
        subscriptionDescription: '',
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 7. PACK PRODUCT - Reset pack size when disabled
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isPack") {
    setFormData((prev) => ({
      ...prev,
      isPack: checked,
      packSize: checked ? prev.packSize : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 8. MARK AS NEW - Reset dates when disabled
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "markAsNew") {
    setFormData((prev) => ({
      ...prev,
      markAsNew: checked,
      markAsNewStartDate: checked ? prev.markAsNewStartDate : '',
      markAsNewEndDate: checked ? prev.markAsNewEndDate : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 9. BASE PRICE ENABLED - Reset base price fields
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "basepriceEnabled") {
    setFormData((prev) => ({
      ...prev,
      basepriceEnabled: checked,
      ...(!checked && {
        basepriceAmount: '',
        basepriceUnit: '',
        basepriceBaseAmount: '',
        basepriceBaseUnit: '',
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 10. NOTIFY ADMIN - Conditional threshold input
  // ═══════════════════════════════════════════════════════════════════════

// WITH THIS:
if (name === "notifyAdminForQuantityBelow") {
  setFormData(prev => ({
    ...prev,
    notifyAdminForQuantityBelow: checked,
    // Keep existing value OR set to "10" as sensible default
    notifyQuantityBelow: checked 
      ? (prev.notifyQuantityBelow || "10")  // Better default than 1
      : prev.notifyQuantityBelow  // DON'T CLEAR, keep value
  }));
  return;
}

  // ═══════════════════════════════════════════════════════════════════════
  // 11. ALLOW BACKORDER - Conditional backorder mode
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "allowBackorder") {
    setFormData((prev) => ({
      ...prev,
      allowBackorder: checked,
      backorderMode: checked ? "allow-qty-below-zero" : "no-backorders",
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 12. AVAILABLE FOR PRE-ORDER - Reset pre-order date
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "availableForPreOrder") {
    setFormData((prev) => ({
      ...prev,
      availableForPreOrder: checked,
      preOrderAvailabilityStartDate: checked ? prev.preOrderAvailabilityStartDate : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 13. GIFT CARD - Reset gift card fields
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isGiftCard") {
    setFormData((prev) => ({
      ...prev,
      isGiftCard: checked,
      ...(!checked && {
        giftCardType: 'virtual',
        overriddenGiftCardAmount: '',
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 14. DOWNLOADABLE PRODUCT - Reset download fields
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isDownload") {
    setFormData((prev) => ({
      ...prev,
      isDownload: checked,
      ...(!checked && {
        downloadId: '',
        unlimitedDownloads: true,
        maxNumberOfDownloads: '',
        downloadExpirationDays: '',
        downloadActivationType: 'when-order-is-paid',
        hasUserAgreement: false,
        userAgreementText: '',
        hasSampleDownload: false,
        sampleDownloadId: '',
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 15. RENTAL PRODUCT - Reset rental fields
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "isRental") {
    setFormData((prev) => ({
      ...prev,
      isRental: checked,
      ...(!checked && {
        rentalPriceLength: '',
        rentalPricePeriod: 'days',
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 16. HAS USER AGREEMENT - Reset agreement text
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "hasUserAgreement") {
    setFormData((prev) => ({
      ...prev,
      hasUserAgreement: checked,
      userAgreementText: checked ? prev.userAgreementText : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 17. HAS SAMPLE DOWNLOAD - Reset sample download ID
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "hasSampleDownload") {
    setFormData((prev) => ({
      ...prev,
      hasSampleDownload: checked,
      sampleDownloadId: checked ? prev.sampleDownloadId : '',
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 18. UNLIMITED DOWNLOADS - Reset max downloads
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "unlimitedDownloads") {
    setFormData((prev) => ({
      ...prev,
      unlimitedDownloads: checked,
      maxNumberOfDownloads: checked ? '' : prev.maxNumberOfDownloads,
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 19. VAT EXEMPT - Reset VAT rate when exempt
  // ═══════════════════════════════════════════════════════════════════════

// WITH THIS:
if (name === "vatExempt") {
  setFormData(prev => ({
    ...prev,
    vatExempt: checked,
    vatRateId: checked ? "" : prev.vatRateId  // Keep existing value when unchecking
  }));
  return;
}

  // ═══════════════════════════════════════════════════════════════════════
  // 20. MANAGE INVENTORY - Reset fields when switching modes
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "manageInventory") {
    setFormData((prev) => ({
      ...prev,
      manageInventory: value,
      ...(value === 'dont-track' && {
        stockQuantity: '',
        minStockQuantity: '',
        notifyAdminForQuantityBelow: false,
        notifyQuantityBelow: '',
        allowBackorder: false,
        backorderMode: 'no-backorders',
        displayStockAvailability: false,
        displayStockQuantity: false,
      })
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 21. BUNDLE DISCOUNT TYPE - Reset discount fields when changing type
  // ═══════════════════════════════════════════════════════════════════════

  if (name === "groupBundleDiscountType") {
    setFormData((prev) => ({
      ...prev,
      groupBundleDiscountType: value as any,
      // Reset all discount values
      groupBundleDiscountPercentage: value === 'Percentage' ? prev.groupBundleDiscountPercentage : 0,
      groupBundleDiscountAmount: value === 'FixedAmount' ? prev.groupBundleDiscountAmount : 0,
      groupBundleSpecialPrice: value === 'SpecialPrice' ? prev.groupBundleSpecialPrice : 0,
      groupBundleSavingsMessage: value === 'None' ? '' : prev.groupBundleSavingsMessage,
      applyDiscountToAllItems: value === 'None' ? false : prev.applyDiscountToAllItems,
    }));
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 22. DEFAULT HANDLER - All other fields
  // ═══════════════════════════════════════════════════════════════════════

  if (type === 'checkbox') {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  } else {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
};



  const addRelatedProduct = (productId: string) => {
    if (!formData.relatedProducts.includes(productId)) {
      setFormData({
        ...formData,
        relatedProducts: [...formData.relatedProducts, productId]
      });
    }
    setSearchTerm('');
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

// ✅ ADD THIS NEW HANDLER FUNCTION
const handleGroupedProductsChange = (selectedOptions: any) => {
  const selectedIds = selectedOptions.map((option: any) => option.value);
  setSelectedGroupedProducts(selectedIds);
  
  // Update formData with comma-separated IDs
  setFormData(prev => ({
    ...prev,
    requiredProductIds: selectedIds.join(',')
  }));
};


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

  const removeProductAttribute = (id: string) => {
    setProductAttributes(productAttributes.filter(attr => attr.id !== id));
  };

  const updateProductAttribute = (id: string, field: keyof ProductAttribute, value: any) => {
    setProductAttributes(productAttributes.map(attr =>
      attr.id === id ? { ...attr, [field]: value } : attr
    ));
  };
 

const addProductVariant = () => {
  const newVariant: ProductVariant = {
    id: Date.now().toString(),
    name: "",
    sku: `${formData.sku}-V${productVariants.length + 1}`,
    price: formData.price ? parseFloat(formData.price) : null,
    compareAtPrice: null,
    weight: formData.weight ? parseFloat(formData.weight) : null,
    stockQuantity: 0,
    trackInventory: true,
    option1Name: null,
    option1Value: null,
    option2Name: null,
    option2Value: null,
    option3Name: null,
    option3Value: null,
    imageUrl: null,
    isDefault: productVariants.length === 0,
    displayOrder: productVariants.length,
    isActive: true,
  };
  
  setProductVariants([...productVariants, newVariant]);
  
  // ✅ AUTO-SCROLL TO NEW VARIANT
  setTimeout(() => {
    const variantElement = document.getElementById(`variant-${newVariant.id}`);
    if (variantElement) {
      variantElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add highlight animation
      variantElement.classList.add('ring-2', 'ring-violet-500');
      setTimeout(() => {
        variantElement.classList.remove('ring-2', 'ring-violet-500');
      }, 2000);
    }
  }, 100);
};



  const removeProductVariant = (id: string) => {
    setProductVariants(productVariants.filter(v => v.id !== id));
  };

  const updateProductVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setProductVariants(productVariants.map(variant =>
      variant.id === id ? { ...variant, [field]: value } : variant
    ));
  };
// ✅ STEP 3: Replace existing handleVariantImageUpload - SIRF PREVIEW
const handleVariantImageUpload = (variantId: string, file: File) => {
  // ✅ Validate file size (max 1MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image size should be less than 1MB");
    return;
  }
  
  // ✅ Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error("Please select a valid image file");
    return;
  }

  // ✅ Create preview URL and store file
  const previewUrl = URL.createObjectURL(file);
  
  setProductVariants(productVariants.map(variant => {
    if (variant.id === variantId) {
      // Cleanup old preview URL if exists
      if (variant.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(variant.imageUrl);
      }
      
      return {
        ...variant,
        imageUrl: previewUrl, // Temporary preview
        imageFile: file // Store file for later upload
      };
    }
    return variant;
  }));

  toast.success("✅ Image ready for upload!");
};

// ✅ NEW: Remove variant image preview
const removeVariantImage = (variantId: string) => {
  setProductVariants(productVariants.map(variant => {
    if (variant.id === variantId) {
      // Cleanup preview URL
      if (variant.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(variant.imageUrl);
      }
      return {
        ...variant,
        imageUrl: null,
        imageFile: undefined
      };
    }
    return variant;
  }));
};


const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Check if product name is entered
  if (!formData.name.trim()) {
    toast.error("Please enter product name before uploading images");
    return;
  }

  if (formData.productImages.length + files.length > 10) {
    toast.error(`Maximum 10 images allowed. You can add ${10 - formData.productImages.length} more.`);
    return;
  }

  setUploadingImages(true);

  try {
    const processedImages = await Promise.all(
      Array.from(files).map(async (file, index) => {
        // File validation
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 1MB.`);
          return null;
        }

        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file.`);
          return null;
        }

        // Create temporary preview object
        return {
          id: `temp-${Date.now()}-${index}`,
          imageUrl: URL.createObjectURL(file), // For preview
          altText: file.name.replace(/\.[^/.]+$/, ""),
          sortOrder: formData.productImages.length + index + 1,
          isMain: formData.productImages.length === 0 && index === 0,
          fileName: file.name,
          fileSize: file.size,
          file: file // Store actual file for later upload
        };
      })
    );

    const validImages = processedImages.filter(img => img !== null) as ProductImage[];
    
    if (validImages.length > 0) {
      setFormData(prev => ({
        ...prev,
        productImages: [...prev.productImages, ...validImages]
      }));
      
      toast.success(`${validImages.length} image(s) added for upload! 📷`);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

  } catch (error: any) {
    console.error('Error processing images:', error);
    toast.error('Failed to process images. Please try again.');
  } finally {
    setUploadingImages(false);
  }
};


// ==================== UPLOAD IMAGES TO PRODUCT (SERVICE-BASED) ====================
const uploadImagesToProduct = async (productId: string, images: ProductImage[]) => {
  console.log(`📤 Uploading ${images.length} images to product ${productId}...`);

  try {
    // BASIC VALIDATIONS
    if (!productId) {
      toast.error('Invalid product ID');
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      toast.warning('No images selected');
      return;
    }

    const MAX_IMAGES = 10;
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const uploadFormData = new FormData();
    let validImageCount = 0;

    images.forEach((image) => {
      if (!image.file) return;

      const file = image.file;

      // File type validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.warning(`${file.name}: format not supported`);
        return;
      }

      // File size validation
      if (file.size > MAX_FILE_SIZE) {
        toast.warning(`${file.name}: exceeds 1MB`);
        return;
      }

      // Max image limit
      if (validImageCount >= MAX_IMAGES) {
        toast.warning(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      uploadFormData.append('images', file);
      validImageCount++;
    });

    if (validImageCount === 0) {
      toast.warning('No valid images to upload');
      return;
    }

    console.log(`✅ Uploading ${validImageCount} images in batch...`);

    // ✅ USE SERVICE
    const response = await productsService.addImages(productId, uploadFormData);

    console.log('📥 Upload response:', response);

    if (!response?.data?.success || !Array.isArray(response.data.data)) {
      throw new Error(response?.data?.message || 'Invalid server response');
    }

    toast.success(`${response.data.data.length} images uploaded successfully`);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Error in uploadImagesToProduct:', error);
    toast.error(`Failed to upload images: ${error.message}`);
    return [];
  }
};

// ==================== UPLOAD VARIANT IMAGES (SERVICE-BASED) ====================
const uploadVariantImages = async (productResponse: any) => {
  console.log('📤 Checking for variant images to upload...');

  try {
    // BASIC VALIDATIONS
    const createdVariants = productResponse?.variants;

    if (!Array.isArray(createdVariants) || createdVariants.length === 0) {
      console.log('ℹ️ No variants found in product response');
      return;
    }

    if (!Array.isArray(productVariants) || productVariants.length === 0) {
      console.log('ℹ️ No local variants available');
      return;
    }

    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    console.log(`✅ Found ${createdVariants.length} variants in response`);

    // UPLOAD PROCESS
    const uploadPromises = productVariants.map(async (localVariant) => {
      if (!localVariant) return null;

      // Match created variant
      const createdVariant = createdVariants.find(
        (cv: any) => cv.sku === localVariant.sku || cv.name === localVariant.name
      );

      if (!createdVariant?.id) {
        console.warn('⚠️ Variant not matched:', localVariant.name);
        return null;
      }

      // Image validation
      const file = localVariant.imageFile;
      if (!file) {
        console.log(`ℹ️ No image for variant: ${localVariant.name}`);
        return null;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.warning(`${file.name} has unsupported format`);
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.warning(`${file.name} exceeds 1MB`);
        return null;
      }

      console.log(`📤 Uploading image for variant: ${localVariant.name}`);

      try {
        const formData = new FormData();
        formData.append('image', file);

        // ✅ USE SERVICE
        const response = await productsService.addVariantImage(createdVariant.id, formData);

        if (response.error) {
          console.error(`❌ Variant upload failed for ${localVariant.name}:`, response.error);
          return null;
        }

        console.log(`✅ Variant image uploaded: ${localVariant.name}`);
        return response.data;
      } catch (error: any) {
        console.error(`❌ Error uploading image for ${localVariant.name}:`, error);
        return null;
      }
    });

    // FINAL RESULT
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(Boolean);

    console.log(`✅ ${successfulUploads.length} variant images uploaded`);

    if (successfulUploads.length > 0) {
      toast.success(`${successfulUploads.length} variant images uploaded`);
    }
  } catch (error) {
    console.error('❌ Error uploading variant images:', error);
    toast.error('Failed to upload variant images');
  }
};


  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (imageId: string) => {
    setFormData({
      ...formData,
      productImages: formData.productImages.filter(img => img.id !== imageId)
    });
  };


  return (
    <div className="space-y-2 ">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/products">
              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Add a New Product
              </h1>
              <p className="text-sm text-slate-400 mt-1">Create and configure your product details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all text-sm font-medium flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all text-sm flex items-center gap-2 font-semibold"
            >
              <Save className="h-4 w-4" />
              Save & Continue
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        {/* Main Form */}
        <div className="w-full">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
            <Tabs defaultValue="product-info" className="w-full">
              <div className="border-b border-slate-800 mb-">
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
    // minLength={10}
    maxLength={350}
    showCharCount={true}
    showHelpText="Brief description visible in product listings (10-350 characters)"
  />

  {/* ================= FULL DESCRIPTION ================= */}
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
    required={true}
    // minLength={50}
    maxLength={2000}
    showCharCount={true}
    showHelpText="Detailed product information with formatting (50-2000 characters)"
  />

</div>


 <div className="grid md:grid-cols-3 gap-4">
 <div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    SKU <span className="text-red-500">*</span>
  </label>
  <div className="relative">
    <input
      type="text"
      name="sku"
      value={formData.sku}
      onChange={handleChange}
      placeholder="e.g., PROD-001"
      className={`w-full px-3 py-2.5 pr-10 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 transition-all ${
        skuError ? 'border-red-500' : 'border-slate-700'
      }`}
      required
    />
    
    {/* Checking Spinner */}
    {checkingSku && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="animate-spin h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )}
    
    {/* Error Icon */}
    {skuError && !checkingSku && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
    )}
  </div>
  
  {/* Error Message */}
  {skuError && <p className="text-xs text-red-400 mt-1.5">{skuError}</p>}
</div>


   {/* ✅ Multiple Brands Selector - ADD PAGE */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span>Brands</span>
    <span className="text-xs text-emerald-400 font-normal">
      ({dropdownsData.brands.length} available)
    </span>
  </label>
  
{/* // Add Product Page */}
<MultiBrandSelector
  selectedBrands={formData.brandIds}
  availableBrands={dropdownsData.brands}
  onChange={(brandIds) => {
    console.log('🔄 Brand selection changed:', brandIds);
    setFormData(prev => ({
      ...prev,
      brandIds: brandIds,
      brand: brandIds[0] || '',
    }));
  }}
  placeholder="Select one brand..."
  maxSelection={1}
/>
  
</div>


{/* ==================== CATEGORIES ==================== */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span className="flex items-center gap-2">
      Categories *
      <span className="text-xs text-slate-500 font-normal">
        (Select up to 5)
      </span>
    </span>
    <span className="text-xs text-emerald-400 font-normal">
      {dropdownsData.categories.length} available
    </span>
  </label>
  
  <MultiCategorySelector
    selectedCategories={formData.categoryIds}
    availableCategories={dropdownsData.categories}
    onChange={(categoryIds) => {
      console.log('📝 Categories changed:', categoryIds);
      setFormData(prev => ({
        ...prev,
        categoryIds
      }));
    }}
    maxSelection={5}
    placeholder="Click to select categories..."
  />
  
  {/* Validation Message */}
  {formData.categoryIds.length === 0 && (
    <p className="mt-2 text-xs text-red-400">
      * Please select at least one category
    </p>
  )}
  
  {/* Info Text */}
  {formData.categoryIds.length > 0 && (
    <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
      <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {formData.categoryIds.length} {formData.categoryIds.length === 1 ? 'category' : 'categories'} selected (first is primary)
    </p>
  )}
</div>

      </div>

{/* ✅ UPDATED Product Type Row with Edit Button */}
<div className="grid md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Product Type
    </label>
    
    <div className="space-y-2">
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

{/* ✅ Edit Button with Linked Count INSIDE */}
{formData.productType === "grouped" && (
  <button
    type="button"
    onClick={() => setIsGroupedModalOpen(true)}
    title="Configure grouped product"
    className="flex items-center gap-2 px-3 py-2.5 
               bg-violet-500/10 hover:bg-violet-500/20 
               border border-violet-500/30 hover:border-violet-500/50 
               text-violet-400 rounded-xl transition-all"
  >
    {/* Linked Count */}
    {selectedGroupedProducts.length > 0 && (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-xs font-medium">
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

  {/* ✅ Publishing Section - PERFECTLY SYNCED */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Publishing</h3>

    <div className="space-y-3">
      {/* ✅ 3 Checkboxes in 3 Columns - SAME HEIGHT */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Column 1 - Published */}
        <label className="flex items-center gap-2 w-full px-3 py-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="published"
            checked={formData.published}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Published</span>
        </label>

        {/* Column 2 - Visible individually - INLINE */}
        <label className="flex items-center gap-2 w-full px-3 py-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
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
        <label className="flex items-center gap-2 w-full px-3 py-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
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

      {/* ✅ Show on Homepage + Display Order - FIXED HEIGHT */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Column 1 - Show on Homepage checkbox */}
        <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
          <input
            type="checkbox"
            name="showOnHomepage"
            checked={formData.showOnHomepage}
            onChange={handleChange}
            className="rounded bg-slate-800/50 h-8 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Show on home page</span>
        </label>

        {/* Column 2 - Display Order (always visible with same height) */}
        <div className="flex items-center gap-3 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl">
          {formData.showOnHomepage ? (
            <>
              {/* Left: Label */}
              <span className="text-sm font-medium text-slate-300 whitespace-nowrap">Display Order</span>
              
              {/* Right: Input */}
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                placeholder="1"
                className="flex-1 px-3 py-1 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </>
          ) : (
            /* Placeholder to maintain height when unchecked */
            <span className="text-sm text-slate-500 italic">Enable "Show on home page" to set order</span>
          )}
        </div>
      </div>
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
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Admin Comment</h3>
    <div>
      <textarea
        name="adminComment"
        value={formData.adminComment}
        onChange={handleChange}
        placeholder="Internal notes (not visible to customers)"
        rows={3}
        className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
    </div>
  </div>
</TabsContent>

              {/* Prices Tab */}
              <TabsContent value="prices" className="space-y-2 mt-2">
                {/* Price Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Price</h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Price (£) <span className="text-red-500">*</span>
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

<div className="space-y-3">
  {/* ✅ First Row: 3 Checkboxes in 3 Columns */}
  <div className="grid md:grid-cols-3 gap-4">
    {/* Column 1 - Disable buy button */}
    <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
      <input
        type="checkbox"
        name="disableBuyButton"
        checked={formData.disableBuyButton}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm text-slate-300">Disable buy button</span>
    </label>

    {/* Column 2 - Disable wishlist button */}
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

                {/* Pre-order Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Pre-order</h3>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="availableForPreOrder"
                      checked={formData.availableForPreOrder}
                      onChange={handleChange}
                      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Available for pre-order</span>
                  </label>

                  {formData.availableForPreOrder && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Pre-order Availability Start Date</label>
                      <input
                        type="datetime-local"
                        name="preOrderAvailabilityStartDate"
                        value={formData.preOrderAvailabilityStartDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Mark as New Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Mark as New</h3>

                  <label className="flex items-center gap-2">
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

                {/* Tax Section */}
{/* ✅ NEW VAT / TAX SECTION - SAME AS EDIT PAGE */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
    VAT / Tax Settings
  </h3>

  {/* VAT Exempt Checkbox */}
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      name="vatExempt"
      checked={formData.vatExempt}
      onChange={handleChange}
      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
    />
    <span className="text-sm text-slate-300">VAT Exempt (No tax applied)</span>
  </label>

  {/* VAT Rate Dropdown - Show when NOT exempt */}
  {!formData.vatExempt && (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        VAT Rate <span className="text-red-400">*</span>
      </label>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search or select VAT rate..."
        value={
          formData.vatRateId 
            ? `${dropdownsData.vatRates.find(v => v.id === formData.vatRateId)?.name} (${dropdownsData.vatRates.find(v => v.id === formData.vatRateId)?.rate}%)`
            : vatSearch
        }
        onChange={(e) => {
          setVatSearch(e.target.value);
          setShowVatDropdown(true);
          if (!e.target.value) {
            setFormData({ ...formData, vatRateId: '' });
          }
        }}
        onFocus={() => setShowVatDropdown(true)}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />

      {/* Dropdown List */}
      {showVatDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-auto">
          {filteredVATRates.length > 0 ? (
            filteredVATRates.map((vat) => (
              <button
                key={vat.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, vatRateId: vat.id });
                  setVatSearch('');
                  setShowVatDropdown(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-violet-500/20 transition-colors ${
                  formData.vatRateId === vat.id ? 'bg-violet-500/30 text-violet-300' : 'text-white'
                }`}
              >
                {vat.name} ({vat.rate}%)
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-slate-400 text-sm">
              No VAT rates found
            </div>
          )}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {showVatDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowVatDropdown(false)}
        />
      )}

      {/* Selected Info */}
      {formData.vatRateId && (
        <p className="text-xs text-slate-400 mt-1">
          Selected: {dropdownsData.vatRates.find(v => v.id === formData.vatRateId)?.name} 
          ({dropdownsData.vatRates.find(v => v.id === formData.vatRateId)?.rate}%)
        </p>
      )}
    </div>
  )}

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

  {/* Inventory Settings */}
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
              <option value="disable-buy">Disable buy button</option>
              <option value="unpublish">Unpublish product</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Action to take when stock falls below minimum
            </p>
          </div>

          {/* ✅ PLACEHOLDER DIV - Keep grid balanced */}
          <div></div>
        </div>

        {/* ✅ ADMIN NOTIFICATION SECTION - CONDITIONAL */}
        <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="notifyAdminForQuantityBelow"
              checked={formData.notifyAdminForQuantityBelow}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setFormData(prev => ({
                  ...prev,
                  notifyAdminForQuantityBelow: isChecked,
                  notifyQuantityBelow: isChecked ? prev.notifyQuantityBelow : '1' // Reset to default
                }));
              }}
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

          {/* ✅ Conditional Threshold Input */}
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

        {/* ✅ BACKORDER SECTION */}
        <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowBackorder"
              checked={formData.allowBackorder}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setFormData(prev => ({
                  ...prev,
                  allowBackorder: isChecked,
                  backorderMode: isChecked ? "allow-qty-below-zero" : "no-backorders"
                }));
              }}
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

        {/* Display Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="displayStockAvailability"
              checked={formData.displayStockAvailability}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Display stock availability (In Stock/Out of Stock)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="displayStockQuantity"
              checked={formData.displayStockQuantity}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Display exact stock quantity (e.g., "25 items available")</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="allowBackInStockSubscriptions"
              checked={formData.allowBackInStockSubscriptions}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Allow "Notify me when available" subscriptions</span>
          </label>
        </div>
      </div>

      {/* Multiple Warehouses Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
          Delivery Time Estimate
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Product Availability Range</label>
          <select
            name="productAvailabilityRange"
            value={formData.productAvailabilityRange}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="">None</option>
            <option value="1-2-days">Ships in 1-2 days</option>
            <option value="3-5-days">Ships in 3-5 days</option>
            <option value="1-week">Ships in 1 week</option>
            <option value="2-weeks">Ships in 2 weeks</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Displayed to customers on product page
          </p>
        </div>
      </div>
    </>
  )}

  {/* Cart Settings */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Cart Settings</h3>

    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Cart Quantity</label>
        <input
          type="number"
          name="minCartQuantity"
          value={formData.minCartQuantity}
          onChange={handleChange}
          placeholder="1"
          min="1"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-1">
          Customer must order at least this quantity
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Maximum Cart Quantity</label>
        <input
          type="number"
          name="maxCartQuantity"
          value={formData.maxCartQuantity}
          onChange={handleChange}
          placeholder="10000"
          min="1"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-slate-400 mt-1">
          Maximum quantity per order
        </p>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">Allowed Quantities</label>
      <input
        type="text"
        name="allowedQuantities"
        value={formData.allowedQuantities}
        onChange={handleChange}
        placeholder="e.g., 1, 5, 10, 20"
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
      />
      <p className="text-xs text-slate-400 mt-1">
        Restrict to specific quantities only (comma-separated). Leave empty to allow any quantity.
      </p>
    </div>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name="notReturnable"
        checked={formData.notReturnable}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm text-slate-300">Not returnable (no refunds/returns allowed)</span>
    </label>
  </div>
</TabsContent>


              {/* Shipping Tab */}
<TabsContent value="shipping" className="space-y-2 mt-2">
  {/* Shipping Enabled */}
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

        {/* ✅ NEW DELIVERY OPTIONS SECTION */}
        <div className="space-y-4 bg-slate-900/30 border border-slate-600 rounded-xl p-4 mt-4">
          <h4 className="text-sm font-semibold text-white border-b border-slate-700 pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-violet-400" />
            Delivery Options
          </h4>
          
          {/* Same Day Delivery */}
          <div className="space-y-3">
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
                    Delivery Charge (₹)
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
          </div>
          
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
                    Delivery Charge (₹)
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
                    Delivery Charge (₹)
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
                    <li>• Same-Day: ₹{formData.sameDayDeliveryCharge || '0'} (Before {formData.sameDayDeliveryCutoffTime || '--:--'})</li>
                  )}
                  {formData.nextDayDeliveryEnabled && (
                    <li>• Next-Day: ₹{formData.nextDayDeliveryCharge || '0'} (Before {formData.nextDayDeliveryCutoffTime || '--:--'})</li>
                  )}
                  {formData.standardDeliveryEnabled && (
                    <li>• Standard: ₹{formData.standardDeliveryCharge || '0'} ({formData.standardDeliveryDays || '5'} days)</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* ===== RECURRING PRODUCT SECTION ===== */}
  <div className="space-y-4 mt-6">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Subscription / Recurring</h3>

    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        name="isRecurring"
        checked={formData.isRecurring}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm font-medium text-slate-300">This is a Recurring Product (Subscription)</span>
    </label>

    {formData.isRecurring && (
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

        {/* ✅ NEW - Subscription Discount & Options */}
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

  {/* ===== PACK / BUNDLE PRODUCT ===== */}
  <div className="space-y-4 mt-6">
    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Pack / Bundle</h3>

    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        name="isPack"
        checked={formData.isPack}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 cursor-pointer"
      />
      <label className="text-sm font-medium text-slate-300 cursor-pointer">
        This is a Pack / Bundle Product
      </label>
    </div>

    {formData.isPack && (
      <div className="p-4 bg-gradient-to-r from-violet-900/20 to-purple-900/20 border border-violet-700/50 rounded-lg transition-all duration-300">
        <label className="block text-xs font-medium text-violet-300 mb-2">
          Pack Name / Size <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="packSize"
          value={formData.packSize}
          onChange={handleChange}
          required={formData.isPack}
          placeholder="e.g. 6 Pack, Combo of 3, Family Bundle, Buy 2 Get 1"
          className="w-full px-3 py-2 bg-slate-900/80 border border-violet-600/50 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
        />
        <p className="text-xs text-slate-400 mt-2">
          Ye name customer ko product title ke saath dikhega → "
          <span className="text-violet-400 font-medium">
            {formData.name} {formData.packSize && `- ${formData.packSize}`}
          </span>"
        </p>
      </div>
    )}
  </div>

  {/* Dimensions */}
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


              {/* Related Products Tab */}
              <TabsContent value="related-products" className="space-y-2 mt-2">
                {/* Related Products Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Related Products</h3>
                  <p className="text-sm text-slate-400">
                    These products will be shown on the product details page as recommended items
                  </p>

                  {/* Selected Related Products */}
                  {formData.relatedProducts.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">Selected Products</label>
                      <div className="border border-slate-700 rounded-xl p-4 space-y-2 bg-slate-800/30">
                        {formData.relatedProducts.map((productId) => {
                          const product = availableProducts.find(p => p.id === productId);
                          return product ? (
                            <div
                              key={productId}
                              className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-700/50 rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-white">{product.name}</p>
                                  <p className="text-xs text-slate-400">
                                    SKU: {product.sku} • {product.price}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeRelatedProduct(productId)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search and Add */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Add Related Products</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products by name or SKU..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Search Results */}
                    {searchTerm && (
                      <div className="mt-2 border border-slate-700 rounded-xl max-h-64 overflow-y-auto bg-slate-800/30">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 hover:bg-slate-800/50 cursor-pointer border-b border-slate-700 last:border-0 transition-all"
                              onClick={() => addRelatedProduct(product.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-700/50 rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-white">{product.name}</p>
                                  <p className="text-xs text-slate-400">
                                    SKU: {product.sku} • {product.price}
                                  </p>
                                </div>
                              </div>
                              {formData.relatedProducts.includes(product.id) ? (
                                <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-lg border border-violet-500/30">Added</span>
                              ) : (
                                <button className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg text-xs transition-all">
                                  Add
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-400">
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cross-sell Products Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Cross-sell Products</h3>
                  <p className="text-sm text-slate-400">
                    These products will be shown in the shopping cart as additional items
                  </p>

                  {/* Selected Cross-sell Products */}
                  {formData.crossSellProducts.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">Selected Products</label>
                      <div className="border border-slate-700 rounded-xl p-4 space-y-2 bg-slate-800/30">
                        {formData.crossSellProducts.map((productId) => {
                          const product = availableProducts.find(p => p.id === productId);
                          return product ? (
                            <div
                              key={productId}
                              className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center">
                                  <ShoppingCart className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-white">{product.name}</p>
                                  <p className="text-xs text-slate-400">
                                    SKU: {product.sku} • {product.price}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeCrossSellProduct(productId)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search and Add */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Add Cross-sell Products</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTermCross}
                        onChange={(e) => setSearchTermCross(e.target.value)}
                        placeholder="Search products by name or SKU..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Search Results */}
                    {searchTermCross && (
                      <div className="mt-2 border border-slate-700 rounded-xl max-h-64 overflow-y-auto bg-slate-800/30">
                        {filteredProductsCross.length > 0 ? (
                          filteredProductsCross.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 hover:bg-slate-800/50 cursor-pointer border-b border-slate-700 last:border-0 transition-all"
                              onClick={() => addCrossSellProduct(product.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-700/50 rounded flex items-center justify-center">
                                  <ShoppingCart className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-white">{product.name}</p>
                                  <p className="text-xs text-slate-400">
                                    SKU: {product.sku} • {product.price}
                                  </p>
                                </div>
                              </div>
                              {formData.crossSellProducts.includes(product.id) ? (
                                <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-lg border border-violet-500/30">Added</span>
                              ) : (
                                <button className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-lg text-xs transition-all">
                                  Add
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-400">
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-sm text-violet-400 mb-2">Tips</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• <strong className="text-white">Related Products:</strong> Shown on product detail page to encourage additional purchases</li>
                    <li>• <strong className="text-white">Cross-sell Products:</strong> Displayed in the cart to suggest complementary items</li>
                    <li>• Select products that complement or enhance the main product</li>
                  </ul>
                </div>
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
                                  Attribute Name <span className="text-red-500">*</span>
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
    {['Not specified', 'Male', 'Female', 'Unisex', 'Kids', 'Boys', 'Girls'].map((option) => (
      <label
        key={option}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <input
          type="radio"
          name="gender"
          value={option === 'Not specified' ? '' : option}
          checked={formData.gender === (option === 'Not specified' ? '' : option)}
          onChange={handleChange}
          className="w-5 h-5 rounded-full bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
          {option}
        </span>
      </label>
    ))}
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


{/* Product Variants Tab - CLEAN & COMPACT */}
{/* Product Variants Tab - EDIT PAGE STYLE */}
<TabsContent value="variants" className="space-y-3">
  <div className="space-y-3">
    {/* ✅ STICKY HEADER - Compact & Professional */}
    <div className="sticky top-0 z-10 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 pb-3 -mt-2 pt-2 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">Product Variants</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Create variants with different sizes, colors, or configurations
          </p>
        </div>
        
        {/* ✅ Variant Count Badge (shows when variants exist) */}
        {productVariants.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/15 text-violet-400 rounded-lg text-xs font-medium border border-violet-500/20">
            <Package className="h-3.5 w-3.5" />
            {productVariants.length} Variant{productVariants.length > 1 ? 's' : ''}
          </div>
        )}
        
        <button
          type="button"
          onClick={addProductVariant}
          className="px-3.5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap"
        >
          <Package className="h-4 w-4" />
          Add Variant
        </button>
      </div>
    </div>

    {/* ✅ EMPTY STATE - Compact */}
    {productVariants.length === 0 ? (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 text-center">
        <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white mb-1.5">No Product Variants</h3>
        <p className="text-sm text-slate-400 mb-2">
          Click "Add Variant" to create different versions
        </p>
        <p className="text-xs text-slate-500">
          Example: 500ml Original, 750ml Fresh
        </p>
      </div>
    ) : (
      /* ✅ VARIANTS LIST - Compact Layout */
      <div className="space-y-3">
        {productVariants.map((variant, index) => (
          <div 
            key={variant.id} 
            id={`variant-${variant.id}`}
            className="bg-slate-800/30 border border-slate-700 rounded-xl p-3.5 transition-all hover:border-slate-600"
          >
            {/* ✅ HEADER - Compact */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Variant #{index + 1}</h4>
                {variant.isDefault && (
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded border border-violet-500/30">
                    Default
                  </span>
                )}
                {!variant.isActive && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                    Inactive
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeProductVariant(variant.id)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ✅ BASIC INFO - 2 Columns */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Variant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => updateProductVariant(variant.id, 'name', e.target.value)}
                  placeholder="e.g., 500ml Original"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              {/* ✅ SKU WITH VALIDATION UI */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  SKU <span className="text-red-500">*</span>
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      updateProductVariant(variant.id, 'sku', value);
                    }}
                    placeholder="e.g., PROD-500ML"
                    className={`w-full px-3 py-2 text-sm bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      variantSkuErrors[variant.id]
                        ? 'border-red-500 focus:ring-red-500'
                        : checkingVariantSku[variant.id]
                        ? 'border-yellow-500 focus:ring-yellow-500'
                        : 'border-slate-700 focus:ring-violet-500'
                    }`}
                  />

                  {/* Loading Spinner */}
                  {checkingVariantSku[variant.id] && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}

                  {/* Success Checkmark */}
                  {!checkingVariantSku[variant.id] && variant.sku.length >= 2 && !variantSkuErrors[variant.id] && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Error Icon */}
                  {variantSkuErrors[variant.id] && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {variantSkuErrors[variant.id] && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{variantSkuErrors[variant.id]}</span>
                  </p>
                )}

                {/* Success Message */}
                {!checkingVariantSku[variant.id] && variant.sku.length >= 2 && !variantSkuErrors[variant.id] && (
                  <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>SKU available</span>
                  </p>
                )}
              </div>
            </div>

            {/* ✅ PRICING & STOCK - 4 Columns Compact */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.price || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="99.99"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Compare Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.compareAtPrice || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="129.99"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.weight || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.55"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Stock Qty
                </label>
                <input
                  type="number"
                  value={variant.stockQuantity}
                  onChange={(e) => updateProductVariant(variant.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                  placeholder="150"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* ✅ OPTION 1 - Compact */}
            <div className="mb-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
                <h5 className="text-xs font-semibold text-violet-400">Option 1</h5>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={variant.option1Name || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'option1Name', e.target.value || null)}
                  placeholder="Name (e.g., Size)"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={variant.option1Value || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'option1Value', e.target.value || null)}
                  placeholder="Value (e.g., 500ml)"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* ✅ OPTION 2 - Compact */}
            <div className="mb-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500"></div>
                <h5 className="text-xs font-semibold text-cyan-400">Option 2</h5>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={variant.option2Name || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'option2Name', e.target.value || null)}
                  placeholder="Name (e.g., Type)"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  value={variant.option2Value || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'option2Value', e.target.value || null)}
                  placeholder="Value (e.g., Original)"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* ✅ OPTION 3 - Collapsible (Optional) */}
            <details className="mb-3">
              <summary className="cursor-pointer text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-2 mb-2">
                <ChevronDown className="h-3.5 w-3.5" />
                Option 3 (Optional)
              </summary>
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={variant.option3Name || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option3Name', e.target.value || null)}
                    placeholder="Name (e.g., Material)"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <input
                    type="text"
                    value={variant.option3Value || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option3Value', e.target.value || null)}
                    placeholder="Value (e.g., Premium)"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </details>

            {/* ✅ IMAGE UPLOAD - Compact */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-300 mb-2">Variant Image</label>
              
              <div className="flex items-center gap-3">
                {/* Image Preview */}
                {variant.imageUrl && (
                  <div className="relative">
                    <img
                      src={variant.imageUrl}
                      alt={variant?.name || "Variant"}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-slate-700"
                    />
                    {variant.imageUrl.startsWith("blob:") && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded">
                        Preview
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (variant.imageUrl?.startsWith('blob:')) {
                          URL.revokeObjectURL(variant.imageUrl);
                        }
                        updateProductVariant(variant.id, 'imageUrl', null);
                      }}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                
                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Max 1MB allowed");
                          return;
                        }
                        if (!file.type.startsWith('image/')) {
                          toast.error("Invalid file type");
                          return;
                        }
                        handleVariantImageUpload(variant.id, file);
                      }
                    }}
                    className="hidden"
                    id={`variant-img-${variant.id}`}
                  />
                  <label
                    htmlFor={`variant-img-${variant.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {variant.imageUrl ? "Change" : "Upload"}
                  </label>
                  {variant.imageUrl?.startsWith("blob:") && (
                    <span className="ml-2 text-[11px] text-orange-400">⚠️ Save to upload</span>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ SETTINGS - Compact Checkboxes */}
            <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-700/50">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={variant.isDefault}
                  onChange={(e) => {
                    setProductVariants(productVariants.map(v => ({
                      ...v,
                      isDefault: v.id === variant.id ? e.target.checked : false
                    })));
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-xs text-slate-300">Default</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={variant.trackInventory}
                  onChange={(e) => updateProductVariant(variant.id, 'trackInventory', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-xs text-slate-300">Track Stock</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={variant.isActive}
                  onChange={(e) => updateProductVariant(variant.id, 'isActive', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-xs text-slate-300">Active</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* ✅ HELP SECTION - Compact */}
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-xs text-blue-400 mb-1">Variant Examples</h4>
          <ul className="text-xs text-slate-400 space-y-0.5">
            <li>• Option1: "Size" → "500ml" | Option2: "Type" → "Original"</li>
            <li>• Option1: "Pack" → "12 Pack" | Option2: "Purchase" → "One-Time"</li>
            <li>• Each variant needs a unique SKU</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</TabsContent>





{/* ================= SEO TAB ================= */}
<TabsContent value="seo" className="space-y-4 mt-2">
  <div className="space-y-4 bg-slate-800/30 border border-slate-700 rounded-xl p-4">

    {/* ===== Header ===== */}
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400"></span>
          Search Engine Optimization
        </h3>
        <p className="text-sm text-slate-400 mt-0.5">
          Optimize your product for search engines to improve visibility
        </p>
      </div>
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
        className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
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
        className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none ${
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
        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
        <li>• Use descriptive, keyword-rich titles</li>
        <li>• Keep meta titles under 60 characters</li>
        <li>• Keep meta descriptions under 160 characters</li>
        <li>• Use hyphens in URL slugs (e.g., wireless-headphones)</li>
      </ul>
    </div>

  </div>
</TabsContent>

{/* Media Tab - Synced with Variants */}
<TabsContent value="media" className="space-y-4 mt-2">
  {/* ========== PICTURES SECTION ========== */}
  <div className="space-y-4 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">Product Images</h3>
        <p className="text-sm text-red-500">
          Upload and manage product images. Supported: JPG, PNG, WebP • Max 300KB To 500KB • Up to 10 images
        </p>
      </div>
    </div>

    {/* Direct Upload Button */}
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
            : 'bg-slate-900 border-2 border-dashed border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-violet-500/50'
        }`}
      >
        <Upload className="h-4 w-4" />
        Add More Images
      </button>
    )}

    {!formData.name.trim() && (
      <p className="text-xs text-amber-400">⚠️ Product name is required for image upload</p>
    )}

    {/* Image Grid */}
    {formData.productImages.length > 0 && (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-400">
          {formData.productImages.length}/10 Images
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {formData.productImages.map((image, index) => (
            <div
              key={image.id}
              className="bg-slate-800/30 border border-slate-700 rounded p-2 space-y-1 relative group"
            >
              {/* Main Badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-500 text-white text-[10px] font-medium rounded z-10">
                  Main
                </div>
              )}

              {/* Image */}
              <div className="aspect-square bg-slate-700/50 rounded overflow-hidden relative">
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl}
                    alt={image.altText || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-5 w-5 text-slate-500" />
                  </div>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (image.imageUrl?.startsWith('blob:')) {
                      URL.revokeObjectURL(image.imageUrl);
                    }
                    removeImage(image.id);
                  }}
                  className="absolute top-0 right-0 p-1 rounded-bl transition-all opacity-0 group-hover:opacity-100 bg-red-500/90 hover:bg-red-600"
                  title="Delete"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>

              {/* Controls */}
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Alt text"
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

                {image.fileSize && (
                  <div className="text-[10px] text-slate-500">
                    {(image.fileSize / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* ========== VIDEOS SECTION ========== */}
  <div className="space-y-4 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">Product Videos</h3>
        <p className="text-sm text-slate-400">
          Add video URLs (YouTube, Vimeo, etc.) to showcase your product
        </p>
      </div>
    </div>

    {/* Video Grid */}
    {formData.videoUrls.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {formData.videoUrls.map((url, index) => (
          <div
            key={index}
            className="group bg-slate-800/30 rounded border border-slate-700 overflow-hidden hover:border-violet-500/50 transition-all"
          >
            {/* Thumbnail */}
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

              {/* Video Number */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-semibold text-white">
                #{index + 1}
              </div>
            </div>

            {/* URL Input + Remove */}
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

    {/* Add Video Button */}
    <button
      type="button"
      onClick={() => {
        setFormData({
          ...formData,
          videoUrls: [...formData.videoUrls, ''],
        });
      }}
      className="w-full py-2.5 bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 hover:border-violet-500/50 transition-all text-xs font-medium flex items-center justify-center gap-2"
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
<GroupedProductModal
  isOpen={isGroupedModalOpen}
  onClose={() => setIsGroupedModalOpen(false)}
  simpleProducts={simpleProducts}
  selectedGroupedProducts={selectedGroupedProducts}
  automaticallyAddProducts={formData.automaticallyAddProducts}
  
  // ✅ ADD THESE NEW PROPS
  bundleDiscountType={formData.groupBundleDiscountType}
  bundleDiscountPercentage={formData.groupBundleDiscountPercentage}
  bundleDiscountAmount={formData.groupBundleDiscountAmount}
  bundleSpecialPrice={formData.groupBundleSpecialPrice}
  bundleSavingsMessage={formData.groupBundleSavingsMessage}
  showIndividualPrices={formData.showIndividualPrices}
  applyDiscountToAllItems={formData.applyDiscountToAllItems}
  
  onProductsChange={handleGroupedProductsChange}
  onAutoAddChange={(checked) => {
    setFormData(prev => ({
      ...prev,
      automaticallyAddProducts: checked
    }));
  }}
  
  // ✅ ADD THESE NEW HANDLERS
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
  
  onDisplaySettingsChange={(settings) => {
    setFormData(prev => ({
      ...prev,
      showIndividualPrices: settings.showIndividualPrices,
      applyDiscountToAllItems: settings.applyDiscountToAllItems
    }));
  }}
/>

    </div>
  );
}
function debounce(arg0: (variantId: string, sku: string, currentProductId?: string) => Promise<void>, arg1: number): any {
  throw new Error("Function not implemented.");
}

