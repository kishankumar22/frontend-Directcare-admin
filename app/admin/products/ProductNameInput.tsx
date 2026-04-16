'use client';

import { productsService } from '@/lib/services';
import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onErrorChange?: (hasError: boolean) => void;
  productId?: string;
}

export default function ProductNameInput({
  value,
  onChange,
  onErrorChange,
  productId
}: Props) {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onErrorChange?.(!!error);
  }, [error]);

  const checkName = async (name: string) => {
    if (!name || name.length < 3) return;

    try {
      setChecking(true);

      const res = await productsService.getAll({
        searchTerm: name.trim()
      });

      const items = res.data?.data?.items ?? [];

      const exists = items.some(
        (p: any) =>
          p.name?.toLowerCase().trim() === name.toLowerCase().trim() &&
          p.id !== productId
      );

      setError(exists ? 'Product name already exists' : '');

    } catch (err) {
      console.warn(err);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (val: string) => {
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => {
        checkName(val);
      }, 300); // ⬅ faster response
    } else {
      setError('');
    }
  };

  return (
    <div>
      {/* 🔥 RED STAR FIX */}
      <label className="block text-sm text-slate-300 mb-2">
        Product Name <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full px-3 py-2 pr-10 rounded-xl bg-slate-800 border text-white ${
            error ? 'border-red-500' : 'border-slate-700'
          }`}
        />

        {/* 🔥 LOADER / STATUS ICON */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
          {checking && (
            <span className="text-yellow-400 animate-pulse">...</span>
          )}

          {!checking && error && (
            <span className="text-red-500">❌</span>
          )}

          {!checking && !error && value.length >= 3 && (
            <span className="text-green-500">✔</span>
          )}
        </div>
      </div>

      {/* ERROR */}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {/* SUCCESS */}
      {!error && value.length >= 3 && !checking && (
        <p className="text-green-400 text-xs mt-1">
          Name is available
        </p>
      )}
    </div>
  );
}