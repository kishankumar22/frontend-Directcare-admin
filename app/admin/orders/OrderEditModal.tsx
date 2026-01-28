// components/admin/orders/OrderEditModal.tsx

'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  X,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  AlertTriangle,
  Info,
  Edit3,
  ShoppingCart,
  Hash,
  Check,
  XCircle,
  Filter,
  Tag,
  Layers,
  Grid,
} from 'lucide-react';
import { useToast } from '@/components/CustomToast';
import { Order } from '@/lib/services/orders';
import Select from 'react-select';
import { brandsService } from '@/lib/services/brands';
import { categoriesService } from '@/lib/services/categories';
import productsService from '@/lib/services/products';

// ✅ Types for Order Edit
interface OrderEditOperation {
  operationType: 'AddItem' | 'UpdateQuantity' | 'RemoveItem' | 'ReplaceItem';
  orderItemId?: string;
  productId?: string;
  productVariantId?: string;
  newQuantity?: number;
  newUnitPrice?: number;
  replacementProductId?: string;
  replacementProductVariantId?: string;
}

interface OrderEditRequest {
  orderId: string;
  operations: OrderEditOperation[];
  editReason: string;
  adminNotes: string;
  recalculateTotals: boolean;
  adjustInventory: boolean;
  sendCustomerNotification: boolean;
  currentUser: string;
  ipAddress: string;
}

// ✅ Product Types from Service
interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  productType: 'Simple' | 'Grouped';
  regularPrice?: number;
  price?: number;
  salePrice?: number;
  stockQuantity: number;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  categories?: any[];
  images?: string[];
  variants?: ProductVariant[];
  isActive?: boolean;
  isPublished?: boolean;
  createdAt?: string;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  attributeValues?: string[];
}

interface Brand {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  subCategories?: Category[];
  createdAt?: string;
}

interface OrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSuccess: () => void;
}

// ✅ React Select Custom Styles
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'rgb(15 23 42 / 0.5)',
    borderColor: state.isFocused ? 'rgb(139 92 246)' : 'rgb(51 65 85)',
    borderRadius: '0.75rem',
    padding: '0.25rem',
    boxShadow: state.isFocused ? '0 0 0 2px rgb(139 92 246 / 0.5)' : 'none',
    '&:hover': {
      borderColor: 'rgb(139 92 246)',
    },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'rgb(30 41 59)',
    borderRadius: '0.75rem',
    border: '1px solid rgb(51 65 85)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgb(139 92 246)'
      : state.isFocused
      ? 'rgb(51 65 85)'
      : 'transparent',
    color: 'white',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'rgb(139 92 246)',
    },
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'white',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'rgb(148 163 184)',
  }),
  input: (base: any) => ({
    ...base,
    color: 'white',
  }),
};

export default function OrderEditModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: OrderEditModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // ✅ Filters State
  const [filters, setFilters] = useState({
    productType: null as { value: string; label: string } | null,
    brandId: null as { value: string; label: string } | null,
    categoryId: null as { value: string; label: string } | null,
  });

  // ✅ Filter Options
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // ✅ Edit Form State
  const [editData, setEditData] = useState({
    editReason: '',
    adminNotes: '',
    recalculateTotals: true,
    adjustInventory: true,
    sendCustomerNotification: true,
  });

  // ✅ Operations tracking
  const [operations, setOperations] = useState<OrderEditOperation[]>([]);
  const [editedItems, setEditedItems] = useState<Map<string, number>>(new Map());

  // ✅ Load Brands, Categories & Products on mount
  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
      loadProducts();
    }
  }, [isOpen]);

  // ✅ Recursive Category Sorting
  const sortCategoriesRecursive = (cats: Category[]): Category[] => {
    return cats
      .map((cat) => ({
        ...cat,
        subCategories:
          cat.subCategories && cat.subCategories.length > 0
            ? sortCategoriesRecursive(cat.subCategories)
            : cat.subCategories || [],
      }))
      .sort((a, b) => {
        // Active categories first
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        // Then by creation date (newest first)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  };

  // ✅ Load Filter Options using Services
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      // ✅ Fetch Brands using brandsService
      const brandsResponse = await brandsService.getAll({
        params: { includeInactive: true },
      });

      // ✅ Fixed: Access data.data instead of data.items
      const brandsData = brandsResponse?.data?.data || [];

      // ✅ Sort brands: Active first, then by creation date
      const sortedBrands = brandsData.sort((a: Brand, b: Brand) => {
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setBrands(sortedBrands);

      // ✅ Fetch Categories using categoriesService
      const categoriesResponse = await categoriesService.getAll({
        params: { includeInactive: true, includeSubCategories: true },
      });

      // ✅ Fixed: Access data.data instead of data.items
      const categoriesData = categoriesResponse?.data?.data || [];

      // ✅ Sort categories recursively
      const sortedCategories = sortCategoriesRecursive(categoriesData);

      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error loading filters:', error);
      toast.error('Failed to load filter options');
    } finally {
      setLoadingFilters(false);
    }
  };

  // ✅ Load All Products using productsService
const loadProducts = async () => {
  try {
    const productsResponse = await productsService.getAll({
      page: 1,
      pageSize: 1000,
    });

    if (productsResponse?.data?.success && productsResponse?.data?.data?.items) {
      const items = productsResponse.data.data.items;

      // ✅ Map and sort in one go
      const mappedProducts: Product[] = items
        .map((p: any) => ({
          ...p,
          slug: p.slug || '',
          sku: p.sku || '',
          productType: p.productType || 'Simple',
          regularPrice: p.regularPrice || p.price || 0,
          stockQuantity: p.stockQuantity || 0,
        }))
        .sort((a: Product, b: Product) => {
          if (a.isPublished !== b.isPublished) {
            return a.isPublished ? -1 : 1;
          }
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

      setAllProducts(mappedProducts);
    }
  } catch (error) {
    console.error('Error loading products:', error);
    toast.error('Failed to load products');
  }
};
  // ✅ Reset on modal open
  useEffect(() => {
    if (isOpen) {
      setOperations([]);
      setEditedItems(new Map());
      setEditData({
        editReason: '',
        adminNotes: '',
        recalculateTotals: true,
        adjustInventory: true,
        sendCustomerNotification: true,
      });
      setSearchQuery('');
      setSearchResults([]);
      setFilters({
        productType: null,
        brandId: null,
        categoryId: null,
      });
    }
  }, [isOpen]);

  // ✅ Helper to get primary category name
  const getPrimaryCategoryName = (categories: any[]): string => {
    if (!categories || categories.length === 0) return 'Uncategorized';
    const primary = categories.find((c) => c.isPrimary);
    return primary?.categoryName || categories[0]?.categoryName || 'Uncategorized';
  };

  // ✅ Client-side Search & Filter
  const searchProducts = (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      let filtered = allProducts.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.sku.toLowerCase().includes(query.toLowerCase());

        const matchesProductType = filters.productType
          ? product.productType === filters.productType.value
          : true;

        const matchesBrand = filters.brandId ? product.brandId === filters.brandId.value : true;

        const matchesCategory = filters.categoryId
          ? product.categories?.some((c: any) => c.categoryId === filters.categoryId?.value)
          : true;

        return matchesSearch && matchesProductType && matchesBrand && matchesCategory;
      });

      // Limit to 20 results
      filtered = filtered.slice(0, 20);

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search products');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ✅ Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters, allProducts]);

  // ✅ Update Item Quantity
  const updateItemQuantity = (itemId: string, currentQty: number, change: number) => {
    const newQty = Math.max(0, currentQty + change);

    if (newQty === 0) {
      setOperations((prev) => [
        ...prev.filter((op) => op.orderItemId !== itemId),
        {
          operationType: 'RemoveItem',
          orderItemId: itemId,
        },
      ]);
      setEditedItems((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, 0);
        return newMap;
      });
    } else {
      setOperations((prev) => [
        ...prev.filter((op) => op.orderItemId !== itemId),
        {
          operationType: 'UpdateQuantity',
          orderItemId: itemId,
          newQuantity: newQty,
        },
      ]);
      setEditedItems((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, newQty);
        return newMap;
      });
    }
  };

  // ✅ Add New Item
  const addNewItem = (product: Product, variant?: ProductVariant) => {
    const finalPrice =
      variant?.price || product.salePrice || product.price || product.regularPrice || 0;

    const operation: OrderEditOperation = {
      operationType: 'AddItem',
      productId: product.id,
      productVariantId: variant?.id,
      newQuantity: 1,
      newUnitPrice: finalPrice,
    };

    setOperations((prev) => [...prev, operation]);
    toast.success(`✅ Added ${variant?.name || product.name} to order`);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ✅ Remove Item
  const removeItem = (itemId: string) => {
    setOperations((prev) => [
      ...prev.filter((op) => op.orderItemId !== itemId),
      {
        operationType: 'RemoveItem',
        orderItemId: itemId,
      },
    ]);
    setEditedItems((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemId, 0);
      return newMap;
    });
  };

  // ✅ Submit Edit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (operations.length === 0) {
      toast.warning('⚠️ No changes made to the order');
      return;
    }

    if (!editData.editReason.trim()) {
      toast.error('Please provide a reason for editing this order');
      return;
    }

    setLoading(true);

    try {
      const editRequest: OrderEditRequest = {
        orderId: order.id,
        operations,
        editReason: editData.editReason,
        adminNotes: editData.adminNotes || '',
        recalculateTotals: editData.recalculateTotals,
        adjustInventory: editData.adjustInventory,
        sendCustomerNotification: editData.sendCustomerNotification,
        currentUser: 'Admin', // TODO: Get from auth context
        ipAddress: '0.0.0.0', // TODO: Get actual IP
      };

      const response = await fetch(`/api/orders/${order.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to edit order');
      }

      toast.success('✅ Order updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Edit order error:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calculate stats
  const getNewItemCount = () => {
    return operations.filter((op) => op.operationType === 'AddItem').length;
  };

  const getRemovedItemCount = () => {
    return operations.filter((op) => op.operationType === 'RemoveItem').length;
  };

  const getUpdatedItemCount = () => {
    return operations.filter((op) => op.operationType === 'UpdateQuantity').length;
  };

  // ✅ Clear All Filters
  const clearFilters = () => {
    setFilters({
      productType: null,
      brandId: null,
      categoryId: null,
    });
  };

  const hasActiveFilters =
    filters.productType !== null || filters.brandId !== null || filters.categoryId !== null;

  // ✅ Flatten categories for Select dropdown
  const flattenCategories = (
    cats: Category[],
    level = 0
  ): Array<{ value: string; label: string }> => {
    let result: Array<{ value: string; label: string }> = [];

    cats.forEach((cat) => {
      const prefix = '—'.repeat(level);
      result.push({
        value: cat.id,
        label: `${prefix} ${cat.name}`,
      });

      if (cat.subCategories && cat.subCategories.length > 0) {
        result = [...result, ...flattenCategories(cat.subCategories, level + 1)];
      }
    });

    return result;
  };

  // ✅ Get display price
  const getDisplayPrice = (product: Product): number => {
    return product.salePrice || product.price || product.regularPrice || 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-violet-900/20 to-purple-900/20">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-violet-400" />
              Edit Order Items
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Order #{order.orderNumber} • {order.orderItems.length} items
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* ✅ Add New Product Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-400" />
                Add New Product
              </label>

              {/* ✅ Filters Row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Product Type Filter */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <Grid className="h-3 w-3" />
                    Product Type
                  </label>
                  <Select
                    value={filters.productType}
                    onChange={(value) => setFilters({ ...filters, productType: value })}
                    options={[
                      { value: 'Simple', label: 'Simple Product' },
                      { value: 'Grouped', label: 'Grouped Product' },
                    ]}
                    isClearable
                    placeholder="All Types"
                    styles={selectStyles}
                    isDisabled={loadingFilters}
                  />
                </div>

                {/* Brand Filter */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Brand
                  </label>
                  <Select
                    value={filters.brandId}
                    onChange={(value) => setFilters({ ...filters, brandId: value })}
                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                    isClearable
                    placeholder="All Brands"
                    styles={selectStyles}
                    isLoading={loadingFilters}
                    isDisabled={loadingFilters}
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Category
                  </label>
                  <Select
                    value={filters.categoryId}
                    onChange={(value) => setFilters({ ...filters, categoryId: value })}
                    options={flattenCategories(categories)}
                    isClearable
                    placeholder="All Categories"
                    styles={selectStyles}
                    isLoading={loadingFilters}
                    isDisabled={loadingFilters}
                  />
                </div>
              </div>

              {/* Active Filters Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-violet-400">
                    <Filter className="h-3 w-3" />
                    <span>
                      {[
                        filters.productType && filters.productType.label,
                        filters.brandId && filters.brandId.label,
                        filters.categoryId && filters.categoryId.label,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name or SKU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {searchResults.map((product) => {
                    const categoryName = getPrimaryCategoryName(product.categories || []);
                    const displayPrice = getDisplayPrice(product);

                    return (
                      <div key={product.id} className="border-b border-slate-700 last:border-0">
                        <button
                          type="button"
                          onClick={() => addNewItem(product)}
                          className="w-full p-3 hover:bg-slate-700/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-slate-400">
                                  <Hash className="h-3 w-3 inline" />
                                  {product.sku}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    product.productType === 'Simple'
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  }`}
                                >
                                  {product.productType}
                                </span>
                                {product.brandName && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    <Tag className="h-3 w-3 inline mr-0.5" />
                                    {product.brandName}
                                  </span>
                                )}
                                {categoryName && categoryName !== 'Uncategorized' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                    <Layers className="h-3 w-3 inline mr-0.5" />
                                    {categoryName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-green-400 font-semibold">
                                £{displayPrice.toFixed(2)}
                              </p>
                              {product.salePrice &&
                                product.regularPrice &&
                                product.salePrice < product.regularPrice && (
                                  <p className="text-xs text-slate-400 line-through">
                                    £{product.regularPrice.toFixed(2)}
                                  </p>
                                )}
                              <p
                                className={`text-xs mt-1 ${
                                  product.stockQuantity > 0 ? 'text-slate-400' : 'text-red-400'
                                }`}
                              >
                                Stock: {product.stockQuantity}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Variants */}
                        {product.variants && product.variants.length > 0 && (
                          <div className="px-3 pb-3 space-y-1">
                            {product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => addNewItem(product, variant)}
                                className="w-full p-2 ml-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all text-left border border-slate-700"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-white text-xs font-medium">
                                      {variant.name}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      SKU: {variant.sku}
                                    </p>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-green-400 text-xs font-semibold">
                                      £{variant.price.toFixed(2)}
                                    </p>
                                    <p
                                      className={`text-xs ${
                                        variant.stockQuantity > 0
                                          ? 'text-slate-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      Stock: {variant.stockQuantity}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No Results */}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="mt-2 p-4 bg-slate-900/50 border border-slate-700 rounded-xl text-center">
                  <p className="text-sm text-slate-400">No products found</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
                    >
                      Try clearing filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Current Order Items */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-cyan-400" />
                Current Order Items
              </label>
              <div className="space-y-3">
                {order.orderItems.map((item) => {
                  const currentQty = editedItems.get(item.id) ?? item.quantity;
                  const isRemoved = currentQty === 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isRemoved
                          ? 'bg-red-500/10 border-red-500/30 opacity-50'
                          : 'bg-slate-900/50 border-slate-700 hover:border-violet-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm ${
                              isRemoved ? 'line-through text-red-400' : 'text-white'
                            }`}
                          >
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            <Hash className="h-3 w-3 inline" />
                            SKU: {item.productSku} • £{item.unitPrice.toFixed(2)} each
                          </p>
                          {item.variantName && (
                            <p className="text-xs text-cyan-400 mt-1">{item.variantName}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isRemoved && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item.id, currentQty, -1)}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                                disabled={loading}
                              >
                                <Minus className="h-4 w-4 text-white" />
                              </button>
                              <span className="w-12 text-center text-white font-semibold">
                                {currentQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(item.id, currentQty, 1)}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                                disabled={loading}
                              >
                                <Plus className="h-4 w-4 text-white" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all"
                            disabled={loading}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Show change indicator */}
                      {currentQty !== item.quantity && !isRemoved && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Quantity changed: {item.quantity} → {currentQty}
                          </p>
                        </div>
                      )}
                      {isRemoved && (
                        <div className="mt-2 pt-2 border-t border-red-500/30">
                          <p className="text-xs text-red-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            This item will be removed
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operations Summary */}
            {operations.length > 0 && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Pending Changes ({operations.length})
                </p>
                <ul className="text-xs text-blue-300 space-y-1">
                  {getNewItemCount() > 0 && (
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {getNewItemCount()} new item(s) will be added
                    </li>
                  )}
                  {getRemovedItemCount() > 0 && (
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {getRemovedItemCount()} item(s) will be removed
                    </li>
                  )}
                  {getUpdatedItemCount() > 0 && (
                    <li className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {getUpdatedItemCount()} quantity update(s)
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Edit Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Edit Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={editData.editReason}
                onChange={(e) => setEditData({ ...editData, editReason: e.target.value })}
                placeholder="Why are you editing this order? (e.g., Customer requested item change, Out of stock)"
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Admin Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Admin Notes
                <span className="text-xs text-slate-400 ml-2">(Internal only)</span>
              </label>
              <textarea
                value={editData.adminNotes}
                onChange={(e) => setEditData({ ...editData, adminNotes: e.target.value })}
                placeholder="Internal notes (not visible to customer)..."
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Options */}
            <div className="space-y-3 bg-slate-900/30 p-3 rounded-xl border border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={editData.recalculateTotals}
                  onChange={(e) =>
                    setEditData({ ...editData, recalculateTotals: e.target.checked })
                  }
                  className="rounded bg-slate-800 border-slate-600 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Recalculate order totals
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={editData.adjustInventory}
                  onChange={(e) =>
                    setEditData({ ...editData, adjustInventory: e.target.checked })
                  }
                  className="rounded bg-slate-800 border-slate-600 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Adjust inventory levels
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={editData.sendCustomerNotification}
                  onChange={(e) =>
                    setEditData({ ...editData, sendCustomerNotification: e.target.checked })
                  }
                  className="rounded bg-slate-800 border-slate-600 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  Send notification to customer
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || operations.length === 0 || !editData.editReason.trim()}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Changes ({operations.length})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
