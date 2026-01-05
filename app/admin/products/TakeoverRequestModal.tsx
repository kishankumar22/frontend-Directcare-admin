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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // ✅ Timer with improved cleanup
  useEffect(() => {
    if (!request) return;
    
    setTimeLeft(request.timeLeftSeconds);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('⏰ Takeover request expired');
          onActionComplete(); // ✅ Cleanup state
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request]); // ✅ Removed toast & onClose dependencies

  // ✅ Reset form on open
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('approve');
      setResponseMessage('');
      
      // ✅ Auto-focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
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

  // ✅ Improved validation
  const validateMessage = (): boolean => {
    if (!responseMessage.trim()) {
      toast.error('⚠️ Please enter a response message');
      return false;
    }
    
    if (responseMessage.length > 200) {
      toast.error('⚠️ Message too long (max 200 characters)');
      return false;
    }
    
    return true;
  };

  // ✅ Improved submit handler
  const handleSubmit = async () => {
    if (!request) return;
    if (!validateMessage()) return;

    setIsSubmitting(true);

    try {
      let response;

      if (selectedAction === 'approve') {
        response = await productLockService.approveTakeoverRequest(
          request.id,
          responseMessage.trim()
        );
        
        if (response.success) {
          toast.success('✅ Takeover request approved! Redirecting...');
          onActionComplete();
          onClose();
          
          setTimeout(() => {
            router.push('/admin/products');
          }, 1000);
        } else {
          throw new Error(response.message || 'Failed to approve');
        }
      } else {
        response = await productLockService.rejectTakeoverRequest(
          request.id,
          responseMessage.trim()
        );
        
        if (response.success) {
          toast.success('❌ Takeover request rejected');
          onActionComplete();
          onClose();
        } else {
          throw new Error(response.message || 'Failed to reject');
        }
      }
    } catch (error: any) {
      console.error('Takeover action error:', error);
      
      // ✅ Specific error messages
      if (error.message?.toLowerCase().includes('network')) {
        toast.error('❌ Network error. Check your connection.');
      } else if (error.message?.toLowerCase().includes('expired')) {
        toast.error('⏰ Request has expired');
        onActionComplete();
        onClose();
      } else if (error.message?.toLowerCase().includes('unauthorized')) {
        toast.error('🔒 Unauthorized. Please login again.');
        router.push('/login');
      } else {
        toast.error(error.message || '❌ Action failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
      
      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSubmitting, responseMessage]);

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop - ✅ Disable click during submit */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={isSubmitting ? undefined : onClose}
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
          
          {/* Close Button - ✅ Disable during submit */}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:rotate-90 rounded-lg transition-all duration-300 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/40 to-red-500/40 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 border-2 border-orange-400/60 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-300" />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-base font-bold text-center mb-1 bg-gradient-to-r from-orange-300 via-orange-200 to-red-300 bg-clip-text text-transparent">
            Takeover Request
          </h2>
          
          {/* Subtitle */}
          <p className="text-center text-slate-300 text-xs mb-3">
            <span className="text-white font-semibold">{request.requestedByEmail}</span> wants to edit
          </p>

          {/* Product Name */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 mb-2">
            <p className="text-[10px] text-slate-400 mb-0.5">Product:</p>
            <p className="text-xs text-white font-semibold line-clamp-1">{request.productName}</p>
          </div>

          {/* Request Message */}
          {request.requestMessage && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 mb-2">
              <p className="text-[10px] text-blue-300 mb-0.5">Message:</p>
              <p className="text-xs text-slate-200 italic line-clamp-2">"{request.requestMessage}"</p>
            </div>
          )}

          {/* Time Left */}
          <div className="flex items-center justify-center gap-2 mb-3 bg-gradient-to-r from-orange-500/15 to-red-500/15 border-2 border-orange-500/40 rounded-lg p-2">
            <Clock className={cn("w-4 h-4", getTimeUrgencyClass(timeLeft))} />
            <div>
              <p className="text-[9px] text-orange-200/70 font-medium uppercase">Expires in</p>
              <p className={cn("text-sm font-bold", getTimeUrgencyClass(timeLeft))}>
                {formatTimeLeft(timeLeft)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <span className="w-1 h-4 bg-gradient-to-b from-orange-400 to-red-400 rounded-full inline-block" />
              Choose Action:
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Approve */}
              <button
                type="button"
                onClick={() => setSelectedAction('approve')}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all disabled:opacity-50",
                  selectedAction === 'approve'
                    ? "bg-green-500/20 border-green-500/60 shadow-lg"
                    : "bg-slate-800/40 border-slate-700/50 hover:border-green-500/40"
                )}
              >
                <CheckCircle className={cn("w-4 h-4 mb-0.5", selectedAction === 'approve' ? "text-green-400" : "text-green-400/60")} />
                <span className="text-xs font-bold text-white">Approve</span>
              </button>

              {/* Reject */}
              <button
                type="button"
                onClick={() => setSelectedAction('reject')}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all disabled:opacity-50",
                  selectedAction === 'reject'
                    ? "bg-red-500/20 border-red-500/60 shadow-lg"
                    : "bg-slate-800/40 border-slate-700/50 hover:border-red-500/40"
                )}
              >
                <XCircle className={cn("w-4 h-4 mb-0.5", selectedAction === 'reject' ? "text-red-400" : "text-red-400/60")} />
                <span className="text-xs font-bold text-white">Reject</span>
              </button>
            </div>

            {/* Description */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2">
              <p className="text-xs text-slate-300 text-center">
                {selectedAction === 'approve' ? "✅ Release lock & allow editing" : "❌ Keep lock & deny access"}
              </p>
            </div>
          </div>

          {/* Response Message - ✅ With ref for auto-focus */}
          <div className="mb-2">
            <label className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <Send className="w-3 h-3 text-orange-400" />
              Response <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={selectedAction === 'approve' ? 'Approved. You can edit now.' : 'Sorry, still working.'}
              className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 transition-all resize-none"
              rows={2}
              maxLength={200}
              disabled={isSubmitting}
            />
            <p className="text-[9px] text-slate-400 mt-0.5 text-right">
              {responseMessage.length}/200
              {responseMessage.length >= 180 && (
                <span className="text-orange-400 ml-1">(almost full)</span>
              )}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-700/60 hover:bg-slate-600/70 border-2 border-slate-600/60 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
              title="ESC"
            >
              Close
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !responseMessage.trim()}
              title="Ctrl+Enter"
              className={cn(
                "flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xl",
                selectedAction === 'approve' && "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-green-400/50",
                selectedAction === 'reject' && "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-2 border-red-400/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {selectedAction === 'approve' && <><CheckCircle className="w-3.5 h-3.5" /> APPROVE</>}
                  {selectedAction === 'reject' && <><XCircle className="w-3.5 h-3.5" /> REJECT</>}
                </>
              )}
            </button>
          </div>

          {/* ✅ Keyboard shortcuts hint */}
          <p className="text-[9px] text-slate-500 text-center mt-2">
            Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-600">ESC</kbd> to close • 
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-600 ml-1">Ctrl+Enter</kbd> to submit
          </p>
        </div>
      </div>
    </div>
  );
}
