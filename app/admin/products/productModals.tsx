// app/admin/products/ProductModals.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-config';

// ========================================
// INTERFACES
// ========================================
interface AdminCommentHistory {
  id: string;
  productId: string;
  oldComment: string | null;
  newComment: string | null;
  changedBy: string;
  changedAt: string;
  changeReason: string | null;
}

interface AdminCommentHistoryModalProps {
  productId: string;
}


interface LowStockAlertProps {
  stockQuantity: number;
  notifyQuantityBelow: number;
  enabled: boolean;
}

interface BackInStockSubscribersProps {
  productId: string;
}

// ========================================
// 1. ADMIN COMMENT HISTORY MODAL
// ========================================
export const AdminCommentHistoryModal: React.FC<AdminCommentHistoryModalProps> = ({ productId }) => {
  const [history, setHistory] = useState<AdminCommentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      fetchCommentHistory();
    }
  }, [isOpen, productId]);

  const fetchCommentHistory = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get<any>(`/api/Products/${productId}/admin-comment-history`);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        const sortedHistory = [...response.data.data].sort((a, b) => 
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );
        setHistory(sortedHistory);
      } else if (Array.isArray(response.data)) {
        const sortedHistory = [...response.data].sort((a, b) => 
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );
        setHistory(sortedHistory);
      } else {
        setHistory([]);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      {/* ✅ TRIGGER BUTTON */}
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:text-violet-300 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>View Comment History</span>
        {history.length > 0 && (
          <span className="px-2 py-0.5 bg-violet-500/20 rounded-full text-xs font-semibold">
            {history.length}
          </span>
        )}
      </button>

      {/* ✅ SIMPLE CENTERED MODAL */}
      {isOpen && (
        <>
          <style jsx>{`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .table-scroll::-webkit-scrollbar { width: 8px; }
            .table-scroll::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
            .table-scroll::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 4px; }
            .table-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.6); }
          `}</style>

          {/* 🔥 SIMPLE POSITIONING - Top se 5rem neeche, horizontally centered */}
          <div className="fixed inset-0 z-[99999] flex justify-center pt-[175vh] px-4 pb-4 overflow-y-auto">
            {/* ✅ BACKDROP */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

            {/* ✅ MODAL - Top se neeche, centered */}
            <div 
              className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-violet-500/30 shadow-2xl w-full max-w-6xl h-fit"
              style={{ 
                animation: 'modalFadeIn 0.3s ease-out',
                maxHeight: 'calc(100vh - 10rem)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ✅ HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Admin Comment History</h3>
                    <p className="text-sm text-slate-400">Track all changes to admin comments</p>
                  </div>
                </div>
                <button type="button" onClick={handleClose} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all group">
                  <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                </button>
              </div>

              {/* ✅ CONTENT */}
              <div className="flex-1 overflow-y-auto table-scroll">
                {loading ? (
                  <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500 mx-auto mb-4"></div>
                      <p className="text-slate-400">Loading history...</p>
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-slate-200 font-semibold text-xl mb-3">No comment history available</p>
                      <p className="text-slate-500 text-sm">Changes will appear here after admin comment updates</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-slate-800/95 backdrop-blur-sm">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-4 px-4 text-xs font-bold text-violet-300 uppercase">#</th>
                          <th className="text-left py-4 px-4 text-xs font-bold text-violet-300 uppercase min-w-[180px]">Changed By</th>
                          <th className="text-left py-4 px-4 text-xs font-bold text-violet-300 uppercase min-w-[140px]">Date & Time</th>
                          <th className="text-left py-4 px-4 text-xs font-bold text-violet-300 uppercase min-w-[220px]">Old Comment</th>
                          <th className="text-left py-4 px-4 text-xs font-bold text-violet-300 uppercase min-w-[220px]">New Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {history.map((entry, index) => (
                          <tr key={entry.id} className="hover:bg-slate-800/60 transition-colors">
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 text-sm font-bold">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
                                  <span className="text-sm font-bold text-violet-300">{entry.changedBy.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-100 truncate">{entry.changedBy.split('@')[0]}</p>
                                  <p className="text-xs text-slate-500 truncate">{entry.changedBy}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-slate-200">{formatDateOnly(entry.changedAt)}</p>
                              <p className="text-xs text-slate-500">{formatTime(entry.changedAt)}</p>
                            </td>
                            <td className="py-4 px-4">
                              {entry.oldComment ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                  <p className="text-sm text-slate-200 line-clamp-3">{entry.oldComment}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">No previous comment</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {entry.newComment ? (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                  <p className="text-sm text-slate-200 line-clamp-3">{entry.newComment}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Comment removed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ✅ FOOTER */}
              {history.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-300">
                      Total Changes: <span className="font-bold text-violet-400">{history.length}</span>
                    </p>
                    <p className="text-xs text-slate-500">Latest changes shown first</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};








// ========================================
// 3. LOW STOCK ALERT
// ========================================
export const LowStockAlert: React.FC<LowStockAlertProps> = ({ 
  stockQuantity, 
  notifyQuantityBelow, 
  enabled 
}) => {
  if (!enabled || stockQuantity > notifyQuantityBelow) return null;

  return (
    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      <span className="text-sm text-red-400 font-medium">
        ⚠️ Low Stock Alert: Only {stockQuantity} units left (Threshold: {notifyQuantityBelow})
      </span>
    </div>
  );
};

// ========================================
// 4. BACK IN STOCK SUBSCRIBERS
// ========================================
export const BackInStockSubscribers: React.FC<BackInStockSubscribersProps> = ({ productId }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    apiClient.get(`${API_ENDPOINTS.products}/${productId}/back-in-stock-subscriptions/count`)
      .then(response => {
        const apiResponse = response.data as any;
        if (apiResponse?.success) {
          setCount(apiResponse.data);
        }
      })
      .catch(() => setCount(0));
  }, [productId]);

  if (count === 0) return null;

  return (
    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
      <span className="text-sm text-blue-400">
        📧 {count} customer{count > 1 ? 's' : ''} waiting for restock notification
      </span>
    </div>
  );
};
