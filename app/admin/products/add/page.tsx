"use client";
import { useState, useRef, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, X, Info, Search, Image, Package,
  Tag,  Globe,  Truck,
 PoundSterling, Link as LinkIcon, ShoppingCart, Video,
  Play,
  Plus,
  Settings
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api"; // Import your axios client
import { ProductDescriptionEditor } from "@/app/admin/products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";
import  { API_BASE_URL,API_ENDPOINTS } from "@/lib/api-config";
import { BrandApiResponse, CategoryApiResponse, CategoryData, DropdownsData, ProductAttribute, ProductImage, ProductItem, ProductsApiResponse, ProductVariant, SimpleProduct, VATRateApiResponse, VATRateData } from '@/lib/services';
import { GroupedProductModal } from '../GroupedProductModal';
import { MultiBrandSelector } from "../MultiBrandSelector";



export default function AddProductPage() {
  const router = useRouter();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
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

// Updated combined useEffect with manufacturers API
useEffect(() => {
  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all data (dropdowns + products)...');
      
      // ✅ ADD simpleProductsResponse to Promise.all
      const [brandsResponse, categoriesResponse, productsResponse, vatRatesResponse, simpleProductsResponse] = await Promise.all([
        apiClient.get<BrandApiResponse>(`${API_ENDPOINTS.brands}?includeUnpublished=false`),
        apiClient.get<CategoryApiResponse>(`${API_ENDPOINTS.categories}?includeInactive=true&includeSubCategories=true`),
        apiClient.get<ProductsApiResponse>(`${API_ENDPOINTS.products}`),
        apiClient.get<VATRateApiResponse>(API_ENDPOINTS.vatrates),
        apiClient.get(`${API_ENDPOINTS.products}/simple`)  // ✅ ADD THIS LINE
      ]);

      // Extract dropdown data
      const brandsData = (brandsResponse.data as BrandApiResponse)?.data || [];
      const categoriesData = (categoriesResponse.data as CategoryApiResponse)?.data || [];
      const vatRatesData = (vatRatesResponse.data as VATRateApiResponse)?.data || [];

      // Set dropdown data
      setDropdownsData({
        brands: brandsData,
        categories: categoriesData,
        vatRates: vatRatesData
      });

      // ✅ ADD: Process Simple Products
      if (simpleProductsResponse.data && !simpleProductsResponse.error) {
        const simpleApiResponse = simpleProductsResponse.data as any;
        if (simpleApiResponse.success && Array.isArray(simpleApiResponse.data)) {
          const simpleProductsList = simpleApiResponse.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price || 0,
            stockQuantity: p.stockQuantity || 0
          }));
          setSimpleProducts(simpleProductsList);
          console.log('✅ Loaded simple products:', simpleProductsList.length);
        }
      }

      // Process Available Products for Related/Cross-sell
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
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error);
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
  categories: '', // Will store category ID
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

  // ===== RELATED PRODUCTS =====
  relatedProducts: [] as string[],
  crossSellProducts: [] as string[],

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
  callForPrice: false,
  customerEntersPrice: false,
  minimumCustomerEnteredPrice: '',
  maximumCustomerEnteredPrice: '',
  
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
  telecommunicationsBroadcastingElectronicServices: false,

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
  notifyQuantityBelow: '1',           // ✅ User input threshold
  
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

  const target = e.target as HTMLElement;
  if (target.hasAttribute('data-submitting')) {
    toast.info('⏳ Already submitting... Please wait!');
    return;
  }
  target.setAttribute('data-submitting', 'true');

  try {
    console.log('🚀 ==================== PRODUCT SUBMISSION START ====================');
    console.log('📋 Form Mode:', isDraft ? 'DRAFT' : 'PUBLISH');

    // ✅ Basic Validation
    if (!formData.name || !formData.sku) {
      toast.warning('⚠️ Please fill in required fields: Product Name and SKU');
      target.removeAttribute('data-submitting');
      return;
    }

    const nameRegex = /^[A-Za-z0-9\s\-.,()'/]+$/;
    if (!nameRegex.test(formData.name)) {
      toast.error("⚠️ Invalid product name. Special characters like @, #, $, % are not allowed.");
      target.removeAttribute('data-submitting');
      return;
    }

    // ✅ Grouped Product Validation
    if (formData.productType === 'grouped' && formData.requireOtherProducts) {
      if (!formData.requiredProductIds || formData.requiredProductIds.trim() === '') {
        toast.error('⚠️ Please select at least one product for grouped product.');
        target.removeAttribute('data-submitting');
        return;
      }
    }

    const loadingId = toast.info(
      isDraft ? '💾 Saving as draft...' : '🔄 Creating product...', 
  
    );

    // ✅ GUID validation
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // ✅ Process Category
    let categoryId: string | null = null;
    if (formData.categories && formData.categories.trim() && guidRegex.test(formData.categories.trim())) {
      categoryId = formData.categories.trim();
    }
    console.log('📁 Category ID:', categoryId || 'None');

    // ✅ Process Multiple Brands - NEW IMPLEMENTATION
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

    // ✅ BUILD BRANDS ARRAY - Required by backend
    const brandsArray = brandIdsArray.map((brandId, index) => ({
      brandId: brandId,
      isPrimary: index === 0,      // First brand is primary
      displayOrder: index + 1      // 1-based ordering
    }));

    console.log('🏷️ Final brands array:', brandsArray);
    console.log('🏷️ Primary brand:', brandIdsArray[0]);

    // ✅ Prepare attributes array
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

    // ✅ Prepare variants array
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

    // ✅ COMPLETE PRODUCT DATA WITH BRANDS
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

      // Pricing
      price: parseFloat(formData.price.toString()) || 0,

      // ✅ BRANDS - Complete format with all 3 fields
      brandId: brandIdsArray[0],     // Primary brand (legacy support)
      brandIds: brandIdsArray,       // Array of GUIDs (new format)
      brands: brandsArray,           // ✅ Objects array (REQUIRED by backend)

      // INVENTORY
      stockQuantity: parseInt(formData.stockQuantity.toString()) || 0,
      trackQuantity: formData.manageInventory === 'track',
      manageInventoryMethod: formData.manageInventory,
      minStockQuantity: parseInt(formData.minStockQuantity.toString()) || 0,
      
      // NOTIFICATION
      notifyAdminForQuantityBelow: formData.notifyAdminForQuantityBelow ?? false,
      notifyQuantityBelow: formData.notifyAdminForQuantityBelow 
        ? parseInt(formData.notifyQuantityBelow.toString()) || 1 
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

      // Relationships
      categoryId: categoryId || null,

      // Attributes & Variants
      attributes: attributesArray.length > 0 ? attributesArray : [],
      variants: variantsArray.length > 0 ? variantsArray : [],
    };

    // ✅ Add optional fields
    if (formData.gtin?.trim()) productData.gtin = formData.gtin.trim();
    if (formData.manufacturerPartNumber?.trim()) productData.manufacturerPartNumber = formData.manufacturerPartNumber.trim();
    if (formData.adminComment?.trim()) productData.adminComment = formData.adminComment.trim();

    // Pricing - Optional
    if (formData.oldPrice) productData.oldPrice = parseFloat(formData.oldPrice.toString());
    if (formData.oldPrice) productData.compareAtPrice = parseFloat(formData.oldPrice.toString());
    if (formData.cost) productData.costPrice = parseFloat(formData.cost.toString());

    // Shipping
    if (formData.isShipEnabled) productData.requiresShipping = true;
    if (formData.isFreeShipping) productData.isFreeShipping = true;
    if (formData.shipSeparately) productData.shipSeparately = true;
    if (formData.weight) productData.weight = parseFloat(formData.weight.toString());
    if (formData.length) productData.length = parseFloat(formData.length.toString());
    if (formData.width) productData.width = parseFloat(formData.width.toString());
    if (formData.height) productData.height = parseFloat(formData.height.toString());

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

    // Reviews
    if (formData.allowCustomerReviews) productData.allowCustomerReviews = true;

    console.log('📦 ==================== FINAL PAYLOAD ====================');
    console.log(JSON.stringify(productData, null, 2));
    console.log('🏷️ brandId (primary):', productData.brandId);
    console.log('🏷️ brandIds (array):', productData.brandIds);
    console.log('🏷️ brands (objects):', productData.brands);
    console.log('📦 ==================== END PAYLOAD ====================');

    // ✅ Create Product with endpoint fallback
    let response: any = undefined;
    const endpoints = ['/api/Products', '/Products', '/api/Product'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying POST ${endpoint}...`);
        response = await apiClient.post(endpoint, productData);
        console.log(`✅ Success with ${endpoint}`);
        console.log('📥 Response:', response.data);
        break;
      } catch (error: any) {
        console.log(`❌ Failed with ${endpoint}:`, error.response?.status, error.response?.data);
        if (endpoints.indexOf(endpoint) === endpoints.length - 1) {
          throw error;
        }
      }
    }

    toast.dismiss(loadingId);

    // ✅ Extract Product ID from response
    let productId: string | null = null;

    if (response) {
      if (response.data?.data?.id) {
        productId = response.data.data.id;
      } else if (response.data?.id) {
        productId = response.data.id;
      } else if (response.id) {
        productId = response.id;
      }
    }

    console.log('🆔 Final Product ID:', productId);

    if (!productId) {
      toast.error('❌ Product created but ID not found. Cannot upload images.');
      router.push('/admin/products');
      return;
    }

    // ✅ Upload Product Images
    if (formData.productImages && formData.productImages.length > 0) {
      const imagesToUpload = formData.productImages.filter(img => img.file);
      
      if (imagesToUpload.length > 0) {
        console.log(`📤 Uploading ${imagesToUpload.length} product images...`);
        
        try {
          const uploadedImages = await uploadImagesToProduct(productId, imagesToUpload);
          
          if (uploadedImages && uploadedImages.length > 0) {
            console.log('✅ Product images uploaded:', uploadedImages);
          }
        } catch (imageError) {
          console.error('❌ Error uploading product images:', imageError);
          toast.warning('⚠️ Product created but images failed to upload.');
        }
      }
    }

    // ✅ Upload Variant Images
    if (productVariants.length > 0) {
      const variantsWithImages = productVariants.filter(v => v.imageFile);
      
      if (variantsWithImages.length > 0) {
        console.log(`🖼️ Uploading ${variantsWithImages.length} variant images...`);
        
        try {
          await uploadVariantImages(response.data?.data || response.data);
        } catch (variantError) {
          console.error('❌ Error uploading variant images:', variantError);
          toast.warning('⚠️ Some variant images failed to upload.');
        }
      }
    }

    console.log('✅ ==================== PRODUCT SUBMISSION SUCCESS ====================');

    // ✅ Success message
    toast.success(
      isDraft 
        ? '💾 Product saved as draft!' 
        : '✅ Product created successfully!',
      { autoClose: 3000 }
    );

    // Navigate after delay
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
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  const { name, value, type } = e.target;
  const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;

  // ⭐ 1. CATEGORY SELECTION - Special handling
  if (name === "categories") {
    const selectElement = e.target as HTMLSelectElement;
    const selectedOption = selectElement.options[selectElement.selectedIndex];

    setFormData((prev) => ({
      ...prev,
      categories: value,
      categoryName: selectedOption.dataset.categoryName || 
                    selectedOption.dataset.displayName || 
                    selectedOption.text.replace(/📁\s*/, "").trim(),
    }));
    return;
  }

  // ⭐ 2. SEO SLUG - Auto-generate with debounce
  if (name === "searchEngineFriendlyPageName") {
    setFormData((prev) => ({
      ...prev,
      searchEngineFriendlyPageName: value,
    }));

    clearTimeout(slugTimer);
    slugTimer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(prev.searchEngineFriendlyPageName),
      }));
    }, 1500);
    return;
  }

  // ⭐ 3. PRODUCT NAME - Auto-generate slug
  if (name === "name") {
    setFormData((prev) => ({
      ...prev,
      name: value,
    }));

    clearTimeout(slugTimer);
    slugTimer = setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        searchEngineFriendlyPageName: generateSeoName(value),
      }));
    }, 1000);
    return;
  }

  // ⭐ 4. PRODUCT TYPE - Handle grouped/simple switching
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

  // ⭐ 5. REQUIRE OTHER PRODUCTS - Handle grouped product checkbox
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

  // ⭐ 6. SHIPPING ENABLED - Master switch
  if (name === "isShipEnabled") {
    setFormData((prev) => ({
      ...prev,
      isShipEnabled: checked,
      isFreeShipping: checked ? prev.isFreeShipping : false,
      additionalShippingCharge: checked ? prev.additionalShippingCharge : '',
      shipSeparately: checked ? prev.shipSeparately : false,
      weight: checked ? prev.weight : '',
      length: checked ? prev.length : '',
      width: checked ? prev.width : '',
      height: checked ? prev.height : '',
      deliveryDateId: checked ? prev.deliveryDateId : '',
    }));
    return;
  }

  // ⭐ 7. FREE SHIPPING - Auto reset additional charge
  if (name === "isFreeShipping") {
    setFormData((prev) => ({
      ...prev,
      isFreeShipping: checked,
      additionalShippingCharge: checked ? '' : prev.additionalShippingCharge,
    }));
    return;
  }

  // ⭐ 8. RECURRING PRODUCT - Reset fields when disabled
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

  // ⭐ 9. PACK PRODUCT - Reset pack size when disabled
  if (name === "isPack") {
    setFormData((prev) => ({
      ...prev,
      isPack: checked,
      packSize: checked ? prev.packSize : '',
    }));
    return;
  }

  // ⭐ 10. MARK AS NEW - Reset dates when disabled
  if (name === "markAsNew") {
    setFormData((prev) => ({
      ...prev,
      markAsNew: checked,
      markAsNewStartDate: checked ? prev.markAsNewStartDate : '',
      markAsNewEndDate: checked ? prev.markAsNewEndDate : '',
    }));
    return;
  }

  // ⭐ 11. CUSTOMER ENTERS PRICE - Reset min/max when disabled
  if (name === "customerEntersPrice") {
    setFormData((prev) => ({
      ...prev,
      customerEntersPrice: checked,
      minimumCustomerEnteredPrice: checked ? prev.minimumCustomerEnteredPrice : '',
      maximumCustomerEnteredPrice: checked ? prev.maximumCustomerEnteredPrice : '',
    }));
    return;
  }

  // ⭐ 12. BASE PRICE ENABLED - Reset base price fields
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

  // ⭐ 13. NOTIFY ADMIN - Conditional threshold input
  if (name === "notifyAdminForQuantityBelow") {
    setFormData((prev) => ({
      ...prev,
      notifyAdminForQuantityBelow: checked,
      notifyQuantityBelow: checked ? prev.notifyQuantityBelow : '1',
    }));
    return;
  }

  // ⭐ 14. ALLOW BACKORDER - Conditional backorder mode
  if (name === "allowBackorder") {
    setFormData((prev) => ({
      ...prev,
      allowBackorder: checked,
      backorderMode: checked ? "allow-qty-below-zero" : "no-backorders",
    }));
    return;
  }

  // ⭐ 15. AVAILABLE FOR PRE-ORDER - Reset pre-order date
  if (name === "availableForPreOrder") {
    setFormData((prev) => ({
      ...prev,
      availableForPreOrder: checked,
      preOrderAvailabilityStartDate: checked ? prev.preOrderAvailabilityStartDate : '',
    }));
    return;
  }

  // ⭐ 16. GIFT CARD - Reset gift card fields
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

  // ⭐ 17. DOWNLOADABLE PRODUCT - Reset download fields
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

  // ⭐ 18. RENTAL PRODUCT - Reset rental fields
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

  // ⭐ 19. HAS USER AGREEMENT - Reset agreement text
  if (name === "hasUserAgreement") {
    setFormData((prev) => ({
      ...prev,
      hasUserAgreement: checked,
      userAgreementText: checked ? prev.userAgreementText : '',
    }));
    return;
  }

  // ⭐ 20. HAS SAMPLE DOWNLOAD - Reset sample download ID
  if (name === "hasSampleDownload") {
    setFormData((prev) => ({
      ...prev,
      hasSampleDownload: checked,
      sampleDownloadId: checked ? prev.sampleDownloadId : '',
    }));
    return;
  }

  // ⭐ 21. UNLIMITED DOWNLOADS - Reset max downloads
  if (name === "unlimitedDownloads") {
    setFormData((prev) => ({
      ...prev,
      unlimitedDownloads: checked,
      maxNumberOfDownloads: checked ? '' : prev.maxNumberOfDownloads,
    }));
    return;
  }

  // ⭐ 22. DEFAULT HANDLER - All other fields
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

  // Product Variant handlers (matching backend ProductVariantCreateDto)
// ✅ STEP 2: Replace existing addProductVariant function
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
// ✅ FIXED: Complete function based on API response
const uploadImagesToProduct = async (productId: string, images: ProductImage[]) => {
  console.log(`📤 Uploading ${images.length} images to product ${productId}...`);

  try {
    // ✅ API accepts multiple images in ONE request
    const uploadFormData = new FormData();
    
    let validImageCount = 0;
    images.forEach((image) => {
      if (image.file) {
        // ✅ Append each file with the same field name "images"
        uploadFormData.append('images', image.file);
        validImageCount++;
      }
    });

    if (validImageCount === 0) {
      console.log('⚠️ No valid images to upload');
      return [];
    }

    console.log(`📷 Uploading ${validImageCount} images in batch...`);
    
    // ✅ Get token
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      toast.error('❌ No authentication token found');
      return [];
    }

    // ✅ Make API request
    const uploadResponse = await fetch(
      `${API_BASE_URL}/api/Products/${productId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // ❌ DON'T add Content-Type - browser sets it automatically with boundary
        },
        body: uploadFormData,
      }
    );

    console.log(`📡 Upload response status: ${uploadResponse.status}`);

    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload response:', result);
      
      if (result.success && result.data) {
        toast.success(`✅ ${result.data.length} image(s) uploaded successfully! 📷`);
        return result.data;
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } else {
      const errorText = await uploadResponse.text();
      console.error(`❌ Upload failed:`, errorText);
      
      // Try to parse error JSON
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `HTTP ${uploadResponse.status}`);
      } catch {
        throw new Error(`HTTP ${uploadResponse.status}: ${errorText.substring(0, 200)}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error in uploadImagesToProduct:', error);
    toast.error(`Failed to upload images: ${error.message}`);
    return [];
  }
};




// ✅ NEW: Function to upload variant images after product is created
const uploadVariantImages = async (productResponse: any) => {
  console.log('🖼️ Checking for variant images to upload...');
  
  // Get variant IDs from the response
  const createdVariants = productResponse?.variants;
  
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

      console.log(`📤 Uploading image for variant ${localVariant.name} (ID: ${createdVariant.id})`);

      try {
        const formData = new FormData();
        formData.append("image", localVariant.imageFile);

        const token = localStorage.getItem("authToken");

        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/Products/variants/${createdVariant.id}/image`,
          {
            method: "POST",
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          console.log(`✅ Variant image uploaded successfully for ${localVariant.name}`);
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
    
    console.log(`✅ ${successfulUploads.length} variant images uploaded successfully`);
    
    if (successfulUploads.length > 0) {
      toast.success(`${successfulUploads.length} variant image(s) uploaded! 📷`);
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

      {/* SHORT DESCRIPTION (Max 250 chars) */}
      <ProductDescriptionEditor
        label="Short Description"
        value={formData.shortDescription}
        onChange={(value) => {
          const plainText = value.replace(/<[^>]*>/g, "").trim();

          if (plainText.length > 250) {
            alert("You can not enter more than 250 characters in short description");
            return;
          }

          setFormData({ ...formData, shortDescription: value });
        }}
        placeholder="Brief product description (shown in product lists)"
        height={200}
      />

      {/* FULL DESCRIPTION (Max 2000 chars) */}
      <ProductDescriptionEditor
        label="Full Description"
        value={formData.fullDescription}
        onChange={(value) => {
          const plainText = value.replace(/<[^>]*>/g, "").trim();

          if (plainText.length > 2000) {
            alert("You can not enter more than 2000 characters in full description");
            return;
          }

          setFormData({ ...formData, fullDescription: value });
        }}
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
            className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            required
          />
        </div>

   {/* ✅ Multiple Brands Selector - ADD PAGE */}
<div>
  <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
    <span>Brands</span>
    <span className="text-xs text-emerald-400 font-normal">
      ({dropdownsData.brands.length} available)
    </span>
  </label>
  
  <MultiBrandSelector
    selectedBrands={formData.brandIds}
    availableBrands={dropdownsData.brands}
    onChange={(brandIds) => {
      setFormData(prev => ({
        ...prev,
        brandIds: brandIds,
        brand: brandIds[0] || '', // Set first as primary
      }));
    }}
    placeholder="Select one or more brands..."
  />

  {/* Info Text */}
  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
    <span>💡</span>
    <span>First selected brand will be the primary brand</span>
  </p>
</div>


        <div>
          <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
            <span>Categories</span>
            <span className="text-xs text-emerald-400 font-normal">
              {dropdownsData.categories.length} loaded
            </span>
          </label>
          
          {/* Custom select with overlay */}
          <div className="relative">
            <select
              name="categories"
              value={formData.categories}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-transparent focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              {renderCategoryOptions(dropdownsData.categories)}
            </select>
            
            {/* Clean text overlay */}
            <div className="absolute inset-0 px-3 py-2.5 pointer-events-none flex items-center justify-between">
              <span className={`truncate text-sm ${formData.categoryName && formData.categoryName !== 'All' ? 'text-white' : 'text-slate-500'}`}>
                {formData.categoryName || 'Select category'}
              </span>
              
              {/* Dropdown arrow */}
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
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

        {/* ✅ Edit Button + Product Count Inline */}
        {formData.productType === 'grouped' && (
          <div className="flex items-center gap-2">
            {/* Product Count Badge */}
            {selectedGroupedProducts.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-violet-400">
                  {selectedGroupedProducts.length} linked
                </span>
              </div>
            )}
            
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsGroupedModalOpen(true)}
              className="p-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 hover:border-violet-500/50 text-violet-400 rounded-xl transition-all"
              title="Configure grouped product"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
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

    {/* Column 3 - Call for price */}
    <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
      <input
        type="checkbox"
        name="callForPrice"
        checked={formData.callForPrice}
        onChange={handleChange}
        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
      />
      <span className="text-sm text-slate-300">Call for price</span>
    </label>
  </div>

  {/* ✅ Second Row: Customer enters price (single column) */}
  <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-all">
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

  {/* Telecommunications checkbox */}
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      name="telecommunicationsBroadcastingElectronicServices"
      checked={formData.telecommunicationsBroadcastingElectronicServices}
      onChange={handleChange}
      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
    />
    <span className="text-sm text-slate-300">
      Telecommunications / Broadcasting / Electronic Services
    </span>
  </label>
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

                  {/* Additional Shipping Charge */}
{/* Additional Shipping Charge - ONLY when Free Shipping is OFF */}
{!formData.isFreeShipping && (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">
      Additional Shipping Charge (£)
    </label>
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
)}


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

              {/* Product Variants Tab - NEW */}
{/* ✅ STEP 7: Replace ENTIRE Variants TabsContent section */}
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

            {/* ✅ UPDATED: Variant Image Upload with Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Variant Image
              </label>
              
              {/* Preview Section */}
              {variant.imageUrl ? (
                <div className="relative inline-block mb-3">
                  <img
                    src={variant.imageUrl}
                    alt={variant.name || "Variant"}
                    className="w-32 h-32 object-cover rounded-lg border-2 border-slate-700 shadow-lg"
                  />
                  
                  {/* Preview Badge */}
                  {variant.imageUrl.startsWith("blob:") && (
                    <span className="absolute top-1 right-1 px-2 py-1 bg-orange-500 text-white text-xs rounded-md">
                      Preview
                    </span>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeVariantImage(variant.id)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              
              {/* Upload Button */}
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
                  {variant.imageUrl ? "Change Image" : "Upload Image"}
                </label>
                
                {/* Help Text */}
                <div className="text-sm text-slate-400">
                  {variant.imageUrl?.startsWith("blob:") ? (
                    <span className="text-orange-400">⚠️ Will upload when you save</span>
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
        <li>• Images will be uploaded when you click "Save & Continue" or "Save as Draft"</li>
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

<TabsContent value="media" className="space-y-2 mt-2">
  {/* ========== PICTURES SECTION ========== */}
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

    {/* Image Upload Area */}
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

    {/* Image Preview Grid */}
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
            <div key={image.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-3 space-y-3 relative">
              {/* Main Image Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-violet-500 text-white text-xs font-medium rounded-lg z-10">
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
                    if (image.imageUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(image.imageUrl);
                    }
                    removeImage(image.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-all z-10"
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

    {/* Images Info Box */}
    <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
      <h4 className="font-semibold text-sm text-violet-400 mb-2">Image Upload Process</h4>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>• Images are staged for upload when product is created</li>
        <li>• Product name is sent as query parameter for API identification</li>
        <li>• Images are uploaded to: de <>/api/Products/{`{id}`}/images?name=ProductName</></li>
        <li>• First image becomes the main product image automatically</li>
        <li>• Supported formats: JPG, PNG, WebP (max 5MB each)</li>
      </ul>
    </div>
  </div>

  {/* ========== DIVIDER ========== */}
  <div className="my-6 border-t-2 border-slate-800"></div>

  {/* ========== VIDEOS SECTION ========== */}
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
        Product Videos
      </h3>
      <p className="text-sm text-slate-400 mt-2">
        Add video URLs (YouTube, Vimeo, etc.) to showcase your product
      </p>
    </div>

    {/* Video Grid Preview */}
    {formData.videoUrls.length > 0 && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formData.videoUrls.map((url, index) => (
            <div 
              key={index}
              className="group relative bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden hover:border-violet-500/50 transition-all"
            >
              {/* Video Thumbnail Preview */}
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
                {url && url.includes('youtube.com') ? (
                  <>
                    {/* YouTube Thumbnail */}
                    <img
                      src={`https://img.youtube.com/vi/${getYouTubeVideoId(url)}/maxresdefault.jpg`}
                      alt={`Video ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(url)}/hqdefault.jpg`;
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-all">
                      <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Placeholder */
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Video className="w-12 h-12 text-slate-600" />
                    <span className="text-xs text-slate-500">Video {index + 1}</span>
                  </div>
                )}
                
                {/* Video Number Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                  <span className="text-xs font-semibold text-white">#{index + 1}</span>
                </div>
              </div>

              {/* Video Info & Actions */}
              <div className="p-3 bg-slate-900/50 space-y-2">
                {/* URL Input */}
                <div className="flex items-center gap-2">
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
                    className="flex-1 px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      videoUrls: formData.videoUrls.filter((_, i) => i !== index)
                    });
                  }}
                  className="w-full px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Empty State */}
    {formData.videoUrls.length === 0 && (
      <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
        <Video className="mx-auto h-16 w-16 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Videos Added</h3>
        <p className="text-slate-400 mb-4">
          Click "Add Video URL" to embed product videos
        </p>
      </div>
    )}

    {/* Add Video Button */}
    <button
      type="button"
      onClick={() => {
        setFormData({
          ...formData,
          videoUrls: [...formData.videoUrls, '']
        });
      }}
      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 hover:border-violet-500/50 transition-all text-sm font-medium flex items-center justify-center gap-2"
    >
      <Plus className="h-4 w-4" />
      Add Video URL
    </button>

    {/* Supported Platforms Info */}
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
      <h4 className="font-semibold text-sm text-cyan-400 mb-2">
        Supported Video Platforms
      </h4>
      <ul className="text-sm text-slate-300 space-y-1">
        <li>• YouTube (https://youtube.com/watch?v=...)</li>
        <li>• Vimeo (https://vimeo.com/...)</li>
        <li>• Direct video URLs (.mp4, .webm)</li>
      </ul>
    </div>
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
        onProductsChange={handleGroupedProductsChange}
        onAutoAddChange={(checked) => {
          setFormData(prev => ({
            ...prev,
            automaticallyAddProducts: checked
          }));
        }}
      />
    </div>
  );
}
