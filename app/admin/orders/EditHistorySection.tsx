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

  /* ================= FETCH ON OPEN ================= */
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

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <History className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Edit History
              </h2>
              <p className="text-xs text-slate-400">
                Track all changes made to this order
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
              <Edit className="h-16 w-16 text-slate-600 opacity-50 mb-4" />
              <p className="text-slate-400 font-medium">
                No edit history available
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Changes will appear here once modifications are made
              </p>
            </div>
          ) : (
            <div className="relative border-l border-slate-700 pl-8 space-y-8">

              {editHistory.map((edit, index) => {
                const priceDiff =
                  (edit.newTotalAmount || 0) -
                  (edit.oldTotalAmount || 0);

                const isLatest = index === 0;

                return (
                  <div
                    key={edit.id}
                    className={`relative bg-slate-800/60 rounded-xl border border-slate-700 p-5 transition-all
                    ${isLatest ? 'shadow-lg shadow-cyan-500/10 border-cyan-500/40' : 'hover:border-cyan-500/30'}
                    `}
                  >
                    {/* Timeline Dot */}
                    <div className="absolute -left-[41px] top-6 w-3.5 h-3.5 bg-cyan-500 rounded-full shadow-md shadow-cyan-500/40" />

                    {/* Top Section */}
                    <div className="flex justify-between items-start gap-6">

                      {/* LEFT */}
                      <div className="space-y-2 flex-1">

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {edit.changeType}
                          </span>

                          {edit.oldStatus &&
                            edit.newStatus &&
                            edit.oldStatus !== edit.newStatus && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                {edit.oldStatus} → {edit.newStatus}
                              </span>
                            )}
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

                      {/* RIGHT - PRICE CHANGE */}
                      {priceDiff !== 0 && (
                        <div className="text-right min-w-[140px]">
                          <p className="text-xs text-slate-400">
                            {formatCurrency(edit.oldTotalAmount || 0, currency)} →{' '}
                            {formatCurrency(edit.newTotalAmount || 0, currency)}
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

                    {/* NOTES */}
                    {edit.notes && (
                      <div className="mt-4 p-4 bg-slate-900/60 border border-slate-700 rounded-lg">
                        <p className="text-xs font-semibold text-cyan-400 mb-2">
                          Admin Notes
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed">
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 sticky bottom-0">
          <div className="flex justify-end">
            <button
              onClick={onToggle}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
