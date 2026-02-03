'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  Eye,
  History,
  Crown,
  Award,
  Coins,
  TrendingUp,
  TrendingDown,
  Gift,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  User,
  Mail,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ShoppingCart,
} from 'lucide-react';
import { useToast } from '@/components/CustomToast';
import {
  loyaltyPointsService,
  AdminLoyaltyUser,
  LoyaltyBalance,
  LoyaltyTransaction,
  formatPoints,
  getTierColor,
  getTransactionTypeInfo,
  formatRelativeDate,
  formatExpiryDate,
} from '@/lib/services/loyaltyPoints';

type SortField = 'balance' | 'earned' | 'redeemed' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

export default function LoyaltyPointsPage() {
  const toast = useToast();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  const [users, setUsers] = useState<AdminLoyaltyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminLoyaltyUser | null>(null);
  const [userBalance, setUserBalance] = useState<LoyaltyBalance | null>(null);
  const [userHistory, setUserHistory] = useState<LoyaltyTransaction[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);

  // ============================================================
  // FETCH USERS - USING OPTIMIZED METHOD
  // ============================================================
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ BEST: Use optimized method with customer details
      const response = await loyaltyPointsService.getAllUsersWithDetails({
        pageNumber: currentPage,
        pageSize: pageSize,
        searchTerm: searchTerm || undefined,
        tierLevel: tierFilter !== 'all' ? tierFilter : undefined,
        sortBy: sortBy,
        sortDirection: sortDirection,
      });

      if (response.data?.success && response.data.data) {
        setUsers(response.data.data.items);
        setTotalCount(response.data.data.totalCount);
      } else {
        toast.error(response.error || 'Failed to load loyalty points data');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load loyalty points data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, tierFilter, sortBy, sortDirection]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ============================================================
  // VIEW BALANCE MODAL
  // ============================================================
  
  const handleViewBalance = async (user: AdminLoyaltyUser) => {
    try {
      setSelectedUser(user);
      setViewModalOpen(true);
      setLoadingModal(true);

      const response = await loyaltyPointsService.getUserBalance(user.userId);

      if (response.data?.success && response.data.data) {
        setUserBalance(response.data.data);
      } else {
        toast.error('Failed to load user balance');
        setUserBalance(null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load user balance');
      setUserBalance(null);
    } finally {
      setLoadingModal(false);
    }
  };

  // ============================================================
  // VIEW HISTORY MODAL - FIXED
  // ============================================================
  
  const handleViewHistory = async (user: AdminLoyaltyUser) => {
    try {
      setSelectedUser(user);
      setHistoryModalOpen(true);
      setLoadingModal(true);
      setHistoryPage(1);

      const response = await loyaltyPointsService.getUserHistory(user.userId, {
        pageNumber: 1,
        pageSize: historyPageSize,
      });

      if (response.data?.success) {
        setUserHistory(response.data.data || []);
      } else {
        toast.error('Failed to load transaction history');
        setUserHistory([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load transaction history');
      setUserHistory([]);
    } finally {
      setLoadingModal(false);
    }
  };

  // ============================================================
  // LOAD MORE HISTORY - FIXED
  // ============================================================
  
  const loadMoreHistory = async () => {
    if (!selectedUser) return;

    try {
      setLoadingModal(true);
      const nextPage = historyPage + 1;

      const response = await loyaltyPointsService.getUserHistory(selectedUser.userId, {
        pageNumber: nextPage,
        pageSize: historyPageSize,
      });

      if (response.data?.success) {
        const newTransactions = response.data.data || [];
        
        if (newTransactions.length > 0) {
          setUserHistory(prev => [...prev, ...newTransactions]);
          setHistoryPage(nextPage);
        } else {
          toast.info('No more transactions to load');
        }
      } else {
        toast.error(response.error || 'Failed to load more transactions');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.message || 'Failed to load more transactions');
    } finally {
      setLoadingModal(false);
    }
  };

  // ============================================================
  // SORTING
  // ============================================================
  
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-violet-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-violet-400" />
    );
  };

  // ============================================================
  // PAGINATION
  // ============================================================
  
  const totalPages = Math.ceil(totalCount / pageSize);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (end - start < maxVisible - 1) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxVisible - 1);
      } else {
        start = Math.max(1, end - maxVisible + 1);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  // ============================================================
  // STATS
  // ============================================================
  
  const calculateStats = () => {
    const totalPoints = users.reduce((sum, u) => sum + u.currentBalance, 0);
    const totalRedemptionValue = users.reduce((sum, u) => sum + u.redemptionValue, 0);
    const goldUsers = users.filter(u => u.tierLevel === 'Gold').length;
    const silverUsers = users.filter(u => u.tierLevel === 'Silver').length;
    const bronzeUsers = users.filter(u => u.tierLevel === 'Bronze').length;

    return {
      totalUsers: totalCount,
      totalPoints,
      totalRedemptionValue,
      avgPoints: totalCount > 0 ? Math.round(totalPoints / totalCount) : 0,
      goldUsers,
      silverUsers,
      bronzeUsers,
    };
  };

  const stats = calculateStats();

  // ============================================================
  // EXPORT
  // ============================================================
  
  const handleExport = () => {
    const headers = ['User', 'Email', 'Balance', 'Value (£)', 'Earned', 'Redeemed', 'Tier', 'Last Activity'];
    const csvData = users.map(user => [
      user.userName,
      user.userEmail,
      user.currentBalance,
      user.redemptionValue,
      user.totalPointsEarned,
      user.totalPointsRedeemed,
      user.tierLevel,
      user.lastEarnedAt || user.lastRedeemedAt || 'Never',
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loyalty-points-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${users.length} users exported successfully`);
  };

  // ============================================================
  // RENDER
  // ============================================================
  
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading loyalty points...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* ✅ HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Loyalty Points Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor and manage customer loyalty points</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg transition-all text-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* ✅ STATS - 4 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Users */}
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-3 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Total Users</p>
              <p className="text-white text-xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Total Points */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-3 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Total Points</p>
              <p className="text-white text-xl font-bold">{formatPoints(stats.totalPoints)}</p>
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Total Value</p>
              <p className="text-white text-xl font-bold">£{stats.totalRedemptionValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Avg Points */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-3 hover:border-orange-500/50 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Avg per User</p>
              <p className="text-white text-xl font-bold">{formatPoints(stats.avgPoints)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ TIER DISTRIBUTION */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-400" />
            Tier Distribution
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">{stats.goldUsers}</span>
              <span className="text-slate-500">Gold</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-slate-300 font-semibold">{stats.silverUsers}</span>
              <span className="text-slate-500">Silver</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-orange-400 font-semibold">{stats.bronzeUsers}</span>
              <span className="text-slate-500">Bronze</span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FILTERS - COMPACT INLINE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Tiers</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>

          {/* Results Count */}
          <span className="text-xs text-slate-400">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
        </div>
      </div>

      {/* ✅ TABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">User</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">
                  <button
                    onClick={() => handleSort('balance')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Balance {getSortIcon('balance')}
                  </button>
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">
                  <button
                    onClick={() => handleSort('earned')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Earned {getSortIcon('earned')}
                  </button>
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">
                  <button
                    onClick={() => handleSort('redeemed')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Redeemed {getSortIcon('redeemed')}
                  </button>
                </th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">Tier</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400">
                  <button
                    onClick={() => handleSort('lastActivity')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Last Activity {getSortIcon('lastActivity')}
                  </button>
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const tierColors = getTierColor(user.tierLevel);
                const lastActivity = user.lastEarnedAt || user.lastRedeemedAt;

                return (
                  <tr
                    key={user.userId}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-slate-900/20' : ''
                    }`}
                  >
                    {/* User */}
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="text-white text-sm font-medium">{user.userName}</p>
                        <p className="text-slate-400 text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.userEmail}
                        </p>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="text-white text-sm font-semibold">{formatPoints(user.currentBalance)}</p>
                        <p className="text-slate-400 text-xs">£{user.redemptionValue}</p>
                      </div>
                    </td>

                    {/* Earned */}
                    <td className="py-2.5 px-3">
                      <p className="text-green-400 text-sm font-medium flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {formatPoints(user.totalPointsEarned)}
                      </p>
                    </td>

                    {/* Redeemed */}
                    <td className="py-2.5 px-3">
                      <p className="text-blue-400 text-sm font-medium flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {formatPoints(user.totalPointsRedeemed)}
                      </p>
                    </td>

                    {/* Tier */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${tierColors.bg} ${tierColors.text} border ${tierColors.border}`}>
                        {user.tierLevel === 'Gold' && <Crown className="h-3 w-3" />}
                        {user.tierLevel !== 'Gold' && <Award className="h-3 w-3" />}
                        {user.tierLevel}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td className="py-2.5 px-3">
                      {lastActivity ? (
                        <p className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(lastActivity)}
                        </p>
                      ) : (
                        <p className="text-slate-500 text-xs">No activity</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewBalance(user)}
                          title="View balance details"
                          className="p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          title="View transaction history"
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No users found</p>
          </div>
        )}
      </div>

      {/* ✅ PAGINATION - COMPACT */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2.5">
          
          {/* Page Info */}
          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentPage === page
                    ? 'bg-violet-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ✅ VIEW BALANCE MODAL */}
      {viewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedUser.userName}</h2>
                    <p className="text-xs text-slate-400">{selectedUser.userEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setUserBalance(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-4">
              {loadingModal ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-sm">Loading balance...</p>
                </div>
              ) : userBalance ? (
                <>
                  {/* Tier Badge */}
                  <div className={`p-4 rounded-xl border-2 ${getTierColor(userBalance.tierLevel).bg} ${getTierColor(userBalance.tierLevel).border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${getTierColor(userBalance.tierLevel).bg} flex items-center justify-center`}>
                          {userBalance.tierLevel === 'Gold' && <Crown className={`h-6 w-6 ${getTierColor(userBalance.tierLevel).icon}`} />}
                          {userBalance.tierLevel !== 'Gold' && <Award className={`h-6 w-6 ${getTierColor(userBalance.tierLevel).icon}`} />}
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${getTierColor(userBalance.tierLevel).text}`}>
                            {userBalance.tierLevel} Tier
                          </h3>
                          <p className="text-sm text-slate-400">
                            {userBalance.pointsToNextTier > 0
                              ? `${formatPoints(userBalance.pointsToNextTier)} points to next tier`
                              : 'Maximum tier reached'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Current Balance</p>
                      <p className="text-white text-2xl font-bold">{formatPoints(userBalance.currentBalance)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Worth £{userBalance.redemptionValue}</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Total Earned</p>
                      <p className="text-green-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsEarned)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Lifetime earnings</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Total Redeemed</p>
                      <p className="text-blue-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsRedeemed)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Used points</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Expired Points</p>
                      <p className="text-red-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsExpired)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Lost to expiry</p>
                    </div>
                  </div>

                  {/* Bonus History */}
                  <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                    <h4 className="text-sm font-semibold text-white mb-3">Bonus Awards</h4>
                    <div className="space-y-2">
                      
                      <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${userBalance.firstOrderBonusAwarded ? 'text-green-400' : 'text-slate-600'}`} />
                          <span className="text-sm text-slate-300">First Order Bonus</span>
                        </div>
                        <span className={`text-xs font-semibold ${userBalance.firstOrderBonusAwarded ? 'text-green-400' : 'text-slate-600'}`}>
                          {userBalance.firstOrderBonusAwarded ? 'AWARDED' : 'NOT AWARDED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-violet-400" />
                          <span className="text-sm text-slate-300">Review Bonus</span>
                        </div>
                        <span className="text-sm font-semibold text-violet-400">
                          {formatPoints(userBalance.totalReviewBonusEarned)} pts
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-pink-400" />
                          <span className="text-sm text-slate-300">Referral Bonus</span>
                        </div>
                        <span className="text-sm font-semibold text-pink-400">
                          {formatPoints(userBalance.totalReferralBonusEarned)} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Last Earned</p>
                      <p className="text-white text-sm">{formatRelativeDate(userBalance.lastEarnedAt)}</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Last Redeemed</p>
                      <p className="text-white text-sm">
                        {userBalance.lastRedeemedAt ? formatRelativeDate(userBalance.lastRedeemedAt) : 'Never'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <p className="text-slate-400">Failed to load balance data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ HISTORY MODAL */}
      {historyModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-cyan-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Transaction History</h2>
                    <p className="text-xs text-slate-400">{selectedUser.userName} • {selectedUser.userEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setHistoryModalOpen(false);
                    setUserHistory([]);
                    setHistoryPage(1);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-2">
              {loadingModal && userHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-sm">Loading history...</p>
                </div>
              ) : userHistory.length > 0 ? (
                <>
                  {userHistory.map((transaction) => {
                    const typeInfo = getTransactionTypeInfo(transaction.transactionType);
                    const expiryInfo = formatExpiryDate(transaction.expiresAt);
                    const isPositive = transaction.points > 0;

                    return (
                      <div
                        key={transaction.id}
                        className={`p-3 rounded-xl border ${typeInfo.borderColor} ${typeInfo.bgColor} hover:border-opacity-50 transition-all`}
                      >
                        <div className="flex items-start justify-between">
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeInfo.bgColor} ${typeInfo.color} border ${typeInfo.borderColor}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatRelativeDate(transaction.createdAt)}
                              </span>
                            </div>

                            <p className="text-sm text-slate-300 mb-1">{transaction.description}</p>

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {transaction.orderId && (
                                <span className="flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  Order ID: {transaction.orderId.slice(0, 8)}...
                                </span>
                              )}
                              {transaction.expiresAt && !transaction.isExpired && (
                                <span className={`flex items-center gap-1 ${expiryInfo.color}`}>
                                  <Calendar className="h-3 w-3" />
                                  {expiryInfo.text}
                                  {expiryInfo.isExpiringSoon && (
                                    <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px] font-bold">
                                      EXPIRES SOON
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <p className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatPoints(transaction.points)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Balance: {formatPoints(transaction.balanceAfter)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load More Button */}
                  <button
                    onClick={loadMoreHistory}
                    disabled={loadingModal}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 text-sm"
                  >
                    {loadingModal ? 'Loading...' : 'Load More'}
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No transaction history found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
