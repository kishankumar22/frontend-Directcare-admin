"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

function formatCurrency(n = 0) {
  return `£${n.toFixed(2)}`;
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      console.error("❌ orderId missing");
      setLoading(false);
      return;
    }

  async function fetchOrder() {
  try {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Orders/${orderId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ""
        }
      }
    );

    const raw = await resp.text();

    alert("ORDER RAW RESPONSE:\n" + raw);  // ⭐⭐ ADD THIS FIRST ⭐⭐
    console.log("RAW RESPONSE:", raw);

    if (!raw || raw.trim() === "") {
      alert("❌ RAW RESPONSE IS EMPTY");
      return;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      alert("❌ JSON PARSE ERROR IN RAW:\n" + raw);
      console.error("JSON PARSE ERROR:", raw);
      return;
    }

    if (json?.success) {
      setOrder(json.data);
    } else {
      alert("❌ ORDER FETCH FAILED:\n" + JSON.stringify(json));
    }

  } catch (err) {
    alert("❌ FETCH ERROR:\n" + err);
  } finally {
    setLoading(false);
  }
}


    fetchOrder();
  }, [orderId]);

  /* -------------------- LOADING STATE -------------------- */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600 text-lg">
        Loading your order…
      </div>
    );
  }

  /* -------------------- ORDER NOT FOUND -------------------- */
  if (!order) {
    return (
      <div className="p-10 text-center text-red-600">
        ❌ Order not found.
        <br />
        <Link href="/" className="text-blue-600 underline">
          Go to Home
        </Link>
      </div>
    );
  }

  const payment = order.payments?.[0] ?? null;

  /* -------------------- SUCCESS PAGE UI -------------------- */
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white shadow-lg rounded-lg p-8">

        {/* HEADER */}
        <h1 className="text-2xl font-bold text-green-700 mb-3">
          🎉 Thank you! Your order is confirmed.
        </h1>

        <p className="text-gray-700 mb-6">
          A confirmation email has been sent to{" "}
          <strong>{order.customerEmail}</strong>.
        </p>

        {/* ORDER INFO */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Order Information</h2>
          <div className="border p-4 rounded bg-gray-50 space-y-2">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-medium">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Number:</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(order.orderDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">{order.status}</span>
            </div>
          </div>
        </section>

        {/* PAYMENT DETAILS */}
        {payment && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Payment Details</h2>
            <div className="border p-4 rounded bg-gray-50 space-y-2">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span>{payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Intent ID:</span>
                <span className="font-mono text-xs">
                  {payment.paymentIntentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span>{payment.status}</span>
              </div>
            </div>
          </section>
        )}

        {/* ITEMS */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Items</h2>
          <div className="border p-4 rounded bg-gray-50 space-y-4">
            {order.orderItems.map((item: any) => (
              <div key={item.id} className="border-b pb-3">
                <div className="font-semibold">{item.productName}</div>
                <div className="text-sm text-gray-500">{item.variantName}</div>
                <div className="flex justify-between mt-1">
                  <span>Qty: {item.quantity}</span>
                  <span>
                    {formatCurrency(item.unitPrice)} × {item.quantity} ={" "}
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TOTALS */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Totals</h2>
          <div className="border p-4 rounded bg-gray-50 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>{formatCurrency(order.shippingAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </section>

        <Link
          href="/products"
          className="inline-block bg-[#445D41] text-white px-6 py-3 rounded"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
