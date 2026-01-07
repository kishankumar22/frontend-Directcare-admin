'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Send, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit, 
  Search 
} from 'lucide-react';
import { productLockService, TakeoverRequestData } from '@/lib/services/productLockService'; // ✅ Import type from service
import { useToast } from '@/components/CustomToast';

// ✅ Remove duplicate interface, use imported one

interface MyTakeoverRequestsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ FIX: Proper type for status keys
type StatusKey = 'all' | 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Cancelled';

interface StatusCounts {
  all: number;
  Pending: number;
  Approved: number;
  Rejected: number;
  Expired: number;
  Cancelled: number;
}

// ==================== COMPONENT ====================
export default function MyTakeoverRequestsPanel({ 
  isOpen, 
  onClose 
}: MyTakeoverRequestsPanelProps) {
  const toast = useToast();

  // ==================== STATE ====================
  const [myTakeoverRequests, setMyTakeoverRequests] = useState<TakeoverRequestData[]>([]);
  const [loadingTakeovers, setLoadingTakeovers] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ==================== FETCH DATA ====================
  const fetchMyTakeoverRequests = async (onlyActive: boolean = true) => {
    setLoadingTakeovers(true);
    try {
      const response = await productLockService.getMyTakeoverRequests(onlyActive);
      
      if (response.success && response.data) {
        setMyTakeoverRequests(response.data);
        console.log(`📨 Takeover requests loaded (${onlyActive ? 'Active' : 'All'}):`, response.data.length);
      }
    } catch (error) {
      console.error('Error fetching takeover requests:', error);
      toast.error('Failed to load takeover requests');
    } finally {
      setLoadingTakeovers(false);
    }
  };

  // ==================== HANDLERS ====================
  const handleTabChange = (tab: 'active' | 'all') => {
    setActiveTab(tab);
    setStatusFilter('all');
    setSearchQuery('');
    fetchMyTakeoverRequests(tab === 'active');
  };

  const handleCancelTakeoverRequest = async (requestId: string) => {
    if (!confirm('Cancel this takeover request?')) return;

    try {
      const response = await productLockService.cancelTakeoverRequest(requestId);
      
      if (response.success) {
        toast.success('Request cancelled successfully');
        fetchMyTakeoverRequests(activeTab === 'active');
      } else {
        toast.error(response.message || 'Failed to cancel request');
      }
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error?.message || 'Failed to cancel request');
    }
  };

  // ==================== FILTERED DATA ====================
  const filteredRequests = useMemo(() => {
    let filtered = [...myTakeoverRequests];

    // Status Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Search Filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(req => 
        req.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.currentEditorEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: Pending first, then newest
    filtered.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return filtered;
  }, [myTakeoverRequests, statusFilter, searchQuery]);

  // ==================== STATUS COUNTS ====================
  const statusCounts = useMemo<StatusCounts>(() => {
    const counts: StatusCounts = {
      all: myTakeoverRequests.length,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Expired: 0,
      Cancelled: 0,
    };

    myTakeoverRequests.forEach(req => {
      if (req.status in counts) {
        counts[req.status as keyof StatusCounts]++;
      }
    });

    return counts;
  }, [myTakeoverRequests]);

  // ==================== UTILITY FUNCTIONS ====================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Approved':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Expired':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Cancelled':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (isOpen) {
      fetchMyTakeoverRequests(activeTab === 'active');
      
      // Auto-refresh for active tab
      if (activeTab === 'active') {
        const interval = setInterval(() => {
          fetchMyTakeoverRequests(true);
        }, 30000);
        
        return () => clearInterval(interval);
      }
    }
  }, [isOpen, activeTab]);

  // Don't render if not open
  if (!isOpen) return null;

  // ==================== RENDER ====================
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm flex items-start justify-center pt-12"
        onClick={onClose}
      >
        {/* Panel Container - Blue/Black Theme */}
        <div 
          className="z-50 bg-slate-950 border-2 border-blue-500/30 rounded-xl shadow-2xl shadow-blue-500/20 overflow-hidden max-w-[98%] w-[90%]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ==================== HEADER ==================== */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-slate-900 to-blue-500/10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              My Takeover Requests
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ==================== INLINE FILTERS ROW ==================== */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTabChange('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'active'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  Active
                  {statusCounts.Pending > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === 'active' ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {statusCounts.Pending}
                    </span>
                  )}
                </button>
                
                {/* <button
                  onClick={() => handleTabChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  All History
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'all' ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {statusCounts.all}
                  </span>
                </button> */}
              </div>

              {/* Divider */}
              {/* <div className="h-8 w-px bg-slate-700"></div> */}

              {/* ==================== STATUS FILTERS (Always Visible) ==================== */}
              {activeTab === 'all' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                      Filter:
                    </span>
                    
                    {(
                      [
                        { key: 'all', label: 'All', activeClass: 'bg-slate-700 text-white border-slate-600', inactiveClass: '' },
                        { key: 'Pending', label: 'Pending', activeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', inactiveClass: '' },
                        { key: 'Approved', label: 'Approved', activeClass: 'bg-green-500/20 text-green-400 border-green-500/40', inactiveClass: '' },
                        { key: 'Rejected', label: 'Rejected', activeClass: 'bg-red-500/20 text-red-400 border-red-500/40', inactiveClass: '' },
                        { key: 'Expired', label: 'Expired', activeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40', inactiveClass: '' },
                        { key: 'Cancelled', label: 'Cancelled', activeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/40', inactiveClass: '' },
                      ] as const
                    ).map(filter => (
                      <button
                        key={filter.key}
                        onClick={() => setStatusFilter(filter.key as StatusKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          statusFilter === filter.key
                            ? filter.activeClass
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/70 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {filter.label} ({statusCounts[filter.key as StatusKey]})
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-slate-700"></div>
                </>
              )}

              {/* Search Box */}
              <div className="relative flex-1 min-w-[280px] max-w-md ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ==================== TABLE CONTENT ==================== */}
          <div className="max-h-[60vh] overflow-auto bg-slate-950">
            {loadingTakeovers ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-400 text-sm font-medium">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-20">
                <div className="p-4 bg-blue-500/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Send className="w-10 h-10 text-blue-500/50" />
                </div>
                <p className="text-slate-300 text-lg font-semibold mb-2">
                  {searchQuery 
                    ? 'No requests found' 
                    : activeTab === 'active' 
                      ? 'No active requests' 
                      : 'No requests found'}
                </p>
                <p className="text-slate-500 text-sm">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : activeTab === 'active' 
                      ? 'Active requests will appear here' 
                      : 'Your request history will appear here'}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10 border-b-2 border-blue-500/20">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Requested To
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Message
                    </th>
                    {activeTab === 'all' && (
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Response
                      </th>
                    )}
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {activeTab === 'active' ? 'Time Left' : 'Date'}
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => (
                    <tr
                      key={request.id}
                      className={`hover:bg-slate-900/50 transition-colors border-b border-slate-800/50 ${
                        index % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/30'
                      }`}
                    >
                      {/* Product Name */}
                      <td className="px-4 py-3">
                        <div className="text-white font-semibold text-sm max-w-[220px] truncate" title={request.productName}>
                          {request.productName}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 whitespace-nowrap ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                          {request.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                          {request.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                          {request.status === 'Expired' && <AlertCircle className="w-3.5 h-3.5" />}
                          {request.statusText}
                        </span>
                      </td>

                      {/* Requested To */}
                      <td className="px-4 py-3">
                        <div className="text-slate-300 text-xs max-w-[180px] truncate" title={request.currentEditorEmail}>
                          {request.currentEditorEmail}
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-4 py-3">
                        {request.requestMessage ? (
                          <div className="text-slate-400 text-xs italic max-w-[200px] truncate" title={request.requestMessage}>
                            "{request.requestMessage}"
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Response (Only in "All" tab) */}
                      {activeTab === 'all' && (
                        <td className="px-4 py-3">
                          {request.responseMessage ? (
                            <div className="text-cyan-400 text-xs italic max-w-[200px] truncate" title={request.responseMessage}>
                              "{request.responseMessage}"
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Time / Date */}
                      <td className="px-4 py-3 text-center">
                        {activeTab === 'active' && request.status === 'Pending' && !request.isExpired ? (
                          <div className="flex items-center justify-center gap-1.5 text-orange-400 text-xs font-bold whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeRemaining(request.expiresAt)}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs whitespace-nowrap">
                            {new Date(request.requestedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            <br />
                            <span className="text-slate-500 text-[10px]">
                              {new Date(request.requestedAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {request.status === 'Pending' && !request.isExpired ? (
                            <button
                              onClick={() => handleCancelTakeoverRequest(request.id)}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border border-red-500/30 hover:border-red-500/50"
                              title="Cancel request"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          ) : request.status === 'Approved' ? (
                            <Link href={`/admin/products/edit/${request.productId}`}>
                              <button className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border border-green-500/30 hover:border-green-500/50">
                                <Edit className="w-3.5 h-3.5" />
                                Edit Now
                              </button>
                            </Link>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ==================== FOOTER ==================== */}
          {filteredRequests.length > 0 && (
            <div className="px-6 py-3 border-t-2 border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-slate-900 to-blue-500/5">
              <p className="text-xs text-slate-400 text-center font-medium">
                Showing <span className="text-blue-400 font-bold">{filteredRequests.length}</span> of{' '}
                <span className="text-blue-400 font-bold">{myTakeoverRequests.length}</span> requests
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
