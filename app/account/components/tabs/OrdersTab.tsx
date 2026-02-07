"use client";

// app/account/components/tabs/OrdersTab.tsx
import { useMemo, useState } from "react";
import OrderCard from "../orders/OrderCard";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function OrdersTab({ orders }: any) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
const { refreshProfile } = useAuth();

useEffect(() => {
  refreshProfile();
}, [refreshProfile]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== "all") {
      result = result.filter(
        (o: any) => o.status?.toLowerCase() === statusFilter
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(
        (o: any) => new Date(o.orderDate) >= from
      );
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(
        (o: any) => new Date(o.orderDate) <= to
      );
    }

    result.sort(
      (a: any, b: any) =>
        new Date(b.orderDate).getTime() -
        new Date(a.orderDate).getTime()
    );

    return result;
  }, [orders, statusFilter, fromDate, toDate]);

  return (
    <div className="space-y-2">
      {/* FILTER BAR */}
      <div className="bg-gradient-to-r from-gray-50 to-white border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* STATUS */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="all">All orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* FROM DATE */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {/* TO DATE */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {/* CLEAR */}
          {(fromDate || toDate || statusFilter !== "all") && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setFromDate("");
                setToDate("");
              }}
              className="ml-auto h-10 px-4 rounded-lg text-sm font-medium
                         bg-red-50 text-red-600 hover:bg-red-100 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ORDERS LIST */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
          No orders found.
        </div>
      ) : (
        filteredOrders.map((order: any) => (
          <OrderCard key={order.id} order={order} />
        ))
      )}
    </div>
  );
}
