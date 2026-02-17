'use client';

import { useEffect } from 'react';
import {
  History,
  Loader2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  PoundSterling,
  X,
  User,
  CreditCard,
} from 'lucide-react';

import { RefundHistory } from '@/lib/services/OrderEdit';
import { formatCurrency, formatDate } from '@/lib/services/orders';

interface RefundHistorySectionProps {
  currency: string;
  refundHistory: RefundHistory | null;
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onFetch: () => void;
}

export default function RefundHistorySection({
  currency,
  refundHistory,
  loading,
  isOpen,
  onToggle,
  onFetch,
}: RefundHistorySectionProps) {

  // Fetch when opened
  useEffect(() => {
    if (isOpen && !refundHistory) {
      onFetch();
    }
  }, [isOpen]);

  // ESC close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onToggle}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <History className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Refund History
              </h2>
              {refundHistory && (
                <p className="text-xs text-slate-400 mt-1">
                  Order: {refundHistory.orderNumber}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
          </div>
        ) : !refundHistory ? (
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 mx-auto mb-3 text-red-500 opacity-50" />
            <p className="text-red-400 font-medium">
              Failed to load refund history
            </p>
          </div>
        ) : (
          <>
            {/* ================= SUMMARY ================= */}
            <div className="mb-6 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">

              <div className="grid grid-cols-3 gap-6">

                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <PoundSterling className="h-3 w-3" />
                    Original Amount
                  </p>
                  <p className="text-white font-bold text-lg">
                    {formatCurrency(refundHistory.originalOrderAmount, currency)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Total Refunded
                  </p>
                  <p className="text-purple-400 font-bold text-lg">
                    {formatCurrency(refundHistory.totalRefunded, currency)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Remaining Balance
                  </p>
                  <p className="text-green-400 font-bold text-lg">
                    {formatCurrency(refundHistory.remainingBalance, currency)}
                  </p>
                </div>
              </div>

              {/* Order Meta Row */}
              <div className="mt-5 pt-4 border-t border-purple-500/30 flex items-center justify-between">

                <div className="flex items-center gap-6 text-xs text-slate-400">
                  <span>
                    Payment Status:{" "}
                    <span className="text-white font-medium">
                      {refundHistory.paymentStatus}
                    </span>
                  </span>

                  <span>
                    Refund Count:{" "}
                    <span className="text-white font-medium">
                      {refundHistory.refunds.length}
                    </span>
                  </span>
                </div>

                {refundHistory.isFullyRefunded && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Fully Refunded
                  </span>
                )}
              </div>
            </div>

            {/* ================= REFUND LIST ================= */}
            {refundHistory.refunds.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="h-14 w-14 mx-auto mb-3 text-slate-600 opacity-50" />
                <p className="text-slate-400 font-medium">
                  No refunds processed yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {refundHistory.refunds.map((refund, index) => (
                  <div
                    key={refund.refundId}
                    className="p-5 bg-slate-800/60 rounded-xl border border-slate-700 hover:border-purple-500/30 transition-all"
                  >

                    <div className="flex justify-between items-start mb-3">

                      <div>
                        <p className="text-white font-semibold text-sm">
                          Refund #{index + 1}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {refund.processedBy}
                          </span>

                          <span>
                            {formatDate(refund.processedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-purple-400 font-bold text-lg">
                          {formatCurrency(refund.amount, currency)}
                        </p>

                        <span
                          className={`inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-medium ${
                            refund.isPartial
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {refund.isPartial ? 'Partial Refund' : 'Full Refund'}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-300">
                      <span className="text-slate-400">Reason:</span>{" "}
                      {refund.reason}
                    </div>

                  </div>
                ))}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
