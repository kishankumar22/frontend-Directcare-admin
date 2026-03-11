'use client';

import { RotateCcw, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/services/orders";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  processing: boolean;
  notes: string;
  setNotes: (v: string) => void;
  shippingAmount: number;
  currency: string;
}

export default function ShippingRefundModal({
  isOpen,
  onClose,
  onConfirm,
  processing,
  notes,
  setNotes,
  shippingAmount,
  currency
}: Props) {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-cyan-900/20 to-teal-900/20">

          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <RotateCcw className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                Refund Shipping Charge
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Amount: {formatCurrency(shippingAmount, currency)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNotes("");
              onClose();
            }}
            disabled={processing}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="h-5 w-5 text-slate-400" />
          </button>

        </div>

        {/* Content */}
        <div className="p-6 space-y-4">

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-cyan-300">
              Shipping charge to be refunded
            </span>

            <span className="text-cyan-400 font-bold text-lg">
              {formatCurrency(shippingAmount, currency)}
            </span>
          </div>


          {/* Notes */}
          <div>

            <label className="block text-sm font-semibold text-white mb-2">
              Reason / Notes <span className="text-red-400">*</span>
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Late delivery, free shipping promotion, customer goodwill..."
              rows={3}
              disabled={processing}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all disabled:opacity-50"
            />

          </div>


          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">

            <div className="flex items-start gap-2">

              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />

              <p className="text-xs text-amber-300">
                Only the shipping charge ({formatCurrency(shippingAmount, currency)})
                will be refunded. Product amounts remain unchanged.
              </p>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-900/30">

          <button
            onClick={() => {
              setNotes("");
              onClose();
            }}
            disabled={processing}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(notes)}
            disabled={processing || !notes.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >

            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Refund {formatCurrency(shippingAmount, currency)}
              </>
            )}

          </button>

        </div>

      </div>

    </div>
  );
}