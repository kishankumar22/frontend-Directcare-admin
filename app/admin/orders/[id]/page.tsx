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
  Receipt,
  History,
  RotateCcw,
  Split,
} from 'lucide-react';
import {
  orderService,
  Order,
  formatCurrency,
  formatDate,
} from '@/lib/services/orders';
import { useToast } from '@/components/CustomToast';
import OrderActionsModal from '../OrderActionsModal';
import OrderEditModal from '../OrderEditModal';
import {
  orderEditService,
  RefundReason,
  RefundHistory,
  OrderHistory,
} from '@/lib/services/OrderEdit';
import RefundHistorySection from '../RefundHistorySection';
import EditHistorySection from '../EditHistorySection';
import RefundModals from '../RefundModals';

// Types
type CollectionStatus = 'Pending' | 'Ready' | 'Collected' | 'Expired';
type OrderStatus = Order['status'];
type PaymentStatus = Order['payments'][0]['status'];

// ===========================
// STATUS INFO FUNCTIONS
// ===========================

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
    Pending: {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Order has been placed and is awaiting confirmation.',
      nextAction: 'Confirm order to proceed with fulfillment',
    },
    Confirmed: {
      label: 'Confirmed',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Order has been confirmed and payment received.',
      nextAction: 'Move to processing to start fulfillment',
    },
    Processing: {
      label: 'Processing',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      description: 'Order is being prepared and packed.',
      nextAction: 'Create shipment or Mark Ready',
    },
    Shipped: {
      label: 'Shipped',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <Truck className="h-3 w-3" />,
      description: 'Order has been dispatched and is in transit.',
      nextAction: 'Mark as delivered',
    },
    PartiallyShipped: {
      label: 'Partially Shipped',
      color: 'text-purple-300',
      bgColor: 'bg-purple-400/10',
      icon: <Truck className="h-3 w-3" />,
      description: 'Some items have been shipped.',
      nextAction: 'Ship remaining items',
    },
    Delivered: {
      label: 'Delivered',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Order has been successfully delivered.',
      nextAction: 'No further action required',
    },
    Cancelled: {
      label: 'Cancelled',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <XCircle className="h-3 w-3" />,
      description: 'Order has been cancelled.',
      nextAction: 'Process refund if payment completed',
    },
    Returned: {
      label: 'Returned',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      icon: <Package className="h-3 w-3" />,
      description: 'Customer has returned the order.',
      nextAction: 'Inspect items and process refund',
    },
    Refunded: {
      label: 'Refunded',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Payment has been refunded.',
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
    }
  );
};

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
    Pending: {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Payment is being processed.',
    },
    Processing: {
      label: 'Processing',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      description: 'Payment is being verified.',
    },
    Completed: {
      label: 'Paid',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Payment successfully completed.',
    },
    Captured: {
      label: 'Captured',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle2 className="h-3 w-3" />,
      description: 'Payment has been captured.',
    },
    Successful: {
      label: 'Successful',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      icon: <CheckCircle className="h-3 w-3" />,
      description: 'Payment completed successfully.',
    },
    Failed: {
      label: 'Failed',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <XCircle className="h-3 w-3" />,
      description: 'Payment failed.',
    },
    Refunded: {
      label: 'Refunded',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Payment has been refunded.',
    },
    PartiallyRefunded: {
      label: 'Partially Refunded',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: <RefreshCw className="h-3 w-3" />,
      description: 'Part of payment refunded.',
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
    Pending: {
      label: 'Pending',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: <Clock className="h-3 w-3" />,
      description: 'Order is being prepared.',
    },
    Ready: {
      label: 'Ready',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      icon: <PackageCheck className="h-3 w-3" />,
      description: 'Order is ready for collection.',
    },
    Collected: {
      label: 'Collected',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: <CheckCircle2 className="h-3 w-3" />,
      description: 'Order has been collected.',
    },
    Expired: {
      label: 'Expired',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: <AlertTriangle className="h-3 w-3" />,
      description: 'Collection deadline passed.',
    },
  };
  return status ? statusMap[status] : null;
};

// ===========================
// ✅ IMPROVED STATUS BADGE WITH VISIBLE LABEL
// ===========================

const StatusBadge = ({
  statusInfo,
  label,
}: {
  statusInfo: ReturnType<typeof getOrderStatusInfo>;
  label: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 100);
  };

  return (
    <div
      className="relative inline-block group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ✅ IMPROVED: Label visible above badge */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.bgColor.replace('/10', '/20')} cursor-help transition-all hover:scale-105`}
        >
          {statusInfo.icon}
          {statusInfo.label}
          <Info className="h-3 w-3 opacity-50" />
        </span>
      </div>

      {showTooltip && (
        <div
          className="fixed z-[9999] w-80 p-3 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl"
          style={{
            top: 'auto',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '0.5rem',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-slate-600" />
          <div className="flex items-start gap-2">
            <div className={`p-1.5 rounded-lg ${statusInfo.bgColor} flex-shrink-0`}>
              {statusInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${statusInfo.color} mb-1`}>
                {label}: {statusInfo.label}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{statusInfo.description}</p>
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

// ===========================
// ✅ CONSOLIDATED ACTION BUTTONS (Merged Quick + Financial)
// ===========================

const getAllAvailableActions = (order: Order, canRefund: boolean) => {
  const actions: Array<{
    label: string;
    action: string;
    icon: JSX.Element;
    color: string;
    category: 'workflow' | 'financial' | 'edit';
  }> = [];

  const status = order.status;
  const deliveryMethod = order.deliveryMethod;

  // ✅ Workflow Actions (Click & Collect)
  if (deliveryMethod === 'ClickAndCollect') {
    if (status === 'Processing' && order.collectionStatus !== 'Ready') {
      actions.push({
        label: 'Mark Ready',
        action: 'mark-ready',
        icon: <PackageCheck className="h-3.5 w-3.5" />,
        color: 'bg-cyan-600 hover:bg-cyan-700',
        category: 'workflow',
      });
    }

    if (order.collectionStatus === 'Ready' && status !== 'Delivered') {
      actions.push({
        label: 'Mark Collected',
        action: 'mark-collected',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: 'bg-emerald-600 hover:bg-emerald-700',
        category: 'workflow',
      });
    }
  }

  // ✅ Workflow Actions (Home Delivery)
  if (deliveryMethod === 'HomeDelivery') {
    if (
      (status === 'Confirmed' || status === 'Processing') &&
      (!order.shipments || order.shipments.length === 0)
    ) {
      actions.push({
        label: 'Create Shipment',
        action: 'create-shipment',
        icon: <Truck className="h-3.5 w-3.5" />,
        color: 'bg-purple-600 hover:bg-purple-700',
        category: 'workflow',
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
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        color: 'bg-green-600 hover:bg-green-700',
        category: 'workflow',
      });
    }
  }

  // ✅ Status Update
  if (!['Delivered', 'Cancelled', 'Refunded', 'Returned'].includes(status)) {
    actions.push({
      label: 'Update Status',
      action: 'update-status',
      icon: <Edit className="h-3.5 w-3.5" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      category: 'edit',
    });
  }

  // ✅ Cancel Order
  if (!['Delivered', 'Cancelled', 'Refunded', 'Returned'].includes(status)) {
    actions.push({
      label: 'Cancel Order',
      action: 'cancel-order',
      icon: <PackageX className="h-3.5 w-3.5" />,
      color: 'bg-red-600 hover:bg-red-700',
      category: 'edit',
    });
  }

  // ✅ Financial Actions - Always available (regardless of status)
  actions.push({
    label: 'Regenerate Invoice',
    action: 'regenerate-invoice',
    icon: <Receipt className="h-3.5 w-3.5" />,
    color: 'bg-indigo-600 hover:bg-indigo-700',
    category: 'financial',
  });

  // ✅ View Histories
  actions.push({
    label: 'View Refund History',
    action: 'view-refund-history',
    icon: <History className="h-3.5 w-3.5" />,
    color: 'bg-violet-600 hover:bg-violet-700',
    category: 'financial',
  });

  actions.push({
    label: 'View Edit History',
    action: 'view-edit-history',
    icon: <History className="h-3.5 w-3.5" />,
    color: 'bg-slate-600 hover:bg-slate-700',
    category: 'financial',
  });

  // ✅ Refund Actions (conditional)
  if (canRefund) {
    actions.push({
      label: 'Full Refund',
      action: 'full-refund',
      icon: <RotateCcw className="h-3.5 w-3.5" />,
      color: 'bg-red-600 hover:bg-red-700',
      category: 'financial',
    });

    actions.push({
      label: 'Partial Refund',
      action: 'partial-refund',
      icon: <Split className="h-3.5 w-3.5" />,
      color: 'bg-orange-600 hover:bg-orange-700',
      category: 'financial',
    });
  }

  return actions;
};

// ===========================
// ✅ REGENERATE INVOICE MODAL
// ===========================

const RegenerateInvoiceModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  orderNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendToCustomer: boolean, notes: string) => void;
  loading: boolean;
  orderNumber: string;
}) => {
  const [sendToCustomer, setSendToCustomer] = useState(false);
  const [notes, setNotes] = useState('');

  // ✅ ADD: Reset function
  const handleClose = () => {
    // Reset form to default values
    setSendToCustomer(false);
    setNotes('');
    // Then call parent onClose
    onClose();
  };

  // ✅ ADD: Also reset on successful confirm
  const handleConfirm = () => {
    onConfirm(sendToCustomer, notes);
    // Note: Don't reset here, let parent handle success and close
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Receipt className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Regenerate Invoice</h3>
            <p className="text-sm text-slate-400">Order #{orderNumber}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This will generate a new invoice PDF for this order.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for regeneration..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendToCustomer}
              onChange={(e) => setSendToCustomer(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">
              Send updated invoice to customer via email
            </span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          {/* ✅ CHANGED: Use handleClose instead of onClose */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


// ===========================
// MAIN COMPONENT
// ===========================

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  // ✅ ADD: Refs for auto-scroll
  const refundHistoryRef = useRef<HTMLDivElement>(null);
  const editHistoryRef = useRef<HTMLDivElement>(null);
  // Refund & History States
  const [refundHistoryOpen, setRefundHistoryOpen] = useState(false);
  const [editHistoryOpen, setEditHistoryOpen] = useState(false);
  const [refundHistory, setRefundHistory] = useState<RefundHistory | null>(null);
  const [editHistory, setEditHistory] = useState<OrderHistory[]>([]);
  const [loadingRefundHistory, setLoadingRefundHistory] = useState(false);
  const [loadingEditHistory, setLoadingEditHistory] = useState(false);

  // Refund Modal States
  const [showFullRefundModal, setShowFullRefundModal] = useState(false);
  const [showPartialRefundModal, setShowPartialRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState<RefundReason>(RefundReason.CustomerRequest);
  const [refundNotes, setRefundNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [partialRefundItems, setPartialRefundItems] = useState<
    Array<{ orderItemId: string; quantity: number; refundAmount: number }>
  >([]);

  // ✅ NEW: Invoice Regeneration Modal State
  const [showRegenerateInvoiceModal, setShowRegenerateInvoiceModal] = useState(false);
  const [regeneratingInvoice, setRegeneratingInvoice] = useState(false);

  useEffect(() => {
    if (orderId) fetchOrderDetails();
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
      toast.error(error.message || 'Failed to load order details', { autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundHistory = async () => {
    try {
      setLoadingRefundHistory(true);
      const result = await orderEditService.getRefundHistory(orderId);
      setRefundHistory(result);
      toast.success(`✅ Loaded ${result.refunds.length} refund records`, { autoClose: 3000 });
    } catch (error: any) {
      console.error('Error fetching refund history:', error);
      toast.error(error.message || 'Failed to load refund history', { autoClose: 5000 });
    } finally {
      setLoadingRefundHistory(false);
    }
  };

  const fetchEditHistory = async () => {
    try {
      setLoadingEditHistory(true);
      const result = await orderEditService.getEditHistory(orderId);
      setEditHistory(result);
      toast.success(`✅ Loaded ${result.length} edit records`, { autoClose: 3000 });
    } catch (error: any) {
      console.error('Error fetching edit history:', error);
      toast.error(error.message || 'Failed to load edit history', { autoClose: 5000 });
    } finally {
      setLoadingEditHistory(false);
    }
  };

// ✅ CORRECTED - Service expects single object parameter
const handleRegenerateInvoice = async (sendToCustomer: boolean, notes: string) => {
  try {
    setRegeneratingInvoice(true);
    
    const result = await orderEditService.regenerateInvoice({
      orderId: orderId,
      notes: notes || "Admin requested invoice regeneration",
      sendToCustomer: sendToCustomer,
    });
    
    toast.success("Invoice regenerated successfully", { autoClose: 4000 });
    
    if (sendToCustomer) {
      toast.info("Invoice sent to customer email", { autoClose: 4000 });
    }
    
    // ✅ Use env variable for API URL
    if (result.pdfUrl) {
      const fullUrl = result.pdfUrl.startsWith('http') 
        ? result.pdfUrl 
        : `${process.env.NEXT_PUBLIC_API_URL}${result.pdfUrl}`;
      
      window.open(fullUrl, "_blank");
    }
    
    // ✅ Close modal - will auto-reset via handleClose
    setShowRegenerateInvoiceModal(false);
    
  } catch (error: any) {
    console.error("Error regenerating invoice", error);
    toast.error(error.message || "Failed to regenerate invoice", { autoClose: 5000 });
  } finally {
    setRegeneratingInvoice(false);
  }
};



  const handleFullRefund = async () => {
    if (!refundNotes.trim()) {
      toast.error('Please provide refund notes', { autoClose: 4000 });
      return;
    }

    if (!order) return;

    if (!confirm(`Process full refund of ${formatCurrency(order.totalAmount, order.currency)}?`)) {
      return;
    }

    try {
      setProcessingRefund(true);
      const result = await orderEditService.processFullRefund({
        orderId,
        reason: refundReason,
        reasonDetails: orderEditService.getRefundReasonLabel(refundReason),
        adminNotes: refundNotes,
        restoreInventory: true,
        sendCustomerNotification: true,
      });

      toast.success(`✅ Refund processed successfully`, { autoClose: 4000 });
      toast.info(`💰 Refunded: ${formatCurrency(result.refundAmount, order.currency)}`, {
        autoClose: 6000,
      });

      setShowFullRefundModal(false);
      setRefundNotes('');
      fetchOrderDetails();
      fetchRefundHistory();
    } catch (error: any) {
      console.error('Error processing full refund:', error);
      toast.error(error.message || 'Failed to process refund', { autoClose: 5000 });
    } finally {
      setProcessingRefund(false);
    }
  };

  const handlePartialRefund = async () => {
    const selectedItems = partialRefundItems.filter((r) => r.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to refund', { autoClose: 4000 });
      return;
    }

    if (!refundNotes.trim()) {
      toast.error('Please provide refund notes', { autoClose: 4000 });
      return;
    }

    if (!order) return;

    const totalRefund = selectedItems.reduce((sum, item) => sum + item.refundAmount, 0);

    if (!confirm(`Process partial refund of ${formatCurrency(totalRefund, order.currency)}?`)) {
      return;
    }

    try {
      setProcessingRefund(true);
      const result = await orderEditService.processPartialRefund({
        orderId,
        refundAmount: totalRefund,
        reason: refundReason,
        reasonDetails: orderEditService.getRefundReasonLabel(refundReason),
        adminNotes: refundNotes,
        sendCustomerNotification: true,
      });

      toast.success(`✅ Partial refund processed successfully`, { autoClose: 4000 });
      toast.info(`💰 Refunded: ${formatCurrency(result.refundAmount, order.currency)}`, {
        autoClose: 6000,
      });

      setShowPartialRefundModal(false);
      setPartialRefundItems([]);
      setRefundNotes('');
      fetchOrderDetails();
      fetchRefundHistory();
    } catch (error: any) {
      console.error('Error processing partial refund:', error);
      toast.error(error.message || 'Failed to process refund', { autoClose: 5000 });
    } finally {
      setProcessingRefund(false);
    }
  };

  // ✅ UPDATED: Handle all actions including financial ones
// ✅ UPDATED: Handle all actions including auto-scroll
const handleAction = (action: string) => {
  if (action === 'regenerate-invoice') {
    setShowRegenerateInvoiceModal(true);
    return;
  }

  if (action === 'view-refund-history') {
    setRefundHistoryOpen(true);
    if (!refundHistory) {
      fetchRefundHistory();
    }
    // ✅ Auto-scroll after state update
    setTimeout(() => {
      refundHistoryRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
    return;
  }

  if (action === 'view-edit-history') {
    setEditHistoryOpen(true);
    if (editHistory.length === 0) {
      fetchEditHistory();
    }
    // ✅ Auto-scroll after state update
    setTimeout(() => {
      editHistoryRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
    return;
  }

  if (action === 'full-refund') {
    setShowFullRefundModal(true);
    return;
  }

  if (action === 'partial-refund') {
    if (order) {
      setPartialRefundItems(
        order.orderItems.map((item) => ({
          orderItemId: item.id,
          quantity: 0,
          refundAmount: 0,
        }))
      );
    }
    setShowPartialRefundModal(true);
    return;
  }

  setSelectedAction(action);
  setActionModalOpen(true);
};


  const handleActionSuccess = () => {
    setActionModalOpen(false);
    fetchOrderDetails();
    toast.success('✅ Action completed successfully!', { autoClose: 3000 });
  };

  const isCollectionExpired = () => {
    if (!order?.collectionExpiryDate) return false;
    return new Date(order.collectionExpiryDate) < new Date();
  };

  const isOrderEditable = () => {
    if (!order) return false;
    const editableStatuses = ['Pending', 'Confirmed'];
    return editableStatuses.includes(order.status);
  };

  const canRefund = () => {
    if (!order) return false;
    const hasCompletedPayment = order.payments?.some(
      (p) => p.status === 'Completed' || p.status === 'Captured' || p.status === 'Successful'
    );
    return hasCompletedPayment && order.status !== 'Refunded';
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
  const allActions = getAllAvailableActions(order, canRefund());

  return (
    <div className="space-y-3 pb-6">
      {/* ✅ IMPROVED HEADER WITH VISIBLE LABELS */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
              <Hash className="h-3 w-3 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Complete order information and management
            </p>
          </div>
        </div>

        {/* ✅ STATUS BADGES WITH CLEAR LABELS */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge statusInfo={statusInfo} label="Order" />
          {paymentStatusInfo && <StatusBadge statusInfo={paymentStatusInfo as any} label="Payment" />}
          {order.deliveryMethod === 'ClickAndCollect' && collectionStatusInfo && (
            <StatusBadge statusInfo={collectionStatusInfo as any} label="Collection" />
          )}
        </div>
      </div>

      {/* Collection Expiry Warning */}
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

      {/* ✅ CONSOLIDATED ACTION BUTTONS (Single Row, Dynamic) */}
      {allActions.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Zap className="h-4 w-4 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white">Quick Actions</h3>
            <span className="text-xs text-slate-500 ml-2">
              ({allActions.length} actions available)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allActions.map((btn, index) => (
              <button
                key={index}
                onClick={() => handleAction(btn.action)}
                className={`px-3 py-2 ${btn.color} text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105`}
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
      {/* Modals */}
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

      {actionModalOpen && order && (
        <OrderActionsModal
          isOpen={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          order={order}
          action={selectedAction}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* ✅ NEW: Regenerate Invoice Modal */}
      <RegenerateInvoiceModal
        isOpen={showRegenerateInvoiceModal}
        onClose={() => setShowRegenerateInvoiceModal(false)}
        onConfirm={handleRegenerateInvoice}
        loading={regeneratingInvoice}
        orderNumber={order.orderNumber}
      />

      {/* Refund Modals */}
      <RefundModals
        order={order}
        showFullRefundModal={showFullRefundModal}
        showPartialRefundModal={showPartialRefundModal}
        onCloseFullRefund={() => setShowFullRefundModal(false)}
        onClosePartialRefund={() => setShowPartialRefundModal(false)}
        onRefundSuccess={() => {
          if (showFullRefundModal) {
            handleFullRefund();
          } else if (showPartialRefundModal) {
            handlePartialRefund();
          }
        }}
      />

  {/* ✅ History Sections with Refs */}
<div ref={refundHistoryRef}>
  <RefundHistorySection
    orderId={orderId}
    currency={order.currency}
    refundHistory={refundHistory}
    loading={loadingRefundHistory}
    isOpen={refundHistoryOpen}
    onToggle={() => setRefundHistoryOpen(!refundHistoryOpen)}
    onFetch={fetchRefundHistory}
  />
</div>

<div ref={editHistoryRef}>
  <EditHistorySection
    orderId={orderId}
    currency={order.currency}
    editHistory={editHistory}
    loading={loadingEditHistory}
    isOpen={editHistoryOpen}
    onToggle={() => setEditHistoryOpen(!editHistoryOpen)}
    onFetch={fetchEditHistory}
  />
</div>

    </div>
  );
}
