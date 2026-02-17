'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Package, ShoppingCart, X, ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  brandId?: string | null;
  brandName?: string;
  categories?: Array<{
    categoryId: string;
    categoryName: string;
    isPrimary?: boolean;
  }>;
}

interface RelatedProductsSelectorProps {
  type: 'related' | 'cross-sell';
  selectedProductIds: string[];
  availableProducts: Product[];
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onProductsChange: (productIds: string[]) => void;
}

export default function RelatedProductsSelector({
  type,
  selectedProductIds,
  availableProducts,
  brands,
  categories,
  onProductsChange
}: RelatedProductsSelectorProps) {
  const [productSearch, setProductSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const productRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Icons and colors based on type
  const config = {
    'related': {
      icon: Package,
      title: 'Related Products',
      description: 'These products will be shown on the product details page as recommended items'
    },
    'cross-sell': {
      icon: ShoppingCart,
      title: 'Cross-sell Products',
      description: 'These products will be shown in the shopping cart as additional items'
    }
  }[type];

  const Icon = config.icon;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle brand
  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Toggle category
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Toggle product
  const toggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      onProductsChange(selectedProductIds.filter(id => id !== productId));
    } else {
      onProductsChange([...selectedProductIds, productId]);
    }
  };

  // Filter brands
  const filteredBrands = useMemo(() => {
    return brands.filter(brand =>
      brand.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    return categories.filter(category =>
      category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(product => {
      // Search filter
      const matchesSearch =
        !productSearch ||
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.sku.toLowerCase().includes(productSearch.toLowerCase());

      // Brand filter
      const matchesBrand =
        selectedBrands.length === 0 ||
        (product.brandId && selectedBrands.includes(product.brandId));

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (product.categories &&
          product.categories.some(cat =>
            selectedCategories.includes(cat.categoryId)
          ));

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [availableProducts, productSearch, selectedBrands, selectedCategories]);

  // Get selected products
  const selectedProducts = selectedProductIds
    .map(id => availableProducts.find(p => p.id === id))
    .filter(Boolean) as Product[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
          {config.title}
        </h3>
        <p className="text-sm text-slate-400 mt-2">{config.description}</p>
      </div>

      {/* Main Filter Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        
        {/* Category Filter - Right */}
        <div className="lg:col-span-1" ref={categoryRef}>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            🔍 Filter by Category
          </label>
          <div className="relative">
            <input
              type="text"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              onClick={() => setShowCategoryDropdown(true)}
              placeholder="Select categories to filter products..."
              className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
            />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              {selectedCategories.length > 0 && (
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                  {selectedCategories.length}
                </span>
              )}
              <ChevronDown className="h-5 w-5 text-slate-400 pointer-events-none" />
            </div>

            {/* Category Dropdown */}
            {showCategoryDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Category List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/50 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-sm text-slate-300">{category.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      No categories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

                {/* Brand Filter - Middle */}
        <div className="lg:col-span-1" ref={brandRef}>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            🔍 Filter by Brand
          </label>
          <div className="relative">
            <input
              type="text"
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              onClick={() => setShowBrandDropdown(true)}
              placeholder="Select brands to filter products..."
              className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
            />
            <div className="absolute right-3 top-3 flex items-center gap-2">
              {selectedBrands.length > 0 && (
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                  {selectedBrands.length}
                </span>
              )}
              <ChevronDown className="h-5 w-5 text-slate-400 pointer-events-none" />
            </div>

            {/* Brand Dropdown */}
            {showBrandDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBrandDropdown(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Brand List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredBrands.length > 0 ? (
                    filteredBrands.map(brand => (
                      <label
                        key={brand.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/50 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => toggleBrand(brand.id)}
                          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-sm text-slate-300">{brand.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      No brands found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Selector - Left */}
        <div className="lg:col-span-1" ref={productRef}>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Add {config.title}
          </label>
          <div className="relative">
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              onClick={() => setShowProductDropdown(true)}
              placeholder="Search products by name or SKU..."
              className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all cursor-pointer"
            />
            <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />

            {/* Product Dropdown */}
            {showProductDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProductDropdown(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Product List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            SKU: {product.sku} • £{product.price}
                          </p>
                          {product.brandName && (
                            <p className="text-xs text-slate-500 truncate">
                              {product.brandName}
                            </p>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      No products found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Active Filters */}
      {(selectedBrands.length > 0 || selectedCategories.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
          <span className="text-xs text-slate-400 font-medium">Active Filters:</span>
          
          {selectedBrands.map(brandId => {
            const brand = brands.find(b => b.id === brandId);
            return brand ? (
              <span
                key={brandId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-lg border border-violet-500/30"
              >
                {brand.name}
                <button
                  type="button"
                  onClick={() => toggleBrand(brandId)}
                  className="hover:text-violet-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}

          {selectedCategories.map(categoryId => {
            const category = categories.find(c => c.id === categoryId);
            return category ? (
              <span
                key={categoryId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg border border-cyan-500/30"
              >
                {category.name}
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryId)}
                  className="hover:text-cyan-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedBrands([]);
              setSelectedCategories([]);
            }}
            className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-slate-300">
              Selected Products ({selectedProducts.length})
            </label>
            <button
              type="button"
              onClick={() => onProductsChange([])}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="border border-slate-700 rounded-xl p-4 space-y-2 bg-slate-800/30 max-h-64 overflow-y-auto">
            {selectedProducts.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-slate-700/50 rounded flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      SKU: {product.sku} • £{product.price}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

  
    </div>
  );
}
