'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Folder } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  subCategories?: Category[];
}

interface MultiCategorySelectorProps {
  selectedCategories: string[];
  availableCategories: Category[];
  onChange: (categories: string[]) => void;
  placeholder?: string;
  maxSelection?: number;
}

export const MultiCategorySelector: React.FC<MultiCategorySelectorProps> = ({
  selectedCategories,
  availableCategories,
  onChange,
  placeholder = 'Click to select categories...',
  maxSelection = 10
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
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

  // Toggle category selection
  const handleToggleCategory = (categoryId: string) => {
    console.log('🎯 Category clicked:', categoryId);
    console.log('📋 Current selected:', selectedCategories);

    if (selectedCategories.includes(categoryId)) {
      console.log('❌ Removing category');
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      if (selectedCategories.length >= maxSelection) {
        console.log('⚠️ Max limit reached');
        return;
      }
      console.log('✅ Adding category');
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleSetPrimary = (categoryId: string) => {
    if (!selectedCategories.includes(categoryId)) {
      onChange([categoryId, ...selectedCategories].slice(0, maxSelection));
    } else {
      const otherCategories = selectedCategories.filter(id => id !== categoryId);
      onChange([categoryId, ...otherCategories]);
    }
  };

  const handleRemoveCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedCategories.filter(id => id !== categoryId));
  };

  // Flatten categories for search
  const flattenCategories = (cats: Category[], level: number = 0, parentName: string = ''): Array<Category & { level: number; fullPath: string }> => {
    let result: Array<Category & { level: number; fullPath: string }> = [];
    
    cats.forEach(cat => {
      const fullPath = parentName ? `${parentName} > ${cat.name}` : cat.name;
      result.push({ ...cat, level, fullPath });
      
      if (cat.subCategories && cat.subCategories.length > 0) {
        result = result.concat(flattenCategories(cat.subCategories, level + 1, fullPath));
      }
    });
    
    return result;
  };

  const flatCategories = flattenCategories(availableCategories);

  const filteredCategories = flatCategories.filter(cat =>
    cat.fullPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const primaryCategoryId = selectedCategories[0];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Categories Display */}
      <div 
        className="p-2 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:border-violet-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedCategories.length === 0 ? (
              <span className="text-sm text-slate-400">{placeholder}</span>
            ) : (
              <>
                <span className="text-xs text-slate-400 font-sm">
                  Selected ({selectedCategories.length}/{maxSelection}):
                </span>
                {selectedCategories.slice(0, 2).map((categoryId, index) => {
                  const category = flatCategories.find(c => c.id === categoryId);
                  if (!category) return null;
                  
                  return (
                    <div
                      key={categoryId}
                      className={`flex items-center gap-1 px-1 py-1 rounded-lg text-xs font-medium ${
                        index === 0 
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {index === 0 && <span className="text-[10px] font-bold">★</span>}
                      <Folder className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">{category.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCategory(categoryId, e)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {selectedCategories.length > 2 && (
                  <span className="text-xs text-slate-400 font-medium">
                    +{selectedCategories.length - 2} more
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
              placeholder="🔍 Search categories..."
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
            <span>ℹ️</span>
            <span> First is primary.</span>
          </div>

          {/* Categories List */}
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                {searchTerm ? (
                  <>
                    <div className="text-2xl mb-2">🔍</div>
                    <div>No categories found matching "{searchTerm}"</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-2">📁</div>
                    <div>No categories available</div>
                  </>
                )}
              </div>
            ) : (
              filteredCategories.map(category => {
                if (!category || !category.id || !category.name) return null;
                
                const isSelected = selectedCategories.includes(category.id);
                const isPrimary = primaryCategoryId === category.id;
                const isDisabled = !isSelected && selectedCategories.length >= maxSelection;

                return (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-700 last:border-b-0 transition-colors ${
                      isDisabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-slate-700/50 cursor-pointer'
                    } ${isSelected ? 'bg-violet-500/10' : ''}`}
                    onClick={() => !isDisabled && handleToggleCategory(category.id)}
                    style={{ paddingLeft: `${16 + category.level * 20}px` }}
                  >
                    {/* Checkbox + Category Name */}
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        disabled={isDisabled}
                        className="w-4 h-4 text-violet-500 bg-slate-700 border-slate-600 rounded focus:ring-violet-500 focus:ring-2 pointer-events-none"
                      />
                      <Folder className={`w-4 h-4 ${isSelected ? 'text-violet-400' : 'text-slate-500'}`} />
                      <div className="flex flex-col">
                        <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}>
                          {category.name}
                        </span>
                        {category.level > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {category.fullPath}
                          </span>
                        )}
                      </div>
                      {isPrimary && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-500 text-white rounded uppercase">
                          PRIMARY
                        </span>
                      )}
                    </div>

                    {/* Set Primary Button */}
                    {isSelected && !isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(category.id);
                        }}
                        className="ml-2 px-3 py-1 text-xs bg-slate-700 hover:bg-violet-500 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                        title="Set as primary category"
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
                {selectedCategories.length > 0 ? (
                  <span>
                    <span className="text-violet-400 font-medium">{selectedCategories.length}</span> / {maxSelection} categories selected
                  </span>
                ) : (
                  <span>💡 Click categories to select (max {maxSelection})</span>
                )}
              </div>
              {selectedCategories.length > 0 && (
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
            {selectedCategories.length > 1 && (
              <div className="text-[10px] text-slate-500 mt-1.5">
                ★ First category is the primary category
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
