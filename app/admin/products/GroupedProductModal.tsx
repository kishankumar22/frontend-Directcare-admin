// GroupedProductModal.tsx - Complete with Bundle Discount
import { SimpleProduct } from '@/lib/services';
import { X, Package, Gift, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import Select from 'react-select';
import { useState, useEffect } from 'react';

interface GroupedProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  simpleProducts: SimpleProduct[];
  selectedGroupedProducts: string[];
  automaticallyAddProducts: boolean;
  
  // ✅ NEW: Bundle Discount Props
  bundleDiscountType?: 'None' | 'Percentage' | 'FixedAmount' | 'SpecialPrice';
  bundleDiscountPercentage?: number;
  bundleDiscountAmount?: number;
  bundleSpecialPrice?: number;
  bundleSavingsMessage?: string;
  showIndividualPrices?: boolean;
  applyDiscountToAllItems?: boolean;
  
  onProductsChange: (selectedOptions: any) => void;
  onAutoAddChange: (checked: boolean) => void;
  
  // ✅ NEW: Bundle Discount Callbacks
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

export const GroupedProductModal = ({
  isOpen,
  onClose,
  simpleProducts,
  selectedGroupedProducts,
  automaticallyAddProducts,
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
  // ✅ Local state for discount fields
  const [localDiscountType, setLocalDiscountType] = useState(bundleDiscountType);
  const [localPercentage, setLocalPercentage] = useState(bundleDiscountPercentage);
  const [localAmount, setLocalAmount] = useState(bundleDiscountAmount);
  const [localSpecialPrice, setLocalSpecialPrice] = useState(bundleSpecialPrice);
  const [localMessage, setLocalMessage] = useState(bundleSavingsMessage);
  const [localShowPrices, setLocalShowPrices] = useState(showIndividualPrices);
  const [localApplyToAll, setLocalApplyToAll] = useState(applyDiscountToAllItems);

  // ✅ Update local state when props change
  useEffect(() => {
    setLocalDiscountType(bundleDiscountType);
    setLocalPercentage(bundleDiscountPercentage);
    setLocalAmount(bundleDiscountAmount);
    setLocalSpecialPrice(bundleSpecialPrice);
    setLocalMessage(bundleSavingsMessage);
    setLocalShowPrices(showIndividualPrices);
    setLocalApplyToAll(applyDiscountToAllItems);
  }, [bundleDiscountType, bundleDiscountPercentage, bundleDiscountAmount, bundleSpecialPrice, bundleSavingsMessage, showIndividualPrices, applyDiscountToAllItems]);

  // ✅ Calculate bundle pricing
  const calculateBundlePrice = () => {
    const selectedProducts = simpleProducts.filter(p => 
      selectedGroupedProducts.includes(p.id)
    );
    
    const totalPrice = selectedProducts.reduce((sum, p) => 
      sum + parseFloat(p.price.toString()), 0
    );
    
    let finalPrice = totalPrice;
    let savings = 0;
    
    if (localDiscountType === 'Percentage' && localPercentage > 0) {
      savings = (totalPrice * localPercentage) / 100;
      finalPrice = totalPrice - savings;
    } else if (localDiscountType === 'FixedAmount' && localAmount > 0) {
      savings = localAmount;
      finalPrice = Math.max(0, totalPrice - localAmount);
    } else if (localDiscountType === 'SpecialPrice' && localSpecialPrice > 0) {
      finalPrice = localSpecialPrice;
      savings = Math.max(0, totalPrice - localSpecialPrice);
    }
    
    return { 
      totalPrice, 
      finalPrice, 
      savings,
      savingsPercentage: totalPrice > 0 ? ((savings / totalPrice) * 100) : 0
    };
  };

  const { totalPrice, finalPrice, savings, savingsPercentage } = calculateBundlePrice();

  // ✅ Handle save
  const handleSave = () => {
    // Update bundle discount
    onBundleDiscountChange({
      type: localDiscountType,
      percentage: localDiscountType === 'Percentage' ? localPercentage : undefined,
      amount: localDiscountType === 'FixedAmount' ? localAmount : undefined,
      specialPrice: localDiscountType === 'SpecialPrice' ? localSpecialPrice : undefined,
      savingsMessage: localMessage
    });
    
    // Update display settings
    onDisplaySettingsChange({
      showIndividualPrices: localShowPrices,
      applyDiscountToAllItems: localApplyToAll
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Package className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Configure Grouped Product</h2>
              <p className="text-sm text-slate-400 mt-1">Select required products and bundle pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 h-90 space-y-6">
          {/* 1️⃣ Product Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Select Required Products <span className="text-red-500">*</span>
            </label>
            
            <Select
              isMulti
              options={simpleProducts.map(p => ({
                value: p.id,
                label: `${p.name} (${p.sku}) - £${p.price}`,
                data: p
              }))}
              value={simpleProducts
                .filter(p => selectedGroupedProducts.includes(p.id))
                .map(p => ({
                  value: p.id,
                  label: `${p.name} (${p.sku}) - £${p.price}`,
                  data: p
                }))}
              onChange={onProductsChange}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Search and select products..."
              styles={{
                control: (base) => ({
                  ...base,
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderColor: 'rgba(100, 116, 139, 0.5)',
                  minHeight: '46px',
                  borderRadius: '12px',
                  '&:hover': {
                    borderColor: 'rgba(139, 92, 246, 0.5)'
                  }
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
                  background: state.isFocused 
                    ? 'rgba(139, 92, 246, 0.2)' 
                    : 'transparent',
                  color: 'rgb(226, 232, 240)',
                  '&:hover': {
                    background: 'rgba(139, 92, 246, 0.3)'
                  }
                }),
                multiValue: (base) => ({
                  ...base,
                  background: 'rgba(139, 92, 246, 0.2)',
                  borderRadius: '6px'
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: 'rgb(226, 232, 240)'
                }),
                multiValueRemove: (base) => ({
                  ...base,
                  color: 'rgb(226, 232, 240)',
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.3)',
                    color: 'rgb(248, 113, 113)'
                  }
                })
              }}
            />

            <p className="mt-2 text-xs text-slate-400">
              Selected: {selectedGroupedProducts.length} product(s)
            </p>
          </div>

          {/* Selected Products Display */}
          {selectedGroupedProducts.length > 0 && (
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <h5 className="text-sm font-medium text-slate-300 mb-3">Selected Products:</h5>
              <div className="space-y-2">
                {selectedGroupedProducts.map(productId => {
                  const product = simpleProducts.find(p => p.id === productId);
                  return product ? (
                    <div key={productId} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800/70 transition-colors">
                      <div className="text-sm">
                        <span className="text-white font-medium">{product.name}</span>
                        <span className="text-slate-400 ml-2">({product.sku})</span>
                      </div>
                      <span className="text-violet-400 font-medium">£{product.price}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* 2️⃣ Bundle Discount Settings */}
          {selectedGroupedProducts.length > 0 && (
            <div className="p-5 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-xl border border-violet-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-semibold text-white">Bundle Discount Settings</h3>
              </div>

              {/* Discount Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Discount Type
                </label>
                <select
                  value={localDiscountType}
                  onChange={(e) => setLocalDiscountType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="None">No Bundle Discount</option>
                  <option value="Percentage">Percentage Off (e.g., 15% off)</option>
                  <option value="FixedAmount">Fixed Amount Off (e.g., £500 off)</option>
                  <option value="SpecialPrice">Special Bundle Price (e.g., £2999 total)</option>
                </select>
              </div>

              {/* Conditional Inputs */}
              {localDiscountType === 'Percentage' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Discount Percentage (%)
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
                      className="w-full px-4 py-3 pr-10 bg-slate-900/70 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <TrendingDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}

              {localDiscountType === 'FixedAmount' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Discount Amount (£)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localAmount}
                      onChange={(e) => setLocalAmount(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="500"
                      className="w-full px-4 py-3 pr-10 bg-slate-900/70 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}

              {localDiscountType === 'SpecialPrice' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bundle Special Price (£)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localSpecialPrice}
                      onChange={(e) => setLocalSpecialPrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="2999"
                      className="w-full px-4 py-3 pr-10 bg-slate-900/70 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Savings Message */}
              {localDiscountType !== 'None' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Savings Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={localMessage}
                    onChange={(e) => setLocalMessage(e.target.value)}
                    placeholder="Save 15% when you buy this bundle!"
                    className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3️⃣ Display & Cart Settings */}
          {selectedGroupedProducts.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Display & Cart Settings</h3>
              
              <label className="flex items-start gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={localShowPrices}
                  onChange={(e) => setLocalShowPrices(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="text-sm font-medium text-slate-200">
                    Show Individual Prices
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Display each product's price separately in the bundle
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={localApplyToAll}
                  onChange={(e) => setLocalApplyToAll(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="text-sm font-medium text-slate-200">
                    Apply Discount to All Items
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Distribute discount across all bundle items proportionally
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={automaticallyAddProducts}
                  onChange={(e) => onAutoAddChange(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="text-sm font-medium text-slate-200">
                    Automatically Add Required Products to Cart
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    When enabled, required products will be automatically added when customer adds this product to cart
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* 4️⃣ Bundle Pricing Preview */}
          {selectedGroupedProducts.length > 0 && savings > 0 && (
            <div className="p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-green-400" />
                <h3 className="text-base font-semibold text-white">Bundle Pricing Preview</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-300 text-sm">
                  <span>Total Individual Price:</span>
                  <span className="font-medium">£{totalPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-red-400 text-sm">
                  <span>Bundle Discount ({localDiscountType}):</span>
                  <span className="font-medium">-£{savings.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-slate-600 my-2"></div>
                
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Final Bundle Price:</span>
                  <span className="text-green-400">£{finalPrice.toFixed(2)}</span>
                </div>
                
                <div className="text-center mt-3 p-2 bg-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm font-semibold">
                    🎉 Customer Saves: £{savings.toFixed(2)} ({savingsPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedGroupedProducts.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
