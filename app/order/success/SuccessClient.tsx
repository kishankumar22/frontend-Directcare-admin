"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { MapPin } from "lucide-react";

function formatCurrency(n = 0) {
  return `£${n.toFixed(2)}`;
}

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { accessToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const resp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Orders/${orderId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(isAuthenticated && {
                Authorization: `Bearer ${accessToken}`,
              }),
            },
          }
        );

        const raw = await resp.text();
        if (!raw) return;

        const json = JSON.parse(raw);
        if (json?.success) setOrder(json.data);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, isAuthenticated, accessToken]);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-600">
        Loading your order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-red-600">
        Order not found
      </div>
    );
  }

  const payment = order.payments?.[0] ?? null;
const loyaltyPointsEarned = order.loyaltyPointsEarned ?? 0;

  return (
    <div className="max-w-7xl  mx-auto px-4 md:px-6 py-2">
      
      <div className="bg-white rounded-2xl shadow-md p-6">

        {/* SUCCESS HEADER */}
      <div className="flex items-start justify-between gap-6 mb-8">
  {/* LEFT: Order confirmed */}
  <div className="flex items-start gap-4">
    <div className="h-12 w-12 rounded-md bg-green-100 flex items-center justify-center text-green-700 font-bold">
      ✓
    </div>

    <div>
      <h1 className="text-2xl font-semibold text-[#445D41]">
        Order confirmed
      </h1>
      <p className="text-sm text-[#445D41]">
        Confirmation sent to <strong>{order.customerEmail}</strong>
      </p>
    </div>
  </div>

 <div
  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm ${
    loyaltyPointsEarned > 0
      ? "bg-gradient-to-br from-green-600 to-[#445D41] text-white"
      : "bg-orange-100 text-orange-700 text-black"
  }`}
>
  <span className="text-xl leading-none">
    {loyaltyPointsEarned > 0 ? "🎁" : "ℹ️"}
  </span>

  <span className="tracking-tight">
    You have earned{" "}
    <span className="font-bold">
      {loyaltyPointsEarned.toLocaleString()}
    </span>{" "}
    loyalty points on this order
  </span>
</div>

</div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            {/* ORDER INFO */}
            <section>
              <h2 className="text-sm font-semibold uppercase mb-2">
                Order information
              </h2>
              <div className="border rounded-lg p-4 space-y-1.5">
                <div className="flex justify-between">
                  <span>Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Status:</span>
                  <span className="font-medium">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  
                   <span>Date:</span>
                  <span>{new Date(order.orderDate).toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* DELIVERY */}
           <section>
  <h2 className="text-sm font-semibold uppercase mb-2">
    Delivery & Billing
  </h2>

  <div className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">

                {order.deliveryMethod === "HomeDelivery" && order.shippingAddress && (
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                    <div className="text-sm">
      <p className="font-semibold mb-1">Shipping Address</p>
                      <p className="font-medium">
                        {order.shippingAddress.firstName}{" "}
                        {order.shippingAddress.lastName}
                      </p>
                      {order.shippingAddress.company && (
                        <p>{order.shippingAddress.company}</p>
                      )}
                      <p>{order.shippingAddress.addressLine1}</p>
                      {order.shippingAddress.addressLine2 && (
                        <p>{order.shippingAddress.addressLine2}</p>
                      )}
                      <p>
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state}
                      </p>
                      <p>
                        {order.shippingAddress.postalCode},{" "}
                        {order.shippingAddress.country}
                      </p>
                    </div>
                  </div>
                )}

                {order.deliveryMethod === "ClickAndCollect" && (
                  <>
                    <div className="flex gap-3">
                      <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                      <div className="text-sm">
                        <p className="font-medium">Store location</p>
                        <p>Spacebox Business Park Unit E 38</p>
                        <p>Plume Street, Birmingham</p>
                        <p>B6 7RT</p>
                      </div>
                    </div>

                    {order.collectionStatus && (
                      <div className="flex justify-between">
                        <span>Collection Status</span>
                        <span>{order.collectionStatus}</span>
                      </div>
                    )}

                    {order.collectionExpiryDate && (
                      <div className="flex justify-between">
                        <span>Collect before</span>
                        <span>
                          {new Date(order.collectionExpiryDate).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {order.readyForCollectionAt && (
                      <div className="flex justify-between">
                        <span>Ready at</span>
                        <span>
                          {new Date(order.readyForCollectionAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {order.collectedAt && (
                      <div className="flex justify-between">
                        <span>Collected at</span>
                        <span>
                          {new Date(order.collectedAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Click & Collect fee</span>
                      <span>
                        {formatCurrency(order.clickAndCollectFee)}
                      </span>
                    </div>
                  </>
                )}
                {/* BILLING */}
{order.billingAddress && (
  <div className="flex gap-3">
    <MapPin className="w-4 h-4 mt-1 text-gray-500" />
    <div className="text-sm">
      <p className="font-semibold mb-1">Billing Address</p>

      <p className="font-medium">
        {order.billingAddress.firstName}{" "}
        {order.billingAddress.lastName}
      </p>

      {order.billingAddress.company && (
        <p>{order.billingAddress.company}</p>
      )}

      <p>{order.billingAddress.addressLine1}</p>

      {order.billingAddress.addressLine2 && (
        <p>{order.billingAddress.addressLine2}</p>
      )}

      <p>
        {order.billingAddress.city},{" "}
        {order.billingAddress.state}
      </p>

      <p>
        {order.billingAddress.postalCode},{" "}
        {order.billingAddress.country}
      </p>
    </div>
  </div>
)}

              </div>
              
            </section>

            {/* ITEMS */}
            <section>
              <h2 className="text-sm font-semibold uppercase mb-2">
                Items
              </h2>

              <div className="border rounded-lg divide-y">
                {order.orderItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 items-start"
                  >
                    <Link href={`/products/${item.productSlug}`}>
                      <img
                        src={
                          item.productImageUrl?.startsWith("http")
                            ? item.productImageUrl
                            : `${process.env.NEXT_PUBLIC_API_URL}${item.productImageUrl}`
                        }
                        className="w-20 h-20 object-contain border rounded bg-white"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-medium hover:text-[#445D41] line-clamp-2"
                      >
                        {item.productName}
                      </Link>

                      {item.variantName && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.variantName}
                        </p>
                      )}

                      <div className="flex justify-between mt-2 text-sm">
                        <span>Qty {item.quantity}</span>
                        <span className="font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>09874
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">

              {/* PAYMENT */}
              <section>
                <h2 className="text-sm font-semibold uppercase mb-2">
                  Payment Details
                </h2>
                <div className="border rounded-lg p-4 space-y-2">
                  {!payment && (
                    <>
                      <div className="flex justify-between">
                        <span>Payment method:</span>
                        <span>Cash on Delivery</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black">Payment Status:</span>
                        <span className="text-orange-600">Pay on delivery</span>
                      </div>
                    </>
                  )}

                  {payment && (
                    <>
                      <div className="flex justify-between">
                        <span>Payment Method:</span>
                        <span>{payment.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Status:</span>
                        <span className="text-green-600">{payment.status}</span>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* TOTALS */}
              <section>
                <h2 className="text-sm font-semibold uppercase mb-2">
                  Summary
                </h2>
                <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shippingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </section>

             {isAuthenticated && (
  <Link
    href="/account?tab=orders"
    className="block text-center bg-[#445D41] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
  >
    Go to My Orders
  </Link>
)}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
