"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  Eye,
  ShoppingBag,
  CreditCard,
  Calendar,
  Clock,
  Star,
  MapPin,
  Phone,
  Mail,
  Download,
  Filter
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const salesData = [
  { name: 'Jan', sales: 4000, orders: 240, revenue: 3200 },
  { name: 'Feb', sales: 3000, orders: 198, revenue: 2800 },
  { name: 'Mar', sales: 5000, orders: 300, revenue: 4200 },
  { name: 'Apr', sales: 4500, orders: 278, revenue: 3900 },
  { name: 'May', sales: 6000, orders: 389, revenue: 5100 },
  { name: 'Jun', sales: 5500, orders: 340, revenue: 4800 },
  { name: 'Jul', sales: 6200, orders: 410, revenue: 5400 },
];

const categoryData = [
  { name: 'Electronics', value: 400, color: '#8b5cf6' },
  { name: 'Fashion', value: 300, color: '#06b6d4' },
  { name: 'Home', value: 200, color: '#ec4899' },
  { name: 'Books', value: 100, color: '#f59e0b' },
];

const recentOrders = [
  { id: '#3210', customer: 'John Doe', email: 'john@example.com', product: 'Wireless Headphones', amount: '$299', status: 'Delivered', date: '2 mins ago', avatar: 'JD' },
  { id: '#3209', customer: 'Jane Smith', email: 'jane@example.com', product: 'Smart Watch Pro', amount: '$399', status: 'Processing', date: '1 hour ago', avatar: 'JS' },
  { id: '#3208', customer: 'Bob Johnson', email: 'bob@example.com', product: 'Laptop Stand', amount: '$49', status: 'Pending', date: '3 hours ago', avatar: 'BJ' },
  { id: '#3207', customer: 'Alice Brown', email: 'alice@example.com', product: 'USB-C Hub', amount: '$79', status: 'Delivered', date: '5 hours ago', avatar: 'AB' },
];

const topProducts = [
  { name: 'Wireless Headphones', sales: 234, revenue: '$69,866', trend: '+12%', stock: 45, rating: 4.8 },
  { name: 'Designer T-Shirt', sales: 567, revenue: '$27,783', trend: '+8%', stock: 120, rating: 4.5 },
  { name: 'USB-C Hub', sales: 345, revenue: '$20,355', trend: '+15%', stock: 89, rating: 4.9 },
  { name: 'Premium Yoga Mat', sales: 234, revenue: '$9,126', trend: '+5%', stock: 67, rating: 4.7 },
];

const statsCards = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    trend: 'up',
    icon: DollarSign,
    color: 'violet',
    description: 'from last month'
  },
  {
    title: 'Total Orders',
    value: '1,745',
    change: '+12.5%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'cyan',
    description: 'from last month'
  },
  {
    title: 'Active Products',
    value: '573',
    change: '-2%',
    trend: 'down',
    icon: Package,
    color: 'pink',
    description: 'from last month'
  },
  {
    title: 'Total Customers',
    value: '2,350',
    change: '+18.2%',
    trend: 'up',
    icon: Users,
    color: 'orange',
    description: 'from last month'
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-slate-400 mt-1">Welcome back! Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 days
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all text-sm flex items-center gap-2 font-semibold">
            <ArrowUpRight className="h-4 w-4" />
            View Reports
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === 'up';

          return (
            <div key={index} className="relative overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/20 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
                stat.color === 'violet' ? 'from-violet-500/10 to-violet-600/10' :
                stat.color === 'cyan' ? 'from-cyan-500/10 to-cyan-600/10' :
                stat.color === 'pink' ? 'from-pink-500/10 to-pink-600/10' :
                'from-orange-500/10 to-orange-600/10'
              } rounded-full -mr-16 -mt-16`} />

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-400">
                  {stat.title}
                </p>
                <div className={`p-2.5 rounded-xl ${
                  stat.color === 'violet' ? 'bg-violet-500/10' :
                  stat.color === 'cyan' ? 'bg-cyan-500/10' :
                  stat.color === 'pink' ? 'bg-pink-500/10' :
                  'bg-orange-500/10'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    stat.color === 'violet' ? 'text-violet-400' :
                    stat.color === 'cyan' ? 'text-cyan-400' :
                    stat.color === 'pink' ? 'text-pink-400' :
                    'text-orange-400'
                  }`} />
                </div>
              </div>

              <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={isPositive ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {stat.change}
                </span>
                <span className="text-slate-500">{stat.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Revenue Chart */}
        <div className="col-span-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Revenue Analytics</h3>
              <p className="text-sm text-slate-400 mt-1">Monthly revenue and order trends</p>
            </div>
            <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400 text-xs font-medium flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                  color: '#fff'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="col-span-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">Sales by Category</h3>
            <p className="text-sm text-slate-400 mt-1">Product category distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
               label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm text-slate-300">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders and Top Products */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Recent Orders</h3>
              <p className="text-sm text-slate-400 mt-1">Latest transactions in your store</p>
            </div>
            <button className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 transition-all">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {order.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-white">{order.customer}</p>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      order.status === 'Delivered' ? 'bg-green-500/10 text-green-400' :
                      order.status === 'Processing' ? 'bg-cyan-500/10 text-cyan-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{order.product}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-500">{order.date}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-violet-400">{order.amount}</p>
                  <p className="text-xs text-slate-500">{order.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Top Selling Products</h3>
              <p className="text-sm text-slate-400 mt-1">Best performers this month</p>
            </div>
            <button className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-violet-500/50 transition-all">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-500/10">
                  <Package className="h-5 w-5 text-violet-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{product.name}</p>
                  <div className="flex items-center gap-3 mt-1">
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

                <div className="text-right">
                  <p className="font-bold text-cyan-400">{product.revenue}</p>
                  <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                    {product.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Ready to grow your business?</h3>
            <p className="text-violet-100">Explore our powerful tools and features to boost your sales</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white text-violet-600 rounded-xl hover:bg-violet-50 transition-all text-sm flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Add Product
            </button>
            <button className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all text-sm flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4" />
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
