// app/checkout/page.tsx ka working code hai
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements, } from "@stripe/react-stripe-js";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import EmptyCart from "@/components/cart/EmptyCart";
import { ShoppingBag } from "lucide-react";
import SavedAddressesSection from "@/components/checkout/SavedAddressesSection";
import { getPharmaSessionId } from "@/app/lib/pharmaSession";
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
        className="w-full bg-[#445D41] text-white py-3 rounded disabled:opacity-50" >
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
  // Shipping quote options
const [shippingOptions, setShippingOptions] = useState<any[]>([]);
const [selectedShippingOption, setSelectedShippingOption] = useState<any | null>(null);
const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
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
const clearFieldError = (key: string) => {
  setFieldErrors(prev => {
    if (!prev[key]) return prev;
    const { [key]: _, ...rest } = prev;
    return rest;
  });
};
const handleAddressSelect = (addr: any | null) => {
  if (!addr) {
    // Clear form for new address
    setBillingFirstName("");
    setBillingLastName("");
    setBillingPhone("");
    setBillingCompany("");
    setBillingAddress1("");
    setBillingAddress2("");
    setBillingCity("");
    setBillingState("");
    setBillingPostalCode("");
    setBillingCountry("United Kingdom");
    return;
  }

  setBillingFirstName(addr.firstName);
  setBillingLastName(addr.lastName);
  
  setBillingCompany(addr.company || "");
  setBillingAddress1(addr.addressLine1);
  setBillingAddress2(addr.addressLine2 || "");
  setBillingCity(addr.city);
  setBillingState(addr.state);
  setBillingPostalCode(addr.postalCode);
  setBillingCountry(addr.country || "United Kingdom");
 // 🔥 FIXED PHONE LOGIC (UK Safe)
    // 🔥 SAFE PHONE
  const phoneRaw = addr.phoneNumber ?? "";

  const cleaned = phoneRaw
    .replace("+44", "")
    .replace(/^0/, "")
    .replace(/\D/g, "");

  setBillingPhone(cleaned);
  if (shippingSameAsBilling) {
    setShippingFirstName(addr.firstName);
    setShippingLastName(addr.lastName);
    setShippingCompany(addr.company || "");
    setShippingAddress1(addr.addressLine1);
    setShippingAddress2(addr.addressLine2 || "");
    setShippingCity(addr.city);
    setShippingState(addr.state);
    setShippingPostalCode(addr.postalCode);
    setShippingCountry(addr.country || "United Kingdom");
  }
};

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
  const [isPlacing, setIsPlacing] = useState(false);
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
// 🔥 PHARMA CHECK
const hasPharmaProduct = useMemo(() => {
  return checkoutItems.some(
    (item) => item.productData?.isPharmaProduct === true
  );
}, [checkoutItems]);
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
const clickAndCollectFee = useMemo(() => {
  if (deliveryMethod !== "ClickAndCollect") return 0;
  return cartSubtotal >= 30 ? 0 : 1;
}, [deliveryMethod, cartSubtotal]);

// 🎁 Loyalty points helpers (CHECKOUT)
const isLoyaltyEligible = (item: any) => {
  if (!item?.productData) return false;
  if (item.productData.excludeFromLoyaltyPoints === true) return false;
  return true;
};
const getItemLoyaltyPoints = (item: any) => {
  if (!isLoyaltyEligible(item)) return 0;
  // Variant priority
  if (item.variantId && Array.isArray(item.productData?.variants)) {
    const v = item.productData.variants.find(
      (x: any) => x.id === item.variantId
    );
    return v?.loyaltyPointsEarnable ?? 0;
  }

  // Product level fallback
  return item.productData?.loyaltyPointsEarnable ?? 0;
};
// 🎁 TOTAL LOYALTY POINTS (PER PRODUCT, NOT PER QTY)
const totalLoyaltyPoints = useMemo(() => {
  return checkoutItems.reduce((sum, item) => {
    const pts = getItemLoyaltyPoints(item);
    if (!pts) return sum;
    return sum + pts; // ❌ no quantity multiplication
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
// Delivery type availability — ALL cart items must support the type
const allSupportNextDay = useMemo(() =>
  checkoutItems.length > 0 && checkoutItems.every(i => i.nextDayDeliveryEnabled === true),
  [checkoutItems]);
const allSupportSameDay = useMemo(() =>
  checkoutItems.length > 0 && checkoutItems.every(i => i.sameDayDeliveryEnabled === true),
  [checkoutItems]);

const shippingCost = deliveryMethod === "ClickAndCollect" ? 0 : (selectedShippingOption?.price ?? 0);

const cartTotalAmount = useMemo(() => {
  return (
    cartSubtotal -
    cartBundleDiscount -
    cartDiscount +
    shippingCost +
    clickAndCollectFee
  );
}, [
  cartSubtotal,
  cartBundleDiscount,
  cartDiscount,
  shippingCost,
  clickAndCollectFee
]);
const checkoutVatAmount = useMemo(() => {
  return checkoutItems.reduce((sum, item) => {
    const rate =
      typeof item.vatRate === "number" ? item.vatRate : 0;
    // line total is VAT-inclusive
    const lineTotal =
      (item.finalPrice ?? item.price) * item.quantity;

    if (rate <= 0) return sum;
    // VAT-inclusive formula
    const vat = (lineTotal * rate) / (100 + rate);
    return sum + vat;
  }, 0);
}, [checkoutItems]);
  // Fetch shipping quote when postcode is available
useEffect(() => {
  const postcode = (shippingSameAsBilling ? billingPostalCode : shippingPostalCode).trim();
  if (!postcode || deliveryMethod !== "HomeDelivery") {
    setShippingOptions([]);
    setSelectedShippingOption(null);
    return;
  }
  const cartValue = checkoutItems.reduce((s, i) => s + (i.finalPrice ?? i.price) * i.quantity, 0);
  const itemCount = checkoutItems.reduce((s, i) => s + i.quantity, 0);

  const timer = setTimeout(async () => {
    try {
      setShippingQuoteLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipping/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode, totalWeight: 0.5, cartValue, itemCount }),
      });
      const json = await res.json();
      if (json?.data?.availableOptions) {
        // Filter options based on cart items' delivery flags
        const filtered = (json.data.availableOptions as any[]).filter(opt => {
          const sc = (opt.serviceCode ?? "").toLowerCase();
          if (sc.includes("nextday") || sc.includes("next_day") || sc.includes("next-day")) {
            return allSupportNextDay;
          }
          if (sc.includes("sameday") || sc.includes("same_day") || sc.includes("same-day")) {
            return allSupportSameDay;
          }
          return true; // standard always shown
        });
        setShippingOptions(filtered);
        // Auto-select cheapest
        if (filtered.length > 0) setSelectedShippingOption(filtered[0]);
      }
    } catch { /* silent */ } finally {
      setShippingQuoteLoading(false);
    }
  }, 600);
  return () => clearTimeout(timer);
}, [billingPostalCode, shippingPostalCode, shippingSameAsBilling, deliveryMethod, allSupportNextDay, allSupportSameDay]);

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

useEffect(() => {
  if (!shippingSameAsBilling) return;
  setShippingFirstName(billingFirstName);
  setShippingLastName(billingLastName);
  setShippingCompany(billingCompany);
  setShippingAddress1(billingAddress1);
  setShippingAddress2(billingAddress2);
  setShippingCity(billingCity);
  setShippingState(billingState);
  setShippingPostalCode(billingPostalCode);
  setShippingCountry(billingCountry);
}, [
  shippingSameAsBilling,
  billingFirstName,
  billingLastName,
  billingCompany,
  billingAddress1,
  billingAddress2,
  billingCity,
  billingState,
  billingPostalCode,
  billingCountry,
]);
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
    // 🔥 pharmacySessionId logic
let pharmacySessionId: string | null = null;

if (!isAuthenticated && hasPharmaProduct) {
  pharmacySessionId = getPharmaSessionId();
}
   const items = checkoutItems.map((c) => ({
      productId: c.productId ?? c.id,
      productVariantId: c.variantId ?? null,
      quantity: c.quantity,
   unitPrice: c.priceBeforeDiscount ?? c.price ?? c.finalPrice,
    }));
    return {
      deliveryMethod,  // ADD THIS LINE    
      paymentMethod: paymentMethod === "card" ? "Card" : "CashOnDelivery", // 🔥 ADD THIS
      customerEmail: billingEmail,
      customerPhone: `+44${billingPhone}`,
      isGuestOrder: !isAuthenticated,
      userId: isAuthenticated ? user?.id : null,
       pharmacySessionId,
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
      selectedShippingMethodId: selectedShippingOption?.shippingMethodId ?? null,
      selectedShippingMethodName: selectedShippingOption?.displayName ?? null,
      shippingCost: shippingCost > 0 ? shippingCost : null,
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
  if (!billingPhone.trim()) errors.billingPhone = "Phone number is required";
  if (deliveryMethod === "HomeDelivery") {
    if (!billingAddress1.trim()) errors.billingAddress1 = "Address line 1 is required";
    if (!billingPostalCode.trim()) errors.billingPostalCode = "Postcode is required";
     // ✅ ADD THESE TWO LINES
  if (!billingCity.trim())
    errors.billingCity = "City is required";

  if (!billingState.trim())
    errors.billingState = "County / State is required";
  // ✅ SHIPPING VALIDATION (same as billing)
if (deliveryMethod === "HomeDelivery" && !shippingSameAsBilling) {
 // ✅ ADD THIS
  if (!shippingFirstName.trim())
    errors.shippingFirstName = "Shipping first name is required";
  if (!shippingAddress1.trim())
    errors.shippingAddress1 = "Shipping address line 1 is required";

  if (!shippingPostalCode.trim())
    errors.shippingPostalCode = "Shipping postcode is required";

  if (!shippingCity.trim())
    errors.shippingCity = "Shipping city is required";

  if (!shippingState.trim())
    errors.shippingState = "Shipping county / state is required";
}

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
     unitPrice: c.priceBeforeDiscount ?? c.price ?? c.finalPrice,
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
// 🔥 CLEAR PHARMA SESSION AFTER SUCCESS (GUEST ONLY)
if (!isAuthenticated) {
  localStorage.removeItem("pharmacy_session_id");
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
  // 🔥 CLEAR PHARMA SESSION AFTER SUCCESS (GUEST ONLY)
if (!isAuthenticated) {
  localStorage.removeItem("pharmacy_session_id");
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
    <div className="max-w-7xl mx-auto px-3 py-3">
     <h1 className="flex items-center gap-1.5 text-base font-bold mb-2">
  <ShoppingBag className="h-4 w-4 text-[#445D41]" />
  Checkout
</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6">
        {/* LEFT: Billing + Shipping */}
        <div className="lg:col-span-2 space-y-2">
          {isAuthenticated && (
  <SavedAddressesSection onSelect={handleAddressSelect} />
)}

          <div className="bg-white p-3 lg:p-6 rounded shadow">
            <h2 className="text-sm font-semibold mb-2 lg:text-lg lg:mb-3">Billing details</h2>
           <div className="grid grid-cols-2 gap-2">
   <div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Email *</label>
  <input
  value={billingEmail}
  onChange={(e) => { setBillingEmail(e.target.value); clearFieldError("billingEmail"); }}
  className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
/>
<ErrorText error={fieldErrors.billingEmail} />
</div>
<div className="flex flex-col space-y-0.5">
  <label className="text-xs font-medium text-gray-700">First name *</label>
  <input
  value={billingFirstName}
  onChange={(e) => { setBillingFirstName(e.target.value); clearFieldError("billingFirstName"); }}
  className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
/>
<ErrorText error={fieldErrors.billingFirstName} />
</div>
<div className="flex flex-col space-y-0.5">
  <label className="text-xs font-medium text-gray-700">Last name</label>
  <input
    value={billingLastName}
    onChange={(e) => setBillingLastName(e.target.value)}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Phone (UK) *</label>
  <div className="flex">
    <span className="flex items-center bg-gray-100 border border-r-0 border-gray-300 px-2 rounded-l text-xs text-gray-700">+44</span>
    <input
      type="tel"
      value={billingPhone}
      onChange={(e) => { const cleaned = e.target.value.replace(/\D/g, ""); setBillingPhone(cleaned); clearFieldError("billingPhone"); }}
      placeholder="7xxxxxxxxx"
      className="w-full border border-gray-300 p-1.5 text-sm rounded-r focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
      maxLength={10}
    />
  </div>
  <ErrorText error={fieldErrors.billingPhone} />
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Company Name</label>
  <input
    value={billingCompany}
    onChange={(e) => setBillingCompany(e.target.value)}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
<div className="flex flex-col space-y-0.5 col-span-2 relative z-[40]">
  <label className="text-xs font-medium text-gray-700">Search address or postcode</label>
  <input
    type="text"
    value={addressQuery}
    onChange={(e) => setAddressQuery(e.target.value)}
    placeholder="Start typing city, postcode or address..."
    className="w-full border p-1.5 text-sm rounded"
  />
  {showSuggestions && addressSuggestions.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded max-h-48 overflow-auto shadow-lg z-[40]">
      {addressSuggestions.map((s) => (
        <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100">{s.text}</button>
      ))}
    </div>
  )}
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Address line 1 *</label>
  <input
  value={billingAddress1}
  onChange={(e) => { setBillingAddress1(e.target.value); clearFieldError("billingAddress1"); }}
  className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
/>
<ErrorText error={fieldErrors.billingAddress1} />
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Address line 2 (optional)</label>
  <input
    value={billingAddress2}
    onChange={(e) => setBillingAddress2(e.target.value)}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
<div className="flex flex-col space-y-0.5">
  <label className="text-xs font-medium text-gray-700">Postcode *</label>
  <input
    value={billingPostalCode}
    onChange={(e) => { setBillingPostalCode(e.target.value); clearFieldError("billingPostalCode"); }}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingPostalCode} />
</div>
<div className="flex flex-col space-y-0.5">
  <label className="text-xs font-medium text-gray-700">City *</label>
  <input
    value={billingCity}
    onChange={(e) => { setBillingCity(e.target.value); clearFieldError("billingCity"); }}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingCity} />
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">County / State *</label>
  <input
    value={billingState}
    onChange={(e) => { setBillingState(e.target.value); clearFieldError("billingState"); }}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
  <ErrorText error={fieldErrors.billingState} />
</div>
          </div>
        </div>
   {/* Shipping */}
{deliveryMethod === "HomeDelivery" && (
  <div className="bg-white p-3 lg:p-6 rounded shadow">
    <h2 className="text-sm font-semibold mb-2 lg:text-lg lg:mb-3">Shipping details</h2>
    <div className="flex items-center gap-2 mb-2">
     <input
  id="same"
  checked={shippingSameAsBilling}
  onChange={(e) => {
    const checked = e.target.checked;
    setShippingSameAsBilling(checked);
    if (checked) {
      setShippingFirstName(billingFirstName);
      setShippingLastName(billingLastName);
      setShippingCompany(billingCompany);
      setShippingAddress1(billingAddress1);
      setShippingAddress2(billingAddress2);
      setShippingCity(billingCity);
      setShippingState(billingState);
      setShippingPostalCode(billingPostalCode);
      setShippingCountry(billingCountry);
    }
  }}
  type="checkbox"
/>
      <label htmlFor="same" className="text-xs">Shipping same as billing</label>
    </div>
    {!shippingSameAsBilling ? (
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col space-y-0.5">
          <label className="text-xs font-medium text-gray-700">First name *</label>
          <input value={shippingFirstName} onChange={(e) => { setShippingFirstName(e.target.value); clearFieldError("shippingFirstName"); }} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
          <ErrorText error={fieldErrors.shippingFirstName} />
        </div>
        <div className="flex flex-col space-y-0.5">
          <label className="text-xs font-medium text-gray-700">Last name</label>
          <input value={shippingLastName} onChange={(e) => setShippingLastName(e.target.value)} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
        </div>
        <div className="flex flex-col space-y-0.5 col-span-2">
          <label className="text-xs font-medium text-gray-700">Company (optional)</label>
          <input value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
        </div>
        <div className="flex flex-col space-y-0.5 col-span-2">
          <label className="text-xs font-medium text-gray-700">Address line 1 *</label>
          <input value={shippingAddress1} onChange={(e) => { setShippingAddress1(e.target.value); clearFieldError("shippingAddress1"); }} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
          <ErrorText error={fieldErrors.shippingAddress1} />
        </div>
        <div className="flex flex-col space-y-0.5 col-span-2">
          <label className="text-xs font-medium text-gray-700">Address line 2</label>
          <input value={shippingAddress2} onChange={(e) => setShippingAddress2(e.target.value)} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
        </div>
        <div className="flex flex-col space-y-0.5">
          <label className="text-xs font-medium text-gray-700">Postcode *</label>
          <input value={shippingPostalCode} onChange={(e) => { setShippingPostalCode(e.target.value); clearFieldError("shippingPostalCode"); }} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
          <ErrorText error={fieldErrors.shippingPostalCode} />
        </div>
        <div className="flex flex-col space-y-0.5">
          <label className="text-xs font-medium text-gray-700">City *</label>
          <input value={shippingCity} onChange={(e) => { setShippingCity(e.target.value); clearFieldError("shippingCity"); }} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
          <ErrorText error={fieldErrors.shippingCity} />
        </div>
        <div className="flex flex-col space-y-0.5 col-span-2">
          <label className="text-xs font-medium text-gray-700">County / State *</label>
          <input value={shippingState} onChange={(e) => { setShippingState(e.target.value); clearFieldError("shippingState"); }} className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all" />
          <ErrorText error={fieldErrors.shippingState} />
        </div>
      </div>
    ) : (
      <div className="text-xs text-gray-600">Shipping will use billing address.</div>
    )}
  </div>
)}
          {/* DELIVERY METHOD SELECTOR */}
<div className="bg-white p-3 rounded shadow">
  <h2 className="text-sm font-semibold mb-2">Delivery method</h2>
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="deliveryMethod" checked={deliveryMethod === "HomeDelivery"} onChange={() => setDeliveryMethod("HomeDelivery")} />
      Home Delivery
    </label>
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="deliveryMethod" checked={deliveryMethod === "ClickAndCollect"} onChange={() => setDeliveryMethod("ClickAndCollect")} />
      Click & Collect (Collect from store)
    </label>
  </div>
</div>

{/* SHIPPING OPTIONS */}
{deliveryMethod === "HomeDelivery" && (
  <div className="bg-white p-3 rounded shadow">
    <h2 className="text-sm font-semibold mb-2">Delivery options</h2>
    {shippingQuoteLoading ? (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <svg className="animate-spin h-4 w-4 text-[#445D41]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading delivery options...
      </div>
    ) : shippingOptions.length === 0 ? (
      <p className="text-xs text-gray-400">Enter your postcode above to see delivery options.</p>
    ) : (
      <div className="flex flex-col gap-2">
        {shippingOptions.map((opt: any) => (
          <label
            key={opt.shippingMethodId}
            className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
              selectedShippingOption?.shippingMethodId === opt.shippingMethodId
                ? "border-[#445D41] bg-[#445D41]/5"
                : "border-gray-200 hover:border-[#445D41]/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="shippingOption"
                checked={selectedShippingOption?.shippingMethodId === opt.shippingMethodId}
                onChange={() => setSelectedShippingOption(opt)}
                className="accent-[#445D41]"
              />
              <div>
                <p className="text-xs font-semibold text-gray-800">{opt.displayName || opt.methodName}</p>
                {opt.estimatedDelivery && (
                  <p className="text-[11px] text-gray-500">{opt.estimatedDelivery}</p>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold shrink-0 ${opt.isFree ? "text-green-600" : "text-gray-800"}`}>
              {opt.isFree ? "FREE" : `£${Number(opt.price).toFixed(2)}`}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
)}

          {/* Order notes */}
          <div className="bg-white p-3 rounded shadow">
            <label className="block text-xs font-medium mb-1">Order notes (optional)</label>
            <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Order notes" rows={2} className="w-full border p-1.5 text-sm rounded" />
          </div>
        </div>
        {/* RIGHT: Summary + coupon */}
       <aside className="lg:col-span-1 mt-2 lg:mt-0">
          <div className="bg-white p-3 rounded shadow lg:sticky lg:top-6 flex flex-col">
            <h3 className="text-sm font-semibold mb-2">Order summary ({effectiveCartCount} items)</h3>
            <div className="space-y-2 mb-3 overflow-visible">
              {checkoutItems.map((it) => (
                <div key={it.id + (it.variantId || "")} className="flex gap-2 items-start">
                  <img src={it.image} alt={"no img"} className="w-10 h-10 object-cover rounded flex-shrink-0" />
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
  {getItemLoyaltyPoints(it) > 0 && (
  <div className="text-[11px] text-green-700 font-medium">
   ( Earn {getItemLoyaltyPoints(it)} loyalty points)
  </div>
)}
</div>
                    {/* {it.discountAmount ? <div className="text-xs text-green-600">Saved £{(it.discountAmount).toFixed(2)}</div> : null} */}
                  </div>
                </div>
              ))}              
            </div>           
            <div className="border-t pt-3">
              {totalLoyaltyPoints > 0 && (
  <div className="mt-2 flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
    <span className="flex items-center gap-2 text-green-700 font-medium">
      🎁  Total Loyalty points
    </span>
    <span className="font-semibold text-green-800">
      +{totalLoyaltyPoints} points
    </span>
  </div>
)}
              {/* ===== PRICE SUMMARY ===== */}
<div className="mt-2 rounded-lg border bg-gray-50 p-2 space-y-1.5 text-xs">
  {/* Subtotal */}
  <div className="flex items-center justify-between">
    <span className="text-gray-600">Subtotal</span>
    <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
  </div>
  <div className="flex items-center justify-between border-t pt-2 mt-2 text-sm text-gray-700">
  <span>Includes VAT</span>
  <span>{formatCurrency(checkoutVatAmount)}</span>
</div>
{deliveryMethod === "ClickAndCollect" && (
  <div className="flex items-center justify-between text-sm">
    <span>Click & Collect Fee</span>
    <span>
      {clickAndCollectFee === 0
        ? "Free"
        : formatCurrency(clickAndCollectFee)}
    </span>
  </div>
)}

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

{/* Shipping */}
{deliveryMethod === "HomeDelivery" && selectedShippingOption && (
  <div className="flex items-center justify-between text-sm text-gray-700">
    <span className="font-medium">{selectedShippingOption.displayName || selectedShippingOption.methodName}</span>
    <span className={`font-semibold ${selectedShippingOption.isFree ? "text-green-600" : ""}`}>
      {selectedShippingOption.isFree ? "FREE" : `+ ${formatCurrency(selectedShippingOption.price)}`}
    </span>
  </div>
)}
  {/* Divider + Total */}
  <div className="border-t pt-2 mt-1 flex items-center justify-between">
    <span className="text-sm font-semibold text-gray-900">Total</span>
    <span className="text-sm font-bold text-gray-900">
      {formatCurrency(cartTotalAmount)}
    </span>
  </div>
</div>
              <div className="mt-3">
                  <>
                    {/* Payment method selector */}
                    <div className="mb-2">
                      <label className="text-xs font-semibold block mb-1.5">Payment method</label>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="radio" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
                          Credit / Debit Card
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                          Cash on Delivery (COD)
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
          className="w-full bg-[#445D41] text-white py-2 text-sm rounded"
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
<div className="space-y-3">
  {error && <div className="text-red-600 text-sm">{error}</div>}

  <div className="text-sm">
    You chose Cash on Delivery. Click below to place your order — you'll pay the delivery person when the order arrives.
  </div>
  <button
   disabled={!acceptTerms || isPlacing}
   onClick={async () => {
    setIsPlacing(true);
    try {
      const payload = await validateAndBuildPayload();
      if (!payload) return;
      await handlePlaceOrderCOD(payload);
    } finally {
      setIsPlacing(false);
    }
  }}
    className="w-full bg-[#445D41] text-white py-2 text-sm hover:bg-black rounded disabled:opacity-70 flex items-center justify-center gap-2"
  >
    {isPlacing ? (
      <>
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Processing...
      </>
    ) : (
      "Place order (COD)"
    )}
  </button>
</div>
                    )}
                  </>          
              </div>
             {/* Terms & Newsletter */}
<div className="mt-2 space-y-1.5">
  <label className="flex items-start gap-2 text-xs text-gray-700">
    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" />
    <span>I agree to the <Link href="/terms" className="text-blue-600 underline">Terms & Conditions</Link></span>
  </label>
  <label className="flex items-start gap-2 text-xs text-gray-700">
    <input type="checkbox" checked={subscribeNewsletter} onChange={(e) => setSubscribeNewsletter(e.target.checked)} className="mt-0.5" />
    <span>Subscribe to newsletter for offers & updates</span>
  </label>
</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}