'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface MultiBrandSelectorProps {
  selectedBrands: string[]; // Array of brand IDs
  availableBrands: Brand[]; // All brands from API
  onChange: (brands: string[]) => void; // Callback when selection changes
  placeholder?: string; // Optional placeholder text
}

export const MultiBrandSelector: React.FC<MultiBrandSelectorProps> = ({
  selectedBrands,
  availableBrands,
  onChange,
  placeholder = 'Click to select brands...'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search on close
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ✅ Close on Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Toggle brand selection (add/remove)
  const handleToggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onChange(selectedBrands.filter(id => id !== brandId));
    } else {
      onChange([...selectedBrands, brandId]);
    }
  };

  // Set brand as primary (move to first position)
  const handleSetPrimary = (brandId: string) => {
    if (!selectedBrands.includes(brandId)) {
      // Add and make primary
      onChange([brandId, ...selectedBrands]);
    } else {
      // Move to first position
      const otherBrands = selectedBrands.filter(id => id !== brandId);
      onChange([brandId, ...otherBrands]);
    }
  };

  // Remove specific brand
  const handleRemoveBrand = (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedBrands.filter(id => id !== brandId));
  };

  // Filter brands based on search
  const filteredBrands = availableBrands.filter(brand =>
    brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get primary brand (first in array)
  const primaryBrandId = selectedBrands[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Brands Display */}
      <div 
        className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedBrands.length === 0 ? (
              <span className="text-sm text-slate-400">{placeholder}</span>
            ) : (
              <>
                <span className="text-xs text-slate-400 font-medium">
                  Selected ({selectedBrands.length}):
                </span>
                {selectedBrands.slice(0, 3).map((brandId, index) => {
                  const brand = availableBrands.find(b => b.id === brandId);
                  if (!brand) return null;
                  
                  return (
                    <div
                      key={brandId}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        index === 0 
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {index === 0 && <span className="text-[10px] font-bold">★</span>}
                      <span className="max-w-[120px] truncate">{brand.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveBrand(brandId, e)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {selectedBrands.length > 3 && (
                  <span className="text-xs text-slate-400 font-medium">
                    +{selectedBrands.length - 3} more
                  </span>
                )}
              </>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-slate-700 rounded-xl bg-slate-800 shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search brands..."
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Brands List - Fixed Height with Scroll */}
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
            {filteredBrands.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                {searchTerm ? (
                  <>
                    <div className="text-2xl mb-2">🔍</div>
                    <div>No brands found matching "{searchTerm}"</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-2">📦</div>
                    <div>No brands available</div>
                  </>
                )}
              </div>
            ) : (
              filteredBrands.map(brand => {
                if (!brand || !brand.id || !brand.name) return null;
                
                const isSelected = selectedBrands.includes(brand.id);
                const isPrimary = primaryBrandId === brand.id;

                return (
                  <div
                    key={brand.id}
                    className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors ${
                      isPrimary ? 'bg-violet-500/10' : ''
                    }`}
                  >
                    {/* Checkbox + Brand Name */}
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleBrand(brand.id)}
                        className="w-4 h-4 text-violet-500 bg-slate-700 border-slate-600 rounded focus:ring-violet-500 focus:ring-2 cursor-pointer"
                      />
                      <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}>
                        {brand.name}
                      </span>
                      {isPrimary && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-500 text-white rounded uppercase">
                          PRIMARY
                        </span>
                      )}
                    </label>

                    {/* Set Primary Button */}
                    {isSelected && !isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(brand.id)}
                        className="ml-2 px-3 py-1 text-xs bg-slate-700 hover:bg-violet-500 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                        title="Set as primary brand"
                      >
                        ★ Set Primary
                      </button>
                    )}
                    
                    {isPrimary && (
                      <div className="ml-2 px-3 py-1 text-xs bg-violet-500/20 text-violet-300 rounded-lg font-medium">
                        ★ Primary
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs">
              <div className="text-slate-500">
                {selectedBrands.length > 0 ? (
                  <span>
                    <span className="text-violet-400 font-medium">{selectedBrands.length}</span> brand
                    {selectedBrands.length !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>💡 Press Esc or click outside to close</span>
                )}
              </div>
              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            {selectedBrands.length > 1 && (
              <div className="text-[10px] text-slate-500 mt-1.5">
                ★ First brand is the primary brand
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
