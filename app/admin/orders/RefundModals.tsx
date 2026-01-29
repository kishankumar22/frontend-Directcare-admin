// components/admin/orders/RefundModals.tsx

'use client';

import { useState } from 'react';
import {
  XCircle,
  RotateCcw,
  Split,
  Loader2,
  AlertTriangle,
  PoundSterling,
  Plus,
  Minus,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { RefundReason, orderEditService } from '@/lib/services/OrderEdit';
import { Order, formatCurrency } from '@/lib/services/orders';

interface RefundModalsProps {
  order: Order;
  showFullRefundModal: boolean;
  showPartialRefundModal: boolean;
  onCloseFullRefund: () => void;
  onClosePartialRefund: () => void;
  onRefundSuccess: () => void;
}

export default function RefundModals({
  order,
  showFullRefundModal,
  showPartialRefundModal,
  onCloseFullRefund,
  onClosePartialRefund,
  onRefundSuccess,
}: RefundModalsProps) {
  const [refundReason, setRefundReason] = useState<RefundReason>(RefundReason.CustomerRequest);
  const [refundNotes, setRefundNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Partial refund items state
  const [partialRefundItems, setPartialRefundItems] = useState<
    Array<{ orderItemId: string; quantity: number; refundAmount: number }>
  >([]);

  // Initialize partial refund items when modal opens
  useState(() => {
    if (showPartialRefundModal && partialRefundItems.length === 0) {
      setPartialRefundItems(
        order.orderItems.map((item) => ({
          orderItemId: item.id,
          quantity: 0,
          refundAmount: 0,
        }))
      );
    }
  });

  const handleCloseFullRefund = () => {
    setRefundNotes('');
    setRefundReason(RefundReason.CustomerRequest);
    onCloseFullRefund();
  };

  const handleClosePartialRefund = () => {
    setRefundNotes('');
    setRefundReason(RefundReason.CustomerRequest);
    setPartialRefundItems([]);
    onClosePartialRefund();
  };

  return (
    <>
      {/* ===========================
          FULL REFUND MODAL
      =========================== */}
      {showFullRefundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-red-900/20 to-pink-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <RotateCcw className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Process Full Refund</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total: {formatCurrency(order.totalAmount, order.currency)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseFullRefund}
                disabled={processingRefund}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Refund Reason */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Refund Reason <span className="text-red-400">*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(Number(e.target.value) as RefundReason)}
                  disabled={processingRefund}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  {Object.entries(RefundReason)
                    .filter(([key]) => isNaN(Number(key)))
                    .map(([key, value]) => (
                      <option key={value} value={value}>
                        {orderEditService.getRefundReasonLabel(value as number)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Refund Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Explain why this full refund is being processed..."
                  rows={4}
                  disabled={processingRefund}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">Important:</p>
                    <ul className="text-xs text-amber-300 space-y-0.5 list-disc list-inside">
                      <li>Full order amount will be refunded</li>
                      <li>Inventory will be automatically restored</li>
                      <li>Customer will receive email notification</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-900/30">
              <button
                onClick={handleCloseFullRefund}
                disabled={processingRefund}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => onRefundSuccess()}
                disabled={processingRefund || !refundNotes.trim()}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {processingRefund ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Process Full Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===========================
          PARTIAL REFUND MODAL
      =========================== */}
      {showPartialRefundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-orange-900/20 to-amber-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <Split className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Process Partial Refund</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select items and quantities to refund
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePartialRefund}
                disabled={processingRefund}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
              {/* Items Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Select Items to Refund <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                  {order.orderItems.map((item, index) => {
                    const refundItem = partialRefundItems.find((r) => r.orderItemId === item.id);
                    const currentQuantity = refundItem?.quantity || 0;
                    const currentAmount = refundItem?.refundAmount || 0;
                    const isSelected = currentQuantity > 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500/30 shadow-lg'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {/* Item Info */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">
                                {item.productName}
                              </p>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {item.productSku}
                              </p>
                              {item.variantName && (
                                <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                                  <ChevronRight className="h-3 w-3" />
                                  {item.variantName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-slate-400">
                              {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
                            </p>
                            <p className="text-white font-semibold text-sm mt-1">
                              {formatCurrency(item.totalPrice, order.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Quantity & Amount Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Quantity */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-2">
                              Refund Quantity
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const newQty = Math.max(0, currentQuantity - 1);
                                  setPartialRefundItems((prev) =>
                                    prev.map((r) =>
                                      r.orderItemId === item.id
                                        ? {
                                            ...r,
                                            quantity: newQty,
                                            refundAmount:
                                              newQty === 0 ? 0 : Math.min(r.refundAmount, newQty * item.unitPrice),
                                          }
                                        : r
                                    )
                                  );
                                }}
                                disabled={processingRefund || currentQuantity === 0}
                                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5 text-white" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={currentQuantity}
                                onChange={(e) => {
                                  const newQty = Math.max(0, Math.min(item.quantity, Number(e.target.value)));
                                  setPartialRefundItems((prev) =>
                                    prev.map((r) =>
                                      r.orderItemId === item.id
                                        ? {
                                            ...r,
                                            quantity: newQty,
                                            refundAmount:
                                              newQty === 0
                                                ? 0
                                                : r.refundAmount === 0
                                                ? newQty * item.unitPrice
                                                : Math.min(r.refundAmount, newQty * item.unitPrice),
                                          }
                                        : r
                                    )
                                  );
                                }}
                                disabled={processingRefund}
                                className="w-16 px-2 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-center text-sm focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newQty = Math.min(item.quantity, currentQuantity + 1);
                                  setPartialRefundItems((prev) =>
                                    prev.map((r) =>
                                      r.orderItemId === item.id
                                        ? {
                                            ...r,
                                            quantity: newQty,
                                            refundAmount:
                                              r.refundAmount === 0 ? newQty * item.unitPrice : Math.min(r.refundAmount, newQty * item.unitPrice),
                                          }
                                        : r
                                    )
                                  );
                                }}
                                disabled={processingRefund || currentQuantity >= item.quantity}
                                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5 text-white" />
                              </button>
                              <span className="text-xs text-slate-400 ml-1">/ {item.quantity}</span>
                            </div>
                          </div>

                          {/* Refund Amount */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-2">
                              Refund Amount ({order.currency})
                            </label>
                            <div className="relative">
                              <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <input
                                type="number"
                                min="0"
                                max={currentQuantity > 0 ? currentQuantity * item.unitPrice : 0}
                                step="0.01"
                                value={currentAmount}
                                onChange={(e) => {
                                  const maxAmount = currentQuantity * item.unitPrice;
                                  const newAmount = Math.max(0, Math.min(maxAmount, Number(e.target.value)));
                                  setPartialRefundItems((prev) =>
                                    prev.map((r) =>
                                      r.orderItemId === item.id ? { ...r, refundAmount: newAmount } : r
                                    )
                                  );
                                }}
                                disabled={processingRefund || currentQuantity === 0}
                                className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                placeholder="0.00"
                              />
                            </div>
                            {currentQuantity > 0 && (
                              <p className="text-xs text-slate-400 mt-1">
                                Max: {formatCurrency(currentQuantity * item.unitPrice, order.currency)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        {currentQuantity > 0 && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                            <button
                              type="button"
                              onClick={() => {
                                setPartialRefundItems((prev) =>
                                  prev.map((r) =>
                                    r.orderItemId === item.id
                                      ? { ...r, quantity: item.quantity, refundAmount: item.totalPrice }
                                      : r
                                  )
                                );
                              }}
                              disabled={processingRefund}
                              className="flex-1 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Refund All
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPartialRefundItems((prev) =>
                                  prev.map((r) =>
                                    r.orderItemId === item.id ? { ...r, quantity: 0, refundAmount: 0 } : r
                                  )
                                );
                              }}
                              disabled={processingRefund}
                              className="flex-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              {partialRefundItems.some((r) => r.quantity > 0) && (
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">Refund Summary</p>
                    <p className="text-xs text-slate-400">
                      {partialRefundItems.filter((r) => r.quantity > 0).length} item(s) selected
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {partialRefundItems
                      .filter((r) => r.quantity > 0)
                      .map((refundItem) => {
                        const item = order.orderItems.find((i) => i.id === refundItem.orderItemId);
                        if (!item) return null;
                        return (
                          <div key={refundItem.orderItemId} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 flex items-center gap-1">
                              <ChevronRight className="h-3 w-3" />
                              {item.productName} × {refundItem.quantity}
                            </span>
                            <span className="text-orange-400 font-semibold">
                              {formatCurrency(refundItem.refundAmount, order.currency)}
                            </span>
                          </div>
                        );
                      })}
                    <div className="flex items-center justify-between pt-2 border-t border-orange-500/30">
                      <span className="text-white font-bold">Total Refund</span>
                      <span className="text-orange-400 font-bold text-lg">
                        {formatCurrency(
                          partialRefundItems.reduce((sum, r) => sum + r.refundAmount, 0),
                          order.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Reason */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Refund Reason <span className="text-red-400">*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(Number(e.target.value) as RefundReason)}
                  disabled={processingRefund}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {Object.entries(RefundReason)
                    .filter(([key]) => isNaN(Number(key)))
                    .map(([key, value]) => (
                      <option key={value} value={value}>
                        {orderEditService.getRefundReasonLabel(value as number)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Refund Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Explain why this partial refund is being processed..."
                  rows={3}
                  disabled={processingRefund}
                  className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 resize-none disabled:opacity-50"
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">Important:</p>
                    <ul className="text-xs text-amber-300 space-y-0.5 list-disc list-inside">
                      <li>Selected items will be refunded</li>
                      <li>Inventory will be automatically updated</li>
                      <li>Customer will receive email notification</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Validation Error */}
              {partialRefundItems.every((r) => r.quantity === 0) && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Please select at least one item to refund
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-900/30">
              <div className="text-sm">
                {partialRefundItems.some((r) => r.quantity > 0) ? (
                  <p className="text-orange-400 font-semibold">
                    Refunding{' '}
                    {formatCurrency(
                      partialRefundItems.reduce((sum, r) => sum + r.refundAmount, 0),
                      order.currency
                    )}
                  </p>
                ) : (
                  <p className="text-slate-400">No items selected</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClosePartialRefund}
                  disabled={processingRefund}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onRefundSuccess()}
                  disabled={
                    processingRefund ||
                    partialRefundItems.every((r) => r.quantity === 0) ||
                    !refundNotes.trim()
                  }
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {processingRefund ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Process Partial Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
