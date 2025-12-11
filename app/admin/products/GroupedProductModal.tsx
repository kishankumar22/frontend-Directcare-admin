// GroupedProductModal.tsx - Shared component for both Add & Edit
import { SimpleProduct } from '@/lib/services';
import { X, Package } from 'lucide-react';
import Select from 'react-select';

interface GroupedProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  simpleProducts: SimpleProduct[];
  selectedGroupedProducts: string[];
  automaticallyAddProducts: boolean;
  onProductsChange: (selectedOptions: any) => void;
  onAutoAddChange: (checked: boolean) => void;
}

export const GroupedProductModal = ({
  isOpen,
  onClose,
  simpleProducts,
  selectedGroupedProducts,
  automaticallyAddProducts,
  onProductsChange,
  onAutoAddChange
}: GroupedProductModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Package className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Configure Grouped Product</h2>
              <p className="text-sm text-slate-400 mt-1">Select required products for this bundle</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Product Selection */}
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

          {/* Auto-add Checkbox */}
          <div className="pt-4 border-t border-slate-700">
            <label className="flex items-start gap-3 cursor-pointer">
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
            onClick={onClose}
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
