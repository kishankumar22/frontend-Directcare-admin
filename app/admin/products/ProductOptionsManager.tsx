'use client';

import { useState } from 'react';
import { Plus, X, Settings, AlertTriangle } from 'lucide-react';
import { ProductOption } from '@/lib/services';
import { useToast } from '@/app/admin/_components/CustomToast';
import ConfirmDialog from '../_components/ConfirmDialog';


interface ProductOptionsManagerProps {
  options: ProductOption[];
  onOptionsChange: (options: ProductOption[]) => void;
  maxOptions?: number;
  disabled?: boolean;
}

export default function ProductOptionsManager({
  options,
  onOptionsChange,
  maxOptions = 3,
  disabled = false,
}: ProductOptionsManagerProps) {
  const toast = useToast();
  
  // ✅ Track raw input for each option
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  
  // ✅ DELETE MODAL STATE
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    optionId: string | null;
    optionName: string | null;
  }>({
    isOpen: false,
    optionId: null,
    optionName: null,
  });

  // Add new option
  const addOption = () => {
    if (options.length >= maxOptions) {
      toast.warning(`Maximum ${maxOptions} options allowed`);
      return;
    }

    const newOption: ProductOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: '',
      values: [],
      displayType: 'dropdown',
      position: options.length + 1,
      isActive: true,
    };

    onOptionsChange([...options, newOption]);
  };

  // Update option field
  const updateOption = (id: string, field: keyof ProductOption, value: any) => {
    onOptionsChange(
      options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  // ✅ Handle input change - allow free typing
  const handleInputChange = (id: string, inputText: string) => {
    // Store raw input
    setInputValues((prev) => ({ ...prev, [id]: inputText }));
    
    // Parse values from input (support both comma and space)
    const normalized = inputText.replace(/\s+/g, ',').replace(/,+/g, ',');
    const values = normalized
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    
    updateOption(id, 'values', values);
  };

  // ✅ Get display value for input
  const getInputValue = (option: ProductOption): string => {
    // If user is actively typing, show their raw input
    if (inputValues[option.id] !== undefined) {
      return inputValues[option.id];
    }
    // Otherwise show the stored values joined with comma-space
    return option.values.join(', ');
  };

  // ✅ Open delete modal
  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      optionId: id,
      optionName: name,
    });
  };

  // ✅ Confirm delete
  const confirmDelete = () => {
    if (deleteModal.optionId) {
      onOptionsChange(options.filter((opt) => opt.id !== deleteModal.optionId));
      // Clean up input state
      setInputValues((prev) => {
        const newState = { ...prev };
        delete newState[deleteModal.optionId!];
        return newState;
      });
      toast.success('Option deleted successfully');
    }
  };

  // ✅ Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, optionId: null, optionName: null });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-violet-400" />
            Product Options
          </h3>
          <p className="text-sm text-slate-400">
            Define selectable options like Color, Size, Material (max {maxOptions} options)
          </p>
        </div>
        {options.length < maxOptions && (
          <button
            type="button"
            onClick={addOption}
            disabled={disabled}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Option
          </button>
        )}
      </div>

      {/* Options List */}
      {options.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-600 rounded-lg p-6 text-center">
          <Settings className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-3">
            No options defined yet. Add options like Color, Size to create variants.
          </p>
          <button
            type="button"
            onClick={addOption}
            disabled={disabled}
            className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium rounded-lg transition-colors border border-violet-500/30 disabled:opacity-50"
          >
            + Add First Option (e.g., Color)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div
              key={option.id}
              className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
            >
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Option Name */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Option {index + 1} Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={option.name}
                    onChange={(e) => updateOption(option.id, 'name', e.target.value)}
                    placeholder="e.g., Color, Size"
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  />
                </div>

                {/* Option Values */}
                <div className="col-span-5 relative group">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Values <span className="text-red-500">*</span>
                    <span className="text-slate-500 font-normal ml-1">
                      (comma or space separated)
                    </span>
                  </label>

                  <input
                    type="text"
                    value={getInputValue(option)}
                    onChange={(e) => handleInputChange(option.id, e.target.value)}
                    onBlur={() => {
                      setInputValues((prev) => {
                        const newState = { ...prev };
                        delete newState[option.id];
                        return newState;
                      });
                    }}
                    placeholder="e.g., Red Blue Green or Red, Blue, Green"
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  />

                  {option.values.length > 0 && (
                    <div
                      className="
                        absolute left-0 top-full mt-2 z-50 hidden group-hover:flex flex-wrap gap-1 max-w-full bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl transition-all duration-150 ease-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                      "
                    >
                      {option.values.map((val, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded border border-violet-500/30 whitespace-nowrap"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Display Type */}
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Display Type
                  </label>
                  <select
                    value={option.displayType}
                    onChange={(e) =>
                      updateOption(option.id, 'displayType', e.target.value)
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  >
                    <option value="dropdown">Dropdown</option>
                    <option value="buttons">Buttons</option>
                    <option value="swatch">Color Swatch</option>
                  </select>
                </div>

                {/* Delete Button */}
                <div className="col-span-1 flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={() => openDeleteModal(option.id, option.name || `Option ${index + 1}`)}
                    disabled={disabled}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove option"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Option?"
        message={`Are you sure you want to delete "${deleteModal.optionName}"? This will affect all variants using this option. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon={AlertTriangle}
        iconColor="text-red-400"
        confirmButtonStyle="bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-500/50"
      />
    </>
  );
}
