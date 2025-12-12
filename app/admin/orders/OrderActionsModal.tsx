// components/admin/orders/OrderActionsModal.tsx

'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Loader2, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  orderService,
  Order,
  MarkCollectedRequest,
  UpdateStatusRequest,
  CreateShipmentRequest,
  MarkDeliveredRequest,
  CancelOrderRequest,
} from '../../../lib/services/orders';
import { useToast } from '@/components/CustomToast';

interface OrderActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  action: string;
  onSuccess: () => void;
}

// ✅ Order status enum
enum OrderStatus {
  PENDING = 1,
  PROCESSING = 2,
  SHIPPED = 3,
  DELIVERED = 4,
  CANCELLED = 5,
  REFUNDED = 6,
  READY_FOR_COLLECTION = 7,
  COLLECTED = 8,
}

// ✅ Status labels mapping
const STATUS_LABELS: Record<number, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.SHIPPED]: 'Shipped',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
  [OrderStatus.REFUNDED]: 'Refunded',
  [OrderStatus.READY_FOR_COLLECTION]: 'Ready for Collection',
  [OrderStatus.COLLECTED]: 'Collected',
};

// ✅ Valid status transitions based on current status
const VALID_STATUS_TRANSITIONS: Record<number, number[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,
    OrderStatus.READY_FOR_COLLECTION,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.CANCELLED]: [
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.READY_FOR_COLLECTION]: [
    OrderStatus.COLLECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COLLECTED]: [
    OrderStatus.REFUNDED,
  ],
};

// ✅ Get available status options based on current status
const getAvailableStatuses = (currentStatus: number): number[] => {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
};

export default function OrderActionsModal({
  isOpen,
  onClose,
  order,
  action,
  onSuccess,
}: OrderActionsModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Mark Ready - no form needed
  const [readyConfirmed, setReadyConfirmed] = useState(false);

  // Mark Collected
  const [collectedData, setCollectedData] = useState({
    collectedBy: '',
    collectorIDType: '',
    collectorIDNumber: '',
  });

  // Update Status
  const [statusData, setStatusData] = useState({
    newStatus: order.status,
    adminNotes: '',
  });

  // Create Shipment
  const [shipmentData, setShipmentData] = useState({
    trackingNumber: '',
    carrier: '',
    shippingMethod: '',
    notes: '',
    selectedItems: [] as { orderItemId: string; quantity: number }[],
  });

  // Mark Delivered
  const [deliveredData, setDeliveredData] = useState({
    shipmentId: order.shipments[0]?.id || '',
    deliveredAt: new Date().toISOString().slice(0, 16),
    deliveryNotes: '',
    receivedBy: '',
  });

  // Cancel Order
  const [cancelData, setCancelData] = useState({
    cancellationReason: '',
    restoreInventory: true,
    initiateRefund: true,
    cancelledBy: '',
  });

  // ✅ Get available statuses dynamically
  const availableStatuses = getAvailableStatuses(order.status);

  // ✅ Initialize shipment items when modal opens for create-shipment action
  useEffect(() => {
    if (isOpen && action === 'create-shipment' && order.orderItems.length > 0) {
      setShipmentData((prev) => ({
        ...prev,
        selectedItems: order.orderItems.map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity,
        })),
      }));
    }
  }, [isOpen, action, order.orderItems]);

  // ✅ Reset form data when modal opens/closes or action changes
  useEffect(() => {
    if (isOpen) {
      setReadyConfirmed(false);
      setCollectedData({
        collectedBy: '',
        collectorIDType: '',
        collectorIDNumber: '',
      });
      setStatusData({
        newStatus: order.status,
        adminNotes: '',
      });
      setDeliveredData({
        shipmentId: order.shipments[0]?.id || '',
        deliveredAt: new Date().toISOString().slice(0, 16),
        deliveryNotes: '',
        receivedBy: '',
      });
      setCancelData({
        cancellationReason: '',
        restoreInventory: true,
        initiateRefund: true,
        cancelledBy: '',
      });
    }
  }, [isOpen, action, order.status, order.shipments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      switch (action) {
        case 'mark-ready':
          await orderService.markReady(order.id);
          toast.success('Order marked as ready for collection');
          break;

        case 'mark-collected':
          const collectedRequest: MarkCollectedRequest = {
            orderId: order.id,
            collectedBy: collectedData.collectedBy,
            collectorIDType: collectedData.collectorIDType,
            collectorIDNumber: collectedData.collectorIDNumber,
          };
          await orderService.markCollected(collectedRequest);
          toast.success('Order marked as collected');
          break;

        case 'update-status':
          const statusRequest: UpdateStatusRequest = {
            orderId: order.id,
            newStatus: statusData.newStatus,
            adminNotes: statusData.adminNotes || undefined,
          };
          await orderService.updateStatus(statusRequest);
          toast.success('Order status updated successfully');
          break;

        case 'create-shipment':
          const shipmentRequest: CreateShipmentRequest = {
            orderId: order.id,
            trackingNumber: shipmentData.trackingNumber,
            carrier: shipmentData.carrier,
            shippingMethod: shipmentData.shippingMethod,
            notes: shipmentData.notes || undefined,
            shipmentItems: shipmentData.selectedItems,
          };
          await orderService.createShipment(shipmentRequest);
          toast.success('Shipment created successfully');
          break;

        case 'mark-delivered':
          const deliveredRequest: MarkDeliveredRequest = {
            orderId: order.id,
            shipmentId: deliveredData.shipmentId,
            deliveredAt: new Date(deliveredData.deliveredAt).toISOString(),
            deliveryNotes: deliveredData.deliveryNotes || undefined,
            receivedBy: deliveredData.receivedBy || undefined,
          };
          await orderService.markDelivered(deliveredRequest);
          toast.success('Order marked as delivered');
          break;

        case 'cancel-order':
          const cancelRequest: CancelOrderRequest = {
            orderId: order.id,
            cancellationReason: cancelData.cancellationReason,
            restoreInventory: cancelData.restoreInventory,
            initiateRefund: cancelData.initiateRefund,
            cancelledBy: cancelData.cancelledBy,
          };
          await orderService.cancelOrder(cancelRequest);
          toast.success('Order cancelled successfully');
          break;

        default:
          toast.error('Unknown action');
          return;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Action error:', error);
      toast.error(error.message || 'Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentItemQuantity = (orderItemId: string, quantity: number) => {
    setShipmentData((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.map((item) =>
        item.orderItemId === orderItemId ? { ...item, quantity } : item
      ),
    }));
  };

  const renderModalContent = () => {
    switch (action) {
      case 'mark-ready':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <Package className="h-6 w-6 text-cyan-400" />
              <div>
                <p className="text-white font-medium">Mark Order as Ready for Collection</p>
                <p className="text-sm text-slate-400">
                  Customer will be notified that their order is ready to collect.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmReady"
                checked={readyConfirmed}
                onChange={(e) => setReadyConfirmed(e.target.checked)}
                className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500"
              />
              <label htmlFor="confirmReady" className="text-sm text-slate-300">
                I confirm this order is ready for collection
              </label>
            </div>
          </div>
        );

      case 'mark-collected':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="text-white font-medium">Mark Order as Collected</p>
                <p className="text-sm text-slate-400">Record collection details for this order.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Collected By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={collectedData.collectedBy}
                onChange={(e) =>
                  setCollectedData({ ...collectedData, collectedBy: e.target.value })
                }
                placeholder="Enter collector name"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ID Type <span className="text-red-500">*</span>
              </label>
              <select
                value={collectedData.collectorIDType}
                onChange={(e) =>
                  setCollectedData({ ...collectedData, collectorIDType: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Select ID type</option>
                <option value="Driving License">Driving License</option>
                <option value="Passport">Passport</option>
                <option value="National ID">National ID</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={collectedData.collectorIDNumber}
                onChange={(e) =>
                  setCollectedData({ ...collectedData, collectorIDNumber: e.target.value })
                }
                placeholder="Enter ID number"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>
        );

      case 'update-status':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Clock className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-white font-medium">Update Order Status</p>
                <p className="text-sm text-slate-400">Change the current status of this order.</p>
              </div>
            </div>

            {/* ✅ Current Status Display */}
            <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Current Status</p>
              <p className="text-white font-medium">{STATUS_LABELS[order.status]}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              {/* ✅ Conditionally show only valid statuses */}
              {availableStatuses.length > 0 ? (
                <select
                  value={statusData.newStatus}
                  onChange={(e) =>
                    setStatusData({ ...statusData, newStatus: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                >
                  <option value={order.status}>Select new status</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400">
                    No valid status transitions available from current status.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Notes
              </label>
              <textarea
                value={statusData.adminNotes}
                onChange={(e) => setStatusData({ ...statusData, adminNotes: e.target.value })}
                placeholder="Add notes about this status change..."
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        );

      case 'create-shipment':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Truck className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-white font-medium">Create Shipment</p>
                <p className="text-sm text-slate-400">Add tracking and shipment details.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipmentData.trackingNumber}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, trackingNumber: e.target.value })
                  }
                  placeholder="e.g., 1Z999AA1234567890"
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Carrier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shipmentData.carrier}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, carrier: e.target.value })
                  }
                  placeholder="e.g., DHL, FedEx, UPS"
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Shipping Method <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shipmentData.shippingMethod}
                onChange={(e) =>
                  setShipmentData({ ...shipmentData, shippingMethod: e.target.value })
                }
                placeholder="e.g., Standard, Express"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
              <textarea
                value={shipmentData.notes}
                onChange={(e) => setShipmentData({ ...shipmentData, notes: e.target.value })}
                placeholder="Additional shipment notes..."
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Shipment Items
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {order.orderItems.map((item) => {
                  const shipmentItem = shipmentData.selectedItems.find(
                    (si) => si.orderItemId === item.id
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-slate-400">SKU: {item.productSku}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={shipmentItem?.quantity || 0}
                        onChange={(e) =>
                          updateShipmentItemQuantity(item.id, Number(e.target.value))
                        }
                        className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-slate-400 text-sm ml-2">/ {item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'mark-delivered':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-white font-medium">Mark Order as Delivered</p>
                <p className="text-sm text-slate-400">Record delivery confirmation details.</p>
              </div>
            </div>

            {order.shipments.length > 0 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Shipment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deliveredData.shipmentId}
                    onChange={(e) =>
                      setDeliveredData({ ...deliveredData, shipmentId: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    required
                  >
                    {order.shipments.map((shipment) => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.trackingNumber || shipment.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Delivered At <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveredData.deliveredAt}
                    onChange={(e) =>
                      setDeliveredData({ ...deliveredData, deliveredAt: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={deliveredData.receivedBy}
                    onChange={(e) =>
                      setDeliveredData({ ...deliveredData, receivedBy: e.target.value })
                    }
                    placeholder="Name of person who received"
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Delivery Notes
                  </label>
                  <textarea
                    value={deliveredData.deliveryNotes}
                    onChange={(e) =>
                      setDeliveredData({ ...deliveredData, deliveryNotes: e.target.value })
                    }
                    placeholder="Additional delivery notes..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  />
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">
                  No shipments available for this order. Please create a shipment first.
                </p>
              </div>
            )}
          </div>
        );

      case 'cancel-order':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="h-6 w-6 text-red-400" />
              <div>
                <p className="text-white font-medium">Cancel Order</p>
                <p className="text-sm text-slate-400">
                  This action will cancel the order and optionally process refund.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelData.cancellationReason}
                onChange={(e) =>
                  setCancelData({ ...cancelData, cancellationReason: e.target.value })
                }
                placeholder="Enter reason for cancellation..."
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cancelled By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cancelData.cancelledBy}
                onChange={(e) => setCancelData({ ...cancelData, cancelledBy: e.target.value })}
                placeholder="Admin name or system"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cancelData.restoreInventory}
                  onChange={(e) =>
                    setCancelData({ ...cancelData, restoreInventory: e.target.checked })
                  }
                  className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300">Restore inventory</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cancelData.initiateRefund}
                  onChange={(e) =>
                    setCancelData({ ...cancelData, initiateRefund: e.target.checked })
                  }
                  className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-300">Initiate refund</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (action) {
      case 'mark-ready':
        return 'Mark Ready for Collection';
      case 'mark-collected':
        return 'Mark as Collected';
      case 'update-status':
        return 'Update Order Status';
      case 'create-shipment':
        return 'Create Shipment';
      case 'mark-delivered':
        return 'Mark as Delivered';
      case 'cancel-order':
        return 'Cancel Order';
      default:
        return 'Order Action';
    }
  };

  const isFormValid = () => {
    switch (action) {
      case 'mark-ready':
        return readyConfirmed;
      case 'mark-collected':
        return (
          collectedData.collectedBy &&
          collectedData.collectorIDType &&
          collectedData.collectorIDNumber
        );
      case 'update-status':
        return statusData.newStatus > 0 && statusData.newStatus !== order.status && availableStatuses.includes(statusData.newStatus);
      case 'create-shipment':
        return (
          shipmentData.trackingNumber &&
          shipmentData.carrier &&
          shipmentData.shippingMethod &&
          shipmentData.selectedItems.some((item) => item.quantity > 0)
        );
      case 'mark-delivered':
        return (
          deliveredData.shipmentId &&
          deliveredData.deliveredAt &&
          order.shipments.length > 0
        );
      case 'cancel-order':
        return cancelData.cancellationReason && cancelData.cancelledBy;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {renderModalContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
