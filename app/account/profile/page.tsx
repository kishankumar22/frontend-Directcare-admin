"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Tab = "profile" | "orders" | "addresses";
function getOrderStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-700";
    case "completed":
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-700";
    case "refunded":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AccountPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/account");
    }
  }, [isAuthenticated, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading account…
      </div>
    );
  }


  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  return (
    <div className="min-h-screen bg-[#f7f8fa] py-2">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-2">My Account</h1>

        <div className="grid grid-cols-12 gap-6">
          {/* ---------- LEFT SIDEBAR ---------- */}
          <div className="col-span-12 md:col-span-3">
            <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
              <SidebarButton
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              >
                My Profile
              </SidebarButton>

              <SidebarButton
                active={activeTab === "orders"}
                onClick={() => setActiveTab("orders")}
              >
                My Orders
              </SidebarButton>

              <SidebarButton
                active={activeTab === "addresses"}
                onClick={() => setActiveTab("addresses")}
              >
                Saved Addresses
              </SidebarButton>

              <hr />

              <SidebarButton
                danger
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
              >
                Logout
              </SidebarButton>
            </div>
          </div>

          {/* ---------- RIGHT CONTENT ---------- */}
          <div className="col-span-12 md:col-span-9">
            {activeTab === "profile" && (
              <ProfileTab user={user} initials={initials} />
            )}

            {activeTab === "orders" && (
              <OrdersTab orders={user.orders ?? []} />
            )}

            {activeTab === "addresses" && (
              <AddressesTab addresses={user.addresses ?? []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================= */
/* =================== TABS ======================== */
/* ================================================= */

function ProfileTab({ user, initials }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-[#445D41] text-white flex items-center justify-center text-xl font-bold">
          {initials}
        </div>

        <div>
          <p className="text-xl font-semibold">
            {user.fullName || `${user.firstName} ${user.lastName}`}
          </p>
          <p className="text-sm text-gray-600">{user.email}</p>
          {user.isActive && (
            <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              Active Account
            </span>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total Orders" value={user.totalOrders ?? 0} />
        <Stat
          label="Total Spent"
          value={`£${user.totalSpent?.toFixed(2) ?? "0.00"}`}
        />
      </div>

      {/* DETAILS */}
      <div className="divide-y rounded-lg border">
        <Detail label="Email" value={user.email} />
        <Detail label="Phone" value={user.phoneNumber} />
        <Detail label="Gender" value={user.gender} />
        <Detail
          label="Date of Birth"
          value={
            user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString()
              : "-"
          }
        />
        <Detail
          label="Member Since"
          value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "-"
          }
        />
        <Detail
          label="Last Login"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : "-"
          }
        />
      </div>
    </div>
  );
}

function OrdersTab({ orders }: any) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-gray-500">
        No orders found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <div
          key={order.id}
          className="bg-white rounded-xl border shadow-sm p-5"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">
                Order #{order.orderNumber}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>

          <span
  className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border ${
    getOrderStatusBadge(order.status)
  }`}
>
  {order.status}
</span>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <Info label="Items" value={order.itemsCount} />
            <Info label="Delivery method" value={order.deliveryMethod} />
            <Info
              label="Total"
              value={`£${order.totalAmount.toFixed(2)}`}
            />
            <Info label="Currency" value={order.currency} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressesTab({ addresses }: any) {
  if (addresses.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-gray-500">
        No saved addresses.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addresses.map((addr: any) => (
        <div
          key={addr.id}
          className="bg-white rounded-xl border shadow-sm p-5"
        >
          <p className="font-semibold">
            {addr.firstName} {addr.lastName}
          </p>
          <p className="text-sm text-gray-600">{addr.addressLine1}</p>
          <p className="text-sm text-gray-600">
            {addr.city}, {addr.state} {addr.postalCode}
          </p>
          <p className="text-sm text-gray-600">{addr.country}</p>

          {addr.isDefault && (
            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
              Default Address
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================= */
/* ================= UI ATOMS ====================== */
/* ================================================= */

function SidebarButton({
  children,
  active,
  danger,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50"
        }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

function Detail({ label, value }: any) {
  return (
    <div className="flex justify-between px-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value || "-"}</span>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
