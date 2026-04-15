'use client';

import { productsService } from '@/lib/services';
import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onErrorChange?: (hasError: boolean) => void; // ✅ NEW
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

  // 🔥 notify parent
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

      const exists = items.some((p: any) =>
        p.name?.toLowerCase().trim() === name.toLowerCase().trim() &&
        p.id !== productId
      );

      if (exists) {
        setError('Product name already exists');
      } else {
        setError('');
      }

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
      }, 400);
    } else {
      setError('');
    }
  };

  return (
    <div>
      <label className="block text-sm text-slate-300 mb-2">
        Product Name *
      </label>

      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-xl  bg-slate-800 border text-white ${
          error ? 'border-red-500' : 'border-slate-700'
        }`}
      />

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}