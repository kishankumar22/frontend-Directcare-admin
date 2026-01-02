// components/admin/TakeoverRequestModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Send, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { productLockService } from '@/lib/services/productLockService';
import { useToast } from '@/components/CustomToast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'cancel'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!request) return;
    
    setTimeLeft(request.timeLeftSeconds);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('Takeover request expired');
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request, onClose, toast]);

  useEffect(() => {
    if (isOpen) {
      setSelectedAction('approve');
      setResponseMessage('');
    }
  }, [isOpen]);

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getTimeUrgencyClass = (seconds: number): string => {
    if (seconds <= 30) return 'text-red-400 animate-pulse';
    if (seconds <= 60) return 'text-orange-400';
    return 'text-orange-300';
  };

  const handleSubmit = async () => {
    if (!request) return;

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
            
            // ✅ FIXED: Inside if block
            setTimeout(() => {
              router.push('/admin/products');
            }, 500);
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
            // ✅ Stay on page (no redirect)
          }
          break;

        case 'cancel':
          response = await productLockService.cancelTakeoverRequest(request.id);
          if (response.success) {
            toast.success('🚫 Takeover request cancelled');
            onActionComplete();
            onClose();
            // ✅ Stay on page (no redirect)
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose}
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(251, 146, 60, 0.1), transparent 70%)'
        }}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900/95 backdrop-blur-xl border-2 border-orange-500/50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Gradient Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />
        
        {/* Content */}
        <div className="relative p-4">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:rotate-90 rounded-lg transition-all duration-300 z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/40 to-red-500/40 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 blur-xl" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 border-2 border-orange-400/60 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-orange-300" />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-lg font-bold text-center mb-1 bg-gradient-to-r from-orange-300 via-orange-200 to-red-300 bg-clip-text text-transparent">
            Takeover Request Received
          </h2>
          
          {/* Subtitle */}
          <p className="text-center text-slate-300 text-xs mb-4">
            <span className="text-white font-semibold">{request.requestedByEmail}</span> wants to edit this product
          </p>

          {/* Product Name */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/80 rounded-lg p-2.5 mb-3 shadow-lg">
            <p className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Product:
            </p>
            <p className="text-sm text-white font-semibold line-clamp-2">{request.productName}</p>
          </div>

          {/* Request Message */}
          {request.requestMessage && (
            <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/80 border border-blue-500/30 rounded-lg p-2.5 mb-3 shadow-lg">
              <p className="text-[10px] text-blue-300 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Request Message:
              </p>
              <p className="text-xs text-slate-200 leading-relaxed italic line-clamp-2">"{request.requestMessage}"</p>
            </div>
          )}

          {/* Time Left */}
          <div className="flex items-center justify-center gap-2 mb-4 bg-gradient-to-r from-orange-500/15 to-red-500/15 border-2 border-orange-500/40 rounded-lg p-2.5 shadow-lg">
            <Clock className={cn("w-4 h-4", getTimeUrgencyClass(timeLeft))} />
            <div className="flex flex-col">
              <p className="text-[9px] text-orange-200/70 font-medium uppercase tracking-wide">Expires in</p>
              <p className={cn("text-base font-bold", getTimeUrgencyClass(timeLeft))}>
                {formatTimeLeft(timeLeft)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <div className="w-1 h-4 bg-gradient-to-b from-orange-400 to-red-400 rounded-full" />
              Choose Action:
            </p>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Approve Button */}
              <button
                type="button"
                onClick={() => setSelectedAction('approve')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all duration-300",
                  selectedAction === 'approve'
                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/60 shadow-lg shadow-green-500/20"
                    : "bg-slate-800/40 border-slate-700/50 hover:border-green-500/40 hover:bg-slate-800/60"
                )}
              >
                <CheckCircle className={cn(
                  "w-5 h-5 mb-1 transition-all",
                  selectedAction === 'approve' ? "text-green-400" : "text-green-400/60"
                )} />
                <span className="text-xs font-bold text-white">Approve</span>
              </button>

              {/* Reject Button */}
              <button
                type="button"
                onClick={() => setSelectedAction('reject')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all duration-300",
                  selectedAction === 'reject'
                    ? "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/60 shadow-lg shadow-red-500/20"
                    : "bg-slate-800/40 border-slate-700/50 hover:border-red-500/40 hover:bg-slate-800/60"
                )}
              >
                <XCircle className={cn(
                  "w-5 h-5 mb-1 transition-all",
                  selectedAction === 'reject' ? "text-red-400" : "text-red-400/60"
                )} />
                <span className="text-xs font-bold text-white">Reject</span>
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => setSelectedAction('cancel')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all duration-300",
                  selectedAction === 'cancel'
                    ? "bg-gradient-to-br from-slate-600/20 to-slate-700/20 border-slate-500/60 shadow-lg shadow-slate-500/20"
                    : "bg-slate-800/40 border-slate-700/50 hover:border-slate-500/40 hover:bg-slate-800/60"
                )}
              >
                <X className={cn(
                  "w-5 h-5 mb-1 transition-all",
                  selectedAction === 'cancel' ? "text-slate-400" : "text-slate-400/60"
                )} />
                <span className="text-xs font-bold text-white">Cancel</span>
              </button>
            </div>

            {/* Dynamic Description */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5 animate-in slide-in-from-top duration-300">
              <p className="text-xs text-slate-300 text-center leading-relaxed">
                {selectedAction === 'approve' && "Release lock and allow editing"}
                {selectedAction === 'reject' && "Keep lock and deny access"}
                {selectedAction === 'cancel' && "Cancel this takeover request"}
              </p>
            </div>
          </div>

          {/* Response Message */}
          {(selectedAction === 'approve' || selectedAction === 'reject') && (
            <div className="mb-3 animate-in slide-in-from-top duration-300">
              <label className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-orange-400" />
                Response Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  selectedAction === 'approve'
                    ? 'E.g., "Approved. You can edit now."'
                    : 'E.g., "Sorry, still working on this."'
                }
                className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 transition-all resize-none"
                rows={2}
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-[9px] text-slate-400 italic">
                  {selectedAction === 'approve' ? 'Message to requester' : 'Reason for rejection'}
                </p>
                <p className={cn(
                  "text-[9px] font-medium",
                  responseMessage.length >= 180 ? "text-orange-400" : "text-slate-400"
                )}>
                  {responseMessage.length}/200
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-700/60 hover:bg-slate-600/70 border-2 border-slate-600/60 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-95"
              disabled={isSubmitting}
            >
              Close
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || ((selectedAction === 'approve' || selectedAction === 'reject') && !responseMessage.trim())}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-extrabold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide",
                selectedAction === 'approve' && "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-green-400/50",
                selectedAction === 'reject' && "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-2 border-red-400/50",
                selectedAction === 'cancel' && "bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 text-white border-2 border-slate-400/50"
              )}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {selectedAction === 'approve' && <><CheckCircle className="w-4 h-4" /> Approve</>}
                  {selectedAction === 'reject' && <><XCircle className="w-4 h-4" /> Reject</>}
                  {selectedAction === 'cancel' && <><X className="w-4 h-4" /> Cancel</>}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
