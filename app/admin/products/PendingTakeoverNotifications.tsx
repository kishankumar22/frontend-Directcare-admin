// components/admin/PendingTakeoverNotifications.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Send, Clock, CheckCircle, XCircle, X } from 'lucide-react';

import { useToast } from '@/components/CustomToast';
import { cn } from '@/lib/utils';
import productLockService from '@/lib/services/productLockService';

interface TakeoverRequest {
  id: string;
  productId: string;
  productName: string;
  requestedByUserId: string;
  requestedByEmail: string;
  currentEditorUserId: string;
  currentEditorEmail: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Cancelled';
  statusText: string;
  requestMessage?: string;
  responseMessage?: string;
  requestedAt: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  timeLeftSeconds: number;
}

export default function PendingTakeoverNotifications() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<TakeoverRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ==================== FETCH PENDING REQUESTS ====================
  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await productLockService.getPendingTakeoverRequests();
      
      if (response.success && response.data) {
        setRequests(response.data.filter(req => req.isActive && !req.isExpired));
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== AUTO-REFRESH EVERY 30 SECONDS ====================
  useEffect(() => {
    fetchPendingRequests();

    const interval = setInterval(() => {
      fetchPendingRequests();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ==================== CLOSE ON OUTSIDE CLICK ====================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ==================== APPROVE REQUEST ====================
  const handleApprove = async (requestId: string, productName: string) => {
    setActionLoading(requestId);

    try {
      const response = await productLockService.approveTakeoverRequest(
        requestId,
        'Approved. You can edit now.'
      );

      if (response.success) {
        toast.success(`✅ Approved takeover for "${productName}"`);
        fetchPendingRequests(); // Refresh list
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  // ==================== REJECT REQUEST ====================
  const handleReject = async (requestId: string, productName: string) => {
    setActionLoading(requestId);

    try {
      const response = await productLockService.rejectTakeoverRequest(
        requestId,
        'Sorry, still working on this product.'
      );

      if (response.success) {
        toast.success(`❌ Rejected takeover for "${productName}"`);
        fetchPendingRequests(); // Refresh list
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  // ==================== FORMAT TIME LEFT ====================
  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const pendingCount = requests.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Badge */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchPendingRequests(); // Refresh on open
        }}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-150"
      >
        <Bell className="h-5 w-5" />
        
        {/* Count Badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900 shadow-lg">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          
          {/* Header */}
          <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Takeover Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : pendingCount === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No pending requests</p>
                <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {requests.map((request) => (
                  <div 
                    key={request.id} 
                    className="p-4 hover:bg-slate-800/30 transition-all"
                  >
                    {/* Product Name */}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white line-clamp-1 flex-1">
                        {request.productName}
                      </h4>
                      <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-medium rounded-full whitespace-nowrap">
                        Pending
                      </span>
                    </div>

                    {/* Requester Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="w-3 h-3 text-violet-400" />
                      <p className="text-xs text-slate-300">
                        From: <span className="font-medium text-white">{request.requestedByEmail}</span>
                      </p>
                    </div>

                    {/* Message */}
                    {request.requestMessage && (
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 mb-3">
                        <p className="text-xs text-slate-300 italic line-clamp-2">
                          "{request.requestMessage}"
                        </p>
                      </div>
                    )}

                    {/* Time Left */}
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <p className="text-xs text-slate-400">
                        Expires in: <span className="font-medium text-cyan-400">{formatTimeLeft(request.timeLeftSeconds)}</span>
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id, request.productName)}
                        disabled={actionLoading === request.id}
                        className={cn(
                          "flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                          actionLoading === request.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {actionLoading === request.id ? (
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(request.id, request.productName)}
                        disabled={actionLoading === request.id}
                        className={cn(
                          "flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5",
                          actionLoading === request.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {actionLoading === request.id ? (
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
