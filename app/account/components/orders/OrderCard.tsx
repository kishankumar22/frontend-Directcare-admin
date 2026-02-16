"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Info from "../ui/Info";
import { getOrderStatusBadge } from "./orderUtils";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useToast } from "@/components/toast/CustomToast";

const CANCELLATION_REASONS = [
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery time is taking too long",
  "Product no longer needed",
  "Other",
];

const MIN_OTHER_REASON_LENGTH = 10;

export default function OrderCard({ order }: { order: any }) {
  const { accessToken, user } = useAuth();
const toast = useToast();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [emailInvoice, setEmailInvoice] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  /* =========================
     DOWNLOAD INVOICE
  ========================== */
  const handleDownloadInvoice = async () => {
    try {
      setInvoiceLoading(true);

      const res = await fetch(
        `https://testapi.knowledgemarkg.com/api/orders/${order.id}/regenerate-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            notes: "",
            sendToCustomer: emailInvoice,
            currentUser: user?.email ?? "customer",
          }),
        }
      );

      if (!res.ok) throw new Error("Invoice generation failed");

      const json = await res.json();

      if (!json.success || !json.data?.pdfUrl) {
        throw new Error("Invalid invoice response");
      }

      const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL}${json.data.pdfUrl}`;
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      alert("Unable to generate invoice. Please try again.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  /* =========================
     CANCEL ORDER
  ========================== */
  const handleConfirmCancel = async () => {
  const finalReason =
    selectedReason === "Other"
      ? customReason.trim()
      : selectedReason;

  if (!finalReason) return;

  if (
    selectedReason === "Other" &&
    finalReason.length < MIN_OTHER_REASON_LENGTH
  ) {
    toast.error(
      `Please enter at least ${MIN_OTHER_REASON_LENGTH} characters`
    );
    return;
  }

  setCancelLoading(true);

  try {
    const res = await fetch(
      `https://testapi.knowledgemarkg.com/api/Orders/${order.id}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          cancellationReason: finalReason,
          restoreInventory: true,
          initiateRefund: true,
          cancelledBy: "Customer",
          currentUser: user?.email,
        }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json?.message || "Cancellation failed");
    }

    // ✅ SUCCESS TOAST (BACKEND MESSAGE)
    toast.success(json.message || "Order cancelled successfully");

    // ✅ CLOSE MODAL
    setShowCancelModal(false);

    // ✅ RESET STATE
    setSelectedReason("");
    setCustomReason("");

    // ✅ OPTIONAL: update order object locally
    order.status = "Cancelled";
    order.statusName = "Cancelled";

  } catch (err: any) {
    toast.error(err.message || "Unable to cancel order");
  } finally {
    setCancelLoading(false);
  }
};


  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">
            Order Id: #{order.orderNumber}
          </p>
          <p className="text-sm text-gray-500">
            Ordered on:{" "}
            {new Date(order.orderDate).toLocaleDateString()}
          </p>
        </div>

        <span
          className={`inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium capitalize border whitespace-nowrap ${getOrderStatusBadge(
            order.status
          )}`}
        >
          {order.statusName ?? order.status}
        </span>
      </div>

      {/* PRODUCTS */}
      <div className="space-y-3">
        {order.items?.map((item: any) => (
          <Link
            key={item.id}
            href={`/products/${item.productSlug}`}
            className="flex items-center gap-4 border rounded-lg p-3 hover:bg-gray-50 transition"
          >
            <div className="w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden bg-white">
              <img
                src={
                  item.productImageUrl?.startsWith("http")
                    ? item.productImageUrl
                    : `${process.env.NEXT_PUBLIC_API_URL}${item.productImageUrl}`
                }
                alt={item.productName}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1">
              <p className="font-medium text-sm line-clamp-2">
                {item.productName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Qty: {item.quantity}
              </p>
            </div>

            <div className="text-right text-sm font-semibold">
              £{item.totalPrice.toFixed(2)}
            </div>
          </Link>
        ))}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-0 pt-3 border-t text-sm">
        <Info label="Total Items" value={order.itemsCount} />
        <Info
          label="Payment Method"
          value={order.payment?.paymentMethod ?? "Cash on delivery"}
        />
        <Info
          label="Delivery Method"
          value={order.deliveryMethodName}
        />
        <Info
          label="Total amount paid"
          value={`£${order.totalAmount.toFixed(2)}`}
        />
        <Info
          label="Payment Status"
          value={order.payment?.statusName ?? "—"}
        />
        <Info
          label="Transaction ID"
          value={order.payment?.transactionId ?? "—"}
        />
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end items-center gap-4 pt-3 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={emailInvoice}
            onChange={(e) => setEmailInvoice(e.target.checked)}
          />
          Email invoice
        </div>

        <Button
          onClick={handleDownloadInvoice}
          size="sm"
          variant="outline"
          disabled={invoiceLoading}
          className="text-white bg-[#445D41] hover:bg-green-700"
        >
          {invoiceLoading
            ? "Generating Invoice..."
            : "Download Invoice"}
        </Button>

        {["pending", "processing"].includes(
          order.status?.toLowerCase()
        ) && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              Cancel Order #{order.orderNumber}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Please select a reason for cancellation.
            </p>

            <div className="space-y-3">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={selectedReason === reason}
                    onChange={() => {
                      setSelectedReason(reason);
                      if (reason !== "Other") setCustomReason("");
                    }}
                  />
                  {reason}
                </label>
              ))}

              {selectedReason === "Other" && (
                <>
                  <textarea
                    value={customReason}
                    onChange={(e) =>
                      setCustomReason(e.target.value)
                    }
                    placeholder={`Please specify your reason (min ${MIN_OTHER_REASON_LENGTH} characters)`}
                    rows={3}
                    className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500">
                    {customReason.trim().length}/
                    {MIN_OTHER_REASON_LENGTH} characters required
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
              >
                Back
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={
                  cancelLoading ||
                  !selectedReason ||
                  (selectedReason === "Other" &&
                    customReason.trim().length <
                      MIN_OTHER_REASON_LENGTH)
                }
                onClick={handleConfirmCancel}
              >
                {cancelLoading
                  ? "Cancelling..."
                  : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
