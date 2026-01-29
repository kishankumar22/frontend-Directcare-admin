// app/checkout/page.tsx ka working code hai
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
import { ShoppingBag } from "lucide-react";

// ---------- Types ----------
type AddressSuggestion = {
  id: string;
  type: string;
  text: string;
};


function formatCurrency(n = 0) {
  return `£${n.toFixed(2)}`;
}
function isBundleComplete(cartItems: any[], mainProductId: string) {
  const mainItem = cartItems.find(
    i => i.productId === mainProductId && !i.parentProductId
  );

  if (!mainItem) return false;

  const groupedItems = cartItems.filter(
    i => i.parentProductId === mainProductId
  );

  // ❌ koi grouped item hi nahi
  if (groupedItems.length === 0) return false;

  // optional: quantity validation
  return groupedItems.every(
    gi => gi.quantity >= mainItem.quantity
  );
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
  payAmount,
  onPaymentSuccess,
  onError,
}: {
  orderPayload: any;
   payAmount: number;                 // ⭐⭐⭐ ADD
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

  // alert("ORDER RAW RESPONSE:\nSTATUS: " + status + "\nBODY:\n" + raw);

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
  customerEmail: json.data.customerEmail,

  subtotalAmount: json.data.subtotalAmount,
  shippingAmount: json.data.shippingAmount,
  discountAmount: json.data.discountAmount,
  bundleDiscountAmount: json.data.bundleDiscountAmount,
  taxAmount: json.data.taxAmount,
  totalAmount: json.data.totalAmount,
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
    // console.log("INTENT RESPONSE:", json);
    //  alert("INTENT RESPONSE (parsed):\n" + JSON.stringify(json, null, 2));
    // // quick field check
    // alert(
    //   "clientSecret: " + (json?.data?.clientSecret ?? "MISSING") + "\n" +
    //   "paymentIntentId: " + (json?.data?.paymentIntentId ?? "MISSING")
    // );

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
    const {
  orderId,
  customerEmail,
  subtotalAmount,
  shippingAmount,
  discountAmount,
  bundleDiscountAmount,
  taxAmount,
  totalAmount,
} = await createOrder();


    // 2️⃣ Create Payment Intent
    const { clientSecret } = await createPaymentIntent(
      orderId,
      totalAmount,
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

    // alert("FINAL PAYMENT INTENT ID: " + finalPaymentIntentId);
    
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
// alert("CONFIRM RAW RESPONSE: " + rawConfirm)

    // Go to success page
  onPaymentSuccess({
  data: {
    id: orderId,
    subtotalAmount,
    shippingAmount,
    discountAmount,
    bundleDiscountAmount,
    taxAmount,
    totalAmount,
  },
});


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
       {processing ? "Processing…" : `Pay ${formatCurrency(payAmount)}`}


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
 const { cart, updateCart, updateQuantity,clearCart } = useCart();
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
 const [addressQuery, setAddressQuery] = useState("");
const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});


  // const [showPayment, setShowPayment] = useState(false);
  const [orderPayload, setOrderPayload] = useState<any>(null);
const [orderSummary, setOrderSummary] = useState<{
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  bundleDiscountAmount: number;
  taxAmount: number;
  totalAmount: number;
} | null>(null);

  // Payment method state: 'card' or 'cod'
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("card");
// ✅ Terms & Newsletter states
const [acceptTerms, setAcceptTerms] = useState(true);
const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);

  // 🔹 BUY NOW ITEM (frontend-only)
const buyNowItem =
  typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("buyNowItem") || "null")
    : null;

const isBuyNowFlow = Boolean(buyNowItem);

const checkoutItems = isBuyNowFlow
  ? [buyNowItem]
  : cart;



const effectiveCartCount = checkoutItems.reduce(
  (sum, i) => sum + i.quantity,
  0
);
// ✅ PRICE CALCULATIONS FROM CART (FOR UI)
const cartSubtotal = useMemo(() => {
  return checkoutItems.reduce((sum, item) => {
    const base = item.priceBeforeDiscount ?? item.price;
    return sum + base * item.quantity;
  }, 0);
}, [checkoutItems]);

const cartBundleDiscount = useMemo(() => {
  return checkoutItems.reduce((sum, item) => {
    // only main product can trigger bundle
    if (
      item.productData?.requireOtherProducts === true &&
      typeof item.productData?.totalSavings === "number"
    ) {
      const valid = isBundleComplete(checkoutItems, item.productId);

      if (!valid) return sum;

      // 🔥 MULTIPLY BY MAIN PRODUCT QUANTITY
      return sum + item.productData.totalSavings * item.quantity;
    }
    return sum;
  }, 0);
}, [checkoutItems]);




const cartDiscount = useMemo(() => {
  return checkoutItems.reduce((sum, item) => {
    return sum + (item.discountAmount ?? 0) * item.quantity;
  }, 0);
}, [checkoutItems]);
// ✅ NEXT DAY DELIVERY CHECK
const hasNextDayDelivery = useMemo(() => {
  return checkoutItems.some(
    (item) => item.nextDayDeliveryEnabled === true
  );
}, [checkoutItems]);

const nextDayDeliveryCharge = useMemo(() => {
  if (!hasNextDayDelivery) return 0;

  // single charge logic (safe)
  const item = checkoutItems.find(
    (i) => i.nextDayDeliveryEnabled && typeof i.nextDayDeliveryCharge === "number"
  );

  return item?.nextDayDeliveryCharge ?? 0;
}, [checkoutItems, hasNextDayDelivery]);

const cartTotalAmount = useMemo(() => {
  return (
    cartSubtotal -
    cartBundleDiscount -
    cartDiscount +
    nextDayDeliveryCharge
  );
}, [
  cartSubtotal,
  cartBundleDiscount,
  cartDiscount,
  nextDayDeliveryCharge,
]);

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
  if (!q || q.trim().length < 3) {
    setAddressSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/address-lookup/search?query=${encodeURIComponent(
        q.trim()
      )}&country=GB`
    );

    const json = await res.json();

    if (!json?.success || !Array.isArray(json.data)) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setAddressSuggestions(json.data);
    setShowSuggestions(json.data.length > 0);
  } catch (err) {
    console.error("Address lookup failed", err);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  }
}, []);
const fetchAddressDetails = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/address-lookup/details/${encodeURIComponent(
      id
    )}`
  );

  const json = await res.json();

  if (!json?.success || !json?.data) {
    throw new Error("Failed to fetch address details");
  }

  return json.data;
};


 const debouncedAutocomplete = useDebouncedCallback(doAutocomplete, 350);
useEffect(() => {
  debouncedAutocomplete(addressQuery);
}, [addressQuery, debouncedAutocomplete]);



  // When user selects suggestion -> autofill fields
const handleSelectSuggestion = async (s: AddressSuggestion) => {
  try {
   setShowSuggestions(false);
setAddressSuggestions([]); // ⭐ ADD THIS
setAddressQuery(""); // 🔥 clear search input after select

    const details = await fetchAddressDetails(s.id);

    const line1 =
      details.line1 ||
      details.line2 ||
      details.line3 ||
     s.text || "";

    const city =
  details.city ||
  details.town ||
  details.locality ||
  details.administrativeArea ||
  "";

    const state = details.province || "";
    const postcode = details.postalCode || "";
    const country = details.country || "United Kingdom";

    // 🔹 Billing
    setBillingAddress1(line1);
    setBillingCity(city);
    setBillingState(state);
    setBillingPostalCode(postcode);
    setBillingCountry(country);

    // 🔹 Shipping (respect checkbox)
    if (shippingSameAsBilling) {
      setShippingAddress1(line1);
      setShippingCity(city);
      setShippingState(state);
      setShippingPostalCode(postcode);
      setShippingCountry(country);
    }
  } catch (err) {
    console.error("Address details error", err);
  }
};


 async function subscribeNewsletterAfterOrder(email: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Newsletter/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "Checkout",
          ipAddress: "0.0.0.0",
        }),
      }
    );

    const data = await res.json();

    if (data?.success) {
      localStorage.setItem("newsletterEmail", email);
    }
  } catch (err) {
    console.error("Newsletter subscribe failed", err);
  }
}


  // Build order payload matching your sample
  const buildOrderPayload = () => {
   const items = checkoutItems.map((c) => ({
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
      
      notes,
     

    };
  };


const validateAndBuildPayload = async (): Promise<any | null> => {

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

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return null;
  }

  // 🔁 subscription logic (AS IS – unchanged)
  const subscriptionMap: Record<string, string> = {};

  for (const item of checkoutItems) {
    if (item.type === "subscription") {
      try {
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
            frequency: item.frequencyPeriod,
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

        if (resp.ok) {
          const json = await resp.json();
          if (json?.data?.id) subscriptionMap[item.id] = json.data.id;
        }
      } catch {
        setError("Subscription setup failed. Try again.");
        return false;
      }
    }
  }

  const payload = {
    ...buildOrderPayload(),
    orderItems: checkoutItems.map((c) => ({
      productId: c.productId ?? c.id,
      productVariantId: c.variantId ?? null,
      quantity: c.quantity,
      unitPrice: c.finalPrice ?? c.price,
      subscriptionId: subscriptionMap[c.id] ?? null,
      frequency: c.frequency,
    })),
  };

 setOrderPayload(payload); // card flow ke liye
return payload;           // COD flow ke liye

};


  // NEW: place COD order directly (no stripe)
  const handlePlaceOrderCOD = async (payload: any) => {
  setError(null);


    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Orders`, {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  ...(isAuthenticated && { Authorization: `Bearer ${accessToken}` })
},

        body: JSON.stringify({
          ...payload,
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
 


// alert("COD ORDER FULL: " + JSON.stringify(createdOrder));
// alert("COD ORDER ID: " + createdOrder?.data?.id);

 const isBuyNowFlow = !!sessionStorage.getItem("buyNowItem");

// 🔥 DO NOT touch buyNowItem here
if (!isBuyNowFlow) {
  clearCart();
}

if (subscribeNewsletter && billingEmail) {
  subscribeNewsletterAfterOrder(billingEmail);
}


router.push(`/order/success?orderId=${createdOrder.data.id}`);
if (isBuyNowFlow) {
  sessionStorage.removeItem("buyNowItem");
  sessionStorage.setItem("preserveCart", "1");
}

    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to place order");
    }
  };

const onPaymentSuccess = (createdOrder: any) => {
  if (createdOrder?.data) {
    setOrderSummary({
      subtotalAmount: createdOrder.data.subtotalAmount,
      shippingAmount: createdOrder.data.shippingAmount,
      discountAmount: createdOrder.data.discountAmount,
      bundleDiscountAmount: createdOrder.data.bundleDiscountAmount,
      taxAmount: createdOrder.data.taxAmount,
      totalAmount: createdOrder.data.totalAmount,
    });
  }

  const buyNowItem = sessionStorage.getItem("buyNowItem");

  if (buyNowItem) {
    sessionStorage.removeItem("buyNowItem");
    sessionStorage.setItem("preserveCart", "1");
  } else {
    clearCart();
  }
 if (subscribeNewsletter && billingEmail) {
    subscribeNewsletterAfterOrder(billingEmail);
  }
  router.push(`/order/success?orderId=${createdOrder.data.id}`);
};

  const onPaymentError = (err: any) => {
    setError(err?.message ?? "Payment failed");
  };

if (!checkoutItems || checkoutItems.length === 0) {
  return <EmptyCart />;
}
  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
     <h1 className="flex items-center gap-2 text-2xl font-semibold mb-3">
  <ShoppingBag className="h-6 w-6 text-[#445D41]" />
  Checkout
</h1>


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
         <div className="flex flex-col space-y-1 col-span-2 relative">
  <label className="text-sm font-medium text-gray-700">
    Search address or postcode
  </label>
      <input
  type="text"
  value={addressQuery}
  onChange={(e) => setAddressQuery(e.target.value)}
  placeholder="Start typing city, postcode or address"
  className="w-full border p-2 rounded"
/>


              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bg-white border mt-1 rounded max-h-48 overflow-auto z-40">
                {addressSuggestions.map((s) => (
  <button
    key={s.id}
    onClick={() => handleSelectSuggestion(s)}
    className="w-full text-left px-3 py-2 hover:bg-gray-100"
  >
    {s.text}
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
  <label className="text-sm font-medium text-gray-700">County / State</label>
  <input
    value={billingState}
    onChange={(e) => setBillingState(e.target.value)}
    className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>     
          </div>
        </div>
   {/* Shipping */}
{deliveryMethod === "HomeDelivery" && (
  <div className="bg-white p-6 rounded shadow">
    <h2 className="text-lg font-semibold mb-3">Shipping details</h2>

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
          <label className="text-sm font-medium text-gray-700">County / State</label>
          <input
            value={shippingState}
            onChange={(e) => setShippingState(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
          />
        </div>
      </div>
    ) : (
      <div className="text-sm text-gray-600">
        Shipping will use billing address.
      </div>
    )}
  </div>
)}

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
   

          {/* Order notes */}
          <div className="bg-white p-4 rounded shadow">
            <label className="block text-sm font-medium mb-1">Order notes (optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Order notes" className="w-full border p-2 rounded" />
          </div>
        </div>

        {/* RIGHT: Summary + coupon */}
       <aside className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="bg-white p-4 rounded shadow lg:sticky lg:top-6 lg:min-h-[600px] flex flex-col">
            <h3 className="text-lg font-semibold mb-3">Order summary ({effectiveCartCount} items)</h3>

            <div className="space-y-3 mb-4 overflow-visible">
              {checkoutItems.map((it) => (
                <div key={it.id + (it.variantId || "")} className="flex gap-[2.75rem] items-start">
                  <img src={it.image} alt={"no img"} className="w-14 h-14 object-cover rounded" />
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
                    <div className="text-xs text-gray-600 flex items-center gap-2">
  <span>Qty: {it.quantity}</span>
  <span className="text-gray-400">•</span>
  <span className="font-medium text-gray-800">
    {formatCurrency((it.finalPrice ?? it.price) * it.quantity)}
  </span>
</div>

                    {/* {it.discountAmount ? <div className="text-xs text-green-600">Saved £{(it.discountAmount).toFixed(2)}</div> : null} */}
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon box (prefilled if present) */}
            <div className="border-t pt-3">
              {/* ===== PRICE SUMMARY ===== */}
<div className="mt-4 rounded-lg border bg-gray-50 p-4 space-y-3 text-sm">

  {/* Subtotal */}
  <div className="flex items-center justify-between">
    <span className="text-gray-600">Subtotal</span>
    <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
  </div>

  {/* Bundle Discount */}
  {cartBundleDiscount > 0 && (
    <div className="flex items-center justify-between text-green-700">
      <span>Bundle discount</span>
      <span className="font-medium">
        − {formatCurrency(cartBundleDiscount)}
      </span>
    </div>
  )}

  {/* Coupon / Normal Discount */}
  {cartDiscount > 0 && (
    <div className="flex items-center justify-between text-green-700">
      <span>Discount</span>
      <span className="font-medium">
        − {formatCurrency(cartDiscount)}
      </span>
    </div>
  )}
{/* Next-Day Delivery */}
{hasNextDayDelivery && (
  <div className="flex items-center justify-between text-sm text-emerald-700">
    <span className="font-medium">Next-Day Delivery</span>
    <span className="font-semibold">
      + {formatCurrency(nextDayDeliveryCharge)}
    </span>
  </div>
)}

  {/* Divider + Total */}
  <div className="border-t pt-3 mt-2 flex items-center justify-between">
    <span className="text-base font-semibold text-gray-900">Total</span>
    <span className="text-lg font-bold text-gray-900">
      {formatCurrency(cartTotalAmount)}
    </span>
  </div>

</div>


              <div className="mt-4">
               
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

      {/* STEP 1: Validation trigger */}
      {!orderPayload && (
        <button
        disabled={!acceptTerms}
          onClick={async () => {
            const ok = await validateAndBuildPayload();
            if (!ok) return;
          }}
          className="w-full bg-[#445D41] text-white py-3 rounded"
        >
          Continue to card payment
        </button>
      )}

      {/* STEP 2: Stripe only after validation */}
      {orderPayload && (
        <>
          <div className="text-sm mb-1">Pay with card</div>

          <CheckoutPayment
            orderPayload={{
              ...orderPayload, // 👈 backend ko final payload yahin jayega
              customerEmail: billingEmail,
              customerPhone: `+44${billingPhone}`,
              billingFirstName,
              billingLastName,
              billingCompany,
              billingAddressLine1: billingAddress1,
              billingAddressLine2: billingAddress2,
              billingCity: billingCity,
              billingPostalCode: billingPostalCode,
              billingCountry: billingCountry,
            }}
            payAmount={cartTotalAmount}
            onPaymentSuccess={onPaymentSuccess}
            onError={onPaymentError}
          />

          <div className="text-xs text-gray-500">
            You will be charged securely via Stripe.
          </div>
        </>
      )}
    </div>
  </StripeWrapper>
) : (

                      // COD flow
          // COD flow
<div className="space-y-3">
  {error && <div className="text-red-600 text-sm">{error}</div>}

  <div className="text-sm">
    You chose Cash on Delivery. Click below to place your order — you'll pay the delivery person when the order arrives.
  </div>

  <button
   disabled={!acceptTerms}
   onClick={async () => {
  const payload = await validateAndBuildPayload();
  if (!payload) return;

  await handlePlaceOrderCOD(payload);
}}

    className="w-full bg-[#445D41] text-white py-3 rounded"
  >
    Place order (COD)
  </button>
</div>

                    )}
                  </>
           
              </div>

             {/* Terms & Newsletter */}
<div className="mt-4 space-y-3">

  {/* Terms */}
  <label className="flex items-start gap-2 text-sm text-gray-700">
    <input
      type="checkbox"
      checked={acceptTerms}
      onChange={(e) => setAcceptTerms(e.target.checked)}
      className="mt-1"
    />
    <span>
      I agree to the{" "}
      <Link href="/terms" className="text-blue-600 underline">
        Terms & Conditions
      </Link>
    </span>
  </label>

  {/* Newsletter */}
  <label className="flex items-start gap-2 text-sm text-gray-700">
    <input
      type="checkbox"
      checked={subscribeNewsletter}
      onChange={(e) => setSubscribeNewsletter(e.target.checked)}
      className="mt-1"
    />
    <span>Subscribe to our newsletter for offers & updates</span>
  </label>

</div>

            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
