'use client';

/**
 * ============================================================
 * LOYALTY POINTS MANAGEMENT PAGE
 * ============================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  FilterX,
  Loader2,
  Check,
  Minus,
} from 'lucide-react';
import { useToast } from '@/app/admin/_component/CustomToast';
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
import { useDebounce } from '@/app/hooks/useDebounce';

type SortField = 'balance' | 'earned' | 'redeemed' | 'lastActivity';
type SortDirection = 'asc' | 'desc';
type TierLevel = 'all' | 'Gold' | 'Silver' | 'Bronze';

export default function LoyaltyPointsPage() {
  const toast = useToast();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  const [users, setUsers] = useState<AdminLoyaltyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<TierLevel>('all');
  const [sortBy, setSortBy] = useState<SortField>('balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection States
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminLoyaltyUser | null>(null);
  const [userBalance, setUserBalance] = useState<LoyaltyBalance | null>(null);
  const [userHistory, setUserHistory] = useState<LoyaltyTransaction[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);

  // ============================================================
  // DEBOUNCED SEARCH
  // ============================================================
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // ============================================================
  // FETCH USERS DATA
  // ============================================================
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await loyaltyPointsService.getAllCustomersWithLoyalty({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: debouncedSearchTerm || undefined,
        sortDirection: sortDirection,
      });

      if (response.success && response.data) {
        let filteredUsers = response.data.items;
        
        if (tierFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => user.tierLevel === tierFilter);
        }

        filteredUsers.sort((a, b) => {
          let aValue = 0;
          let bValue = 0;

          switch (sortBy) {
            case 'balance':
              aValue = a.currentBalance;
              bValue = b.currentBalance;
              break;
            case 'earned':
              aValue = a.totalPointsEarned;
              bValue = b.totalPointsEarned;
              break;
            case 'redeemed':
              aValue = a.totalPointsRedeemed;
              bValue = b.totalPointsRedeemed;
              break;
            case 'lastActivity':
              const aDate = a.lastEarnedAt || a.lastRedeemedAt || a.createdAt;
              const bDate = b.lastEarnedAt || b.lastRedeemedAt || b.createdAt;
              aValue = new Date(aDate).getTime();
              bValue = new Date(bDate).getTime();
              break;
          }

          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });

        setUsers(filteredUsers);
        setTotalCount(tierFilter !== 'all' ? filteredUsers.length : response.data.totalCount);
      } else {
        toast.error('Failed to load loyalty points data');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load loyalty points data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchTerm, tierFilter, sortBy, sortDirection, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ============================================================
  // SELECTION HANDLERS
  // ============================================================

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(users.map(u => u.id));
      setSelectedUsers(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === users.length);
  };

  const selectedUsersData = useMemo(() => {
    return users.filter(u => selectedUsers.has(u.id));
  }, [users, selectedUsers]);

  // ============================================================
  // MODAL HANDLERS
  // ============================================================

  const handleViewBalance = async (user: AdminLoyaltyUser) => {
    try {
      setSelectedUser(user);
      setViewModalOpen(true);
      setLoadingModal(true);

      const response = await loyaltyPointsService.getUserBalance(user.id);

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

  const handleViewHistory = async (user: AdminLoyaltyUser) => {
    try {
      setSelectedUser(user);
      setHistoryModalOpen(true);
      setLoadingModal(true);
      setHistoryPage(1);

      const response = await loyaltyPointsService.getUserHistory(user.id, {
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

  const loadMoreHistory = async () => {
    if (!selectedUser) return;

    try {
      setLoadingModal(true);
      const nextPage = historyPage + 1;

      const response = await loyaltyPointsService.getUserHistory(selectedUser.id, {
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
        toast.error('Failed to load more transactions');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load more transactions');
    } finally {
      setLoadingModal(false);
    }
  };

  // ============================================================
  // FILTER & SORT HANDLERS
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

  const handleTierClick = (tier: TierLevel) => {
    setTierFilter(tier);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTierFilter('all');
    setSortBy('balance');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || tierFilter !== 'all' || sortBy !== 'balance' || sortDirection !== 'desc';
  }, [searchTerm, tierFilter, sortBy, sortDirection]);

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
  // STATISTICS
  // ============================================================
  
  const stats = useMemo(() => {
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
  }, [users, totalCount]);

  // ============================================================
  // EXPORT HANDLERS
  // ============================================================
  
  const handleExportAll = () => {
    const headers = ['User', 'Email', 'Balance', 'Value (£)', 'Earned', 'Redeemed', 'Tier', 'Last Activity'];
    const csvData = users.map(user => [
      user.fullName,
      user.email,
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
    link.download = `loyalty-points-all-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${users.length} users exported successfully`);
  };

  const handleExportSelected = () => {
    const headers = ['User', 'Email', 'Balance', 'Value (£)', 'Earned', 'Redeemed', 'Tier', 'Last Activity'];
    const csvData = selectedUsersData.map(user => [
      user.fullName,
      user.email,
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
    link.download = `loyalty-points-selected-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${selectedUsersData.length} selected users exported successfully`);
    setSelectedUsers(new Set());
    setSelectAll(false);
  };

  // ============================================================
  // RENDER: LOADING STATE
  // ============================================================
  
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">Loading loyalty points...</p>
          <p className="text-slate-500 text-sm mt-1">Please wait while we fetch customer data</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: MAIN CONTENT
  // ============================================================

  return (
    <div className="space-y-2">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Loyalty Points Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor customer loyalty points, tiers, and transaction history
          </p>
        </div>

        <div className="flex items-center gap-2">
      {/* FLOATING ACTION BUTTON - Export Selected (Sticky at bottom-right) */}
{/* STICKY EXPORT BUTTON - Compact Top Position */}
{selectedUsers.size > 0 && (
  <div className="fixed top-[102px] right-52 z-40 animate-slideDown">
    <div className="relative">
      {/* Main Export Button - Compact */}
      <button
        onClick={handleExportSelected}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-xl hover:shadow-blue-500/40 transition-all text-sm group"
      >
        <Download className="h-4 w-4" />
        <span>Export Selected</span>
      </button>

      {/* Clear Selection Button (X) - Compact */}
      <button
        onClick={() => {
          setSelectedUsers(new Set());
          setSelectAll(false);
        }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all"
        title="Clear selection"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Selection Counter Badge - Compact */}
      <div className="absolute -top-1.5 -left-1.5 bg-violet-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
        {selectedUsers.size}
      </div>
    </div>
  </div>
)}



          {/* Export All Button */}
          <button
            onClick={handleExportAll}
            disabled={users.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export CSV ({users.length})
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-3 hover:border-violet-500/50 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <User className="h-5 w-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Total Users</p>
              <p className="text-white text-xl font-bold">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-3 hover:border-cyan-500/50 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Coins className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Total Points</p>
              <p className="text-white text-xl font-bold">{formatPoints(stats.totalPoints)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3 hover:border-green-500/50 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Total Value</p>
              <p className="text-white text-xl font-bold">£{stats.totalRedemptionValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-3 hover:border-orange-500/50 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Star className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Avg per User</p>
              <p className="text-white text-xl font-bold">{formatPoints(stats.avgPoints)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TIER DISTRIBUTION - CLICKABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-400" />
            Tier Distribution
          </h3>

          <div className="flex items-center gap-2">
            {/* Gold Tier - Clickable */}
            <button
              onClick={() => handleTierClick('Gold')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tierFilter === 'Gold'
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-yellow-500/10 hover:text-yellow-400 border border-slate-700'
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              <span className="font-bold">{stats.goldUsers}</span>
              <span>Gold</span>
            </button>

            {/* Silver Tier - Clickable */}
            <button
              onClick={() => handleTierClick('Silver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tierFilter === 'Silver'
                  ? 'bg-slate-300 text-black shadow-lg shadow-slate-300/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-500/10 hover:text-slate-300 border border-slate-700'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span className="font-bold">{stats.silverUsers}</span>
              <span>Silver</span>
            </button>

            {/* Bronze Tier - Clickable */}
            <button
              onClick={() => handleTierClick('Bronze')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tierFilter === 'Bronze'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-orange-500/10 hover:text-orange-400 border border-slate-700'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span className="font-bold">{stats.bronzeUsers}</span>
              <span>Bronze</span>
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT FILTERS & SEARCH - INLINE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Compact Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-8 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {debouncedSearchTerm !== searchTerm && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Tier Filter Dropdown */}
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as TierLevel);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          >
            <option value="all">All Tiers</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          {/* Pagination Info */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="text-xs text-slate-400 font-medium px-2">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Results Count */}
          <span className="text-xs text-slate-500 font-medium">
            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                
                {/* Checkbox Column */}
                <th className="text-left py-2.5 px-3 w-12">
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      selectAll
                        ? 'bg-violet-500 border-violet-500'
                        : selectedUsers.size > 0
                        ? 'bg-violet-500/50 border-violet-500'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {selectAll ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : selectedUsers.size > 0 ? (
                      <Minus className="h-3 w-3 text-white" />
                    ) : null}
                  </button>
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  User
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('balance')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Balance {getSortIcon('balance')}
                  </button>
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('earned')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Earned {getSortIcon('earned')}
                  </button>
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('redeemed')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Redeemed {getSortIcon('redeemed')}
                  </button>
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Tier
                </th>

                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('lastActivity')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Last Activity {getSortIcon('lastActivity')}
                  </button>
                </th>

                <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user, idx) => {
                const tierColors = getTierColor(user.tierLevel);
                const lastActivity = user.lastEarnedAt || user.lastRedeemedAt;
                const isSelected = selectedUsers.has(user.id);

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/40 transition-all ${
                      idx % 2 === 0 ? 'bg-slate-900/20' : ''
                    } ${isSelected ? 'bg-violet-500/10' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleSelectUser(user.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </button>
                    </td>

                    {/* User Info */}
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="text-white text-sm font-medium">{user.fullName}</p>
                        <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="text-white text-sm font-bold">{formatPoints(user.currentBalance)}</p>
                        <p className="text-slate-500 text-xs">£{user.redemptionValue}</p>
                      </div>
                    </td>

                    {/* Earned */}
                    <td className="py-2.5 px-3">
                      <p className="text-green-400 text-sm font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {formatPoints(user.totalPointsEarned)}
                      </p>
                    </td>

                    {/* Redeemed */}
                    <td className="py-2.5 px-3">
                      <p className="text-blue-400 text-sm font-semibold flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {formatPoints(user.totalPointsRedeemed)}
                      </p>
                    </td>

                    {/* Tier Badge */}
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${tierColors.bg} ${tierColors.text} border ${tierColors.border}`}>
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
                        <p className="text-slate-500 text-xs italic">No activity</p>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewBalance(user)}
                          title="View balance"
                          className="p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/20 rounded-lg transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          title="View history"
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-all"
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
            <p className="text-slate-400 text-lg font-medium">No users found</p>
            <p className="text-slate-500 text-sm mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'No loyalty points data available'}
            </p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-2.5 flex-wrap gap-2">
          
          <span className="text-sm text-slate-400 font-medium">
            Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
          </span>

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
                className={`min-w-[32px] px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentPage === page
                    ? 'bg-violet-500 text-white shadow-lg'
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

      {/* MODALS - Same as before, no changes needed */}
      {/* Balance Modal */}
      {viewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedUser.fullName}</h2>
                    <p className="text-xs text-slate-400">{selectedUser.email}</p>
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

            <div className="overflow-y-auto p-4 space-y-4">
              {loadingModal ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Loading balance...</p>
                </div>
              ) : userBalance ? (
                <>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Current Balance</p>
                      <p className="text-white text-2xl font-bold">{formatPoints(userBalance.currentBalance)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Worth £{userBalance.redemptionValue}</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Total Earned</p>
                      <p className="text-green-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsEarned)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Lifetime</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Total Redeemed</p>
                      <p className="text-blue-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsRedeemed)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Used</p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Expired</p>
                      <p className="text-red-400 text-2xl font-bold">{formatPoints(userBalance.totalPointsExpired)}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Lost</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700">
                    <h4 className="text-sm font-semibold text-white mb-3">Bonus Awards</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${userBalance.firstOrderBonusAwarded ? 'text-green-400' : 'text-slate-600'}`} />
                          <span className="text-sm text-slate-300">First Order Bonus</span>
                        </div>
                        <span className={`text-xs font-semibold ${userBalance.firstOrderBonusAwarded ? 'text-green-400' : 'text-slate-600'}`}>
                          {userBalance.firstOrderBonusAwarded ? 'AWARDED' : 'PENDING'}
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

      {/* History Modal */}
      {historyModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-cyan-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Transaction History</h2>
                    <p className="text-xs text-slate-400">{selectedUser.fullName} • {selectedUser.email}</p>
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

            <div className="overflow-y-auto p-4 space-y-2">
              {loadingModal && userHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-3" />
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
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeInfo.bgColor} ${typeInfo.color} border ${typeInfo.borderColor}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-xs text-slate-500">{formatRelativeDate(transaction.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-300">{transaction.description}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatPoints(transaction.points)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={loadMoreHistory}
                    disabled={loadingModal}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {loadingModal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
