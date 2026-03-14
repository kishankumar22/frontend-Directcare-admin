import { apiClient } from '../api';
import { API_ENDPOINTS } from '../api-config';

export type DashboardPeriod = 'today' | 'week' | 'month' | '6months' | 'year';

// ── Nested types ──────────────────────────────────────────────────────────────

export interface RevenueChartPoint {
  label: string;
  date: string;
  revenue: number;
  orders: number;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  itemCount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string;
  totalSold: number;
  totalRevenue: number;
  stockQuantity: number;
}

// ── Main DTO (mirrors typical .NET dashboard response) ────────────────────────

export interface DashboardStats {
  // Revenue
  totalRevenue: number;
  revenueToday: number;
  revenueThisPeriod: number;
  revenuePreviousPeriod: number;
  revenueChangePercent: number;

  // Orders
  totalOrders: number;
  ordersToday: number;
  ordersThisPeriod: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  ordersChangePercent: number;

  // Products
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;

  // Customers
  totalCustomers: number;
  newCustomers: number;
  newCustomersThisMonth: number;
  customersChangePercent: number;

  // Charts & lists
  revenueChart: RevenueChartPoint[];
  orderStatusBreakdown: OrderStatusBreakdown[];
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];

  // Meta
  period: string;
  generatedAt?: string;
}

// ── Status colour map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:    '#F59E0B',
  Processing: '#06B6D4',
  Shipped:    '#8B5CF6',
  Delivered:  '#10B981',
  Cancelled:  '#EF4444',
  Returned:   '#F97316',
  OnHold:     '#6366F1',
  Refunded:   '#EC4899',
};

// ── Parser — handles any camelCase variation the backend might use ─────────────

function parse(raw: any): DashboardStats {
  if (!raw) return empty();

  const n = (v: any): number => {
    if (v === undefined || v === null || typeof v === 'object') return 0;
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };

  const s = (v: any): string => (v !== undefined && v !== null ? String(v) : '');

  // ── Nested groups from the known API structure ────────────────────────────
  const ov   = raw.overview        ?? {};   // KPI stats
  const pa   = raw.pendingActions  ?? {};   // pending/processing counts
  const rt   = raw.revenueTrend    ?? {};   // chart data
  const ob   = raw.orderBreakdown  ?? {};   // order breakdown

  // Build a quick lookup from orderBreakdown.byStatus array: { Delivered: 45, Cancelled: 14, ... }
  const statusCountMap: Record<string, number> = {};
  const byStatusArr: any[] = Array.isArray(ob.byStatus) ? ob.byStatus : [];
  for (const item of byStatusArr) {
    const statusKey = s(item.status ?? item.name ?? item.label);
    if (statusKey) statusCountMap[statusKey] = n(item.count ?? item.value ?? item.total);
  }

  // ── Revenue ───────────────────────────────────────────────────────────────
  const totalRevenue          = n(ov.totalRevenueAllTime ?? ov.totalRevenue ?? raw.totalRevenue);
  const revenueToday          = n(ov.todayRevenue        ?? ov.revenueToday ?? raw.revenueToday);
  const revenueThisPeriod     = n(ov.currentPeriodRevenue ?? ov.revenueThisPeriod ?? raw.revenueThisPeriod);
  const revenuePreviousPeriod = n(ov.previousPeriodRevenue ?? raw.revenuePreviousPeriod);
  const revenueChangePercent  = n(ov.revenueGrowthPercent ?? ov.revenueChangePercent ?? raw.revenueChangePercent);

  // ── Orders ────────────────────────────────────────────────────────────────
  const totalOrders      = n(ov.totalOrdersAllTime ?? ov.totalOrders ?? raw.totalOrders);
  const ordersToday      = n(ov.todayOrders        ?? ov.ordersToday ?? raw.ordersToday);
  const ordersThisPeriod = n(ov.currentPeriodOrders ?? ov.ordersThisPeriod ?? raw.ordersThisPeriod);
  const pendingOrders    = n(pa.pendingOrders    ?? ov.pendingOrders    ?? raw.pendingOrders)    || (statusCountMap['Pending']    ?? 0);
  const processingOrders = n(pa.processingOrders ?? ov.processingOrders ?? raw.processingOrders) || (statusCountMap['Processing'] ?? 0);
  const shippedOrders    = n(pa.shippedOrders    ?? ov.shippedOrders    ?? raw.shippedOrders)    || (statusCountMap['Shipped']    ?? 0);
  const deliveredOrders  = n(pa.deliveredOrders  ?? ov.deliveredOrders  ?? raw.deliveredOrders)  || (statusCountMap['Delivered']  ?? 0);
  const cancelledOrders  = n(pa.cancelledOrders  ?? ov.cancelledOrders  ?? raw.cancelledOrders)  || (statusCountMap['Cancelled']  ?? 0);
  const returnedOrders   = n(pa.returnedOrders   ?? ov.returnedOrders   ?? raw.returnedOrders)   || (statusCountMap['Returned']   ?? 0);
  const ordersChangePercent = n(ov.orderGrowthPercent ?? ov.ordersChangePercent ?? raw.ordersChangePercent);

  // ── Products ──────────────────────────────────────────────────────────────
  const totalProducts      = n(ov.totalProducts      ?? raw.totalProducts);
  const activeProducts     = n(ov.activeProducts     ?? raw.activeProducts);
  const outOfStockProducts = n(ov.outOfStockProducts ?? raw.outOfStockProducts);
  const lowStockProducts   = n(ov.lowStockProducts   ?? raw.lowStockProducts);

  // ── Customers ─────────────────────────────────────────────────────────────
  const totalCustomers         = n(ov.totalCustomers         ?? raw.totalCustomers);
  const newCustomers           = n(ov.newCustomers           ?? ov.monthNewCustomers ?? raw.newCustomers);
  const newCustomersThisMonth  = n(ov.monthNewCustomers      ?? ov.newCustomersThisMonth ?? raw.newCustomersThisMonth) || newCustomers;
  const customersChangePercent = n(ov.customerGrowthPercent  ?? ov.customersChangePercent ?? raw.customersChangePercent);

  // ── Revenue chart ─────────────────────────────────────────────────────────
  // Use last30Days for daily data, last12Months for monthly
  const dailyArr   = Array.isArray(rt.last30Days)    ? rt.last30Days    : [];
  const monthlyArr = Array.isArray(rt.last12Months)  ? rt.last12Months  : [];
  const fallbackArr = Array.isArray(raw.revenueChart) ? raw.revenueChart
                    : Array.isArray(raw.chartData)    ? raw.chartData
                    : [];

  const chartSource = dailyArr.length > 0 ? dailyArr
                    : monthlyArr.length > 0 ? monthlyArr
                    : fallbackArr;

  const revenueChart: RevenueChartPoint[] = chartSource.map((p: any) => ({
    label:   s(p.dayLabel ?? p.monthName ?? p.label ?? p.date ?? p.day ?? p.period ?? p.name),
    date:    s(p.date     ?? p.day       ?? p.period ?? p.label),
    revenue: n(p.revenue  ?? p.totalRevenue ?? p.sales ?? p.amount),
    orders:  n(p.orders   ?? p.orderCount   ?? p.count ?? p.ordersCount),
  }));

  // ── Order status breakdown ─────────────────────────────────────────────────
  const rawStatusArr = Array.isArray(ob.byStatus)
    ? ob.byStatus
    : Array.isArray(raw.orderStatusBreakdown) ? raw.orderStatusBreakdown
    : Array.isArray(raw.statusBreakdown)       ? raw.statusBreakdown
    : [];

  const statusFromBreakdown: OrderStatusBreakdown[] = rawStatusArr.map((s2: any) => {
    const status = s(s2.status ?? s2.name ?? s2.label);
    return {
      status,
      count:      n(s2.count      ?? s2.value ?? s2.total),
      percentage: n(s2.percentage ?? s2.percent ?? s2.pct),
      color:      STATUS_COLORS[status] ?? '#6366F1',
    };
  });

  const statusBreakdown: OrderStatusBreakdown[] = statusFromBreakdown.length > 0
    ? statusFromBreakdown
    : Object.entries({
        Pending:    pendingOrders,
        Processing: processingOrders,
        Shipped:    shippedOrders,
        Delivered:  deliveredOrders,
        Cancelled:  cancelledOrders,
        Returned:   returnedOrders,
      })
        .filter(([, c]) => (c as number) > 0)
        .map(([status, count]) => ({
          status,
          count: count as number,
          percentage: totalOrders > 0 ? Math.round(((count as number) / totalOrders) * 100) : 0,
          color: STATUS_COLORS[status] ?? '#6366F1',
        }));

  // ── Recent orders ──────────────────────────────────────────────────────────
  const rawOrdersArr = Array.isArray(raw.recentOrders)  ? raw.recentOrders
                     : Array.isArray(raw.latestOrders)   ? raw.latestOrders
                     : [];
  const recentOrders: RecentOrder[] = rawOrdersArr.slice(0, 8).map((o: any) => ({
    id:            s(o.id          ?? o.orderId),
    orderNumber:   s(o.orderNumber ?? o.number   ?? o.orderNo),
    customerName:  s(o.customerName ?? o.customer ?? o.name) || 'Guest',
    customerEmail: s(o.customerEmail ?? o.email),
    totalAmount:   n(o.totalAmount   ?? o.total   ?? o.amount),
    status:        s(o.status        ?? o.orderStatus),
    orderDate:     s(o.orderDate     ?? o.createdAt ?? o.date),
    itemCount:     n(o.itemCount     ?? o.itemsCount ?? o.totalItems ?? o.quantity),
  }));

  // ── Top products ───────────────────────────────────────────────────────────
  const rawProductsArr = Array.isArray(raw.topProducts)         ? raw.topProducts
                       : Array.isArray(raw.bestSellers)          ? raw.bestSellers
                       : Array.isArray(raw.topSellingProducts)   ? raw.topSellingProducts
                       : [];

  const resolveImageUrl = (url: any): string | undefined => {
    if (!url) return undefined;
    const str = String(url);
    if (str.startsWith('http://') || str.startsWith('https://')) return str;
    if (str.startsWith('/')) return `https://testapi.knowledgemarkg.com${str}`;
    return str || undefined;
  };

  const topProducts: TopProduct[] = rawProductsArr.slice(0, 6).map((p: any) => ({
    id:            s(p.id        ?? p.productId),
    name:          s(p.name      ?? p.productName),
    sku:           s(p.sku       ?? p.productSku),
    imageUrl:      resolveImageUrl(
                     p.imageUrl      ?? p.image       ?? p.thumbnail    ?? p.productImage ??
                     p.coverImage    ?? p.mainImage   ?? p.primaryImage ?? p.thumbnailUrl ??
                     p.productImageUrl
                   ),
    totalSold:     n(p.totalUnitsSold   ?? p.totalSold   ?? p.soldCount   ?? p.quantitySold ??
                     p.unitsSold        ?? p.sales),
    totalRevenue:  n(p.totalRevenue     ?? p.revenue     ?? p.totalSales  ?? p.grossRevenue),
    stockQuantity: n(p.currentStock     ?? p.stockQuantity ?? p.stock     ?? p.inStock ??
                     p.availableQuantity ?? p.quantity),
  }));

  return {
    totalRevenue, revenueToday, revenueThisPeriod, revenuePreviousPeriod, revenueChangePercent,
    totalOrders, ordersToday, ordersThisPeriod,
    pendingOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, returnedOrders,
    ordersChangePercent,
    totalProducts, activeProducts, outOfStockProducts, lowStockProducts,
    totalCustomers, newCustomers, newCustomersThisMonth, customersChangePercent,
    revenueChart,
    orderStatusBreakdown: statusBreakdown,
    recentOrders,
    topProducts,
    period: s(raw.period ?? raw.periodType) || 'month',
    generatedAt: s(raw.generatedAt ?? raw.timestamp ?? raw.createdAt) || undefined,
  };
}

function empty(): DashboardStats {
  return {
    totalRevenue: 0, revenueToday: 0, revenueThisPeriod: 0,
    revenuePreviousPeriod: 0, revenueChangePercent: 0,
    totalOrders: 0, ordersToday: 0, ordersThisPeriod: 0,
    pendingOrders: 0, processingOrders: 0, shippedOrders: 0,
    deliveredOrders: 0, cancelledOrders: 0, returnedOrders: 0, ordersChangePercent: 0,
    totalProducts: 0, activeProducts: 0, outOfStockProducts: 0, lowStockProducts: 0,
    totalCustomers: 0, newCustomers: 0, newCustomersThisMonth: 0, customersChangePercent: 0,
    revenueChart: [], orderStatusBreakdown: [], recentOrders: [], topProducts: [],
    period: 'month',
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class DashboardService {
  async getStats(
    period: DashboardPeriod = 'month',
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStats> {
    const params = new URLSearchParams({ period });
    if (startDate) params.set('startDate', startDate);
    if (endDate)   params.set('endDate',   endDate);

    const url = `${(API_ENDPOINTS as any).dashboard.stats}?${params}`;
    const res  = await apiClient.get<any>(url);

    if (res.error) throw new Error(res.error);

    const raw = res.data?.data ?? res.data ?? res;
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] raw API response:', raw);
    }
    return parse(raw);
  }

  async getOverview(period: DashboardPeriod = 'month'): Promise<DashboardStats> {
    const url = `${(API_ENDPOINTS as any).dashboard.overview}?period=${period}`;
    const res  = await apiClient.get<any>(url);

    if (res.error) throw new Error(res.error);

    const raw = res.data?.data ?? res.data ?? res;
    return parse(raw);
  }
}

export const dashboardService = new DashboardService();
