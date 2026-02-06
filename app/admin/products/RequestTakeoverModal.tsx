// components/admin/RequestTakeoverModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/app/admin/_component/CustomToast';
import { cn } from '@/lib/utils';

interface RequestTakeoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, expiryMinutes: number) => Promise<void>;
  productName: string;
  lockedByEmail: string;
  timeLeft?: number;
  isPending?: boolean;
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'expired' | null;
  responseMessage?: string;
}

export default function RequestTakeoverModal({
  isOpen,
  onClose,
  onSubmit,
  productName,
  lockedByEmail,
  timeLeft = 0,
  isPending = false,
  requestStatus = null,
  responseMessage = ''
}: RequestTakeoverModalProps) {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [message, setMessage] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLeft);

  // ✅ Timer
  useEffect(() => {
    setLocalTimeLeft(timeLeft);
    
    if (!isPending || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPending]);

  // ✅ Reset on open
  useEffect(() => {
    if (isOpen && !isPending) {
      setMessage('');
      setExpiryMinutes(5);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isPending]);

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

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('⚠️ Please enter a message');
      return;
    }
    if (message.length > 200) {
      toast.error('⚠️ Message too long (max 200 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(message.trim(), expiryMinutes);
      // ✅ DON'T close modal, just reset message
      setMessage('');
      toast.success('📤 Takeover request sent!');
    } catch (error: any) {
      toast.error(error.message || '❌ Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting && !isPending) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isSubmitting, message, isPending]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={isSubmitting ? undefined : onClose}
      />
      
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-orange-500/30 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* ✅ COMPACT HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-orange-400" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-white">
                {isPending ? 'Request Pending' : 'Request Takeover'}
              </h2>
              <p className="text-[10px] text-slate-400">
                Currently locked by <span className="text-orange-400 font-semibold">{lockedByEmail}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-white hover:bg-orange-500/20 rounded-lg transition-all hover:rotate-90 duration-300 disabled:opacity-50"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* ✅ COMPACT BODY */}
        <div className="px-4 py-3 space-y-2.5">
          
          {/* Product Name */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 mb-0.5">Product:</p>
            <p className="text-sm text-white font-semibold leading-tight">{productName}</p>
          </div>

          {/* ✅ REQUEST STATUS */}
          {isPending && (
            <>
              {/* Time Left */}
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-2.5">
                <div className="flex items-center justify-center gap-2">
                  <Clock className={cn("w-4 h-4", getTimeUrgencyClass(localTimeLeft))} />
                  <div className="text-center">
                    <div className="text-[10px] text-orange-200 uppercase font-medium">Waiting for Response</div>
                    <div className={cn("text-base font-bold", getTimeUrgencyClass(localTimeLeft))}>
                      {formatTimeLeft(localTimeLeft)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {requestStatus === 'approved' && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-xs font-bold text-green-400">Request Approved!</p>
                  </div>
                  {responseMessage && (
                    <p className="text-xs text-slate-200 italic pl-6">"{responseMessage}"</p>
                  )}
                </div>
              )}

              {requestStatus === 'rejected' && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <p className="text-xs font-bold text-red-400">Request Rejected</p>
                  </div>
                  {responseMessage && (
                    <p className="text-xs text-slate-200 italic pl-6">"{responseMessage}"</p>
                  )}
                </div>
              )}

              {requestStatus === 'expired' && (
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <p className="text-xs font-bold text-orange-400">Request Expired</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ✅ REQUEST FORM (only show if not pending) */}
          {!isPending && (
            <>
              {/* Message Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-orange-400" />
                  Your Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! Can I edit this product? I need to update..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  maxLength={200}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-slate-500">Be polite and specific</p>
                  <p className="text-[10px] text-slate-500">{message.length}/200</p>
                </div>
              </div>

              {/* ✅ EXPIRY TIME SELECTOR */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Request Expiry
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setExpiryMinutes(minutes)}
                      disabled={isSubmitting}
                      className={cn(
                        "px-2.5 py-2 rounded-lg text-xs font-semibold transition-all",
                        expiryMinutes === minutes
                          ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105 border-2 border-orange-400"
                          : "bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600"
                      )}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Expires if not responded within time
                </p>
              </div>

              {/* Info Alert */}
              <div className="flex items-start gap-2 bg-orange-500/5 border border-orange-500/20 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-100/70 leading-relaxed">
                  Request will be sent to <span className="text-orange-300 font-semibold">{lockedByEmail}</span> with {expiryMinutes} minute{expiryMinutes !== 1 ? 's' : ''} to respond.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ✅ COMPACT FOOTER */}
        <div className="px-4 py-2.5 bg-slate-900/50 border-t border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-medium transition-all border border-slate-600 disabled:opacity-50"
          >
            Close
          </button>
          
          {!isPending && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="flex-1 px-3 py-2 text-xs rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-orange-500/30"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-[10px]">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  SEND REQUEST
                </>
              )}
            </button>
          )}
        </div>

        {/* Keyboard Hint */}
        {!isPending && (
          <div className="px-4 pb-2">
            <p className="text-[9px] text-slate-500 text-center">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-600">ESC</kbd> to close • 
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-600 ml-1">Ctrl+Enter</kbd> to send
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
