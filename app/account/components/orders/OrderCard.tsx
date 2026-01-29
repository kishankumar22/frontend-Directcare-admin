"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Info from "../ui/Info";
import { getOrderStatusBadge } from "./orderUtils";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function OrderCard({ order }: { order: any }) {
      const { accessToken, user } = useAuth();
      const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState("");
const [cancelLoading, setCancelLoading] = useState(false);

  const handleDownloadInvoice = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${order.orderNumber}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f6f7f8;
      padding: 40px;
      color: #111;
    }

    .invoice-wrapper {
      max-width: 900px;
      margin: auto;
      background: #fff;
      border: 2px solid #445D41;
      padding: 32px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #445D41;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .logo {
      height: 70px;
      width: 270px;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h1 {
      margin: 0;
      color: #445D41;
      font-size: 28px;
    }

    .invoice-title p {
      margin: 4px 0;
      font-size: 14px;
    }

    .section {
      margin-bottom: 24px;
      font-size: 14px;
    }

    .section h3 {
      margin-bottom: 8px;
      color: #445D41;
      font-size: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      font-size: 14px;
    }

    th {
      background: #f1f4f2;
      text-align: left;
    }

    td.right, th.right {
      text-align: right;
    }

    .totals {
      width: 350px;
      margin-left: auto;
      margin-top: 20px;
      border: 2px solid #445D41;
    }

    .totals td {
      padding: 10px;
      font-size: 14px;
    }

    .totals tr:last-child td {
      background: #445D41;
      color: #fff;
      font-weight: bold;
      font-size: 16px;
    }

    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>

<body>
  <div class="invoice-wrapper">

    <div class="header">
      <img src="/logo/logo.png" class="logo" />

      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p><strong>Order:</strong> ${order.orderNumber}</p>
        <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
      </div>
    </div>

    <div class="section">
      <strong>Direct Care</strong><br/>
      Health & Beauty Shack<br/>
      United Kingdom
    </div>

    <div class="section">
      <h3>Billing Address</h3>
      ${order.billingAddress?.firstName} ${order.billingAddress?.lastName}<br/>
      ${order.billingAddress?.addressLine1}<br/>
      ${order.billingAddress?.city}, ${order.billingAddress?.postalCode}<br/>
      ${order.billingAddress?.country}
    </div>

    <div class="section">
      <h3>Order Items</h3>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((i: any) => `
            <tr>
              <td>${i.productName}</td>
              <td>${i.quantity}</td>
              <td class="right">£${i.unitPrice.toFixed(2)}</td>
              <td class="right">£${i.totalPrice.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <table class="totals">
      <tr>
        <td>Subtotal</td>
        <td class="right">£${order.subtotalAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Shipping</td>
        <td class="right">£${order.shippingAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>VAT</td>
        <td class="right">£${order.taxAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Total</td>
        <td class="right">£${order.totalAmount.toFixed(2)}</td>
      </tr>
    </table>

    <div class="footer">
      Payment Method: ${order.payment?.paymentMethod ?? "COD"}<br/>
      Thank you for shopping with <strong>Direct Care</strong>.<br/>
      This invoice was generated electronically.
    </div>

  </div>

  <script>
    window.print();
  </script>
</body>
</html>
`);

    win.document.close();
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
     <div className="flex justify-end gap-3 pt-3 border-t">
  <Button onClick={handleDownloadInvoice} size="sm" variant="outline" className="text-white bg-[#445D41] hover:bg-green-700">
    Download Invoice
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
