"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Package,
  Users,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  ShoppingBag,
  Calendar,
  Clock,
  Star,
  Download,
  Loader2,
  RefreshCcw,
  Eye,
  Award,
  FolderTree,
  Tag,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { productsService, orderService } from "@/lib/services";
import { customersService } from "@/lib/services/costomers";
type DateRange = "7d" | "1m" | "6m" | "1y";

// ===========================
// INTERFACES & TYPES
// ===========================
interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  activeProducts: number;
  productsChange: number;
  totalCustomers: number;
  customersChange: number;
}

interface CategorySales {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface RecentOrder {
  id: string;
  customer: string;
  email: string;
  product: string;
  amount: string;
  status: string;
  date: string;
  avatar: string;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: string;
  trend: string;
  stock: number;
  rating: number;
}

interface SalesData {
  name: string;
  sales: number;
  orders: number;
  revenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    activeProducts: 0,
    productsChange: 0,
    totalCustomers: 0,
    customersChange: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySales[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
const [dateRange, setDateRange] = useState<DateRange>("7d");
const rangeConfig = {
  "7d": { days: 7, label: "Last 7 days" },
  "1m": { days: 30, label: "Last 1 month" },
  "6m": { days: 180, label: "Last 6 months" },
  "1y": { days: 365, label: "Last 1 year" },
};

  // ===========================
  // FETCH ALL DATA
  // ===========================
  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const [productsRes, ordersRes, customersRes] = await Promise.all([
        productsService.getAll({ page: 1, pageSize: 1000 }),
        orderService.getAllOrders(),
        customersService.getAll({ page: 1, pageSize: 10000 }),
      ]);

      // Process Products
      let products: any[] = [];
      const productResponse = productsRes as any;

      if (productResponse?.data?.success && productResponse?.data?.data?.items) {
        products = productResponse.data.data.items;
      } else if (productResponse?.data?.items) {
        products = productResponse.data.items;
      } else if (productResponse?.success && productResponse?.data?.items) {
        products = productResponse.data.items;
      } else if (Array.isArray(productResponse?.data)) {
        products = productResponse.data;
      } else if (Array.isArray(productResponse)) {
        products = productResponse;
      }

      const activeProducts = products.filter((p: any) => p.status === "Active").length;

      // Process Orders
      let orders: any[] = [];
      const orderResponse = ordersRes as any;

      if (orderResponse?.data?.success && orderResponse?.data?.data?.items) {
        orders = orderResponse.data.data.items;
      } else if (orderResponse?.data?.items) {
        orders = orderResponse.data.items;
      } else if (orderResponse?.success && orderResponse?.data?.items) {
        orders = orderResponse.data.items;
      } else if (orderResponse?.items) {
        orders = orderResponse.items;
      } else if (Array.isArray(orderResponse?.data)) {
        orders = orderResponse.data;
      } else if (Array.isArray(orderResponse)) {
        orders = orderResponse;
      }

      const totalRevenue = orders.reduce(
        (sum: number, order: any) => sum + (order.totalAmount || 0),
        0
      );

      // Process Customers
      let customers: any[] = [];
      const customerResponse = customersRes as any;

      if (customerResponse?.data?.success && customerResponse?.data?.data?.items) {
        customers = customerResponse.data.data.items;
      } else if (customerResponse?.data?.items) {
        customers = customerResponse.data.items;
      } else if (customerResponse?.success && customerResponse?.data?.items) {
        customers = customerResponse.data.items;
      } else if (customerResponse?.items) {
        customers = customerResponse.items;
      } else if (Array.isArray(customerResponse?.data)) {
        customers = customerResponse.data;
      } else if (Array.isArray(customerResponse)) {
        customers = customerResponse;
      }

      const activeCustomers = customers.filter((c: any) => c.isActive !== false).length;

      // Calculate Dynamic Growth
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const last30DaysOrders = orders.filter(
        (o: any) => new Date(o.orderDate) >= thirtyDaysAgo
      );
      const last30DaysRevenue = last30DaysOrders.reduce(
        (sum: number, o: any) => sum + (o.totalAmount || 0),
        0
      );

      const previous30DaysOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.orderDate);
        return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
      });
      const previous30DaysRevenue = previous30DaysOrders.reduce(
        (sum: number, o: any) => sum + (o.totalAmount || 0),
        0
      );

      const revenueChange =
        previous30DaysRevenue > 0
          ? ((last30DaysRevenue - previous30DaysRevenue) / previous30DaysRevenue) * 100
          : last30DaysRevenue > 0
          ? 100
          : 0;

      const ordersChange =
        previous30DaysOrders.length > 0
          ? ((last30DaysOrders.length - previous30DaysOrders.length) /
              previous30DaysOrders.length) *
            100
          : last30DaysOrders.length > 0
          ? 100
          : 0;

      const last30DaysProducts = products.filter(
        (p: any) => p.createdAt && new Date(p.createdAt) >= thirtyDaysAgo
      ).length;
      const previous30DaysProducts = products.filter((p: any) => {
        if (!p.createdAt) return false;
        const createdDate = new Date(p.createdAt);
        return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
      }).length;

      const productsChange =
        previous30DaysProducts > 0
          ? ((last30DaysProducts - previous30DaysProducts) / previous30DaysProducts) * 100
          : last30DaysProducts > 0
          ? 100
          : 0;

      const last30DaysCustomers = customers.filter(
        (c: any) => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo
      ).length;
      const previous30DaysCustomers = customers.filter((c: any) => {
        if (!c.createdAt) return false;
        const createdDate = new Date(c.createdAt);
        return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo;
      }).length;

      const customersChange =
        previous30DaysCustomers > 0
          ? ((last30DaysCustomers - previous30DaysCustomers) / previous30DaysCustomers) * 100
          : last30DaysCustomers > 0
          ? 100
          : 0;

      setStats({
        totalRevenue,
        revenueChange: Math.round(revenueChange * 10) / 10,
        totalOrders: orders.length,
        ordersChange: Math.round(ordersChange * 10) / 10,
        activeProducts,
        productsChange: Math.round(productsChange * 10) / 10,
        totalCustomers: activeCustomers,
        customersChange: Math.round(customersChange * 10) / 10,
      });

 setSalesData(generateSalesTrend(orders, dateRange));

      setCategoryData(generateCategoryDistribution(products));
      setRecentOrders(generateRecentOrders(orders));
      setTopProducts(generateTopProducts(products, orders));
    } catch (error) {
      console.error("❌ Dashboard fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

useEffect(() => {
  fetchDashboardData();
}, [dateRange]);


  // ===========================
  // HELPER FUNCTIONS
  // ===========================
const generateSalesTrend = (orders: any[], range: DateRange): SalesData[] => {
  const days = rangeConfig[range].days;

  const data = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    return {
      name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: date.toISOString().split("T")[0],
      sales: 0,
      orders: 0,
      revenue: 0,
    };
  });

  orders.forEach((order: any) => {
    const orderDate = new Date(order.orderDate).toISOString().split("T")[0];
    const index = data.findIndex((d) => d.fullDate === orderDate);

    if (index !== -1) {
      data[index].orders += 1;
      data[index].revenue += order.totalAmount || 0;
      data[index].sales += order.subtotalAmount || 0;
    }
  });

  return data.map(({ name, sales, orders, revenue }) => ({
    name,
    sales: Math.round(sales),
    orders,
    revenue: Math.round(revenue),
  }));
};


  const generateCategoryDistribution = (products: any[]): CategorySales[] => {
    const categoryCounts: { [key: string]: number } = {};

    products.forEach((product: any) => {
      const categories = product.categories || [];
      if (categories.length === 0) {
        categoryCounts["Uncategorized"] = (categoryCounts["Uncategorized"] || 0) + 1;
      } else {
        categories.forEach((cat: any) => {
          const catName = cat.categoryName || "Uncategorized";
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        });
      }
    });

    const colors = ["#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
    return Object.entries(categoryCounts)
      .map(
        ([name, value], index): CategorySales => ({
          name,
          value,
          color: colors[index % colors.length],
        })
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const generateRecentOrders = (orders: any[]): RecentOrder[] => {
    return orders.slice(0, 5).map((order: any, index: number) => ({
      id: order.orderNumber || `#${index + 1}`,
      customer: order.customerName || "Unknown",
      email: order.customerEmail || "N/A",
      product: order.orderItems?.[0]?.productName || "Multiple Items",
      amount: `£${order.totalAmount?.toFixed(2) || "0.00"}`,
      status: order.status || "Pending",
      date: formatRelativeTime(order.orderDate),
      avatar: getInitials(order.customerName || "U"),
    }));
  };

  const generateTopProducts = (products: any[], orders: any[]): TopProduct[] => {
    const productSales: { [key: string]: any } = {};

    orders.forEach((order: any) => {
      order.orderItems?.forEach((item: any) => {
        const productId = item.productId;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.productName || "Unknown Product",
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[productId].quantity += item.quantity || 1;
        productSales[productId].revenue += item.totalPrice || 0;
      });
    });

    return Object.entries(productSales)
      .map(([productId, data]: [string, any]) => {
        const product = products.find((p: any) => p.id === productId);
        return {
          name: data.name,
          sales: data.quantity,
          revenue: `£${data.revenue.toFixed(2)}`,
          trend: "+12%",
          stock: product?.stockQuantity || 0,
          rating: product?.averageRating || 4.5,
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  };

  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  };

  const getInitials = (name: string): string => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Delivered":
        return "bg-green-500/10 text-green-400";
      case "Processing":
        return "bg-cyan-500/10 text-cyan-400";
      case "Cancelled":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-orange-500/10 text-orange-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950/10">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Revenue",
      value: `£${stats.totalRevenue.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: `${stats.revenueChange >= 0 ? "+" : ""}${stats.revenueChange}%`,
      trend: stats.revenueChange >= 0 ? "up" : "down",
      icon: PoundSterling,
      color: "violet",
      description: "from last month",
      tooltip: "Total revenue earned from all orders in the last 30 days",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      change: `${stats.ordersChange >= 0 ? "+" : ""}${stats.ordersChange}%`,
      trend: stats.ordersChange >= 0 ? "up" : "down",
      icon: ShoppingCart,
      color: "cyan",
      description: "from last month",
      tooltip: "Total number of orders placed on your platform",
    },
    {
      title: "Active Products",
      value: stats.activeProducts.toLocaleString(),
      change: `${stats.productsChange >= 0 ? "+" : ""}${stats.productsChange}%`,
      trend: stats.productsChange >= 0 ? "up" : "down",
      icon: Package,
      color: "pink",
      description: "from last month",
      tooltip: "Currently active products available for purchase",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      change: `${stats.customersChange >= 0 ? "+" : ""}${stats.customersChange}%`,
      trend: stats.customersChange >= 0 ? "up" : "down",
      icon: Users,
      color: "orange",
      description: "from last month",
      tooltip: "Total number of registered active customers",
    },
  ];

  return (
    <div className="space-y-2 bg-slate-950/70 opacity-90">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time insights from your e-commerce platform</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing}
            title="Refresh dashboard data"
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            title="Filter data by date range"
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden lg:inline">Last 30 days</span>
          </button>
          <button 
            title="View detailed analytics reports"
            onClick={() => router.push('#')}
            className="px-3 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all text-sm flex items-center gap-2 font-semibold"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span className="hidden sm:inline">View Reports</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === "up";

          return (
            <div
              key={index}
              title={stat.tooltip}
              className="relative overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/20 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4"
            >
              <div
                className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${
                  stat.color === "violet"
                    ? "from-violet-500/10 to-violet-600/10"
                    : stat.color === "cyan"
                    ? "from-cyan-500/10 to-cyan-600/10"
                    : stat.color === "pink"
                    ? "from-pink-500/10 to-pink-600/10"
                    : "from-orange-500/10 to-orange-600/10"
                } rounded-full -mr-14 -mt-14`}
              />

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-400">{stat.title}</p>
                <div
                  className={`p-2 rounded-lg ${
                    stat.color === "violet"
                      ? "bg-violet-500/10"
                      : stat.color === "cyan"
                      ? "bg-cyan-500/10"
                      : stat.color === "pink"
                      ? "bg-pink-500/10"
                      : "bg-orange-500/10"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      stat.color === "violet"
                        ? "text-violet-400"
                        : stat.color === "cyan"
                        ? "text-cyan-400"
                        : stat.color === "pink"
                        ? "text-pink-400"
                        : "text-orange-400"
                    }`}
                  />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-bold text-white mb-2">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={isPositive ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                  {stat.change}
                </span>
                <span className="text-slate-500">{stat.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 md:grid-cols-7">
        {/* Revenue Chart */}
        <div className="col-span-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
   <div className="flex items-center justify-between mb-4">
  <div>
    <h3 className="text-lg font-bold text-white">Revenue Analytics</h3>
    <p className="text-xs text-slate-400 mt-1">
      {rangeConfig[dateRange].label} revenue and order trends
    </p>
  </div>

  <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-lg p-1">
    {(["7d", "1m", "6m", "1y"] as DateRange[]).map((r) => (
      <button
        key={r}
        onClick={() => setDateRange(r)}
        className={`px-2.5 py-1 text-xs rounded-md transition-all
          ${
            dateRange === r
              ? "bg-violet-500 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
      >
        {rangeConfig[r].label}
      </button>
    ))}
  </div>
</div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOrders)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Product Categories</h3>
            <p className="text-xs text-slate-400 mt-1">Distribution across categories</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: data.payload.color }}
                              />
                              <p className="text-white font-semibold text-sm">{data.name}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-300 text-xs">
                                Products: <span className="text-white font-bold">{data.value}</span>
                              </p>
                              <p className="text-slate-300 text-xs">
                                Percentage:{" "}
                                <span className="text-cyan-400 font-bold">
                                  {(
                                    (data.value /
                                      categoryData.reduce((sum, cat) => sum + cat.value, 0)) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-slate-300 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-56 text-slate-500">
              <p className="text-sm">No category data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders and Top Products */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Orders</h3>
              <p className="text-xs text-slate-400 mt-1">Latest transactions in your store</p>
            </div>
            <button
              onClick={() => router.push("/admin/order")}
              title="View all orders"
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium transition-colors"
            >
              View All
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  title={`Order ${order.id} - ${order.customer}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {order.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-white truncate">{order.customer}</p>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{order.product}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-500">{order.date}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-violet-400 text-sm">{order.amount}</p>
                    <p className="text-xs text-slate-500">{order.id}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent orders found</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Top Selling Products</h3>
              <p className="text-xs text-slate-400 mt-1">Best performers based on order data</p>
            </div>
            <button
              onClick={() => router.push("/admin/products")}
              title="View all products"
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium transition-colors"
            >
              View All
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {topProducts.length > 0 ? (
              topProducts.map((product, idx) => (
                <div
                  key={idx}
                  title={`${product.name} - ${product.sales} units sold`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 transition-all"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 flex-shrink-0">
                    <Package className="h-5 w-5 text-violet-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-slate-400">{product.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">{product.sales} sold</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">{product.stock} left</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-cyan-400 text-sm">{product.revenue}</p>
                    <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                      {product.trend}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
<div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0e1628] to-[#0a1020]">
  <div className="p-3">
    <h3 className="text-lg font-semibold text-slate-200 mb-2 tracking-wide">
      Quick Navigation
    </h3>

    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
      {[
        { icon: Package, label: "ProductS", path: "/admin/products" },
        { icon: FolderTree, label: "Categories", path: "/admin/categories" },
        { icon: Award, label: "Brands", path: "/admin/brands" },
        { icon: ShoppingCart, label: "Orders", path: "/admin/order" },
        { icon: Tag, label: "Discounts", path: "/admin/discounts" },
        { icon: Star, label: "Reviews", path: "/admin/productReview" },
        { icon: Eye, label: "Analytics", path: "#" },
        { icon: Users, label: "Customers", path: "/admin/customers" },
        { icon: Package, label: "Products", path: "/admin/products" },
        { icon: Download, label: "Export", path: "#" },
      ].map((item, idx) => (
        <button
          key={idx}
          onClick={() => item.path !== "#" && router.push(item.path)}
          className="
            group flex items-center gap-2
            rounded-xl px-3 py-2.5
            bg-white/[0.03] border border-white/10
            hover:bg-white/[0.08] hover:border-violet-400/40
            transition-all duration-200
          "
        >
          <item.icon className="h-4 w-4 text-violet-400 group-hover:text-cyan-400 transition-colors" />
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  </div>
</div>

    </div>
  );
}
