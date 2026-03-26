"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/CustomToast";
import { useAuth } from "@/context/AuthContext";
import { Pause, SkipForward, XCircle, Play } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SubscriptionsTab() {
  const { accessToken, user } = useAuth();
const toast = useToast();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
  type: "cancel" | "pause" | "resume" | "skip" | null;
  id: string | null;
}>({ type: null, id: null });
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH SUBSCRIPTIONS
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API}/api/Subscriptions/customer/${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch subscriptions");
      }

      setSubscriptions(data?.data || []);
    } catch (err: any) {
      toast.error(err.message || "Error loading subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && accessToken) {
      fetchSubscriptions();
    }
  }, [user?.id, accessToken]);

  // 🔥 CANCEL
  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(
        `${API}/api/Subscriptions/${id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Cancel failed");
      }

      toast.error(data?.message || "Subscription cancelled");
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.message || "Error cancelling subscription");
    }
  };
const handlePause = async (id: string) => {
  try {
    const res = await fetch(`${API}/api/Subscriptions/${id}/pause`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.message || "Pause failed");

    toast.error(data?.message || "Subscription paused");
    fetchSubscriptions();
  } catch (err: any) {
    toast.error(err.message || "Error pausing subscription");
  }
};

const handleResume = async (id: string) => {
  try {
    const res = await fetch(`${API}/api/Subscriptions/${id}/resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.message || "Resume failed");

    toast.success(data?.message || "Subscription resumed");
    fetchSubscriptions();
  } catch (err: any) {
    toast.error(err.message || "Error resuming subscription");
  }
};

const handleSkip = async (id: string) => {
  try {
    const res = await fetch(`${API}/api/Subscriptions/${id}/skip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data?.message || "Skip failed");

    toast.warning(data?.message || "Next delivery skipped");
    fetchSubscriptions();
  } catch (err: any) {
    toast.error(err.message || "Error skipping delivery");
  }
};
  // 🔥 LOADING
  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <p className="text-sm text-gray-500">Loading subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-1">My Subscriptions</h2>
      <p className="text-sm text-gray-600 mb-6">
        Manage your recurring products and delivery schedules.
      </p>

      {/* EMPTY STATE */}
      {!subscriptions.length ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-600 mb-3">
            You don’t have any active subscriptions yet.
          </p>

          <p className="text-xs text-gray-500 mb-6">
            Subscription products allow you to receive items automatically on a
            schedule you choose.
          </p>

          {/* <Button disabled className="bg-[#445D41]">
            Browse Subscription Products
          </Button> */}
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((item) => (
<div
  key={item.id}
  className="border rounded-xl p-3 sm:p-4 shadow-sm bg-white flex gap-3 sm:gap-4 w-full min-w-0"
>
  {/* IMAGE */}
  <img
    src={`${API}${item.productImageUrl}`}
    className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
  />

  {/* DETAILS */}
  <div className="flex-1 min-w-0">
  <p className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 break-words">
      {item.productName}
    </p>

    <p className="text-[11px] text-gray-500 truncate">
  {item.frequencyDisplay}
</p>

<p className="text-[11px] text-green-600">
  Next Delivery: {new Date(item.nextDeliveryDate).toLocaleDateString()}
</p>
{/* MOBILE ACTIONS */}
<div className="flex items-center gap-0.5 mt-2 sm:hidden whitespace-nowrap overflow-hidden">

  {item.status === "Active" && (
    <>
      <button
        onClick={() => setConfirmAction({ type: "pause", id: item.id })}
        className="flex items-center gap-1 text-[9px] px-2 py-[2px] rounded-md bg-yellow-100 text-yellow-700"
      >
        <Pause size={10} />
        Pause
      </button>

      <button
        onClick={() => setConfirmAction({ type: "skip", id: item.id })}
        className="flex items-center gap-1 text-[9px] px-2 py-[2px] rounded-md bg-blue-100 text-blue-700"
      >
        <SkipForward size={10} />
        Skip
      </button>

      <button
        onClick={() => setConfirmAction({ type: "cancel", id: item.id })}
        className="flex items-center gap-0.5 text-[8px] px-1 py-[2px] rounded-md bg-red-100 text-red-600"
      >
        <XCircle size={12} />
        Cancel
      </button>
    </>
  )}

  {item.status === "Paused" && (
    <>
      <button
        onClick={() => setConfirmAction({ type: "resume", id: item.id })}
        className="flex items-center gap-1 text-[9px] px-2 py-[2px] rounded-md bg-green-100 text-green-700"
      >
        <Play size={10} />
        Resume
      </button>

      <button
        onClick={() => setConfirmAction({ type: "cancel", id: item.id })}
        className="flex items-center gap-1 text-[9px] px-2 py-[2px] rounded-md bg-red-100 text-red-600"
      >
        <XCircle size={10} />
        Cancel
      </button>
    </>
  )}
</div>
    <p className="hidden sm:block text-[10px] text-gray-400 mt-1 line-clamp-1">
      {item.shippingFullAddress}
    </p>
  </div>

  {/* RIGHT SIDE */}
  <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0">

    {/* STATUS */}
    <span
      className={`text-xs sm:text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${
        item.status === "Active"
          ? "bg-green-100 text-green-700"
          : item.status === "Paused"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {item.statusDisplay}
    </span>

    {/* PRICE */}
    <p className="font-semibold text-sm sm:text-base whitespace-nowrap">
      £{item.discountedPrice?.toFixed(2)}
    </p>

    {/* ACTIONS */}
    <div className="hidden sm:flex flex-wrap justify-end gap-1 mt-1">

      {item.status === "Active" && (
        <>
          <button
            onClick={() => setConfirmAction({ type: "pause", id: item.id })}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition whitespace-nowrap"
          >
            <Pause size={12} />
            Pause
          </button>

          <button
            onClick={() => setConfirmAction({ type: "skip", id: item.id })}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition whitespace-nowrap"
          >
            <SkipForward size={12} />
            Skip
          </button>

          <button
            onClick={() => setConfirmAction({ type: "cancel", id: item.id })}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition whitespace-nowrap"
          >
            <XCircle size={12} />
            Cancel
          </button>
        </>
      )}

      {item.status === "Paused" && (
        <>
          <button
            onClick={() => setConfirmAction({ type: "resume", id: item.id })}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition whitespace-nowrap"
          >
            <Play size={12} />
            Resume
          </button>

          <button
            onClick={() => setConfirmAction({ type: "cancel", id: item.id })}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition whitespace-nowrap"
          >
            <XCircle size={12} />
            Cancel
          </button>
        </>
      )}
    </div>
  </div>
</div>
          ))}
        </div>
      )}
{confirmAction.type && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    
    <div className="bg-white w-[90%] max-w-md rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in-95">

      {/* ICON + TITLE */}
      <div className="flex items-start gap-3 mb-4">

        <div
          className={`p-2 rounded-full ${
            confirmAction.type === "cancel"
              ? "bg-red-100 text-red-600"
              : confirmAction.type === "pause"
              ? "bg-yellow-100 text-yellow-700"
              : confirmAction.type === "resume"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {confirmAction.type === "cancel" && <XCircle size={20} />}
          {confirmAction.type === "pause" && <Pause size={20} />}
          {confirmAction.type === "resume" && <Play size={20} />}
          {confirmAction.type === "skip" && <SkipForward size={20} />}
        </div>

        <div>
          <h3 className="text-lg font-semibold">
            {confirmAction.type === "cancel" && "Cancel Subscription"}
            {confirmAction.type === "pause" && "Pause Subscription"}
            {confirmAction.type === "resume" && "Resume Subscription"}
            {confirmAction.type === "skip" && "Skip Delivery"}
          </h3>

          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {confirmAction.type === "cancel" &&
              "This will permanently cancel your subscription. You won’t receive future deliveries."}

            {confirmAction.type === "pause" &&
              "Your subscription will be paused. You can resume anytime from your account."}

            {confirmAction.type === "resume" &&
              "Your subscription will continue as scheduled from the next delivery."}

            {confirmAction.type === "skip" &&
              "Your upcoming delivery will be skipped once. The next cycle will continue normally."}
          </p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-2 mt-6">

        <button
          onClick={() => setConfirmAction({ type: null, id: null })}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-100 transition"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            const { type, id } = confirmAction;
            if (!id) return;

            if (type === "cancel") await handleCancel(id);
            if (type === "pause") await handlePause(id);
            if (type === "resume") await handleResume(id);
            if (type === "skip") await handleSkip(id);

            setConfirmAction({ type: null, id: null });
          }}
          className={`px-4 py-2 text-sm rounded-lg text-white transition ${
            confirmAction.type === "cancel"
              ? "bg-red-600 hover:bg-red-700"
              : confirmAction.type === "pause"
              ? "bg-yellow-600 hover:bg-yellow-700"
              : confirmAction.type === "resume"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Confirm
        </button>

      </div>
    </div>
  </div>
)}
    </div>
    
  );
}