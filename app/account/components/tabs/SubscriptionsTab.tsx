"use client";

import { Button } from "@/components/ui/button";

export default function SubscriptionsTab() {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-1">My Subscriptions</h2>
      <p className="text-sm text-gray-600 mb-6">
        Manage your recurring products and delivery schedules.
      </p>

      {/* EMPTY STATE */}
      <div className="border rounded-lg p-8 text-center">
        <p className="text-sm text-gray-600 mb-3">
          You don’t have any active subscriptions yet.
        </p>

        <p className="text-xs text-gray-500 mb-6">
          Subscription products allow you to receive items automatically on a
          schedule you choose.
        </p>

        <Button disabled className="bg-[#445D41]">
          Browse Subscription Products
        </Button>
      </div>

      {/* 
        🔌 BACKEND READY
        When API arrives:
        - map subscriptions here
        - show cards with Pause / Resume / Cancel
      */}
    </div>
  );
}
