// components/admin/TakeoverRequestModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
  onSaveBeforeApprove?: () => Promise<void>;
}

export default function TakeoverRequestModal({
  productId,
  isOpen,
  onClose,
  request,
  onActionComplete,
  onSaveBeforeApprove
}: TakeoverRequestModalProps) {
  const toast = useToast();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRunningRef = useRef(false);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  // Timer useEffect
  useEffect(() => {
    if (!request) return;
    
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    
    if (timerRunningRef.current) return;
    
    const initialTime = request.timeLeftSeconds || 0;
    setTimeLeft(initialTime);
    
    if (initialTime <= 0) {
      toast.warning('Request expired');
      onActionComplete();
      onClose();
      return;
    }
    
    timerRunningRef.current = true;
    
    timerIdRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newValue = prev - 1;
        
        if (newValue <= 0) {
          if (timerIdRef.current) clearInterval(timerIdRef.current);
          timerRunningRef.current = false;
          toast.warning('Request expired');
          onActionComplete();
          onClose();
          return 0;
        }
        
        return newValue;
      });
    }, 1000);

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      timerRunningRef.current = false;
    };
  }, [request?.id]);

  useEffect(() => {
    if (isOpen) {
      setSelectedAction('approve');
      setResponseMessage('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getTimeUrgencyClass = (seconds: number): string => {
    if (seconds <= 30) return 'text-red-400 animate-pulse';
    if (seconds <= 60) return 'text-orange-400';
    return 'text-orange-300';
  };

  const validateMessage = (): boolean => {
    if (!responseMessage.trim()) {
      toast.error('Please enter a response message');
      return false;
    }
    if (responseMessage.length > 200) {
      toast.error('Message too long (max 200 characters)');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!request || !validateMessage()) return;
    setIsSubmitting(true);

    try {
      let response;

      if (selectedAction === 'approve') {
        if (onSaveBeforeApprove) {
          toast.info('Saving changes...', { autoClose: 2000 });
          
          try {
            await onSaveBeforeApprove();
            toast.success('Changes saved!', { autoClose: 1500 });
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (saveError: any) {
            toast.error('Failed to save changes. Approval cancelled.');
            setIsSubmitting(false);
            return;
          }
        }
        
        response = await productLockService.approveTakeoverRequest(
          request.id,
          responseMessage.trim()
        );
        
        if (response.success) {
          toast.success('Takeover approved! Lock released.');
          onActionComplete();
          onClose();
          setTimeout(() => router.push('/admin/products'), 1000);
        } else {
          throw new Error(response.message || 'Failed to approve');
        }
      } else {
        response = await productLockService.rejectTakeoverRequest(
          request.id,
          responseMessage.trim()
        );
        
        if (response.success) {
          toast.success('Request rejected successfully');
          onActionComplete();
          onClose();
        } else {
          throw new Error(response.message || 'Failed to reject');
        }
      }
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('expired')) {
        toast.error('Request has expired');
        onActionComplete();
        onClose();
      } else {
        toast.error(error.message || 'Action failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) handleSubmit();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSubmitting, responseMessage]);

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={isSubmitting ? undefined : onClose}
      />
      
      <div className="relative bg-slate-900 border-2 border-orange-500/30 rounded-xl shadow-2xl shadow-orange-500/20 max-w-lg w-full">
        
        {/* ✅ COMPACT HEADER WITH TIMER */}
        <div className="px-5 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Takeover Request</h2>
                <p className="text-xs text-orange-400">
                  From <span className="font-semibold">{request.requestedByEmail}</span>
                </p>
              </div>
            </div>
            
            {/* ✅ TIMER IN HEADER - Compact */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg px-3 py-1.5">
              <Clock className={cn("w-4 h-4", getTimeUrgencyClass(timeLeft))} />
              <div className="text-right">
                <div className="text-[9px] text-orange-300 uppercase font-medium leading-tight">Expires</div>
                <div className={cn("text-lg font-bold leading-tight", getTimeUrgencyClass(timeLeft))}>
                  {formatTimeLeft(timeLeft)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ✅ COMPACT BODY */}
        <div className="px-5 py-4 space-y-3">
          
          {/* Product & Message */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5">Product:</p>
              <p className="text-sm font-semibold text-white">{request.productName}</p>
            </div>

            {request.requestMessage && (
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Message:</p>
                <p className="text-xs text-slate-300 italic">"{request.requestMessage}"</p>
              </div>
            )}
          </div>

          {/* ✅ INLINE ACTION BUTTONS - Icon then Text */}
          <div>
            <p className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-orange-400 rounded-full" />
              Choose Action:
            </p>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction('approve')}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all",
                  selectedAction === 'approve'
                    ? "bg-green-500/20 border-green-500 shadow-lg"
                    : "bg-slate-800/40 border-slate-700 hover:border-green-500/50"
                )}
              >
                <CheckCircle className={cn("w-5 h-5", selectedAction === 'approve' ? "text-green-400" : "text-green-400/50")} />
                <span className="text-sm font-bold text-white">Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('reject')}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all",
                  selectedAction === 'reject'
                    ? "bg-red-500/20 border-red-500 shadow-lg"
                    : "bg-slate-800/40 border-slate-700 hover:border-red-500/50"
                )}
              >
                <XCircle className={cn("w-5 h-5", selectedAction === 'reject' ? "text-red-400" : "text-red-400/50")} />
                <span className="text-sm font-bold text-white">Reject</span>
              </button>
            </div>

            {/* Checkbox Description */}
            <div className="mt-2 flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={selectedAction === 'approve'}
                readOnly
                className="w-3.5 h-3.5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-0"
              />
              <p className="text-[11px] text-slate-300">
                {selectedAction === 'approve' 
                  ? 'Release lock & allow editing' 
                  : 'Keep lock & deny access'}
              </p>
            </div>
          </div>

          {/* Response */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-orange-400" />
              Response <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={selectedAction === 'approve' 
                ? 'Approved. You can edit now.' 
                : 'Sorry, still working on it.'}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
              rows={2}
              maxLength={200}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-slate-500">Be polite</p>
              <p className="text-[10px] text-slate-500">{responseMessage.length}/200</p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-200">
              Response will be sent to <span className="font-semibold">{request.requestedByEmail}</span>
            </p>
          </div>
        </div>

        {/* ✅ COMPACT FOOTER */}
        <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-800 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-all border border-slate-700 disabled:opacity-50"
          >
            Close
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !responseMessage.trim()}
            className={cn(
              "flex-1 px-4 py-2 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
              selectedAction === 'approve' 
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
            )}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                {selectedAction === 'approve' ? (
                  <><CheckCircle className="w-4 h-4" /> APPROVE</>
                ) : (
                  <><XCircle className="w-4 h-4" /> REJECT</>
                )}
              </>
            )}
          </button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="px-5 pb-2">
          <p className="text-[10px] text-slate-600 text-center">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</kbd> to close • 
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 ml-1">Ctrl+Enter</kbd> to submit
          </p>
        </div>
      </div>
    </div>
  );
}
