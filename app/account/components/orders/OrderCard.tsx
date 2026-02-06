"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Info from "../ui/Info";
import { getOrderStatusBadge } from "./orderUtils";
import { useAuth } from "@/app/admin/_context/AuthContext";
import { useState } from "react";


export default function OrderCard({ order }: { order: any }) {
      const { accessToken, user } = useAuth();
      const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState("");
const [cancelLoading, setCancelLoading] = useState(false);
const [emailInvoice, setEmailInvoice] = useState(false);
const [invoiceLoading, setInvoiceLoading] = useState(false);
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

    if (!res.ok) {
      throw new Error("Invoice generation failed");
    }

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

 
 const handleConfirmCancel = async () => {
  if (!cancelReason.trim()) return;

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
          cancellationReason: cancelReason,
          restoreInventory: true,
          initiateRefund: true,
          cancelledBy: "Customer",
          currentUser: user?.email,
        }),
      }
    );

    const json = await res.json();

    if (json.success) {
      setShowCancelModal(false);
      window.location.reload();
    }
  } finally {
    setCancelLoading(false);
  }
};

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">Order Id: #{order.orderNumber}</p>
          <p className="text-sm text-gray-500">
           Ordered on: {new Date(order.orderDate).toLocaleDateString()}
          </p>
        </div>

       <span
  className={`inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium capitalize border whitespace-nowrap ${getOrderStatusBadge(order.status)}`} >
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
      {/* PRODUCT IMAGE */}
      <div className="w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden bg-white">
        <img
          src={
            item.productImageUrl?.startsWith("http")
              ? item.productImageUrl
              : `${process.env.NEXT_PUBLIC_API_URL}${item.productImageUrl}`
          }
          alt={"no img"}
          className="w-full h-full object-contain"
        />
      </div>

      {/* PRODUCT INFO */}
      <div className="flex-1">
        <p className="font-medium text-sm line-clamp-2">
          {item.productName}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Qty: {item.quantity}
        </p>
      </div>

      {/* PRICE */}
      <div className="text-right text-sm font-semibold">
        £{item.totalPrice.toFixed(2)}
      </div>
    </Link>
  ))}
</div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-0 pt-3 border-t text-sm">
        <Info label="Total Items" value={order.itemsCount} />
        <Info label="Payment Method" value={order.payment?.paymentMethod ?? "Cash on delivery"} />
        <Info label="Delivery Method" value={order.deliveryMethodName} />
        <Info label="Total amount paid" value={`£${order.totalAmount.toFixed(2)}`} />
        <Info label="Payment Status" value={order.payment?.statusName ?? "—"} />
  <Info label="Transaction ID" value={order.payment?.transactionId ?? "—"} />
  
      </div>

      {/* ACTION */}
     

  <div className="flex justify-end items-center gap-4 pt-3 border-t">
  {/* EMAIL INVOICE CHECKBOX */}
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <input
      type="checkbox"
      id={`email-invoice-${order.id}`}
      checked={emailInvoice}
      onChange={(e) => setEmailInvoice(e.target.checked)}
    />
    <label htmlFor={`email-invoice-${order.id}`}>
      Email invoice
    </label>
  </div>

  {/* DOWNLOAD BUTTON */}
  <Button
    onClick={handleDownloadInvoice}
    size="sm"
    variant="outline"
    disabled={invoiceLoading}
    className="text-white bg-[#445D41] hover:bg-green-700"
  >
    {invoiceLoading ? "Generating Invoice..." : "Download Invoice"}
  </Button>

  {/* CANCEL BUTTON (UNCHANGED) */}
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

{showCancelModal && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-2">
        Cancel Order #{order.orderNumber}
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Please tell us why you want to cancel this order.
      </p>

      <textarea
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Reason for cancellation"
        className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
        rows={4}
      />

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
          disabled={cancelLoading || !cancelReason.trim()}
          onClick={handleConfirmCancel}
        >
          {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
        </Button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
