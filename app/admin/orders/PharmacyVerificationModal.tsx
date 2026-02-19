'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { orderService } from '@/lib/services/orders';
import { useToast } from '@/app/admin/_components/CustomToast';
import ConfirmDialog from '../_components/ConfirmDialog';

interface Props {
  isOpen: boolean;
  orderId: string;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

export default function PharmacyVerificationModal({
  isOpen,
  orderId,
  action,
  onClose,
  onSuccess,
}: Props) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;
useEffect(() => {
  if (!isOpen) {
    setNote('');
    setShowConfirm(false);
    setLoading(false);
  }
}, [isOpen]);
const handleSubmit = () => {
  if (action === 'reject' && !note.trim()) {
    toast.error('Rejection reason is required');
    return;
  }

  setShowConfirm(true);
};
const handleConfirm = async () => {
  try {
    setLoading(true);

    if (action === 'approve') {
      await orderService.pharmacyApprove(orderId, { note });
      toast.success('Order approved successfully');
    } else {
      await orderService.pharmacyReject(orderId, { reason: note });
      toast.success('Order rejected successfully');
    }

    onSuccess();
    onClose();
  } catch (err: any) {
    toast.error(err.message || 'Action failed');
  } finally {
    setLoading(false);
    setShowConfirm(false);
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {action === 'approve' ? 'Approve Pharmacy Order' : 'Reject Pharmacy Order'}
          </h3>
          <button onClick={onClose}>
            <X className="text-slate-400 hover:text-white" />
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            action === 'approve'
              ? 'Optional approval note...'
              : 'Enter rejection reason...'
          }
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          rows={4}
        />

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2 ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : action === 'approve' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Approve
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Reject
              </>
            )}
          </button>
        </div>
      </div>
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleConfirm}
  title={
    action === 'approve'
      ? 'Confirm Pharmacy Approval'
      : 'Confirm Pharmacy Rejection'
  }
  message={
    action === 'approve'
      ? 'Are you sure you want to approve this pharmacy order?'
      : `Are you sure you want to reject this pharmacy order?

Reason:
${note}`
  }
  confirmText={action === 'approve' ? 'Approve' : 'Reject'}
  cancelText="Cancel"
  isLoading={loading}
/>


    </div>
  );
}
