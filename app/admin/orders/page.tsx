"use client";

import { useState } from "react";
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, TrendingUp, Eye, Download, Search, User, Mail, DollarSign, Calendar } from "lucide-react";

const orders = [
  { id: '#3210', customer: 'John Doe', email: 'john@example.com', items: 3, total: '$299', status: 'Delivered', date: 'Oct 1, 2025', payment: 'Paid' },
  { id: '#3209', customer: 'Jane Smith', email: 'jane@example.com', items: 1, total: '$399', status: 'Processing', date: 'Oct 1, 2025', payment: 'Paid' },
  { id: '#3208', customer: 'Bob Johnson', email: 'bob@example.com', items: 2, total: '$149', status: 'Pending', date: 'Sep 30, 2025', payment: 'Pending' },
  { id: '#3207', customer: 'Alice Brown', email: 'alice@example.com', items: 1, total: '$79', status: 'Delivered', date: 'Sep 30, 2025', payment: 'Paid' },
  { id: '#3206', customer: 'Charlie Wilson', email: 'charlie@example.com', items: 4, total: '$449', status: 'Shipped', date: 'Sep 29, 2025', payment: 'Paid' },
  { id: '#3205', customer: 'Diana Prince', email: 'diana@example.com', items: 2, total: '$199', status: 'Cancelled', date: 'Sep 29, 2025', payment: 'Refunded' },
];

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All Status" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const processingCount = orders.filter(o => o.status === 'Processing').length;
  const completedCount = orders.filter(o => o.status === 'Delivered').length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-slate-400 mt-1">Manage and track customer orders</p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2 font-semibold">
          <Download className="w-5 h-5" />
          Export Orders
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-violet-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Total Orders</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{orders.length}</p>
                <span className="text-xs text-violet-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Pending</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <span className="text-xs text-cyan-400">Awaiting</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-xl border border-pink-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-pink-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Processing</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{processingCount}</p>
                <span className="text-xs text-pink-400">Preparing</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-0.5">Completed</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <span className="text-xs text-green-400">Delivered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by order ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </select>
          <div className="text-sm text-slate-400">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Order ID</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Customer</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Items</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Total</th>
                  <th className="text-left py-4 px-4 text-slate-300 font-semibold">Date</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Payment</th>
                  <th className="text-center py-4 px-4 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <p className="text-white font-semibold">{order.id}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{order.customer}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {order.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium">
                        {order.items}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-white font-semibold">{order.total}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {order.date}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        order.status === 'Delivered' ? 'bg-green-500/10 text-green-400' :
                        order.status === 'Processing' ? 'bg-cyan-500/10 text-cyan-400' :
                        order.status === 'Shipped' ? 'bg-blue-500/10 text-blue-400' :
                        order.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        order.status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        order.payment === 'Paid' ? 'bg-violet-500/10 text-violet-400' :
                        order.payment === 'Refunded' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {order.payment}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-2 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
