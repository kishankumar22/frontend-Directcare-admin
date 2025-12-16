// app/admin/products/ProductModals.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
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

interface EditLockBannerProps {
  isLocked: boolean;
  lockedBy?: string;
  lockedByEmail?: string;
  expiresAt?: string;
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

  // ✅ BODY SCROLL LOCK
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && productId) {
      fetchCommentHistory();
    }
  }, [isOpen, productId]);

  const fetchCommentHistory = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      console.log('📡 Fetching admin comment history for:', productId);
      
      const response = await apiClient.get<any>(`/api/Products/${productId}/admin-comment-history`);
      
      console.log('✅ Response:', response.data);
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        const sortedHistory = [...response.data.data].sort((a, b) => 
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );
        setHistory(sortedHistory);
        console.log(`✅ Loaded ${sortedHistory.length} history entries (latest first)`);
      } else if (Array.isArray(response.data)) {
        const sortedHistory = [...response.data].sort((a, b) => 
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );
        setHistory(sortedHistory);
        console.log(`✅ Loaded ${sortedHistory.length} history entries (latest first)`);
      } else {
        setHistory([]);
        console.log('ℹ️ No history found');
      }
    } catch (error: any) {
      console.error('❌ Admin comment history error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.response?.status === 404) {
        console.log('ℹ️ No comment history available yet (404)');
        setHistory([]);
      } else if (error.response?.status !== 404) {
        console.error('❌ Unexpected error:', error.response?.status);
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
    setIsOpen(true); // ✅ Always opens modal
  };

  return (
    <div className="mt-4">
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

      {/* ✅ MODAL - INDUSTRY LEVEL */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8"
          style={{ 
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* ✅ BACKDROP - SMOOTH FADE */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            style={{ 
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* ✅ MODAL PANEL - CENTERED & SMOOTH */}
          <div 
            className="relative bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col"
            style={{ 
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ HEADER - FIXED */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Admin Comment History</h3>
                  <p className="text-sm text-slate-400">Track all changes to admin comments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors group"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
              </button>
            </div>

            {/* ✅ SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500 mx-auto"></div>
                    <p className="text-slate-400 text-sm mt-4">Loading history...</p>
                  </div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-300 font-semibold text-lg mb-2">No comment history available</p>
                    <p className="text-slate-500 text-sm">Changes will appear here after admin comment updates</p>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-slate-900 z-10">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">#</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[200px]">Changed By</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[150px]">Date & Time</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[250px]">Old Comment</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[250px]">New Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {history.map((entry, index) => (
                          <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* # */}
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold">
                                {index + 1}
                              </span>
                            </td>

                            {/* Changed By */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 ring-2 ring-violet-500/10">
                                  <span className="text-sm font-bold text-violet-300">
                                    {entry.changedBy.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">
                                    {entry.changedBy.split('@')[0]}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{entry.changedBy}</p>
                                </div>
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-sm font-medium text-slate-300">{formatDateOnly(entry.changedAt)}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-6">
                                  <p className="text-xs text-slate-500">{formatTime(entry.changedAt)}</p>
                                </div>
                              </div>
                            </td>

                            {/* Old Comment */}
                            <td className="py-4 px-4">
                              {entry.oldComment ? (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-w-md">
                                  <p className="text-sm text-slate-300 line-clamp-4 leading-relaxed">
                                    {entry.oldComment}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span className="text-xs italic">No previous comment</span>
                                </div>
                              )}
                            </td>

                            {/* New Comment */}
                            <td className="py-4 px-4">
                              {entry.newComment ? (
                                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 max-w-md">
                                  <p className="text-sm text-slate-300 line-clamp-4 leading-relaxed">
                                    {entry.newComment}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span className="text-xs italic">Comment removed</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ FOOTER - FIXED */}
            {history.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-slate-400">
                      Total Changes: <span className="font-semibold text-violet-400">{history.length}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Latest changes shown first</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ ADD ANIMATIONS TO GLOBAL CSS */}
          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            /* Custom scrollbar for modal */
            .overflow-y-auto::-webkit-scrollbar {
              width: 8px;
            }

            .overflow-y-auto::-webkit-scrollbar-track {
              background: rgb(30 41 59 / 0.5);
              border-radius: 4px;
            }

            .overflow-y-auto::-webkit-scrollbar-thumb {
              background: rgb(100 116 139 / 0.5);
              border-radius: 4px;
            }

            .overflow-y-auto::-webkit-scrollbar-thumb:hover {
              background: rgb(139 92 246 / 0.5);
            }
          `}</style>
        </div>
      )}
    </div>
  );
};


// ========================================
// 2. EDIT LOCK BANNER
// ========================================
export const EditLockBanner: React.FC<EditLockBannerProps> = ({
  isLocked,
  lockedBy,
  lockedByEmail,
  expiresAt
}) => {
  if (!isLocked) return null;

  return (
    <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Shield className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-amber-400 font-semibold mb-1">Product Being Edited</h3>
        <p className="text-sm text-slate-300">
          <strong>{lockedBy}</strong> ({lockedByEmail}) is currently editing this product.
        </p>
        {expiresAt && (
          <p className="text-xs text-slate-400 mt-1">
            Lock expires: {new Date(expiresAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
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
