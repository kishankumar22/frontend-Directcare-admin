// app/checkout/page.tsx ka wokig codehai
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import EmptyCart from "@/components/cart/EmptyCart";




// ---------- Types ----------
type PostcodeSuggestion = {
  postcode?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  region?: string;
  country?: string;
  displayText?: string;
};

function formatCurrency(n = 0) {
  return `£${n.toFixed(2)}`;
}

/* ===== Simple debounce hook (no lodash) ===== */
function useDebouncedCallback<T extends (...args: any[]) => any>(fn: T, wait = 300) {
  const timer = useRef<number | undefined>(undefined);
  const latestFn = useRef(fn);
  useEffect(() => {
    latestFn.current = fn;
  }, [fn]);

  return useCallback((...args: Parameters<T>) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => {
      latestFn.current(...args);
    }, wait) as unknown as number;
  }, [wait]);
}

/* === Stripe wrapper component (we fetch publishable key first) === */
function StripeWrapper({ children }: { children: React.ReactNode }) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Payment/config`);
        const json = await res.json();

        // backend returns { success:true, data: { publishableKey: 'pk_...' } }
        const pk =
          json?.data?.publishableKey ??
          json?.data?.publishable_key ??
          json?.publishableKey ??
          json?.publishable_key ??
          null;

        if (!pk) {
          console.error("Publishable key missing from /api/Payment/config response", json);
          return;
        }

        if (mounted) setStripePromise(loadStripe(pk));
      } catch (err) {
        console.error("Failed to fetch publishable key", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!stripePromise) {
    return <div>Loading payment configuration...</div>;
  }

  return <Elements stripe={stripePromise as any}>{children}</Elements>;
}

/* === Payment form as a child component === */
/* === CARD PAYMENT COMPONENT (FINAL PERFECT VERSION) === */
function CheckoutPayment({
  orderPayload,
  onPaymentSuccess,
  onError,
}: {
  orderPayload: any;
  onPaymentSuccess: (orderResponse: any) => void;
  onError: (err: any) => void;
}) {
   const { isAuthenticated, accessToken, user } = useAuth(); 



  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);


  // 1️⃣ Create ORDER First
async function createOrder() {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isAuthenticated && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify(orderPayload),
  });

  const status = resp.status;
  const raw = await resp.text();

  alert("ORDER RAW RESPONSE:\nSTATUS: " + status + "\nBODY:\n" + raw);

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error("❌ JSON parse error:\n" + raw);
  }

  if (!resp.ok) {
    console.error("ORDER FAILED JSON:", json);
    throw new Error("Order creation failed! status=" + status);
  }

  if (!json?.data?.id) {
    console.error("ORDER FAILED JSON:", json);
    throw new Error("Order creation failed! missing id");
  }

  return {
    orderId: json.data.id,
    orderTotal: json.data.totalAmount,
    customerEmail: json.data.customerEmail,
  };
}



  // 2️⃣ Create Payment Intent with orderId
  async function createPaymentIntent(orderId: string, amount: number, customerEmail: string) {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Payment/create-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency: "GBP",
        customerEmail,
        orderId,            // MUST BE SENT (most important)
        metadata: { source: "checkout_page" },
      }),
    });

    const json = await resp.json();
    console.log("INTENT RESPONSE:", json);
     alert("INTENT RESPONSE (parsed):\n" + JSON.stringify(json, null, 2));
    // quick field check
    alert(
      "clientSecret: " + (json?.data?.clientSecret ?? "MISSING") + "\n" +
      "paymentIntentId: " + (json?.data?.paymentIntentId ?? "MISSING")
    );

    if (!json?.data?.clientSecret || !json?.data?.paymentIntentId) {
      throw new Error("Payment Intent missing fields");
    }

    return {
      clientSecret: json.data.clientSecret,
      paymentIntentId: json.data.paymentIntentId,
    };
  }

const handlePay = async () => {
  if (!stripe || !elements) return;
 setCardError(null);   // ⭐⭐⭐ ADD HERE — EXACT LOCATION
  setProcessing(true);
  try {
    // 1️⃣ Create order
    const { orderId, orderTotal, customerEmail } = await createOrder();

    // 2️⃣ Create Payment Intent
    const { clientSecret } = await createPaymentIntent(
      orderId,
      orderTotal,
      customerEmail
    );

    // 3️⃣ Confirm card with Stripe
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) throw new Error("CardElement missing");

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardEl,
        billing_details: {
          name: `${orderPayload.billingFirstName} ${orderPayload.billingLastName}`,
          email: orderPayload.customerEmail,
          phone: orderPayload.customerPhone,
          address: {
            line1: orderPayload.billingAddressLine1,
            city: orderPayload.billingCity,
            postal_code: orderPayload.billingPostalCode,
            country: "GB",
          },
        },
      },
    });

   if (result.error) {
  setCardError(result.error.message || "Payment failed. Please check your card details.");
  setProcessing(false);
  return;
}


    // ⭐⭐ THIS IS THE REAL CONFIRMED PAYMENT INTENT ID ⭐⭐
    const finalPaymentIntentId = result.paymentIntent?.id;
    if (!finalPaymentIntentId) throw new Error("Missing final payment intent ID");

    alert("FINAL PAYMENT INTENT ID: " + finalPaymentIntentId);
    

    // 4️⃣ Confirm in backend WITH FINAL PAYMENT INTENT
  const confirmResp = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/Payment/confirm/${finalPaymentIntentId}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }
);

const rawConfirm = await confirmResp.text();
alert("CONFIRM RAW RESPONSE: " + rawConfirm);


    // Go to success page
    onPaymentSuccess({ data: { id: orderId } });

  } catch (err) {
    console.error(err);
    onError(err);
  } finally {
    setProcessing(false);
  }
};


  return (
    <div className="space-y-3">
      {cardError && (
  <div className="text-red-600 text-sm p-2 border border-red-300 rounded bg-red-50">
    {cardError}
  </div>
)}

      <div className="p-3 border rounded">
        <CardElement options={{ hidePostalCode: true }} />
      </div>

      <button
        onClick={handlePay}
        disabled={!stripe || processing}
        className="w-full bg-[#445D41] text-white py-3 rounded disabled:opacity-50"
      >
        {processing ? "Processing…" : `Pay £${orderPayload.orderTotal.toFixed(2)}`}
      </button>
    </div>
  );
}

const ErrorText = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-red-600 text-xs mt-1">{error}</p>;
};

/* === Main Checkout Page === */
export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, cartCount, updateCart, updateQuantity } = useCart();

  const { user, accessToken, isAuthenticated } = useAuth();




  // Billing fields
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingCompany, setBillingCompany] = useState("");
 const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("United Kingdom");
  //delivery methods
const [deliveryMethod, setDeliveryMethod] = useState<"HomeDelivery" | "ClickAndCollect">("HomeDelivery");
  // Shipping fields
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingFirstName, setShippingFirstName] = useState("");
  const [shippingLastName, setShippingLastName] = useState("");
  const [shippingCompany, setShippingCompany] = useState("");
  const [shippingAddress1, setShippingAddress1] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United Kingdom");

  const [notes, setNotes] = useState("");
  const [postcodeQuery, setPostcodeQuery] = useState("");
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const [showPayment, setShowPayment] = useState(false);
  const [orderPayload, setOrderPayload] = useState<any>(null);

  // Payment method state: 'card' or 'cod'
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");

  // Coupon state on checkout (prefill from cart if already applied)
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // detect coupon from cart items (first coupon found)
  useEffect(() => {
    const itemWithCoupon = cart.find((c) => !!c.couponCode);
    if (itemWithCoupon?.couponCode) {
      setCouponInput(itemWithCoupon.couponCode);
      setAppliedCoupon(itemWithCoupon.couponCode);
    }
  }, [cart]);

  // --- NEW: prefill billing email from localStorage (Continue as Guest) ---
 useEffect(() => {
  if (isAuthenticated && user?.email) {
    setBillingEmail(user.email);
  } else {
    const savedEmail = localStorage.getItem("guestEmail");
    if (savedEmail) setBillingEmail(savedEmail);
  }
}, [isAuthenticated, user]);




  // Debounced autocomplete using the single API you provided
 const doAutocomplete = useCallback(async (q: string) => {
  if (!q || q.length < 4) {
    setPostcodeSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Postcode/search?query=${encodeURIComponent(q)}&limit=20`
    );

    const json = await res.json();

    // ⭐ BACKEND RETURNS: { success, data: [] }
    const raw = json?.data ?? json;

    const suggestions: PostcodeSuggestion[] = Array.isArray(raw)
      ? raw.map((x: any) => ({
          postcode: x.postcode,
          addressLine1: x.addressLine1,
          city: x.city,
          state: x.state,
          region: x.region,
          country: x.country,
          displayText: x.displayText ?? `${x.postcode} - ${x.city}`,
        }))
      : [];

    setPostcodeSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  } catch (err) {
    console.error("autocomplete error", err);
    setPostcodeSuggestions([]);
    setShowSuggestions(false);
  }
}, []);


  const debouncedAutocomplete = useDebouncedCallback(doAutocomplete, 350);

  useEffect(() => {
    debouncedAutocomplete(postcodeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postcodeQuery]);

  // When user selects suggestion -> autofill fields
  const handleSelectSuggestion = async (s: PostcodeSuggestion) => {
    setShowSuggestions(false);
    setPostcodeQuery(s.displayText ?? s.postcode ?? "");

    const postal = s.postcode ?? "";
    const city = s.city ?? "";
    const state = s.state ?? s.region ?? "";
    const addr1 = s.addressLine1 ?? "";

    // Fill shipping fields (and billing if checkbox says same)
    setShippingPostalCode(postal);
    setShippingCity(city);
    setShippingState(state);
    setShippingAddress1(addr1);

    if (shippingSameAsBilling) {
      setBillingPostalCode(postal);
      setBillingCity(city);
      setBillingState(state);
      setBillingAddress1(addr1);
    }
  };

  // Apply coupon on checkout (same logic as cart)
  const applyCoupon = () => {
    if (!couponInput || couponInput.trim() === "") return;
    let applied = false;

    const updated = cart.map((item) => {
      const product = item.productData;
      const discount = product?.assignedDiscounts?.find(
        (d: any) => d.requiresCouponCode && d.couponCode?.toLowerCase() === couponInput.trim().toLowerCase()
      );

      if (!discount) return item;
      applied = true;

      const basePrice = item.priceBeforeDiscount ?? item.price;
      const discountValue = discount.usePercentage
        ? (basePrice * discount.discountPercentage) / 100
        : discount.discountAmount;

      const finalPrice = +(basePrice - discountValue).toFixed(2);

      return {
        ...item,
        appliedDiscountId: discount.id,
        discountAmount: discountValue,
        finalPrice,
        couponCode: couponInput.trim(),
      };
    });

    if (!applied) {
      setError("This coupon is not valid for any product in your cart.");
      return;
    }

    // update cart in context (assumes updateCart exists)
    try {
      updateCart(updated);
    } catch (e) {
      console.warn("updateCart not implemented in context, skipping updateCart call");
    }

    setAppliedCoupon(couponInput.trim());
    setError(null);
  };

  const removeCoupon = () => {
    const updated = cart.map((item) => ({
      ...item,
      appliedDiscountId: null,
      discountAmount: 0,
      finalPrice: item.priceBeforeDiscount ?? item.price,
      couponCode: null,
    }));

    try {
      updateCart(updated);
    } catch (e) {
      console.warn("updateCart not implemented in context, skipping updateCart call");
    }

    setCouponInput("");
    setAppliedCoupon(null);
  };

  // Build order payload matching your sample
  const buildOrderPayload = () => {
    const items = cart.map((c) => ({
      productId: c.productId ?? c.id,
      productVariantId: c.variantId ?? null,
      quantity: c.quantity,
     unitPrice: c.finalPrice ?? c.price ?? c.priceBeforeDiscount,
    }));

    return {
      deliveryMethod,  // ADD THIS LINE
      customerEmail: billingEmail,
      customerPhone: `+44${billingPhone}`,
      isGuestOrder: !isAuthenticated,
      userId: isAuthenticated ? user?.id : null,
      billingFirstName,
      billingLastName,
      billingCompany,
      billingAddressLine1: billingAddress1,
      billingAddressLine2: billingAddress2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      shippingFirstName: shippingSameAsBilling ? billingFirstName : shippingFirstName,
      shippingLastName: shippingSameAsBilling ? billingLastName : shippingLastName,
      shippingCompany: shippingSameAsBilling ? billingCompany : shippingCompany,
      shippingAddressLine1: shippingSameAsBilling ? billingAddress1 : shippingAddress1,
     shippingAddressLine2: shippingSameAsBilling ? billingAddress2 : shippingAddress2,
      shippingCity: shippingSameAsBilling ? billingCity : shippingCity,
      shippingState: shippingSameAsBilling ? billingState : shippingState,
      shippingPostalCode: shippingSameAsBilling ? billingPostalCode : shippingPostalCode,
      shippingCountry: shippingSameAsBilling ? billingCountry : shippingCountry,
      orderItems: items,
      couponCode: appliedCoupon ?? null,
      notes,
      orderTotal: cartTotal,
    };
  };

  


const handleProceedToPayment = async () => {
  setError(null);
  setFieldErrors({});

  const errors: any = {};

  if (!billingEmail.trim()) {
    errors.billingEmail = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
    errors.billingEmail = "Enter a valid email address";
  }

  if (!billingFirstName.trim()) errors.billingFirstName = "First name is required";
  if (!billingLastName.trim()) errors.billingLastName = "Last name is required";
  if (!billingPhone.trim()) errors.billingPhone = "Phone number is required";
  if (deliveryMethod === "HomeDelivery") {
  if (!billingAddress1.trim()) errors.billingAddress1 = "Address line 1 is required";
  if (!billingPostalCode.trim()) errors.billingPostalCode = "Postcode is required";
}
  if (!billingAddress1.trim()) errors.billingAddress1 = "Address line 1 is required";
  if (!billingPostalCode.trim()) errors.billingPostalCode = "Postcode is required";

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }

 const subscriptionMap: Record<string, string> = {};

for (const item of cart) {
  if (item.type === "subscription") {
    try {
      console.log("Sending subscription payload:", {
        productId: item.productId ?? item.id,
        productVariantId: item.variantId ?? null,
        quantity: item.quantity,
        frequency: item.frequency,
      });

      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isAuthenticated && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          productId: item.productId ?? item.id,
          productVariantId: item.variantId ?? null,
          quantity: item.quantity,
          frequency: item.frequency,
          shippingFirstName: shippingSameAsBilling ? billingFirstName : shippingFirstName,
          shippingLastName: shippingSameAsBilling ? billingLastName : shippingLastName,
          shippingAddressLine1: shippingSameAsBilling ? billingAddress1 : shippingAddress1,
          shippingAddressLine2: shippingSameAsBilling ? billingAddress2 : shippingAddress2,
          shippingCity: shippingSameAsBilling ? billingCity : shippingCity,
          shippingState: shippingSameAsBilling ? billingState : shippingState,
          shippingPostalCode: shippingSameAsBilling ? billingPostalCode : shippingPostalCode,
          shippingCountry: shippingSameAsBilling ? billingCountry : shippingCountry,
        }),
      });

      console.log("STATUS:", resp.status);

      if (!resp.ok) {
        console.log("❌ Subscription FAILED:", await resp.text());
        alert("Subscription FAILED! Check console.");
        continue;
      }

      const json = await resp.json();
      console.log("Subscription CREATED:", json);
      alert("Subscription Response:\n" + JSON.stringify(json, null, 2));

      if (json?.data?.id) {
        subscriptionMap[item.id] = json.data.id;
      }

    } catch (err) {
      console.log("Catch ERROR:", err);
      alert("Catch Error - Check Console");
      setError("Subscription setup failed. Try again.");
      return;
    }
  }
}

console.log("subscriptionMap:", subscriptionMap);
alert("SUB MAP:\n" + JSON.stringify(subscriptionMap, null, 2));


  // ⭐ Now build payload including subscriptionId per orderItem
  const payload = {
    ...buildOrderPayload(),
    orderItems: cart.map((c) => ({
      productId: c.productId ?? c.id,
      productVariantId: c.variantId ?? null,
      quantity: c.quantity,
      unitPrice: c.finalPrice ?? c.price,
   subscriptionId: subscriptionMap[c.id] ?? null,
    frequency: c.frequency, // <--- ADD THIS (important)

// <--- MOST IMPORTANT
    })),
  };

  
  console.log("FINAL PAYLOAD:", payload);
alert("PAYLOAD BEFORE PAYMENT:\n" + JSON.stringify(payload, null, 2));


  setOrderPayload(payload);
  setShowPayment(true);
};


  // NEW: place COD order directly (no stripe)
  const handlePlaceOrderCOD = async () => {
    if (!orderPayload) {
      setError("Missing order details.");
      return;
    }
    setError(null);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Orders`, {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  ...(isAuthenticated && { Authorization: `Bearer ${accessToken}` })
},

        body: JSON.stringify({
          ...orderPayload,
          paymentMethod: "cod",
          paymentIntentId: null,
          isGuestOrder: !isAuthenticated,
userId: isAuthenticated ? user?.id : null,

          
          
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Failed to create COD order:", txt);
        throw new Error("Failed to create order");
      }

      const createdOrder = await resp.json();
 


alert("COD ORDER FULL: " + JSON.stringify(createdOrder));
alert("COD ORDER ID: " + createdOrder?.data?.id);

   router.push(`/order/success?orderId=${createdOrder.data.id}`);


    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to place order");
    }
  };

  const onPaymentSuccess = (createdOrder: any) => {
    // navigate to order success
alert("CARD ORDER FULL: " + JSON.stringify(createdOrder));
alert("CARD ORDER ID: " + createdOrder?.data?.id);


  router.push(`/order/success?orderId=${createdOrder.data.id}`);

  };

  const onPaymentError = (err: any) => {
    setError(err?.message ?? "Payment failed");
  };

  if (!cart || cart.length === 0) {
  return <EmptyCart />;
}


  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Billing + Shipping */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Billing details</h2>
           <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-4">
           
   <div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">Email *</label>
  <input
    value={billingEmail}
    onChange={(e) => setBillingEmail(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingEmail} />
</div>
               
          <div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">First name *</label>
  <input
    value={billingFirstName}
    onChange={(e) => setBillingFirstName(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingFirstName} />
</div>

<div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">Last name *</label>
  <input
    value={billingLastName}
    onChange={(e) => setBillingLastName(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingLastName} />
</div>

{/* Phone */}
<div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">Phone (UK) *</label>

  <div className="flex">
    {/* Fixed +44 prefix */}
    <span className="flex items-center bg-gray-100 border border-r-0 border-gray-300 px-3 rounded-l text-gray-700">
      +44
    </span>

    {/* User enters only digits */}
    <input
      type="tel"
      value={billingPhone}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/\D/g, ""); // allow digits only
        setBillingPhone(cleaned);
      }}
      placeholder="7xxxxxxxxx"
      className="w-full border border-gray-300 p-2 rounded-r focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
     
      maxLength={10} // UK number without +44 is 10 digits
    />
   
  </div>
   <ErrorText error={fieldErrors.billingPhone} />
</div>


{/* Company */}
<div className="flex flex-col space-y-1 col-span-2">

  <label className="text-sm font-medium text-gray-700">Company (optional)</label>
  <input
    value={billingCompany}
    onChange={(e) => setBillingCompany(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
            {/* Postcode autocomplete suggestions */}
           <div className="relative col-span-2">
              <input
  type="text"
  value={postcodeQuery}
  onChange={(e) => setPostcodeQuery(e.target.value)}
  placeholder="Type 4+ characters for postcode/city suggestions"
  className="w-full border p-2 rounded"
  />

              {showSuggestions && postcodeSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bg-white border mt-1 rounded max-h-48 overflow-auto z-40">
                  {postcodeSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      {s.displayText ?? `${s.postcode ?? ""} ${s.city ?? ""}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1 col-span-2">

  <label className="text-sm font-medium text-gray-700">Address line 1 *</label>
  <input
    value={billingAddress1}
    onChange={(e) => setBillingAddress1(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingAddress1} />
</div>


{/* Billing Address Line 2 */}
<div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">Address line 2 (optional)</label>
  <input
    value={billingAddress2}
    onChange={(e) => setBillingAddress2(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
         <div className="flex flex-col space-y-1 col-span-2">

  <label className="text-sm font-medium text-gray-700">Postcode *</label>
  <input
    value={billingPostalCode}
    onChange={(e) => setBillingPostalCode(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingPostalCode} />
</div>

        {/* City */}
<div className="flex flex-col space-y-1">

  <label className="text-sm font-medium text-gray-700">City</label>
  <input
    value={billingCity}
    onChange={(e) => setBillingCity(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>

{/* Country */}
<div className="flex flex-col space-y-1 col-span-2">
  <label className="text-sm font-medium text-gray-700">Country / State</label>
  <input
    value={billingState}
    onChange={(e) => setBillingState(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>     
          </div>
        </div>
          {/* DELIVERY METHOD SELECTOR */}
<div className="bg-white p-6 rounded shadow mb-6">
  <h2 className="text-lg font-semibold mb-3">Delivery method</h2>

  <div className="flex flex-col gap-2">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="deliveryMethod"
        checked={deliveryMethod === "HomeDelivery"}
        onChange={() => setDeliveryMethod("HomeDelivery")}
      />
      <span>Home Delivery</span>
    </label>

    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="deliveryMethod"
        checked={deliveryMethod === "ClickAndCollect"}
        onChange={() => setDeliveryMethod("ClickAndCollect")}
      />
      <span>Click & Collect (Collect from store)</span>
    </label>
  </div>
</div>
          {/* Shipping */}
<div className="bg-white p-6 rounded shadow">
  <h2 className="text-lg font-semibold mb-3">Shipping details</h2>

  {/* If Click & Collect → hide full shipping */}
  {deliveryMethod === "ClickAndCollect" ? (
    <div className="text-sm text-gray-600">
      Click & Collect selected — shipping information is not required.
    </div>
  ) : (
    <>
      <div className="flex items-center gap-3 mb-3">
        <input
          id="same"
          checked={shippingSameAsBilling}
          onChange={(e) => setShippingSameAsBilling(e.target.checked)}
          type="checkbox"
        />
        <label htmlFor="same">Shipping same as billing</label>
      </div>

      {!shippingSameAsBilling ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* First name */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">First name</label>
            <input
              value={shippingFirstName}
              onChange={(e) => setShippingFirstName(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Last name */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Last name</label>
            <input
              value={shippingLastName}
              onChange={(e) => setShippingLastName(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Company */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Company (optional)</label>
            <input
              value={shippingCompany}
              onChange={(e) => setShippingCompany(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Address 1 */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Address line 1 *</label>
            <input
              value={shippingAddress1}
              onChange={(e) => setShippingAddress1(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Address 2 */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Address line 2</label>
            <input
              value={shippingAddress2}
              onChange={(e) => setShippingAddress2(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Postcode */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Postcode</label>
            <input
              value={shippingPostalCode}
              onChange={(e) => setShippingPostalCode(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* City */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">City</label>
            <input
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>

          {/* Country / State */}
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-sm font-medium text-gray-700">Country / State</label>
            <input
              value={shippingState}
              onChange={(e) => setShippingState(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600">Shipping will use billing address.</div>
      )}
    </>
  )}
</div>

          {/* Order notes */}
          <div className="bg-white p-4 rounded shadow">
            <label className="block text-sm font-medium mb-1">Order notes (optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Order notes" className="w-full border p-2 rounded" />
          </div>
        </div>

        {/* RIGHT: Summary + coupon */}
       <aside className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="bg-white p-4 rounded shadow lg:sticky lg:top-6 lg:min-h-[600px] flex flex-col">
            <h3 className="text-lg font-semibold mb-3">Order summary ({cartCount} items)</h3>

            <div className="space-y-3 mb-4 overflow-visible">
              {cart.map((it) => (
                <div key={it.id + (it.variantId || "")} className="flex gap-[2.75rem] items-start">
                  <img src={it.image} alt={"Image not available"} className="w-14 h-14 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{it.name}</div>
                   {it.type === "subscription" && (
  <p className="text-xs font-semibold text-indigo-600 mt-1">
    Subscription • Every{" "}
    {it.frequency && !isNaN(Number(it.frequency))
      ? `${it.frequency} `
      : ""}
    {it.frequencyPeriod} • {it.subscriptionTotalCycles} cycles
  </p>
)}
                     <div className="text-xs text-gray-600">Qty: {it.quantity}</div>   {/* ← NEW */}
                   <div className="text-xs text-gray-500">
  {it.variantOptions?.option1 ?? ""}
  {it.variantOptions?.option2 ? ` • ${it.variantOptions.option2}` : ""}
  {it.variantOptions?.option3 ? ` • ${it.variantOptions.option3}` : ""}
</div>
                    <div className="text-sm font-semibold mt-1">{formatCurrency((it.finalPrice ?? it.price) * it.quantity)}</div>
                    {it.discountAmount ? <div className="text-xs text-green-600">Saved £{(it.discountAmount).toFixed(2)}</div> : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon box (prefilled if present) */}
            <div className="mb-3 border rounded p-3">
              {!appliedCoupon ? (
                <>
                  <label className="text-sm font-semibold mb-2 block">Apply coupon</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input value={couponInput} onChange={(e)=>setCouponInput(e.target.value)} placeholder="Coupon code" className="flex-1 border p-2 rounded" />
                    <button onClick={applyCoupon} className="bg-[#445D41] text-white px-3 py-2 rounded w-full sm:w-auto">Apply</button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-sm text-green-700">
                  <div>Coupon <strong>{appliedCoupon}</strong> applied</div>
                  <button onClick={removeCoupon} className="text-red-600 underline text-xs">Remove</button>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong>{formatCurrency(cartTotal)}</strong>
              </div>

              {appliedCoupon && (
                <div className="mt-2 text-sm text-green-700">
                  Coupon: <strong>{appliedCoupon}</strong>
                </div>
              )}

              <div className="mt-4">
                {!showPayment ? (
                  <>
                    {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                    <button onClick={handleProceedToPayment} className="w-full bg-[#445D41] text-white py-3 rounded">Proceed to payment</button>
                  </>
                ) : (
                  <>
                    {/* Payment method selector */}
                    <div className="mb-3">
                      <label className="text-sm font-semibold block mb-2">Payment method</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                          <span>Credit / Debit Card</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                          <span>Cash on Delivery (COD)</span>
                        </label>
                      </div>
                    </div>

                    {/* Card flow */}
                    {paymentMethod === "card" ? (
                      <StripeWrapper>
                        <div className="space-y-3">
                          <div className="text-sm mb-1">Pay with card</div>
                         <CheckoutPayment
  orderPayload={{
    ...orderPayload,
    orderTotal: cartTotal,
    customerEmail: billingEmail,
    customerPhone: `+44${billingPhone}`,
    billingFirstName,
    billingLastName,
    billingCompany,
    billingAddressLine1: billingAddress1,
    billingAddressLine2: billingAddress2,
    billingCity,
    billingPostalCode,
    billingCountry,
  
  }}
  onPaymentSuccess={onPaymentSuccess}
  onError={onPaymentError}
/>

                          <div className="text-xs text-gray-500">You will be charged securely via Stripe.</div>
                        </div>
                      </StripeWrapper>
                    ) : (
                      // COD flow
                      <div className="space-y-3">
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <div className="text-sm">You chose Cash on Delivery. Click below to place your order — you'll pay the delivery person when the order arrives.</div>
                        <button onClick={handlePlaceOrderCOD} className="w-full bg-[#445D41] text-white py-3 rounded">Place order (COD) - {formatCurrency(cartTotal)}</button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                By placing the order you agree to our <Link href="/terms" className="text-blue-600">Terms</Link>.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
