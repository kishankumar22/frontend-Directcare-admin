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
import API_BASE_URL from "@/lib/api-config";

// API response interfaces को properly define करें
interface BrandApiResponse {
  success: boolean;
  message: string;
  data: BrandData[];
  errors: null;
}

// Add these interfaces at the top
interface ProductImage {
  id: string;
  imageUrl: string;  // This should be 'imageUrl', not 'url'
  altText: string;
  sortOrder: number;  // This should be 'sortOrder', not 'displayOrder'
  isMain: boolean;
  fileName?: string;
  fileSize?: number;
  file?: File; // For storing actual file during upload
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

interface ApiResponse<T = any> {
  data?: T;
  success?: boolean;
  message?: string;
  errors?: string[] | null;
  error?: string;
  status?: number;
  result?: T;
}

interface ProductCreateResponse {
  id: string;
  name: string;
  sku: string;
  [key: string]: any;
}

interface ProductApiResponse {
  success: boolean;
  data?: ProductCreateResponse;
  message?: string;
  errors?: string[] | null;
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
const [uploadingImages, setUploadingImages] = useState(false);

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

    // Related Products
    relatedProducts: [] as string[],
    crossSellProducts: [] as string[],

    // New fields for additional tabs
    productImages: [] as ProductImage[],  // Use proper interface
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

    // Prepare product data (same as before)
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

    let manufacturerId: string | null = null;
    if (formData.manufacturerId && formData.manufacturerId.trim()) {
      const trimmedManufacturer = formData.manufacturerId.trim();
      if (guidRegex.test(trimmedManufacturer)) {
        manufacturerId = trimmedManufacturer;
      }
    }

    const productData = {
      name: formData.name.trim(),
      description: formData.fullDescription || formData.shortDescription || formData.name || 'Product description',
      shortDescription: formData.shortDescription?.trim() || '',
      sku: formData.sku.trim(),
      gtin: formData.gtin?.trim() || null,
      manufacturerPartNumber: formData.manufacturerPartNumber?.trim() || null,
      displayOrder: parseInt(formData.displayOrder) || 1,
      adminComment: formData.adminComment?.trim() || null,
      price: parseFloat(formData.price) || 0,
      oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      compareAtPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      costPrice: formData.cost ? parseFloat(formData.cost) : null,
      weight: parseFloat(formData.weight) || 0,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      requiresShipping: formData.isShipEnabled,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      trackQuantity: formData.manageInventory === 'track',
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
      ...(manufacturerId && { manufacturerId }),
      isPublished: isDraft ? false : formData.published,
      status: isDraft ? 1 : (formData.published ? 2 : 1),
      visibleIndividually: formData.visibleIndividually,
      showOnHomepage: formData.showOnHomepage || false,
      metaTitle: formData.metaTitle?.trim() || null,
      metaDescription: formData.metaDescription?.trim() || null,
      metaKeywords: formData.metaKeywords?.trim() || null,
    };

    // Clean up null values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );

    console.log('📦 Clean product data:', cleanProductData);

    // ✅ FIXED - STEP 1: Create Product with proper typing
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

    // ✅ FIXED - Handle successful response with proper type checking
    if (response && (response.data || response.success !== false)) {
      console.log('✅ Product created successfully:', response);

      // ✅ STEP 2: Extract Product ID with proper type safety
      let productId: string | null = null;

      try {
        console.log('🔍 Full API Response:', response);
        
        // Handle different response structures with type safety
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
          // Case 5: apiClient wrapped response (response.data is the actual API response)
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

      // ✅ STEP 3: Upload Images (only if product ID exists and images are available)
      if (productId && formData.productImages && formData.productImages.length > 0) {
        console.log(`🖼️ Starting image upload for product ID: ${productId}`);
        toast.info('Uploading product images...', { autoClose: 0 });
        
        try {
          // Filter images that have file objects (newly uploaded ones)
          const imagesToUpload = formData.productImages.filter(img => img.file);
          
          if (imagesToUpload.length > 0) {
            console.log(`📷 Found ${imagesToUpload.length} images to upload`);
            
            // Call uploadImagesToProduct function
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
        } catch (imageError) {
          console.error('❌ Error uploading images:', imageError);
          toast.error('Product created successfully, but some images failed to upload.');
        }
      } else {
        // Success toast for product only
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
            </Tabs>
          </div>
        </div>
      </div>

    </div>
  );
}
