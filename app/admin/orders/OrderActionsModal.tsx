// components/admin/orders/OrderActionsModal.tsx

'use client';

import { useState, FormEvent, useEffect, JSX } from 'react';
import { 
  X, 
  Loader2, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin,
  AlertTriangle,
  Bell,
  History,
  CreditCard,
  ShieldAlert
} from 'lucide-react';
import {
  orderService,
  Order,
  OrderStatus,
  MarkCollectedRequest,
  UpdateStatusRequest,
  CreateShipmentRequest,
  MarkDeliveredRequest,
  CancelOrderRequest,
} from '../../../lib/services/orders'; // ✅ FIXED PATH
import { useToast } from '@/components/CustomToast';

interface OrderActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  action: string;
  onSuccess: () => void;
}

// ✅ Valid status transitions based on current status AND delivery method
const getValidStatusTransitions = (currentStatus: OrderStatus, deliveryMethod: string): OrderStatus[] => {
  const baseTransitions: Record<OrderStatus, OrderStatus[]> = {
    'Pending': ['Confirmed', 'Cancelled'],
    'Confirmed': deliveryMethod === 'ClickAndCollect' 
      ? ['Processing', 'Cancelled']
      : ['Processing', 'Shipped', 'Cancelled'],
    'Processing': deliveryMethod === 'ClickAndCollect'
      ? ['Cancelled'] // Click & Collect will go to Ready via mark-ready action
      : ['Shipped', 'PartiallyShipped', 'Cancelled'],
    'Shipped': ['Delivered', 'PartiallyShipped', 'Cancelled'],
    'PartiallyShipped': ['Delivered', 'Cancelled'],
    'Delivered': ['Returned', 'Refunded'],
    'Cancelled': ['Refunded'],
    'Returned': ['Refunded'],
    'Refunded': [],
  };

  return baseTransitions[currentStatus] || [];
};

// ✅ Status display info
const getStatusDisplayInfo = (status: OrderStatus) => {
  const statusMap: Record<OrderStatus, { label: string; color: string; icon: JSX.Element }> = {
    'Pending': { 
      label: 'Pending', 
      color: 'text-yellow-400', 
      icon: <Clock className="w-4 h-4" /> 
    },
    'Confirmed': { 
      label: 'Confirmed', 
      color: 'text-blue-400', 
      icon: <CheckCircle className="w-4 h-4" /> 
    },
    'Processing': { 
      label: 'Processing', 
      color: 'text-cyan-400', 
      icon: <Package className="w-4 h-4" /> 
    },
    'Shipped': { 
      label: 'Shipped', 
      color: 'text-purple-400', 
      icon: <Truck className="w-4 h-4" /> 
    },
    'PartiallyShipped': { 
      label: 'Partially Shipped', 
      color: 'text-indigo-400', 
      icon: <Truck className="w-4 h-4" /> 
    },
    'Delivered': { 
      label: 'Delivered', 
      color: 'text-green-400', 
      icon: <CheckCircle className="w-4 h-4" /> 
    },
    'Cancelled': { 
      label: 'Cancelled', 
      color: 'text-red-400', 
      icon: <XCircle className="w-4 h-4" /> 
    },
    'Returned': { 
      label: 'Returned', 
      color: 'text-orange-400', 
      icon: <Package className="w-4 h-4" /> 
    },
    'Refunded': { 
      label: 'Refunded', 
      color: 'text-pink-400', 
      icon: <XCircle className="w-4 h-4" /> 
    },
  };

  return statusMap[status] || statusMap['Pending'];
};

// ✅ NEW: Check if order is paid
const isOrderPaid = (order: Order): boolean => {
  if (!order.payments || order.payments.length === 0) return false;
  
  const firstPayment = order.payments[0];
  const paidStatuses = ['Successful', 'Completed', 'Captured'];
  
  return paidStatuses.includes(firstPayment.status);
};

// ✅ NEW: Get payment status display
const getPaymentStatusDisplay = (order: Order) => {
  if (!order.payments || order.payments.length === 0) {
    return { 
      label: 'No Payment', 
      color: 'text-red-400', 
      icon: <AlertTriangle className="w-4 h-4" /> 
    };
  }

  const payment = order.payments[0];
  const statusMap: Record<string, { label: string; color: string; icon: JSX.Element }> = {
    'Successful': { 
      label: 'Paid', 
      color: 'text-green-400', 
      icon: <CheckCircle className="w-4 h-4" /> 
    },
    'Completed': { 
      label: 'Paid', 
      color: 'text-green-400', 
      icon: <CheckCircle className="w-4 h-4" /> 
    },
    'Captured': { 
      label: 'Captured', 
      color: 'text-emerald-400', 
      icon: <CheckCircle className="w-4 h-4" /> 
    },
    'Pending': { 
      label: 'Payment Pending', 
      color: 'text-yellow-400', 
      icon: <Clock className="w-4 h-4" /> 
    },
    'Processing': { 
      label: 'Processing Payment', 
      color: 'text-blue-400', 
      icon: <Loader2 className="w-4 h-4 animate-spin" /> 
    },
    'Failed': { 
      label: 'Payment Failed', 
      color: 'text-red-400', 
      icon: <XCircle className="w-4 h-4" /> 
    },
    'Refunded': { 
      label: 'Refunded', 
      color: 'text-purple-400', 
      icon: <XCircle className="w-4 h-4" /> 
    },
  };

  return statusMap[payment.status] || statusMap['Pending'];
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
  const [showNotificationPreview, setShowNotificationPreview] = useState(false);

  // Mark Ready - no form needed
  const [readyConfirmed, setReadyConfirmed] = useState(false);

  // Mark Collected (Click & Collect only)
  const [collectedData, setCollectedData] = useState({
    collectedBy: '',
    collectorIDType: '',
    collectorIDNumber: '',
  });

  // Update Status
  const [statusData, setStatusData] = useState<{
    newStatus: OrderStatus;
    adminNotes: string;
  }>({
    newStatus: order.status,
    adminNotes: '',
  });

  // Create Shipment (Home Delivery only)
  const [shipmentData, setShipmentData] = useState({
    trackingNumber: '',
    carrier: '',
    shippingMethod: '',
    notes: '',
    selectedItems: [] as { orderItemId: string; quantity: number }[],
  });

  // Mark Delivered
  const [deliveredData, setDeliveredData] = useState({
    shipmentId: order.shipments && order.shipments.length > 0 ? order.shipments[0].id : '',
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

  // ✅ Get available statuses dynamically based on delivery method
  const availableStatuses = getValidStatusTransitions(order.status, order.deliveryMethod);

  // ✅ Check payment status
  const isPaid = isOrderPaid(order);
  const paymentDisplay = getPaymentStatusDisplay(order);

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
      setShowNotificationPreview(false);
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
        shipmentId: order.shipments && order.shipments.length > 0 ? order.shipments[0].id : '',
        deliveredAt: new Date().toISOString().slice(0, 16),
        deliveryNotes: '',
        receivedBy: '',
      });
      setCancelData({
        cancellationReason: '',
        restoreInventory: true,
        initiateRefund: isPaid, // ✅ Auto-check refund if order is paid
        cancelledBy: '',
      });
    }
  }, [isOpen, action, order.status, order.shipments, isPaid]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // ✅ Payment validation for shipment/delivery actions
    if (['create-shipment', 'mark-delivered'].includes(action) && !isPaid) {
      toast.error('⚠️ Cannot proceed: Order payment is not completed');
      return;
    }

    setLoading(true);

    try {
      switch (action) {
        case 'mark-ready':
          // ✅ Only for Click & Collect
          if (order.deliveryMethod !== 'ClickAndCollect') {
            toast.error('This action is only available for Click & Collect orders');
            return;
          }
          await orderService.markReady(order.id);
          toast.success('✅ Order marked as ready for collection');
          break;

        case 'mark-collected':
          // ✅ Only for Click & Collect
          if (order.deliveryMethod !== 'ClickAndCollect') {
            toast.error('This action is only available for Click & Collect orders');
            return;
          }
          const collectedRequest: MarkCollectedRequest = {
            orderId: order.id,
            collectedBy: collectedData.collectedBy,
            collectorIDType: collectedData.collectorIDType,
            collectorIDNumber: collectedData.collectorIDNumber,
          };
          await orderService.markCollected(collectedRequest);
          toast.success('✅ Order marked as collected');
          break;

        case 'update-status':
          const statusRequest: UpdateStatusRequest = {
            orderId: order.id,
            newStatus: statusData.newStatus,
            adminNotes: statusData.adminNotes || undefined,
          };
          await orderService.updateStatus(statusRequest);
          toast.success('✅ Order status updated successfully');
          break;

        case 'create-shipment':
          // ✅ Only for Home Delivery
          if (order.deliveryMethod !== 'HomeDelivery') {
            toast.error('This action is only available for Home Delivery orders');
            return;
          }
          const shipmentRequest: CreateShipmentRequest = {
            orderId: order.id,
            trackingNumber: shipmentData.trackingNumber,
            carrier: shipmentData.carrier,
            shippingMethod: shipmentData.shippingMethod,
            notes: shipmentData.notes || undefined,
            shipmentItems: shipmentData.selectedItems,
          };
          await orderService.createShipment(shipmentRequest);
          toast.success('✅ Shipment created successfully');
          break;

        case 'mark-delivered':
          // ✅ Only for Home Delivery with shipments
          if (order.deliveryMethod !== 'HomeDelivery') {
            toast.error('This action is only available for Home Delivery orders');
            return;
          }
          const deliveredRequest: MarkDeliveredRequest = {
            orderId: order.id,
            shipmentId: deliveredData.shipmentId,
            deliveredAt: new Date(deliveredData.deliveredAt).toISOString(),
            deliveryNotes: deliveredData.deliveryNotes || undefined,
            receivedBy: deliveredData.receivedBy || undefined,
          };
          await orderService.markDelivered(deliveredRequest);
          toast.success('✅ Order marked as delivered');
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
          toast.success('✅ Order cancelled successfully');
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

  // ✅ NEW: Get notification message preview
  const getNotificationPreview = () => {
    switch (action) {
      case 'mark-ready':
        return `Hi ${order.customerName}, your order ${order.orderNumber} is ready for collection at our store. Please bring a valid ID.`;
      case 'mark-collected':
        return `Hi ${order.customerName}, your order ${order.orderNumber} has been collected. Thank you for shopping with us!`;
      case 'create-shipment':
        return `Hi ${order.customerName}, your order ${order.orderNumber} has been shipped via ${shipmentData.carrier}. Tracking: ${shipmentData.trackingNumber}`;
      case 'mark-delivered':
        return `Hi ${order.customerName}, your order ${order.orderNumber} has been delivered. Thank you for your purchase!`;
      case 'cancel-order':
        return `Hi ${order.customerName}, your order ${order.orderNumber} has been cancelled. ${cancelData.initiateRefund ? 'A refund will be processed within 3-5 business days.' : ''}`;
      default:
        return '';
    }
  };

  const renderModalContent = () => {
    // ✅ NEW: Payment Warning Banner (shown for shipment/delivery actions)
    const PaymentWarning = () => {
      if (!['create-shipment', 'mark-delivered'].includes(action)) return null;
      
      if (!isPaid) {
        return (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Payment Not Completed</p>
              <p className="text-xs text-red-300 mt-1">
                This order's payment is <strong>{paymentDisplay.label}</strong>. You cannot proceed with shipment/delivery until payment is confirmed.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-green-400" />
          <p className="text-xs text-green-400">
            Payment Status: <strong>{paymentDisplay.label}</strong> ✅
          </p>
        </div>
      );
    };

    // ✅ NEW: Notification Preview Toggle
    const NotificationPreviewToggle = () => {
      const hasNotification = ['mark-ready', 'mark-collected', 'create-shipment', 'mark-delivered', 'cancel-order'].includes(action);
      
      if (!hasNotification) return null;

      return (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowNotificationPreview(!showNotificationPreview)}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {showNotificationPreview ? 'Hide' : 'Preview'} customer notification
          </button>
          
          {showNotificationPreview && (
            <div className="mt-2 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Customer will receive:</p>
              <p className="text-xs text-cyan-200 italic">"{getNotificationPreview()}"</p>
            </div>
          )}
        </div>
      );
    };

    switch (action) {
      case 'mark-ready':
        // ✅ Only for Click & Collect
        if (order.deliveryMethod !== 'ClickAndCollect') {
          return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                This action is only available for Click & Collect orders.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <MapPin className="h-6 w-6 text-cyan-400" />
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

            <NotificationPreviewToggle />
          </div>
        );

      case 'mark-collected':
        // ✅ Only for Click & Collect
        if (order.deliveryMethod !== 'ClickAndCollect') {
          return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                This action is only available for Click & Collect orders.
              </p>
            </div>
          );
        }

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

            <NotificationPreviewToggle />
          </div>
        );

      case 'update-status':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Clock className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-white font-medium">Update Order Status</p>
                <p className="text-sm text-slate-400">Change the current status of this order.</p>
              </div>
            </div>
<div className="flex items-center justify-between gap-4 p-3 bg-slate-800/60 border border-white/10 rounded-lg">
  {/* Left : Order Current Status */}
  <div className="flex items-center gap-3">
    <Clock className="h-5 w-5 text-amber-400" />
    <div>
      <p className="text-sm text-slate-400">Order Status</p>
      <p className="text-base font-semibold text-amber-400">
        Pending
      </p>
    </div>
  </div>

  {/* Right : Payment Status */}
  <div className="text-right">
    <p className="text-sm text-slate-400">Payment Status</p>
    <p className="text-base font-semibold text-emerald-400">
      Paid
    </p>
  </div>
</div>


            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Status <span className="text-red-500">*</span>
              </label>
              {/* ✅ Conditionally show only valid statuses based on delivery method */}
              {availableStatuses.length > 0 ? (
                <select
                  value={statusData.newStatus}
                  onChange={(e) =>
                    setStatusData({ ...statusData, newStatus: e.target.value as OrderStatus })
                  }
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                >
                  <option value={order.status}>Select new status</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getStatusDisplayInfo(status).label}
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

            {/* ✅ Show info about delivery method restrictions */}
            {order.deliveryMethod === 'ClickAndCollect' && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-400">
                  <strong>Note:</strong> For Click & Collect orders, use "Mark Ready" action to prepare order for collection.
                </p>
              </div>
            )}

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
        // ✅ Only for Home Delivery
        if (order.deliveryMethod !== 'HomeDelivery') {
          return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                This action is only available for Home Delivery orders. Click & Collect orders don't require shipments.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Truck className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-white font-medium">Create Shipment</p>
                <p className="text-sm text-slate-400">Add tracking and shipment details.</p>
              </div>
            </div>

            <PaymentWarning />

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
                  disabled={!isPaid}
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
                  disabled={!isPaid}
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
                disabled={!isPaid}
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
                disabled={!isPaid}
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
                        disabled={!isPaid}
                      />
                      <span className="text-slate-400 text-sm ml-2">/ {item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <NotificationPreviewToggle />
          </div>
        );

      case 'mark-delivered':
        // ✅ Only for Home Delivery
        if (order.deliveryMethod !== 'HomeDelivery') {
          return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                This action is only available for Home Delivery orders. For Click & Collect, use "Mark Collected" instead.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-white font-medium">Mark Order as Delivered</p>
                <p className="text-sm text-slate-400">Record delivery confirmation details.</p>
              </div>
            </div>

            <PaymentWarning />

            {order.shipments && order.shipments.length > 0 ? (
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
                    disabled={!isPaid}
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
                    disabled={!isPaid}
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
                    disabled={!isPaid}
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
                    disabled={!isPaid}
                  />
                </div>

                <NotificationPreviewToggle />
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

            {/* ✅ Payment Status Info for Cancellation */}
            {isPaid && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Payment Detected</p>
                  <p className="text-xs text-amber-300 mt-1">
                    This order has been paid ({paymentDisplay.label}). Consider initiating a refund.
                  </p>
                </div>
              </div>
            )}

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
                <span className="text-sm text-slate-300">
                  Initiate refund {isPaid && <span className="text-amber-400">(Recommended)</span>}
                </span>
              </label>
            </div>

            <NotificationPreviewToggle />
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
    // ✅ Payment check for shipment/delivery actions
    if (['create-shipment', 'mark-delivered'].includes(action) && !isPaid) {
      return false;
    }

    switch (action) {
      case 'mark-ready':
        return readyConfirmed && order.deliveryMethod === 'ClickAndCollect';
      case 'mark-collected':
        return (
          order.deliveryMethod === 'ClickAndCollect' &&
          collectedData.collectedBy &&
          collectedData.collectorIDType &&
          collectedData.collectorIDNumber
        );
      case 'update-status':
        return (
          statusData.newStatus !== order.status &&
          availableStatuses.includes(statusData.newStatus)
        );
      case 'create-shipment':
        return (
          order.deliveryMethod === 'HomeDelivery' &&
          shipmentData.trackingNumber &&
          shipmentData.carrier &&
          shipmentData.shippingMethod &&
          shipmentData.selectedItems.some((item) => item.quantity > 0)
        );
      case 'mark-delivered':
        return (
          order.deliveryMethod === 'HomeDelivery' &&
          deliveredData.shipmentId &&
          deliveredData.deliveredAt &&
          order.shipments &&
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
          <div>
            <h2 className="text-xl font-semibold text-white">{getModalTitle()}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Order #{order.orderNumber} • {order.deliveryMethod === 'ClickAndCollect' ? 'Click & Collect' : 'Home Delivery'}
            </p>
          </div>
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
              title={!isFormValid() && !isPaid && ['create-shipment', 'mark-delivered'].includes(action) ? 'Payment must be completed first' : ''}
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
