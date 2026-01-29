'use client';

import { JSX, useEffect, useRef, useState } from 'react';
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
  RefreshCw,
  PackageCheck,
  IdCard,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Info,
  Building2,
  Hash,
  ChevronRight,
  Zap,
  Shield,
  TrendingUp,
  Lock,
  
} from 'lucide-react';
import {
  orderService,
  Order,
  formatCurrency,
  formatDate,
} from '@/lib/services/orders'; // ✅ FIXED IMPORT PATH
import { useToast } from '@/components/CustomToast';
import OrderActionsModal from '../OrderActionsModal';
import OrderEditModal from '../OrderEditModal';

// ✅ Collection Status Types
type CollectionStatus = 'Pending' | 'Ready' | 'Collected' | 'Expired';
type OrderStatus = Order['status'];
type PaymentStatus = Order['payments'][0]['status'];

// ✅ Enhanced Status Info with detailed descriptions
const getOrderStatusInfo = (status: OrderStatus) => {
  const statusMap: Record<
    OrderStatus,
    { 
      label: string; 
      color: string; 
      bgColor: string; 
      icon: JSX.Element;
      description: string;
      nextAction?: string;
    }
  > = {
    'Pending': {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Order has been placed and is awaiting confirmation. Payment may still be processing.',
      nextAction: 'Confirm order to proceed with fulfillment',
    },
    'Confirmed': {
      label: 'Confirmed',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Order has been confirmed and payment received. Ready to begin processing.',
      nextAction: 'Move to processing to start fulfillment',
    },
    'Processing': {
      label: 'Processing',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      description: 'Order is being prepared and packed. Items are being picked from inventory.',
      nextAction: 'Create shipment (Home Delivery) or Mark Ready (Click & Collect)',
    },
    'Shipped': {
      label: 'Shipped',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <Truck className="h-3 w-3" />,
      description: 'Order has been dispatched and is in transit. Tracking information available.',
      nextAction: 'Mark as delivered once customer receives the package',
    },
    'PartiallyShipped': {
      label: 'Partially Shipped',
      color: 'text-purple-300',
      bgColor: 'bg-purple-400/10',
      icon: <Truck className="h-3 w-3" />,
      description: 'Some items have been shipped. Remaining items will be sent in separate shipments.',
      nextAction: 'Ship remaining items or mark as delivered when all items arrive',
    },
    'Delivered': {
      label: 'Delivered',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Order has been successfully delivered to the customer. Transaction complete.',
      nextAction: 'No further action required unless customer requests return',
    },
    'Cancelled': {
      label: 'Cancelled',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <XCircle className="h-3 w-3" />,
      description: 'Order has been cancelled. Inventory restored and refund initiated if applicable.',
      nextAction: 'Process refund if payment was completed',
    },
    'Returned': {
      label: 'Returned',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      icon: <Package className="h-3 w-3" />,
      description: 'Customer has returned the order. Items are back in inventory.',
      nextAction: 'Inspect items and process refund',
    },
    'Refunded': {
      label: 'Refunded',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Payment has been refunded to the customer. Transaction reversed.',
      nextAction: 'No further action required',
    },
  };
  return (
    statusMap[status] || {
      label: 'Unknown',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      icon: <AlertCircle className="h-3 w-3" />,
      description: 'Status unknown',
      nextAction: 'Contact support',
    }
  );
};

// ✅ Enhanced Payment Status Info
const getPaymentStatusInfo = (status: PaymentStatus) => {
  const statusMap: Record<
    PaymentStatus,
    { 
      label: string; 
      color: string; 
      bgColor: string; 
      icon: JSX.Element;
      description: string;
    }
  > = {
    'Pending': {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Payment is being processed. Waiting for confirmation from payment gateway.',
    },
    'Processing': {
      label: 'Processing',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      description: 'Payment is currently being verified by the payment processor.',
    },
    'Completed': {
      label: 'Paid',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Payment successfully completed. Funds have been received and confirmed.',
    },
    'Captured': {
      label: 'Captured',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle2 className="h-3 w-3" />,
      description: 'Payment has been captured and funds transferred successfully.',
    },
    'Successful': {
      label: 'Successful',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Payment transaction completed successfully without issues.',
    },
    'Failed': {
      label: 'Failed',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <XCircle className="h-3 w-3" />,
      description: 'Payment failed. Common reasons: insufficient funds, card declined, or technical error.',
    },
    'Refunded': {
      label: 'Refunded',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Payment has been refunded to customer. Funds returned to original payment method.',
    },
    'PartiallyRefunded': {
      label: 'Partially Refunded',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Part of the payment has been refunded. Remaining amount still with merchant.',
    },
  };
  return (
    statusMap[status] || {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Payment status unknown',
    }
  );
};

// ✅ Enhanced Collection Status Info
const getCollectionStatusInfo = (status: CollectionStatus | undefined) => {
  const statusMap: Record<
    CollectionStatus,
    { 
      label: string; 
      color: string; 
      bgColor: string; 
      icon: JSX.Element;
      description: string;
    }
  > = {
    'Pending': {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Order is being prepared. Customer will be notified when ready for collection.',
    },
    'Ready': {
      label: 'Ready for Collection',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      icon: <PackageCheck className="h-3 w-3" />,
      description: 'Order is packed and ready. Customer can collect anytime during store hours.',
    },
    'Collected': {
      label: 'Collected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle2 className="h-3 w-3" />,
      description: 'Order has been collected by customer. ID verification completed.',
    },
    'Expired': {
      label: 'Expired',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <AlertTriangle className="h-3 w-3" />,
      description: 'Collection deadline has passed. Contact customer to arrange new collection time.',
    },
  };
  return status ? statusMap[status] : null;
};
// ✅ Status Badge Component with Fixed Tooltip
const StatusBadge = ({ 
  statusInfo, 
  label 
}: { 
  statusInfo: ReturnType<typeof getOrderStatusInfo>; 
  label: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    // ✅ Small delay before hiding
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100);
  };

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Badge */}
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.bgColor.replace('/10', '/20')} cursor-help transition-all hover:scale-105`}
      >
        {statusInfo.icon}
        {statusInfo.label}
        <Info className="h-3 w-3 opacity-50" />
      </span>

      {/* ✅ Tooltip with proper positioning */}
      {showTooltip && (
        <div 
          className="fixed z-[9999] w-80 p-3 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl"
          style={{
            // ✅ Dynamic positioning to prevent overflow
            top: 'auto',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '0.5rem'
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow indicator */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-slate-600" />
          
          <div className="flex items-start gap-2">
            <div className={`p-1.5 rounded-lg ${statusInfo.bgColor} flex-shrink-0`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${statusInfo.color} mb-1`}>
                {label}: {statusInfo.label}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {statusInfo.description}
              </p>
              {statusInfo.nextAction && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-cyan-400 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Next: {statusInfo.nextAction}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




// ✅ Get Available Actions based on Order Status & Delivery Method
const getAvailableActions = (order: Order) => {
  const actions: Array<{
    label: string;
    action: string;
    icon: JSX.Element;
    color: string;
  }> = [];

  const status = order.status;
  const deliveryMethod = order.deliveryMethod;

  // ✅ Click & Collect Flow
  if (deliveryMethod === 'ClickAndCollect') {
    if (status === 'Processing' && order.collectionStatus !== 'Ready') {
      actions.push({
        label: 'Mark Ready',
        action: 'mark-ready',
        icon: <PackageCheck className="h-4 w-4" />,
        color: 'bg-cyan-600 hover:bg-cyan-700',
      });
    }

    if (order.collectionStatus === 'Ready' && status !== 'Delivered') {
      actions.push({
        label: 'Mark Collected',
        action: 'mark-collected',
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'bg-emerald-600 hover:bg-emerald-700',
      });
    }
  }

  // ✅ Home Delivery Flow
  if (deliveryMethod === 'HomeDelivery') {
    if (
      (status === 'Confirmed' || status === 'Processing') &&
      (!order.shipments || order.shipments.length === 0)
    ) {
      actions.push({
        label: 'Create Shipment',
        action: 'create-shipment',
        icon: <Truck className="h-4 w-4" />,
        color: 'bg-purple-600 hover:bg-purple-700',
      });
    }

    if (
      (status === 'Shipped' || status === 'PartiallyShipped') &&
      order.shipments &&
      order.shipments.length > 0
    ) {
      actions.push({
        label: 'Mark Delivered',
        action: 'mark-delivered',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-600 hover:bg-green-700',
      });
    }
  }

  // ✅ Update Status - Available for most statuses
  if (!['Delivered', 'Cancelled', 'Refunded', 'Returned'].includes(status)) {
    actions.push({
      label: 'Update Status',
      action: 'update-status',
      icon: <Edit className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
    });
  }

  // ✅ Cancel Order
  if (!['Delivered', 'Cancelled', 'Refunded', 'Returned'].includes(status)) {
    actions.push({
      label: 'Cancel Order',
      action: 'cancel-order',
      icon: <PackageX className="h-4 w-4" />,
      color: 'bg-red-600 hover:bg-red-700',
    });
  }

  return actions;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
// Add state for edit modal
const [editModalOpen, setEditModalOpen] = useState(false);

const isOrderEditable = () => {
  if (!order) return false;

  const editableStatuses = ['Pending', 'Confirmed'];
  return editableStatuses.includes(order.status);
};


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
    toast.success('✅ Action completed successfully!');
  };

  // ✅ Check if collection is expired
  const isCollectionExpired = () => {
    if (!order?.collectionExpiryDate) return false;
    return new Date(order.collectionExpiryDate) < new Date();
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
  const firstPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
  const paymentStatusInfo = firstPayment ? getPaymentStatusInfo(firstPayment.status) : null;
  const collectionStatusInfo = order.collectionStatus
    ? getCollectionStatusInfo(order.collectionStatus as CollectionStatus)
    : null;
  const availableActions = getAvailableActions(order);

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors group"
            title="Back to Orders List"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                {order.orderNumber}
              </h1>
              <span className="text-xs text-slate-500" title="Unique Order Identifier">
                <Hash className="h-3 w-3 inline" />
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Complete order information and management
            </p>
          </div>
        </div>

        {/* ✅ Status Badges with Tooltips */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge statusInfo={statusInfo} label="Order Status" />

          {paymentStatusInfo && (
            <StatusBadge statusInfo={paymentStatusInfo as any} label="Payment Status" />
          )}

          {order.deliveryMethod === 'ClickAndCollect' && collectionStatusInfo && (
            <StatusBadge statusInfo={collectionStatusInfo as any} label="Collection Status" />
          )}
        </div>
      </div>

      {/* ✅ Collection Expiry Warning */}
      {order.deliveryMethod === 'ClickAndCollect' &&
        order.collectionExpiryDate &&
        isCollectionExpired() &&
        order.collectionStatus !== 'Collected' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-sm">⚠️ Collection Deadline Passed</p>
              <p className="text-red-400/80 text-xs mt-0.5">
                Expired on {formatDate(order.collectionExpiryDate)} • Contact customer immediately
              </p>
            </div>
          </div>
        )}

      {/* ✅ Action Buttons */}
      {availableActions.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableActions.map((btn, index) => (
              <button
                key={index}
                onClick={() => handleAction(btn.action)}
                className={`px-4 py-2 ${btn.color} text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105`}
                title={`Click to ${btn.label.toLowerCase()}`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Order Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Customer Information */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-violet-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <User className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Customer Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Full Name
              </p>
              <p className="text-white font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email Address
              </p>
              <p className="text-white font-medium flex items-center gap-2 text-sm break-all">
                <Mail className="h-4 w-4 text-cyan-400" />
                {order.customerEmail}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone Number
              </p>
              <p className="text-white font-medium flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-green-400" />
                {order.customerPhone || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Account Type
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                  order.isGuestOrder
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
                title={order.isGuestOrder ? 'Guest checkout - no account created' : 'Registered user with account'}
              >
                {order.isGuestOrder ? (
                  <>
                    <User className="h-3 w-3" />
                    Guest Order
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3" />
                    Registered User
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-green-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <PoundSterling className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Order Summary</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between" title="Total before taxes and fees">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-white font-medium">
                {formatCurrency(order.subtotalAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between" title="Value Added Tax (VAT)">
              <span className="text-slate-400">Tax</span>
              <span className="text-white font-medium">
                {formatCurrency(order.taxAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between" title="Shipping and handling charges">
              <span className="text-slate-400">Shipping</span>
              <span className="text-white font-medium">
                {formatCurrency(order.shippingAmount, order.currency)}
              </span>
            </div>
            {order.clickAndCollectFee && order.clickAndCollectFee > 0 && (
              <div className="flex justify-between" title="Click & Collect service fee">
                <span className="text-slate-400">Click & Collect Fee</span>
                <span className="text-white font-medium">
                  {formatCurrency(order.clickAndCollectFee, order.currency)}
                </span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="flex justify-between" title="Promotional discount applied">
                <span className="text-slate-400">Discount</span>
                <span className="text-pink-400 font-medium">
                  -{formatCurrency(order.discountAmount, order.currency)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between" title="Final amount charged to customer">
              <span className="text-white font-bold">Total</span>
              <span className="text-white font-bold text-lg">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Delivery Method
            </p>
            {order.deliveryMethod === 'ClickAndCollect' ? (
              <span 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm border border-cyan-500/20 cursor-help"
                title="Customer will collect order from store location"
              >
                <MapPin className="h-4 w-4" />
                Click & Collect
              </span>
            ) : (
              <span 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-sm border border-purple-500/20 cursor-help"
                title="Order will be shipped to customer address"
              >
                <Truck className="h-4 w-4" />
                Home Delivery
              </span>
            )}
          </div>
        </div>

        {/* Important Dates */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-orange-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Important Dates</h3>
          </div>
          <div className="space-y-3">
            <div title="Date and time when order was placed">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Order Date
              </p>
              <p className="text-white font-medium text-sm">{formatDate(order.orderDate)}</p>
            </div>
            {order.deliveryMethod === 'ClickAndCollect' && order.collectionExpiryDate && (
              <div title="Deadline to collect order from store">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Collection Expires
                </p>
                <p
                  className={`font-medium text-sm flex items-center gap-1.5 ${
                    isCollectionExpired() ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {formatDate(order.collectionExpiryDate)}
                  {isCollectionExpired() && <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />}
                </p>
              </div>
            )}
            {order.estimatedDispatchDate && (
              <div title="Expected date for order dispatch">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Estimated Dispatch
                </p>
                <p className="text-white font-medium text-sm">
                  {formatDate(order.estimatedDispatchDate)}
                </p>
              </div>
            )}
            {order.dispatchedAt && (
              <div title="Actual date when order was dispatched">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Dispatched At
                </p>
                <p className="text-white font-medium text-sm">{formatDate(order.dispatchedAt)}</p>
              </div>
            )}
            {order.readyForCollectionAt && (
              <div title="Date when order was marked ready for collection">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <PackageCheck className="h-3 w-3" />
                  Ready for Collection
                </p>
                <p className="text-white font-medium text-sm">
                  {formatDate(order.readyForCollectionAt)}
                </p>
              </div>
            )}
            {order.collectedAt && (
              <div title="Date when customer collected the order">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Collected At
                </p>
                <p className="text-white font-medium text-sm">{formatDate(order.collectedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Collection Information */}
      {order.deliveryMethod === 'ClickAndCollect' && order.collectedBy && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <IdCard className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Collection Information</h3>
            <span className="text-xs text-slate-400 ml-auto" title="Verified collector details">
              <Shield className="h-3 w-3 inline" /> Verified
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div title="Name of person who collected the order">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Collected By
              </p>
              <p className="text-white font-medium">{order.collectedBy}</p>
            </div>
            <div title="Type of identification document shown">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <IdCard className="h-3 w-3" />
                ID Type
              </p>
              <p className="text-white font-medium">{order.collectorIDType || 'Not recorded'}</p>
            </div>
            <div title="Identification document number (partially hidden for security)">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                ID Number
              </p>
              {/* <p className="text-white font-medium">
                {order.collectorIDNumber ? `****${order.collectorIDNumber.slice(-4)}` : 'Not recorded'}
              </p> */}
            </div>
          </div>
        </div>
      )}

{/* Order Items */}
<div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-pink-500/30 transition-all">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
        <Package className="h-4 w-4 text-white" />
      </div>
      <h3 className="text-lg font-bold text-white">Order Items</h3>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded-lg" title="Total number of unique products">
        {order.orderItems.length} {order.orderItems.length === 1 ? 'Item' : 'Items'}
      </span>
      
      {/* ✅ Edit Button - Only show for Pending/Confirmed orders */}
      {isOrderEditable() ? (
        <button
          onClick={() => setEditModalOpen(true)}
          className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105"
          title="Edit order items (add/remove/update quantities)"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit Items
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400" title={`Order editing is locked for ${order.status} status`}>
          <Lock className="h-3 w-3" />
          Locked
        </div>
      )}
    </div>
  </div>
  
  {/* Status restriction message */}
  {!isOrderEditable() && (
    <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <p className="text-xs text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        <strong>Editing Restricted:</strong> Order items can only be edited when status is Pending or Confirmed. Current status: <strong>{order.status}</strong>
      </p>
    </div>
  )}

  <div className="space-y-3">
    {order.orderItems.map((item, index) => (
      <div
        key={item.id}
        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-pink-500/30 transition-all group"
        title={`Product: ${item.productName}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate group-hover:text-pink-400 transition-colors">
              {item.productName}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              SKU: {item.productSku}
            </p>
            {item.variantName && (
              <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {item.variantName}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold text-sm" title={`${item.quantity} × ${formatCurrency(item.unitPrice, order.currency)}`}>
            {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
          </p>
          <p className="text-green-400 font-bold text-lg" title="Line item total">
            {formatCurrency(item.totalPrice, order.currency)}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>
      {/* ✅ Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Billing Address */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Billing Address</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-white font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-400" />
              {order.billingAddress.firstName} {order.billingAddress.lastName}
            </p>
            {order.billingAddress.company && (
              <p className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {order.billingAddress.company}
              </p>
            )}
            <p className="text-slate-400">{order.billingAddress.addressLine1}</p>
            {order.billingAddress.addressLine2 && (
              <p className="text-slate-400">{order.billingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.billingAddress.city}, {order.billingAddress.state}{' '}
              {order.billingAddress.postalCode}
            </p>
            <p className="text-slate-400 font-medium">{order.billingAddress.country}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-purple-500/30 transition-all group">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Shipping Address</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="text-white font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-purple-400" />
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            {order.shippingAddress.company && (
              <p className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {order.shippingAddress.company}
              </p>
            )}
            <p className="text-slate-400">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p className="text-slate-400">{order.shippingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>
            <p className="text-slate-400 font-medium">{order.shippingAddress.country}</p>
          </div>
        </div>
      </div>

      {/* ✅ Payments */}
      {order.payments && order.payments.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-violet-500/30 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Payments</h3>
            <span className="text-xs text-slate-400 ml-auto" title="Total payment transactions">
              {order.payments.length} {order.payments.length === 1 ? 'Transaction' : 'Transactions'}
            </span>
          </div>
          <div className="space-y-3">
            {order.payments.map((payment) => {
              const paymentInfo = getPaymentStatusInfo(payment.status);
              return (
                <div
                  key={payment.id}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-violet-500/30 transition-all"
                  title={`Payment via ${payment.paymentMethod}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white font-medium capitalize text-sm flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-violet-400" />
                        {payment.paymentMethod}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Transaction ID: {payment.transactionId || 'Pending'}
                      </p>
                      {payment.processedAt && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Processed: {formatDate(payment.processedAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-lg" title="Payment amount">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <StatusBadge statusInfo={paymentInfo as any} label="Payment" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Shipments */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Shipments</h3>
            <span className="text-xs text-slate-400 ml-auto" title="Total shipments created">
              {order.shipments.length} {order.shipments.length === 1 ? 'Shipment' : 'Shipments'}
            </span>
          </div>
          <div className="space-y-3">
            {order.shipments.map((shipment, index) => (
              <div
                key={shipment.id}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/30 transition-all"
                title={`Shipment #${index + 1}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </span>
                    <p className="text-white font-medium text-sm" title="Tracking number for this shipment">
                      Tracking: {shipment.trackingNumber || 'Not available'}
                    </p>
                  </div>
                  <span 
                    className="inline-block px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    title="Shipping carrier"
                  >
                    {shipment.carrier || 'N/A'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <p title="Shipping method used">
                    <Truck className="h-3 w-3 inline mr-1" />
                    Method: {shipment.shippingMethod || 'Standard'}
                  </p>
                  {shipment.shippedAt && (
                    <p title="Date when shipment was dispatched">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Shipped: {formatDate(shipment.shippedAt)}
                    </p>
                  )}
                  {shipment.deliveredAt && (
                    <p title="Date when shipment was delivered">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Delivered: {formatDate(shipment.deliveredAt)}
                    </p>
                  )}
                  {shipment.notes && (
                    <p className="mt-2 text-slate-300" title="Additional shipment notes">
                      <FileText className="h-3 w-3 inline mr-1" />
                      Notes: {shipment.notes}
                    </p>
                  )}
                </div>
                {shipment.shipmentItems && shipment.shipmentItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2" title="Items included in this shipment">
                      <Package className="h-3 w-3 inline mr-1" />
                      Items in Shipment: {shipment.shipmentItems.length}
                    </p>
                    <div className="space-y-1">
                      {shipment.shipmentItems.map((item) => (
                        <p key={item.id} className="text-xs text-white flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-purple-400" />
                          Quantity: {item.quantity}
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

      {/* ✅ Notes */}
      {order.notes && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Order Notes</h3>
            <span className="text-xs text-slate-400 ml-auto" title="Special instructions or comments">
              <Info className="h-3 w-3 inline" /> Customer Notes
            </span>
          </div>
          <p className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            {order.notes}
          </p>
        </div>
      )}

      {/* ✅ Add Edit Modal at the end before closing div */}
{editModalOpen && order && (
  <OrderEditModal
    isOpen={editModalOpen}
    onClose={() => setEditModalOpen(false)}
    order={order}
    onSuccess={() => {
      setEditModalOpen(false);
      fetchOrderDetails();
    }}
  />
)}

      {/* ✅ Action Modal */}
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
