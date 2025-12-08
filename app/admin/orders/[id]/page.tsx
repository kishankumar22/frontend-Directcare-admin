'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Truck,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Loader2,
  FileText,
  PoundSterling,
} from 'lucide-react';
import {
  orderService,
  Order,
  getOrderStatusInfo,
  formatCurrency,
  formatDate,
} from '@/lib/services/orders';
import { useToast } from '@/components/CustomToast';
import OrderActionsModal from '../OrderActionsModal';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');

  // Fetch order details
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderService.getOrderById(orderId);
      if (response?.data) {
        setOrder(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error(error.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    setSelectedAction(action);
    setActionModalOpen(true);
  };

  const handleActionSuccess = () => {
    setActionModalOpen(false);
    fetchOrderDetails();
    toast.success('Action completed successfully!');
  };

  const getActionButtons = () => {
    if (!order) return null;

    const buttons = [];

    // Update Status - Always available
    buttons.push({
      label: 'Update Status',
      action: 'update-status',
      icon: <Edit className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
    });

    // Click & Collect Actions
    if (order.deliveryMethod === 'ClickAndCollect') {
      if (order.status !== 7 && order.status !== 8) {
        buttons.push({
          label: 'Mark Ready',
          action: 'mark-ready',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-cyan-600 hover:bg-cyan-700',
        });
      }
      if (order.status === 7) {
        buttons.push({
          label: 'Mark Collected',
          action: 'mark-collected',
          icon: <Package className="h-4 w-4" />,
          color: 'bg-emerald-600 hover:bg-emerald-700',
        });
      }
    }

    // Home Delivery Actions
    if (order.deliveryMethod === 'HomeDelivery') {
      if (order.status === 2 || order.status === 1) {
        buttons.push({
          label: 'Create Shipment',
          action: 'create-shipment',
          icon: <Truck className="h-4 w-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
        });
      }
      if (order.shipments.length > 0 && order.status === 3) {
        buttons.push({
          label: 'Mark Delivered',
          action: 'mark-delivered',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-600 hover:bg-green-700',
        });
      }
    }

    // Cancel Order - Not available for delivered/cancelled
    if (order.status !== 4 && order.status !== 5) {
      buttons.push({
        label: 'Cancel Order',
        action: 'cancel-order',
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-red-600 hover:bg-red-700',
      });
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Order Not Found</h2>
          <p className="text-slate-400 mb-6">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/admin/orders')}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getOrderStatusInfo(order.status);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              {order.orderNumber}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Order Details</p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
        >
          <Clock className="h-4 w-4" />
          {statusInfo.label}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-3">
          {getActionButtons()?.map((btn, index) => (
            <button
              key={index}
              onClick={() => handleAction(btn.action)}
              className={`px-4 py-2 ${btn.color} text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Information */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-violet-400" />
            Customer Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Name</p>
              <p className="text-white font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Email</p>
              <p className="text-white font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-400" />
                {order.customerEmail}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Phone</p>
              <p className="text-white font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-400" />
                {order.customerPhone || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Order Type</p>
              <span
                className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                  order.isGuestOrder
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {order.isGuestOrder ? 'Guest Order' : 'Registered User'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-green-400" />
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-white font-medium">
                {formatCurrency(order.subtotalAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tax</span>
              <span className="text-white font-medium">
                {formatCurrency(order.taxAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shipping</span>
              <span className="text-white font-medium">
                {formatCurrency(order.shippingAmount, order.currency)}
              </span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Discount</span>
                <span className="text-pink-400 font-medium">
                  -{formatCurrency(order.discountAmount, order.currency)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-white font-bold text-lg">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Delivery Method</p>
            {order.deliveryMethod === 'ClickAndCollect' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm border border-cyan-500/20">
                <MapPin className="h-4 w-4" />
                Click & Collect
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-sm border border-purple-500/20">
                <Truck className="h-4 w-4" />
                Home Delivery
              </span>
            )}
          </div>
        </div>

        {/* Order Dates */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-400" />
            Important Dates
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Order Date</p>
              <p className="text-white font-medium">{formatDate(order.orderDate)}</p>
            </div>
            {order.estimatedDispatchDate && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Estimated Dispatch</p>
                <p className="text-white font-medium">{formatDate(order.estimatedDispatchDate)}</p>
              </div>
            )}
            {order.dispatchedAt && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Dispatched At</p>
                <p className="text-white font-medium">{formatDate(order.dispatchedAt)}</p>
              </div>
            )}
            {order.readyForCollectionAt && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Ready for Collection</p>
                <p className="text-white font-medium">
                  {formatDate(order.readyForCollectionAt)}
                </p>
              </div>
            )}
            {order.collectedAt && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Collected At</p>
                <p className="text-white font-medium">{formatDate(order.collectedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-cyan-400" />
          Order Items ({order.orderItems.length})
        </h3>
        <div className="space-y-3">
          {order.orderItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
            >
              <div className="flex-1">
                <p className="text-white font-medium">{item.productName}</p>
                <p className="text-xs text-slate-400 mt-1">SKU: {item.productSku}</p>
                {item.variantName && (
                  <p className="text-xs text-cyan-400 mt-1">{item.variantName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
                </p>
                <p className="text-green-400 font-bold text-lg">
                  {formatCurrency(item.totalPrice, order.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Billing Address */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            Billing Address
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="text-white font-medium">
              {order.billingAddress.firstName} {order.billingAddress.lastName}
            </p>
            {order.billingAddress.company && (
              <p className="text-slate-400">{order.billingAddress.company}</p>
            )}
            <p className="text-slate-400">{order.billingAddress.addressLine1}</p>
            {order.billingAddress.addressLine2 && (
              <p className="text-slate-400">{order.billingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.billingAddress.city}, {order.billingAddress.state}{' '}
              {order.billingAddress.postalCode}
            </p>
            <p className="text-slate-400">{order.billingAddress.country}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-400" />
            Shipping Address
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="text-white font-medium">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            {order.shippingAddress.company && (
              <p className="text-slate-400">{order.shippingAddress.company}</p>
            )}
            <p className="text-slate-400">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p className="text-slate-400">{order.shippingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>
            <p className="text-slate-400">{order.shippingAddress.country}</p>
          </div>
        </div>
      </div>

      {/* Payments */}
      {order.payments.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            Payments ({order.payments.length})
          </h3>
          <div className="space-y-3">
            {order.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div>
                  <p className="text-white font-medium capitalize">{payment.paymentMethod}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Transaction ID: {payment.transactionId || 'N/A'}
                  </p>
                  {payment.processedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Processed: {formatDate(payment.processedAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-lg">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-lg text-xs font-medium mt-1 ${
                      payment.status === 3
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}
                  >
                    {payment.status === 3 ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipments */}
      {order.shipments.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-400" />
            Shipments ({order.shipments.length})
          </h3>
          <div className="space-y-3">
            {order.shipments.map((shipment) => (
              <div
                key={shipment.id}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">
                    Tracking: {shipment.trackingNumber || 'N/A'}
                  </p>
                  <span className="inline-block px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {shipment.carrier || 'N/A'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>Method: {shipment.shippingMethod || 'N/A'}</p>
                  {shipment.shippedAt && <p>Shipped: {formatDate(shipment.shippedAt)}</p>}
                  {shipment.deliveredAt && <p>Delivered: {formatDate(shipment.deliveredAt)}</p>}
                  {shipment.notes && <p className="mt-2 text-slate-300">Notes: {shipment.notes}</p>}
                </div>
                {shipment.shipmentItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Items in Shipment:</p>
                    <div className="space-y-1">
                      {shipment.shipmentItems.map((item) => (
                        <p key={item.id} className="text-xs text-white">
                          • Quantity: {item.quantity}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Order Notes
          </h3>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Action Modal */}
      {actionModalOpen && order && (
        <OrderActionsModal
          isOpen={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          order={order}
          action={selectedAction}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
