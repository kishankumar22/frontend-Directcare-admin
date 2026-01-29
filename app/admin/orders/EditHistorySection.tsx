// components/admin/orders/EditHistorySection.tsx

'use client';

import { useState } from 'react';
import {
  History,
  ChevronUp,
  ChevronDown,
  Loader2,
  Edit,
  ChevronRight,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import { OrderHistory } from '@/lib/services/OrderEdit';
import { formatCurrency, formatDate } from '@/lib/services/orders';

interface EditHistorySectionProps {
  orderId: string;
  currency: string;
  editHistory: OrderHistory[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onFetch: () => void;
}

export default function EditHistorySection({
  orderId,
  currency,
  editHistory,
  loading,
  isOpen,
  onToggle,
  onFetch,
}: EditHistorySectionProps) {
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
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <History className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Edit History</h3>
            {editHistory.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {editHistory.length} edit{editHistory.length !== 1 ? 's' : ''} made to this order
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editHistory.length > 0 && (
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs font-medium">
              {editHistory.length}
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
          ) : editHistory.length === 0 ? (
            <div className="text-center py-12">
              <Edit className="h-16 w-16 mx-auto mb-3 text-slate-600 opacity-50" />
              <p className="text-slate-400 font-medium">No edits made yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Order edit history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {editHistory.map((edit, index) => {
                const priceDiff = (edit.newTotalAmount || 0) - (edit.oldTotalAmount || 0);
                const operations = edit.changeDetails?.Operations || [];
                const inventoryAdj = edit.changeDetails?.InventoryAdjustments || [];

                return (
                  <div
                    key={edit.id}
                    className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/30 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-white font-semibold text-sm flex items-center gap-2">
                            {edit.changeType}
                            {edit.oldStatus && edit.newStatus && edit.oldStatus !== edit.newStatus && (
                              <span className="text-xs text-cyan-400">
                                Status Changed
                              </span>
                            )}
                          </p>
                          {edit.changeDetails?.EditReason && (
                            <p className="text-xs text-slate-400 mt-1">
                              {edit.changeDetails.EditReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {priceDiff !== 0 && (
                          <>
                            <p className="text-xs text-slate-400 mb-1">
                              {formatCurrency(edit.oldTotalAmount || 0, currency)} →{' '}
                              {formatCurrency(edit.newTotalAmount || 0, currency)}
                            </p>
                            <p
                              className={`text-sm font-bold ${
                                priceDiff > 0
                                  ? 'text-green-400'
                                  : priceDiff < 0
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {priceDiff > 0 ? '+' : ''}
                              {formatCurrency(priceDiff, currency)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {edit.changedBy}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(edit.changeDate)}
                      </span>
                    </div>

                    {/* Admin Notes */}
                    {edit.notes && (
                      <div className="mb-3 p-2.5 bg-slate-900/50 rounded-lg">
                        <p className="text-xs font-semibold text-slate-400 mb-1">Notes:</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{edit.notes}</p>
                      </div>
                    )}

                    {/* Operations */}
                    {operations.length > 0 && (
                      <div className="mb-3 pt-3 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 mb-2">
                          Operations ({operations.length}):
                        </p>
                        <div className="space-y-1.5">
                          {operations.map((op: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs"
                            >
                              <ChevronRight className="h-3 w-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span
                                  className={`font-semibold ${
                                    op.ChangeType === 'Added'
                                      ? 'text-green-400'
                                      : op.ChangeType === 'Removed'
                                      ? 'text-red-400'
                                      : op.ChangeType === 'Updated'
                                      ? 'text-cyan-400'
                                      : 'text-yellow-400'
                                  }`}
                                >
                                  {op.ChangeType}
                                </span>
                                <span className="text-white">: {op.ProductName}</span>
                                {op.OldQuantity !== op.NewQuantity && (
                                  <span className="text-slate-400">
                                    {' '}
                                    ({op.OldQuantity} → {op.NewQuantity})
                                  </span>
                                )}
                                {op.OldUnitPrice !== op.NewUnitPrice &&
                                  op.NewUnitPrice !== null && (
                                    <span className="text-slate-400">
                                      {' '}
                                      Price: {formatCurrency(op.OldUnitPrice || 0, currency)} →{' '}
                                      {formatCurrency(op.NewUnitPrice, currency)}
                                    </span>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inventory Adjustments */}
                    {inventoryAdj.length > 0 && (
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 mb-2">
                          Inventory Adjustments:
                        </p>
                        <div className="space-y-1.5">
                          {inventoryAdj.map((adj: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-white flex items-center gap-1.5">
                                <ChevronRight className="h-3 w-3 text-cyan-400" />
                                {adj.ProductName}
                              </span>
                              <span
                                className={`font-semibold ${
                                  adj.AdjustmentType === 'Deducted'
                                    ? 'text-red-400'
                                    : 'text-green-400'
                                }`}
                              >
                                {adj.AdjustmentType}: {Math.abs(adj.QuantityAdjusted)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
