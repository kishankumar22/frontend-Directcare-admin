// Edit Product  work Fine
"use client";
import { useState, use, useEffect, useRef, JSX } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, X, Info, Search, Image, Package,
  Tag, BarChart3, Globe, Settings, Truck, Gift, Calendar,
  Users, PoundSterling, Shield, FileText, Link as LinkIcon, ShoppingCart, Video,
  Play,
  ChevronDown
} from "lucide-react";

// ==================== TYPE DEFINITIONS ====================
interface LockResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    productId: string;
    lockedBy: string;
    lockedByEmail: string;
    lockedAt: string;
    expiresAt: string;
    isLocked: boolean;
  };
}

interface ApiErrorResponse {
  success: boolean;
  message: string;
  data: any;
}

import Link from "next/link";
import { apiClient } from "@/lib/api"; // Import your axios client
import { ProductDescriptionEditor } from "@/app/admin/products/SelfHostedEditor";
// import { ProductDescriptionEditor, RichTextEditor } from "../../RichTextEditor";
import  {useToast } from "@/components/CustomToast";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { ProductAttribute, ProductVariant, DropdownsData, SimpleProduct, ProductImage, CategoryData, BrandApiResponse, CategoryApiResponse, ProductsApiResponse, VATRateApiResponse } from '@/lib/services';
import { GroupedProductModal } from '../../GroupedProductModal';
import { MultiBrandSelector } from "../../MultiBrandSelector";
import React from "react";
import { BackInStockSubscribers, LowStockAlert,AdminCommentHistoryModal } from "../../productModals";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
      const toast = useToast();
  let seoTimer: any = null;

  const { id: productId } = use(params);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Helper function to format datetime for React inputs
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
// ✅ Add these new states
const [isDeletingImage, setIsDeletingImage] = useState(false);
const [uploadingImages, setUploadingImages] = useState(false);
const [vatSearch, setVatSearch] = useState('');
const [loading, setLoading] = useState(true);


  // Dynamic dropdown data from API
  const [showVatDropdown, setShowVatDropdown] = useState(false);
  const [dropdownsData, setDropdownsData] = useState<DropdownsData>({
    brands: [],
    categories: [],
    vatRates: []  // ✅ Add this line
  });
// Add this state with your other useState declarations
const [isGroupedModalOpen, setIsGroupedModalOpen] = useState(false);
// Add these with your other useState declarations
const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
const [categorySearchTerm, setCategorySearchTerm] = useState("");
const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Add these states after existing states
const [simpleProducts, setSimpleProducts] = useState<SimpleProduct[]>([]);
const [selectedGroupedProducts, setSelectedGroupedProducts] = useState<string[]>([]);
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
)
// Add this useEffect for category dropdown outside click
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
      setShowCategoryDropdown(false);
      setCategorySearchTerm("");
    }
  };
// Close dropdown when clicking outside

  if (showCategoryDropdown) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showCategoryDropdown]);

  // Available products for related/cross-sell (from API)
  const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, sku: string, price: string}>>([]);
const [formData, setFormData] = useState({ 
  // ===== BASIC INFO =====
  name: '',
  shortDescription: '',
  fullDescription: '',
  sku: '',
  categories: '', // Will store category ID
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

  // ===== MEDIA =====
  productImages: [] as ProductImage[],
  videoUrls: [] as string[],
  specifications: [] as Array<{id: string, name: string, value: string, displayOrder: number}>, // ✅ ADD THIS LINE

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
  minCartQuantity: '1',
  maxCartQuantity: '10',
  allowedQuantities: '',
  allowAddingOnlyExistingAttributeCombinations: false,
  notReturnable: false,

  // ===== SHIPPING =====
  isShipEnabled: true,
  isFreeShipping: false,
  shipSeparately: false,
  additionalShippingCharge: '',
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
  
  // ===== SEO =====
  metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  searchEngineFriendlyPageName: '',
});
const [productLock, setProductLock] = useState<{
  isLocked: boolean;
  lockedBy: string | null;
  expiresAt: string | null;
} | null>(null);

const [isLockModalOpen, setIsLockModalOpen] = useState(false);
const [lockModalMessage, setLockModalMessage] = useState("");
const [isAcquiringLock, setIsAcquiringLock] = useState(true); // ⚡ ADD THIS

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

      // ✅ Fetch product data first
      const productResponse = await apiClient.get<any>(`${API_ENDPOINTS.products}/${productId}`);

      // ✅ Fetch all other data in parallel with separate simple products endpoint
      const [
        brandsResponse, 
        categoriesResponse, 
        vatRatesResponse, 
        allProductsResponse,
        simpleProductsResponse  // ✅ NEW: Separate endpoint
      ] = await Promise.allSettled([
        apiClient.get<BrandApiResponse>(`${API_ENDPOINTS.brands}?includeUnpublished=false`),
        apiClient.get<CategoryApiResponse>(`${API_ENDPOINTS.categories}?includeInactive=true&includeSubCategories=true`),
        apiClient.get<VATRateApiResponse>(API_ENDPOINTS.vatrates),
        apiClient.get<ProductsApiResponse>(API_ENDPOINTS.products),
        apiClient.get(`${API_ENDPOINTS.products}/simple`)  // ✅ ADD THIS
      ]);

      // ✅ Extract data safely
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

      // ✅ Process ALL products for related/cross-sell
      if (allProductsResponse.status === 'fulfilled' && allProductsResponse.value.data) {
        const apiResponse = allProductsResponse.value.data as ProductsApiResponse;
        
        if (apiResponse.success && apiResponse.data?.items) {
          // For related/cross-sell dropdown (all products)
          const transformedProducts = apiResponse.data.items.map((product: any) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: `₹${product.price.toFixed(2)}`
          }));
          
          setAvailableProducts(transformedProducts);
          console.log('✅ Available products loaded:', transformedProducts.length);
        } else {
          setAvailableProducts([]);
        }
      } else {
        console.warn('⚠️ Failed to fetch all products');
        setAvailableProducts([]);
      }

      // ✅ NEW: Process SIMPLE products from separate endpoint
      if (simpleProductsResponse.status === 'fulfilled' && simpleProductsResponse.value.data) {
        const simpleData = simpleProductsResponse.value.data as any;
        
        console.log('📦 Simple products response:', simpleData);
        
        if (!simpleData.error && simpleData.success && Array.isArray(simpleData.data)) {
          // Filter out current product
          const simpleProductsList = simpleData.data
            .filter((p: any) => p.id !== productId)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: typeof p.price === 'number' ? p.price.toFixed(2) : '0.00',
              stockQuantity: p.stockQuantity || 0
            }));

          setSimpleProducts(simpleProductsList);
          console.log('✅ Simple products loaded from endpoint:', simpleProductsList.length);
        } else {
          console.warn('⚠️ Simple products endpoint returned no data');
          setSimpleProducts([]);
        }
      } else {
        console.warn('⚠️ Failed to fetch simple products, falling back to filtering');
        
        // ✅ FALLBACK: Filter from all products if separate endpoint fails
        if (allProductsResponse.status === 'fulfilled' && allProductsResponse.value.data) {
          const apiResponse = allProductsResponse.value.data as ProductsApiResponse;
          
          if (apiResponse.success && apiResponse.data?.items) {
            const simpleProductsList = apiResponse.data.items
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
        } else {
          setSimpleProducts([]);
        }
      }

      // ✅ Extract product data
      const productData = productResponse.data?.data || productResponse.data;
      
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

      // ✅ SET FORM DATA (keep your complete existing formData)
      setFormData({
        name: productData.name || '',
        sku: productData.sku || '',
        shortDescription: productData.shortDescription || '',
        fullDescription: productData.description || '',
        gtin: productData.gtin || '',
        manufacturerPartNumber: productData.manufacturerPartNumber || '',
        adminComment: productData.adminComment || '',
        gender: productData.gender || '',
        categories: productData.categoryId || '',
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
        requireOtherProducts: productData.requireOtherProducts ?? false,
        requiredProductIds: productData.requiredProductIds || '',
        automaticallyAddProducts: productData.automaticallyAddProducts ?? false,
        price: productData.price?.toString() || '',
        oldPrice: productData.oldPrice?.toString() || productData.compareAtPrice?.toString() || '',
        cost: productData.costPrice?.toString() || '',
        disableBuyButton: productData.disableBuyButton ?? false,
        disableWishlistButton: productData.disableWishlistButton ?? false,

        basepriceEnabled: productData.basepriceEnabled ?? false,
        basepriceAmount: productData.basepriceAmount?.toString() || '',
        basepriceUnit: productData.basepriceUnit || '',
        basepriceBaseAmount: productData.basepriceBaseAmount?.toString() || '',
        basepriceBaseUnit: productData.basepriceBaseUnit || '',
        markAsNew: productData.markAsNew ?? false,
        markAsNewStartDate: parseDate(productData.markAsNewStartDate),
        markAsNewEndDate: parseDate(productData.markAsNewEndDate),
        availableForPreOrder: productData.availableForPreOrder ?? false,
        preOrderAvailabilityStartDate: parseDate(productData.preOrderAvailabilityStartDate),
        availableStartDate: parseDate(productData.availableStartDate),
        availableEndDate: parseDate(productData.availableEndDate),
        hasDiscountsApplied: false,
        vatExempt: productData.vatExempt ?? false,
        vatRateId: productData.vatRateId || '',
        stockQuantity: productData.stockQuantity?.toString() || '0',
        manageInventory: productData.manageInventoryMethod || 'track',
        displayStockAvailability: productData.displayStockAvailability ?? true,
        displayStockQuantity: productData.displayStockQuantity ?? false,
        minStockQuantity: productData.minStockQuantity?.toString() || '0',
        lowStockActivity: productData.lowStockActivity || 'nothing',
        notifyAdminForQuantityBelow: productData.notifyAdminForQuantityBelow ?? true,
        notifyQuantityBelow: productData.notifyQuantityBelow?.toString() || '1',
        allowBackorder: productData.allowBackorder ?? false,
        backorderMode: productData.backorderMode || 'no-backorders',
        backorders: productData.backorderMode || 'no-backorders',
        allowBackInStockSubscriptions: productData.allowBackInStockSubscriptions ?? false,
        productAvailabilityRange: productData.productAvailabilityRange || '',
        minCartQuantity: productData.orderMinimumQuantity?.toString() || '1',
        maxCartQuantity: productData.orderMaximumQuantity?.toString() || '10',
        allowedQuantities: productData.allowedQuantities || '',
        allowAddingOnlyExistingAttributeCombinations: false,
        notReturnable: productData.notReturnable ?? false,
        isShipEnabled: productData.requiresShipping ?? true,
        isFreeShipping: productData.isFreeShipping ?? false,
        shipSeparately: productData.shipSeparately ?? false,
        additionalShippingCharge: productData.additionalShippingCharge?.toString() || '',
        deliveryDateId: productData.deliveryDateId || '',
        weight: productData.weight?.toString() || '',
        length: productData.length?.toString() || '',
        width: productData.width?.toString() || '',
        height: productData.height?.toString() || '',
        isPack: productData.isPack ?? false,
        packSize: productData.packSize?.toString() || '',
        isRecurring: productData.isRecurring ?? false,
        recurringCycleLength: productData.recurringCycleLength?.toString() || '',
        recurringCyclePeriod: productData.recurringCyclePeriod || 'days',
        recurringTotalCycles: productData.recurringTotalCycles?.toString() || '',
        subscriptionDiscountPercentage: productData.subscriptionDiscountPercentage?.toString() || '',
        allowedSubscriptionFrequencies: productData.allowedSubscriptionFrequencies || '',
        subscriptionDescription: productData.subscriptionDescription || '',
        isRental: productData.isRental ?? false,
        rentalPriceLength: productData.rentalPriceLength?.toString() || '',
        rentalPricePeriod: productData.rentalPricePeriod || 'days',
        isGiftCard: productData.isGiftCard ?? false,
        giftCardType: productData.giftCardType || 'virtual',
        overriddenGiftCardAmount: productData.overriddenGiftCardAmount?.toString() || '',
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
        metaTitle: productData.metaTitle || '',
        metaDescription: productData.metaDescription || '',
        metaKeywords: productData.metaKeywords || '',
        searchEngineFriendlyPageName: productData.searchEngineFriendlyPageName || productData.slug || '',
        allowCustomerReviews: productData.allowCustomerReviews ?? true,
        productTags: productData.tags || '',
        relatedProducts: relatedProductsArray,
        crossSellProducts: crossSellProductsArray,
        productImages: [],
        videoUrls: videoUrlsArray,
        specifications: []
      });

      console.log('✅ Form data populated');

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

      // ✅ Load variants
      if (productData.variants && Array.isArray(productData.variants)) {
        const vars = productData.variants.map((variant: any) => ({
          id: variant.id || `var-${Date.now()}-${Math.random()}`,
          name: variant.name || '',
          sku: variant.sku || '',
          price: variant.price || 0,
          compareAtPrice: variant.compareAtPrice || variant.oldPrice || null,
          weight: variant.weight || null,
          stockQuantity: variant.stockQuantity || 0,
          trackInventory: variant.trackInventory ?? true,
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
          gtin: variant.gtin || null
        }));
        setProductVariants(vars);
        console.log('✅ Variants loaded:', vars.length);
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
// ==================== IMMEDIATE REDIRECT HANDLER ====================
const handleModalClose = () => {
  setIsLockModalOpen(false);
  router.push("/admin/products");
};


// ==================== ACQUIRE PRODUCT LOCK ====================
const acquireProductLock = async (productId: string): Promise<boolean> => {
  try {
    console.log('🔒 LOCK: Attempting to acquire lock...');
    setIsAcquiringLock(true);

    const response = await apiClient.post<LockResponse>(
      `${API_ENDPOINTS.products}/${productId}/lock?durationMinutes=15`,
      {}
    );

    console.log('🔒 LOCK: Response received:', response.data);

    if (response.data?.success === true && response.data?.data) {
      const lockData = response.data.data;

      setProductLock({
        isLocked: lockData.isLocked,
        lockedBy: lockData.lockedBy,
        expiresAt: lockData.expiresAt,
      });

      const expiryTime = new Date(lockData.expiresAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // ✅ SUCCESS: सिर्फ एक simple success toast
      toast.success(`Lock acquired\nExpires: ${expiryTime} (IST)`);

      setIsAcquiringLock(false);
      return true;
    }

    // success false → backend ने reject किया
    const fallbackMsg = response.data?.message || 'Failed to acquire lock';
    throw new Error(fallbackMsg);

  } catch (error: any) {
    setIsAcquiringLock(false);

    let displayMessage = 'Product could not be locked for editing.';

    if (error.response?.data?.message) {
      displayMessage = error.response.data.message;
    } else if (error.message) {
      displayMessage = error.message;
    }

    // 🔒 LOCK FAIL: Modal + सिर्फ एक warning toast (simple & clean)
    setLockModalMessage(displayMessage);
    setIsLockModalOpen(true);

    toast.warning(displayMessage, {
  
    });

    // Auto redirect
    setTimeout(() => {
      router.push('/admin/products');
    }, 3500);

    return false;
  }
};

// ==================== RELEASE PRODUCT LOCK ====================
const releaseProductLock = async (productId: string): Promise<boolean> => {
  try {
    const response = await apiClient.delete<any>(
      `${API_ENDPOINTS.products}/${productId}/lock`
    );

    if (response.data?.success === true) {
      setProductLock(null);
      // ✅ RELEASE SUCCESS: सिर्फ एक success toast
      toast.success('Product lock released successfully', {
   
      });
      return true;
    }

    // success false but not error (rare)
    toast.warning(response.data?.message || 'Could not release lock');
    return false;

  } catch (error: any) {
    let errorMessage = 'Failed to release lock';

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message; // e.g. "You cannot release a lock held by another user..."
    } else if (error.message) {
      errorMessage = error.message;
    }

    // ❌ RELEASE FAIL: सिर्फ एक error toast
    toast.error(errorMessage);

    return false;
  }
};
// ========== 3. HANDLE CANCEL FUNCTION ==========
const handleCancel = async () => {
  // Release lock before navigating away
  await releaseProductLock(productId);
  router.push("/admin/products");
};

// 1. Acquire lock on component mount
useEffect(() => {
  if (!productId) return;

  // Acquire lock when user opens edit page
  acquireProductLock(productId);

  // Cleanup: Release lock on unmount (when user leaves page)
  return () => {
    releaseProductLock(productId);
  };
}, [productId]);
// 2. Auto-refresh lock every 10 minutes ⚠️ ADD THIS
useEffect(() => {
  if (!productId) return;

  const refreshInterval = setInterval(() => {
    console.log("🔄 Refreshing product lock...");
    acquireProductLock(productId);
  }, 10 * 60 * 1000); // 10 minutes

  return () => clearInterval(refreshInterval);
}, [productId]);
// ==================== FORM SUBMISSION HANDLER ====================
const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
  e.preventDefault();
  const target = e.target as HTMLElement;

  console.log('🚀 [SUBMIT] Starting submission...');
  console.log('📊 [SUBMIT] Current state:', {
    isAcquiringLock,
    hasLock: productLock?.isLocked,
    lockedBy: productLock?.lockedBy,
    expiresAt: productLock?.expiresAt
  });

  // ⚡ CHECK 1: Already submitting?
  if (target.hasAttribute('data-submitting')) {
    console.warn('⚠️ [SUBMIT] Already submitting - blocked');
    toast.info('⏳ Already submitting... Please wait!');
    return;
  }

  // ⚡ CHECK 2: Lock still being acquired?
  if (isAcquiringLock) {
    console.warn('⚠️ [SUBMIT] Lock still being acquired - blocked');
    toast.warning('⏳ Acquiring edit lock... Please wait a moment.');
    return;
  }

  // ⚡ CHECK 3: Do we have a valid lock?
  if (!productLock || !productLock.isLocked) {
    console.error('❌ [SUBMIT] No valid lock - blocked');
    toast.error('❌ Cannot save: Product edit lock not acquired. Please try again.');
    return;
  }

  // ⚡ CHECK 4: Is lock expired?
  if (productLock.expiresAt) {
    const expiryTime = new Date(productLock.expiresAt).getTime();
    const currentTime = new Date().getTime();
    
    console.log('⏰ [SUBMIT] Lock expiry check:', {
      expiresAt: new Date(expiryTime).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      isExpired: currentTime >= expiryTime
    });
    
    if (currentTime >= expiryTime) {
      console.warn('⚠️ [SUBMIT] Lock expired - refreshing');
      toast.error('❌ Your edit lock has expired. Refreshing...');
      await acquireProductLock(productId);
      return;
    }
  }

  console.log('✅ [SUBMIT] All checks passed - proceeding with submission');
  target.setAttribute('data-submitting', 'true');
    
  try {
    // ✅ Validation
    if (!formData.name || !formData.sku) {
      console.error('❌ [VALIDATION] Missing required fields');
      toast.error('⚠️ Please fill in required fields: Product Name and SKU.');
      target.removeAttribute('data-submitting');
      return;
    }

    console.log('✅ [VALIDATION] Basic validation passed');

    // ✅ Helper function for SAFE number parsing
    const parseNumber = (value: any, fieldName: string = ''): number | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const cleaned = String(value).trim().replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed)) {
        console.warn(`⚠️ Invalid number for ${fieldName}:`, value);
        return null;
      }

      return parsed;
    };

    // ✅ Parse and validate REQUIRED price
    const parsedPrice = parseNumber(formData.price, 'price');
    if (parsedPrice === null || parsedPrice < 0) {
      console.error('❌ [VALIDATION] Invalid price');
      toast.error('⚠️ Please enter a valid product price (must be 0 or greater).');
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ Parse OPTIONAL prices
    const parsedOldPrice = parseNumber(formData.oldPrice, 'oldPrice');
    const parsedCost = parseNumber(formData.cost, 'cost');

    if (parsedOldPrice !== null && parsedOldPrice < 0) {
      toast.error('⚠️ Old price must be 0 or greater.');
      target.removeAttribute('data-submitting');
      return;
    }

    if (parsedCost !== null && parsedCost < 0) {
      toast.error('⚠️ Cost price must be 0 or greater.');
      target.removeAttribute('data-submitting');
      return;
    }

    const nameRegex = /^[A-Za-z0-9\s\-.,()'/]+$/;
    if (!nameRegex.test(formData.name)) {
      toast.error("⚠️ Invalid product name. Special characters like @, #, $, % are not allowed.");
      target.removeAttribute('data-submitting');
      return;
    }

    if (formData.productType === 'grouped' && formData.requireOtherProducts) {
      if (!formData.requiredProductIds || !formData.requiredProductIds.trim()) {
        toast.error('⚠️ Please select at least one product for grouped product.');
        target.removeAttribute('data-submitting');
        return;
      }
    }

    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // ✅ Process Category ID
    let categoryId: string | null = null;
    if (formData.categories && formData.categories.trim()) {
      const trimmedCategory = formData.categories.trim();
      if (guidRegex.test(trimmedCategory)) {
        categoryId = trimmedCategory;
      }
    }

    // ✅ Process Multiple Brands
    let brandIdsArray: string[] = [];

    if (formData.brandIds && Array.isArray(formData.brandIds) && formData.brandIds.length > 0) {
      brandIdsArray = formData.brandIds.filter(id => {
        if (!id || typeof id !== 'string') return false;
        return guidRegex.test(id.trim());
      });
    } 
    else if (formData.brand && formData.brand.trim()) {
      const trimmedBrand = formData.brand.trim();
      if (guidRegex.test(trimmedBrand)) {
        brandIdsArray = [trimmedBrand];
      }
    }

    if (brandIdsArray.length === 0) {
      toast.error('❌ Please select at least one brand');
      target.removeAttribute('data-submitting');
      return;
    }

    const brandsArray = brandIdsArray.map((brandId, index) => ({
      brandId: brandId,
      isPrimary: index === 0,
      displayOrder: index + 1
    }));

    console.log('✅ [VALIDATION] All validations passed');

    // ✅ Prepare attributes
    const attributesArray = productAttributes
      ?.filter(attr => attr.name && attr.value)
      .map(attr => ({
        id: attr.id || undefined,
        name: attr.name,
        value: attr.value,
        displayOrder: attr.displayOrder || 0
      }));

    // ✅ Prepare variants
    const variantsArray = productVariants?.map(variant => {
      const imageUrl = variant.imageUrl?.startsWith('blob:') ? null : variant.imageUrl;
      
      return {
        name: variant.name || '',
        sku: variant.sku || '',
        price: typeof variant.price === 'number' ? variant.price : (parseNumber(variant.price, 'variant.price') ?? 0),
        compareAtPrice: typeof variant.compareAtPrice === 'number' ? variant.compareAtPrice : parseNumber(variant.compareAtPrice, 'variant.compareAtPrice'),
        oldPrice: typeof variant.compareAtPrice === 'number' ? variant.compareAtPrice : parseNumber(variant.compareAtPrice, 'variant.oldPrice'),
        weight: typeof variant.weight === 'number' ? variant.weight : parseNumber(variant.weight, 'variant.weight'),
        stockQuantity: typeof variant.stockQuantity === 'number' ? variant.stockQuantity : (parseInt(String(variant.stockQuantity)) || 0),
        trackInventory: variant.trackInventory ?? true,
        option1Name: variant.option1Name || null,
        option1Value: variant.option1Value || null,
        option2Name: variant.option2Name || null,
        option2Value: variant.option2Value || null,
        option3Name: variant.option3Name || null,
        option3Value: variant.option3Value || null,
        imageUrl: imageUrl,
        isDefault: variant.isDefault ?? false,
        displayOrder: variant.displayOrder ?? 0,
        isActive: variant.isActive ?? true,
        gtin: variant.gtin || null,
        barcode: variant.sku || null
      };
    });

    // ✅ PRODUCT DATA WITH PROPER NUMBER TYPES
    const productData: any = {
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || `${formData.name} - Product description`,
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      gtin: formData.gtin?.trim() || null,
      manufacturerPartNumber: formData.manufacturerPartNumber?.trim() || null,
      
      status: isDraft ? "Draft" : "Active",
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
      showOnHomepage: formData.showOnHomepage ?? false,
      displayOrder: parseInt(formData.displayOrder) || 0,
      adminComment: formData.adminComment?.trim() || null,
      isPack: formData.isPack ?? false,
      gender: formData.gender?.trim() || null,
      
      brandId: brandIdsArray[0],
      brandIds: brandIdsArray,
      brands: brandsArray,
      
      vendor: null,
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
      basepriceUnit: formData.basepriceEnabled ? (formData.basepriceUnit || null) : null,
      basepriceBaseAmount: parseNumber(formData.basepriceBaseAmount, 'basepriceBaseAmount'),
      basepriceBaseUnit: formData.basepriceEnabled ? (formData.basepriceBaseUnit || null) : null,
      
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
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      displayStockAvailability: formData.displayStockAvailability ?? true,
      displayStockQuantity: formData.displayStockQuantity ?? false,
      minStockQuantity: parseInt(formData.minStockQuantity) || 0,
      lowStockThreshold: parseInt(formData.minStockQuantity) || 0,
      notifyAdminForQuantityBelow: formData.notifyAdminForQuantityBelow ?? false,
      notifyQuantityBelow: formData.notifyAdminForQuantityBelow 
        ? parseInt(formData.notifyQuantityBelow) || 0 
        : null,
      allowBackorder: formData.allowBackorder ?? false,
      backorderMode: formData.backorderMode || 'no-backorders',
      orderMinimumQuantity: parseInt(formData.minCartQuantity) || 0,
      orderMaximumQuantity: parseInt(formData.maxCartQuantity) || 0,
      allowedQuantities: formData.allowedQuantities?.trim() || null,
      notReturnable: formData.notReturnable ?? false,
      
      requiresShipping: formData.isShipEnabled ?? true,
      isFreeShipping: formData.isFreeShipping ?? false,
      shipSeparately: formData.shipSeparately ?? false,
      additionalShippingCharge: parseNumber(formData.additionalShippingCharge, 'additionalShippingCharge'),
      deliveryDateId: formData.deliveryDateId || null,
      estimatedDispatchDays: 0,
      dispatchTimeNote: null,
      weight: parseNumber(formData.weight, 'weight') || 0,
      length: parseNumber(formData.length, 'length'),
      width: parseNumber(formData.width, 'width'),
      height: parseNumber(formData.height, 'height'),
      weightUnit: 'kg',
      dimensionUnit: 'cm',
      
      isRecurring: formData.isRecurring ?? false,
      recurringCycleLength: formData.isRecurring ? parseInt(formData.recurringCycleLength) || 0 : null,
      recurringCyclePeriod: formData.isRecurring ? (formData.recurringCyclePeriod || 'days') : null,
      recurringTotalCycles: formData.isRecurring && formData.recurringTotalCycles 
        ? parseInt(formData.recurringTotalCycles) 
        : null,
      subscriptionDiscountPercentage: parseNumber(formData.subscriptionDiscountPercentage, 'subscriptionDiscountPercentage'),
      allowedSubscriptionFrequencies: formData.allowedSubscriptionFrequencies?.trim() || null,
      subscriptionDescription: formData.subscriptionDescription?.trim() || null,
      
      isRental: formData.isRental ?? false,
      rentalPriceLength: formData.isRental ? parseInt(formData.rentalPriceLength) || 0 : null,
      rentalPricePeriod: formData.isRental ? (formData.rentalPricePeriod || 'days') : null,
      
      metaTitle: formData.metaTitle?.trim() || null,
      metaDescription: formData.metaDescription?.trim() || null,
      metaKeywords: formData.metaKeywords?.trim() || null,
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName?.trim() || null,
      
      allowCustomerReviews: formData.allowCustomerReviews ?? false,
      
      videoUrls: formData.videoUrls && formData.videoUrls.length > 0 
        ? formData.videoUrls.join(',') 
        : null,
      
      attributes: attributesArray && attributesArray.length > 0 ? attributesArray : [],
      variants: variantsArray && variantsArray.length > 0 ? variantsArray : [],
      
      relatedProductIds: Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0 
        ? formData.relatedProducts.join(',') 
        : null,
      crossSellProductIds: Array.isArray(formData.crossSellProducts) && formData.crossSellProducts.length > 0 
        ? formData.crossSellProducts.join(',') 
        : null,
      
      categoryId: categoryId
    };

    // ✅ Clean up
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([key, value]) => {
        if (value === false || value === 0) return true;
        if (Array.isArray(value)) return true;
        return value !== null && value !== undefined && value !== '';
      })
    );

    console.log('📦 [PAYLOAD] Sending product data:', {
      name: cleanProductData.name,
      sku: cleanProductData.sku,
      price: cleanProductData.price,
      brandIds: cleanProductData.brandIds
    });

     console.log('📤 [API] Sending PUT request to:', `/api/Products/${productId}`);
    
    // ✅ FIXED: Use custom API client format
    const response = await apiClient.put<any>(`/api/Products/${productId}`, cleanProductData);

    console.log('📥 [API] Response received:', response);

    // ✅ Check for errors first
    if (response.error) {
      console.error('❌ [ERROR] API returned error:', response.error);
      throw new Error(response.error);
    }

    // ✅ Check if response has data
    if (response.data) {
      const apiResponse = response.data;
      
      console.log('🔍 [RESPONSE] Checking success flag:', apiResponse.success);
      
      // Backend success check
      if (apiResponse.success === true || apiResponse.success === undefined) {
        console.log('✅ [SUCCESS] Product updated successfully');
        
        toast.success(
          isDraft ? '✅ Product saved as draft!' : '✅ Product updated successfully!',
          { autoClose: 3000 }
        );

        // ✅ RELEASE LOCK
        console.log('🔓 [LOCK] Releasing lock...');
        await releaseProductLock(productId);

        setTimeout(() => {
          console.log('🔄 [REDIRECT] Redirecting to products list');
          router.push('/admin/products');
        }, 800);
      } else if (apiResponse.success === false) {
        console.error('❌ [ERROR] Backend returned success: false');
        throw new Error(apiResponse.message || 'Update failed');
      }
    } else {
      console.error('❌ [ERROR] No response data received');
      throw new Error('No response received from server');
    }

  } catch (error: any) {
    console.error('❌ [ERROR] Submission failed:', error);
    
    let errorMessage = 'Failed to update product';
    
    // Use error message from custom API client
    if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage, { autoClose: 10000 });
    
  } finally {
    target.removeAttribute('data-submitting');
    console.log('🏁 [SUBMIT] Submission process completed');
  }
};

// ✅ COMPLETE FIXED handleChange - ADD PRICE FIELD HANDLING
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;

  // ================================
  // ✅ NEW: PRICE FIELDS - Clean input on change
  // ================================
  if (name === 'price' || name === 'oldPrice' || name === 'cost') {
    // Allow only numbers and one decimal point
    const cleanedValue = value.replace(/[^\d.]/g, '');
    const parts = cleanedValue.split('.');
    
    // Ensure only one decimal point
    const finalValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : cleanedValue;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    return;
  }

  // ================================
  // ✅ NEW: OTHER NUMBER FIELDS - Clean input
  // ================================
  if (
    name === 'weight' || 
    name === 'length' || 
    name === 'width' || 
    name === 'height' ||
    name === 'stockQuantity' ||
    name === 'minStockQuantity' ||
    name === 'notifyQuantityBelow' ||
    name === 'minCartQuantity' ||
    name === 'maxCartQuantity' ||
    name === 'additionalShippingCharge' ||
    name === 'minimumCustomerEnteredPrice' ||
    name === 'maximumCustomerEnteredPrice' ||
    name === 'basepriceAmount' ||
    name === 'basepriceBaseAmount' ||
    name === 'subscriptionDiscountPercentage'
  ) {
    // Allow only numbers and one decimal point
    const cleanedValue = value.replace(/[^\d.]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: cleanedValue
    }));
    return;
  }

  // ================================
  // 1. CATEGORY SELECTION
  // ================================
  if (name === "categories") {
    const select = e.target as HTMLSelectElement;
    const opt = select.options[select.selectedIndex];

    const displayName =
      opt.dataset.categoryName ||
      opt.dataset.displayName ||
      opt.text.replace(/^[\s\u00A0]*└──\s*/, "").replace(/📁\s*/, "");

    setFormData(prev => ({
      ...prev,
      categories: value,
      categoryName: displayName
    }));
    return;
  }

  // ================================
  // 2. SEO FRIENDLY PAGE NAME (with debounce)
  // ================================
  if (name === "searchEngineFriendlyPageName") {
    setFormData(prev => ({ ...prev, searchEngineFriendlyPageName: value }));

    clearTimeout(seoTimer);
    seoTimer = setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(prev.searchEngineFriendlyPageName)
      }));
    }, 1500);
    return;
  }

  // ================================
  // 3. PRODUCT NAME - Auto-generate SEO slug
  // ================================
  if (name === "name") {
    setFormData(prev => ({ ...prev, name: value }));

    clearTimeout(seoTimer);
    seoTimer = setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(value)
      }));
    }, 1000);
    return;
  }

  // ================================
  // 4. PRODUCT TYPE - Grouped/Simple
  // ================================
  if (name === "productType") {
    if (value === 'grouped') {
      setIsGroupedModalOpen(true);
    }
    
    setFormData(prev => ({
      ...prev,
      productType: value,
      ...(value === 'simple' && {
        requireOtherProducts: false,
        requiredProductIds: '',
        automaticallyAddProducts: false
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

  // ================================
  // 5. REQUIRE OTHER PRODUCTS
  // ================================
  if (name === "requireOtherProducts") {
    setFormData(prev => ({
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

  // ================================
  // 6. SHIPPING ENABLED - Master Switch
  // ================================
  if (name === "isShipEnabled") {
    setFormData(prev => ({
      ...prev,
      isShipEnabled: checked,
      isFreeShipping: checked ? prev.isFreeShipping : false,
      additionalShippingCharge: checked ? prev.additionalShippingCharge : "",
      shipSeparately: checked ? prev.shipSeparately : false,
      weight: checked ? prev.weight : "",
      length: checked ? prev.length : "",
      width: checked ? prev.width : "",
      height: checked ? prev.height : "",
      deliveryDateId: checked ? prev.deliveryDateId : ""
    }));
    return;
  }

  // ================================
  // 7. FREE SHIPPING (Auto reset charge)
  // ================================
  if (name === "isFreeShipping") {
    setFormData(prev => ({
      ...prev,
      isFreeShipping: checked,
      additionalShippingCharge: checked ? "" : prev.additionalShippingCharge
    }));
    return;
  }

  // ================================
  // 8. RECURRING / SUBSCRIPTION PRODUCT
  // ================================
  if (name === "isRecurring") {
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
  // 9. PACK / BUNDLE PRODUCT
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
  // 10. MARK AS NEW (with date reset)
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
  // 12. BASE PRICE ENABLED
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
  // 13. NOTIFY ADMIN - Low Stock
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
  // 14. ALLOW BACKORDER
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
  // 15. AVAILABLE FOR PRE-ORDER
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
  // 16. GIFT CARD
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
  // 17. DOWNLOADABLE PRODUCT
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
  // 18. RENTAL PRODUCT
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
  // 19. HAS USER AGREEMENT
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
  // 20. HAS SAMPLE DOWNLOAD
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
  // 21. UNLIMITED DOWNLOADS
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
  // 22. GENERIC CHECKBOXES
  // ================================
  if (type === "checkbox") {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
    return;
  }

  // ================================
  // 23. DEFAULT: Text, Number, Select, Textarea
  // ================================
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};



// ✅ Delete Product Attribute
const deleteProductAttribute = async (productId: string, attributeId: string) => {
  try {
    const response = await apiClient.delete(
      `/api/Products/${productId}/attributes/${attributeId}`
    );
    
    if (response?.data) {
      toast.success('✅ Attribute deleted successfully!');
      // Remove from local state
      setProductAttributes(productAttributes.filter(attr => attr.id !== attributeId));
    }
  } catch (error: any) {
    console.error('❌ Error deleting attribute:', error);
    toast.error(error.response?.data?.message || 'Failed to delete attribute');
  }
};

// ✅ Delete Product Variant
const deleteProductVariant = async (productId: string, variantId: string) => {
  try {
    const response = await apiClient.delete(
      `/api/Products/${productId}/variants/${variantId}`
    );
    
    if (response?.data) {
      toast.success('✅ Variant deleted successfully!');
      // Remove from local state
      setProductVariants(productVariants.filter(v => v.id !== variantId));
    }
  } catch (error: any) {
    console.error('❌ Error deleting variant:', error);
    toast.error(error.response?.data?.message || 'Failed to delete variant');
  }
};

// ✅ Updated Remove Functions with Confirmation
const removeProductAttribute = (id: string) => {
  if (confirm('⚠️ Are you sure you want to delete this attribute?')) {
    deleteProductAttribute(productId, id);
  }
};

const removeProductVariant = (id: string) => {
  if (confirm('⚠️ Are you sure you want to delete this variant?')) {
    deleteProductVariant(productId, id);
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


// ✅ UPDATED: Add Product Variant with correct structure
const addProductVariant = () => {
  const newVariant: ProductVariant = {
    id: Date.now().toString(),
    name: '',
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
    isActive: true
  };
  setProductVariants([...productVariants, newVariant]);
};



const updateProductVariant = (id: string, field: keyof ProductVariant, value: any) => {
  setProductVariants(productVariants.map(variant =>
    variant.id === id ? { ...variant, [field]: value } : variant
  ));
};

// UPDATED - Upload variant image immediately in Edit mode
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
  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.warning('⚠️ Unsupported image format (JPG, PNG, WebP only)');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.warning('⚠️ Image size must be under 5MB');
    return;
  }

  const token = localStorage.getItem('authToken');
  if (!token) {
    toast.error('❌ Authentication required');
    return;
  }

  try {
    /* =======================
       PREVIEW (OPTIMISTIC UI)
    ======================= */

    const previewUrl = URL.createObjectURL(file);

    setProductVariants(prev =>
      prev.map(variant =>
        variant.id === variantId
          ? { ...variant, imageUrl: previewUrl, imageFile: file }
          : variant
      )
    );

    /* =======================
       UPLOAD
    ======================= */

    const formData = new FormData();
    formData.append('image', file); // API param name

    const uploadResponse = await fetch(
      `${API_BASE_URL}/api/Products/variants/${variantId}/image`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ❌ Do not set Content-Type manually
        },
        body: formData,
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
    console.log('✅ Upload response:', result);

    const uploadedImageUrl =
      result?.imageUrl || result?.data?.imageUrl || result?.data || null;

    if (!uploadedImageUrl) {
      throw new Error('Invalid server response');
    }

    /* =======================
       FINAL STATE UPDATE
    ======================= */

    setProductVariants(prev =>
      prev.map(variant => {
        if (variant.id === variantId) {
          if (variant.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(variant.imageUrl);
          }

          return {
            ...variant,
            imageUrl: uploadedImageUrl,
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

    toast.error(`Failed to upload variant image: ${error.message}`);
  }
};







// ✅ REPLACE existing handleImageUpload function:
const ALLOWED_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/jpg"
];

const MAX_SIZE = 500 * 1024;     // 500 KB hard limit
const WARN_SIZE = 300 * 1024;    // 300 KB recommended
const MIN_WIDTH = 800;
const MIN_HEIGHT = 800;

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (!formData.name.trim()) {
    toast.error("Please enter product name before uploading images");
    return;
  }

  if (formData.productImages.length + files.length > 10) {
    toast.error(`Maximum 10 images allowed. You can add ${10 - formData.productImages.length} more.`);
    return;
  }

  const validatedFiles: File[] = [];

  for (const file of Array.from(files)) {
    /* ================= FORMAT & MIME ================= */
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`❌ ${file.name}: Only WebP, AVIF or JPG images allowed`);
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

    /* ================= FILENAME SAFETY ================= */
    if (!/^[a-zA-Z0-9\-_.]+$/.test(file.name)) {
      toast.error(`❌ ${file.name}: Invalid characters in filename`);
      continue;
    }

    /* ================= DIMENSION & RATIO ================= */
    const isValidImage = await new Promise<boolean>((resolve) => {
      const img = new window.Image();

      img.src = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(img.src);

        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          toast.error(
            `❌ ${file.name}: Minimum resolution is ${MIN_WIDTH}x${MIN_HEIGHT}`
          );
          resolve(false);
          return;
        }

        const ratio = img.width / img.height;
        if (Math.abs(ratio - 1) > 0.1) {
          toast.warning(`⚠️ ${file.name}: Square (1:1) images are recommended`);
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
      img => img.fileName === file.name
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
    const uploadedImages = await uploadImagesToProductDirect(productId, validatedFiles);

    const newImages = uploadedImages.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      altText: img.altText,
      sortOrder: img.sortOrder,
      isMain: img.isMain,
      fileName: img.imageUrl.split('/').pop() || '',
      fileSize: 0,
      file: undefined
    }));

    setFormData(prev => ({
      ...prev,
      productImages: [...prev.productImages, ...newImages]
    }));

    toast.success(`✅ ${uploadedImages.length} image(s) uploaded successfully`);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
                Edit Product
              </h1>
              <p className="text-sm text-slate-400 mt-1">Update and configure your product details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
           <button
  onClick={handleCancel}
  className="px-5 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all text-sm font-medium"
>
  Cancel
</button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all text-sm font-medium flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              Save as Draft
            </button>
      
{/* Update Product Button */}
<button
  type="button"
  onClick={(e) => handleSubmit(e, false)}
  disabled={isAcquiringLock || !productLock?.isLocked || loading}
  className={cn(
    "px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 font-semibold transition-all",
    (isAcquiringLock || !productLock?.isLocked || loading)
      ? "bg-slate-700 text-slate-500 cursor-not-allowed opacity-50"
      : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-violet-500/50"
  )}
>
  {isAcquiringLock ? (
    <>
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>Acquiring Lock...</span>
    </>
  ) : !productLock?.isLocked ? (
    <>
      <X className="h-4 w-4" />
      <span>No Edit Lock</span>
    </>
  ) : loading ? (
    <>
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>Loading...</span>
    </>
  ) : (
    <>
      <Save className="h-4 w-4" />
      <span>Update Product</span>
    </>
  )}
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
  {/* Short Description Editor */}
  <div>
    <div className="flex items-center justify-between gap-3 mb-2">
      <label className="text-sm font-medium text-slate-300">
        Short Description
      </label>
      <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-cyan-300 whitespace-nowrap">
          Max 350 chars • Listings & Search
        </span>
      </div>
    </div>
    
    <ProductDescriptionEditor
      value={formData.shortDescription}
      onChange={(content) => {
        const plainText = content.replace(/<[^>]*>/g, "").trim();

        if (plainText.length > 350) {
          alert("You can not enter more than 350 characters");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          shortDescription: content,
        }));
      }}
      placeholder="Enter product short description..."
      height={250}
    />
  </div>

  {/* Full Description Editor */}
  <div>
    <div className="flex items-center justify-between gap-3 mb-2">
      <label className="text-sm font-medium text-slate-300">
        Full Description
      </label>
      <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-violet-300 whitespace-nowrap">
          Max 2000 chars • Detail Page & SEO
        </span>
      </div>
    </div>
    
    <ProductDescriptionEditor
      value={formData.fullDescription}
      onChange={(content) => {
        const plainText = content.replace(/<[^>]*>/g, "").trim();

        if (plainText.length > 2000) {
          alert("You can not enter more than 2000 characters");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          fullDescription: content,
        }));
      }}
      placeholder="Enter detailed product description..."
      height={400}
      required
    />
  </div>
</div>

 

      {/* ✅ Row 1: SKU, Brand, Categories (3 Columns) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="e.g., PROD-001"
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            required
          />
        </div>

{/* ✅ Multiple Brands Selector - EDIT PAGE */}
{/* ✅ Multiple Brands Selector */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span>Brands</span>
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


{/* Categories - Searchable Dropdown (Product Filter Style) */}
{/* Categories - Searchable Dropdown (Same as Add Page) */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span>Categories</span>
    <span className="text-xs text-emerald-400 font-normal">
      {dropdownsData.categories.length} loaded
    </span>
  </label>
  
  <div className="relative" ref={categoryDropdownRef}>
    <div className="relative">
      <input
        type="text"
        value={showCategoryDropdown ? categorySearchTerm : (formData.categoryName || '')}
        onChange={(e) => {
          setCategorySearchTerm(e.target.value);
          if (!showCategoryDropdown) setShowCategoryDropdown(true);
        }}
        onFocus={() => {
          setShowCategoryDropdown(true);
          setCategorySearchTerm("");
        }}
        placeholder="Search categories..."
        className={`w-full px-4 py-2.5 pl-10 pr-10 bg-slate-800/50 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
          formData.categories && formData.categories !== 'all'
            ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/50"
            : "border-slate-700 hover:border-slate-600"
        }`}
      />
      
      {/* Left Icon */}
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      
      {/* Right Icon - Clear or Chevron */}
      {formData.categories && formData.categories !== 'all' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFormData(prev => ({
              ...prev,
              categories: 'all',
              categoryName: ''
            }));
            setCategorySearchTerm("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-all"
        >
          <X className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
        </button>
      ) : (
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform ${
            showCategoryDropdown ? "rotate-180" : ""
          }`}
        />
      )}
    </div>

    {/* Dropdown Menu */}
    {showCategoryDropdown && (
      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50">
        {/* All Categories Option */}
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              categories: 'all',
              categoryName: ''
            }));
            setShowCategoryDropdown(false);
            setCategorySearchTerm("");
          }}
          className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all ${
            (!formData.categories || formData.categories === 'all') ? "bg-violet-500/10 text-violet-400" : "text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-sm font-medium">All Categories</span>
          </div>
        </button>

        {/* Category List with Hierarchy */}
        {(() => {
          const renderCategories = (categories: any[], level = 0, parentNames: string[] = []) => {
            return categories
              .filter(cat => {
                // Search in category name and full path
                const fullPath = level === 0 
                  ? cat.name 
                  : level === 1 
                    ? `${parentNames[0]} > ${cat.name}`
                    : `${parentNames[0]} > ${parentNames[1]} >> ${cat.name}`;
                
                return fullPath.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                       cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase());
              })
              .map(category => {
                // Build display name with hierarchy
                let displayName = category.name;
                let icon = '📁';
                let textColor = 'text-violet-300';
                
                if (level === 1) {
                  displayName = `${parentNames[0]} > ${category.name}`;
                  icon = '📂';
                  textColor = 'text-cyan-300';
                } else if (level === 2) {
                  displayName = `${parentNames[0]} > ${parentNames[1]} >> ${category.name}`;
                  icon = '📄';
                  textColor = 'text-green-300';
                }
                
                return (
                  <React.Fragment key={category.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          categories: category.id,
                          categoryName: displayName
                        }));
                        setShowCategoryDropdown(false);
                        setCategorySearchTerm("");
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-all border-t border-slate-700/50 ${
                        formData.categories === category.id 
                          ? "bg-violet-500/20 border-l-4 border-l-violet-500" 
                          : ""
                      }`}
                      style={{ paddingLeft: `${16 + level * 20}px` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className={`text-sm truncate ${
                            formData.categories === category.id 
                              ? 'text-white font-medium' 
                              : textColor
                          } ${level > 0 ? 'italic' : 'font-semibold'}`}>
                            {displayName}
                          </span>
                        </div>
                        
                        {/* Checkmark for selected */}
                        {formData.categories === category.id && (
                          <svg className="h-4 w-4 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                    
                    {/* Render subcategories recursively */}
                    {category.subCategories && category.subCategories.length > 0 && 
                      renderCategories(category.subCategories, level + 1, [...parentNames, category.name])
                    }
                  </React.Fragment>
                );
              });
          };

          const filteredCategories = renderCategories(dropdownsData.categories);
          
          return filteredCategories.length > 0 ? (
            filteredCategories
          ) : (
            <div className="px-4 py-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-slate-500 text-sm">No categories found</p>
              <p className="text-slate-600 text-xs mt-1">
                {categorySearchTerm ? `for "${categorySearchTerm}"` : 'Try a different search'}
              </p>
            </div>
          );
        })()}
      </div>
    )}
  </div>
  
  {/* Selected Category Info - Optional */}
  {/* {formData.categories && formData.categories !== 'all' && (
    <div className="mt-2 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
      <p className="text-xs text-violet-300 flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="truncate">
          <strong>Selected:</strong> {formData.categoryName}
        </span>
      </p>
    </div>
  )} */}
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

      {/* ✅ Inline Badge + Edit Button (like screenshot) */}
      {formData.productType === 'grouped' && (
        <>
          {/* Product Count Badge - Inline */}
          {selectedGroupedProducts.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-xl">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
              <span className="text-xs font-medium text-violet-300">
                {selectedGroupedProducts.length} linked
              </span>
            </div>
          )}
          
          {/* Settings/Edit Button */}
          <button
            type="button"
            onClick={() => setIsGroupedModalOpen(true)}
            className="p-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 hover:border-violet-500/50 text-violet-400 rounded-xl transition-all"
            title="Edit grouped product configuration"
          >
            <Settings className="w-5 h-5" />
          </button>
        </>
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

      {/* ✅ Show on Homepage + Display Order - Smart Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Column 1 - Show on Homepage checkbox */}
        <label className="flex items-center gap-2 w-full px-3 py-2.5  bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
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
<AdminCommentHistoryModal productId={productId} />
</div>


</TabsContent>

{/* ✅ ADD NEW TAB: GROUPED PRODUCTS */}


{/* Prices Tab - Updated for consistency */}
{/* Prices Tab - Updated with Pre-Order Section */}
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

    <div className="space-y-3">
      {/* First Row: 3 Checkboxes in 3 Columns */}
      <div className="grid md:grid-cols-3 gap-4">
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

  {/* ✅ PRE-ORDER SECTION - NEW (Above Mark as New) */}
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

    {/* ✅ Conditional Date Input */}
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

  {/* Tax Section */}
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

    {/* VAT Rate Dropdown - Only show if NOT exempt */}
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
              <option value="disable-buy">Disable buy button</option>
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

      {/* ✅ DELIVERY TIME ESTIMATE SECTION */}
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

  {/* Cart Settings - Always visible */}
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
        {/* Free Shipping */}
{/* Free Shipping */}
<div className="space-y-3">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      name="isFreeShipping"
      checked={formData.isFreeShipping}
      onChange={handleChange}
      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
    />
    <span className="text-sm text-slate-300">Free shipping</span>
  </label>

  {/* Ship Separately */}
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

{/* Additional Shipping Charge - Hide when Free Shipping is ON */}
<div
  className={cn(
    "transition-all duration-500 ease-out overflow-hidden",
    formData.isFreeShipping
      ? "max-h-0 opacity-0 -mt-2 pb-0"
      : "max-h-32 opacity-100 mt-4 pb-2"
  )}
>
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-300">
      Additional Shipping Charge (£)
    </label>
    <input
      type="number"
      name="additionalShippingCharge"
      value={formData.additionalShippingCharge}
      onChange={handleChange}
      placeholder="0.00"
      step="0.01"
      disabled={formData.isFreeShipping}
      className={cn(
        "w-full px-3 py-2 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all",
        formData.isFreeShipping
          ? "border-slate-700/50 opacity-60 cursor-not-allowed"
          : "border-slate-700"
      )}
    />
    {/* {formData.isFreeShipping && (
      <p className="text-xs text-emerald-400 mt-1 animate-fadeIn">
        Free shipping enabled — no additional charge applied
      </p>
    )} */}
  </div>
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
                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
                      <Tag className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Product Attributes Yet</h3>
                      <p className="text-slate-400 mb-4">
                        Click "Add Attribute" to add custom product information
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

              {/* Product Variants Tab - NEW */}
{/* ✅ COMPLETE UPDATED Product Variants Tab */}
<TabsContent value="variants" className="space-y-2 mt-2">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">Product Variants</h3>
        <p className="text-sm text-slate-400">
          Create variants like different sizes, colors, or configurations with their own pricing and inventory
        </p>
      </div>
      <button
        type="button"
        onClick={addProductVariant}
        className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <Package className="h-4 w-4" />
        Add Variant
      </button>
    </div>

    {productVariants.length === 0 ? (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
        <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Product Variants Yet</h3>
        <p className="text-slate-400 mb-4">
          Click "Add Variant" to create different versions of this product
        </p>
        <p className="text-sm text-slate-500">
          Example: 500ml Original, 750ml Original, 200ml Fresh
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {productVariants.map((variant, index) => (
          <div key={variant.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-medium">Variant #{index + 1}</h4>
                {variant.isDefault && (
                  <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-md">
                    Default
                  </span>
                )}
                {!variant.isActive && (
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md">
                    Inactive
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeProductVariant(variant.id)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Basic Info Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => updateProductVariant(variant.id, 'name', e.target.value)}
                  placeholder="e.g., 500ml Original"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={variant.sku}
                  onChange={(e) => updateProductVariant(variant.id, 'sku', e.target.value)}
                  placeholder="e.g., JOHNSON-500ML"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Pricing & Stock Row */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.price || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="9.99"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Compare At Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.compareAtPrice || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="12.99"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={variant.weight || ''}
                  onChange={(e) => updateProductVariant(variant.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.55"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={variant.stockQuantity}
                  onChange={(e) => updateProductVariant(variant.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                  placeholder="150"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* ✅ UPDATED: Option 1 (Name + Value) */}
            <div className="space-y-4 mb-4 bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-violet-400">Option 1</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Name
                  </label>
                  <input
                    type="text"
                    value={variant.option1Name || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option1Name', e.target.value || null)}
                    placeholder="e.g., Size, Pack Size"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Value
                  </label>
                  <input
                    type="text"
                    value={variant.option1Value || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option1Value', e.target.value || null)}
                    placeholder="e.g., 500ml, Pack of 12"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* ✅ UPDATED: Option 2 (Name + Value) */}
            <div className="space-y-4 mb-4 bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-cyan-400">Option 2</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Name
                  </label>
                  <input
                    type="text"
                    value={variant.option2Name || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option2Name', e.target.value || null)}
                    placeholder="e.g., Purchase Type, Color"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Value
                  </label>
                  <input
                    type="text"
                    value={variant.option2Value || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option2Value', e.target.value || null)}
                    placeholder="e.g., One Time Purchase, Black"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* ✅ UPDATED: Option 3 (Name + Value) - Optional */}
            <div className="space-y-4 mb-4 bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-pink-400">Option 3 (Optional)</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Name
                  </label>
                  <input
                    type="text"
                    value={variant.option3Name || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option3Name', e.target.value || null)}
                    placeholder="e.g., Material, Style"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Value
                  </label>
                  <input
                    type="text"
                    value={variant.option3Value || ''}
                    onChange={(e) => updateProductVariant(variant.id, 'option3Value', e.target.value || null)}
                    placeholder="e.g., Premium, WiFi+Cellular"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Variant Image Upload */}
{/* ✅ UPDATED: Variant Image Upload with Preview */}
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Variant Image
  </label>
  
  {/* ✅ Preview Section */}
  {variant.imageUrl ? (
    <div className="relative inline-block mb-3">
      <img
        src={
          variant.imageUrl.startsWith("blob:") 
            ? variant.imageUrl // Preview (local)
            : variant.imageUrl.startsWith("http") || variant.imageUrl.startsWith("/")
            ? `${API_BASE_URL}${variant.imageUrl}` // Server URL
            : variant.imageUrl
        }
        alt={variant?.name || "Variant"}
        className="w-32 h-32 object-cover rounded-lg border-2 border-slate-700 shadow-lg"
      />
      
      {/* ✅ Preview Badge */}
      {variant.imageUrl.startsWith("blob:") && (
        <span className="absolute top-1 right-1 px-2 py-1 bg-orange-500 text-white text-xs rounded-md">
          Preview
        </span>
      )}
      
      {/* ✅ Remove Image Button */}
      <button
        type="button"
        onClick={() => {
          if (variant.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(variant.imageUrl);
          }
          updateProductVariant(variant.id, 'imageUrl', null);
          updateProductVariant(variant.id, 'imageFile', undefined);
        }}
        className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : null}
  
  {/* ✅ Upload Button */}
  <div className="flex items-center gap-2">
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          // ✅ Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
          }
          
          // ✅ Validate file type
          if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file");
            return;
          }
          
          handleVariantImageUpload(variant.id, file);
        }
      }}
      className="hidden"
      id={`variant-image-${variant.id}`}
    />
    <label
      htmlFor={`variant-image-${variant.id}`}
      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
    >
      <Upload className="h-4 w-4" />
      {variant.imageUrl ? "Change Image" : "Upload Image"}
    </label>
    
    {/* ✅ Help Text */}
    <div className="text-sm text-slate-400">
      {variant.imageUrl?.startsWith("blob:") ? (
        <span className="text-orange-400">⚠️ Save product to upload to server</span>
      ) : (
        <span>Optional - Max 5MB</span>
      )}
    </div>
  </div>
</div>


            {/* Variant Settings */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`variant-default-${variant.id}`}
                  checked={variant.isDefault}
                  onChange={(e) => {
                    setProductVariants(productVariants.map(v => ({
                      ...v,
                      isDefault: v.id === variant.id ? e.target.checked : false
                    })));
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300">Set as default variant</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`variant-track-${variant.id}`}
                  checked={variant.trackInventory}
                  onChange={(e) => updateProductVariant(variant.id, 'trackInventory', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300">Track inventory</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`variant-active-${variant.id}`}
                  checked={variant.isActive}
                  onChange={(e) => updateProductVariant(variant.id, 'isActive', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Help Section */}
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <h4 className="font-semibold text-sm text-blue-400 mb-2">💡 Variant Examples</h4>
      <ul className="text-sm text-slate-400 space-y-1">
        <li>• <strong>Example 1:</strong> Option1Name: "Pack Size", Option1Value: "Pack of 12" | Option2Name: "Purchase Type", Option2Value: "One Time Purchase"</li>
        <li>• <strong>Example 2:</strong> Option1Name: "Size", Option1Value: "500ml" | Option2Name: "Scent", Option2Value: "Original"</li>
        <li>• Each variant should have a unique SKU</li>
        <li>• Set one variant as default - it will be shown first to customers</li>
      </ul>
    </div>
  </div>
</TabsContent>

{/* SEO Tab - Synced with Variants */}
<TabsContent value="seo" className="space-y-2 mt-2">
  <div className="space-y-4 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
    <div>
      <h3 className="text-lg font-semibold text-white">Search Engine Optimization</h3>
      <p className="text-sm text-slate-400">
        Optimize your product for search engines to improve visibility
      </p>
    </div>

    {/* Meta Title */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">Meta Title</label>
        <span
          className={`text-xs font-medium ${
            formData.metaTitle.length > 60
              ? 'text-red-400'
              : formData.metaTitle.length > 50
              ? 'text-yellow-400'
              : 'text-slate-500'
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
            ? 'border-red-500/50'
            : formData.metaTitle.length > 50
            ? 'border-yellow-500/50'
            : 'border-slate-700'
        }`}
      />
      <p className="text-xs text-slate-400 mt-1">Recommended: 50-60 characters</p>
    </div>

    {/* Meta Description */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">Meta Description</label>
        <span
          className={`text-xs font-medium ${
            formData.metaDescription.length > 160
              ? 'text-red-400'
              : formData.metaDescription.length > 150
              ? 'text-yellow-400'
              : 'text-slate-500'
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
        placeholder="Brief description for search engine results"
        rows={3}
        className={`w-full px-4 py-2.5 bg-slate-900/70 border rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none ${
          formData.metaDescription.length > 160
            ? 'border-red-500/50'
            : formData.metaDescription.length > 150
            ? 'border-yellow-500/50'
            : 'border-slate-700'
        }`}
      />
      <p className="text-xs text-slate-400 mt-1">Recommended: 150-160 characters</p>
    </div>

    {/* Meta Keywords */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">Meta Keywords</label>
        <span className="text-xs text-slate-500">
          {formData.metaKeywords.split(',').filter((k) => k.trim()).length} keywords
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
      <p className="text-xs text-slate-400 mt-1">Comma-separated keywords</p>
    </div>

    {/* SEO Friendly URL */}
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">URL Slug</label>
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
      <p className="text-xs text-slate-400 mt-1">
        Leave empty to auto-generate from product name
      </p>
    </div>

    {/* SEO Tips */}
    <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
      <h4 className="font-semibold text-sm text-violet-400 mb-1.5">SEO Tips</h4>
      <ul className="text-xs text-slate-300 space-y-1">
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
    <p className="text-sm text-slate-400">
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
                {!image.file && image.imageUrl && (
                  <div className="text-[10px] text-green-400">✓</div>
                )}
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
  onProductsChange={handleGroupedProductsChange}
  onAutoAddChange={(checked) => {
    setFormData(prev => ({
      ...prev,
      automaticallyAddProducts: checked
    }));
  }}
/>


{/* ==================== IMPROVED PRODUCT LOCK MODAL ==================== */}
{isLockModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop - Click करने पर redirect */}
    <div 
      className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
      onClick={handleModalClose}
    />
    
    {/* Modal Content */}
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
      
      {/* Close Button (X) - Immediate Redirect */}
      <button
        onClick={handleModalClose}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all group"
        title="Close and go back"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Lock Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center animate-pulse">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
        Product Locked
      </h2>
      
      {/* Backend Message */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-slate-300 text-center text-sm leading-relaxed whitespace-pre-line">
          {lockModalMessage}
        </p>
      </div>
      
      {/* Info Box */}
      <div className="flex items-start gap-3 mb-6 text-slate-400 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="leading-relaxed">
          Please wait for the lock to expire or contact the user currently editing this product.
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Go Back Button - Immediate Redirect */}
        <button
          onClick={handleModalClose}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Go Back
        </button>
        
        {/* Refresh Button */}
        {/* <button
          onClick={() => {
            setIsLockModalOpen(false);
            window.location.reload();
          }}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          title="Try again"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button> */}
      </div>
      
      {/* Auto Redirect Timer */}
      {/* <p className="text-center text-slate-500 text-xs mt-4 animate-pulse">
        Auto-redirecting in 3 seconds...
      </p> */}
       <style jsx>{`
      @keyframes modalFadeIn {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      .modal-animate {
        animation: modalFadeIn 0.3s ease-out forwards;
      }

      @keyframes iconPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .icon-pulse {
        animation: iconPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `}</style>
    </div>
  </div>
)}
  

    </div>
  );
}
