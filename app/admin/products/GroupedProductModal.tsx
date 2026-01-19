// GroupedProductModal.tsx - ⭐ PROFESSIONAL INDUSTRY-LEVEL CODE ⭐
import { SimpleProduct } from '@/lib/services';
import { X, Package, Gift, TrendingDown, DollarSign, Calculator, ShoppingBag, AlertCircle } from 'lucide-react';
import Select from 'react-select';
import { useState, useEffect } from 'react';

interface GroupedProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  simpleProducts: SimpleProduct[];
  selectedGroupedProducts: string[];
  automaticallyAddProducts: boolean;
  
  mainProductPrice?: number;
  mainProductName?: string;
  
  bundleDiscountType?: 'None' | 'Percentage' | 'FixedAmount' | 'SpecialPrice';
  bundleDiscountPercentage?: number;
  bundleDiscountAmount?: number;
  bundleSpecialPrice?: number;
  bundleSavingsMessage?: string;
  showIndividualPrices?: boolean;
  applyDiscountToAllItems?: boolean;
  
  onProductsChange: (selectedOptions: any) => void;
  onAutoAddChange: (checked: boolean) => void;
  
  onBundleDiscountChange: (discount: {
    type: 'None' | 'Percentage' | 'FixedAmount' | 'SpecialPrice';
    percentage?: number;
    amount?: number;
    specialPrice?: number;
    savingsMessage?: string;
  }) => void;
  
  onDisplaySettingsChange: (settings: {
    showIndividualPrices: boolean;
    applyDiscountToAllItems: boolean;
  }) => void;
}

interface ProductOption {
  value: string;
  label: string;
  data: SimpleProduct;
  fullName: string;
}

export const GroupedProductModal = ({
  isOpen,
  onClose,
  simpleProducts,
  selectedGroupedProducts,
  automaticallyAddProducts,
  mainProductPrice = 0,
  mainProductName = 'Main Product',
  bundleDiscountType = 'None',
  bundleDiscountPercentage = 0,
  bundleDiscountAmount = 0,
  bundleSpecialPrice = 0,
  bundleSavingsMessage = '',
  showIndividualPrices = true,
  applyDiscountToAllItems = false,
  onProductsChange,
  onAutoAddChange,
  onBundleDiscountChange,
  onDisplaySettingsChange
}: GroupedProductModalProps) => {
  const [localDiscountType, setLocalDiscountType] = useState(bundleDiscountType);
  const [localPercentage, setLocalPercentage] = useState(bundleDiscountPercentage);
  const [localAmount, setLocalAmount] = useState(bundleDiscountAmount);
  const [localSpecialPrice, setLocalSpecialPrice] = useState(bundleSpecialPrice);
  const [localMessage, setLocalMessage] = useState(bundleSavingsMessage);
  const [localShowPrices, setLocalShowPrices] = useState(showIndividualPrices);
  const [localApplyToAll, setLocalApplyToAll] = useState(applyDiscountToAllItems);

  // ⭐⭐⭐ VALIDATION ERRORS STATE ⭐⭐⭐
  const [errors, setErrors] = useState({
    percentage: '',
    amount: '',
    specialPrice: ''
  });

  useEffect(() => {
    setLocalDiscountType(bundleDiscountType);
    setLocalPercentage(bundleDiscountPercentage);
    setLocalAmount(bundleDiscountAmount);
    setLocalSpecialPrice(bundleSpecialPrice);
    setLocalMessage(bundleSavingsMessage);
    setLocalShowPrices(showIndividualPrices);
    setLocalApplyToAll(applyDiscountToAllItems);
  }, [bundleDiscountType, bundleDiscountPercentage, bundleDiscountAmount, bundleSpecialPrice, bundleSavingsMessage, showIndividualPrices, applyDiscountToAllItems]);

  // ⭐⭐⭐ CALCULATE BUNDLE PRICE ⭐⭐⭐
  const calculateBundlePrice = () => {
    const selectedProducts = simpleProducts.filter(p => 
      selectedGroupedProducts.includes(p.id)
    );
    
    const bundleItemsTotal = selectedProducts.reduce((sum, p) => 
      sum + parseFloat(p.price.toString()), 0
    );
    
    let discount = 0;
    let finalBundlePrice = bundleItemsTotal;
    
    // ✅ DISCOUNT ONLY ON BUNDLE ITEMS (NOT MAIN PRODUCT)
    if (localDiscountType === 'Percentage' && localPercentage > 0) {
      discount = (bundleItemsTotal * localPercentage) / 100;
      finalBundlePrice = bundleItemsTotal - discount;
    } else if (localDiscountType === 'FixedAmount' && localAmount > 0) {
      discount = localAmount;
      finalBundlePrice = Math.max(0, bundleItemsTotal - localAmount);
    } else if (localDiscountType === 'SpecialPrice' && localSpecialPrice > 0) {
      discount = Math.max(0, bundleItemsTotal - localSpecialPrice);
      finalBundlePrice = localSpecialPrice;
    }
    
    // Final = (Bundle Items - Discount) + Main Product
    const totalWithMainProduct = finalBundlePrice + mainProductPrice;
    
    return { 
      mainProductPrice,
      bundleItemsTotal,
      discount,
      finalBundlePrice,
      totalWithMainProduct,
      savingsPercentage: bundleItemsTotal > 0 ? ((discount / bundleItemsTotal) * 100) : 0,
      selectedProducts
    };
  };

  const priceData = calculateBundlePrice();

  // ⭐⭐⭐ REAL-TIME VALIDATION WITH MANDATORY VALUE CHECK ⭐⭐⭐
  const validateInputs = () => {
    const newErrors = {
      percentage: '',
      amount: '',
      specialPrice: ''
    };

    if (localDiscountType === 'Percentage') {
      // ✅ MUST ENTER VALUE
      if (!localPercentage || localPercentage === 0) {
        newErrors.percentage = 'Please enter a percentage value';
      } else if (localPercentage < 0) {
        newErrors.percentage = 'Percentage cannot be negative';
      } else if (localPercentage > 100) {
        newErrors.percentage = 'Percentage cannot exceed 100%';
      }
    }

    if (localDiscountType === 'FixedAmount') {
      // ✅ MUST ENTER VALUE
      if (!localAmount || localAmount === 0) {
        newErrors.amount = 'Please enter a discount amount';
      } else if (localAmount < 0) {
        newErrors.amount = 'Amount cannot be negative';
      } else if (localAmount > priceData.bundleItemsTotal) {
        newErrors.amount = `Cannot exceed bundle total (£${priceData.bundleItemsTotal.toFixed(2)})`;
      }
    }

    if (localDiscountType === 'SpecialPrice') {
      // ✅ MUST ENTER VALUE
      if (!localSpecialPrice || localSpecialPrice === 0) {
        newErrors.specialPrice = 'Please enter a special price';
      } else if (localSpecialPrice < 0) {
        newErrors.specialPrice = 'Price cannot be negative';
      } else if (localSpecialPrice >= priceData.bundleItemsTotal) {
        newErrors.specialPrice = `Must be less than original (£${priceData.bundleItemsTotal.toFixed(2)})`;
      }
    }

    setErrors(newErrors);
    return !newErrors.percentage && !newErrors.amount && !newErrors.specialPrice;
  };

  // Run validation whenever inputs change
  useEffect(() => {
    if (selectedGroupedProducts.length > 0) {
      validateInputs();
    }
  }, [localDiscountType, localPercentage, localAmount, localSpecialPrice, selectedGroupedProducts]);

  const handleSave = () => {
    if (!validateInputs()) {
      return;
    }

    onBundleDiscountChange({
      type: localDiscountType,
      percentage: localDiscountType === 'Percentage' ? localPercentage : undefined,
      amount: localDiscountType === 'FixedAmount' ? localAmount : undefined,
      specialPrice: localDiscountType === 'SpecialPrice' ? localSpecialPrice : undefined,
      savingsMessage: localMessage
    });
    
    onDisplaySettingsChange({
      showIndividualPrices: localShowPrices,
      applyDiscountToAllItems: localApplyToAll
    });
    
    onClose();
  };

  const truncateText = (text: string, maxLength: number = 25): string => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const productOptions: ProductOption[] = simpleProducts.map(p => ({
    value: p.id,
    label: `${truncateText(p.name, 25)} (${p.sku}) - £${p.price}`,
    data: p,
    fullName: p.name
  }));

  const selectedOptions: ProductOption[] = simpleProducts
    .filter(p => selectedGroupedProducts.includes(p.id))
    .map(p => ({
      value: p.id,
      label: `${truncateText(p.name, 25)} (${p.sku}) - £${p.price}`,
      data: p,
      fullName: p.name
    }));

  const hasValidationErrors = errors.percentage || errors.amount || errors.specialPrice;
  const canSave = selectedGroupedProducts.length > 0 && !hasValidationErrors;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/10 rounded-lg">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Configure Grouped Product</h2>
              <p className="text-xs text-slate-400">Select required products and bundle pricing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Product Selection */}
<div>
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Select Required Products <span className="text-red-500">*</span>
  </label>
  
  <Select<ProductOption, true>
    isMulti
    options={productOptions}
    value={selectedOptions}
    onChange={onProductsChange}
    className="react-select-container"
    classNamePrefix="react-select"
    placeholder="Search and select products..."
    styles={{
      control: (base) => ({
        ...base,
        background: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(100, 116, 139, 0.5)',
        minHeight: '42px',
        borderRadius: '12px',
        '&:hover': { borderColor: 'rgba(139, 92, 246, 0.5)' }
      }),
      menu: (base) => ({
        ...base,
        background: 'rgb(30, 41, 59)',
        border: '1px solid rgba(100, 116, 139, 0.5)',
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 9999
      }),
      option: (base, state) => ({
        ...base,
        background: state.isFocused ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
        color: 'rgb(226, 232, 240)',
        padding: '8px 12px',
        fontSize: '13px',
        '&:hover': { background: 'rgba(139, 92, 246, 0.3)' }
      }),
      multiValue: (base) => ({
        ...base,
        background: 'rgba(139, 92, 246, 0.2)',
        borderRadius: '6px'
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: 'rgb(226, 232, 240)',
        fontSize: '13px',
        padding: '2px 6px'
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: 'rgb(226, 232, 240)',
        '&:hover': {
          background: 'rgba(239, 68, 68, 0.3)',
          color: 'rgb(248, 113, 113)'
        }
      }),
      valueContainer: (base) => ({
        ...base,
        padding: '2px 8px',
        maxHeight: '100px',
        overflowY: 'auto'
      })
    }}
    formatOptionLabel={(option) => (
      <div title={option.fullName}>{option.label}</div>
    )}
    
  />

  {/* ✅ IMPROVED MESSAGE SECTION */}
  {selectedGroupedProducts.length === 0 ? (
    <div className="mt-2 p-3 h-72 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-400">
            No products selected
          </p>
          <p className="text-xs text-amber-300/80 mt-0.5">
            Please select at least one product to create a bundle/grouped product
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="mt-2 p-2.5 bg-violet-500/10 border border-violet-500/30 rounded-lg">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-xs font-medium text-violet-300">
          Selected: <span className="text-white font-semibold">{selectedGroupedProducts.length}</span> product{selectedGroupedProducts.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )}
</div>


          {/* ⭐⭐⭐ BUNDLE DISCOUNT SETTINGS - 2 ROW GRID ⭐⭐⭐ */}
          {selectedGroupedProducts.length > 0 && (
            <div className="p-3 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-xl border border-violet-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Bundle Discount Settings</h3>
              </div>

              {/* ✅ ROW 1: Discount Type + Value Input (2 Columns) */}
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                {/* Discount Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discount Type</label>
                  <select
                    value={localDiscountType}
                    onChange={(e) => setLocalDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="None">No Bundle Discount</option>
                    <option value="Percentage">Percentage Off (%)</option>
                    <option value="FixedAmount">Fixed Amount Off (£)</option>
                    <option value="SpecialPrice">Special Bundle Price (£)</option>
                  </select>
                </div>

                {/* Dynamic Input Based on Discount Type */}
                <div>
                  {localDiscountType === 'Percentage' && (
                    <>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Discount Percentage (%) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPercentage}
                          onChange={(e) => setLocalPercentage(parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="15"
                          className={`w-full px-3 py-2 pr-9 bg-slate-900/70 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 ${
                            errors.percentage ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-violet-500'
                          }`}
                        />
                        <TrendingDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      {errors.percentage && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.percentage}
                        </p>
                      )}
                    </>
                  )}

                  {localDiscountType === 'FixedAmount' && (
                    <>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Discount Amount (£) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localAmount}
                          onChange={(e) => setLocalAmount(parseFloat(e.target.value) || 0)}
                          min="0"
                          max={priceData.bundleItemsTotal}
                          step="0.01"
                          placeholder="500"
                          className={`w-full px-3 py-2 pr-9 bg-slate-900/70 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 ${
                            errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-violet-500'
                          }`}
                        />
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      {errors.amount && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.amount}
                        </p>
                      )}
                    </>
                  )}

                  {localDiscountType === 'SpecialPrice' && (
                    <>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Bundle Special Price (£) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localSpecialPrice}
                          onChange={(e) => setLocalSpecialPrice(parseFloat(e.target.value) || 0)}
                          min="0"
                          max={priceData.bundleItemsTotal - 0.01}
                          step="0.01"
                          placeholder="2999"
                          className={`w-full px-3 py-2 pr-9 bg-slate-900/70 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 ${
                            errors.specialPrice ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-violet-500'
                          }`}
                        />
                        <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      {errors.specialPrice && (
                        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.specialPrice}
                        </p>
                      )}
                    </>
                  )}

                  {localDiscountType === 'None' && (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500 italic">
                      No discount applied
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ ROW 2: Savings Message (Full Width) */}
              {localDiscountType !== 'None' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Savings Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={localMessage}
                    onChange={(e) => setLocalMessage(e.target.value)}
                    placeholder={
                      localDiscountType === 'Percentage' && priceData.discount > 0
                        ? `Save ${localPercentage.toFixed(0)}% (£${priceData.discount.toFixed(2)}) when you buy this bundle!`
                        : localDiscountType === 'FixedAmount' && priceData.discount > 0
                        ? `Save £${priceData.discount.toFixed(2)} on this bundle pack!`
                        : localDiscountType === 'SpecialPrice' && priceData.discount > 0
                        ? `Special bundle price! Save £${priceData.discount.toFixed(2)} (${priceData.savingsPercentage.toFixed(0)}% off)`
                        : 'Enter custom savings message...'
                    }
                    maxLength={100}
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {localMessage.length}/100 characters
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Display & Cart Settings */}
          {selectedGroupedProducts.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-300 mb-2">Display & Cart Settings</h3>
              
              {/* ✅ ROW 1: 2 COLUMNS GRID */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Column 1: Display Individual Prices */}
                <label className="flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={localShowPrices}
                    onChange={(e) => setLocalShowPrices(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Display each product's price separately in the bundle
                  </span>
                </label>

                {/* Column 2: Apply Discount to All */}
                <label className="flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={localApplyToAll}
                    onChange={(e) => setLocalApplyToAll(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-200">Apply Same Discount to All Items</span>
                    <p className="text-xs text-slate-400 mt-0.5">Distribute discount across all bundle items proportionally</p>
                  </div>
                </label>
              </div>

              {/* ✅ ROW 2: FULL WIDTH */}
              <label className="flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={automaticallyAddProducts}
                  onChange={(e) => onAutoAddChange(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="text-xs font-medium text-slate-200">Automatically Add Required Products to Cart</span>
                  <p className="text-xs text-slate-400 mt-0.5">When enabled, required products will be automatically added when customer adds this product to cart</p>
                </div>
              </label>
            </div>
          )}

          {/* ⭐⭐⭐ BUNDLE PRICING PREVIEW - SAME AS ADD/EDIT PAGE ⭐⭐⭐ */}
          {selectedGroupedProducts.length > 0 && (
            <div className="mt-2 border border-slate-700 rounded-xl bg-slate-900 p-2 space-y-2">

              {/* Header */}
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-white">
                  💰 Pricing Breakdown
                </h4>
                <span className="px-2.5 py-1 bg-violet-500/20 border border-violet-500/30 rounded-lg text-xs font-medium text-violet-300">
                  📦 Bundle Preview
                </span>
              </div>

              {/* Bundle Items */}
              <div className="space-y-1 text-sm">
                <div className="text-cyan-400 font-medium">Bundle Items</div>

                {priceData.selectedProducts.map((p, i) => (
                  <div key={p.id} className="flex justify-between text-slate-300">
                    <span>{i + 1}. {p.name}</span>
                    <span className="text-white">£{parseFloat(p.price.toString()).toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-slate-700">
                  <span className="text-slate-400 font-medium">Bundle Items Subtotal</span>
                  <span className="text-cyan-400 font-medium">
                    £{priceData.bundleItemsTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Discount (Applied on Bundle Items Only) */}
              {priceData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Discount ({localDiscountType})
                  </span>
                  <span className="text-red-400 font-medium">
                    −£{priceData.discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Main Product (with + icon) */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-300">
                    <span className="text-emerald-400 font-medium">
                      {mainProductName}
                    </span>
                    <span className="ml-1 text-xs font-bold text-purple-500">
                      (Main Product)
                    </span>
                  </span>
                  <span className="text-white flex items-center gap-1">
                    <span className="text-green-400 font-bold text-sm">+</span>
                    £{priceData.mainProductPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Final Bundle Price */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                <span className="text-base font-semibold text-white">
                  Final Bundle Price (with Main Product)
                </span>
                <span className="text-xl font-bold text-green-400">
                  £{priceData.totalWithMainProduct.toFixed(2)}
                </span>
              </div>

              {/* Savings */}
              {priceData.discount > 0 && (
                <div className="text-center text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md py-1.5">
                  🎉 You Save £{priceData.discount.toFixed(2)} (
                  {priceData.savingsPercentage.toFixed(1)}% off)
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {hasValidationErrors ? 'Fix Errors to Save' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
 