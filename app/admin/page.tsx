"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Package, Users, PoundSterling, TrendingUp, TrendingDown,
  ArrowUpRight, RefreshCcw, Clock, Star, Award, AlertTriangle,
  CheckCircle2, XCircle, Truck, Timer, BarChart3, Loader2,
  CalendarDays, ShoppingBag, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { productsService, orderService, customersService } from "@/lib/services";


type DateRange = "7d" | "1m" | "6m" | "1y";

const COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#EC4899"];

const rangeConfig: Record<DateRange, { days: number; label: string }> = {
  "7d": { days: 7,   label: "7 days"   },
  "1m": { days: 30,  label: "30 days"  },
  "6m": { days: 180, label: "6 months" },
  "1y": { days: 365, label: "1 year"   },
};

function formatCurrency(v: number) {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatRelTime(dateStr: string) {
  if (!dateStr) return "N/A";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}
function getInitials(name: string) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange]   = useState<DateRange>("7d");

  // ---------- stats ----------
  const [revenue, setRevenue]             = useState({ total: 0, today: 0, change: 0 });
  const [orders, setOrders]               = useState({ total: 0, today: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, change: 0 });
  const [products, setProducts]           = useState({ total: 0, active: 0, outOfStock: 0, lowStock: 0 });
  const [customers, setCustomers]         = useState({ total: 0, newThisMonth: 0, change: 0 });
  const [revenueChart, setRevenueChart]   = useState<any[]>([]);
  const [orderStatusChart, setOrderStatusChart] = useState<any[]>([]);
  const [recentOrders, setRecentOrders]   = useState<any[]>([]);
  const [topProducts, setTopProducts]     = useState<any[]>([]);

  // ---------- fetch ----------
  const fetchDashboard = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);

    try {
  const [prodRes, orderRes, custRes] = await Promise.all([
  productsService.getAll(),
  orderService.getAllOrders(),
  customersService.getAll(),
]);

      // ---- parse products ----
      let prods: any[] = [];
      const pr = prodRes as any;
      if (pr?.data?.data?.items) prods = pr.data.data.items;
      else if (pr?.data?.items)  prods = pr.data.items;
      else if (Array.isArray(pr?.data)) prods = pr.data;

      // ---- parse orders ----
      let ords: any[] = [];
      const or = orderRes as any;
      if (or?.data?.data?.items) ords = or.data.data.items;
      else if (or?.data?.items)  ords = or.data.items;
      else if (or?.items)        ords = or.items;
      else if (Array.isArray(or?.data)) ords = or.data;

      // ---- parse customers ----
      let custs: any[] = [];
      const cr = custRes as any;
      if (cr?.data?.data?.items) custs = cr.data.data.items;
      else if (cr?.data?.items)  custs = cr.data.items;
      else if (Array.isArray(cr?.data)) custs = cr.data;

      const now   = new Date();
      const today = now.toISOString().split("T")[0];
      const d30   = new Date(now.getTime() - 30  * 864e5);
      const d60   = new Date(now.getTime() - 60  * 864e5);
      const d1m   = new Date(now.getFullYear(), now.getMonth(), 1);

      // ---- revenue ----
      const totalRev  = ords.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const todayRev  = ords.filter((o: any) => o.orderDate?.startsWith(today)).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const rev30     = ords.filter((o: any) => new Date(o.orderDate) >= d30).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const revPrev30 = ords.filter((o: any) => { const d = new Date(o.orderDate); return d >= d60 && d < d30; }).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
      const revChange = revPrev30 > 0 ? ((rev30 - revPrev30) / revPrev30) * 100 : rev30 > 0 ? 100 : 0;
      setRevenue({ total: totalRev, today: todayRev, change: Math.round(revChange * 10) / 10 });

      // ---- orders stats ----
      const todayOrds   = ords.filter((o: any) => o.orderDate?.startsWith(today));
      const ords30      = ords.filter((o: any) => new Date(o.orderDate) >= d30);
      const ordsPrev30  = ords.filter((o: any) => { const d = new Date(o.orderDate); return d >= d60 && d < d30; });
      const ordsChange  = ordsPrev30.length > 0 ? ((ords30.length - ordsPrev30.length) / ordsPrev30.length) * 100 : ords30.length > 0 ? 100 : 0;
      const countStatus = (s: string) => ords.filter((o: any) => (o.status || "").toLowerCase() === s.toLowerCase()).length;
      setOrders({
        total: ords.length,
        today: todayOrds.length,
        pending:    countStatus("Pending"),
        processing: countStatus("Processing"),
        shipped:    countStatus("Shipped"),
        delivered:  countStatus("Delivered"),
        cancelled:  countStatus("Cancelled"),
        change: Math.round(ordsChange * 10) / 10,
      });

      // ---- order status chart ----
      setOrderStatusChart([
        { name: "Pending",    value: countStatus("Pending"),    color: "#F59E0B" },
        { name: "Processing", value: countStatus("Processing"), color: "#06B6D4" },
        { name: "Shipped",    value: countStatus("Shipped"),    color: "#8B5CF6" },
        { name: "Delivered",  value: countStatus("Delivered"),  color: "#10B981" },
        { name: "Cancelled",  value: countStatus("Cancelled"),  color: "#EF4444" },
      ].filter(x => x.value > 0));

      // ---- products ----
      const activeP   = prods.filter((p: any) => p.isActive !== false && !p.isDeleted).length;
      const outStock  = prods.filter((p: any) => !p.isDeleted && (p.stockQuantity ?? 0) === 0 && p.trackQuantity !== false).length;
      const lowStockP = prods.filter((p: any) => !p.isDeleted && (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= (p.lowStockThreshold || 5) && p.trackQuantity !== false).length;
      setProducts({ total: prods.length, active: activeP, outOfStock: outStock, lowStock: lowStockP });

      // ---- customers ----
      const newThisMonth = custs.filter((c: any) => c.createdAt && new Date(c.createdAt) >= d1m).length;
      const custs30      = custs.filter((c: any) => c.createdAt && new Date(c.createdAt) >= d30).length;
      const custsPrev30  = custs.filter((c: any) => { if (!c.createdAt) return false; const d = new Date(c.createdAt); return d >= d60 && d < d30; }).length;
      const custChange   = custsPrev30 > 0 ? ((custs30 - custsPrev30) / custsPrev30) * 100 : custs30 > 0 ? 100 : 0;
      setCustomers({ total: custs.length, newThisMonth, change: Math.round(custChange * 10) / 10 });

      // ---- revenue chart (stored for re-render on dateRange change) ----
      buildRevenueChart(ords, dateRange);

      // ---- recent orders ----
      const sorted = [...ords].sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setRecentOrders(sorted.slice(0, 6).map((o: any) => ({
        id:       o.orderNumber || o.id?.slice(-6) || "?",
        customer: o.customerName || "Guest",
        email:    o.customerEmail || "",
        product:  o.orderItems?.[0]?.productName || `${o.orderItems?.length || 0} items`,
        amount:   o.totalAmount || 0,
        status:   o.status || "Pending",
        date:     o.orderDate,
      })));

      // ---- top products ----
      const sales: Record<string, any> = {};
      ords.forEach((o: any) => o.orderItems?.forEach((it: any) => {
        if (!sales[it.productId]) sales[it.productId] = { name: it.productName, qty: 0, rev: 0 };
        sales[it.productId].qty += it.quantity || 1;
        sales[it.productId].rev += it.totalPrice || 0;
      }));
      const topP = Object.entries(sales)
        .map(([id, d]: [string, any]) => {
          const p = prods.find((x: any) => x.id === id);
          return { id, name: d.name, sales: d.qty, revenue: d.rev, stock: p?.stockQuantity ?? 0, rating: p?.averageRating ?? 0 };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      setTopProducts(topP);

      setLastUpdated(new Date());

      // store ords for chart re-build
      (window as any).__dashOrders = ords;
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const buildRevenueChart = (ords: any[], range: DateRange) => {
    const days = rangeConfig[range].days;
    const map: Record<string, { rev: number; orders: number }> = {};

    // For 6m/1y group by week/month
    if (days <= 30) {
      // daily
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        map[key] = { rev: 0, orders: 0 };
        (map as any)[key].__label = label;
      }
      ords.forEach((o: any) => {
        const key = o.orderDate?.split("T")[0];
        if (map[key]) { map[key].rev += o.totalAmount || 0; map[key].orders += 1; }
      });
      setRevenueChart(Object.entries(map).map(([, v]: [string, any]) => ({
        name: v.__label, revenue: Math.round(v.rev), orders: v.orders,
      })));
    } else {
      // weekly buckets
      const buckets: { label: string; rev: number; orders: number }[] = [];
      const weeks = Math.ceil(days / 7);
      for (let i = weeks - 1; i >= 0; i--) {
        const wEnd = new Date(); wEnd.setDate(wEnd.getDate() - i * 7);
        const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
        buckets.push({ label: wStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), rev: 0, orders: 0 });
        const startTs = wStart.getTime();
        const endTs = wEnd.getTime() + 864e5;
        ords.forEach((o: any) => {
          const t = new Date(o.orderDate).getTime();
          if (t >= startTs && t <= endTs) { buckets[buckets.length - 1].rev += o.totalAmount || 0; buckets[buckets.length - 1].orders += 1; }
        });
      }
      setRevenueChart(buckets.map(b => ({ name: b.label, revenue: Math.round(b.rev), orders: b.orders })));
    }
  };

  // Re-build chart when dateRange changes (use cached orders)
  useEffect(() => {
    const cached = (window as any).__dashOrders;
    if (cached) buildRevenueChart(cached, dateRange);
    else fetchDashboard(loading);
  }, [dateRange]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchDashboard(true);
    const interval = setInterval(() => fetchDashboard(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const statusMeta: Record<string, { color: string; icon: any; bg: string }> = {
    Pending:    { color: "text-amber-400",  icon: Timer,         bg: "bg-amber-500/10"  },
    Processing: { color: "text-cyan-400",   icon: RefreshCcw,    bg: "bg-cyan-500/10"   },
    Shipped:    { color: "text-violet-400", icon: Truck,         bg: "bg-violet-500/10" },
    Delivered:  { color: "text-green-400",  icon: CheckCircle2,  bg: "bg-green-500/10"  },
    Cancelled:  { color: "text-red-400",    icon: XCircle,       bg: "bg-red-500/10"    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? "bg-amber-400 animate-pulse" : "bg-green-400"}`} />
            {refreshing ? "Refreshing…" : lastUpdated ? `Updated ${formatRelTime(lastUpdated.toISOString())}` : "Live data"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchDashboard(false)}
            disabled={refreshing}
            className="px-2.5 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => router.push("/admin/orders")}
            className="px-2.5 py-1.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg text-xs flex items-center gap-1.5 font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Orders</span>
          </button>
        </div>
      </div>

      {/* ═══ ROW 1 — REVENUE + ORDERS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          icon={PoundSterling} iconColor="text-violet-400" iconBg="bg-violet-500/10"
          glow="from-violet-500/10 to-violet-600/5"
          title="Total Revenue" value={formatCurrency(revenue.total)}
          sub={revenue.today > 0 ? `Today: ${formatCurrency(revenue.today)}` : undefined}
          badge={revenue.change} badgeSub="vs 30d"
        />
        <StatCard
          icon={ShoppingCart} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
          glow="from-cyan-500/10 to-cyan-600/5"
          title="Total Orders" value={orders.total.toLocaleString()}
          sub={orders.today > 0 ? `Today: ${orders.today}` : undefined}
          badge={orders.change} badgeSub="vs 30d"
        />
        <StatCard
          icon={Timer} iconColor="text-amber-400" iconBg="bg-amber-500/10"
          glow="from-amber-500/10 to-amber-600/5"
          title="Pending" value={orders.pending > 0 ? orders.pending.toLocaleString() : "-"}
          sub={orders.processing > 0 ? `Processing: ${orders.processing}` : undefined}
          alert={orders.pending > 10}
          onClick={() => router.push("/admin/orders")}
        />
        <StatCard
          icon={CheckCircle2} iconColor="text-green-400" iconBg="bg-green-500/10"
          glow="from-green-500/10 to-green-600/5"
          title="Delivered" value={orders.delivered > 0 ? orders.delivered.toLocaleString() : "-"}
          sub={orders.shipped > 0 ? `Shipped: ${orders.shipped}` : undefined}
        />
      </div>

      {/* ═══ ROW 2 — PRODUCTS + CUSTOMERS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          icon={Package} iconColor="text-pink-400" iconBg="bg-pink-500/10"
          glow="from-pink-500/10 to-pink-600/5"
          title="Products" value={products.total.toLocaleString()}
          sub={`Active: ${products.active}`}
          onClick={() => router.push("/admin/products")}
        />
        <StatCard
          icon={AlertTriangle} iconColor="text-red-400" iconBg="bg-red-500/10"
          glow="from-red-500/10 to-red-600/5"
          title="Out of Stock" value={products.outOfStock > 0 ? products.outOfStock.toLocaleString() : "-"}
          sub={products.lowStock > 0 ? `Low stock: ${products.lowStock}` : undefined}
          alert={products.outOfStock > 0}
          onClick={() => router.push("/admin/products")}
        />
        <StatCard
          icon={Users} iconColor="text-orange-400" iconBg="bg-orange-500/10"
          glow="from-orange-500/10 to-orange-600/5"
          title="Customers" value={customers.total.toLocaleString()}
          sub={customers.newThisMonth > 0 ? `New this month: ${customers.newThisMonth}` : undefined}
          badge={customers.change} badgeSub="vs 30d"
          onClick={() => router.push("/admin/customers")}
        />
        <StatCard
          icon={XCircle} iconColor="text-red-400" iconBg="bg-red-500/10"
          glow="from-red-500/10 to-red-600/5"
          title="Cancelled" value={orders.cancelled > 0 ? orders.cancelled.toLocaleString() : "-"}
          sub="All time"
        />
      </div>

      {/* ═══ ORDER STATUS BAR ═══ */}
      {orders.total > 0 && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Order Status Breakdown</p>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            {(["Pending","Processing","Shipped","Delivered","Cancelled"] as const).map(s => {
              const count = orders[s.toLowerCase() as keyof typeof orders] as number;
              const pct   = (count / orders.total) * 100;
              const colors: Record<string, string> = {
                Pending: "bg-amber-500", Processing: "bg-cyan-500", Shipped: "bg-violet-500",
                Delivered: "bg-green-500", Cancelled: "bg-red-500",
              };
              return pct > 0 ? (
                <div key={s} title={`${s}: ${count}`} className={`${colors[s]} transition-all`} style={{ width: `${pct}%` }} />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {(["Pending","Processing","Shipped","Delivered","Cancelled"] as const).map(s => {
              const count  = orders[s.toLowerCase() as keyof typeof orders] as number;
              const meta   = statusMeta[s];
              const Icon   = meta.icon;
              return (
                <div key={s} className="flex items-center gap-1 text-[11px]">
                  <Icon className={`h-3 w-3 ${meta.color}`} />
                  <span className="text-slate-400">{s}</span>
                  <span className={`font-bold ${meta.color}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ CHARTS ROW ═══ */}
      <div className="grid gap-2 md:grid-cols-7">
        {/* Revenue Chart */}
        <div className="col-span-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Revenue & Orders</h3>
              <p className="text-[11px] text-slate-400">Trend over {rangeConfig[dateRange].label}</p>
            </div>
            <div className="flex gap-0.5 bg-slate-800/60 border border-slate-700 rounded-lg p-0.5">
              {(["7d","1m","6m","1y"] as DateRange[]).map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition-all ${dateRange === r ? "bg-violet-500 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "10px", color: "#fff", fontSize: 11 }}
                formatter={(v: any, n: string) => [n === "revenue" ? formatCurrency(v) : v, n === "revenue" ? "Revenue" : "Orders"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gRev)" />
              <Area type="monotone" dataKey="orders"  stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#gOrd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-white">Order Status</h3>
          <p className="text-[11px] text-slate-400 mb-2">All-time distribution</p>
          {orderStatusChart.length > 0 ? (
            <>
              <div className="relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={orderStatusChart} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {orderStatusChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} orders`, "Count"]}
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "10px", color: "#fff", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-white">{orders.total}</span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>
              <div className="space-y-1 mt-2">
                {orderStatusChart.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-300">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{s.value}</span>
                      <span className="text-slate-500">{((s.value / orders.total) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-36 text-slate-500 text-sm">No order data</div>
          )}
        </div>
      </div>

      {/* ═══ RECENT ORDERS + TOP PRODUCTS ═══ */}
      <div className="grid gap-2 md:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Recent Orders</h3>
            <button onClick={() => router.push("/admin/orders")}
              className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium">
              View All <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentOrders.length > 0 ? recentOrders.map((o, idx) => {
             const meta = statusMeta[o.status] || { color: "text-slate-400", bg: "bg-slate-500/10", icon: Clock };
const Icon = meta.icon || Clock;
              return (
                <div key={idx} onClick={() => router.push("/admin/orders")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-violet-500/40 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                    {getInitials(o.customer)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-white truncate">{o.customer}</p>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium ${meta.color} ${meta.bg}`}>
                        <Icon className="h-2 w-2" /> {o.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{formatRelTime(o.date)} • {o.id}</p>
                  </div>
                  <p className="text-xs font-bold text-violet-400 flex-shrink-0">{formatCurrency(o.amount)}</p>
                </div>
              );
            }) : (
              <div className="text-center py-6 text-slate-500">
                <ShoppingCart className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Top Selling Products</h3>
            <button onClick={() => router.push("/admin/products")}
              className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium">
              View All <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {topProducts.length > 0 ? (() => {
              const maxSales = Math.max(...topProducts.map(p => p.sales), 1);
              return topProducts.map((p, i) => (
                <div key={p.id} className="p-2 rounded-lg bg-slate-800/40 border border-slate-700 hover:border-violet-500/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center rounded bg-violet-500/10 text-violet-400 font-bold text-[10px] flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-white truncate max-w-[160px]">{p.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {p.stock > 0 ? `${p.stock} in stock` : <span className="text-red-400">Out of stock</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-cyan-400">{formatCurrency(p.revenue)}</p>
                      <p className="text-[10px] text-slate-500">{p.sales} sold</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700/40 h-0.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${(p.sales / maxSales) * 100}%` }} />
                  </div>
                </div>
              ));
            })() : (
              <div className="text-center py-6 text-slate-500">
                <Package className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">No sales data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ═══ STAT CARD COMPONENT ═══
function StatCard({
  icon: Icon, iconColor, iconBg, glow,
  title, value, sub, badge, badgeSub, alert, onClick,
}: {
  icon: any; iconColor: string; iconBg: string; glow: string;
  title: string; value: string; sub?: string;
  badge?: number; badgeSub?: string; alert?: boolean; onClick?: () => void;
}) {
  const isPos = (badge ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-slate-900/50 backdrop-blur-xl border rounded-xl p-3 transition-all hover:shadow-lg
        ${alert ? "border-red-500/40 hover:border-red-500/60" : "border-slate-800 hover:border-violet-500/30"}
        ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${glow} rounded-full -mr-8 -mt-8 pointer-events-none`} />
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-[11px] font-medium text-slate-400">{title}</p>
        <div className={`p-1 rounded-lg ${iconBg} flex-shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${alert ? "text-red-400" : iconColor}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-white mb-0.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      {badge !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-[11px]">
          {isPos ? <TrendingUp className="h-2.5 w-2.5 text-green-400" /> : <TrendingDown className="h-2.5 w-2.5 text-red-400" />}
          <span className={isPos ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
            {isPos ? "+" : ""}{badge}%
          </span>
          {badgeSub && <span className="text-slate-500">{badgeSub}</span>}
        </div>
      )}
      {alert && (
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}