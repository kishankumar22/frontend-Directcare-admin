"use client";

import { useState, useRef, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, X, Info, Search, Image, Package,
  Tag, BarChart3, Globe,  Truck, Gift, Calendar,
  Users, DollarSign, Link as LinkIcon, ShoppingCart, Video,
  Settings
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api"; // Import your axios client
import { ProductDescriptionEditor } from "@/app/admin/products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import API_BASE_URL from "@/lib/api-config";
// ===== API RESPONSE INTERFACES =====

interface BrandApiResponse {
  success: boolean;
  message: string;
  data: BrandData[];
  errors: null;
}

interface CategoryApiResponse {
  success: boolean;
  message: string;
  data: CategoryData[];
  errors: null;
}



interface ProductsApiResponse {
  success: boolean;
  message: string;
  data: {
    items: ProductItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  errors: null;
}

interface ProductApiResponse {
  success: boolean;
  data?: ProductCreateResponse;
  message?: string;
  errors?: string[] | null;
}

interface ApiResponse<T = any> {
  data?: T;
  success?: boolean;
  message?: string;
  errors?: string[] | null;
  error?: string;
  status?: number;
  result?: T;
}

// ===== DATA INTERFACES =====

interface BrandData {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  logoUrl?: string;
  isPublished?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
}


interface CategoryData {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
  subCategories?: CategoryData[];
}

interface DropdownsData {
  brands: BrandData[];
  categories: CategoryData[];
 
}

// ===== PRODUCT INTERFACES =====

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  oldPrice?: number;
  description?: string;
  shortDescription?: string;
}

interface ProductCreateResponse {
  id: string;
  name: string;
  sku: string;
  [key: string]: any;
}

// ✅ UPDATED: ProductSpecification interface
interface ProductSpecification {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
}

// ✅ UPDATED: ProductImage interface with all aliases
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
  file?: File;
  // Optional aliases for backward compatibility
  url?: string;
  preview?: string;
  alt?: string;
  displayOrder?: number;
}

// ✅ Product Variant interface
interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  compareAtPrice: number | null;
  weight: number | null;
  stockQuantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  imageUrl: string | null;
  isDefault: boolean;
  imageFile?: File;
}

// ✅ Product Attribute interface
interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  displayOrder: number;
}

// ✅ Product API Image interface (for API responses)
interface ProductApiImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
}

export default function AddProductPage() {
  const router = useRouter();
     const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');
  const [attributes, setAttributes] = useState<Array<{id: string, name: string, values: string[]}>>([]);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRef = useRef<HTMLInputElement>(null);
// Add this to your component state
const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, sku: string, price: string}>>([]);
const [uploadingImages, setUploadingImages] = useState(false);

// Update initial state
const [dropdownsData, setDropdownsData] = useState<DropdownsData>({
  brands: [],
  categories: [],
 
});

// Updated combined useEffect 
useEffect(() => {
  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all data (dropdowns + products )...');
      // Fetch all data in parallel including 
      const [brandsResponse, categoriesResponse, productsResponse] = await Promise.all([
        apiClient.get<BrandApiResponse>('/api/Brands?includeUnpublished=false'),
        apiClient.get<CategoryApiResponse>('/api/Categories?includeInactive=true&includeSubCategories=true'),
        apiClient.get<ProductsApiResponse>('/api/Products')       
      ]);

      // Extract dropdown data with proper typing
      const brandsData = (brandsResponse.data as BrandApiResponse)?.data || [];
      const categoriesData = (categoriesResponse.data as CategoryApiResponse)?.data || [];
     

      // Set dropdown data including brands and categories
      setDropdownsData({
        brands: brandsData,
        categories: categoriesData      
      });

      // Extract and transform products data
      if (productsResponse.data && !productsResponse.error) {
        const apiResponse = productsResponse.data as ProductsApiResponse;
        
        if (apiResponse.success && apiResponse.data.items) {
          const transformedProducts = apiResponse.data.items.map(product => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: `₹${product.price.toFixed(2)}`
          }));
          
          setAvailableProducts(transformedProducts);
        }
      } else {
        setAvailableProducts([]);
      }

      console.log('✅ All data loaded:', {
        brandsCount: brandsData.length,
        categoriesCount: categoriesData.length,     
        productsCount: productsResponse.data ? (productsResponse.data as ProductsApiResponse).data.items.length : 0
      });

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      
      // Set fallbacks
      setDropdownsData({
        brands: [],
        categories: []
      });
      setAvailableProducts([]);
    }
  };

  fetchAllData();
}, []);



const [formData, setFormData] = useState<{
  // ===== BASIC INFO =====
  name: string;
  shortDescription: string;
  fullDescription: string;
  sku: string;
  brand: string;
  categories: string;
  categoryName: string;
 
  
  // ===== PRODUCT STATUS & PUBLISHING =====
  published: boolean;
  productType: string;
  visibleIndividually: boolean;
  customerRoles: string;
  limitedToStores: boolean;
  showOnHomepage: boolean;
  displayOrder: string;
  
  // ===== VENDOR =====
  vendorId: string;
  vendor: string;
  
  // ===== PRODUCT DEPENDENCIES =====
  requireOtherProducts: boolean;
  requiredProductIds: string;
  automaticallyAddProducts: boolean;
  
  // ===== BASIC FIELDS =====
  productTags: string;
  gtin: string;
  manufacturerPartNumber: string;
  adminComment: string;
  deliveryDateId: string;
  allowCustomerReviews: boolean;
  
  // ===== RELATED PRODUCTS & MEDIA =====
  relatedProducts: string[];
  crossSellProducts: string[];
  productImages: ProductImage[];
  videoUrls: string[];
  specifications: ProductSpecification[];
  
  // ===== PRICING =====
  price: string;
  oldPrice: string;
  cost: string;
  disableBuyButton: boolean;
  disableWishlistButton: boolean;
  
  // ===== PRE-ORDER =====
  availableForPreOrder: boolean;
  preOrderAvailabilityStartDate: string;
  
  // ===== CALL FOR PRICE =====
  callForPrice: boolean;
  customerEntersPrice: boolean;
  minimumCustomerEnteredPrice: string;
  maximumCustomerEnteredPrice: string;
  
  // ===== BASE PRICE =====
  basepriceEnabled: boolean;
  basepriceAmount: string;
  basepriceUnit: string;
  basepriceBaseAmount: string;
  basepriceBaseUnit: string;
  
  // ===== PROMOTIONS =====
  markAsNew: boolean;
  markAsNewStartDate: string;
  markAsNewEndDate: string;
  
  // ===== AVAILABILITY =====
  availableStartDate: string;
  availableEndDate: string;
  hasDiscountsApplied: boolean;
  
  // ===== TAX =====
  taxExempt: boolean;
  taxCategoryId: string;
  telecommunicationsBroadcastingElectronicServices: boolean;
  
  // ===== SEO =====
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  searchEngineFriendlyPageName: string;
  
  // ===== INVENTORY =====
  manageInventory: string;
  manageInventoryMethod: string;
  stockQuantity: string;
  displayStockAvailability: boolean;
  displayStockQuantity: boolean;
  minStockQuantity: string;
  lowStockThreshold: string;
  lowStockActivity: string;
  notifyAdminForQuantityBelow: boolean;  // ✅ FIXED: Changed to boolean
  notifyQuantityBelow: string;
  
  // ===== BACKORDER =====
  backorders: string;
  backorderMode: string;
  allowBackorder: boolean;
  allowBackInStockSubscriptions: boolean;
  
  // ===== CART QUANTITIES =====
  productAvailabilityRange: string;
  minCartQuantity: string;
  maxCartQuantity: string;
  allowedQuantities: string;
  allowAddingOnlyExistingAttributeCombinations: boolean;
  notReturnable: boolean;
  
  // ===== SHIPPING =====
  isShipEnabled: boolean;
  isFreeShipping: boolean;
  shipSeparately: boolean;
  additionalShippingCharge: string;
  
  // ===== DIMENSIONS & WEIGHT =====
  weight: string;
  length: string;
  width: string;
  height: string;
  weightUnit: string;
  dimensionUnit: string;
  
  // ===== GIFT CARDS =====
  isGiftCard: boolean;
  giftCardType: string;
  overriddenGiftCardAmount: boolean;
  
  // ===== DIGITAL PRODUCT =====
  isDigital: boolean;
  isDownload: boolean;
  downloadId: string;
  unlimitedDownloads: boolean;
  maxNumberOfDownloads: string;
  downloadExpirationDays: string;
  downloadActivationType: string;
  hasUserAgreement: boolean;
  userAgreementText: string;
  hasSampleDownload: boolean;
  sampleDownloadId: string;
  
  // ===== RECURRING PRODUCT =====
  isRecurring: boolean;
  recurringCycleLength: string;
  recurringCyclePeriod: string;
  recurringTotalCycles: string;
  
  // ===== RENTAL PRODUCT =====
  isRental: boolean;
  rentalPriceLength: string;
  rentalPricePeriod: string;
}>({
  // ===== BASIC INFO =====
  name: '',
  shortDescription: '',
  fullDescription: '',
  sku: '',
  brand: '',
  categories: '',
  categoryName: '',


  // ===== PRODUCT STATUS & PUBLISHING =====
  published: true,
  productType: 'simple',
  visibleIndividually: true,
  customerRoles: 'all',
  limitedToStores: false,
  showOnHomepage: false,
  displayOrder: '1',
  
  // ===== VENDOR =====
  vendorId: '',
  vendor: '',
  
  // ===== PRODUCT DEPENDENCIES =====
  requireOtherProducts: false,
  requiredProductIds: '',
  automaticallyAddProducts: false,
  
  // ===== BASIC FIELDS =====
  productTags: '',
  gtin: '',
  manufacturerPartNumber: '',
  adminComment: '',
  deliveryDateId: '',
  allowCustomerReviews: false,
  
  // ===== RELATED PRODUCTS & MEDIA =====
  relatedProducts: [],
  crossSellProducts: [],
  productImages: [],
  videoUrls: [],
  specifications: [],
  
  // ===== PRICING =====
  price: '',
  oldPrice: '',
  cost: '',
  disableBuyButton: false,
  disableWishlistButton: false,
  
  // ===== PRE-ORDER =====
  availableForPreOrder: false,
  preOrderAvailabilityStartDate: '',
  
  // ===== CALL FOR PRICE =====
  callForPrice: false,
  customerEntersPrice: false,
  minimumCustomerEnteredPrice: '',
  maximumCustomerEnteredPrice: '',
  
  // ===== BASE PRICE =====
  basepriceEnabled: false,
  basepriceAmount: '',
  basepriceUnit: '',
  basepriceBaseAmount: '',
  basepriceBaseUnit: '',
  
  // ===== PROMOTIONS =====
  markAsNew: false,
  markAsNewStartDate: '',
  markAsNewEndDate: '',
  
  // ===== AVAILABILITY =====
  availableStartDate: '',
  availableEndDate: '',
  hasDiscountsApplied: false,
  
  // ===== TAX =====
  taxExempt: false,
  taxCategoryId: '',
  telecommunicationsBroadcastingElectronicServices: false,
  
  // ===== SEO =====
  metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  searchEngineFriendlyPageName: '',
  
  // ===== INVENTORY =====
  manageInventory: 'track',
  manageInventoryMethod: 'DontManageStock',
  stockQuantity: '',
  displayStockAvailability: true,
  displayStockQuantity: false,
  minStockQuantity: '',
  lowStockThreshold: '',
  lowStockActivity: 'nothing',
  notifyAdminForQuantityBelow: true,  // ✅ FIXED: Boolean instead of string
  notifyQuantityBelow: '',
  
  // ===== BACKORDER =====
  backorders: 'no-backorders',
  backorderMode: 'NoBackorders',
  allowBackorder: false,
  allowBackInStockSubscriptions: false,
  
  // ===== CART QUANTITIES =====
  productAvailabilityRange: '',
  minCartQuantity: '1',
  maxCartQuantity: '10000',
  allowedQuantities: '',
  allowAddingOnlyExistingAttributeCombinations: false,
  notReturnable: false,
  
  // ===== SHIPPING =====
  isShipEnabled: true,
  isFreeShipping: false,
  shipSeparately: false,
  additionalShippingCharge: '',
  
  // ===== DIMENSIONS & WEIGHT =====
  weight: '',
  length: '',
  width: '',
  height: '',
  weightUnit: 'kg',
  dimensionUnit: 'cm',
  
  // ===== GIFT CARDS =====
  isGiftCard: false,
  giftCardType: 'virtual',
  overriddenGiftCardAmount: false,
  
  // ===== DIGITAL PRODUCT =====
  isDigital: false,
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
  
  // ===== RECURRING PRODUCT =====
  isRecurring: false,
  recurringCycleLength: '',
  recurringCyclePeriod: 'days',
  recurringTotalCycles: '',
  
  // ===== RENTAL PRODUCT =====
  isRental: false,
  rentalPriceLength: '',
  rentalPricePeriod: 'days',
});




  const removeRelatedProduct = (productId: string) => {
    setFormData({
      ...formData,
      relatedProducts: formData.relatedProducts.filter(id => id !== productId)
    });
  };
// Updated helper function to render hierarchical category options
const renderCategoryOptions = (categories: CategoryData[]): JSX.Element[] => {
  const options: JSX.Element[] = [];
  
  // Add "All" option first
  options.push(
    <option 
      key="all" 
      value=""
      data-category-name="All"
      className="bg-slate-700 text-slate-300"
      style={{ 
        backgroundColor: '#374151',
        color: '#d1d5db',
        paddingLeft: '8px'
      }}
    >
      All
    </option>
  );
  
  categories.forEach((category) => {
    // Add parent category
    options.push(
      <option 
        key={category.id} 
        value={category.id}
        data-category-name={category.name}
        className="font-semibold bg-slate-700 text-violet-300"
        style={{ 
          fontWeight: 'bold',
          backgroundColor: '#374151',
          color: '#c4b5fd',
          paddingLeft: '8px'
        }}
      >
        {category.name}
      </option>
    );
    
    // Add subcategories with >> separator
    if (category.subCategories && category.subCategories.length > 0) {
      category.subCategories.forEach((subCategory) => {
        const displayText = `${category.name} >> ${subCategory.name}`;
        options.push(
          <option 
            key={subCategory.id} 
            value={subCategory.id}
            data-category-name={displayText}
            data-parent-name={category.name}
            data-sub-name={subCategory.name}
            className="bg-slate-600 text-slate-300"
            style={{ 
              backgroundColor: '#4b5563',
              color: '#d1d5db',
              paddingLeft: '16px',
              fontStyle: 'italic'
            }}
          >
            {displayText}
          </option>
        );
      });
    }
  });
  
  return options;
};

const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
  e.preventDefault();

  // Prevent multiple submissions
  const target = e.target as HTMLElement;
  if (target.hasAttribute('data-submitting')) {
    return;
  }
  target.setAttribute('data-submitting', 'true');

  try {
    // Validate required fields
    if (!formData.name || !formData.sku) {
      toast.warning('Please fill in required fields: Product Name and SKU');
      target.removeAttribute('data-submitting');
      return;
    }

    console.log('🚀 Starting product submission...');

    // Show loading toast
    const loadingId = toast.info(
      isDraft ? 'Saving as draft...' : 'Creating product...', 
    );

    // Prepare product data
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let categoryId: string | null = null;
    if (formData.categories && formData.categories.trim()) {
      const trimmedCategory = formData.categories.trim();
      if (guidRegex.test(trimmedCategory)) {
        categoryId = trimmedCategory;
      }
    }

    let brandId: string | null = null;
    if (formData.brand && formData.brand.trim()) {
      const trimmedBrand = formData.brand.trim();
      if (guidRegex.test(trimmedBrand)) {
        brandId = trimmedBrand;
      }
    }


    // ✅ NEW: Vendor ID validation
    let vendorId: string | null = null;
    if (formData.vendorId && formData.vendorId.trim()) {
      const trimmedVendor = formData.vendorId.trim();
      if (guidRegex.test(trimmedVendor)) {
        vendorId = trimmedVendor;
      }
    }

    // Prepare specifications array
    const specificationAttributes = formData.specifications
      .filter(spec => spec.name && spec.value)
      .map(spec => ({
        id: spec.id || null,
        name: spec.name,
        value: spec.value,
        displayOrder: spec.displayOrder || 0
      }));

    // Prepare attributes array
    const attributesArray = productAttributes
      .filter(attr => attr.name && attr.value)
      .map(attr => ({
        id: attr.id || null,
        name: attr.name,
        value: attr.value,
        displayOrder: attr.displayOrder || 0
      }));

    // Prepare variants array
    const variantsArray = productVariants.map(variant => ({
      name: variant.name,
      sku: variant.sku,
      price: variant.price ?? 0,
      compareAtPrice: variant.compareAtPrice || null,
      weight: variant.weight || null,
      stockQuantity: variant.stockQuantity || 0,
      option1: variant.option1 || null,
      option2: variant.option2 || null,
      option3: variant.option3 || null,
      imageUrl: variant.imageUrl || null,
      isDefault: variant.isDefault || false
    }));

    // ✅ Prepare images array
    const imagesArray = formData.productImages?.map((img, index) => ({
      imageUrl: img.imageUrl || '',
      altText: img.altText || formData.name || '',
      sortOrder: img.sortOrder || index,
      isMain: img.isMain || index === 0
    })) || [];

    const productData = {
      // ===== BASIC INFO =====
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || formData.name || 'Product description',
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      gtin: formData.gtin?.trim() || null,
      manufacturerPartNumber: formData.manufacturerPartNumber?.trim() || null,
      displayOrder: parseInt(formData.displayOrder) || 1,
      adminComment: formData.adminComment?.trim() || null,

      // ===== PRODUCT STATUS & PUBLISHING =====
      status: isDraft ? 1 : (formData.published ? 2 : 1),
      isPublished: isDraft ? false : formData.published,
      productType: formData.productType || 'simple',
      visibleIndividually: formData.visibleIndividually ?? true,
      customerRoles: formData.customerRoles?.trim() || null,
      limitedToStores: formData.limitedToStores ?? false,
      showOnHomepage: formData.showOnHomepage || false,

      // ===== VENDOR ===== (✅ ADDED)
      ...(vendorId && { vendorId }),
      vendor: formData.vendor?.trim() || null,

      // ===== PRODUCT DEPENDENCIES ===== (✅ ADDED)
      requireOtherProducts: formData.requireOtherProducts ?? false,
      requiredProductIds: formData.requiredProductIds?.trim() || null,
      automaticallyAddProducts: formData.automaticallyAddProducts ?? false,

      // ===== PRICING =====
      price: parseFloat(formData.price) || 0,
      oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      compareAtPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      costPrice: formData.cost ? parseFloat(formData.cost) : null,

      // ===== BUY/WISHLIST BUTTONS =====
      disableBuyButton: formData.disableBuyButton ?? false,
      disableWishlistButton: formData.disableWishlistButton ?? false,

      // ===== PRE-ORDER ===== (✅ ADDED)
      availableForPreOrder: formData.availableForPreOrder ?? false,
      preOrderAvailabilityStartDate: formData.availableForPreOrder && formData.preOrderAvailabilityStartDate
        ? new Date(formData.preOrderAvailabilityStartDate).toISOString()
        : null,

      // ===== CALL FOR PRICE =====
      callForPrice: formData.callForPrice ?? false,
      customerEntersPrice: formData.customerEntersPrice ?? false,
      minimumCustomerEnteredPrice: formData.customerEntersPrice && formData.minimumCustomerEnteredPrice 
        ? parseFloat(formData.minimumCustomerEnteredPrice) 
        : null,
      maximumCustomerEnteredPrice: formData.customerEntersPrice && formData.maximumCustomerEnteredPrice 
        ? parseFloat(formData.maximumCustomerEnteredPrice) 
        : null,

      // ===== BASE PRICE ===== (✅ ADDED)
      basepriceEnabled: formData.basepriceEnabled ?? false,
      basepriceAmount: formData.basepriceEnabled && formData.basepriceAmount
        ? parseFloat(formData.basepriceAmount)
        : null,
      basepriceUnit: formData.basepriceEnabled && formData.basepriceUnit
        ? formData.basepriceUnit.trim()
        : null,
      basepriceBaseAmount: formData.basepriceEnabled && formData.basepriceBaseAmount
        ? parseFloat(formData.basepriceBaseAmount)
        : null,
      basepriceBaseUnit: formData.basepriceEnabled && formData.basepriceBaseUnit
        ? formData.basepriceBaseUnit.trim()
        : null,

      // ===== MARK AS NEW =====
      markAsNew: formData.markAsNew ?? false,
      markAsNewStartDate: formData.markAsNew && formData.markAsNewStartDate 
        ? new Date(formData.markAsNewStartDate).toISOString() 
        : null,
      markAsNewEndDate: formData.markAsNew && formData.markAsNewEndDate 
        ? new Date(formData.markAsNewEndDate).toISOString() 
        : null,

      // ===== AVAILABILITY DATES =====
      availableStartDate: formData.availableStartDate && formData.availableStartDate.trim()
        ? new Date(formData.availableStartDate).toISOString() 
        : null,
      availableEndDate: formData.availableEndDate && formData.availableEndDate.trim()
        ? new Date(formData.availableEndDate).toISOString() 
        : null,

      // ===== TAX =====
      taxExempt: formData.taxExempt ?? false,
      taxCategoryId: formData.taxCategoryId || null,
      telecommunicationsBroadcastingElectronicServices: formData.telecommunicationsBroadcastingElectronicServices ?? false,

      // ===== INVENTORY =====
      trackQuantity: formData.manageInventory === 'track',
      manageInventoryMethod: formData.manageInventoryMethod || 'DontManageStock',
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      displayStockAvailability: formData.displayStockAvailability ?? false,
      displayStockQuantity: formData.displayStockQuantity ?? false,
      minStockQuantity: parseInt(formData.minStockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 0,
      lowStockActivity: formData.lowStockActivity || null,
      
      // ✅ FIXED: Changed to boolean (was causing TypeScript error)
      notifyAdminForQuantityBelow: formData.notifyAdminForQuantityBelow ?? true,
      notifyQuantityBelow: parseInt(formData.notifyQuantityBelow) || 1,

      // ===== BACKORDER =====
      allowBackorder: formData.allowBackorder ?? false,
      backorderMode: formData.backorderMode || formData.backorders || 'NoBackorders',
      allowBackInStockSubscriptions: formData.allowBackInStockSubscriptions ?? false,

      // ===== CART QUANTITIES =====
      orderMinimumQuantity: parseInt(formData.minCartQuantity) || 1,
      orderMaximumQuantity: parseInt(formData.maxCartQuantity) || 10000,
      allowedQuantities: formData.allowedQuantities?.trim() || null,
      productAvailabilityRange: formData.productAvailabilityRange || null,
      allowAddingOnlyExistingAttributeCombinations: formData.allowAddingOnlyExistingAttributeCombinations ?? false,

      // ===== NOT RETURNABLE =====
      notReturnable: formData.notReturnable ?? false,

      // ===== SHIPPING =====
      requiresShipping: formData.isShipEnabled ?? true,
      isFreeShipping: formData.isFreeShipping ?? false,
      shipSeparately: formData.shipSeparately ?? false,
      additionalShippingCharge: formData.additionalShippingCharge 
        ? parseFloat(formData.additionalShippingCharge) 
        : null,
      deliveryDateId: formData.deliveryDateId || null,

      // ===== DIMENSIONS & WEIGHT =====
      weight: parseFloat(formData.weight) || 0,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weightUnit: formData.weightUnit || 'kg',
      dimensionUnit: formData.dimensionUnit || 'cm',

      // ===== DIGITAL PRODUCT ===== (✅ ADDED)
      isDigital: formData.isDigital ?? false,
      isDownload: formData.isDownload ?? false,
      downloadId: formData.isDownload && formData.downloadId ? formData.downloadId : null,
      unlimitedDownloads: formData.unlimitedDownloads ?? false,
      maxNumberOfDownloads: !formData.unlimitedDownloads && formData.maxNumberOfDownloads
        ? parseInt(formData.maxNumberOfDownloads)
        : null,
      downloadExpirationDays: formData.downloadExpirationDays
        ? parseInt(formData.downloadExpirationDays)
        : null,
      downloadActivationType: formData.downloadActivationType || null,
      hasUserAgreement: formData.hasUserAgreement ?? false,
      userAgreementText: formData.hasUserAgreement && formData.userAgreementText
        ? formData.userAgreementText.trim()
        : null,
      hasSampleDownload: formData.hasSampleDownload ?? false,
      sampleDownloadId: formData.hasSampleDownload && formData.sampleDownloadId
        ? formData.sampleDownloadId
        : null,

      // ===== RECURRING PRODUCT ===== (✅ ADDED)
      isRecurring: formData.isRecurring ?? false,
      recurringCycleLength: formData.isRecurring && formData.recurringCycleLength
        ? parseInt(formData.recurringCycleLength)
        : null,
      recurringCyclePeriod: formData.isRecurring && formData.recurringCyclePeriod
        ? formData.recurringCyclePeriod
        : null,
      recurringTotalCycles: formData.isRecurring && formData.recurringTotalCycles
        ? parseInt(formData.recurringTotalCycles)
        : null,

      // ===== RENTAL PRODUCT ===== (✅ ADDED)
      isRental: formData.isRental ?? false,
      rentalPriceLength: formData.isRental && formData.rentalPriceLength
        ? parseInt(formData.rentalPriceLength)
        : null,
      rentalPricePeriod: formData.isRental && formData.rentalPricePeriod
        ? formData.rentalPricePeriod
        : null,

      // ===== GIFT CARD ===== (✅ ADDED)
      isGiftCard: formData.isGiftCard ?? false,
      giftCardType: formData.isGiftCard ? formData.giftCardType : null,
      overriddenGiftCardAmount: formData.isGiftCard ? formData.overriddenGiftCardAmount : null,

      // ===== SEO =====
      metaTitle: formData.metaTitle?.trim() || null,
      metaDescription: formData.metaDescription?.trim() || null,
      metaKeywords: formData.metaKeywords?.trim() || null,
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName?.trim() || null,

      // ===== CUSTOMER REVIEWS =====
      allowCustomerReviews: formData.allowCustomerReviews ?? false,

      // ===== VIDEOS =====
      videoUrls: formData.videoUrls && formData.videoUrls.length > 0 
        ? formData.videoUrls.join(',') 
        : null,

      // ===== CATEGORIES, BRAND & MANUFACTURER =====
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),


      // ===== TAGS & RELATED PRODUCTS =====
      tags: formData.productTags?.trim() || null,
      relatedProductIds: Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0 
        ? formData.relatedProducts.join(',') 
        : null,
      crossSellProductIds: Array.isArray(formData.crossSellProducts) && formData.crossSellProducts.length > 0 
        ? formData.crossSellProducts.join(',') 
        : null,

      // ===== SPECIFICATIONS, ATTRIBUTES, VARIANTS =====
      ...(specificationAttributes.length > 0 && { specificationAttributes }),
      ...(attributesArray.length > 0 && { attributes: attributesArray }),
      ...(variantsArray.length > 0 && { variants: variantsArray }),

      // ===== IMAGES =====
      ...(imagesArray.length > 0 && { images: imagesArray }),
    };

    // Clean up null/undefined/empty values but keep boolean false
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([key, value]) => {
        // Keep false boolean values
        if (typeof value === 'boolean') return true;
        // Remove only null, undefined, and empty strings
        return value !== null && value !== undefined && value !== '';
      })
    );

    console.log('📦 Clean product data:', cleanProductData);

    // Create Product
    let response: ApiResponse<ProductCreateResponse> | undefined;
    const endpoints = ['/api/Products', '/Products', '/api/Product'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying POST ${endpoint}...`);
        const apiResponse = await apiClient.post(endpoint, cleanProductData);
        response = apiResponse as ApiResponse<ProductCreateResponse>;
        console.log(`✅ Success with ${endpoint}`);
        break;
      } catch (error: any) {
        console.log(`❌ Failed with ${endpoint}:`, error.response?.status);
        if (endpoints.indexOf(endpoint) === endpoints.length - 1) {
          throw error;
        }
      }
    }

    // Dismiss loading toast
    toast.dismiss(loadingId);

    // Handle successful response
    if (response && (response.data || response.success !== false)) {
      console.log('✅ Product created successfully:', response);

      // Extract Product ID
      let productId: string | null = null;

      try {
        console.log('🔍 Full API Response:', response);
        
        if (response) {
          // Case 1: response.data.data.id (nested data)
          if (response.data && typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as any).data;
            if (nestedData && typeof nestedData === 'object' && 'id' in nestedData) {
              productId = nestedData.id as string;
              console.log('✅ Product ID found in response.data.data.id:', productId);
            }
          } 
          // Case 2: response.data.id (direct in data)
          else if (response.data && typeof response.data === 'object' && 'id' in response.data) {
            productId = (response.data as any).id as string;
            console.log('✅ Product ID found in response.data.id:', productId);
          }
          // Case 3: response.data (if the ID is directly in data as string)
          else if (response.data && typeof response.data === 'string') {
            productId = response.data;
            console.log('✅ Product ID found directly in response.data:', productId);
          }
          // Case 4: Check for nested success response
          else if (response.success && response.result && typeof response.result === 'object' && 'id' in response.result) {
            productId = (response.result as any).id as string;
            console.log('✅ Product ID found in response.result.id:', productId);
          }
          // Case 5: apiClient wrapped response
          else if (response.data && typeof response.data === 'object') {
            const apiData = response.data as any;
            if (apiData.id) {
              productId = apiData.id as string;
              console.log('✅ Product ID found in wrapped response:', productId);
            } else if (apiData.data && apiData.data.id) {
              productId = apiData.data.id as string;
              console.log('✅ Product ID found in wrapped response.data:', productId);
            }
          }
        }

        if (!productId) {
          console.warn('⚠️ Product ID not found in response. Response structure:', JSON.stringify(response, null, 2));
          toast.warning('Product created but ID not returned. Images will be skipped.');
        }

      } catch (parseError) {
        console.error('❌ Error parsing product ID from response:', parseError);
        console.log('🔍 Response that caused error:', response);
        productId = null;
      }

      console.log('🎯 Final Product ID:', productId);

      // Upload Images (only if product ID exists and images are available)
      if (productId && formData.productImages && formData.productImages.length > 0) {
        console.log(`🖼️ Starting image upload for product ID: ${productId}`);
        toast.info('Uploading product images...');
        
        try {
          const imagesToUpload = formData.productImages.filter(img => img.file);
          
          if (imagesToUpload.length > 0) {
            console.log(`📷 Found ${imagesToUpload.length} images to upload`);
            
            const uploadedImages = await uploadImagesToProduct(productId, imagesToUpload);

            if (uploadedImages && uploadedImages.length > 0) {
              toast.success(`Product and ${uploadedImages.length} images uploaded successfully! 🎉`);
            } else {
              toast.warning('Product created successfully, but no images were uploaded.');
            }
          } else {
            console.log('ℹ️ No images with file objects found');
            toast.success('Product created successfully! ✅');
          }

          // Upload Variant Images
          if (productVariants.length > 0) {
            const variantsWithImages = productVariants.filter(v => v.imageFile);
            if (variantsWithImages.length > 0) {
              console.log(`🖼️ Starting variant image upload for ${variantsWithImages.length} variants`);
              toast.info(`Uploading ${variantsWithImages.length} variant images...`);

              try {
                let productResponseData = null;
                if (response.data && typeof response.data === 'object' && 'data' in response.data) {
                  productResponseData = (response.data as any).data;
                } else if (response.data && typeof response.data === 'object') {
                  productResponseData = response.data;
                }

                await uploadVariantImages(productResponseData);
              } catch (variantImageError) {
                console.error('❌ Error uploading variant images:', variantImageError);
                toast.error('Product created, but some variant images failed to upload.');
              }
            }
          }

        } catch (imageError) {
          console.error('❌ Error uploading images:', imageError);
          toast.error('Product created successfully, but some images failed to upload.');
        }
      } else {
        if (productId) {
          console.log('✅ Product created successfully without images');
        } else {
          console.log('ℹ️ Product creation completed but no ID returned');
        }
        
        if (isDraft) {
          toast.success(`Product saved as draft! 📝`);
        } else {
          toast.success(`Product created successfully! 🎉`);
        }
      }
      
      // Redirect to products list
      router.push('/admin/products');
    } else {
      throw new Error('No response received from server');
    }

  } catch (error: any) {
    console.error('❌ Error submitting form:', error);
    
    // Detailed error handling
    if (error.response) {
      const errorData = error.response.data;
      const status = error.response.status;
      
      console.error('📋 Error details:', {
        status,
        statusText: error.response.statusText,
        data: errorData
      });
      
      if (status === 404) {
        toast.error('API endpoint not found. Please check the server configuration.');
      } else if (status === 400 && errorData?.errors) {
        let errorMessage = 'Please fix the following errors:\n';
        for (const [field, messages] of Object.entries(errorData.errors)) {
          const fieldName = field.replace('$', '').replace('.', ' ');
          errorMessage += `\n• ${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
        }
        toast.warning(errorMessage, { autoClose: 8000 });
      } else if (status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (errorData?.message || errorData?.title) {
        toast.error(`Error ${status}: ${errorData.message || errorData.title}`);
      } else {
        toast.error(`HTTP Error ${status}: ${error.response.statusText}`);
      }
    } else if (error.request) {
      toast.error('Network error: No response from server. Please check your connection.');
    } else {
      toast.error(`Error: ${error.message}`);
    }
  } finally {
    // Re-enable form submission
    target.removeAttribute('data-submitting');
  }
};

// Updated handleChange function
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value, type } = e.target;
  
  // Special handling for category selection
  if (name === 'categories') {
    const selectElement = e.target as HTMLSelectElement;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    let displayName = '';
    if (value === '') {
      displayName = 'All';
    } else {
      // Get clean display name
      displayName = selectedOption.dataset.categoryName || selectedOption.text;
    }
    
    setFormData({
      ...formData,
      categories: value,
      categoryName: displayName
    });
  } else {
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
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

  // Product Variant handlers (matching backend ProductVariantCreateDto)
  const addProductVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      name: '',
      sku: `${formData.sku}-V${productVariants.length + 1}`,
      price: formData.price ? parseFloat(formData.price) : null,
      compareAtPrice: null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      stockQuantity: 0,
      option1: null,
      option2: null,
      option3: null,
      imageUrl: null,
      isDefault: productVariants.length === 0
    };
    setProductVariants([...productVariants, newVariant]);
  };

  const removeProductVariant = (id: string) => {
    setProductVariants(productVariants.filter(v => v.id !== id));
  };

  const updateProductVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setProductVariants(productVariants.map(variant =>
      variant.id === id ? { ...variant, [field]: value } : variant
    ));
  };

  const handleVariantImageUpload = (variantId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductVariants(productVariants.map(variant => {
        if (variant.id === variantId) {
          return {
            ...variant,
            imageUrl: reader.result as string,
            imageFile: file
          };
        }
        return variant;
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeVariantImage = (variantId: string) => {
    setProductVariants(productVariants.map(variant => {
      if (variant.id === variantId) {
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
          toast.error(`${file.name} is too large. Max size is 5MB.`);
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

// ✅ NEW - Function to upload images to specific product ID
const uploadImagesToProduct = async (productId: string, images: ProductImage[]) => {
  console.log(`Uploading ${images.length} images to product ${productId}...`);

  try {
    const uploadPromises = images.map(async (image, index) => {
      try {
        // Check if we have the actual file object stored
        if (!image.file) {
          console.log(`Skipping image ${index + 1}: no file object`);
          return null;
        }

        // Create FormData for this specific product
        const uploadFormData = new FormData();
        uploadFormData.append('images', image.file);
        uploadFormData.append('altText', image.altText);
        uploadFormData.append('sortOrder', image.sortOrder.toString());
        uploadFormData.append('isMain', image.isMain.toString());

        console.log(`Uploading image ${index + 1}: ${image.fileName}`);
        
        // ✅ UPDATED - Use product ID in URL path and product name in query parameter
        const token = localStorage.getItem('authToken');
        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/Products/${productId}/images?name=${encodeURIComponent(formData.name)}`,
          {
            method: 'POST',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: uploadFormData,
          }
        );

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          if (result && result.success) {
            console.log(`Image ${index + 1} uploaded successfully`);
            return result.data;
          } else {
            throw new Error(`Upload failed: ${result?.message || 'Unknown error'}`);
          }
        } else {
          const errorText = await uploadResponse.text();
          throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
        }
      } catch (error: any) {
        console.error(`Error uploading image ${index + 1}:`, error);
        toast.error(`Failed to upload ${image.fileName}: ${error.message}`);
        return null;
      }
    });

    // Wait for all image uploads to complete
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(result => result !== null);
    
    console.log(`${successfulUploads.length} out of ${images.length} images uploaded successfully`);
    return successfulUploads;

  } catch (error) {
    console.error('Error in uploadImagesToProduct:', error);
    throw error;
  }
};

// Function to upload variant images after product is created
const uploadVariantImages = async (productResponse: any) => {
  console.log('Checking for variant images to upload...');

  // Get variant IDs from the response
  const createdVariants = productResponse?.variants || [];
  if (!createdVariants || createdVariants.length === 0) {
    console.log('No variants found in product response');
    return;
  }

  console.log(`Found ${createdVariants.length} variants in response`);

  try {
    const uploadPromises = productVariants.map(async (localVariant) => {
      // Find corresponding created variant by SKU or name
      const createdVariant = createdVariants.find((cv: any) =>
        cv.sku === localVariant.sku || cv.name === localVariant.name
      );

      if (!createdVariant || !createdVariant.id) {
        console.log(`Could not find created variant for ${localVariant.name}`);
        return null;
      }

      // Check if this variant has an image file to upload
      if (!localVariant.imageFile) {
        console.log(`No image file for variant ${localVariant.name}`);
        return null;
      }

      console.log(`Uploading image for variant ${localVariant.name} (ID: ${createdVariant.id})`);

      try {
        const formData = new FormData();
        formData.append('image', localVariant.imageFile);

        const token = localStorage.getItem('authToken');
        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/Products/variants/${createdVariant.id}/image`,
          {
            method: 'POST',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          console.log(`Variant image uploaded successfully for ${localVariant.name}`);
          return result;
        } else {
          const errorText = await uploadResponse.text();
          console.error(`Failed to upload variant image: ${errorText}`);
          return null;
        }
      } catch (error: any) {
        console.error(`Error uploading variant image for ${localVariant.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(r => r !== null);
    console.log(`${successfulUploads.length} variant images uploaded successfully`);

    if (successfulUploads.length > 0) {
      toast.success(`${successfulUploads.length} variant images uploaded!`);
    }
  } catch (error) {
    console.error('Error uploading variant images:', error);
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
              <div className="border-b border-slate-800 ">
                <TabsList className="flex gap-1 overflow-x-auto pb-px scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent bg-transparent h-auto p-0">
                  <TabsTrigger value="product-info" className="flex items-center px-4 py-2 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Info className="h-4 w-4" />
                    Product Info
                  </TabsTrigger>
                  <TabsTrigger value="prices" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <DollarSign className="h-4 w-4" />
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
                  <TabsTrigger value="pictures" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Image className="h-4 w-4" />
                    Pictures
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Video className="h-4 w-4" />
                    Videos
                  </TabsTrigger>
                  <TabsTrigger value="specifications" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <BarChart3 className="h-4 w-4" />
                    Specifications
                  </TabsTrigger>
                  <TabsTrigger 
  value="advanced" 
  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg"
>
  <Settings className="h-4 w-4" />
  Advanced
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
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

<ProductDescriptionEditor
  label="Short Description"
  value={formData.shortDescription}
  onChange={(value) => setFormData({...formData, shortDescription: value})}
  placeholder="Brief product description (shown in product lists)"
  height={200}
/>

<ProductDescriptionEditor
  label="Full Description"
  value={formData.fullDescription}
  onChange={(value) => setFormData({...formData, fullDescription: value})}
  placeholder="Detailed product description with features and specifications"
  height={350}
  required
  showHelpText="Rich text formatting is supported"
/>
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
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                        <select
                          name="brand"
                          value={formData.brand}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select brand</option>
                          {dropdownsData.brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          {dropdownsData.brands.length} brands loaded
                        </p>
                      </div>

                 <div>
  <label className="block text-sm font-medium text-slate-300 mb-2">Categories</label>
  
  {/* Custom select with overlay */}
  <div className="relative">
    <select
      name="categories"
      value={formData.categories}
      onChange={handleChange}
      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-transparent focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none cursor-pointer"
    >
      {renderCategoryOptions(dropdownsData.categories)}
    </select>
    
    {/* Clean text overlay */}
    <div className="absolute inset-0 px-3 py-2 pointer-events-none flex items-center justify-between">
      <span className={`truncate text-sm ${formData.categoryName && formData.categoryName !== 'All' ? 'text-white' : 'text-slate-400'}`}>
        {formData.categoryName || 'Select category'}
      </span>
      
      {/* Dropdown arrow */}
      <svg className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
  
  <p className="text-xs text-slate-400 mt-1">
    {dropdownsData.categories.length} categories loaded (includes subcategories)
  </p>
</div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
 

  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">Product Type</label>
    <select
      name="productType"
      value={formData.productType}
      onChange={handleChange}
      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
    >
      <option value="simple">Simple Product</option>
      <option value="grouped">Grouped Product (product variants)</option>
    </select>
  </div>
</div>


                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">GTIN</label>
                        <input
                          type="text"
                          name="gtin"
                          value={formData.gtin}
                          onChange={handleChange}
                          placeholder="Global Trade Item Number"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                        <input
                          type="number"
                          name="displayOrder"
                          value={formData.displayOrder}
                          onChange={handleChange}
                          placeholder="1"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Product Tags</label>
                      <input
                        type="text"
                        name="productTags"
                        value={formData.productTags}
                        onChange={handleChange}
                        placeholder="tag1, tag2, tag3"
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-slate-400 mt-1">Comma-separated tags</p>
                    </div>
                  </div>
                </div>

                {/* Publishing Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Publishing</h3>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="published"
                        checked={formData.published}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Published</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="visibleIndividually"
                        checked={formData.visibleIndividually}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Visible individually</span>
                      <span className="text-xs text-slate-400">(can be accessed from catalog)</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="showOnHomepage"
                        checked={formData.showOnHomepage}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Show on home page</span>
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Available Start Date/Time</label>
                      <input
                        type="datetime-local"
                        name="availableStartDate"
                        value={formData.availableStartDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Available End Date/Time</label>
                      <input
                        type="datetime-local"
                        name="availableEndDate"
                        value={formData.availableEndDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                        Price ($) <span className="text-red-500">*</span>
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
                      <label className="block text-sm font-medium text-slate-300 mb-2">Old Price ($)</label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-2">Product Cost ($)</label>
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
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="disableBuyButton"
                        checked={formData.disableBuyButton}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Disable buy button</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="disableWishlistButton"
                        checked={formData.disableWishlistButton}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Disable wishlist button</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="callForPrice"
                        checked={formData.callForPrice}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Call for price</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="customerEntersPrice"
                        checked={formData.customerEntersPrice}
                        onChange={handleChange}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                      />
                      <span className="text-sm text-slate-300">Customer enters price</span>
                    </label>
                  </div>

                  {formData.customerEntersPrice && (
                    <div className="grid md:grid-cols-2 gap-4 bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Amount</label>
                        <input
                          type="number"
                          name="minimumCustomerEnteredPrice"
                          value={formData.minimumCustomerEnteredPrice}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Maximum Amount</label>
                        <input
                          type="number"
                          name="maximumCustomerEnteredPrice"
                          value={formData.maximumCustomerEnteredPrice}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Tax</h3>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="taxExempt"
                      checked={formData.taxExempt}
                      onChange={handleChange}
                      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Tax exempt</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tax Category</label>
                    <select
                      name="taxCategoryId"
                      value={formData.taxCategoryId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    >
                      <option value="">None</option>
                      <option value="1">Standard</option>
                      <option value="2">Books</option>
                      <option value="3">Electronics</option>
                      <option value="4">Food & Beverages</option>
                    </select>
                  </div>
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
                        </div>

                        <div>
  <label className="flex items-center gap-2 w-full px-3 py-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
    <input
      type="checkbox"
      name="notifyAdminForQuantityBelow"
      checked={formData.notifyAdminForQuantityBelow}
      onChange={handleChange}
      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
    />
    <div className="flex-1">
      <span className="text-sm font-medium text-slate-300">Notify admin for quantity below</span>
      <p className="text-xs text-slate-400 mt-0.5">Send notification when stock falls below minimum quantity</p>
    </div>
  </label>
</div>

                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Backorders</label>
                        <select
                          name="backorders"
                          value={formData.backorders}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        >
                          <option value="no-backorders">No backorders</option>
                          <option value="allow-qty-below-zero">Allow qty below 0</option>
                          <option value="allow-qty-below-zero-and-notify">Allow qty below 0 and notify customer</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="displayStockAvailability"
                            checked={formData.displayStockAvailability}
                            onChange={handleChange}
                            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                          />
                          <span className="text-sm text-slate-300">Display stock availability</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="displayStockQuantity"
                            checked={formData.displayStockQuantity}
                            onChange={handleChange}
                            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                          />
                          <span className="text-sm text-slate-300">Display stock quantity</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="allowBackInStockSubscriptions"
                            checked={formData.allowBackInStockSubscriptions}
                            onChange={handleChange}
                            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                          />
                          <span className="text-sm text-slate-300">Allow back in stock subscriptions</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Multiple Warehouses</h3>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Product Availability Range</label>
                        <select
                          name="productAvailabilityRange"
                          value={formData.productAvailabilityRange}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        >
                          <option value="">None</option>
                          <option value="1-2-days">1-2 days</option>
                          <option value="3-5-days">3-5 days</option>
                          <option value="1-week">1 week</option>
                          <option value="2-weeks">2 weeks</option>
                        </select>
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
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Maximum Cart Quantity</label>
                      <input
                        type="number"
                        name="maxCartQuantity"
                        value={formData.maxCartQuantity}
                        onChange={handleChange}
                        placeholder="10000"
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      />
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
                      Comma-separated list of quantities. Leave empty to allow any quantity.
                    </p>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="notReturnable"
                      checked={formData.notReturnable}
                      onChange={handleChange}
                      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Not returnable</span>
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

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Additional Shipping Charge ($)</label>
                        <input
                          type="number"
                          name="additionalShippingCharge"
                          value={formData.additionalShippingCharge}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

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

                {/* Dimensions */}
                {formData.isShipEnabled && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Dimensions</h3>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Weight (kg)</label>
                        <input
                          type="number"
                          name="weight"
                          value={formData.weight}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Length (cm)</label>
                        <input
                          type="number"
                          name="length"
                          value={formData.length}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Width (cm)</label>
                        <input
                          type="number"
                          name="width"
                          value={formData.width}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Height (cm)</label>
                        <input
                          type="number"
                          name="height"
                          value={formData.height}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                      </div>
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
                        Example: iPhone 128GB Black, iPhone 256GB White
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
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProductVariant(variant.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Variant Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => updateProductVariant(variant.id, 'name', e.target.value)}
                                placeholder="e.g., 128GB Black"
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
                                placeholder="e.g., SKU-128-BLK"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Price (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={variant.price || ''}
                                onChange={(e) => updateProductVariant(variant.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Compare At Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={variant.compareAtPrice || ''}
                                onChange={(e) => updateProductVariant(variant.id, 'compareAtPrice', e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0.00"
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
                                placeholder="0.00"
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
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Option 1 (e.g., Size)
                              </label>
                              <input
                                type="text"
                                value={variant.option1 || ''}
                                onChange={(e) => updateProductVariant(variant.id, 'option1', e.target.value || null)}
                                placeholder="e.g., 128GB, Large, Red"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Option 2 (e.g., Color)
                              </label>
                              <input
                                type="text"
                                value={variant.option2 || ''}
                                onChange={(e) => updateProductVariant(variant.id, 'option2', e.target.value || null)}
                                placeholder="e.g., Black, Cotton, Matte"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Option 3 (e.g., Material)
                              </label>
                              <input
                                type="text"
                                value={variant.option3 || ''}
                                onChange={(e) => updateProductVariant(variant.id, 'option3', e.target.value || null)}
                                placeholder="e.g., Premium, WiFi+Cellular"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </div>
                          </div>

                          {/* Variant Image Upload */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Variant Image
                            </label>
                            {variant.imageUrl ? (
                              <div className="relative inline-block">
                                <img
                                  src={variant.imageUrl}
                                  alt={variant.name}
                                  className="w-32 h-32 object-cover rounded-lg border border-slate-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(variant.id)}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
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
                                  Upload Image
                                </label>
                                <span className="text-sm text-slate-400">
                                  Optional - Image specific to this variant
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`variant-default-${variant.id}`}
                              checked={variant.isDefault}
                              onChange={(e) => {
                                // Set all variants to not default first
                                setProductVariants(productVariants.map(v => ({
                                  ...v,
                                  isDefault: v.id === variant.id ? e.target.checked : false
                                })));
                              }}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-violet-500 focus:ring-2 focus:ring-violet-500"
                            />
                            <label htmlFor={`variant-default-${variant.id}`} className="text-sm text-slate-300">
                              Set as default variant
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-blue-400 mb-2">💡 Variant Tips</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• Each variant should have a unique SKU</li>
                      <li>• Use Option fields to categorize variants (Size, Color, Material)</li>
                      <li>• Upload specific images for each variant to show the difference</li>
                      <li>• Set one variant as default - it will be shown first to customers</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-2 mt-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Search Engine Optimization</h3>
                  <p className="text-sm text-slate-400">
                    Optimize your product for search engines to improve visibility
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Title</label>
                    <input
                      type="text"
                      name="metaTitle"
                      value={formData.metaTitle}
                      onChange={handleChange}
                      placeholder="SEO-optimized title for search engines"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Recommended: 50-60 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Description</label>
                    <textarea
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleChange}
                      placeholder="Brief description for search engine results"
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Recommended: 150-160 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Meta Keywords</label>
                    <input
                      type="text"
                      name="metaKeywords"
                      value={formData.metaKeywords}
                      onChange={handleChange}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Comma-separated keywords</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Search Engine Friendly Page Name</label>
                    <input
                      type="text"
                      name="searchEngineFriendlyPageName"
                      value={formData.searchEngineFriendlyPageName}
                      onChange={handleChange}
                      placeholder="product-url-slug"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-1">Leave empty to auto-generate from product name</p>
                  </div>

                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-violet-400 mb-2">SEO Tips</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• Use descriptive, keyword-rich titles and descriptions</li>
                      <li>• Keep meta titles under 60 characters</li>
                      <li>• Keep meta descriptions under 160 characters</li>
                      <li>• Use hyphens in URL slugs (e.g., wireless-headphones)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

 <TabsContent value="pictures" className="space-y-2 mt-2">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">Product Images</h3>
        <p className="text-sm text-slate-400">
          Upload and manage product images. First image will be the main product image.
        </p>
      </div>
      {formData.productImages.length > 0 && (
        <div className="text-sm text-slate-400">
          {formData.productImages.length}/10 images
        </div>
      )}
    </div>

    {/* Image Upload Area - UPDATED */}
    <div className={`border-2 border-dashed rounded-xl p-8 bg-slate-800/20 transition-all ${
      uploadingImages 
        ? 'border-violet-500/50 bg-violet-500/5' 
        : 'border-slate-700 hover:border-violet-500/50'
    }`}>
      <div className="text-center">
        {uploadingImages ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Processing Images...</h3>
              <p className="text-sm text-slate-400">Please wait while we prepare your images</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-16 w-16 text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Upload Product Images</h3>
            <p className="text-sm text-slate-400 mb-4">
              {!formData.name.trim() 
                ? 'Please enter product name first before uploading images'
                : 'Drag and drop images here, or click to browse'
              }
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={!formData.name.trim() || uploadingImages}
              className="hidden"
            />
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
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !formData.name.trim() || uploadingImages
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {uploadingImages ? 'Processing...' : 'Browse Files'}
            </button>
            <p className="text-xs text-slate-400 mt-3">
              Supported: JPG, PNG, WebP • Max 5MB each • Up to 10 images
            </p>
            {!formData.name.trim() && (
              <p className="text-xs text-amber-400 mt-2">⚠️ Product name is required for image upload</p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Image Preview Grid - UPDATED */}
    {formData.productImages.length > 0 ? (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-300">
            Uploaded Images ({formData.productImages.length})
          </h4>
          <div className="text-xs text-slate-400">
            Images will be uploaded when product is created
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {formData.productImages.map((image, index) => (
            <div key={image.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-3 space-y-3">
              {/* Main Image Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-violet-500 text-white text-xs font-medium rounded-lg">
                  Main
                </div>
              )}
              
              {/* Image Preview */}
              <div className="relative aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center overflow-hidden">
                {image.imageUrl ? (
                  <img 
                    src={image.imageUrl} 
                    alt={image.altText || 'Product image'} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Image className="h-12 w-12 text-slate-500" />
                )}
                
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Cleanup object URL to prevent memory leaks
                    if (image.imageUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(image.imageUrl);
                    }
                    removeImage(image.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              {/* Image Details */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Alt text"
                  value={image.altText}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      productImages: formData.productImages.map(img =>
                        img.id === image.id ? { ...img, altText: e.target.value } : img
                      )
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Order"
                    value={image.sortOrder}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        productImages: formData.productImages.map(img =>
                          img.id === image.id ? { ...img, sortOrder: parseInt(e.target.value) || 1 } : img
                        )
                      });
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={image.isMain}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          productImages: formData.productImages.map(img =>
                            img.id === image.id ? { ...img, isMain: e.target.checked } : 
                            e.target.checked ? { ...img, isMain: false } : img
                          )
                        });
                      }}
                      className="w-3 h-3 text-violet-500"
                    />
                    <span className="text-xs text-slate-400">Main</span>
                  </label>
                </div>
                
                {/* File Info */}
                <div className="text-xs text-slate-500">
                  <div>{image.fileName}</div>
                  {image.fileSize && (
                    <div>{(image.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center py-8 border border-slate-700 rounded-xl bg-slate-800/20">
        <Image className="mx-auto h-12 w-12 text-slate-600 mb-2" />
        <p className="text-sm text-slate-400">No images uploaded yet</p>
      </div>
    )}

    {/* Info Box */}
    <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
      <h4 className="font-semibold text-sm text-violet-400 mb-2">Image Upload Process</h4>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>• Images are staged for upload when product is created</li>
        <li>• Product name is sent as query parameter for API identification</li>
        <li>• Images are uploaded to: <code className="bg-slate-800 px-1 rounded">/api/Products/{`{id}`}/images?name=ProductName</code></li>
        <li>• First image becomes the main product image automatically</li>
        <li>• Supported formats: JPG, PNG, WebP (max 5MB each)</li>
      </ul>
    </div>
  </div>
</TabsContent>
              {/* Videos Tab */}
              <TabsContent value="videos" className="space-y-2 mt-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Product Videos</h3>
                  <p className="text-sm text-slate-400">
                    Add video URLs (YouTube, Vimeo, etc.) to showcase your product
                  </p>

                  {/* Video URL List */}
                  {formData.videoUrls.length > 0 && (
                    <div className="space-y-2">
                      {formData.videoUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 p-3 bg-slate-800/30 border border-slate-700 rounded-xl">
                            <Video className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...formData.videoUrls];
                                newUrls[index] = e.target.value;
                                setFormData({ ...formData, videoUrls: newUrls });
                              }}
                              placeholder="https://youtube.com/watch?v=..."
                              className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setFormData({
                                ...formData,
                                videoUrls: formData.videoUrls.filter((_, i) => i !== index)
                              });
                            }}
                            className="p-2.5 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Video Button */}
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        videoUrls: [...formData.videoUrls, '']
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Add Video URL
                  </button>

                  {formData.videoUrls.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                      <Video className="mx-auto h-16 w-16 text-slate-600 mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Videos Added</h3>
                      <p className="text-slate-400 mb-4">
                        Click "Add Video URL" to embed product videos
                      </p>
                    </div>
                  )}

                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-violet-400 mb-2">Supported Video Platforms</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• YouTube (https://youtube.com/watch?v=...)</li>
                      <li>• Vimeo (https://vimeo.com/...)</li>
                      <li>• Direct video URLs (.mp4, .webm)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              {/* Specifications Tab */}
              <TabsContent value="specifications" className="space-y-2 mt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Product Specifications</h3>
                      <p className="text-sm text-slate-400">
                        Add technical specifications and product details
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          specifications: [
                            ...formData.specifications,
                            { id: Date.now().toString(), name: '', value: '', displayOrder: formData.specifications.length + 1 }
                          ]
                        });
                      }}
                      className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Add Specification
                    </button>
                  </div>

                  {formData.specifications.length > 0 ? (
                    <div className="space-y-3">
                      {formData.specifications.map((spec) => (
                        <div key={spec.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                          <div className="grid md:grid-cols-12 gap-3">
                            <div className="md:col-span-4">
                              <label className="block text-sm font-medium text-slate-300 mb-2">Specification Name</label>
                              <input
                                type="text"
                                value={spec.name}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    specifications: formData.specifications.map(s =>
                                      s.id === spec.id ? { ...s, name: e.target.value } : s
                                    )
                                  });
                                }}
                                placeholder="e.g., Processor, RAM, Storage"
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <div className="md:col-span-5">
                              <label className="block text-sm font-medium text-slate-300 mb-2">Value</label>
                              <input
                                type="text"
                                value={spec.value}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    specifications: formData.specifications.map(s =>
                                      s.id === spec.id ? { ...s, value: e.target.value } : s
                                    )
                                  });
                                }}
                                placeholder="e.g., Intel Core i7, 16GB, 512GB SSD"
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-slate-300 mb-2">Order</label>
                              <input
                                type="number"
                                value={spec.displayOrder}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    specifications: formData.specifications.map(s =>
                                      s.id === spec.id ? { ...s, displayOrder: parseInt(e.target.value) || 0 } : s
                                    )
                                  });
                                }}
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <button
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    specifications: formData.specifications.filter(s => s.id !== spec.id)
                                  });
                                }}
                                className="w-full p-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4 mx-auto" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                      <BarChart3 className="mx-auto h-16 w-16 text-slate-600 mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Specifications Added</h3>
                      <p className="text-slate-400 mb-4">
                        Click "Add Specification" to add technical details
                      </p>
                    </div>
                  )}

                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-violet-400 mb-2">Specification Examples</h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• <strong>Electronics:</strong> Processor, RAM, Storage, Display Size, Battery</li>
                      <li>• <strong>Clothing:</strong> Material, Care Instructions, Country of Origin</li>
                      <li>• <strong>Furniture:</strong> Dimensions, Material, Weight Capacity, Assembly</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              {/* ===== ADVANCED SETTINGS TAB ===== */}
<TabsContent value="advanced" className="space-y-2 mt-2">
  <div className="space-y-6">
    
    {/* ===== VENDOR SECTION ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Vendor Information</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Vendor ID (GUID)</label>
          <input
            type="text"
            name="vendorId"
            value={formData.vendorId}
            onChange={handleChange}
            placeholder="e.g., 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">GUID of the vendor (if product is sold by a specific vendor)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Vendor Name</label>
          <input
            type="text"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            placeholder="Enter vendor name"
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>



    {/* ===== CUSTOMER & STORE RESTRICTIONS ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Access Restrictions</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Customer Roles</label>
          <select
            name="customerRoles"
            value={formData.customerRoles}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="all">All Customers</option>
            <option value="registered">Registered Only</option>
            <option value="guests">Guests Only</option>
            <option value="administrators">Administrators</option>
            <option value="vendors">Vendors</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">Select which customer roles can view this product</p>
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 w-full px-3 py-3 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
            <input
              type="checkbox"
              name="limitedToStores"
              checked={formData.limitedToStores}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Limited to stores</span>
          </label>
        </div>
      </div>
    </div>

    {/* ===== PRODUCT DEPENDENCIES ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Product Dependencies</h3>
      
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="requireOtherProducts"
            checked={formData.requireOtherProducts}
            onChange={handleChange}
            className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
          />
          <span className="text-sm text-slate-300">Require other products</span>
        </label>

        {formData.requireOtherProducts && (
          <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Required Product IDs</label>
              <input
                type="text"
                name="requiredProductIds"
                value={formData.requiredProductIds}
                onChange={handleChange}
                placeholder="e.g., product-id-1, product-id-2"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">Comma-separated product IDs that must be added to cart</p>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="automaticallyAddProducts"
                checked={formData.automaticallyAddProducts}
                onChange={handleChange}
                className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-300">Automatically add required products to cart</span>
            </label>
          </div>
        )}
      </div>
    </div>

    {/* ===== BASE PRICE (UNIT PRICING) ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Base Price (Unit Pricing)</h3>
      <p className="text-sm text-slate-400">Used for price per unit display (e.g., €5.00 per kg)</p>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="basepriceEnabled"
          checked={formData.basepriceEnabled}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">Enable base price</span>
      </label>

      {formData.basepriceEnabled && (
        <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Base Price Amount</label>
              <input
                type="number"
                name="basepriceAmount"
                value={formData.basepriceAmount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Unit</label>
              <input
                type="text"
                name="basepriceUnit"
                value={formData.basepriceUnit}
                onChange={handleChange}
                placeholder="e.g., kg, liter, piece"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reference Amount</label>
              <input
                type="number"
                name="basepriceBaseAmount"
                value={formData.basepriceBaseAmount}
                onChange={handleChange}
                placeholder="1"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reference Unit</label>
              <input
                type="text"
                name="basepriceBaseUnit"
                value={formData.basepriceBaseUnit}
                onChange={handleChange}
                placeholder="e.g., kg, liter"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Example: Product price ₹50 for 500g → Base price: ₹100 per 1 kg
          </p>
        </div>
      )}
    </div>

    {/* ===== INVENTORY ADVANCED ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Advanced Inventory</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Inventory Method</label>
          <select
            name="manageInventoryMethod"
            value={formData.manageInventoryMethod}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="DontManageStock">Don't Manage Stock</option>
            <option value="ManageStock">Manage Stock</option>
            <option value="ManageStockByAttributes">Manage Stock By Attributes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Low Stock Threshold</label>
          <input
            type="number"
            name="lowStockThreshold"
            value={formData.lowStockThreshold}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">Trigger low stock warning at this quantity</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notify Quantity Below</label>
          <input
            type="number"
            name="notifyQuantityBelow"
            value={formData.notifyQuantityBelow}
            onChange={handleChange}
            placeholder="1"
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">Send notification when stock falls below this number</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Backorder Mode</label>
          <select
            name="backorderMode"
            value={formData.backorderMode}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="NoBackorders">No Backorders</option>
            <option value="AllowQtyBelow0">Allow Quantity Below 0</option>
            <option value="AllowQtyBelow0AndNotifyCustomer">Allow Qty Below 0 & Notify Customer</option>
          </select>
        </div>
      </div>
    </div>

    {/* ===== SHIPPING ADVANCED ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Shipping Units</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Weight Unit</label>
          <select
            name="weightUnit"
            value={formData.weightUnit}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="lb">Pound (lb)</option>
            <option value="oz">Ounce (oz)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Dimension Unit</label>
          <select
            name="dimensionUnit"
            value={formData.dimensionUnit}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option value="cm">Centimeter (cm)</option>
            <option value="m">Meter (m)</option>
            <option value="in">Inch (in)</option>
            <option value="ft">Feet (ft)</option>
          </select>
        </div>
      </div>
    </div>

    {/* ===== DIGITAL PRODUCT ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Digital Product</h3>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isDigital"
          checked={formData.isDigital}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">This is a digital product</span>
      </label>

      {formData.isDigital && (
        <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isDownload"
              checked={formData.isDownload}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Is downloadable</span>
          </label>

          {formData.isDownload && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Download ID</label>
                <input
                  type="text"
                  name="downloadId"
                  value={formData.downloadId}
                  onChange={handleChange}
                  placeholder="Enter download file ID"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="unlimitedDownloads"
                  checked={formData.unlimitedDownloads}
                  onChange={handleChange}
                  className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Unlimited downloads</span>
              </label>

              {!formData.unlimitedDownloads && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Downloads</label>
                  <input
                    type="number"
                    name="maxNumberOfDownloads"
                    value={formData.maxNumberOfDownloads}
                    onChange={handleChange}
                    placeholder="5"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Download Expiration (Days)</label>
                  <input
                    type="number"
                    name="downloadExpirationDays"
                    value={formData.downloadExpirationDays}
                    onChange={handleChange}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Activation Type</label>
                  <select
                    name="downloadActivationType"
                    value={formData.downloadActivationType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  >
                    <option value="when-order-is-paid">When Order Is Paid</option>
                    <option value="manually">Manually</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="hasUserAgreement"
                  checked={formData.hasUserAgreement}
                  onChange={handleChange}
                  className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Has user agreement</span>
              </label>

              {formData.hasUserAgreement && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">User Agreement Text</label>
                  <textarea
                    name="userAgreementText"
                    value={formData.userAgreementText}
                    onChange={handleChange}
                    placeholder="Enter user agreement terms..."
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="hasSampleDownload"
                  checked={formData.hasSampleDownload}
                  onChange={handleChange}
                  className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <span className="text-sm text-slate-300">Has sample download</span>
              </label>

              {formData.hasSampleDownload && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sample Download ID</label>
                  <input
                    type="text"
                    name="sampleDownloadId"
                    value={formData.sampleDownloadId}
                    onChange={handleChange}
                    placeholder="Enter sample file ID"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>

    {/* ===== RECURRING PRODUCT ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Recurring Product (Subscription)</h3>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isRecurring"
          checked={formData.isRecurring}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">This is a recurring product</span>
      </label>

      {formData.isRecurring && (
        <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cycle Length</label>
              <input
                type="number"
                name="recurringCycleLength"
                value={formData.recurringCycleLength}
                onChange={handleChange}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cycle Period</label>
              <select
                name="recurringCyclePeriod"
                value={formData.recurringCyclePeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Total Cycles</label>
              <input
                type="number"
                name="recurringTotalCycles"
                value={formData.recurringTotalCycles}
                onChange={handleChange}
                placeholder="0 = unlimited"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Example: Cycle Length: 1, Period: Months, Total: 12 = Monthly subscription for 1 year
          </p>
        </div>
      )}
    </div>

    {/* ===== RENTAL PRODUCT ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Rental Product</h3>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isRental"
          checked={formData.isRental}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">This is a rental product</span>
      </label>

      {formData.isRental && (
        <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rental Price Length</label>
              <input
                type="number"
                name="rentalPriceLength"
                value={formData.rentalPriceLength}
                onChange={handleChange}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rental Period</label>
              <select
                name="rentalPricePeriod"
                value={formData.rentalPricePeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Example: Length: 1, Period: Days = Daily rental pricing
          </p>
        </div>
      )}
    </div>

    {/* ===== GIFT CARD ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Gift Card</h3>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isGiftCard"
          checked={formData.isGiftCard}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">This is a gift card</span>
      </label>

      {formData.isGiftCard && (
        <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gift Card Type</label>
            <select
              name="giftCardType"
              value={formData.giftCardType}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            >
              <option value="virtual">Virtual</option>
              <option value="physical">Physical</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="overriddenGiftCardAmount"
              checked={formData.overriddenGiftCardAmount}
              onChange={handleChange}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
            />
            <span className="text-sm text-slate-300">Override gift card amount</span>
          </label>
        </div>
      )}
    </div>

    {/* ===== TELECOMMUNICATIONS TAX ===== */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Special Tax Settings</h3>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="telecommunicationsBroadcastingElectronicServices"
          checked={formData.telecommunicationsBroadcastingElectronicServices}
          onChange={handleChange}
          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
        />
        <span className="text-sm text-slate-300">Telecommunications, broadcasting and electronic services (EU VAT)</span>
      </label>
      <p className="text-xs text-slate-400">Check if this product falls under EU telecommunications/electronic services VAT rules</p>
    </div>

    {/* ===== INFO BOX ===== */}
    <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
      <h4 className="font-semibold text-sm text-violet-400 mb-2">⚙️ Advanced Settings Info</h4>
      <ul className="text-sm text-slate-300 space-y-1">
        <li><strong className="text-white">Vendor:</strong> Assign product to a specific vendor/supplier</li>
      
        <li><strong className="text-white">Dependencies:</strong> Force customers to buy required products together</li>
        <li><strong className="text-white">Base Price:</strong> Show unit pricing for better price comparison</li>
        <li><strong className="text-white">Digital:</strong> Configure downloadable products with access control</li>
        <li><strong className="text-white">Recurring:</strong> Set up subscription-based products</li>
        <li><strong className="text-white">Rental:</strong> Enable time-based product rentals</li>
      </ul>
    </div>

  </div>
</TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

    </div>
  );
}
