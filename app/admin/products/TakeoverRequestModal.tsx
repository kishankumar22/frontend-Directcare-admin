// components/admin/TakeoverRequestModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Send, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { productLockService } from '@/lib/services/productLockService';
import { useToast } from '@/components/CustomToast';
import { cn } from '@/lib/utils';

interface TakeoverRequest {
  id: string;
  productId: string;
  productName: string;
  requestedByUserId: string;
  requestedByEmail: string;
  requestMessage?: string;
  timeLeftSeconds: number;
  expiresAt: string;
}

interface TakeoverRequestModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  request: TakeoverRequest | null;
  onActionComplete: () => void;
}

export default function TakeoverRequestModal({
  productId,
  isOpen,
  onClose,
  request,
  onActionComplete
}: TakeoverRequestModalProps) {
  const toast = useToast();
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'cancel'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Update time left countdown
  useEffect(() => {
    if (!request) return;
    
    setTimeLeft(request.timeLeftSeconds);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('approve');
      setResponseMessage('');
    }
  }, [isOpen]);

  // Format time left
  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!request) return;

    // Validate responseMessage for approve/reject
    if ((selectedAction === 'approve' || selectedAction === 'reject') && !responseMessage.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      switch (selectedAction) {
        case 'approve':
          response = await productLockService.approveTakeoverRequest(
            request.id,
            responseMessage.trim()
          );
          if (response.success) {
            toast.success('✅ Takeover request approved');
            onActionComplete();
            onClose();
          }
          break;

        case 'reject':
          response = await productLockService.rejectTakeoverRequest(
            request.id,
            responseMessage.trim()
          );
          if (response.success) {
            toast.success('❌ Takeover request rejected');
            onActionComplete();
            onClose();
          }
          break;

        case 'cancel':
          response = await productLockService.cancelTakeoverRequest(request.id);
          if (response.success) {
            toast.success('🚫 Takeover request cancelled');
            onActionComplete();
            onClose();
          }
          break;
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-orange-500/40 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-white hover:bg-orange-500/30 rounded-lg transition-all"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 border-2 border-orange-400/50 flex items-center justify-center animate-pulse-slow">
            <AlertCircle className="w-8 h-8 text-orange-300" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-1 bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent">
          Takeover Request Received
        </h2>
        
        {/* Subtitle */}
        <p className="text-center text-slate-300 text-xs mb-4">
          <span className="text-white font-semibold">{request.requestedByEmail}</span> wants to edit this product
        </p>

        {/* Product Name */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-4">
          <p className="text-xs text-slate-400 mb-1">Product:</p>
          <p className="text-sm text-white font-semibold line-clamp-2">{request.productName}</p>
        </div>

        {/* Request Message */}
        {request.requestMessage && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-400 mb-1">Request Message:</p>
            <p className="text-sm text-slate-300 italic">"{request.requestMessage}"</p>
          </div>
        )}

        {/* Time Left */}
        <div className="flex items-center justify-center gap-2 mb-5 bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
          <Clock className="w-4 h-4 text-orange-400" />
          <p className="text-xs text-orange-300 font-medium">
            Expires in: <span className="font-bold">{formatTimeLeft(timeLeft)}</span>
          </p>
        </div>

        {/* Action Selection */}
        <div className="space-y-3 mb-4">
          <p className="text-xs font-medium text-slate-200">Choose Action:</p>
          
          {/* Approve Option */}
          <label 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
              selectedAction === 'approve'
                ? "bg-green-500/10 border-green-500/50"
                : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
            )}
          >
            <input
              type="radio"
              name="action"
              value="approve"
              checked={selectedAction === 'approve'}
              onChange={() => setSelectedAction('approve')}
              className="mt-0.5 w-4 h-4 accent-green-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-sm font-semibold text-white">Approve</p>
              </div>
              <p className="text-xs text-slate-400">Release lock and allow editing</p>
            </div>
          </label>

          {/* Reject Option */}
          <label 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
              selectedAction === 'reject'
                ? "bg-red-500/10 border-red-500/50"
                : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
            )}
          >
            <input
              type="radio"
              name="action"
              value="reject"
              checked={selectedAction === 'reject'}
              onChange={() => setSelectedAction('reject')}
              className="mt-0.5 w-4 h-4 accent-red-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-semibold text-white">Reject</p>
              </div>
              <p className="text-xs text-slate-400">Keep lock and deny access</p>
            </div>
          </label>

          {/* Cancel Option */}
          <label 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
              selectedAction === 'cancel'
                ? "bg-slate-500/10 border-slate-500/50"
                : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
            )}
          >
            <input
              type="radio"
              name="action"
              value="cancel"
              checked={selectedAction === 'cancel'}
              onChange={() => setSelectedAction('cancel')}
              className="mt-0.5 w-4 h-4 accent-slate-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <X className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-semibold text-white">Cancel Request</p>
              </div>
              <p className="text-xs text-slate-400">Cancel this takeover request</p>
            </div>
          </label>
        </div>

        {/* Response Message (for Approve/Reject only) */}
        {(selectedAction === 'approve' || selectedAction === 'reject') && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-200 mb-1.5">
              Response Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={
                selectedAction === 'approve'
                  ? 'E.g., "Approved. You can edit now."'
                  : 'E.g., "Sorry, still working on this product."'
              }
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 transition-all resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-slate-400">
                {selectedAction === 'approve' ? 'Approve message' : 'Rejection reason'}
              </p>
              <p className="text-[10px] text-slate-400">
                {responseMessage.length}/200
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg font-medium transition-all"
            disabled={isSubmitting}
          >
            Close
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || ((selectedAction === 'approve' || selectedAction === 'reject') && !responseMessage.trim())}
            className={cn(
              "flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5",
              selectedAction === 'approve' && "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/30",
              selectedAction === 'reject' && "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30",
              selectedAction === 'cancel' && "bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                {selectedAction === 'approve' && <><CheckCircle className="w-3.5 h-3.5" /> Approve</>}
                {selectedAction === 'reject' && <><XCircle className="w-3.5 h-3.5" /> Reject</>}
                {selectedAction === 'cancel' && <><X className="w-3.5 h-3.5" /> Cancel</>}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
