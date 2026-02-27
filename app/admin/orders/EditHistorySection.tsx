'use client';

import { useEffect, useRef } from 'react';
import {
  History,
  Loader2,
  Edit,
  Calendar,
  User,
  X,
} from 'lucide-react';

import { OrderHistory } from '@/lib/services/OrderEdit';
import { formatCurrency, formatDate } from '@/lib/services/orders';

interface EditHistorySectionProps {
  currency: string;
  editHistory: OrderHistory[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onFetch: () => void;
}

export default function EditHistorySection({
  currency,
  editHistory,
  loading,
  isOpen,
  onToggle,
  onFetch,
}: EditHistorySectionProps) {
  const hasFetchedRef = useRef(false);

  /* ================= FETCH ================= */
  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      onFetch();
    }

    if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen, onFetch]);

  /* ================= ESC CLOSE ================= */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onToggle}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <History className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Edit History
              </h2>
              <p className="text-xs text-slate-400">
                Detailed audit log of all order modifications
              </p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
            </div>
          ) : editHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Edit className="h-14 w-14 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">
                No edit history available
              </p>
            </div>
          ) : (
            <div className="relative border-l border-slate-700 pl-8 space-y-8">

              {editHistory.map((edit, index) => {

                const oldTotal = edit.oldTotalAmount || 0;
                const newTotal = edit.newTotalAmount || 0;
                const priceDiff = newTotal - oldTotal;

                const isLatest = index === 0;

                return (
                  <div
                    key={edit.id}
                    className={`relative bg-slate-800/60 rounded-xl border border-slate-700 p-5 transition
                      ${isLatest ? 'border-cyan-500/40 shadow-md shadow-cyan-500/10' : 'hover:border-cyan-500/30'}
                    `}
                  >

                    {/* Timeline Dot */}
                    <div className="absolute -left-[41px] top-6 w-3.5 h-3.5 bg-cyan-500 rounded-full shadow-md shadow-cyan-500/40" />

                    {/* ===== TOP ROW ===== */}
                    <div className="flex justify-between items-start gap-6">

                      <div className="space-y-2 flex-1">

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {edit.changeType}
                          </span>
                        </div>

                        <div className="flex items-center gap-5 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {edit.changedBy}
                          </span>

                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(edit.changeDate)}
                          </span>
                        </div>
                      </div>

                      {/* PRICE SUMMARY */}
                      {priceDiff !== 0 && (
                        <div className="text-right min-w-[160px]">
                          <p className="text-xs text-slate-400">
                            {formatCurrency(oldTotal, currency)} →{' '}
                            {formatCurrency(newTotal, currency)}
                          </p>

                          <p
                            className={`text-lg font-bold ${
                              priceDiff > 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {priceDiff > 0 ? '+' : ''}
                            {formatCurrency(priceDiff, currency)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ===== ORDER EDIT DETAILS ===== */}
                    {edit.changeType === 'OrderEdited' &&
                      edit.changeDetails && (
                        <div className="mt-4 space-y-4">

                          {/* Edit Reason */}
                          {edit.changeDetails.EditReason && (
                            <div className="text-sm text-slate-300">
                              <span className="text-xs uppercase text-slate-400 mr-2">
                                Reason:
                              </span>
                              {edit.changeDetails.EditReason}
                            </div>
                          )}

                          {/* Operations */}
                          {edit.changeDetails.Operations?.length > 0 && (
                            <div className="space-y-3">

                              {edit.changeDetails.Operations.map(
                                (op: any, idx: number) => {

                                  const qtyDiff =
                                    (op.NewQuantity || 0) -
                                    (op.OldQuantity || 0);

                                  const totalDiff =
                                    (op.NewTotalPrice || 0) -
                                    (op.OldTotalPrice || 0);

                                  return (
                                    <div
                                      key={idx}
                                      className="p-3 bg-slate-900/60 border border-slate-700 rounded-lg"
                                    >
                                      <div className="flex justify-between">
                                        <div>
                                          <p className="text-sm font-medium text-white">
                                            {op.ProductName}
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            SKU: {op.ProductSku}
                                          </p>
                                        </div>

                                        <span
                                          className={`text-xs px-2 py-1 rounded-md font-semibold ${
                                            op.ChangeType === 'Added'
                                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                              : op.ChangeType === 'Removed'
                                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                          }`}
                                        >
                                          {op.ChangeType}
                                        </span>
                                      </div>

                                      <div className="mt-2 text-xs text-slate-300 grid grid-cols-2 gap-2">
                                        <div>
                                          Qty: {op.OldQuantity ?? 0} →{' '}
                                          {op.NewQuantity ?? 0}
                                          {qtyDiff !== 0 && (
                                            <span
                                              className={`ml-1 ${
                                                qtyDiff > 0
                                                  ? 'text-green-400'
                                                  : 'text-red-400'
                                              }`}
                                            >
                                              ({qtyDiff > 0 ? '+' : ''}
                                              {qtyDiff})
                                            </span>
                                          )}
                                        </div>

                                        <div>
                                          Total:{' '}
                                          {formatCurrency(
                                            op.OldTotalPrice || 0,
                                            currency
                                          )}{' '}
                                          →{' '}
                                          {formatCurrency(
                                            op.NewTotalPrice || 0,
                                            currency
                                          )}
                                        </div>
                                      </div>

                                      {totalDiff !== 0 && (
                                        <div
                                          className={`text-xs font-semibold mt-2 ${
                                            totalDiff > 0
                                              ? 'text-green-400'
                                              : 'text-red-400'
                                          }`}
                                        >
                                          Impact:{' '}
                                          {totalDiff > 0 ? '+' : ''}
                                          {formatCurrency(
                                            totalDiff,
                                            currency
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    {/* ===== INVOICE DETAILS ===== */}
                    {edit.changeType === 'InvoiceRegenerated' &&
                      edit.changeDetails && (
                        <div className="mt-4 p-3 bg-slate-900/60 border text-white border-slate-700 rounded-lg text-sm space-y-1">
                          <p>
                            Invoice: {edit.changeDetails.InvoiceNumber}
                          </p>
                          <p>
                            Version: {edit.changeDetails.Version}
                          </p>
                          <p>
                            Total:{' '}
                            {formatCurrency(
                              edit.changeDetails.TotalAmount,
                              currency
                            )}
                          </p>
                        </div>
                      )}

                    {/* NOTES */}
                    {edit.notes && (
                      <div className="mt-4 p-3 bg-slate-900/60 border border-slate-700 rounded-lg">
                        <p className="text-xs font-semibold text-cyan-400 mb-1">
                          Admin Notes
                        </p>
                        <p className="text-sm text-slate-300">
                          {edit.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-800">
          <div className="flex justify-end">
            <button
              onClick={onToggle}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}