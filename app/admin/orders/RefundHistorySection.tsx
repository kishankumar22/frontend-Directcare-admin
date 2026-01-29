// components/admin/orders/RefundHistorySection.tsx

'use client';

import { useState } from 'react';
import {
  History,
  ChevronUp,
  ChevronDown,
  Loader2,
  RotateCcw,
  CheckCircle,
  ChevronRight,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { RefundHistory } from '@/lib/services/OrderEdit';
import { formatCurrency, formatDate } from '@/lib/services/orders';

interface RefundHistorySectionProps {
  orderId: string;
  currency: string;
  refundHistory: RefundHistory | null;
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onFetch: () => void;
}

export default function RefundHistorySection({
  orderId,
  currency,
  refundHistory,
  loading,
  isOpen,
  onToggle,
  onFetch,
}: RefundHistorySectionProps) {
  const handleToggle = () => {
    if (!isOpen) {
      onFetch();
    }
    onToggle();
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <History className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Refund History</h3>
            {refundHistory && (
              <p className="text-xs text-slate-400 mt-0.5">
                {refundHistory.refunds.length} refund{refundHistory.refunds.length !== 1 ? 's' : ''} •{' '}
                Total: {formatCurrency(refundHistory.totalRefunded, currency)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {refundHistory && refundHistory.refunds.length > 0 && (
            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-medium">
              {refundHistory.refunds.length}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-700 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            </div>
          ) : !refundHistory || refundHistory.refunds.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="h-16 w-16 mx-auto mb-3 text-slate-600 opacity-50" />
              <p className="text-slate-400 font-medium">No refunds processed yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Refund history will appear here once processed
              </p>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="mb-5 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
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
                {refundHistory.isFullyRefunded && (
                  <div className="mt-3 pt-3 border-t border-purple-500/30">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Fully Refunded
                    </span>
                  </div>
                )}
              </div>

              {/* Refund List */}
              <div className="space-y-3">
                {refundHistory.refunds.map((refund, index) => (
                  <div
                    key={refund.refundId}
                    className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-purple-500/30 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {/* {refund.refundNumber || refund.refundId} */}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{refund.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-bold text-lg">
                          {formatCurrency(refund.amount, currency)}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${
                            refund.isPartial
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {refund.isPartial ? 'Partial' : 'Full'}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <CreditCard className="h-3.5 w-3.5" />
                        {/* <span className="text-white font-medium">{refund.paymentMethod}</span> */}
                      </div>
                      <div className="text-right text-slate-400">
                        {formatDate(refund.processedAt)}
                      </div>
                    </div>

                    {/* Reason Details */}
                    {refund.reasonDetails && (
                      <div className="mt-3 p-2.5 bg-slate-900/50 rounded-lg">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {refund.reasonDetails}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {/* {refund.adminNotes && (
                      <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-xs font-semibold text-amber-400 mb-1">Admin Notes:</p>
                        <p className="text-xs text-amber-300/80">{refund.adminNotes}</p>
                      </div>
                    )} */}

                    {/* Refunded Items */}
                    {/* {refund.refundedItems && refund.refundedItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 mb-2">
                          Refunded Items:
                        </p>
                        <div className="space-y-1.5">
                          {refund.refundedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-white flex items-center gap-1.5">
                                <ChevronRight className="h-3 w-3 text-purple-400" />
                                {item.productName} × {item.quantity}
                              </span>
                              <span className="text-purple-400 font-semibold">
                                {formatCurrency(item.refundAmount, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )} */}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
