'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface MultiBrandSelectorProps {
  selectedBrands: string[];
  availableBrands: Array<{ id: string; name: string }>;
  onChange: (brands: string[]) => void;
}

export const MultiBrandSelector: React.FC<MultiBrandSelectorProps> = ({
  selectedBrands,
  availableBrands,
  onChange
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

  const handleToggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onChange(selectedBrands.filter(id => id !== brandId));
    } else {
      onChange([...selectedBrands, brandId]);
    }
  };

  const handleSetPrimary = (brandId: string) => {
    if (!selectedBrands.includes(brandId)) {
      onChange([brandId, ...selectedBrands]);
    } else {
      const otherBrands = selectedBrands.filter(id => id !== brandId);
      onChange([brandId, ...otherBrands]);
    }
  };

  const handleRemoveBrand = (brandId: string) => {
    onChange(selectedBrands.filter(id => id !== brandId));
  };

  const filteredBrands = availableBrands.filter(brand =>
    brand?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const primaryBrandId = selectedBrands[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compact Selected Brands Summary */}
      <div 
        className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:border-violet-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedBrands.length === 0 ? (
              <span className="text-sm text-slate-400">Click to select brands...</span>
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
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        index === 0 
                          ? 'bg-violet-500 text-white' 
                          : 'bg-slate-700 text-slate-300'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {index === 0 && <span className="text-[9px]">★</span>}
                      <span>{brand.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBrand(brandId)}
                        className="hover:text-red-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {selectedBrands.length > 3 && (
                  <span className="text-xs text-slate-400">
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

      {/* ✅ Dropdown - Absolute Position Overlay */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-slate-700 rounded-lg bg-slate-800/95 backdrop-blur-sm shadow-2xl z-50">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search brands..."
              className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* ✅ Fixed Height List - Max 250px */}
          <div className="max-h-[250px] overflow-y-auto">
            {filteredBrands.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-400">
                {searchTerm ? 'No brands found' : 'No brands available'}
              </div>
            ) : (
              filteredBrands.map(brand => {
                if (!brand || !brand.id || !brand.name) return null;
                
                const isSelected = selectedBrands.includes(brand.id);
                const isPrimary = primaryBrandId === brand.id;

                return (
                  <div
                    key={brand.id}
                    className={`flex items-center justify-between px-3 py-2 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors ${
                      isPrimary ? 'bg-violet-500/10' : ''
                    }`}
                  >
                    {/* Checkbox + Name */}
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
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
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-500 text-white rounded uppercase">
                          PRIMARY
                        </span>
                      )}
                    </label>

                    {/* Set Primary Button */}
                    {isSelected && !isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(brand.id)}
                        className="ml-2 px-2 py-1 text-xs bg-slate-700 hover:bg-violet-500 text-slate-300 hover:text-white rounded transition-colors"
                        title="Set as primary"
                      >
                        ★ Set Primary
                      </button>
                    )}
                    
                    {isPrimary && (
                      <div className="ml-2 px-2 py-1 text-xs bg-violet-500/20 text-violet-300 rounded">
                        ★ Primary
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ✅ Footer with helper text */}
          <div className="p-2 border-t border-slate-700 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>💡 Click outside or press Esc to close</span>
              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onChange([]);
                    setIsOpen(false);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
