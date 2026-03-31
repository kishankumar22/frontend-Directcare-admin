'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    transactionId?: string;
    paymentMethod?: string;
    notes: string; // ✅ now required
  }) => Promise<void>;
  loading?: boolean;
  mode: 'full' | 'partial';
  amount?: number;
};

export default function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  mode,
  amount,
}: Props) {
  const [form, setForm] = useState({
    transactionId: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

  // ✅ CLEAR TITLE
  const title =
    mode === 'full'
      ? 'Mark Full Payment as Paid'
      : 'Mark Pending Amount as Paid';

  const handleSubmit = async () => {
    // ❌ VALIDATION
    if (!form.notes.trim()) {
      setError('Notes are required');
      return;
    }

    setError('');

    await onSubmit({
      transactionId: form.transactionId || undefined,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(), // ✅ required
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">

        {/* HEADER */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>

          {/* ✅ MODE BADGE */}
          <span
            className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
              mode === 'full'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {mode === 'full' ? 'FULL PAYMENT' : 'PARTIAL PAYMENT'}
          </span>

          {/* ✅ AMOUNT */}
          {mode === 'partial' && (
            <p className="text-sm text-slate-400 mt-2">
              Pending Amount: £{amount?.toFixed(2)}
            </p>
          )}
        </div>

        {/* ALERT */}
        <div className="flex items-start gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          Offline payment entry (bank transfer, cash, cheque, etc.)
        </div>

        {/* FORM */}
        <div className="space-y-3">

          {/* PAYMENT METHOD */}
          <select
            value={form.paymentMethod}
            onChange={(e) =>
              setForm({ ...form, paymentMethod: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          >
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Cheque</option>
            <option>Card (Manual)</option>
            <option>Other</option>
          </select>

          {/* TRANSACTION ID */}
          <input
            type="text"
            placeholder="Transaction ID (optional)"
            value={form.transactionId}
            onChange={(e) =>
              setForm({ ...form, transactionId: e.target.value })
            }
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          />

          {/* NOTES (REQUIRED) */}
          <textarea
            placeholder="Notes (required)"
            value={form.notes}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value })
            }
            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg text-white ${
              error ? 'border-red-500' : 'border-slate-700'
            }`}
          />

          {/* ERROR */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              mode === 'full'
                ? 'Confirm Full Payment'
                : 'Confirm Partial Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}