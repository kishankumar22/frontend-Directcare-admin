// GroupedProductModal.tsx - Complete Industry-Level Professional Code
import { SimpleProduct } from '@/lib/services';
import { X, Package, Gift, TrendingDown, DollarSign, Calculator, ShoppingBag } from 'lucide-react';
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

  useEffect(() => {
    setLocalDiscountType(bundleDiscountType);
    setLocalPercentage(bundleDiscountPercentage);
    setLocalAmount(bundleDiscountAmount);
    setLocalSpecialPrice(bundleSpecialPrice);
    setLocalMessage(bundleSavingsMessage);
    setLocalShowPrices(showIndividualPrices);
    setLocalApplyToAll(applyDiscountToAllItems);
  }, [bundleDiscountType, bundleDiscountPercentage, bundleDiscountAmount, bundleSpecialPrice, bundleSavingsMessage, showIndividualPrices, applyDiscountToAllItems]);

  const calculateBundlePrice = () => {
    const selectedProducts = simpleProducts.filter(p => 
      selectedGroupedProducts.includes(p.id)
    );
    
    const bundleItemsTotal = selectedProducts.reduce((sum, p) => 
      sum + parseFloat(p.price.toString()), 0
    );
    
    const grandTotal = mainProductPrice + bundleItemsTotal;
    
    let finalPrice = grandTotal;
    let discount = 0;
    
    if (localDiscountType === 'Percentage' && localPercentage > 0) {
      discount = (grandTotal * localPercentage) / 100;
      finalPrice = grandTotal - discount;
    } else if (localDiscountType === 'FixedAmount' && localAmount > 0) {
      discount = localAmount;
      finalPrice = Math.max(0, grandTotal - localAmount);
    } else if (localDiscountType === 'SpecialPrice' && localSpecialPrice > 0) {
      finalPrice = localSpecialPrice;
      discount = Math.max(0, grandTotal - localSpecialPrice);
    }
    
    return { 
      mainProductPrice,
      bundleItemsTotal,
      grandTotal,
      discount,
      finalPrice,
      savingsPercentage: grandTotal > 0 ? ((discount / grandTotal) * 100) : 0,
      selectedProducts
    };
  };

  const priceData = calculateBundlePrice();

  const handleSave = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
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

            <p className="mt-1.5 text-xs text-slate-400">
              Selected: {selectedGroupedProducts.length} product(s)
            </p>
          </div>

          {/* Selected Products Display */}
          {/* {selectedGroupedProducts.length > 0 && (
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-slate-300">Selected Products:</h5>
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-md text-xs font-semibold">
                  {selectedGroupedProducts.length} {selectedGroupedProducts.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              
              <div className="space-y-1.5">
                {selectedGroupedProducts.map((productId, index) => {
                  const product = simpleProducts.find(p => p.id === productId);
                  return product ? (
                    <div key={productId} className="flex items-center gap-2 p-2.5 bg-slate-900/50 rounded-lg hover:bg-slate-800/70 transition-colors">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-violet-500/20 text-violet-400 rounded-md text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="text-white font-medium">{product.name}</span>
                        <span className="text-slate-400 ml-1.5">({product.sku})</span>
                      </div>
                      <span className="flex-shrink-0 text-violet-400 font-semibold text-sm">£{product.price}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )} */}

          {/* Bundle Discount Settings */}
          {selectedGroupedProducts.length > 0 && (
            <div className="p-3 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-xl border border-violet-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Bundle Discount Settings</h3>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Discount Type</label>
                <select
                  value={localDiscountType}
                  onChange={(e) => setLocalDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="None">No Bundle Discount</option>
                  <option value="Percentage">Percentage Off (e.g., 15% off)</option>
                  <option value="FixedAmount">Fixed Amount Off (e.g., £500 off)</option>
                  <option value="SpecialPrice">Special Bundle Price (e.g., £2999 total)</option>
                </select>
              </div>

              {localDiscountType === 'Percentage' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discount Percentage (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPercentage}
                      onChange={(e) => setLocalPercentage(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="15"
                      className="w-full px-3 py-2 pr-9 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <TrendingDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}

              {localDiscountType === 'FixedAmount' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Discount Amount (£)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localAmount}
                      onChange={(e) => setLocalAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="500"
                      className="w-full px-3 py-2 pr-9 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}

              {localDiscountType === 'SpecialPrice' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Bundle Special Price (£)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localSpecialPrice}
                      onChange={(e) => setLocalSpecialPrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="2999"
                      className="w-full px-3 py-2 pr-9 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}

              {localDiscountType !== 'None' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Savings Message (Optional)</label>
                  <input
                    type="text"
                    value={localMessage}
                    onChange={(e) => setLocalMessage(e.target.value)}
                    placeholder="Save 15% when you buy this bundle!"
                    className="w-full px-3 py-2 bg-slate-900/70 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Display & Cart Settings */}
          {selectedGroupedProducts.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-300 mb-2">Display & Cart Settings</h3>
              
              <label className="flex items-start gap-2 p-2.5 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
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

              <label className="flex items-start gap-2 p-2.5 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
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

              <label className="flex items-start gap-2 p-2.5 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
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

          {/* ⭐⭐⭐ INDUSTRY-LEVEL PROFESSIONAL BUNDLE PRICING PREVIEW ⭐⭐⭐ */}
          {selectedGroupedProducts.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-cyan-500/5 via-violet-500/5 to-green-500/5 rounded-xl border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Bundle Pricing Preview</h3>
              </div>

              <div className="space-y-3">
                {/* Main Product Section */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Main Product</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white font-medium">{mainProductName}</span>
                    <span className="text-base font-bold text-cyan-400">£{priceData.mainProductPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bundle Items Section */}
                {priceData.selectedProducts.length > 0 && (
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Bundle Items</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs font-semibold">
                        {priceData.selectedProducts.length} items
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 mb-2">
                      {priceData.selectedProducts.map((product, index) => (
                        <div key={product.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">
                            <span className="text-violet-400 font-semibold">{index + 1}.</span> {product.name}
                          </span>
                          <span className="text-slate-300 font-medium">£{parseFloat(product.price.toString()).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                      <span className="text-xs text-slate-400">Bundle Items Total:</span>
                      <span className="text-sm font-bold text-violet-400">£{priceData.bundleItemsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* ⭐⭐⭐ PROFESSIONAL CALCULATION BREAKDOWN ⭐⭐⭐ */}
                <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg border-2 border-slate-700">
                  <div className="space-y-3">
                    
                    {/* Step-by-Step Calculation */}
                    <div className="space-y-2.5">
                      {/* Main Product Row */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                          <span className="text-sm text-slate-200">{mainProductName}</span>
                        </div>
                        <span className="font-semibold text-cyan-400 text-sm">£{priceData.mainProductPrice.toFixed(2)}</span>
                      </div>
                      
                      {/* Bundle Items Row with + sign */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                          <span className="text-sm text-slate-200">Bundle Items Total</span>
                        </div>
                        <span className="font-semibold text-violet-400 text-sm">+£{priceData.bundleItemsTotal.toFixed(2)}</span>
                      </div>
                      
                      {/* Divider */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-dashed border-slate-600"></div>
                        </div>
                      </div>
                      
                      {/* Subtotal Row */}
                      <div className="flex items-center justify-between p-3 bg-slate-700/40 rounded-lg">
                        <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                          <span className="text-slate-400 text-base">=</span>
                          Subtotal:
                        </span>
                        <span className="font-bold text-white text-lg">£{priceData.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Discount Section */}
                    {priceData.discount > 0 && (
                      <>
                        <div className="border-t-2 border-slate-600 pt-3 mt-3"></div>
                        
                        <div className="flex justify-between items-center p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                          <span className="text-sm text-red-400 flex items-center gap-1.5">
                            <TrendingDown className="w-4 h-4" />
                            <span className="font-medium">Bundle Discount ({localDiscountType}):</span>
                          </span>
                          <span className="font-bold text-red-400 text-sm">-£{priceData.discount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Final Price Section */}
                    <div className="border-t-2 border-slate-600 pt-3 mt-3">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/30">
                        <span className="text-base font-bold text-white">Final Bundle Price:</span>
                        <span className="text-3xl font-bold text-green-400">£{priceData.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Badge */}
                {priceData.discount > 0 && (
                  <div className="text-center p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-lg">
                    <p className="text-green-400 font-bold flex items-center justify-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <span className="text-base">Customer Saves: £{priceData.discount.toFixed(2)} ({priceData.savingsPercentage.toFixed(1)}% OFF)</span>
                    </p>
                    {localMessage && (
                      <p className="text-xs text-green-300 mt-1.5 italic">"{localMessage}"</p>
                    )}
                  </div>
                )}

                {/* Info Note */}
                <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">ℹ</span>
                  </div>
                  <p className="text-xs text-blue-300 leading-relaxed">
                    This preview shows how customers will see the bundle pricing. The main product and selected bundle items combine to create the total bundle price.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedGroupedProducts.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
