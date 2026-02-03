'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  X,
  Settings,
  Award,
  Coins,
  Gift,
  Star,
  TrendingUp,
  Calendar,
  Percent,
  DollarSign,
  ShoppingBag,
  Users,
  Crown,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/components/CustomToast';
import { 
  loyaltyConfigService, 
  LoyaltyConfig,
  calculatePoints,
  calculateRedemptionValue,
  getTierName 
} from '@/lib/services/loyaltyConfig';

export default function LoyaltyConfigPage() {
  const toast = useToast();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  // ============================================================
  // FETCH CONFIG
  // ============================================================
  
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await loyaltyConfigService.get();

      if (response.data?.success && response.data.data) {
        setConfig(response.data.data);
      } else {
        toast.error(response.error || 'Failed to load loyalty configuration');
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load loyalty configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // ============================================================
  // HANDLE EDIT
  // ============================================================
  
  const handleEdit = () => {
    if (config) {
      setEditedConfig(JSON.parse(JSON.stringify(config)));
      setIsModalOpen(true);
    }
  };

  // ============================================================
  // HANDLE SAVE
  // ============================================================
  
  const handleSave = async () => {
    if (!editedConfig) return;

    try {
      setSaving(true);

      const userEmail = localStorage.getItem('userEmail') || 'admin';

      const response = await loyaltyConfigService.update({
        ...editedConfig,
        updatedBy: userEmail,
        updatedAt: new Date().toISOString(),
      });

      if (response.data?.success) {
        toast.success('Loyalty configuration updated successfully!');
        setConfig(response.data.data || editedConfig);
        setIsModalOpen(false);
        setEditedConfig(null);
      } else {
        toast.error(response.error || 'Failed to update configuration');
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CALCULATE STATS
  // ============================================================
  
  const calculateExamples = () => {
    if (!config) return null;

    const order50 = calculatePoints(50, config);
    const order100 = calculatePoints(100, config);
    const redeem1000 = calculateRedemptionValue(1000, config);
    const tier1 = getTierName(config.silverTierThreshold, config);
    const tier2 = getTierName(config.goldTierThreshold, config);

    return {
      order50,
      order100,
      redeem1000,
      tier1,
      tier2,
    };
  };

  const examples = calculateExamples();

  // ============================================================
  // LOADING STATE
  // ============================================================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading loyalty configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Failed to load loyalty configuration</p>
          <button
            onClick={fetchConfig}
            className="mt-4 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  
  return (
    <div className="space-y-4">
      
      {/* ✅ HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Loyalty Program Configuration
          </h1>
          <p className="text-slate-400 mt-1">
            Manage reward points, redemption rates, and tier systems
          </p>
        </div>

        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-violet-500/50 transition-all"
        >
          <Edit className="h-4 w-4" />
          Edit Configuration
        </button>
      </div>

      {/* ✅ STATUS CARD */}
      <div className={`p-4 rounded-xl border-2 ${
        config.isActive
          ? 'bg-green-500/10 border-green-500/50'
          : 'bg-red-500/10 border-red-500/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              config.isActive ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {config.isActive ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div>
              <h3 className={`text-lg font-bold ${
                config.isActive ? 'text-green-400' : 'text-red-400'
              }`}>
                Loyalty Program {config.isActive ? 'Active' : 'Inactive'}
              </h3>
              <p className="text-sm text-slate-400">
                Last updated: {new Date(config.updatedAt).toLocaleString('en-GB')}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">Configuration ID</p>
            <p className="text-xs text-slate-400 font-mono">{config.id}</p>
          </div>
        </div>
      </div>

      {/* ✅ KEY METRICS - 4 CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Points Per Pound */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Points per £1</p>
              <p className="text-white text-2xl font-bold">{config.pointsPerPound}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">
                Min order: £{config.minimumOrderAmountForPoints}
              </p>
            </div>
          </div>
        </div>

        {/* Redemption Rate */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <Gift className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Redemption Rate</p>
              <p className="text-white text-2xl font-bold">{config.redemptionRate}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">
                points = £1
              </p>
            </div>
          </div>
        </div>

        {/* Minimum Redemption */}
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-4 hover:border-violet-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Star className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Min Redemption</p>
              <p className="text-white text-2xl font-bold">{config.minimumRedemptionPoints}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">
                = £{(config.minimumRedemptionPoints / config.redemptionRate).toFixed(2)} off
              </p>
            </div>
          </div>
        </div>

        {/* Max Redemption % */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4 hover:border-orange-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <Percent className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs font-medium">Max Redemption</p>
              <p className="text-white text-2xl font-bold">{config.maxRedemptionPercentOfOrder}%</p>
              <p className="text-slate-500 text-[10px] mt-0.5">
                of order value
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ TIER SYSTEM */}
      {config.tierSystemEnabled && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            Customer Tier System
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Bronze Tier */}
            <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/5 border border-orange-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-orange-400" />
                <h4 className="font-semibold text-orange-300">Bronze Tier</h4>
              </div>
              <p className="text-slate-400 text-sm">Default tier for all customers</p>
              <p className="text-white font-bold text-lg mt-2">0 points</p>
            </div>

            {/* Silver Tier */}
            <div className="bg-gradient-to-br from-slate-400/10 to-slate-500/5 border border-slate-400/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-slate-300" />
                <h4 className="font-semibold text-slate-200">Silver Tier</h4>
              </div>
              <p className="text-slate-400 text-sm">Enhanced rewards & perks</p>
              <p className="text-white font-bold text-lg mt-2">{config.silverTierThreshold.toLocaleString()} points</p>
            </div>

            {/* Gold Tier */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h4 className="font-semibold text-yellow-300">Gold Tier</h4>
              </div>
              <p className="text-slate-400 text-sm">VIP treatment & exclusive benefits</p>
              <p className="text-white font-bold text-lg mt-2">{config.goldTierThreshold.toLocaleString()} points</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ BONUS PROGRAMS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* First Order Bonus */}
        <div className={`rounded-xl p-4 border ${
          config.firstOrderBonusEnabled
            ? 'bg-cyan-500/10 border-cyan-500/30'
            : 'bg-slate-800/30 border-slate-700/30 opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className={`h-5 w-5 ${
                config.firstOrderBonusEnabled ? 'text-cyan-400' : 'text-slate-500'
              }`} />
              <h4 className={`font-semibold ${
                config.firstOrderBonusEnabled ? 'text-cyan-300' : 'text-slate-500'
              }`}>
                First Order Bonus
              </h4>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              config.firstOrderBonusEnabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {config.firstOrderBonusEnabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {config.firstOrderBonusPoints} points
          </p>
          <p className="text-xs text-slate-400">
            Awarded on first purchase
          </p>
        </div>

        {/* Review Bonus */}
        <div className={`rounded-xl p-4 border ${
          config.reviewBonusEnabled
            ? 'bg-violet-500/10 border-violet-500/30'
            : 'bg-slate-800/30 border-slate-700/30 opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className={`h-5 w-5 ${
                config.reviewBonusEnabled ? 'text-violet-400' : 'text-slate-500'
              }`} />
              <h4 className={`font-semibold ${
                config.reviewBonusEnabled ? 'text-violet-300' : 'text-slate-500'
              }`}>
                Review Bonus
              </h4>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              config.reviewBonusEnabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {config.reviewBonusEnabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {config.reviewBonusPoints} points
          </p>
          <p className="text-xs text-slate-400">
            Max {config.maxReviewBonusPerProduct} per product
          </p>
        </div>

        {/* Referral Bonus */}
        <div className={`rounded-xl p-4 border ${
          config.referralBonusEnabled
            ? 'bg-pink-500/10 border-pink-500/30'
            : 'bg-slate-800/30 border-slate-700/30 opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className={`h-5 w-5 ${
                config.referralBonusEnabled ? 'text-pink-400' : 'text-slate-500'
              }`} />
              <h4 className={`font-semibold ${
                config.referralBonusEnabled ? 'text-pink-300' : 'text-slate-500'
              }`}>
                Referral Bonus
              </h4>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              config.referralBonusEnabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {config.referralBonusEnabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {config.referralBonusPoints} points
          </p>
          <p className="text-xs text-slate-400">
            For successful referral
          </p>
        </div>
      </div>

      {/* ✅ EXPIRY SETTINGS */}
      <div className={`rounded-xl p-4 border ${
        config.enableExpiry
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-slate-800/30 border-slate-700/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              config.enableExpiry ? 'bg-orange-500/20' : 'bg-slate-700/50'
            }`}>
              <Clock className={`h-6 w-6 ${
                config.enableExpiry ? 'text-orange-400' : 'text-slate-500'
              }`} />
            </div>
            <div>
              <h4 className={`font-semibold ${
                config.enableExpiry ? 'text-orange-300' : 'text-slate-400'
              }`}>
                Points Expiry
              </h4>
              <p className="text-sm text-slate-400">
                {config.enableExpiry
                  ? `Points expire after ${config.pointsExpiryMonths} months`
                  : 'Points never expire'}
              </p>
            </div>
          </div>

          {config.enableExpiry && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Warning Period</p>
              <p className="text-white font-bold text-lg">{config.expiryWarningDays} days</p>
              <p className="text-xs text-slate-400">before expiry</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ EXAMPLES - TOGGLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
        
        {/* Toggle Header */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Example Calculations</h3>
          </div>
          {showExamples ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {/* Examples Content */}
        {showExamples && examples && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Customer spends £50</p>
              <p className="text-2xl font-bold text-cyan-400">{examples.order50} points</p>
              <p className="text-xs text-slate-500 mt-1">earned on order</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Customer spends £100</p>
              <p className="text-2xl font-bold text-cyan-400">{examples.order100} points</p>
              <p className="text-xs text-slate-500 mt-1">earned on order</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Redeem 1000 points</p>
              <p className="text-2xl font-bold text-green-400">£{examples.redeem1000.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">discount on order</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Reach Silver Tier</p>
              <p className="text-2xl font-bold text-slate-300">{config.silverTierThreshold.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">points required</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Reach Gold Tier</p>
              <p className="text-2xl font-bold text-yellow-400">{config.goldTierThreshold.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">points required</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">First order bonus</p>
              <p className="text-2xl font-bold text-pink-400">{config.firstOrderBonusPoints}</p>
              <p className="text-xs text-slate-500 mt-1">welcome points</p>
            </div>
          </div>
        )}
      </div>

      {/* ✅ EDIT MODAL */}
      {isModalOpen && editedConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Loyalty Configuration</h2>
                    <p className="text-sm text-slate-400">Configure rewards, tiers, and bonuses</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditedConfig(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto p-5 space-y-6">
              
              {/* System Status */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedConfig.isActive}
                    onChange={(e) => setEditedConfig({ ...editedConfig, isActive: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                  />
                  <div>
                    <p className="text-white font-medium">Enable Loyalty Program</p>
                    <p className="text-xs text-slate-400">Turn on/off the entire loyalty system</p>
                  </div>
                </label>
              </div>

              {/* Points Earning */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-cyan-400" />
                  Points Earning
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Points per £1 Spent <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editedConfig.pointsPerPound}
                      onChange={(e) => setEditedConfig({ ...editedConfig, pointsPerPound: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Minimum Order Amount (£) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedConfig.minimumOrderAmountForPoints}
                      onChange={(e) => setEditedConfig({ ...editedConfig, minimumOrderAmountForPoints: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedConfig.includeShippingInPoints}
                        onChange={(e) => setEditedConfig({ ...editedConfig, includeShippingInPoints: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-300">Include shipping cost in points calculation</span>
                    </label>
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedConfig.includeTaxInPoints}
                        onChange={(e) => setEditedConfig({ ...editedConfig, includeTaxInPoints: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-300">Include tax in points calculation</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Points Redemption */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-400" />
                  Points Redemption
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Redemption Rate (points = £1) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editedConfig.redemptionRate}
                      onChange={(e) => setEditedConfig({ ...editedConfig, redemptionRate: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {editedConfig.redemptionRate} points = £1 discount
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Minimum Redemption Points <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editedConfig.minimumRedemptionPoints}
                      onChange={(e) => setEditedConfig({ ...editedConfig, minimumRedemptionPoints: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Max Redemption % of Order <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editedConfig.maxRedemptionPercentOfOrder}
                      onChange={(e) => setEditedConfig({ ...editedConfig, maxRedemptionPercentOfOrder: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedConfig.roundDownRedemptionValue}
                        onChange={(e) => setEditedConfig({ ...editedConfig, roundDownRedemptionValue: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-300">Round down redemption value to nearest penny</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tier System */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    Tier System
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedConfig.tierSystemEnabled}
                      onChange={(e) => setEditedConfig({ ...editedConfig, tierSystemEnabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-300">Enable Tiers</span>
                  </label>
                </div>

                {editedConfig.tierSystemEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Silver Tier Threshold (points) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editedConfig.silverTierThreshold}
                        onChange={(e) => setEditedConfig({ ...editedConfig, silverTierThreshold: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Gold Tier Threshold (points) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editedConfig.goldTierThreshold}
                        onChange={(e) => setEditedConfig({ ...editedConfig, goldTierThreshold: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bonus Programs */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-pink-400" />
                  Bonus Programs
                </h3>

                <div className="space-y-4">
                  
                  {/* First Order Bonus */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editedConfig.firstOrderBonusEnabled}
                          onChange={(e) => setEditedConfig({ ...editedConfig, firstOrderBonusEnabled: e.target.checked })}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-300 font-medium">First Order Bonus</span>
                      </label>
                    </div>
                    {editedConfig.firstOrderBonusEnabled && (
                      <input
                        type="number"
                        min="0"
                        value={editedConfig.firstOrderBonusPoints}
                        onChange={(e) => setEditedConfig({ ...editedConfig, firstOrderBonusPoints: Number(e.target.value) })}
                        className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Points"
                      />
                    )}
                  </div>

                  {/* Review Bonus */}
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editedConfig.reviewBonusEnabled}
                          onChange={(e) => setEditedConfig({ ...editedConfig, reviewBonusEnabled: e.target.checked })}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-300 font-medium">Review Bonus</span>
                      </label>
                      {editedConfig.reviewBonusEnabled && (
                        <input
                          type="number"
                          min="0"
                          value={editedConfig.reviewBonusPoints}
                          onChange={(e) => setEditedConfig({ ...editedConfig, reviewBonusPoints: Number(e.target.value) })}
                          className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="Points"
                        />
                      )}
                    </div>
                    {editedConfig.reviewBonusEnabled && (
                      <div className="ml-6">
                        <label className="block text-xs text-slate-400 mb-1">Max reviews per product</label>
                        <input
                          type="number"
                          min="1"
                          value={editedConfig.maxReviewBonusPerProduct}
                          onChange={(e) => setEditedConfig({ ...editedConfig, maxReviewBonusPerProduct: Number(e.target.value) })}
                          className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Referral Bonus */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editedConfig.referralBonusEnabled}
                          onChange={(e) => setEditedConfig({ ...editedConfig, referralBonusEnabled: e.target.checked })}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-300 font-medium">Referral Bonus</span>
                      </label>
                    </div>
                    {editedConfig.referralBonusEnabled && (
                      <input
                        type="number"
                        min="0"
                        value={editedConfig.referralBonusPoints}
                        onChange={(e) => setEditedConfig({ ...editedConfig, referralBonusPoints: Number(e.target.value) })}
                        className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Points"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Points Expiry */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-400" />
                    Points Expiry
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedConfig.enableExpiry}
                      onChange={(e) => setEditedConfig({ ...editedConfig, enableExpiry: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-300">Enable Expiry</span>
                  </label>
                </div>

                {editedConfig.enableExpiry && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Expiry Period (months) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editedConfig.pointsExpiryMonths}
                        onChange={(e) => setEditedConfig({ ...editedConfig, pointsExpiryMonths: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Expiry Warning (days before) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editedConfig.expiryWarningDays}
                        onChange={(e) => setEditedConfig({ ...editedConfig, expiryWarningDays: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                <span className="text-red-400">*</span> Required fields
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditedConfig(null);
                  }}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
