"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProfileTab from "./tabs/ProfileTab";
import OrdersTab from "./tabs/OrdersTab";
import ChangePasswordTab from "./tabs/ChangePasswordTab";
import SubscriptionsTab from "./tabs/SubscriptionsTab";
import OrderTrackingTab from "./tabs/OrderTrackingTab";
import AddressesTab from "./tabs/AddressesTab";
import LoyaltyPointsTab from "./tabs/LoyaltyPointsTab";
import SidebarButton from "./ui/SidebarButton";

type Tab =
  | "profile"
  | "orders"
  | "addresses"
  | "change-password"
  | "subscriptions"
  | "tracking"
  | "loyalty";

export default function AccountDashboard() {
  const { user, logout, profileLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ URL is the single source of truth
  const tabParam = searchParams.get("tab");

  const validTabs: Tab[] = [
    "profile",
    "orders",
    "addresses",
    "change-password",
    "subscriptions",
    "tracking",
    "loyalty",
  ];

  const activeTab: Tab = validTabs.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "profile";

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading your account…
      </div>
    );
  }

  if (!user) return null;

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` || "U";

  const goToTab = (tab: Tab) => {
    router.push(`/account?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] py-1">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-xl font-semibold mb-1">My Account</h1>

        <div className="grid grid-cols-12 gap-6">
          {/* LEFT SIDEBAR */}
          <div className="col-span-12 md:col-span-3">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
                <SidebarButton
                  active={activeTab === "profile"}
                  onClick={() => goToTab("profile")}
                >
                  My Profile
                </SidebarButton>

                <SidebarButton
                  active={activeTab === "orders"}
                  onClick={() => goToTab("orders")}
                >
                  My Orders
                </SidebarButton>

                <SidebarButton
                  active={activeTab === "subscriptions"}
                  onClick={() => goToTab("subscriptions")}
                >
                  Subscriptions
                </SidebarButton>

                <SidebarButton
                  active={activeTab === "tracking"}
                  onClick={() => goToTab("tracking")}
                >
                  Order Tracking
                </SidebarButton>

                <SidebarButton
                  active={activeTab === "change-password"}
                  onClick={() => goToTab("change-password")}
                >
                  Change Password
                </SidebarButton>

                <SidebarButton
                  active={activeTab === "addresses"}
                  onClick={() => goToTab("addresses")}
                >
                  Saved Addresses
                </SidebarButton>
                <SidebarButton
  active={activeTab === "loyalty"}
  onClick={() => goToTab("loyalty")}
>
  Loyalty Points
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
          </div>

          {/* RIGHT CONTENT */}
          <div className="col-span-12 md:col-span-9">
            {activeTab === "profile" && (
              <ProfileTab user={user} initials={initials} />
            )}

            {activeTab === "orders" && (
              <OrdersTab orders={user.orders ?? []} />
            )}

            {activeTab === "subscriptions" && <SubscriptionsTab />}

            {activeTab === "tracking" && <OrderTrackingTab />}

            {activeTab === "change-password" && <ChangePasswordTab />}

          {activeTab === "addresses" && <AddressesTab />}

          {activeTab === "loyalty" && (
  <LoyaltyPointsTab loyalty={user.loyaltyPoints} />
)}


          </div>
        </div>
      </div>
    </div>
  );
}
