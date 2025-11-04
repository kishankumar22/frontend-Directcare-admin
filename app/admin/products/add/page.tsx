"use client";

import { useState, useRef, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Upload, X, Info, Search, Image, Package,
  Tag, BarChart3, Globe,  Truck, Gift, Calendar,
  Users, DollarSign, Link as LinkIcon, ShoppingCart, Video
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api"; // Import your axios client
import { ProductDescriptionEditor } from "@/app/admin/products/SelfHostedEditor";
import { useToast } from "@/components/CustomToast";

// API response interfaces को properly define करें
interface BrandApiResponse {
  success: boolean;
  message: string;
  data: BrandData[];
  errors: null;
}
// Interface for images
// Updated interface to include file property
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
  file?: File; // Add this to store the actual file
}

// Types for products API response
interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  oldPrice?: number;
  description?: string;
  shortDescription?: string;
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

interface CategoryApiResponse {
  success: boolean;
  message: string;
  data: CategoryData[];
  errors: null;
}

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


// Add Manufacturer interface
interface ManufacturerData {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  logoUrl?: string;
  isPublished?: boolean;
  showOnHomepage?: boolean;
  displayOrder?: number;
}

interface ManufacturerApiResponse {
  success: boolean;
  message: string;
  data: ManufacturerData[];
  errors: null;
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
// First, define the API response interfaces at the top of your file:
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
}

interface ImageUploadResponse {
  id: string;
  imageUrl: string;
  url?: string;
  originalName?: string;
}

// Interface for images
interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
}
// Update DropdownsData interface
interface DropdownsData {
  brands: BrandData[];
  categories: CategoryData[];
  manufacturers: ManufacturerData[]; // Add this line
}
export default function AddProductPage() {
  const router = useRouter();
     const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermCross, setSearchTermCross] = useState('');
  const [attributes, setAttributes] = useState<Array<{id: string, name: string, values: string[]}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
// Add this to your component state
const [availableProducts, setAvailableProducts] = useState<Array<{id: string, name: string, sku: string, price: string}>>([]);

// State variables for image upload
const [uploadingImages, setUploadingImages] = useState(false);
const [imageUploadProgress, setImageUploadProgress] = useState<{[key: string]: number}>({});



// Update initial state
const [dropdownsData, setDropdownsData] = useState<DropdownsData>({
  brands: [],
  categories: [],
  manufacturers: [] // Add this line
});

// Updated combined useEffect with manufacturers API
useEffect(() => {
  const fetchAllData = async () => {
    try {
      console.log('🔄 Fetching all data (dropdowns + products + manufacturers)...');
      // Fetch all data in parallel including manufacturers
      const [brandsResponse, categoriesResponse, productsResponse, manufacturersResponse] = await Promise.all([
        apiClient.get<BrandApiResponse>('/api/Brands?includeUnpublished=false'),
        apiClient.get<CategoryApiResponse>('/api/Categories?includeInactive=true&includeSubCategories=true'),
        apiClient.get<ProductsApiResponse>('/api/Products'),
        apiClient.get<ManufacturerApiResponse>('/api/Manufacturers') // Added manufacturers API
      ]);

      // Extract dropdown data with proper typing
      const brandsData = (brandsResponse.data as BrandApiResponse)?.data || [];
      const categoriesData = (categoriesResponse.data as CategoryApiResponse)?.data || [];
      const manufacturersData = (manufacturersResponse.data as ManufacturerApiResponse)?.data || [];

      // Set dropdown data including manufacturers
      setDropdownsData({
        brands: brandsData,
        categories: categoriesData,
        manufacturers: manufacturersData // Add manufacturers data
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
        manufacturersCount: manufacturersData.length,
        productsCount: productsResponse.data ? (productsResponse.data as ProductsApiResponse).data.items.length : 0
      });

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      
      // Set fallbacks
      setDropdownsData({
        brands: [],
        categories: [],
        manufacturers: []
      });
      setAvailableProducts([]);
    }
  };

  fetchAllData();
}, []);



  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    shortDescription: '',
    fullDescription: '',
    sku: '',
    categories: '', // Will store category ID
    brand: '', // Will store brand ID
    manufacturer: '',
    published: true,
    productType: 'simple',
    visibleIndividually: true,
    manufacturerId: '', // Changed from 'manufacturer' to 'manufacturerId'
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
   productImages: [] as ProductImage[], 
    // Related Products
    relatedProducts: [] as string[],
    crossSellProducts: [] as string[],

    // New fields for additional tabs
    // productImages: [] as Array<{id: string, url: string, altText: string, displayOrder: number}>,
    videoUrls: [] as string[],
    specifications: [] as Array<{id: string, name: string, value: string, displayOrder: number}>,

    // Pricing
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
    basepriceEnabled: false,
    basepriceAmount: '',
    basepriceUnit: '',
    basepriceBaseAmount: '',
    basepriceBaseUnit: '',
    markAsNew: false,
    markAsNewStartDate: '',
    markAsNewEndDate: '',

    // Discounts
    hasDiscountsApplied: false,
    availableStartDate: '',
    availableEndDate: '',

    // Tax
    taxExempt: false,
    taxCategoryId: '',
    telecommunicationsBroadcastingElectronicServices: false,

    // SEO
    metaTitle: '',
    metaKeywords: '',
    metaDescription: '',
    searchEngineFriendlyPageName: '',

    // Inventory
    manageInventory: 'track',
    stockQuantity: '',
    displayStockAvailability: true,
    displayStockQuantity: false,
    minStockQuantity: '',
    lowStockActivity: 'nothing',
    notifyAdminForQuantityBelow: '',
    backorders: 'no-backorders',
    allowBackInStockSubscriptions: false,
    productAvailabilityRange: '',
    minCartQuantity: '1',
    maxCartQuantity: '10000',
    allowedQuantities: '',
    allowAddingOnlyExistingAttributeCombinations: false,
    notReturnable: false,

    // Shipping
    isShipEnabled: true,
    isFreeShipping: false,
    shipSeparately: false,
    additionalShippingCharge: '',
    deliveryDateId: '',
    weight: '',
    length: '',
    width: '',
    height: '',

    // Gift Cards
    isGiftCard: false,
    giftCardType: 'virtual',
    overriddenGiftCardAmount: '',

    // Downloadable Product
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
    categoryName: '', // Add this for clean category name

    // Recurring Product
    isRecurring: false,
    recurringCycleLength: '',
    recurringCyclePeriod: 'days',
    recurringTotalCycles: '',

    // Rental Product
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
// New function to upload images to specific product
// Fixed function to upload images to specific product
const uploadImagesToProduct = async (productId: string, images: (ProductImage & { file?: File })[]) => {
  console.log(`📸 Uploading ${images.length} images to product ${productId}...`);
  
  try {
    const uploadPromises = images.map(async (image, index) => {
      try {
        // Check if we have the actual file object stored
        if (!image.file) {
          console.log(`⏭️ Skipping image ${index + 1} (no file object)`);
          return null;
        }

        // Create FormData for this specific product
        const uploadFormData = new FormData();
        
        // FIXED: Use 'images' as array field name (as per your API screenshot)
        uploadFormData.append('images', image.file);
        
        // Optional: Add metadata if your API supports it
        // uploadFormData.append('altText', image.altText || '');
        // uploadFormData.append('sortOrder', image.sortOrder.toString());
        // uploadFormData.append('isMain', image.isMain.toString());

        console.log(`📤 Uploading image ${index + 1}:`, image.fileName);

        // FIXED: Use correct API endpoint with product ID
        const uploadResponse: any = await apiClient.post(
          `/api/Product/${productId}/images`, // Correct API endpoint
          uploadFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        if (uploadResponse && uploadResponse.data && uploadResponse.data.success) {
          console.log(`✅ Image ${index + 1} uploaded successfully`);
          return uploadResponse.data;
        } else {
          throw new Error(`Upload failed: ${uploadResponse.data?.message || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error(`❌ Error uploading image ${index + 1}:`, error);
        
        // Better error logging
        if (error.response) {
          console.error('Response error:', error.response.status, error.response.data);
        }
        
        // Don't throw error, just return null to continue with other uploads
        return null;
      }
    });

    // Wait for all image uploads to complete
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(result => result !== null);
    
    console.log(`✅ ${successfulUploads.length} out of ${images.length} images uploaded successfully`);
    return successfulUploads;

  } catch (error) {
    console.error('❌ Error in uploadImagesToProduct:', error);
    throw error;
  }
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
      return;
    }

    console.log('🚀 Starting product submission...');

    // Show loading toast
    const loadingId = toast.info(
      isDraft ? 'Saving as draft...' : 'Creating product...', 
      { autoClose: 0 }
    );

    // Prepare categoryId - ensure it's a valid GUID or null
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let categoryId: string | null = null;
    if (formData.categories && formData.categories.trim()) {
      const trimmedCategory = formData.categories.trim();
      if (guidRegex.test(trimmedCategory)) {
        categoryId = trimmedCategory;
      } else {
        console.warn('⚠️ Invalid category GUID:', trimmedCategory);
      }
    }

    // Prepare brandId - ensure it's a valid GUID or null
    let brandId: string | null = null;
    if (formData.brand && formData.brand.trim()) {
      const trimmedBrand = formData.brand.trim();
      if (guidRegex.test(trimmedBrand)) {
        brandId = trimmedBrand;
      } else {
        console.warn('⚠️ Invalid brand GUID:', trimmedBrand);
      }
    }

    // Prepare manufacturerId - ensure it's a valid GUID or null
    let manufacturerId: string | null = null;
    if (formData.manufacturerId && formData.manufacturerId.trim()) {
      const trimmedManufacturer = formData.manufacturerId.trim();
      if (guidRegex.test(trimmedManufacturer)) {
        manufacturerId = trimmedManufacturer;
      } else {
        console.warn('⚠️ Invalid manufacturer GUID:', trimmedManufacturer);
      }
    }

    // Prepare product data for API
    const productData = {
      // Basic Info - Required fields
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || formData.name || 'Product description',
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      
      // Optional basic fields
      gtin: formData.gtin?.trim() || null,
      manufacturerPartNumber: formData.manufacturerPartNumber?.trim() || null,
      displayOrder: parseInt(formData.displayOrder) || 1,
      adminComment: formData.adminComment?.trim() || null,

      // Pricing
      price: parseFloat(formData.price) || 0,
      oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      compareAtPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      costPrice: formData.cost ? parseFloat(formData.cost) : null,

      // Shipping
      weight: parseFloat(formData.weight) || 0,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      requiresShipping: formData.isShipEnabled,

      // Inventory
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      trackQuantity: formData.manageInventory === 'track',

      // IDs - Only include if valid GUIDs
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
      ...(manufacturerId && { manufacturerId }),

      // Availability dates - properly formatted
      availableStartDate: formData.availableStartDate ? 
        new Date(formData.availableStartDate).toISOString() : null,
      availableEndDate: formData.availableEndDate ? 
        new Date(formData.availableEndDate).toISOString() : null,

      // Status and visibility
      isPublished: isDraft ? false : formData.published,
      status: isDraft ? 1 : (formData.published ? 2 : 1),
      visibleIndividually: formData.visibleIndividually,
      showOnHomepage: formData.showOnHomepage || false,

      // SEO - only non-empty values
      metaTitle: formData.metaTitle?.trim() || null,
      metaDescription: formData.metaDescription?.trim() || null,
      metaKeywords: formData.metaKeywords?.trim() || null,
      searchEngineFriendlyPageName: formData.searchEngineFriendlyPageName?.trim() || null,

      // Additional fields
      manufacturer: formData.manufacturer?.trim() || null,
      vendor: formData.manufacturer?.trim() || null,
      tags: formData.productTags?.trim() || null,
      
      // Related products - comma separated
      relatedProductIds: Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0 ? 
        formData.relatedProducts.join(',') : null,
      crossSellProductIds: Array.isArray(formData.crossSellProducts) && formData.crossSellProducts.length > 0 ? 
        formData.crossSellProducts.join(',') : null,

      // Video URLs - comma separated
      videoUrls: formData.videoUrls && formData.videoUrls.length > 0 ? 
        formData.videoUrls.join(',') : null,
    };

    // Clean up null values (remove them completely)
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );

    console.log('📦 Clean product data:', cleanProductData);
    console.log('📋 Category ID:', categoryId);
    console.log('🏷️ Brand ID:', brandId);
    console.log('🏭 Manufacturer ID:', manufacturerId);

    // STEP 1: Create Product First
    let response;
    const endpoints = ['/api/Products', '/Products', '/api/Product'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying POST ${endpoint}...`);
        response = await apiClient.post(endpoint, cleanProductData);
        console.log(`✅ Success with ${endpoint}`);
        break; // Exit loop if successful
      } catch (error: any) {
        console.log(`❌ Failed with ${endpoint}:`, error.response?.status);
        if (endpoints.indexOf(endpoint) === endpoints.length - 1) {
          // If this is the last endpoint, throw the error
          throw error;
        }
        // Continue to next endpoint
      }
    }

    // Dismiss loading toast
    toast.dismiss(loadingId);

    // Handle successful response and get product ID
    if (response && response.data) {
      console.log('✅ Product created successfully:', response.data);
      
      // STEP 2: Get Product ID from response
      let productId = null;
      if (response.data.data && response.data.data.id) {
        productId = response.data.data.id;
      } else if (response.data.id) {
        productId = response.data.id;
      }

      console.log('📦 Created Product ID:', productId);

      // STEP 3: Upload Images if product ID exists and images are available
      if (productId && formData.productImages && formData.productImages.length > 0) {
        toast.info('Uploading product images...', { autoClose: 0 });
        
        try {
          await uploadImagesToProduct(productId, formData.productImages);
          toast.success('Product and images uploaded successfully! 🎉');
        } catch (imageError) {
          console.error('❌ Error uploading images:', imageError);
          toast.warning('Product created successfully, but some images failed to upload.');
        }
      } else {
        // Success toast for product only
        if (isDraft) {
          toast.success(
            <div>
              <div className="font-semibold">Product saved as draft! 📝</div>
              <div className="text-sm opacity-80 mt-1">
                "{formData.name}" has been saved
              </div>
            </div>,
            { autoClose: 4000 }
          );
        } else {
          toast.success(
            <div>
              <div className="font-semibold">Product created successfully! 🎉</div>
              <div className="text-sm opacity-80 mt-1">
                "{formData.name}" is now available
              </div>
            </div>,
            { autoClose: 4000 }
          );
        }
      }
      
      // Redirect to products list
      router.push('/admin/products');
    } else {
      throw new Error('No response received from server');
    }

  } catch (error: any) {
    console.error('❌ Error submitting form:', error);
    
    // Detailed error handling with toast notifications
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
        toast.warning(
          <div>
            <div className="font-semibold">Validation Errors</div>
            <div className="text-xs mt-1 whitespace-pre-line">
              {errorMessage}
            </div>
          </div>,
          { autoClose: 8000 }
        );
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

  const addAttribute = () => {
    const newAttribute = {
      id: Date.now().toString(),
      name: '',
      values: ['']
    };
    setAttributes([...attributes, newAttribute]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter(attr => attr.id !== id));
  };

  const updateAttributeName = (id: string, name: string) => {
    setAttributes(attributes.map(attr =>
      attr.id === id ? { ...attr, name } : attr
    ));
  };

  const updateAttributeValue = (attrId: string, valueIndex: number, value: string) => {
    setAttributes(attributes.map(attr => {
      if (attr.id === attrId) {
        const newValues = [...attr.values];
        newValues[valueIndex] = value;
        return { ...attr, values: newValues };
      }
      return attr;
    }));
  };

  const addAttributeValue = (attrId: string) => {
    setAttributes(attributes.map(attr => {
      if (attr.id === attrId) {
        return { ...attr, values: [...attr.values, ''] };
      }
      return attr;
    }));
  };

  const removeAttributeValue = (attrId: string, valueIndex: number) => {
    setAttributes(attributes.map(attr => {
      if (attr.id === attrId) {
        return { ...attr, values: attr.values.filter((_, idx) => idx !== valueIndex) };
      }
      return attr;
    }));
  };

// Updated handleImageUpload - Store image files properly for later upload
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (formData.productImages.length + files.length > 10) {
    toast.error(`Maximum 10 images allowed. You can add ${10 - formData.productImages.length} more.`);
    return;
  }

  setUploadingImages(true);
  
  try {
    const processedImages = Array.from(files).map((file, index) => {
      // File validation
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB.`);
        return null;
      }

      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file.`);
        return null;
      }

      // Create blob URL for preview
      const imageUrl = URL.createObjectURL(file);

      // Return image object with file stored
      return {
        id: `temp-${Date.now()}-${index}`,
        imageUrl: imageUrl, // Temporary blob URL for preview
        altText: file.name.replace(/\.[^/.]+$/, ""),
        sortOrder: formData.productImages.length + index + 1,
        isMain: formData.productImages.length === 0 && index === 0,
        fileName: file.name,
        fileSize: file.size,
        file: file, // IMPORTANT: Store the actual file for later upload
      };
    });

    const validImages = processedImages.filter(img => img !== null);

    if (validImages.length > 0) {
      setFormData(prev => ({
        ...prev,
        productImages: [...prev.productImages, ...validImages]
      }));

      toast.success(`${validImages.length} images ready for upload! 📸`);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error('Failed to process images. Please try again.');
  } finally {
    setUploadingImages(false);
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
                  <TabsTrigger value="attributes" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-violet-400 border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:text-violet-400 data-[state=active]:bg-slate-800/50 whitespace-nowrap transition-all rounded-t-lg">
                    <Tag className="h-4 w-4" />
                    Attributes
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
    <label className="block text-sm font-medium text-slate-300 mb-2">Manufacturer</label>
    <select
      name="manufacturerId"
      value={formData.manufacturerId}
      onChange={handleChange}
      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
    >
      <option value="">Select manufacturer</option>
      {dropdownsData.manufacturers.map((manufacturer) => (
        <option key={manufacturer.id} value={manufacturer.id}>
          {manufacturer.name}
        </option>
      ))}
    </select>
    <p className="text-xs text-slate-400 mt-1">
      {dropdownsData.manufacturers.length} manufacturers loaded
    </p>
  </div>

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
                          <label className="block text-sm font-medium text-slate-300 mb-2">Notify Admin for Quantity Below</label>
                          <input
                            type="number"
                            name="notifyAdminForQuantityBelow"
                            value={formData.notifyAdminForQuantityBelow}
                            onChange={handleChange}
                            placeholder="1"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          />
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

              {/* Attributes Tab */}
              <TabsContent value="attributes" className="space-y-2 mt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Product Attributes</h3>
                      <p className="text-sm text-slate-400">
                        Add attributes like size, color, material to create product variations
                      </p>
                    </div>
                    <button
                      onClick={addAttribute}
                      className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm flex items-center gap-2"
                    >
                      <Tag className="h-4 w-4" />
                      Add Attribute
                    </button>
                  </div>

                  {attributes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                      <Package className="mx-auto h-16 w-16 text-slate-600 mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Attributes Yet</h3>
                      <p className="text-slate-400 mb-4">
                        Click "Add Attribute" to create product variations
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {attributes.map((attribute, attrIdx) => (
                        <div key={attribute.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                  Attribute Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={attribute.name}
                                  onChange={(e) => updateAttributeName(attribute.id, e.target.value)}
                                  placeholder="e.g., Size, Color, Material"
                                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                />
                              </div>
                              <button
                                onClick={() => removeAttribute(attribute.id)}
                                className="mt-7 p-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Values</label>
                              <div className="space-y-2">
                                {attribute.values.map((value, valueIdx) => (
                                  <div key={valueIdx} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => updateAttributeValue(attribute.id, valueIdx, e.target.value)}
                                      placeholder="e.g., Small, Red, Cotton"
                                      className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    />
                                    {attribute.values.length > 1 && (
                                      <button
                                        onClick={() => removeAttributeValue(attribute.id, valueIdx)}
                                        className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 rounded-lg transition-all"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  onClick={() => addAttributeValue(attribute.id)}
                                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm"
                                >
                                  + Add Value
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info Box */}
                  {formData.productType === 'grouped' && attributes.length > 0 && (
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-violet-400 mb-2">Product Variations</h4>
                      <p className="text-sm text-slate-300">
                        With the attributes you've added, you can create {
                          attributes.reduce((acc, attr) => acc * attr.values.filter(v => v).length, 1)
                        } product variations. Each variation will have its own price, SKU, and inventory.
                      </p>
                    </div>
                  )}
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

    
{/* Pictures Tab - केवल Upload functionality */}
<TabsContent value="pictures" className="space-y-2 mt-2">
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white">Product Images</h3>
        <p className="text-sm text-slate-400">Upload product images</p>
      </div>
      <div className="text-sm text-slate-400">
        {formData.productImages.length} / 10 images
      </div>
    </div>

    {/* Upload Area */}
    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 bg-slate-800/20 hover:border-violet-500/50 transition-all">
      <div className="text-center">
        <Upload className={`mx-auto h-16 w-16 text-slate-500 mb-4 ${uploadingImages ? 'animate-pulse' : ''}`} />
        <h3 className="text-lg font-semibold text-white mb-2">
          {uploadingImages ? 'Uploading Images...' : 'Upload Product Images'}
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Click to browse and upload multiple images
        </p>
        
        {/* Progress Bars */}
        {Object.keys(imageUploadProgress).length > 0 && (
          <div className="mb-4 space-y-2">
            {Object.entries(imageUploadProgress).map(([uploadId, progress]) => (
              <div key={uploadId} className="bg-slate-800/50 rounded-lg p-2">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          disabled={uploadingImages || formData.productImages.length >= 10}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImages || formData.productImages.length >= 10}
          className="px-6 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium disabled:opacity-50"
        >
          {uploadingImages ? 'Uploading...' : 'Choose Images'}
        </button>
        
        <p className="text-xs text-slate-400 mt-3">
          JPG, PNG, WebP • Max 5MB each • Up to 10 images
        </p>
      </div>
    </div>

    {/* Simple Image List */}
    {formData.productImages.length > 0 ? (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-300">
          Uploaded Images ({formData.productImages.length})
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {formData.productImages.map((image) => (
            <div key={image.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-2">
              <div className="aspect-square bg-slate-700/50 rounded-md flex items-center justify-center overflow-hidden mb-2">
                {image.imageUrl ? (
                  <img 
                    src={image.imageUrl} 
                    alt={image.altText} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Image className="h-8 w-8 text-slate-500" />
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {image.fileName || 'Image'}
              </p>
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
            </Tabs>
          </div>
        </div>
      </div>

    </div>
  );
}
